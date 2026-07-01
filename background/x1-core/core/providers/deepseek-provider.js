/**
 * Proveedor DeepSeek (deepseek-chat / deepseek-reasoner).
 *
 * API compatible con OpenAI Chat Completions. Destaca en razonamiento y
 * programación con coste muy bajo. El modelo "deepseek-reasoner" (R1) expone
 * cadena de pensamiento en `reasoning_content`, que capturamos por separado.
 */

import { OpenAIProvider } from './openai-provider.js';
import { HttpClient } from '../../utils/http.js';
import { parseLooseJson } from '../../utils/text.js';

export class DeepSeekProvider extends OpenAIProvider {
  constructor(config) {
    super(config);
    this.id = 'deepseek';
    this.baseUrl = 'https://api.deepseek.com/v1';
    this.logger = this.logger;
    this.capabilities = {
      streaming: true,
      tools: true,
      embeddings: false,
      vision: false,
      json: true,
      reasoning: true
    };
  }

  async _client() {
    const apiKey = await this.requireApiKey();
    return new HttpClient({
      baseUrl: this.baseUrl,
      provider: this.id,
      timeoutMs: 90000, // el modo razonador puede tardar
      defaultHeaders: { Authorization: `Bearer ${apiKey}` }
    });
  }

  async complete(model, messages, options = {}) {
    const result = await super.complete(model, messages, options);
    // Capturar la cadena de razonamiento si el modelo la expone
    const reasoning = result.raw?.choices?.[0]?.message?.reasoning_content;
    if (reasoning) result.reasoning = reasoning;
    return result;
  }

  async stream(model, messages, options = {}) {
    const client = await this._client();
    const body = this._buildBody(model, messages, options, true);
    let text = '';
    let reasoning = '';
    let finishReason = 'stop';

    await client.stream('/chat/completions', body, {
      signal: options.signal,
      onEvent: (payload) => {
        const obj = parseLooseJson(payload);
        const delta = obj?.choices?.[0]?.delta || {};
        if (delta.reasoning_content) {
          reasoning += delta.reasoning_content;
          options.onReasoning?.(delta.reasoning_content);
        }
        if (delta.content) {
          text += delta.content;
          options.onToken?.(delta.content);
        }
        if (obj?.choices?.[0]?.finish_reason) finishReason = obj.choices[0].finish_reason;
      }
    });

    const result = this._result({
      text,
      model,
      usage: this._normalizeUsage(null, messages, text),
      finishReason
    });
    if (reasoning) result.reasoning = reasoning;
    return result;
  }

  async embed() {
    throw new Error('DeepSeek no ofrece embeddings');
  }

  async listModels() {
    return ['deepseek-chat', 'deepseek-reasoner'];
  }
}

export default DeepSeekProvider;
