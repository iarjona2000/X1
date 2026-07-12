// ─────────────────────────────────────────────────────────────────────────
// background/sandbox/repl-runner.js
// Bridge entre el service worker (que NO puede ejecutar codigo arbitrario
// por MV3 CSP unsafe-eval) y el sandboxed iframe en offscreen/keepalive.html
// (que SI puede usar `new Function()` y `eval()` por estar sandboxed sin
// mismo-origen).
//
// Arquitectura del mini REPL headless (Freebuff autopiloto):
//
//   sidepanel-ui/src/github-agent.js (proposeChanges Phase 4)
//       ↓ chrome.runtime.sendMessage({type:'X1_SANDBOX_VALIDATE'})
//   service-worker.js (onMessage handler)
//       ↓ X1SandboxREPL.validateFiles(files, opts)
//   background/sandbox/repl-runner.js (este modulo, ES5 estricto)
//       ↓ chrome.runtime.sendMessage({type:'X1_SANDBOX_RUN_IN_IFRAME', file})
//   offscreen/keepalive.html (bridge) -- listener chrome.runtime.onMessage
//       ↓ iframe.contentWindow.postMessage({type:'X1_SANDBOX_RUN', code})
//   background/sandbox/repl-iframe.html (sandbox="allow-scripts")
//       ↓ new Function(code) → postMessage(result)
//   offscreen/keepalive.html (result handler → sendResponse al SW)
//       ↓ Promise.then
//   repl-runner.js agrega resultados → devuelve a SW → sidepanel
//
// Por que no usar new Worker(blob:URL) en el SW: MV3 hereda CSP del SW al
// worker, y 'unsafe-eval' esta bloqueado → (new Function(code))() throws
// CSPViolationError en vez de SyntaxError. El iframe sandboxes tiene su
// propio origen, no hereda el CSP del padre, y permite eval libremente.
// (Verificado por code-reviewer analysis 2026-07-07.)
// ─────────────────────────────────────────────────────────────────────────
(function (self) {
  'use strict';

  var MSG_VALIDATE = 'X1_SANDBOX_VALIDATE';
  var MSG_RUN_IN_IFRAME = 'X1_SANDBOX_RUN_IN_IFRAME';
  var MSG_SANDBOX_STATUS = 'X1_SANDBOX_STATUS';

  var MAX_FILE_LENGTH = 50000; // 50KB por archivo — el judge no genera archivos mas grandes
  var SANDBOX_FILE_EXT_RE = /\.(jsx?|tsx?|mjs|cjs)$/i;
  // Bumped 6s → 8s tras code-reviewer (50KB files con evaluacion compleja
  // pueden pasar 6s — el margen de 2s extra evita falsos timeouts).
  var RESPONSE_TIMEOUT_MS = 8000; // 8s per-file ceiling — autopiloto no puede colgarse

  function log(m)  { try { console.log('[X1-Sandbox]', m); } catch (e) {} }
  function warn(m) { try { console.warn('[X1-Sandbox]', m); } catch (e) {} }
  function err(m)  { try { console.error('[X1-Sandbox]', m); } catch (e) {} }

  function classifyFile(filePath) {
    if (!filePath || typeof filePath !== 'string') return 'unknown';
    var p = filePath.toLowerCase().replace(/\\/g, '/');
    if (SANDBOX_FILE_EXT_RE.test(p)) return 'executable'; // JS/TS/JSX/TSX
    if (/\.(md|markdown|json|ya?ml|toml|env|sh|bat|cmd|sql|css|scss|html|vue|svelte)$/i.test(p)) return 'data';
    return 'unknown';
  }

  // Pide al offscreen que ejecute `code` en el iframe sandboxes. Devuelve
  // Promise<{ok, kind, error, took, ...}> — resuelve SIEMPRE (nunca cuelga).
  function runInSandboxIframe(code, filePath) {
    return new Promise(function (resolve) {
      var requestId = 'sbx-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 0xffff).toString(36);
      var settled = false;

      var settle = function (result) {
        if (settled) return; settled = true;
        clearTimeout(timer);
        try { chrome.runtime.sendMessage({ type: 'X1_SANDBOX_PING_CANCEL', requestId: requestId }); } catch (e) {}
        resolve(result);
      };

      var timer = setTimeout(function () {
        settle({ ok: false, kind: 'timeout', error: 'sandbox excedio ' + RESPONSE_TIMEOUT_MS + 'ms sin responder', took: RESPONSE_TIMEOUT_MS, filePath: filePath });
      }, RESPONSE_TIMEOUT_MS);

      try {
        chrome.runtime.sendMessage({
          type: MSG_RUN_IN_IFRAME,
          requestId: requestId,
          code: String(code || '').slice(0, MAX_FILE_LENGTH),
          filePath: filePath || '<anonymous>',
          timeoutMs: RESPONSE_TIMEOUT_MS
        }, function (resp) {
          if (settled) return;
          if (chrome.runtime.lastError) {
            settle({ ok: false, kind: 'bridge-error', error: 'sendMessage lastError: ' + chrome.runtime.lastError.message, took: 0, filePath: filePath });
            return;
          }
          if (!resp) { settle({ ok: false, kind: 'bridge-null', error: 'keepalive no respondio (¿offscreen no esta creado?)', took: 0, filePath: filePath }); return; }
          settle(resp);
        });
      } catch (e) {
        settle({ ok: false, kind: 'bridge-throw', error: 'sendMessage throw: ' + (e && e.message || e), took: 0, filePath: filePath });
      }
    });
  }

  // ── API principal: ejecuta N archivos JS en el sandbox paralelo ────
  // files: [{path, content}] (formato de la propuesta de github-agent.js)
  // opts: { skipData: bool=true, parallelLimit: number=3 }
  // Devuelve: Promise<{ok, problems: [...], stats: {...}, perFile: [...]}>
  function validateFiles(files, opts) {
    opts = opts || {};
    var skipData = opts.skipData !== false; // default true
    var parallelLimit = Math.max(1, Math.min(opts.parallelLimit || 3, 6));
    var startedAt = Date.now();
    var requestIdCounter = 0;

    if (!Array.isArray(files) || files.length === 0) {
      return Promise.resolve({ ok: true, problems: [], stats: { executed: 0, skipped: 0, errors: 0, tookMs: 0 }, perFile: [] });
    }

    // 1. Clasifica y filtra (no ejecutar JSON/MD/HTML/etc)
    var queue = [];
    files.forEach(function (f) {
      var cls = classifyFile(f && f.path);
      if (cls === 'executable') {
        queue.push({
          path: f.path,
          content: String((f && f.content) || ''),
          classification: cls
        });
      } else if (cls === 'data' && !skipData) {
        queue.push({ path: f.path, content: String((f && f.content) || ''), classification: cls });
      } else {
        queue.push({ path: f.path, content: String((f && f.content) || ''), classification: cls, skipped: true });
      }
    });

    log('validateFiles queued=' + queue.length + ' (executable=' + queue.filter(function (q) { return q.classification === 'executable'; }).length + ')');

    // 2. Ejecuta en paralelo limitado usando chain de Promises
    var perFilePromises = queue.map(function (item) { return function () {
      if (item.skipped || item.classification === 'unknown') {
        return Promise.resolve({ path: item.path, ok: true, kind: 'skipped', reason: 'classification=' + item.classification, took: 0 });
      }
      if (!item.content || !item.content.trim()) {
        return Promise.resolve({ path: item.path, ok: true, kind: 'empty', took: 0 });
      }
      if (item.content.length > MAX_FILE_LENGTH) {
        return Promise.resolve({ path: item.path, ok: false, kind: 'too-long', error: 'archivo excede ' + MAX_FILE_LENGTH + ' chars — trim necesario', took: 0 });
      }
      return runInSandboxIframe(item.content, item.path);
    }; });

    // Limita paralelismo con chain secuencial de limits
    function runLimited(promiseFactories, limit) {
      var results = new Array(promiseFactories.length);
      var next = 0;
      function launch() {
        if (next >= promiseFactories.length) return Promise.resolve();
        var i = next++;
        return Promise.resolve(promiseFactories[i]()).then(function (r) {
          results[i] = r;
          return launch();
        });
      }
      var launchers = [];
      for (var k = 0; k < limit && k < promiseFactories.length; k++) launchers.push(launch());
      return Promise.all(launchers).then(function () { return results; });
    }

    return runLimited(perFilePromises, parallelLimit).then(function (perFile) {
      var problems = [];
      var executed = 0;
      var errors = 0;
      var skipped = 0;

      perFile.forEach(function (r) {
        if (!r) return;
        if (r.kind === 'skipped' || r.kind === 'empty') { skipped++; return; }
        executed++;
        if (r.ok) return;
        errors++;
        problems.push({
          file: r.filePath || r.path || '<unknown>',
          type: r.kind === 'syntax' ? 'syntax' : (r.kind === 'reference' ? 'reference' : (r.kind === 'type' ? 'type' : (r.kind === 'timeout' ? 'timeout' : 'runtime'))),
          msg: (r.error || ('fallo de tipo ' + r.kind)) + (r.stack ? '\nstack: ' + r.stack : '')
        });
      });

      var aggregate = {
        ok: problems.length === 0,
        problems: problems,
        stats: { executed: executed, skipped: skipped, errors: errors, tookMs: Date.now() - startedAt },
        perFile: perFile
      };
      log('validateFiles done ok=' + aggregate.ok + ' errors=' + errors + ' executed=' + executed + ' skipped=' + skipped + ' tookMs=' + aggregate.stats.tookMs);
      return aggregate;
    });
  }

  // ── Diagnostico: ¿esta todo el bridge disponible? ───────────────
  function status() {
    return new Promise(function (resolve) {
      try {
        chrome.runtime.sendMessage({ type: MSG_SANDBOX_STATUS, at: Date.now() }, function (resp) {
          if (chrome.runtime.lastError) {
            resolve({ bridgeOk: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(resp || { bridgeOk: false, error: 'keepalive no respondio' });
        });
      } catch (e) {
        resolve({ bridgeOk: false, error: 'sendMessage throw: ' + (e && e.message || e) });
      }
    });
  }

  // ── API publica ──────────────────────────────────────────────────
  self.X1SandboxREPL = {
    validateFiles: validateFiles,
    status: status,
    _internals: {
      classifyFile: classifyFile,
      runInSandboxIframe: runInSandboxIframe,
      RESPONSE_TIMEOUT_MS: RESPONSE_TIMEOUT_MS,
      MAX_FILE_LENGTH: MAX_FILE_LENGTH
    }
  };
})(self);
