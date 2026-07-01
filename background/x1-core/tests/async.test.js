/**
 * Tests para primitivas asíncronas: retry, backoff, concurrencia y timeout.
 */

import {
  sleep,
  withTimeout,
  backoffDelay,
  retry,
  ConcurrencyLimiter,
  mapLimit,
  settleAll
} from '../src/utils/async.js';
import { TimeoutError, X1Error } from '../src/utils/errors.js';

describe('async utils', () => {
  describe('sleep', () => {
    test('espera aproximadamente el tiempo indicado', async () => {
      const start = Date.now();
      await sleep(50);
      expect(Date.now() - start).toBeGreaterThanOrEqual(40);
    });
  });

  describe('withTimeout', () => {
    test('resuelve si la promesa termina a tiempo', async () => {
      await expect(withTimeout(Promise.resolve('ok'), 100)).resolves.toBe('ok');
    });
    test('lanza TimeoutError si excede', async () => {
      await expect(withTimeout(sleep(200), 50)).rejects.toBeInstanceOf(TimeoutError);
    });
  });

  describe('backoffDelay', () => {
    test('crece con el intento', () => {
      const d0 = backoffDelay(0, { jitter: false });
      const d2 = backoffDelay(2, { jitter: false });
      expect(d2).toBeGreaterThan(d0);
    });
    test('respeta el máximo', () => {
      expect(backoffDelay(20, { jitter: false, maxMs: 5000 })).toBeLessThanOrEqual(5000);
    });
  });

  describe('retry', () => {
    test('reintenta hasta tener éxito', async () => {
      let attempts = 0;
      const result = await retry(
        async () => {
          attempts++;
          if (attempts < 3) throw new X1Error('fallo', { retryable: true });
          return 'éxito';
        },
        { retries: 5, baseMs: 1 }
      );
      expect(result).toBe('éxito');
      expect(attempts).toBe(3);
    });
    test('no reintenta errores no reintentables', async () => {
      let attempts = 0;
      await expect(
        retry(
          async () => {
            attempts++;
            throw new X1Error('fatal', { retryable: false });
          },
          { retries: 5, baseMs: 1 }
        )
      ).rejects.toThrow('fatal');
      expect(attempts).toBe(1);
    });
  });

  describe('ConcurrencyLimiter', () => {
    test('no excede el límite de concurrencia', async () => {
      const limiter = new ConcurrencyLimiter(2);
      let active = 0;
      let maxActive = 0;
      const task = () => async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await sleep(10);
        active--;
        return true;
      };
      await limiter.all([task(), task(), task(), task(), task()]);
      expect(maxActive).toBeLessThanOrEqual(2);
    });
  });

  describe('mapLimit', () => {
    test('preserva el orden de entrada', async () => {
      const result = await mapLimit([1, 2, 3, 4], async (n) => n * 2, 2);
      expect(result).toEqual([2, 4, 6, 8]);
    });
  });

  describe('settleAll', () => {
    test('agrupa éxitos y errores', async () => {
      const { ok, errors } = await settleAll([
        Promise.resolve('a'),
        Promise.reject(new Error('x')),
        Promise.resolve('b')
      ]);
      expect(ok).toEqual(['a', 'b']);
      expect(errors).toHaveLength(1);
    });
  });
});
