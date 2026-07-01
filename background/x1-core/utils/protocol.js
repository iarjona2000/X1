/**
 * Protocol — fuente única de verdad para TODOS los mensajes intercambiados
 * entre UI (popup, options, content scripts, page tabs) y el message router
 * del service worker.
 *
 * Históricamente existían dos protocolos vivos y no sincronizados:
 *
 *   1. LEGACY   — tipos `X1_*` (X1_OPEN_PANEL, X1_GREET, X1_VOICE_RESULT…)
 *                usados por el `service-worker.js` monolítico y por
 *                `content/voice-bridge.js`. ES5, sin contrato, opacos.
 *
 *   2. ROUTER   — tipos sin prefijo (INIT, CHAT, COMPARE, AGENT_LIST…)
 *                definidos en `background/x1-core/background/message-router.js`.
 *                ES6+, action registry, error wrapping, streaming por ports.
 *
 * Este archivo unifica los dos sistemas. Cualquier nuevo mensaje debe:
 *   1. Declararse aquí (REQ / RES / EVT / ERR).
 *   2. Registrarse en `message-router.js` con su handler.
 *   3. Tener un schema de validación si acepta payload complejo.
 *
 * Convenciones:
 *   REQ_*  → UI → SW, espera respuesta (resolve o reject).
 *   RES_*  → SW → UI, terminador de un REQ exitoso.
 *   ERR_*  → SW → UI, terminador de un REQ fallido.
 *   EVT_*  → SW → UI, broadcast (fire-and-forget, sin respuesta).
 *
 * Nunca mandes strings mágicos directamente. Importa de aquí.
 */

// ─── REQUESTS (UI → SW) ───────────────────────────────────────────────
// Nombres iguales a los que ya espera el message-router moderno. Si falta
// alguno de los 30 que el router declara, añádelo aquí antes de tocar el router.

export const REQ = Object.freeze({
  // bootstrap
  INIT:           'INIT',           // { password }
  IS_READY:       'IS_READY',       // {}

  // chat & reasoning
  CHAT:           'CHAT',           // { query, history?, agentId? }
  COMPARE:        'COMPARE',        // { query, models[], sector? }
  VOTE:           'VOTE',           // { vote }
  FACT_CHECK:     'FACT_CHECK',     // { answer, query }
  SUGGESTIONS:    'SUGGESTIONS',    // {}

  // agents
  AGENT_LIST:        'AGENT_LIST',
  AGENT_CREATE:      'AGENT_CREATE',      // { config }
  AGENT_UPDATE:      'AGENT_UPDATE',      // { id, patch }
  AGENT_DELETE:      'AGENT_DELETE',      // { id }
  AGENT_RUN:         'AGENT_RUN',         // { id, goal, history? }
  AGENT_ADD_KNOWLEDGE: 'AGENT_ADD_KNOWLEDGE', // { id, documents[] }
  AGENT_SEED:        'AGENT_SEED',

  // teams / collaboration
  TEAM_CREATE:    'TEAM_CREATE',    // { name, description, agentIds[] }
  TEAM_LIST:      'TEAM_LIST',
  TEAM_RUN:       'TEAM_RUN',       // { teamId, goal }
  TEAM_RUNS:      'TEAM_RUNS',

  // projects
  PROJECT_CREATE:   'PROJECT_CREATE',   // { name, goal, deadlineDays }
  PROJECT_LIST:     'PROJECT_LIST',
  PROJECT_REPORT:   'PROJECT_REPORT',   // { id }
  PROJECT_UPDATE_TASK: 'PROJECT_UPDATE_TASK', // { projectId, taskId, status }
  PROJECT_DELAYS:   'PROJECT_DELAYS',

  // fine-tuning
  FINETUNE_DATASET: 'FINETUNE_DATASET',  // { examples[], format }
  FINETUNE_CREATE:  'FINETUNE_CREATE',   // { baseModel, dataset, agentId }
  FINETUNE_JOBS:    'FINETUNE_JOBS',
  FINETUNE_EVAL:    'FINETUNE_EVAL',     // { baseModel, tunedModel, testQueries[] }

  // workspace (Google, etc.)
  WORKSPACE_LOGIN:    'WORKSPACE_LOGIN',
  WORKSPACE_LOGOUT:   'WORKSPACE_LOGOUT',
  WORKSPACE_STATUS:   'WORKSPACE_STATUS',
  WORKSPACE_INBOX:    'WORKSPACE_INBOX',
  WORKSPACE_MEETING_PREP: 'WORKSPACE_MEETING_PREP',

  // memory
  MEMORY_STATS:        'MEMORY_STATS',
  MEMORY_REMEMBER:     'MEMORY_REMEMBER',     // { text, type, sector }
  MEMORY_RECALL:       'MEMORY_RECALL',       // { query, k? }
  MEMORY_FORGET_ALL:   'MEMORY_FORGET_ALL',

  // config / keys / providers
  CONFIG_GET:    'CONFIG_GET',
  CONFIG_SAVE:   'CONFIG_SAVE',     // { config }
  SET_API_KEY:   'SET_API_KEY',     // { provider, apiKey }
  TEST_PROVIDERS:'TEST_PROVIDERS',

  // history & votes
  HISTORY_GET:   'HISTORY_GET',
  HISTORY_CLEAR: 'HISTORY_CLEAR',
  VOTES_GET:     'VOTES_GET',

  // cost / metrics / planning
  BUDGET_STATUS: 'BUDGET_STATUS',
  METRICS_SUMMARY: 'METRICS_SUMMARY',
  SELECT_MODEL:  'SELECT_MODEL',    // { query, critical? }
  PLAN_TASK:     'PLAN_TASK',       // { goal }

  // system
  HEALTH:        'HEALTH'
});

// ─── LEGACY ALIASES (vue → new) ──────────────────────────────────────
// Map de tipos del protocolo antiguo `X1_*` al nuevo, para que el código
// legacy (service-worker.js monolítico, voice-bridge.js) siga compilando
// durante la migración. Una vez vacío, eliminar.

export const LEGACY_ALIAS = Object.freeze({
  X1_OPEN_PANEL:       REQ.IS_READY,
  X1_GREET:            REQ.SUGGESTIONS,
  VOICE_COMMAND_EXEC:  REQ.CHAT,
  X1_TOGGLE:           null,                    // sólo UI, no toca SW
  X1_VOICE_RESULT:     null,                    // sólo SW → UI
  X1_AGENT_STATUS:     null,
  X1_STEP_PROGRESS:    null,
  X1_API_RESULT:       null,
  X1_AGENT_PROGRESS:   null,
  X1_BUDGET_ALERT:     null
});

// ─── EVENTS (SW → UI, broadcast) ─────────────────────────────────────
// No son respuestas a un REQ. Son notificaciones push.

export const EVT = Object.freeze({
  TOKEN:            'TOKEN',             // { token }  — stream chunk
  DONE:             'DONE',              // stream fin
  STEP_PROGRESS:    'STEP_PROGRESS',     // { action, app, description, status, index }
  AGENT_PROGRESS:   'AGENT_PROGRESS',    // { agentName, stepName, status, icon }
  BUDGET_ALERT:     'BUDGET_ALERT',      // { text }
  VOICE_RESULT:     'VOICE_RESULT',      // { text, showText, error, suggestions[] }
  AGENT_STATUS:     'AGENT_STATUS',      // { text, isLast }
  API_RESULT:       'API_RESULT'         // { action, ok, data, error }
});

// ─── ERRORS ───────────────────────────────────────────────────────────
// Códigos que puede devolver el SW ante un REQ fallido.

export const ERR_CODE = Object.freeze({
  UNKNOWN:     'UNKNOWN',
  NOT_FOUND:   'NOT_FOUND',
  AUTH:        'AUTH',                  // needs unlock
  VALIDATION:  'VALIDATION',            // payload failed schema
  TIMEOUT:     'TIMEOUT',
  RATE_LIMIT:  'RATE_LIMIT',
  PROVIDER:    'PROVIDER',              // upstream provider failed
  INTERNAL:    'INTERNAL'
});

// ─── VALIDATORS ──────────────────────────────────────────────────────
// Validación sin librerías externas. Cada validador es `(payload) => null`
// si pasa, o `string` con el motivo si falla. El `validateRequest` dispatcha
// por tipo. Si un tipo no está registrado, se considera válido (compat).

export const validators = Object.create(null);

function isString(v)  { return typeof v === 'string'; }
function isObject(v)  { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function isArray(v)   { return Array.isArray(v); }

validators[REQ.INIT] = (p) =>
  isObject(p) && isString(p.password) && p.password.length > 0
    ? null : 'INIT: password requerido';

validators[REQ.CHAT] = (p) =>
  isObject(p) && isString(p.query) && p.query.trim().length > 0
    ? null : 'CHAT: query debe ser string no vacío';

validators[REQ.AGENT_CREATE] = (p) =>
  isObject(p) && isObject(p.config)
    ? null : 'AGENT_CREATE: config requerido';

validators[REQ.AGENT_RUN] = (p) =>
  isObject(p) && isString(p.id) && isString(p.goal)
    ? null : 'AGENT_RUN: id y goal requeridos';

validators[REQ.AGENT_UPDATE] = (p) =>
  isObject(p) && isString(p.id) && isObject(p.patch)
    ? null : 'AGENT_UPDATE: id y patch requeridos';

validators[REQ.AGENT_ADD_KNOWLEDGE] = (p) =>
  isObject(p) && isString(p.id) && isArray(p.documents)
    ? null : 'AGENT_ADD_KNOWLEDGE: id + documents[]';

validators[REQ.COMPARE] = (p) =>
  isObject(p) && isString(p.query) && isArray(p.models) && p.models.length >= 2
    ? null : 'COMPARE: query + models[] con ≥2';

validators[REQ.VOTE] = (p) =>
  isObject(p)
    ? null : 'VOTE: payload requerido';

validators[REQ.FACT_CHECK] = (p) =>
  isObject(p) && isString(p.answer) && isString(p.query)
    ? null : 'FACT_CHECK: answer y query requeridos';

validators[REQ.MEMORY_REMEMBER] = (p) =>
  isObject(p) && isString(p.text)
    ? null : 'MEMORY_REMEMBER: text requerido';

validators[REQ.MEMORY_RECALL] = (p) =>
  isObject(p) && isString(p.query)
    ? null : 'MEMORY_RECALL: query requerido';

validators[REQ.SET_API_KEY] = (p) =>
  isObject(p) && isString(p.provider) && isString(p.apiKey)
    ? null : 'SET_API_KEY: provider y apiKey requeridos';

validators[REQ.CONFIG_SAVE] = (p) =>
  isObject(p) && isObject(p.config)
    ? null : 'CONFIG_SAVE: config requerido';

validators[REQ.FINETUNE_CREATE] = (p) =>
  isObject(p) && isString(p.baseModel) && isString(p.dataset) && isString(p.agentId)
    ? null : 'FINETUNE_CREATE: baseModel, dataset y agentId requeridos';

validators[REQ.PROJECT_CREATE] = (p) =>
  isObject(p) && isString(p.name)
    ? null : 'PROJECT_CREATE: name requerido';

validators[REQ.PROJECT_UPDATE_TASK] = (p) =>
  isObject(p) && isString(p.projectId) && isString(p.taskId) && isString(p.status)
    ? null : 'PROJECT_UPDATE_TASK: projectId, taskId y status requeridos';

validators[REQ.TEAM_CREATE] = (p) =>
  isObject(p) && isString(p.name) && isArray(p.agentIds)
    ? null : 'TEAM_CREATE: name y agentIds[] requeridos';

validators[REQ.TEAM_RUN] = (p) =>
  isObject(p) && isString(p.teamId) && isString(p.goal)
    ? null : 'TEAM_RUN: teamId y goal requeridos';

validators[REQ.SELECT_MODEL] = (p) =>
  isObject(p) && isString(p.query)
    ? null : 'SELECT_MODEL: query requerido';

validators[REQ.PLAN_TASK] = (p) =>
  isObject(p) && isString(p.goal)
    ? null : 'PLAN_TASK: goal requerido';

/**
 * Valida el payload de una request antes de que llegue al handler.
 * @param {string} type
 * @param {*} payload
 * @returns {null|string} null si pasa, mensaje de error si falla.
 */
export function validateRequest(type, payload) {
  const fn = validators[type];
  if (!fn) return null; // sin schema = sin validación (compat)
  return fn(payload);
}

// ─── HELPERS ──────────────────────────────────────────────────────────

/**
 * ¿Es un REQ conocido?
 */
export function isRequest(type) {
  return Object.prototype.hasOwnProperty.call(REQ, type);
}

/**
 * ¿Es un EVT conocido?
 */
export function isEvent(type) {
  return Object.prototype.hasOwnProperty.call(EVT, type);
}

/**
 * Resuelve un tipo legacy a su equivalente nuevo (o devuelve null si no
 * tiene equivalente, ie. tipos UI-only).
 */
export function resolveLegacyType(type) {
  return Object.prototype.hasOwnProperty.call(LEGACY_ALIAS, type)
    ? LEGACY_ALIAS[type]
    : null;
}

/**
 * Construye una respuesta estándar de éxito.
 */
export function okResponse(data) {
  return { ok: true, data };
}

/**
 * Construye una respuesta estándar de error.
 */
export function errResponse(message, code = ERR_CODE.UNKNOWN, context = {}) {
  return {
    ok: false,
    error: { message, code, context }
  };
}