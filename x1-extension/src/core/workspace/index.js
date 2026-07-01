/**
 * Fachada unificada de Google Workspace.
 *
 * Agrupa auth + los cinco servicios y ofrece operaciones de alto nivel que
 * combinan varias APIs (p.ej. preparar una reunión leyendo calendario + correos
 * relacionados, o construir un contexto de Workspace para el prompt).
 */

import { googleAuth } from './google-auth.js';
import { GmailService } from './gmail-service.js';
import { DocsService } from './docs-service.js';
import { SheetsService } from './sheets-service.js';
import { CalendarService } from './calendar-service.js';
import { DriveService } from './drive-service.js';
import { truncateToTokens } from '../../utils/text.js';
import { bus, EVENTS } from '../../utils/event-bus.js';
import Logger from '../logger.js';

const logger = new Logger('Workspace');

export class WorkspaceManager {
  constructor() {
    this.auth = googleAuth;
    this.gmail = new GmailService();
    this.docs = new DocsService();
    this.sheets = new SheetsService();
    this.calendar = new CalendarService();
    this.drive = new DriveService();
  }

  /**
   * Inicia sesión (interactivo).
   * @returns {Promise<{email:string}>}
   */
  async login() {
    await this.auth.getToken({ interactive: true });
    const info = await this.auth.getUserInfo();
    logger.info(`Sesión iniciada: ${info.email}`);
    return info;
  }

  /**
   * Cierra sesión.
   * @returns {Promise<void>}
   */
  async logout() {
    await this.auth.logout();
  }

  /**
   * ¿Hay sesión activa?
   * @returns {Promise<boolean>}
   */
  isLoggedIn() {
    return this.auth.isLoggedIn();
  }

  /**
   * Prepara una reunión: toma el próximo evento, sus asistentes y correos
   * recientes relacionados, y devuelve un briefing estructurado.
   * @returns {Promise<Object|null>}
   */
  async prepareMeeting() {
    const event = await this.calendar.nextEvent();
    if (!event) return null;

    const attendeeEmails = event.attendees.map((a) => a.email).filter(Boolean);
    const relatedEmails = [];
    for (const email of attendeeEmails.slice(0, 3)) {
      try {
        const messages = await this.gmail.readRecent({
          query: `from:${email}`,
          maxResults: 2
        });
        relatedEmails.push(...messages);
      } catch (error) {
        logger.warn(`No se pudieron leer correos de ${email}`);
      }
    }

    const briefing = {
      event,
      attendees: event.attendees,
      relatedEmails: relatedEmails.map((m) => ({
        from: m.from,
        subject: m.subject,
        snippet: m.snippet
      }))
    };
    bus.emit(EVENTS.WORKSPACE_ACTION, { action: 'prepareMeeting', eventId: event.id });
    return briefing;
  }

  /**
   * Construye un bloque de contexto de Workspace para inyectar en prompts:
   * próximos eventos + correos no leídos + documentos recientes.
   * @param {Object} [options]
   * @param {number} [options.maxTokens=1200]
   * @returns {Promise<string>}
   */
  async buildContext(options = {}) {
    const { maxTokens = 1200 } = options;
    const parts = [];

    try {
      const events = await this.calendar.today();
      if (events.length) {
        parts.push(
          'AGENDA DE HOY:\n' +
            events
              .map((e) => `- ${this._formatTime(e.start)} ${e.summary}`)
              .join('\n')
        );
      }
    } catch (error) {
      logger.debug('Sin acceso a calendario para contexto');
    }

    try {
      const unread = await this.gmail.readRecent({ query: 'is:unread', maxResults: 5 });
      if (unread.length) {
        parts.push(
          'CORREOS NO LEÍDOS:\n' +
            unread.map((m) => `- ${m.from}: ${m.subject}`).join('\n')
        );
      }
    } catch (error) {
      logger.debug('Sin acceso a Gmail para contexto');
    }

    try {
      const recent = await this.drive.recent(5);
      if (recent.length) {
        parts.push(
          'DOCUMENTOS RECIENTES:\n' + recent.map((f) => `- ${f.name}`).join('\n')
        );
      }
    } catch (error) {
      logger.debug('Sin acceso a Drive para contexto');
    }

    return truncateToTokens(parts.join('\n\n'), maxTokens);
  }

  /**
   * Genera un resumen de la bandeja de entrada (conteos y remitentes top).
   * @returns {Promise<Object>}
   */
  async inboxSummary() {
    const unread = await this.gmail.readRecent({ query: 'is:unread', maxResults: 20 });
    const bySender = {};
    for (const m of unread) {
      const sender = m.from.replace(/<.*>/, '').trim();
      bySender[sender] = (bySender[sender] || 0) + 1;
    }
    const topSenders = Object.entries(bySender)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sender, count]) => ({ sender, count }));
    return { unreadCount: unread.length, topSenders, messages: unread };
  }

  /** Formatea la hora de un evento. @private */
  _formatTime(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }
}

/** Instancia compartida. */
export const workspace = new WorkspaceManager();

export {
  GmailService,
  DocsService,
  SheetsService,
  CalendarService,
  DriveService
};

export default WorkspaceManager;
