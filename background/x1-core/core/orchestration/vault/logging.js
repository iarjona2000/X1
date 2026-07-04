/**
 * Observabilidad — logging estructurado del embudo de resolución (spec §14).
 *
 * Cada `ResolvedPlan` se registra como una línea JSON (JSON-por-línea, no texto
 * libre) con: prompt, etapas invocadas y su latencia individual, candidatos
 * considerados por etapa con su score, decisión final y si vino de caché. Es la
 * fuente de datos con la que afinar empíricamente los umbrales configurables.
 */

/**
 * @typedef {Object} StageTrace
 * @property {number} stage - 0|1|2|3
 * @property {number} latencyMs
 * @property {Array<{id:string, score:number}>} candidates
 * @property {string} [reason]
 */

/**
 * Crea un logger de resolución. Por defecto acumula las líneas en memoria; se
 * puede inyectar un `sink` (p. ej. escribir a chrome.storage o a consola).
 * @param {Object} [options]
 * @param {(line:string)=>void} [options.sink]
 * @returns {{log:Function, entries:string[]}}
 */
export function createResolutionLogger(options = {}) {
  const entries = [];
  const sink = options.sink || ((line) => entries.push(line));

  return {
    /**
     * Registra una resolución completa.
     * @param {Object} params
     * @param {string} params.prompt
     * @param {import('./resolver.js').ResolvedPlan} params.plan
     * @param {StageTrace[]} [params.trace] - traza por etapa (candidatos + latencia)
     * @returns {string} la línea JSON emitida
     */
    log({ prompt, plan, trace = [] }) {
      const record = {
        ts: new Date().toISOString(),
        prompt,
        fromCache: !!plan.fromCache,
        stagesInvoked: plan.stagesInvoked || [],
        totalLatencyMs: plan.totalLatencyMs,
        executionMode: plan.executionMode,
        stages: trace.map((t) => ({
          stage: t.stage,
          latencyMs: t.latencyMs,
          reason: t.reason || null,
          candidates: (t.candidates || []).map((c) => ({ id: c.id, score: round(c.score) }))
        })),
        decision: (plan.agents || []).map((a) => ({
          id: a.id,
          resolvedByStage: a.resolvedByStage,
          confidence: round(a.confidence),
          integrationLevel: a.integrationLevel
        }))
      };
      const line = JSON.stringify(record);
      sink(line);
      return line;
    },
    entries
  };
}

/** Redondea a 4 decimales para logs legibles. */
function round(n) {
  return typeof n === 'number' ? Math.round(n * 10000) / 10000 : n;
}
