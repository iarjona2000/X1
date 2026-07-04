/**
 * Normalización léxica compartida por la extracción de términos (etapa 0) y
 * el matching del filtro de etiquetas.
 *
 * Ambos lados de una comparación (términos del prompt y campos de la nota)
 * DEBEN pasar por la misma normalización para que "revisión" matchee la
 * capacidad "revision" y "Análisis Fiscal" matchee "analisis-fiscal".
 */

/**
 * Elimina diacríticos (tildes, diéresis) de una cadena.
 * "revisión" → "revision", "código" → "codigo".
 * @param {string} str
 * @returns {string}
 */
export function foldAccents(str) {
  return String(str).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Normaliza un token: minúsculas + sin acentos.
 * @param {string} token
 * @returns {string}
 */
export function normalizeToken(token) {
  return foldAccents(String(token).toLowerCase());
}

/**
 * Stopwords en español (y algunas en inglés frecuentes en prompts mixtos).
 * Lista deliberadamente conservadora: solo palabras vacías reales, no términos
 * de dominio.
 */
export const STOPWORDS = new Set([
  // artículos, preposiciones, conjunciones ES
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'al', 'del',
  'de', 'a', 'ante', 'bajo', 'con', 'contra', 'desde', 'en', 'entre', 'hacia',
  'hasta', 'para', 'por', 'segun', 'sin', 'sobre', 'tras', 'y', 'e', 'o', 'u',
  'ni', 'que', 'se', 'su', 'sus', 'mi', 'mis', 'tu', 'tus', 'me', 'te', 'nos',
  'le', 'les', 'como', 'mas', 'pero', 'si', 'no', 'ya', 'este', 'esta', 'estos',
  'estas', 'ese', 'esa', 'esos', 'esas', 'esto', 'eso', 'es', 'son', 'ser',
  'este', 'muy', 'sus', 'ese', 'porque', 'cuando', 'donde', 'quien', 'cual',
  // verbos de petición vacíos frecuentes
  'quiero', 'necesito', 'dame', 'hazme', 'puedes', 'podrias', 'ayudame',
  'ayuda', 'por favor', 'porfavor',
  // inglés frecuente
  'the', 'a', 'an', 'of', 'to', 'for', 'and', 'or', 'with', 'my', 'me', 'i',
  'please', 'can', 'you'
]);

/**
 * ¿Es `token` una stopword?
 * @param {string} token - ya normalizado (minúsculas, sin acentos)
 * @returns {boolean}
 */
export function isStopword(token) {
  return STOPWORDS.has(token);
}

/**
 * Stemming ligero: colapsa plurales comunes en español.
 * Conservador a propósito — no toca género (-a/-o) porque cambiar género
 * genera más falsos positivos que aciertos; en su lugar el pipeline conserva
 * tanto el token original como el stem (ver `terms.js`), sin perder ninguno.
 * "revisiones" → "revision", "legales" → "legal", "datos" → "dato".
 * @param {string} token - ya normalizado
 * @returns {string}
 */
export function lightStem(token) {
  if (token.length <= 3) return token;
  // Plural -es (cubre también "-ciones"→"-cion": "revisiones"→"revision",
  // "legales"→"legal").
  if (token.endsWith('es') && token.length > 4) return token.slice(0, -2);
  // Plural -s ("datos"→"dato").
  if (token.endsWith('s') && token.length > 3) return token.slice(0, -1);
  return token;
}

/**
 * Tokeniza texto libre en tokens normalizados (minúsculas, sin acentos),
 * partiendo por cualquier carácter no alfanumérico.
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  const folded = normalizeToken(text);
  const matches = folded.match(/[a-z0-9]+/g);
  return matches || [];
}
