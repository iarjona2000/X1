/**
 * Proveedor Anthropic (Claude). API Messages con soporte de system prompt
 * separado, streaming por eventos SSE tipados y function calling ("tools").
 */

import { BaseProvider } from './base-provider.js';
import { HttpClient } from '../../utils/http.js';
import { parseLooseJson } from '../../utils/text.js';

export class AnthropicProvider extends BaseProvider {
  constructor(config) {
    super({ id: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', ...config });
    this.capabilities = {
      streaming: true,
      tools: true,
      embeddings: false,
      vision: true,
      json: false
    };
    this.apiVersion = '2023-06-01';
  }

  async _client() {
    const apiKey = await this.requireApiKey();
    return new HttpClient({
      baseUrl: this.baseUrl,
      provider: this.id,
      timeoutMs: 60000,
      defaultHeaders: {
        'x-api-key': apiKey,
        'anthropic-version': this.apiVersion,
        'anthropic-dangerous-direct-browser-access': 'true'
      }
    });
  }

  /**
   * Anthropic separa el system del array de mensajes y solo admite roles
   * user/assistant. Convertimos el formato normalizado.
   * @param {Array} messages
   * @returns {{system:string, messages:Array}}
   * @private
   */
  _split(messages) {
    let system = '';
    const chat = [];
    for (const m of messages) {
      if (m.role === 'system') {
        system += (system ? '\n\n' : '') + m.content;
      } else if (m.role === 'tool') {
        chat.push({
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: m.name, content: m.content }]
        });
      } else {
        chat.push({ role: m.role, content: m.content });
      }
    }
    // Anthropic exige que el primer mensaje sea del usuario
    if (chat.length && chat[0].role !== 'user') {
      chat.unshift({ role: 'user', content: '(continuación)' });
    }
    return { system, messages: chat };
  }

  _buildBody(model, messages, options, stream) {
    const { system, messages: chat } = this._split(messages);
    const body = {
      model,
      system: system || undefined,
      messages: chat,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      stream
    };
    if (options.topP !== undefined) body.top_p = options.topP;
    if (options.stop) body.stop_sequences = options.stop;
    if (options.tools?.length) {
      body.tools = options.tools.map((t) => ({
        name: t.function?.name || t.name,
        description: t.function?.description || t.description,
        input_schema: t.function?.parameters || t.input_schema
      }));
    }
    return body;
  }

  async complete(model, messages, options = {}) {
    const client = await this._client();
    const body = this._buildBody(model, messages, options, false);
    const data = await client.postJson('/messages', body, { signal: options.signal });

    let text = '';
    const toolCalls = [];
    for (const block of data.content || []) {
      if (block.type === 'text') text += block.text;
      if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: { name: block.name, arguments: JSON.stringify(block.input) }
        });
      }
    }

    return this._result({
      text,
      model,
      usage: this._normalizeUsage(data.usage, messages, text),
      finishReason: data.stop_reason || 'stop',
      toolCalls: toolCalls.length ? toolCalls : null,
      raw: data
    });
  }

  async stream(model, messages, options = {}) {
    const client = await this._client();
    const body = this._buildBody(model, messages, options, true);
    let text = '';
    let finishReason = 'stop';

    await client.stream('/messages', body, {
      signal: options.signal,
      onEvent: (payload) => {
        const obj = parseLooseJson(payload);
        if (!obj) return;
        if (obj.type === 'content_block_delta' && obj.delta?.text) {
          text += obj.delta.text;
          options.onToken?.(obj.delta.text);
        }
        if (obj.type === 'message_delta' && obj.delta?.stop_reason) {
          finishReason = obj.delta.stop_reason;
        }
      }
    });

    return this._result({
      text,
      model,
      usage: this._normalizeUsage(null, messages, text),
      finishReason
    });
  }

  async listModels() {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-haiku-20240307'
    ];
  }
}

export default AnthropicProvider;
