/**
 * Gestor de memoria persistente de X1.
 *
 * Orquesta embeddings + vector store para dar una API de alto nivel:
 *   - remember(): guarda una memoria tipada (preferencia, contexto, corrección…)
 *   - recall(): recupera memorias relevantes a una consulta
 *   - buildContext(): produce un bloque de texto listo para inyectar en prompts
 *   - forget(): elimina memorias
 *
 * Selecciona el backend (local / Weaviate / Pinecone) según la configuración.
 * Aplica anonimización ligera de PII antes de persistir.
 */

import { embeddings as defaultEmbeddings } from './embeddings.js';
import { LocalVectorStore } from './vector-store.js';
import { WeaviateStore } from './weaviate-store.js';
import { PineconeStore } from './pinecone-store.js';
import { ids } from '../../utils/id.js';
import { chunkText, truncateToTokens } from '../../utils/text.js';
import { bus, EVENTS } from '../../utils/event-bus.js';
import Logger from '../logger.js';

const logger = new Logger('Memory');

/** Tipos de memoria soportados. */
export const MEMORY_TYPES = {
  PREFERENCE: 'preference', // "Siempre usa viñetas y tono formal"
  CONTEXT: 'context', // "En marzo redactamos contrato con cliente X"
  CORRECTION: 'correction', // "No uses el término Y"
  VOTE: 'vote', // patrón de preferencia por tarea
  FACT: 'fact', // dato del usuario/empresa
  DOCUMENT: 'document' // fragmento de conocimiento subido
};

export class MemoryManager {
  /**
   * @param {Object} options
   * @param {{get:Function, set:Function}} options.store - Almacén k/v async
   * @param {import('./embeddings.js').EmbeddingService} [options.embeddings]
   * @param {Function} [options.getConfig] - () => Promise<config>
   */
  constructor(options) {
    this.store = options.store;
    this.embeddings = options.embeddings || defaultEmbeddings;
    this.getConfig = options.getConfig || (async () => ({}));
    /** @type {import('./vector-store.js').VectorStore|null} */
    this.vectorStore = null;
    this._backendKey = null;
  }

  /**
   * Resuelve/instancia el vector store según la configuración vigente.
   * Reconstruye si cambió el backend.
   * @returns {Promise<import('./vector-store.js').VectorStore>}
   */
  async _getStore() {
    const config = (await this.getConfig()) || {};
    const vdb = config.vectorDB || { enabled: false, provider: 'local' };
    const key = JSON.stringify(vdb);
    if (this.vectorStore && key === this._backendKey) return this.vectorStore;

    this._backendKey = key;
    if (vdb.enabled && vdb.provider === 'weaviate') {
      this.vectorStore = new WeaviateStore({
        endpoint: vdb.endpoint || 'http://localhost:8080'
      });
      logger.info('Backend de memoria: Weaviate');
    } else if (vdb.enabled && vdb.provider === 'pinecone') {
      this.vectorStore = new PineconeStore({
        apiKey: vdb.apiKey,
        indexHost: vdb.indexHost,
        namespace: vdb.namespace || 'x1'
      });
      logger.info('Backend de memoria: Pinecone');
    } else {
      this.vectorStore = new LocalVectorStore({ store: this.store });
      logger.info('Backend de memoria: Local');
    }
    return this.vectorStore;
  }

  /**
   * Guarda una memoria. Si el texto es largo, lo trocea en chunks.
   * @param {Object} params
   * @param {string} params.text
   * @param {string} [params.type=MEMORY_TYPES.CONTEXT]
   * @param {string} [params.sector]
   * @param {Object} [params.metadata]
   * @returns {Promise<string[]>} ids creados
   */
  async remember({ text, type = MEMORY_TYPES.CONTEXT, sector, metadata = {} }) {
    if (!text || !text.trim()) return [];
    const store = await this._getStore();
    const anonymized = this._anonymize(text);
    const chunks = anonymized.length > 1500 ? chunkText(anonymized) : [anonymized];

    const vectors = await this.embeddings.embedBatch(chunks);
    const records = chunks.map((chunk, i) => ({
      id: ids.memory(),
      vector: vectors[i],
      text: chunk,
      metadata: { ...metadata, type, sector: sector || null },
      createdAt: new Date().toISOString(),
      uses: 0
    }));

    await store.upsert(records);
    bus.emit(EVENTS.MEMORY_WRITE, { type, count: records.length, sector });
    logger.debug(`Recordadas ${records.length} memorias (${type})`);
    return records.map((r) => r.id);
  }

  /**
   * Recupera memorias relevantes a una consulta.
   * @param {string} query
   * @param {Object} [options]
   * @param {number} [options.k=5]
   * @param {string} [options.type] - Filtrar por tipo
   * @param {string} [options.sector] - Filtrar por sector
   * @param {number} [options.minScore=0.15]
   * @returns {Promise<Array<{text:string, score:number, metadata:Object}>>}
   */
  async recall(query, options = {}) {
    if (!query || !query.trim()) return [];
    const store = await this._getStore();
    const { k = 5, type, sector, minScore = 0.15 } = options;
    const vector = await this.embeddings.embed(query);

    const filter = (record) => {
      if (type && record.metadata?.type !== type) return false;
      if (sector && record.metadata?.sector && record.metadata.sector !== sector) return false;
      return true;
    };

    const results = await store.query(vector, { k, minScore, filter });
    bus.emit(EVENTS.MEMORY_QUERY, { query: query.slice(0, 40), hits: results.length });
    return results.map((r) => ({
      id: r.item.id,
      text: r.item.text,
      score: r.score,
      metadata: r.item.metadata || {}
    }));
  }

  /**
   * Construye un bloque de contexto textual con las memorias relevantes,
   * respetando un presupuesto de tokens.
   * @param {string} query
   * @param {Object} [options]
   * @param {number} [options.maxTokens=800]
   * @param {number} [options.k=6]
   * @param {string} [options.sector]
   * @returns {Promise<{text:string, memories:Array}>}
   */
  async buildContext(query, options = {}) {
    const { maxTokens = 800, k = 6, sector } = options;
    const memories = await this.recall(query, { k, sector });
    if (!memories.length) return { text: '', memories: [] };

    const lines = [];
    let used = 0;
    for (const mem of memories) {
      const line = `- (${mem.metadata.type || 'memoria'}) ${mem.text}`;
      const cost = Math.ceil(line.length / 4);
      if (used + cost > maxTokens) break;
      lines.push(line);
      used += cost;
    }
    return {
      text: truncateToTokens(lines.join('\n'), maxTokens),
      memories
    };
  }

  /**
   * Registra un patrón de voto como memoria (para aprendizaje de preferencias).
   * @param {Object} vote - {sector, taskType, winner, reason, models}
   * @returns {Promise<string[]>}
   */
  async rememberVote(vote) {
    const text = `Para tareas de ${vote.taskType || 'general'} en el sector ${
      vote.sector || 'general'
    }, el usuario prefiere el modelo ${vote.winner}${
      vote.reason ? ` porque "${vote.reason}"` : ''
    }.`;
    return this.remember({
      text,
      type: MEMORY_TYPES.VOTE,
      sector: vote.sector,
      metadata: { winner: vote.winner, taskType: vote.taskType }
    });
  }

  /**
   * Elimina memorias por id.
   * @param {string[]} idList
   * @returns {Promise<void>}
   */
  async forget(idList) {
    const store = await this._getStore();
    await store.delete(idList);
  }

  /**
   * Borra todas las memorias.
   * @returns {Promise<void>}
   */
  async forgetAll() {
    const store = await this._getStore();
    await store.clear();
    logger.info('Toda la memoria fue borrada');
  }

  /**
   * Estadísticas de memoria.
   * @returns {Promise<{count:number, byType:Object}>}
   */
  async stats() {
    const store = await this._getStore();
    const all = await store.list();
    const byType = {};
    for (const record of all) {
      const t = record.metadata?.type || 'unknown';
      byType[t] = (byType[t] || 0) + 1;
    }
    return { count: all.length, byType };
  }

  /**
   * Anonimización ligera de PII para no almacenar datos sensibles en claro.
   * Reemplaza emails, teléfonos, tarjetas e IBAN por marcadores.
   * @param {string} text
   * @returns {string}
   * @private
   */
  _anonymize(text) {
    return text
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[EMAIL]')
      .replace(/\b(?:\+?\d{1,3}[\s-]?)?(?:\d[\s-]?){9,13}\b/g, (m) =>
        m.replace(/\d/g, '•')
      )
      .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[TARJETA]')
      .replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g, '[IBAN]');
  }
}

export default MemoryManager;
