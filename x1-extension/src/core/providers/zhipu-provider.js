/**
 * Proveedor Zhipu AI (GLM).
 *
 * API compatible con OpenAI en el endpoint paas/v4. Buen razonamiento
 * matemático y velocidad. Soporta embeddings (embedding-3).
 */

import { OpenAIProvider } from './openai-provider.js';
import { HttpClient } from '../../utils/http.js';

export class ZhipuProvider extends OpenAIProvider {
  constructor(config) {
    super(config);
    this.id = 'zhipu';
    this.baseUrl = 'https://open.bigmodel.cn/api/paas/v4';
    this.capabilities = {
      streaming: true,
      tools: true,
      embeddings: true,
      vision: true,
      json: true
    };
    this.embeddingModel = 'embedding-3';
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
    const results = [];
    // La API de Zhipu acepta un input por petición
    for (const text of texts) {
      const data = await client.postJson('/embeddings', {
        model: options.model || this.embeddingModel,
        input: text
      });
      results.push(data.data[0].embedding);
    }
    return results;
  }

  async listModels() {
    return ['glm-4-plus', 'glm-4', 'glm-4-flash', 'glm-4-air'];
  }
}

export default ZhipuProvider;
