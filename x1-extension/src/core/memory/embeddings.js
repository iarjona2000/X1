/**
 * Servicio de embeddings.
 *
 * Envuelve al proveedor de embeddings del registry, añadiendo:
 *  - Caché LRU por texto (evita recomputar embeddings idénticos).
 *  - Batching y control de concurrencia.
 *  - Fallback a un embedding local determinista (hashing) cuando no hay
 *    proveedor con capacidad de embeddings configurado, para que la memoria
 *    semántica funcione en modo degradado sin claves.
 */

import { registry } from '../providers/index.js';
import { LruCache, keyOf } from '../../utils/cache.js';
import { mapLimit } from '../../utils/async.js';
import { normalize } from './vector-math.js';
import Logger from '../logger.js';

const logger = new Logger('Embeddings');

/** Dimensión del embedding local de fallback. */
const LOCAL_DIM = 256;

export class EmbeddingService {
  /**
   * @param {Object} [options]
   * @param {string} [options.preferredProvider]
   * @param {number} [options.cacheSize=500]
   */
  constructor(options = {}) {
    this.preferredProvider = options.preferredProvider || null;
    this.cache = new LruCache({ maxSize: options.cacheSize ?? 500, ttlMs: 3600000 });
    this.dimension = null; // se fija tras el primer embedding real
  }

  /**
   * Genera el embedding de un texto (con caché).
   * @param {string} text
   * @param {Object} [options]
   * @returns {Promise<number[]>}
   */
  async embed(text, options = {}) {
    const [vector] = await this.embedBatch([text], options);
    return vector;
  }

  /**
   * Genera embeddings de un lote de textos, aprovechando la caché por texto.
   * @param {string[]} texts
   * @param {Object} [options]
   * @returns {Promise<number[][]>}
   */
  async embedBatch(texts, options = {}) {
    const results = new Array(texts.length);
    const misses = [];

    // Resolver desde caché
    texts.forEach((text, i) => {
      const cacheKey = keyOf(this.preferredProvider, text);
      const cached = this.cache.get(cacheKey);
      if (cached) results[i] = cached;
      else misses.push({ i, text, cacheKey });
    });

    if (!misses.length) return results;

    // Intentar con proveedor real; si falla, usar embedding local
    let vectors;
    try {
      vectors = await this._embedWithProvider(
        misses.map((m) => m.text),
        options
      );
    } catch (error) {
      logger.warn(`Embeddings del proveedor fallaron, usando fallback local: ${error.message}`);
      vectors = misses.map((m) => this._localEmbed(m.text));
    }

    misses.forEach((m, idx) => {
      const vector = vectors[idx];
      this.cache.set(m.cacheKey, vector);
      results[m.i] = vector;
    });

    return results;
  }

  /**
   * Llama al proveedor de embeddings del registry.
   * @param {string[]} texts
   * @param {Object} options
   * @returns {Promise<number[][]>}
   * @private
   */
  async _embedWithProvider(texts, options) {
    const provider = registry.embeddingProvider(this.preferredProvider);
    if (!provider) throw new Error('Sin proveedor de embeddings disponible');

    // Algunos proveedores no aceptan lotes grandes; troceamos en grupos de 32
    const groups = [];
    for (let i = 0; i < texts.length; i += 32) groups.push(texts.slice(i, i + 32));

    const embedded = await mapLimit(
      groups,
      (group) => provider.embed(group, options),
      2
    );
    const flat = embedded.flat();
    if (flat[0]) this.dimension = flat[0].length;
    return flat;
  }

  /**
   * Embedding local determinista basado en hashing de n-gramas de palabras.
   * No es semántico como un modelo real, pero captura solapamiento léxico y
   * permite que la memoria funcione sin conexión ni claves.
   * @param {string} text
   * @returns {number[]}
   * @private
   */
  _localEmbed(text) {
    const vector = new Array(LOCAL_DIM).fill(0);
    const tokens = (text.toLowerCase().match(/\w+/g) || []);
    // Unigramas y bigramas para algo de contexto
    const grams = [...tokens];
    for (let i = 0; i < tokens.length - 1; i++) {
      grams.push(`${tokens[i]}_${tokens[i + 1]}`);
    }
    for (const gram of grams) {
      const h = this._hash(gram);
      const idx = Math.abs(h) % LOCAL_DIM;
      const sign = h < 0 ? -1 : 1;
      vector[idx] += sign;
    }
    return normalize(vector);
  }

  /**
   * Hash entero simple (djb2) para el embedding local.
   * @param {string} str
   * @returns {number}
   * @private
   */
  _hash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash | 0;
  }

  /** Limpia la caché de embeddings. */
  clearCache() {
    this.cache.clear();
  }
}

/** Instancia compartida por defecto. */
export const embeddings = new EmbeddingService();

export default EmbeddingService;
