/**
 * Servicio Google Docs: crear, leer, insertar texto, aplicar formato y
 * reemplazar texto mediante batchUpdate.
 */

import { GoogleApiClient } from './google-api.js';
import Logger from '../logger.js';

const logger = new Logger('Docs');
const BASE = 'https://docs.googleapis.com/v1/documents';

export class DocsService {
  constructor(options = {}) {
    this.api = options.api || new GoogleApiClient({ service: 'docs' });
  }

  /**
   * Crea un documento nuevo.
   * @param {string} title
   * @returns {Promise<{documentId:string, title:string}>}
   */
  async create(title) {
    const doc = await this.api.post(BASE, { title: title || 'Documento X1' });
    logger.info(`Documento creado: ${doc.documentId}`);
    return doc;
  }

  /**
   * Crea un documento e inserta contenido inicial.
   * @param {string} title
   * @param {string} content
   * @returns {Promise<{documentId:string, url:string}>}
   */
  async createWithContent(title, content) {
    const doc = await this.create(title);
    if (content) await this.insertText(doc.documentId, content, 1);
    return {
      documentId: doc.documentId,
      url: `https://docs.google.com/document/d/${doc.documentId}/edit`
    };
  }

  /**
   * Recupera el documento (estructura completa).
   * @param {string} documentId
   * @returns {Promise<Object>}
   */
  async get(documentId) {
    return this.api.get(`${BASE}/${documentId}`);
  }

  /**
   * Extrae todo el texto plano de un documento.
   * @param {string} documentId
   * @returns {Promise<string>}
   */
  async getText(documentId) {
    const doc = await this.get(documentId);
    return this._extractText(doc.body?.content || []);
  }

  /**
   * Inserta texto en un índice concreto (por defecto al inicio).
   * @param {string} documentId
   * @param {string} text
   * @param {number} [index=1]
   * @returns {Promise<Object>}
   */
  async insertText(documentId, text, index = 1) {
    return this.batchUpdate(documentId, [
      { insertText: { location: { index }, text } }
    ]);
  }

  /**
   * Añade texto al final del documento.
   * @param {string} documentId
   * @param {string} text
   * @returns {Promise<Object>}
   */
  async appendText(documentId, text) {
    const doc = await this.get(documentId);
    const endIndex = this._endIndex(doc);
    return this.batchUpdate(documentId, [
      { insertText: { location: { index: endIndex - 1 }, text: `\n${text}` } }
    ]);
  }

  /**
   * Reemplaza todas las apariciones de un texto.
   * @param {string} documentId
   * @param {string} find
   * @param {string} replace
   * @param {boolean} [matchCase=false]
   * @returns {Promise<Object>}
   */
  async replaceText(documentId, find, replace, matchCase = false) {
    return this.batchUpdate(documentId, [
      {
        replaceAllText: {
          containsText: { text: find, matchCase },
          replaceText: replace
        }
      }
    ]);
  }

  /**
   * Aplica estilo de texto (negrita, cursiva, tamaño) a un rango.
   * @param {string} documentId
   * @param {Object} params - {start, end, bold, italic, fontSize}
   * @returns {Promise<Object>}
   */
  async applyStyle(documentId, { start, end, bold, italic, fontSize }) {
    const textStyle = {};
    const fields = [];
    if (bold !== undefined) {
      textStyle.bold = bold;
      fields.push('bold');
    }
    if (italic !== undefined) {
      textStyle.italic = italic;
      fields.push('italic');
    }
    if (fontSize !== undefined) {
      textStyle.fontSize = { magnitude: fontSize, unit: 'PT' };
      fields.push('fontSize');
    }
    return this.batchUpdate(documentId, [
      {
        updateTextStyle: {
          range: { startIndex: start, endIndex: end },
          textStyle,
          fields: fields.join(',')
        }
      }
    ]);
  }

  /**
   * Inserta un salto de párrafo con estilo de encabezado.
   * @param {string} documentId
   * @param {string} text
   * @param {number} index
   * @param {'HEADING_1'|'HEADING_2'|'HEADING_3'|'NORMAL_TEXT'} [style='HEADING_1']
   * @returns {Promise<Object>}
   */
  async insertHeading(documentId, text, index, style = 'HEADING_1') {
    return this.batchUpdate(documentId, [
      { insertText: { location: { index }, text: `${text}\n` } },
      {
        updateParagraphStyle: {
          range: { startIndex: index, endIndex: index + text.length },
          paragraphStyle: { namedStyleType: style },
          fields: 'namedStyleType'
        }
      }
    ]);
  }

  /**
   * Ejecuta un batchUpdate con las peticiones dadas.
   * @param {string} documentId
   * @param {Array<Object>} requests
   * @returns {Promise<Object>}
   */
  async batchUpdate(documentId, requests) {
    return this.api.post(`${BASE}/${documentId}:batchUpdate`, { requests });
  }

  /**
   * Índice final del documento (para append).
   * @param {Object} doc
   * @returns {number}
   * @private
   */
  _endIndex(doc) {
    const content = doc.body?.content || [];
    const last = content[content.length - 1];
    return last?.endIndex || 1;
  }

  /**
   * Extrae texto recursivamente de la estructura de contenido.
   * @param {Array} content
   * @returns {string}
   * @private
   */
  _extractText(content) {
    let text = '';
    for (const element of content) {
      if (element.paragraph) {
        for (const el of element.paragraph.elements || []) {
          if (el.textRun?.content) text += el.textRun.content;
        }
      } else if (element.table) {
        for (const row of element.table.tableRows || []) {
          for (const cell of row.tableCells || []) {
            text += this._extractText(cell.content || []);
          }
        }
      } else if (element.tableOfContents) {
        text += this._extractText(element.tableOfContents.content || []);
      }
    }
    return text;
  }
}

export default DocsService;
