/**
 * Proveedor Google Gemini (generativelanguage API). Soporta generación,
 * streaming (streamGenerateContent con SSE) y embeddings (text-embedding-004).
 */

import { BaseProvider } from './base-provider.js';
import { HttpClient } from '../../utils/http.js';
import { parseLooseJson } from '../../utils/text.js';

export class GoogleProvider extends BaseProvider {
  constructor(config) {
    super({
      id: 'google',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      ...config
    });
    this.capabilities = {
      streaming: true,
      tools: true,
      embeddings: true,
      vision: true,
      json: true
    };
    this.embeddingModel = 'text-embedding-004';
  }

  async _client() {
    // Gemini autentica por query param ?key=, no por header
    return new HttpClient({
      baseUrl: this.baseUrl,
      provider: this.id,
      timeoutMs: 60000
    });
  }

  /**
   * Convierte mensajes normalizados al formato "contents" de Gemini.
   * El system prompt se inyecta como systemInstruction.
   * @private
   */
  _convert(messages) {
    let systemInstruction = null;
    const contents = [];
    for (const m of messages) {
      if (m.role === 'system') {
        systemInstruction = { parts: [{ text: m.content }] };
      } else {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        });
      }
    }
    return { systemInstruction, contents };
  }

  _buildBody(messages, options) {
    const { systemInstruction, contents } = this._convert(messages);
    const body = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 1024
      }
    };
    if (systemInstruction) body.systemInstruction = systemInstruction;
    if (options.topP !== undefined) body.generationConfig.topP = options.topP;
    if (options.stop) body.generationConfig.stopSequences = options.stop;
    if (options.responseFormat?.type === 'json_object') {
      body.generationConfig.responseMimeType = 'application/json';
    }
    return body;
  }

  async complete(model, messages, options = {}) {
    const apiKey = await this.requireApiKey();
    const client = await this._client();
    const body = this._buildBody(messages, options);
    const data = await client.postJson(
      `/models/${model}:generateContent?key=${apiKey}`,
      body,
      { signal: options.signal }
    );

    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text).join('') || '';
    const usage = data.usageMetadata
      ? {
          input_tokens: data.usageMetadata.promptTokenCount,
          output_tokens: data.usageMetadata.candidatesTokenCount
        }
      : null;

    return this._result({
      text,
      model,
      usage: this._normalizeUsage(usage, messages, text),
      finishReason: (candidate?.finishReason || 'STOP').toLowerCase(),
      raw: data
    });
  }

  async stream(model, messages, options = {}) {
    const apiKey = await this.requireApiKey();
    const client = await this._client();
    const body = this._buildBody(messages, options);
    let text = '';

    await client.stream(
      `/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      body,
      {
        signal: options.signal,
        onEvent: (payload) => {
          const obj = parseLooseJson(payload);
          const part = obj?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (part) {
            text += part;
            options.onToken?.(part);
          }
        }
      }
    );

    return this._result({
      text,
      model,
      usage: this._normalizeUsage(null, messages, text)
    });
  }

  async embed(input, options = {}) {
    const apiKey = await this.requireApiKey();
    const client = await this._client();
    const inputs = Array.isArray(input) ? input : [input];
    const model = options.model || this.embeddingModel;
    const requests = inputs.map((text) => ({
      model: `models/${model}`,
      content: { parts: [{ text }] }
    }));
    const data = await client.postJson(
      `/models/${model}:batchEmbedContents?key=${apiKey}`,
      { requests }
    );
    return (data.embeddings || []).map((e) => e.values);
  }

  async listModels() {
    return ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];
  }
}

export default GoogleProvider;
