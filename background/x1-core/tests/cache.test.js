/**
 * Tests para las cachés (LRU + memoize).
 */

import { LruCache, memoizeAsync, keyOf } from '../src/utils/cache.js';

describe('LruCache', () => {
  test('almacena y recupera valores', () => {
    const cache = new LruCache({ maxSize: 3 });
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('inexistente')).toBeUndefined();
  });

  test('expulsa el menos usado al superar capacidad', () => {
    const cache = new LruCache({ maxSize: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // 'a' pasa a ser el más reciente
    cache.set('c', 3); // debe expulsar 'b'
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
  });

  test('respeta TTL', async () => {
    const cache = new LruCache({ maxSize: 5, ttlMs: 20 });
    cache.set('x', 'valor');
    expect(cache.get('x')).toBe('valor');
    await new Promise((r) => setTimeout(r, 30));
    expect(cache.get('x')).toBeUndefined();
  });

  test('getOrSet calcula solo si falta', async () => {
    const cache = new LruCache();
    let calls = 0;
    const factory = async () => {
      calls++;
      return 42;
    };
    expect(await cache.getOrSet('k', factory)).toBe(42);
    expect(await cache.getOrSet('k', factory)).toBe(42);
    expect(calls).toBe(1);
  });

  test('stats reporta hit rate', () => {
    const cache = new LruCache();
    cache.set('a', 1);
    cache.get('a');
    cache.get('b');
    const stats = cache.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.5, 2);
  });
});

describe('memoizeAsync', () => {
  test('colapsa llamadas concurrentes con misma clave', async () => {
    let calls = 0;
    const fn = memoizeAsync(async (n) => {
      calls++;
      await new Promise((r) => setTimeout(r, 10));
      return n * 2;
    });
    const [a, b] = await Promise.all([fn(5), fn(5)]);
    expect(a).toBe(10);
    expect(b).toBe(10);
    expect(calls).toBe(1);
  });

  test('claves distintas se calculan por separado', async () => {
    let calls = 0;
    const fn = memoizeAsync(async (n) => {
      calls++;
      return n;
    });
    await fn(1);
    await fn(2);
    expect(calls).toBe(2);
  });
});

describe('keyOf', () => {
  test('genera clave estable para mismos argumentos', () => {
    expect(keyOf(1, 'a', { x: 1 })).toBe(keyOf(1, 'a', { x: 1 }));
  });
});
