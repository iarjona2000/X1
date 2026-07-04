/**
 * Extracción de términos del prompt — primer paso interno de la etapa 0.
 *
 * `PROMPT_CLAUDE_CODE_ORQUESTACION.md` §5: no es un `split(" ")`. Aplica
 * normalización, eliminación de stopwords, stemming ligero de plurales, y
 * extracción de n-gramas de hasta 3 palabras para capturar términos compuestos
 * ("impacto fiscal" → "impacto-fiscal").
 */

import { tokenize, isStopword, lightStem } from './normalize.js';
import { DEFAULT_RESOLVER_CONFIG } from './config.js';

/**
 * Extrae el conjunto de términos de búsqueda de un prompt en lenguaje natural.
 *
 * Devuelve unigramas (token normalizado + su stem de plural, ambos conservados)
 * y n-gramas de 2..ngramMax unidos por guion, que es como se escriben las
 * capacidades compuestas en los manifests ("edita-codigo", "impacto-fiscal").
 *
 * @param {string} prompt
 * @param {import('./config.js').ResolverConfig} [config]
 * @returns {string[]} términos únicos, sin orden significativo
 */
export function extractPromptTerms(prompt, config = DEFAULT_RESOLVER_CONFIG) {
  if (!prompt || typeof prompt !== 'string') return [];

  const rawTokens = tokenize(prompt);
  // Tokens de contenido: sin stopwords y con al menos 2 caracteres.
  const content = rawTokens.filter((t) => t.length >= 2 && !isStopword(t));

  const terms = new Set();

  // Unigramas: token + su stem (conservamos ambos para no perder ni la forma
  // exacta que matchea una capacidad ni la forma lematizada).
  for (const token of content) {
    terms.add(token);
    const stem = lightStem(token);
    if (stem !== token) terms.add(stem);
  }

  // N-gramas (2..ngramMax) sobre la secuencia de tokens de contenido, unidos
  // por guion. Se generan también con los tokens stemmed para maximizar el
  // match contra capacidades compuestas lematizadas.
  const maxN = Math.max(2, config.ngramMax || 3);
  const stems = content.map(lightStem);
  for (let n = 2; n <= maxN; n++) {
    for (let i = 0; i + n <= content.length; i++) {
      terms.add(content.slice(i, i + n).join('-'));
      terms.add(stems.slice(i, i + n).join('-'));
    }
  }

  return [...terms];
}
