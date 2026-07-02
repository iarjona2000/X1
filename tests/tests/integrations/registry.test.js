/**
 * Tests para integrations-registry.js
 * Ejecutar en contexto del service worker
 */

(function() {
  'use strict';

  var X1Integrations = window.X1Integrations;
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
    console.log('[TEST] Iniciando tests de registry...');

    // Test 1: Registry existe
    assert(typeof X1Integrations === 'object', 'Registry existe globalmente');
    assert(typeof X1Integrations.register === 'function', 'Método register existe');
    assert(typeof X1Integrations.get === 'function', 'Método get existe');
    assert(typeof X1Integrations.list === 'function', 'Método list existe');
    assert(typeof X1Integrations.setEnabled === 'function', 'Método setEnabled existe');
    assert(typeof X1Integrations.checkHealth === 'function', 'Método checkHealth existe');
    assert(typeof X1Integrations.checkAll === 'function', 'Método checkAll existe');

    // Test 2: Integraciones pre-registradas
    var expected = ['continue', 'kilo', 'openwebui', 'llamaindex', 'piper', 'whisper'];
    var list = X1Integrations.list();
    assert(list.length >= 6, 'Al menos 6 integraciones registradas');

    expected.forEach(function(name) {
      var found = list.find(function(i) { return i.name === name; });
      assert(!!found, 'Integración registrada: ' + name);
      if (found) {
        assert(typeof found.version === 'string', name + ' tiene version');
        assert(typeof found.license === 'string', name + ' tiene license');
        assert(typeof found.enabled === 'boolean', name + ' tiene enabled');
      }
    });

    // Test 3: Get por nombre
    var continueInt = X1Integrations.get('continue');
    assert(continueInt && continueInt.name === 'continue', 'Get por nombre funciona');
    assert(X1Integrations.get('inexistente') === null, 'Get inexistente retorna null');

    // Test 4: setEnabled
    var original = X1Integrations.get('continue').enabled;
    X1Integrations.setEnabled('continue', false);
    assert(X1Integrations.get('continue').enabled === false, 'setEnabled(false) funciona');
    X1Integrations.setEnabled('continue', true);
    assert(X1Integrations.get('continue').enabled === true, 'setEnabled(true) funciona');
    X1Integrations.setEnabled('continue', original);

    // Test 5: register nuevo
    var testReg = X1Integrations.register({
      name: 'test-integration',
      version: '1.0.0',
      license: 'MIT',
      path: 'test/path',
      healthCheck: function() { return Promise.resolve({ok: true}); }
    });
    assert(testReg === true, 'Register nuevo retorna true');
    var testInt = X1Integrations.get('test-integration');
    assert(testInt && testInt.name === 'test-integration', 'Nueva integración accesible');

    // Test 6: register falla sin campos requeridos
    var badReg = X1Integrations.register({ name: 'bad' });
    assert(badReg === false, 'Register falla sin campos requeridos');

    // Test 7: Config storage
    var cfg = X1Integrations.getConfigForStorage();
    assert(typeof cfg === 'object', 'getConfigForStorage retorna objeto');
    assert(cfg.continue && typeof cfg.continue.enabled === 'boolean', 'Config incluye enabled');

    // Test 8: loadFromStorage
    X1Integrations.loadFromStorage({ 'continue': { enabled: false } });
    assert(X1Integrations.get('continue').enabled === false, 'loadFromStorage deshabilita');
    X1Integrations.loadFromStorage({ 'continue': { enabled: true } });

    // Test 9: healthCheck (async)
    return X1Integrations.checkHealth('continue').then(function(result) {
      assert(result.ok === true, 'Health check continue pasa');
    }).then(function() {
      return X1Integrations.checkAll();
    }).then(function(results) {
      assert(typeof results === 'object', 'checkAll retorna objeto');
      console.log('[TEST] Resultados health checks:', results);
    }).then(function() {
      console.log('[TEST] ========================');
      console.log('[TEST] Pasados:', passed, '| Fallados:', failed);
      console.log('[TEST] ========================');
      return { passed: passed, failed: failed };
    });
  }

  // Auto-ejecutar si estamos en test environment
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runTests: runTests };
  } else {
    // En browser/service-worker, ejecutar después de un tick
    setTimeout(runTests, 100);
  }

})();