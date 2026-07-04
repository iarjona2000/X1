/**
 * Configuración del embudo de resolución de agentes.
 *
 * `PROMPT_CLAUDE_CODE_ORQUESTACION.md` §5 exige que los umbrales que gobiernan
 * cuándo escalar de una etapa a la siguiente sean constantes configurables
 * (no números mágicos enterrados), ajustables sin recompilar y documentados.
 * Este módulo es ese archivo de configuración. Cada valor lleva su significado
 * y el efecto de subirlo o bajarlo.
 */

/**
 * @typedef {Object} ResolverConfig
 * @property {number} zeroMatchThreshold
 * @property {number} tooManyMatchesThreshold
 * @property {number} clearWinnerMargin
 * @property {number} stage2TieMargin
 * @property {number} minConfidence
 * @property {number} ngramMax
 * @property {{capability:number,domain:number,subdomain:number,substring:number}} weights
 * @property {number} cacheTtlMs
 * @property {number} cacheMaxSize
 * @property {boolean} cacheEnabled
 * @property {number} embeddingBodyLines
 */

/** @type {ResolverConfig} */
export const DEFAULT_RESOLVER_CONFIG = {
  // --- Umbrales de escalada (etapa 0) ---

  // Score mínimo para que una nota cuente como candidato real. Subirlo = más
  // estricto (menos candidatos, más escaladas por "cero match"); bajarlo = más
  // permisivo (más ruido pasa como candidato).
  zeroMatchThreshold: 1,

  // Si hay MÁS de este nº de candidatos por encima del umbral mínimo, se
  // considera ambigüedad por exceso y se escala a la etapa 1 (clúster) para
  // acotar primero. Subirlo = tolera más candidatos antes de acotar; bajarlo =
  // acota antes (más llamadas a etapa 1).
  tooManyMatchesThreshold: 8,

  // Margen RELATIVO (top - segundo) / top por encima del cual el candidato
  // líder se considera ganador claro y la etapa 0 resuelve sin escalar.
  // 0.5 = el líder debe puntuar al menos el doble que el segundo. Subirlo =
  // más exigente para declarar ganador (más escaladas a etapa 2); bajarlo =
  // resuelve antes en etapa 0 con menos certeza.
  clearWinnerMargin: 0.5,

  // --- Umbrales de escalada (etapa 2 → etapa 3) ---

  // Margen relativo por debajo del cual dos o más candidatos se consideran
  // empatados tras embeddings y se escala al panel+juez. Debe mantenerse
  // estrecho: si llegan >4 candidatos a la etapa 3, este valor es demasiado
  // laxo (ver spec §8).
  stage2TieMargin: 0.08,

  // Confianza mínima por debajo de la cual `resolveAgentsForPrompt` devuelve
  // "sin agente resuelto" (array vacío, nunca null/excepción — spec §16).
  minConfidence: 0.2,

  // --- Extracción de términos (etapa 0) ---

  // Longitud máxima de n-grama al extraer términos del prompt (para capturar
  // capacidades compuestas como "impacto-fiscal").
  ngramMax: 3,

  // Pesos de scoring del filtro de etiquetas (spec §5): capacidad exacta =
  // alto, dominio/subdominio = medio, subcadena = bajo (último recurso).
  weights: {
    capability: 10,
    domain: 5,
    subdomain: 4,
    substring: 1
  },

  // --- Caché de rutas resueltas (Extensión B, spec §11) ---
  cacheTtlMs: 4 * 60 * 60 * 1000, // 4 horas
  cacheMaxSize: 500,
  cacheEnabled: true,

  // --- Indexación de embeddings (etapa 2, spec §7) ---
  // Nº de líneas del cuerpo de la nota que se concatenan al texto a embeber
  // (además de domain+subdomain+capabilities). Más líneas = más contexto pero
  // más ruido y coste de tokens.
  embeddingBodyLines: 4,

  // --- Clasificación de clúster (etapa 1, spec §6) ---
  // Score mínimo de `detectSector` para aceptar un sector como señal de clúster
  // (por debajo, se considera ruido y no acota). Alineado con el umbral interno
  // de detectSector (que cae a "general" con score < 2).
  stage1SectorMinScore: 2
};

Object.freeze(DEFAULT_RESOLVER_CONFIG);
Object.freeze(DEFAULT_RESOLVER_CONFIG.weights);

/**
 * Construye una configuración fusionando overrides sobre los valores por
 * defecto. Permite ajustar umbrales en tests o en runtime sin mutar el default.
 * @param {Partial<ResolverConfig>} [overrides]
 * @returns {ResolverConfig}
 */
export function createResolverConfig(overrides = {}) {
  return {
    ...DEFAULT_RESOLVER_CONFIG,
    ...overrides,
    weights: { ...DEFAULT_RESOLVER_CONFIG.weights, ...(overrides.weights || {}) }
  };
}
