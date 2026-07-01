/**
 * Bus de eventos en memoria (pub/sub) con soporte de wildcards, once,
 * escucha asíncrona y propagación segura de errores.
 *
 * Se usa para desacoplar productores y consumidores dentro del service
 * worker: por ejemplo, el orquestador emite `task:step` y la UI o el logger
 * se suscriben sin conocerse entre sí.
 */

import Logger from '../core/logger.js';

const logger = new Logger('EventBus');

export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
    /** @type {Set<Function>} Suscriptores a todos los eventos ('*') */
    this.wildcard = new Set();
    this.maxListenersPerEvent = 100;
  }

  /**
   * Suscribe un handler a un evento. Devuelve función de desuscripción.
   * @param {string} event - Nombre del evento o '*' para todos
   * @param {(payload:*, meta:{event:string}) => void} handler
   * @returns {() => void}
   */
  on(event, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('El handler debe ser una función');
    }
    if (event === '*') {
      this.wildcard.add(handler);
      return () => this.wildcard.delete(handler);
    }
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    const set = this.listeners.get(event);
    if (set.size >= this.maxListenersPerEvent) {
      logger.warn(`Muchos listeners para "${event}" (posible fuga de memoria)`);
    }
    set.add(handler);
    return () => set.delete(handler);
  }

  /**
   * Suscribe un handler que se ejecuta una sola vez.
   * @param {string} event
   * @param {Function} handler
   * @returns {() => void}
   */
  once(event, handler) {
    const off = this.on(event, (payload, meta) => {
      off();
      handler(payload, meta);
    });
    return off;
  }

  /**
   * Elimina un handler concreto de un evento.
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    if (event === '*') {
      this.wildcard.delete(handler);
      return;
    }
    this.listeners.get(event)?.delete(handler);
  }

  /**
   * Emite un evento síncronamente. Los errores de un handler no interrumpen
   * al resto (se registran).
   * @param {string} event
   * @param {*} [payload]
   */
  emit(event, payload) {
    const meta = { event };
    const direct = this.listeners.get(event);
    if (direct) {
      for (const handler of [...direct]) {
        try {
          handler(payload, meta);
        } catch (error) {
          logger.error(`Error en listener de "${event}":`, error.message);
        }
      }
    }
    for (const handler of [...this.wildcard]) {
      try {
        handler(payload, meta);
      } catch (error) {
        logger.error(`Error en listener wildcard para "${event}":`, error.message);
      }
    }
  }

  /**
   * Emite un evento y espera a que todos los handlers asíncronos terminen.
   * @param {string} event
   * @param {*} [payload]
   * @returns {Promise<void>}
   */
  async emitAsync(event, payload) {
    const meta = { event };
    const handlers = [...(this.listeners.get(event) || []), ...this.wildcard];
    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(payload, meta);
        } catch (error) {
          logger.error(`Error async en listener de "${event}":`, error.message);
        }
      })
    );
  }

  /**
   * Espera a la próxima emisión de un evento (útil en flujos secuenciales).
   * @param {string} event
   * @param {number} [timeoutMs]
   * @returns {Promise<*>}
   */
  waitFor(event, timeoutMs) {
    return new Promise((resolve, reject) => {
      const off = this.once(event, (payload) => {
        clearTimeout(timer);
        resolve(payload);
      });
      const timer = timeoutMs
        ? setTimeout(() => {
            off();
            reject(new Error(`waitFor("${event}") agotó ${timeoutMs}ms`));
          }, timeoutMs)
        : null;
    });
  }

  /** Elimina todos los listeners (de un evento o de todos). */
  removeAll(event) {
    if (event) this.listeners.delete(event);
    else {
      this.listeners.clear();
      this.wildcard.clear();
    }
  }

  /** Número de listeners registrados para un evento. */
  listenerCount(event) {
    return (this.listeners.get(event)?.size || 0) + this.wildcard.size;
  }
}

/** Bus global compartido por el backend. */
export const bus = new EventBus();

/** Nombres de eventos del dominio, centralizados para evitar typos. */
export const EVENTS = {
  MODEL_REQUEST: 'model:request',
  MODEL_RESPONSE: 'model:response',
  MODEL_STREAM: 'model:stream',
  MODEL_ERROR: 'model:error',
  VOTE_RECORDED: 'vote:recorded',
  TASK_START: 'task:start',
  TASK_STEP: 'task:step',
  TASK_COMPLETE: 'task:complete',
  TASK_ERROR: 'task:error',
  AGENT_MESSAGE: 'agent:message',
  AGENT_TOOL_CALL: 'agent:tool_call',
  MEMORY_WRITE: 'memory:write',
  MEMORY_QUERY: 'memory:query',
  WORKSPACE_ACTION: 'workspace:action',
  PREDICTION: 'predictive:suggestion'
};

export default EventBus;
