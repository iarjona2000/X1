/**
 * Esquema de manifest por nota de la bóveda + validación (Extensión A, §4).
 *
 * Contrato del manifest (front-matter YAML de cada nota de agente):
 *   id, domain, subdomain, capabilities[], integration_level (1-4),
 *   integration_ref, cluster, embedding_cached, embedding_last_updated, version
 *
 * COMPATIBILIDAD CON EL ESQUEMA DE IVAN: la bóveda ya usa (2026-07-06) un
 * esquema propio en español —`dominio`, `subdominio`, `capacidades`,
 * `nivel_integracion` (enum string)— documentado en
 * `vault/Meta/06-Plan-de-Expansion-Masiva.md`. En vez de exigir un re-etiquetado
 * masivo (territorio de Ivan), `normalizeFrontmatter()` traduce ese esquema al
 * canónico como superset compatible. Ver `DECISIONES.md`.
 */

import { isValidCluster, isValidDomain, clusterForDomain } from './clusters.js';

/**
 * @typedef {Object} AgentManifest
 * @property {string} id
 * @property {string} domain
 * @property {string} [subdomain]
 * @property {string[]} capabilities
 * @property {1|2|3|4} integration_level
 * @property {string} [integration_ref]
 * @property {string} cluster
 * @property {boolean} [embedding_cached]
 * @property {string|null} [embedding_last_updated]
 * @property {number} [version]
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string[]} errors    - motivos por los que la nota se EXCLUYE del embudo
 * @property {string[]} warnings  - avisos que no excluyen (metadata incompleta tolerable)
 */

/** Niveles de integración canónicos (spec §10). */
export const INTEGRATION_LEVELS = Object.freeze({
  MCP: 1,
  API_SELFHOSTED: 2,
  SAAS: 3,
  PROMPT: 4
});

/**
 * Mapa de los enums string usados en la bóveda → nivel entero canónico.
 * Cubre tanto `nivel_integracion` (esquema 06) como el campo `tier` heredado
 * de la importación original de agency-agents.
 */
export const LEVEL_ALIASES = Object.freeze({
  mcp: 1,
  'mcp-server': 1,
  'api-selfhosted': 2,
  'rest-api-self-hosted': 2,
  'api-self-hosted': 2,
  selfhosted: 2,
  saas: 3,
  'saas-api': 3,
  prompt: 4,
  'prompt-import': 4,
  plugin: 4
});

/**
 * Regex de capacidad válida: minúsculas (incl. acentuadas), dígitos, separadas
 * por guiones. Sin espacios. Ej: "revision", "impacto-fiscal", "edita-codigo".
 */
export const CAPABILITY_RE = /^[\p{Ll}\p{N}]+(?:-[\p{Ll}\p{N}]+)*$/u;

/**
 * Normaliza un valor de nivel de integración (entero o enum string) a 1-4.
 * @param {number|string} value
 * @returns {1|2|3|4|null}
 */
export function normalizeIntegrationLevel(value) {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 4) {
    return /** @type {1|2|3|4} */ (value);
  }
  if (typeof value === 'string') {
    const lvl = LEVEL_ALIASES[value.toLowerCase().trim()];
    if (lvl) return /** @type {1|2|3|4} */ (lvl);
  }
  return null;
}

/**
 * Traduce el front-matter real de una nota (que puede venir en el esquema de
 * Ivan en español, en el canónico, o mixto) a un `AgentManifest` canónico.
 * No valida — solo mapea nombres de campo. La validación es responsabilidad de
 * `validateManifest`.
 *
 * @param {Object} fm - front-matter parseado de la nota
 * @param {Object} [ctx] - contexto de la nota
 * @param {string} [ctx.folder] - carpeta de la nota (para inferir cluster)
 * @param {string} [ctx.id] - id explícito (p. ej. nombre de archivo sin .md)
 * @returns {AgentManifest}
 */
export function normalizeFrontmatter(fm = {}, ctx = {}) {
  const domain = fm.domain || fm.dominio || null;
  const cluster =
    fm.cluster ||
    (domain ? clusterForDomain(domain) : null) ||
    null;

  const capabilities = fm.capabilities || fm.capacidades || [];
  const level = normalizeIntegrationLevel(
    fm.integration_level != null ? fm.integration_level : fm.nivel_integracion != null ? fm.nivel_integracion : fm.tier
  );

  return {
    id: fm.id || ctx.id || null,
    domain: domain ? String(domain).toLowerCase() : null,
    subdomain: fm.subdomain || fm.subdominio || undefined,
    capabilities: Array.isArray(capabilities) ? capabilities.map((c) => String(c).toLowerCase()) : [],
    integration_level: level,
    integration_ref: fm.integration_ref || fm.integration_reference || undefined,
    cluster,
    embedding_cached: fm.embedding_cached === true,
    embedding_last_updated: fm.embedding_last_updated || null,
    version: typeof fm.version === 'number' ? fm.version : 1
  };
}

/**
 * Valida un manifest individual. NUNCA lanza — devuelve `{valid, errors,
 * warnings}`. Una nota inválida se excluye del embudo con log de advertencia,
 * nunca provoca un error que tumbe la resolución (spec §4, requisito duro).
 *
 * @param {AgentManifest} manifest
 * @param {Object} [options]
 * @param {Set<string>} [options.mcpTools] - herramientas MCP registradas, para
 *        verificar `integration_ref` en nivel 1. Si no se pasa, la comprobación
 *        de nivel 1 degrada a warning (metadata incompleta tolerable).
 * @returns {ValidationResult}
 */
export function validateManifest(manifest, options = {}) {
  const errors = [];
  const warnings = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['manifest ausente o no es un objeto'], warnings };
  }

  // id
  if (!manifest.id || typeof manifest.id !== 'string' || !manifest.id.trim()) {
    errors.push('id ausente o vacío');
  }

  // domain + cluster (catálogo cerrado)
  if (!manifest.domain) {
    errors.push('domain ausente');
  } else if (!isValidDomain(manifest.domain)) {
    errors.push(`domain "${manifest.domain}" no pertenece al catálogo cerrado`);
  }

  if (!manifest.cluster) {
    errors.push('cluster ausente');
  } else if (!isValidCluster(manifest.cluster)) {
    errors.push(`cluster "${manifest.cluster}" no pertenece al catálogo cerrado`);
  }

  // Coherencia domain↔cluster: si ambos son válidos pero el domain apunta a
  // otro clúster, es un error de metadata (no un warning: rompería el filtrado).
  if (manifest.domain && manifest.cluster && isValidDomain(manifest.domain) && isValidCluster(manifest.cluster)) {
    const expected = clusterForDomain(manifest.domain);
    if (expected && expected !== manifest.cluster) {
      errors.push(`domain "${manifest.domain}" pertenece al clúster "${expected}", no a "${manifest.cluster}"`);
    }
  }

  // capabilities
  if (!Array.isArray(manifest.capabilities) || manifest.capabilities.length === 0) {
    errors.push('capabilities debe ser un array no vacío');
  } else {
    for (const cap of manifest.capabilities) {
      if (typeof cap !== 'string' || !CAPABILITY_RE.test(cap)) {
        errors.push(`capacidad inválida "${cap}" (minúsculas, sin espacios, guiones como separador)`);
      }
    }
  }

  // integration_level
  const level = manifest.integration_level;
  if (!Number.isInteger(level) || level < 1 || level > 4) {
    errors.push(`integration_level debe ser entero 1-4 (recibido: ${level})`);
  } else {
    // integration_ref
    const ref = manifest.integration_ref;
    const hasRef = typeof ref === 'string' && ref.trim().length > 0;
    if (level >= 2 && level <= 4) {
      if (!hasRef) errors.push(`integration_ref obligatorio para nivel ${level}`);
    } else if (level === 1) {
      if (!hasRef) {
        errors.push('integration_ref obligatorio para nivel 1 (nombre de herramienta MCP)');
      } else if (options.mcpTools instanceof Set) {
        if (!options.mcpTools.has(ref)) {
          errors.push(`integration_ref "${ref}" no es una herramienta MCP registrada`);
        }
      } else {
        warnings.push(`no se pudo verificar la herramienta MCP "${ref}" (sin lista de herramientas registradas)`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Valida un conjunto de manifests de la bóveda completa, incluyendo la
 * restricción de unicidad de `id` (colisión = error de build, spec §4).
 *
 * @param {AgentManifest[]} manifests
 * @param {Object} [options] - se reenvía a `validateManifest`
 * @returns {{
 *   valid: boolean,
 *   validCount: number,
 *   invalidCount: number,
 *   duplicateIds: string[],
 *   results: Map<string, ValidationResult>
 * }}
 */
export function validateVaultManifests(manifests, options = {}) {
  const results = new Map();
  const seen = new Map(); // id → nº de apariciones
  const duplicateIds = new Set();

  for (const m of manifests) {
    const res = validateManifest(m, options);
    const key = (m && m.id) || `«sin-id-${results.size}»`;

    if (m && m.id) {
      const count = (seen.get(m.id) || 0) + 1;
      seen.set(m.id, count);
      if (count > 1) {
        duplicateIds.add(m.id);
        res.valid = false;
        res.errors = [...res.errors, `id duplicado "${m.id}" (colisión en la bóveda)`];
      }
    }
    results.set(key, res);
  }

  let validCount = 0;
  for (const res of results.values()) if (res.valid) validCount++;

  return {
    valid: duplicateIds.size === 0 && validCount === manifests.length,
    validCount,
    invalidCount: manifests.length - validCount,
    duplicateIds: [...duplicateIds],
    results
  };
}
