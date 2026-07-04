/**
 * Tests del esquema de manifest + validación (spec §4).
 */

import {
  validateManifest,
  validateVaultManifests,
  normalizeFrontmatter,
  normalizeIntegrationLevel,
  INTEGRATION_LEVELS,
  CAPABILITY_RE
} from '../../core/orchestration/vault/manifest.js';

/** Manifest canónico válido de referencia. */
function validManifest(overrides = {}) {
  return {
    id: 'legal-revision-contratos',
    domain: 'legal',
    subdomain: 'contratos',
    capabilities: ['revision', 'riesgo', 'cumplimiento-normativo'],
    integration_level: 4,
    integration_ref: 'x1-legal-review',
    cluster: 'clo-legal',
    embedding_cached: false,
    embedding_last_updated: null,
    version: 1,
    ...overrides
  };
}

describe('validateManifest — happy path', () => {
  test('un manifest bien formado es válido, sin errores', () => {
    const res = validateManifest(validManifest());
    expect(res.valid).toBe(true);
    expect(res.errors).toEqual([]);
  });

  test('nivel 1 con herramienta MCP registrada es válido', () => {
    const res = validateManifest(
      validManifest({ integration_level: 1, integration_ref: 'opencontracts-mcp', domain: 'legal', cluster: 'clo-legal' }),
      { mcpTools: new Set(['opencontracts-mcp']) }
    );
    expect(res.valid).toBe(true);
  });
});

describe('validateManifest — sad path (excluye del embudo)', () => {
  test('id ausente → inválido', () => {
    const res = validateManifest(validManifest({ id: '' }));
    expect(res.valid).toBe(false);
    expect(res.errors.join(' ')).toMatch(/id/);
  });

  test('domain fuera del catálogo cerrado → inválido', () => {
    const res = validateManifest(validManifest({ domain: 'astrologia' }));
    expect(res.valid).toBe(false);
    expect(res.errors.join(' ')).toMatch(/catálogo cerrado/);
  });

  test('cluster fuera del catálogo → inválido', () => {
    const res = validateManifest(validManifest({ cluster: 'inventado' }));
    expect(res.valid).toBe(false);
  });

  test('domain que pertenece a otro clúster → inválido por incoherencia', () => {
    const res = validateManifest(validManifest({ domain: 'finanzas', cluster: 'clo-legal' }));
    expect(res.valid).toBe(false);
    expect(res.errors.join(' ')).toMatch(/pertenece al clúster/);
  });

  test('capabilities vacío → inválido', () => {
    const res = validateManifest(validManifest({ capabilities: [] }));
    expect(res.valid).toBe(false);
  });

  test('capacidad con espacios/mayúsculas → inválido', () => {
    const res = validateManifest(validManifest({ capabilities: ['Revisión Legal'] }));
    expect(res.valid).toBe(false);
  });

  test('capacidad acentuada en minúscula con guiones → válida', () => {
    expect(CAPABILITY_RE.test('análisis-fiscal')).toBe(true);
    const res = validateManifest(validManifest({ capabilities: ['análisis-fiscal'] }));
    expect(res.valid).toBe(true);
  });

  test('integration_level fuera de 1-4 → inválido', () => {
    expect(validateManifest(validManifest({ integration_level: 7 })).valid).toBe(false);
    expect(validateManifest(validManifest({ integration_level: 0 })).valid).toBe(false);
  });

  test('nivel 2 sin integration_ref → inválido', () => {
    const res = validateManifest(validManifest({ integration_level: 2, integration_ref: undefined }));
    expect(res.valid).toBe(false);
    expect(res.errors.join(' ')).toMatch(/integration_ref/);
  });

  test('nivel 1 sin lista de herramientas MCP → válido con warning (metadata incompleta tolerable)', () => {
    const res = validateManifest(validManifest({ integration_level: 1, integration_ref: 'algo-mcp' }));
    expect(res.valid).toBe(true);
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  test('nunca lanza, ni con basura de entrada', () => {
    expect(() => validateManifest(null)).not.toThrow();
    expect(() => validateManifest(undefined)).not.toThrow();
    expect(() => validateManifest(42)).not.toThrow();
    expect(validateManifest(null).valid).toBe(false);
  });
});

describe('normalizeIntegrationLevel — compat esquema de Ivan', () => {
  test('enteros 1-4 pasan tal cual', () => {
    expect(normalizeIntegrationLevel(1)).toBe(1);
    expect(normalizeIntegrationLevel(4)).toBe(4);
  });
  test('enums string de la bóveda se mapean', () => {
    expect(normalizeIntegrationLevel('mcp')).toBe(INTEGRATION_LEVELS.MCP);
    expect(normalizeIntegrationLevel('api-selfhosted')).toBe(INTEGRATION_LEVELS.API_SELFHOSTED);
    expect(normalizeIntegrationLevel('saas')).toBe(INTEGRATION_LEVELS.SAAS);
    expect(normalizeIntegrationLevel('prompt')).toBe(INTEGRATION_LEVELS.PROMPT);
    expect(normalizeIntegrationLevel('prompt-import')).toBe(4);
    expect(normalizeIntegrationLevel('rest-api-self-hosted')).toBe(2);
  });
  test('valores desconocidos → null', () => {
    expect(normalizeIntegrationLevel('carpeta')).toBeNull();
    expect(normalizeIntegrationLevel(9)).toBeNull();
  });
});

describe('normalizeFrontmatter — traduce el front-matter real de Ivan', () => {
  test('esquema en español (dominio/capacidades/nivel_integracion) → canónico', () => {
    // Basado en vault/Agentes-CTO-Tecnico/Aider.md real
    const fm = {
      dominio: 'cto',
      subdominio: 'Asistentes de código',
      capacidades: ['edita-codigo', 'hace-commits', 'pair-programming'],
      nivel_integracion: 'api-selfhosted'
    };
    const m = normalizeFrontmatter(fm, { id: 'aider' });
    expect(m.domain).toBe('cto');
    expect(m.cluster).toBe('cto-tecnico'); // inferido desde el dominio
    expect(m.integration_level).toBe(2);
    expect(m.capabilities).toContain('edita-codigo');
    // y ese manifest normalizado valida:
    expect(validateManifest({ ...m, integration_ref: 'aider-cli' }).valid).toBe(true);
  });

  test('conector nivel mcp (Slack real) se normaliza a nivel 1', () => {
    const fm = { dominio: 'conectores', subdominio: 'Comunicación', nivel_integracion: 'mcp', tier: 'mcp' };
    const m = normalizeFrontmatter(fm, { id: 'slack' });
    expect(m.integration_level).toBe(1);
    expect(m.cluster).toBe('conectores');
  });
});

describe('validateVaultManifests — unicidad de id', () => {
  test('detecta ids duplicados como error de build', () => {
    const a = validManifest({ id: 'dup' });
    const b = validManifest({ id: 'dup', domain: 'finanzas', cluster: 'cfo-finanzas' });
    const report = validateVaultManifests([a, b]);
    expect(report.valid).toBe(false);
    expect(report.duplicateIds).toContain('dup');
  });

  test('bóveda de manifests válidos y únicos → válida', () => {
    const report = validateVaultManifests([
      validManifest({ id: 'a' }),
      validManifest({ id: 'b', domain: 'finanzas', cluster: 'cfo-finanzas' })
    ]);
    expect(report.valid).toBe(true);
    expect(report.validCount).toBe(2);
  });
});
