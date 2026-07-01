/**
 * Proveedor MiniMax (abab / MiniMax-Text).
 *
 * Usa el endpoint compatible con OpenAI de MiniMax. Multilingüe y muy
 * costo-eficiente. La autenticación es por Bearer token de grupo.
 */

import { OpenAIProvider } from './openai-provider.js';
import { HttpClient } from '../../utils/http.js';

export class MiniMaxProvider extends OpenAIProvider {
  constructor(config) {
    super(config);
    this.id = 'minimax';
    this.baseUrl = 'https://api.minimaxi.com/v1';
    this.capabilities = {
      streaming: true,
      tools: true,
      embeddings: true,
      vision: false,
      json: true
    };
    this.embeddingModel = 'embo-01';
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

  async embed(input, options = {}) {
    const client = await this._client();
    const texts = Array.isArray(input) ? input : [input];
    const data = await client.postJson('/embeddings', {
      model: options.model || this.embeddingModel,
      texts,
      type: options.inputType || 'db'
    });
    return data.vectors || data.data?.map((d) => d.embedding) || [];
  }

  async listModels() {
    return ['MiniMax-Text-01', 'abab6.5s-chat', 'abab6.5g-chat'];
  }
}

export default MiniMaxProvider;
