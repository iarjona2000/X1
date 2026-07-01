/**
 * Herramientas de Google Workspace para agentes.
 *
 * Cada acción irreversible (enviar correo, crear/borrar eventos) se marca con
 * requiresConfirmation para que el runtime pida confirmación al usuario.
 */

import { Tool } from '../tool.js';
import { workspace } from '../../workspace/index.js';

/**
 * Crea el conjunto de herramientas de Workspace.
 * @returns {Tool[]}
 */
export function createWorkspaceTools() {
  return [
    new Tool({
      name: 'gmail_search',
      description:
        'Busca correos en Gmail con una query estilo Gmail (p.ej. "is:unread from:jefe@empresa.com"). Devuelve remitente, asunto y extracto.',
      scopes: ['gmail'],
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Query de búsqueda de Gmail' },
          maxResults: { type: 'number', description: 'Máximo de resultados (por defecto 10)' }
        },
        required: ['query']
      },
      execute: async ({ query, maxResults = 10 }) => {
        const messages = await workspace.gmail.readRecent({ query, maxResults });
        return messages.map((m) => ({
          id: m.id,
          from: m.from,
          subject: m.subject,
          snippet: m.snippet,
          date: m.date
        }));
      }
    }),

    new Tool({
      name: 'gmail_read',
      description: 'Lee el contenido completo de un correo por su id.',
      scopes: ['gmail'],
      parameters: {
        type: 'object',
        properties: { id: { type: 'string', description: 'ID del mensaje' } },
        required: ['id']
      },
      execute: async ({ id }) => {
        const msg = await workspace.gmail.get(id);
        return { from: msg.from, subject: msg.subject, body: msg.body };
      }
    }),

    new Tool({
      name: 'gmail_draft',
      description:
        'Crea un borrador de correo (no lo envía). Úsalo para preparar respuestas que el usuario revisará.',
      scopes: ['gmail'],
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Destinatario' },
          subject: { type: 'string', description: 'Asunto' },
          body: { type: 'string', description: 'Cuerpo del correo' }
        },
        required: ['to', 'subject', 'body']
      },
      execute: async (args) => {
        const draft = await workspace.gmail.createDraft(args);
        return { draftId: draft.id, status: 'borrador_creado' };
      }
    }),

    new Tool({
      name: 'gmail_send',
      description:
        'Envía un correo electrónico. ACCIÓN IRREVERSIBLE: requiere confirmación del usuario.',
      scopes: ['gmail'],
      requiresConfirmation: true,
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string' },
          subject: { type: 'string' },
          body: { type: 'string' },
          cc: { type: 'string' }
        },
        required: ['to', 'subject', 'body']
      },
      execute: async (args) => {
        const result = await workspace.gmail.send(args);
        return { messageId: result.id, status: 'enviado' };
      }
    }),

    new Tool({
      name: 'calendar_list',
      description: 'Lista los eventos del calendario del usuario para hoy o esta semana.',
      scopes: ['calendar'],
      parameters: {
        type: 'object',
        properties: {
          range: { type: 'string', enum: ['today', 'week'], description: 'Rango temporal' }
        }
      },
      execute: async ({ range = 'today' }) => {
        const events = range === 'week' ? await workspace.calendar.thisWeek() : await workspace.calendar.today();
        return events.map((e) => ({
          id: e.id,
          summary: e.summary,
          start: e.start,
          end: e.end,
          attendees: e.attendees.map((a) => a.email)
        }));
      }
    }),

    new Tool({
      name: 'calendar_create_event',
      description:
        'Crea un evento en el calendario. ACCIÓN que envía invitaciones: requiere confirmación.',
      scopes: ['calendar'],
      requiresConfirmation: true,
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Título del evento' },
          start: { type: 'string', description: 'Fecha/hora inicio ISO 8601' },
          end: { type: 'string', description: 'Fecha/hora fin ISO 8601' },
          description: { type: 'string' },
          attendees: { type: 'array', items: { type: 'string' }, description: 'Emails invitados' }
        },
        required: ['summary', 'start', 'end']
      },
      execute: async (args) => {
        const event = await workspace.calendar.createEvent(args);
        return { eventId: event.id, htmlLink: event.htmlLink, status: 'creado' };
      }
    }),

    new Tool({
      name: 'calendar_suggest_slots',
      description: 'Sugiere huecos libres en la agenda para una reunión de cierta duración.',
      scopes: ['calendar'],
      parameters: {
        type: 'object',
        properties: {
          durationMin: { type: 'number', description: 'Duración en minutos' },
          daysAhead: { type: 'number', description: 'Días a futuro a considerar' }
        }
      },
      execute: async ({ durationMin = 30, daysAhead = 5 }) => {
        const slots = await workspace.calendar.suggestSlots({ durationMin, daysAhead });
        return slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() }));
      }
    }),

    new Tool({
      name: 'docs_create',
      description: 'Crea un Google Doc con un título y contenido inicial. Devuelve la URL.',
      scopes: ['docs'],
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string', description: 'Contenido en texto plano' }
        },
        required: ['title']
      },
      execute: async ({ title, content = '' }) => {
        const doc = await workspace.docs.createWithContent(title, content);
        return { documentId: doc.documentId, url: doc.url, status: 'creado' };
      }
    }),

    new Tool({
      name: 'docs_append',
      description: 'Añade texto al final de un Google Doc existente.',
      scopes: ['docs'],
      parameters: {
        type: 'object',
        properties: {
          documentId: { type: 'string' },
          text: { type: 'string' }
        },
        required: ['documentId', 'text']
      },
      execute: async ({ documentId, text }) => {
        await workspace.docs.appendText(documentId, text);
        return { status: 'texto_añadido' };
      }
    }),

    new Tool({
      name: 'sheets_create',
      description: 'Crea una hoja de cálculo y opcionalmente vuelca datos tabulares.',
      scopes: ['sheets'],
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          rows: {
            type: 'array',
            items: { type: 'array', items: {} },
            description: 'Matriz de filas (la primera puede ser encabezados)'
          }
        },
        required: ['title']
      },
      execute: async ({ title, rows }) => {
        const sheet = await workspace.sheets.create(title);
        if (rows?.length) {
          await workspace.sheets.write(sheet.spreadsheetId, 'A1', rows);
        }
        return { spreadsheetId: sheet.spreadsheetId, url: sheet.url, status: 'creada' };
      }
    }),

    new Tool({
      name: 'sheets_read',
      description: 'Lee un rango de una hoja de cálculo en notación A1.',
      scopes: ['sheets'],
      parameters: {
        type: 'object',
        properties: {
          spreadsheetId: { type: 'string' },
          range: { type: 'string', description: 'p.ej. "Hoja1!A1:C10"' }
        },
        required: ['spreadsheetId', 'range']
      },
      execute: async ({ spreadsheetId, range }) => {
        const values = await workspace.sheets.read(spreadsheetId, range);
        return { values };
      }
    }),

    new Tool({
      name: 'drive_search',
      description: 'Busca documentos en Google Drive por nombre o contenido.',
      scopes: ['drive'],
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto a buscar' }
        },
        required: ['text']
      },
      execute: async ({ text }) => {
        const files = await workspace.drive.fullTextSearch(text, 10);
        return files.map((f) => ({ id: f.id, name: f.name, link: f.webViewLink }));
      }
    })
  ];
}

export default createWorkspaceTools;
