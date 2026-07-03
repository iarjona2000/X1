/**
 * x1-api.js — X1 API layer connecting frontend (voice-listener) to x1-core backend.
 * 
 * Provides a chrome.runtime.onMessage handler for X1_API_* action types.
 * Frontend sends: { type: 'X1_API', action: 'agentList', payload: {...} }
 * Backend responds: { ok: true, data: {...} }
 * 
 * Also broadcasts process bar updates during long operations.
 */

(function() {

  if (typeof X1Bridge === 'undefined' || !X1Bridge.loaded) {
    console.warn('[X1-API] X1Bridge not loaded, deferring initialization');
    return;
  }

  var C = X1Bridge.raw();
  var log = (typeof x1Log === 'function') ? x1Log('API') : { info: function(m){console.log('[X1-API]',m);}, error: function(m){console.error('[X1-API]',m);} };

  // ─── Continue.dev Provider Classes (Apache 2.0 - Continue.dev Contributors) ───

  /** @typedef {{model: string, temperature?: number, maxTokens?: number, systemMessage?: string, apiKey?: string, apiBase?: string, options?: Object}} ContinueLLMOptions */

  /** @typedef {{role: 'system'|'user'|'assistant', content: string}} ChatMessage */

  /** @typedef {{completion: string, usage?: {promptTokens: number, completionTokens: number}}} LLMResponse */

  // Base class
  function BaseLLMProvider(options) {
    this.options = options || {};
    this.model = options.model || 'default';
    this.temperature = options.temperature !== undefined ? options.temperature : 0.7;
    this.maxTokens = options.maxTokens || 4096;
    this.systemMessage = options.systemMessage || '';
    this.apiKey = options.apiKey || '';
    this.apiBase = options.apiBase || '';
  }
  BaseLLMProvider.prototype.complete = function(messages) { throw new Error('complete() must be implemented'); };
  BaseLLMProvider.prototype.streamComplete = function(messages, onToken) { throw new Error('streamComplete() must be implemented'); };
  BaseLLMProvider.prototype.getModel = function() { return this.model; };
  BaseLLMProvider.prototype.getMaxTokens = function() { return this.maxTokens; };

  // Ollama Provider
  function OllamaProvider(options) {
    BaseLLMProvider.call(this, options);
    this.apiBase = options.apiBase || 'http://localhost:11434';
  }
  OllamaProvider.prototype = Object.create(BaseLLMProvider.prototype);
  OllamaProvider.prototype.constructor = OllamaProvider;
  OllamaProvider.prototype.complete = function(messages) {
    var self = this;
    return fetch(this.apiBase + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        stream: false,
        options: { temperature: this.temperature, num_predict: this.maxTokens }
      })
    }).then(function(r) { return r.json(); })
    .then(function(data) {
      return { completion: data.message && data.message.content || '', usage: { promptTokens: data.prompt_eval_count || 0, completionTokens: data.eval_count || 0 } };
    });
  };
  OllamaProvider.prototype.streamComplete = function(messages, onToken) {
    var self = this;
    return fetch(this.apiBase + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, messages: messages, stream: true, options: { temperature: this.temperature, num_predict: this.maxTokens } })
    }).then(function(r) {
      var reader = r.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';
      function read() {
        return reader.read().then(function(result) {
          if (result.done) return;
          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop();
          lines.forEach(function(line) {
            if (line.trim()) {
              try { var data = JSON.parse(line); if (data.message && data.message.content) onToken(data.message.content); } catch(e) {}
            }
          });
          return read();
        });
      }
      return read().then(function() { return { completion: '', usage: { promptTokens: 0, completionTokens: 0 } }; });
    });
  };

  // OpenAI-compatible Provider (Groq, Cerebras, Together, OpenRouter, OpenAI, DeepSeek, etc.)
  function OpenAICompatibleProvider(options) {
    BaseLLMProvider.call(this, options);
    this.apiBase = options.apiBase || 'https://api.openai.com/v1';
    this.extraHeaders = options.headers || {};
  }
  OpenAICompatibleProvider.prototype = Object.create(BaseLLMProvider.prototype);
  OpenAICompatibleProvider.prototype.constructor = OpenAICompatibleProvider;
  OpenAICompatibleProvider.prototype.complete = function(messages) {
    var self = this;
    var headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.apiKey };
    Object.assign(headers, this.extraHeaders);
    return fetch(this.apiBase + '/chat/completions', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ model: this.model, messages: messages, temperature: this.temperature, max_tokens: this.maxTokens, stream: false })
    }).then(function(r) { return r.json(); })
    .then(function(data) {
      var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '';
      return { completion: content, usage: data.usage || { promptTokens: 0, completionTokens: 0 } };
    });
  };
  OpenAICompatibleProvider.prototype.streamComplete = function(messages, onToken) {
    var self = this;
    var headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.apiKey };
    Object.assign(headers, this.extraHeaders);
    return fetch(this.apiBase + '/chat/completions', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ model: this.model, messages: messages, temperature: this.temperature, max_tokens: this.maxTokens, stream: true })
    }).then(function(r) {
      var reader = r.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';
      function read() {
        return reader.read().then(function(result) {
          if (result.done) return;
          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop();
          lines.forEach(function(line) {
            line = line.trim();
            if (line.startsWith('data: ')) {
              line = line.slice(6);
              if (line === '[DONE]') return;
              try { var data = JSON.parse(line); var delta = data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content; if (delta) onToken(delta); } catch(e) {}
            }
          });
          return read();
        });
      }
      return read().then(function() { return { completion: '', usage: { promptTokens: 0, completionTokens: 0 } }; });
    });
  };

  // Gemini Provider (OpenAI-compatible endpoint)
  function GeminiProvider(options) {
    BaseLLMProvider.call(this, options);
    this.apiBase = options.apiBase || 'https://generativelanguage.googleapis.com/v1beta/openai/';
  }
  GeminiProvider.prototype = Object.create(OpenAICompatibleProvider.prototype);
  GeminiProvider.prototype.constructor = GeminiProvider;

  // Expose globally for handlers (MV3 service worker has `self`, not `window`)
  self.BaseLLMProvider = BaseLLMProvider;
  self.OllamaProvider = OllamaProvider;
  self.OpenAICompatibleProvider = OpenAICompatibleProvider;
  self.GeminiProvider = GeminiProvider;

  // ── Progress broadcast helper ──
  function broadcastProgress(tabId, app, description, status) {
    try {
      if (typeof stepProgress === 'function') {
        stepProgress(tabId, app, description, status);
      } else {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs && tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'X1_STEP_PROGRESS',
              source: 'x1-api',
              app: app,
              description: description,
              status: status
            }).catch(function(){});
          }
        });
      }
    } catch(e) {}
  }

  // ── Store adapters (shared across x1-core modules) ──
  function makeStore() {
    return {
      get: function(k) {
        return new Promise(function(r) {
          chrome.storage.local.get(k, function(v) { r(v && v[k] !== undefined ? v[k] : null); });
        });
      },
      set: function(k, v) {
        var o = {};
        o[k] = v;
        return new Promise(function(resolve) {
          chrome.storage.local.set(o, function() { resolve(); });
        });
      }
    };
  }

  function makeConfigGetter() {
    return function() {
      return new Promise(function(r) {
        chrome.storage.local.get('x1_config', function(v) { r(v && v.x1_config ? v.x1_config : {}); });
      });
    };
  }

  // ── Lazy singleton for orchestrator ──
  var _orchestrator = null;
  function getOrchestrator() {
    if (_orchestrator) return _orchestrator;
    if (!C.Orchestrator) return null;
    _orchestrator = new C.Orchestrator();
    return _orchestrator;
  }

  // ── Lazy instances for subsystems ──
  var _instances = {};
  function getModule(name, factory) {
    if (!_instances[name]) {
      _instances[name] = factory();
    }
    return _instances[name];
  }

  function getBudgetManager() {
    return getModule('budget', function() {
      if (!C.BudgetManager) return null;
      return new C.BudgetManager({ store: makeStore(), getConfig: makeConfigGetter() });
    });
  }

  function getAgentManager() {
    return getModule('agentManager', function() {
      if (!C.AgentManager || !C.MemoryManager) return null;
      var store = makeStore();
      var mem = new C.MemoryManager({ store: store, getConfig: makeConfigGetter() });
      var am = new C.AgentManager({ store: store, memory: mem });
      try { am.ensureTools(); } catch(e) {}
      return am;
    });
  }

  function getMemoryManager() {
    return getModule('memory', function() {
      if (!C.MemoryManager) return null;
      return new C.MemoryManager({ store: makeStore(), getConfig: makeConfigGetter() });
    });
  }

  function getFactChecker() {
    return getModule('factcheck', function() {
      if (!C.FactChecker) return null;
      return new C.FactChecker({});
    });
  }

  function getEnsemble() {
    return getModule('ensemble', function() {
      if (!C.EnsembleEngine || !C.JudgeSystem) return null;
      return new C.EnsembleEngine({
        judge: C.JudgeSystem,
        buildPrompt: function(q, s) {
          return { system: 'Eres X1, asistente de IA experto en ' + (s || 'general') + '. Responde en español, preciso y útil.', user: q };
        }
      });
    });
  }

  // ── Action handlers ──

  // ── Mapping: x1-api handler name → X1Protocol.REQ.* type ──
  // Si una handler no tiene mapeo, se salta la validación (no rompe nada
  // existente). Sólo las que tienen schema en protocol.js se validan.
  var handlerToReq = {
    agentList:       'AGENT_LIST',
    agentCreate:     'AGENT_CREATE',
    agentUpdate:     'AGENT_UPDATE',
    agentDelete:     'AGENT_DELETE',
    agentRun:        'AGENT_RUN',
    agentSeed:       'AGENT_SEED',
    memoryRecall:    'MEMORY_RECALL',
    memoryRemember:  'MEMORY_REMEMBER',
    memoryStats:     'MEMORY_STATS',
    memoryForgetAll: 'MEMORY_FORGET_ALL',
    factCheck:       'FACT_CHECK',
    compare:         'COMPARE',
    vote:            'VOTE',
    budgetStatus:    'BUDGET_STATUS',
    projectCreate:   'PROJECT_CREATE',
    projectList:     'PROJECT_LIST',
    projectReport:   'PROJECT_REPORT',
    projectUpdateTask: 'PROJECT_UPDATE_TASK',
    workspaceStatus: 'WORKSPACE_STATUS',
    workspaceInbox:  'WORKSPACE_INBOX',
    planTask:        'PLAN_TASK',
    teamCreate:      'TEAM_CREATE',
    teamList:        'TEAM_LIST',
    teamRun:         'TEAM_RUN',
    health:          'HEALTH',
    configGet:       'CONFIG_GET',
    configSave:      'CONFIG_SAVE',
    historyGet:      'HISTORY_GET'
  };

  // Lookup de constante real (si el protocolo está cargado).
  // Fallback al string literal si X1Protocol aún no existe.
  function resolveReqType(handlerName) {
    var key = handlerToReq[handlerName];
    if (!key) return null;
    if (typeof X1Protocol !== 'undefined' && X1Protocol.REQ && X1Protocol.REQ[key]) {
      return X1Protocol.REQ[key];
    }
    return key;
  }

  var handlers = {};

  // ── Agent actions ──
  handlers.agentList = function(payload) {
    var am = getAgentManager();
    if (!am) return Promise.resolve({ ok: false, error: 'AgentManager not available', data: [] });
    return am.list().then(function(agents) {
      return { ok: true, data: agents.map(function(a) { return a.toJSON(); }) };
    });
  };

  handlers.agentCreate = function(payload) {
    var am = getAgentManager();
    if (!am) return Promise.resolve({ ok: false, error: 'AgentManager not available' });
    return am.create(payload.config).then(function(a) {
      return { ok: true, data: a.toJSON() };
    });
  };

  handlers.agentRun = function(payload) {
    var am = getAgentManager();
    if (!am) return Promise.resolve({ ok: false, error: 'AgentManager not available' });
    var tabId = payload.tabId || null;
    broadcastProgress(tabId, '🤖', 'Ejecutando agente: ' + (payload.agentId || payload.agentName || ''), 'active');
    var p = payload.agentId
      ? am.run(payload.agentId, payload.goal, { history: payload.history || [] })
      : am.list().then(function(agents) {
          var found = agents.filter(function(a) { return a.name === payload.agentName; });
          if (found.length) return am.run(found[0].id, payload.goal, { history: payload.history || [] });
          return { text: 'Agente "' + payload.agentName + '" no encontrado.' };
        });
    return p.then(function(r) {
      broadcastProgress(tabId, '🤖', 'Agente completado', 'done');
      return { ok: true, data: r };
    }).catch(function(e) {
      broadcastProgress(tabId, '🤖', 'Error en agente', 'error');
      return { ok: false, error: e.message };
    });
  };

  handlers.agentDelete = function(payload) {
    var am = getAgentManager();
    if (!am) return Promise.resolve({ ok: false, error: 'AgentManager not available' });
    return am.delete(payload.id).then(function() {
      return { ok: true, data: { deleted: true } };
    });
  };

  handlers.agentSeed = function() {
    var am = getAgentManager();
    if (!am) return Promise.resolve({ ok: false, error: 'AgentManager not available' });
    if (typeof am.seedDefaults === 'function') {
      return am.seedDefaults().then(function(agents) {
        return { ok: true, data: agents.map(function(a) { return a.toJSON(); }) };
      });
    }
    return Promise.resolve({ ok: false, error: 'seedDefaults not available' });
  };

  // ── Memory actions ──
  handlers.memoryRecall = function(payload) {
    var mm = getMemoryManager();
    if (!mm) return Promise.resolve({ ok: false, error: 'MemoryManager not available', data: [] });
    return mm.recall(payload.query, { k: payload.k || 5, sector: payload.sector }).then(function(results) {
      return { ok: true, data: results };
    }).catch(function(e) {
      return { ok: false, error: e.message, data: [] };
    });
  };

  handlers.memoryRemember = function(payload) {
    var mm = getMemoryManager();
    if (!mm) return Promise.resolve({ ok: false, error: 'MemoryManager not available' });
    return mm.remember({ text: payload.text, type: payload.type || 'conversation', sector: payload.sector }).then(function() {
      return { ok: true, data: { stored: true } };
    }).catch(function(e) {
      return { ok: false, error: e.message };
    });
  };

  handlers.memoryStats = function() {
    var mm = getMemoryManager();
    if (!mm) return Promise.resolve({ ok: false, error: 'MemoryManager not available', data: { count: 0 } });
    return mm.stats().then(function(stats) {
      return { ok: true, data: stats };
    }).catch(function() {
      return { ok: true, data: { count: 0 } };
    });
  };

  // ── Fact check actions ──
  handlers.factCheck = function(payload) {
    var fc = getFactChecker();
    if (!fc) return Promise.resolve({ ok: false, error: 'FactChecker not available' });
    return fc.verify({ answer: payload.text, query: payload.query || '' }).then(function(result) {
      return { ok: true, data: result };
    }).catch(function(e) {
      return { ok: false, error: e.message };
    });
  };

  // ── Compare (ensemble) actions ──
  handlers.compare = function(payload) {
    var ens = getEnsemble();
    if (!ens) return Promise.resolve({ ok: false, error: 'Ensemble not available' });
    var tabId = payload.tabId || null;
    broadcastProgress(tabId, '⚖️', 'Comparando modelos de IA...', 'active');
    var models = payload.models || ['gpt-4o-mini', 'gemini-1.5-flash', 'deepseek-chat', 'claude-3-5-haiku-20241022'];
    return ens.compare({ query: payload.query, models: models, sector: payload.sector || 'general' }).then(function(result) {
      broadcastProgress(tabId, '⚖️', 'Comparación completada', 'done');
      return { ok: true, data: result };
    }).catch(function(e) {
      broadcastProgress(tabId, '⚖️', 'Error en comparación', 'error');
      return { ok: false, error: e.message };
    });
  };

  // ── Budget actions ──
  handlers.budgetStatus = function() {
    var bm = getBudgetManager();
    if (!bm) return Promise.resolve({ ok: true, data: null });
    return bm.status().then(function(status) {
      return { ok: true, data: status };
    });
  };

  handlers.budgetCanAfford = function(payload) {
    var bm = getBudgetManager();
    if (!bm) return Promise.resolve({ ok: true, data: { allowed: true } });
    return bm.canAfford({ model: payload.model || 'gpt-4o-mini', critical: payload.critical || false }).then(function(r) {
      return { ok: true, data: r };
    });
  };

  // ── Project actions ──
  handlers.projectCreate = function(payload) {
    if (!C.ProjectManager) return Promise.resolve({ ok: false, error: 'ProjectManager not available' });
    var pm = new C.ProjectManager({ store: makeStore() });
    return pm.createProject({ name: payload.name, goal: payload.goal, deadlineDays: payload.deadlineDays || 14 }).then(function(project) {
      return { ok: true, data: project };
    }).catch(function(e) {
      return { ok: false, error: e.message };
    });
  };

  handlers.projectList = function() {
    if (!C.ProjectManager) return Promise.resolve({ ok: false, error: 'ProjectManager not available', data: [] });
    var pm = new C.ProjectManager({ store: makeStore() });
    return pm.list().then(function(projects) {
      return { ok: true, data: projects };
    });
  };

  handlers.projectReport = function(payload) {
    if (!C.ProjectManager) return Promise.resolve({ ok: false, error: 'ProjectManager not available' });
    var pm = new C.ProjectManager({ store: makeStore() });
    return pm.report(payload.id).then(function(report) {
      return { ok: true, data: report };
    }).catch(function(e) {
      return { ok: false, error: e.message };
    });
  };

  // ── Workspace actions ──
  handlers.workspaceStatus = function() {
    if (!C.workspace) return Promise.resolve({ ok: false, error: 'Workspace not available', data: { loggedIn: false } });
    return C.workspace.isLoggedIn().then(function(loggedIn) {
      return { ok: true, data: { loggedIn: loggedIn } };
    });
  };

  handlers.workspaceInbox = function() {
    if (!C.workspace || typeof C.workspace.inboxSummary !== 'function') {
      return Promise.resolve({ ok: false, error: 'Workspace inbox not available' });
    }
    return C.workspace.inboxSummary().then(function(summary) {
      return { ok: true, data: summary };
    }).catch(function(e) {
      return { ok: false, error: e.message };
    });
  };

  // ── Router / classifier actions ──
  handlers.detectSector = function(payload) {
    if (!C.Router) return Promise.resolve({ ok: true, data: { sector: 'general', confidence: 0 } });
    var router = new C.Router({ config: null, judge: null });
    return Promise.resolve({ ok: true, data: router.detectSector(payload.text || '') });
  };

  handlers.classifyTask = function(payload) {
    if (!C.TaskRouter) return Promise.resolve({ ok: true, data: { type: 'general', confidence: 0, scores: {} } });
    var tr = new C.TaskRouter();
    return Promise.resolve({ ok: true, data: tr.classify(payload.text || '') });
  };

  // ── Planning actions ──
  handlers.planTask = function(payload) {
    var tabId = payload.tabId || null;
    broadcastProgress(tabId, '📋', 'Planificando con Tree-of-Thoughts...', 'active');
    if (!C.TreeOfThoughts) return Promise.resolve({ ok: false, error: 'TreeOfThoughts not available' });
    var tot = new C.TreeOfThoughts();
    return tot.plan(payload.goal || payload.text || '', payload.options || {}).then(function(plan) {
      broadcastProgress(tabId, '📋', 'Plan generado', 'done');
      return { ok: true, data: plan };
    }).catch(function(e) {
      broadcastProgress(tabId, '📋', 'Error en planificación', 'error');
      return { ok: false, error: e.message };
    });
  };

  // ── Team actions ──
  handlers.teamCreate = function(payload) {
    if (!C.CollaborativeEngine || !C.AgentManager) return Promise.resolve({ ok: false, error: 'CollaborativeEngine not available' });
    var store = makeStore();
    var am = getAgentManager();
    var ce = new C.CollaborativeEngine({ store: store, agentManager: am });
    return ce.createTeam({ name: payload.name, description: payload.description || '', agentIds: payload.agentIds }).then(function(team) {
      return { ok: true, data: team };
    }).catch(function(e) {
      return { ok: false, error: e.message };
    });
  };

  handlers.teamList = function() {
    if (!C.CollaborativeEngine) return Promise.resolve({ ok: false, error: 'CollaborativeEngine not available', data: [] });
    var store = makeStore();
    var ce = new C.CollaborativeEngine({ store: store, agentManager: null });
    return ce.listTeams().then(function(teams) {
      return { ok: true, data: teams };
    });
  };

  handlers.teamRun = function(payload) {
    if (!C.CollaborativeEngine || !C.AgentManager) return Promise.resolve({ ok: false, error: 'CollaborativeEngine not available' });
    var store = makeStore();
    var am = getAgentManager();
    var ce = new C.CollaborativeEngine({ store: store, agentManager: am });
    var tabId = payload.tabId || null;
    broadcastProgress(tabId, '👥', 'Ejecutando equipo de agentes...', 'active');
    return ce.runTeam(payload.teamId, payload.goal).then(function(result) {
      broadcastProgress(tabId, '👥', 'Equipo completado', 'done');
      return { ok: true, data: result };
    }).catch(function(e) {
      broadcastProgress(tabId, '👥', 'Error en equipo', 'error');
      return { ok: false, error: e.message };
    });
  };

  // ── Health check ──
  handlers.health = function() {
    if (!C.ProviderRegistry) return Promise.resolve({ ok: true, data: { providers: {}, memory: { count: 0 }, agents: 0 } });
    var registry = new C.ProviderRegistry();
    try { registry.init(); } catch(e) {}
    var mm = getMemoryManager();
    var am = getAgentManager();
    return Promise.all([
      registry.healthAll().catch(function(e) { return { error: e.message }; }),
      mm ? mm.stats().catch(function() { return { count: 0 }; }) : Promise.resolve({ count: 0 }),
      am ? am.list().then(function(a) { return a.length; }).catch(function() { return 0; }) : Promise.resolve(0)
    ]).then(function(results) {
      return { ok: true, data: { providers: results[0], memory: results[1], agents: results[2] } };
    });
  };

  // ── Continue.dev Bridge handlers ───

  var _continueProviders = {};

  function getContinueProvider(name, config) {
    var key = name + ':' + (config.model || 'default');
    if (!_continueProviders[key]) {
      var ProviderClass = null;
      var opts = {
        model: config.model || 'llama3.1',
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        systemMessage: config.systemMessage,
        apiKey: config.apiKey,
        apiBase: config.apiBase
      };
      switch (name.toLowerCase()) {
        case 'ollama':
          if (typeof OllamaProvider !== 'undefined') {
            ProviderClass = OllamaProvider;
          } else {
            // Fallback: crear provider simple
            ProviderClass = function(options) {
              this.options = options;
              this.apiBase = options.apiBase || 'http://localhost:11434';
              this.model = options.model;
              this.temperature = options.temperature || 0.7;
              this.maxTokens = options.maxTokens || 4096;
            };
            ProviderClass.prototype.complete = function(messages) {
              var self = this;
              return fetch(this.apiBase + '/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: this.model,
                  messages: messages,
                  stream: false,
                  options: { temperature: this.temperature, num_predict: this.maxTokens }
                })
              }).then(function(r) { return r.json(); })
              .then(function(data) {
                return { completion: data.message && data.message.content || '', usage: { promptTokens: 0, completionTokens: 0 } };
              });
            };
          }
          break;
        case 'groq':
        case 'cerebras':
        case 'together':
        case 'openrouter':
        case 'deepseek':
        case 'openai':
          if (typeof OpenAICompatibleProvider !== 'undefined') {
            ProviderClass = OpenAICompatibleProvider;
          } else {
            ProviderClass = function(options) {
              this.options = options;
              this.apiBase = options.apiBase || (name === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1');
              this.model = options.model;
              this.apiKey = options.apiKey;
              this.temperature = options.temperature || 0.7;
              this.maxTokens = options.maxTokens || 4096;
            };
            ProviderClass.prototype.complete = function(messages) {
              var self = this;
              return fetch(this.apiBase + '/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.apiKey },
                body: JSON.stringify({
                  model: this.model,
                  messages: messages,
                  temperature: this.temperature,
                  max_tokens: this.maxTokens,
                  stream: false
                })
              }).then(function(r) { return r.json(); })
              .then(function(data) {
                return { completion: data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '', usage: data.usage || { promptTokens: 0, completionTokens: 0 } };
              });
            };
          }
          break;
        case 'gemini':
          if (typeof OpenAICompatibleProvider !== 'undefined') {
            ProviderClass = OpenAICompatibleProvider;
          } else {
            ProviderClass = function(options) {
              this.options = options;
              this.apiBase = options.apiBase || 'https://generativelanguage.googleapis.com/v1beta/openai/';
              this.model = options.model;
              this.apiKey = options.apiKey;
              this.temperature = options.temperature || 0.7;
              this.maxTokens = options.maxTokens || 4096;
            };
            ProviderClass.prototype.complete = function(messages) {
              var self = this;
              return fetch(this.apiBase + 'chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.apiKey },
                body: JSON.stringify({
                  model: this.model,
                  messages: messages,
                  temperature: this.temperature,
                  max_tokens: this.maxTokens,
                  stream: false
                })
              }).then(function(r) { return r.json(); })
              .then(function(data) {
                return { completion: data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '', usage: data.usage || { promptTokens: 0, completionTokens: 0 } };
              });
            };
          }
          break;
        default:
          return Promise.resolve({ ok: false, error: 'Provider no soportado: ' + name });
      }
      try {
        _continueProviders[key] = new ProviderClass(opts);
      } catch(e) {
        return Promise.resolve({ ok: false, error: 'Error creando provider: ' + e.message });
      }
    }
    return Promise.resolve(_continueProviders[key]);
  }

  handlers.continueComplete = function(payload) {
    var providerName = payload.provider || 'ollama';
    var messages = payload.messages || [];
    var config = payload.config || {};
    return getContinueProvider(providerName, config).then(function(provider) {
      if (!provider || provider.ok === false) return provider;
      return provider.complete(messages).then(function(result) {
        return { ok: true, data: result };
      }).catch(function(e) {
        return { ok: false, error: e.message };
      });
    });
  };

  handlers.continueStreamComplete = function(payload) {
    var providerName = payload.provider || 'ollama';
    var messages = payload.messages || [];
    var config = payload.config || {};
    var tabId = payload.tabId;
    return getContinueProvider(providerName, config).then(function(provider) {
      if (!provider || provider.ok === false) return provider;
      if (typeof provider.streamComplete !== 'function') {
        return { ok: false, error: 'Streaming no soportado por este provider' };
      }
      // Streaming via stepProgress
      return new Promise(function(resolve) {
        var fullText = '';
        provider.streamComplete(messages, function(token) {
          fullText += token;
          if (tabId && typeof stepProgress === 'function') {
            stepProgress(tabId, 'Continue', 'Streaming: ' + fullText.substring(0, 50), 'active');
          }
        }).then(function(result) {
          if (tabId && typeof stepDone === 'function') {
            stepDone(tabId, -1); // best effort
          }
          resolve({ ok: true, data: { completion: fullText, usage: result.usage } });
        }).catch(function(e) {
          resolve({ ok: false, error: e.message });
        });
      });
    });
  };

  handlers.continueListModels = function(payload) {
    var providerName = payload.provider || 'ollama';
    var config = payload.config || {};
    if (providerName === 'ollama') {
      var base = config.apiBase || 'http://localhost:11434';
      return fetch(base + '/api/tags').then(function(r) { return r.json(); })
        .then(function(data) {
          var models = (data.models || []).map(function(m) { return m.name; });
          return { ok: true, data: { models: models } };
        }).catch(function(e) { return { ok: false, error: e.message }; });
    }
    // Para otros providers, retornar modelos conocidos
    var known = {
      groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
      cerebras: ['llama3.1-8b', 'llama3.1-70b'],
      together: ['meta-llama/Meta-Llama-3.1-70B-Instruct', 'meta-llama/Meta-Llama-3.1-8B-Instruct'],
      openrouter: ['anthropic/claude-3.5-sonnet', 'google/gemini-flash-1.5', 'meta-llama/llama-3.1-70b-instruct'],
      openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
      gemini: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'],
      deepseek: ['deepseek-chat', 'deepseek-coder']
    };
    return Promise.resolve({ ok: true, data: { models: known[providerName] || [] } });
  };

  handlers.continueSetProvider = function(payload) {
    var name = payload.name;
    var config = payload.config || {};
    if (!name) return Promise.resolve({ ok: false, error: 'Nombre de provider requerido' });
    // Guardar config en storage
    return new Promise(function(resolve) {
      chrome.storage.local.get('continueConfig', function(data) {
        var cfg = data.continueConfig || {};
        cfg[name] = config;
        chrome.storage.local.set({ continueConfig: cfg }, function() {
          resolve({ ok: true, data: { saved: true } });
        });
      });
    });
  };

  handlers.continueGetProvider = function(payload) {
    var name = payload.name;
    return new Promise(function(resolve) {
      chrome.storage.local.get('continueConfig', function(data) {
        var cfg = data.continueConfig || {};
        resolve({ ok: true, data: { config: cfg[name] || null } });
      });
    });
  };

  handlers.continueListProviders = function() {
    return Promise.resolve({
      ok: true,
      data: {
        providers: [
          { id: 'ollama', name: 'Ollama (Local)', requiresApiKey: false, defaultBase: 'http://localhost:11434' },
          { id: 'groq', name: 'Groq', requiresApiKey: true, defaultBase: 'https://api.groq.com/openai/v1' },
          { id: 'cerebras', name: 'Cerebras', requiresApiKey: true, defaultBase: 'https://api.cerebras.ai/v1' },
          { id: 'together', name: 'Together AI', requiresApiKey: true, defaultBase: 'https://api.together.xyz/v1' },
          { id: 'openrouter', name: 'OpenRouter', requiresApiKey: true, defaultBase: 'https://openrouter.ai/api/v1' },
          { id: 'openai', name: 'OpenAI', requiresApiKey: true, defaultBase: 'https://api.openai.com/v1' },
          { id: 'gemini', name: 'Google Gemini', requiresApiKey: true, defaultBase: 'https://generativelanguage.googleapis.com/v1beta/openai/' },
          { id: 'deepseek', name: 'DeepSeek', requiresApiKey: true, defaultBase: 'https://api.deepseek.com/v1' }
        ]
      }
    });
  };

  // ── Register the message listener ──
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (!request || request.type !== 'X1_API') return false;

    var action = request.action;
    var payload = request.payload || {};
    var handler = handlers[action];

    if (!handler) {
      sendResponse({ ok: false, error: 'Unknown X1 API action: ' + action });
      return false;
    }

    // Validate against X1Protocol if available. Handlers without mapping skip
    // validation (no breaking change). On validation failure, return a
    // structured error so the UI can react.
    var reqType = resolveReqType(action);
    if (reqType && typeof X1Protocol !== 'undefined' && typeof X1Protocol.validateRequest === 'function') {
      var validationError = X1Protocol.validateRequest(reqType, payload);
      if (validationError) {
        log.error('Validation failed for X1_API.' + action + ':', validationError);
        sendResponse({
          ok: false,
          error: {
            message: validationError,
            code: X1Protocol.ERR_CODE ? X1Protocol.ERR_CODE.VALIDATION : 'VALIDATION',
            context: { action: action, type: reqType }
          }
        });
        return false;
      }
    }

    payload.tabId = sender && sender.tab ? sender.tab.id : payload.tabId;

    var result = handler(payload);

    if (result && typeof result.then === 'function') {
      result.then(function(response) {
        sendResponse(response);
      }).catch(function(e) {
        sendResponse({ ok: false, error: e.message });
      });
      return true; // async response
    }

    sendResponse(result || { ok: false, error: 'No response' });
    return false;
  });

  log.info('X1 API layer initialized with ' + Object.keys(handlers).length + ' action handlers');

  // Add to X1Bridge for external access
  if (typeof X1Bridge !== 'undefined') {
    X1Bridge._apiHandlers = Object.keys(handlers);
    X1Bridge._apiReady = true;
  }

})();
