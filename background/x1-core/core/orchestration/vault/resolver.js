/**
 * `resolveAgentsForPrompt` — orquestador del embudo en cascada (spec §3, §2, §16).
 *
 * Integra caché (Ext. B) + etapas 0-3 respetando el recorte progresivo de
 * universo: cada etapa solo se ejecuta si la anterior no resolvió con seguridad,
 * y trabaja solo sobre el subconjunto que sobrevivió. Devuelve SIEMPRE un
 * `ResolvedPlan` estructuralmente válido (array vacío de agents cuando no hay
 * especialista con confianza suficiente — nunca null ni excepción, spec §16).
 *
 * Las dependencias pesadas (embeddings, juez LLM) se inyectan, de modo que el
 * embudo es testeable de punta a punta sin claves ni red: sin `embeddingService`
 * el embudo degrada a etapas 0-1; con el `EmbeddingService` local determinista,
 * corre las 4 etapas.
 */

import { extractPromptTerms } from './terms.js';
import { stage0_tagFilter, classifyStage0Outcome, STAGE0_OUTCOME } from './stage0.js';
import { stage1_clusterFilter, detectClusterForPrompt, detectMultiCluster } from './stage1.js';
import { stage2_embeddingSearch, classifyStage2Outcome, STAGE2_OUTCOME } from './stage2.js';
import { stage3_panelJudge } from './stage3.js';
import { buildTaskGraphFromPlan } from './taskgraph.js';
import { DEFAULT_RESOLVER_CONFIG } from './config.js';

/**
 * @typedef {Object} ResolvedAgent
 * @property {string} id
 * @property {string} domain
 * @property {string} [subdomain]
 * @property {1|2|3|4} integrationLevel
 * @property {string} integrationRef
 * @property {number} confidence
 * @property {0|1|2|3} resolvedByStage
 */

/**
 * @typedef {Object} ResolvedPlan
 * @property {ResolvedAgent[]} agents - orden = orden de ejecución
 * @property {'single'|'sequential'|'parallel-then-merge'} executionMode
 * @property {Object} [coordinationGraph]
 * @property {number} totalLatencyMs
 * @property {number[]} stagesInvoked
 * @property {boolean} fromCache
 */

/** Construye el mapa id→manifest de la bóveda. */
function indexById(vault) {
  const map = new Map();
  for (const n of (vault && vault.notes) || []) {
    if (n && n.id) map.set(n.id, n.manifest || {});
  }
  return map;
}

/** Versiones actuales de manifest por id (para invalidar caché). */
function currentVersions(vaultById) {
  const v = {};
  for (const [id, m] of vaultById) v[id] = m.version != null ? m.version : 1;
  return v;
}

/** Convierte un candidato + su manifest en un ResolvedAgent. */
function toResolvedAgent(candidate, manifest, confidence, stage) {
  const m = manifest || {};
  return {
    id: candidate.id,
    domain: m.domain || null,
    subdomain: m.subdomain || undefined,
    integrationLevel: m.integration_level || null,
    integrationRef: m.integration_ref || null,
    confidence,
    resolvedByStage: stage
  };
}

/** Plan vacío estructuralmente válido (spec §16). */
function emptyPlan(t0, stagesInvoked) {
  return {
    agents: [],
    executionMode: 'single',
    totalLatencyMs: Date.now() - t0,
    stagesInvoked,
    fromCache: false
  };
}

/**
 * Resuelve el conjunto mínimo de agentes de la bóveda para un prompt.
 *
 * @param {string} prompt
 * @param {Object} deps
 * @param {{notes:Array}} deps.vault - índice de la bóveda (idealmente con _fields)
 * @param {Map<string,{vector:number[]}>} [deps.vectors] - vectores precalculados (etapa 2)
 * @param {{embed:Function}} [deps.embeddingService]
 * @param {Function} [deps.judgeFn] - juez LLM para la etapa 3
 * @param {Object} [deps.budget] - presupuesto diario de panel
 * @param {Object} [deps.cache] - ResolvedPlanCache
 * @param {Object} [deps.logger] - createResolutionLogger
 * @param {import('./config.js').ResolverConfig} [config]
 * @returns {Promise<ResolvedPlan>}
 */
export async function resolveAgentsForPrompt(prompt, deps = {}, config = DEFAULT_RESOLVER_CONFIG) {
  const t0 = Date.now();
  const vault = deps.vault || { notes: [] };
  const vaultById = indexById(vault);
  const stagesInvoked = [];
  const trace = [];

  // --- Caché (Extensión B) ---
  if (deps.cache) {
    const cached = deps.cache.get(prompt, currentVersions(vaultById));
    if (cached) {
      if (deps.logger) deps.logger.log({ prompt, plan: cached, trace: [] });
      return cached;
    }
  }

  const terms = extractPromptTerms(prompt, config);

  // --- Caso multi-clúster (coordinación multi-agente) ---
  const mc = detectMultiCluster(prompt, config);
  if (mc.clusters.length > 1) {
    const agents = [];
    for (const cluster of mc.clusters) {
      const subset = { notes: (vault.notes || []).filter((n) => n.manifest && n.manifest.cluster === cluster) };
      const set = stage0_tagFilter(terms, subset, config);
      if (set.candidates.length) {
        const top = set.candidates[0];
        agents.push(toResolvedAgent(top, vaultById.get(top.id), 0.55, 1));
      }
    }
    if (agents.length >= 2) {
      stagesInvoked.push(0, 1);
      const plan = {
        agents,
        executionMode: mc.executionMode,
        totalLatencyMs: Date.now() - t0,
        stagesInvoked,
        fromCache: false
      };
      plan.coordinationGraph = buildTaskGraphFromPlan(plan) || undefined;
      finalize(prompt, plan, trace, deps);
      return plan;
    }
    // si no se pudieron resolver ≥2 agentes, cae al camino de un solo agente
  }

  // --- Etapa 0 ---
  let set = stage0_tagFilter(terms, vault, config);
  stagesInvoked.push(0);
  trace.push({ stage: 0, latencyMs: Date.now() - t0, candidates: set.candidates.slice(0, 5) });
  let outcome = classifyStage0Outcome(set, config);
  let winner = null;
  let stage = 0;
  let confidence = 0;

  if (outcome.outcome === STAGE0_OUTCOME.RESOLVED) {
    winner = outcome.winner;
    stage = 0;
    confidence = outcome.reason === 'clear-winner' ? 0.75 : 0.65;
  } else if (outcome.outcome === STAGE0_OUTCOME.ESCALATE_CLUSTER) {
    // --- Etapa 1 ---
    const s1 = stage1_clusterFilter(prompt, set, vault, config);
    stagesInvoked.push(1);
    trace.push({ stage: 1, latencyMs: Date.now() - t0, candidates: s1.candidates.slice(0, 5), reason: s1.cluster || 'no-narrow' });
    set = s1;
    const o1 = classifyStage0Outcome(s1, config);
    if (o1.outcome === STAGE0_OUTCOME.RESOLVED) {
      winner = o1.winner;
      stage = 1;
      confidence = 0.6;
    }
  }

  // --- Etapa 2 (embeddings) si aún no hay ganador y hay recursos ---
  if (!winner && deps.embeddingService && deps.vectors && set.candidates.length) {
    const s2 = await stage2_embeddingSearch(prompt, set, { embeddingService: deps.embeddingService, vectors: deps.vectors }, config);
    stagesInvoked.push(2);
    trace.push({ stage: 2, latencyMs: Date.now() - t0, candidates: s2.candidates.slice(0, 5).map((c) => ({ id: c.id, score: c.semanticScore })) });
    const o2 = classifyStage2Outcome(s2, config);
    if (o2.outcome === STAGE2_OUTCOME.RESOLVED && o2.winner) {
      winner = o2.winner;
      stage = 2;
      confidence = 0.5 + 0.5 * (o2.winner.semanticScore || 0);
    } else if (o2.outcome === STAGE2_OUTCOME.ESCALATE_PANEL) {
      // --- Etapa 3 (panel+juez) ---
      const hydrated = o2.tied.map((c) => ({ ...c, manifest: vaultById.get(c.id) || {} }));
      const { sector } = detectClusterForPrompt(prompt, config);
      const s3 = await stage3_panelJudge(prompt, hydrated, { sector, judgeFn: deps.judgeFn, budget: deps.budget }, config);
      stagesInvoked.push(3);
      trace.push({ stage: 3, latencyMs: Date.now() - t0, candidates: s3.ranked.slice(0, 5).map((c) => ({ id: c.id, score: c.fitScore })), reason: s3.status });
      if (s3.winner) {
        winner = s3.winner;
        stage = 3;
        confidence = s3.winner.confidence != null ? s3.winner.confidence : 0.5;
      }
    }
  }

  // --- Mejor esfuerzo si no hubo resolución formal pero hay candidatos ---
  if (!winner && set.candidates.length) {
    winner = set.candidates[0];
    stage = set.candidates[0].resolvedByStage != null ? set.candidates[0].resolvedByStage : 0;
    confidence = 0.4;
  }

  // --- Umbral de confianza mínima (spec §16): sin especialista → plan vacío ---
  if (!winner || confidence < config.minConfidence) {
    const plan = emptyPlan(t0, stagesInvoked);
    finalize(prompt, plan, trace, deps);
    return plan;
  }

  const plan = {
    agents: [toResolvedAgent(winner, vaultById.get(winner.id), round(confidence), stage)],
    executionMode: 'single',
    totalLatencyMs: Date.now() - t0,
    stagesInvoked,
    fromCache: false
  };
  finalize(prompt, plan, trace, deps);
  return plan;
}

/** Puebla caché y registra el plan. */
function finalize(prompt, plan, trace, deps) {
  if (deps.cache) deps.cache.set(prompt, plan);
  if (deps.logger) deps.logger.log({ prompt, plan, trace });
}

function round(n) {
  return Math.round(n * 10000) / 10000;
}
