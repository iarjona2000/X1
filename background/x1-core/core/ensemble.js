/**
 * Motor de ensemble / modo comparativo.
 *
 * Ejecuta varios modelos en paralelo sobre la misma consulta, evalúa las
 * respuestas con el JudgeSystem y devuelve el material para el voto ciego del
 * usuario. También decide, en modo automático, si es necesario activar la
 * comparación (cuando la confianza del juez es baja).
 *
 * Las opciones se barajan y se etiquetan A/B/C para que el usuario vote sin
 * saber qué modelo generó cada respuesta.
 */

import { registry } from './providers/index.js';
import { mapLimit } from '../utils/async.js';
import { bus, EVENTS } from '../utils/event-bus.js';
import { ids } from '../utils/id.js';
import Logger from './logger.js';

const logger = new Logger('Ensemble');

export class EnsembleEngine {
  /**
   * @param {Object} deps
   * @param {Object} deps.judge - JudgeSystem (con métodos compare/evaluate)
   * @param {Function} [deps.buildPrompt] - (query, sector) => {system, user}
   */
  constructor(deps = {}) {
    this.judge = deps.judge;
    this.buildPrompt = deps.buildPrompt || ((query) => ({
      system: 'Eres un asistente útil y preciso.',
      user: query
    }));
    this.concurrency = deps.concurrency || 4;
  }

  /**
   * Ejecuta una comparación entre varios modelos.
   * @param {Object} params
   * @param {string} params.query
   * @param {string[]} params.models - Modelos a enfrentar (2-4)
   * @param {string} [params.sector='general']
   * @param {Object} [options]
   * @param {AbortSignal} [options.signal]
   * @param {Array} [options.history]
   * @returns {Promise<Object>} { runId, sector, options:[{label, model, text, score}], judge }
   */
  async compare({ query, models, sector = 'general' }, options = {}) {
    const runId = ids.run();
    const prompt = await this.buildPrompt(query, sector);
    const messages = [
      { role: 'system', content: prompt.system },
      ...(options.history || []),
      { role: 'user', content: prompt.user }
    ];

    bus.emit(EVENTS.MODEL_REQUEST, { runId, mode: 'ensemble', models, sector });
    logger.info(`Comparando ${models.length} modelos para sector "${sector}"`);

    // Generar respuestas en paralelo con mapLimit (respeta concurrencia y
    // captura fallos individuales sin abortar toda la comparación).
    const responses = [];
    const results = await mapLimit(
      models,
      async (model) => {
        try {
          const provider = registry.forModel(model);
          const started = Date.now();
          const result = await provider.complete(model, messages, {
            temperature: 0.7,
            maxTokens: 1024,
            signal: options.signal
          });
          return {
            model,
            provider: provider.id,
            text: result.text,
            usage: result.usage,
            latencyMs: Date.now() - started,
            ok: true
          };
        } catch (error) {
          logger.warn(`Modelo ${model} falló: ${error.message}`);
          return { model, ok: false, error: error.message };
        }
      },
      this.concurrency
    );

    for (const r of results) if (r.ok) responses.push({ ...r, sector });

    if (!responses.length) {
      throw new Error('Ningún modelo produjo respuesta en la comparación');
    }

    // Evaluación por el juez (requiere al menos 2 respuestas para comparar)
    let judgeResult = null;
    if (this.judge && responses.length >= 2) {
      try {
        judgeResult = await this.judge.compare(
          responses.map((r) => ({ text: r.text, model: r.model, sector })),
          query
        );
      } catch (error) {
        logger.warn(`Juez falló: ${error.message}`);
      }
    }

    // Barajar y etiquetar A/B/C (voto ciego)
    const shuffled = this._shuffle(responses);
    const labels = ['A', 'B', 'C', 'D'];
    const optionsOut = shuffled.map((r, i) => ({
      label: labels[i],
      model: r.model,
      provider: r.provider,
      text: r.text,
      latencyMs: r.latencyMs,
      score: this._scoreFor(judgeResult, r.model)
    }));

    bus.emit(EVENTS.MODEL_RESPONSE, { runId, mode: 'ensemble', count: optionsOut.length });

    return {
      runId,
      sector,
      query,
      options: optionsOut,
      judge: judgeResult
        ? {
            winner: judgeResult.winner?.model,
            consensus: judgeResult.consensus,
            confidence: judgeResult.confidence ?? null
          }
        : null
    };
  }

  /**
   * Decide si conviene activar comparación automática: cuando el juez tiene
   * baja confianza en la respuesta del modelo primario.
   * @param {Object} params - {query, primaryModel, sector}
   * @returns {Promise<{shouldCompare:boolean, reason:string}>}
   */
  async shouldAutoCompare({ query, primaryModel, sector = 'general' }) {
    if (!this.judge) return { shouldCompare: false, reason: 'sin juez' };
    try {
      const provider = registry.forModel(primaryModel);
      const prompt = await this.buildPrompt(query, sector);
      const result = await provider.complete(primaryModel, [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user }
      ], { temperature: 0.7, maxTokens: 512 });

      const score = await this.judge.evaluateResponse(
        { text: result.text, model: primaryModel, sector },
        query
      );
      // Umbral: si el score normalizado < 0.6 sugerimos comparar
      const normalized = score / 10;
      return {
        shouldCompare: normalized < 0.6,
        reason: normalized < 0.6 ? `confianza baja (${normalized.toFixed(2)})` : 'confianza suficiente',
        draft: result.text,
        score: normalized
      };
    } catch (error) {
      return { shouldCompare: false, reason: error.message };
    }
  }

  /**
   * Extrae el score del juez para un modelo dado.
   * @private
   */
  _scoreFor(judgeResult, model) {
    if (!judgeResult?.scores) return null;
    if (judgeResult.scores instanceof Map) return judgeResult.scores.get(model) ?? null;
    return judgeResult.scores[model] ?? null;
  }

  /**
   * Baraja un array (Fisher-Yates) sin mutar el original.
   * @param {Array} array
   * @returns {Array}
   * @private
   */
  _shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

export default EnsembleEngine;
