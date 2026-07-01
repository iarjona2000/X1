/**
 * Cachés en memoria.
 *
 * - LruCache: caché LRU con capacidad máxima y TTL opcional por entrada.
 * - memoize: envoltorio para funciones async con clave derivada de argumentos.
 * - StaleWhileRevalidate: sirve valor cacheado y refresca en segundo plano.
 */

/**
 * Caché LRU (Least Recently Used) con expiración por tiempo.
 * @template K, V
 */
export class LruCache {
  /**
   * @param {Object} [options]
   * @param {number} [options.maxSize=200] - Máximo de entradas
   * @param {number} [options.ttlMs] - Vida por defecto de cada entrada
   */
  constructor(options = {}) {
    this.maxSize = options.maxSize ?? 200;
    this.defaultTtl = options.ttlMs ?? null;
    /** @type {Map<K, {value:V, expiresAt:number|null}>} */
    this.map = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * ¿La entrada está expirada?
   * @param {{expiresAt:number|null}} entry
   * @returns {boolean}
   * @private
   */
  _expired(entry) {
    return entry.expiresAt !== null && entry.expiresAt <= Date.now();
  }

  /**
   * Obtiene un valor, refrescando su posición de recencia.
   * @param {K} key
   * @returns {V|undefined}
   */
  get(key) {
    const entry = this.map.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (this._expired(entry)) {
      this.map.delete(key);
      this.misses++;
      return undefined;
    }
    // Reinsertar para marcar como recientemente usada
    this.map.delete(key);
    this.map.set(key, entry);
    this.hits++;
    return entry.value;
  }

  /**
   * Inserta o actualiza un valor.
   * @param {K} key
   * @param {V} value
   * @param {number} [ttlMs]
   */
  set(key, value, ttlMs) {
    const ttl = ttlMs ?? this.defaultTtl;
    const expiresAt = ttl ? Date.now() + ttl : null;
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expiresAt });
    this._evictIfNeeded();
  }

  /** Elimina entradas más antiguas si se supera la capacidad. @private */
  _evictIfNeeded() {
    while (this.map.size > this.maxSize) {
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }
  }

  /** ¿Existe una clave válida (no expirada)? */
  has(key) {
    const entry = this.map.get(key);
    if (!entry) return false;
    if (this._expired(entry)) {
      this.map.delete(key);
      return false;
    }
    return true;
  }

  /** Elimina una entrada. */
  delete(key) {
    return this.map.delete(key);
  }

  /** Vacía la caché. */
  clear() {
    this.map.clear();
  }

  /** Número de entradas vivas (purga las expiradas de paso). */
  get size() {
    for (const [key, entry] of this.map) {
      if (this._expired(entry)) this.map.delete(key);
    }
    return this.map.size;
  }

  /** Estadísticas de aciertos. */
  stats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total ? this.hits / total : 0,
      size: this.size
    };
  }

  /**
   * Obtiene el valor cacheado o lo calcula con `factory` y lo guarda.
   * @param {K} key
   * @param {() => Promise<V>} factory
   * @param {number} [ttlMs]
   * @returns {Promise<V>}
   */
  async getOrSet(key, factory, ttlMs) {
    const existing = this.get(key);
    if (existing !== undefined) return existing;
    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }
}

/**
 * Genera una clave estable a partir de argumentos arbitrarios.
 * @param {...*} args
 * @returns {string}
 */
export function keyOf(...args) {
  return JSON.stringify(args, (_k, v) => {
    if (v instanceof Map) return { __map: [...v.entries()] };
    if (v instanceof Set) return { __set: [...v.values()] };
    return v;
  });
}

/**
 * Memoiza una función async. Colapsa llamadas concurrentes con la misma clave
 * en una sola promesa (evita "thundering herd").
 * @template T
 * @param {(...args:any[]) => Promise<T>} fn
 * @param {Object} [options]
 * @param {number} [options.ttlMs]
 * @param {number} [options.maxSize=100]
 * @param {(...args:any[]) => string} [options.keyFn]
 * @returns {(...args:any[]) => Promise<T>}
 */
export function memoizeAsync(fn, options = {}) {
  const cache = new LruCache({ maxSize: options.maxSize ?? 100, ttlMs: options.ttlMs });
  const inflight = new Map();
  const keyFn = options.keyFn || ((...args) => keyOf(...args));

  const memoized = async function (...args) {
    const key = keyFn(...args);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    if (inflight.has(key)) return inflight.get(key);

    const promise = Promise.resolve()
      .then(() => fn.apply(this, args))
      .then((value) => {
        cache.set(key, value);
        inflight.delete(key);
        return value;
      })
      .catch((error) => {
        inflight.delete(key);
        throw error;
      });

    inflight.set(key, promise);
    return promise;
  };
  memoized.cache = cache;
  memoized.clear = () => cache.clear();
  return memoized;
}

/**
 * Caché stale-while-revalidate: devuelve el valor cacheado inmediatamente y,
 * si está "viejo" pero no expirado, dispara un refresco en segundo plano.
 * @template V
 */
export class StaleWhileRevalidate {
  /**
   * @param {Object} options
   * @param {() => Promise<V>} options.fetcher
   * @param {number} options.freshMs - Ventana en la que el dato es "fresco"
   * @param {number} options.maxAgeMs - Edad máxima antes de forzar refetch
   */
  constructor({ fetcher, freshMs, maxAgeMs }) {
    this.fetcher = fetcher;
    this.freshMs = freshMs;
    this.maxAgeMs = maxAgeMs;
    this.value = undefined;
    this.fetchedAt = 0;
    this.refreshing = null;
  }

  /**
   * Obtiene el valor aplicando la estrategia SWR.
   * @returns {Promise<V>}
   */
  async get() {
    const age = Date.now() - this.fetchedAt;
    if (this.value !== undefined && age < this.freshMs) {
      return this.value;
    }
    if (this.value !== undefined && age < this.maxAgeMs) {
      this._refresh(); // en segundo plano
      return this.value;
    }
    return this._refresh();
  }

  /** @private */
  _refresh() {
    if (this.refreshing) return this.refreshing;
    this.refreshing = Promise.resolve()
      .then(() => this.fetcher())
      .then((value) => {
        this.value = value;
        this.fetchedAt = Date.now();
        this.refreshing = null;
        return value;
      })
      .catch((error) => {
        this.refreshing = null;
        if (this.value !== undefined) return this.value; // servir lo viejo
        throw error;
      });
    return this.refreshing;
  }

  /** Invalida el valor cacheado. */
  invalidate() {
    this.value = undefined;
    this.fetchedAt = 0;
  }
}

export default LruCache;
