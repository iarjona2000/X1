/**
 * Tests para continue-bridge.js
 */

(function() {
  'use strict';

  var passed = 0;
  var failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
      console.log('[TEST] ✓', message);
    } else {
      failed++;
      console.error('[TEST] ✗', message);
    }
  }

  function runTests() {
    console.log('[TEST] Iniciando tests de Continue Bridge...');

    // Test 1: Bridge existe
    assert(typeof window.X1ContinueBridge === 'object', 'X1ContinueBridge existe globalmente');
    assert(typeof window.X1ContinueBridge.createProvider === 'function', 'createProvider es función');
    assert(typeof window.X1ContinueBridge.getAvailableProviders === 'function', 'getAvailableProviders es función');

    // Test 2: Providers disponibles
    var providers = window.X1ContinueBridge.getAvailableProviders();
    assert(Array.isArray(providers), 'getAvailableProviders retorna array');
    assert(providers.length > 0, 'Hay providers disponibles');
    assert(providers.indexOf('ollama') >= 0, 'Incluye ollama');
    assert(providers.indexOf('groq') >= 0, 'Incluye groq');
    assert(providers.indexOf('cerebras') >= 0, 'Incluye cerebras');
    assert(providers.indexOf('openai') >= 0, 'Incluye openai');

    // Test 3: Crear providers
    try {
      var ollama = window.X1ContinueBridge.createProvider('ollama', { model: 'llama3.1', apiBase: 'http://localhost:11434' });
      assert(ollama && typeof ollama.complete === 'function', 'OllamaProvider creado con complete()');
      assert(ollama.getModel() === 'llama3.1', 'OllamaProvider model correcto');
    } catch(e) {
      assert(false, 'Error creando OllamaProvider: ' + e.message);
    }

    try {
      var groq = window.X1ContinueBridge.createProvider('groq', { model: 'llama-3.3-70b-versatile', apiKey: 'test-key' });
      assert(groq && typeof groq.complete === 'function', 'GroqProvider creado');
    } catch(e) {
      assert(false, 'Error creando GroqProvider: ' + e.message);
    }

    try {
      var cerebras = window.X1ContinueBridge.createProvider('cerebras', { model: 'llama3.1-70b', apiKey: 'test-key' });
      assert(cerebras && typeof cerebras.complete === 'function', 'CerebrasProvider creado');
    } catch(e) {
      assert(false, 'Error creando CerebrasProvider: ' + e.message);
    }

    // Test 4: Provider inválido
    try {
      window.X1ContinueBridge.createProvider('inexistente', {});
      assert(false, 'Debería fallar con provider inexistente');
    } catch(e) {
      assert(true, 'Falla correctamente con provider inexistente');
    }

    // Test 5: ContextManager
    var ctxMgr = window.X1ContinueBridge.createContextManager();
    assert(ctxMgr && typeof ctxMgr.addContext === 'function', 'ContextManager creado');
    ctxMgr.addFile('test.js', 'console.log("hola");', 'archivo test');
    ctxMgr.addText('contexto extra', 'nota');
    var summary = ctxMgr.getContextSummary();
    assert(typeof summary === 'string' && summary.indexOf('test.js') >= 0, 'ContextManager resumen correcto');

    // Test 6: Messages building
    var messages = ctxMgr.buildMessages('Hola mundo', 'Eres un asistente');
    assert(Array.isArray(messages) && messages.length >= 2, 'buildMessages retorna array');
    assert(messages[0].role === 'system', 'Primer mensaje es system');
    assert(messages[messages.length - 1].content === 'Hola mundo', 'Último mensaje es user input');

    // Test 7: Health check
    return window.X1ContinueBridge.healthCheck().then(function(result) {
      assert(result.ok === true, 'Health check pasa');
      assert(Array.isArray(result.providers), 'Health check incluye providers');

      console.log('[TEST] ========================');
      console.log('[TEST] Pasados:', passed, '| Fallados:', failed);
      console.log('[TEST] ========================');
      return { passed: passed, failed: failed };
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runTests: runTests };
  } else {
    setTimeout(runTests, 100);
  }

})();