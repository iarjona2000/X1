/**
 * test-runner.js — Ejecutor de tests para integraciones
 * Carga y ejecuta tests en el service worker
 */

(function() {
  'use strict';

  var TestRunner = {
    suites: {},

    register: function(name, fn) {
      this.suites[name] = fn;
    },

    run: function(suiteName) {
      var suite = this.suites[suiteName];
      if (!suite) {
        console.error('[TestRunner] Suite no encontrada:', suiteName);
        return Promise.reject('Suite no encontrada');
      }
      console.log('[TestRunner] Ejecutando suite:', suiteName);
      return Promise.resolve(suite()).then(function(result) {
        console.log('[TestRunner] Suite', suiteName, 'completada:', result);
        return result;
      });
    },

    runAll: function() {
      var self = this;
      var names = Object.keys(this.suites);
      return names.reduce(function(promise, name) {
        return promise.then(function() {
          return self.run(name);
        });
      }, Promise.resolve()).then(function() {
        console.log('[TestRunner] Todas las suites completadas');
      });
    }
  };

  window.X1TestRunner = TestRunner;

})();