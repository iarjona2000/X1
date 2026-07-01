/**
 * Verificación de hechos (fact-checking).
 *
 * Antes de entregar una respuesta que menciona datos verificables (fechas,
 * documentos, remitentes, cifras), extrae afirmaciones y las contrasta contra
 * fuentes primarias del usuario: Drive, Gmail y Calendar. Señala discrepancias
 * y adjunta las fuentes encontradas.
 */

import { registry } from './providers/index.js';
import { parseLooseJson, jaccardSimilarity, truncateToTokens } from '../utils/text.js';
import Logger from './logger.js';

const logger = new Logger('FactCheck');

export class FactChecker {
  /**
   * @param {Object} deps
   * @param {import('./workspace/index.js').WorkspaceManager} deps.workspace
   * @param {string} [deps.model='gpt-4o-mini']
   */
  constructor(deps) {
    this.workspace = deps.workspace;
    this.model = deps.model || 'gpt-4o-mini';
  }

  /**
   * Verifica una respuesta contra fuentes primarias.
   * @param {Object} params
   * @param {string} params.answer - Respuesta a verificar
   * @param {string} [params.query] - Consulta original (contexto)
   * @param {Object} [options]
   * @returns {Promise<{verified:boolean, claims:Array, sources:Array, corrected?:string}>}
   */
  async verify({ answer, query }, options = {}) {
    const claims = await this._extractClaims(answer);
    if (!claims.length) {
      return { verified: true, claims: [], sources: [] };
    }

    const checked = [];
    const sources = [];
    for (const claim of claims) {
      const evidence = await this._findEvidence(claim);
      const status = this._assess(claim, evidence);
      checked.push({ claim: claim.text, type: claim.type, status: status.verdict, confidence: status.confidence });
      if (evidence.source) sources.push(evidence.source);
    }

    const contradicted = checked.filter((c) => c.status === 'contradicted');
    const verified = contradicted.length === 0;

    let corrected;
    if (!verified && options.autoCorrect !== false) {
      corrected = await this._correct(answer, checked, query);
    }

    logger.debug(`Fact-check: ${checked.length} afirmaciones, ${contradicted.length} contradichas`);
    return { verified, claims: checked, sources, corrected };
  }

  /**
   * Extrae afirmaciones verificables de un texto usando el modelo.
   * @param {string} answer
   * @returns {Promise<Array<{text:string, type:string, entity?:string}>>}
   * @private
   */
  async _extractClaims(answer) {
    const provider = registry.forModel(this.model);
    const completion = await provider.complete(this.model, [
      {
        role: 'system',
        content:
          'Extrae afirmaciones verificables (referencias a documentos, fechas, reuniones, remitentes, cifras) de un texto. ' +
          'Devuelve SOLO JSON: {"claims":[{"text":"...","type":"document|date|meeting|email|number","entity":"..."}]}. ' +
          'Si no hay afirmaciones verificables, devuelve {"claims":[]}.'
      },
      { role: 'user', content: truncateToTokens(answer, 1500) }
    ], { temperature: 0, maxTokens: 600, responseFormat: { type: 'json_object' } });

    const parsed = parseLooseJson(completion.text);
    return parsed?.claims || [];
  }

  /**
   * Busca evidencia para una afirmación en las fuentes adecuadas.
   * @param {Object} claim
   * @returns {Promise<{found:boolean, text?:string, source?:Object}>}
   * @private
   */
  async _findEvidence(claim) {
    try {
      switch (claim.type) {
        case 'document':
          return this._checkDocument(claim);
        case 'email':
          return this._checkEmail(claim);
        case 'meeting':
        case 'date':
          return this._checkCalendar(claim);
        default:
          return { found: false };
      }
    } catch (error) {
      logger.debug(`Sin evidencia para "${claim.text}": ${error.message}`);
      return { found: false };
    }
  }

  /** @private */
  async _checkDocument(claim) {
    const term = claim.entity || claim.text;
    const files = await this.workspace.drive.fullTextSearch(term, 5);
    if (files.length) {
      return {
        found: true,
        text: files.map((f) => f.name).join(', '),
        source: { type: 'drive', name: files[0].name, link: files[0].webViewLink }
      };
    }
    return { found: false };
  }

  /** @private */
  async _checkEmail(claim) {
    const term = claim.entity || claim.text;
    const messages = await this.workspace.gmail.readRecent({ query: term, maxResults: 3 });
    if (messages.length) {
      return {
        found: true,
        text: messages.map((m) => `${m.from}: ${m.subject}`).join('; '),
        source: { type: 'gmail', subject: messages[0].subject, from: messages[0].from }
      };
    }
    return { found: false };
  }

  /** @private */
  async _checkCalendar(claim) {
    const events = await this.workspace.calendar.thisWeek();
    const term = (claim.entity || claim.text).toLowerCase();
    const match = events.find(
      (e) => jaccardSimilarity(e.summary, term) > 0.2 || e.summary.toLowerCase().includes(term)
    );
    if (match) {
      return {
        found: true,
        text: `${match.summary} (${match.start})`,
        source: { type: 'calendar', summary: match.summary, start: match.start }
      };
    }
    return { found: false, contradicts: events.length > 0 };
  }

  /**
   * Evalúa una afirmación frente a su evidencia.
   * @param {Object} claim
   * @param {Object} evidence
   * @returns {{verdict:string, confidence:number}}
   * @private
   */
  _assess(claim, evidence) {
    if (evidence.found) {
      const sim = evidence.text ? jaccardSimilarity(claim.text, evidence.text) : 0.5;
      return { verdict: 'supported', confidence: Math.max(0.5, sim) };
    }
    // Para fechas/reuniones, la ausencia con fuente disponible sugiere contradicción
    if ((claim.type === 'meeting' || claim.type === 'date') && evidence.contradicts) {
      return { verdict: 'contradicted', confidence: 0.6 };
    }
    return { verdict: 'unverified', confidence: 0.3 };
  }

  /**
   * Reescribe la respuesta corrigiendo afirmaciones contradichas.
   * @private
   */
  async _correct(answer, checked, query) {
    const provider = registry.forModel(this.model);
    const issues = checked
      .filter((c) => c.status !== 'supported')
      .map((c) => `- "${c.claim}" (${c.status})`)
      .join('\n');

    const completion = await provider.complete(this.model, [
      {
        role: 'system',
        content:
          'Corrige la respuesta eliminando o matizando las afirmaciones no verificadas o contradichas. ' +
          'Mantén el tono y la utilidad. No inventes datos nuevos.'
      },
      {
        role: 'user',
        content: `CONSULTA: ${query || ''}\n\nRESPUESTA ORIGINAL:\n${answer}\n\nAFIRMACIONES PROBLEMÁTICAS:\n${issues}\n\nReescribe la respuesta corregida.`
      }
    ], { temperature: 0.3, maxTokens: 1200 });

    return completion.text;
  }
}

export default FactChecker;
