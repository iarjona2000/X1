/**
 * Tests para la matemática de vectores de memoria semántica.
 */

import {
  dot,
  magnitude,
  cosineSimilarity,
  euclideanDistance,
  normalize,
  centroid,
  topKSimilar,
  quantizeInt8,
  dequantizeInt8
} from '../src/core/memory/vector-math.js';

describe('vector-math', () => {
  describe('dot / magnitude', () => {
    test('producto escalar correcto', () => {
      expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
    });
    test('magnitud euclídea', () => {
      expect(magnitude([3, 4])).toBe(5);
    });
  });

  describe('cosineSimilarity', () => {
    test('vectores idénticos => 1', () => {
      expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
    });
    test('vectores ortogonales => 0', () => {
      expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
    });
    test('vectores opuestos => -1', () => {
      expect(cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1, 5);
    });
    test('vector cero => 0 sin dividir por cero', () => {
      expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
    });
  });

  describe('euclideanDistance', () => {
    test('distancia conocida', () => {
      expect(euclideanDistance([0, 0], [3, 4])).toBe(5);
    });
  });

  describe('normalize', () => {
    test('produce norma unitaria', () => {
      const n = normalize([3, 4]);
      expect(magnitude(n)).toBeCloseTo(1, 5);
    });
    test('vector cero se devuelve sin cambios', () => {
      expect(normalize([0, 0])).toEqual([0, 0]);
    });
  });

  describe('centroid', () => {
    test('media de vectores', () => {
      expect(centroid([[0, 0], [2, 2], [4, 4]])).toEqual([2, 2]);
    });
  });

  describe('topKSimilar', () => {
    const items = [
      { id: 'a', vector: [1, 0, 0] },
      { id: 'b', vector: [0, 1, 0] },
      { id: 'c', vector: [0.9, 0.1, 0] }
    ];
    test('devuelve los más similares ordenados', () => {
      const res = topKSimilar([1, 0, 0], items, { k: 2 });
      expect(res[0].item.id).toBe('a');
      expect(res[1].item.id).toBe('c');
    });
    test('respeta minScore', () => {
      const res = topKSimilar([0, 1, 0], items, { k: 3, minScore: 0.99 });
      expect(res.every((r) => r.score >= 0.99)).toBe(true);
    });
    test('aplica filtro', () => {
      const res = topKSimilar([1, 0, 0], items, { k: 3, filter: (i) => i.id !== 'a' });
      expect(res.find((r) => r.item.id === 'a')).toBeUndefined();
    });
  });

  describe('cuantización int8', () => {
    test('round-trip preserva aproximadamente el vector', () => {
      const original = [0.5, -0.25, 1.0, -1.0, 0.1];
      const { quantized, scale } = quantizeInt8(original);
      const restored = dequantizeInt8(quantized, scale);
      restored.forEach((v, i) => expect(v).toBeCloseTo(original[i], 1));
    });
  });
});
