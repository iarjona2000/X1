/**
 * Tests para protocol.js — fuente única de verdad de mensajes X1.
 * Mismo estilo que continue-bridge.test.js: ES5 IIFE + custom assert.
 * Sin dependencias externas. Compatible con browser/extension contexts.
 */

(function() {
  'use strict';

  var passed = 0;
  var failed = 0;
  var failures = [];

  function assert(condition, message) {
    if (condition) {
      passed++;
      console.log('[TEST] ✓', message);
    } else {
      failed++;
      failures.push(message);
      console.error('[TEST] ✗', message);
    }
  }

  function runTests() {
    console.log('[TEST] ============================================');
    console.log('[TEST] Iniciando tests de X1Protocol...');
    console.log('[TEST] ============================================');

    var P = (typeof window !== 'undefined' ? window.X1Protocol : self.X1Protocol);

    if (!P) {
      console.error('[TEST] X1Protocol no está cargado. Carga protocol.js primero.');
      return { passed: 0, failed: 1, failures: ['X1Protocol missing'] };
    }

    // ─── REQ catalog ────────────────────────────────────────────────
    assert(P.REQ, 'P.REQ existe');
    assert(typeof P.REQ.INIT === 'string' && P.REQ.INIT === 'INIT', 'REQ.INIT');
    assert(typeof P.REQ.CHAT === 'string' && P.REQ.CHAT === 'CHAT', 'REQ.CHAT');
    assert(typeof P.REQ.COMPARE === 'string', 'REQ.COMPARE existe');
    assert(typeof P.REQ.AGENT_LIST === 'string', 'REQ.AGENT_LIST existe');
    assert(typeof P.REQ.AGENT_RUN === 'string', 'REQ.AGENT_RUN existe');
    assert(typeof P.REQ.WORKSPACE_LOGIN === 'string', 'REQ.WORKSPACE_LOGIN existe');
    assert(typeof P.REQ.MEMORY_STATS === 'string', 'REQ.MEMORY_STATS existe');
    assert(typeof P.REQ.BUDGET_STATUS === 'string', 'REQ.BUDGET_STATUS existe');
    assert(typeof P.REQ.HEALTH === 'string', 'REQ.HEALTH existe');

    var reqKeys = Object.keys(P.REQ);
    assert(reqKeys.length >= 40, 'Hay al menos 40 REQ declarados (hay ' + reqKeys.length + ')');

    // Cobertura por superficie
    var surfaces = ['AGENT', 'TEAM', 'PROJECT', 'FINETUNE', 'WORKSPACE', 'MEMORY', 'CONFIG', 'HISTORY', 'BUDGET', 'METRICS'];
    for (var i = 0; i < surfaces.length; i++) {
      var prefix = surfaces[i];
      var found = false;
      for (var k = 0; k < reqKeys.length; k++) {
        if (reqKeys[k].indexOf(prefix) === 0) { found = true; break; }
      }
      assert(found, 'Superficie ' + prefix + ' tiene al menos un REQ');
    }

    // ─── EVT catalog ─────────────────────────────────────────────────
    assert(P.EVT, 'P.EVT existe');
    assert(P.EVT.TOKEN === 'TOKEN', 'EVT.TOKEN');
    assert(P.EVT.DONE === 'DONE', 'EVT.DONE');
    assert(P.EVT.STEP_PROGRESS === 'STEP_PROGRESS', 'EVT.STEP_PROGRESS');
    assert(P.EVT.AGENT_PROGRESS === 'AGENT_PROGRESS', 'EVT.AGENT_PROGRESS');
    assert(P.EVT.BUDGET_ALERT === 'BUDGET_ALERT', 'EVT.BUDGET_ALERT');
    assert(P.EVT.VOICE_RESULT === 'VOICE_RESULT', 'EVT.VOICE_RESULT');
    assert(P.EVT.AGENT_STATUS === 'AGENT_STATUS', 'EVT.AGENT_STATUS');
    assert(P.EVT.API_RESULT === 'API_RESULT', 'EVT.API_RESULT');

    // REQ y EVT disjuntos
    var reqValues = {};
    for (var r = 0; r < reqKeys.length; r++) reqValues[P.REQ[reqKeys[r]]] = true;
    var evtKeys = Object.keys(P.EVT);
    var overlap = false;
    for (var e = 0; e < evtKeys.length; e++) {
      if (reqValues[P.EVT[evtKeys[e]]]) { overlap = true; break; }
    }
    assert(!overlap, 'REQ y EVT no se solapan');

    // ─── ERR_CODE ────────────────────────────────────────────────────
    assert(P.ERR_CODE.NOT_FOUND === 'NOT_FOUND', 'ERR_CODE.NOT_FOUND');
    assert(P.ERR_CODE.AUTH === 'AUTH', 'ERR_CODE.AUTH');
    assert(P.ERR_CODE.VALIDATION === 'VALIDATION', 'ERR_CODE.VALIDATION');
    assert(P.ERR_CODE.PROVIDER === 'PROVIDER', 'ERR_CODE.PROVIDER');
    assert(P.ERR_CODE.RATE_LIMIT === 'RATE_LIMIT', 'ERR_CODE.RATE_LIMIT');
    assert(P.ERR_CODE.TIMEOUT === 'TIMEOUT', 'ERR_CODE.TIMEOUT');

    // ─── LEGACY_ALIAS ────────────────────────────────────────────────
    assert(P.resolveLegacyType('X1_OPEN_PANEL') === P.REQ.IS_READY, 'X1_OPEN_PANEL → IS_READY');
    assert(P.resolveLegacyType('X1_GREET') === P.REQ.SUGGESTIONS, 'X1_GREET → SUGGESTIONS');
    assert(P.resolveLegacyType('VOICE_COMMAND_EXEC') === P.REQ.CHAT, 'VOICE_COMMAND_EXEC → CHAT');
    assert(P.resolveLegacyType('X1_TOGGLE') === null, 'X1_TOGGLE → null (UI-only)');
    assert(P.resolveLegacyType('X1_VOICE_RESULT') === null, 'X1_VOICE_RESULT → null (UI-only)');
    assert(P.resolveLegacyType('FAKE_TYPE') === null, 'unknown → null');
    assert(P.resolveLegacyType('') === null, 'empty string → null');

    // ─── Helpers: isRequest / isEvent ────────────────────────────────
    assert(P.isRequest(P.REQ.INIT) === true, 'isRequest(REQ.INIT)');
    assert(P.isRequest('INVENTED') === false, 'isRequest(unknown) false');
    assert(P.isEvent(P.EVT.TOKEN) === true, 'isEvent(EVT.TOKEN)');
    assert(P.isEvent('NOT_AN_EVENT') === false, 'isEvent(unknown) false');

    // ─── Helpers: okResponse / errResponse ───────────────────────────
    var ok = P.okResponse({ foo: 'bar' });
    assert(ok.ok === true, 'okResponse.ok === true');
    assert(ok.data && ok.data.foo === 'bar', 'okResponse.data');

    var err = P.errResponse('oops');
    assert(err.ok === false, 'errResponse.ok === false');
    assert(err.error.message === 'oops', 'errResponse.error.message');
    assert(err.error.code === P.ERR_CODE.UNKNOWN, 'errResponse default code = UNKNOWN');
    assert(typeof err.error.context === 'object', 'errResponse context es object');

    var err2 = P.errResponse('bad', P.ERR_CODE.VALIDATION, { field: 'password' });
    assert(err2.error.code === P.ERR_CODE.VALIDATION, 'errResponse custom code');
    assert(err2.error.context.field === 'password', 'errResponse custom context');

    // ─── Validators: INIT ────────────────────────────────────────────
    assert(P.validateRequest(P.REQ.INIT, { password: 'secret' }) === null, 'INIT válido');
    assert(P.validateRequest(P.REQ.INIT, { password: '' }) !== null, 'INIT password vacío → error');
    assert(P.validateRequest(P.REQ.INIT, {}) !== null, 'INIT sin password → error');
    assert(P.validateRequest(P.REQ.INIT, null) !== null, 'INIT null → error');

    // ─── Validators: CHAT ────────────────────────────────────────────
    assert(P.validateRequest(P.REQ.CHAT, { query: 'hola' }) === null, 'CHAT válido');
    assert(P.validateRequest(P.REQ.CHAT, { query: '  ' }) !== null, 'CHAT whitespace → error');
    assert(P.validateRequest(P.REQ.CHAT, {}) !== null, 'CHAT sin query → error');

    // ─── Validators: AGENT_CREATE ────────────────────────────────────
    assert(P.validateRequest(P.REQ.AGENT_CREATE, { config: { name: 'x' } }) === null, 'AGENT_CREATE válido');
    assert(P.validateRequest(P.REQ.AGENT_CREATE, {}) !== null, 'AGENT_CREATE sin config → error');

    // ─── Validators: AGENT_RUN ───────────────────────────────────────
    assert(P.validateRequest(P.REQ.AGENT_RUN, { id: 'a', goal: 'g' }) === null, 'AGENT_RUN válido');
    assert(P.validateRequest(P.REQ.AGENT_RUN, { id: 'a' }) !== null, 'AGENT_RUN sin goal → error');
    assert(P.validateRequest(P.REQ.AGENT_RUN, { goal: 'g' }) !== null, 'AGENT_RUN sin id → error');

    // ─── Validators: AGENT_UPDATE ────────────────────────────────────
    assert(P.validateRequest(P.REQ.AGENT_UPDATE, { id: 'a', patch: {} }) === null, 'AGENT_UPDATE válido');
    assert(P.validateRequest(P.REQ.AGENT_UPDATE, { id: 'a' }) !== null, 'AGENT_UPDATE sin patch → error');

    // ─── Validators: AGENT_ADD_KNOWLEDGE ────────────────────────────
    assert(P.validateRequest(P.REQ.AGENT_ADD_KNOWLEDGE, { id: 'a', documents: ['x'] }) === null, 'AGENT_ADD_KNOWLEDGE válido');
    assert(P.validateRequest(P.REQ.AGENT_ADD_KNOWLEDGE, { id: 'a', documents: 'x' }) !== null, 'AGENT_ADD_KNOWLEDGE documents no array → error');

    // ─── Validators: COMPARE ─────────────────────────────────────────
    assert(P.validateRequest(P.REQ.COMPARE, { query: 'q', models: ['a', 'b'] }) === null, 'COMPARE válido');
    assert(P.validateRequest(P.REQ.COMPARE, { query: 'q', models: ['a'] }) !== null, 'COMPARE models<2 → error');

    // ─── Validators: FACT_CHECK ──────────────────────────────────────
    assert(P.validateRequest(P.REQ.FACT_CHECK, { answer: 'a', query: 'q' }) === null, 'FACT_CHECK válido');
    assert(P.validateRequest(P.REQ.FACT_CHECK, { answer: 'a' }) !== null, 'FACT_CHECK sin query → error');

    // ─── Validators: MEMORY ──────────────────────────────────────────
    assert(P.validateRequest(P.REQ.MEMORY_REMEMBER, { text: 'recuerdo' }) === null, 'MEMORY_REMEMBER válido');
    assert(P.validateRequest(P.REQ.MEMORY_REMEMBER, {}) !== null, 'MEMORY_REMEMBER sin text → error');
    assert(P.validateRequest(P.REQ.MEMORY_RECALL, { query: 'q' }) === null, 'MEMORY_RECALL válido');

    // ─── Validators: SET_API_KEY ─────────────────────────────────────
    assert(P.validateRequest(P.REQ.SET_API_KEY, { provider: 'groq', apiKey: 'k' }) === null, 'SET_API_KEY válido');
    assert(P.validateRequest(P.REQ.SET_API_KEY, { provider: 'groq' }) !== null, 'SET_API_KEY sin apiKey → error');

    // ─── Validators: FINETUNE_CREATE ─────────────────────────────────
    assert(P.validateRequest(P.REQ.FINETUNE_CREATE, { baseModel: 'a', dataset: 'b', agentId: 'c' }) === null, 'FINETUNE_CREATE válido');
    assert(P.validateRequest(P.REQ.FINETUNE_CREATE, { baseModel: 'a' }) !== null, 'FINETUNE_CREATE incompleto → error');

    // ─── Validators: TEAM_CREATE / TEAM_RUN ──────────────────────────
    assert(P.validateRequest(P.REQ.TEAM_CREATE, { name: 't', agentIds: ['a'] }) === null, 'TEAM_CREATE válido');
    assert(P.validateRequest(P.REQ.TEAM_CREATE, { name: 't', agentIds: 'a' }) !== null, 'TEAM_CREATE agentIds no array → error');
    assert(P.validateRequest(P.REQ.TEAM_RUN, { teamId: 't', goal: 'g' }) === null, 'TEAM_RUN válido');
    assert(P.validateRequest(P.REQ.TEAM_RUN, { teamId: 't' }) !== null, 'TEAM_RUN sin goal → error');

    // ─── Validators: PROJECT_CREATE / UPDATE_TASK ───────────────────
    assert(P.validateRequest(P.REQ.PROJECT_CREATE, { name: 'p' }) === null, 'PROJECT_CREATE válido');
    assert(P.validateRequest(P.REQ.PROJECT_CREATE, {}) !== null, 'PROJECT_CREATE sin name → error');
    assert(P.validateRequest(P.REQ.PROJECT_UPDATE_TASK, { projectId: 'p', taskId: 't', status: 'done' }) === null, 'PROJECT_UPDATE_TASK válido');
    assert(P.validateRequest(P.REQ.PROJECT_UPDATE_TASK, { projectId: 'p' }) !== null, 'PROJECT_UPDATE_TASK incompleto → error');

    // ─── Validators: SELECT_MODEL / PLAN_TASK ───────────────────────
    assert(P.validateRequest(P.REQ.SELECT_MODEL, { query: 'q' }) === null, 'SELECT_MODEL válido');
    assert(P.validateRequest(P.REQ.PLAN_TASK, { goal: 'g' }) === null, 'PLAN_TASK válido');

    // ─── Validators: CONFIG_SAVE ─────────────────────────────────────
    assert(P.validateRequest(P.REQ.CONFIG_SAVE, { config: { foo: 1 } }) === null, 'CONFIG_SAVE válido');
    assert(P.validateRequest(P.REQ.CONFIG_SAVE, {}) !== null, 'CONFIG_SAVE sin config → error');

    // ─── Validators: compat (sin schema) ────────────────────────────
    assert(P.validateRequest(P.REQ.IS_READY, {}) === null, 'IS_READY sin schema → pasa');
    assert(P.validateRequest(P.REQ.HEALTH, {}) === null, 'HEALTH sin schema → pasa');
    assert(P.validateRequest(P.REQ.SUGGESTIONS, {}) === null, 'SUGGESTIONS sin schema → pasa');
    assert(P.validateRequest('FAKE_TYPE', { anything: 1 }) === null, 'tipo desconocido → pasa (router filtra NOT_FOUND)');

    // ─── Inmutabilidad ───────────────────────────────────────────────
    var originalInit = P.REQ.INIT;
    try {
      P.REQ.INIT = 'HACKED';
      assert(P.REQ.INIT === originalInit, 'REQ.INIT es inmutable (frozen)');
    } catch (e) {
      assert(true, 'REQ.INIT es inmutable (frozen, lanza al mutar)');
    }

    console.log('[TEST] ============================================');
    console.log('[TEST] Pasados:', passed, '| Fallados:', failed);
    if (failed > 0) {
      console.error('[TEST] Fallos:');
      failures.forEach(function(f) { console.error('  -', f); });
    }
    console.log('[TEST] ============================================');

    return { passed: passed, failed: failed, failures: failures };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runTests: runTests };
  } else {
    setTimeout(runTests, 50);
  }

})();