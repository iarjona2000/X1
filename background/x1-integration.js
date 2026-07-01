/**
 * x1-integration.js — Wires X1Core backend into cbos-ext service worker.
 * Loaded after X1Bridge. Adds new global functions and patches existing flow.
 */

(function() {
  if (typeof X1Bridge === 'undefined' || !X1Bridge.loaded) {
    console.warn('[X1] Integration skipped: X1Bridge not loaded');
    return;
  }

  console.log('[X1] Integration: wiring X1Core into cbos-ext...');

  var C = X1Bridge.raw();

  // ── 1. ENHANCED SECTOR DETECTION ──
  // Wraps the existing classifyTask with x1-core's Router + TaskRouter
  window.x1DetectSector = function(text) {
    try {
      if (C.Router) {
        var router = new C.Router({ config: null, judge: null });
        return router.detectSector(text);
      }
    } catch(e) {
      console.warn('[X1] Sector detection error:', e.message);
    }
    return { sector: 'general', confidence: 0, scores: {} };
  };

  window.x1ClassifyTask = function(text) {
    try {
      if (C.TaskRouter) {
        var tr = new C.TaskRouter();
        return tr.classify(text);
      }
    } catch(e) {
      console.warn('[X1] Task classification error:', e.message);
    }
    return { type: 'general', confidence: 0, scores: {} };
  };

  // ── 2. X1 LOGGER ──
  window.x1Log = function(module) {
    return X1Bridge.log(module || 'X1');
  };

  // ── 3. JUDGE SYSTEM WRAPPER ──
  window.x1EvaluateResponse = function(text, query, sector) {
    return X1Bridge.evaluateResponse(text, query, sector);
  };

  window.x1CompareResponses = function(responses, query) {
    return X1Bridge.compareResponses(responses, query);
  };

  window.x1RecordVote = function(vote) {
    return X1Bridge.recordVote(vote);
  };

  // ── 4. BUDGET MANAGER ──
  window.x1Budget = {
    _instance: null,
    _getInstance: function() {
      if (this._instance) return this._instance;
      if (!C.BudgetManager) return null;
      this._instance = new C.BudgetManager({
        store: {
          get: function(k) { return new Promise(function(r) { chrome.storage.local.get(k, function(v) { r(v[k]); }); }); },
          set: function(k, v) { var o = {}; o[k] = v; return new Promise(function(r) { chrome.storage.local.set(o, function() { r(); }); }); }
        },
        getConfig: function() {
          return new Promise(function(r) {
            chrome.storage.local.get('x1_config', function(v) {
              r(v && v.x1_config ? v.x1_config : {});
            });
          });
        }
      });
      return this._instance;
    },
    status: function() {
      var bm = this._getInstance();
      return bm ? bm.status() : Promise.resolve(null);
    },
    record: function(model, inputTokens, outputTokens) {
      var bm = this._getInstance();
      return bm ? bm.record({ model: model, inputTokens: inputTokens, outputTokens: outputTokens }) : Promise.resolve(null);
    },
    canAfford: function(model, critical) {
      var bm = this._getInstance();
      return bm ? bm.canAfford({ model: model, critical: critical || false }) : Promise.resolve({ allowed: true });
    }
  };

  // ── 5. EMBEDDING SERVICE ──
  window.x1Embed = function(text, provider) {
    if (C.EmbeddingService && C.embeddings) {
      return C.embeddings.generate(text, provider);
    }
    return Promise.resolve(null);
  };

  // ── 6. TREE OF THOUGHTS PLANNER ──
  window.x1PlanTask = function(goal, options) {
    if (C.TreeOfThoughts) {
      var tot = new C.TreeOfThoughts();
      return tot.plan(goal, options || {});
    }
    return Promise.resolve({ plan: [], score: 0 });
  };

  // ── 7. FAC CHECKER ──
  window.x1FactCheck = function(answer, query) {
    if (C.FactChecker && C.workspace) {
      var fc = new C.FactChecker({ workspace: C.workspace });
      return fc.verify({ answer: answer, query: query });
    }
    return Promise.resolve({ verified: true, claims: [], sources: [] });
  };

  // ── 8. PREDICTIVE SUGGESTIONS ──
  window.x1GetSuggestions = function() {
    if (C.PredictiveAssistant && C.workspace && C.StorageManager) {
      var pa = new C.PredictiveAssistant({
        workspace: C.workspace,
        storage: C.StorageManager,
        getConfig: function() { return X1Bridge.getConfig(); }
      });
      return pa.getSuggestions({ max: 3 });
    }
    return Promise.resolve([]);
  };

  // ── 9. ENHANCE buildSystemPrompt (monkey-patch style) ──
  // We don't replace the existing function but add a helper that
  // existing code can call to inject x1-core context into prompts.
  window.x1BuildContext = function(userQuery) {
    var ctx = {};
    try {
      var sector = x1DetectSector(userQuery || '');
      var task = x1ClassifyTask(userQuery || '');
      ctx.sector = sector.sector;
      ctx.sectorConfidence = sector.confidence;
      ctx.taskType = task.type;
      ctx.taskConfidence = task.confidence;
    } catch(e) {
      ctx.sector = 'general';
      ctx.taskType = 'general';
    }
    return ctx;
  };

  // ── 10. X1 AGENT MANAGER (alternative agent system) ──
  window.x1Agent = {
    _manager: null,
    _getManager: function() {
      if (this._manager) return this._manager;
      if (!C.AgentManager || !C.MemoryManager) return null;
      var storeAdapter = {
        get: function(k) { return new Promise(function(r) { chrome.storage.local.get(k, function(v) { r(v[k]); }); }); },
        set: function(k, v) { var o = {}; o[k] = v; return new Promise(function(r) { chrome.storage.local.set(o, function() { r(); }); }); }
      };
      var mem = new C.MemoryManager({ store: storeAdapter, getConfig: function() { return X1Bridge.getConfig(); } });
      this._manager = new C.AgentManager({ store: storeAdapter, memory: mem });
      this._manager.ensureTools();
      return this._manager;
    },
    list: function() {
      var am = this._getManager();
      return am ? am.list().then(function(agents) { return agents.map(function(a) { return a.toJSON(); }); }) : Promise.resolve([]);
    },
    create: function(config) {
      var am = this._getManager();
      return am ? am.create(config).then(function(a) { return a.toJSON(); }) : Promise.resolve(null);
    },
    run: function(id, goal, history) {
      var am = this._getManager();
      return am ? am.run(id, goal, { history: history || [] }) : Promise.resolve(null);
    }
  };

  // ── 11. ENSEMBLE COMPARISON ──
  window.x1Compare = function(query, models, sector) {
    if (C.EnsembleEngine && C.JudgeSystem) {
      var ensemble = new C.EnsembleEngine({
        judge: C.JudgeSystem,
        buildPrompt: function(q, s) {
          return { system: 'Eres X1, asistente de IA experto en ' + (s || 'general') + '. Responde en español.', user: q };
        }
      });
      return ensemble.compare({ query: query, models: models || ['gpt-4o-mini', 'gemini-1.5-flash'], sector: sector || 'general' });
    }
    return Promise.resolve(null);
  };

  console.log('[X1] Integration complete: 11 modules wired');

  // ── 12. ACTIVE PATCHING: wire x1-core into the running service worker ──
  // Deferred via setTimeout(0) because service-worker.js defines functions
  // AFTER importScripts completes.
  setTimeout(function() {

    // ── Patch buildSystemPrompt to inject x1-core sector/task context ──
    if (typeof window.buildSystemPrompt === 'function') {
      var _origBuildPrompt = window.buildSystemPrompt;
      window.buildSystemPrompt = function(pageCtx, userQuery) {
        var prompt = _origBuildPrompt(pageCtx, userQuery);
        try {
          var ctx = x1BuildContext(userQuery || '');
          if (ctx.sector && ctx.sector !== 'general') {
            prompt = prompt.replace('{AGENT_MODE}', '{AGENT_MODE}').replace('{AGENT_MODE}',
              '{AGENT_MODE} | SECTOR DETECTADO: ' + ctx.sector.toUpperCase() +
              ' (confianza: ' + Math.round(ctx.sectorConfidence * 100) + '%)');
          }
        } catch(e) {
          /* silent */
        }
        return prompt;
      };
      console.log('[X1] Active patch: buildSystemPrompt enhanced with X1Core sector detection');
    } else {
      console.log('[X1] Active patch: buildSystemPrompt not yet defined, skipping');
    }

    // ── Add new x1-core actions to execAction ──
    if (typeof window.execAction === 'function') {
      var _origExecAction = window.execAction;
      window.execAction = function(act, tabId) {
        if (!act || !act.action) return _origExecAction(act, tabId);

        // X1 Agent run action
        if (act.action === 'x1agent') {
          return Promise.resolve().then(function() {
            if (act.agentId) {
              return x1Agent.run(act.agentId, act.goal || act.text || '', []);
            }
            if (act.agentName) {
              return x1Agent.list().then(function(agents) {
                var found = agents.filter(function(a) { return a.name === act.agentName; });
                if (found.length) return x1Agent.run(found[0].id, act.goal || act.text || '', []);
                return { text: 'Agente "' + act.agentName + '" no encontrado. Usa "x1 agent list" para verlos.' };
              });
            }
            return { text: 'Especifica agentId o agentName para ejecutar un agente X1.' };
          }).then(function(r) {
            return { text: (r && r.text) || (r && r.answer) || 'Agente ejecutado.' };
          });
        }

        // X1 Agent list action
        if (act.action === 'x1agentlist') {
          return x1Agent.list().then(function(agents) {
            if (!agents || !agents.length) return { text: 'No hay agentes X1 creados.' };
            var list = agents.map(function(a, i) { return (i+1) + '. ' + a.name + ': ' + (a.description || 'sin descripcion'); }).join('\n');
            return { text: 'Agentes X1 disponibles:\n' + list, showText: true };
          });
        }

        // X1 Compare action  
        if (act.action === 'x1compare') {
          var models = act.models || ['gpt-4o-mini', 'gemini-1.5-flash', 'deepseek-chat'];
          return x1Compare(act.text || act.query || '', models, act.sector).then(function(r) {
            if (!r) return { text: 'Error al comparar modelos.' };
            var best = r.options && r.options.length ? r.options.sort(function(a,b){return (b.score||0)-(a.score||0);})[0] : null;
            var txt = 'Comparacion completada.\n';
            if (best) txt += 'Mejor: ' + best.model + ' (puntuacion: ' + best.score + ')\n';
            txt += 'Modelos evaluados: ' + (r.options||[]).map(function(o){return o.model+'('+o.score+')';}).join(', ');
            return { text: txt, showText: true };
          });
        }

        // X1 Budget status
        if (act.action === 'x1budget') {
          return x1Budget.status().then(function(s) {
            if (!s) return { text: 'Budget manager no disponible.' };
            var txt = 'Presupuesto:\n' +
              '  Diario: $' + s.daily.spent.toFixed(2) + ' / $' + s.daily.limit +
              ' (' + Math.round(s.daily.pct * 100) + '%)\n' +
              '  Mensual: $' + s.monthly.spent.toFixed(2) + ' / $' + s.monthly.limit +
              ' (' + Math.round(s.monthly.pct * 100) + '%)\n' +
              '  Llamadas: ' + s.calls;
            return { text: txt, showText: true };
          });
        }

        // X1 Plan task with Tree-of-Thoughts
        if (act.action === 'x1plan') {
          return x1PlanTask(act.goal || act.text || '', {}).then(function(r) {
            if (!r || !r.plan || !r.plan.length) return { text: 'No se pudo generar plan.' };
            var txt = 'Plan generado (Tree-of-Thoughts):\n';
            r.plan.forEach(function(p, i) { txt += (i+1) + '. ' + p + '\n'; });
            txt += '\nPuntuacion: ' + (r.score || 0) + '/10';
            return { text: txt, showText: true };
          });
        }

        // X1 Fact check
        if (act.action === 'x1factcheck') {
          return x1FactCheck(act.text || '', act.query || '').then(function(r) {
            if (!r) return { text: 'Fact checker no disponible.' };
            var claims = r.claims || [];
            var supported = claims.filter(function(c){return c.status === 'supported';}).length;
            var total = claims.length;
            var txt = total ? ('Verificacion: ' + supported + '/' + total + ' afirmaciones verificadas') : 'Sin afirmaciones que verificar.';
            if (claims.length) {
              txt += '\nDetalle:\n' + claims.map(function(c){return '  - ' + c.claim + ' [' + c.status + ']';}).join('\n');
            }
            return { text: txt, showText: true };
          });
        }

        // X1 Forest (default actions pass through)
        return _origExecAction(act, tabId);
      };
      console.log('[X1] Active patch: execAction enhanced with X1Core actions (x1agent, x1compare, x1budget, x1plan, x1factcheck)');
    }

    // ── Patch parseCommand to intercept x1-* commands ──
    if (typeof window.parseCommand === 'function') {
      var _origParseCmd = window.parseCommand;
      window.parseCommand = function(cmd) {
        // Try original parseCommand first
        var result = _origParseCmd(cmd);
        if (result) return result;

        var l = (cmd || '').toLowerCase().trim();

        // x1 agent list
        if (/^x1\s+agent\s+list/i.test(l)) {
          return { action: 'x1agentlist', text: cmd };
        }

        // x1 agent run <name> <goal>
        var agentMatch = l.match(/^x1\s+agent\s+run\s+(\S+)(?:\s+(.+))?/i);
        if (agentMatch) {
          return { action: 'x1agent', agentName: agentMatch[1], goal: agentMatch[2] || '' };
        }

        // x1 compare <query>
        var compareMatch = l.match(/^x1\s+compare\s+(.+)/i);
        if (compareMatch) {
          return { action: 'x1compare', query: compareMatch[1] };
        }

        // x1 budget
        if (/^x1\s+budget/i.test(l)) {
          return { action: 'x1budget' };
        }

        // x1 plan <goal>
        var planMatch = l.match(/^x1\s+plan\s+(.+)/i);
        if (planMatch) {
          return { action: 'x1plan', goal: planMatch[1] };
        }

        // x1 factcheck <text>
        var fcMatch = l.match(/^x1\s+factcheck\s+(.+)/i);
        if (fcMatch) {
          return { action: 'x1factcheck', text: fcMatch[1] };
        }

        return null;
      };
      console.log('[X1] Active patch: parseCommand enhanced with x1-* command patterns');
    }

    // ── Add x1-core context logging to aiComplete ──
    if (typeof window.aiComplete === 'function') {
      var _origAiComplete = window.aiComplete;
      window.aiComplete = function(userMsg) {
        return _origAiComplete(userMsg).then(function(result) {
          if (result && result.action) {
            try {
              var ctx = x1BuildContext(userMsg || '');
              if (ctx.sector && ctx.sector !== 'general') {
                console.log('[X1-x1core] Sector:', ctx.sector, '| Task:', ctx.taskType, '| Action:', result.action);
              }
              // Track budget if we know the model (logged by cascade)
              if (result._model) {
                x1Budget.record(result._model, result._inputTokens || 100, result._outputTokens || 100).catch(function() {});
              }
            } catch(e) {
              /* silent */
            }
          }
          return result;
        });
      };
      console.log('[X1] Active patch: aiComplete enhanced with X1Core sector logging');
    }

    console.log('[X1] Active patches applied. X1Core fully wired into cbos-ext runtime.');
    console.log('[X1] New voice commands:');
    console.log('[X1]   "x1 agent list" → list X1 agents');
    console.log('[X1]   "x1 agent run <name> <goal>" → run an X1 agent');
    console.log('[X1]   "x1 compare <query>" → compare AI models');
    console.log('[X1]   "x1 budget" → show AI usage budget');
    console.log('[X1]   "x1 plan <goal>" → Tree-of-Thoughts planning');
    console.log('[X1]   "x1 factcheck <text>" → verify facts');

  }, 0);

  if (typeof X1Bridge !== 'undefined') {
    X1Bridge._integrationReady = true;
  }
})();
