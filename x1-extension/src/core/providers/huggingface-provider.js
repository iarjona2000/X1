/**
 * Proveedor Hugging Face. Usa el endpoint compatible con OpenAI de la
 * Inference API (router) para chat, y la Inference API clásica para
 * embeddings (feature-extraction). Gratuito con límites en el tier free.
 */

import { BaseProvider } from './base-provider.js';
import { HttpClient } from '../../utils/http.js';
import { parseLooseJson } from '../../utils/text.js';

export class HuggingFaceProvider extends BaseProvider {
  constructor(config) {
    super({ id: 'huggingface', baseUrl: 'https://api-inference.huggingface.co', ...config });
    this.routerUrl = 'https://router.huggingface.co/v1';
    this.capabilities = {
      streaming: true,
      tools: false,
      embeddings: true,
      vision: false,
      json: false
    };
    this.embeddingModel = 'sentence-transformers/all-MiniLM-L6-v2';
  }

  async _chatClient() {
    const apiKey = await this.requireApiKey();
    return new HttpClient({
      baseUrl: this.routerUrl,
      provider: this.id,
      timeoutMs: 90000,
      defaultHeaders: { Authorization: `Bearer ${apiKey}` }
    });
  }

  async _inferenceClient() {
    const apiKey = await this.requireApiKey();
    return new HttpClient({
      baseUrl: this.baseUrl,
      provider: this.id,
      timeoutMs: 90000,
      defaultHeaders: { Authorization: `Bearer ${apiKey}` }
    });
  }

  _buildBody(model, messages, options, stream) {
    return {
      model,
      messages: this._toOpenAiMessages(messages),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
      stream
    };
  }

  async complete(model, messages, options = {}) {
    const client = await this._chatClient();
    const data = await client.postJson('/chat/completions', this._buildBody(model, messages, options, false), {
      signal: options.signal
    });
    const message = data.choices?.[0]?.message || {};
    return this._result({
      text: message.content || '',
      model,
      usage: this._normalizeUsage(data.usage, messages, message.content),
      finishReason: data.choices?.[0]?.finish_reason || 'stop',
      raw: data
    });
  }

  async stream(model, messages, options = {}) {
    const client = await this._chatClient();
    let text = '';
    await client.stream('/chat/completions', this._buildBody(model, messages, options, true), {
      signal: options.signal,
      onEvent: (payload) => {
        const obj = parseLooseJson(payload);
        const delta = obj?.choices?.[0]?.delta?.content;
        if (delta) {
          text += delta;
          options.onToken?.(delta);
        }
      }
    });
    return this._result({ text, model, usage: this._normalizeUsage(null, messages, text) });
  }

  async embed(input, options = {}) {
    const client = await this._inferenceClient();
    const model = options.model || this.embeddingModel;
    const inputs = Array.isArray(input) ? input : [input];
    const data = await client.postJson(`/models/${model}`, {
      inputs,
      options: { wait_for_model: true }
    });
    // La respuesta es un array de vectores (o vector único)
    if (Array.isArray(data) && Array.isArray(data[0])) return data;
    return [data];
  }

  async listModels() {
    return [
      'meta-llama/Llama-3.3-70B-Instruct',
      'mistralai/Mistral-7B-Instruct-v0.3',
      'microsoft/Phi-3-mini-4k-instruct',
      'google/gemma-2-9b-it'
    ];
  }
}

export default HuggingFaceProvider;
