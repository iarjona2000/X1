/**
 * Registro central de proveedores de IA.
 *
 * Crea instancias singleton de cada proveedor, resuelve el proveedor a partir
 * del id de modelo y expone helpers para health-checks masivos y descubrimiento
 * de capacidades. Es la única puerta de entrada que el resto del backend usa
 * para obtener un proveedor concreto.
 */

import { OpenAIProvider } from './openai-provider.js';
import { AnthropicProvider } from './anthropic-provider.js';
import { GoogleProvider } from './google-provider.js';
import { GroqProvider } from './groq-provider.js';
import { CohereProvider } from './cohere-provider.js';
import { HuggingFaceProvider } from './huggingface-provider.js';
import { OllamaProvider } from './ollama-provider.js';
import { DeepSeekProvider } from './deepseek-provider.js';
import { MiniMaxProvider } from './minimax-provider.js';
import { MoonshotProvider } from './moonshot-provider.js';
import { ZhipuProvider } from './zhipu-provider.js';
import StorageManager from '../storage.js';
import ConfigManager from '../config.js';
import { NotFoundError } from '../../utils/errors.js';
import Logger from '../logger.js';

const logger = new Logger('ProviderRegistry');

/**
 * Mapa de prefijos/patrones de modelo → id de proveedor. Se consulta en orden
 * para inferir el proveedor cuando solo se conoce el nombre del modelo.
 */
const MODEL_PATTERNS = [
  { re: /^gpt-|^o1|^o3|^chatgpt|^text-embedding-/i, provider: 'openai' },
  { re: /^claude/i, provider: 'anthropic' },
  { re: /^gemini|^text-embedding-004|^models\/gemini/i, provider: 'google' },
  { re: /^command|^embed-english|^embed-multilingual/i, provider: 'cohere' },
  { re: /^deepseek/i, provider: 'deepseek' },
  { re: /^(minimax|abab)/i, provider: 'minimax' },
  { re: /^(moonshot|kimi)/i, provider: 'moonshot' },
  { re: /^glm-|^embedding-3$/i, provider: 'zhipu' },
  { re: /(llama-3\.3|mixtral-8x7b-32768|llama3-70b-8192|versatile)/i, provider: 'groq' },
  { re: /\//, provider: 'huggingface' } // ids con "/" => repos de HF
];

export class ProviderRegistry {
  constructor() {
    /** @type {Map<string, import('./base-provider.js').BaseProvider>} */
    this.providers = new Map();
    this._initialized = false;
  }

  /**
   * Inicializa (perezosamente) todas las instancias de proveedor.
   */
  init() {
    if (this._initialized) return;
    const getApiKey = (id) => StorageManager.getApiKey(id);

    this.providers.set('openai', new OpenAIProvider({ getApiKey }));
    this.providers.set('anthropic', new AnthropicProvider({ getApiKey }));
    this.providers.set('google', new GoogleProvider({ getApiKey }));
    this.providers.set('groq', new GroqProvider({ getApiKey }));
    this.providers.set('cohere', new CohereProvider({ getApiKey }));
    this.providers.set('huggingface', new HuggingFaceProvider({ getApiKey }));
    this.providers.set('deepseek', new DeepSeekProvider({ getApiKey }));
    this.providers.set('minimax', new MiniMaxProvider({ getApiKey }));
    this.providers.set('moonshot', new MoonshotProvider({ getApiKey }));
    this.providers.set('zhipu', new ZhipuProvider({ getApiKey }));
    this.providers.set(
      'ollama',
      new OllamaProvider({
        getConfig: () => ConfigManager.getOllamaConfig()
      })
    );

    this._initialized = true;
    logger.info(`Proveedores registrados: ${[...this.providers.keys()].join(', ')}`);
  }

  /**
   * Devuelve la instancia de un proveedor por id.
   * @param {string} id
   * @returns {import('./base-provider.js').BaseProvider}
   */
  get(id) {
    this.init();
    const provider = this.providers.get(id);
    if (!provider) throw new NotFoundError(`Proveedor no registrado: ${id}`);
    return provider;
  }

  /**
   * Infiere el proveedor correcto a partir del id de un modelo.
   * @param {string} model
   * @returns {import('./base-provider.js').BaseProvider}
   */
  forModel(model) {
    this.init();
    const providerId = this.resolveProviderId(model);
    return this.get(providerId);
  }

  /**
   * Resuelve solo el id del proveedor de un modelo.
   * @param {string} model
   * @returns {string}
   */
  resolveProviderId(model) {
    if (!model) return 'openai';
    // Convención de etiqueta de Ollama (p.ej. "llama3:8b", "deepseek-r1:7b").
    // El ":" es marca inequívoca de modelo local; lo comprobamos primero.
    if (model.includes(':')) return 'ollama';
    // Nombres de familias locales sin proveedor explícito. Nota: NO incluir
    // "deepseek" a secas aquí porque "deepseek-chat/reasoner" son modelos de
    // la API de DeepSeek (los locales llevan etiqueta ":", ya cubierta arriba).
    if (/^(llama3|llama2|mistral|phi3|phi|gemma|qwen|codellama)$/i.test(model)) {
      return 'ollama';
    }
    for (const { re, provider } of MODEL_PATTERNS) {
      if (re.test(model)) return provider;
    }
    return 'openai';
  }

  /**
   * Lista los ids de proveedores registrados.
   * @returns {string[]}
   */
  list() {
    this.init();
    return [...this.providers.keys()];
  }

  /**
   * Ejecuta health-check en todos los proveedores en paralelo.
   * @returns {Promise<Record<string, {ok:boolean, detail?:string}>>}
   */
  async healthAll() {
    this.init();
    const entries = await Promise.all(
      [...this.providers.entries()].map(async ([id, provider]) => {
        try {
          return [id, await provider.health()];
        } catch (error) {
          return [id, { ok: false, detail: error.message }];
        }
      })
    );
    return Object.fromEntries(entries);
  }

  /**
   * Devuelve el mapa de capacidades por proveedor.
   * @returns {Record<string, Object>}
   */
  capabilities() {
    this.init();
    const out = {};
    for (const [id, provider] of this.providers) out[id] = provider.capabilities;
    return out;
  }

  /**
   * Encuentra un proveedor capaz de generar embeddings, priorizando el
   * preferido si soporta embeddings.
   * @param {string} [preferred]
   * @returns {import('./base-provider.js').BaseProvider|null}
   */
  embeddingProvider(preferred) {
    this.init();
    if (preferred && this.providers.get(preferred)?.capabilities.embeddings) {
      return this.providers.get(preferred);
    }
    for (const id of ['openai', 'google', 'cohere', 'ollama', 'huggingface']) {
      const p = this.providers.get(id);
      if (p?.capabilities.embeddings) return p;
    }
    return null;
  }
}

/** Instancia global compartida. */
export const registry = new ProviderRegistry();

export default registry;
