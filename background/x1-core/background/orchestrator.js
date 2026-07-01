/**
 * Orquestador central de X1 (backend).
 *
 * Punto único de integración que instancia y cablea todos los subsistemas
 * (providers, memoria, workspace, agentes, ensemble, router, predictivo,
 * fact-check, proyectos, colaboración, integraciones) y expone métodos de alto
 * nivel que el service worker enruta desde los mensajes de la UI.
 *
 * Es un singleton perezoso: se inicializa la primera vez que se usa, tras haber
 * inicializado el cifrado del StorageManager.
 */

import StorageManager from '../core/storage.js';
import ConfigManager from '../core/config.js';
import { registry } from '../core/providers/index.js';
import { MemoryManager } from '../core/memory/memory-manager.js';
import { workspace } from '../core/workspace/index.js';
import { AgentManager } from '../core/agents/agent-manager.js';
import { EnsembleEngine } from '../core/ensemble.js';
import { Router } from '../core/router.js';
import { PredictiveAssistant } from '../core/predictive.js';
import { FactChecker } from '../core/factcheck.js';
import { ProjectManager } from '../core/project-manager.js';
import { CollaborativeEngine } from '../core/collaborative.js';
import { N8NIntegration } from '../core/integrations/n8n.js';
import { FineTuneManager } from '../core/integrations/finetune.js';
import { PromptBuilder } from '../core/prompt-builder.js';
import { BudgetManager } from '../core/cost/budget-manager.js';
import { TaskRouter } from '../core/task-router.js';
import { MetricsCollector } from '../core/metrics.js';
import { PersonaManager } from '../core/persona.js';
import { TreeOfThoughts } from '../core/planning/tree-of-thoughts.js';
import { MultilevelMemory } from '../core/memory/multilevel-memory.js';
import JudgeSystem from '../core/judge.js';
import { bus, EVENTS } from '../utils/event-bus.js';
import { wrapError } from '../utils/errors.js';
import Logger from '../core/logger.js';

const logger = new Logger('Orchestrator');

/** Adaptador de StorageManager al contrato {get,set} usado por submódulos. */
const storeAdapter = {
  get: (key) => StorageManager.get(key),
  set: (key, value) => StorageManager.set(key, value)
};

export class Orchestrator {
  constructor() {
    this._initialized = false;
    this.memory = null;
    this.agents = null;
    this.ensemble = null;
    this.router = null;
    this.predictive = null;
    this.factChecker = null;
    this.projects = null;
    this.collaborative = null;
    this.n8n = null;
    this.finetune = null;
    this.budget = null;
    this.taskRouter = null;
    this.metrics = null;
    this.persona = null;
    this.tot = null;
    this.multilevelMemory = null;
    this.workspace = workspace;
  }

  /**
   * Inicializa todos los subsistemas (idempotente).
   */
  init() {
    if (this._initialized) return;

    registry.init();

    this.memory = new MemoryManager({
      store: storeAdapter,
      getConfig: () => ConfigManager.load()
    });

    this.agents = new AgentManager({ store: storeAdapter, memory: this.memory });
    this.agents.ensureTools();

    this.router = new Router({ config: ConfigManager, judge: JudgeSystem });

    this.ensemble = new EnsembleEngine({
      judge: JudgeSystem,
      buildPrompt: (query, sector) => this._buildPrompt(query, sector)
    });

    this.predictive = new PredictiveAssistant({
      workspace,
      storage: StorageManager,
      getConfig: () => ConfigManager.load()
    });

    this.factChecker = new FactChecker({ workspace });
    this.projects = new ProjectManager({ store: storeAdapter });
    this.collaborative = new CollaborativeEngine({
      store: storeAdapter,
      agentManager: this.agents
    });

    this.n8n = new N8NIntegration({
      store: storeAdapter,
      getConfig: () => ConfigManager.load()
    });
    this.n8n.wireEvents();

    this.finetune = new FineTuneManager({
      store: storeAdapter,
      getApiKey: (provider) => StorageManager.getApiKey(provider)
    });

    // --- Gestión de coste y routing por tarea ---
    this.budget = new BudgetManager({
      store: storeAdapter,
      getConfig: () => ConfigManager.load()
    });
    this.taskRouter = new TaskRouter({ budget: this.budget, config: ConfigManager });

    // --- Métricas (autoconectadas al bus) ---
    this.metrics = new MetricsCollector({ store: storeAdapter });
    this.metrics.wire();

    // --- Personalidad y planificación avanzada ---
    this.persona = new PersonaManager();
    this.tot = new TreeOfThoughts();
    this.multilevelMemory = new MultilevelMemory({ memory: this.memory });

    this._initialized = true;
    logger.info('Orquestador inicializado');
  }

  /**
   * Chat en modo automático: enruta al mejor modelo, recupera memoria y
   * contexto de workspace, genera respuesta y (opcionalmente) verifica hechos.
   * @param {Object} params
   * @param {string} params.query
   * @param {Array} [params.history]
   * @param {string} [params.agentId] - Usar un agente concreto
   * @param {Object} [options]
   * @param {(token:string)=>void} [options.onToken]
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<Object>}
   */
  async chat({ query, history = [], agentId }, options = {}) {
    this.init();

    // Si se especifica un agente, delegamos en el runtime del agente
    if (agentId) {
      const run = await this.agents.run(agentId, query, {
        history,
        signal: options.signal,
        confirm: options.confirm
      });
      await this._persistExchange(query, run.answer, { agentId });
      return { text: run.answer, agentId, steps: run.steps, mode: 'agent' };
    }

    // Enrutado por sector
    const route = await this.router.route(query);
    const prompt = await this._buildPrompt(query, route.sector, { history });

    const provider = registry.forModel(route.model);
    const messages = [
      { role: 'system', content: prompt.system },
      ...history,
      { role: 'user', content: prompt.user }
    ];

    bus.emit(EVENTS.MODEL_REQUEST, { model: route.model, sector: route.sector });

    let result;
    if (options.onToken && provider.capabilities.streaming) {
      result = await provider.stream(route.model, messages, {
        onToken: options.onToken,
        signal: options.signal
      });
    } else {
      result = await provider.complete(route.model, messages, { signal: options.signal });
    }

    bus.emit(EVENTS.MODEL_RESPONSE, { model: route.model, tokens: result.usage.totalTokens });

    // Registrar coste real en el presupuesto
    let cost = 0;
    try {
      const spend = await this.budget.record({
        model: route.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens
      });
      cost = spend.cost;
    } catch (error) {
      logger.debug(`No se pudo registrar coste: ${error.message}`);
    }

    await this._persistExchange(query, result.text, { model: route.model, sector: route.sector });

    return {
      text: result.text,
      model: route.model,
      sector: route.sector,
      routeSource: route.source,
      usage: result.usage,
      cost,
      mode: 'auto'
    };
  }

  /**
   * Planifica una tarea compleja con Tree-of-Thoughts.
   * @param {string} goal
   * @param {Object} [options]
   * @returns {Promise<{plan:string[], score:number}>}
   */
  async planTask(goal, options = {}) {
    this.init();
    return this.tot.plan(goal, options);
  }

  /**
   * Selecciona el mejor modelo para una consulta según tipo de tarea y coste.
   * @param {string} query
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async selectModel(query, options = {}) {
    this.init();
    return this.taskRouter.selectModel(query, options);
  }

  /**
   * Estado del presupuesto.
   * @returns {Promise<Object>}
   */
  async budgetStatus() {
    this.init();
    return this.budget.status();
  }

  /**
   * Resumen de métricas del sistema.
   * @returns {Promise<Object>}
   */
  async metricsSummary() {
    this.init();
    await this.metrics.flush();
    return this.metrics.summary();
  }

  /**
   * Modo comparativo: ejecuta varios modelos y devuelve opciones para voto.
   * @param {Object} params - {query, models?, sector?}
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async compare({ query, models, sector }, options = {}) {
    this.init();
    const detectedSector = sector || this.router.detectSector(query).sector;
    const chosen = models || (await this.router.selectComparisonModels(3));
    return this.ensemble.compare(
      { query, models: chosen, sector: detectedSector },
      options
    );
  }

  /**
   * Registra el voto del usuario en una comparación y aprende de él.
   * @param {Object} vote - {winner, sector, taskType, reason, models}
   * @returns {Promise<void>}
   */
  async recordVote(vote) {
    this.init();
    // JudgeSystem.recordVote ya persiste el voto vía StorageManager.addVote
    // y actualiza las preferencias aprendidas; no duplicar el guardado aquí.
    await JudgeSystem.recordVote(vote);
    try {
      await this.memory.rememberVote(vote);
    } catch (error) {
      logger.debug(`No se pudo memorizar el voto: ${error.message}`);
    }
    bus.emit(EVENTS.VOTE_RECORDED, vote);
  }

  /**
   * Ejecuta la verificación de hechos sobre una respuesta.
   * @param {Object} params - {answer, query}
   * @returns {Promise<Object>}
   */
  async factCheck(params) {
    this.init();
    return this.factChecker.verify(params);
  }

  /**
   * Obtiene sugerencias proactivas.
   * @returns {Promise<Array>}
   */
  async getSuggestions() {
    this.init();
    return this.predictive.getSuggestions();
  }

  /**
   * Construye el prompt con memoria + contexto de workspace + presupuesto.
   * @param {string} query
   * @param {string} sector
   * @param {Object} [extra]
   * @returns {Promise<{system:string, user:string}>}
   * @private
   */
  async _buildPrompt(query, sector, extra = {}) {
    const builder = new PromptBuilder({ maxContextTokens: 8000, reservedForOutput: 1200 });
    builder
      .system(
        `Eres X1, un asistente de IA experto${
          sector && sector !== 'general' ? ` en el ámbito de ${sector}` : ''
        }. Responde de forma precisa, útil y honesta en español.`
      )
      .user(query);

    // Memoria relevante
    try {
      const mem = await this.memory.recall(query, { k: 5, sector });
      if (mem.length) builder.addMemory(mem);
    } catch (error) {
      logger.debug(`Memoria no disponible: ${error.message}`);
    }

    // Contexto de workspace si hay sesión
    try {
      if (await workspace.isLoggedIn()) {
        const ctx = await workspace.buildContext({ maxTokens: 800 });
        if (ctx) builder.addWorkspaceContext(ctx);
      }
    } catch (error) {
      logger.debug(`Workspace no disponible: ${error.message}`);
    }

    if (extra.history?.length) builder.addHistory(extra.history);

    return builder.build();
  }

  /**
   * Persiste el intercambio en historial y detecta preferencias implícitas.
   * @private
   */
  async _persistExchange(query, answer, meta) {
    try {
      await StorageManager.addToHistory({ role: 'user', content: query });
      await StorageManager.addToHistory({ role: 'assistant', content: answer, ...meta });
    } catch (error) {
      logger.debug(`No se pudo guardar historial: ${error.message}`);
    }
  }

  /**
   * Health-check global de subsistemas.
   * @returns {Promise<Object>}
   */
  async health() {
    this.init();
    const [providers, memoryStats, loggedIn] = await Promise.all([
      registry.healthAll().catch((e) => ({ error: e.message })),
      this.memory.stats().catch(() => ({ count: 0 })),
      workspace.isLoggedIn().catch(() => false)
    ]);
    return {
      providers,
      memory: memoryStats,
      workspaceConnected: loggedIn,
      agents: (await this.agents.list()).length
    };
  }
}

/** Singleton del orquestador. */
export const orchestrator = new Orchestrator();

export default orchestrator;
