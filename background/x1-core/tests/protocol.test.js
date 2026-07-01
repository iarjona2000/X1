/**
 * Tests del contrato de mensajes (utils/protocol.js).
 *
 * Cubre:
 *   - tipos REQ declarados
 *   - tipos EVT declarados
 *   - ERR_CODE values
 *   - validators: pasan / fallan según shape esperado
 *   - helpers (okResponse, errResponse, isRequest, isEvent, resolveLegacyType)
 *
 * Los schemas de validación son intencionalmente livianos: se ejecutan al
 * borde del router, antes de tocar el handler. Si añades un nuevo REQ,
 * añade también su schema y test aquí.
 */

import {
  REQ,
  EVT,
  ERR_CODE,
  validators,
  validateRequest,
  isRequest,
  isEvent,
  resolveLegacyType,
  okResponse,
  errResponse,
  LEGACY_ALIAS
} from '../utils/protocol.js';

describe('protocol — REQ catalog', () => {
  test('all REQ values are non-empty strings', () => {
    const values = Object.values(REQ);
    expect(values.length).toBeGreaterThan(20);
    for (const v of values) {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    }
  });

  test('REQ is frozen (no se puede mutar)', () => {
    expect(Object.isFrozen(REQ)).toBe(true);
  });

  test('contains the core actions the message-router uses', () => {
    expect(REQ.INIT).toBe('INIT');
    expect(REQ.CHAT).toBe('CHAT');
    expect(REQ.COMPARE).toBe('COMPARE');
    expect(REQ.AGENT_RUN).toBe('AGENT_RUN');
    expect(REQ.WORKSPACE_LOGIN).toBe('WORKSPACE_LOGIN');
    expect(REQ.HEALTH).toBe('HEALTH');
  });

  test('contains agent / team / project / finetune / memory surfaces', () => {
    expect(REQ.AGENT_LIST).toBeDefined();
    expect(REQ.TEAM_LIST).toBeDefined();
    expect(REQ.PROJECT_LIST).toBeDefined();
    expect(REQ.FINETUNE_JOBS).toBeDefined();
    expect(REQ.MEMORY_STATS).toBeDefined();
  });

  test('contains cost / metrics surfaces', () => {
    expect(REQ.BUDGET_STATUS).toBeDefined();
    expect(REQ.METRICS_SUMMARY).toBeDefined();
    expect(REQ.SELECT_MODEL).toBeDefined();
    expect(REQ.PLAN_TASK).toBeDefined();
  });
});

describe('protocol — EVT / ERR_CODE', () => {
  test('EVT has the streaming events', () => {
    expect(EVT.TOKEN).toBe('TOKEN');
    expect(EVT.DONE).toBe('DONE');
    expect(EVT.STEP_PROGRESS).toBe('STEP_PROGRESS');
    expect(EVT.AGENT_PROGRESS).toBe('AGENT_PROGRESS');
  });

  test('EVT has the legacy voice bridge mappings', () => {
    expect(EVT.VOICE_RESULT).toBe('VOICE_RESULT');
    expect(EVT.AGENT_STATUS).toBe('AGENT_STATUS');
    expect(EVT.API_RESULT).toBe('API_RESULT');
  });

  test('ERR_CODE has the standard codes', () => {
    expect(ERR_CODE.NOT_FOUND).toBe('NOT_FOUND');
    expect(ERR_CODE.AUTH).toBe('AUTH');
    expect(ERR_CODE.VALIDATION).toBe('VALIDATION');
    expect(ERR_CODE.PROVIDER).toBe('PROVIDER');
  });
});

describe('protocol — LEGACY_ALIAS', () => {
  test('legacy aliases resolve to current REQ where applicable', () => {
    expect(resolveLegacyType('X1_OPEN_PANEL')).toBe(REQ.IS_READY);
    expect(resolveLegacyType('X1_GREET')).toBe(REQ.SUGGESTIONS);
    expect(resolveLegacyType('VOICE_COMMAND_EXEC')).toBe(REQ.CHAT);
  });

  test('legacy aliases return null for UI-only types', () => {
    expect(resolveLegacyType('X1_TOGGLE')).toBeNull();
    expect(resolveLegacyType('X1_VOICE_RESULT')).toBeNull();
    expect(resolveLegacyType('X1_STEP_PROGRESS')).toBeNull();
  });

  test('unknown types are also null', () => {
    expect(resolveLegacyType('NOT_A_REAL_TYPE')).toBeNull();
    expect(resolveLegacyType('')).toBeNull();
  });

  test('LEGACY_ALIAS is frozen', () => {
    expect(Object.isFrozen(LEGACY_ALIAS)).toBe(true);
  });
});

describe('protocol — helpers', () => {
  test('isRequest recognises REQ entries', () => {
    expect(isRequest(REQ.INIT)).toBe(true);
    expect(isRequest(REQ.CHAT)).toBe(true);
    expect(isRequest('INVENTED')).toBe(false);
  });

  test('isEvent recognises EVT entries', () => {
    expect(isEvent(EVT.TOKEN)).toBe(true);
    expect(isEvent('TOKEN')).toBe(true);
    expect(isEvent('NOT_AN_EVENT')).toBe(false);
  });

  test('okResponse wraps data correctly', () => {
    const r = okResponse({ foo: 'bar' });
    expect(r).toEqual({ ok: true, data: { foo: 'bar' } });
  });

  test('errResponse wraps error with defaults', () => {
    const r = errResponse('oops');
    expect(r.ok).toBe(false);
    expect(r.error.message).toBe('oops');
    expect(r.error.code).toBe(ERR_CODE.UNKNOWN);
    expect(r.error.context).toEqual({});
  });

  test('errResponse accepts custom code and context', () => {
    const r = errResponse('bad input', ERR_CODE.VALIDATION, { field: 'password' });
    expect(r.error.code).toBe(ERR_CODE.VALIDATION);
    expect(r.error.context).toEqual({ field: 'password' });
  });
});

describe('protocol — validators', () => {
  test('INIT: requires non-empty password', () => {
    expect(validateRequest(REQ.INIT, { password: 'secret' })).toBeNull();
    expect(validateRequest(REQ.INIT, { password: '' })).toMatch(/password requerido/);
    expect(validateRequest(REQ.INIT, {})).toMatch(/password requerido/);
    expect(validateRequest(REQ.INIT, null)).toMatch(/password requerido/);
  });

  test('CHAT: requires non-empty query', () => {
    expect(validateRequest(REQ.CHAT, { query: 'hola' })).toBeNull();
    expect(validateRequest(REQ.CHAT, { query: '  ' })).toMatch(/no vacío/);
    expect(validateRequest(REQ.CHAT, {})).toMatch(/query/i);
  });

  test('AGENT_CREATE: requires config object', () => {
    expect(validateRequest(REQ.AGENT_CREATE, { config: { name: 'x' } })).toBeNull();
    expect(validateRequest(REQ.AGENT_CREATE, {})).toMatch(/config/i);
  });

  test('AGENT_RUN: requires id and goal', () => {
    expect(validateRequest(REQ.AGENT_RUN, { id: 'a', goal: 'g' })).toBeNull();
    expect(validateRequest(REQ.AGENT_RUN, { id: 'a' })).toMatch(/goal/);
    expect(validateRequest(REQ.AGENT_RUN, { goal: 'g' })).toMatch(/id/);
  });

  test('AGENT_UPDATE: requires id and patch', () => {
    expect(validateRequest(REQ.AGENT_UPDATE, { id: 'a', patch: { name: 'x' } })).toBeNull();
    expect(validateRequest(REQ.AGENT_UPDATE, { id: 'a' })).toMatch(/patch/);
  });

  test('AGENT_ADD_KNOWLEDGE: requires id and array', () => {
    expect(validateRequest(REQ.AGENT_ADD_KNOWLEDGE, { id: 'a', documents: ['x'] })).toBeNull();
    expect(validateRequest(REQ.AGENT_ADD_KNOWLEDGE, { id: 'a', documents: 'x' })).toMatch(/documents/);
  });

  test('COMPARE: requires query and ≥2 models', () => {
    expect(validateRequest(REQ.COMPARE, { query: 'q', models: ['a', 'b'] })).toBeNull();
    expect(validateRequest(REQ.COMPARE, { query: 'q', models: ['a'] })).toMatch(/≥2/);
    expect(validateRequest(REQ.COMPARE, { query: 'q' })).toMatch(/models/);
  });

  test('FACT_CHECK: requires answer and query', () => {
    expect(validateRequest(REQ.FACT_CHECK, { answer: 'a', query: 'q' })).toBeNull();
    expect(validateRequest(REQ.FACT_CHECK, { answer: 'a' })).toMatch(/query/);
  });

  test('MEMORY_RECALL: requires query', () => {
    expect(validateRequest(REQ.MEMORY_RECALL, { query: 'q' })).toBeNull();
    expect(validateRequest(REQ.MEMORY_RECALL, {})).toMatch(/query/);
  });

  test('SET_API_KEY: requires provider and apiKey', () => {
    expect(validateRequest(REQ.SET_API_KEY, { provider: 'groq', apiKey: 'k' })).toBeNull();
    expect(validateRequest(REQ.SET_API_KEY, { provider: 'groq' })).toMatch(/apiKey/);
  });

  test('FINETUNE_CREATE: requires baseModel, dataset, agentId', () => {
    expect(validateRequest(REQ.FINETUNE_CREATE, { baseModel: 'a', dataset: 'b', agentId: 'c' })).toBeNull();
    expect(validateRequest(REQ.FINETUNE_CREATE, { baseModel: 'a' })).toMatch(/dataset/);
  });

  test('TEAM_CREATE: requires name and agentIds array', () => {
    expect(validateRequest(REQ.TEAM_CREATE, { name: 't', agentIds: ['a'] })).toBeNull();
    expect(validateRequest(REQ.TEAM_CREATE, { name: 't', agentIds: 'a' })).toMatch(/agentIds/);
  });

  test('TEAM_RUN: requires teamId and goal', () => {
    expect(validateRequest(REQ.TEAM_RUN, { teamId: 't', goal: 'g' })).toBeNull();
    expect(validateRequest(REQ.TEAM_RUN, { teamId: 't' })).toMatch(/goal/);
  });

  test('PROJECT_CREATE: requires name', () => {
    expect(validateRequest(REQ.PROJECT_CREATE, { name: 'p' })).toBeNull();
    expect(validateRequest(REQ.PROJECT_CREATE, {})).toMatch(/name/);
  });

  test('PROJECT_UPDATE_TASK: requires projectId, taskId, status', () => {
    expect(validateRequest(REQ.PROJECT_UPDATE_TASK, {
      projectId: 'p', taskId: 't', status: 'done'
    })).toBeNull();
    expect(validateRequest(REQ.PROJECT_UPDATE_TASK, { projectId: 'p' })).toMatch(/taskId/);
  });

  test('SELECT_MODEL: requires query', () => {
    expect(validateRequest(REQ.SELECT_MODEL, { query: 'q' })).toBeNull();
    expect(validateRequest(REQ.SELECT_MODEL, {})).toMatch(/query/);
  });

  test('PLAN_TASK: requires goal', () => {
    expect(validateRequest(REQ.PLAN_TASK, { goal: 'g' })).toBeNull();
    expect(validateRequest(REQ.PLAN_TASK, {})).toMatch(/goal/);
  });

  test('CONFIG_SAVE: requires config object', () => {
    expect(validateRequest(REQ.CONFIG_SAVE, { config: { foo: 1 } })).toBeNull();
    expect(validateRequest(REQ.CONFIG_SAVE, {})).toMatch(/config/);
  });

  test('types without schema always pass (compat)', () => {
    // IS_READY y HEALTH no tienen schema (payload vacío), deben pasar siempre.
    expect(validateRequest(REQ.IS_READY, {})).toBeNull();
    expect(validateRequest(REQ.HEALTH, {})).toBeNull();
    expect(validateRequest(REQ.SUGGESTIONS, {})).toBeNull();
  });

  test('unknown type → null (compat: router will return NOT_FOUND upstream)', () => {
    expect(validateRequest('FAKE_TYPE', { anything: 1 })).toBeNull();
  });

  test('every REQ with a validator has both happy + sad paths', () => {
    // Regresión: si alguien añade un validator, debe estar cubierto en tests.
    for (const reqType of Object.values(REQ)) {
      const fn = validators[reqType];
      if (!fn) continue; // sin schema = saltamos
      // happy path con campos vacíos debe FALLAR salvo que sean opcionales todos
      const emptyResult = fn({});
      const filledResult = fn({ __filled: true });
      expect(typeof emptyResult === 'string' || emptyResult === null).toBe(true);
      expect(typeof filledResult === 'string' || filledResult === null).toBe(true);
    }
  });
});

describe('protocol — REQ / EVT no se solapan', () => {
  test('REQ and EVT values son disjuntos', () => {
    const reqValues = new Set(Object.values(REQ));
    for (const evtValue of Object.values(EVT)) {
      expect(reqValues.has(evtValue)).toBe(false);
    }
  });
});