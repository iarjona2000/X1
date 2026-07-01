/**
 * Gestor de presupuesto.
 *
 * Rastrea el gasto (estimado a partir de tokens usados) por día y por mes,
 * emite alertas al cruzar umbrales, y decide si una llamada cabe en el
 * presupuesto. Permite marcar tareas como críticas para exceder el límite bajo
 * confirmación explícita.
 */

import { estimateCost, getPrice } from './pricing.js';
import { bus } from '../../utils/event-bus.js';
import Logger from '../logger.js';

const logger = new Logger('Budget');
const STORAGE_KEY = 'x1_budget_ledger';

export class BudgetManager {
  /**
   * @param {Object} deps
   * @param {{get:Function, set:Function}} deps.store
   * @param {Function} [deps.getConfig] - () => Promise<{budget:{daily,monthly,alertThreshold}}>
   */
  constructor(deps) {
    this.store = deps.store;
    this.getConfig = deps.getConfig || (async () => ({}));
    this._alerted = { daily: false, monthly: false };
  }

  /**
   * Lee los límites de presupuesto de la configuración.
   * @returns {Promise<{daily:number, monthly:number, alertThreshold:number, allowCritical:boolean}>}
   */
  async _limits() {
    const config = (await this.getConfig()) || {};
    const budget = config.budget || {};
    return {
      daily: budget.daily ?? 5,
      monthly: budget.monthly ?? 150,
      alertThreshold: budget.alertThreshold ?? 0.75,
      allowCritical: budget.allowCritical !== false
    };
  }

  /**
   * Lee el libro mayor de gasto {day, month, dailySpent, monthlySpent, entries}.
   * Reinicia contadores al cambiar de día/mes.
   * @returns {Promise<Object>}
   * @private
   */
  async _ledger() {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const month = now.toISOString().slice(0, 7);
    const raw = (await this.store.get(STORAGE_KEY)) || {};

    const ledger = {
      day,
      month,
      dailySpent: raw.day === day ? raw.dailySpent || 0 : 0,
      monthlySpent: raw.month === month ? raw.monthlySpent || 0 : 0,
      calls: raw.month === month ? raw.calls || 0 : 0
    };
    // Si cambió el día pero no el mes, conservamos el gasto mensual
    if (raw.month === month && raw.day !== day) {
      ledger.monthlySpent = raw.monthlySpent || 0;
      ledger.calls = raw.calls || 0;
    }
    return ledger;
  }

  /**
   * Registra el gasto de una llamada realizada.
   * @param {Object} params - {model, inputTokens, outputTokens}
   * @returns {Promise<{cost:number, dailySpent:number, monthlySpent:number}>}
   */
  async record({ model, inputTokens, outputTokens }) {
    const cost = estimateCost(model, inputTokens, outputTokens);
    const ledger = await this._ledger();
    ledger.dailySpent += cost;
    ledger.monthlySpent += cost;
    ledger.calls += 1;
    await this.store.set(STORAGE_KEY, ledger);

    await this._checkAlerts(ledger);
    logger.debug(`Gasto registrado: $${cost.toFixed(5)} (${model})`);
    return { cost, dailySpent: ledger.dailySpent, monthlySpent: ledger.monthlySpent };
  }

  /**
   * Comprueba si una llamada estimada cabe en el presupuesto.
   * @param {Object} params - {model, estInputTokens, estOutputTokens, critical}
   * @returns {Promise<{allowed:boolean, reason:string, estCost:number}>}
   */
  async canAfford({ model, estInputTokens = 1000, estOutputTokens = 1000, critical = false }) {
    const estCost = estimateCost(model, estInputTokens, estOutputTokens);
    const limits = await this._limits();
    const ledger = await this._ledger();

    if (ledger.dailySpent + estCost > limits.daily) {
      if (critical && limits.allowCritical) {
        return { allowed: true, reason: 'excede diario pero es crítico', estCost };
      }
      return { allowed: false, reason: `superaría el presupuesto diario ($${limits.daily})`, estCost };
    }
    if (ledger.monthlySpent + estCost > limits.monthly) {
      if (critical && limits.allowCritical) {
        return { allowed: true, reason: 'excede mensual pero es crítico', estCost };
      }
      return { allowed: false, reason: `superaría el presupuesto mensual ($${limits.monthly})`, estCost };
    }
    return { allowed: true, reason: 'dentro de presupuesto', estCost };
  }

  /**
   * Sugiere el modelo más barato de una lista que quepa en el presupuesto.
   * @param {string[]} models
   * @param {Object} [workload] - {estInputTokens, estOutputTokens}
   * @returns {Promise<string|null>}
   */
  async cheapestAffordable(models, workload = {}) {
    const { estInputTokens = 1000, estOutputTokens = 1000 } = workload;
    const ranked = models
      .map((model) => ({ model, cost: estimateCost(model, estInputTokens, estOutputTokens) }))
      .sort((a, b) => a.cost - b.cost);
    for (const { model } of ranked) {
      const check = await this.canAfford({ model, estInputTokens, estOutputTokens });
      if (check.allowed) return model;
    }
    return null;
  }

  /**
   * Estado actual del presupuesto (para dashboard).
   * @returns {Promise<Object>}
   */
  async status() {
    const limits = await this._limits();
    const ledger = await this._ledger();
    return {
      daily: {
        spent: Number(ledger.dailySpent.toFixed(4)),
        limit: limits.daily,
        pct: limits.daily ? ledger.dailySpent / limits.daily : 0,
        remaining: Math.max(0, limits.daily - ledger.dailySpent)
      },
      monthly: {
        spent: Number(ledger.monthlySpent.toFixed(4)),
        limit: limits.monthly,
        pct: limits.monthly ? ledger.monthlySpent / limits.monthly : 0,
        remaining: Math.max(0, limits.monthly - ledger.monthlySpent)
      },
      calls: ledger.calls
    };
  }

  /**
   * Emite alertas si se cruzan los umbrales configurados.
   * @param {Object} ledger
   * @private
   */
  async _checkAlerts(ledger) {
    const limits = await this._limits();
    const dailyPct = limits.daily ? ledger.dailySpent / limits.daily : 0;
    const monthlyPct = limits.monthly ? ledger.monthlySpent / limits.monthly : 0;

    if (dailyPct >= limits.alertThreshold && !this._alerted.daily) {
      this._alerted.daily = true;
      bus.emit('budget:alert', { scope: 'daily', pct: dailyPct, spent: ledger.dailySpent });
      logger.warn(`Alerta: ${Math.round(dailyPct * 100)}% del presupuesto diario consumido`);
    }
    if (monthlyPct >= limits.alertThreshold && !this._alerted.monthly) {
      this._alerted.monthly = true;
      bus.emit('budget:alert', { scope: 'monthly', pct: monthlyPct, spent: ledger.monthlySpent });
      logger.warn(`Alerta: ${Math.round(monthlyPct * 100)}% del presupuesto mensual consumido`);
    }
    // Resetear flags si baja del umbral (nuevo periodo)
    if (dailyPct < limits.alertThreshold) this._alerted.daily = false;
    if (monthlyPct < limits.alertThreshold) this._alerted.monthly = false;
  }

  /**
   * Info de contexto de un modelo (límite de tokens).
   * @param {string} model
   * @returns {number}
   */
  contextLimit(model) {
    return getPrice(model).context || 8192;
  }
}

export default BudgetManager;
