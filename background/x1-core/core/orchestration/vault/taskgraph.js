/**
 * Coordinación multi-agente — traductor plan → TaskGraphDefinition (spec §9).
 *
 * Este módulo NO orquesta ni ejecuta: su única responsabilidad es traducir un
 * `ResolvedPlan` con varios agentes a la estructura de grafo que `TaskGraph`
 * (x1-core/core/orchestration/task-graph.js) espera como entrada. La ejecución
 * real (paso de contexto, fallos parciales) ya existe en TaskGraph/
 * CollaborativeEngine y no se reimplementa.
 */

import { END } from '../task-graph.js';

/**
 * @typedef {Object} TaskGraphDefinition
 * @property {Array<{name:string, agentId:string, passContextFrom:(string|null)}>} nodes
 * @property {Array<{from:string, to:string}>} edges
 * @property {string} entry
 * @property {'sequential'|'parallel-then-merge'} mode
 * @property {string} [mergeNode]
 */

/**
 * Construye la definición de grafo a partir de un plan multi-agente.
 *
 * - `sequential`: cada agente recibe como contexto adicional el output del
 *   anterior en la cadena (passContextFrom apunta al nodo previo).
 * - `parallel-then-merge`: todos reciben el prompt original de forma
 *   independiente y sus outputs se combinan en un nodo final de fusión.
 *
 * @param {{agents: Array<{id:string}>, executionMode:string}} plan
 * @returns {TaskGraphDefinition|null} null si el plan tiene 0-1 agentes (no hay
 *          nada que coordinar)
 */
export function buildTaskGraphFromPlan(plan) {
  const agents = (plan && plan.agents) || [];
  if (agents.length <= 1) return null;

  const mode = plan.executionMode === 'parallel-then-merge' ? 'parallel-then-merge' : 'sequential';
  const nodes = [];
  const edges = [];

  if (mode === 'sequential') {
    agents.forEach((a, i) => {
      const name = `agent_${i}`;
      nodes.push({ name, agentId: a.id, passContextFrom: i > 0 ? `agent_${i - 1}` : null });
      if (i > 0) edges.push({ from: `agent_${i - 1}`, to: name });
    });
    edges.push({ from: `agent_${agents.length - 1}`, to: END });
    return { nodes, edges, entry: 'agent_0', mode };
  }

  // parallel-then-merge: un nodo dispatcher que abre todos en paralelo y un
  // nodo de fusión que combina. La ejecución concurrente real la maneja
  // CollaborativeEngine; aquí solo describimos la topología.
  agents.forEach((a, i) => {
    const name = `agent_${i}`;
    nodes.push({ name, agentId: a.id, passContextFrom: null });
    edges.push({ from: name, to: 'merge' });
  });
  nodes.push({ name: 'merge', agentId: null, passContextFrom: 'all', merge: true });
  edges.push({ from: 'merge', to: END });

  return { nodes, edges, entry: agents.map((_, i) => `agent_${i}`), mode, mergeNode: 'merge' };
}
