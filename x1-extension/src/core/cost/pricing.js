/**
 * Tabla de precios de modelos (USD por 1M tokens).
 *
 * Fuente única de verdad para la estimación de coste. Los precios cambian con
 * frecuencia; se centralizan aquí para poder actualizarlos en un solo sitio.
 * Cada entrada: { input, output } en USD/1M tokens. Los modelos locales y
 * gratuitos tienen coste 0.
 */

/**
 * @typedef {{input:number, output:number, context?:number, tags?:string[]}} PriceEntry
 */

/** @type {Record<string, PriceEntry>} */
export const PRICING = {
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10, context: 128000 },
  'gpt-4o-mini': { input: 0.15, output: 0.6, context: 128000 },
  'gpt-4-turbo': { input: 10, output: 30, context: 128000 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5, context: 16000 },
  'o1': { input: 15, output: 60, context: 200000, tags: ['reasoning'] },
  'o1-mini': { input: 3, output: 12, context: 128000, tags: ['reasoning'] },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },

  // Anthropic
  'claude-3-5-sonnet-20241022': { input: 3, output: 15, context: 200000 },
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4, context: 200000 },
  'claude-3-opus-20240229': { input: 15, output: 75, context: 200000 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25, context: 200000 },
  'claude-opus-4-8': { input: 5, output: 25, context: 1000000 },

  // Google
  'gemini-1.5-pro': { input: 1.25, output: 5, context: 2000000 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3, context: 1000000 },
  'gemini-1.5-flash-8b': { input: 0.0375, output: 0.15, context: 1000000 },

  // DeepSeek
  'deepseek-chat': { input: 0.14, output: 0.28, context: 64000 },
  'deepseek-reasoner': { input: 0.55, output: 2.19, context: 64000, tags: ['reasoning'] },

  // MiniMax
  'MiniMax-Text-01': { input: 0.2, output: 1.1, context: 1000000 },
  'abab6.5s-chat': { input: 0.2, output: 1.1, context: 245000 },

  // Moonshot / Kimi
  'moonshot-v1-8k': { input: 0.2, output: 2, context: 8000 },
  'moonshot-v1-32k': { input: 0.24, output: 2.4, context: 32000 },
  'moonshot-v1-128k': { input: 0.6, output: 2.4, context: 128000, tags: ['long-context'] },
  'kimi-latest': { input: 0.6, output: 2.4, context: 128000, tags: ['long-context'] },

  // Zhipu / GLM
  'glm-4-plus': { input: 1.4, output: 4.4, context: 128000 },
  'glm-4': { input: 1.4, output: 4.4, context: 128000 },
  'glm-4-flash': { input: 0, output: 0, context: 128000, tags: ['free'] },
  'glm-4-air': { input: 0.14, output: 0.14, context: 128000 },
  'embedding-3': { input: 0.07, output: 0 },

  // Groq (precios muy bajos; aproximados)
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79, context: 128000 },
  'mixtral-8x7b-32768': { input: 0.24, output: 0.24, context: 32000 },
  'llama3-70b-8192': { input: 0.59, output: 0.79, context: 8192 },

  // Cohere
  'command-r-plus': { input: 2.5, output: 10, context: 128000 },
  'command-r': { input: 0.15, output: 0.6, context: 128000 }
};

/** Coste 0 por defecto para modelos desconocidos, locales o gratuitos. */
export const FREE_ENTRY = { input: 0, output: 0 };

/**
 * Devuelve la entrada de precio de un modelo, con búsqueda tolerante
 * (coincidencia exacta o por prefijo). Modelos locales (Ollama) o repos de HF
 * se consideran gratuitos.
 * @param {string} model
 * @returns {PriceEntry}
 */
export function getPrice(model) {
  if (!model) return FREE_ENTRY;
  if (PRICING[model]) return PRICING[model];

  // Modelos locales de Ollama o repos HF => gratuitos (coste de infra propio)
  if (/^(llama3|llama2|mistral|phi3?|gemma|qwen|codellama|deepseek-r1:)/i.test(model) || model.includes('/')) {
    return FREE_ENTRY;
  }

  // Coincidencia por prefijo (p.ej. versiones con sufijo de fecha)
  const key = Object.keys(PRICING).find((k) => model.startsWith(k) || k.startsWith(model));
  return key ? PRICING[key] : FREE_ENTRY;
}

/**
 * Estima el coste en USD de una llamada.
 * @param {string} model
 * @param {number} inputTokens
 * @param {number} outputTokens
 * @returns {number}
 */
export function estimateCost(model, inputTokens, outputTokens) {
  const price = getPrice(model);
  return (inputTokens / 1e6) * price.input + (outputTokens / 1e6) * price.output;
}

/**
 * Compara modelos por coste para una carga de trabajo dada.
 * @param {string[]} models
 * @param {number} inputTokens
 * @param {number} outputTokens
 * @returns {Array<{model:string, cost:number}>} ordenado ascendente
 */
export function rankByCost(models, inputTokens, outputTokens) {
  return models
    .map((model) => ({ model, cost: estimateCost(model, inputTokens, outputTokens) }))
    .sort((a, b) => a.cost - b.cost);
}

export default PRICING;
