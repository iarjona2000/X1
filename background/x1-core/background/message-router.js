/**
 * Enrutador de mensajes del service worker.
 *
 * Traduce los mensajes que llegan desde la UI (popup, options, content scripts)
 * a llamadas del orquestador y subsistemas. Centraliza:
 *  - Un registro de acciones {tipo -> handler}.
 *  - Validación de payload contra el protocolo unificado (utils/protocol.js).
 *  - Normalización de errores a un formato serializable.
 *  - Gating de acciones que requieren cifrado inicializado.
 *  - Streaming de tokens hacia la UI mediante chrome.runtime ports.
 *
 * El protocolo de mensajes vive en `../utils/protocol.js` — leerlo antes
 * de añadir un nuevo handler.
 */

import StorageManager from '../core/storage.js';
import ConfigManager from '../core/config.js';
import { orchestrator } from './orchestrator.js';
import { workspace } from '../core/workspace/index.js';
import { registry } from '../core/providers/index.js';
import { X1Error, wrapError } from '../utils/errors.js';
import Logger from '../core/logger.js';
import {
  REQ,
  validateRequest,
  okResponse,
  errResponse,
  ERR_CODE
} from '../utils/protocol.js';

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
   * @param {string} type  - debe ser REQ.X
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

    if (!type) {
      return errResponse('Mensaje sin tipo', ERR_CODE.VALIDATION);
    }

    const action = this.actions.get(type);
    if (!action) {
      return errResponse(`Acción desconocida: ${type}`, ERR_CODE.NOT_FOUND);
    }

    // Gate 1: AUTH (require unlock)
    if (action.requiresAuth && !this.isReady()) {
      return errResponse('X1 no está desbloqueado. Introduce tu contraseña.', ERR_CODE.AUTH,
        { needsUnlock: true });
    }

    // Gate 2: payload válido contra el protocolo
    const validationError = validateRequest(type, message);
    if (validationError) {
      logger.warn(`[X1] Validación falló en "${type}": ${validationError}`);
      return errResponse(validationError, ERR_CODE.VALIDATION);
    }

    try {
      const data = await action.handler(message, ctx);
      return okResponse(data);
    } catch (error) {
      const wrapped = wrapError(error);
      logger.error(`Acción "${type}" falló:`, wrapped.message);
      return this._formatError(wrapped);
    }
  }

  /**
   * Registra todas las acciones del backend.
   * Tipos declarados en `utils/protocol.js` (REQ).
   * @private
   */
  _registerActions() {
    // --- Inicialización / desbloqueo (no requiere auth previa) ---
    this.on(
      REQ.INIT,
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

    this.on(REQ.IS_READY, async () => ({ ready: this.isReady() }), { requiresAuth: false });

    // --- Chat ---
    this.on(REQ.CHAT, async ({ query, history, agentId }, ctx) => {
      const onToken = ctx.port
        ? (token) => ctx.port.postMessage({ type: 'TOKEN', token })
        : undefined;
      const result = await orchestrator.chat({ query, history, agentId }, { onToken });
      ctx.port?.postMessage({ type: 'DONE' });
      return result;
    });

    // --- Comparación / ensemble ---
    this.on(REQ.COMPARE, async ({ query, models, sector }) =>
      orchestrator.compare({ query, models, sector })
    );

    this.on(REQ.VOTE, async ({ vote }) => {
      await orchestrator.recordVote(vote);
      return { recorded: true };
    });

    // --- Fact-check ---
    this.on(REQ.FACT_CHECK, async ({ answer, query }) =>
      orchestrator.factCheck({ answer, query })
    );

    // --- Sugerencias proactivas ---
    this.on(REQ.SUGGESTIONS, async () => orchestrator.getSuggestions());

    // --- Agentes ---
    this.on(REQ.AGENT_LIST, async () => (await orchestrator.agents.list()).map((a) => a.toJSON()));
    this.on(REQ.AGENT_CREATE, async ({ config }) => (await orchestrator.agents.create(config)).toJSON());
    this.on(REQ.AGENT_UPDATE, async ({ id, patch }) => (await orchestrator.agents.update(id, patch)).toJSON());
    this.on(REQ.AGENT_DELETE, async ({ id }) => {
      await orchestrator.agents.delete(id);
      return { deleted: true };
    });
    this.on(REQ.AGENT_RUN, async ({ id, goal, history }, ctx) =>
      orchestrator.agents.run(id, goal, {
        history,
        confirm: ctx.confirm
      })
    );
    this.on(REQ.AGENT_ADD_KNOWLEDGE, async ({ id, documents }) =>
      orchestrator.agents.addKnowledge(id, documents)
    );
    this.on(REQ.AGENT_SEED, async () => (await orchestrator.agents.seedDefaults()).map((a) => a.toJSON()));

    // --- Equipos / colaboración ---
    this.on(REQ.TEAM_CREATE, async ({ name, description, agentIds }) =>
      orchestrator.collaborative.createTeam({ name, description, agentIds })
    );
    this.on(REQ.TEAM_LIST, async () => orchestrator.collaborative.listTeams());
    this.on(REQ.TEAM_RUN, async ({ teamId, goal }) =>
      orchestrator.collaborative.runTeam(teamId, goal)
    );
    this.on(REQ.TEAM_RUNS, async () => orchestrator.collaborative.listRuns());

    // --- Proyectos ---
    this.on(REQ.PROJECT_CREATE, async ({ name, goal, deadlineDays }) =>
      orchestrator.projects.createProject({ name, goal, deadlineDays })
    );
    this.on(REQ.PROJECT_LIST, async () => orchestrator.projects.list());
    this.on(REQ.PROJECT_REPORT, async ({ id }) => orchestrator.projects.report(id));
    this.on(REQ.PROJECT_UPDATE_TASK, async ({ projectId, taskId, status }) =>
      orchestrator.projects.updateTask(projectId, taskId, status)
    );
    this.on(REQ.PROJECT_DELAYS, async () => orchestrator.projects.detectDelays());

    // --- Fine-tuning ---
    this.on(REQ.FINETUNE_DATASET, async ({ examples, format }) =>
      orchestrator.finetune.buildDataset(examples, { format })
    );
    this.on(REQ.FINETUNE_CREATE, async ({ baseModel, dataset, agentId }) =>
      orchestrator.finetune.createJob({ baseModel, dataset, agentId })
    );
    this.on(REQ.FINETUNE_JOBS, async () => orchestrator.finetune.listJobs());
    this.on(REQ.FINETUNE_EVAL, async ({ baseModel, tunedModel, testQueries }) =>
      orchestrator.finetune.blindEval({ baseModel, tunedModel, testQueries })
    );

    // --- Workspace ---
    this.on(REQ.WORKSPACE_LOGIN, async () => workspace.login());
    this.on(REQ.WORKSPACE_LOGOUT, async () => {
      await workspace.logout();
      return { loggedOut: true };
    });
    this.on(REQ.WORKSPACE_STATUS, async () => ({ loggedIn: await workspace.isLoggedIn() }));
    this.on(REQ.WORKSPACE_INBOX, async () => workspace.inboxSummary());
    this.on(REQ.WORKSPACE_MEETING_PREP, async () => workspace.prepareMeeting());

    // --- Memoria ---
    this.on(REQ.MEMORY_STATS, async () => orchestrator.memory.stats());
    this.on(REQ.MEMORY_REMEMBER, async ({ text, type, sector }) =>
      orchestrator.memory.remember({ text, type, sector })
    );
    this.on(REQ.MEMORY_RECALL, async ({ query, k }) => orchestrator.memory.recall(query, { k }));
    this.on(REQ.MEMORY_FORGET_ALL, async () => {
      await orchestrator.memory.forgetAll();
      return { cleared: true };
    });

    // --- Configuración / claves ---
    this.on(REQ.CONFIG_GET, async () => ConfigManager.load());
    this.on(REQ.CONFIG_SAVE, async ({ config }) => {
      await ConfigManager.save(config);
      return { saved: true };
    });
    this.on(REQ.SET_API_KEY, async ({ provider, apiKey }) => {
      await StorageManager.setApiKey(provider, apiKey);
      return { saved: true };
    });
    this.on(REQ.TEST_PROVIDERS, async () => registry.healthAll());

    // --- Historial ---
    this.on(REQ.HISTORY_GET, async () => StorageManager.getHistory());
    this.on(REQ.HISTORY_CLEAR, async () => {
      await StorageManager.clearHistory();
      return { cleared: true };
    });
    this.on(REQ.VOTES_GET, async () => StorageManager.getVotes());

    // --- Coste / presupuesto / métricas / planificación ---
    this.on(REQ.BUDGET_STATUS, async () => orchestrator.budgetStatus());
    this.on(REQ.METRICS_SUMMARY, async () => orchestrator.metricsSummary());
    this.on(REQ.SELECT_MODEL, async ({ query, critical }) =>
      orchestrator.selectModel(query, { critical })
    );
    this.on(REQ.PLAN_TASK, async ({ goal }) => orchestrator.planTask(goal));

    // --- Salud del sistema ---
    this.on(REQ.HEALTH, async () => orchestrator.health());
  }

  /**
   * Formatea un error para enviarlo a la UI.
   * @param {X1Error} error
   * @returns {Object}
   * @private
   */
  _formatError(error) {
    const message = error.userMessage ? error.userMessage() : error.message;
    return errResponse(message, error.code || ERR_CODE.UNKNOWN, error.context || {});
  }
}

/** Instancia compartida. */
export const messageRouter = new MessageRouter();

export default messageRouter;