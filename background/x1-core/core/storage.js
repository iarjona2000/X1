/**
 * Gestión de almacenamiento local y cifrado
 * Interfaz consistente para chrome.storage
 */

import { STORAGE_KEYS } from '../utils/constants.js';
import CryptoManager from './crypto.js';

export class StorageManager {
  static async init(password) {
    this.key = await CryptoManager.generateKeyFromPassword(password);
  }

  /**
   * Guardar dato encriptado
   * @param {string} key - Clave de almacenamiento
   * @param {*} value - Valor a guardar (se serializa a JSON)
   */
  static async set(key, value) {
    try {
      const jsonString = JSON.stringify(value);
      const encrypted = await CryptoManager.encrypt(jsonString, this.key);

      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: encrypted }, () => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve();
        });
      });
    } catch (error) {
      console.error('[X1] Error al guardar datos encriptados:', error);
      throw error;
    }
  }

  /**
   * Recuperar dato encriptado
   * @param {string} key - Clave de almacenamiento
   * @returns {Promise<*>} - Valor deserializado
   */
  static async get(key) {
    try {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], async (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }

          if (!result[key]) {
            resolve(null);
            return;
          }

          try {
            const decrypted = await CryptoManager.decrypt(result[key], this.key);
            const parsed = JSON.parse(decrypted);
            resolve(parsed);
          } catch (error) {
            console.error('[X1] Error al descifrar datos:', error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('[X1] Error al recuperar datos:', error);
      throw error;
    }
  }

  /**
   * Eliminar dato
   * @param {string} key - Clave a eliminar
   */
  static async delete(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove([key], () => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve();
      });
    });
  }

  /**
   * Guardar API key (cifrada)
   * @param {string} provider - Proveedor (openai, anthropic, etc)
   * @param {string} apiKey - Clave API
   */
  static async setApiKey(provider, apiKey) {
    const keys = await this.get(STORAGE_KEYS.API_KEYS) || {};
    keys[provider] = apiKey;
    await this.set(STORAGE_KEYS.API_KEYS, keys);
  }

  /**
   * Recuperar API key
   * @param {string} provider - Proveedor
   * @returns {Promise<string|null>}
   */
  static async getApiKey(provider) {
    const keys = await this.get(STORAGE_KEYS.API_KEYS) || {};
    return keys[provider] || null;
  }

  /**
   * Guardar voto
   * @param {Object} vote - Objeto con datos del voto
   */
  static async addVote(vote) {
    const votes = await this.get(STORAGE_KEYS.VOTES) || [];
    votes.push({
      ...vote,
      timestamp: new Date().toISOString()
    });
    await this.set(STORAGE_KEYS.VOTES, votes);
  }

  /**
   * Obtener todos los votos
   * @returns {Promise<Array>}
   */
  static async getVotes() {
    return this.get(STORAGE_KEYS.VOTES) || [];
  }

  /**
   * Guardar mensaje en historial
   * @param {Object} message - Objeto con datos del mensaje
   */
  static async addToHistory(message) {
    const history = await this.get(STORAGE_KEYS.HISTORY) || [];
    history.push({
      ...message,
      timestamp: new Date().toISOString()
    });
    // Mantener últimos 100 mensajes
    if (history.length > 100) {
      history.shift();
    }
    await this.set(STORAGE_KEYS.HISTORY, history);
  }

  /**
   * Obtener historial de chat
   * @returns {Promise<Array>}
   */
  static async getHistory() {
    return this.get(STORAGE_KEYS.HISTORY) || [];
  }

  /**
   * Limpiar historial completo
   */
  static async clearHistory() {
    await this.delete(STORAGE_KEYS.HISTORY);
  }
}

export default StorageManager;
