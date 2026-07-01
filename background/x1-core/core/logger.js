/**
 * Sistema de logging para debugging
 */

export class Logger {
  constructor(module = 'X1') {
    this.module = module;
    this.isDev = true; // Cambiar a false en producción
  }

  log(message, data) {
    if (this.isDev) {
      console.log(`[${this.module}] ${message}`, data || '');
    }
  }

  debug(message, data) {
    if (this.isDev) {
      console.debug(`[${this.module}] 🐛 ${message}`, data || '');
    }
  }

  info(message, data) {
    console.info(`[${this.module}] ℹ️ ${message}`, data || '');
  }

  warn(message, data) {
    console.warn(`[${this.module}] ⚠️ ${message}`, data || '');
  }

  error(message, data) {
    console.error(`[${this.module}] ❌ ${message}`, data || '');
  }

  success(message, data) {
    console.log(`[${this.module}] ✅ ${message}`, data || '');
  }
}

export default Logger;
