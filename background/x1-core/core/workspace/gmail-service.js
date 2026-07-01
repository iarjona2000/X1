/**
 * Servicio Gmail: redactar, enviar, leer, buscar, resumir y etiquetar.
 * Construye mensajes MIME y los codifica en base64url como exige la API.
 */

import { GoogleApiClient } from './google-api.js';
import { WorkspaceError } from '../../utils/errors.js';
import Logger from '../logger.js';

const logger = new Logger('Gmail');
const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

export class GmailService {
  /**
   * @param {Object} [options]
   * @param {GoogleApiClient} [options.api]
   */
  constructor(options = {}) {
    this.api = options.api || new GoogleApiClient({ service: 'gmail' });
  }

  /**
   * Lista mensajes que cumplen una query estilo Gmail (p.ej. "is:unread").
   * @param {Object} [options]
   * @param {string} [options.query]
   * @param {number} [options.maxResults=10]
   * @param {string[]} [options.labelIds]
   * @returns {Promise<Array<{id:string, threadId:string}>>}
   */
  async list({ query, maxResults = 10, labelIds } = {}) {
    const qs = GoogleApiClient.qs({
      q: query,
      maxResults,
      labelIds: labelIds?.join(',')
    });
    const data = await this.api.get(`${BASE}/messages${qs}`);
    return data.messages || [];
  }

  /**
   * Obtiene un mensaje completo y lo normaliza a un objeto legible.
   * @param {string} id
   * @param {Object} [options]
   * @param {'full'|'metadata'|'minimal'} [options.format='full']
   * @returns {Promise<Object>}
   */
  async get(id, { format = 'full' } = {}) {
    const data = await this.api.get(`${BASE}/messages/${id}?format=${format}`);
    return this._parseMessage(data);
  }

  /**
   * Lee los N mensajes más recientes que cumplan la query, ya parseados.
   * @param {Object} [options]
   * @returns {Promise<Object[]>}
   */
  async readRecent(options = {}) {
    const list = await this.list(options);
    const messages = [];
    for (const { id } of list) {
      try {
        messages.push(await this.get(id));
      } catch (error) {
        logger.warn(`No se pudo leer el mensaje ${id}: ${error.message}`);
      }
    }
    return messages;
  }

  /**
   * Obtiene todos los mensajes de un hilo (para resumir conversaciones).
   * @param {string} threadId
   * @returns {Promise<Object[]>}
   */
  async getThread(threadId) {
    const data = await this.api.get(`${BASE}/threads/${threadId}?format=full`);
    return (data.messages || []).map((m) => this._parseMessage(m));
  }

  /**
   * Crea un borrador.
   * @param {Object} params - {to, subject, body, cc, bcc, replyToMessageId, threadId}
   * @returns {Promise<{id:string, message:Object}>}
   */
  async createDraft(params) {
    const raw = this._buildRawMessage(params);
    const body = { message: { raw, threadId: params.threadId } };
    return this.api.post(`${BASE}/drafts`, body);
  }

  /**
   * Envía un correo directamente. Requiere confirmación en la capa superior.
   * @param {Object} params - {to, subject, body, cc, bcc, threadId}
   * @returns {Promise<Object>}
   */
  async send(params) {
    if (!params.to) throw new WorkspaceError('Falta el destinatario', { context: { service: 'gmail' } });
    const raw = this._buildRawMessage(params);
    const result = await this.api.post(`${BASE}/messages/send`, {
      raw,
      threadId: params.threadId
    });
    logger.info(`Correo enviado a ${params.to}`);
    return result;
  }

  /**
   * Envía un borrador existente.
   * @param {string} draftId
   * @returns {Promise<Object>}
   */
  async sendDraft(draftId) {
    return this.api.post(`${BASE}/drafts/send`, { id: draftId });
  }

  /**
   * Marca mensajes como leídos/no leídos u otros cambios de etiquetas.
   * @param {string} id
   * @param {Object} params - {add:string[], remove:string[]}
   * @returns {Promise<Object>}
   */
  async modifyLabels(id, { add = [], remove = [] }) {
    return this.api.post(`${BASE}/messages/${id}/modify`, {
      addLabelIds: add,
      removeLabelIds: remove
    });
  }

  /** Marca un mensaje como leído. */
  markRead(id) {
    return this.modifyLabels(id, { remove: ['UNREAD'] });
  }

  /** Archiva un mensaje (quita INBOX). */
  archive(id) {
    return this.modifyLabels(id, { remove: ['INBOX'] });
  }

  /**
   * Mueve a la papelera.
   * @param {string} id
   * @returns {Promise<Object>}
   */
  trash(id) {
    return this.api.post(`${BASE}/messages/${id}/trash`, {});
  }

  /**
   * Lista las etiquetas del usuario.
   * @returns {Promise<Array<{id:string, name:string}>>}
   */
  async listLabels() {
    const data = await this.api.get(`${BASE}/labels`);
    return data.labels || [];
  }

  /**
   * Construye el mensaje MIME y lo codifica en base64url.
   * @param {Object} params
   * @returns {string}
   * @private
   */
  _buildRawMessage({ to, subject, body, cc, bcc, replyToMessageId, from }) {
    const headers = [];
    if (from) headers.push(`From: ${from}`);
    headers.push(`To: ${to}`);
    if (cc) headers.push(`Cc: ${cc}`);
    if (bcc) headers.push(`Bcc: ${bcc}`);
    headers.push(`Subject: ${this._encodeHeader(subject || '')}`);
    if (replyToMessageId) {
      headers.push(`In-Reply-To: ${replyToMessageId}`);
      headers.push(`References: ${replyToMessageId}`);
    }
    headers.push('MIME-Version: 1.0');
    headers.push('Content-Type: text/plain; charset="UTF-8"');
    headers.push('Content-Transfer-Encoding: 7bit');

    const mime = `${headers.join('\r\n')}\r\n\r\n${body || ''}`;
    return this._base64Url(mime);
  }

  /**
   * Codifica asuntos con caracteres no ASCII (RFC 2047).
   * @param {string} text
   * @returns {string}
   * @private
   */
  _encodeHeader(text) {
    // eslint-disable-next-line no-control-regex
    if (/^[\x00-\x7F]*$/.test(text)) return text;
    const b64 = this._base64Url(text).replace(/-/g, '+').replace(/_/g, '/');
    return `=?UTF-8?B?${b64}?=`;
  }

  /**
   * Codificación base64url compatible con UTF-8.
   * @param {string} str
   * @returns {string}
   * @private
   */
  _base64Url(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Decodifica base64url a texto UTF-8.
   * @param {string} data
   * @returns {string}
   * @private
   */
  _decodeBase64Url(data) {
    if (!data) return '';
    const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /**
   * Extrae el cuerpo de texto plano de un payload MIME (recursivo).
   * @param {Object} payload
   * @returns {string}
   * @private
   */
  _extractBody(payload) {
    if (!payload) return '';
    if (payload.body?.data && payload.mimeType === 'text/plain') {
      return this._decodeBase64Url(payload.body.data);
    }
    if (payload.parts) {
      // Preferir text/plain; si no, el primer text/html "limpiado"
      const plain = payload.parts.find((p) => p.mimeType === 'text/plain');
      if (plain?.body?.data) return this._decodeBase64Url(plain.body.data);
      const html = payload.parts.find((p) => p.mimeType === 'text/html');
      if (html?.body?.data) {
        return this._stripHtml(this._decodeBase64Url(html.body.data));
      }
      // Buscar en sub-partes anidadas
      for (const part of payload.parts) {
        const nested = this._extractBody(part);
        if (nested) return nested;
      }
    }
    if (payload.body?.data) return this._decodeBase64Url(payload.body.data);
    return '';
  }

  /** Elimina etiquetas HTML de forma básica. @private */
  _stripHtml(html) {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normaliza un mensaje de la API a un objeto de dominio.
   * @param {Object} data
   * @returns {Object}
   * @private
   */
  _parseMessage(data) {
    const headers = data.payload?.headers || [];
    const getHeader = (name) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    return {
      id: data.id,
      threadId: data.threadId,
      labelIds: data.labelIds || [],
      snippet: data.snippet || '',
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      body: this._extractBody(data.payload),
      unread: (data.labelIds || []).includes('UNREAD')
    };
  }
}

export default GmailService;
