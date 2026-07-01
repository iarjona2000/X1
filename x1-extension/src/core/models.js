/**
 * Integración con múltiples proveedores de IA
 * Soporta: OpenAI, Anthropic, Google, Groq, HuggingFace, Ollama, Cohere
 */

import { API_ENDPOINTS, MODELS } from '../utils/constants.js';
import StorageManager from './storage.js';
import ConfigManager from './config.js';
import Logger from './logger.js';

const logger = new Logger('Models');

export class ModelManager {
  /**
   * Llamar a un modelo específico
   * @param {string} model - Nombre del modelo
   * @param {string} systemPrompt - Prompt del sistema
   * @param {string} userMessage - Mensaje del usuario
   * @param {Object} options - Opciones (temperature, maxTokens, etc)
   * @returns {Promise<{text: string, model: string, tokens: number}>}
   */
  static async call(model, systemPrompt, userMessage, options = {}) {
    const provider = ConfigManager.getProviderForModel(model);
    logger.debug(`Llamando modelo ${model} (proveedor: ${provider})`);

    try {
      switch (provider) {
        case 'openai':
          return await this.callOpenAI(model, systemPrompt, userMessage, options);
        case 'anthropic':
          return await this.callAnthropic(model, systemPrompt, userMessage, options);
        case 'google':
          return await this.callGoogle(model, systemPrompt, userMessage, options);
        case 'groq':
          return await this.callGroq(model, systemPrompt, userMessage, options);
        case 'huggingface':
          return await this.callHuggingFace(model, userMessage, options);
        case 'ollama':
          return await this.callOllama(model, systemPrompt, userMessage, options);
        case 'cohere':
          return await this.callCohere(model, systemPrompt, userMessage, options);
        default:
          throw new Error(`Proveedor desconocido: ${provider}`);
      }
    } catch (error) {
      logger.error(`Error llamando modelo ${model}:`, error.message);
      throw error;
    }
  }

  /**
   * OpenAI API
   */
  static async callOpenAI(model, systemPrompt, userMessage, options) {
    const apiKey = await StorageManager.getApiKey('openai');
    if (!apiKey) throw new Error('OpenAI API key no configurada');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI error: ${error.error?.message}`);
    }

    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      model,
      tokens: data.usage?.total_tokens || 0
    };
  }

  /**
   * Anthropic Claude API
   */
  static async callAnthropic(model, systemPrompt, userMessage, options) {
    const apiKey = await StorageManager.getApiKey('anthropic');
    if (!apiKey) throw new Error('Anthropic API key no configurada');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens || 1000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ],
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic error: ${error.error?.message}`);
    }

    const data = await response.json();
    return {
      text: data.content[0].text,
      model,
      tokens: data.usage?.output_tokens || 0
    };
  }

  /**
   * Google Gemini API
   */
  static async callGoogle(model, systemPrompt, userMessage, options) {
    const apiKey = await StorageManager.getApiKey('google');
    if (!apiKey) throw new Error('Google API key no configurada');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }
          ],
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 1000
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google error: ${error.error?.message}`);
    }

    const data = await response.json();
    return {
      text: data.candidates[0].content.parts[0].text,
      model,
      tokens: 0 // Google no retorna token count
    };
  }

  /**
   * Groq API
   */
  static async callGroq(model, systemPrompt, userMessage, options) {
    const apiKey = await StorageManager.getApiKey('groq');
    if (!apiKey) throw new Error('Groq API key no configurada');

    const response = await fetch(`${API_ENDPOINTS.GROQ}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000
      })
    });

    if (!response.ok) {
      throw new Error('Error llamando Groq API');
    }

    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      model,
      tokens: data.usage?.total_tokens || 0
    };
  }

  /**
   * HuggingFace Inference API
   */
  static async callHuggingFace(model, userMessage, options) {
    const apiKey = await StorageManager.getApiKey('huggingface');
    if (!apiKey) throw new Error('HuggingFace API key no configurada');

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: userMessage,
          parameters: {
            max_length: options.maxTokens || 512,
            temperature: options.temperature || 0.7
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error('Error llamando HuggingFace API');
    }

    const data = await response.json();
    const text = Array.isArray(data) ? data[0].generated_text : data.generated_text;

    return {
      text,
      model,
      tokens: 0
    };
  }

  /**
   * Ollama (Local)
   */
  static async callOllama(model, systemPrompt, userMessage, options) {
    const config = await ConfigManager.getOllamaConfig();
    if (!config.enabled) throw new Error('Ollama no está habilitado');

    const response = await fetch(`${config.endpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        prompt: `${systemPrompt}\n\n${userMessage}`,
        stream: false,
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      throw new Error('Error conectando a Ollama');
    }

    const data = await response.json();
    return {
      text: data.response,
      model,
      tokens: 0
    };
  }

  /**
   * Cohere API
   */
  static async callCohere(model, systemPrompt, userMessage, options) {
    const apiKey = await StorageManager.getApiKey('cohere');
    if (!apiKey) throw new Error('Cohere API key no configurada');

    const response = await fetch('https://api.cohere.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        prompt: `${systemPrompt}\n\n${userMessage}`,
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      throw new Error('Error llamando Cohere API');
    }

    const data = await response.json();
    return {
      text: data.generations[0].text,
      model,
      tokens: 0
    };
  }

  /**
   * Probar conexión con un proveedor
   * @param {string} provider - Nombre del proveedor
   * @returns {Promise<boolean>}
   */
  static async testConnection(provider) {
    try {
      const apiKey = await StorageManager.getApiKey(provider);
      if (!apiKey) return false;

      // Test ligero sin usar cuota
      if (provider === 'ollama') {
        const config = await ConfigManager.getOllamaConfig();
        const response = await fetch(`${config.endpoint}/api/tags`);
        return response.ok;
      }

      // Para otros proveedores, se puede hacer un test más completo si es necesario
      return true;
    } catch (error) {
      logger.error(`Error probando conexión con ${provider}:`, error.message);
      return false;
    }
  }

  /**
   * Obtener lista de modelos disponibles para un proveedor
   * @param {string} provider - Nombre del proveedor
   * @returns {Array<string>}
   */
  static getAvailableModels(provider) {
    return Object.keys(MODELS[provider?.toUpperCase()] || {});
  }

  /**
   * Calcular costo estimado de una llamada
   * @param {string} model - Nombre del modelo
   * @param {number} inputTokens - Tokens de entrada
   * @param {number} outputTokens - Tokens de salida
   * @returns {number} - Costo en USD
   */
  static estimateCost(model, inputTokens, outputTokens) {
    const modelInfo = Object.values(MODELS)
      .flatMap(Object.values)
      .find(m => m.name === model);

    if (!modelInfo || modelInfo.free || modelInfo.local) return 0;

    const totalTokens = (inputTokens + outputTokens) / 1000000;
    return totalTokens * (modelInfo.costPerMTok || 0);
  }
}

export default ModelManager;
