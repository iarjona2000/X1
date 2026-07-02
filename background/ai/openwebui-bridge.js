/**
 * openwebui-bridge.js — Adaptador de Open WebUI para X1
 *
 * Extrae la lógica de chat/completions de Open WebUI y la expone como
 * interfaz unificada para X1. Incluye chat, completions, y gestión de modelos.
 * Licencia: MIT (Open WebUI Contributors)
 */

(function() {
  'use strict';

  var log = (typeof x1Log === 'function') ? x1Log('OpenWebUIBridge') : { info: function(m){console.log('[X1-OpenWebUI]',m);}, warn: function(m){console.warn('[X1-OpenWebUI]',m);}, error: function(m){console.error('[X1-OpenWebUI]',m);} };

  // ─── Open WebUI compatible chat endpoint ───

  function OpenWebUIClient(options) {
    this.baseUrl = options.baseUrl || 'http://localhost:8080';
    this.apiKey = options.apiKey || '';
    this.model = options.model || 'llama3.1';
  }

  OpenWebUIClient.prototype.chat = function(messages, options) {
    var self = this;
    options = options || {};
    var url = this.baseUrl + '/api/chat/completions';
    var body = {
      model: options.model || this.model,
      messages: messages,
      stream: options.stream || false,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 4096
    };
    var headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['Authorization'] = 'Bearer ' + this.apiKey;

    return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var choice = data.choices && data.choices[0];
        return {
          completion: choice && choice.message && choice.message.content || '',
          usage: data.usage || { promptTokens: 0, completionTokens: 0 },
          model: data.model || body.model
        };
      });
  };

  OpenWebUIClient.prototype.streamChat = function(messages, onToken, options) {
    var self = this;
    options = options || {};
    var url = this.baseUrl + '/api/chat/completions';
    var body = {
      model: options.model || this.model,
      messages: messages,
      stream: true,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 4096
    };
    var headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['Authorization'] = 'Bearer ' + this.apiKey;

    return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) })
      .then(function(r) {
        var reader = r.body.getReader();
        var decoder = new TextDecoder();
        var buffer = '';
        function read() {
          return reader.read().then(function(result) {
            if (result.done) return;
            buffer += decoder.decode(result.value, { stream: true });
            var lines = buffer.split('\n');
            buffer = lines.pop();
            lines.forEach(function(line) {
              if (line.startsWith('data: ')) {
                var data = line.slice(6);
                if (data === '[DONE]') return;
                try {
                  var parsed = JSON.parse(data);
                  var delta = parsed.choices && parsed.choices[0] && parsed.choices[0].delta;
                  if (delta && delta.content) onToken(delta.content);
                } catch(e) {}
              }
            });
            return read();
          });
        }
        return read().then(function() {
          return { completion: '', usage: { promptTokens: 0, completionTokens: 0 } };
        });
      });
  };

  OpenWebUIClient.prototype.listModels = function() {
    var url = this.baseUrl + '/api/models';
    var headers = {};
    if (this.apiKey) headers['Authorization'] = 'Bearer ' + this.apiKey;
    return fetch(url, { headers: headers })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        return data.data || data.models || [];
      });
  };

  OpenWebUIClient.prototype.healthCheck = function() {
    var self = this;
    return fetch(this.baseUrl + '/api/models')
      .then(function(r) { return r.ok ? { ok: true, url: self.baseUrl } : { ok: false, error: 'Server returned ' + r.status }; })
      .catch(function(e) { return { ok: false, error: e.message }; });
  };

  // ─── X1 integration layer ───

  function x1ChatComplete(messages, options) {
    options = options || {};
    var client = new OpenWebUIClient({
      baseUrl: options.baseUrl || 'http://localhost:8080',
      apiKey: options.apiKey || '',
      model: options.model || 'llama3.1'
    });
    return client.chat(messages, options);
  }

  function x1ChatStream(messages, onToken, options) {
    options = options || {};
    var client = new OpenWebUIClient({
      baseUrl: options.baseUrl || 'http://localhost:8080',
      apiKey: options.apiKey || '',
      model: options.model || 'llama3.1'
    });
    return client.streamChat(messages, onToken, options);
  }

  function x1ListModels(options) {
    options = options || {};
    var client = new OpenWebUIClient({
      baseUrl: options.baseUrl || 'http://localhost:8080',
      apiKey: options.apiKey || ''
    });
    return client.listModels();
  }

  // ─── Public API ───

  window.X1OpenWebUIBridge = {
    version: '1.0.0',
    license: 'MIT',
    source: 'https://github.com/open-webui/open-webui',

    createClient: function(options) { return new OpenWebUIClient(options); },
    chatComplete: x1ChatComplete,
    chatStream: x1ChatStream,
    listModels: x1ListModels,

    healthCheck: function() {
      var client = new OpenWebUIClient({ baseUrl: 'http://localhost:8080' });
      return client.healthCheck();
    }
  };

  // Register in integrations registry
  if (window.X1Integrations) {
    window.X1Integrations.register({
      name: 'openwebui',
      version: '1.0.0',
      license: 'MIT',
      path: 'sidepanel/integrations/openwebui/',
      description: 'Panel web UI para X1 - Chat completions unificado',
      healthCheck: function() { return window.X1OpenWebUIBridge.healthCheck(); },
      dependencies: []
    });
    log.info('OpenWebUI Bridge registrado en X1Integrations');
  }

  log.info('X1OpenWebUIBridge cargado');

})();
