/**
 * Enrutador de mensajes del service worker.
 *
 * Traduce los mensajes que llegan desde la UI (popup, options, content scripts)
 * a llamadas del orquestador y subsistemas. Centraliza:
 *  - Un registro de acciones {tipo -> handler}.
 *  - Normalización de errores a un formato serializable.
 *  - Gating de acciones que requieren cifrado inicializado.
 *  - Streaming de tokens hacia la UI mediante chrome.runtime ports.
 */

import StorageManager from '../core/storage.js';
import ConfigManager from '../core/config.js';
import { orchestrator } from './orchestrator.js';
import { workspace } from '../core/workspace/index.js';
import { registry } from '../core/providers/index.js';
import { X1Error, wrapError } from '../utils/errors.js';
import Logger from '../core/logger.js';

const logger = new Logger('MessageRouter');

export class MessageRouter {
  constructor() {
    /** @type {Map<string, {handler:Function, requiresAuth:boolean}>} */
    this.actions = new Map();
    this._ready = false;
    this._registerActions();
  }

  /**
   * ¿Está el cifrado inicializado (StorageManager.init llamado)?
   * @returns {boolean}
   */
  isReady() {
    return this._ready && Boolean(StorageManager.key);
  }

  /**
   * Registra un handler para un tipo de mensaje.
   * @param {string} type
   * @param {Function} handler - async (payload, ctx) => result
   * @param {Object} [options]
   * @param {boolean} [options.requiresAuth=true]
   */
  on(type, handler, options = {}) {
    this.actions.set(type, {
      handler,
      requiresAuth: options.requiresAuth !== false
    });
  }

  /**
   * Procesa un mensaje entrante y devuelve un resultado serializable.
   * @param {Object} message - {type, ...payload}
   * @param {Object} [ctx] - {sender, port}
   * @returns {Promise<Object>} {ok, data} | {ok:false, error}
   */
  async handle(message, ctx = {}) {
    const { type } = message || {};
    const action = this.actions.get(type);
    if (!action) {
      return this._error(new X1Error(`Acción desconocida: ${type}`, { code: 'NOT_FOUND' }));
    }

    if (action.requiresAuth && !this.isReady()) {
      return this._error(
        new X1Error('X1 no está desbloqueado. Introduce tu contraseña.', {
          code: 'AUTH',
          context: { needsUnlock: true }
        })
      );
    }

    try {
      const data = await action.handler(message, ctx);
      return { ok: true, data };
    } catch (error) {
      const wrapped = wrapError(error);
      logger.error(`Acción "${type}" falló:`, wrapped.message);
      return this._error(wrapped);
    }
  }

  /**
   * Registra todas las acciones del backend.
   * @private
   */
  _registerActions() {
    // --- Inicialización / desbloqueo (no requiere auth previa) ---
    this.on(
      'INIT',
      async ({ password }) => {
        await StorageManager.init(password);
        await ConfigManager.load();
        orchestrator.init();
        this._ready = true;
        logger.info('X1 desbloqueado e inicializado');
        return { initialized: true };
      },
      { requiresAuth: false }
    );

    this.on('IS_READY', async () => ({ ready: this.isReady() }), { requiresAuth: false });

    // --- Chat ---
    this.on('CHAT', async ({ query, history, agentId }, ctx) => {
      const onToken = ctx.port
        ? (token) => ctx.port.postMessage({ type: 'TOKEN', token })
        : undefined;
      const result = await orchestrator.chat({ query, history, agentId }, { onToken });
      ctx.port?.postMessage({ type: 'DONE' });
      return result;
    });

    // --- Comparación / ensemble ---
    this.on('COMPARE', async ({ query, models, sector }) =>
      orchestrator.compare({ query, models, sector })
    );

    this.on('VOTE', async ({ vote }) => {
      await orchestrator.recordVote(vote);
      return { recorded: true };
    });

    // --- Fact-check ---
    this.on('FACT_CHECK', async ({ answer, query }) =>
      orchestrator.factCheck({ answer, query })
    );

    // --- Sugerencias proactivas ---
    this.on('SUGGESTIONS', async () => orchestrator.getSuggestions());

    // --- Agentes ---
    this.on('AGENT_LIST', async () => (await orchestrator.agents.list()).map((a) => a.toJSON()));
    this.on('AGENT_CREATE', async ({ config }) => (await orchestrator.agents.create(config)).toJSON());
    this.on('AGENT_UPDATE', async ({ id, patch }) => (await orchestrator.agents.update(id, patch)).toJSON());
    this.on('AGENT_DELETE', async ({ id }) => {
      await orchestrator.agents.delete(id);
      return { deleted: true };
    });
    this.on('AGENT_RUN', async ({ id, goal, history }, ctx) =>
      orchestrator.agents.run(id, goal, {
        history,
        confirm: ctx.confirm
      })
    );
    this.on('AGENT_ADD_KNOWLEDGE', async ({ id, documents }) =>
      orchestrator.agents.addKnowledge(id, documents)
    );
    this.on('AGENT_SEED', async () => (await orchestrator.agents.seedDefaults()).map((a) => a.toJSON()));

    // --- Equipos / colaboración ---
    this.on('TEAM_CREATE', async ({ name, description, agentIds }) =>
      orchestrator.collaborative.createTeam({ name, description, agentIds })
    );
    this.on('TEAM_LIST', async () => orchestrator.collaborative.listTeams());
    this.on('TEAM_RUN', async ({ teamId, goal }) =>
      orchestrator.collaborative.runTeam(teamId, goal)
    );
    this.on('TEAM_RUNS', async () => orchestrator.collaborative.listRuns());

    // --- Proyectos ---
    this.on('PROJECT_CREATE', async ({ name, goal, deadlineDays }) =>
      orchestrator.projects.createProject({ name, goal, deadlineDays })
    );
    this.on('PROJECT_LIST', async () => orchestrator.projects.list());
    this.on('PROJECT_REPORT', async ({ id }) => orchestrator.projects.report(id));
    this.on('PROJECT_UPDATE_TASK', async ({ projectId, taskId, status }) =>
      orchestrator.projects.updateTask(projectId, taskId, status)
    );
    this.on('PROJECT_DELAYS', async () => orchestrator.projects.detectDelays());

    // --- Fine-tuning ---
    this.on('FINETUNE_DATASET', async ({ examples, format }) =>
      orchestrator.finetune.buildDataset(examples, { format })
    );
    this.on('FINETUNE_CREATE', async ({ baseModel, dataset, agentId }) =>
      orchestrator.finetune.createJob({ baseModel, dataset, agentId })
    );
    this.on('FINETUNE_JOBS', async () => orchestrator.finetune.listJobs());
    this.on('FINETUNE_EVAL', async ({ baseModel, tunedModel, testQueries }) =>
      orchestrator.finetune.blindEval({ baseModel, tunedModel, testQueries })
    );

    // --- Workspace ---
    this.on('WORKSPACE_LOGIN', async () => workspace.login());
    this.on('WORKSPACE_LOGOUT', async () => {
      await workspace.logout();
      return { loggedOut: true };
    });
    this.on('WORKSPACE_STATUS', async () => ({ loggedIn: await workspace.isLoggedIn() }));
    this.on('WORKSPACE_INBOX', async () => workspace.inboxSummary());
    this.on('WORKSPACE_MEETING_PREP', async () => workspace.prepareMeeting());

    // --- Memoria ---
    this.on('MEMORY_STATS', async () => orchestrator.memory.stats());
    this.on('MEMORY_REMEMBER', async ({ text, type, sector }) =>
      orchestrator.memory.remember({ text, type, sector })
    );
    this.on('MEMORY_RECALL', async ({ query, k }) => orchestrator.memory.recall(query, { k }));
    this.on('MEMORY_FORGET_ALL', async () => {
      await orchestrator.memory.forgetAll();
      return { cleared: true };
    });

    // --- Configuración / claves ---
    this.on('CONFIG_GET', async () => ConfigManager.load());
    this.on('CONFIG_SAVE', async ({ config }) => {
      await ConfigManager.save(config);
      return { saved: true };
    });
    this.on('SET_API_KEY', async ({ provider, apiKey }) => {
      await StorageManager.setApiKey(provider, apiKey);
      return { saved: true };
    });
    this.on('TEST_PROVIDERS', async () => registry.healthAll());

    // --- Historial ---
    this.on('HISTORY_GET', async () => StorageManager.getHistory());
    this.on('HISTORY_CLEAR', async () => {
      await StorageManager.clearHistory();
      return { cleared: true };
    });
    this.on('VOTES_GET', async () => StorageManager.getVotes());

    // --- Coste / presupuesto / métricas / planificación ---
    this.on('BUDGET_STATUS', async () => orchestrator.budgetStatus());
    this.on('METRICS_SUMMARY', async () => orchestrator.metricsSummary());
    this.on('SELECT_MODEL', async ({ query, critical }) =>
      orchestrator.selectModel(query, { critical })
    );
    this.on('PLAN_TASK', async ({ goal }) => orchestrator.planTask(goal));

    // --- Salud del sistema ---
    this.on('HEALTH', async () => orchestrator.health());
  }

  /**
   * Formatea un error para enviarlo a la UI.
   * @param {X1Error} error
   * @returns {Object}
   * @private
   */
  _error(error) {
    return {
      ok: false,
      error: {
        message: error.userMessage ? error.userMessage() : error.message,
        code: error.code || 'UNKNOWN',
        context: error.context || {}
      }
    };
  }
}

/** Instancia compartida. */
export const messageRouter = new MessageRouter();

export default messageRouter;
