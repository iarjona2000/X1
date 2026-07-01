/**
 * Service Worker de X1 (punto de entrada del backend).
 *
 * Responsabilidades:
 *  - Recibir mensajes de la UI y delegarlos en MessageRouter.
 *  - Gestionar conexiones de puerto para streaming de tokens.
 *  - Programar alarmas para tareas proactivas (sugerencias, alertas de retraso,
 *    reenvío de eventos N8N encolados).
 *
 * Toda la lógica de negocio vive en el orquestador y sus subsistemas; este
 * archivo es una capa fina de transporte.
 */

import { messageRouter } from './message-router.js';
import { orchestrator } from './orchestrator.js';
import { bus, EVENTS } from '../utils/event-bus.js';
import Logger from '../core/logger.js';

const logger = new Logger('ServiceWorker');
logger.info('Service Worker iniciado');

/* ------------------------------------------------------------------ *
 * Mensajes puntuales (request/response)
 * ------------------------------------------------------------------ */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  messageRouter
    .handle(request, { sender })
    .then((result) => sendResponse(result))
    .catch((error) => sendResponse({ ok: false, error: { message: error.message } }));
  // Respuesta asíncrona
  return true;
});

/* ------------------------------------------------------------------ *
 * Conexiones de puerto (streaming de tokens en tiempo real)
 * ------------------------------------------------------------------ */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'x1-stream') return;
  logger.debug('Puerto de streaming conectado');

  port.onMessage.addListener(async (message) => {
    const result = await messageRouter.handle(message, { port });
    // El resultado final (además de los TOKEN emitidos) se envía como RESULT
    port.postMessage({ type: 'RESULT', ...result });
  });

  port.onDisconnect.addListener(() => logger.debug('Puerto de streaming desconectado'));
});

/* ------------------------------------------------------------------ *
 * Reenviar sugerencias proactivas a la UI activa
 * ------------------------------------------------------------------ */
bus.on(EVENTS.PREDICTION, (suggestion) => {
  broadcastToTabs({ type: 'X1_SUGGESTION', suggestion });
});

/* ------------------------------------------------------------------ *
 * Alarmas proactivas
 * ------------------------------------------------------------------ */
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('x1-suggestions', { periodInMinutes: 15 });
  chrome.alarms.create('x1-project-delays', { periodInMinutes: 60 });
  chrome.alarms.create('x1-n8n-flush', { periodInMinutes: 5 });
  logger.info('Alarmas proactivas programadas');
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!messageRouter.isReady()) return; // requiere desbloqueo
  try {
    switch (alarm.name) {
      case 'x1-suggestions': {
        const suggestions = await orchestrator.getSuggestions();
        if (suggestions.length) {
          notify('X1 tiene sugerencias', suggestions[0].message);
        }
        break;
      }
      case 'x1-project-delays': {
        const delays = await orchestrator.projects.detectDelays();
        if (delays.length) {
          notify('Tareas retrasadas', `${delays.length} tarea(s) requieren atención`);
        }
        break;
      }
      case 'x1-n8n-flush':
        await orchestrator.n8n.flushQueue().catch(() => {});
        break;
      default:
        break;
    }
  } catch (error) {
    logger.warn(`Alarma "${alarm.name}" falló: ${error.message}`);
  }
});

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/**
 * Envía un mensaje a todas las pestañas (best-effort).
 * @param {Object} message
 */
function broadcastToTabs(message) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    }
  });
}

/**
 * Muestra una notificación del sistema.
 * @param {string} title
 * @param {string} message
 */
function notify(title, message) {
  if (!chrome.notifications) return;
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'src/assets/icons/icon128.png',
    title,
    message
  });
}

logger.info('Service Worker listo');
