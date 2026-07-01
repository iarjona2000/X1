/**
 * Proveedor OpenAI (Chat Completions + Embeddings + streaming SSE).
 */

import { BaseProvider } from './base-provider.js';
import { HttpClient } from '../../utils/http.js';
import { parseLooseJson } from '../../utils/text.js';

export class OpenAIProvider extends BaseProvider {
  /**
   * @param {Object} config
   * @param {Function} config.getApiKey
   */
  constructor(config) {
    super({ id: 'openai', baseUrl: 'https://api.openai.com/v1', ...config });
    this.capabilities = {
      streaming: true,
      tools: true,
      embeddings: true,
      vision: true,
      json: true
    };
    this.embeddingModel = 'text-embedding-3-small';
  }

  /**
   * Construye el cliente HTTP autenticado.
   * @returns {Promise<HttpClient>}
   * @private
   */
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
   * Cuerpo común de la petición de chat.
   * @private
   */
  _buildBody(model, messages, options, stream) {
    const body = {
      model,
      messages: this._toOpenAiMessages(messages),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
      stream
    };
    if (options.topP !== undefined) body.top_p = options.topP;
    if (options.stop) body.stop = options.stop;
    if (options.tools?.length) body.tools = options.tools;
    if (options.responseFormat) body.response_format = options.responseFormat;
    return body;
  }

  async complete(model, messages, options = {}) {
    const client = await this._client();
    const body = this._buildBody(model, messages, options, false);
    const data = await client.postJson('/chat/completions', body, {
      signal: options.signal
    });
    const choice = data.choices?.[0] || {};
    const message = choice.message || {};
    return this._result({
      text: message.content || '',
      model,
      usage: this._normalizeUsage(data.usage, messages, message.content),
      finishReason: choice.finish_reason || 'stop',
      toolCalls: message.tool_calls || null,
      raw: data
    });
  }

  async stream(model, messages, options = {}) {
    const client = await this._client();
    const body = this._buildBody(model, messages, options, true);
    let text = '';
    let finishReason = 'stop';
    const toolCalls = [];

    await client.stream('/chat/completions', body, {
      signal: options.signal,
      onEvent: (payload) => {
        const obj = parseLooseJson(payload);
        if (!obj) return;
        const delta = obj.choices?.[0]?.delta || {};
        if (delta.content) {
          text += delta.content;
          options.onToken?.(delta.content);
        }
        if (delta.tool_calls) toolCalls.push(...delta.tool_calls);
        if (obj.choices?.[0]?.finish_reason) {
          finishReason = obj.choices[0].finish_reason;
        }
      }
    });

    return this._result({
      text,
      model,
      usage: this._normalizeUsage(null, messages, text),
      finishReason,
      toolCalls: toolCalls.length ? toolCalls : null
    });
  }

  async embed(input, options = {}) {
    const client = await this._client();
    const inputs = Array.isArray(input) ? input : [input];
    const data = await client.postJson('/embeddings', {
      model: options.model || this.embeddingModel,
      input: inputs
    });
    return data.data.map((d) => d.embedding);
  }

  async listModels() {
    try {
      const client = await this._client();
      const data = await client.get('/models');
      return (data.data || []).map((m) => m.id).filter((id) => id.includes('gpt'));
    } catch {
      return ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    }
  }

  async health() {
    try {
      const client = await this._client();
      await client.get('/models', { timeoutMs: 8000, retries: 0 });
      return { ok: true, detail: 'conectado' };
    } catch (error) {
      return { ok: false, detail: error.message };
    }
  }
}

export default OpenAIProvider;
