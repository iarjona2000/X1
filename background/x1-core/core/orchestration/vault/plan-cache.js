/**
 * Extensión B — Caché de rutas resueltas (spec §11).
 *
 * Capa delante del embudo completo: consultada al inicio de
 * `resolveAgentsForPrompt` y poblada al final. La clave NO es el prompt crudo
 * sino `hash(normalizePromptForCache(prompt))`, de modo que "revisa este
 * contrato" y "Revisa este contrato." compartan entrada.
 *
 * Invalidación: por TTL y además por cambio de versión del manifest de
 * cualquier agente involucrado en la entrada cacheada (un prompt debería
 * resolver al mismo agente mañana, salvo que la bóveda haya cambiado).
 *
 * Desactivable por completo vía `config.cacheEnabled` sin que el resto del
 * sistema deje de funcionar (necesario para medir umbrales sin caché).
 */

import { LruCache } from '../../../utils/cache.js';
import { DEFAULT_RESOLVER_CONFIG } from './config.js';

/**
 * Normaliza un prompt para clave de caché: minúsculas, espacios colapsados,
 * sin puntuación final. Colapsa variaciones triviales.
 * @param {string} prompt
 * @returns {string}
 */
export function normalizePromptForCache(prompt) {
  return String(prompt || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?¿¡,;:]+$/g, '')
    .trim();
}

/**
 * Hash estable (djb2) de una cadena → hex. Mantiene las claves acotadas.
 * @param {string} str
 * @returns {string}
 */
export function hashKey(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export class ResolvedPlanCache {
  /**
   * @param {import('./config.js').ResolverConfig} [config]
   */
  constructor(config = DEFAULT_RESOLVER_CONFIG) {
    this.enabled = config.cacheEnabled !== false;
    this.lru = new LruCache({ maxSize: config.cacheMaxSize, ttlMs: config.cacheTtlMs });
  }

  /**
   * Clave de caché de un prompt.
   * @param {string} prompt
   * @returns {string}
   */
  keyFor(prompt) {
    return hashKey(normalizePromptForCache(prompt));
  }

  /**
   * Extrae el mapa {agentId: version} de un plan, para poder invalidar si esas
   * versiones cambian.
   * @param {{agents: Array<{id:string, version?:number}>}} plan
   * @returns {Object<string, number>}
   * @private
   */
  _versionsOf(plan) {
    const versions = {};
    for (const a of (plan && plan.agents) || []) {
      versions[a.id] = a.version != null ? a.version : 1;
    }
    return versions;
  }

  /**
   * Consulta la caché. Devuelve el plan cacheado o null.
   * @param {string} prompt
   * @param {Object<string, number>} [currentVersions] - versión actual por id de
   *        agente; si alguna difiere de la almacenada, la entrada se invalida.
   * @returns {Object|null}
   */
  get(prompt, currentVersions = {}) {
    if (!this.enabled) return null;
    const key = this.keyFor(prompt);
    const entry = this.lru.get(key);
    if (!entry) return null;

    // Invalidación por versión de manifest de agentes involucrados.
    for (const [id, ver] of Object.entries(entry.versions)) {
      if (currentVersions[id] != null && currentVersions[id] !== ver) {
        this.lru.delete(key);
        return null;
      }
    }
    return { ...entry.plan, fromCache: true };
  }

  /**
   * Puebla la caché con el plan resuelto para un prompt.
   * @param {string} prompt
   * @param {Object} plan - ResolvedPlan
   */
  set(prompt, plan) {
    if (!this.enabled) return;
    const key = this.keyFor(prompt);
    this.lru.set(key, { plan, versions: this._versionsOf(plan) });
  }

  /** Vacía la caché. */
  clear() {
    this.lru.clear();
  }

  /** Estadísticas de aciertos (hits/misses/hitRate/size). */
  stats() {
    return this.lru.stats();
  }
}

export default ResolvedPlanCache;
