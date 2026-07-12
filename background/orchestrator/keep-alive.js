// ─────────────────────────────────────────────────────────────────────────
// background/orchestrator/keep-alive.js
// 3-layer keepalive for the Vektor/Freebuff autopiloto (MV3 service worker).
//
// Why this exists: Chrome MV3 kills the service worker after ~30s of
// inactivity. The autopiloto (manejado por service-worker.js ↔
// X1_AUTOMATION_ALARM) debe correr durante HORAS publicando PRs en GitHub.
// Las 3 capas cubren los 3 estados reales del navegador:
//
//   CAPA 1 — Long-lived port desde sidepanel
//     Mientras el sidepanel está abierto con una sesion activa, abre
//     chrome.runtime.connect({name:'x1-autopilot-heartbeat'}). El puerto
//     cuenta como "actividad" y resetear los 30s del SW.
//     Si muere el puerto (sidepanel cerrado, network drop), Capa 2 + 3 toman
//     el relevo.
//
//   CAPA 2 — chrome.alarms pulse cada 1 min (límite MV3)
//     El API chrome.alarms tiene periodoInMinutes >= 1 en produccion. Pedir
//     25s es ignorado por Chrome y redondeado a 1 min. Avisamos al usuario
//     en HANDOFF.
//
//   CAPA 3 — Offscreen document con silent audio (AUDIO_PLAYBACK)
//     En MV3 el unico motivo robusto para mantener un offscreen document vivo
//     indefinidamente es AUDIO_PLAYBACK (IFRAME_SCRIPTING fue capado por
//     Chrome en 2024). El HTML embebe un <audio src="data:audio/..."> con
//     audio silencioso + un setInterval que envia ping X1_KEEPALIVE_FROM_OFFSCREEN
//     cada 20s para despertar el SW.
//
//   CAPA 4 — Receptor onMessage + listener dedupe
//     La CAPA 3 necesita que el SW ESCUCHE los pings. Sin esto, Chrome puede
//     suspender el SW aunque el mensaje llegue. (FIX THINKER-1 — era fatal)
//
// Naming collision: este modulo NO toca X1_AUTOMATION_ALARM (existente).
// Usa su propia alarma X1_KEEPALIVE_PULSE. coexiste con startKeepalive()
// timer-based antiguo (cubre el caso edge de SW ya vivo + UI activa).
//
// Librebuff / Brand: todos los logs son [X1-KeepAlive], Freebuff aparece en
// los titulos de notifications / mindlog cuando la sesion keep-alive cambia
// de estado.
// ─────────────────────────────────────────────────────────────────────────
(function (self) {
  'use strict';

  // ── Constantes ────────────────────────────────────────────────────────
  var PORT_NAME_AUTOPILOT = 'x1-autopilot-heartbeat';
  var ALARM_NAME_KEEPALIVE = 'X1_KEEPALIVE_PULSE';
  // MV3 hard limit — periodInMinutes cannot be < 1 in production. Any
  // smaller value is silently rounded up by Chrome. We accept 1 min.
  var ALARM_INTERVAL_MIN = 1;
  var OFFSCREEN_URL = 'offscreen/keepalive.html';
  // AUDIO_PLAYBACK is the most robust reason in MV3 (2024+). IFRAME_SCRIPTING
  // was deprecated for this case.
  var OFFSCREEN_REASONS = ['AUDIO_PLAYBACK'];

  var MSG_PING = 'X1_KEEPALIVE_PING';
  var MSG_PONG = 'X1_KEEPALIVE_PONG';
  var MSG_FROM_OFFSCREEN = 'X1_KEEPALIVE_FROM_OFFSCREEN';

  // ── Estado interno ────────────────────────────────────────────────────
  var portRegistry = {};     // portId → Date.now() (last ping time)
  var alarmScheduled = false;
  var offscreenCreated = false;

  // ── Logging ───────────────────────────────────────────────────────────
  function log(m)  { try { console.log('[X1-KeepAlive]', m); } catch (e) {} }
  function warn(m) { try { console.warn('[X1-KeepAlive]', m); } catch (e) {} }
  function err(m)  { try { console.error('[X1-KeepAlive]', m); } catch (e) {} }

  // ── CAPA 1 — Puerto long-lived desde sidepanel ────────────────────────
  function onPortConnect(port) {
    if (!port || port.name !== PORT_NAME_AUTOPILOT) return;
    var portId = (port.sender && port.sender.tab && port.sender.tab.id) || 'sidepanel:' + Date.now();
    portRegistry[portId] = Date.now();
    log('heartbeat port abierto desde ' + portId);

    // La primera vez que se conecta un puerto, garantizamos que la Capa 3
    // tambien esta activa como respaldo. Si el sidepanel muere de repente,
    // offscreen mantiene el SW vivo.
    ensureOffscreen();

    try {
      port.onMessage.addListener(function (msg) {
        if (msg && msg.type === MSG_PING) {
          portRegistry[portId] = Date.now();
          try { port.postMessage({ type: MSG_PONG, at: Date.now(), hasPort: hasLivePort() }); } catch (e) {}
        }
      });
    } catch (e) { warn('onMessage listener failed for ' + portId + ': ' + e.message); }

    try {
      port.onDisconnect.addListener(function () {
        delete portRegistry[portId];
        log('heartbeat port DESCONECTADO de ' + portId + ' (restantes=' + Object.keys(portRegistry).length + ') — alarmas + offscreen toman el relevo');
        // No destruimos offscreen. Permanece como Capa 3 indefinidamente.
      });
    } catch (e) { warn('onDisconnect listener failed: ' + e.message); }
  }

  function hasLivePort() {
    // Podamos puertos silenciosos (mas de 60s sin ping). Por si onDisconnect
    // no se dispara (caso muy raro en MV3, pero defensivo).
    var now = Date.now();
    var pruned = false;
    Object.keys(portRegistry).forEach(function (k) {
      if (now - portRegistry[k] > 60000) { delete portRegistry[k]; pruned = true; }
    });
    if (pruned) log('puertos silenciosos podados — quedan ' + Object.keys(portRegistry).length);
    return Object.keys(portRegistry).length > 0;
  }

  // ── CAPA 2 — chrome.alarms pulse cada 1 min ───────────────────────────
  function scheduleAlarmPulse() {
    if (alarmScheduled) return;
    try {
      chrome.alarms.create(ALARM_NAME_KEEPALIVE, {
        delayInMinutes: ALARM_INTERVAL_MIN,
        periodInMinutes: ALARM_INTERVAL_MIN
      });
      alarmScheduled = true;
      log('alarm pulse scheduled (intervalo ' + ALARM_INTERVAL_MIN + ' min)');
    } catch (e) { err('scheduleAlarmPulse failed: ' + e.message); }
  }

  function onAlarmPulse(alarm) {
    if (!alarm || alarm.name !== ALARM_NAME_KEEPALIVE) return;
    // Si hay puerto vivo, la alarma es ruido. Pero SIEMPRE refrescamos
    // offscreen por si algun momento se cerro silenciosamente.
    if (hasLivePort()) {
      log('alarm tick: port vivo — skip offscreen ensure durante este tick');
    } else {
      log('alarm tick sin port vivo — aseguro offscreen (Capa 3)');
      ensureOffscreen();
    }
    // Watchdog tick (2026-07-07 — Pillar 3 PHASE 2 PROMISE). Piggyback en el
    // mismo alarm 1-min para no crear chrome.alarms adicionales. El watchdog
    // evaluara elapsed-time y task count y disparara chrome.notifications si
    // supera los umbrales sin supervision humana.
    try {
      if (typeof X1Watchdog !== 'undefined' && typeof X1Watchdog.onAlarmTick === 'function') {
        X1Watchdog.onAlarmTick();
      }
    } catch (e) { warn('watchdog tick failed: ' + e.message); }
  }

  function unscheduleAlarmPulse() {
    if (!alarmScheduled) return;
    try { chrome.alarms.clear(ALARM_NAME_KEEPALIVE); } catch (e) {}
    alarmScheduled = false;
    log('alarm pulse UNscheduled');
  }

  // ── CAPA 3 — Offscreen document con silent audio ──────────────────────
  function ensureOffscreen() {
    if (offscreenCreated) return Promise.resolve(true);
    if (!chrome.offscreen || typeof chrome.offscreen.createDocument !== 'function') {
      warn('chrome.offscreen API no disponible');
      return Promise.resolve(false);
    }
    // hasDocument() evita el ciclo create → catch "already exists" (FIX
    // THINKER-2).
    return chrome.offscreen.hasDocument()
      .then(function (has) {
        if (has) { offscreenCreated = true; log('offscreen YA existe'); return true; }
        return chrome.offscreen.createDocument({
          url: OFFSCREEN_URL,
          reasons: OFFSCREEN_REASONS,
          justification: 'Freebuff keepalive pulse for Vektor autopiloto: el autopiloto publica PRs en GitHub durante horas sin intervencion del usuario, y MV3 mata el SW tras 30s de inactividad. El silencioso <audio> mantiene el documento vivo para que pueda hacer ping al SW.'
        }).then(function () {
          offscreenCreated = true;
          log('offscreen document CREADO en ' + OFFSCREEN_URL);
          return true;
        });
      })
      .catch(function (e) {
        err('ensureOffscreen failed: ' + (e && e.message));
        return false;
      });
  }

  function closeOffscreen() {
    if (!offscreenCreated) return;
    try {
      chrome.offscreen.closeDocument().then(function () {
        offscreenCreated = false;
        log('offscreen cerrado');
      }).catch(function (e) { warn('closeOffscreen: ' + e.message); });
    } catch (e) { warn('closeOffscreen threw: ' + e.message); }
  }

  // ── CAPA 4 — Receptor de mensajes X1_KEEPALIVE_* (offscreen + sidepanel) ─
  // FIX THINKER-1: sin esto, el SW puede suspenderse aunque el ping llegue.
  // Ademas maneja X1_AUTOPILOT_SESSION_START/END para que el sidepanel pueda
  // activar/desactivar las 3 capas (CAPA 2 alarm + CAPA 3 offscreen) cuando
  // arranca/termina el autopiloto, sin necesidad de re-registrar listeners.
  var MSG_SESSION_START = 'X1_AUTOPILOT_SESSION_START';
  var MSG_SESSION_END = 'X1_AUTOPILOT_SESSION_END';
  var MSG_PING_VIA_MSG = 'X1_KEEPALIVE_MSG_PING';

  function onKeepalivePing(msg, sender, sendResponse) {
    if (!msg || typeof msg.type !== 'string') return false;
    var t = msg.type;

    // Ping desde offscreen (Capa 3 → despierta SW)
    if (t === MSG_FROM_OFFSCREEN) {
      var fromOffscreen = sender && sender.url && sender.url.indexOf('offscreen/keepalive.html') >= 0;
      log('ping from offscreen (puertos vivos=' + Object.keys(portRegistry).length + ', hasPort=' + hasLivePort() + ')');
      if (sendResponse) sendResponse({ ok: true, at: Date.now(), fromOffscreen: !!fromOffscreen, hasPort: hasLivePort() });
      return true;
    }

    // Sidepanel arranca sesion autopiloto — boost todas las capas
    if (t === MSG_SESSION_START) {
      log('sidepanel signal: session start');
      try { startAutopilotSession(); } catch (e) { err('startAutopilotSession: ' + e.message); }
      if (sendResponse) sendResponse({ ok: true, status: 'session_started', at: Date.now() });
      return true;
    }

    // Sidepanel cierra sesion autopiloto — cleanup
    if (t === MSG_SESSION_END) {
      log('sidepanel signal: session end');
      try { endAutopilotSession(); } catch (e) { err('endAutopilotSession: ' + e.message); }
      if (sendResponse) sendResponse({ ok: true, status: 'session_ended', at: Date.now() });
      return true;
    }

    // Keepalive ping via mensaje (alternativa al puerto para contextos sin
    // runtime.connect, p.ej. background scripts en MV2 fallback). Tambien
    // funciona como "ping generico" para diagnostico.
    if (t === MSG_PING_VIA_MSG) {
      if (sendResponse) sendResponse({ ok: true, at: Date.now(), hasPort: hasLivePort() });
      return true;
    }

    // Pillar 3 PHASE 2: mensajes del watchdog (X1_AUTOPILOT_TASK_COMPLETED,
    // X1_AUTOPILOT_TASK_FAILED). El sidepanel envia uno al final de cada
    // tarea del autopiloto; el watchdog incrementa contadores y evalua si
    // cruza un umbral (100/200/500 tareas). Delegamos al modulo watchdog
    // que se cargo via importScripts DESPUES de keep-alive.js.
    if (t === 'X1_AUTOPILOT_TASK_COMPLETED' || t === 'X1_AUTOPILOT_TASK_FAILED') {
      try {
        if (typeof X1Watchdog !== 'undefined' && typeof X1Watchdog.onWatchdogMessage === 'function') {
          return X1Watchdog.onWatchdogMessage(msg, sender, sendResponse);
        } else {
          if (sendResponse) sendResponse({ ok: false, error: 'X1Watchdog not loaded' });
          return true;
        }
      } catch (e) {
        warn('watchdog dispatch failed: ' + e.message);
        if (sendResponse) sendResponse({ ok: false, error: e.message });
        return true;
      }
    }

    return false; // message type no es nuestro — dejar a otros listeners
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────
  var listenersRegistered = false; // dedupe re-registro si init() se llama dos veces por defensa
  var killSwitchTripped = false; // PHASE 1 kill-switch — ver init() y status()
  var KILLSWITCH_KEY = 'x1_autopilot_killswitch';

  // FIX A (thinker 2026-07-07): refreshKillSwitch centraliza la lectura del
  // storage key y, si el valor cambia en runtime, llama shutdown() (o reinicia
  // las 3 capas si el usuario lo desactiva). Esto evita el race window del
  // enfoque anterior donde init() instalaba capas antes de que el callback
  // del storage resolviera.
  function refreshKillSwitch() {
    try {
      chrome.storage.local.get(KILLSWITCH_KEY, function (r) {
        var wasTripped = killSwitchTripped;
        killSwitchTripped = !!(r && r[KILLSWITCH_KEY] === true);
        if (!wasTripped && killSwitchTripped) {
          warn('kill-switch ACTIVO en runtime — apagando las 3 capas instaladas');
          try { unscheduleAlarmPulse(); } catch (e) {}
          try { closeOffscreen(); } catch (e) {}
          portRegistry = {};
        } else if (wasTripped && !killSwitchTripped) {
          log('kill-switch DESACTIVADO en runtime — reactivando las 3 capas');
          try { scheduleAlarmPulse(); } catch (e) {}
          try { ensureOffscreen(); } catch (e) {}
        }
      });
    } catch (e) { warn('refreshKillSwitch throw: ' + e.message); }
  }

  function init() {
    if (!chrome || !chrome.runtime) {
      err('chrome.runtime no disponible — init abortado');
      return;
    }
    // PHASE 1 KILL-SWITCH (2026-07-07): si el storage key 'x1_autopilot_killswitch'
    // esta a true, el usuario ha decidido matar el autopiloto de horas-entera
    // (preview beta — ver HANDOFF.md seccion 'PHASE 1 STATUS'). NO inicializamos
    // ninguna de las 4 capas — el SW queda en modo normal (se sigue apagando
    // tras 30s sin actividad) y el usuario debe validar manualmente antes
    // de reactivar. Debug: desde DevTools del SW ejecutar
    //   chrome.storage.local.set({x1_autopilot_killswitch:false}, ()=>location.reload())
    // para reactivar.
    if (killSwitchTripped) {
      log('PHASE 1 KILL-SWITCH activo — init abortado. Storage key x1_autopilot_killswitch=true. Para reactivar: chrome.storage.local.set({x1_autopilot_killswitch:false}, ...) + reload.');
      return;
    }
    // FIX A — registrar listener onChanged ANTES de checked-storage para no
    // perder un toggle durante el breve I/O del sync-storage.get.
    try {
      if (!chrome.storage.onChanged.hasListener || !chrome.storage.onChanged.hasListener(onKillswitchChanged)) {
        chrome.storage.onChanged.addListener(onKillswitchChanged);
      } else {
        // Las versiones nuevas de Chrome no exponen hasListener; añadimos ciegamente
        // (addListener es idempotente en el sentido práctico si filtramos por key en el handler).
        try { chrome.storage.onChanged.addListener(onKillswitchChanged); } catch (e) { /* already */ }
      }
    } catch (e) { warn('addListener(onChanged): ' + e.message); }
    if (!listenersRegistered) {
      try { chrome.runtime.onConnect.addListener(onPortConnect); } catch (e) { err('onConnect add: ' + e.message); }
      try { chrome.alarms.onAlarm.addListener(onAlarmPulse); } catch (e) { err('onAlarm add: ' + e.message); }
      try { chrome.runtime.onMessage.addListener(onKeepalivePing); } catch (e) { err('onMessage add: ' + e.message); }
      listenersRegistered = true;
    }
    scheduleAlarmPulse();
    ensureOffscreen();
    log('init OK — CAPA 1 (port) + CAPA 2 (alarm ' + ALARM_INTERVAL_MIN + 'min) + CAPA 3 (offscreen ' + OFFSCREEN_URL + ') + CAPA 4 (onMessage) activas');
  }

  function startAutopilotSession() {
    log('autopiloto INICIADO — boost todas las capas');
    scheduleAlarmPulse();
    ensureOffscreen();
    // Avisa al watchdog que arranque sesion (counters a cero, dedupe limpio).
    try {
      if (typeof X1Watchdog !== 'undefined' && typeof X1Watchdog.onSessionStart === 'function') {
        X1Watchdog.onSessionStart();
      }
    } catch (e) { warn('watchdog onSessionStart failed: ' + e.message); }
  }

  function endAutopilotSession() {
    log('autopiloto TERMINADO — cleanup');
    unscheduleAlarmPulse();
    portRegistry = {};
    closeOffscreen();
    // Avisa al watchdog que cierre sesion (resetea counters + log elapsed).
    try {
      if (typeof X1Watchdog !== 'undefined' && typeof X1Watchdog.onSessionEnd === 'function') {
        X1Watchdog.onSessionEnd();
      }
    } catch (e) { warn('watchdog onSessionEnd failed: ' + e.message); }
  }

  // ── API publica ───────────────────────────────────────────────────────
  self.X1KeepAlive = {
    init: init,
    startAutopilotSession: startAutopilotSession,
    endAutopilotSession: endAutopilotSession,
    hasLivePort: hasLivePort,
    // Exports para wire-up desde service-worker.js si necesita llamarlas
    // directamente sin registrar listeners propios.
    onPortConnect: onPortConnect,
    onAlarmPulse: onAlarmPulse,
    onKeepalivePing: onKeepalivePing,
    // Diagnostico
    status: function () {
      return {
        ports: Object.keys(portRegistry).length,
        alarmScheduled: alarmScheduled,
        offscreenCreated: offscreenCreated,
        listenersRegistered: listenersRegistered,
        killSwitchTripped: killSwitchTripped,
        selfCheck: typeof X1KeepAlive !== 'undefined'
      };
    },
    _constants: {
      PORT_NAME_AUTOPILOT: PORT_NAME_AUTOPILOT,
      ALARM_NAME_KEEPALIVE: ALARM_NAME_KEEPALIVE,
      OFFSCREEN_URL: OFFSCREEN_URL,
      MSG_PING: MSG_PING,
      MSG_PONG: MSG_PONG,
      MSG_FROM_OFFSCREEN: MSG_FROM_OFFSCREEN
    }
  };
})(self); // service-worker scope: self === globalThis. (typeof self !"==" 'undefined' check el innecesario. THINKER-3 fix.)
