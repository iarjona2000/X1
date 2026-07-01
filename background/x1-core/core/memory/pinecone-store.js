/**
 * Almacén vectorial Pinecone (cloud).
 *
 * Implementa el contrato VectorStore contra la Data Plane API de Pinecone
 * (upsert/query/delete/fetch). Requiere el host del índice y una API key.
 * Los metadatos se guardan como campos nativos de Pinecone.
 */

import { VectorStore } from './vector-store.js';
import { HttpClient } from '../../utils/http.js';
import { ids } from '../../utils/id.js';
import { MemoryError } from '../../utils/errors.js';
import Logger from '../logger.js';

const logger = new Logger('Pinecone');

export class PineconeStore extends VectorStore {
  /**
   * @param {Object} options
   * @param {string} options.apiKey
   * @param {string} options.indexHost - Host del índice (data plane)
   * @param {string} [options.namespace='x1']
   */
  constructor(options) {
    super();
    if (!options.apiKey || !options.indexHost) {
      throw new MemoryError('Pinecone requiere apiKey e indexHost');
    }
    this.namespace = options.namespace || 'x1';
    this.http = new HttpClient({
      baseUrl: options.indexHost.startsWith('http')
        ? options.indexHost
        : `https://${options.indexHost}`,
      provider: 'pinecone',
      timeoutMs: 30000,
      defaultHeaders: {
        'Api-Key': options.apiKey,
        'X-Pinecone-API-Version': '2024-07'
      }
    });
  }

  async upsert(records) {
    const vectors = records.map((r) => ({
      id: r.id || ids.memory(),
      values: r.vector,
      metadata: {
        text: r.text || '',
        createdAt: r.createdAt || new Date().toISOString(),
        ...this._flattenMeta(r.metadata || {})
      }
    }));
    await this.http.postJson('/vectors/upsert', {
      vectors,
      namespace: this.namespace
    });
  }

  async query(vector, options = {}) {
    const { k = 5, minScore = 0, filter } = options;
    const body = {
      vector,
      topK: k,
      namespace: this.namespace,
      includeMetadata: true,
      includeValues: false
    };
    if (filter) body.filter = filter;
    const data = await this.http.postJson('/query', body);
    return (data.matches || [])
      .filter((m) => m.score >= minScore)
      .map((m) => ({
        item: {
          id: m.id,
          text: m.metadata?.text || '',
          metadata: m.metadata || {},
          createdAt: m.metadata?.createdAt,
          vector: m.values || []
        },
        score: m.score
      }));
  }

  async delete(idList) {
    await this.http.postJson('/vectors/delete', {
      ids: idList,
      namespace: this.namespace
    });
  }

  async list() {
    // Pinecone no ofrece listado completo eficiente; usamos el endpoint list
    try {
      const data = await this.http.get(`/vectors/list?namespace=${this.namespace}`);
      const idList = (data.vectors || []).map((v) => v.id);
      if (!idList.length) return [];
      const fetched = await this.http.get(
        `/vectors/fetch?namespace=${this.namespace}&${idList.map((id) => `ids=${id}`).join('&')}`
      );
      return Object.values(fetched.vectors || {}).map((v) => ({
        id: v.id,
        text: v.metadata?.text || '',
        metadata: v.metadata || {},
        createdAt: v.metadata?.createdAt,
        vector: v.values || []
      }));
    } catch (error) {
      logger.warn(`list() no disponible: ${error.message}`);
      return [];
    }
  }

  /**
   * Aplana metadatos anidados a valores primitivos (Pinecone no admite objetos
   * anidados en metadata).
   * @param {Object} meta
   * @returns {Object}
   * @private
   */
  _flattenMeta(meta) {
    const out = {};
    for (const [key, value] of Object.entries(meta)) {
      if (value === null || value === undefined) continue;
      if (typeof value === 'object') out[key] = JSON.stringify(value);
      else out[key] = value;
    }
    return out;
  }

  async health() {
    try {
      await this.http.get('/describe_index_stats', { timeoutMs: 5000, retries: 0 });
      return { ok: true };
    } catch (error) {
      return { ok: false, detail: error.message };
    }
  }
}

export default PineconeStore;
