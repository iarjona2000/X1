/**
 * Cliente base para las APIs REST de Google.
 *
 * Inyecta el token de OAuth en cada petición, reintenta una vez ante 401
 * refrescando el token, y normaliza errores a WorkspaceError. Todos los
 * servicios (Gmail, Docs, Sheets, Calendar, Drive) construyen sobre este.
 */

import { googleAuth } from './google-auth.js';
import { HttpClient } from '../../utils/http.js';
import { WorkspaceError, AuthError } from '../../utils/errors.js';
import Logger from '../logger.js';

const logger = new Logger('GoogleApi');

export class GoogleApiClient {
  /**
   * @param {Object} [options]
   * @param {import('./google-auth.js').GoogleAuth} [options.auth]
   * @param {string} [options.service] - Etiqueta del servicio (para errores)
   */
  constructor(options = {}) {
    this.auth = options.auth || googleAuth;
    this.service = options.service || 'workspace';
    this.http = new HttpClient({ provider: `google:${this.service}`, timeoutMs: 30000 });
  }

  /**
   * Realiza una petición autenticada, con un reintento tras refrescar token.
   * @param {string} url - URL absoluta de la API
   * @param {Object} [options] - method, headers, body, signal…
   * @returns {Promise<*>}
   */
  async request(url, options = {}) {
    const doRequest = async (token) => {
      const headers = {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      };
      return this.http.request(url, { ...options, headers, retries: 0 });
    };

    let token = await this.auth.getToken({ interactive: options.interactive !== false });
    try {
      const res = await doRequest(token);
      return res.data;
    } catch (error) {
      if (error instanceof AuthError || error.code === 'AUTH') {
        logger.debug('Token rechazado, refrescando y reintentando');
        token = await this.auth.refresh();
        try {
          const res = await doRequest(token);
          return res.data;
        } catch (retryError) {
          throw this._wrap(retryError);
        }
      }
      throw this._wrap(error);
    }
  }

  /**
   * GET JSON.
   * @param {string} url
   * @param {Object} [options]
   * @returns {Promise<*>}
   */
  get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * POST JSON.
   * @param {string} url
   * @param {*} body
   * @param {Object} [options]
   * @returns {Promise<*>}
   */
  post(url, body, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: JSON.stringify(body)
    });
  }

  /**
   * PATCH JSON.
   * @param {string} url
   * @param {*} body
   * @param {Object} [options]
   * @returns {Promise<*>}
   */
  patch(url, body, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: JSON.stringify(body)
    });
  }

  /**
   * PUT JSON.
   * @param {string} url
   * @param {*} body
   * @param {Object} [options]
   * @returns {Promise<*>}
   */
  put(url, body, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: JSON.stringify(body)
    });
  }

  /**
   * DELETE.
   * @param {string} url
   * @param {Object} [options]
   * @returns {Promise<*>}
   */
  delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  /**
   * Construye una query string a partir de un objeto (omite null/undefined).
   * @param {Object} params
   * @returns {string}
   */
  static qs(params) {
    const entries = Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== ''
    );
    if (!entries.length) return '';
    return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  }

  /**
   * Envuelve errores como WorkspaceError conservando la causa.
   * @param {*} error
   * @returns {WorkspaceError}
   * @private
   */
  _wrap(error) {
    if (error instanceof WorkspaceError) return error;
    return new WorkspaceError(error.message, {
      cause: error,
      context: { service: this.service, status: error.status }
    });
  }
}

export default GoogleApiClient;
