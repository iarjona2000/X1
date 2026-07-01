/**
 * Métricas y autoevaluación del sistema.
 *
 * Recopila métricas de rendimiento (latencia, tokens, coste), calidad
 * (satisfacción, tasa de éxito) y uso por modelo, escuchando el event-bus.
 * Ofrece un resumen tipo dashboard y genera recomendaciones automáticas.
 */

import { bus, EVENTS } from '../utils/event-bus.js';
import { estimateCost } from './cost/pricing.js';
import Logger from './logger.js';

const logger = new Logger('Metrics');
const STORAGE_KEY = 'x1_metrics';

export class MetricsCollector {
  /**
   * @param {Object} deps
   * @param {{get:Function, set:Function}} deps.store
   * @param {number} [deps.windowSize=500] - Interacciones a retener
   */
  constructor(deps) {
    this.store = deps.store;
    this.windowSize = deps.windowSize || 500;
    /** @type {Array} buffer en memoria antes de persistir */
    this.buffer = [];
    this._wired = false;
    this._pendingRequests = new Map();
  }

  /**
   * Conecta los listeners del bus para captura automática.
   */
  wire() {
    if (this._wired) return;
    bus.on(EVENTS.MODEL_REQUEST, (payload) => {
      this._pendingRequests.set(payload.model || 'unknown', Date.now());
    });
    bus.on(EVENTS.MODEL_RESPONSE, (payload) => {
      const started = this._pendingRequests.get(payload.model || 'unknown');
      const latencyMs = started ? Date.now() - started : null;
      this.recordInteraction({
        model: payload.model,
        tokens: payload.tokens || 0,
        latencyMs
      });
    });
    bus.on(EVENTS.MODEL_ERROR, (payload) => {
      this.recordError(payload);
    });
    this._wired = true;
    logger.info('Métricas conectadas al bus de eventos');
  }

  /**
   * Registra una interacción.
   * @param {Object} entry - {model, tokens, latencyMs, inputTokens, outputTokens, success}
   */
  recordInteraction(entry) {
    const record = {
      ts: Date.now(),
      model: entry.model || 'unknown',
      tokens: entry.tokens || 0,
      latencyMs: entry.latencyMs || null,
      cost: estimateCost(entry.model, entry.inputTokens || 0, entry.outputTokens || 0),
      success: entry.success !== false,
      satisfaction: entry.satisfaction ?? null
    };
    this.buffer.push(record);
    if (this.buffer.length >= 20) this.flush();
  }

  /**
   * Registra un error.
   * @param {Object} error - {model, code}
   */
  recordError(error) {
    this.buffer.push({
      ts: Date.now(),
      model: error.model || 'unknown',
      success: false,
      errorCode: error.code || 'unknown'
    });
  }

  /**
   * Registra satisfacción del usuario para la última interacción de un modelo.
   * @param {string} model
   * @param {number} satisfaction - 0..1
   */
  recordSatisfaction(model, satisfaction) {
    this.recordInteraction({ model, satisfaction, tokens: 0 });
  }

  /**
   * Persiste el buffer al almacén (ventana deslizante).
   * @returns {Promise<void>}
   */
  async flush() {
    if (!this.buffer.length) return;
    const stored = (await this.store.get(STORAGE_KEY)) || [];
    const merged = [...stored, ...this.buffer].slice(-this.windowSize);
    this.buffer = [];
    await this.store.set(STORAGE_KEY, merged);
  }

  /**
   * Carga todos los registros (persistidos + buffer).
   * @returns {Promise<Array>}
   * @private
   */
  async _all() {
    const stored = (await this.store.get(STORAGE_KEY)) || [];
    return [...stored, ...this.buffer];
  }

  /**
   * Genera un resumen agregado para el dashboard.
   * @returns {Promise<Object>}
   */
  async summary() {
    const all = await this._all();
    if (!all.length) return { total: 0 };

    const successes = all.filter((r) => r.success);
    const withLatency = all.filter((r) => r.latencyMs != null);
    const withSat = all.filter((r) => r.satisfaction != null);

    const byModel = {};
    for (const r of all) {
      const m = (byModel[r.model] = byModel[r.model] || { count: 0, cost: 0, tokens: 0, errors: 0 });
      m.count++;
      m.cost += r.cost || 0;
      m.tokens += r.tokens || 0;
      if (!r.success) m.errors++;
    }

    return {
      total: all.length,
      successRate: successes.length / all.length,
      avgLatencyMs: withLatency.length
        ? Math.round(withLatency.reduce((s, r) => s + r.latencyMs, 0) / withLatency.length)
        : null,
      p95LatencyMs: this._percentile(withLatency.map((r) => r.latencyMs), 95),
      avgSatisfaction: withSat.length
        ? withSat.reduce((s, r) => s + r.satisfaction, 0) / withSat.length
        : null,
      totalCost: Number(all.reduce((s, r) => s + (r.cost || 0), 0).toFixed(4)),
      byModel,
      mostUsedModel: this._topKey(byModel, (v) => v.count),
      recommendations: this._recommendations(all, byModel)
    };
  }

  /**
   * Genera recomendaciones automáticas de optimización.
   * @param {Array} all
   * @param {Object} byModel
   * @returns {string[]}
   * @private
   */
  _recommendations(all, byModel) {
    const recs = [];
    const totalCost = all.reduce((s, r) => s + (r.cost || 0), 0);
    const avgCost = totalCost / all.length;
    if (avgCost > 0.02) {
      recs.push('Coste medio por interacción alto: considera modelos más económicos (DeepSeek, Gemini Flash, GLM Air) para tareas no críticas.');
    }
    const latencies = all.filter((r) => r.latencyMs != null).map((r) => r.latencyMs);
    if (latencies.length && latencies.reduce((s, l) => s + l, 0) / latencies.length > 5000) {
      recs.push('Latencia media elevada: activa streaming y procesamiento en paralelo, o usa Groq para respuestas rápidas.');
    }
    for (const [model, stats] of Object.entries(byModel)) {
      if (stats.count >= 5 && stats.errors / stats.count > 0.2) {
        recs.push(`El modelo "${model}" tiene una tasa de error alta (${Math.round((stats.errors / stats.count) * 100)}%): revisa su clave o cámbialo.`);
      }
    }
    return recs;
  }

  /** Percentil de un array numérico. @private */
  _percentile(values, p) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
  }

  /** Clave con mayor valor según un selector. @private */
  _topKey(obj, selector) {
    let bestKey = null;
    let bestVal = -Infinity;
    for (const [key, value] of Object.entries(obj)) {
      const v = selector(value);
      if (v > bestVal) {
        bestVal = v;
        bestKey = key;
      }
    }
    return bestKey;
  }

  /**
   * Borra todas las métricas.
   * @returns {Promise<void>}
   */
  async reset() {
    this.buffer = [];
    await this.store.set(STORAGE_KEY, []);
  }
}

export default MetricsCollector;
