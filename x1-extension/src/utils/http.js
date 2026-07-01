/**
 * Cliente HTTP resiliente sobre fetch.
 *
 * Añade sobre fetch nativo:
 *  - Timeout por petición (AbortController).
 *  - Reintentos con backoff para errores 5xx / red / 429 (respetando Retry-After).
 *  - Parseo automático de JSON con detección de errores de API.
 *  - Mapeo de estados HTTP a errores tipados de X1.
 *  - Soporte de streaming (SSE y NDJSON) para respuestas incrementales.
 *  - Cancelación externa vía AbortSignal.
 */

import { retry, withTimeout, anySignal } from './async.js';
import {
  ProviderError,
  ProviderUnavailableError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  AuthError,
  NotFoundError,
  ValidationError,
  wrapError
} from './errors.js';
import Logger from '../core/logger.js';

const logger = new Logger('Http');

/**
 * Convierte una respuesta HTTP no exitosa en un error tipado.
 * @param {Response} response
 * @param {*} body - Cuerpo ya parseado (objeto o texto)
 * @param {Object} meta - {provider, url}
 * @returns {Error}
 */
function errorFromResponse(response, body, meta = {}) {
  const status = response.status;
  const message =
    (body && (body.error?.message || body.message || body.error)) ||
    `HTTP ${status} ${response.statusText}`;
  const context = { ...meta, status };

  if (status === 401 || status === 403) {
    return new AuthError(message, { context });
  }
  if (status === 404) {
    return new NotFoundError(message, { context });
  }
  if (status === 400 || status === 422) {
    return new ValidationError(message, { context });
  }
  if (status === 429) {
    const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
    return new RateLimitError(message, { context, retryAfterMs: retryAfter });
  }
  if (status >= 500) {
    return new ProviderUnavailableError(message, { context });
  }
  return new ProviderError(message, { context });
}

/**
 * Parsea la cabecera Retry-After (segundos o fecha HTTP) a milisegundos.
 * @param {string|null} value
 * @returns {number|null}
 */
export function parseRetryAfter(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

/**
 * Intenta parsear el cuerpo de una respuesta según su content-type.
 * @param {Response} response
 * @returns {Promise<*>}
 */
async function parseBody(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  return response.text();
}

/**
 * Cliente HTTP configurable.
 */
export class HttpClient {
  /**
   * @param {Object} [options]
   * @param {string} [options.baseUrl]
   * @param {Object} [options.defaultHeaders]
   * @param {number} [options.timeoutMs=30000]
   * @param {number} [options.retries=2]
   * @param {string} [options.provider] - Etiqueta para errores/logs
   */
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.defaultHeaders = options.defaultHeaders || {};
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.retries = options.retries ?? 2;
    this.provider = options.provider || null;
  }

  /**
   * Construye la URL final combinando baseUrl y path.
   * @param {string} path
   * @returns {string}
   */
  resolveUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    if (!this.baseUrl) return path;
    return `${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }

  /**
   * Petición genérica con reintentos y timeout.
   * @param {string} path
   * @param {Object} [options] - Igual que fetch + {timeoutMs, retries, provider}
   * @returns {Promise<{status:number, headers:Headers, data:*}>}
   */
  async request(path, options = {}) {
    const url = this.resolveUrl(path);
    const provider = options.provider || this.provider;
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const retries = options.retries ?? this.retries;
    const headers = { ...this.defaultHeaders, ...(options.headers || {}) };

    const doFetch = async () => {
      const controller = new AbortController();
      const signal = options.signal
        ? anySignal(options.signal, controller.signal)
        : controller.signal;

      const fetchPromise = fetch(url, { ...options, headers, signal }).catch((err) => {
        // Errores de red no producen Response
        if (err.name === 'AbortError') throw err;
        throw new NetworkError(`Fallo de red en ${url}`, {
          cause: err,
          context: { provider, url }
        });
      });

      let response;
      try {
        response = await withTimeout(fetchPromise, timeoutMs, `HTTP ${url}`);
      } catch (err) {
        controller.abort();
        if (err instanceof TimeoutError) throw err;
        throw wrapError(err, { context: { provider, url } });
      }

      const data = await parseBody(response);
      if (!response.ok) {
        throw errorFromResponse(response, data, { provider, url });
      }
      return { status: response.status, headers: response.headers, data };
    };

    return retry(doFetch, {
      retries,
      signal: options.signal,
      onRetry: ({ error, attempt, delay }) => {
        logger.warn(
          `Reintento HTTP ${attempt + 1} en ${delay}ms (${provider || 'http'}): ${error.message}`
        );
      }
    });
  }

  /**
   * GET con parseo JSON.
   * @param {string} path
   * @param {Object} [options]
   * @returns {Promise<*>}
   */
  async get(path, options = {}) {
    const res = await this.request(path, { ...options, method: 'GET' });
    return res.data;
  }

  /**
   * POST JSON con parseo JSON.
   * @param {string} path
   * @param {*} body
   * @param {Object} [options]
   * @returns {Promise<*>}
   */
  async postJson(path, body, options = {}) {
    const res = await this.request(path, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: JSON.stringify(body)
    });
    return res.data;
  }

  /**
   * PATCH JSON.
   * @param {string} path
   * @param {*} body
   * @param {Object} [options]
   * @returns {Promise<*>}
   */
  async patchJson(path, body, options = {}) {
    const res = await this.request(path, {
      ...options,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: JSON.stringify(body)
    });
    return res.data;
  }

  /**
   * PUT JSON.
   * @param {string} path
   * @param {*} body
   * @param {Object} [options]
   * @returns {Promise<*>}
   */
  async putJson(path, body, options = {}) {
    const res = await this.request(path, {
      ...options,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: JSON.stringify(body)
    });
    return res.data;
  }

  /**
   * DELETE.
   * @param {string} path
   * @param {Object} [options]
   * @returns {Promise<*>}
   */
  async delete(path, options = {}) {
    const res = await this.request(path, { ...options, method: 'DELETE' });
    return res.data;
  }

  /**
   * Stream de eventos Server-Sent Events (SSE). Invoca `onEvent` por cada
   * bloque `data:` recibido. Muchas APIs de chat (OpenAI, Groq) usan este
   * formato con `data: {json}\n\n` y `data: [DONE]` al final.
   *
   * @param {string} path
   * @param {*} body
   * @param {Object} options
   * @param {(chunk:string) => void} options.onEvent - Recibe el string tras `data: `
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<void>}
   */
  async stream(path, body, options = {}) {
    const url = this.resolveUrl(path);
    const provider = options.provider || this.provider;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...this.defaultHeaders,
      ...(options.headers || {})
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: options.signal
    }).catch((err) => {
      throw new NetworkError(`Fallo de red en stream ${url}`, {
        cause: err,
        context: { provider, url }
      });
    });

    if (!response.ok) {
      const data = await parseBody(response);
      throw errorFromResponse(response, data, { provider, url });
    }
    if (!response.body) {
      throw new ProviderError('La respuesta no soporta streaming', {
        context: { provider, url }
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Los eventos SSE se separan por doble salto de línea
        let sepIndex;
        while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + 2);
          for (const line of rawEvent.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') return;
            options.onEvent?.(payload);
          }
        }
      }
    } finally {
      reader.releaseLock?.();
    }
  }

  /**
   * Stream NDJSON (una línea JSON por chunk). Usado por Ollama.
   * @param {string} path
   * @param {*} body
   * @param {Object} options
   * @param {(obj:Object) => void} options.onEvent
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<void>}
   */
  async streamNdjson(path, body, options = {}) {
    const url = this.resolveUrl(path);
    const provider = options.provider || this.provider;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: JSON.stringify(body),
      signal: options.signal
    }).catch((err) => {
      throw new NetworkError(`Fallo de red en stream ${url}`, {
        cause: err,
        context: { provider, url }
      });
    });

    if (!response.ok || !response.body) {
      const data = await parseBody(response);
      throw errorFromResponse(response, data, { provider, url });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            options.onEvent?.(JSON.parse(line));
          } catch {
            logger.debug('Línea NDJSON no parseable ignorada');
          }
        }
      }
      if (buffer.trim()) {
        try {
          options.onEvent?.(JSON.parse(buffer.trim()));
        } catch {
          /* ignorar resto */
        }
      }
    } finally {
      reader.releaseLock?.();
    }
  }
}

/**
 * Instancia compartida sin baseUrl para peticiones puntuales.
 */
export const http = new HttpClient();

export default HttpClient;
