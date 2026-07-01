/**
 * Primitivas asíncronas reutilizables: sleep, timeout, retry con backoff,
 * limitador de concurrencia, deferred, debounce/throttle asíncronos y
 * utilidades para trabajar con AbortSignal.
 */

import { TimeoutError, AbortError, isRetryable, wrapError } from './errors.js';

/**
 * Espera `ms` milisegundos. Cancelable con AbortSignal.
 * @param {number} ms
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<void>}
 */
export function sleep(ms, { signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AbortError());
      return;
    }
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      reject(new AbortError());
    };
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Envuelve una promesa con un límite de tiempo.
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} [label]
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms, label = 'operación') {
  if (!ms || ms <= 0) return promise;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new TimeoutError(`Tiempo agotado tras ${ms}ms en ${label}`, {
          context: { timeoutMs: ms, label }
        })
      );
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Crea una promesa "deferred" con resolve/reject expuestos.
 * @template T
 * @returns {{promise: Promise<T>, resolve: (v:T)=>void, reject: (e:any)=>void}}
 */
export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Calcula el retardo de backoff exponencial con jitter.
 * @param {number} attempt - Número de intento (0-indexado)
 * @param {Object} [options]
 * @param {number} [options.baseMs=300]
 * @param {number} [options.maxMs=15000]
 * @param {number} [options.factor=2]
 * @param {boolean} [options.jitter=true]
 * @returns {number}
 */
export function backoffDelay(attempt, options = {}) {
  const { baseMs = 300, maxMs = 15000, factor = 2, jitter = true } = options;
  const raw = Math.min(maxMs, baseMs * Math.pow(factor, attempt));
  if (!jitter) return raw;
  // Full jitter: aleatorio entre 0 y raw, con un piso del 30% para no colapsar
  const floor = raw * 0.3;
  return Math.floor(floor + Math.random() * (raw - floor));
}

/**
 * Reintenta una función asíncrona con backoff exponencial.
 * @template T
 * @param {() => Promise<T>} fn - Recibe {attempt}
 * @param {Object} [options]
 * @param {number} [options.retries=3] - Número de reintentos (además del intento inicial)
 * @param {number} [options.baseMs=300]
 * @param {number} [options.maxMs=15000]
 * @param {number} [options.factor=2]
 * @param {AbortSignal} [options.signal]
 * @param {(error:any, attempt:number)=>boolean} [options.shouldRetry]
 * @param {(info:{error:any, attempt:number, delay:number})=>void} [options.onRetry]
 * @returns {Promise<T>}
 */
export async function retry(fn, options = {}) {
  const {
    retries = 3,
    baseMs = 300,
    maxMs = 15000,
    factor = 2,
    signal,
    shouldRetry = (error) => isRetryable(error),
    onRetry
  } = options;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw new AbortError();
    try {
      return await fn({ attempt });
    } catch (error) {
      lastError = wrapError(error);
      const canRetry = attempt < retries && shouldRetry(lastError, attempt);
      if (!canRetry) throw lastError;

      // Respetar Retry-After si el error lo indica
      let delay = backoffDelay(attempt, { baseMs, maxMs, factor });
      if (lastError.retryAfterMs) delay = Math.max(delay, lastError.retryAfterMs);

      if (onRetry) onRetry({ error: lastError, attempt, delay });
      await sleep(delay, { signal });
    }
  }
  throw lastError;
}

/**
 * Limitador de concurrencia. Ejecuta como máximo `limit` tareas en paralelo.
 */
export class ConcurrencyLimiter {
  /**
   * @param {number} limit
   */
  constructor(limit = 4) {
    this.limit = Math.max(1, limit);
    this.active = 0;
    this.queue = [];
  }

  /**
   * Ejecuta `fn` respetando el límite de concurrencia.
   * @template T
   * @param {() => Promise<T>} fn
   * @returns {Promise<T>}
   */
  run(fn) {
    return new Promise((resolve, reject) => {
      const task = { fn, resolve, reject };
      this.queue.push(task);
      this._drain();
    });
  }

  /**
   * Ejecuta un lote de funciones y devuelve resultados en orden.
   * @template T
   * @param {Array<() => Promise<T>>} fns
   * @returns {Promise<T[]>}
   */
  all(fns) {
    return Promise.all(fns.map((fn) => this.run(fn)));
  }

  /** @private */
  _drain() {
    while (this.active < this.limit && this.queue.length) {
      const { fn, resolve, reject } = this.queue.shift();
      this.active++;
      Promise.resolve()
        .then(fn)
        .then(resolve, reject)
        .finally(() => {
          this.active--;
          this._drain();
        });
    }
  }
}

/**
 * Ejecuta tareas con un mapeo controlado por concurrencia (como Promise.all
 * pero con límite). Preserva el orden de entrada.
 * @template I, O
 * @param {I[]} items
 * @param {(item:I, index:number) => Promise<O>} mapper
 * @param {number} [concurrency=4]
 * @returns {Promise<O[]>}
 */
export async function mapLimit(items, mapper, concurrency = 4) {
  const limiter = new ConcurrencyLimiter(concurrency);
  return limiter.all(items.map((item, index) => () => mapper(item, index)));
}

/**
 * Versión de Promise.allSettled que agrupa resultados en {ok, errors}.
 * @template T
 * @param {Array<Promise<T>>} promises
 * @returns {Promise<{ok: T[], errors: any[]}>}
 */
export async function settleAll(promises) {
  const results = await Promise.allSettled(promises);
  const ok = [];
  const errors = [];
  for (const r of results) {
    if (r.status === 'fulfilled') ok.push(r.value);
    else errors.push(r.reason);
  }
  return { ok, errors };
}

/**
 * Debounce asíncrono: agrupa llamadas y ejecuta una sola vez tras `wait` ms
 * de inactividad. Devuelve una promesa que resuelve con el último resultado.
 * @template T
 * @param {(...args:any[]) => Promise<T>} fn
 * @param {number} wait
 * @returns {(...args:any[]) => Promise<T>}
 */
export function debounceAsync(fn, wait) {
  let timer = null;
  let pending = null;
  return function (...args) {
    if (!pending) pending = deferred();
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const d = pending;
      pending = null;
      Promise.resolve()
        .then(() => fn.apply(this, args))
        .then(d.resolve, d.reject);
    }, wait);
    return pending.promise;
  };
}

/**
 * Combina múltiples AbortSignal en uno solo.
 * @param {...(AbortSignal|null|undefined)} signals
 * @returns {AbortSignal}
 */
export function anySignal(...signals) {
  const controller = new AbortController();
  const valid = signals.filter(Boolean);
  for (const signal of valid) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), {
      once: true
    });
  }
  return controller.signal;
}

/**
 * Convierte un AbortSignal en una promesa que rechaza al abortar.
 * Útil para hacer Promise.race con trabajo cancelable.
 * @param {AbortSignal} signal
 * @returns {Promise<never>}
 */
export function abortPromise(signal) {
  return new Promise((_, reject) => {
    if (signal.aborted) reject(new AbortError());
    else signal.addEventListener('abort', () => reject(new AbortError()), { once: true });
  });
}

export default {
  sleep,
  withTimeout,
  deferred,
  backoffDelay,
  retry,
  ConcurrencyLimiter,
  mapLimit,
  settleAll,
  debounceAsync,
  anySignal,
  abortPromise
};
