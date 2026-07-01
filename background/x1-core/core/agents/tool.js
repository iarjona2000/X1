/**
 * Sistema de herramientas (tools) para agentes.
 *
 * Una Tool encapsula una acción ejecutable con: nombre, descripción, esquema
 * de parámetros (JSON Schema) y un ejecutor. El ToolRegistry gestiona el
 * catálogo y produce las definiciones en el formato de "function calling" que
 * consumen los proveedores (OpenAI/Anthropic/etc.).
 */

import { ToolError, ValidationError } from '../../utils/errors.js';
import { v } from '../../utils/validation.js';
import Logger from '../logger.js';

const logger = new Logger('Tool');

export class Tool {
  /**
   * @param {Object} config
   * @param {string} config.name - Identificador único (snake_case)
   * @param {string} config.description - Qué hace y cuándo usarla
   * @param {Object} config.parameters - JSON Schema de los argumentos
   * @param {(args:Object, ctx:Object) => Promise<*>} config.execute
   * @param {boolean} [config.requiresConfirmation=false] - Acción irreversible
   * @param {string[]} [config.scopes] - Permisos necesarios (gmail, docs…)
   * @param {import('../../utils/validation.js').default} [config.schema] - Validador X1 opcional
   */
  constructor(config) {
    this.name = config.name;
    this.description = config.description;
    this.parameters = config.parameters || { type: 'object', properties: {} };
    this.execute = config.execute;
    this.requiresConfirmation = config.requiresConfirmation === true;
    this.scopes = config.scopes || [];
    this.schema = config.schema || null;
  }

  /**
   * Definición en formato OpenAI function calling.
   * @returns {Object}
   */
  toFunctionDef() {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: this.parameters
      }
    };
  }

  /**
   * Ejecuta la herramienta validando argumentos.
   * @param {Object} args
   * @param {Object} [ctx] - Contexto (agente, usuario, signal, confirm…)
   * @returns {Promise<*>}
   */
  async run(args, ctx = {}) {
    try {
      const validated = this.schema ? this.schema.parse(args) : args;
      logger.debug(`Ejecutando tool ${this.name}`);
      const result = await this.execute(validated, ctx);
      return result;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ToolError(`Fallo en la herramienta "${this.name}": ${error.message}`, {
        cause: error,
        context: { tool: this.name }
      });
    }
  }
}

export class ToolRegistry {
  constructor() {
    /** @type {Map<string, Tool>} */
    this.tools = new Map();
  }

  /**
   * Registra una herramienta.
   * @param {Tool} tool
   * @returns {this}
   */
  register(tool) {
    if (this.tools.has(tool.name)) {
      logger.warn(`Herramienta "${tool.name}" sobrescrita`);
    }
    this.tools.set(tool.name, tool);
    return this;
  }

  /**
   * Registra varias herramientas.
   * @param {Tool[]} tools
   * @returns {this}
   */
  registerAll(tools) {
    for (const tool of tools) this.register(tool);
    return this;
  }

  /**
   * Obtiene una herramienta por nombre.
   * @param {string} name
   * @returns {Tool|undefined}
   */
  get(name) {
    return this.tools.get(name);
  }

  /**
   * ¿Existe la herramienta?
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this.tools.has(name);
  }

  /**
   * Lista los nombres registrados.
   * @returns {string[]}
   */
  names() {
    return [...this.tools.keys()];
  }

  /**
   * Devuelve las definiciones de function calling para un subconjunto de tools
   * (o todas si no se especifica).
   * @param {string[]} [allowed] - Nombres permitidos
   * @returns {Object[]}
   */
  functionDefs(allowed) {
    const selected = allowed
      ? [...this.tools.values()].filter((t) => allowed.includes(t.name))
      : [...this.tools.values()];
    return selected.map((t) => t.toFunctionDef());
  }

  /**
   * Filtra herramientas por scope disponible.
   * @param {string[]} availableScopes
   * @returns {Tool[]}
   */
  byScopes(availableScopes) {
    return [...this.tools.values()].filter((t) =>
      t.scopes.every((s) => availableScopes.includes(s))
    );
  }

  /**
   * Ejecuta una tool por nombre con manejo de confirmación.
   * @param {string} name
   * @param {Object} args
   * @param {Object} [ctx]
   * @returns {Promise<*>}
   */
  async run(name, args, ctx = {}) {
    const tool = this.get(name);
    if (!tool) throw new ToolError(`Herramienta desconocida: ${name}`, { context: { tool: name } });

    if (tool.requiresConfirmation && ctx.confirm) {
      const approved = await ctx.confirm({
        tool: name,
        args,
        description: tool.description
      });
      if (!approved) {
        return { cancelled: true, reason: 'El usuario no confirmó la acción' };
      }
    }
    return tool.run(args, ctx);
  }
}

/** Registro global de herramientas. */
export const toolRegistry = new ToolRegistry();

export default Tool;
