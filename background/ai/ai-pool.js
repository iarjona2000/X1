/**
 * ai-pool.js — Pool Dinamico de IAs de X1
 *
 * Registra y gestiona todos los providers de IA disponibles.
 * Cada provider se auto-registra con su capacidad, coste, y estado.
 * El Judge consulta el pool para saber a cuales IAs puede enviar votos.
 *
 * Licencia: Propia de X1
 */

(function() {
  'use strict';

  var log = {
    info: function(m) { console.log('[X1-Pool]', m); },
    warn: function(m) { console.warn('[X1-Pool]', m); },
    error: function(m) { console.error('[X1-Pool]', m); }
  };

  // ═══════════════════════════════════════════
  // PROVIDER REGISTRY
  // ═══════════════════════════════════════════

  var providers = {};
  var providerOrder = [];

  function registerProvider(config) {
    if (!config || !config.name || !config.fn) {
      log.error('Invalid provider config');
      return false;
    }

    if (providers[config.name]) {
      log.warn('Provider ' + config.name + ' already registered, updating');
    }

    providers[config.name] = {
      name: config.name,
      fn: config.fn,
      displayName: config.displayName || config.name,
      family: config.family || 'unknown',
      type: config.type || 'cloud',
      has: config.has !== undefined ? config.has : true,
      fast: config.fast || false,
      cost: config.cost || 'free',
      maxTokens: config.maxTokens || 4096,
      languages: config.languages || ['es', 'en'],
      capabilities: config.capabilities || ['text'],
      timeout: config.timeout || 15000,
      priority: config.priority || 5,
      metadata: config.metadata || {}
    };

    if (providerOrder.indexOf(config.name) === -1) {
      providerOrder.push(config.name);
    }

    log.info('Registered provider: ' + config.name + ' (' + config.displayName + ')');
    return true;
  }

  function unregisterProvider(name) {
    if (providers[name]) {
      delete providers[name];
      var idx = providerOrder.indexOf(name);
      if (idx !== -1) providerOrder.splice(idx, 1);
      log.info('Unregistered provider: ' + name);
      return true;
    }
    return false;
  }

  function getProvider(name) {
    return providers[name] || null;
  }

  function getAllProviders() {
    return providerOrder.map(function(name) {
      return providers[name];
    });
  }

  function getActiveProviders() {
    return getAllProviders().filter(function(p) {
      return p.has;
    });
  }

  function getProvidersByCapability(capability) {
    return getActiveProviders().filter(function(p) {
      return p.capabilities.indexOf(capability) !== -1;
    });
  }

  function getProvidersByFamily(family) {
    return getActiveProviders().filter(function(p) {
      return p.family === family;
    });
  }

  // ═══════════════════════════════════════════
  // PROVIDER HEALTH MANAGEMENT
  // ═══════════════════════════════════════════

  var healthStatus = {};

  function updateHealth(name, healthy) {
    if (!healthStatus[name]) {
      healthStatus[name] = {
        healthy: true,
        lastCheck: Date.now(),
        consecutiveFailures: 0,
        lastError: null
      };
    }

    var status = healthStatus[name];
    status.lastCheck = Date.now();

    if (healthy) {
      status.healthy = true;
      status.consecutiveFailures = 0;
      status.lastError = null;
    } else {
      status.consecutiveFailures++;
      if (status.consecutiveFailures >= 3) {
        status.healthy = false;
        log.warn('Provider ' + name + ' marked unhealthy after ' + status.consecutiveFailures + ' failures');
      }
    }
  }

  function isHealthy(name) {
    var status = healthStatus[name];
    if (!status) return true;
    return status.healthy;
  }

  function getHealthStatus() {
    return healthStatus;
  }

  // ═══════════════════════════════════════════
  // PROVIDER SELECTION
  // ═══════════════════════════════════════════

  function selectProviders(options) {
    options = options || {};
    var count = options.count || 3;
    var capability = options.capability || null;
    var family = options.family || null;
    var exclude = options.exclude || [];

    var candidates = getActiveProviders();

    // Filter by capability
    if (capability) {
      candidates = candidates.filter(function(p) {
        return p.capabilities.indexOf(capability) !== -1;
      });
    }

    // Filter by family
    if (family) {
      candidates = candidates.filter(function(p) {
        return p.family === family;
      });
    }

    // Exclude specific providers
    if (exclude.length > 0) {
      candidates = candidates.filter(function(p) {
        return exclude.indexOf(p.name) === -1;
      });
    }

    // Filter by health
    candidates = candidates.filter(function(p) {
      return isHealthy(p.name);
    });

    // Sort by priority (lower = higher priority)
    candidates.sort(function(a, b) {
      return a.priority - b.priority;
    });

    return candidates.slice(0, count);
  }

  // ═══════════════════════════════════════════
  // DEFAULT PROVIDERS (from service-worker.js)
  // ═══════════════════════════════════════════

  function registerDefaults() {
    // These will be called with the actual functions from service-worker.js
    // The ai-pool.js will be loaded AFTER the provider functions are defined

    var defaultProviders = [
      {
        name: 'groq',
        displayName: 'Groq (Llama 3.3)',
        family: 'meta',
        type: 'cloud',
        fast: true,
        cost: 'free',
        maxTokens: 8192,
        languages: ['es', 'en', 'fr', 'de'],
        capabilities: ['text', 'code', 'reasoning'],
        timeout: 15000,
        priority: 1
      },
      {
        name: 'gemini',
        displayName: 'Google Gemini 2.5',
        family: 'google',
        type: 'cloud',
        fast: true,
        cost: 'free',
        maxTokens: 8192,
        languages: ['es', 'en', 'fr', 'de', 'ja', 'ko', 'zh'],
        capabilities: ['text', 'code', 'reasoning', 'multimodal', 'vision'],
        timeout: 20000,
        priority: 2
      },
      {
        name: 'nvidiaGlm',
        displayName: 'NVIDIA GLM-5.1',
        family: 'nvidia',
        type: 'cloud',
        fast: true,
        cost: 'free',
        maxTokens: 4096,
        languages: ['es', 'en'],
        capabilities: ['text', 'reasoning'],
        timeout: 20000,
        priority: 3
      },
      {
        name: 'nvidiaNemotron',
        displayName: 'NVIDIA Nemotron-3 Ultra',
        family: 'nvidia',
        type: 'cloud',
        fast: false,
        cost: 'free',
        maxTokens: 4096,
        languages: ['es', 'en'],
        capabilities: ['text', 'reasoning'],
        timeout: 20000,
        priority: 4
      },
      {
        name: 'nvidiaDeepseek',
        displayName: 'NVIDIA DeepSeek V4',
        family: 'nvidia',
        type: 'cloud',
        fast: false,
        cost: 'free',
        maxTokens: 4096,
        languages: ['es', 'en', 'zh'],
        capabilities: ['text', 'code', 'reasoning'],
        timeout: 20000,
        priority: 5
      },
      {
        name: 'cerebras',
        displayName: 'Cerebras Wafer Scale',
        family: 'cerebras',
        type: 'cloud',
        fast: true,
        cost: 'free',
        maxTokens: 8192,
        languages: ['es', 'en'],
        capabilities: ['text', 'code'],
        timeout: 15000,
        priority: 6
      },
      {
        name: 'mistral',
        displayName: 'Mistral Small',
        family: 'mistral',
        type: 'cloud',
        fast: true,
        cost: 'free',
        maxTokens: 8192,
        languages: ['es', 'en', 'fr', 'de'],
        capabilities: ['text', 'code', 'reasoning'],
        timeout: 15000,
        priority: 7
      },
      {
        name: 'openrouter',
        displayName: 'OpenRouter (Llama 4 Scout)',
        family: 'openrouter',
        type: 'cloud',
        fast: false,
        cost: 'free',
        maxTokens: 8192,
        languages: ['es', 'en'],
        capabilities: ['text', 'code', 'reasoning'],
        timeout: 20000,
        priority: 8
      },
      {
        name: 'proxy',
        displayName: 'X1 Proxy (Cloudflare)',
        family: 'x1',
        type: 'edge',
        fast: true,
        cost: 'free',
        maxTokens: 4096,
        languages: ['es', 'en'],
        capabilities: ['text'],
        timeout: 10000,
        priority: 9
      },
      {
        name: 'ollama',
        displayName: 'Ollama (Local)',
        family: 'local',
        type: 'local',
        fast: false,
        cost: 'free',
        maxTokens: 4096,
        languages: ['es', 'en'],
        capabilities: ['text', 'code'],
        timeout: 15000,
        priority: 10
      }
    ];

    defaultProviders.forEach(function(config) {
      registerProvider(config);
    });

    log.info('Registered ' + defaultProviders.length + ' default providers');
  }

  // ═══════════════════════════════════════════
  // POOL STATS
  // ═══════════════════════════════════════════

  function getPoolStats() {
    var all = getAllProviders();
    var active = getActiveProviders();
    var healthy = active.filter(function(p) { return isHealthy(p.name); });

    return {
      total: all.length,
      active: active.length,
      healthy: healthy.length,
      unhealthy: active.length - healthy.length,
      byFamily: getProvidersByFamilyStats(),
      byCapability: getProvidersByCapabilityStats()
    };
  }

  function getProvidersByFamilyStats() {
    var stats = {};
    getActiveProviders().forEach(function(p) {
      if (!stats[p.family]) stats[p.family] = 0;
      stats[p.family]++;
    });
    return stats;
  }

  function getProvidersByCapabilityStats() {
    var stats = {};
    getActiveProviders().forEach(function(p) {
      p.capabilities.forEach(function(c) {
        if (!stats[c]) stats[c] = 0;
        stats[c]++;
      });
    });
    return stats;
  }

  // ═══════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════

  window.X1Pool = {
    version: '1.0.0',

    register: registerProvider,
    unregister: unregisterProvider,
    get: getProvider,
    getAll: getAllProviders,
    getActive: getActiveProviders,
    getByCapability: getProvidersByCapability,
    getByFamily: getProvidersByFamily,
    select: selectProviders,

    updateHealth: updateHealth,
    isHealthy: isHealthy,
    getHealthStatus: getHealthStatus,

    registerDefaults: registerDefaults,
    getStats: getPoolStats,

    healthCheck: function() {
      return Promise.resolve({
        ok: true,
        version: '1.0.0',
        stats: getPoolStats()
      });
    }
  };

  log.info('X1Pool loaded');

})();
