/**
 * fcc-bridge.js — Cerebro principal del Judge via Free Claude Code proxy
 *
 * Conecta X1 con free-claude-code (38.4k stars GitHub).
 * Proxy FastAPI que rutea a 18 providers (NVIDIA NIM, OpenRouter, Gemini, 
 * DeepSeek, Groq, Cerebras, Mistral, etc.) mediante Anthropic Messages API.
 *
 * Proporciona acceso gratuito a Claude-level AI mediante providers free-tier.
 * Es el proveedor PRIMARIO del sistema Judge.
 *
 * Licencia: MIT (Free Claude Code Contributors)
 * Fuente: https://github.com/Alishahryar1/free-claude-code
 */

(function() {
  'use strict';

  var log = {
    info: function(m) { console.log('[X1-FCC]', m); },
    warn: function(m) { console.warn('[X1-FCC]', m); },
    error: function(m) { console.error('[X1-FCC]', m); }
  };

  // ═══════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════

  var FCC_BASE_URL = 'http://localhost:8082';
  var FCC_DEFAULT_MODEL = 'nvidia_nim/nvidia/nemotron-3-super-120b-a12b';
  var FCC_TIMEOUT = 15000;
  var FCC_HEALTH_TIMEOUT = 2000;
  var FCC_AUTH_KEY = '';

  var proxyAvailable = null;
  var proxyCheckTimer = null;
  var proxyLastFail = 0;
  var proxyAuthToken = '';

  // ═══════════════════════════════════════════
  // HEALTH & DETECTION
  // ═══════════════════════════════════════════

  function checkProxy() {
    if (proxyAvailable === true) return Promise.resolve(true);
    if (Date.now() - proxyLastFail < 30000) return Promise.resolve(false);
    return fetch(FCC_BASE_URL + '/v1/messages', {
      method: 'HEAD',
      signal: AbortSignal.timeout(FCC_HEALTH_TIMEOUT)
    }).then(function(r) {
      proxyAvailable = r.ok || r.status === 204;
      if (proxyAvailable) {
        proxyLastFail = 0;
        log.info('Proxy disponible (' + FCC_BASE_URL + ')');
      }
      return proxyAvailable;
    }).catch(function(e) {
      proxyAvailable = false;
      proxyLastFail = Date.now();
      log.warn('Proxy no disponible: ' + e.message);
      return false;
    });
  }

  function forceCheck() {
    proxyAvailable = null;
    return checkProxy();
  }

  // ═══════════════════════════════════════════
  // COMPLETION (Anthropic Messages API)
  // ═══════════════════════════════════════════

  function generateText(messages, opts) {
    opts = opts || {};
    var model = opts.model || FCC_DEFAULT_MODEL;
    var maxTokens = opts.maxTokens || 4096;
    var temperature = opts.temperature !== undefined ? opts.temperature : 0.3;
    var timeout = opts.timeout || FCC_TIMEOUT;

    return checkProxy().then(function(available) {
      if (!available) return { ok: false, text: '', error: 'FCC proxy no disponible en ' + FCC_BASE_URL };

      var headers = { 'Content-Type': 'application/json' };
      if (proxyAuthToken) {
        headers['x-api-key'] = proxyAuthToken;
      }

      return fetch(FCC_BASE_URL + '/v1/messages', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: maxTokens,
          temperature: temperature,
          stream: false
        }),
        signal: AbortSignal.timeout(timeout)
      }).then(function(r) {
        if (!r.ok) {
          return r.json().then(function(errData) {
            var detail = (errData && errData.error && errData.error.message) || errData.detail || r.statusText;
            log.error('Proxy error (' + r.status + '): ' + detail);
            proxyLastFail = Date.now();
            proxyAvailable = false;
            return { ok: false, text: '', error: detail };
          }).catch(function() {
            proxyLastFail = Date.now();
            proxyAvailable = false;
            return { ok: false, text: '', error: 'HTTP ' + r.status };
          });
        }
        return r.json().then(function(data) {
          var text = '';
          if (data && data.content && data.content.length > 0) {
            for (var i = 0; i < data.content.length; i++) {
              if (data.content[i].type === 'text') {
                text += data.content[i].text;
              }
            }
          }
          if (!text) {
            text = (data && data.content && data.content[0] && data.content[0].text) || '';
          }
          proxyLastFail = 0;
          log.info('Respuesta recibida (' + (text.length || 0) + ' chars)');
          return { ok: true, text: text, model: data.model || model, usage: data.usage || null };
        });
      }).catch(function(e) {
        if (e.name === 'AbortError') {
          log.error('Timeout (' + timeout + 'ms)');
          proxyLastFail = Date.now();
          return { ok: false, text: '', error: 'timeout' };
        }
        log.error('Fetch error: ' + e.message);
        proxyLastFail = Date.now();
        proxyAvailable = false;
        return { ok: false, text: '', error: e.message };
      });
    });
  }

  function generateSimple(prompt, opts) {
    return generateText([{ role: 'user', content: prompt }], opts);
  }

  function generateChat(systemPrompt, userMsg, opts) {
    var messages = [];
    if (systemPrompt) messages.push({ role: 'user', content: 'Contexto: ' + systemPrompt + '\n\n' + userMsg });
    else messages.push({ role: 'user', content: userMsg });
    return generateText(messages, opts);
  }

  // ═══════════════════════════════════════════
  // PROVIDER FUNCTION (para X1Pool)
  // ═══════════════════════════════════════════

  function x1FccComplete(userMsg) {
    return checkProxy().then(function(available) {
      if (!available) return null;
      var sys = (typeof getCachedSystemPrompt === 'function') ? getCachedSystemPrompt(userMsg) : '';
      var usr = (typeof stripImages === 'function') ? stripImages(userMsg) : userMsg;
      if (typeof stripImages === 'function') sys = stripImages(sys);
      var messages = [];
      if (sys) messages.push({ role: 'user', content: 'System: ' + sys + '\n\n' + usr });
      else messages.push({ role: 'user', content: usr });
      return generateText(messages, { timeout: 10000, temperature: 0.1 }).then(function(result) {
        if (!result.ok || !result.text) return null;
        var txt = result.text.trim();
        if (typeof isValidContent === 'function' && !isValidContent(txt)) return null;
        return txt;
      });
    });
  }

  // ═══════════════════════════════════════════
  // MODEL DISCOVERY
  // ═══════════════════════════════════════════

  function listModels() {
    return fetch(FCC_BASE_URL + '/v1/models', {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    }).then(function(r) { return r.json(); }).then(function(data) {
      var models = [];
      if (data && data.data) {
        for (var i = 0; i < data.data.length; i++) {
          models.push({
            id: data.data[i].id,
            name: data.data[i].display_name || data.data[i].id,
            provider: data.data[i].provider || 'unknown'
          });
        }
      }
      return models;
    }).catch(function() { return []; });
  }

  // ═══════════════════════════════════════════
  // START/STOP HELPERS
  // ═══════════════════════════════════════════

  function buildStartCommand() {
    return {
      command: 'uv',
      args: ['run', 'uvicorn', 'server:app', '--host', '0.0.0.0', '--port', '8082'],
      cwd: ''  // Will be filled by the caller
    };
  }

  // ═══════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════

  window.X1FCCBridge = {
    // Core
    checkProxy: checkProxy,
    forceCheck: forceCheck,
    generateText: generateText,
    generateSimple: generateSimple,
    generateChat: generateChat,
    complete: x1FccComplete,
    listModels: listModels,

    // Config
    getBaseUrl: function() { return FCC_BASE_URL; },
    setBaseUrl: function(url) { FCC_BASE_URL = url; proxyAvailable = null; },
    getDefaultModel: function() { return FCC_DEFAULT_MODEL; },
    setDefaultModel: function(m) { FCC_DEFAULT_MODEL = m; },
    getAuthToken: function() { return proxyAuthToken; },
    setAuthToken: function(t) { proxyAuthToken = t; },

    // Status
    isAvailable: function() { return proxyAvailable === true; },
    getLastFail: function() { return proxyLastFail; },

    // Health
    healthCheck: function() {
      return checkProxy().then(function(ok) {
        return {
          ok: ok,
          name: 'Free Claude Code Proxy',
          version: '1.0.0',
          baseUrl: FCC_BASE_URL,
          model: FCC_DEFAULT_MODEL,
          available: ok,
          providerCount: 18,
          auth: !!proxyAuthToken,
          capabilities: ['text', 'code', 'reasoning', 'agent', 'tool-use']
        };
      });
    },

    // Launcher config (for Native Messaging or external scripts)
    getLaunchConfig: buildStartCommand
  };

  // Register with integration system
  if (window.X1Integrations) {
    window.X1Integrations.register({
      name: 'free-claude-code',
      version: '1.0.0',
      license: 'MIT',
      path: 'background/integrations/free-claude-code/',
      description: 'Proxy AI con 18 providers (Claude, Gemini, Groq, etc.) via Anthropic Messages API',
      healthCheck: function() { return window.X1FCCBridge.healthCheck(); },
      dependencies: ['python3', 'uv', 'fastapi']
    });
  }

  log.info('X1FCCBridge loaded — primary Judge brain via FCC proxy');
  log.info('Proxy endpoint: ' + FCC_BASE_URL + '/v1/messages');

  // Auto-check on load
  checkProxy().then(function(ok) {
    log.info(ok ? 'FCC proxy conectado' : 'FCC proxy no encontrado — ejecuta: fcc-server');
  });

})();
