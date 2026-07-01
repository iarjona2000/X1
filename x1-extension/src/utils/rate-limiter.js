/**
 * Limitadores de tasa.
 *
 * - TokenBucket: control de ráfagas y tasa sostenida (peticiones/seg).
 * - SlidingWindowCounter: límite por ventana temporal (p.ej. 60 req/min).
 * - DailyQuota: cuota diaria persistente (p.ej. comparaciones/día) apoyada
 *   en un almacén clave-valor asíncrono (chrome.storage vía StorageManager).
 */

import { RateLimitError } from './errors.js';
import { sleep } from './async.js';

/**
 * Token bucket clásico. Rellena `refillPerSec` tokens por segundo hasta
 * `capacity`. Cada operación consume 1 token (configurable).
 */
export class TokenBucket {
  /**
   * @param {Object} options
   * @param {number} options.capacity - Máximo de tokens acumulables
   * @param {number} options.refillPerSec - Tokens repuestos por segundo
   */
  constructor({ capacity, refillPerSec }) {
    this.capacity = capacity;
    this.refillPerSec = refillPerSec;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /** Repone tokens según el tiempo transcurrido. @private */
  _refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSec);
    this.lastRefill = now;
  }

  /**
   * Intenta consumir `cost` tokens sin esperar.
   * @param {number} [cost=1]
   * @returns {boolean} true si había tokens suficientes
   */
  tryRemove(cost = 1) {
    this._refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }

  /**
   * Milisegundos hasta disponer de `cost` tokens.
   * @param {number} [cost=1]
   * @returns {number}
   */
  msUntilAvailable(cost = 1) {
    this._refill();
    if (this.tokens >= cost) return 0;
    const deficit = cost - this.tokens;
    return Math.ceil((deficit / this.refillPerSec) * 1000);
  }

  /**
   * Espera (bloqueante async) hasta poder consumir `cost` tokens.
   * @param {number} [cost=1]
   * @param {Object} [options]
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<void>}
   */
  async remove(cost = 1, { signal } = {}) {
    for (;;) {
      if (this.tryRemove(cost)) return;
      await sleep(this.msUntilAvailable(cost), { signal });
    }
  }
}

/**
 * Contador de ventana deslizante. Mantiene marcas de tiempo de las últimas
 * operaciones y rechaza si se supera `limit` dentro de `windowMs`.
 */
export class SlidingWindowCounter {
  /**
   * @param {Object} options
   * @param {number} options.limit
   * @param {number} options.windowMs
   */
  constructor({ limit, windowMs }) {
    this.limit = limit;
    this.windowMs = windowMs;
    /** @type {number[]} */
    this.hits = [];
  }

  /** Elimina marcas fuera de la ventana. @private */
  _evict(now) {
    const threshold = now - this.windowMs;
    while (this.hits.length && this.hits[0] < threshold) this.hits.shift();
  }

  /**
   * Registra un intento si cabe en la ventana.
   * @returns {boolean}
   */
  tryHit() {
    const now = Date.now();
    this._evict(now);
    if (this.hits.length >= this.limit) return false;
    this.hits.push(now);
    return true;
  }

  /**
   * Igual que tryHit pero lanza RateLimitError si se excede.
   * @throws {RateLimitError}
   */
  hitOrThrow() {
    if (!this.tryHit()) {
      const retryAfterMs = this.msUntilNextSlot();
      throw new RateLimitError('Límite de ventana superado', { retryAfterMs });
    }
  }

  /**
   * Milisegundos hasta que se libere un hueco.
   * @returns {number}
   */
  msUntilNextSlot() {
    if (this.hits.length < this.limit) return 0;
    const now = Date.now();
    return Math.max(0, this.hits[0] + this.windowMs - now);
  }

  /** Cuántos intentos quedan en la ventana actual. */
  remaining() {
    this._evict(Date.now());
    return Math.max(0, this.limit - this.hits.length);
  }
}

/**
 * Cuota diaria persistente. Se apoya en un store con get/set asíncronos.
 * Reinicia el contador cuando cambia el día (UTC local).
 */
export class DailyQuota {
  /**
   * @param {Object} options
   * @param {{get:Function, set:Function}} options.store - Almacén k/v async
   * @param {string} options.key - Clave de almacenamiento
   * @param {number} options.limit - Máximo diario
   */
  constructor({ store, key, limit }) {
    this.store = store;
    this.key = key;
    this.limit = limit;
  }

  /** Fecha actual en formato YYYY-MM-DD. @private */
  _today() {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Lee el estado actual {date, count}.
   * @returns {Promise<{date:string, count:number}>}
   */
  async _read() {
    const raw = (await this.store.get(this.key)) || {};
    if (raw.date !== this._today()) return { date: this._today(), count: 0 };
    return { date: raw.date, count: raw.count || 0 };
  }

  /**
   * Consumo restante para hoy.
   * @returns {Promise<number>}
   */
  async remaining() {
    const state = await this._read();
    return Math.max(0, this.limit - state.count);
  }

  /**
   * Intenta consumir 1 unidad de cuota.
   * @returns {Promise<boolean>}
   */
  async tryConsume() {
    const state = await this._read();
    if (state.count >= this.limit) return false;
    state.count += 1;
    await this.store.set(this.key, state);
    return true;
  }

  /**
   * Consume o lanza RateLimitError.
   * @throws {RateLimitError}
   */
  async consumeOrThrow() {
    const ok = await this.tryConsume();
    if (!ok) {
      throw new RateLimitError(`Cuota diaria agotada (${this.limit}/día)`, {
        context: { limit: this.limit }
      });
    }
  }

  /** Reinicia manualmente la cuota. */
  async reset() {
    await this.store.set(this.key, { date: this._today(), count: 0 });
  }
}

/**
 * Registro de limitadores por proveedor. Permite compartir presupuesto de
 * peticiones entre distintas partes del sistema para un mismo proveedor.
 */
export class RateLimiterRegistry {
  constructor() {
    /** @type {Map<string, SlidingWindowCounter>} */
    this.limiters = new Map();
  }

  /**
   * Obtiene (o crea) el limitador de un proveedor.
   * @param {string} provider
   * @param {{limit:number, windowMs:number}} [config]
   * @returns {SlidingWindowCounter}
   */
  for(provider, config = { limit: 60, windowMs: 60000 }) {
    if (!this.limiters.has(provider)) {
      this.limiters.set(provider, new SlidingWindowCounter(config));
    }
    return this.limiters.get(provider);
  }
}

export const rateLimiters = new RateLimiterRegistry();

export default TokenBucket;
