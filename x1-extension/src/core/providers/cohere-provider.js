/**
 * Proveedor Cohere (Chat API v1 + Embeddings). Formato propio con `message`,
 * `chat_history` y `preamble` (system).
 */

import { BaseProvider } from './base-provider.js';
import { HttpClient } from '../../utils/http.js';
import { parseLooseJson } from '../../utils/text.js';

export class CohereProvider extends BaseProvider {
  constructor(config) {
    super({ id: 'cohere', baseUrl: 'https://api.cohere.ai/v1', ...config });
    this.capabilities = {
      streaming: true,
      tools: true,
      embeddings: true,
      vision: false,
      json: false
    };
    this.embeddingModel = 'embed-multilingual-v3.0';
  }

  async _client() {
    const apiKey = await this.requireApiKey();
    return new HttpClient({
      baseUrl: this.baseUrl,
      provider: this.id,
      timeoutMs: 60000,
      defaultHeaders: { Authorization: `Bearer ${apiKey}` }
    });
  }

  /**
   * Convierte mensajes normalizados al formato de Cohere.
   * @private
   */
  _convert(messages) {
    let preamble = '';
    const history = [];
    let message = '';
    messages.forEach((m, i) => {
      if (m.role === 'system') preamble += (preamble ? '\n' : '') + m.content;
      else if (i === messages.length - 1 && m.role === 'user') message = m.content;
      else history.push({ role: m.role === 'assistant' ? 'CHATBOT' : 'USER', message: m.content });
    });
    return { preamble, history, message };
  }

  _buildBody(model, messages, options, stream) {
    const { preamble, history, message } = this._convert(messages);
    return {
      model,
      message,
      chat_history: history,
      preamble: preamble || undefined,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
      stream
    };
  }

  async complete(model, messages, options = {}) {
    const client = await this._client();
    const body = this._buildBody(model, messages, options, false);
    const data = await client.postJson('/chat', body, { signal: options.signal });
    const text = data.text || '';
    return this._result({
      text,
      model,
      usage: this._normalizeUsage(
        data.meta?.tokens
          ? { input_tokens: data.meta.tokens.input_tokens, output_tokens: data.meta.tokens.output_tokens }
          : null,
        messages,
        text
      ),
      finishReason: data.finish_reason || 'stop',
      raw: data
    });
  }

  async stream(model, messages, options = {}) {
    const client = await this._client();
    const body = this._buildBody(model, messages, options, true);
    let text = '';
    await client.streamNdjson('/chat', body, {
      signal: options.signal,
      onEvent: (obj) => {
        if (obj.event_type === 'text-generation' && obj.text) {
          text += obj.text;
          options.onToken?.(obj.text);
        }
      }
    });
    return this._result({ text, model, usage: this._normalizeUsage(null, messages, text) });
  }

  async embed(input, options = {}) {
    const client = await this._client();
    const texts = Array.isArray(input) ? input : [input];
    const data = await client.postJson('/embed', {
      model: options.model || this.embeddingModel,
      texts,
      input_type: options.inputType || 'search_document'
    });
    return data.embeddings;
  }

  async listModels() {
    return ['command-r-plus', 'command-r', 'command', 'command-light'];
  }
}

export default CohereProvider;
