/**
 * Etapa 0 — Filtro de etiquetas (spec §5).
 *
 * Función pura, sin efectos secundarios, testeable con fixtures fijos sin
 * mockear IA ni red. Se ejecuta SIEMPRE, en cada prompt. Recibe los términos
 * ya extraídos del prompt y el índice de la bóveda, y devuelve un conjunto de
 * candidatos ordenado por score — no "el mejor agente", porque la decisión de
 * escalar depende de la FORMA de la distribución de scores, no solo del máximo.
 */

import { DEFAULT_RESOLVER_CONFIG } from './config.js';
import { normalizeToken, tokenize } from './normalize.js';

/**
 * @typedef {Object} Candidate
 * @property {string} id
 * @property {string} cluster
 * @property {number} score
 * @property {string[]} matchedTerms
 * @property {0|1|2|3} resolvedByStage
 */

/**
 * @typedef {Object} CandidateSet
 * @property {Candidate[]} candidates - ordenados por score desc
 * @property {number} maxScore
 * @property {number} matchCount - candidatos por encima de zeroMatchThreshold
 * @property {boolean} usedSubstring - si se recurrió al match por subcadena
 */

/**
 * Prepara los campos indexables de una nota para matching (normalizados).
 * No construye el texto de subcadena aquí: solo se necesita en el fallback por
 * subcadena (raro), así que se genera bajo demanda para no pagar el coste en
 * cada nota (importa a escala de 10k notas, ver test de rendimiento §5).
 * @param {import('./manifest.js').AgentManifest} manifest
 * @returns {{caps:Set<string>, domainTokens:Set<string>, subTokens:Set<string>}}
 */
function indexNoteFields(manifest) {
  const caps = new Set((manifest.capabilities || []).map(normalizeToken));
  const domainTokens = new Set();
  if (manifest.domain) domainTokens.add(normalizeToken(manifest.domain));
  if (manifest.cluster) domainTokens.add(normalizeToken(manifest.cluster));
  const subTokens = new Set(manifest.subdomain ? tokenize(manifest.subdomain) : []);
  return { caps, domainTokens, subTokens };
}

/**
 * Precomputa el índice de campos normalizados de la bóveda UNA sola vez (coste
 * de build/migración, no de consulta). Las notas resultantes llevan `_fields`
 * listos para que `stage0_tagFilter` no recompute nada por prompt.
 * @param {Array<{id:string, manifest:import('./manifest.js').AgentManifest}>} notes
 * @returns {{notes: Array<{id:string, manifest:Object, _fields:Object}>}}
 */
export function buildVaultIndex(notes) {
  return {
    notes: (notes || []).map((n) => ({
      id: n.id,
      manifest: n.manifest,
      _fields: indexNoteFields(n.manifest || {})
    }))
  };
}

/**
 * Filtro de etiquetas sobre la bóveda.
 *
 * @param {string[]} promptTerms - salida de `extractPromptTerms`
 * @param {{notes: Array<{id:string, manifest:import('./manifest.js').AgentManifest}>}} vault
 * @param {import('./config.js').ResolverConfig} [config]
 * @returns {CandidateSet}
 */
export function stage0_tagFilter(promptTerms, vault, config = DEFAULT_RESOLVER_CONFIG) {
  const notes = (vault && vault.notes) || [];
  const terms = promptTerms || [];
  const W = config.weights;

  // Índice de campos por nota. Si la nota ya trae `_fields` precomputados (vía
  // `buildVaultIndex`, la ruta esperada a escala), se reutilizan sin recomputar
  // — la indexación es coste de build, no de consulta (spec §5/§7).
  const indexed = notes.map((n) => ({ note: n, fields: n._fields || indexNoteFields(n.manifest || {}) }));

  // --- Paso 1: scoring de peso alto (capacidades) y medio (dominio/subdominio) ---
  // Se evita crear arrays `matched` en las notas sin match (la gran mayoría a
  // escala) — solo se materializan cuando hay al menos una coincidencia.
  let maxHighMedium = 0;
  const scored = indexed.map(({ note, fields }) => {
    let score = 0;
    let matched = null;
    for (const term of terms) {
      let w = 0;
      if (fields.caps.has(term)) w = W.capability;
      else if (fields.domainTokens.has(term)) w = W.domain;
      else if (fields.subTokens.has(term)) w = W.subdomain;
      if (w) {
        score += w;
        (matched || (matched = [])).push(term);
      }
    }
    if (score > maxHighMedium) maxHighMedium = score;
    return { note, fields, score, matched: matched ? [...new Set(matched)] : [] };
  });

  // --- Paso 2: match por subcadena SOLO si no hubo ningún match alto/medio en
  // toda la bóveda (spec §5: subcadena es último recurso, para no contaminar).
  // El texto combinado se construye aquí, bajo demanda, no en cada nota. ---
  let usedSubstring = false;
  if (maxHighMedium === 0 && terms.length > 0) {
    usedSubstring = true;
    const longTerms = terms.filter((t) => t.length >= 3); // subcadenas cortas = ruido
    for (const s of scored) {
      const text = [...s.fields.caps, ...s.fields.domainTokens, ...s.fields.subTokens].join(' ');
      let matched = null;
      for (const term of longTerms) {
        if (text.includes(term)) {
          s.score += W.substring;
          (matched || (matched = [])).push(term);
        }
      }
      if (matched) s.matched = [...new Set(matched)];
    }
  }

  // --- Construir el conjunto ordenado ---
  const candidates = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => ({
      id: s.note.id,
      cluster: (s.note.manifest && s.note.manifest.cluster) || null,
      score: s.score,
      matchedTerms: s.matched,
      resolvedByStage: 0
    }));

  const maxScore = candidates.length ? candidates[0].score : 0;
  const matchCount = candidates.filter((c) => c.score >= config.zeroMatchThreshold).length;

  return { candidates, maxScore, matchCount, usedSubstring };
}

/** Resultado de clasificar la salida de la etapa 0. */
export const STAGE0_OUTCOME = Object.freeze({
  RESOLVED: 'resolved',
  ESCALATE_CLUSTER: 'escalate-cluster',
  ESCALATE_SEMANTIC: 'escalate-semantic'
});

/**
 * Decide, a partir de la distribución de scores, si la etapa 0 resolvió o hay
 * que escalar — y a dónde. Zero-match o ambigüedad por exceso → etapa 1
 * (acotar por clúster). Empate cercano entre pocos → etapa 2 (embeddings).
 * Ganador claro → resuelto.
 *
 * @param {CandidateSet} candidateSet
 * @param {import('./config.js').ResolverConfig} [config]
 * @returns {{outcome:string, reason:string, winner: (Candidate|null)}}
 */
export function classifyStage0Outcome(candidateSet, config = DEFAULT_RESOLVER_CONFIG) {
  const { candidates, matchCount } = candidateSet;

  if (matchCount === 0) {
    return { outcome: STAGE0_OUTCOME.ESCALATE_CLUSTER, reason: 'zero-match', winner: null };
  }
  if (matchCount > config.tooManyMatchesThreshold) {
    return { outcome: STAGE0_OUTCOME.ESCALATE_CLUSTER, reason: 'too-many-matches', winner: null };
  }
  if (candidates.length === 1) {
    return { outcome: STAGE0_OUTCOME.RESOLVED, reason: 'single-candidate', winner: candidates[0] };
  }

  const top = candidates[0].score;
  const second = candidates[1] ? candidates[1].score : 0;
  const relMargin = top > 0 ? (top - second) / top : 0;

  if (relMargin >= config.clearWinnerMargin) {
    return { outcome: STAGE0_OUTCOME.RESOLVED, reason: 'clear-winner', winner: candidates[0] };
  }
  return { outcome: STAGE0_OUTCOME.ESCALATE_SEMANTIC, reason: 'close-scores', winner: null };
}
