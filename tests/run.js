/**
 * tests/run.js — runner de tests para Node.
 *
 * Carga todos los tests/*.test.js en orden, los ejecuta, reporta resultados.
 * Uso:
 *   node tests/run.js                  # corre todos
 *   node tests/run.js protocol         # corre solo tests que matchean "protocol"
 *
 * Requiere que cada test exporte { runTests: () => { passed, failed } } o
 * que se auto-ejecuten con setTimeout.
 */

'use strict';

// Mock window/self para que los content-script-style tests funcionen en Node.
global.window = global;
global.self = global;

var fs = require('fs');
var path = require('path');

var testsDir = __dirname;
var pattern = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;

var files = fs.readdirSync(testsDir)
  .filter(function(f) { return f.endsWith('.test.js'); })
  .sort();

if (pattern) {
  files = files.filter(function(f) { return pattern.test(f); });
}

if (files.length === 0) {
  console.log('[run] No hay tests que matcheen' + (process.argv[2] ? ' "' + process.argv[2] + '"' : '') + '.');
  process.exit(0);
}

console.log('[run] ' + files.length + ' archivo(s) de test: ' + files.join(', '));
console.log('[run] Cargando protocolo + dependencias...');

// Carga el protocolo desde background/ para que window.X1Protocol exista.
require(path.join(__dirname, '..', 'background', 'protocol.js'));
console.log('[run] X1Protocol v' + global.X1Protocol.version + ' cargado · ' +
  Object.keys(global.X1Protocol.REQ).length + ' REQ, ' +
  Object.keys(global.X1Protocol.EVT).length + ' EVT');

var totalPassed = 0;
var totalFailed = 0;
var totalTests = files.length;
var failedFiles = [];

function runOne(idx) {
  if (idx >= files.length) {
    // Resumen
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[run] Resumen: ' + totalPassed + ' pasaron, ' + totalFailed + ' fallaron, en ' + totalTests + ' archivo(s)');
    if (failedFiles.length > 0) {
      console.log('[run] Archivos con fallos:');
      failedFiles.forEach(function(f) { console.log('  ✗ ' + f); });
      process.exit(1);
    }
    console.log('═══════════════════════════════════════════════════════════');
    return;
  }

  var file = files[idx];
  var fullPath = path.join(testsDir, file);

  console.log('');
  console.log('───────────────────────────────────────────────────────────');
  console.log('[run] ▶ ' + file);

  try {
    // Limpia module cache para que cada test corra con estado limpio
    delete require.cache[require.resolve(fullPath)];

    var mod = require(fullPath);
    var result;

    if (mod && typeof mod.runTests === 'function') {
      result = mod.runTests();
    } else if (mod && mod.runTests instanceof Promise) {
      result = mod.runTests;
    } else {
      // Tests que se auto-ejecutan con setTimeout; esperamos y seguimos
      setTimeout(function() { runOne(idx + 1); }, 800);
      return;
    }

    if (result && typeof result.then === 'function') {
      result.then(function(r) {
        if (r) {
          totalPassed += (r.passed || 0);
          totalFailed += (r.failed || 0);
          if (r.failed > 0) failedFiles.push(file);
        }
        runOne(idx + 1);
      }).catch(function(e) {
        console.error('[run] Error en ' + file + ':', e.message);
        totalFailed += 1;
        failedFiles.push(file);
        runOne(idx + 1);
      });
    } else if (result) {
      totalPassed += (result.passed || 0);
      totalFailed += (result.failed || 0);
      if (result.failed > 0) failedFiles.push(file);
      runOne(idx + 1);
    } else {
      runOne(idx + 1);
    }
  } catch (e) {
    console.error('[run] Error cargando/ejecutando ' + file + ':', e.message);
    totalFailed += 1;
    failedFiles.push(file);
    runOne(idx + 1);
  }
}

runOne(0);