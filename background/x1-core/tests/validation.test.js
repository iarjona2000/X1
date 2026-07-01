/**
 * Tests para el mini-esquema de validación.
 */

import { v, is } from '../src/utils/validation.js';
import { ValidationError } from '../src/utils/errors.js';

describe('validation', () => {
  describe('string', () => {
    test('valida longitud mínima', () => {
      const schema = v.string().min(3);
      expect(schema.safeParse('ab').valid).toBe(false);
      expect(schema.safeParse('abc').valid).toBe(true);
    });
    test('oneOf restringe valores', () => {
      const schema = v.string().oneOf(['a', 'b']);
      expect(schema.safeParse('c').valid).toBe(false);
      expect(schema.safeParse('a').valid).toBe(true);
    });
    test('trim normaliza', () => {
      expect(v.string().trim().parse('  hola  ')).toBe('hola');
    });
  });

  describe('number', () => {
    test('coacciona strings numéricos', () => {
      expect(v.number().parse('42')).toBe(42);
    });
    test('valida rango', () => {
      const schema = v.number().min(0).max(10);
      expect(schema.safeParse(20).valid).toBe(false);
    });
    test('int rechaza decimales', () => {
      expect(v.number().int().safeParse(1.5).valid).toBe(false);
    });
  });

  describe('boolean', () => {
    test('coacciona strings', () => {
      expect(v.boolean().parse('true')).toBe(true);
      expect(v.boolean().parse('false')).toBe(false);
    });
  });

  describe('object', () => {
    test('valida forma y aplica defaults', () => {
      const schema = v.object({
        name: v.string().min(1),
        age: v.number().default(0)
      });
      const result = schema.parse({ name: 'Ana' });
      expect(result.name).toBe('Ana');
      expect(result.age).toBe(0);
    });
    test('lanza ValidationError con issues', () => {
      const schema = v.object({ name: v.string().min(1) });
      expect(() => schema.parse({})).toThrow(ValidationError);
    });
    test('strict rechaza campos extra', () => {
      const schema = v.object({ a: v.string() }).strict();
      expect(schema.safeParse({ a: 'x', b: 'y' }).valid).toBe(false);
    });
  });

  describe('array', () => {
    test('valida items', () => {
      const schema = v.array(v.number()).min(1);
      expect(schema.safeParse([1, 2, 3]).valid).toBe(true);
      expect(schema.safeParse(['x']).valid).toBe(false);
    });
  });

  describe('helpers is', () => {
    test('email', () => {
      expect(is.email('a@b.com')).toBe(true);
      expect(is.email('noesemail')).toBe(false);
    });
    test('url', () => {
      expect(is.url('https://x.com')).toBe(true);
      expect(is.url('no url')).toBe(false);
    });
    test('nonEmptyString', () => {
      expect(is.nonEmptyString('  ')).toBe(false);
      expect(is.nonEmptyString('x')).toBe(true);
    });
  });
});
