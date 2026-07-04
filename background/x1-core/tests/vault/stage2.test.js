/**
 * Tests de la etapa 2 — búsqueda semántica por embeddings (spec §7).
 * Cubre AMBOS modos: proveedor real (simulado con vectores controlados) y
 * fallback determinista local (EmbeddingService sin proveedor).
 */

import {
  indexVaultEmbeddings,
  stage2_embeddingSearch,
  buildEmbeddingText,
  contentHash,
  classifyStage2Outcome,
  STAGE2_OUTCOME
} from '../../core/orchestration/vault/stage2.js';
import { EmbeddingService } from '../../core/memory/embeddings.js';
import { createResolverConfig } from '../../core/orchestration/vault/config.js';

function fixtureNotes() {
  return [
    { id: 'legal-1', manifest: { id: 'legal-1', domain: 'legal', cluster: 'clo-legal', subdomain: 'contratos', capabilities: ['revision'] }, body: 'Revisa contratos y detecta cláusulas de riesgo.' },
    { id: 'legal-2', manifest: { id: 'legal-2', domain: 'legal', cluster: 'clo-legal', subdomain: 'compliance', capabilities: ['cumplimiento-normativo'] }, body: 'Auditoría de cumplimiento normativo y GDPR.' },
    { id: 'fin-1', manifest: { id: 'fin-1', domain: 'finanzas', cluster: 'cfo-finanzas', subdomain: 'tesoreria', capabilities: ['presupuesto'] }, body: 'Planificación de presupuesto y runway financiero.' }
  ];
}

describe('buildEmbeddingText / contentHash', () => {
  test('concatena domain+subdomain+capabilities+cuerpo recortado', () => {
    const text = buildEmbeddingText(fixtureNotes()[0]);
    expect(text).toContain('legal');
    expect(text).toContain('contratos');
    expect(text).toContain('revision');
  });
  test('hash estable para el mismo contenido, distinto para otro', () => {
    const a = contentHash('hola mundo');
    expect(a).toBe(contentHash('hola mundo'));
    expect(a).not.toBe(contentHash('otro texto'));
  });
});

describe('Modo fallback determinista (EmbeddingService sin proveedor)', () => {
  test('indexa toda la bóveda y la búsqueda es determinista y coherente', async () => {
    const svc = new EmbeddingService();
    const { vectors, report } = await indexVaultEmbeddings(fixtureNotes(), svc);
    expect(report.total).toBe(3);
    expect(report.indexed).toBe(3);
    expect(vectors.size).toBe(3);

    // Buscar un prompt claramente financiero entre los 3 candidatos
    const candidateSet = { candidates: [{ id: 'legal-1' }, { id: 'legal-2' }, { id: 'fin-1' }] };
    const res = await stage2_embeddingSearch('presupuesto y runway financiero', candidateSet, {
      embeddingService: svc,
      vectors
    });
    expect(res.candidates.length).toBe(3);
    // El embedding local es léxico: el candidato financiero debe rankear primero
    expect(res.candidates[0].id).toBe('fin-1');
    expect(res.candidates.every((c) => c.resolvedByStage === 2)).toBe(true);
  });

  test('indexación idempotente: segunda pasada reutiliza vectores sin cambios', async () => {
    const svc = new EmbeddingService();
    const first = await indexVaultEmbeddings(fixtureNotes(), svc);
    const second = await indexVaultEmbeddings(fixtureNotes(), svc, undefined, { existing: first.vectors });
    expect(second.report.skipped).toBe(3);
    expect(second.report.indexed).toBe(0);
  });

  test('cambio de contenido de una nota fuerza su re-indexación', async () => {
    const svc = new EmbeddingService();
    const notes = fixtureNotes();
    const first = await indexVaultEmbeddings(notes, svc);
    notes[0].body = 'Contenido totalmente distinto sobre litigios.';
    const second = await indexVaultEmbeddings(notes, svc, undefined, { existing: first.vectors });
    expect(second.report.indexed).toBe(1);
    expect(second.report.skipped).toBe(2);
  });
});

describe('Modo proveedor real (simulado con vectores controlados)', () => {
  // Simula un EmbeddingService respaldado por un proveedor real, con vectores
  // fijos que controlamos para verificar el ranking por coseno de forma exacta.
  const vectorByText = {
    q: [1, 0, 0],
    a: [0.9, 0.1, 0],
    b: [0, 1, 0],
    c: [0, 0, 1]
  };
  const fakeProvider = {
    embed: async (text) => {
      if (text.includes('QUERY')) return vectorByText.q;
      if (text.includes('AAA')) return vectorByText.a;
      if (text.includes('BBB')) return vectorByText.b;
      return vectorByText.c;
    }
  };

  test('rankea por similitud coseno contra los vectores cacheados', async () => {
    const vectors = new Map([
      ['a', { vector: vectorByText.a }],
      ['b', { vector: vectorByText.b }],
      ['c', { vector: vectorByText.c }]
    ]);
    const candidateSet = { candidates: [{ id: 'b' }, { id: 'c' }, { id: 'a' }] };
    const res = await stage2_embeddingSearch('QUERY', candidateSet, { embeddingService: fakeProvider, vectors });
    // 'a' es el más cercano a q=[1,0,0]
    expect(res.candidates[0].id).toBe('a');
    expect(res.candidates[0].semanticScore).toBeGreaterThan(res.candidates[1].semanticScore);
  });

  test('candidato sin vector cacheado no rompe: queda al final sin rankear', async () => {
    const vectors = new Map([['a', { vector: vectorByText.a }]]);
    const candidateSet = { candidates: [{ id: 'a' }, { id: 'sin-vector' }] };
    const res = await stage2_embeddingSearch('QUERY', candidateSet, { embeddingService: fakeProvider, vectors });
    expect(res.candidates.length).toBe(2);
    expect(res.candidates[0].id).toBe('a');
    expect(res.candidates[1].id).toBe('sin-vector');
  });
});

describe('classifyStage2Outcome — escalada a panel por empate', () => {
  test('ganador claro resuelve sin panel', () => {
    const set = { candidates: [{ id: 'a', semanticScore: 0.9 }, { id: 'b', semanticScore: 0.4 }] };
    const out = classifyStage2Outcome(set);
    expect(out.outcome).toBe(STAGE2_OUTCOME.RESOLVED);
    expect(out.winner.id).toBe('a');
  });

  test('empate cercano escala a panel con como mucho 4 candidatos', () => {
    const config = createResolverConfig({ stage2TieMargin: 0.1 });
    const set = {
      candidates: [
        { id: 'a', semanticScore: 0.90 },
        { id: 'b', semanticScore: 0.88 },
        { id: 'c', semanticScore: 0.87 },
        { id: 'd', semanticScore: 0.865 },
        { id: 'e', semanticScore: 0.86 }
      ]
    };
    const out = classifyStage2Outcome(set, config);
    expect(out.outcome).toBe(STAGE2_OUTCOME.ESCALATE_PANEL);
    expect(out.tied.length).toBeLessThanOrEqual(4);
  });
});
