/**
 * Tests del módulo de migración de la bóveda (spec §12), dry-run.
 */

import { parseFrontmatter, inferManifest, normalizeLevel, planMigration } from '../../scripts/migrate-vault.cjs';

describe('parseFrontmatter', () => {
  test('parsea escalares y arrays con comillas', () => {
    const fm = parseFrontmatter('---\ndominio: cto\ncapacidades: [edita-codigo, "hace-commits"]\nnivel_integracion: api-selfhosted\n---\n# body');
    expect(fm.dominio).toBe('cto');
    expect(fm.capacidades).toEqual(['edita-codigo', 'hace-commits']);
    expect(fm.nivel_integracion).toBe('api-selfhosted');
  });
  test('sin front-matter devuelve objeto vacío', () => {
    expect(parseFrontmatter('# solo cuerpo')).toEqual({});
  });
});

describe('normalizeLevel', () => {
  test('mapea enums string y enteros', () => {
    expect(normalizeLevel('mcp')).toBe(1);
    expect(normalizeLevel('api-selfhosted')).toBe(2);
    expect(normalizeLevel('prompt-import')).toBe(4);
    expect(normalizeLevel(3)).toBe(3);
    expect(normalizeLevel('desconocido')).toBeNull();
  });
});

describe('inferManifest', () => {
  test('infiere cluster desde la carpeta y mapea campos ES', () => {
    const fm = { dominio: 'cto', subdominio: 'Código', capacidades: ['edita-codigo'], nivel_integracion: 'api-selfhosted' };
    const man = inferManifest(fm, { id: 'aider', folder: 'Agentes-CTO-Tecnico' });
    expect(man.cluster).toBe('cto-tecnico');
    expect(man.domain).toBe('cto');
    expect(man.integration_level).toBe(2);
    expect(man.capabilities).toEqual(['edita-codigo']);
  });
  test('deriva nivel desde el tag nivel-N si falta el campo', () => {
    const fm = { tags: ['agente', 'nivel-1'], dominio: 'conectores' };
    const man = inferManifest(fm, { id: 'slack', folder: 'Agentes-Conectores' });
    expect(man.integration_level).toBe(1);
  });
});

describe('planMigration', () => {
  test('nota completa queda lista; nota sin integration_ref queda pendiente', () => {
    const notes = [
      { id: 'completa', folder: 'Agentes-CTO-Tecnico', path: 'x', fm: { dominio: 'cto', capacidades: ['edita-codigo'], nivel_integracion: 'api-selfhosted', integration_ref: 'aider-cli' } },
      { id: 'incompleta', folder: 'Agentes-CTO-Tecnico', path: 'y', fm: { dominio: 'cto', capacidades: ['x'], nivel_integracion: 'api-selfhosted' } }
    ];
    const plan = planMigration(notes);
    expect(plan.ready.map((r) => r.note.id)).toContain('completa');
    expect(plan.pending.map((p) => p.note.id)).toContain('incompleta');
    expect(plan.pending[0].reasons.join(' ')).toMatch(/integration_ref/);
  });

  test('detecta ids duplicados', () => {
    const notes = [
      { id: 'dup', folder: 'Agentes-CTO-Tecnico', path: 'a', fm: { dominio: 'cto', capacidades: ['x'], nivel_integracion: 'mcp', integration_ref: 'r' } },
      { id: 'dup', folder: 'Agentes-CTO-Tecnico', path: 'b', fm: { dominio: 'cto', capacidades: ['x'], nivel_integracion: 'mcp', integration_ref: 'r' } }
    ];
    const plan = planMigration(notes);
    expect(plan.pending.some((p) => p.reasons.join(' ').includes('duplicado'))).toBe(true);
  });
});
