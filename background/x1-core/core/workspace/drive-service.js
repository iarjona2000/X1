/**
 * Servicio Google Drive: listar, buscar, leer y crear archivos. Se usa como
 * fuente primaria para la verificación de hechos y para exportar documentos.
 */

import { GoogleApiClient } from './google-api.js';
import Logger from '../logger.js';

const logger = new Logger('Drive');
const BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export class DriveService {
  constructor(options = {}) {
    this.api = options.api || new GoogleApiClient({ service: 'drive' });
  }

  /**
   * Busca archivos con una query de Drive.
   * @param {Object} [options]
   * @param {string} [options.query] - p.ej. "name contains 'contrato'"
   * @param {number} [options.pageSize=20]
   * @param {string} [options.orderBy='modifiedTime desc']
   * @returns {Promise<Array<{id:string, name:string, mimeType:string}>>}
   */
  async search({ query, pageSize = 20, orderBy = 'modifiedTime desc' } = {}) {
    const qs = GoogleApiClient.qs({
      q: query,
      pageSize,
      orderBy,
      fields: 'files(id,name,mimeType,modifiedTime,webViewLink,owners)'
    });
    const data = await this.api.get(`${BASE}/files${qs}`);
    return data.files || [];
  }

  /**
   * Archivos modificados recientemente.
   * @param {number} [limit=10]
   * @returns {Promise<Array>}
   */
  async recent(limit = 10) {
    return this.search({ pageSize: limit, orderBy: 'modifiedTime desc' });
  }

  /**
   * Obtiene metadatos de un archivo.
   * @param {string} fileId
   * @returns {Promise<Object>}
   */
  async getMetadata(fileId) {
    return this.api.get(
      `${BASE}/files/${fileId}?fields=id,name,mimeType,modifiedTime,size,webViewLink`
    );
  }

  /**
   * Descarga el contenido de texto de un archivo. Los Google Docs se exportan
   * a texto plano; los archivos binarios se descargan tal cual.
   * @param {string} fileId
   * @returns {Promise<string>}
   */
  async getContent(fileId) {
    const meta = await this.getMetadata(fileId);
    if (meta.mimeType === 'application/vnd.google-apps.document') {
      return this.api.request(
        `${BASE}/files/${fileId}/export?mimeType=text/plain`,
        { method: 'GET' }
      );
    }
    if (meta.mimeType === 'application/vnd.google-apps.spreadsheet') {
      return this.api.request(
        `${BASE}/files/${fileId}/export?mimeType=text/csv`,
        { method: 'GET' }
      );
    }
    return this.api.request(`${BASE}/files/${fileId}?alt=media`, { method: 'GET' });
  }

  /**
   * Crea un archivo de texto simple en Drive.
   * @param {string} name
   * @param {string} content
   * @param {string} [mimeType='text/plain']
   * @returns {Promise<{id:string, webViewLink:string}>}
   */
  async createTextFile(name, content, mimeType = 'text/plain') {
    const boundary = 'x1boundary' + Date.now();
    const metadata = { name, mimeType };
    const body =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n` +
      `${content}\r\n` +
      `--${boundary}--`;

    const file = await this.api.request(
      `${UPLOAD}/files?uploadType=multipart&fields=id,webViewLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body
      }
    );
    logger.info(`Archivo creado en Drive: ${file.id}`);
    return file;
  }

  /**
   * Busca en el contenido de documentos (full text search de Drive).
   * @param {string} text
   * @param {number} [limit=10]
   * @returns {Promise<Array>}
   */
  async fullTextSearch(text, limit = 10) {
    return this.search({
      query: `fullText contains '${text.replace(/'/g, "\\'")}'`,
      pageSize: limit
    });
  }
}

export default DriveService;
