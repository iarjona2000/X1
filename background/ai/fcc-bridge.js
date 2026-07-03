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

  var LOCAL_PROXY = 'http://localhost:8082';
  var CLOUD_PROXY = 'https://x1-proxy.baosx1.workers.dev';
  var CLOUD_SECRET = '9ff4b7dda5f7defd5f7fb7c32c133428bc87e8efeb8550d3ce1e5838c1d3b850';
  var DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';
  var TIMEOUT = 15000;
  var HEALTH_TIMEOUT = 2000;

  var proxyAvailable = null;
  var proxyLastFail = 0;
  var usingLocal = false;

  // ═══════════════════════════════════════════
  // HEALTH — checks local FCC first, then cloud
  // ═══════════════════════════════════════════

  function checkLocal() {
    return fetch(LOCAL_PROXY + '/v1/messages', {
      method: 'HEAD',
      signal: AbortSignal.timeout(HEALTH_TIMEOUT)
    }).then(function(r) {
      return r.ok || r.status === 204;
    }).catch(function() {
      return false;
    });
  }

  function checkCloud() {
    return fetch(CLOUD_PROXY + '/health', {
      method: 'GET',
      signal: AbortSignal.timeout(HEALTH_TIMEOUT)
    }).then(function(r) {
      return r.ok;
    }).catch(function() {
      return false;
    });
  }

  function checkProxy() {
    if (proxyAvailable === true) return Promise.resolve(true);
    if (Date.now() - proxyLastFail < 5000) return Promise.resolve(false);

    return checkLocal().then(function(ok) {
      if (ok) {
        proxyAvailable = true;
        usingLocal = true;
        proxyLastFail = 0;
        log.info('Judge local (free-claude-code) disponible');
        return true;
      }
      return checkCloud().then(function(cloudOk) {
        if (cloudOk) {
          proxyAvailable = true;
          usingLocal = false;
          proxyLastFail = 0;
          log.info('Judge cloud (x1-proxy) disponible');
          return true;
        }
        proxyAvailable = false;
        proxyLastFail = Date.now();
        log.warn('Ningun Judge disponible');
        return false;
      });
    });
  }

  function forceCheck() {
    proxyAvailable = null;
    return checkProxy();
  }

  // ═══════════════════════════════════════════
  // COMPLETION
  // ═══════════════════════════════════════════

  function generateText(messages, opts) {
    opts = opts || {};
    var maxTokens = opts.maxTokens || 4096;
    var temperature = opts.temperature !== undefined ? opts.temperature : 0.3;
    var timeout = opts.timeout || TIMEOUT;

    return checkProxy().then(function(available) {
      if (!available) {
        return { ok: false, text: '', error: 'Judge no disponible' };
      }

      if (usingLocal) {
        return fetch(LOCAL_PROXY + '/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: opts.model || DEFAULT_MODEL,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature,
            stream: false
          }),
          signal: AbortSignal.timeout(timeout)
        }).then(function(r) {
          if (!r.ok) {
            proxyAvailable = false;
            proxyLastFail = Date.now();
            return { ok: false, text: '', error: 'HTTP ' + r.status };
          }
          return r.json().then(function(data) {
            var text = '';
            if (data && data.content && data.content.length > 0) {
              for (var i = 0; i < data.content.length; i++) {
                if (data.content[i].type === 'text') text += data.content[i].text;
              }
            }
            if (!text) text = (data && data.content && data.content[0] && data.content[0].text) || '';
            proxyLastFail = 0;
            return { ok: true, text: text, model: data.model || opts.model || DEFAULT_MODEL };
          });
        }).catch(function(e) {
          proxyAvailable = false;
          proxyLastFail = Date.now();
          log.warn('Local proxy error, fallback a cloud: ' + e.message);
          usingLocal = false;
          return cloudComplete(messages, opts);
        });
      }

      return cloudComplete(messages, opts);
    });
  }

  function cloudComplete(messages, opts) {
    var maxTokens = opts.maxTokens || 4096;
    var temperature = opts.temperature !== undefined ? opts.temperature : 0.3;
    var timeout = opts.timeout || TIMEOUT;

    var userMsg = '';
    for (var i = 0; i < messages.length; i++) {
      if (messages[i].role === 'user') userMsg += messages[i].content + '\n';
    }

    return fetch(CLOUD_PROXY + '/v1/chat/completions', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-X1-Auth': CLOUD_SECRET},
      body: JSON.stringify({
        messages: [{role: 'user', content: userMsg.trim()}]
      }),
      signal: AbortSignal.timeout(timeout)
    }).then(function(r) {
      if (!r.ok) {
        proxyAvailable = false;
        proxyLastFail = Date.now();
        return { ok: false, text: '', error: 'HTTP ' + r.status };
      }
      return r.json();
    }).then(function(d) {
      var txt = '';
      if (d && d.choices && d.choices[0] && d.choices[0].message) {
        txt = (d.choices[0].message.content || '').trim();
      }
      proxyLastFail = 0;
      proxyAvailable = true;
      return { ok: !!txt, text: txt, model: (d && d.model) || 'cloud-proxy' };
    }).catch(function(e) {
      proxyAvailable = false;
      proxyLastFail = Date.now();
      return { ok: false, text: '', error: e.message };
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
      var usr = (typeof stripImages === 'function') ? stripImages(userMsg) : userMsg;
      return generateText([{ role: 'user', content: usr }], { timeout: 10000, temperature: 0.1 }).then(function(result) {
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
    if (usingLocal) {
      return fetch(LOCAL_PROXY + '/v1/models', {
        method: 'GET', signal: AbortSignal.timeout(3000)
      }).then(function(r) { return r.json(); }).then(function(data) {
        var models = [];
        if (data && data.data) {
          for (var i = 0; i < data.data.length; i++) {
            models.push({ id: data.data[i].id, name: data.data[i].display_name || data.data[i].id, provider: data.data[i].provider || 'unknown' });
          }
        }
        return models;
      }).catch(function() { return []; });
    }
    return Promise.resolve([{ id: DEFAULT_MODEL, name: 'NVIDIA Nemotron 3', provider: 'nvidia' }]);
  }

  // ═══════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════

  window.X1FCCBridge = {
    checkProxy: checkProxy,
    forceCheck: forceCheck,
    generateText: generateText,
    generateSimple: generateSimple,
    generateChat: generateChat,
    complete: x1FccComplete,
    listModels: listModels,

    getBaseUrl: function() { return usingLocal ? LOCAL_PROXY : CLOUD_PROXY; },
    isAvailable: function() { return proxyAvailable === true; },
    isLocal: function() { return usingLocal; },
    getLastFail: function() { return proxyLastFail; },

    healthCheck: function() {
      return checkProxy().then(function(ok) {
        return {
          ok: ok,
          name: 'Judge (' + (usingLocal ? 'local FCC' : 'cloud proxy') + ')',
          baseUrl: usingLocal ? LOCAL_PROXY : CLOUD_PROXY,
          model: DEFAULT_MODEL,
          available: ok,
          providerCount: usingLocal ? 18 : 3,
          capabilities: ['text', 'code', 'reasoning']
        };
      });
    },

    getLaunchConfig: function() {
      return { command: 'uv', args: ['run', 'uvicorn', 'server:app', '--host', '0.0.0.0', '--port', '8082'], cwd: '' };
    }
  };

  if (window.X1Integrations) {
    window.X1Integrations.register({
      name: 'free-claude-code',
      version: '1.0.0',
      license: 'MIT',
      path: 'background/integrations/free-claude-code/',
      description: 'Judge — Free Claude Code con 18 providers',
      healthCheck: function() { return window.X1FCCBridge.healthCheck(); },
      dependencies: ['python3', 'uv', 'fastapi']
    });
  }

  log.info('X1FCCBridge loaded — Judge listo (local FCC + cloud proxy)');

  // Auto-check on load
  checkProxy().then(function(ok) {
    log.info(ok ? 'Judge conectado (' + (usingLocal ? 'local' : 'cloud') + ')' : 'Judge no disponible');
  });

})();
