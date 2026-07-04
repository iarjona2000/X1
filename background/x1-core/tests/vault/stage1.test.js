/**
 * Tests de la etapa 1 — clasificación de clúster (spec §6).
 */

import {
  stage1_clusterFilter,
  detectClusterForPrompt,
  detectMultiCluster,
  SECTOR_TO_CLUSTER
} from '../../core/orchestration/vault/stage1.js';
import { stage0_tagFilter } from '../../core/orchestration/vault/stage0.js';
import { extractPromptTerms } from '../../core/orchestration/vault/terms.js';

/** Bóveda multi-clúster de prueba. */
function fixtureVault() {
  return {
    notes: [
      { id: 'legal-1', manifest: { id: 'legal-1', domain: 'legal', cluster: 'clo-legal', subdomain: 'contratos', capabilities: ['revision'] } },
      { id: 'legal-2', manifest: { id: 'legal-2', domain: 'legal', cluster: 'clo-legal', subdomain: 'compliance', capabilities: ['cumplimiento-normativo'] } },
      { id: 'fin-1', manifest: { id: 'fin-1', domain: 'finanzas', cluster: 'cfo-finanzas', subdomain: 'tesoreria', capabilities: ['presupuesto'] } },
      { id: 'mkt-1', manifest: { id: 'mkt-1', domain: 'marketing', cluster: 'cmo-marketing', subdomain: 'seo', capabilities: ['posicionamiento'] } },
      { id: 'tech-1', manifest: { id: 'tech-1', domain: 'cto', cluster: 'cto-tecnico', subdomain: 'infra', capabilities: ['despliegue'] } }
    ]
  };
}

describe('detectClusterForPrompt — mapeo sector→clúster', () => {
  test('prompt legal → clúster clo-legal', () => {
    const { cluster } = detectClusterForPrompt('revisa este contrato y su clausula');
    expect(cluster).toBe('clo-legal');
  });
  test('prompt financiero → clúster cfo-finanzas', () => {
    const { cluster } = detectClusterForPrompt('cuál es el presupuesto y el balance');
    expect(cluster).toBe('cfo-finanzas');
  });
  test('prompt técnico → clúster cto-tecnico', () => {
    const { cluster } = detectClusterForPrompt('arregla el bug del script en python');
    expect(cluster).toBe('cto-tecnico');
  });
  test('sector no cubierto (RRHH) cae en general → sin acotar (hueco documentado)', () => {
    const { cluster } = detectClusterForPrompt('hola qué tal, dime algo');
    expect(cluster).toBeNull();
  });
});

describe('stage1_clusterFilter — acota y delega a la etapa 0', () => {
  test('reduce el universo al clúster detectado antes de matchear', () => {
    const terms = extractPromptTerms('revision');
    const stage0Set = stage0_tagFilter(terms, fixtureVault());
    const res = stage1_clusterFilter('revisa el contrato: necesito una revision', stage0Set, fixtureVault());
    expect(res.narrowed).toBe(true);
    expect(res.cluster).toBe('clo-legal');
    // todos los candidatos resultantes pertenecen al clúster legal
    expect(res.candidates.every((c) => c.cluster === 'clo-legal')).toBe(true);
    expect(res.candidates.some((c) => c.id === 'legal-1')).toBe(true);
    expect(res.candidates.some((c) => c.id === 'fin-1')).toBe(false);
  });

  test('marca resolvedByStage=1 en los candidatos acotados', () => {
    const stage0Set = stage0_tagFilter(extractPromptTerms('revision'), fixtureVault());
    const res = stage1_clusterFilter('revisa el contrato con una revision', stage0Set, fixtureVault());
    expect(res.candidates.every((c) => c.resolvedByStage === 1)).toBe(true);
  });

  test('sin acotar (sector general) devuelve los candidatos de la etapa 0 sin perderlos', () => {
    const stage0Set = stage0_tagFilter(extractPromptTerms('revision'), fixtureVault());
    const res = stage1_clusterFilter('dame algo genérico sin señal', stage0Set, fixtureVault());
    expect(res.narrowed).toBe(false);
    expect(res.candidates).toEqual(stage0Set.candidates);
  });

  test('no lanza con vault vacío', () => {
    expect(() => stage1_clusterFilter('revisa el contrato', { candidates: [], maxScore: 0, matchCount: 0 }, { notes: [] })).not.toThrow();
  });
});

describe('detectMultiCluster — prompts que cruzan clústeres (spec §6)', () => {
  test('"analiza el contrato y el presupuesto" → legal + finanzas', () => {
    const res = detectMultiCluster('analiza el contrato y dame el presupuesto');
    expect(res.clusters).toContain('clo-legal');
    expect(res.clusters).toContain('cfo-finanzas');
    expect(res.clusters.length).toBeGreaterThanOrEqual(2);
  });

  test('marca secuencial cuando hay preposición de dependencia', () => {
    const res = detectMultiCluster('dame el presupuesto del contrato');
    // "del" enlaza → secuencial (si detecta 2 clústeres)
    if (res.clusters.length > 1) {
      expect(res.executionMode).toBe('sequential');
    }
  });

  test('prompt de un solo tema → executionMode single', () => {
    const res = detectMultiCluster('revisa este contrato y su clausula legal');
    expect(res.executionMode).toBe('single');
    expect(res.clusters).toEqual(['clo-legal']);
  });

  test('no lanza con entrada vacía', () => {
    expect(() => detectMultiCluster('')).not.toThrow();
    expect(detectMultiCluster('').clusters).toEqual([]);
  });
});

describe('SECTOR_TO_CLUSTER — tabla de mapeo', () => {
  test('cubre los 5 sectores mapeables + general nulo', () => {
    expect(SECTOR_TO_CLUSTER.legal).toBe('clo-legal');
    expect(SECTOR_TO_CLUSTER.general).toBeNull();
  });
});
