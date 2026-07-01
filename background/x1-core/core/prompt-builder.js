/**
 * Construcción de prompts con presupuesto de contexto.
 *
 * Ensambla el prompt final a partir de: instrucción de sistema, memoria
 * recuperada, historial de conversación, contexto de Workspace y la consulta
 * del usuario. Recorta inteligentemente por prioridades para respetar el
 * límite de tokens del modelo destino.
 */

import { estimateTokens, estimateMessagesTokens, truncateToTokens } from '../utils/text.js';

/**
 * Prioridades de secciones (mayor = se conserva primero al recortar).
 */
export const SECTION_PRIORITY = {
  system: 100,
  userQuery: 90,
  workspaceContext: 70,
  memory: 60,
  history: 40
};

/**
 * Constructor de prompts encadenable.
 */
export class PromptBuilder {
  /**
   * @param {Object} [options]
   * @param {number} [options.maxContextTokens=8000] - Presupuesto total
   * @param {number} [options.reservedForOutput=1000] - Tokens reservados a la respuesta
   */
  constructor(options = {}) {
    this.maxContextTokens = options.maxContextTokens ?? 8000;
    this.reservedForOutput = options.reservedForOutput ?? 1000;
    this.sections = [];
    this._system = '';
    this._userQuery = '';
  }

  /**
   * Define la instrucción de sistema.
   * @param {string} text
   * @returns {this}
   */
  system(text) {
    this._system = text || '';
    return this;
  }

  /**
   * Define la consulta del usuario.
   * @param {string} text
   * @returns {this}
   */
  user(text) {
    this._userQuery = text || '';
    return this;
  }

  /**
   * Añade una sección de contexto con etiqueta y prioridad.
   * @param {string} label - Encabezado legible (p.ej. "MEMORIA RELEVANTE")
   * @param {string} content
   * @param {number} [priority=50]
   * @returns {this}
   */
  addSection(label, content, priority = 50) {
    if (content && content.trim()) {
      this.sections.push({ label, content: content.trim(), priority });
    }
    return this;
  }

  /**
   * Añade fragmentos de memoria recuperada.
   * @param {Array<{text:string, score?:number}>} memories
   * @returns {this}
   */
  addMemory(memories) {
    if (!memories?.length) return this;
    const formatted = memories
      .map((m, i) => `[${i + 1}] ${m.text}`)
      .join('\n');
    return this.addSection('MEMORIA RELEVANTE DEL USUARIO', formatted, SECTION_PRIORITY.memory);
  }

  /**
   * Añade contexto de Google Workspace (emails, docs, eventos).
   * @param {string} context
   * @returns {this}
   */
  addWorkspaceContext(context) {
    return this.addSection(
      'CONTEXTO DE WORKSPACE',
      context,
      SECTION_PRIORITY.workspaceContext
    );
  }

  /**
   * Añade historial de conversación como texto plano.
   * @param {Array<{role:string, content:string}>} history
   * @param {number} [maxTurns=6]
   * @returns {this}
   */
  addHistory(history, maxTurns = 6) {
    if (!history?.length) return this;
    const recent = history.slice(-maxTurns);
    const formatted = recent
      .map((m) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
      .join('\n');
    return this.addSection('HISTORIAL RECIENTE', formatted, SECTION_PRIORITY.history);
  }

  /**
   * Construye el system prompt final combinando sistema + secciones de
   * contexto, recortando por prioridad hasta caber en el presupuesto.
   * @returns {{system:string, user:string, estimatedTokens:number}}
   */
  build() {
    const budget = this.maxContextTokens - this.reservedForOutput;
    const baseTokens =
      estimateTokens(this._system) + estimateTokens(this._userQuery);
    let available = budget - baseTokens;

    // Ordenar secciones por prioridad descendente
    const ordered = [...this.sections].sort((a, b) => b.priority - a.priority);
    const kept = [];

    for (const section of ordered) {
      const block = this._formatSection(section);
      const cost = estimateTokens(block);
      if (cost <= available) {
        kept.push(section);
        available -= cost;
      } else if (available > 100) {
        // Recortar la sección para que quepa parcialmente
        const truncated = truncateToTokens(section.content, available - 20);
        kept.push({ ...section, content: truncated });
        available = 0;
      }
      if (available <= 0) break;
    }

    // Reordenar las secciones conservadas a un orden de lectura natural
    kept.sort((a, b) => b.priority - a.priority);
    const contextBlock = kept.map((s) => this._formatSection(s)).join('\n\n');
    const system = contextBlock
      ? `${this._system}\n\n${contextBlock}`
      : this._system;

    return {
      system,
      user: this._userQuery,
      estimatedTokens: estimateTokens(system) + estimateTokens(this._userQuery)
    };
  }

  /**
   * Construye una lista de mensajes estilo chat (para APIs multi-turno).
   * @param {Array<{role:string, content:string}>} [history]
   * @returns {{messages:Array, estimatedTokens:number}}
   */
  buildMessages(history = []) {
    const { system, user } = this.build();
    const messages = [{ role: 'system', content: system }];
    for (const turn of history) {
      messages.push({ role: turn.role, content: turn.content });
    }
    messages.push({ role: 'user', content: user });
    return { messages, estimatedTokens: estimateMessagesTokens(messages) };
  }

  /**
   * Formatea una sección con su encabezado.
   * @param {{label:string, content:string}} section
   * @returns {string}
   * @private
   */
  _formatSection(section) {
    return `### ${section.label}\n${section.content}`;
  }
}

/**
 * Atajo para construir un prompt simple sistema+usuario.
 * @param {string} system
 * @param {string} user
 * @param {Object} [options]
 * @returns {{system:string, user:string}}
 */
export function simplePrompt(system, user, options = {}) {
  return new PromptBuilder(options).system(system).user(user).build();
}

export default PromptBuilder;
