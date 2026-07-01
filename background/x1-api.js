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
  var log = x1Log ? x1Log('API') : { info: function(m){console.log('[X1-API]',m);}, error: function(m){console.error('[X1-API]',m);} };

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
