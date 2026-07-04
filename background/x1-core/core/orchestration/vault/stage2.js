/**
 * Etapa 2 — Búsqueda semántica por embeddings (spec §7).
 *
 * Dos fases TEMPORALMENTE SEPARADAS que no deben confundirse:
 *  - Indexación: una vez por nota (migración + cambios de contenido). Calcula y
 *    cachea el vector de cada nota. `indexVaultEmbeddings`.
 *  - Consulta: en cada prompt que llega hasta aquí. Embebe el prompt UNA vez y
 *    compara por coseno contra los vectores YA cacheados del subconjunto ya
 *    filtrado por las etapas 0-1 — nunca contra la bóveda completa, nunca
 *    recalculando embeddings de notas en tiempo de consulta. `stage2_embeddingSearch`.
 *
 * Requisito de diseño no negociable (spec §7): si `stage2_embeddingSearch`
 * recibe más de unas pocas decenas de candidatos, es un BUG de las etapas
 * previas (no recortaron), no un caso normal.
 */

import { cosineSimilarity } from '../../memory/vector-math.js';
import { DEFAULT_RESOLVER_CONFIG } from './config.js';

/**
 * Hash de contenido estable (djb2 → hex) para indexación incremental idempotente.
 * Se compara por hash de CONTENIDO, no por fecha de modificación (spec §7).
 * @param {string} text
 * @returns {string}
 */
export function contentHash(text) {
  let hash = 5381;
  const s = String(text);
  for (let i = 0; i < s.length; i++) hash = (hash * 33) ^ s.charCodeAt(i);
  return (hash >>> 0).toString(16);
}

/**
 * Construye el texto a embeber de una nota: domain + subdomain + capabilities +
 * primeras N líneas del cuerpo (no el cuerpo completo — introduce ruido y coste
 * de tokens innecesario, spec §7).
 * @param {{manifest: import('./manifest.js').AgentManifest, body?: string}} note
 * @param {import('./config.js').ResolverConfig} [config]
 * @returns {string}
 */
export function buildEmbeddingText(note, config = DEFAULT_RESOLVER_CONFIG) {
  const m = (note && note.manifest) || {};
  const parts = [];
  if (m.domain) parts.push(m.domain);
  if (m.subdomain) parts.push(m.subdomain);
  if (Array.isArray(m.capabilities) && m.capabilities.length) parts.push(m.capabilities.join(' '));
  if (note && note.body) {
    const lines = String(note.body)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, config.embeddingBodyLines);
    if (lines.length) parts.push(lines.join(' '));
  }
  return parts.join(' . ');
}

/**
 * @typedef {Object} IndexReport
 * @property {number} total
 * @property {number} indexed - nº de notas (re)embebidas en esta pasada
 * @property {number} skipped - nº de notas reutilizadas sin cambio de contenido
 * @property {number} errors
 */

/**
 * Indexa los embeddings de la bóveda. Idempotente e incremental: en una segunda
 * ejecución solo recalcula notas cuyo contenido relevante cambió (hash), y
 * reutiliza el vector previo del resto.
 *
 * @param {Array<{id:string, manifest:Object, body?:string}>} notes
 * @param {{embed:(text:string)=>Promise<number[]>}} embeddingService
 * @param {import('./config.js').ResolverConfig} [config]
 * @param {Object} [options]
 * @param {Map<string,{vector:number[],hash:string}>} [options.existing] - vectores
 *        ya calculados (de una pasada anterior / cargados del store) para reutilizar.
 * @param {{upsert:Function}} [options.store] - LocalVectorStore opcional a poblar.
 * @returns {Promise<{vectors: Map<string,{vector:number[],hash:string}>, report: IndexReport}>}
 */
export async function indexVaultEmbeddings(notes, embeddingService, config = DEFAULT_RESOLVER_CONFIG, options = {}) {
  const existing = options.existing || new Map();
  const vectors = new Map();
  const report = { total: (notes || []).length, indexed: 0, skipped: 0, errors: 0 };
  const changed = [];

  for (const note of notes || []) {
    const text = buildEmbeddingText(note, config);
    const hash = contentHash(text);
    const prev = existing.get(note.id);

    if (prev && prev.hash === hash && Array.isArray(prev.vector)) {
      vectors.set(note.id, { vector: prev.vector, hash });
      report.skipped++;
      continue;
    }

    try {
      const vector = await embeddingService.embed(text);
      vectors.set(note.id, { vector, hash });
      changed.push({
        id: note.id,
        vector,
        text,
        metadata: { cluster: note.manifest && note.manifest.cluster, contentHash: hash }
      });
      report.indexed++;
    } catch (error) {
      // Robustez §16: un fallo al embeber una nota concreta no aborta el índice
      // completo — se omite esa nota y se sigue.
      report.errors++;
    }
  }

  if (options.store && typeof options.store.upsert === 'function' && changed.length) {
    await options.store.upsert(changed);
  }

  return { vectors, report };
}

/**
 * @typedef {import('./stage0.js').Candidate} Candidate
 */

/**
 * Fase de consulta: rankea el subconjunto de candidatos por similitud coseno
 * entre el embedding del prompt (calculado UNA vez) y los vectores ya cacheados.
 *
 * @param {string} prompt
 * @param {{candidates: Candidate[]}} candidateSet - subconjunto de etapas 0-1
 * @param {{embeddingService:{embed:Function}, vectors: Map<string,{vector:number[]}|number[]>}} deps
 * @param {import('./config.js').ResolverConfig} [config]
 * @returns {Promise<import('./stage0.js').CandidateSet>}
 */
export async function stage2_embeddingSearch(prompt, candidateSet, deps, config = DEFAULT_RESOLVER_CONFIG) {
  const candidates = (candidateSet && candidateSet.candidates) || [];
  const { embeddingService, vectors } = deps || {};

  if (candidates.length === 0) {
    return { candidates: [], maxScore: 0, matchCount: 0, usedSubstring: false };
  }

  const getVec = (id) => {
    const v = vectors && vectors.get(id);
    if (!v) return null;
    return Array.isArray(v) ? v : v.vector;
  };

  let promptVec;
  try {
    promptVec = await embeddingService.embed(prompt);
  } catch (error) {
    // Degradación §16: sin embedding del prompt no se puede rankear — se
    // devuelven los candidatos de entrada sin reordenar, con confianza intacta.
    return { ...candidateSet, degraded: 'no-prompt-embedding' };
  }

  const ranked = [];
  const unranked = [];
  for (const c of candidates) {
    const vec = getVec(c.id);
    if (!vec) {
      unranked.push({ ...c, resolvedByStage: 2, semanticScore: 0 });
      continue;
    }
    const score = cosineSimilarity(promptVec, vec);
    ranked.push({ ...c, resolvedByStage: 2, semanticScore: score });
  }

  ranked.sort((a, b) => b.semanticScore - a.semanticScore);
  const ordered = [...ranked, ...unranked];

  return {
    candidates: ordered,
    maxScore: ordered.length ? (ordered[0].semanticScore || 0) : 0,
    matchCount: ranked.length,
    usedSubstring: false
  };
}

/** Resultado de clasificar la salida de la etapa 2. */
export const STAGE2_OUTCOME = Object.freeze({
  RESOLVED: 'resolved',
  ESCALATE_PANEL: 'escalate-panel'
});

/**
 * Decide si la etapa 2 resolvió o hay empate cercano que exige panel+juez.
 * Devuelve como mucho 4 candidatos al panel (spec §8): si hay más empatados, el
 * margen configurado es demasiado laxo.
 *
 * @param {import('./stage0.js').CandidateSet} candidateSet
 * @param {import('./config.js').ResolverConfig} [config]
 * @returns {{outcome:string, reason:string, winner:(Candidate|null), tied:Candidate[]}}
 */
export function classifyStage2Outcome(candidateSet, config = DEFAULT_RESOLVER_CONFIG) {
  const candidates = (candidateSet && candidateSet.candidates) || [];
  if (candidates.length === 0) {
    return { outcome: STAGE2_OUTCOME.RESOLVED, reason: 'empty', winner: null, tied: [] };
  }
  if (candidates.length === 1) {
    return { outcome: STAGE2_OUTCOME.RESOLVED, reason: 'single-candidate', winner: candidates[0], tied: [] };
  }

  const top = candidates[0].semanticScore || 0;
  const second = candidates[1].semanticScore || 0;
  const relMargin = top > 0 ? (top - second) / top : 0;

  if (relMargin >= config.stage2TieMargin) {
    return { outcome: STAGE2_OUTCOME.RESOLVED, reason: 'clear-winner', winner: candidates[0], tied: [] };
  }

  // Empate cercano: reunir los que están dentro del margen respecto al top,
  // máximo 4 para el panel.
  const tied = candidates.filter((c) => {
    const s = c.semanticScore || 0;
    return top > 0 ? (top - s) / top < config.stage2TieMargin : true;
  }).slice(0, 4);

  return { outcome: STAGE2_OUTCOME.ESCALATE_PANEL, reason: 'close-scores', winner: null, tied };
}
