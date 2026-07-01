/**
 * Almacén vectorial Weaviate (self-hosted).
 *
 * Implementa el contrato VectorStore contra la REST API v1 de Weaviate.
 * Usa vectores propios (no delega la vectorización a Weaviate) para mantener
 * consistencia con el EmbeddingService de X1. La clase gestiona el esquema
 * (creación de la clase/colección) de forma idempotente.
 */

import { VectorStore } from './vector-store.js';
import { HttpClient } from '../../utils/http.js';
import { MemoryError } from '../../utils/errors.js';
import { ids } from '../../utils/id.js';
import Logger from '../logger.js';

const logger = new Logger('Weaviate');

export class WeaviateStore extends VectorStore {
  /**
   * @param {Object} options
   * @param {string} options.endpoint - p.ej. http://localhost:8080
   * @param {string} [options.className='X1Memory']
   * @param {string} [options.apiKey] - Para Weaviate Cloud
   */
  constructor(options) {
    super();
    this.endpoint = options.endpoint.replace(/\/$/, '');
    this.className = options.className || 'X1Memory';
    this.apiKey = options.apiKey || null;
    this.http = new HttpClient({
      baseUrl: `${this.endpoint}/v1`,
      provider: 'weaviate',
      timeoutMs: 30000,
      defaultHeaders: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}
    });
    this._schemaReady = false;
  }

  /**
   * Crea la colección si no existe (idempotente).
   * @returns {Promise<void>}
   */
  async ensureSchema() {
    if (this._schemaReady) return;
    try {
      await this.http.get(`/schema/${this.className}`);
      this._schemaReady = true;
      return;
    } catch {
      // no existe, se crea a continuación
    }
    try {
      await this.http.postJson('/schema', {
        class: this.className,
        vectorizer: 'none',
        properties: [
          { name: 'text', dataType: ['text'] },
          { name: 'metadata', dataType: ['text'] },
          { name: 'createdAt', dataType: ['date'] }
        ]
      });
      this._schemaReady = true;
      logger.info(`Colección Weaviate "${this.className}" creada`);
    } catch (error) {
      throw new MemoryError('No se pudo crear el esquema en Weaviate', { cause: error });
    }
  }

  async upsert(records) {
    await this.ensureSchema();
    const objects = records.map((r) => ({
      class: this.className,
      id: this._toUuid(r.id || ids.memory()),
      vector: r.vector,
      properties: {
        text: r.text || '',
        metadata: JSON.stringify(r.metadata || {}),
        createdAt: r.createdAt || new Date().toISOString()
      }
    }));
    await this.http.postJson('/batch/objects', { objects });
  }

  async query(vector, options = {}) {
    await this.ensureSchema();
    const { k = 5, minScore = 0 } = options;
    // GraphQL nearVector con certainty
    const gql = {
      query: `{
        Get {
          ${this.className}(nearVector: {vector: ${JSON.stringify(vector)}}, limit: ${k}) {
            text
            metadata
            createdAt
            _additional { id certainty }
          }
        }
      }`
    };
    const data = await this.http.postJson('/graphql', gql);
    const rows = data?.data?.Get?.[this.className] || [];
    return rows
      .map((row) => ({
        item: {
          id: row._additional.id,
          text: row.text,
          metadata: this._parseMeta(row.metadata),
          createdAt: row.createdAt,
          vector: []
        },
        score: row._additional.certainty ?? 0
      }))
      .filter((r) => r.score >= minScore);
  }

  async delete(idList) {
    for (const id of idList) {
      try {
        await this.http.delete(`/objects/${this.className}/${this._toUuid(id)}`);
      } catch (error) {
        logger.warn(`No se pudo borrar ${id}: ${error.message}`);
      }
    }
  }

  async list() {
    await this.ensureSchema();
    const gql = {
      query: `{ Get { ${this.className}(limit: 1000) { text metadata createdAt _additional { id } } } }`
    };
    const data = await this.http.postJson('/graphql', gql);
    const rows = data?.data?.Get?.[this.className] || [];
    return rows.map((row) => ({
      id: row._additional.id,
      text: row.text,
      metadata: this._parseMeta(row.metadata),
      createdAt: row.createdAt,
      vector: []
    }));
  }

  /**
   * Weaviate requiere IDs en formato UUID. Convierte ids arbitrarios a un UUID
   * determinista rellenando/hasheando.
   * @param {string} id
   * @returns {string}
   * @private
   */
  _toUuid(id) {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return id;
    }
    // Hash simple a 32 hex chars
    let hex = '';
    for (let i = 0; i < id.length && hex.length < 32; i++) {
      hex += id.charCodeAt(i).toString(16).padStart(2, '0');
    }
    hex = (hex + '0'.repeat(32)).slice(0, 32);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  /** @private */
  _parseMeta(raw) {
    try {
      return JSON.parse(raw || '{}');
    } catch {
      return {};
    }
  }

  async health() {
    try {
      await this.http.get('/.well-known/ready', { timeoutMs: 4000, retries: 0 });
      return { ok: true };
    } catch (error) {
      return { ok: false, detail: error.message };
    }
  }
}

export default WeaviateStore;
