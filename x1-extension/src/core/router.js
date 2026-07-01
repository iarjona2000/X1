/**
 * Enrutador de consultas.
 *
 * Determina el sector de una consulta (legal, marketing, finanzas, soporte,
 * técnico, general) mediante señales léxicas ponderadas, y selecciona el
 * modelo idóneo combinando:
 *   1. Preferencias aprendidas (votos del usuario por sector).
 *   2. Reglas de routing configuradas manualmente.
 *   3. Modelo por defecto.
 *
 * La detección de sector es rápida y local (sin llamadas a LLM), con opción de
 * refinamiento por modelo cuando la confianza es baja.
 */

import { SECTORS } from '../utils/constants.js';
import { stripAccents } from '../utils/text.js';
import Logger from './logger.js';

const logger = new Logger('Router');

/**
 * Diccionario de palabras clave por sector con pesos. Se comparan contra la
 * consulta normalizada (sin acentos, minúsculas).
 */
const SECTOR_KEYWORDS = {
  [SECTORS.LEGAL]: {
    contrato: 3, clausula: 3, ley: 2, legal: 3, normativa: 2, juridico: 3,
    demanda: 2, litigio: 2, articulo: 1, rgpd: 2, gdpr: 2, cumplimiento: 2,
    reclamacion: 2, acuerdo: 1, terminos: 1, privacidad: 1, patente: 2
  },
  [SECTORS.MARKETING]: {
    marketing: 3, campana: 3, post: 2, redes: 2, publicidad: 3, marca: 2,
    copy: 3, anuncio: 2, seo: 2, contenido: 1, engagement: 2, newsletter: 2,
    persuasi: 2, cliente: 1, embudo: 2, conversion: 2, branding: 3, eslogan: 2
  },
  [SECTORS.FINANCE]: {
    finanzas: 3, presupuesto: 3, factura: 2, contabilidad: 3, balance: 3,
    ingresos: 2, gastos: 2, roi: 2, inversion: 2, impuesto: 2, iva: 2,
    beneficio: 2, flujo: 1, tesoreria: 2, margen: 2, cashflow: 2, ebitda: 3
  },
  [SECTORS.SUPPORT]: {
    soporte: 3, ayuda: 2, cliente: 2, incidencia: 3, ticket: 3, problema: 2,
    reclamacion: 2, queja: 3, atencion: 2, resolver: 1, disculpa: 2,
    devolucion: 2, garantia: 2, reembolso: 2, insatisfech: 3
  },
  [SECTORS.TECHNICAL]: {
    codigo: 3, programa: 2, funcion: 2, bug: 3, error: 2, api: 2, script: 2,
    python: 3, javascript: 3, java: 2, deploy: 2, servidor: 2, base: 1,
    datos: 1, algoritmo: 2, framework: 2, debug: 3, refactor: 3, sql: 2,
    docker: 2, react: 2, compilar: 2, dependencia: 2
  }
};

export class Router {
  /**
   * @param {Object} deps
   * @param {Object} deps.config - ConfigManager (getModelForSector, load…)
   * @param {Object} [deps.judge] - JudgeSystem (getPreferredModel)
   */
  constructor(deps = {}) {
    this.config = deps.config;
    this.judge = deps.judge;
  }

  /**
   * Detecta el sector de una consulta con puntuación por palabras clave.
   * @param {string} query
   * @returns {{sector:string, confidence:number, scores:Object}}
   */
  detectSector(query) {
    const normalized = stripAccents(query.toLowerCase());
    const tokens = normalized.match(/[a-z0-9]+/g) || [];
    const scores = {};

    for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
      let score = 0;
      for (const token of tokens) {
        for (const [keyword, weight] of Object.entries(keywords)) {
          if (token.startsWith(keyword)) {
            score += weight;
            break;
          }
        }
      }
      scores[sector] = score;
    }

    // Elegir el sector de mayor puntuación
    let best = SECTORS.GENERAL;
    let bestScore = 0;
    let total = 0;
    for (const [sector, score] of Object.entries(scores)) {
      total += score;
      if (score > bestScore) {
        bestScore = score;
        best = sector;
      }
    }

    const confidence = total > 0 ? bestScore / total : 0;
    // Si la señal es muy débil, caemos a general
    if (bestScore < 2) best = SECTORS.GENERAL;

    return { sector: best, confidence, scores };
  }

  /**
   * Resuelve el modelo a usar para una consulta.
   * Prioridad: preferencia aprendida > regla de sector > modelo por defecto.
   * @param {string} query
   * @param {Object} [options]
   * @param {string} [options.forcedSector]
   * @returns {Promise<{model:string, sector:string, source:string, confidence:number}>}
   */
  async route(query, options = {}) {
    const detection = options.forcedSector
      ? { sector: options.forcedSector, confidence: 1 }
      : this.detectSector(query);
    const sector = detection.sector;

    // 1. Preferencia aprendida de los votos
    if (this.judge) {
      try {
        const preferred = await this.judge.getPreferredModel(sector);
        if (preferred) {
          logger.debug(`Modelo preferido (votos) para ${sector}: ${preferred}`);
          return { model: preferred, sector, source: 'aprendido', confidence: detection.confidence };
        }
      } catch (error) {
        logger.debug(`Sin preferencia aprendida: ${error.message}`);
      }
    }

    // 2. Regla de routing configurada
    if (this.config) {
      try {
        const configured = await this.config.getModelForSector(sector);
        if (configured) {
          return { model: configured, sector, source: 'configurado', confidence: detection.confidence };
        }
      } catch (error) {
        logger.debug(`Sin regla de sector: ${error.message}`);
      }
    }

    // 3. Modelo por defecto
    let defaultModel = 'gpt-4o-mini';
    if (this.config) {
      try {
        const cfg = await this.config.load();
        defaultModel = cfg.defaultModel || defaultModel;
      } catch {
        /* usar fallback */
      }
    }
    return { model: defaultModel, sector, source: 'defecto', confidence: detection.confidence };
  }

  /**
   * Selecciona un conjunto de modelos para comparación, evitando duplicados y
   * priorizando diversidad de proveedores.
   * @param {number} [count=3]
   * @returns {Promise<string[]>}
   */
  async selectComparisonModels(count = 3) {
    let configured = [];
    if (this.config) {
      try {
        const cfg = await this.config.load();
        configured = cfg.comparisonModelList || [];
      } catch {
        /* ignorar */
      }
    }
    if (configured.length >= count) return configured.slice(0, count);

    // Rellenar con una selección diversa por defecto
    const defaults = [
      'gpt-4o-mini',
      'claude-3-5-haiku-20241022',
      'gemini-1.5-flash',
      'llama-3.3-70b-versatile'
    ];
    const pool = [...new Set([...configured, ...defaults])];
    return pool.slice(0, count);
  }
}

export default Router;
