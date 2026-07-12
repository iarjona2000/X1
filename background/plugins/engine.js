var X1PluginEngine = (function () {
  'use strict';

  // ── Guard: la capa compartida debe cargar ANTES. ─────────────────────
  // Si no, fallar con error explicito ayuda a detectar errores de
  // orden en importScripts de service-worker.js (futuro hardening).
  if (typeof X1CapabilityShared === 'undefined') {
    throw new Error(
      '[X1PluginEngine] X1CapabilityShared no definido. ' +
      'Carga orchestrator/capability-shared.js ANTES de plugins/engine.js en importScripts.'
    );
  }

  var plugins = [];
  var STORAGE_KEY = 'x1_plugins';

  // safeCalc ahora viene de la capa compartida. El parser Shunting Yard
  // vio duplicado accidentalmente entre plugins/engine.js y skills/engine.js
  // — al consolidarse aqui elimina ~100 lineas de drift potencial.
  var safeCalc = X1CapabilityShared.safeCalc;

  function loadPlugins() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(STORAGE_KEY, function (data) {
        plugins = data[STORAGE_KEY] || [];
        resolve(plugins);
      });
    });
  }

  function savePlugins() {
    return new Promise(function (resolve) {
      var obj = {};
      obj[STORAGE_KEY] = plugins;
      chrome.storage.local.set(obj, function () {
        resolve();
      });
    });
  }

  function validateManifest(manifest) {
    if (!manifest || !manifest.id || !manifest.name || !manifest.version) return false;
    if (!manifest.trigger || !Array.isArray(manifest.trigger) || manifest.trigger.length === 0) return false;
    if (!manifest.steps || !Array.isArray(manifest.steps) || manifest.steps.length === 0) return false;
    // Contract: validate == dispatch. Si añades un type al array, debes
    // añadir el case en runStep() abajo o el manifest validará pero no-op.
    // Plugin engine solo dispatcha: search/synthesize/navigate/extract/write/
    // notify/calculate/wait/click/type (los 8 originales + 3 migrados del
    // skill engine via normalizeStep). 'speak/ai/exec/webhook' son del
    // skill engine y NO se aceptan como plugin manifest para evitar
    // validates-but- silently-no-op (reviewer warn 2026-07-13).
    var validTypes = ['search','synthesize','navigate','extract','write','notify','calculate','webhook','wait','click','type'];
    for (var i = 0; i < manifest.steps.length; i++) {
      // Normalizar: un manifest plugin siempre usa `type`, pero aceptamos
      // tmb `action` (skill style) para futura migracion cross-engine.
      var step = X1CapabilityShared.normalizeStep(manifest.steps[i]);
      if (validTypes.indexOf(step.type) === -1) return false;
    }
    return true;
  }

  function registerPlugin(manifest) {
    if (!validateManifest(manifest)) {
      return Promise.reject(new Error('Invalid plugin manifest'));
    }
    for (var i = 0; i < plugins.length; i++) {
      if (plugins[i].id === manifest.id) {
        plugins[i] = manifest;
        return savePlugins();
      }
    }
    plugins.push(manifest);
    return savePlugins();
  }

  function unregisterPlugin(pluginId) {
    var newPlugins = [];
    for (var i = 0; i < plugins.length; i++) {
      if (plugins[i].id !== pluginId) newPlugins.push(plugins[i]);
    }
    plugins = newPlugins;
    return savePlugins();
  }

  function listPlugins() {
    return plugins.slice();
  }

  function matchPlugin(userMsg) {
    if (!userMsg) return null;
    var lower = userMsg.toLowerCase();
    for (var i = 0; i < plugins.length; i++) {
      var p = plugins[i];
      if (!p.trigger) continue;
      for (var t = 0; t < p.trigger.length; t++) {
        if (lower.indexOf(p.trigger[t].toLowerCase()) !== -1) return p;
      }
    }
    return null;
  }

  // stripHtml() eliminado en la consolidacion 2026-07-13: el step 'extract'
  // ahora usa chrome.scripting.executeScript(doc.body.innerText) directo —
  // stripHtml era un fallback para HTML crudo que ya no entra en el pipeline.

  function executePlugin(pluginId, userMsg, context) {
    var plugin = null;
    for (var i = 0; i < plugins.length; i++) {
      if (plugins[i].id === pluginId) { plugin = plugins[i]; break; }
    }
    if (!plugin) return Promise.reject(new Error('Plugin not found: ' + pluginId));

    var results = { userMsg: userMsg, context: context || {}, stepResults: [] };

    function runStep(stepIndex) {
      if (stepIndex >= plugin.steps.length) {
        return Promise.resolve(results);
      }
      // Normalizar step (acepta `type` o `action`) — habilita plugins
      // y skills con la misma definicion legible.
      var step = X1CapabilityShared.normalizeStep(plugin.steps[stepIndex]);

      if (step.type === 'search') {
        var searchQuery = step.query || userMsg;
        if (typeof aiKeys !== 'undefined' && aiKeys.tavilyKey) {
          return fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: searchQuery,
              max_results: step.maxResults || 5,
              api_key: aiKeys.tavilyKey
            })
          }).then(function (resp) {
            return resp.json();
          }).then(function (data) {
            var searchResults = data.results || [];
            results.stepResults.push({ type: 'search', data: searchResults });
            results.searchResults = searchResults;
            return runStep(stepIndex + 1);
          }).catch(function () {
            results.stepResults.push({ type: 'search', data: [], error: 'Search failed' });
            return runStep(stepIndex + 1);
          });
        }
        results.stepResults.push({ type: 'search', data: [], error: 'No search API key' });
        return runStep(stepIndex + 1);
      }

      if (step.type === 'synthesize') {
        var synthesizePrompt = step.prompt || 'Analyze the following information and provide a synthesis.';
        var dataToSynthesize = '';
        for (var sr = 0; sr < results.stepResults.length; sr++) {
          var prev = results.stepResults[sr];
          if (prev.type === 'search' && prev.data) {
            for (var ri = 0; ri < prev.data.length; ri++) {
              dataToSynthesize += 'Source ' + (ri + 1) + ': ' + (prev.data[ri].title || '') + '\n' + (prev.data[ri].content || prev.data[ri].snippet || '') + '\n\n';
            }
          }
          if (prev.type === 'extract' && prev.data) {
            dataToSynthesize += 'Extracted: ' + prev.data + '\n\n';
          }
        }
        var fullPrompt = synthesizePrompt + '\n\nData:\n' + dataToSynthesize + '\n\nUser request: ' + userMsg;
        // Fixed 2026-07-04: antes hardcodeaba groqComplete||geminiComplete —
        // groqComplete ya no existe. Antes de 2026-07-13 usaba un wrapper
        // local (persona+prompt). Ahora todas las AI calls de cualquier
        // engine pasan por X1CapabilityShared.unifiedAiCall — UNA sola
        // firma, UNA sola intención (persona prefix + prompt).
        return X1CapabilityShared.unifiedAiCall(fullPrompt, {
          persona: plugin.persona || 'You are a research analyst. Provide clear, actionable analysis.'
        }).then(function (response) {
          results.stepResults.push({ type: 'synthesize', data: response });
          results.synthesis = response;
          return runStep(stepIndex + 1);
        }).catch(function () {
          results.stepResults.push({ type: 'synthesize', data: '', error: 'Synthesis failed' });
          return runStep(stepIndex + 1);
        });
      }

      if (step.type === 'navigate') {
        var url = step.url || '';
        if (step.urlTemplate && results.searchResults && results.searchResults.length > 0) {
          url = results.searchResults[0].url || url;
        }
        results.stepResults.push({ type: 'navigate', data: { action: 'navigate', url: url } });
        results.navigateAction = { action: 'navigate', url: url };
        return runStep(stepIndex + 1);
      }

      if (step.type === 'extract') {
        var extractPrompt = step.prompt || 'Extract the key information from this page content.';
        var pageContent = '';
        if (context && context.tabId) {
          return new Promise(function (resolve) {
            chrome.scripting.executeScript({
              target: { tabId: context.tabId },
              func: function () {
                return document.body ? document.body.innerText.substring(0, 8000) : '';
              }
            }, function (injectionResults) {
              if (injectionResults && injectionResults[0]) {
                pageContent = injectionResults[0].result || '';
              }
              // unifiedAiCall con fallback persona — antes este bloque
              // duplicaba la firma aiComplete y era facil divergir.
              X1CapabilityShared.unifiedAiCall(
                extractPrompt + '\n\nPage content:\n' + pageContent,
                { persona: plugin.persona || 'You are a data extraction assistant. Extract structured data as requested.' }
              ).then(function (extracted) {
                results.stepResults.push({ type: 'extract', data: extracted });
                results.extracted = extracted;
                resolve(runStep(stepIndex + 1));
              }).catch(function () {
                results.stepResults.push({ type: 'extract', data: '', error: 'Extraction AI failed' });
                resolve(runStep(stepIndex + 1));
              });
              // Si pageContent vacio, no llamamos AI — fallback abajo.
              if (!pageContent) {
                results.stepResults.push({ type: 'extract', data: '', error: 'No page content' });
                resolve(runStep(stepIndex + 1));
              }
            });
          });
        }
        results.stepResults.push({ type: 'extract', data: '', error: 'No tabId in context' });
        return runStep(stepIndex + 1);
      }

      if (step.type === 'write') {
        // Templating usa X1CapabilityShared.resolveParams — antes era
        // string.replace manual propenso a typos. Ahora {synthesis},
        // {userMsg}, {extracted} + {{ctx.foo}} funcionan igual.
        var resolvedWrite = X1CapabilityShared.resolveParams(step, Object.assign({}, results, { userMsg: userMsg }));
        var writeContent = resolvedWrite.content || resolvedWrite.contentTemplate || results.synthesis || '';
        results.stepResults.push({ type: 'write', data: { action: 'newDoc', content: writeContent } });
        results.writeAction = { action: 'newDoc', content: writeContent };
        return runStep(stepIndex + 1);
      }

      if (step.type === 'webhook') {
        var webhookUrl = step.url || (typeof aiKeys !== 'undefined' && aiKeys.n8nWebhookUrl);
        if (!webhookUrl) {
          results.stepResults.push({ type: 'webhook', data: null, error: 'No webhook URL (set step.url or n8nWebhookUrl in Settings)' });
          return runStep(stepIndex + 1);
        }
        var webhookBody = Object.assign({ source: 'x1-plugin', plugin: pluginId, userMsg: userMsg }, step.payload || { synthesis: results.synthesis || '' });
        return fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookBody),
          signal: AbortSignal.timeout(15000)
        }).then(function (resp) {
          results.stepResults.push({ type: 'webhook', data: { ok: resp.ok, status: resp.status } });
          return runStep(stepIndex + 1);
        }).catch(function (e) {
          results.stepResults.push({ type: 'webhook', data: null, error: e.message });
          return runStep(stepIndex + 1);
        });
      }

      if (step.type === 'notify') {
        var resolvedNotify = X1CapabilityShared.resolveParams(step, Object.assign({}, results, { userMsg: userMsg }));
        var notifyText = resolvedNotify.text || results.synthesis || 'Task complete.';
        results.stepResults.push({ type: 'notify', data: { action: 'speak', text: notifyText } });
        results.notifyAction = { action: 'speak', text: notifyText };
        return runStep(stepIndex + 1);
      }

      if (step.type === 'calculate') {
        // Templating de {var} con busqueda contra extract results.
        var expression = step.expression || '';
        expression = expression.replace(/\{([^}]+)\}/g, function (match, key) {
          for (var ci = 0; ci < results.stepResults.length; ci++) {
            if (results.stepResults[ci].type === 'extract' && results.stepResults[ci].data) {
              var numMatch = String(results.stepResults[ci].data).match(new RegExp(key + '[:\\s]*([\\d.,]+)'));
              if (numMatch) return numMatch[1].replace(/,/g, '');
            }
          }
          return '0';
        });
        var calcResult = X1CapabilityShared.safeCalc(expression);
        results.stepResults.push({ type: 'calculate', data: calcResult });
        results.calculation = calcResult;
        return runStep(stepIndex + 1);
      }

      // New types accepted from skill engine via normalizeStep:
      if (step.type === 'wait') {
        return new Promise(function (resolve) {
          setTimeout(function () { resolve(runStep(stepIndex + 1)); }, step.ms || 1000);
        });
      }
      if (step.type === 'click' && context && context.tabId) {
        return new Promise(function (resolve, reject) {
          chrome.scripting.executeScript({
            target: { tabId: context.tabId },
            func: function (selector) {
              var el = document.querySelector(selector);
              if (el) { el.click(); return true; }
              return false;
            },
            args: [step.selector || '']
          }, function (r) {
            if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
            results.stepResults.push({ type: 'click', data: r && r[0] && r[0].result });
            resolve(runStep(stepIndex + 1));
          });
        });
      }
      if (step.type === 'type' && context && context.tabId) {
        return new Promise(function (resolve, reject) {
          chrome.scripting.executeScript({
            target: { tabId: context.tabId },
            func: function (selector, text) {
              var el = document.querySelector(selector);
              if (el) { el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); return true; }
              return false;
            },
            args: [step.selector || '', step.text || '']
          }, function (r) {
            if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
            results.stepResults.push({ type: 'type', data: r && r[0] && r[0].result });
            resolve(runStep(stepIndex + 1));
          });
        });
      }

      results.stepResults.push({ type: step.type, data: null, error: 'Unknown step type' });
      return runStep(stepIndex + 1);
    }

    return runStep(0);
  }

  function getBuiltInPlugins() {
    return [
      {
        id: 'market-research',
        name: 'Market Research',
        version: '1.0',
        description: 'Search competitors and synthesize market insights',
        trigger: ['market research', 'competitor analysis', 'investigacion de mercado', 'analisis competitivo'],
        steps: [
          { type: 'search', query: null, maxResults: 5 },
          { type: 'synthesize', prompt: 'Analyze these search results about the market/competitors. Provide: 1) Key competitors found, 2) Market trends, 3) Opportunities, 4) Threats. Be specific with data points.' }
        ]
      },
      {
        id: 'daily-briefing',
        name: 'Daily Briefing',
        version: '1.0',
        description: 'Calendar and email summary for the day',
        trigger: ['daily briefing', 'morning briefing', 'resumen del dia', 'briefing matutino'],
        steps: [
          { type: 'search', query: 'site:calendar.google.com OR site:mail.google.com today schedule' },
          { type: 'synthesize', prompt: 'Create a concise daily briefing including: 1) Today\'s schedule highlights, 2) Important emails requiring attention, 3) Key priorities for the day. Format as a clear brief.' },
          { type: 'notify', text: '{synthesis}' }
        ]
      },
      {
        id: 'email-triage',
        name: 'Email Triage',
        version: '1.0',
        description: 'Categorize and prioritize inbox emails',
        trigger: ['email triage', 'triage inbox', 'triaje correos', 'priorizar correos'],
        steps: [
          { type: 'extract', prompt: 'Extract all visible email subjects, senders, and preview text. List them in order.' },
          { type: 'synthesize', prompt: 'Categorize these emails into: URGENT (needs response today), IMPORTANT (needs response this week), FYI (read when convenient), ARCHIVE (can be archived). For each email, explain why it belongs in that category.' },
          { type: 'notify', text: '{synthesis}' }
        ]
      },
      {
        id: 'lead-generator',
        name: 'Lead Generator',
        version: '1.0',
        description: 'Search and extract potential leads from the web',
        trigger: ['find leads', 'lead generation', 'buscar leads', 'generar leads', 'prospect'],
        steps: [
          { type: 'search', maxResults: 5 },
          { type: 'extract', prompt: 'Extract from the page: company names, contact persons, email addresses, phone numbers, company descriptions, and any relevant business data. Format as a structured list.' },
          { type: 'synthesize', prompt: 'Organize the extracted leads into a prioritized list. For each lead include: Company, Contact, Role, Contact Info, Relevance Score (1-10), and a brief note on why they are a good lead.' },
          { type: 'write', contentTemplate: 'Lead Generation Report\n\nQuery: {userMsg}\n\n{synthesis}' }
        ]
      }
    ];
  }

  return {
    loadPlugins: loadPlugins,
    registerPlugin: registerPlugin,
    unregisterPlugin: unregisterPlugin,
    listPlugins: listPlugins,
    matchPlugin: matchPlugin,
    executePlugin: executePlugin,
    getBuiltInPlugins: getBuiltInPlugins
  };
})();
