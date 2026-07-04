/**
 * Etapa 1 — Clasificación de clúster (spec §6).
 *
 * Se activa cuando la etapa 0 no resolvió (cero candidatos o ambigüedad por
 * exceso). NO es un mecanismo de matching alternativo: es un ACOTADOR de
 * universo que primero decide el clúster y luego delega el matching fino de
 * vuelta a `stage0_tagFilter`, restringido a las notas de ese clúster.
 *
 * Reutiliza `Router.detectSector()` (x1-core/core/router.js), hoy usado solo
 * para elegir modelo de lenguaje. Como su catálogo de sectores y el de
 * clústeres de la bóveda NO coinciden (fueron diseñados con objetivos
 * distintos), se documenta la tabla de mapeo explícita abajo (spec §6).
 */

import { Router } from '../../router.js';
import { stage0_tagFilter } from './stage0.js';
import { extractPromptTerms } from './terms.js';
import { isValidCluster } from './clusters.js';
import { DEFAULT_RESOLVER_CONFIG } from './config.js';

const router = new Router();

/**
 * Tabla de mapeo sector (detectSector) → clúster de la bóveda.
 *
 * IMPORTANTE (hueco conocido, spec §6): `detectSector` solo distingue 6
 * sectores (legal/marketing/finance/support/technical/general), mientras la
 * bóveda tiene 10 clústeres. Por tanto la etapa 1 solo puede acotar hacia 5 de
 * los 10 clústeres; prompts sobre RRHH (CHRO), ventas (CRO), estrategia (CEO),
 * producto (CPO) o conectores caen en `general` → sin acotar, y el embudo pasa
 * a la etapa 2 (embeddings) sin recorte de clúster. Ampliar la cobertura
 * requiere enriquecer `SECTOR_KEYWORDS` en router.js (terreno del socio) — se
 * deja como trabajo futuro documentado, no se hace aquí de forma implícita.
 */
export const SECTOR_TO_CLUSTER = Object.freeze({
  legal: 'clo-legal',
  marketing: 'cmo-marketing',
  finance: 'cfo-finanzas',
  support: 'coo-operaciones', // atención al cliente vive bajo COO (00-Indice)
  technical: 'cto-tecnico',
  general: null
});

/**
 * Devuelve el clúster acotado por sector para un prompt, o null si no se puede
 * acotar (sector general o señal débil).
 * @param {string} prompt
 * @param {import('./config.js').ResolverConfig} [config]
 * @returns {{cluster: (string|null), sector: string, confidence: number, score: number}}
 */
export function detectClusterForPrompt(prompt, config = DEFAULT_RESOLVER_CONFIG) {
  const det = router.detectSector(prompt || '');
  const topScore = det.scores ? det.scores[det.sector] || 0 : 0;
  const cluster =
    topScore >= config.stage1SectorMinScore ? SECTOR_TO_CLUSTER[det.sector] || null : null;
  return { cluster, sector: det.sector, confidence: det.confidence, score: topScore };
}

/**
 * Acota por clúster y delega el matching fino a la etapa 0 sobre el subconjunto.
 *
 * @param {string} prompt
 * @param {import('./stage0.js').CandidateSet} candidates - resultado de la etapa 0
 * @param {{notes: Array}} vault - índice de la bóveda (idealmente con _fields)
 * @param {import('./config.js').ResolverConfig} [config]
 * @returns {import('./stage0.js').CandidateSet & {cluster:(string|null), narrowed:boolean}}
 */
export function stage1_clusterFilter(prompt, candidates, vault, config = DEFAULT_RESOLVER_CONFIG) {
  const { cluster } = detectClusterForPrompt(prompt, config);

  // No se pudo acotar (sector general / hueco de mapeo): la etapa 1 no inventa
  // un recorte — devuelve los candidatos que traía la etapa 0 tal cual, marcando
  // que no hubo acotamiento para que el orquestador escale a embeddings.
  if (!cluster || !isValidCluster(cluster)) {
    return { ...(candidates || { candidates: [], maxScore: 0, matchCount: 0, usedSubstring: false }), cluster: null, narrowed: false };
  }

  const notes = (vault && vault.notes) || [];
  const subset = notes.filter((n) => n.manifest && n.manifest.cluster === cluster);

  // Re-ejecuta el filtro de etiquetas SOLO sobre el clúster (reutiliza stage0,
  // no reimplementa el matching — spec §6).
  const terms = extractPromptTerms(prompt, config);
  const refined = stage0_tagFilter(terms, { notes: subset }, config);

  // Si el clúster acotado no produjo ningún candidato pero la etapa 0 sí tenía
  // alguno, conservamos los de la etapa 0 (no perder señal por un recorte que
  // resultó vacío).
  if (refined.candidates.length === 0 && candidates && candidates.candidates.length > 0) {
    return { ...candidates, cluster, narrowed: false };
  }

  return {
    ...refined,
    candidates: refined.candidates.map((c) => ({ ...c, resolvedByStage: 1 })),
    cluster,
    narrowed: true
  };
}

/**
 * Detecta si un prompt cruza varios clústeres (spec §6: "analiza este contrato
 * y dime el presupuesto" → Legal + Finanzas). Trata el caso explícitamente en
 * vez de accidentalmente: parte el prompt por conjunciones coordinantes y
 * clasifica cada segmento, además de mirar los sectores con score alto del
 * prompt completo.
 *
 * @param {string} prompt
 * @param {import('./config.js').ResolverConfig} [config]
 * @returns {{clusters: string[], executionMode: 'single'|'sequential'|'parallel-then-merge', sectors: string[]}}
 */
export function detectMultiCluster(prompt, config = DEFAULT_RESOLVER_CONFIG) {
  const text = String(prompt || '');
  const clusters = new Set();
  const sectors = new Set();

  const consider = (segment) => {
    const det = router.detectSector(segment);
    const score = det.scores ? det.scores[det.sector] || 0 : 0;
    if (score >= config.stage1SectorMinScore) {
      const cl = SECTOR_TO_CLUSTER[det.sector];
      if (cl) {
        clusters.add(cl);
        sectors.add(det.sector);
      }
    }
  };

  // Segmentos por conjunción coordinante / puntuación.
  const segments = text.split(/\s+y\s+|\s+e\s+|\s+and\s+|[,;.]/i).map((s) => s.trim()).filter(Boolean);
  for (const seg of segments) consider(seg);
  // También el prompt entero, por si un solo segmento ya toca dos sectores
  // fuertes (detectSector devuelve el top, así que además miramos todos los
  // scores del prompt completo por encima del umbral).
  const full = router.detectSector(text);
  if (full.scores) {
    for (const [sector, score] of Object.entries(full.scores)) {
      if (score >= config.stage1SectorMinScore && SECTOR_TO_CLUSTER[sector]) {
        clusters.add(SECTOR_TO_CLUSTER[sector]);
        sectors.add(sector);
      }
    }
  }

  const clusterList = [...clusters];
  let executionMode = 'single';
  if (clusterList.length > 1) {
    // Heurística inicial (ABIERTO, spec §6): si un dominio parece depender del
    // output del otro (preposición de dependencia "de/del/para" enlazando los
    // segmentos), es secuencial; si no, paralelo con fusión posterior.
    executionMode = /\b(de|del|para|con base en|a partir de)\b/i.test(text)
      ? 'sequential'
      : 'parallel-then-merge';
  }

  return { clusters: clusterList, executionMode, sectors: [...sectors] };
}
