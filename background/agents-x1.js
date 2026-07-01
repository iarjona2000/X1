/**
 * agents-x1.js — Specialised X1 agents using x1-core AgentManager.
 * Seeds the agent system with useful presets: research, email, code, meeting, writing.
 */

(function() {

  if (typeof X1Bridge === 'undefined' || !X1Bridge.loaded) {
    console.warn('[X1-AGENTS] X1Bridge not loaded');
    return;
  }

  var C = X1Bridge.raw();
  console.log('[X1-AGENTS] Seeding specialised agents...');

  var AGENT_DEFS = [
    {
      name: 'research-agent',
      description: 'Investigación multi-fuente con síntesis y citas. Ideal para deep research.',
      systemPrompt: 'Eres un investigador experto. Buscas información precisa en múltiples fuentes, la contrastas, y presentas una síntesis clara con citas. En español, profesional y riguroso.',
      tools: ['webSearch', 'readPage', 'summarize', 'memoryRecall'],
      traits: ['analytical', 'meticulous', 'citation-aware']
    },
    {
      name: 'email-agent',
      description: 'Gestión de correo: leer, resumir, redactar, responder y organizar Gmail.',
      systemPrompt: 'Eres un asistente de correo experto. Lees correos, los resumes, redactas respuestas profesionales en el tono adecuado, y organizas la bandeja de entrada. En español.',
      tools: ['gmailRead', 'gmailSend', 'gmailDraft', 'gmailSearch', 'gmailSummarize', 'gmailTriage'],
      traits: ['professional', 'concise', 'organized']
    },
    {
      name: 'code-agent',
      description: 'Programación, debugging, code review y generación de código multi-lenguaje.',
      systemPrompt: 'Eres un desarrollador senior experto en múltiples lenguajes. Escribes código limpio, eficiente y bien documentado. Ayudas con debugging, code review y arquitectura.',
      tools: ['codeGeneration', 'codeReview', 'codeExplain', 'debugCode'],
      traits: ['technical', 'precise', 'best-practices']
    },
    {
      name: 'meeting-agent',
      description: 'Preparación de reuniones: contexto, asistentes, agenda, documentos relacionados.',
      systemPrompt: 'Eres un asistente de reuniones. Preparas contexto, resumes correos de asistentes, encuentras documentos relacionados, y propones agenda. En español.',
      tools: ['calendarRead', 'gmailSearch', 'driveSearch', 'memoryRecall'],
      traits: ['prepared', 'context-aware', 'proactive']
    },
    {
      name: 'writing-agent',
      description: 'Redacción profesional: documentos, informes, propuestas, artículos y contenido creativo.',
      systemPrompt: 'Eres un escritor profesional con dominio de múltiples formatos: informes ejecutivos, artículos, propuestas, documentación técnica y contenido creativo. En español, con estilo adaptativo.',
      tools: ['newDoc', 'typeInDoc', 'expandText', 'rewrite', 'summarize', 'correctText'],
      traits: ['versatile', 'adaptive-style', 'thorough']
    },
    {
      name: 'analyst-agent',
      description: 'Análisis de datos, finanzas, métricas y reporting con Sheets.',
      systemPrompt: 'Eres un analista de datos experto. Trabajas con hojas de cálculo, extraes métricas, creas informes y dashboards. Preciso con números y visualizaciones.',
      tools: ['sheetsRead', 'sheetsAppend', 'sheetsUpdate', 'financialData', 'extractData'],
      traits: ['numerical', 'analytical', 'data-driven']
    }
  ];

  function ensureStore() {
    return {
      get: function(k) { return new Promise(function(r) { chrome.storage.local.get(k, function(v) { r(v[k]); }); }); },
      set: function(k, v) { var o = {}; o[k] = v; return new Promise(function(resolve) { chrome.storage.local.set(o, function() { resolve(); }); }); }
    };
  }

  function ensureMemoryManager() {
    if (C.MemoryManager) {
      return new C.MemoryManager({ store: ensureStore(), getConfig: function() { return Promise.resolve({}); } });
    }
    return null;
  }

  function ensureAgentManager() {
    if (!C.AgentManager) return null;
    var mem = ensureMemoryManager();
    var am = new C.AgentManager({ store: ensureStore(), memory: mem });
    try { am.ensureTools(); } catch(e) {}
    return am;
  }

  // Seed agents into the x1-core AgentManager
  function seedAgents() {
    return new Promise(function(resolve) {
      try {
        var am = ensureAgentManager();
        if (!am) { console.warn('[X1-AGENTS] AgentManager not available'); resolve(false); return; }

        am.list().then(function(existing) {
          var existingNames = {};
          existing.forEach(function(a) { existingNames[a.name] = true; });

          var promises = [];
          AGENT_DEFS.forEach(function(def) {
            if (existingNames[def.name]) return;
            promises.push(am.create({
              name: def.name,
              description: def.description,
              systemPrompt: def.systemPrompt,
              tools: def.tools,
              traits: def.traits,
              temperature: def.name === 'code-agent' ? 0.2 : def.name === 'analyst-agent' ? 0.15 : 0.5
            }).then(function(a) {
              console.log('[X1-AGENTS] Created agent: ' + def.name);
              return a;
            }).catch(function(e) {
              console.warn('[X1-AGENTS] Failed to create agent ' + def.name + ': ' + e.message);
            }));
          });

          Promise.all(promises).then(function() {
            console.log('[X1-AGENTS] Seeding complete. ' + promises.length + ' agents created.');
            resolve(true);
          });
        }).catch(function(e) {
          console.warn('[X1-AGENTS] Error listing existing agents:', e.message);
          resolve(false);
        });
      } catch(e) {
        console.warn('[X1-AGENTS] Seeding error:', e.message);
        resolve(false);
      }
    });
  }

  // Expose seed function globally so it can be called from service-worker
  window.x1SeedAgents = seedAgents;

  // Auto-seed after a short delay (to let SW finish loading)
  setTimeout(seedAgents, 2000);

  // ── Also expose the agent definitions for voice commands ──
  window.x1AgentDefs = AGENT_DEFS;

  // ── Register specialized agent commands in parseCommand ──
  // These are additional command patterns that call agents directly.
  setTimeout(function() {
    if (typeof window.parseCommand !== 'function') return;

    var _orig = window.parseCommand;
    window.parseCommand = function(cmd) {
      var r = _orig(cmd);
      if (r) return r;

      var l = (cmd || '').toLowerCase().trim();

      // "investiga <tema>" → research-agent
      var mResearch = l.match(/^(investiga|research|busca\s+info\s+(sobre\s+|de\s+)?|deep\s+research)\s+(.+)/i);
      if (mResearch) {
        window.x1SeedAgents();
        return { action: 'x1agent', agentName: 'research-agent', goal: mResearch[3] || mResearch[2] || cmd };
      }

      // "correo: <instrucción>" → email-agent
      var mEmail = l.match(/^(correo|email|mail)\s*:\s*(.+)/i);
      if (mEmail) {
        window.x1SeedAgents();
        return { action: 'x1agent', agentName: 'email-agent', goal: mEmail[2] };
      }

      // "programa <descripción>" → code-agent
      var mCode = l.match(/^(programa|escribe\s+c[oó]digo|code|implementa)\s+(.+)/i);
      if (mCode) {
        window.x1SeedAgents();
        return { action: 'x1agent', agentName: 'code-agent', goal: mCode[2] };
      }

      // "prepara reunión <tema>" → meeting-agent
      var mMeeting = l.match(/^(prepara\s+(reuni[oó]n|meeting)|meeting\s+prep)\s*(.+)?/i);
      if (mMeeting) {
        window.x1SeedAgents();
        return { action: 'x1agent', agentName: 'meeting-agent', goal: mMeeting[3] || 'preparar próxima reunión' };
      }

      // "escribe <tipo>" → writing-agent
      var mWrite = l.match(/^(escribe\s+(un|una)\s+(documento|informe|art[ií]culo|propuesta|carta|email)|redacta\s+(un|una))\s+(.+)/i);
      if (mWrite) {
        window.x1SeedAgents();
        return { action: 'x1agent', agentName: 'writing-agent', goal: mWrite[0] };
      }

      // "analiza <tema>" → analyst-agent
      var mAnalyst = l.match(/^(analiza|analize|analiza\s+datos)\s+(.+)/i);
      if (mAnalyst) {
        window.x1SeedAgents();
        return { action: 'x1agent', agentName: 'analyst-agent', goal: mAnalyst[2] };
      }

      return null;
    };
    console.log('[X1-AGENTS] Voice command patterns registered for ' + AGENT_DEFS.length + ' agents');
  }, 100);

})();
