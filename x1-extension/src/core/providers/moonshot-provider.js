/**
 * Proveedor Moonshot AI (Kimi).
 *
 * API compatible con OpenAI. Destaca en contexto largo (hasta ~1M tokens en
 * los modelos superiores), ideal para procesar documentos extensos.
 */

import { OpenAIProvider } from './openai-provider.js';
import { HttpClient } from '../../utils/http.js';

export class MoonshotProvider extends OpenAIProvider {
  constructor(config) {
    super(config);
    this.id = 'moonshot';
    this.baseUrl = 'https://api.moonshot.cn/v1';
    this.capabilities = {
      streaming: true,
      tools: true,
      embeddings: false,
      vision: false,
      json: true,
      longContext: true
    };
  }

  async _client() {
    const apiKey = await this.requireApiKey();
    return new HttpClient({
      baseUrl: this.baseUrl,
      provider: this.id,
      timeoutMs: 120000, // documentos largos
      defaultHeaders: { Authorization: `Bearer ${apiKey}` }
    });
  }

  async embed() {
    throw new Error('Moonshot no ofrece embeddings');
  }

  async listModels() {
    return [
      'moonshot-v1-8k',
      'moonshot-v1-32k',
      'moonshot-v1-128k',
      'kimi-latest'
    ];
  }
}

export default MoonshotProvider;
