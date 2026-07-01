/**
 * Proveedor Groq. API compatible con OpenAI Chat Completions, extremadamente
 * rápida. Reutiliza la lógica de OpenAI cambiando baseUrl y modelos.
 */

import { OpenAIProvider } from './openai-provider.js';
import { HttpClient } from '../../utils/http.js';

export class GroqProvider extends OpenAIProvider {
  constructor(config) {
    super(config);
    this.id = 'groq';
    this.baseUrl = 'https://api.groq.com/openai/v1';
    this.logger = this.logger; // conserva logger; id ya cambiado
    this.capabilities = {
      streaming: true,
      tools: true,
      embeddings: false,
      vision: false,
      json: true
    };
  }

  async _client() {
    const apiKey = await this.requireApiKey();
    return new HttpClient({
      baseUrl: this.baseUrl,
      provider: this.id,
      timeoutMs: 45000,
      defaultHeaders: { Authorization: `Bearer ${apiKey}` }
    });
  }

  async embed() {
    throw new Error('Groq no ofrece embeddings');
  }

  async listModels() {
    try {
      const client = await this._client();
      const data = await client.get('/models');
      return (data.data || []).map((m) => m.id);
    } catch {
      return ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'llama3-70b-8192'];
    }
  }
}

export default GroqProvider;
