/**
 * Autenticación con Google vía chrome.identity (OAuth 2.0).
 *
 * Gestiona la obtención, cacheo y revocación de tokens de acceso. Los scopes
 * se declaran en el manifest; aquí solo pedimos/renovamos el token.
 */

import { AuthError } from '../../utils/errors.js';
import Logger from '../logger.js';

const logger = new Logger('GoogleAuth');

export class GoogleAuth {
  constructor() {
    this._cachedToken = null;
    this._cachedAt = 0;
    // Los tokens de Google duran ~1h; refrescamos con margen a los 50 min
    this.tokenTtlMs = 50 * 60 * 1000;
  }

  /**
   * Indica si la API de identity está disponible (contexto de extensión).
   * @returns {boolean}
   */
  isAvailable() {
    return typeof chrome !== 'undefined' && !!chrome.identity?.getAuthToken;
  }

  /**
   * Obtiene un token de acceso. Usa caché si sigue vigente.
   * @param {Object} [options]
   * @param {boolean} [options.interactive=true] - Permitir prompt de login
   * @param {boolean} [options.forceRefresh=false]
   * @returns {Promise<string>}
   */
  async getToken({ interactive = true, forceRefresh = false } = {}) {
    if (!this.isAvailable()) {
      throw new AuthError('chrome.identity no disponible en este contexto');
    }
    const fresh = Date.now() - this._cachedAt < this.tokenTtlMs;
    if (this._cachedToken && fresh && !forceRefresh) {
      return this._cachedToken;
    }
    if (forceRefresh && this._cachedToken) {
      await this._removeCached(this._cachedToken);
    }

    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive }, (t) => {
        if (chrome.runtime.lastError || !t) {
          reject(new AuthError(chrome.runtime.lastError?.message || 'Sin token'));
        } else {
          resolve(t);
        }
      });
    });

    this._cachedToken = token;
    this._cachedAt = Date.now();
    logger.debug('Token de Google obtenido');
    return token;
  }

  /**
   * Fuerza la renovación del token (p.ej. tras un 401).
   * @returns {Promise<string>}
   */
  async refresh() {
    return this.getToken({ interactive: false, forceRefresh: true });
  }

  /**
   * Comprueba si hay sesión activa sin abrir el diálogo interactivo.
   * @returns {Promise<boolean>}
   */
  async isLoggedIn() {
    try {
      const token = await this.getToken({ interactive: false });
      return Boolean(token);
    } catch {
      return false;
    }
  }

  /**
   * Cierra sesión: revoca y elimina el token cacheado por Chrome.
   * @returns {Promise<void>}
   */
  async logout() {
    if (!this._cachedToken) {
      try {
        this._cachedToken = await this.getToken({ interactive: false });
      } catch {
        return;
      }
    }
    await this._removeCached(this._cachedToken);
    // Revocar en el servidor de Google
    try {
      await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${this._cachedToken}`);
    } catch (error) {
      logger.warn(`No se pudo revocar el token: ${error.message}`);
    }
    this._cachedToken = null;
    this._cachedAt = 0;
    logger.info('Sesión de Google cerrada');
  }

  /**
   * Elimina un token de la caché interna de Chrome.
   * @param {string} token
   * @returns {Promise<void>}
   * @private
   */
  _removeCached(token) {
    return new Promise((resolve) => {
      if (!chrome.identity?.removeCachedAuthToken) {
        resolve();
        return;
      }
      chrome.identity.removeCachedAuthToken({ token }, () => resolve());
    });
  }

  /**
   * Obtiene el perfil básico del usuario autenticado.
   * @returns {Promise<{email:string, name?:string, picture?:string}>}
   */
  async getUserInfo() {
    const token = await this.getToken({ interactive: false });
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new AuthError('No se pudo obtener el perfil de usuario');
    return res.json();
  }
}

/** Instancia compartida. */
export const googleAuth = new GoogleAuth();

export default GoogleAuth;
