/**
 * Operaciones vectoriales para memoria semántica.
 *
 * Todas las funciones trabajan con arrays de números (Float). Se optimiza
 * para claridad y correctitud; para catálogos pequeños/medianos (miles de
 * vectores) el rendimiento es más que suficiente en el navegador.
 */

/**
 * Producto escalar de dos vectores.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function dot(a, b) {
  let sum = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) sum += a[i] * b[i];
  return sum;
}

/**
 * Norma euclídea (L2) de un vector.
 * @param {number[]} a
 * @returns {number}
 */
export function magnitude(a) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * a[i];
  return Math.sqrt(sum);
}

/**
 * Similitud coseno entre dos vectores. Rango [-1, 1].
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function cosineSimilarity(a, b) {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dot(a, b) / (magA * magB);
}

/**
 * Distancia euclídea entre dos vectores.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function euclideanDistance(a, b) {
  let sum = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Normaliza un vector a norma unitaria (L2). Devuelve una copia.
 * @param {number[]} a
 * @returns {number[]}
 */
export function normalize(a) {
  const mag = magnitude(a);
  if (mag === 0) return a.slice();
  return a.map((x) => x / mag);
}

/**
 * Media de una lista de vectores (centroide). Todos deben tener igual dim.
 * @param {number[][]} vectors
 * @returns {number[]}
 */
export function centroid(vectors) {
  if (!vectors.length) return [];
  const dim = vectors[0].length;
  const out = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) out[i] += v[i];
  }
  return out.map((x) => x / vectors.length);
}

/**
 * Suma ponderada de vectores.
 * @param {Array<{vector:number[], weight:number}>} weighted
 * @returns {number[]}
 */
export function weightedSum(weighted) {
  if (!weighted.length) return [];
  const dim = weighted[0].vector.length;
  const out = new Array(dim).fill(0);
  for (const { vector, weight } of weighted) {
    for (let i = 0; i < dim; i++) out[i] += vector[i] * weight;
  }
  return out;
}

/**
 * Búsqueda top-K por similitud coseno contra un conjunto de vectores.
 * @param {number[]} query
 * @param {Array<{id:string, vector:number[], [key:string]:*}>} items
 * @param {Object} [options]
 * @param {number} [options.k=5]
 * @param {number} [options.minScore=0] - Umbral mínimo de similitud
 * @param {(item:Object)=>boolean} [options.filter]
 * @returns {Array<{item:Object, score:number}>}
 */
export function topKSimilar(query, items, options = {}) {
  const { k = 5, minScore = 0, filter } = options;
  const qNorm = normalize(query);
  const scored = [];
  for (const item of items) {
    if (filter && !filter(item)) continue;
    // Como qNorm está normalizado, cos = dot(qNorm, normalize(item.vector))
    const score = cosineSimilarity(qNorm, item.vector);
    if (score >= minScore) scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

/**
 * Reordena (re-rank) resultados combinando similitud con una señal adicional
 * (p.ej. recencia o número de usos). Devuelve nueva lista ordenada.
 * @param {Array<{item:Object, score:number}>} results
 * @param {(item:Object)=>number} signalFn - Devuelve un valor 0..1
 * @param {number} [alpha=0.8] - Peso de la similitud vs la señal
 * @returns {Array<{item:Object, score:number, combined:number}>}
 */
export function rerank(results, signalFn, alpha = 0.8) {
  const out = results.map((r) => ({
    ...r,
    combined: alpha * r.score + (1 - alpha) * signalFn(r.item)
  }));
  out.sort((a, b) => b.combined - a.combined);
  return out;
}

/**
 * Cuantiza un vector float a int8 para almacenamiento compacto. Devuelve el
 * vector cuantizado y la escala para reconstruir.
 * @param {number[]} vector
 * @returns {{quantized:Int8Array, scale:number}}
 */
export function quantizeInt8(vector) {
  let max = 0;
  for (const x of vector) max = Math.max(max, Math.abs(x));
  const scale = max === 0 ? 1 : max / 127;
  const quantized = new Int8Array(vector.length);
  for (let i = 0; i < vector.length; i++) {
    quantized[i] = Math.round(vector[i] / scale);
  }
  return { quantized, scale };
}

/**
 * Reconstruye un vector float desde su forma cuantizada int8.
 * @param {Int8Array|number[]} quantized
 * @param {number} scale
 * @returns {number[]}
 */
export function dequantizeInt8(quantized, scale) {
  return Array.from(quantized, (q) => q * scale);
}

export default {
  dot,
  magnitude,
  cosineSimilarity,
  euclideanDistance,
  normalize,
  centroid,
  weightedSum,
  topKSimilar,
  rerank,
  quantizeInt8,
  dequantizeInt8
};
