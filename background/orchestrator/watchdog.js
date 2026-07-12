// ─────────────────────────────────────────────────────────────────────────
// background/orchestrator/watchdog.js
// Watchdog de horas-entera para el autopiloto de Vektor/Freebuff (MV3 SW).
//
// Por que existe: cuando el sidepanel está cerrado, el SW puede estar
// publicando PRs en GitHub durante horas sin que el usuario lo sepa.
// El keep-alive (3-capas) evita que Chrome mate el SW, pero NO avisa al
// usuario. Este modulo es el complemento: cada minuto (mismo tick que
// X1_KEEPALIVE_PULSE) evalúa si el autopiloto lleva >2h activo o >100
// tareas completadas SIN actividad reciente del sidepanel, y dispara
// chrome.notifications.create() con prioridad alta para que el usuario
// abra DevTools y revise.
//
// Arquitectura:
//   - MODULE separa de keep-alive.js (cleaner SoC). Carga via importScripts
//     DESPUES de keep-alive.js para poder leer X1KeepAlive.hasLivePort().
//   - Hooks: piggyback en onAlarmPulse del keep-alive (cero nuevo alarm).
//   - Session markers: keep-alive invoca X1Watchdog.onSessionStart/End.
//   - Task counter: sidepanel envia X1_AUTOPILOT_TASK_COMPLETED/FAILED
//     via chrome.runtime.sendMessage — handler en este modulo. Ademas
//     el SW (x1ProcessQueueTask) lo invoca directamente en cada tarea de
//     la cola en segundo plano (sin publishInline, fire-and-forget).
//   - Persistencia: chrome.storage.session (sobrevive SW restart, NO
//     sobrevive browser quit — acceptable: counters al cerrar Chrome no
//     tienen semantica clara para el usuario).
//   - Intervention signal: hasLivePort() devuelve true si sidepanel ha
//     pingueado el puerto en los ultimos 60s. Considerado "intervencion".
//
// Ladder escalation (anti-spam):
//   Tiempo: [120, 150, 180] min  (2h, 2.5h, 3h)
//   Tareas: [100, 200, 500]       (cada umbral: 1 notif, dedupe por index)
//
// Freebuff brand: notifications[id] prefijadas con 'x1-autopilot-watchdog'
// para que el usuario las identifique visualmente.
// ─────────────────────────────────────────────────────────────────────────
(function (self) {
  'use strict';

  // ── Constantes ────────────────────────────────────────────────────────
  // Ladder escalation: 3 escalones por tipo de umbral. SEQUENCE importa —
  // la primera vez que se cruza un umbral se envia; las siguientes se
  // suprimen hasta cruzar el siguiente escalon.
  var MIN_LADDERS = [120, 150, 180];           // minutes
  var TASK_LADDERS = [100, 200, 500];          // count
  var NOTIF_ID_PREFIX = 'x1-autopilot-watchdog';
  var SESSION_KEY = 'x1_watchdog_session';

  // Mensajes que el sidepanel envia al SW para alimentarnos
  var MSG_TASK_COMPLETED = 'X1_AUTOPILOT_TASK_COMPLETED';
  var MSG_TASK_FAILED    = 'X1_AUTOPILOT_TASK_FAILED';

  // ── Estado interno ────────────────────────────────────────────────────
  // In-memory, mirrored to chrome.storage.session para sobrevivir SW restart.
  var sessionState = {
    startAt: 0,                  // ms epoch — 0 = sin sesion activa
    tasksCompleted: 0,
    tasksFailed: 0,              // tracked paralelo por si queremos mostrar % exito luego
    notificationsSent: {}        // { 'min-0': msTimestamp, 'task-1': msTimestamp, ... } dedupe
  };

  // ── Helpers ──────────────────────────────────────────────────────────
  function log(m)  { try { console.log('[X1-Watchdog]', m); } catch (e) {} }
  function warn(m) { try { console.warn('[X1-Watchdog]', m); } catch (e) {} }
  function err(m)  { try { console.error('[X1-Watchdog]', m); } catch (e) {} }

  // Lee X1KeepAlive.hasLivePort() si esta disponible. True = sidepanel
  // abierto y pingueando en los ultimos 60s = hay "actividad reciente".
  function hasLivePort() {
    try {
      return typeof X1KeepAlive !== 'undefined' &&
             typeof X1KeepAlive.hasLivePort === 'function' &&
             X1KeepAlive.hasLivePort();
    } catch (e) { return false; }
  }

  // Lee X1KeepAlive.status().killSwitchTripped — si el kill-switch del SW
  // esta activo, NO notificamos (el usuario ya decidio parar).
  function isKillswitchTripped() {
    try {
      return typeof X1KeepAlive !== 'undefined' &&
             X1KeepAlive.status &&
             X1KeepAlive.status().killSwitchTripped === true;
    } catch (e) { return false; }
  }

  function persistSession() {
    try {
      chrome.storage.session.set({ x1_watchdog_session: sessionState }, function () {
        if (chrome.runtime.lastError) warn('persist: ' + chrome.runtime.lastError.message);
      });
    } catch (e) { warn('persist throw: ' + e.message); }
  }

  function restoreSession() {
    try {
      chrome.storage.session.get(SESSION_KEY, function (r) {
        if (r && r[SESSION_KEY]) {
          var s = r[SESSION_KEY];
          if (typeof s === 'object' && s !== null) {
            sessionState.startAt = typeof s.startAt === 'number' ? s.startAt : 0;
            sessionState.tasksCompleted = typeof s.tasksCompleted === 'number' ? s.tasksCompleted : 0;
            sessionState.tasksFailed = typeof s.tasksFailed === 'number' ? s.tasksFailed : 0;
            sessionState.notificationsSent = typeof s.notificationsSent === 'object' && s.notificationsSent !== null ? s.notificationsSent : {};
            log('session RESTORED: startAt=' + sessionState.startAt +
                ' tasks=' + sessionState.tasksCompleted +
                ' failed=' + sessionState.tasksFailed);
          }
        }
      });
    } catch (e) { warn('restore throw: ' + e.message); }
  }

  function minutesSinceStart(now) {
    if (!sessionState.startAt) return 0;
    return Math.floor((now - sessionState.startAt) / 60000);
  }

  // ── Notifications ────────────────────────────────────────────────────
  function sendNotification(kind, ladderIdx, value, label, portAlive) {
    // kind: 'min' | 'task'
    // ladderIdx: 0 | 1 | 2 (escalon)
    // value: minutes o tasks (pour el titulo)
    // label: texto humano para el mensaje ("2 horas" / "100 tareas")
    // portAlive: true si el sidepanel está activo — afecta prioridad + boton
    var notifId = NOTIF_ID_PREFIX + '-' + kind + '-' + ladderIdx;
    var title, message;
    if (portAlive) {
      title = 'Freebuff (Vektor) — autopilot activo: ' + label;
      message = 'El autopiloto lleva ' + label + '. Sidepanel abierto: lo verás aquí si revisas ahora. Para parar: ejecuta chrome.storage.local.set({x1_autopilot_killswitch:true}); chrome.runtime.reload() en DevTools del SW.';
    } else {
      title = '⚠️ Freebuff: autopilot sin supervisión — ' + label;
      message = 'El autopiloto lleva ' + label + ' sin que el sidepanel esté abierto. Es posible que haya PRs sin revisar. Acción: abrir DevTools del service worker (chrome://extensions) y ejecutar X1Watchdog.status().';
    }
    try {
      chrome.notifications.create(notifId, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message,
        priority: portAlive ? 0 : 2,            // 0=default, 2=high
        requireInteraction: !portAlive,         // solo "sticky" si sin supervision
        buttons: portAlive ? [] : [
          { title: 'Abrir DevTools SW' },
          { title: 'Marcar revisado' }
        ]
      }, function (newId) {
        if (chrome.runtime.lastError) {
          warn('notif create failed (¿permission?): ' + chrome.runtime.lastError.message);
        } else {
          log('notif sent: id=' + newId + ' kind=' + kind + ' idx=' + ladderIdx +
              ' value=' + value + ' portAlive=' + portAlive);
        }
      });
    } catch (e) { err('notif throw: ' + e.message); }
  }

  // Maneja los botones de la notificacion "sin supervision".
  function onNotificationButtonClick(notifId, buttonIdx) {
    if (!notifId || notifId.indexOf(NOTIF_ID_PREFIX) !== 0) return false;
    if (buttonIdx === 0) {
      // "Abrir DevTools SW" — abre chrome://extensions/?focus=...
      try {
        chrome.tabs.create({ url: 'chrome://extensions/?focus=service-worker' });
        log('opened chrome://extensions from notif button');
      } catch (e) { warn('open extensions: ' + e.message); }
    } else if (buttonIdx === 1) {
      // "Marcar revisado" — FIX 2026-07-07 (surgical dedupe):
      // limpia SOLO el dedupe key del notifId correspondiente (kind+idx
      // extraidos del sufijo). Asi no se re-spamea el resto de thresholds
      // que el usuario AUN NO HA revisado. Formato notifId:
      // NOTIF_ID_PREFIX + '-' + kind + '-' + ladderIdx
      // p.ej. 'x1-autopilot-watchdog-min-1' o '...-task-0'.
      try {
        var suffix = notifId.substring(NOTIF_ID_PREFIX.length + 1); // salta el '-' separador
        var parts = suffix.split('-');
        if (parts.length >= 2) {
          var key = parts[0] + '-' + parts[1]; // 'min-0', 'task-1', ...
          if (sessionState.notificationsSent[key]) {
            delete sessionState.notificationsSent[key];
            persistSession();
            log('notif button "marcar revisado" — dedupe liberado SOLO para ' + key + ' (resto intactos, sin re-spam)');
          } else {
            log('notif button "marcar revisado" — key ' + key + ' ya estaba limpio (no-op)');
          }
        } else {
          log('notif button "marcar revisado" — suffix no parseado: "' + suffix + '" (no-op)');
        }
        // Re-evaluar inmediatamente: el threshold clickado re-dispare si
        // sigue cruzado; el resto queda en silencio hasta cruzarlo tambien.
        try { checkAndNotify(); } catch (e) { warn('re-check after button: ' + e.message); }
      } catch (e) { warn('mark reviewed: ' + e.message); }
    }
    return true;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────
  function sessionStart() {
    sessionState.startAt = Date.now();
    sessionState.tasksCompleted = 0;
    sessionState.tasksFailed = 0;
    sessionState.notificationsSent = {};
    persistSession();
    log('session START: ' + new Date(sessionState.startAt).toISOString() +
        ' — counters reseteados, dedupe flags limpios');
  }

  function sessionEnd() {
    if (!sessionState.startAt) {
      log('session END called pero sin sesion activa — noop');
      return;
    }
    var mins = minutesSinceStart(Date.now());
    log('session END: duró ' + mins + ' min, ' +
        sessionState.tasksCompleted + ' tareas OK + ' +
        sessionState.tasksFailed + ' tareas failed');
    sessionState.startAt = 0;
    sessionState.tasksCompleted = 0;
    sessionState.tasksFailed = 0;
    sessionState.notificationsSent = {};
    persistSession();
  }

  function recordTaskCompletion(success) {
    if (!sessionState.startAt) {
      log('recordTaskCompletion ignorada: sin sesion activa');
      return;
    }
    if (success) {
      sessionState.tasksCompleted++;
    } else {
      sessionState.tasksFailed++;
    }
    persistSession();
    log('task recorded: success=' + (!!success) +
        ' total OK=' + sessionState.tasksCompleted +
        ' failed=' + sessionState.tasksFailed);
  }

  // ── Tick: llamado por el keep-alive ogni 1 min ──────────────────────
  function checkAndNotify() {
    if (isKillswitchTripped()) return;     // kill-switch activo → no notify
    if (!sessionState.startAt) return;     // sin sesion → noop
    var now = Date.now();
    var mins = minutesSinceStart(now);
    var tasks = sessionState.tasksCompleted;
    var portAlive = hasLivePort();

    var fired = false;

    // Ladder de MINUTOS
    for (var i = 0; i < MIN_LADDERS.length; i++) {
      var minT = MIN_LADDERS[i];
      var k = 'min-' + i;
      if (mins >= minT && !sessionState.notificationsSent[k]) {
        sessionState.notificationsSent[k] = now;
        var hoursLabel = (minT >= 120 ? Math.floor(minT / 60) + 'h' + (minT % 60 ? '' + (minT % 60) + 'min' : '') : minT + ' min');
        sendNotification('min', i, minT, hoursLabel, portAlive);
        fired = true;
      }
    }

    // Ladder de TAREAS
    for (var j = 0; j < TASK_LADDERS.length; j++) {
      var taskT = TASK_LADDERS[j];
      var tk = 'task-' + j;
      if (tasks >= taskT && !sessionState.notificationsSent[tk]) {
        sessionState.notificationsSent[tk] = now;
        sendNotification('task', j, taskT, taskT + ' tareas', portAlive);
        fired = true;
      }
    }

    if (fired) persistSession();
  }

  // ── Listener de mensajes desde el sidepanel O invocacion directa del SW ─
  // Acepta mensajes X1_AUTOPILOT_TASK_COMPLETED / X1_AUTOPILOT_TASK_FAILED.
  // Tambien invocable directamente (sin message bus) cuando el SW quiere
  // notificar (p.ej. x1ProcessQueueTask notifica per-tarea completada
  // sin pasar por sendMessage — esto es critico cuando el sidepanel esta
  // cerrado y la unica forma de mantener el contador es llamada directa).
  // (X1_AUTOPILOT_SESSION_START/END los maneja keep-alive.js — los hooks
  // X1Watchdog.onSessionStart/End se llaman desde alli.)
  function onWatchdogMessage(msg, sender, sendResponse) {
    if (!msg || typeof msg.type !== 'string') return false;
    var t = msg.type;
    if (t === MSG_TASK_COMPLETED) {
      try { recordTaskCompletion(true); } catch (e) { err('recordTaskCompletion(true): ' + e.message); }
      // Re-evaluar inmediatamente: si la nueva tarea cruza un umbral,
      // notificamos sin esperar al proximo tick del keep-alive.
      try { checkAndNotify(); } catch (e) { warn('check after task: ' + e.message); }
      if (sendResponse) sendResponse({ ok: true, tasksCompleted: sessionState.tasksCompleted });
      return true;
    }
    if (t === MSG_TASK_FAILED) {
      try { recordTaskCompletion(false); } catch (e) { err('recordTaskCompletion(false): ' + e.message); }
      try { checkAndNotify(); } catch (e) { warn('check after fail: ' + e.message); }
      if (sendResponse) sendResponse({ ok: true, tasksFailed: sessionState.tasksFailed });
      return true;
    }
    return false; // no es nuestro mensaje
  }

  // ── API publica ───────────────────────────────────────────────────────
  self.X1Watchdog = {
    // Hooks que keep-alive.js llama
    onSessionStart: sessionStart,
    onSessionEnd: sessionEnd,
    onAlarmTick: checkAndNotify,
    // Handler puenteado a onMessage desde el sidepanel O invocable directo
    onWatchdogMessage: onWatchdogMessage,
    onNotificationButtonClick: onNotificationButtonClick,
    // Diagnostico desde DevTools
    status: function () {
      return {
        sessionActive: !!sessionState.startAt,
        startedAt: sessionState.startAt,
        minutesElapsed: minutesSinceStart(Date.now()),
        tasksCompleted: sessionState.tasksCompleted,
        tasksFailed: sessionState.tasksFailed,
        notificationsSent: sessionState.notificationsSent,
        hasLivePort: hasLivePort(),
        killswitchTripped: isKillswitchTripped(),
        ladders: { minutes: MIN_LADDERS, tasks: TASK_LADDERS }
      };
    },
    // Testing helpers (DevTools only) — NO se exponen al sidepanel
    _test: {
      fakeSessionStart: function (minsAgo) {
        sessionState.startAt = Date.now() - (minsAgo || 0) * 60000;
        sessionState.tasksCompleted = 0;
        sessionState.tasksFailed = 0;
        sessionState.notificationsSent = {};
        persistSession();
        log('TEST: fakeSessionStart(' + minsAgo + 'min ago)');
        try { checkAndNotify(); } catch (e) {}
        return 'sessionState.startAt=' + sessionState.startAt;
      },
      fakeTaskCompletion: function (n) {
        n = n || 1;
        for (var i = 0; i < n; i++) sessionState.tasksCompleted++;
        persistSession();
        log('TEST: fakeTaskCompletion x' + n + ' → total=' + sessionState.tasksCompleted);
        try { checkAndNotify(); } catch (e) {}
        return 'tasksCompleted=' + sessionState.tasksCompleted;
      },
      reset: function () {
        sessionState = { startAt: 0, tasksCompleted: 0, tasksFailed: 0, notificationsSent: {} };
        persistSession();
        log('TEST: reset');
        return 'state cleared';
      }
    },
    _constants: {
      MIN_LADDERS: MIN_LADDERS,
      TASK_LADDERS: TASK_LADDERS,
      NOTIF_ID_PREFIX: NOTIF_ID_PREFIX,
      SESSION_KEY: SESSION_KEY,
      MSG_TASK_COMPLETED: MSG_TASK_COMPLETED,
      MSG_TASK_FAILED: MSG_TASK_FAILED
    }
  };

  // ── Init: restaura state de chrome.storage.session al cargar el modulo ──
  // Esto cubre el caso de SW restart (MV3 suspende el SW tras 30s idle).
  restoreSession();
})(self);
