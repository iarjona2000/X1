/**
 * Integración con N8N (automatización visual).
 *
 * X1 envía eventos a un webhook de N8N configurado por el usuario. N8N ejecuta
 * flujos que conectan con apps externas (Slack, Notion, Salesforce…). Esta
 * clase encapsula el envío fiable de eventos con reintentos y un modo de cola
 * para no perder eventos si el webhook está temporalmente caído.
 */

import { HttpClient } from '../../utils/http.js';
import { bus } from '../../utils/event-bus.js';
import Logger from '../logger.js';

const logger = new Logger('N8N');
const QUEUE_KEY = 'x1_n8n_queue';

export class N8NIntegration {
  /**
   * @param {Object} deps
   * @param {Function} deps.getConfig - () => Promise<{n8n:{enabled, webhookUrl}}>
   * @param {{get:Function, set:Function}} deps.store
   */
  constructor(deps) {
    this.getConfig = deps.getConfig;
    this.store = deps.store;
    this.http = new HttpClient({ provider: 'n8n', timeoutMs: 15000, retries: 2 });
    this._wired = false;
  }

  /**
   * Suscribe automáticamente eventos del bus interno para reenviarlos a N8N.
   * @param {string[]} [eventNames] - Eventos a reenviar
   */
  wireEvents(eventNames = ['vote:recorded', 'workspace:action', 'task:complete']) {
    if (this._wired) return;
    for (const name of eventNames) {
      bus.on(name, (payload) => {
        this.send(name, payload).catch(() => {});
      });
    }
    this._wired = true;
    logger.info('Eventos internos conectados a N8N');
  }

  /**
   * Comprueba si la integración está activa.
   * @returns {Promise<boolean>}
   */
  async isEnabled() {
    const config = (await this.getConfig()) || {};
    return Boolean(config.n8n?.enabled && config.n8n?.webhookUrl);
  }

  /**
   * Envía un evento al webhook de N8N. Si falla, lo encola.
   * @param {string} event - Nombre del evento
   * @param {Object} data - Datos del evento
   * @returns {Promise<{ok:boolean, queued?:boolean}>}
   */
  async send(event, data) {
    const config = (await this.getConfig()) || {};
    const n8n = config.n8n || {};
    if (!n8n.enabled || !n8n.webhookUrl) return { ok: false };

    const payload = {
      event,
      data,
      source: 'x1',
      timestamp: new Date().toISOString()
    };

    try {
      await this.http.postJson(n8n.webhookUrl, payload);
      logger.debug(`Evento "${event}" enviado a N8N`);
      // Intentar drenar la cola tras un envío exitoso
      this.flushQueue(n8n.webhookUrl).catch(() => {});
      return { ok: true };
    } catch (error) {
      logger.warn(`N8N no disponible, encolando evento "${event}": ${error.message}`);
      await this._enqueue(payload);
      return { ok: false, queued: true };
    }
  }

  /**
   * Encola un evento pendiente de reenvío.
   * @param {Object} payload
   * @private
   */
  async _enqueue(payload) {
    const queue = (await this.store.get(QUEUE_KEY)) || [];
    queue.push(payload);
    // Limitar la cola para no crecer sin control
    if (queue.length > 200) queue.splice(0, queue.length - 200);
    await this.store.set(QUEUE_KEY, queue);
  }

  /**
   * Reintenta enviar los eventos encolados.
   * @param {string} [webhookUrl]
   * @returns {Promise<{sent:number, remaining:number}>}
   */
  async flushQueue(webhookUrl) {
    const config = (await this.getConfig()) || {};
    const url = webhookUrl || config.n8n?.webhookUrl;
    if (!url) return { sent: 0, remaining: 0 };

    const queue = (await this.store.get(QUEUE_KEY)) || [];
    if (!queue.length) return { sent: 0, remaining: 0 };

    let sent = 0;
    const remaining = [];
    for (const payload of queue) {
      try {
        await this.http.postJson(url, payload);
        sent++;
      } catch {
        remaining.push(payload);
      }
    }
    await this.store.set(QUEUE_KEY, remaining);
    if (sent) logger.info(`Reenviados ${sent} eventos encolados a N8N`);
    return { sent, remaining: remaining.length };
  }

  /**
   * Prueba la conexión con el webhook enviando un ping.
   * @returns {Promise<boolean>}
   */
  async test() {
    try {
      const result = await this.send('ping', { message: 'X1 test' });
      return result.ok;
    } catch {
      return false;
    }
  }
}

export default N8NIntegration;
