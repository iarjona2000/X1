var X1SkillEngine = (function() {
  var STORAGE_KEY = 'x1_skills';
  var skills = {};

  function loadSkills() {
    return new Promise(function(resolve) {
      chrome.storage.local.get(STORAGE_KEY, function(data) {
        skills = data[STORAGE_KEY] || {};
        resolve(skills);
      });
    });
  }

  function saveSkills() {
    return new Promise(function(resolve) {
      var obj = {};
      obj[STORAGE_KEY] = skills;
      chrome.storage.local.set(obj, function() { resolve(); });
    });
  }

  function registerSkill(config) {
    if (!config || !config.name) return Promise.reject(new Error('SKILL_NAME_REQUIRED'));
    var skill = {
      name: config.name,
      description: config.description || '',
      trigger: config.trigger || config.name.toLowerCase(),
      steps: config.steps || [],
      params: config.params || {},
      category: config.category || 'general',
      version: config.version || 1,
      runCount: 0,
      lastRun: null,
      avgDuration: 0,
      created: Date.now()
    };
    skills[skill.name] = skill;
    return saveSkills().then(function() { return skill; });
  }

  function runSkill(name, params, tabId) {
    var skill = skills[name];
    if (!skill) return Promise.reject(new Error('SKILL_NOT_FOUND: ' + name));
    if (!skill.steps || skill.steps.length === 0) return Promise.reject(new Error('SKILL_NO_STEPS'));

    var startTime = Date.now();
    var context = {
      params: Object.assign({}, skill.params, params || {}),
      tabId: tabId,
      results: [],
      stepIndex: 0
    };

    return executeSteps(skill.steps, context).then(function(results) {
      var duration = Date.now() - startTime;
      skill.runCount++;
      skill.lastRun = Date.now();
      skill.avgDuration = skill.avgDuration > 0
        ? Math.round((skill.avgDuration + duration) / 2)
        : duration;
      saveSkills();
      return { skill: name, results: results, duration: duration };
    });
  }

  function executeSteps(steps, context) {
    if (context.stepIndex >= steps.length) return Promise.resolve(context.results);
    var step = steps[context.stepIndex];
    context.stepIndex++;

    if (typeof stepProgress === 'function' && context.tabId) {
      stepProgress(context.tabId, step.app || 'X1', step.description || step.action, 'active');
    }

    return executeStep(step, context).then(function(result) {
      context.results.push({ step: step.action, result: result });
      if (step.saveAs && result) {
        context.params[step.saveAs] = result;
      }
      return executeSteps(steps, context);
    }).catch(function(err) {
      context.results.push({ step: step.action, error: err.message });
      if (!step.optional) return Promise.reject(err);
      return executeSteps(steps, context);
    });
  }

  function executeStep(step, context) {
    var action = step.action;
    var resolvedParams = resolveParams(step, context.params);

    if (action === 'navigate' && resolvedParams.url) {
      return new Promise(function(resolve) {
        chrome.tabs.update(context.tabId, { url: resolvedParams.url }, function() {
          setTimeout(function() { resolve(resolvedParams.url); }, resolvedParams.wait || 3000);
        });
      });
    }

    if (action === 'search') {
      var q = resolvedParams.query || '';
      var url = 'https://www.google.com/search?q=' + encodeURIComponent(q);
      return new Promise(function(resolve) {
        chrome.tabs.update(context.tabId, { url: url }, function() {
          setTimeout(function() { resolve(q); }, 3000);
        });
      });
    }

    if (action === 'extract') {
      if (typeof X1DataExtractor !== 'undefined') {
        return X1DataExtractor.extractFromPage(context.tabId, resolvedParams.schema);
      }
      return Promise.resolve(null);
    }

    if (action === 'ai') {
      if (typeof aiComplete === 'function') {
        // Fixed 2026-07-04: aiComplete's real signature is (userMsg, opts) —
        // opts is an options object (only .forceJudge is ever read), not a
        // 3rd positional {maxTokens,temperature} arg, and there's no separate
        // system-prompt slot. This used to send `system` as the actual
        // message and silently drop the real `prompt` text entirely. Fixed
        // to match the convention used everywhere else in the codebase:
        // persona baked into the single message string.
        var system = resolvedParams.system || 'You are a helpful assistant.';
        var prompt = resolvedParams.prompt || '';
        return aiComplete(system + '\n\n' + prompt);
      }
      return Promise.reject(new Error('AI_NOT_AVAILABLE'));
    }

    if (action === 'speak') {
      return Promise.resolve(resolvedParams.text || '');
    }

    if (action === 'wait') {
      return new Promise(function(resolve) {
        setTimeout(resolve, resolvedParams.ms || 1000);
      });
    }

    if (action === 'click') {
      return new Promise(function(resolve, reject) {
        chrome.scripting.executeScript({
          target: { tabId: context.tabId },
          func: function(selector) {
            var el = document.querySelector(selector);
            if (el) { el.click(); return true; }
            return false;
          },
          args: [resolvedParams.selector || '']
        }, function(r) {
          if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
          resolve(r && r[0] && r[0].result);
        });
      });
    }

    if (action === 'type') {
      return new Promise(function(resolve, reject) {
        chrome.scripting.executeScript({
          target: { tabId: context.tabId },
          func: function(selector, text) {
            var el = document.querySelector(selector);
            if (el) { el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); return true; }
            return false;
          },
          args: [resolvedParams.selector || '', resolvedParams.text || '']
        }, function(r) {
          if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
          resolve(r && r[0] && r[0].result);
        });
      });
    }

    if (action === 'exec' && typeof execAction === 'function') {
      return execAction(resolvedParams, context.tabId);
    }

    return Promise.resolve(null);
  }

  function resolveParams(step, contextParams) {
    var resolved = {};
    if (!step) return resolved;
    Object.keys(step).forEach(function(key) {
      if (key === 'action' || key === 'saveAs' || key === 'optional' || key === 'description' || key === 'app') return;
      var val = step[key];
      if (typeof val === 'string' && val.indexOf('{{') !== -1) {
        val = val.replace(/\{\{(\w+)\}\}/g, function(m, name) {
          return contextParams[name] !== undefined ? contextParams[name] : m;
        });
      }
      resolved[key] = val;
    });
    return resolved;
  }

  function findSkillByTrigger(text) {
    if (!text) return null;
    var lower = text.toLowerCase();
    var keys = Object.keys(skills);
    for (var i = 0; i < keys.length; i++) {
      var skill = skills[keys[i]];
      if (skill.trigger && lower.indexOf(skill.trigger) !== -1) return skill;
    }
    return null;
  }

  function getSkill(name) { return skills[name] || null; }
  function getAllSkills() { return Object.assign({}, skills); }

  function deleteSkill(name) {
    delete skills[name];
    return saveSkills();
  }

  function getStats() {
    var stats = { total: 0, totalRuns: 0, categories: {} };
    Object.keys(skills).forEach(function(name) {
      stats.total++;
      stats.totalRuns += skills[name].runCount || 0;
      var cat = skills[name].category || 'general';
      stats.categories[cat] = (stats.categories[cat] || 0) + 1;
    });
    return stats;
  }

  return {
    loadSkills: loadSkills,
    registerSkill: registerSkill,
    runSkill: runSkill,
    findSkillByTrigger: findSkillByTrigger,
    getSkill: getSkill,
    getAllSkills: getAllSkills,
    deleteSkill: deleteSkill,
    getStats: getStats
  };
})();
