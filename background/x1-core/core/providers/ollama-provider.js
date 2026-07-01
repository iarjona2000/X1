/**
 * Proveedor Ollama (modelos locales). No requiere API key; se conecta al
 * demonio local (por defecto http://localhost:11434). Soporta streaming NDJSON
 * y embeddings locales.
 */

import { BaseProvider } from './base-provider.js';
import { HttpClient } from '../../utils/http.js';
import { ProviderUnavailableError } from '../../utils/errors.js';

export class OllamaProvider extends BaseProvider {
  /**
   * @param {Object} config
   * @param {() => Promise<{enabled:boolean, endpoint:string}>} config.getConfig
   */
  constructor(config) {
    super({ id: 'ollama', getApiKey: async () => 'local', ...config });
    this.getConfig = config.getConfig;
    this.capabilities = {
      streaming: true,
      tools: false,
      embeddings: true,
      vision: false,
      json: true
    };
    this.embeddingModel = 'nomic-embed-text';
  }

  /**
   * Resuelve el endpoint local desde la configuración.
   * @returns {Promise<HttpClient>}
   * @private
   */
  async _client() {
    const cfg = (await this.getConfig?.()) || { endpoint: 'http://localhost:11434' };
    return new HttpClient({
      baseUrl: cfg.endpoint,
      provider: this.id,
      timeoutMs: 120000, // modelos locales pueden tardar
      retries: 0
    });
  }

  /**
   * Convierte mensajes normalizados al formato /api/chat de Ollama.
   * @private
   */
  _toChat(messages) {
    return messages.map((m) => ({ role: m.role, content: m.content }));
  }

  async complete(model, messages, options = {}) {
    const client = await this._client();
    const data = await client.postJson(
      '/api/chat',
      {
        model,
        messages: this._toChat(messages),
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens ?? 1024
        },
        format: options.responseFormat?.type === 'json_object' ? 'json' : undefined
      },
      { signal: options.signal }
    );

    const text = data.message?.content || '';
    return this._result({
      text,
      model,
      usage: {
        inputTokens: data.prompt_eval_count || 0,
        outputTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      },
      finishReason: data.done ? 'stop' : 'length',
      raw: data
    });
  }

  async stream(model, messages, options = {}) {
    const client = await this._client();
    let text = '';
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

    await client.streamNdjson(
      '/api/chat',
      {
        model,
        messages: this._toChat(messages),
        stream: true,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens ?? 1024
        }
      },
      {
        signal: options.signal,
        onEvent: (obj) => {
          if (obj.message?.content) {
            text += obj.message.content;
            options.onToken?.(obj.message.content);
          }
          if (obj.done) {
            usage = {
              inputTokens: obj.prompt_eval_count || 0,
              outputTokens: obj.eval_count || 0,
              totalTokens: (obj.prompt_eval_count || 0) + (obj.eval_count || 0)
            };
          }
        }
      }
    );

    return this._result({ text, model, usage });
  }

  async embed(input, options = {}) {
    const client = await this._client();
    const inputs = Array.isArray(input) ? input : [input];
    const model = options.model || this.embeddingModel;
    const results = [];
    for (const text of inputs) {
      const data = await client.postJson('/api/embeddings', { model, prompt: text });
      results.push(data.embedding);
    }
    return results;
  }

  async listModels() {
    try {
      const client = await this._client();
      const data = await client.get('/api/tags');
      return (data.models || []).map((m) => m.name);
    } catch (error) {
      throw new ProviderUnavailableError('Ollama no responde. ¿Está en ejecución?', {
        cause: error
      });
    }
  }

  async health() {
    try {
      const client = await this._client();
      await client.get('/api/tags', { timeoutMs: 3000, retries: 0 });
      return { ok: true, detail: 'Ollama activo' };
    } catch (error) {
      return { ok: false, detail: 'Ollama no disponible' };
    }
  }
}

export default OllamaProvider;
