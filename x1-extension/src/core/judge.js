/**
 * Sistema de evaluación de respuestas (Judge)
 * Compara múltiples respuestas y selecciona la mejor según criterios
 */

import { SCORING_WEIGHTS, SECTORS } from '../utils/constants.js';
import StorageManager from './storage.js';
import Logger from './logger.js';

const logger = new Logger('Judge');

export class JudgeSystem {
  /**
   * Evaluar respuesta individual
   * @param {Object} response - Objeto con: text, model, sector
   * @param {string} userQuery - Consulta original del usuario
   * @returns {Promise<number>} - Puntuación 1-10
   */
  static async evaluateResponse(response, userQuery) {
    const { text, model, sector = SECTORS.GENERAL } = response;

    let score = 10;

    // Criterios básicos
    if (!text || text.length < 10) score -= 3; // Respuesta demasiado corta
    if (text.length > 10000) score -= 1; // Respuesta demasiado larga
    if (!this.isRelevant(text, userQuery)) score -= 2; // No relevante

    // Criterios específicos del sector
    const weights = SCORING_WEIGHTS[sector] || SCORING_WEIGHTS[SECTORS.GENERAL];

    if (sector === SECTORS.LEGAL) {
      if (!this.hasNormativePrecision(text)) score -= weights.normativePrecision * 10;
      if (!this.isWellStructured(text)) score -= weights.structure * 10;
    }

    if (sector === SECTORS.MARKETING) {
      if (!this.isPersuasive(text)) score -= weights.persuasion * 10;
      if (text.length > 500) score -= weights.brevity * 5; // No conciso
    }

    if (sector === SECTORS.FINANCE) {
      if (!this.hasNumericAccuracy(text)) score -= weights.numericAccuracy * 10;
    }

    if (sector === SECTORS.SUPPORT) {
      if (!this.showsEmpathy(text)) score -= weights.empathy * 10;
      if (!this.isResolutive(text)) score -= weights.resolution * 10;
    }

    if (sector === SECTORS.TECHNICAL) {
      if (!this.isFunctionallyCorrect(text)) score -= weights.functionalCorrectness * 10;
      if (!this.followsBestPractices(text)) score -= weights.bestPractices * 10;
    }

    // Penalización por alucinaciones (mencionar información no disponible)
    if (this.hasHallucinations(text)) score -= 3;

    // Normalizar a 1-10
    return Math.max(1, Math.min(10, score));
  }

  /**
   * Comparar múltiples respuestas y seleccionar la mejor
   * @param {Array<Object>} responses - Array con {text, model, sector}
   * @param {string} userQuery - Consulta original
   * @returns {Promise<{winner: Object, scores: Map, consensus: boolean}>}
   */
  static async compare(responses, userQuery) {
    logger.debug(`Comparando ${responses.length} respuestas`);

    const scores = new Map();
    const evaluations = [];

    // Evaluar cada respuesta
    for (const response of responses) {
      const score = await this.evaluateResponse(response, userQuery);
      scores.set(response.model, score);
      evaluations.push({ ...response, score });
    }

    // Ordenar por puntuación
    evaluations.sort((a, b) => b.score - a.score);
    const winner = evaluations[0];
    const secondPlace = evaluations[1];

    // Determinar consenso (diferencia >2 puntos = claro ganador).
    // Con una sola respuesta no hay comparación posible: consenso directo.
    const consensus = secondPlace ? (winner.score - secondPlace.score) > 2 : true;

    logger.debug(`Ganador: ${winner.model} (${winner.score}), Consenso: ${consensus}`);

    return {
      winner,
      scores,
      consensus,
      ranking: evaluations
    };
  }

  /**
   * Registrar voto del usuario
   * @param {Object} data - {winner: string, options: Array, reason: string, sector: string}
   */
  static async recordVote(data) {
    const vote = {
      winner: data.winner,
      options: data.options,
      reason: data.reason || '',
      sector: data.sector || SECTORS.GENERAL,
      timestamp: new Date().toISOString()
    };

    await StorageManager.addVote(vote);
    logger.debug(`Voto registrado: ${vote.winner} ganó en sector ${vote.sector}`);

    // Actualizar preferencias basadas en votos
    await this.updatePreferences(vote);
  }

  /**
   * Actualizar preferencias del usuario basadas en votos
   */
  static async updatePreferences(vote) {
    const votes = await StorageManager.getVotes();
    const preferences = {};

    // Contar ganancias por modelo
    votes.forEach(v => {
      if (!preferences[v.sector]) {
        preferences[v.sector] = {};
      }
      preferences[v.sector][v.winner] = (preferences[v.sector][v.winner] || 0) + 1;
    });

    // Guardar preferencias
    await StorageManager.set('x1_preferences', preferences);

    logger.debug('Preferencias actualizadas:', preferences);
  }

  /**
   * Obtener modelo recomendado por sector basado en votos
   * @param {string} sector - Sector
   * @returns {Promise<string|null>} - Modelo más votado o null
   */
  static async getPreferredModel(sector) {
    const preferences = await StorageManager.get('x1_preferences') || {};
    const sectorPrefs = preferences[sector] || {};

    if (Object.keys(sectorPrefs).length === 0) return null;

    // Retornar modelo con más votos
    return Object.keys(sectorPrefs).reduce((a, b) =>
      sectorPrefs[a] > sectorPrefs[b] ? a : b
    );
  }

  // ── Métodos privados de evaluación ──

  static isRelevant(text, query) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const textLower = text.toLowerCase();
    const matches = queryWords.filter(w => textLower.includes(w)).length;
    return matches / queryWords.length > 0.5;
  }

  static hasNormativePrecision(text) {
    // Detectar referencias a normativas, códigos, artículos
    const regex = /articulo|codigo|ley|decreto|resolucion|norma|cfr|usc/i;
    return regex.test(text);
  }

  static isWellStructured(text) {
    // Detectar headers, listas, separadores
    const hasStructure = /(\n\n|###|---|\*\*|--\s\w)/m.test(text);
    return hasStructure || text.split('\n').length > 5;
  }

  static isPersuasive(text) {
    // Palabras persuasivas comunes
    const persuasiveWords = /beneficio|ventaja|resultado|mejora|mejor|único|exclusivo|oportunidad/i;
    return persuasiveWords.test(text);
  }

  static hasNumericAccuracy(text) {
    // Contiene números y símbolos financieros
    return /\$|\€|\£|%|\d{1,3}[.,]\d{2}|\d+\s*(mil|millón|miliardo)/i.test(text);
  }

  static showsEmpathy(text) {
    // Palabras empáticas
    const empathyWords = /entiend|siento|comprend|preocup|ayud|cuidad|valor/i;
    return empathyWords.test(text);
  }

  static isResolutive(text) {
    // Ofrece soluciones claras
    const solutionWords = /solución|opción|alternativa|pasos|proceso|cómo|aquí está|te recomend|sugier/i;
    return solutionWords.test(text);
  }

  static isFunctionallyCorrect(text) {
    // Para código o instrucciones técnicas
    const codeIndicators = /function|const|import|class|def|if\s*\(|return|async|await|try\s*{/i;
    return codeIndicators.test(text);
  }

  static followsBestPractices(text) {
    // Menciona prácticas recomendadas
    const bestPractices = /mejor práctica|estándar|recomend|buena práctica|patrón|diseño|arquitect|seguridad|eficiencia/i;
    return bestPractices.test(text);
  }

  static hasHallucinations(text) {
    // Detectar afirmaciones falsas comunes
    const hallucinations = /soy humano|tengo cuerpo|he visitado|vi en persona|hace poco/i;
    return hallucinations.test(text);
  }
}

export default JudgeSystem;
