/**
 * Servicio Google Sheets: crear, leer y escribir rangos, añadir filas,
 * aplicar fórmulas y crear gráficos básicos.
 */

import { GoogleApiClient } from './google-api.js';
import Logger from '../logger.js';

const logger = new Logger('Sheets');
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export class SheetsService {
  constructor(options = {}) {
    this.api = options.api || new GoogleApiClient({ service: 'sheets' });
  }

  /**
   * Crea una hoja de cálculo nueva.
   * @param {string} title
   * @returns {Promise<{spreadsheetId:string, url:string}>}
   */
  async create(title) {
    const sheet = await this.api.post(BASE, {
      properties: { title: title || 'Hoja X1' }
    });
    logger.info(`Hoja creada: ${sheet.spreadsheetId}`);
    return {
      spreadsheetId: sheet.spreadsheetId,
      url: sheet.spreadsheetUrl
    };
  }

  /**
   * Lee un rango en notación A1 (p.ej. "Hoja1!A1:C10").
   * @param {string} spreadsheetId
   * @param {string} range
   * @returns {Promise<string[][]>}
   */
  async read(spreadsheetId, range) {
    const data = await this.api.get(`${BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`);
    return data.values || [];
  }

  /**
   * Escribe valores en un rango (sobrescribe).
   * @param {string} spreadsheetId
   * @param {string} range
   * @param {Array<Array<string|number>>} values
   * @param {'RAW'|'USER_ENTERED'} [valueInputOption='USER_ENTERED']
   * @returns {Promise<Object>}
   */
  async write(spreadsheetId, range, values, valueInputOption = 'USER_ENTERED') {
    return this.api.put(
      `${BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=${valueInputOption}`,
      { range, values }
    );
  }

  /**
   * Añade filas al final de una hoja.
   * @param {string} spreadsheetId
   * @param {string} range - p.ej. "Hoja1!A1"
   * @param {Array<Array<string|number>>} values
   * @returns {Promise<Object>}
   */
  async append(spreadsheetId, range, values) {
    return this.api.post(
      `${BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      { range, values }
    );
  }

  /**
   * Escribe una fórmula en una celda concreta.
   * @param {string} spreadsheetId
   * @param {string} cell - p.ej. "Hoja1!D2"
   * @param {string} formula - p.ej. "=SUM(A2:C2)"
   * @returns {Promise<Object>}
   */
  async setFormula(spreadsheetId, cell, formula) {
    const value = formula.startsWith('=') ? formula : `=${formula}`;
    return this.write(spreadsheetId, cell, [[value]], 'USER_ENTERED');
  }

  /**
   * Limpia un rango.
   * @param {string} spreadsheetId
   * @param {string} range
   * @returns {Promise<Object>}
   */
  async clear(spreadsheetId, range) {
    return this.api.post(
      `${BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
      {}
    );
  }

  /**
   * Obtiene metadatos de la hoja (títulos de pestañas, ids).
   * @param {string} spreadsheetId
   * @returns {Promise<Object>}
   */
  async getMetadata(spreadsheetId) {
    return this.api.get(`${BASE}/${spreadsheetId}?fields=sheets.properties,properties.title`);
  }

  /**
   * Crea un gráfico básico (columnas) a partir de un rango de datos.
   * @param {string} spreadsheetId
   * @param {Object} params
   * @param {number} params.sheetId - id numérico de la pestaña
   * @param {string} params.title
   * @param {number} [params.startRow=0]
   * @param {number} [params.endRow=10]
   * @param {number} [params.startCol=0]
   * @param {number} [params.endCol=2]
   * @returns {Promise<Object>}
   */
  async createChart(spreadsheetId, params) {
    const {
      sheetId,
      title,
      startRow = 0,
      endRow = 10,
      startCol = 0,
      endCol = 2
    } = params;
    const range = {
      sheetId,
      startRowIndex: startRow,
      endRowIndex: endRow,
      startColumnIndex: startCol,
      endColumnIndex: endCol
    };
    return this.api.post(`${BASE}/${spreadsheetId}:batchUpdate`, {
      requests: [
        {
          addChart: {
            chart: {
              spec: {
                title: title || 'Gráfico',
                basicChart: {
                  chartType: 'COLUMN',
                  legendPosition: 'BOTTOM_LEGEND',
                  domains: [{ domain: { sourceRange: { sources: [range] } } }],
                  series: [{ series: { sourceRange: { sources: [range] } } }]
                }
              },
              position: { newSheet: false }
            }
          }
        }
      ]
    });
  }

  /**
   * Aplica formato de negrita a la primera fila (encabezados).
   * @param {string} spreadsheetId
   * @param {number} sheetId
   * @returns {Promise<Object>}
   */
  async boldHeaderRow(spreadsheetId, sheetId) {
    return this.api.post(`${BASE}/${spreadsheetId}:batchUpdate`, {
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: 'userEnteredFormat.textFormat.bold'
          }
        }
      ]
    });
  }

  /**
   * Convierte un array de objetos a filas [encabezados, ...valores].
   * Útil para volcar datos estructurados a una hoja.
   * @param {Array<Object>} objects
   * @returns {Array<Array<string|number>>}
   */
  static objectsToRows(objects) {
    if (!objects.length) return [];
    const headers = [...new Set(objects.flatMap((o) => Object.keys(o)))];
    const rows = objects.map((o) => headers.map((h) => o[h] ?? ''));
    return [headers, ...rows];
  }
}

export default SheetsService;
