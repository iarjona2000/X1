/**
 * Asistente predictivo.
 *
 * Analiza señales del entorno del usuario (calendario, correos, documentos,
 * historial de consultas) para generar sugerencias proactivas. El nivel de
 * proactividad (bajo/medio/alto) modula cuántas sugerencias se emiten y con
 * qué umbral de confianza.
 */

import { bus, EVENTS } from '../utils/event-bus.js';
import Logger from './logger.js';

const logger = new Logger('Predictive');

/** Umbrales de confianza mínimos por nivel de proactividad. */
const CONFIDENCE_THRESHOLD = {
  low: 0.9,
  medium: 0.6,
  high: 0.3
};

export class PredictiveAssistant {
  /**
   * @param {Object} deps
   * @param {import('./workspace/index.js').WorkspaceManager} deps.workspace
   * @param {Object} deps.storage - StorageManager (getHistory…)
   * @param {Function} [deps.getConfig]
   */
  constructor(deps) {
    this.workspace = deps.workspace;
    this.storage = deps.storage;
    this.getConfig = deps.getConfig || (async () => ({ proactivityLevel: 'medium' }));
  }

  /**
   * Genera sugerencias proactivas ordenadas por prioridad.
   * @param {Object} [options]
   * @param {number} [options.max=3]
   * @returns {Promise<Array<{type:string, message:string, action:Object, confidence:number}>>}
   */
  async getSuggestions(options = {}) {
    const { max = 3 } = options;
    const config = await this.getConfig();
    const threshold = CONFIDENCE_THRESHOLD[config.proactivityLevel || 'medium'];

    const signals = await this._gatherSignals();
    const candidates = [
      ...this._meetingSuggestions(signals),
      ...this._emailSuggestions(signals),
      ...this._documentSuggestions(signals),
      ...this._routineSuggestions(signals)
    ];

    const filtered = candidates
      .filter((s) => s.confidence >= threshold)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, max);

    for (const suggestion of filtered) {
      bus.emit(EVENTS.PREDICTION, suggestion);
    }
    logger.debug(`Generadas ${filtered.length} sugerencias (nivel ${config.proactivityLevel})`);
    return filtered;
  }

  /**
   * Recopila señales del entorno de forma tolerante a fallos.
   * @returns {Promise<Object>}
   * @private
   */
  async _gatherSignals() {
    const signals = {
      events: [],
      unreadEmails: [],
      recentDocs: [],
      history: [],
      now: new Date()
    };

    const jobs = [
      this.workspace?.calendar
        ?.today()
        .then((e) => (signals.events = e))
        .catch(() => {}),
      this.workspace?.gmail
        ?.readRecent({ query: 'is:unread', maxResults: 20 })
        .then((m) => (signals.unreadEmails = m))
        .catch(() => {}),
      this.workspace?.drive
        ?.recent(10)
        .then((d) => (signals.recentDocs = d))
        .catch(() => {}),
      this.storage
        ?.getHistory?.()
        .then((h) => (signals.history = h || []))
        .catch(() => {})
    ].filter(Boolean);

    await Promise.all(jobs);
    return signals;
  }

  /**
   * Sugerencias basadas en reuniones próximas.
   * @private
   */
  _meetingSuggestions(signals) {
    const out = [];
    const now = signals.now.getTime();
    for (const event of signals.events) {
      const start = new Date(event.start).getTime();
      const minutesUntil = (start - now) / 60000;
      if (minutesUntil > 0 && minutesUntil <= 120) {
        const soon = minutesUntil <= 30;
        out.push({
          type: 'meeting_prep',
          message: `Reunión "${event.summary}" en ${Math.round(minutesUntil)} min. ¿Quieres un resumen y contexto?`,
          action: { command: 'prepareMeeting', eventId: event.id },
          confidence: soon ? 0.85 : 0.6
        });
      }
    }
    return out;
  }

  /**
   * Sugerencias basadas en volumen/urgencia de correos.
   * @private
   */
  _emailSuggestions(signals) {
    const out = [];
    const emails = signals.unreadEmails;
    if (emails.length >= 10) {
      out.push({
        type: 'inbox_triage',
        message: `Tienes ${emails.length} correos sin leer. ¿Los clasifico por prioridad?`,
        action: { command: 'triageInbox' },
        confidence: 0.7
      });
    }
    // Detectar remitente insistente (varios correos en poco tiempo)
    const bySender = {};
    for (const m of emails) {
      const sender = (m.from || '').replace(/<.*>/, '').trim();
      bySender[sender] = (bySender[sender] || 0) + 1;
    }
    for (const [sender, count] of Object.entries(bySender)) {
      if (count >= 3) {
        out.push({
          type: 'insistent_sender',
          message: `${sender} te ha escrito ${count} veces. ¿Quieres que prepare una respuesta?`,
          action: { command: 'draftReply', sender },
          confidence: 0.75
        });
      }
    }
    return out;
  }

  /**
   * Sugerencias basadas en documentos reabiertos/editados.
   * @private
   */
  _documentSuggestions(signals) {
    const out = [];
    // Documento muy reciente => quizá se está trabajando en él
    if (signals.recentDocs.length) {
      const doc = signals.recentDocs[0];
      out.push({
        type: 'active_document',
        message: `Trabajas en "${doc.name}". ¿Necesitas ayuda para redactar o revisar?`,
        action: { command: 'assistDocument', fileId: doc.id },
        confidence: 0.4
      });
    }
    return out;
  }

  /**
   * Sugerencias de rutina (día de la semana, patrones temporales).
   * @private
   */
  _routineSuggestions(signals) {
    const out = [];
    const day = signals.now.getDay();
    const hour = signals.now.getHours();
    // Lunes por la mañana: informe semanal
    if (day === 1 && hour >= 8 && hour <= 11) {
      out.push({
        type: 'weekly_report',
        message: 'Es lunes por la mañana. ¿Preparo el informe de la semana?',
        action: { command: 'weeklyReport' },
        confidence: 0.5
      });
    }
    // Viernes por la tarde: resumen y planificación
    if (day === 5 && hour >= 15) {
      out.push({
        type: 'week_wrapup',
        message: 'Fin de semana laboral. ¿Reviso lo pendiente y planifico la próxima?',
        action: { command: 'planNextWeek' },
        confidence: 0.45
      });
    }
    return out;
  }

  /**
   * Analiza el historial de consultas para detectar temas recurrentes.
   * @returns {Promise<Array<{topic:string, count:number}>>}
   */
  async recurringTopics() {
    const history = (await this.storage?.getHistory?.()) || [];
    const userMessages = history.filter((m) => m.role === 'user');
    const wordCounts = {};
    for (const m of userMessages) {
      const words = (m.content.toLowerCase().match(/[a-záéíóúñ]{5,}/g) || []);
      for (const w of words) wordCounts[w] = (wordCounts[w] || 0) + 1;
    }
    return Object.entries(wordCounts)
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));
  }
}

export default PredictiveAssistant;
