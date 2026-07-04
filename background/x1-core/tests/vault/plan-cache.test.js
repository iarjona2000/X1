/**
 * Tests de la caché de rutas resueltas (Extensión B, spec §11).
 */

import { ResolvedPlanCache, normalizePromptForCache, hashKey } from '../../core/orchestration/vault/plan-cache.js';
import { createResolverConfig } from '../../core/orchestration/vault/config.js';

function samplePlan(overrides = {}) {
  return {
    agents: [{ id: 'legal-1', version: 1 }],
    executionMode: 'single',
    totalLatencyMs: 3,
    stagesInvoked: [0],
    fromCache: false,
    ...overrides
  };
}

describe('normalizePromptForCache', () => {
  test('colapsa mayúsculas, espacios y puntuación final', () => {
    expect(normalizePromptForCache('  Revisa   este  Contrato. ')).toBe('revisa este contrato');
  });
  test('dos variantes triviales colapsan a la misma clave', () => {
    expect(hashKey(normalizePromptForCache('revisa este contrato'))).toBe(
      hashKey(normalizePromptForCache('Revisa este contrato.'))
    );
  });
});

describe('ResolvedPlanCache — get/set', () => {
  test('miss antes de poblar, hit después', () => {
    const cache = new ResolvedPlanCache();
    expect(cache.get('revisa el contrato')).toBeNull();
    cache.set('revisa el contrato', samplePlan());
    const hit = cache.get('revisa el contrato');
    expect(hit).not.toBeNull();
    expect(hit.fromCache).toBe(true);
    expect(hit.agents[0].id).toBe('legal-1');
  });

  test('variantes triviales del prompt comparten entrada', () => {
    const cache = new ResolvedPlanCache();
    cache.set('revisa este contrato', samplePlan());
    expect(cache.get('Revisa este contrato.')).not.toBeNull();
  });
});

describe('ResolvedPlanCache — invalidación por versión de manifest', () => {
  test('si cambia la versión de un agente involucrado, la entrada se invalida', () => {
    const cache = new ResolvedPlanCache();
    cache.set('revisa el contrato', samplePlan({ agents: [{ id: 'legal-1', version: 1 }] }));
    // misma versión → hit
    expect(cache.get('revisa el contrato', { 'legal-1': 1 })).not.toBeNull();
    // versión distinta → miss (invalidada)
    expect(cache.get('revisa el contrato', { 'legal-1': 2 })).toBeNull();
    // y queda purgada
    expect(cache.get('revisa el contrato', { 'legal-1': 1 })).toBeNull();
  });
});

describe('ResolvedPlanCache — desactivable por flag', () => {
  test('con cacheEnabled=false, nunca cachea ni sirve', () => {
    const cache = new ResolvedPlanCache(createResolverConfig({ cacheEnabled: false }));
    cache.set('revisa el contrato', samplePlan());
    expect(cache.get('revisa el contrato')).toBeNull();
  });
});

describe('ResolvedPlanCache — LRU / tamaño máximo', () => {
  test('respeta el tamaño máximo expulsando lo más antiguo', () => {
    const cache = new ResolvedPlanCache(createResolverConfig({ cacheMaxSize: 2 }));
    cache.set('prompt uno', samplePlan());
    cache.set('prompt dos', samplePlan());
    cache.set('prompt tres', samplePlan()); // expulsa "prompt uno"
    expect(cache.get('prompt uno')).toBeNull();
    expect(cache.get('prompt tres')).not.toBeNull();
  });
});
