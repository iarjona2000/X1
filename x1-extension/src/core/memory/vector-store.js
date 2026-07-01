/**
 * Interfaz de almacén vectorial + implementación local persistente.
 *
 * VectorStore define el contrato (upsert, query, delete, list). LocalVectorStore
 * lo implementa en memoria con persistencia en chrome.storage vía un store
 * inyectable. Es la opción por defecto: privada, gratuita y sin dependencias.
 */

import { topKSimilar, rerank } from './vector-math.js';
import { ids } from '../../utils/id.js';
import { MemoryError } from '../../utils/errors.js';
import Logger from '../logger.js';

const logger = new Logger('VectorStore');

/**
 * @typedef {Object} VectorRecord
 * @property {string} id
 * @property {number[]} vector
 * @property {string} text
 * @property {Object} metadata
 * @property {string} createdAt
 * @property {number} [uses]
 */

/**
 * Contrato base para almacenes vectoriales.
 * @abstract
 */
export class VectorStore {
  /**
   * Inserta o actualiza registros.
   * @param {VectorRecord[]} _records
   * @returns {Promise<void>}
   */
  async upsert(_records) {
    throw new MemoryError('upsert() no implementado');
  }

  /**
   * Búsqueda por similitud.
   * @param {number[]} _vector
   * @param {Object} [_options]
   * @returns {Promise<Array<{item:VectorRecord, score:number}>>}
   */
  async query(_vector, _options = {}) {
    throw new MemoryError('query() no implementado');
  }

  /**
   * Elimina registros por id.
   * @param {string[]} _ids
   * @returns {Promise<void>}
   */
  async delete(_ids) {
    throw new MemoryError('delete() no implementado');
  }

  /**
   * Lista todos los registros (o los que cumplan un filtro).
   * @param {(r:VectorRecord)=>boolean} [_filter]
   * @returns {Promise<VectorRecord[]>}
   */
  async list(_filter) {
    throw new MemoryError('list() no implementado');
  }

  /** Número de registros. @returns {Promise<number>} */
  async count() {
    return (await this.list()).length;
  }

  /** Vacía el almacén. @returns {Promise<void>} */
  async clear() {
    const all = await this.list();
    await this.delete(all.map((r) => r.id));
  }
}

/**
 * Almacén vectorial local con persistencia perezosa.
 */
export class LocalVectorStore extends VectorStore {
  /**
   * @param {Object} options
   * @param {{get:Function, set:Function}} options.store - Almacén k/v async
   * @param {string} [options.storageKey='x1_vectors']
   * @param {number} [options.maxRecords=5000]
   */
  constructor(options) {
    super();
    this.store = options.store;
    this.storageKey = options.storageKey || 'x1_vectors';
    this.maxRecords = options.maxRecords || 5000;
    /** @type {Map<string, VectorRecord>} */
    this.records = new Map();
    this._loaded = false;
    this._dirty = false;
    this._flushTimer = null;
  }

  /**
   * Carga los registros persistidos a memoria (una sola vez).
   * @returns {Promise<void>}
   */
  async load() {
    if (this._loaded) return;
    try {
      const raw = (await this.store.get(this.storageKey)) || [];
      for (const record of raw) this.records.set(record.id, record);
      this._loaded = true;
      logger.info(`Cargados ${this.records.size} vectores desde almacenamiento`);
    } catch (error) {
      throw new MemoryError('No se pudieron cargar los vectores', { cause: error });
    }
  }

  /**
   * Programa una escritura diferida (debounce) para no saturar storage.
   * @private
   */
  _scheduleFlush() {
    this._dirty = true;
    if (this._flushTimer) return;
    this._flushTimer = setTimeout(() => {
      this._flushTimer = null;
      this.flush().catch((e) => logger.error('Flush falló:', e.message));
    }, 1500);
  }

  /**
   * Persiste inmediatamente el estado en el store.
   * @returns {Promise<void>}
   */
  async flush() {
    if (!this._dirty) return;
    const array = [...this.records.values()];
    await this.store.set(this.storageKey, array);
    this._dirty = false;
    logger.debug(`Persistidos ${array.length} vectores`);
  }

  async upsert(records) {
    await this.load();
    for (const record of records) {
      const id = record.id || ids.memory();
      this.records.set(id, {
        id,
        vector: record.vector,
        text: record.text || '',
        metadata: record.metadata || {},
        createdAt: record.createdAt || new Date().toISOString(),
        uses: record.uses || 0
      });
    }
    this._evictIfNeeded();
    this._scheduleFlush();
  }

  /**
   * Elimina registros más antiguos y menos usados si se excede el máximo.
   * @private
   */
  _evictIfNeeded() {
    if (this.records.size <= this.maxRecords) return;
    const sorted = [...this.records.values()].sort((a, b) => {
      // Prioriza conservar los más usados y recientes
      const scoreA = (a.uses || 0) * 10 + Date.parse(a.createdAt);
      const scoreB = (b.uses || 0) * 10 + Date.parse(b.createdAt);
      return scoreA - scoreB;
    });
    const toRemove = this.records.size - this.maxRecords;
    for (let i = 0; i < toRemove; i++) this.records.delete(sorted[i].id);
    logger.debug(`Evacuados ${toRemove} vectores por límite de capacidad`);
  }

  async query(vector, options = {}) {
    await this.load();
    const { k = 5, minScore = 0, filter, boostRecency = true } = options;
    const items = [...this.records.values()];

    let results = topKSimilar(vector, items, {
      k: boostRecency ? k * 3 : k,
      minScore,
      filter
    });

    if (boostRecency) {
      const now = Date.now();
      const maxAge = 1000 * 60 * 60 * 24 * 30; // 30 días
      results = rerank(
        results,
        (item) => {
          const age = now - Date.parse(item.createdAt);
          const recency = Math.max(0, 1 - age / maxAge);
          const usage = Math.min(1, (item.uses || 0) / 10);
          return 0.6 * recency + 0.4 * usage;
        },
        0.85
      ).slice(0, k);
    }

    // Incrementar contador de usos de los recuperados
    for (const r of results) {
      const rec = this.records.get(r.item.id);
      if (rec) rec.uses = (rec.uses || 0) + 1;
    }
    this._scheduleFlush();

    return results.map((r) => ({ item: r.item, score: r.score }));
  }

  async delete(idList) {
    await this.load();
    for (const id of idList) this.records.delete(id);
    this._scheduleFlush();
  }

  async list(filter) {
    await this.load();
    const all = [...this.records.values()];
    return filter ? all.filter(filter) : all;
  }

  async count() {
    await this.load();
    return this.records.size;
  }
}

export default LocalVectorStore;
