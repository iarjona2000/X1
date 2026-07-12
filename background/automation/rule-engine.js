var X1AutomationEngine = (function() {
  // ── Guard: la capa compartida debe cargar ANTES. ───────────────
  // importScripts(): orchestrator/capability-shared.js (L46) -> automation/rule-engine.js (L51).
  // Si alguien reordena, este throw aborta la importacion del SW con un mensaje claro.
  if (typeof X1CapabilityShared === 'undefined') {
    throw new Error(
      '[X1AutomationEngine] X1CapabilityShared no definido. ' +
      'Carga orchestrator/capability-shared.js ANTES de automation/rule-engine.js en importScripts.'
    );
  }

  var rules = [];
  var STORAGE_KEY = 'x1_automation_rules';
  var ALARM_PREFIX = 'x1-auto-';

  function loadRules() {
    return new Promise(function(resolve) {
      chrome.storage.local.get(STORAGE_KEY, function(data) {
        rules = data[STORAGE_KEY] || [];
        resolve(rules);
      });
    });
  }

  function saveRules() {
    return new Promise(function(resolve) {
      var obj = {};
      obj[STORAGE_KEY] = rules;
      chrome.storage.local.set(obj, function() {
        resolve();
      });
    });
  }

  function generateId() {
    return 'rule-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
  }

  function parseCronToMinutes(cron) {
    if (!cron) return 60;
    var parts = cron.trim().split(/\s+/);
    if (parts.length < 5) return 60;
    var minute = parts[0];
    var hour = parts[1];
    if (hour === '*' && minute === '*') return 1;
    if (hour === '*') return 60;
    if (minute.indexOf('/') !== -1) {
      var interval = parseInt(minute.split('/')[1], 10);
      return isNaN(interval) ? 60 : interval;
    }
    if (hour.indexOf('/') !== -1) {
      var hInterval = parseInt(hour.split('/')[1], 10);
      return isNaN(hInterval) ? 60 : hInterval * 60;
    }
    return 1440;
  }

  function shouldFireCron(cron) {
    if (!cron) return false;
    var parts = cron.trim().split(/\s+/);
    if (parts.length < 5) return false;
    var now = new Date();
    var minute = parts[0];
    var hour = parts[1];
    var dayOfMonth = parts[2];
    var month = parts[3];
    var dayOfWeek = parts[4];

    function matchField(field, value) {
      if (field === '*') return true;
      if (field.indexOf('/') !== -1) {
        var divParts = field.split('/');
        var base = divParts[0] === '*' ? 0 : parseInt(divParts[0], 10);
        var step = parseInt(divParts[1], 10);
        return (value - base) % step === 0;
      }
      if (field.indexOf(',') !== -1) {
        var vals = field.split(',');
        for (var i = 0; i < vals.length; i++) {
          if (parseInt(vals[i], 10) === value) return true;
        }
        return false;
      }
      if (field.indexOf('-') !== -1) {
        var range = field.split('-');
        var lo = parseInt(range[0], 10);
        var hi = parseInt(range[1], 10);
        return value >= lo && value <= hi;
      }
      return parseInt(field, 10) === value;
    }

    return matchField(minute, now.getMinutes()) &&
      matchField(hour, now.getHours()) &&
      matchField(dayOfMonth, now.getDate()) &&
      matchField(month, now.getMonth() + 1) &&
      matchField(dayOfWeek, now.getDay());
  }

  function createRule(rule) {
    if (!rule) return Promise.reject(new Error('Rule is required'));
    if (!rule.trigger || !rule.trigger.type) return Promise.reject(new Error('Rule trigger is required'));
    if (!rule.action) return Promise.reject(new Error('Rule action is required'));

    var newRule = {
      id: rule.id || generateId(),
      name: rule.name || 'Unnamed Rule',
      trigger: {
        type: rule.trigger.type,
        cron: rule.trigger.cron || null,
        urlPattern: rule.trigger.urlPattern || null,
        interval: rule.trigger.interval || null
      },
      action: {
        plugin: rule.action.plugin || null,
        command: rule.action.command || null,
        params: rule.action.params || {}
      },
      enabled: rule.enabled !== undefined ? rule.enabled : true,
      createdAt: new Date().toISOString(),
      lastRun: null,
      runCount: 0
    };

    for (var i = 0; i < rules.length; i++) {
      if (rules[i].id === newRule.id) {
        rules[i] = newRule;
        return saveRules().then(function() {
          setupAlarm(newRule);
          return newRule;
        });
      }
    }
    rules.push(newRule);
    return saveRules().then(function() {
      setupAlarm(newRule);
      return newRule;
    });
  }

  function setupAlarm(rule) {
    var alarmName = ALARM_PREFIX + rule.id;
    chrome.alarms.clear(alarmName, function() {
      if (!rule.enabled) return;
      if (rule.trigger.type === 'schedule') {
        var intervalMinutes;
        if (rule.trigger.interval) {
          intervalMinutes = rule.trigger.interval;
        } else if (rule.trigger.cron) {
          intervalMinutes = parseCronToMinutes(rule.trigger.cron);
        } else {
          intervalMinutes = 60;
        }
        chrome.alarms.create(alarmName, {
          delayInMinutes: 1,
          periodInMinutes: Math.max(1, intervalMinutes)
        });
      }
    });
  }

  function deleteRule(ruleId) {
    var newRules = [];
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].id !== ruleId) newRules.push(rules[i]);
    }
    rules = newRules;
    var alarmName = ALARM_PREFIX + ruleId;
    return new Promise(function(resolve) {
      chrome.alarms.clear(alarmName, function() {
        saveRules().then(function() {
          resolve(true);
        });
      });
    });
  }

  function listRules() {
    return rules.slice();
  }

  function toggleRule(ruleId, enabled) {
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].id === ruleId) {
        rules[i].enabled = !!enabled;
        var rule = rules[i];
        return saveRules().then(function() {
          if (enabled) {
            setupAlarm(rule);
          } else {
            chrome.alarms.clear(ALARM_PREFIX + ruleId, function() {});
          }
          return rule;
        });
      }
    }
    return Promise.reject(new Error('Rule not found: ' + ruleId));
  }

  function handleAlarm(alarmName) {
    if (alarmName.indexOf(ALARM_PREFIX) !== 0) return Promise.resolve(null);
    var ruleId = alarmName.substring(ALARM_PREFIX.length);
    var rule = null;
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].id === ruleId) { rule = rules[i]; break; }
    }
    if (!rule || !rule.enabled) return Promise.resolve(null);

    if (rule.trigger.cron && !shouldFireCron(rule.trigger.cron)) {
      return Promise.resolve(null);
    }

    return executeRule(rule);
  }

  function parseNaturalLanguageRule(text) {
    // Fixed 2026-07-04, same bug/fix as plugins/engine.js: groqComplete no longer
    // exists, so this always fell through to a bare geminiComplete(). Route through
    // aiComplete() (the real cascade/Panel+Judge entry point) instead.
    var aiFunc = (typeof aiComplete === 'function') ? function(prompt, persona) { return aiComplete(persona ? persona + '\n\n' + prompt : prompt); } : null;
    if (!aiFunc) return Promise.reject(new Error('No AI function available'));

    var prompt = 'Parse this natural language automation rule into JSON.\n' +
      'Input: "' + text + '"\n\n' +
      'Return ONLY valid JSON with this structure:\n' +
      '{\n' +
      '  "name": "short rule name",\n' +
      '  "trigger": {\n' +
      '    "type": "schedule" or "pageVisit" or "webhook",\n' +
      '    "cron": "cron expression if schedule (5 fields: min hour dom month dow)",\n' +
      '    "urlPattern": "url pattern if pageVisit",\n' +
      '    "interval": minutes_number_if_simple_interval\n' +
      '  },\n' +
      '  "action": {\n' +
      '    "command": "action command string",\n' +
      '    "params": {}\n' +
      '  }\n' +
      '}\n' +
      'Examples:\n' +
      '"every 30 minutes check my email" -> {"name":"Email check","trigger":{"type":"schedule","interval":30},"action":{"command":"gmailRead","params":{}}}\n' +
      '"every day at 9am give me a briefing" -> {"name":"Morning briefing","trigger":{"type":"schedule","cron":"0 9 * * *"},"action":{"command":"dailyDigest","params":{}}}';

    return aiFunc(prompt, 'You are a JSON parser. Return ONLY valid JSON, no markdown, no explanation.').then(function(response) {
      // sanitizeAiResponse (2026-07-13) — antes era `response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()` inline.
      // Ahora cualquier engine (rule/plugin/skill) que necesite limpiar fences de markdown va por el mismo helper.
      var cleaned = X1CapabilityShared.sanitizeAiResponse(response);
      try {
        var parsed = JSON.parse(cleaned);
        return parsed;
      } catch (e) {
        if (typeof parseJSON === 'function') {
          return parseJSON(cleaned);
        }
        throw new Error('Could not parse AI response as JSON');
      }
    });
  }

  function executeRule(rule) {
    if (!rule || !rule.action) return Promise.resolve(null);

    rule.lastRun = new Date().toISOString();
    rule.runCount = (rule.runCount || 0) + 1;
    saveRules();

    if (rule.action.plugin && typeof X1PluginEngine !== 'undefined') {
      var pluginMsg = rule.action.params && rule.action.params.query ? rule.action.params.query : rule.name;
      return X1PluginEngine.executePlugin(rule.action.plugin, pluginMsg, rule.action.params).then(function(result) {
        return { ruleId: rule.id, ruleName: rule.name, type: 'plugin', result: result };
      });
    }

    if (rule.action.command) {
      var actionObj = { action: rule.action.command };
      var params = rule.action.params || {};
      var keys = Object.keys(params);
      for (var k = 0; k < keys.length; k++) {
        actionObj[keys[k]] = params[keys[k]];
      }
      return Promise.resolve({ ruleId: rule.id, ruleName: rule.name, type: 'command', action: actionObj });
    }

    return Promise.resolve({ ruleId: rule.id, ruleName: rule.name, type: 'noop' });
  }

  return {
    loadRules: loadRules,
    createRule: createRule,
    deleteRule: deleteRule,
    listRules: listRules,
    toggleRule: toggleRule,
    handleAlarm: handleAlarm,
    parseNaturalLanguageRule: parseNaturalLanguageRule,
    executeRule: executeRule
  };
})();
