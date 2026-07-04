/**
 * Conexión — dispatch por nivel de integración (spec §10).
 *
 * Con el manifest en cada nota, conectar deja de ser una decisión en runtime y
 * pasa a ser lectura de campo + dispatch directo:
 *   Nivel 1 (MCP)      → X1MCPClient.callTool(ref, context)
 *   Nivel 2/3 (API/SaaS) → wrapper dedicado (patrón Finnhub/Pipedrive)
 *   Nivel 4 (prompt/plugin) → X1PluginEngine.executePlugin() o X1AgentManager.callAgent()
 *
 * Los clientes reales viven en `background/` (fuera de x1-core), así que se
 * INYECTAN como dependencias — mantiene el módulo desacoplado y testeable sin
 * el runtime de la extensión. Cada rama normaliza sus errores a
 * `AgentDispatchError`, que informa (no decide) si el fallo es reintentable;
 * la decisión de reintento vive en la coordinación (§9), no aquí.
 */

import { X1Error, ERROR_CODES } from '../../../utils/errors.js';

/** Error normalizado de dispatch. Informa nivel, ref y si es reintentable. */
export class AgentDispatchError extends X1Error {
  /**
   * @param {string} message
   * @param {Object} options
   * @param {number} options.integrationLevel
   * @param {string} options.integrationRef
   * @param {boolean} [options.retryable]
   * @param {Error} [options.cause]
   */
  constructor(message, options = {}) {
    super(message, {
      code: ERROR_CODES.TOOL,
      retryable: options.retryable === true,
      cause: options.cause,
      context: { integrationLevel: options.integrationLevel, integrationRef: options.integrationRef }
    });
    this.integrationLevel = options.integrationLevel;
    this.integrationRef = options.integrationRef;
  }
}

/**
 * @typedef {Object} AgentResponse
 * @property {boolean} ok
 * @property {*} data
 * @property {number} integrationLevel
 * @property {string} integrationRef
 */

/**
 * Despacha una ejecución al agente resuelto según su nivel de integración.
 *
 * @param {import('./resolver.js').ResolvedAgent} agent
 * @param {Object} context - contexto de ejecución (prompt, datos previos…)
 * @param {Object} deps - clientes inyectados
 * @param {{callTool:Function}} [deps.mcpClient] - X1MCPClient (nivel 1)
 * @param {(ref:string, ctx:Object)=>Promise<*>} [deps.apiClient] - wrapper REST/SaaS (nivel 2/3)
 * @param {{executePlugin:Function}} [deps.pluginEngine] - X1PluginEngine (nivel 4)
 * @param {{callAgent:Function}} [deps.agentManager] - X1AgentManager (nivel 4)
 * @returns {Promise<AgentResponse>}
 */
export async function dispatchToAgent(agent, context, deps = {}) {
  const level = agent && agent.integrationLevel;
  const ref = agent && agent.integrationRef;

  if (!ref) {
    throw new AgentDispatchError('integration_ref ausente en el agente resuelto', {
      integrationLevel: level,
      integrationRef: ref,
      retryable: false
    });
  }

  try {
    let data;
    switch (level) {
      case 1: {
        if (!deps.mcpClient || typeof deps.mcpClient.callTool !== 'function') {
          throw new AgentDispatchError('X1MCPClient no disponible para nivel 1', { integrationLevel: 1, integrationRef: ref, retryable: false });
        }
        data = await deps.mcpClient.callTool(ref, context);
        break;
      }
      case 2:
      case 3: {
        if (typeof deps.apiClient !== 'function') {
          throw new AgentDispatchError(`wrapper de API no disponible para nivel ${level}`, { integrationLevel: level, integrationRef: ref, retryable: false });
        }
        data = await deps.apiClient(ref, context);
        break;
      }
      case 4: {
        if (deps.pluginEngine && typeof deps.pluginEngine.executePlugin === 'function') {
          data = await deps.pluginEngine.executePlugin(ref, context);
        } else if (deps.agentManager && typeof deps.agentManager.callAgent === 'function') {
          data = await deps.agentManager.callAgent(ref, context);
        } else {
          throw new AgentDispatchError('ni X1PluginEngine ni X1AgentManager disponibles para nivel 4', { integrationLevel: 4, integrationRef: ref, retryable: false });
        }
        break;
      }
      default:
        throw new AgentDispatchError(`nivel de integración desconocido: ${level}`, { integrationLevel: level, integrationRef: ref, retryable: false });
    }
    return { ok: true, data, integrationLevel: level, integrationRef: ref };
  } catch (error) {
    if (error instanceof AgentDispatchError) throw error;
    // Normaliza cualquier fallo del cliente subyacente. Errores de red se
    // consideran reintentables; el resto no por defecto.
    const retryable = /network|timeout|fetch|econn|5\d\d/i.test(error.message || '');
    throw new AgentDispatchError(`fallo al despachar (nivel ${level}): ${error.message}`, {
      integrationLevel: level,
      integrationRef: ref,
      retryable,
      cause: error
    });
  }
}
