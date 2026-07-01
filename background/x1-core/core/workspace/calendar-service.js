/**
 * Servicio Google Calendar: leer, crear, actualizar y eliminar eventos,
 * comprobar disponibilidad y sugerir huecos libres.
 */

import { GoogleApiClient } from './google-api.js';
import Logger from '../logger.js';

const logger = new Logger('Calendar');
const BASE = 'https://www.googleapis.com/calendar/v3';

export class CalendarService {
  constructor(options = {}) {
    this.api = options.api || new GoogleApiClient({ service: 'calendar' });
    this.calendarId = options.calendarId || 'primary';
  }

  /**
   * Lista eventos en un rango temporal.
   * @param {Object} [options]
   * @param {Date|string} [options.timeMin=ahora]
   * @param {Date|string} [options.timeMax]
   * @param {number} [options.maxResults=20]
   * @param {string} [options.query]
   * @returns {Promise<Object[]>}
   */
  async listEvents(options = {}) {
    const qs = GoogleApiClient.qs({
      timeMin: this._iso(options.timeMin || new Date()),
      timeMax: options.timeMax ? this._iso(options.timeMax) : undefined,
      maxResults: options.maxResults || 20,
      singleEvents: true,
      orderBy: 'startTime',
      q: options.query
    });
    const data = await this.api.get(`${BASE}/calendars/${this.calendarId}/events${qs}`);
    return (data.items || []).map((e) => this._parseEvent(e));
  }

  /**
   * Eventos de hoy.
   * @returns {Promise<Object[]>}
   */
  async today() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return this.listEvents({ timeMin: start, timeMax: end });
  }

  /**
   * Eventos de la semana en curso.
   * @returns {Promise<Object[]>}
   */
  async thisWeek() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return this.listEvents({ timeMin: start, timeMax: end, maxResults: 50 });
  }

  /**
   * Próximo evento a partir de ahora.
   * @returns {Promise<Object|null>}
   */
  async nextEvent() {
    const events = await this.listEvents({ maxResults: 1 });
    return events[0] || null;
  }

  /**
   * Crea un evento.
   * @param {Object} params - {summary, description, start, end, attendees, location, timeZone}
   * @returns {Promise<Object>}
   */
  async createEvent(params) {
    const event = {
      summary: params.summary,
      description: params.description,
      location: params.location,
      start: this._timePoint(params.start, params.timeZone, params.allDay),
      end: this._timePoint(params.end, params.timeZone, params.allDay),
      attendees: (params.attendees || []).map((email) => ({ email }))
    };
    const qs = params.sendUpdates ? '?sendUpdates=all' : '';
    const created = await this.api.post(
      `${BASE}/calendars/${this.calendarId}/events${qs}`,
      event
    );
    logger.info(`Evento creado: ${created.id}`);
    return this._parseEvent(created);
  }

  /**
   * Actualiza campos de un evento existente.
   * @param {string} eventId
   * @param {Object} patch
   * @returns {Promise<Object>}
   */
  async updateEvent(eventId, patch) {
    const body = { ...patch };
    if (patch.start) body.start = this._timePoint(patch.start, patch.timeZone);
    if (patch.end) body.end = this._timePoint(patch.end, patch.timeZone);
    const updated = await this.api.patch(
      `${BASE}/calendars/${this.calendarId}/events/${eventId}`,
      body
    );
    return this._parseEvent(updated);
  }

  /**
   * Elimina un evento.
   * @param {string} eventId
   * @param {boolean} [notify=false]
   * @returns {Promise<void>}
   */
  async deleteEvent(eventId, notify = false) {
    const qs = notify ? '?sendUpdates=all' : '';
    await this.api.delete(`${BASE}/calendars/${this.calendarId}/events/${eventId}${qs}`);
  }

  /**
   * Comprueba disponibilidad (freebusy) en un rango.
   * @param {Date|string} timeMin
   * @param {Date|string} timeMax
   * @returns {Promise<Array<{start:string, end:string}>>} periodos ocupados
   */
  async getBusy(timeMin, timeMax) {
    const data = await this.api.post(`${BASE}/freeBusy`, {
      timeMin: this._iso(timeMin),
      timeMax: this._iso(timeMax),
      items: [{ id: this.calendarId }]
    });
    return data.calendars?.[this.calendarId]?.busy || [];
  }

  /**
   * Sugiere huecos libres de `durationMin` minutos en horario laboral.
   * @param {Object} [options]
   * @param {number} [options.durationMin=30]
   * @param {number} [options.daysAhead=5]
   * @param {number} [options.workStart=9] - Hora inicio jornada
   * @param {number} [options.workEnd=18] - Hora fin jornada
   * @param {number} [options.maxSuggestions=5]
   * @returns {Promise<Array<{start:Date, end:Date}>>}
   */
  async suggestSlots(options = {}) {
    const {
      durationMin = 30,
      daysAhead = 5,
      workStart = 9,
      workEnd = 18,
      maxSuggestions = 5
    } = options;
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + daysAhead);

    const busy = await this.getBusy(now, end);
    const busyRanges = busy.map((b) => ({
      start: new Date(b.start).getTime(),
      end: new Date(b.end).getTime()
    }));

    const slots = [];
    const durationMs = durationMin * 60000;
    const cursor = new Date(now);
    cursor.setMinutes(0, 0, 0);
    cursor.setHours(cursor.getHours() + 1);

    while (cursor < end && slots.length < maxSuggestions) {
      const hour = cursor.getHours();
      const day = cursor.getDay();
      // Saltar fines de semana y fuera de horario
      if (day === 0 || day === 6 || hour < workStart || hour >= workEnd) {
        cursor.setHours(cursor.getHours() + 1);
        continue;
      }
      const slotStart = cursor.getTime();
      const slotEnd = slotStart + durationMs;
      const overlaps = busyRanges.some(
        (b) => slotStart < b.end && slotEnd > b.start
      );
      if (!overlaps) {
        slots.push({ start: new Date(slotStart), end: new Date(slotEnd) });
        cursor.setTime(slotEnd);
      } else {
        cursor.setMinutes(cursor.getMinutes() + 30);
      }
    }
    return slots;
  }

  /**
   * Construye un punto temporal (date/dateTime) para la API.
   * @private
   */
  _timePoint(value, timeZone, allDay = false) {
    if (allDay) {
      const d = new Date(value);
      return { date: d.toISOString().slice(0, 10) };
    }
    return {
      dateTime: this._iso(value),
      timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /** Convierte a ISO string. @private */
  _iso(value) {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return new Date(value).toISOString();
    return new Date().toISOString();
  }

  /**
   * Normaliza un evento de la API.
   * @private
   */
  _parseEvent(e) {
    return {
      id: e.id,
      summary: e.summary || '(sin título)',
      description: e.description || '',
      location: e.location || '',
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      attendees: (e.attendees || []).map((a) => ({
        email: a.email,
        responseStatus: a.responseStatus
      })),
      hangoutLink: e.hangoutLink || null,
      htmlLink: e.htmlLink,
      status: e.status
    };
  }
}

export default CalendarService;
