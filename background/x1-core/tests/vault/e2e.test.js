/**
 * Suite de integración de extremo a extremo (spec §13).
 *
 * ≥50 prompts reales cubriendo: resolución limpia en etapa 0, escalada a clúster
 * por ambigüedad, escalada a embeddings por empate, escalada a panel+juez,
 * coordinación multi-clúster, y adversariales sin encaje. Para cada uno se
 * verifica no solo que resuelve, sino la ETAPA por la que pasó — validando que
 * la cascada escala cuando debe y NO escala de más (el requisito de eficiencia
 * central de la arquitectura). Incluye un test de carga concurrente.
 */

import { resolveAgentsForPrompt } from '../../core/orchestration/vault/resolver.js';
import { buildVaultIndex } from '../../core/orchestration/vault/stage0.js';
import { indexVaultEmbeddings } from '../../core/orchestration/vault/stage2.js';
import { ResolvedPlanCache } from '../../core/orchestration/vault/plan-cache.js';
import { EmbeddingService } from '../../core/memory/embeddings.js';

// ── Construcción de una bóveda de prueba que soporta las 6 categorías ──

const UNIQUE_CAPS = [
  'scraping', 'ocr', 'transcripcion', 'despliegue', 'vectorizacion', 'razonamiento',
  'navegacion', 'segmentacion', 'clasificacion', 'resumen', 'traduccion', 'deteccion',
  'anotacion', 'orquestacion', 'monitorizacion'
];

function buildNotes() {
  const notes = [];

  // (A) 15 agentes CTO con capacidad ÚNICA → resolución limpia en etapa 0.
  UNIQUE_CAPS.forEach((cap, i) => {
    notes.push({
      id: `cto-${cap}`,
      manifest: { id: `cto-${cap}`, domain: 'cto', cluster: 'cto-tecnico', subdomain: `sub-${i}`, capabilities: [cap], integration_level: 2, integration_ref: `ref-${cap}` },
      body: `Herramienta técnica especializada en ${cap}.`
    });
  });

  // (B) Par legal con MISMA capacidad 'revision' pero cuerpos distintos →
  //     empate en etapa 0, desempate en etapa 2 (embeddings).
  notes.push({ id: 'legal-contratos', manifest: { id: 'legal-contratos', domain: 'legal', cluster: 'clo-legal', subdomain: 'documentos', capabilities: ['revision'], integration_level: 1, integration_ref: 'oc-mcp' }, body: 'Revisa contratos mercantiles, extrae clausulas y detecta riesgos de documentos.' });
  notes.push({ id: 'legal-litigio', manifest: { id: 'legal-litigio', domain: 'legal', cluster: 'clo-legal', subdomain: 'procesal', capabilities: ['revision'], integration_level: 2, integration_ref: 'lit-api' }, body: 'Revisa expedientes de litigio, demandas y estrategia procesal en tribunales.' });

  // (C) Par legal con MISMA capacidad 'auditoria' y CUERPO IDÉNTICO pero distinto
  //     nivel de integración → empate en 0 y 2, desempate en etapa 3 (panel).
  const auditBody = 'Realiza auditoria de cumplimiento y control interno.';
  notes.push({ id: 'audit-mcp', manifest: { id: 'audit-mcp', domain: 'legal', cluster: 'clo-legal', subdomain: 'audit', capabilities: ['auditoria'], integration_level: 1, integration_ref: 'audit-mcp' }, body: auditBody });
  notes.push({ id: 'audit-plugin', manifest: { id: 'audit-plugin', domain: 'legal', cluster: 'clo-legal', subdomain: 'audit', capabilities: ['auditoria'], integration_level: 4, integration_ref: 'audit-plugin' }, body: auditBody });

  // (D) Finanzas: agente con capacidad 'presupuesto' (para multi-clúster).
  notes.push({ id: 'fin-presupuesto', manifest: { id: 'fin-presupuesto', domain: 'finanzas', cluster: 'cfo-finanzas', subdomain: 'tesoreria', capabilities: ['presupuesto'], integration_level: 2, integration_ref: 'cfo-api' }, body: 'Planifica presupuesto, runway y flujo de caja.' });

  return notes;
}

let deps;
beforeAll(async () => {
  const notes = buildNotes();
  const svc = new EmbeddingService();
  const vectors = (await indexVaultEmbeddings(notes, svc)).vectors;
  deps = () => ({
    vault: buildVaultIndex(notes),
    vectors,
    embeddingService: svc,
    cache: new ResolvedPlanCache()
  });
});

// ── (1) ≥15 resolución limpia en etapa 0 ──
describe('§13 — resolución limpia en etapa 0 (≥15)', () => {
  test.each(UNIQUE_CAPS)('«%s» resuelve en etapa 0 sin escalar', async (cap) => {
    const plan = await resolveAgentsForPrompt(`necesito ${cap} para mi tarea`, deps());
    expect(plan.agents.length).toBe(1);
    expect(plan.agents[0].id).toBe(`cto-${cap}`);
    expect(plan.agents[0].resolvedByStage).toBe(0);
    expect(plan.stagesInvoked).toEqual([0]); // clave: NO escaló de más
  });
});

// ── (2) ≥10 escalada a clúster por ambigüedad (etapa 1) ──
const CLUSTER_PROMPTS = [
  'prepara una demanda judicial', 'revisa la normativa vigente', 'un litigio complejo',
  'asunto de patentes', 'clausula abusiva en el acuerdo', 'calcula el ebitda',
  'revisa el balance contable', 'el margen de beneficio', 'declara el iva',
  'una campaña de publicidad', 'diseña un anuncio de marca', 'estrategia de branding'
];
describe('§13 — escalada a clúster por ambigüedad (≥10)', () => {
  test.each(CLUSTER_PROMPTS)('«%s» invoca la etapa 1', async (prompt) => {
    const plan = await resolveAgentsForPrompt(prompt, deps());
    expect(plan.stagesInvoked).toContain(1);
  });
});

// ── (3) ≥10 escalada a embeddings por empate (etapa 2) ──
const TIE_PROMPTS = [
  'necesito una revision urgente', 'quiero una revision del asunto', 'haz una revision detallada',
  'una revision profesional', 'revision por favor', 'revision del caso',
  'revision completa', 'revision rapida', 'revision a fondo', 'revision inmediata'
];
describe('§13 — escalada a embeddings por empate (≥10)', () => {
  test.each(TIE_PROMPTS)('«%s» invoca la etapa 2', async (prompt) => {
    const plan = await resolveAgentsForPrompt(prompt, deps());
    expect(plan.stagesInvoked).toContain(2);
  });
});

// ── (4) ≥5 escalada a panel+juez (etapa 3) ──
const PANEL_PROMPTS = [
  'necesito una auditoria', 'quiero una auditoria interna', 'haz una auditoria',
  'auditoria de control', 'auditoria completa'
];
describe('§13 — escalada a panel+juez (≥5)', () => {
  test.each(PANEL_PROMPTS)('«%s» invoca la etapa 3 y resuelve el desempate', async (prompt) => {
    const plan = await resolveAgentsForPrompt(prompt, deps());
    expect(plan.stagesInvoked).toContain(3);
    // el juez heurístico prefiere el de integración más real (MCP, nivel 1)
    expect(plan.agents[0] && plan.agents[0].id).toBe('audit-mcp');
  });
});

// ── (5) ≥5 coordinación multi-clúster ──
const MULTI_PROMPTS = [
  'haz una revision del contrato y dame el presupuesto',
  'revision legal del acuerdo y el presupuesto anual',
  'necesito revision del contrato y calcular el presupuesto',
  'revision del contrato normativo y el presupuesto financiero',
  'una revision del contrato junto al presupuesto'
];
describe('§13 — coordinación multi-clúster (≥5)', () => {
  test.each(MULTI_PROMPTS)('«%s» produce ≥2 agentes con grafo de coordinación', async (prompt) => {
    const plan = await resolveAgentsForPrompt(prompt, deps());
    expect(plan.agents.length).toBeGreaterThanOrEqual(2);
    expect(plan.coordinationGraph).toBeDefined();
  });
});

// ── (6) ≥5 adversariales sin encaje ──
const ADVERSARIAL = [
  'xyzzy plugh frobnicate', 'qwerty asdf zxcv', 'lorem ipsum dolor sit',
  'blah blah blah', '12345 67890 !!!'
];
describe('§13 — adversariales sin encaje (≥5)', () => {
  test.each(ADVERSARIAL)('«%s» devuelve plan vacío válido sin excepción', async (prompt) => {
    let plan;
    await expect((async () => { plan = await resolveAgentsForPrompt(prompt, deps()); })()).resolves.toBeUndefined();
    expect(plan.agents).toEqual([]);
    expect(Array.isArray(plan.stagesInvoked)).toBe(true);
  });
});

// ── Test de carga concurrente (spec §13: sin condiciones de carrera) ──
describe('§13 — carga concurrente', () => {
  test('50 resoluciones concurrentes sobre caché+índice compartidos sin fallo', async () => {
    const shared = deps(); // caché e índice compartidos entre todas
    const prompts = [];
    for (let i = 0; i < 50; i++) prompts.push(`necesito ${UNIQUE_CAPS[i % UNIQUE_CAPS.length]} ahora`);
    const plans = await Promise.all(prompts.map((p) => resolveAgentsForPrompt(p, shared)));
    expect(plans.length).toBe(50);
    expect(plans.every((p) => Array.isArray(p.agents))).toBe(true);
    // todas las de la misma capacidad deben resolver al mismo agente (coherencia de caché)
    const forScraping = plans.filter((_, i) => prompts[i].includes('scraping'));
    expect(new Set(forScraping.map((p) => p.agents[0] && p.agents[0].id)).size).toBe(1);
  });
});
