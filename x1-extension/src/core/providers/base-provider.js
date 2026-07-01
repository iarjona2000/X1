/**
 * Proveedor base de IA.
 *
 * Define la interfaz normalizada que todos los proveedores concretos
 * implementan. La normalización permite que el resto del sistema (juez,
 * agentes, orquestador) trabaje con cualquier modelo de forma uniforme.
 *
 * Formato normalizado de respuesta (CompletionResult):
 * {
 *   text: string,           // contenido generado
 *   model: string,          // id del modelo
 *   provider: string,       // id del proveedor
 *   usage: {                // uso de tokens (0 si el proveedor no lo reporta)
 *     inputTokens: number,
 *     outputTokens: number,
 *     totalTokens: number
 *   },
 *   finishReason: string,   // 'stop' | 'length' | 'content_filter' | 'tool_calls' | null
 *   toolCalls: Array|null,  // llamadas a herramientas si las hubo
 *   raw: Object             // respuesta cruda (para depuración)
 * }
 */

import { ApiKeyMissingError, ProviderError } from '../../utils/errors.js';
import { estimateTokens } from '../../utils/text.js';
import Logger from '../logger.js';

/**
 * @typedef {Object} ChatMessage
 * @property {'system'|'user'|'assistant'|'tool'} role
 * @property {string} content
 * @property {string} [name]
 * @property {Array} [toolCalls]
 */

/**
 * @typedef {Object} CompletionOptions
 * @property {number} [temperature]
 * @property {number} [maxTokens]
 * @property {number} [topP]
 * @property {string[]} [stop]
 * @property {Array} [tools] - Definiciones de herramientas (function calling)
 * @property {AbortSignal} [signal]
 * @property {Object} [responseFormat] - p.ej. {type:'json_object'}
 */

export class BaseProvider {
  /**
   * @param {Object} config
   * @param {string} config.id - Identificador del proveedor (openai, anthropic…)
   * @param {string} [config.baseUrl]
   * @param {Function} config.getApiKey - () => Promise<string|null>
   * @param {import('../../utils/http.js').HttpClient} [config.http]
   */
  constructor(config) {
    this.id = config.id;
    this.baseUrl = config.baseUrl || '';
    this.getApiKey = config.getApiKey;
    this.http = config.http || null;
    this.logger = new Logger(`Provider:${this.id}`);
    /** Capacidades declaradas; las subclases las ajustan. */
    this.capabilities = {
      streaming: false,
      tools: false,
      embeddings: false,
      vision: false,
      json: false
    };
  }

  /**
   * Obtiene la API key o lanza un error tipado.
   * @returns {Promise<string>}
   */
  async requireApiKey() {
    const key = await this.getApiKey(this.id);
    if (!key) throw new ApiKeyMissingError(this.id);
    return key;
  }

  /**
   * Genera una respuesta (no streaming). Debe implementarse en subclases.
   * @param {ChatMessage[]} _messages
   * @param {CompletionOptions} [_options]
   * @param {string} _model
   * @returns {Promise<Object>} CompletionResult
   * @abstract
   */
  // eslint-disable-next-line no-unused-vars
  async complete(_model, _messages, _options = {}) {
    throw new ProviderError(`complete() no implementado en ${this.id}`, {
      context: { provider: this.id }
    });
  }

  /**
   * Genera una respuesta en streaming, invocando onToken por cada fragmento.
   * Por defecto simula streaming a partir de complete() si el proveedor no lo
   * soporta nativamente.
   * @param {string} model
   * @param {ChatMessage[]} messages
   * @param {CompletionOptions & {onToken?:(t:string)=>void}} [options]
   * @returns {Promise<Object>} CompletionResult final
   */
  async stream(model, messages, options = {}) {
    // Fallback: ejecutar complete y emitir el texto de golpe
    const result = await this.complete(model, messages, options);
    if (options.onToken && result.text) {
      options.onToken(result.text);
    }
    return result;
  }

  /**
   * Genera embeddings para uno o varios textos. Opcional.
   * @param {string|string[]} _input
   * @param {Object} [_options]
   * @returns {Promise<number[][]>}
   */
  // eslint-disable-next-line no-unused-vars
  async embed(_input, _options = {}) {
    throw new ProviderError(`embed() no soportado por ${this.id}`, {
      context: { provider: this.id }
    });
  }

  /**
   * Comprobación de salud ligera (sin consumir cuota si es posible).
   * @returns {Promise<{ok:boolean, detail?:string}>}
   */
  async health() {
    try {
      const key = await this.getApiKey(this.id);
      return { ok: Boolean(key), detail: key ? 'clave presente' : 'sin clave' };
    } catch (error) {
      return { ok: false, detail: error.message };
    }
  }

  /**
   * Lista de modelos conocidos del proveedor. Las subclases pueden
   * sobreescribir para consultar al API.
   * @returns {Promise<string[]>}
   */
  async listModels() {
    return [];
  }

  /**
   * Normaliza el objeto de uso de tokens, estimando si falta.
   * @param {Object} usage - Objeto crudo del proveedor
   * @param {ChatMessage[]} messages - Para estimar entrada
   * @param {string} outputText - Para estimar salida
   * @returns {{inputTokens:number, outputTokens:number, totalTokens:number}}
   * @protected
   */
  _normalizeUsage(usage, messages, outputText) {
    if (usage) {
      const input = usage.prompt_tokens ?? usage.input_tokens ?? 0;
      const output = usage.completion_tokens ?? usage.output_tokens ?? 0;
      return {
        inputTokens: input,
        outputTokens: output,
        totalTokens: usage.total_tokens ?? input + output
      };
    }
    // Estimación cuando el proveedor no reporta uso
    const input = messages.reduce((sum, m) => sum + estimateTokens(m.content || ''), 0);
    const output = estimateTokens(outputText || '');
    return { inputTokens: input, outputTokens: output, totalTokens: input + output };
  }

  /**
   * Convierte mensajes normalizados al formato estándar OpenAI-compatible.
   * Muchos proveedores (Groq, OpenAI, algunos endpoints HF) lo aceptan.
   * @param {ChatMessage[]} messages
   * @returns {Array<{role:string, content:string}>}
   * @protected
   */
  _toOpenAiMessages(messages) {
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.name ? { name: m.name } : {})
    }));
  }

  /**
   * Construye un CompletionResult normalizado.
   * @param {Object} params
   * @returns {Object}
   * @protected
   */
  _result({ text, model, usage, finishReason = 'stop', toolCalls = null, raw = null }) {
    return {
      text: text || '',
      model,
      provider: this.id,
      usage: usage || { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      finishReason,
      toolCalls,
      raw
    };
  }
}

export default BaseProvider;
