/**
 * Etapa 3 — Panel + Juez aplicado a elegir AGENTE, no modelo (spec §8).
 *
 * Reutiliza la INTENCIÓN del sistema de rúbricas existente (`SCORING_WEIGHTS`
 * en constants.js, usado por `JudgeSystem.evaluateResponse` para puntuar
 * respuestas de modelos) pero cambiando qué se compara: no "qué modelo responde
 * mejor a este tipo de tarea" sino "qué agente especialista de la bóveda encaja
 * mejor con este prompt".
 *
 * DECISIÓN de qué sistema de juez reutilizar (spec §8, documentada en
 * DECISIONES.md): se reutiliza el CONTRATO de `JudgeSystem` (x1-core/core/judge.js)
 * —comparar N candidatos y devolver ranking + consenso— por dos razones concretas
 * de código: (1) `JudgeSystem.compare(responses, query)` ya devuelve exactamente
 * `{winner, ranking, consensus}`, la forma que necesitamos; (2) es estático y sin
 * estado interno, así que envolverlo para puntuar "encaje de agente" en vez de
 * "calidad de respuesta" no requiere tocar su lógica. Pero como su scoring es
 * puramente heurístico sobre TEXTO de respuesta (no aplica a un agente que aún no
 * ha respondido), aquí el "juez" es inyectable: en producción, una llamada LLM
 * real que puntúa encaje; en tests y como fallback, un juez heurístico determinista.
 */

import { SCORING_WEIGHTS, SECTORS } from '../../constants.js';
import { DEFAULT_RESOLVER_CONFIG } from './config.js';
import { extractPromptTerms } from './terms.js';
import { normalizeToken } from './normalize.js';

/**
 * @typedef {Object} AgentSelectionCriteria
 * @property {string} sector
 * @property {{domainMatch:number, capabilityMatch:number, subdomainMatch:number, integrationDepth:number}} weights
 * @property {string[]} excluded - criterios de la rúbrica original que NO aplican a selección de agente
 */

/**
 * Reinterpreta la rúbrica de un sector (pensada para puntuar respuestas) como
 * criterios de SELECCIÓN DE AGENTE. Revisado rúbrica por rúbrica (spec §8):
 * los criterios que miden propiedades del TEXTO de una respuesta (brevedad,
 * empatía del tono, estructura) NO tienen sentido para elegir un especialista y
 * se excluyen explícitamente; el peso relativo de "precisión/profundidad de
 * dominio" de cada sector se traduce en cuánto pesa el match fino de capacidades.
 *
 * @param {string} sector
 * @returns {AgentSelectionCriteria}
 */
export function adaptRubricToAgentSelection(sector) {
  const rubric = SCORING_WEIGHTS[sector] || SCORING_WEIGHTS[SECTORS.GENERAL];

  // Base equilibrada; cada sector ajusta el énfasis según su rúbrica original.
  const base = { domainMatch: 0.3, capabilityMatch: 0.4, subdomainMatch: 0.2, integrationDepth: 0.1 };
  const excluded = [];

  switch (sector) {
    case SECTORS.LEGAL:
      // normativePrecision 0.7 → prima muchísimo la profundidad de capacidades
      // (un especialista real, no un genérico). structure/clarity → excluidos
      // (son propiedades del texto de respuesta, no del agente).
      excluded.push('clarity', 'structure');
      return { sector, weights: { domainMatch: 0.25, capabilityMatch: 0.55, subdomainMatch: 0.15, integrationDepth: 0.05 }, excluded };
    case SECTORS.FINANCE:
      // numericAccuracy 0.8 → misma lógica: capacidad especializada por encima de todo.
      excluded.push('auditableExplanation');
      return { sector, weights: { domainMatch: 0.25, capabilityMatch: 0.6, subdomainMatch: 0.1, integrationDepth: 0.05 }, excluded };
    case SECTORS.TECHNICAL:
      // functionalCorrectness 0.6 → capacidad + preferencia por integración real
      // (MCP/API ejecuta acciones, no solo conversa). readability → excluido.
      excluded.push('readability', 'bestPractices');
      return { sector, weights: { domainMatch: 0.2, capabilityMatch: 0.5, subdomainMatch: 0.15, integrationDepth: 0.15 }, excluded };
    case SECTORS.MARKETING:
      // brevity → excluido (propiedad del texto). brandTone → no mapea a agente.
      excluded.push('brevity', 'brandTone');
      return { sector, weights: { domainMatch: 0.35, capabilityMatch: 0.4, subdomainMatch: 0.2, integrationDepth: 0.05 }, excluded };
    case SECTORS.SUPPORT:
      // empathy/tone → excluidos (propiedades de la respuesta). resolution → capacidad.
      excluded.push('empathy', 'tone');
      return { sector, weights: { domainMatch: 0.35, capabilityMatch: 0.4, subdomainMatch: 0.2, integrationDepth: 0.05 }, excluded };
    default:
      return { sector: sector || SECTORS.GENERAL, weights: base, excluded };
  }
}

/**
 * Rastreador de presupuesto diario de invocaciones al panel (spec §8: respetar
 * estrictamente el límite diario que ya existe por coste real). Degradación
 * trazable, nunca error duro.
 * @param {number} [maxPerDay=50]
 * @returns {{canAfford:()=>boolean, consume:()=>void, remaining:()=>number, _state:Object}}
 */
export function createDailyPanelBudget(maxPerDay = 50) {
  const state = { day: new Date().toDateString(), used: 0 };
  const roll = () => {
    const today = new Date().toDateString();
    if (state.day !== today) { state.day = today; state.used = 0; }
  };
  return {
    canAfford() { roll(); return state.used < maxPerDay; },
    consume() { roll(); state.used++; },
    remaining() { roll(); return Math.max(0, maxPerDay - state.used); },
    _state: state
  };
}

/**
 * Juez heurístico determinista de encaje de agente. Fallback cuando no hay un
 * juez LLM inyectado. Puntúa cada candidato con los criterios adaptados.
 * @param {string} prompt
 * @param {Array<{id:string, manifest:Object}>} candidates
 * @param {AgentSelectionCriteria} criteria
 * @param {import('./config.js').ResolverConfig} config
 * @returns {Array<{id:string, fitScore:number}>}
 */
export function heuristicAgentJudge(prompt, candidates, criteria, config = DEFAULT_RESOLVER_CONFIG) {
  const terms = new Set(extractPromptTerms(prompt, config));
  const w = criteria.weights;
  return candidates.map((c) => {
    const m = c.manifest || {};
    const caps = (m.capabilities || []).map(normalizeToken);
    const capHits = caps.filter((cap) => terms.has(cap)).length;
    const capScore = caps.length ? capHits / caps.length : 0;
    const domScore = m.domain && terms.has(normalizeToken(m.domain)) ? 1 : 0;
    const subToks = m.subdomain ? extractPromptTerms(m.subdomain, config) : [];
    const subScore = subToks.some((t) => terms.has(t)) ? 1 : 0;
    // integración: MCP/API real (nivel 1-2) puntúa más que prompt puro (nivel 4)
    const depth = m.integration_level ? (5 - m.integration_level) / 4 : 0.5;
    const fitScore =
      w.capabilityMatch * capScore +
      w.domainMatch * domScore +
      w.subdomainMatch * subScore +
      w.integrationDepth * depth;
    return { id: c.id, fitScore };
  });
}

/** Resultado de la etapa 3. */
export const STAGE3_STATUS = Object.freeze({
  JUDGED: 'judged',
  DEGRADED_BUDGET: 'degraded-daily-limit'
});

/**
 * Panel + Juez sobre 2-4 candidatos. Devuelve ranking + confianza.
 *
 * @param {string} prompt
 * @param {Array<{id:string, manifest:Object, semanticScore?:number}>} candidates - 2..4
 * @param {Object} deps
 * @param {string} [deps.sector] - sector detectado (para elegir rúbrica)
 * @param {(prompt:string, candidates:Array, criteria:AgentSelectionCriteria)=>Promise<Array<{id:string,fitScore:number}>>} [deps.judgeFn]
 *        - juez inyectable (LLM en producción). Si falta, usa el heurístico.
 * @param {{canAfford:Function, consume:Function}} [deps.budget]
 * @param {import('./config.js').ResolverConfig} [config]
 * @returns {Promise<{status:string, ranked:Array<{id:string, fitScore:number, confidence:number}>, winner:Object|null}>}
 */
export async function stage3_panelJudge(prompt, candidates, deps = {}, config = DEFAULT_RESOLVER_CONFIG) {
  let pool = (candidates || []).slice();
  // Nunca más de 4 al panel (spec §8): si llegan más, el margen de la etapa 2 es
  // demasiado laxo — se recorta defensivamente a los 4 primeros.
  if (pool.length > 4) pool = pool.slice(0, 4);

  if (pool.length === 0) {
    return { status: STAGE3_STATUS.JUDGED, ranked: [], winner: null };
  }
  if (pool.length === 1) {
    return { status: STAGE3_STATUS.JUDGED, ranked: [{ ...pool[0], fitScore: 1, confidence: 0.6 }], winner: pool[0] };
  }

  const criteria = adaptRubricToAgentSelection(deps.sector || SECTORS.GENERAL);

  // Degradación por límite diario (spec §8): devolver el mejor candidato de la
  // etapa 2 sin desambiguar, con confianza más baja y traza — nunca fallar.
  if (deps.budget && typeof deps.budget.canAfford === 'function' && !deps.budget.canAfford()) {
    const byPrior = pool
      .map((c) => ({ ...c, fitScore: c.semanticScore || 0, confidence: 0.35 }))
      .sort((a, b) => b.fitScore - a.fitScore);
    return { status: STAGE3_STATUS.DEGRADED_BUDGET, ranked: byPrior, winner: byPrior[0] };
  }

  const judgeFn = deps.judgeFn || ((p, c, cr) => Promise.resolve(heuristicAgentJudge(p, c, cr, config)));

  let scores;
  try {
    scores = await judgeFn(prompt, pool, criteria);
    if (deps.budget && typeof deps.budget.consume === 'function') deps.budget.consume();
  } catch (error) {
    // Si el juez LLM falla, degradar al heurístico en vez de romper (§16).
    scores = heuristicAgentJudge(prompt, pool, criteria, config);
  }

  const scoreById = new Map(scores.map((s) => [s.id, s.fitScore]));
  const maxFit = Math.max(...scores.map((s) => s.fitScore), 0);
  const ranked = pool
    .map((c) => {
      const fit = scoreById.get(c.id) || 0;
      return { ...c, fitScore: fit, confidence: maxFit > 0 ? 0.5 + 0.5 * (fit / maxFit) : 0.5 };
    })
    .sort((a, b) => b.fitScore - a.fitScore);

  return { status: STAGE3_STATUS.JUDGED, ranked, winner: ranked[0] };
}
