/**
 * Gestor de agentes: CRUD persistente + ejecución.
 *
 * Guarda las definiciones de agentes en storage, gestiona la base de
 * conocimiento (indexándola en memoria vectorial) y ofrece un método run()
 * que resuelve el agente y lo ejecuta con el runtime.
 */

import { Agent } from './agent.js';
import { AgentRuntime } from './agent-runtime.js';
import { toolRegistry } from './tool.js';
import { createWorkspaceTools } from './tools/workspace-tools.js';
import { createUtilityTools } from './tools/utility-tools.js';
import { createMemoryTools } from './tools/memory-tools.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { MEMORY_TYPES } from '../memory/memory-manager.js';
import Logger from '../logger.js';

const logger = new Logger('AgentManager');
const STORAGE_KEY = 'x1_agents';

export class AgentManager {
  /**
   * @param {Object} deps
   * @param {{get:Function, set:Function}} deps.store
   * @param {import('../memory/memory-manager.js').MemoryManager} [deps.memory]
   */
  constructor(deps) {
    this.store = deps.store;
    this.memory = deps.memory || null;
    this.runtime = new AgentRuntime({ memory: this.memory, tools: toolRegistry });
    this._toolsReady = false;
  }

  /**
   * Registra las herramientas integradas una sola vez.
   */
  ensureTools() {
    if (this._toolsReady) return;
    toolRegistry.registerAll(createUtilityTools());
    toolRegistry.registerAll(createWorkspaceTools());
    if (this.memory) toolRegistry.registerAll(createMemoryTools(this.memory));
    this._toolsReady = true;
    logger.info(`Herramientas disponibles: ${toolRegistry.names().join(', ')}`);
  }

  /**
   * Carga todos los agentes persistidos.
   * @returns {Promise<Agent[]>}
   */
  async list() {
    const raw = (await this.store.get(STORAGE_KEY)) || [];
    return raw.map((json) => Agent.fromJSON(json));
  }

  /**
   * Obtiene un agente por id.
   * @param {string} id
   * @returns {Promise<Agent>}
   */
  async get(id) {
    const agents = await this.list();
    const agent = agents.find((a) => a.id === id);
    if (!agent) throw new NotFoundError(`Agente no encontrado: ${id}`);
    return agent;
  }

  /**
   * Busca un agente por nombre (case-insensitive).
   * @param {string} name
   * @returns {Promise<Agent|null>}
   */
  async findByName(name) {
    const agents = await this.list();
    const target = name.trim().toLowerCase();
    return agents.find((a) => a.name.toLowerCase() === target) || null;
  }

  /**
   * Crea y persiste un agente nuevo.
   * @param {Object} config
   * @returns {Promise<Agent>}
   */
  async create(config) {
    const agent = new Agent(config);
    const agents = await this.list();
    if (agents.some((a) => a.name.toLowerCase() === agent.name.toLowerCase())) {
      throw new ValidationError(`Ya existe un agente llamado "${agent.name}"`);
    }
    agents.push(agent);
    await this._persist(agents);
    logger.info(`Agente creado: ${agent.name} (${agent.id})`);
    return agent;
  }

  /**
   * Actualiza campos de un agente.
   * @param {string} id
   * @param {Object} patch
   * @returns {Promise<Agent>}
   */
  async update(id, patch) {
    const agents = await this.list();
    const index = agents.findIndex((a) => a.id === id);
    if (index === -1) throw new NotFoundError(`Agente no encontrado: ${id}`);
    const updated = new Agent({
      ...agents[index].toJSON(),
      ...patch,
      id,
      updatedAt: new Date().toISOString()
    });
    agents[index] = updated;
    await this._persist(agents);
    return updated;
  }

  /**
   * Elimina un agente.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    const agents = await this.list();
    const filtered = agents.filter((a) => a.id !== id);
    if (filtered.length === agents.length) {
      throw new NotFoundError(`Agente no encontrado: ${id}`);
    }
    await this._persist(filtered);
    logger.info(`Agente eliminado: ${id}`);
  }

  /**
   * Añade documentos a la base de conocimiento de un agente e indexa el
   * contenido en memoria (etiquetado con el id del agente).
   * @param {string} id
   * @param {Array<{title:string, content:string}>} documents
   * @returns {Promise<{indexed:number}>}
   */
  async addKnowledge(id, documents) {
    const agent = await this.get(id);
    if (!this.memory) {
      logger.warn('Sin memoria: el conocimiento no se indexará semánticamente');
    }
    let indexed = 0;
    for (const doc of documents) {
      if (this.memory) {
        await this.memory.remember({
          text: doc.content,
          type: MEMORY_TYPES.DOCUMENT,
          metadata: { agentId: id, title: doc.title }
        });
      }
      agent.knowledgeBase.push(doc.title);
      indexed++;
    }
    await this.update(id, { knowledgeBase: agent.knowledgeBase });
    return { indexed };
  }

  /**
   * Ejecuta un agente sobre un objetivo.
   * @param {string} id
   * @param {string} goal
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async run(id, goal, options = {}) {
    this.ensureTools();
    const agent = await this.get(id);

    // Recuperar contexto de la base de conocimiento del agente
    let knowledgeContext = '';
    if (this.memory && agent.knowledgeBase.length) {
      const ctx = await this.memory.recall(goal, {
        k: 4,
        type: MEMORY_TYPES.DOCUMENT
      });
      const relevant = ctx.filter((m) => m.metadata?.agentId === id);
      knowledgeContext = relevant.map((m) => m.text).join('\n---\n');
    }

    return this.runtime.run(agent, goal, { ...options, knowledgeContext });
  }

  /**
   * Crea un conjunto de agentes de ejemplo (marketing, legal, investigación).
   * @returns {Promise<Agent[]>}
   */
  async seedDefaults() {
    const defaults = [
      {
        name: 'Marketing',
        description: 'Redacta copy persuasivo y posts para redes.',
        model: 'gpt-4o-mini',
        instructions:
          'Eres un experto en marketing digital. Redactas textos persuasivos, claros y adaptados al tono de marca. Priorizas ganchos potentes y llamadas a la acción.',
        tools: ['docs_create', 'memory_recall', 'final_answer'],
        scopes: ['docs']
      },
      {
        name: 'Legal',
        description: 'Revisa y redacta cláusulas contractuales con precisión.',
        model: 'claude-3-5-sonnet-20241022',
        instructions:
          'Eres un asistente jurídico meticuloso. Priorizas la precisión normativa, señalas riesgos y nunca inventas referencias legales. Estructuras el texto en cláusulas numeradas.',
        tools: ['drive_search', 'docs_create', 'final_answer'],
        scopes: ['drive', 'docs']
      },
      {
        name: 'Investigador',
        description: 'Recopila y sintetiza información de correos y documentos.',
        model: 'gpt-4o-mini',
        instructions:
          'Eres un analista de investigación. Reúnes datos de fuentes disponibles (correos, documentos), los contrastas y produces síntesis estructuradas con fuentes citadas.',
        tools: ['gmail_search', 'drive_search', 'memory_remember', 'final_answer'],
        scopes: ['gmail', 'drive']
      }
    ];
    const created = [];
    for (const def of defaults) {
      try {
        created.push(await this.create(def));
      } catch (error) {
        logger.debug(`Agente por defecto "${def.name}" ya existe`);
      }
    }
    return created;
  }

  /**
   * Persiste la lista de agentes.
   * @param {Agent[]} agents
   * @returns {Promise<void>}
   * @private
   */
  async _persist(agents) {
    await this.store.set(STORAGE_KEY, agents.map((a) => a.toJSON()));
  }
}

export default AgentManager;
