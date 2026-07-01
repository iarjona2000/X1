/**
 * Generación de identificadores únicos.
 *
 * Preferimos crypto.randomUUID cuando está disponible (Chrome moderno y
 * service workers lo exponen). Se ofrecen además IDs cortos y prefijados
 * para entidades del dominio (agentes, tareas, mensajes, votos, etc.).
 */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Genera un UUID v4 estándar.
 * @returns {string}
 */
export function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback basado en getRandomValues
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versión 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

/**
 * Devuelve un array de bytes aleatorios criptográficamente seguros.
 * @param {number} n
 * @returns {Uint8Array}
 */
export function randomBytes(n) {
  const arr = new Uint8Array(n);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < n; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
}

/**
 * Genera un ID corto alfanumérico (por defecto 12 chars).
 * Útil para claves de UI y referencias legibles.
 * @param {number} [length=12]
 * @returns {string}
 */
export function shortId(length = 12) {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/**
 * Genera un ID con prefijo de entidad: `prefijo_xxxxxxxx`.
 * @param {string} prefix
 * @param {number} [length=10]
 * @returns {string}
 */
export function prefixedId(prefix, length = 10) {
  return `${prefix}_${shortId(length)}`;
}

/** Helpers específicos del dominio. */
export const ids = {
  agent: () => prefixedId('agt'),
  task: () => prefixedId('tsk'),
  message: () => prefixedId('msg'),
  vote: () => prefixedId('vote'),
  memory: () => prefixedId('mem'),
  conversation: () => prefixedId('conv'),
  run: () => prefixedId('run'),
  project: () => prefixedId('prj'),
  tool: () => prefixedId('tool'),
  request: () => prefixedId('req')
};

/**
 * ID monótono basado en tiempo + aleatorio (ordenable lexicográficamente).
 * Similar en espíritu a ULID pero simplificado.
 * @returns {string}
 */
export function timeSortableId() {
  const time = Date.now().toString(36).padStart(9, '0');
  return `${time}${shortId(8)}`;
}

export default { uuid, shortId, prefixedId, ids, randomBytes, timeSortableId };
