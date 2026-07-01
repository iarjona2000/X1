/**
 * Tests para limitadores de tasa.
 */

import {
  TokenBucket,
  SlidingWindowCounter,
  DailyQuota
} from '../src/utils/rate-limiter.js';
import { RateLimitError } from '../src/utils/errors.js';

describe('TokenBucket', () => {
  test('permite hasta agotar capacidad', () => {
    const bucket = new TokenBucket({ capacity: 3, refillPerSec: 0 });
    expect(bucket.tryRemove()).toBe(true);
    expect(bucket.tryRemove()).toBe(true);
    expect(bucket.tryRemove()).toBe(true);
    expect(bucket.tryRemove()).toBe(false);
  });

  test('repone tokens con el tiempo', async () => {
    const bucket = new TokenBucket({ capacity: 1, refillPerSec: 100 });
    expect(bucket.tryRemove()).toBe(true);
    expect(bucket.tryRemove()).toBe(false);
    await new Promise((r) => setTimeout(r, 30));
    expect(bucket.tryRemove()).toBe(true);
  });
});

describe('SlidingWindowCounter', () => {
  test('limita hits dentro de la ventana', () => {
    const counter = new SlidingWindowCounter({ limit: 2, windowMs: 1000 });
    expect(counter.tryHit()).toBe(true);
    expect(counter.tryHit()).toBe(true);
    expect(counter.tryHit()).toBe(false);
  });

  test('hitOrThrow lanza RateLimitError', () => {
    const counter = new SlidingWindowCounter({ limit: 1, windowMs: 1000 });
    counter.hitOrThrow();
    expect(() => counter.hitOrThrow()).toThrow(RateLimitError);
  });

  test('remaining refleja huecos disponibles', () => {
    const counter = new SlidingWindowCounter({ limit: 3, windowMs: 1000 });
    counter.tryHit();
    expect(counter.remaining()).toBe(2);
  });
});

describe('DailyQuota', () => {
  function makeStore() {
    const data = {};
    return {
      get: async (k) => data[k],
      set: async (k, v) => {
        data[k] = v;
      }
    };
  }

  test('consume hasta el límite diario', async () => {
    const quota = new DailyQuota({ store: makeStore(), key: 'q', limit: 2 });
    expect(await quota.tryConsume()).toBe(true);
    expect(await quota.tryConsume()).toBe(true);
    expect(await quota.tryConsume()).toBe(false);
  });

  test('remaining decrece', async () => {
    const quota = new DailyQuota({ store: makeStore(), key: 'q', limit: 5 });
    await quota.tryConsume();
    expect(await quota.remaining()).toBe(4);
  });

  test('consumeOrThrow lanza al agotar', async () => {
    const quota = new DailyQuota({ store: makeStore(), key: 'q', limit: 1 });
    await quota.consumeOrThrow();
    await expect(quota.consumeOrThrow()).rejects.toThrow(RateLimitError);
  });
});
