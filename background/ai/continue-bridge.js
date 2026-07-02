/**
 * continue-bridge.js — Adaptador de Continue.dev LLM providers para X1
 * 
 * Extrae la lógica de providers de Continue (core/llm/) y la expone como acciones X1.
 * Licencia: Apache 2.0 (Continue.dev) - Copyright Continue.dev Contributors
 * 
 * Providers soportados: Ollama, Groq, Cerebras, OpenAI, Gemini, DeepSeek, Together, etc.
 * Usa el cascade router existente de X1 pero con interfaz unificada estilo Continue.
 */

(function() {
  'use strict';

  var log = (typeof x1Log !== 'undefined' && x1Log) ? x1Log('ContinueBridge') : { info: console.log, warn: console.warn, error: console.error };

  // ─── Clase base abstracta (patrón Continue) ───

  function BaseLLMProvider(options) {
    this.options = options || {};
    this.model = options.model || 'default';
    this.temperature = options.temperature !== undefined ? options.temperature : 0.7;
    this.maxTokens = options.maxTokens || 4096;
    this.systemMessage = options.systemMessage || '';
    this.apiKey = options.apiKey || '';
    this.apiBase = options.apiBase || '';
  }

  BaseLLMProvider.prototype.complete = function(messages) {
    throw new Error('complete() debe ser implementado por subclase');
  };

  BaseLLMProvider.prototype.streamComplete = function(messages, onToken) {
    throw new Error('streamComplete() debe ser implementado por subclase');
  };

  BaseLLMProvider.prototype.getModel = function() { return this.model; };
  BaseLLMProvider.prototype.getMaxTokens = function() { return this.maxTokens; };

  // ─── Provider: Ollama (local) ───

  function OllamaProvider(options) {
    BaseLLMProvider.call(this, options);
    this.apiBase = options.apiBase || 'http://localhost:11434';
  }

  OllamaProvider.prototype = Object.create(BaseLLMProvider.prototype);
  OllamaProvider.prototype.constructor = OllamaProvider;

  OllamaProvider.prototype.complete = function(messages) {
    var self = this;
    var url = this.apiBase + '/api/chat';
    var body = {
      model: this.model,
      messages: messages,
      stream: false,
      options: {
        temperature: this.temperature,
        num_predict: this.maxTokens
      }
    };
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function(r) { return r.json(); })
    .then(function(data) {
      return {
        completion: data.message && data.message.content || '',
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0
        }
      };
    });
  };

  OllamaProvider.prototype.streamComplete = function(messages, onToken) {
    var self = this;
    var url = this.apiBase + '/api/chat';
    var body = {
      model: this.model,
      messages: messages,
      stream: true,
      options: { temperature: this.temperature, num_predict: this.maxTokens }
    };
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function(r) {
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
            if (line.trim()) {
              try {
                var data = JSON.parse(line);
                if (data.message && data.message.content) {
                  onToken(data.message.content);
                }
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

  // ─── Provider: OpenAI-compatible (Groq, Cerebras, Together, OpenRouter, etc.) ───

  function OpenAICompatibleProvider(options) {
    BaseLLMProvider.call(this, options);
    this.apiBase = options.apiBase || 'https://api.openai.com/v1';
    this.headers = options.headers || {};
  }

  OpenAICompatibleProvider.prototype = Object.create(BaseLLMProvider.prototype);
  OpenAICompatibleProvider.prototype.constructor = OpenAICompatibleProvider;

  OpenAICompatibleProvider.prototype.complete = function(messages) {
    var self = this;
    var url = this.apiBase + '/chat/completions';
    var body = {
      model: this.model,
      messages: messages,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      stream: false
    };
    var headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.apiKey };
    Object.assign(headers, this.headers);
    return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var choice = data.choices && data.choices[0];
        return {
          completion: choice && choice.message && choice.message.content || '',
          usage: data.usage || { promptTokens: 0, completionTokens: 0 }
        };
      });
  };

  OpenAICompatibleProvider.prototype.streamComplete = function(messages, onToken) {
    var self = this;
    var url = this.apiBase + '/chat/completions';
    var body = {
      model: this.model,
      messages: messages,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      stream: true
    };
    var headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.apiKey };
    Object.assign(headers, this.headers);
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

  // ─── Factory de providers (estilo Continue) ───

  var PROVIDER_REGISTRY = {
    'ollama': OllamaProvider,
    'groq': function(opts) { return new OpenAICompatibleProvider(Object.assign({}, opts, { apiBase: 'https://api.groq.com/openai/v1' })); },
    'cerebras': function(opts) { return new OpenAICompatibleProvider(Object.assign({}, opts, { apiBase: 'https://api.cerebras.ai/v1' })); },
    'together': function(opts) { return new OpenAICompatibleProvider(Object.assign({}, opts, { apiBase: 'https://api.together.xyz/v1' })); },
    'openrouter': function(opts) { return new OpenAICompatibleProvider(Object.assign({}, opts, { apiBase: 'https://openrouter.ai/api/v1', headers: { 'HTTP-Referer': 'https://x1.ai', 'X-Title': 'X1' } })); },
    'deepseek': function(opts) { return new OpenAICompatibleProvider(Object.assign({}, opts, { apiBase: 'https://api.deepseek.com/v1' })); },
    'mistral': function(opts) { return new OpenAICompatibleProvider(Object.assign({}, opts, { apiBase: 'https://api.mistral.ai/v1' })); },
    'perplexity': function(opts) { return new OpenAICompatibleProvider(Object.assign({}, opts, { apiBase: 'https://api.perplexity.ai' })); },
    'sambanova': function(opts) { return new OpenAICompatibleProvider(Object.assign({}, opts, { apiBase: 'https://api.sambanova.ai/v1' })); },
    'nvidia': function(opts) { return new OpenAICompatibleProvider(Object.assign({}, opts, { apiBase: 'https://integrate.api.nvidia.com/v1' })); },
    'fireworks': function(opts) { return new OpenAICompatibleProvider(Object.assign({}, opts, { apiBase: 'https://api.fireworks.ai/inference/v1' })); },
    'openai': function(opts) { return new OpenAICompatibleProvider(Object.assign({}, opts, { apiBase: 'https://api.openai.com/v1' })); },
    'azure': function(opts) { return new OpenAICompatibleProvider(Object.assign({}, opts, { apiBase: opts.azureEndpoint || 'https://<resource>.openai.azure.com' })); }
  };

  function createProvider(providerName, options) {
    var factory = PROVIDER_REGISTRY[providerName.toLowerCase()];
    if (!factory) {
      throw new Error('Provider no soportado: ' + providerName + '. Disponibles: ' + Object.keys(PROVIDER_REGISTRY).join(', '));
    }
    return factory(options);
  }

  // ─── Context Manager (simplificado de Continue core/context) ───

  function ContextManager() {
    this.contextItems = [];
    this.maxTokens = 8000;
  }

  ContextManager.prototype.addContext = function(item) {
    this.contextItems.push(item);
    this.prune();
  };

  ContextManager.prototype.addFile = function(path, content, description) {
    this.addContext({ type: 'file', path: path, content: content, description: description });
  };

  ContextManager.prototype.addCode = function(code, language, description) {
    this.addContext({ type: 'code', content: code, language: language, description: description });
  };

  ContextManager.prototype.addText = function(text, description) {
    this.addContext({ type: 'text', content: text, description: description });
  };

  ContextManager.prototype.addURL = function(url, content, description) {
    this.addContext({ type: 'url', url: url, content: content, description: description });
  };

  ContextManager.prototype.clear = function() { this.contextItems = []; };

  ContextManager.prototype.prune = function() {
    if (this.contextItems.length > 20) {
      this.contextItems = this.contextItems.slice(-20);
    }
  };

  ContextManager.prototype.buildMessages = function(userMessage, systemPrompt) {
    var messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    this.contextItems.forEach(function(item) {
      var content = item.description ? '[' + item.description + ']\n' + item.content : item.content;
      messages.push({ role: 'user', content: content });
    });
    messages.push({ role: 'user', content: userMessage });
    return messages;
  };

  ContextManager.prototype.getContextSummary = function() {
    return this.contextItems.map(function(item) {
      return item.type + ': ' + (item.description || item.path || item.url || 'contexto').substring(0, 50);
    }).join('; ');
  };

  // ─── Autocomplete helper (simplificado) ───

  function AutocompleteEngine(provider, contextManager) {
    this.provider = provider;
    this.context = contextManager;
    this.prefix = '';
    this.suffix = '';
  }

  AutocompleteEngine.prototype.getSuggestions = function(prefix, suffix, options) {
    var self = this;
    options = options || {};
    var messages = this.context.buildMessages(
      'Completa el siguiente código. Solo devuelve la completación, sin explicaciones.\n\nPrefijo:\n' + prefix + '\n\nSufijo:\n' + suffix,
      'Eres un motor de autocompletado de código. Eres conciso y preciso.'
    );
    return this.provider.complete(messages).then(function(result) {
      var text = result.completion.trim();
      var lines = text.split('\n');
      return lines.slice(0, options.maxLines || 10).join('\n');
    });
  };

  // ─── API pública para X1 ───

  self.X1ContinueBridge = {
    version: '1.0.0',
    license: 'Apache-2.0',
    source: 'https://github.com/continuedev/continue (core/llm/, core/context/, core/autocomplete/)',

    createProvider: createProvider,
    getAvailableProviders: function() { return Object.keys(PROVIDER_REGISTRY); },

    createContextManager: function() { return new ContextManager(); },

    createAutocompleteEngine: function(provider, contextManager) {
      return new AutocompleteEngine(provider, contextManager);
    },

    chatComplete: function(providerName, options, messages) {
      var provider = createProvider(providerName, options);
      return provider.complete(messages);
    },

    chatStream: function(providerName, options, messages, onToken) {
      var provider = createProvider(providerName, options);
      return provider.streamComplete(messages, onToken);
    },

    healthCheck: function() {
      return Promise.resolve({ ok: true, providers: Object.keys(PROVIDER_REGISTRY) });
    }
  };

  // Registrar en registry de integraciones
  if (self.X1Integrations) {
    self.X1Integrations.register({
      name: 'continue',
      version: '1.0.0',
      license: 'Apache-2.0',
      path: 'background/integrations/continue/',
      description: 'Motor LLM multi-provider (Continue.dev core)',
      healthCheck: function() { return self.X1ContinueBridge.healthCheck(); },
      dependencies: []
    });
    log.info('Continue Bridge registrado en X1Integrations');
  }

  log.info('X1ContinueBridge cargado - providers:', Object.keys(PROVIDER_REGISTRY).join(', '));

})();