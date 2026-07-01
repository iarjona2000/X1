/**
 * Validación de datos ligera, sin dependencias.
 *
 * Ofrece un mini-esquema encadenable (estilo Zod muy reducido) suficiente
 * para validar configuraciones, payloads de agentes y entradas de usuario
 * antes de persistirlas o enviarlas a APIs externas.
 */

import { ValidationError } from './errors.js';

/**
 * Resultado interno de validación.
 * @typedef {{valid:boolean, value:*, issues:Array<{path:string,message:string}>}} ValidationResult
 */

/** Clase base de esquema. */
class Schema {
  constructor() {
    this._optional = false;
    this._default = undefined;
    this._refinements = [];
  }

  /** Marca el campo como opcional. */
  optional() {
    this._optional = true;
    return this;
  }

  /** Define un valor por defecto cuando falta. */
  default(value) {
    this._default = value;
    this._optional = true;
    return this;
  }

  /**
   * Añade una validación personalizada.
   * @param {(value:*) => boolean} predicate
   * @param {string} message
   */
  refine(predicate, message) {
    this._refinements.push({ predicate, message });
    return this;
  }

  /**
   * Valida sin lanzar. Debe implementarse en subclases (via _check).
   * @param {*} value
   * @param {string} [path]
   * @returns {ValidationResult}
   */
  safeParse(value, path = '') {
    if (value === undefined || value === null) {
      if (this._default !== undefined) {
        return { valid: true, value: this._default, issues: [] };
      }
      if (this._optional) return { valid: true, value: undefined, issues: [] };
      return {
        valid: false,
        value,
        issues: [{ path: path || '(raíz)', message: 'es requerido' }]
      };
    }
    const result = this._check(value, path);
    if (!result.valid) return result;

    // Aplicar refinamientos
    for (const { predicate, message } of this._refinements) {
      if (!predicate(result.value)) {
        return {
          valid: false,
          value: result.value,
          issues: [{ path: path || '(raíz)', message }]
        };
      }
    }
    return result;
  }

  /**
   * Valida y lanza ValidationError si falla.
   * @param {*} value
   * @returns {*} valor normalizado
   */
  parse(value) {
    const result = this.safeParse(value);
    if (!result.valid) {
      throw new ValidationError('Validación fallida', { issues: result.issues });
    }
    return result.value;
  }

  /** @abstract */
  _check() {
    throw new Error('no implementado');
  }
}

class StringSchema extends Schema {
  constructor() {
    super();
    this._min = null;
    this._max = null;
    this._pattern = null;
    this._enum = null;
    this._trim = false;
  }
  min(n) {
    this._min = n;
    return this;
  }
  max(n) {
    this._max = n;
    return this;
  }
  pattern(re) {
    this._pattern = re;
    return this;
  }
  oneOf(values) {
    this._enum = values;
    return this;
  }
  trim() {
    this._trim = true;
    return this;
  }
  _check(value, path) {
    if (typeof value !== 'string') {
      return { valid: false, value, issues: [{ path, message: 'debe ser texto' }] };
    }
    let v = this._trim ? value.trim() : value;
    const issues = [];
    if (this._min !== null && v.length < this._min)
      issues.push({ path, message: `mínimo ${this._min} caracteres` });
    if (this._max !== null && v.length > this._max)
      issues.push({ path, message: `máximo ${this._max} caracteres` });
    if (this._pattern && !this._pattern.test(v))
      issues.push({ path, message: 'formato inválido' });
    if (this._enum && !this._enum.includes(v))
      issues.push({ path, message: `debe ser uno de: ${this._enum.join(', ')}` });
    return { valid: issues.length === 0, value: v, issues };
  }
}

class NumberSchema extends Schema {
  constructor() {
    super();
    this._min = null;
    this._max = null;
    this._int = false;
  }
  min(n) {
    this._min = n;
    return this;
  }
  max(n) {
    this._max = n;
    return this;
  }
  int() {
    this._int = true;
    return this;
  }
  _check(value, path) {
    const num = typeof value === 'string' ? Number(value) : value;
    const issues = [];
    if (typeof num !== 'number' || Number.isNaN(num))
      return { valid: false, value, issues: [{ path, message: 'debe ser número' }] };
    if (this._int && !Number.isInteger(num))
      issues.push({ path, message: 'debe ser entero' });
    if (this._min !== null && num < this._min)
      issues.push({ path, message: `mínimo ${this._min}` });
    if (this._max !== null && num > this._max)
      issues.push({ path, message: `máximo ${this._max}` });
    return { valid: issues.length === 0, value: num, issues };
  }
}

class BooleanSchema extends Schema {
  _check(value, path) {
    if (typeof value === 'boolean') return { valid: true, value, issues: [] };
    if (value === 'true') return { valid: true, value: true, issues: [] };
    if (value === 'false') return { valid: true, value: false, issues: [] };
    return { valid: false, value, issues: [{ path, message: 'debe ser booleano' }] };
  }
}

class ArraySchema extends Schema {
  constructor(itemSchema) {
    super();
    this._item = itemSchema;
    this._min = null;
    this._max = null;
  }
  min(n) {
    this._min = n;
    return this;
  }
  max(n) {
    this._max = n;
    return this;
  }
  _check(value, path) {
    if (!Array.isArray(value))
      return { valid: false, value, issues: [{ path, message: 'debe ser lista' }] };
    const issues = [];
    if (this._min !== null && value.length < this._min)
      issues.push({ path, message: `mínimo ${this._min} elementos` });
    if (this._max !== null && value.length > this._max)
      issues.push({ path, message: `máximo ${this._max} elementos` });
    const out = [];
    value.forEach((item, i) => {
      if (this._item) {
        const r = this._item.safeParse(item, `${path}[${i}]`);
        if (!r.valid) issues.push(...r.issues);
        else out.push(r.value);
      } else out.push(item);
    });
    return { valid: issues.length === 0, value: out, issues };
  }
}

class ObjectSchema extends Schema {
  constructor(shape) {
    super();
    this._shape = shape || {};
    this._strict = false;
  }
  strict() {
    this._strict = true;
    return this;
  }
  _check(value, path) {
    if (typeof value !== 'object' || Array.isArray(value))
      return { valid: false, value, issues: [{ path, message: 'debe ser objeto' }] };
    const issues = [];
    const out = {};
    for (const [key, schema] of Object.entries(this._shape)) {
      const childPath = path ? `${path}.${key}` : key;
      const r = schema.safeParse(value[key], childPath);
      if (!r.valid) issues.push(...r.issues);
      else if (r.value !== undefined) out[key] = r.value;
    }
    if (this._strict) {
      for (const key of Object.keys(value)) {
        if (!(key in this._shape))
          issues.push({ path: `${path}.${key}`, message: 'campo no permitido' });
      }
    } else {
      // Conservar campos extra no declarados
      for (const key of Object.keys(value)) {
        if (!(key in this._shape)) out[key] = value[key];
      }
    }
    return { valid: issues.length === 0, value: out, issues };
  }
}

/** Fábrica de esquemas (API pública). */
export const v = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  array: (item) => new ArraySchema(item),
  object: (shape) => new ObjectSchema(shape)
};

/** Validadores puntuales usados en varias partes del código. */
export const is = {
  nonEmptyString: (x) => typeof x === 'string' && x.trim().length > 0,
  email: (x) => typeof x === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x),
  url: (x) => {
    try {
      // eslint-disable-next-line no-new
      new URL(x);
      return true;
    } catch {
      return false;
    }
  },
  apiKeyLike: (x) => typeof x === 'string' && x.length >= 8,
  plainObject: (x) =>
    typeof x === 'object' && x !== null && !Array.isArray(x)
};

export default v;
