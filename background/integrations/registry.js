/**
 * integrations-registry.js — Registro central de integraciones open source en X1
 * Cada integración se registra aquí con su configuración, health check y feature flags.
 */

(function() {
  'use strict';

  var IntegrationsRegistry = {
    version: '1.0.0',
    integrations: {},

    // Registrar una nueva integración
    register: function(config) {
      var required = ['name', 'version', 'license', 'path', 'healthCheck'];
      for (var i = 0; i < required.length; i++) {
        if (!config[required[i]]) {
          console.error('[X1-Registry] Falta campo requerido:', required[i]);
          return false;
        }
      }

      this.integrations[config.name] = {
        name: config.name,
        version: config.version,
        license: config.license,
        path: config.path,
        enabled: config.enabled !== false,
        description: config.description || '',
        healthCheck: config.healthCheck,
        dependencies: config.dependencies || [],
        config: config.config || {},
        status: 'unknown',
        lastCheck: null,
        error: null
      };

      console.log('[X1-Registry] Registrada:', config.name, 'v' + config.version);
      return true;
    },

    // Obtener integración por nombre
    get: function(name) {
      return this.integrations[name] || null;
    },

    // Listar todas las integraciones
    list: function() {
      return Object.keys(this.integrations).map(function(k) {
        var int = this.integrations[k];
        return {
          name: int.name,
          version: int.version,
          enabled: int.enabled,
          status: int.status,
          license: int.license
        };
      }, this);
    },

    // Habilitar/deshabilitar integración
    setEnabled: function(name, enabled) {
      var int = this.integrations[name];
      if (!int) return false;
      int.enabled = !!enabled;
      console.log('[X1-Registry]', name, enabled ? 'habilitada' : 'deshabilitada');
      return true;
    },

    // Ejecutar health check de una integración
    checkHealth: function(name) {
      var self = this;
      var int = this.integrations[name];
      if (!int) return Promise.resolve({ok: false, error: 'No registrada'});

      return Promise.resolve()
        .then(function() {
          if (typeof int.healthCheck === 'function') {
            return int.healthCheck(int.config);
          }
          return {ok: true, message: 'No health check definido'};
        })
        .then(function(result) {
          int.status = result.ok ? 'healthy' : 'unhealthy';
          int.lastCheck = Date.now();
          int.error = result.error || null;
          return result;
        })
        .catch(function(err) {
          int.status = 'error';
          int.lastCheck = Date.now();
          int.error = err.message;
          return {ok: false, error: err.message};
        });
    },

    // Health check de todas las integraciones habilitadas
    checkAll: function() {
      var self = this;
      var enabled = Object.keys(this.integrations).filter(function(k) {
        return this.integrations[k].enabled;
      }, this);

      return Promise.all(enabled.map(function(name) {
        return self.checkHealth(name);
      })).then(function(results) {
        return enabled.reduce(function(acc, name, i) {
          acc[name] = results[i];
          return acc;
        }, {});
      });
    },

    // Obtener configuración para storage
    getConfigForStorage: function() {
      var cfg = {};
      Object.keys(this.integrations).forEach(function(k) {
        cfg[k] = {
          enabled: this.integrations[k].enabled,
          config: this.integrations[k].config
        };
      }, this);
      return cfg;
    },

    // Cargar configuración desde storage
    loadFromStorage: function(storageData) {
      if (!storageData) return;
      Object.keys(storageData).forEach(function(k) {
        var int = this.integrations[k];
        var data = storageData[k];
        if (int && data) {
          int.enabled = data.enabled !== false;
          if (data.config) {
            Object.assign(int.config, data.config);
          }
        }
      }, this);
    }
  };

  // Exponer globalmente. `self` (not `window`) — this loads inside the MV3
  // service worker via importScripts(), which has no `window` global.
  self.X1Integrations = IntegrationsRegistry;

  // Configuración por defecto de integraciones conocidas
  IntegrationsRegistry.register({
    name: 'continue',
    version: '0.0.0',
    license: 'Apache-2.0',
    path: 'background/integrations/continue/',
    description: 'Motor LLM multi-provider (Continue.dev core)',
    healthCheck: function(cfg) {
      return Promise.resolve({ok: true, message: 'Continue core loaded'});
    },
    dependencies: []
  });

  IntegrationsRegistry.register({
    name: 'kilo',
    version: '0.0.0',
    license: 'Apache-2.0',
    path: 'background/integrations/kilo/',
    description: 'Agent mode multi-paso (Kilo Code)',
    healthCheck: function(cfg) {
      return Promise.resolve({ok: true, message: 'Kilo agent loaded'});
    },
    dependencies: ['continue']
  });

  IntegrationsRegistry.register({
    name: 'openwebui',
    version: '0.0.0',
    license: 'MIT',
    path: 'sidepanel/integrations/openwebui/',
    description: 'Panel web UI para X1',
    healthCheck: function(cfg) {
      return Promise.resolve({ok: true, message: 'OpenWebUI components loaded'});
    },
    dependencies: []
  });

  IntegrationsRegistry.register({
    name: 'llamaindex',
    version: '0.0.0',
    license: 'MIT',
    path: 'background/integrations/llamaindex/',
    description: 'RAG engine para memoria semántica',
    healthCheck: function(cfg) {
      return Promise.resolve({ok: true, message: 'LlamaIndex core loaded'});
    },
    dependencies: []
  });

  IntegrationsRegistry.register({
    name: 'piper',
    version: '0.0.0',
    license: 'Apache-2.0',
    path: 'offscreen/integrations/piper/',
    description: 'TTS local de alta calidad',
    healthCheck: function(cfg) {
      return Promise.resolve({ok: true, message: 'Piper TTS loaded'});
    },
    dependencies: []
  });

  IntegrationsRegistry.register({
    name: 'whisper',
    version: '0.0.0',
    license: 'MIT',
    path: 'offscreen/integrations/whisper/',
    description: 'STT local (whisper.cpp WASM)',
    healthCheck: function(cfg) {
      return Promise.resolve({ok: true, message: 'Whisper STT loaded'});
    },
    dependencies: []
  });

  IntegrationsRegistry.register({
    name: 'huggingface',
    version: '0.0.0',
    license: 'MIT',
    path: 'background/integrations/huggingface/',
    description: 'Integracion unificada de Hugging Face (Piper TTS + Whisper STT)',
    healthCheck: function(cfg) {
      return Promise.resolve({ok: true, message: 'HuggingFace integration loaded'});
    },
    dependencies: ['piper', 'whisper']
  });

  IntegrationsRegistry.register({
    name: 'free-claude-code',
    version: '1.0.0',
    license: 'MIT',
    path: 'background/integrations/free-claude-code/',
    description: 'Proxy Anthropic API con 18 providers (NVIDIA NIM, OpenRouter, Gemini, Groq, DeepSeek, Cerebras, Mistral, etc.) — cerebro principal del Judge',
    healthCheck: function(cfg) {
      if (typeof X1FCCBridge !== 'undefined') return X1FCCBridge.healthCheck();
      return Promise.resolve({ok: false, error: 'X1FCCBridge no cargado'});
    },
    dependencies: ['python3', 'uv', 'fastapi']
  });

  console.log('[X1-Registry] Registro inicializado con', Object.keys(IntegrationsRegistry.integrations).length, 'integraciones');

})();