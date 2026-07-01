/**
 * Runtime de ejecución de agentes (bucle ReAct con function calling).
 *
 * Dado un Agente y un objetivo, ejecuta un bucle:
 *   1. Construye el prompt con contexto (memoria, conocimiento, historial).
 *   2. Llama al modelo con las definiciones de herramientas.
 *   3. Si el modelo pide herramientas, las ejecuta y realimenta los resultados.
 *   4. Repite hasta "final_answer", agotar pasos o cancelación.
 *
 * Emite eventos por cada paso para que la UI muestre el progreso en tiempo real.
 */

import { registry } from '../providers/index.js';
import { toolRegistry } from './tool.js';
import { bus, EVENTS } from '../../utils/event-bus.js';
import { parseLooseJson } from '../../utils/text.js';
import { OrchestrationError, AbortError } from '../../utils/errors.js';
import { ids } from '../../utils/id.js';
import Logger from '../logger.js';

const logger = new Logger('AgentRuntime');

export class AgentRuntime {
  /**
   * @param {Object} [deps]
   * @param {import('../memory/memory-manager.js').MemoryManager} [deps.memory]
   * @param {import('./tool.js').ToolRegistry} [deps.tools]
   */
  constructor(deps = {}) {
    this.memory = deps.memory || null;
    this.tools = deps.tools || toolRegistry;
  }

  /**
   * Ejecuta un agente sobre un objetivo.
   * @param {import('./agent.js').Agent} agent
   * @param {string} goal - Objetivo/consulta del usuario
   * @param {Object} [options]
   * @param {Array} [options.history] - Historial de conversación
   * @param {AbortSignal} [options.signal]
   * @param {(evt:Object)=>void} [options.onStep] - Callback por paso
   * @param {(req:Object)=>Promise<boolean>} [options.confirm] - Confirmación de acciones
   * @param {string} [options.knowledgeContext]
   * @returns {Promise<{answer:string, steps:Array, usage:Object, runId:string}>}
   */
  async run(agent, goal, options = {}) {
    const runId = ids.run();
    const provider = registry.forModel(agent.effectiveModel());
    const steps = [];
    const totalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

    // Herramientas permitidas por el agente + siempre final_answer
    const allowedToolNames = [...new Set([...(agent.tools || []), 'final_answer'])];
    const toolDefs = this.tools.functionDefs(allowedToolNames);

    // Contexto de memoria
    let memoryContext = '';
    if (agent.useMemory && this.memory) {
      try {
        const ctx = await this.memory.buildContext(goal, { maxTokens: 600 });
        memoryContext = ctx.text;
      } catch (error) {
        logger.warn(`Memoria no disponible: ${error.message}`);
      }
    }

    const systemPrompt = agent.buildSystemPrompt({
      memoryContext,
      knowledgeContext: options.knowledgeContext,
      availableTools: allowedToolNames
    });

    // Historial de mensajes del bucle
    const messages = [{ role: 'system', content: systemPrompt }];
    for (const turn of options.history || []) {
      messages.push({ role: turn.role, content: turn.content });
    }
    messages.push({ role: 'user', content: goal });

    bus.emit(EVENTS.TASK_START, { runId, agent: agent.name, goal });

    let answer = '';
    for (let step = 0; step < agent.maxSteps; step++) {
      if (options.signal?.aborted) throw new AbortError('Ejecución del agente cancelada');

      const completion = await provider.complete(agent.effectiveModel(), messages, {
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        tools: provider.capabilities.tools ? toolDefs : undefined,
        signal: options.signal
      });

      this._accumulateUsage(totalUsage, completion.usage);

      // Caso 1: el modelo devolvió llamadas a herramientas nativas
      const toolCalls = completion.toolCalls
        ? completion.toolCalls
        : this._parseInlineToolCalls(completion.text, allowedToolNames);

      if (!toolCalls || !toolCalls.length) {
        // Sin herramientas: la respuesta de texto es la final
        answer = completion.text;
        steps.push({ step, type: 'answer', content: answer });
        bus.emit(EVENTS.TASK_STEP, { runId, step, type: 'answer' });
        break;
      }

      // Registrar el turno del asistente con las tool calls
      messages.push({
        role: 'assistant',
        content: completion.text || '',
        toolCalls
      });

      let finished = false;
      for (const call of toolCalls) {
        const name = call.function?.name || call.name;
        const args = this._parseArgs(call.function?.arguments || call.arguments);

        bus.emit(EVENTS.AGENT_TOOL_CALL, { runId, step, tool: name, args });
        options.onStep?.({ type: 'tool_call', tool: name, args, step });

        if (name === 'final_answer') {
          answer = args.answer || '';
          steps.push({ step, type: 'final_answer', content: answer });
          finished = true;
          break;
        }

        let result;
        try {
          result = await this.tools.run(name, args, {
            agent,
            signal: options.signal,
            confirm: options.confirm
          });
        } catch (error) {
          result = { error: error.message };
          logger.warn(`Tool ${name} falló: ${error.message}`);
        }

        steps.push({ step, type: 'tool_result', tool: name, args, result });
        options.onStep?.({ type: 'tool_result', tool: name, result, step });

        // Realimentar el resultado al modelo
        messages.push({
          role: 'tool',
          name,
          content: typeof result === 'string' ? result : JSON.stringify(result)
        });
      }

      if (finished) break;
    }

    if (!answer) {
      answer =
        'No pude completar la tarea en el número de pasos permitido. ' +
        'Intenta reformular o dividir la petición.';
    }

    bus.emit(EVENTS.TASK_COMPLETE, { runId, agent: agent.name, steps: steps.length });
    return { answer, steps, usage: totalUsage, runId };
  }

  /**
   * Extrae llamadas a herramientas embebidas en texto cuando el proveedor no
   * soporta function calling nativo. Busca un JSON tipo:
   * {"tool":"nombre","args":{...}}
   * @param {string} text
   * @param {string[]} allowed
   * @returns {Array|null}
   * @private
   */
  _parseInlineToolCalls(text, allowed) {
    const parsed = parseLooseJson(text);
    if (parsed && parsed.tool && allowed.includes(parsed.tool)) {
      return [
        {
          function: {
            name: parsed.tool,
            arguments: JSON.stringify(parsed.args || parsed.arguments || {})
          }
        }
      ];
    }
    return null;
  }

  /**
   * Parsea los argumentos de una tool call (string JSON u objeto).
   * @param {string|Object} raw
   * @returns {Object}
   * @private
   */
  _parseArgs(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    return parseLooseJson(raw) || {};
  }

  /**
   * Suma uso de tokens.
   * @private
   */
  _accumulateUsage(total, usage) {
    if (!usage) return;
    total.inputTokens += usage.inputTokens || 0;
    total.outputTokens += usage.outputTokens || 0;
    total.totalTokens += usage.totalTokens || 0;
  }
}

export default AgentRuntime;
