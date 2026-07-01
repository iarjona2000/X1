/**
 * Planificador Tree-of-Thoughts (ToT).
 *
 * Para problemas complejos, en lugar de una única cadena de razonamiento,
 * explora un árbol de "pensamientos": en cada nivel genera varias alternativas,
 * las evalúa, y expande solo las más prometedoras (beam search). Devuelve el
 * mejor plan encontrado.
 *
 * Usa el modelo para (a) proponer pasos y (b) puntuarlos, con prompts acotados
 * para minimizar coste.
 */

import { registry } from '../providers/index.js';
import { parseLooseJson } from '../../utils/text.js';
import Logger from '../logger.js';

const logger = new Logger('TreeOfThoughts');

export class TreeOfThoughts {
  /**
   * @param {Object} [options]
   * @param {string} [options.model='gpt-4o-mini']
   * @param {number} [options.maxDepth=3]
   * @param {number} [options.branching=3] - Propuestas por nodo
   * @param {number} [options.beamWidth=2] - Nodos a conservar por nivel
   */
  constructor(options = {}) {
    this.model = options.model || 'gpt-4o-mini';
    this.maxDepth = options.maxDepth ?? 3;
    this.branching = options.branching ?? 3;
    this.beamWidth = options.beamWidth ?? 2;
  }

  /**
   * Genera un plan para un objetivo mediante búsqueda en árbol.
   * @param {string} goal
   * @param {Object} [options]
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<{plan:string[], score:number, tree:Object}>}
   */
  async plan(goal, options = {}) {
    const root = { step: `Objetivo: ${goal}`, path: [], score: 1, depth: 0 };
    let beam = [root];
    let best = root;

    for (let depth = 0; depth < this.maxDepth; depth++) {
      if (options.signal?.aborted) break;
      const expansions = [];

      for (const node of beam) {
        const proposals = await this._propose(goal, node.path, options.signal);
        for (const proposal of proposals) {
          const path = [...node.path, proposal];
          const score = await this._evaluate(goal, path, options.signal);
          const child = { step: proposal, path, score, depth: depth + 1 };
          expansions.push(child);
          if (score > best.score || best.depth === 0) best = child;
        }
      }

      if (!expansions.length) break;
      // Beam search: conservar los mejores
      expansions.sort((a, b) => b.score - a.score);
      beam = expansions.slice(0, this.beamWidth);

      // Terminación temprana si el mejor camino se considera completo
      if (best.score >= 0.95 && best.path.length >= 2) break;
    }

    logger.debug(`ToT completado: plan de ${best.path.length} pasos (score ${best.score.toFixed(2)})`);
    return { plan: best.path, score: best.score, tree: { beam } };
  }

  /**
   * Propone los siguientes pasos posibles dado el progreso actual.
   * @param {string} goal
   * @param {string[]} path
   * @param {AbortSignal} [signal]
   * @returns {Promise<string[]>}
   * @private
   */
  async _propose(goal, path, signal) {
    const provider = registry.forModel(this.model);
    const progress = path.length ? path.map((s, i) => `${i + 1}. ${s}`).join('\n') : '(ninguno)';
    const completion = await provider.complete(this.model, [
      {
        role: 'system',
        content:
          `Eres un planificador. Propón ${this.branching} posibles PRÓXIMOS pasos (distintos entre sí) para avanzar hacia el objetivo. ` +
          'Cada paso debe ser concreto y accionable. Responde SOLO JSON: {"steps":["...","..."]}'
      },
      {
        role: 'user',
        content: `OBJETIVO: ${goal}\n\nPASOS YA DADOS:\n${progress}\n\nPropón los siguientes ${this.branching} pasos.`
      }
    ], { temperature: 0.8, maxTokens: 400, responseFormat: { type: 'json_object' }, signal });

    const parsed = parseLooseJson(completion.text);
    return (parsed?.steps || []).slice(0, this.branching);
  }

  /**
   * Evalúa lo prometedor de un camino parcial (0..1).
   * @param {string} goal
   * @param {string[]} path
   * @param {AbortSignal} [signal]
   * @returns {Promise<number>}
   * @private
   */
  async _evaluate(goal, path, signal) {
    const provider = registry.forModel(this.model);
    const completion = await provider.complete(this.model, [
      {
        role: 'system',
        content:
          'Evalúa de 0 a 100 cómo de prometedor es este plan parcial para alcanzar el objetivo (viabilidad, completitud, orden lógico). ' +
          'Responde SOLO JSON: {"score":N}'
      },
      {
        role: 'user',
        content: `OBJETIVO: ${goal}\n\nPLAN PARCIAL:\n${path.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      }
    ], { temperature: 0, maxTokens: 60, responseFormat: { type: 'json_object' }, signal });

    const parsed = parseLooseJson(completion.text);
    const raw = Number(parsed?.score);
    if (Number.isNaN(raw)) return 0.5;
    return Math.max(0, Math.min(1, raw / 100));
  }
}

export default TreeOfThoughts;
