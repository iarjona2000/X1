/**
 * Herramientas de memoria para agentes: recordar y recuperar información
 * persistente del usuario. Permiten a un agente construir contexto a largo
 * plazo entre sesiones.
 */

import { Tool } from '../tool.js';

/**
 * @param {import('../../memory/memory-manager.js').MemoryManager} memory
 * @returns {Tool[]}
 */
export function createMemoryTools(memory) {
  return [
    new Tool({
      name: 'memory_recall',
      description:
        'Recupera recuerdos relevantes del usuario (preferencias, contexto de proyectos, correcciones previas) para una consulta.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Sobre qué recuperar memoria' },
          k: { type: 'number', description: 'Número de recuerdos (por defecto 5)' }
        },
        required: ['query']
      },
      execute: async ({ query, k = 5 }) => {
        const memories = await memory.recall(query, { k });
        return memories.map((m) => ({ text: m.text, type: m.metadata.type, score: Number(m.score.toFixed(3)) }));
      }
    }),

    new Tool({
      name: 'memory_remember',
      description:
        'Guarda un dato importante del usuario para recordarlo en el futuro (preferencia de estilo, hecho de un proyecto, corrección).',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Qué recordar' },
          type: {
            type: 'string',
            enum: ['preference', 'context', 'correction', 'fact'],
            description: 'Tipo de memoria'
          }
        },
        required: ['text']
      },
      execute: async ({ text, type = 'context' }) => {
        const idsCreated = await memory.remember({ text, type });
        return { stored: idsCreated.length, status: 'recordado' };
      }
    })
  ];
}

export default createMemoryTools;
