/**
 * Tests de la etapa 0 — filtro de etiquetas (spec §5).
 * Incluye los cuatro tests obligatorios de la sección 5 + rendimiento a 10k.
 */

import { stage0_tagFilter, classifyStage0Outcome, STAGE0_OUTCOME, buildVaultIndex } from '../../core/orchestration/vault/stage0.js';
import { extractPromptTerms } from '../../core/orchestration/vault/terms.js';
import { createResolverConfig } from '../../core/orchestration/vault/config.js';

/** Bóveda de prueba pequeña con manifests canónicos. */
function fixtureVault() {
  return {
    notes: [
      {
        id: 'legal-contratos',
        manifest: { id: 'legal-contratos', domain: 'legal', cluster: 'clo-legal', subdomain: 'contratos', capabilities: ['revision', 'riesgo'] }
      },
      {
        id: 'finanzas-cashflow',
        manifest: { id: 'finanzas-cashflow', domain: 'finanzas', cluster: 'cfo-finanzas', subdomain: 'tesoreria', capabilities: ['presupuesto', 'runway'] }
      },
      {
        id: 'marketing-seo',
        manifest: { id: 'marketing-seo', domain: 'marketing', cluster: 'cmo-marketing', subdomain: 'seo', capabilities: ['campana', 'posicionamiento'] }
      }
    ]
  };
}

describe('stage0_tagFilter — matching por peso', () => {
  test('match exacto de capacidad puntúa alto y resuelve en etapa 0', () => {
    const terms = extractPromptTerms('haz una revision del contrato');
    const set = stage0_tagFilter(terms, fixtureVault());
    expect(set.candidates[0].id).toBe('legal-contratos');
    expect(set.candidates[0].matchedTerms).toContain('revision');

    const outcome = classifyStage0Outcome(set);
    expect(outcome.outcome).toBe(STAGE0_OUTCOME.RESOLVED);
    expect(outcome.winner.id).toBe('legal-contratos');
  });

  test('match por dominio puntúa (peso medio)', () => {
    const terms = extractPromptTerms('algo de marketing');
    const set = stage0_tagFilter(terms, fixtureVault());
    expect(set.candidates[0].id).toBe('marketing-seo');
  });
});

describe('stage0 — escaladas obligatorias (spec §5)', () => {
  test('prompt sin ningún término reconocible escala limpio, sin excepción', () => {
    const terms = extractPromptTerms('xyzzy plugh frobnicate');
    let set, outcome;
    expect(() => {
      set = stage0_tagFilter(terms, fixtureVault());
      outcome = classifyStage0Outcome(set);
    }).not.toThrow();
    expect(set.candidates.length).toBe(0);
    expect(outcome.outcome).toBe(STAGE0_OUTCOME.ESCALATE_CLUSTER);
    expect(outcome.reason).toBe('zero-match');
  });

  test('ambigüedad por exceso escala a clúster', () => {
    // umbral bajo para forzar el caso con la bóveda pequeña
    const config = createResolverConfig({ tooManyMatchesThreshold: 1 });
    // término que matchea el dominio de dos notas distintas
    const vault = {
      notes: [
        { id: 'a', manifest: { id: 'a', domain: 'legal', cluster: 'clo-legal', capabilities: ['analisis'] } },
        { id: 'b', manifest: { id: 'b', domain: 'legal', cluster: 'clo-legal', capabilities: ['analisis'] } }
      ]
    };
    const terms = extractPromptTerms('analisis');
    const set = stage0_tagFilter(terms, vault, config);
    const outcome = classifyStage0Outcome(set, config);
    expect(outcome.outcome).toBe(STAGE0_OUTCOME.ESCALATE_CLUSTER);
    expect(outcome.reason).toBe('too-many-matches');
  });

  test('empate cercano entre pocos escala a búsqueda semántica', () => {
    const vault = {
      notes: [
        { id: 'a', manifest: { id: 'a', domain: 'legal', cluster: 'clo-legal', capabilities: ['analisis'] } },
        { id: 'b', manifest: { id: 'b', domain: 'finanzas', cluster: 'cfo-finanzas', capabilities: ['analisis'] } }
      ]
    };
    const terms = extractPromptTerms('analisis');
    const set = stage0_tagFilter(terms, vault);
    const outcome = classifyStage0Outcome(set);
    expect(outcome.outcome).toBe(STAGE0_OUTCOME.ESCALATE_SEMANTIC);
    expect(outcome.reason).toBe('close-scores');
  });
});

describe('stage0 — subcadena como último recurso', () => {
  test('solo se usa subcadena si no hubo ningún match alto/medio', () => {
    // "presupuest" es subcadena de la capacidad "presupuesto" pero no match exacto
    const set = stage0_tagFilter(['presupuest'], fixtureVault());
    expect(set.usedSubstring).toBe(true);
    expect(set.candidates[0].id).toBe('finanzas-cashflow');
  });
});

describe('stage0 — rendimiento a escala (spec §5: <50ms sobre 10.000 notas)', () => {
  test('resuelve por debajo de 50ms sobre 10k notas', () => {
    const notes = [];
    for (let i = 0; i < 10000; i++) {
      notes.push({
        id: `n${i}`,
        manifest: {
          id: `n${i}`,
          domain: i % 2 ? 'legal' : 'finanzas',
          cluster: i % 2 ? 'clo-legal' : 'cfo-finanzas',
          capabilities: ['revision', 'riesgo', 'presupuesto']
        }
      });
    }
    // La indexación es coste de build (una vez), no de consulta — se precomputa
    // fuera del cronómetro, tal como exige el diseño en cascada (spec §5/§7).
    const index = buildVaultIndex(notes);
    const terms = extractPromptTerms('haz una revision de riesgo del contrato legal');
    const t0 = Date.now();
    const set = stage0_tagFilter(terms, index);
    const elapsed = Date.now() - t0;
    expect(set.candidates.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50);
  });
});
