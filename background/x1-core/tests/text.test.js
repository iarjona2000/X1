/**
 * Tests para utilidades de texto y tokenización.
 */

import {
  estimateTokens,
  truncateToTokens,
  chunkText,
  slugify,
  stripAccents,
  parseLooseJson,
  extractCodeBlocks,
  jaccardSimilarity
} from '../src/utils/text.js';

describe('text utils', () => {
  describe('estimateTokens', () => {
    test('texto vacío => 0', () => {
      expect(estimateTokens('')).toBe(0);
    });
    test('escala con la longitud', () => {
      const corto = estimateTokens('hola mundo');
      const largo = estimateTokens('hola mundo '.repeat(50));
      expect(largo).toBeGreaterThan(corto);
    });
  });

  describe('truncateToTokens', () => {
    test('no altera texto bajo el límite', () => {
      expect(truncateToTokens('breve', 100)).toBe('breve');
    });
    test('recorta texto largo y añade sufijo', () => {
      const long = 'palabra '.repeat(500);
      const out = truncateToTokens(long, 10);
      expect(out.length).toBeLessThan(long.length);
      expect(out.endsWith('…')).toBe(true);
    });
  });

  describe('chunkText', () => {
    test('divide texto largo en varios fragmentos', () => {
      const text = Array.from({ length: 20 }, (_, i) => `Párrafo ${i} con bastante contenido para ocupar espacio.`).join('\n\n');
      const chunks = chunkText(text, { chunkTokens: 60, overlapTokens: 0 });
      expect(chunks.length).toBeGreaterThan(1);
    });
    test('texto vacío => []', () => {
      expect(chunkText('')).toEqual([]);
    });
  });

  describe('stripAccents / slugify', () => {
    test('elimina diacríticos', () => {
      expect(stripAccents('áéíóúñ')).toBe('aeioun');
    });
    test('slug seguro', () => {
      expect(slugify('Hólá Múndo 123!')).toBe('hola-mundo-123');
    });
  });

  describe('parseLooseJson', () => {
    test('json directo', () => {
      expect(parseLooseJson('{"a":1}')).toEqual({ a: 1 });
    });
    test('json en bloque markdown', () => {
      expect(parseLooseJson('Aquí tienes:\n```json\n{"b":2}\n```')).toEqual({ b: 2 });
    });
    test('json embebido en texto', () => {
      expect(parseLooseJson('respuesta: {"c":3} fin')).toEqual({ c: 3 });
    });
    test('sin json => null', () => {
      expect(parseLooseJson('no hay json aquí')).toBeNull();
    });
  });

  describe('extractCodeBlocks', () => {
    test('extrae bloques con lenguaje', () => {
      const blocks = extractCodeBlocks('```js\nconst x=1;\n```');
      expect(blocks).toHaveLength(1);
      expect(blocks[0].lang).toBe('js');
      expect(blocks[0].code).toContain('const x=1;');
    });
  });

  describe('jaccardSimilarity', () => {
    test('textos idénticos => 1', () => {
      expect(jaccardSimilarity('hola mundo', 'hola mundo')).toBe(1);
    });
    test('sin solapamiento => 0', () => {
      expect(jaccardSimilarity('gato perro', 'coche avión')).toBe(0);
    });
    test('solapamiento parcial entre 0 y 1', () => {
      const s = jaccardSimilarity('el gato negro', 'el gato blanco');
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThan(1);
    });
  });
});
