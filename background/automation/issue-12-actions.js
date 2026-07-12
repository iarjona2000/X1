// ═══════════════════════════════════════════
// ISSUE #12 FIX — 11 actions stated in SYSTEM_PROMPT but absent from execAction
// ═══════════════════════════════════════════
// Loaded by service-worker.js via importScripts('automation/issue-12-actions.js')
// right BEFORE 'x1-integration.js' (which crashes on import — must stay last).
//
// Pattern rationale: execAction is a 2000-line switch statement in
// service-worker.js. Adding cases there would require modifying a 19k-line
// file outside the zone we can safely read/edit. Instead, this file:
//   1. Defines the 2 helpers that genuinely don't exist yet
//      (blockDistractionDomain, setAgentAutonomy).
//   2. Wraps the GLOBAL execAction at load time so it recognizes the 11
//      new actions; passes everything else through to the original.
//   3. Leaves no side effects if some underlying helper (e.g. saveWorkspace)
//      is missing — guards each delegation with typeof check and degrades
//      gracefully to a "no disponible" notice.
//
// Vision doc references for the 3 brand-new actions:
//   • generateChapter  — PARTE 6 (narrador semanal automático)
//   • blockDomain      — PARTE 7 (firewall de atención)
//   • setAutonomy      — PARTE 5 (negociación agente-a-agente)
//
// Authors: Tomás Calero (Vektor co-founder) + Buffy assistant.

console.log('[X1-Issue12] Loading 11 missing actions (audit issue #12)…');

// ── Storage helper (consistent with the rest of service-worker.js) ──
function issue12SafeJSON(value, fallback) {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch (e) { return fallback; }
  }
  return value || fallback;
}

// ── NEW HELPER #1: blockDistractionDomain (PARTE 7 — firewall de atención) ──
// Differs from the static blockedDomains object already in service-worker.js,
// which is read by checkDomainBlocks() but has no public setter. Here we
// give the user a real way to say "bloquea twitter.com".
var x1BlockedDomainsDynamic = {};
function loadBlockedDomainsDynamic() {
  chrome.storage.local.get('x1_blocked_domains_dynamic', function(r) {
    x1BlockedDomainsDynamic = issue12SafeJSON(r.x1_blocked_domains_dynamic, {});
  });
}
loadBlockedDomainsDynamic();

function normalizeDomain(input) {
  if (!input) return '';
  return String(input).toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0];
}

function blockDistractionDomain(input) {
  return new Promise(function(resolve) {
    if (!input) {
      resolve({text: 'Necesito un dominio. Ejemplo: "bloquea twitter.com".', showText: true});
      return;
    }
    var domain = normalizeDomain(input);
    if (!domain || domain.indexOf('.') === -1) {
      resolve({text: 'Dominio inválido: "' + input + '". Mira el formato (ejemplo: twitter.com).', showText: true});
      return;
    }
    x1BlockedDomainsDynamic[domain] = {blockedAt: new Date().toISOString(), reason: 'user-requested'};
    chrome.storage.local.set({x1_blocked_domains_dynamic: x1BlockedDomainsDynamic}, function() {
      resolve({
        text: '🚫 Dominio bloqueado: ' + domain + '. Para desbloquearlo: di "desbloquea ' + domain + '".',
        showText: true
      });
    });
  });
}

function unblockDistractionDomain(input) {
  return new Promise(function(resolve) {
    var domain = normalizeDomain(input);
    if (!domain || !x1BlockedDomainsDynamic[domain]) {
      resolve({text: 'Ese dominio no estaba en mi lista de bloqueados. Bloqueados: ' + Object.keys(x1BlockedDomainsDynamic).join(', ') || '(ninguno)', showText: true});
      return;
    }
    delete x1BlockedDomainsDynamic[domain];
    chrome.storage.local.set({x1_blocked_domains_dynamic: x1BlockedDomainsDynamic}, function() {
      resolve({text: '✅ Dominio desbloqueado: ' + domain, showText: true});
    });
  });
}

// ── NEW HELPER #2: setAgentAutonomy (PARTE 5 — negociación agente-a-agente) ──
var x1AutonomyConfig = {};
var AUTONOMY_LEVELS = {
  1: 'solo recopila info, no actúa',
  2: 'sugiere, no confirma',
  3: 'confirma dentro de reglas',
  4: 'autónomo, reporta después',
  5: 'proactivo autónomo, anticipa necesidades'
};

function loadAutonomyConfig() {
  chrome.storage.local.get('x1_autonomy_config', function(r) {
    x1AutonomyConfig = issue12SafeJSON(r.x1_autonomy_config, {});
  });
}
loadAutonomyConfig();

function getAutonomyFor(context) {
  return x1AutonomyConfig[context] || x1AutonomyConfig.default || {level: 3, mode: AUTONOMY_LEVELS[3]};
}

function setAgentAutonomy(context, level) {
  return new Promise(function(resolve) {
    var lvl = parseInt(level, 10);
    if (isNaN(lvl) || lvl < 1 || lvl > 5) {
      var ctx = context || 'default';
      var current = getAutonomyFor(ctx);
      resolve({
        text: '⚠️ Nivel debe ser 1, 2, 3, 4 o 5.\n\n' +
              '1 = solo info · 2 = sugiere · 3 = confirma con reglas ·\n' +
              '4 = autónomo · 5 = proactivo\n\n' +
              'Actual para "' + ctx + '": nivel ' + current.level + ' (' + current.mode + ').',
        showText: true
      });
      return;
    }
    var ctx = context || 'default';
    x1AutonomyConfig[ctx] = {
      level: lvl,
      mode: AUTONOMY_LEVELS[lvl],
      setAt: new Date().toISOString()
    };
    chrome.storage.local.set({x1_autonomy_config: x1AutonomyConfig}, function() {
      resolve({
        text: '🎛️ Autonomía para "' + ctx + '" = nivel ' + lvl + ' (' + AUTONOMY_LEVELS[lvl] + ').',
        showText: true
      });
    });
  });
}

// ── WRAP execAction ──────────────────────────────────────────────────────
// Recognize our 11 new actions; pass everything else through unchanged.
var X1_ISSUE12_ACTIONS = [
  'saveWorkspace', 'restoreWorkspace', 'listWorkspaces',
  'runSwarm', 'checkNoise',
  'trackIntention', 'findIntention', 'updateIntention',
  'generateChapter',
  'blockDomain', 'unblockDomain',
  'setAutonomy'
];

(function installIssue12ExecActionWrap() {
  if (typeof execAction !== 'function') {
    console.warn('[X1-Issue12] execAction not defined at module load — wrap will NOT be installed. Move importScripts earlier.');
    return;
  }
  var _origExecAction = execAction;

  execAction = function(act, tabId) {
    return new Promise(function(resolve, reject) {
      if (!act || typeof act.action !== 'string' || X1_ISSUE12_ACTIONS.indexOf(act.action) === -1) {
        // Not ours — delegate.
        _origExecAction(act, tabId).then(resolve, reject);
        return;
      }

      try {
        switch (act.action) {

          case 'saveWorkspace':
            if (typeof saveWorkspace === 'function') {
              saveWorkspace(act.name || 'workspace');
              resolve({text: '💾 Workspace "' + (act.name || 'workspace') + '" guardado (tabs actuales).', showText: true});
            } else { resolve({text: 'saveWorkspace no disponible.', showText: true}); }
            break;

          case 'restoreWorkspace':
            if (typeof restoreWorkspace === 'function') {
              restoreWorkspace(act.name || 'workspace');
              resolve({text: '📂 Restaurando workspace "' + (act.name || 'workspace') + '"… (pestañas se están abriendo).', showText: true});
            } else { resolve({text: 'restoreWorkspace no disponible.', showText: true}); }
            break;

          case 'listWorkspaces':
            if (typeof listWorkspaces === 'function') {
              listWorkspaces().then(resolve, function(e) { resolve({text: 'Error listando workspaces: ' + e.message, showText: true}); });
            } else { resolve({text: 'listWorkspaces no disponible.', showText: true}); }
            break;

          case 'runSwarm':
            if (typeof runSwarm === 'function') {
              runSwarm(act.goal || act.text || 'tarea sin especificar').then(resolve, function(e) {
                resolve({text: 'Enjambre falló: ' + e.message, showText: true});
              });
            } else { resolve({text: 'runSwarm no disponible.', showText: true}); }
            break;

          case 'checkNoise':
            if (typeof checkNoiseFilters === 'function') {
              var issues = checkNoiseFilters(act.content || '', act.domain || '');
              if (issues && issues.length) {
                var formatted = issues.map(function(i) {
                  return '• [' + i.action + '] ' + i.pattern;
                }).join('\n');
                resolve({text: '🔇 Ruido detectado (' + issues.length + ' items):\n' + formatted, showText: true});
              } else {
                resolve({text: '🔇 Sin ruido detectable en el contenido proporcionado.', showText: true});
              }
            } else { resolve({text: 'checkNoise no disponible.', showText: true}); }
            break;

          case 'trackIntention':
            if (typeof trackIntention === 'function') {
              var intent = trackIntention(act.text || act.cmd || act.intention || '', act.context || {});
              resolve({text: '🎯 Intención "' + (intent.text || act.text) + '" registrada (goal: ' + intent.goal + ', id: ' + intent.id + ').', showText: true});
            } else { resolve({text: 'trackIntention no disponible.', showText: true}); }
            break;

          case 'findIntention':
            if (typeof findIntention === 'function') {
              var found = findIntention(act.query || act.text || '');
              if (found) {
                resolve({text: '🔍 Intención activa: "' + found.text + '" → goal: ' + found.goal + ' (status: ' + found.status + ', sesiones: ' + found.sessionCount + ')', showText: true});
              } else {
                resolve({text: '🔍 Sin intención activa que coincida con "' + (act.query || act.text) + '".', showText: true});
              }
            } else { resolve({text: 'findIntention no disponible.', showText: true}); }
            break;

          case 'updateIntention':
            if (typeof updateIntention === 'function') {
              updateIntention(act.id || act.intentionId, act.subAction || act.action || 'tap', act.context || {});
              resolve({text: '🔄 Intención "' + (act.id || act.intentionId) + '" actualizada.', showText: true});
            } else { resolve({text: 'updateIntention no disponible.', showText: true}); }
            break;

          case 'generateChapter':
            if (typeof generateWeeklyChapter === 'function') {
              resolve({text: generateWeeklyChapter(), showText: true});
            } else { resolve({text: 'generateWeeklyChapter no disponible.', showText: true}); }
            break;

          case 'blockDomain':
            blockDistractionDomain(act.domain || act.url).then(resolve);
            break;

          case 'unblockDomain':
            unblockDistractionDomain(act.domain || act.url).then(resolve);
            break;

          case 'setAutonomy':
            setAgentAutonomy(act.context, act.level).then(resolve);
            break;

          default:
            // Unreachable (we filtered above), but safe fallback.
            _origExecAction(act, tabId).then(resolve, reject);
        }
      } catch (e) {
        console.error('[X1-Issue12] case error:', act.action, e && e.message);
        resolve({text: 'Error en ' + act.action + ': ' + (e && e.message || 'desconocido'), showText: true});
      }
    });
  };

  console.log('[X1-Issue12] execAction wrapped — ' + X1_ISSUE12_ACTIONS.length + ' new actions now operational');
})();
