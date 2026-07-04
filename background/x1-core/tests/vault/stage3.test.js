/**
 * Tests de la etapa 3 — panel + juez para elegir agente (spec §8).
 */

import {
  stage3_panelJudge,
  adaptRubricToAgentSelection,
  heuristicAgentJudge,
  createDailyPanelBudget,
  STAGE3_STATUS
} from '../../core/orchestration/vault/stage3.js';

function candidates() {
  return [
    { id: 'legal-esp', manifest: { id: 'legal-esp', domain: 'legal', cluster: 'clo-legal', subdomain: 'contratos', capabilities: ['revision', 'clausulas', 'riesgo'], integration_level: 1 }, semanticScore: 0.7 },
    { id: 'legal-gen', manifest: { id: 'legal-gen', domain: 'legal', cluster: 'clo-legal', subdomain: 'general', capabilities: ['consulta'], integration_level: 4 }, semanticScore: 0.68 }
  ];
}

describe('adaptRubricToAgentSelection', () => {
  test('legal prima el match de capacidades y excluye criterios de texto', () => {
    const cr = adaptRubricToAgentSelection('legal');
    expect(cr.weights.capabilityMatch).toBeGreaterThan(cr.weights.domainMatch);
    expect(cr.excluded).toContain('structure');
  });
  test('sector desconocido devuelve rúbrica equilibrada por defecto', () => {
    const cr = adaptRubricToAgentSelection('inexistente');
    expect(cr.weights.capabilityMatch).toBeGreaterThan(0);
  });
});

describe('heuristicAgentJudge', () => {
  test('el especialista con más capacidades coincidentes puntúa más alto', () => {
    const cr = adaptRubricToAgentSelection('legal');
    const scores = heuristicAgentJudge('necesito una revision de las clausulas de riesgo', candidates(), cr);
    const esp = scores.find((s) => s.id === 'legal-esp');
    const gen = scores.find((s) => s.id === 'legal-gen');
    expect(esp.fitScore).toBeGreaterThan(gen.fitScore);
  });
});

describe('stage3_panelJudge', () => {
  test('rankea y elige al especialista (juez heurístico por defecto)', async () => {
    const res = await stage3_panelJudge('revision de clausulas de riesgo del contrato', candidates(), { sector: 'legal' });
    expect(res.status).toBe(STAGE3_STATUS.JUDGED);
    expect(res.winner.id).toBe('legal-esp');
    expect(res.ranked[0].confidence).toBeGreaterThanOrEqual(res.ranked[1].confidence);
  });

  test('usa el juez LLM inyectado cuando se proporciona', async () => {
    const judgeFn = async (prompt, cands) =>
      cands.map((c) => ({ id: c.id, fitScore: c.id === 'legal-gen' ? 1 : 0 }));
    const res = await stage3_panelJudge('lo que sea', candidates(), { sector: 'legal', judgeFn });
    expect(res.winner.id).toBe('legal-gen'); // el juez inyectado manda
  });

  test('recorta defensivamente a 4 candidatos como máximo', async () => {
    const many = [];
    for (let i = 0; i < 7; i++) many.push({ id: `a${i}`, manifest: { capabilities: ['x'] }, semanticScore: 0.5 });
    const res = await stage3_panelJudge('algo', many, {});
    expect(res.ranked.length).toBeLessThanOrEqual(4);
  });

  test('degrada con traza al agotar el presupuesto diario, sin fallar', async () => {
    const budget = createDailyPanelBudget(0); // sin presupuesto
    const res = await stage3_panelJudge('revision', candidates(), { sector: 'legal', budget });
    expect(res.status).toBe(STAGE3_STATUS.DEGRADED_BUDGET);
    // degradado = mejor por score previo (semanticScore), confianza baja
    expect(res.winner.id).toBe('legal-esp');
    expect(res.winner.confidence).toBeLessThan(0.5);
  });

  test('consume presupuesto sólo cuando efectivamente juzga', async () => {
    const budget = createDailyPanelBudget(2);
    await stage3_panelJudge('revision de clausulas', candidates(), { sector: 'legal', budget });
    expect(budget.remaining()).toBe(1);
  });

  test('si el juez LLM lanza, degrada al heurístico sin romper', async () => {
    const judgeFn = async () => { throw new Error('LLM caído'); };
    const res = await stage3_panelJudge('revision de clausulas de riesgo', candidates(), { sector: 'legal', judgeFn });
    expect(res.status).toBe(STAGE3_STATUS.JUDGED);
    expect(res.winner).not.toBeNull();
  });

  test('un solo candidato se devuelve sin panel', async () => {
    const res = await stage3_panelJudge('x', [candidates()[0]], {});
    expect(res.ranked.length).toBe(1);
    expect(res.winner.id).toBe('legal-esp');
  });
});
