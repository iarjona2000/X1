/**
 * Supervisor multi-agente.
 *
 * Coordina varios agentes especializados para resolver una tarea compleja.
 * Un "supervisor" (LLM) decide en cada turno qué agente debe actuar a
 * continuación o si la tarea está terminada. Cada agente aporta su resultado
 * al estado compartido, que el supervisor usa para la siguiente decisión.
 *
 * Implementa el patrón "supervisor" de orquestación de agentes sobre TaskGraph.
 */

import { TaskGraph, END } from './task-graph.js';
import { registry } from '../providers/index.js';
import { parseLooseJson, truncateToTokens } from '../../utils/text.js';
import { bus, EVENTS } from '../../utils/event-bus.js';
import Logger from '../logger.js';

const logger = new Logger('Supervisor');

export class Supervisor {
  /**
   * @param {Object} deps
   * @param {import('../agents/agent-manager.js').AgentManager} deps.agentManager
   * @param {string} [deps.supervisorModel='gpt-4o-mini']
   */
  constructor(deps) {
    this.agentManager = deps.agentManager;
    this.supervisorModel = deps.supervisorModel || 'gpt-4o-mini';
    this.maxRounds = deps.maxRounds || 8;
  }

  /**
   * Resuelve una tarea coordinando un equipo de agentes.
   * @param {Object} params
   * @param {string} params.goal - Objetivo global
   * @param {string[]} params.agentIds - Ids de agentes del equipo
   * @param {Object} [options]
   * @param {AbortSignal} [options.signal]
   * @param {(evt:Object)=>void} [options.onStep]
   * @returns {Promise<{result:string, transcript:Array, rounds:number}>}
   */
  async solve({ goal, agentIds }, options = {}) {
    const agents = [];
    for (const id of agentIds) {
      agents.push(await this.agentManager.get(id));
    }
    if (!agents.length) throw new Error('El equipo no tiene agentes');

    const roster = agents
      .map((a) => `- ${a.name}: ${a.description}`)
      .join('\n');

    const graph = new TaskGraph({ maxSteps: this.maxRounds * 2 + 2 });

    // Nodo supervisor: decide el siguiente agente o finaliza
    graph.addNode('supervisor', async (state) => {
      const decision = await this._decide(goal, roster, state.transcript);
      logger.debug(`Supervisor decide: ${decision.next}`);
      options.onStep?.({ type: 'route', to: decision.next, reason: decision.reason });
      return { next: decision.next, supervisorReason: decision.reason, finalReason: decision.finalAnswer };
    });

    // Nodo trabajador: ejecuta el agente elegido
    graph.addNode('worker', async (state) => {
      const agent = agents.find((a) => a.name.toLowerCase() === state.next?.toLowerCase());
      if (!agent) {
        return { transcript: [...state.transcript, { role: 'system', content: `Agente "${state.next}" no encontrado` }] };
      }
      bus.emit(EVENTS.AGENT_MESSAGE, { agent: agent.name, phase: 'start' });
      options.onStep?.({ type: 'agent_start', agent: agent.name });

      const subGoal = this._composeSubGoal(goal, state.transcript, agent.name);
      const run = await this.agentManager.run(agent.id, subGoal, {
        signal: options.signal,
        confirm: options.confirm
      });

      options.onStep?.({ type: 'agent_done', agent: agent.name, answer: run.answer });
      return {
        transcript: [
          ...state.transcript,
          { role: 'agent', agent: agent.name, content: run.answer }
        ],
        rounds: (state.rounds || 0) + 1
      };
    });

    // Enrutamiento: supervisor -> worker o END; worker -> supervisor
    graph.setEntry('supervisor');
    graph.addConditionalEdge('supervisor', (state) => {
      if (state.next === 'FINISH' || (state.rounds || 0) >= this.maxRounds) return END;
      return 'worker';
    });
    graph.addEdge('worker', 'supervisor');

    const { state } = await graph.run(
      { transcript: [{ role: 'user', content: goal }], rounds: 0 },
      { signal: options.signal, onStep: options.onStep }
    );

    // Síntesis final
    const result = await this._synthesize(goal, state.transcript, state.finalReason);
    return { result, transcript: state.transcript, rounds: state.rounds || 0 };
  }

  /**
   * El supervisor decide el siguiente agente.
   * @param {string} goal
   * @param {string} roster
   * @param {Array} transcript
   * @returns {Promise<{next:string, reason:string, finalAnswer?:string}>}
   * @private
   */
  async _decide(goal, roster, transcript) {
    const provider = registry.forModel(this.supervisorModel);
    const history = truncateToTokens(
      transcript.map((t) => `${t.agent || t.role}: ${t.content}`).join('\n'),
      1500
    );

    const system =
      'Eres un supervisor que coordina un equipo de agentes especializados. ' +
      'Decide qué agente debe actuar a continuación para avanzar hacia el objetivo, ' +
      'o responde FINISH si la tarea está completa. ' +
      'Responde SOLO con JSON: {"next":"NombreAgente|FINISH","reason":"..."}';

    const user =
      `OBJETIVO: ${goal}\n\n` +
      `EQUIPO DISPONIBLE:\n${roster}\n\n` +
      `PROGRESO HASTA AHORA:\n${history || '(ninguno)'}\n\n` +
      'Decide el siguiente paso.';

    const completion = await provider.complete(this.supervisorModel, [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], { temperature: 0.2, maxTokens: 200, responseFormat: { type: 'json_object' } });

    const decision = parseLooseJson(completion.text) || {};
    return {
      next: decision.next || 'FINISH',
      reason: decision.reason || '',
      finalAnswer: decision.finalAnswer
    };
  }

  /**
   * Compone la sub-tarea concreta para un agente según el progreso.
   * @private
   */
  _composeSubGoal(goal, transcript, agentName) {
    const context = transcript
      .filter((t) => t.role === 'agent')
      .map((t) => `${t.agent}: ${t.content}`)
      .join('\n');
    return (
      `Objetivo global: ${goal}\n\n` +
      (context ? `Trabajo previo del equipo:\n${context}\n\n` : '') +
      `Como agente "${agentName}", realiza tu parte para avanzar hacia el objetivo.`
    );
  }

  /**
   * Sintetiza el resultado final integrando el trabajo de todos los agentes.
   * @private
   */
  async _synthesize(goal, transcript, hint) {
    const provider = registry.forModel(this.supervisorModel);
    const work = transcript
      .filter((t) => t.role === 'agent')
      .map((t) => `### ${t.agent}\n${t.content}`)
      .join('\n\n');

    const completion = await provider.complete(this.supervisorModel, [
      {
        role: 'system',
        content:
          'Integra el trabajo del equipo en una respuesta final coherente y completa para el usuario.'
      },
      {
        role: 'user',
        content: `OBJETIVO: ${goal}\n\nTRABAJO DEL EQUIPO:\n${work}\n\n${
          hint ? `Nota del supervisor: ${hint}\n\n` : ''
        }Redacta la respuesta final.`
      }
    ], { temperature: 0.4, maxTokens: 1500 });

    return completion.text;
  }
}

export default Supervisor;
