/**
 * Test de punta a punta del orquestador resolveAgentsForPrompt (spec §3, §16).
 * Es el criterio de aceptación central: el embudo entero, integrado.
 */

import { resolveAgentsForPrompt } from '../../core/orchestration/vault/resolver.js';
import { buildVaultIndex } from '../../core/orchestration/vault/stage0.js';
import { indexVaultEmbeddings } from '../../core/orchestration/vault/stage2.js';
import { ResolvedPlanCache } from '../../core/orchestration/vault/plan-cache.js';
import { createResolutionLogger } from '../../core/orchestration/vault/logging.js';
import { EmbeddingService } from '../../core/memory/embeddings.js';

function rawNotes() {
  return [
    // Ambas notas legales comparten la MISMA capacidad genérica 'revision' y
    // subdominios que no aparecen en el prompt → empatan en etapa 0, forzando
    // el desempate por embeddings (etapa 2) según el contenido del cuerpo.
    { id: 'legal-contratos', manifest: { id: 'legal-contratos', domain: 'legal', cluster: 'clo-legal', subdomain: 'documentos', capabilities: ['revision'], integration_level: 1, integration_ref: 'opencontracts-mcp' }, body: 'Revisa contratos, extrae clausulas y detecta riesgos legales.' },
    { id: 'legal-litigio', manifest: { id: 'legal-litigio', domain: 'legal', cluster: 'clo-legal', subdomain: 'procesal', capabilities: ['revision'], integration_level: 2, integration_ref: 'litig-api' }, body: 'Prepara litigios, demandas y estrategia en tribunales.' },
    { id: 'fin-presupuesto', manifest: { id: 'fin-presupuesto', domain: 'finanzas', cluster: 'cfo-finanzas', subdomain: 'tesoreria', capabilities: ['presupuesto'], integration_level: 2, integration_ref: 'cfo-api' }, body: 'Planifica presupuesto, runway y flujo de caja.' },
    { id: 'mkt-seo', manifest: { id: 'mkt-seo', domain: 'marketing', cluster: 'cmo-marketing', subdomain: 'seo', capabilities: ['posicionamiento'], integration_level: 4, integration_ref: 'seo-plugin' }, body: 'Optimiza SEO y posicionamiento en buscadores.' }
  ];
}

async function makeDeps() {
  const notes = rawNotes();
  const svc = new EmbeddingService();
  const vectors = (await indexVaultEmbeddings(notes, svc)).vectors;
  return {
    vault: buildVaultIndex(notes),
    vectors,
    embeddingService: svc,
    cache: new ResolvedPlanCache(),
    logger: createResolutionLogger()
  };
}

describe('resolveAgentsForPrompt — contrato de salida (§3/§16)', () => {
  test('siempre devuelve un ResolvedPlan estructuralmente válido', async () => {
    const deps = await makeDeps();
    const plan = await resolveAgentsForPrompt('cualquier cosa', deps);
    expect(Array.isArray(plan.agents)).toBe(true);
    expect(typeof plan.totalLatencyMs).toBe('number');
    expect(Array.isArray(plan.stagesInvoked)).toBe(true);
    expect(typeof plan.fromCache).toBe('boolean');
  });

  test('nunca lanza, ni con entrada vacía o basura', async () => {
    const deps = await makeDeps();
    await expect(resolveAgentsForPrompt('', deps)).resolves.toBeDefined();
    await expect(resolveAgentsForPrompt(null, deps)).resolves.toBeDefined();
  });
});

describe('resolveAgentsForPrompt — recorte progresivo por etapas', () => {
  test('resuelve en etapa 0 cuando hay ganador claro por etiqueta', async () => {
    const deps = await makeDeps();
    const plan = await resolveAgentsForPrompt('necesito posicionamiento SEO', deps);
    expect(plan.agents.length).toBe(1);
    expect(plan.agents[0].id).toBe('mkt-seo');
    expect(plan.agents[0].resolvedByStage).toBe(0);
    expect(plan.stagesInvoked).toContain(0);
  });

  test('escala a embeddings (etapa 2) para desempatar dentro de un clúster', async () => {
    const deps = await makeDeps();
    // "revision" matchea ambas notas legales por igual en etapa 0 → empate →
    // etapa 2 desempata por contenido (contratos vs litigio).
    const plan = await resolveAgentsForPrompt('quiero una revision de contratos y sus clausulas', deps);
    expect(plan.agents.length).toBe(1);
    expect(plan.agents[0].id).toBe('legal-contratos');
    expect(plan.stagesInvoked).toContain(2);
  });

  test('devuelve el ResolvedAgent con los datos de integración del manifest', async () => {
    const deps = await makeDeps();
    const plan = await resolveAgentsForPrompt('posicionamiento SEO', deps);
    const a = plan.agents[0];
    expect(a.integrationLevel).toBe(4);
    expect(a.integrationRef).toBe('seo-plugin');
    expect(a.domain).toBe('marketing');
    expect(a.confidence).toBeGreaterThan(0);
  });
});

describe('resolveAgentsForPrompt — multi-clúster (coordinación)', () => {
  test('un prompt que cruza legal + finanzas produce 2 agentes + coordinationGraph', async () => {
    const deps = await makeDeps();
    const plan = await resolveAgentsForPrompt('haz una revision del contrato y dame el presupuesto', deps);
    expect(plan.agents.length).toBeGreaterThanOrEqual(2);
    expect(plan.executionMode === 'sequential' || plan.executionMode === 'parallel-then-merge').toBe(true);
    expect(plan.coordinationGraph).toBeDefined();
    const clusters = plan.agents.map((a) => a.domain);
    expect(clusters).toContain('legal');
    expect(clusters).toContain('finanzas');
  });
});

describe('resolveAgentsForPrompt — sin especialista adecuado (§16)', () => {
  test('prompt adversarial devuelve plan válido con agents vacío, sin excepción', async () => {
    const deps = await makeDeps();
    const plan = await resolveAgentsForPrompt('xyzzy plugh frobnicate qwerty', deps);
    expect(plan.agents).toEqual([]);
    expect(plan.fromCache).toBe(false);
  });
});

describe('resolveAgentsForPrompt — caché (Ext. B)', () => {
  test('segunda llamada idéntica viene de caché', async () => {
    const deps = await makeDeps();
    const first = await resolveAgentsForPrompt('posicionamiento SEO', deps);
    expect(first.fromCache).toBe(false);
    const second = await resolveAgentsForPrompt('Posicionamiento SEO.', deps); // variante trivial
    expect(second.fromCache).toBe(true);
    expect(second.agents[0].id).toBe(first.agents[0].id);
  });
});

describe('resolveAgentsForPrompt — logging estructurado (§14)', () => {
  test('cada resolución emite una línea JSON parseable con etapas y decisión', async () => {
    const deps = await makeDeps();
    await resolveAgentsForPrompt('posicionamiento SEO', deps);
    expect(deps.logger.entries.length).toBe(1);
    const record = JSON.parse(deps.logger.entries[0]);
    expect(record.prompt).toBe('posicionamiento SEO');
    expect(Array.isArray(record.stagesInvoked)).toBe(true);
    expect(Array.isArray(record.decision)).toBe(true);
    expect(record.decision[0].id).toBe('mkt-seo');
  });
});

describe('resolveAgentsForPrompt — degradación sin embeddings (etapas 0-1)', () => {
  test('sin embeddingService el embudo sigue resolviendo con etapas 0-1', async () => {
    const deps = await makeDeps();
    delete deps.embeddingService;
    delete deps.vectors;
    const plan = await resolveAgentsForPrompt('posicionamiento SEO', deps);
    expect(plan.agents.length).toBe(1);
    expect(plan.agents[0].id).toBe('mkt-seo');
  });
});
