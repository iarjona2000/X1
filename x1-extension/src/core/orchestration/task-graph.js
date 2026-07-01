/**
 * Grafo de ejecución de tareas (inspirado en LangGraph).
 *
 * Modela flujos de trabajo como un grafo dirigido de nodos. Cada nodo recibe
 * y devuelve un "estado" compartido (objeto mutable/inmutable según se prefiera)
 * y decide el siguiente nodo mediante aristas fijas o condicionales.
 *
 * Soporta:
 *  - Nodos asíncronos con acceso al estado y a un contexto.
 *  - Aristas condicionales (routing dinámico según el estado).
 *  - Nodo especial END para terminar.
 *  - Límite de pasos para evitar bucles infinitos.
 *  - Checkpoints (callback por transición) para observabilidad.
 */

import { OrchestrationError, AbortError } from '../../utils/errors.js';
import { bus, EVENTS } from '../../utils/event-bus.js';
import { ids } from '../../utils/id.js';
import Logger from '../logger.js';

const logger = new Logger('TaskGraph');

/** Nodo terminal. */
export const END = '__end__';

export class TaskGraph {
  /**
   * @param {Object} [options]
   * @param {number} [options.maxSteps=50]
   */
  constructor(options = {}) {
    this.maxSteps = options.maxSteps ?? 50;
    /** @type {Map<string, Function>} */
    this.nodes = new Map();
    /** @type {Map<string, string|Function>} */
    this.edges = new Map();
    this.entryPoint = null;
  }

  /**
   * Añade un nodo.
   * @param {string} name
   * @param {(state:Object, ctx:Object) => Promise<Object>|Object} fn
   * @returns {this}
   */
  addNode(name, fn) {
    if (name === END) throw new OrchestrationError('"__end__" es un nombre reservado');
    this.nodes.set(name, fn);
    return this;
  }

  /**
   * Define una arista fija de `from` a `to`.
   * @param {string} from
   * @param {string} to
   * @returns {this}
   */
  addEdge(from, to) {
    this.edges.set(from, to);
    return this;
  }

  /**
   * Define una arista condicional: una función que, dado el estado, devuelve
   * el nombre del siguiente nodo (o END).
   * @param {string} from
   * @param {(state:Object) => string} router
   * @returns {this}
   */
  addConditionalEdge(from, router) {
    this.edges.set(from, router);
    return this;
  }

  /**
   * Define el nodo inicial.
   * @param {string} name
   * @returns {this}
   */
  setEntry(name) {
    this.entryPoint = name;
    return this;
  }

  /**
   * Valida que el grafo esté bien formado.
   * @throws {OrchestrationError}
   */
  validate() {
    if (!this.entryPoint) throw new OrchestrationError('Falta definir el nodo de entrada');
    if (!this.nodes.has(this.entryPoint)) {
      throw new OrchestrationError(`El nodo de entrada "${this.entryPoint}" no existe`);
    }
    for (const [from, to] of this.edges) {
      if (!this.nodes.has(from)) {
        throw new OrchestrationError(`Arista desde nodo inexistente: "${from}"`);
      }
      if (typeof to === 'string' && to !== END && !this.nodes.has(to)) {
        throw new OrchestrationError(`Arista hacia nodo inexistente: "${to}"`);
      }
    }
  }

  /**
   * Ejecuta el grafo desde el estado inicial.
   * @param {Object} initialState
   * @param {Object} [ctx] - Contexto compartido (signal, deps, onStep…)
   * @returns {Promise<{state:Object, path:string[], runId:string}>}
   */
  async run(initialState = {}, ctx = {}) {
    this.validate();
    const runId = ids.run();
    let state = { ...initialState };
    let current = this.entryPoint;
    const path = [];

    bus.emit(EVENTS.TASK_START, { runId, graph: true, entry: current });

    for (let step = 0; step < this.maxSteps; step++) {
      if (ctx.signal?.aborted) throw new AbortError('Grafo cancelado');
      if (current === END) break;

      const node = this.nodes.get(current);
      if (!node) throw new OrchestrationError(`Nodo no encontrado: "${current}"`);

      path.push(current);
      logger.debug(`Ejecutando nodo "${current}" (paso ${step})`);
      ctx.onStep?.({ node: current, step, state });

      try {
        const patch = await node(state, { ...ctx, runId, step });
        // Los nodos devuelven un patch que se fusiona en el estado
        if (patch && typeof patch === 'object') state = { ...state, ...patch };
      } catch (error) {
        bus.emit(EVENTS.TASK_ERROR, { runId, node: current, error: error.message });
        throw new OrchestrationError(`Fallo en el nodo "${current}": ${error.message}`, {
          cause: error,
          context: { node: current, step }
        });
      }

      bus.emit(EVENTS.TASK_STEP, { runId, node: current, step });

      // Determinar el siguiente nodo
      const edge = this.edges.get(current);
      if (edge === undefined) {
        // Sin arista definida => terminar
        break;
      }
      current = typeof edge === 'function' ? edge(state) : edge;
    }

    bus.emit(EVENTS.TASK_COMPLETE, { runId, path });
    return { state, path, runId };
  }
}

export default TaskGraph;
