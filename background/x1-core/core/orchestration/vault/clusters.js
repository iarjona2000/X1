/**
 * Catálogo cerrado de clústeres de la bóveda de agentes.
 *
 * Fuente de verdad EN CÓDIGO del catálogo documentado en
 * `vault/00-Catalogo-Clusters.md`. Extraído por inspección directa de la
 * estructura real de `vault/` (2026-07-06), no inventado — cumple
 * `PROMPT_CLAUDE_CODE_ORQUESTACION.md` §4.
 *
 * Cada clúster corresponde a una carpeta "Agentes-XXX" con agentes reales.
 * Un `domain` de manifest debe pertenecer a los alias de exactamente un
 * clúster; un `cluster` de manifest debe ser un `id` de esta lista.
 */

/**
 * @typedef {Object} ClusterDef
 * @property {string} id        - Identificador de clúster (slug estable, usado en manifests)
 * @property {string} folder    - Carpeta real en vault/
 * @property {string|null} ceo  - Vertical CEO a la que pertenece (null = transversal)
 * @property {string[]} domains - Alias de dominio aceptados para este clúster
 *                                 (incluye el tag de rol CEO y el tag de tópico)
 */

/** @type {ClusterDef[]} */
export const CLUSTERS = [
  { id: 'ceo-estrategia', folder: 'Agentes-CEO-Estrategia', ceo: 'CEO', domains: ['ceo', 'estrategia', 'research', 'osint'] },
  { id: 'cfo-finanzas', folder: 'Agentes-CFO-Finanzas', ceo: 'CFO', domains: ['cfo', 'finanzas', 'contabilidad'] },
  { id: 'cmo-marketing', folder: 'Agentes-CMO-Marketing', ceo: 'CMO', domains: ['cmo', 'marketing', 'seo'] },
  { id: 'clo-legal', folder: 'Agentes-CLO-Legal', ceo: 'CLO', domains: ['clo', 'legal'] },
  { id: 'chro-rrhh', folder: 'Agentes-CHRO-RRHH', ceo: 'CHRO', domains: ['chro', 'rrhh'] },
  { id: 'cro-ventas', folder: 'Agentes-CRO-Ventas', ceo: 'CRO', domains: ['cro', 'ventas', 'crm'] },
  { id: 'coo-operaciones', folder: 'Agentes-COO-Operaciones', ceo: 'COO', domains: ['coo', 'operaciones', 'cadena-suministro', 'pmo'] },
  { id: 'cto-tecnico', folder: 'Agentes-CTO-Tecnico', ceo: 'CTO', domains: ['cto', 'tecnico', 'ingenieria'] },
  { id: 'cpo-producto', folder: 'Agentes-CPO-Producto', ceo: 'CPO', domains: ['cpo', 'producto', 'diseno'] },
  { id: 'conectores', folder: 'Agentes-Conectores', ceo: null, domains: ['conectores'] }
];

Object.freeze(CLUSTERS);
CLUSTERS.forEach((c) => Object.freeze(c));

/** Set de ids de clúster válidos. @type {Set<string>} */
export const CLUSTER_IDS = new Set(CLUSTERS.map((c) => c.id));

/** Mapa alias-de-dominio → id-de-clúster. @type {Map<string,string>} */
export const DOMAIN_TO_CLUSTER = (() => {
  const map = new Map();
  for (const c of CLUSTERS) {
    map.set(c.id, c.id); // el propio id también es un dominio válido
    for (const d of c.domains) map.set(d, c.id);
  }
  return map;
})();

/** Set de todos los dominios válidos (alias incluidos). @type {Set<string>} */
export const DOMAINS = new Set(DOMAIN_TO_CLUSTER.keys());

/**
 * ¿Es `id` un clúster válido del catálogo cerrado?
 * @param {string} id
 * @returns {boolean}
 */
export function isValidCluster(id) {
  return typeof id === 'string' && CLUSTER_IDS.has(id);
}

/**
 * ¿Es `domain` un dominio reconocido (alias de algún clúster)?
 * @param {string} domain
 * @returns {boolean}
 */
export function isValidDomain(domain) {
  return typeof domain === 'string' && DOMAINS.has(domain.toLowerCase());
}

/**
 * Devuelve el id de clúster para un dominio dado, o null si no se reconoce.
 * @param {string} domain
 * @returns {string|null}
 */
export function clusterForDomain(domain) {
  if (typeof domain !== 'string') return null;
  return DOMAIN_TO_CLUSTER.get(domain.toLowerCase()) || null;
}

/**
 * Devuelve la definición de clúster por id.
 * @param {string} id
 * @returns {ClusterDef|null}
 */
export function getCluster(id) {
  return CLUSTERS.find((c) => c.id === id) || null;
}

/**
 * Deriva el id de clúster a partir del nombre de carpeta `Agentes-*`.
 * Usado por la migración para inferir `cluster` desde la ubicación de la nota.
 * @param {string} folder
 * @returns {string|null}
 */
export function folderToClusterId(folder) {
  if (typeof folder !== 'string') return null;
  const match = CLUSTERS.find((c) => c.folder === folder);
  return match ? match.id : null;
}
