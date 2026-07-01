/**
 * Gestión de configuración del usuario
 * Routing por sector, preferencias de modelos, etc.
 */

import { DEFAULT_CONFIG, SECTORS, STORAGE_KEYS } from '../utils/constants.js';
import StorageManager from './storage.js';

export class ConfigManager {
  /**
   * Cargar configuración del usuario
   * @returns {Promise<Object>}
   */
  static async load() {
    const saved = await StorageManager.get(STORAGE_KEYS.CONFIG);
    return { ...DEFAULT_CONFIG, ...saved };
  }

  /**
   * Guardar configuración
   * @param {Object} config - Configuración a guardar
   */
  static async save(config) {
    await StorageManager.set(STORAGE_KEYS.CONFIG, config);
  }

  /**
   * Obtener modelo recomendado para un sector
   * @param {string} sector - Sector (legal, marketing, etc)
   * @returns {Promise<string>} - Nombre del modelo
   */
  static async getModelForSector(sector) {
    const config = await this.load();
    return config.sectorRouting?.[sector] || config.defaultModel;
  }

  /**
   * Establecer modelo para un sector
   * @param {string} sector - Sector
   * @param {string} model - Modelo
   */
  static async setModelForSector(sector, model) {
    const config = await this.load();
    config.sectorRouting = config.sectorRouting || {};
    config.sectorRouting[sector] = model;
    await this.save(config);
  }

  /**
   * Obtener reglas de routing completas
   * @returns {Promise<Object>}
   */
  static async getRouting() {
    const config = await this.load();
    return config.sectorRouting || {};
  }

  /**
   * Establecer configuración de comparación
   * @param {number} numModels - Número de modelos a comparar (2-4)
   */
  static async setComparisonModels(numModels) {
    const config = await this.load();
    config.comparisonModels = Math.min(4, Math.max(2, numModels));
    await this.save(config);
  }

  /**
   * Obtener configuración de Ollama
   * @returns {Promise<Object>}
   */
  static async getOllamaConfig() {
    const config = await this.load();
    return config.ollama;
  }

  /**
   * Habilitar/deshabilitar Ollama
   * @param {boolean} enabled - True para habilitar
   */
  static async setOllamaEnabled(enabled) {
    const config = await this.load();
    config.ollama.enabled = enabled;
    await this.save(config);
  }

  /**
   * Establecer nivel de proactividad
   * @param {string} level - 'low', 'medium', 'high'
   */
  static async setProactivityLevel(level) {
    const config = await this.load();
    config.proactivityLevel = level;
    await this.save(config);
  }

  /**
   * Validar que todos los API keys requeridos estén configurados
   * @returns {Promise<Object>} - { valid: boolean, missingProviders: [] }
   */
  static async validateApiKeys() {
    const config = await this.load();
    const missingProviders = [];

    // Verificar que al menos el modelo por defecto tenga clave
    const defaultModel = config.defaultModel;
    const provider = this.getProviderForModel(defaultModel);

    const apiKey = await StorageManager.getApiKey(provider);
    if (!apiKey) {
      missingProviders.push(provider);
    }

    // Verificar modelos de comparación
    if (config.comparisonModels) {
      for (const model of config.comparisonModels) {
        const modelProvider = this.getProviderForModel(model);
        const modelKey = await StorageManager.getApiKey(modelProvider);
        if (!modelKey && !missingProviders.includes(modelProvider)) {
          missingProviders.push(modelProvider);
        }
      }
    }

    return {
      valid: missingProviders.length === 0,
      missingProviders
    };
  }

  /**
   * Obtener proveedor desde nombre de modelo
   * @param {string} modelName - Nombre del modelo
   * @returns {string} - Proveedor
   */
  static getProviderForModel(modelName) {
    if (modelName.includes('gpt')) return 'openai';
    if (modelName.includes('claude')) return 'anthropic';
    if (modelName.includes('gemini')) return 'google';
    if (modelName.includes('mixtral') || modelName.includes('llama')) return 'groq';
    if (modelName.includes('command')) return 'cohere';
    return 'huggingface'; // fallback
  }

  /**
   * Reset a configuración por defecto
   */
  static async reset() {
    await StorageManager.delete(STORAGE_KEYS.CONFIG);
  }
}

export default ConfigManager;
