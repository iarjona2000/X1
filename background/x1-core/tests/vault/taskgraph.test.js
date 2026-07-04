/**
 * Tests del traductor plan → TaskGraphDefinition (spec §9).
 */

import { buildTaskGraphFromPlan } from '../../core/orchestration/vault/taskgraph.js';
import { END } from '../../core/orchestration/task-graph.js';

describe('buildTaskGraphFromPlan', () => {
  test('plan con 0-1 agentes no genera grafo (nada que coordinar)', () => {
    expect(buildTaskGraphFromPlan({ agents: [], executionMode: 'single' })).toBeNull();
    expect(buildTaskGraphFromPlan({ agents: [{ id: 'a' }], executionMode: 'single' })).toBeNull();
  });

  test('sequential encadena y pasa contexto del nodo previo', () => {
    const def = buildTaskGraphFromPlan({ agents: [{ id: 'legal' }, { id: 'fin' }], executionMode: 'sequential' });
    expect(def.mode).toBe('sequential');
    expect(def.entry).toBe('agent_0');
    expect(def.nodes[1].passContextFrom).toBe('agent_0');
    expect(def.edges).toContainEqual({ from: 'agent_1', to: END });
  });

  test('parallel-then-merge crea nodo de fusión que recibe todos', () => {
    const def = buildTaskGraphFromPlan({ agents: [{ id: 'a' }, { id: 'b' }], executionMode: 'parallel-then-merge' });
    expect(def.mode).toBe('parallel-then-merge');
    expect(def.mergeNode).toBe('merge');
    expect(def.edges).toContainEqual({ from: 'a' === 'a' ? 'agent_0' : '', to: 'merge' });
    expect(def.nodes.find((n) => n.merge)).toBeTruthy();
  });
});
