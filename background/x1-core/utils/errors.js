/**
 * Jerarquía de errores tipados de X1
 *
 * Todos los errores del sistema heredan de X1Error para poder distinguir
 * errores propios de excepciones nativas. Cada error transporta un `code`
 * estable (para lógica de reintentos y telemetría) y un `context` opcional
 * con metadatos que ayudan a depurar sin exponer datos sensibles.
 */

/**
 * Códigos de error estables. No cambiar los valores string: se usan en
 * decisiones de reintento, métricas y mensajes al usuario.
 */
export const ERROR_CODES = {
  UNKNOWN: 'UNKNOWN',
  CONFIG_INVALID: 'CONFIG_INVALID',
  API_KEY_MISSING: 'API_KEY_MISSING',
  API_KEY_INVALID: 'API_KEY_INVALID',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  TIMEOUT: 'TIMEOUT',
  NETWORK: 'NETWORK',
  ABORTED: 'ABORTED',
  VALIDATION: 'VALIDATION',
  STORAGE: 'STORAGE',
  CRYPTO: 'CRYPTO',
  AUTH: 'AUTH',
  PERMISSION: 'PERMISSION',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  WORKSPACE: 'WORKSPACE',
  MEMORY: 'MEMORY',
  AGENT: 'AGENT',
  ORCHESTRATION: 'ORCHESTRATION',
  TOOL: 'TOOL',
  PARSE: 'PARSE'
};

/**
 * Error base de X1.
 */
export class X1Error extends Error {
  /**
   * @param {string} message - Mensaje legible
   * @param {Object} [options]
   * @param {string} [options.code] - Código de ERROR_CODES
   * @param {Object} [options.context] - Metadatos de depuración
   * @param {Error} [options.cause] - Error original que provocó este
   * @param {boolean} [options.retryable] - Si conviene reintentar
   */
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code || ERROR_CODES.UNKNOWN;
    this.context = options.context || {};
    this.cause = options.cause || null;
    this.retryable = options.retryable === true;
    this.timestamp = new Date().toISOString();

    // Mantener la traza limpia en V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serializa el error a un objeto plano seguro para logs/telemetría.
   * No incluye la traza para evitar filtrar rutas internas en producción.
   * @param {boolean} [includeStack=false]
   * @returns {Object}
   */
  toJSON(includeStack = false) {
    const json = {
      name: this.name,
      message: this.message,
      code: this.code,
      retryable: this.retryable,
      timestamp: this.timestamp,
      context: this._sanitizeContext(this.context)
    };
    if (this.cause) {
      json.cause =
        this.cause instanceof X1Error
          ? this.cause.toJSON(includeStack)
          : { name: this.cause.name, message: this.cause.message };
    }
    if (includeStack) {
      json.stack = this.stack;
    }
    return json;
  }

  /**
   * Elimina claves potencialmente sensibles del contexto.
   * @param {Object} context
   * @returns {Object}
   * @private
   */
  _sanitizeContext(context) {
    const redactedKeys = ['apiKey', 'token', 'password', 'authorization', 'secret'];
    const clean = {};
    for (const [key, value] of Object.entries(context || {})) {
      if (redactedKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
        clean[key] = '[REDACTED]';
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }

  /**
   * Mensaje amigable para mostrar al usuario final.
   * Las subclases pueden sobreescribirlo.
   * @returns {string}
   */
  userMessage() {
    return this.message;
  }
}

/** Error de configuración inválida o incompleta. */
export class ConfigError extends X1Error {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code || ERROR_CODES.CONFIG_INVALID });
  }
  userMessage() {
    return `Configuración inválida: ${this.message}`;
  }
}

/** Falta una API key requerida. */
export class ApiKeyMissingError extends X1Error {
  constructor(provider, options = {}) {
    super(`API key no configurada para ${provider}`, {
      ...options,
      code: ERROR_CODES.API_KEY_MISSING,
      context: { ...(options.context || {}), provider }
    });
    this.provider = provider;
  }
  userMessage() {
    return `Falta la clave API de ${this.provider}. Configúrala en Ajustes.`;
  }
}

/** API key rechazada por el proveedor (401/403). */
export class ApiKeyInvalidError extends X1Error {
  constructor(provider, options = {}) {
    super(`API key inválida para ${provider}`, {
      ...options,
      code: ERROR_CODES.API_KEY_INVALID,
      context: { ...(options.context || {}), provider }
    });
    this.provider = provider;
  }
  userMessage() {
    return `La clave API de ${this.provider} fue rechazada. Verifícala en Ajustes.`;
  }
}

/** Error genérico devuelto por un proveedor de IA. */
export class ProviderError extends X1Error {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code || ERROR_CODES.PROVIDER_ERROR });
    this.provider = options.context?.provider || null;
    this.status = options.context?.status || null;
  }
  userMessage() {
    return `Error del proveedor${this.provider ? ` ${this.provider}` : ''}: ${this.message}`;
  }
}

/** El proveedor no está disponible (5xx, red, o desconectado). */
export class ProviderUnavailableError extends ProviderError {
  constructor(message, options = {}) {
    super(message, { ...options, code: ERROR_CODES.PROVIDER_UNAVAILABLE, retryable: true });
  }
}

/** Se superó el límite de peticiones (429). */
export class RateLimitError extends X1Error {
  /**
   * @param {string} message
   * @param {Object} [options]
   * @param {number} [options.retryAfterMs] - Espera sugerida por el servidor
   */
  constructor(message, options = {}) {
    super(message, { ...options, code: ERROR_CODES.RATE_LIMITED, retryable: true });
    this.retryAfterMs = options.retryAfterMs || null;
  }
  userMessage() {
    return 'Se alcanzó el límite de peticiones. Espera un momento e inténtalo de nuevo.';
  }
}

/** La operación excedió el tiempo máximo. */
export class TimeoutError extends X1Error {
  constructor(message, options = {}) {
    super(message, { ...options, code: ERROR_CODES.TIMEOUT, retryable: true });
    this.timeoutMs = options.context?.timeoutMs || null;
  }
  userMessage() {
    return 'La operación tardó demasiado. Inténtalo de nuevo.';
  }
}

/** Fallo de red a bajo nivel. */
export class NetworkError extends X1Error {
  constructor(message, options = {}) {
    super(message, { ...options, code: ERROR_CODES.NETWORK, retryable: true });
  }
  userMessage() {
    return 'Error de conexión. Comprueba tu red.';
  }
}

/** La operación fue cancelada deliberadamente (AbortController). */
export class AbortError extends X1Error {
  constructor(message = 'Operación cancelada', options = {}) {
    super(message, { ...options, code: ERROR_CODES.ABORTED, retryable: false });
  }
}

/** Error de validación de entrada. */
export class ValidationError extends X1Error {
  /**
   * @param {string} message
   * @param {Object} [options]
   * @param {Array<{path:string,message:string}>} [options.issues]
   */
  constructor(message, options = {}) {
    super(message, { ...options, code: ERROR_CODES.VALIDATION, retryable: false });
    this.issues = options.issues || [];
  }
  userMessage() {
    if (this.issues.length) {
      return `Datos inválidos: ${this.issues.map((i) => i.message).join('; ')}`;
    }
    return `Datos inválidos: ${this.message}`;
  }
}

/** Error de almacenamiento (chrome.storage). */
export class StorageError extends X1Error {
  constructor(message, options = {}) {
    super(message, { ...options, code: ERROR_CODES.STORAGE });
  }
}

/** Error de cifrado/descifrado. */
export class CryptoError extends X1Error {
  constructor(message, options = {}) {
    super(message, { ...options, code: ERROR_CODES.CRYPTO });
  }
}

/** Error de autenticación (OAuth, tokens). */
export class AuthError extends X1Error {
  constructor(message, options = {}) {
    super(message, { ...options, code: ERROR_CODES.AUTH });
  }
  userMessage() {
    return `Error de autenticación: ${this.message}`;
  }
}

/** Recurso no encontrado. */
export class NotFoundError extends X1Error {
  constructor(message, options = {}) {
    super(message, { ...options, code: ERROR_CODES.NOT_FOUND, retryable: false });
  }
}

/** Error de una herramienta ejecutada por un agente. */
export class ToolError extends X1Error {
  constructor(message, options = {}) {
    super(message, { ...options, code: ERROR_CODES.TOOL });
    this.tool = options.context?.tool || null;
  }
}

/** Error del motor de orquestación de agentes. */
export class OrchestrationError extends X1Error {
  constructor(message, options = {}) {
    super(message, { ...options, code: ERROR_CODES.ORCHESTRATION });
  }
}

/** Error del subsistema de memoria/vector store. */
export class MemoryError extends X1Error {
  constructor(message, options = {}) {
    super(message, { ...options, code: ERROR_CODES.MEMORY });
  }
}

/** Error de integración con Google Workspace. */
export class WorkspaceError extends X1Error {
  constructor(message, options = {}) {
    super(message, { ...options, code: ERROR_CODES.WORKSPACE });
    this.service = options.context?.service || null;
  }
}

/**
 * Envuelve una excepción arbitraria en un X1Error, preservando la causa.
 * Si ya es un X1Error se devuelve tal cual.
 * @param {*} error
 * @param {Object} [options]
 * @returns {X1Error}
 */
export function wrapError(error, options = {}) {
  if (error instanceof X1Error) return error;
  if (error instanceof Error) {
    // Detectar AbortError nativo del fetch
    if (error.name === 'AbortError') {
      return new AbortError(error.message, { cause: error, ...options });
    }
    return new X1Error(error.message, { ...options, cause: error });
  }
  return new X1Error(String(error), options);
}

/**
 * Determina si un error es reintentable en base a su tipo/código.
 * @param {*} error
 * @returns {boolean}
 */
export function isRetryable(error) {
  if (error instanceof X1Error) return error.retryable;
  if (error instanceof Error && error.name === 'AbortError') return false;
  return false;
}

export default X1Error;
