var X1PluginEngine = (function() {
  var plugins = [];
  var STORAGE_KEY = 'x1_plugins';

  function safeCalc(expr) {
    var tokens = String(expr).replace(/[^0-9+\-*/.(),a-z ]/gi, '').trim();
    var nums = [];
    var ops = [];

    function applyOp() {
      var b = nums.pop();
      var a = nums.pop();
      var op = ops.pop();
      if (op === '+') nums.push(a + b);
      else if (op === '-') nums.push(a - b);
      else if (op === '*') nums.push(a * b);
      else if (op === '/') nums.push(b !== 0 ? a / b : 0);
    }

    function precedence(op) {
      if (op === '+' || op === '-') return 1;
      if (op === '*' || op === '/') return 2;
      return 0;
    }

    function parseNumbers(str) {
      var result = [];
      var parts = str.split(',');
      for (var i = 0; i < parts.length; i++) {
        var n = parseFloat(parts[i].trim());
        if (!isNaN(n)) result.push(n);
      }
      return result;
    }

    var avgMatch = tokens.match(/^avg\((.+)\)$/i);
    if (avgMatch) {
      var avgNums = parseNumbers(avgMatch[1]);
      if (avgNums.length === 0) return 0;
      var avgSum = 0;
      for (var ai = 0; ai < avgNums.length; ai++) avgSum += avgNums[ai];
      return avgSum / avgNums.length;
    }

    var sumMatch = tokens.match(/^sum\((.+)\)$/i);
    if (sumMatch) {
      var sumNums = parseNumbers(sumMatch[1]);
      var sumTotal = 0;
      for (var si = 0; si < sumNums.length; si++) sumTotal += sumNums[si];
      return sumTotal;
    }

    var minMatch = tokens.match(/^min\((.+)\)$/i);
    if (minMatch) {
      var minNums = parseNumbers(minMatch[1]);
      if (minNums.length === 0) return 0;
      var minVal = minNums[0];
      for (var mi = 1; mi < minNums.length; mi++) {
        if (minNums[mi] < minVal) minVal = minNums[mi];
      }
      return minVal;
    }

    var maxMatch = tokens.match(/^max\((.+)\)$/i);
    if (maxMatch) {
      var maxNums = parseNumbers(maxMatch[1]);
      if (maxNums.length === 0) return 0;
      var maxVal = maxNums[0];
      for (var xi = 1; xi < maxNums.length; xi++) {
        if (maxNums[xi] > maxVal) maxVal = maxNums[xi];
      }
      return maxVal;
    }

    var i = 0;
    while (i < tokens.length) {
      var ch = tokens[i];
      if (ch === ' ') { i++; continue; }
      if (ch === '(') { ops.push(ch); i++; continue; }
      if (ch === ')') {
        while (ops.length && ops[ops.length - 1] !== '(') applyOp();
        ops.pop();
        i++;
        continue;
      }
      if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
        if (ch === '-' && (i === 0 || tokens[i - 1] === '(' || tokens[i - 1] === '+' || tokens[i - 1] === '-' || tokens[i - 1] === '*' || tokens[i - 1] === '/')) {
          var neg = '-';
          i++;
          while (i < tokens.length && (tokens[i] >= '0' && tokens[i] <= '9' || tokens[i] === '.')) {
            neg += tokens[i];
            i++;
          }
          nums.push(parseFloat(neg));
          continue;
        }
        while (ops.length && ops[ops.length - 1] !== '(' && precedence(ops[ops.length - 1]) >= precedence(ch)) applyOp();
        ops.push(ch);
        i++;
        continue;
      }
      if ((ch >= '0' && ch <= '9') || ch === '.') {
        var numStr = '';
        while (i < tokens.length && ((tokens[i] >= '0' && tokens[i] <= '9') || tokens[i] === '.')) {
          numStr += tokens[i];
          i++;
        }
        nums.push(parseFloat(numStr));
        continue;
      }
      i++;
    }
    while (ops.length) applyOp();
    return nums.length ? nums[0] : 0;
  }

  function loadPlugins() {
    return new Promise(function(resolve) {
      chrome.storage.local.get(STORAGE_KEY, function(data) {
        plugins = data[STORAGE_KEY] || [];
        resolve(plugins);
      });
    });
  }

  function savePlugins() {
    return new Promise(function(resolve) {
      var obj = {};
      obj[STORAGE_KEY] = plugins;
      chrome.storage.local.set(obj, function() {
        resolve();
      });
    });
  }

  function validateManifest(manifest) {
    if (!manifest || !manifest.id || !manifest.name || !manifest.version) return false;
    if (!manifest.trigger || !Array.isArray(manifest.trigger) || manifest.trigger.length === 0) return false;
    if (!manifest.steps || !Array.isArray(manifest.steps) || manifest.steps.length === 0) return false;
    var validTypes = ['search', 'synthesize', 'navigate', 'extract', 'write', 'notify', 'calculate', 'webhook'];
    for (var i = 0; i < manifest.steps.length; i++) {
      if (validTypes.indexOf(manifest.steps[i].type) === -1) return false;
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

  function stripHtml(html) {
    return String(html)
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000);
  }

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
      var step = plugin.steps[stepIndex];

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
          }).then(function(resp) {
            return resp.json();
          }).then(function(data) {
            var searchResults = data.results || [];
            results.stepResults.push({ type: 'search', data: searchResults });
            results.searchResults = searchResults;
            return runStep(stepIndex + 1);
          }).catch(function() {
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
        // Fixed 2026-07-04: this used to hardcode groqComplete||geminiComplete —
        // groqComplete no longer exists (removed in the provider consolidation),
        // so every plugin synthesis silently fell through to a single bare
        // geminiComplete() call with no persona, no cache, no NVIDIA cascade, no
        // Panel+Judge. Routing through aiComplete() (the real entry point used at
        // 20+ other call sites in service-worker.js) gives every plugin the full
        // brain instead of a dead-end single model call.
        var aiFunc = (typeof aiComplete === 'function') ? function(prompt, persona) { return aiComplete(persona ? persona + '\n\n' + prompt : prompt); } : null;
        if (aiFunc) {
          // plugin.persona lets a manifest carry its own identity (e.g. a specialist
          // persona plugin) instead of the generic research-analyst framing below.
          return aiFunc(fullPrompt, plugin.persona || 'You are a research analyst. Provide clear, actionable analysis.').then(function(response) {
            results.stepResults.push({ type: 'synthesize', data: response });
            results.synthesis = response;
            return runStep(stepIndex + 1);
          }).catch(function() {
            results.stepResults.push({ type: 'synthesize', data: '', error: 'Synthesis failed' });
            return runStep(stepIndex + 1);
          });
        }
        results.stepResults.push({ type: 'synthesize', data: '', error: 'No AI function available' });
        return runStep(stepIndex + 1);
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
          return new Promise(function(resolve) {
            chrome.scripting.executeScript({
              target: { tabId: context.tabId },
              func: function() {
                return document.body ? document.body.innerText.substring(0, 8000) : '';
              }
            }, function(injectionResults) {
              if (injectionResults && injectionResults[0]) {
                pageContent = injectionResults[0].result || '';
              }
              var aiFunc2 = (typeof aiComplete === 'function') ? function(prompt, persona) { return aiComplete(persona ? persona + '\n\n' + prompt : prompt); } : null;
              if (aiFunc2 && pageContent) {
                aiFunc2(extractPrompt + '\n\nPage content:\n' + pageContent, plugin.persona || 'You are a data extraction assistant. Extract structured data as requested.').then(function(extracted) {
                  results.stepResults.push({ type: 'extract', data: extracted });
                  results.extracted = extracted;
                  resolve(runStep(stepIndex + 1));
                }).catch(function() {
                  results.stepResults.push({ type: 'extract', data: '', error: 'Extraction AI failed' });
                  resolve(runStep(stepIndex + 1));
                });
              } else {
                results.stepResults.push({ type: 'extract', data: pageContent, error: pageContent ? null : 'No page content' });
                resolve(runStep(stepIndex + 1));
              }
            });
          });
        }
        results.stepResults.push({ type: 'extract', data: '', error: 'No tabId in context' });
        return runStep(stepIndex + 1);
      }

      if (step.type === 'write') {
        var writeContent = step.content || results.synthesis || '';
        if (step.contentTemplate) {
          writeContent = step.contentTemplate;
          writeContent = writeContent.replace(/\{synthesis\}/g, results.synthesis || '');
          writeContent = writeContent.replace(/\{userMsg\}/g, userMsg);
          writeContent = writeContent.replace(/\{extracted\}/g, results.extracted || '');
        }
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
        }).then(function(resp) {
          results.stepResults.push({ type: 'webhook', data: { ok: resp.ok, status: resp.status } });
          return runStep(stepIndex + 1);
        }).catch(function(e) {
          results.stepResults.push({ type: 'webhook', data: null, error: e.message });
          return runStep(stepIndex + 1);
        });
      }

      if (step.type === 'notify') {
        var notifyText = step.text || results.synthesis || 'Task complete.';
        notifyText = notifyText.replace(/\{synthesis\}/g, results.synthesis || '');
        notifyText = notifyText.replace(/\{userMsg\}/g, userMsg);
        results.stepResults.push({ type: 'notify', data: { action: 'speak', text: notifyText } });
        results.notifyAction = { action: 'speak', text: notifyText };
        return runStep(stepIndex + 1);
      }

      if (step.type === 'calculate') {
        var expression = step.expression || '';
        expression = expression.replace(/\{([^}]+)\}/g, function(match, key) {
          for (var ci = 0; ci < results.stepResults.length; ci++) {
            if (results.stepResults[ci].type === 'extract' && results.stepResults[ci].data) {
              var numMatch = String(results.stepResults[ci].data).match(new RegExp(key + '[:\\s]*([\\d.,]+)'));
              if (numMatch) return numMatch[1].replace(/,/g, '');
            }
          }
          return '0';
        });
        var calcResult = safeCalc(expression);
        results.stepResults.push({ type: 'calculate', data: calcResult });
        results.calculation = calcResult;
        return runStep(stepIndex + 1);
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
