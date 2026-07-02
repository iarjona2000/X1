/**
 * protocol.js — fuente única de verdad para TODOS los mensajes intercambiados
 * entre UI (popup, options, content scripts, page tabs) y el service worker.
 *
 * Estilo: ES5 strict, IIFE, prototype — alineado con continue-bridge.js
 * y con el resto del monolito service-worker.js.
 *
 * Exposición: window.X1Protocol (o self.X1Protocol en SW context).
 *
 * Convenciones:
 *   REQ_*  → UI → SW, espera respuesta (resolve o reject).
 *   RES_*  → SW → UI, terminador de un REQ exitoso.
 *   ERR_*  → SW → UI, terminador de un REQ fallido.
 *   EVT_*  → SW → UI, broadcast (fire-and-forget, sin respuesta).
 *
 * Nunca mandes strings mágicos directamente. Usa las constantes exportadas.
 *
 * El módulo registra también sus validadores en window.X1Validators y los
 * helpers en window.X1Responses, para que cada handler del monolito pueda
 * usarlos sin tocar el protocolo en sí.
 */

(function() {
  'use strict';

  var log = (typeof x1Log === 'function')
    ? x1Log('Protocol')
    : { info: function() {}, warn: console.warn, error: console.error };

  // ─── REQUESTS (UI → SW) ─────────────────────────────────────────────

  var REQ = {
    // bootstrap
    INIT:           'INIT',
    IS_READY:       'IS_READY',

    // chat & reasoning
    CHAT:           'CHAT',
    COMPARE:        'COMPARE',
    VOTE:           'VOTE',
    FACT_CHECK:     'FACT_CHECK',
    SUGGESTIONS:    'SUGGESTIONS',

    // agents
    AGENT_LIST:        'AGENT_LIST',
    AGENT_CREATE:      'AGENT_CREATE',
    AGENT_UPDATE:      'AGENT_UPDATE',
    AGENT_DELETE:      'AGENT_DELETE',
    AGENT_RUN:         'AGENT_RUN',
    AGENT_ADD_KNOWLEDGE: 'AGENT_ADD_KNOWLEDGE',
    AGENT_SEED:        'AGENT_SEED',

    // teams / collaboration
    TEAM_CREATE:    'TEAM_CREATE',
    TEAM_LIST:      'TEAM_LIST',
    TEAM_RUN:       'TEAM_RUN',
    TEAM_RUNS:      'TEAM_RUNS',

    // projects
    PROJECT_CREATE:   'PROJECT_CREATE',
    PROJECT_LIST:     'PROJECT_LIST',
    PROJECT_REPORT:   'PROJECT_REPORT',
    PROJECT_UPDATE_TASK: 'PROJECT_UPDATE_TASK',
    PROJECT_DELAYS:   'PROJECT_DELAYS',

    // fine-tuning
    FINETUNE_DATASET: 'FINETUNE_DATASET',
    FINETUNE_CREATE:  'FINETUNE_CREATE',
    FINETUNE_JOBS:    'FINETUNE_JOBS',
    FINETUNE_EVAL:    'FINETUNE_EVAL',

    // workspace
    WORKSPACE_LOGIN:    'WORKSPACE_LOGIN',
    WORKSPACE_LOGOUT:   'WORKSPACE_LOGOUT',
    WORKSPACE_STATUS:   'WORKSPACE_STATUS',
    WORKSPACE_INBOX:    'WORKSPACE_INBOX',
    WORKSPACE_MEETING_PREP: 'WORKSPACE_MEETING_PREP',

    // memory
    MEMORY_STATS:        'MEMORY_STATS',
    MEMORY_REMEMBER:     'MEMORY_REMEMBER',
    MEMORY_RECALL:       'MEMORY_RECALL',
    MEMORY_FORGET_ALL:   'MEMORY_FORGET_ALL',

    // config / keys
    CONFIG_GET:    'CONFIG_GET',
    CONFIG_SAVE:   'CONFIG_SAVE',
    SET_API_KEY:   'SET_API_KEY',
    TEST_PROVIDERS:'TEST_PROVIDERS',

    // history & votes
    HISTORY_GET:   'HISTORY_GET',
    HISTORY_CLEAR: 'HISTORY_CLEAR',
    VOTES_GET:     'VOTES_GET',

    // cost / metrics / planning
    BUDGET_STATUS: 'BUDGET_STATUS',
    METRICS_SUMMARY: 'METRICS_SUMMARY',
    SELECT_MODEL:  'SELECT_MODEL',
    PLAN_TASK:     'PLAN_TASK',

    // system
    HEALTH:        'HEALTH'
  };

  // ─── EVENTS (SW → UI, broadcast) ────────────────────────────────────

  var EVT = {
    TOKEN:            'TOKEN',
    DONE:             'DONE',
    STEP_PROGRESS:    'STEP_PROGRESS',
    AGENT_PROGRESS:   'AGENT_PROGRESS',
    BUDGET_ALERT:     'BUDGET_ALERT',
    VOICE_RESULT:     'VOICE_RESULT',
    AGENT_STATUS:     'AGENT_STATUS',
    API_RESULT:       'API_RESULT'
  };

  // ─── LEGACY ALIASES (vue → new) ─────────────────────────────────────
  // Mapea tipos antiguos X1_* a los nuevos. Mantener hasta vaciar.

  var LEGACY_ALIAS = {
    X1_OPEN_PANEL:       REQ.IS_READY,
    X1_GREET:            REQ.SUGGESTIONS,
    VOICE_COMMAND_EXEC:  REQ.CHAT,
    X1_TOGGLE:           null,                 // UI-only, no toca SW
    X1_VOICE_RESULT:     null,
    X1_AGENT_STATUS:     null,
    X1_STEP_PROGRESS:    null,
    X1_API_RESULT:       null,
    X1_AGENT_PROGRESS:   null,
    X1_BUDGET_ALERT:     null
  };

  // ─── ERROR CODES ─────────────────────────────────────────────────────

  var ERR_CODE = {
    UNKNOWN:     'UNKNOWN',
    NOT_FOUND:   'NOT_FOUND',
    AUTH:        'AUTH',
    VALIDATION:  'VALIDATION',
    TIMEOUT:     'TIMEOUT',
    RATE_LIMIT:  'RATE_LIMIT',
    PROVIDER:    'PROVIDER',
    INTERNAL:    'INTERNAL'
  };

  // ─── VALIDATORS ─────────────────────────────────────────────────────
  // Validación sin librerías externas. Cada validador: (payload) => null|string.
  // validateRequest dispatcha por tipo. Si un tipo no está registrado, pasa
  // (compat).

  function isString(v) { return typeof v === 'string'; }
  function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function isArray(v)  { return Array.isArray(v); }

  var validators = {};

  validators[REQ.INIT] = function(p) {
    return (isObject(p) && isString(p.password) && p.password.length > 0)
      ? null : 'INIT: password requerido';
  };

  validators[REQ.CHAT] = function(p) {
    return (isObject(p) && isString(p.query) && p.query.trim().length > 0)
      ? null : 'CHAT: query debe ser string no vacío';
  };

  validators[REQ.AGENT_CREATE] = function(p) {
    return (isObject(p) && isObject(p.config))
      ? null : 'AGENT_CREATE: config requerido';
  };

  validators[REQ.AGENT_RUN] = function(p) {
    return (isObject(p) && isString(p.id) && isString(p.goal))
      ? null : 'AGENT_RUN: id y goal requeridos';
  };

  validators[REQ.AGENT_UPDATE] = function(p) {
    return (isObject(p) && isString(p.id) && isObject(p.patch))
      ? null : 'AGENT_UPDATE: id y patch requeridos';
  };

  validators[REQ.AGENT_ADD_KNOWLEDGE] = function(p) {
    return (isObject(p) && isString(p.id) && isArray(p.documents))
      ? null : 'AGENT_ADD_KNOWLEDGE: id + documents[]';
  };

  validators[REQ.COMPARE] = function(p) {
    return (isObject(p) && isString(p.query) && isArray(p.models) && p.models.length >= 2)
      ? null : 'COMPARE: query + models[] con ≥2';
  };

  validators[REQ.VOTE] = function(p) {
    return isObject(p) ? null : 'VOTE: payload requerido';
  };

  validators[REQ.FACT_CHECK] = function(p) {
    return (isObject(p) && isString(p.answer) && isString(p.query))
      ? null : 'FACT_CHECK: answer y query requeridos';
  };

  validators[REQ.MEMORY_REMEMBER] = function(p) {
    return (isObject(p) && isString(p.text))
      ? null : 'MEMORY_REMEMBER: text requerido';
  };

  validators[REQ.MEMORY_RECALL] = function(p) {
    return (isObject(p) && isString(p.query))
      ? null : 'MEMORY_RECALL: query requerido';
  };

  validators[REQ.SET_API_KEY] = function(p) {
    return (isObject(p) && isString(p.provider) && isString(p.apiKey))
      ? null : 'SET_API_KEY: provider y apiKey requeridos';
  };

  validators[REQ.CONFIG_SAVE] = function(p) {
    return (isObject(p) && isObject(p.config))
      ? null : 'CONFIG_SAVE: config requerido';
  };

  validators[REQ.FINETUNE_CREATE] = function(p) {
    return (isObject(p) && isString(p.baseModel) && isString(p.dataset) && isString(p.agentId))
      ? null : 'FINETUNE_CREATE: baseModel, dataset y agentId requeridos';
  };

  validators[REQ.PROJECT_CREATE] = function(p) {
    return (isObject(p) && isString(p.name))
      ? null : 'PROJECT_CREATE: name requerido';
  };

  validators[REQ.PROJECT_UPDATE_TASK] = function(p) {
    return (isObject(p) && isString(p.projectId) && isString(p.taskId) && isString(p.status))
      ? null : 'PROJECT_UPDATE_TASK: projectId, taskId y status requeridos';
  };

  validators[REQ.TEAM_CREATE] = function(p) {
    return (isObject(p) && isString(p.name) && isArray(p.agentIds))
      ? null : 'TEAM_CREATE: name y agentIds[] requeridos';
  };

  validators[REQ.TEAM_RUN] = function(p) {
    return (isObject(p) && isString(p.teamId) && isString(p.goal))
      ? null : 'TEAM_RUN: teamId y goal requeridos';
  };

  validators[REQ.SELECT_MODEL] = function(p) {
    return (isObject(p) && isString(p.query))
      ? null : 'SELECT_MODEL: query requerido';
  };

  validators[REQ.PLAN_TASK] = function(p) {
    return (isObject(p) && isString(p.goal))
      ? null : 'PLAN_TASK: goal requerido';
  };

  function validateRequest(type, payload) {
    var fn = validators[type];
    if (!fn) return null;
    return fn(payload);
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────

  function isRequest(type) {
    return Object.prototype.hasOwnProperty.call(REQ, type);
  }

  function isEvent(type) {
    return Object.prototype.hasOwnProperty.call(EVT, type);
  }

  function resolveLegacyType(type) {
    return Object.prototype.hasOwnProperty.call(LEGACY_ALIAS, type)
      ? LEGACY_ALIAS[type]
      : null;
  }

  function okResponse(data) {
    return { ok: true, data: data };
  }

  function errResponse(message, code, context) {
    return {
      ok: false,
      error: {
        message: message,
        code: code || ERR_CODE.UNKNOWN,
        context: context || {}
      }
    };
  }

  // ─── EXPOSICIÓN ──────────────────────────────────────────────────────
  // El SW accede vía self.X1Protocol. La UI (content scripts) vía window.

  var api = {
    REQ: REQ,
    EVT: EVT,
    ERR_CODE: ERR_CODE,
    LEGACY_ALIAS: LEGACY_ALIAS,
    validators: validators,
    validateRequest: validateRequest,
    isRequest: isRequest,
    isEvent: isEvent,
    resolveLegacyType: resolveLegacyType,
    okResponse: okResponse,
    errResponse: errResponse,
    version: '1.0.0'
  };

  if (typeof self !== 'undefined') self.X1Protocol = api;
  if (typeof window !== 'undefined') window.X1Protocol = api;

  // También exponer validadores y responses por separado para
  // compatibilidad con handlers que no quieran pasar por la API.
  if (typeof self !== 'undefined') {
    self.X1Validators = validators;
    self.X1Responses = { ok: okResponse, err: errResponse };
  }
  if (typeof window !== 'undefined') {
    window.X1Validators = validators;
    window.X1Responses = { ok: okResponse, err: errResponse };
  }

  // Freeze inmutable para evitar mutaciones accidentales
  try { Object.freeze(REQ); } catch(_) {}
  try { Object.freeze(EVT); } catch(_) {}
  try { Object.freeze(ERR_CODE); } catch(_) {}
  try { Object.freeze(LEGACY_ALIAS); } catch(_) {}

  log.info('X1Protocol v' + api.version + ' cargado · ' +
    Object.keys(REQ).length + ' REQ, ' +
    Object.keys(EVT).length + ' EVT, ' +
    Object.keys(validators).length + ' validators');

})();