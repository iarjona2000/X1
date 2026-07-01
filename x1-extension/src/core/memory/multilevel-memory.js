/**
 * Memoria multinivel.
 *
 * Organiza la memoria en cuatro niveles cognitivos, apoyándose en el
 * MemoryManager vectorial para el almacenamiento persistente:
 *
 *  - Episódica: interacciones concretas pasadas (qué pasó y cuándo).
 *  - Semántica: hechos y relaciones estables sobre el usuario/dominio.
 *  - Procedural: cómo se hacen las cosas (procedimientos aprendidos).
 *  - Working: contexto volátil de la sesión actual (no se persiste como vector).
 *
 * Recuperar combina los tres niveles persistentes más el working actual y los
 * comprime a un presupuesto de tokens.
 */

import { MEMORY_TYPES } from './memory-manager.js';
import { truncateToTokens } from '../../utils/text.js';
import Logger from '../logger.js';

const logger = new Logger('MultilevelMemory');

export class MultilevelMemory {
  /**
   * @param {Object} deps
   * @param {import('./memory-manager.js').MemoryManager} deps.memory
   * @param {number} [deps.workingCapacity=12]
   */
  constructor(deps) {
    this.memory = deps.memory;
    this.workingCapacity = deps.workingCapacity || 12;
    /** @type {Array<{role:string, content:string, ts:number}>} */
    this.working = [];
  }

  /**
   * Registra una interacción, distribuyéndola por niveles.
   * @param {Object} interaction - {input, output, model, satisfaction}
   * @returns {Promise<void>}
   */
  async store(interaction) {
    const { input, output } = interaction;

    // Working: contexto inmediato
    this.pushWorking('user', input);
    this.pushWorking('assistant', output);

    // Episódica: la interacción como evento fechado
    await this.memory.remember({
      text: `El usuario preguntó: "${input}". Respuesta dada: "${truncateToTokens(output, 120)}".`,
      type: MEMORY_TYPES.CONTEXT,
      metadata: { level: 'episodic', model: interaction.model, ts: Date.now() }
    });

    // Semántica: extraer hechos estables (heurística ligera, sin LLM)
    const facts = this._extractFacts(input, output);
    for (const fact of facts) {
      await this.memory.remember({
        text: fact,
        type: MEMORY_TYPES.FACT,
        metadata: { level: 'semantic' }
      });
    }
  }

  /**
   * Aprende un procedimiento (cómo hacer algo) de forma explícita.
   * @param {string} skill - Nombre del procedimiento
   * @param {string} steps - Descripción de los pasos
   * @returns {Promise<void>}
   */
  async learnProcedure(skill, steps) {
    await this.memory.remember({
      text: `Procedimiento "${skill}": ${steps}`,
      type: MEMORY_TYPES.PREFERENCE,
      metadata: { level: 'procedural', skill }
    });
    logger.debug(`Procedimiento aprendido: ${skill}`);
  }

  /**
   * Añade una entrada al buffer de working memory (con expulsión FIFO).
   * @param {string} role
   * @param {string} content
   */
  pushWorking(role, content) {
    this.working.push({ role, content, ts: Date.now() });
    while (this.working.length > this.workingCapacity) this.working.shift();
  }

  /**
   * Recupera contexto combinado de todos los niveles para una consulta.
   * @param {string} query
   * @param {Object} [options]
   * @param {number} [options.maxTokens=1000]
   * @returns {Promise<{text:string, working:Array, retrieved:Array}>}
   */
  async recall(query, options = {}) {
    const { maxTokens = 1000 } = options;
    const budgetPersistent = Math.floor(maxTokens * 0.6);

    const retrieved = await this.memory.recall(query, { k: 8 });
    const persistentLines = retrieved.map((m) => {
      const level = m.metadata?.level || 'memoria';
      return `- (${level}) ${m.text}`;
    });

    const workingLines = this.working
      .slice(-6)
      .map((w) => `${w.role === 'user' ? 'Usuario' : 'Asistente'}: ${w.content}`);

    const text = [
      persistentLines.length ? 'MEMORIA A LARGO PLAZO:\n' + truncateToTokens(persistentLines.join('\n'), budgetPersistent) : '',
      workingLines.length ? 'CONVERSACIÓN ACTUAL:\n' + workingLines.join('\n') : ''
    ]
      .filter(Boolean)
      .join('\n\n');

    return {
      text: truncateToTokens(text, maxTokens),
      working: [...this.working],
      retrieved
    };
  }

  /**
   * Limpia la working memory (p.ej. al iniciar una nueva sesión).
   */
  clearWorking() {
    this.working = [];
  }

  /**
   * Extracción heurística de hechos estables de una interacción.
   * Detecta afirmaciones de identidad/preferencia ("mi nombre es", "prefiero",
   * "trabajo en", "uso"). Evita depender de un LLM para no encarecer cada turno.
   * @param {string} input
   * @param {string} output
   * @returns {string[]}
   * @private
   */
  _extractFacts(input) {
    const facts = [];
    const patterns = [
      /mi nombre es ([^.,\n]{2,40})/i,
      /me llamo ([^.,\n]{2,40})/i,
      /trabajo en ([^.,\n]{2,60})/i,
      /prefiero ([^.,\n]{2,80})/i,
      /siempre (?:uso|utilizo) ([^.,\n]{2,80})/i,
      /mi (?:empresa|proyecto) (?:es|se llama) ([^.,\n]{2,60})/i
    ];
    for (const re of patterns) {
      const match = input.match(re);
      if (match) facts.push(match[0].trim());
    }
    return facts;
  }
}

export default MultilevelMemory;
