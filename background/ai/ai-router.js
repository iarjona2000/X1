/**
 * ai-router.js — Router Inteligente de X1
 *
 * Analiza las consultas del usuario y las asigna a las IAs mas
 * adecuadas. Considera tipo de tarea, complejidad, rendimiento
 * historico, y disponibilidad de providers.
 *
 * Licencia: Propia de X1
 */

(function() {
  'use strict';

  var log = {
    info: function(m) { console.log('[X1-Router]', m); },
    warn: function(m) { console.warn('[X1-Router]', m); },
    error: function(m) { console.error('[X1-Router]', m); }
  };

  // ═══════════════════════════════════════════
  // ROUTER CONFIGURATION
  // ═══════════════════════════════════════════

  var ROUTER_CONFIG = {
    maxRetries: 2,
    retryDelay: 1000,
    performanceWindow: 100,
    healthCheckInterval: 300000,
    maxFailuresBeforeBan: 3,
    banDuration: 60000
  };

  // ═══════════════════════════════════════════
  // PROVIDER PERFORMANCE TRACKING
  // ═══════════════════════════════════════════

  var performanceHistory = {};

  function recordPerformance(provider, result) {
    if (!performanceHistory[provider]) {
      performanceHistory[provider] = {
        calls: 0,
        successes: 0,
        failures: 0,
        totalScore: 0,
        avgScore: 0,
        avgLatency: 0,
        totalLatency: 0,
        lastCall: 0,
        consecutiveFailures: 0,
        banned: false,
        banUntil: 0
      };
    }

    var stats = performanceHistory[provider];
    stats.calls++;
    stats.lastCall = Date.now();

    if (result.error) {
      stats.failures++;
      stats.consecutiveFailures++;
      if (stats.consecutiveFailures >= ROUTER_CONFIG.maxFailuresBeforeBan) {
        stats.banned = true;
        stats.banUntil = Date.now() + ROUTER_CONFIG.banDuration;
        log.warn('Provider ' + provider + ' banned for ' + ROUTER_CONFIG.banDuration + 'ms');
      }
    } else {
      stats.successes++;
      stats.consecutiveFailures = 0;
      stats.banned = false;
      stats.banUntil = 0;
      if (result.score) {
        stats.totalScore += result.score;
        stats.avgScore = stats.totalScore / stats.successes;
      }
      if (result.elapsed) {
        stats.totalLatency += result.elapsed;
        stats.avgLatency = stats.totalLatency / stats.successes;
      }
    }

    // Keep only last N calls
    if (stats.calls > ROUTER_CONFIG.performanceWindow) {
      stats.calls = Math.floor(stats.calls * 0.9);
      stats.successes = Math.floor(stats.successes * 0.9);
      stats.failures = Math.floor(stats.failures * 0.9);
    }
  }

  function isProviderAvailable(provider) {
    var stats = performanceHistory[provider];
    if (!stats) return true;
    if (stats.banned && Date.now() < stats.banUntil) return false;
    return true;
  }

  function getProviderScore(provider) {
    var stats = performanceHistory[provider];
    if (!stats || stats.calls === 0) return 0.5;
    var successRate = stats.successes / stats.calls;
    var latencyScore = Math.max(0, 1 - (stats.avgLatency / 10000));
    return (successRate * 0.7) + (latencyScore * 0.3);
  }

  // ═══════════════════════════════════════════
  // ROUTING STRATEGIES
  // ═══════════════════════════════════════════

  var RoutingStrategies = {
    // Strategy 1: Type-based routing
    typeBased: function(analysis, availableProviders) {
      var matrix = {
        conversational: ['groq', 'gemini', 'cerebras', 'mistral'],
        reasoning: ['groq', 'nvidiaGlm', 'nvidiaDeepseek', 'gemini'],
        code: ['groq', 'mistral', 'nvidiaDeepseek', 'openrouter'],
        creative: ['gemini', 'groq', 'openrouter', 'mistral'],
        translation: ['gemini', 'groq', 'mistral', 'openrouter'],
        multimodal: ['gemini', 'openrouter', 'proxy'],
        agentic: ['groq', 'gemini', 'mistral', 'openrouter'],
        research: ['gemini', 'groq', 'openrouter', 'cerebras'],
        sensitive: ['ollama', 'proxy']
      };

      var candidates = matrix[analysis.type] || matrix.conversational;
      return candidates.filter(function(name) {
        return isProviderAvailable(name) && findProvider(name, availableProviders);
      });
    },

    // Strategy 2: Performance-based routing
    performanceBased: function(analysis, availableProviders) {
      var scored = availableProviders
        .filter(function(p) { return isProviderAvailable(p.name) && p.has; })
        .map(function(p) {
          return {
            provider: p,
            score: getProviderScore(p.name)
          };
        });

      scored.sort(function(a, b) { return b.score - a.score; });
      return scored.map(function(s) { return s.provider.name; });
    },

    // Strategy 3: Diversity routing (maximize different AI perspectives)
    diversityRouting: function(analysis, availableProviders) {
      var families = {
        meta: ['groq', 'openrouter'],
        google: ['gemini'],
        nvidia: ['nvidiaGlm', 'nvidiaNemotron', 'nvidiaDeepseek'],
        mistral: ['mistral'],
        local: ['ollama', 'proxy'],
        cerebras: ['cerebras']
      };

      var selected = [];
      var usedFamilies = [];

      Object.keys(families).forEach(function(family) {
        var providers = families[family];
        var available = providers.filter(function(name) {
          return isProviderAvailable(name) && findProvider(name, availableProviders);
        });
        if (available.length > 0 && usedFamilies.indexOf(family) === -1) {
          selected.push(available[0]);
          usedFamilies.push(family);
        }
      });

      return selected;
    },

    // Strategy 4: Complexity-based routing
    complexityRouting: function(analysis, availableProviders) {
      var strategies = {
        simple: ['groq', 'cerebras', 'proxy'],
        moderate: ['groq', 'gemini', 'mistral'],
        complex: ['groq', 'nvidiaGlm', 'nvidiaDeepseek', 'gemini', 'mistral']
      };

      var candidates = strategies[analysis.complexity] || strategies.moderate;
      return candidates.filter(function(name) {
        return isProviderAvailable(name) && findProvider(name, availableProviders);
      });
    },

    // Strategy 5: Hybrid routing (combines all strategies)
    hybrid: function(analysis, availableProviders) {
      var typeBased = this.typeBased(analysis, availableProviders);
      var performanceBased = this.performanceBased(analysis, availableProviders);
      var diversity = this.diversityRouting(analysis, availableProviders);
      var complexity = this.complexityRouting(analysis, availableProviders);

      // Merge and deduplicate
      var merged = [];
      var seen = {};

      // Add from type-based first (highest priority)
      typeBased.forEach(function(name) {
        if (!seen[name]) {
          merged.push(name);
          seen[name] = true;
        }
      });

      // Add from performance-based
      performanceBased.forEach(function(name) {
        if (!seen[name] && merged.length < 5) {
          merged.push(name);
          seen[name] = true;
        }
      });

      // Add from diversity
      diversity.forEach(function(name) {
        if (!seen[name] && merged.length < 5) {
          merged.push(name);
          seen[name] = true;
        }
      });

      // Add from complexity
      complexity.forEach(function(name) {
        if (!seen[name] && merged.length < 5) {
          merged.push(name);
          seen[name] = true;
        }
      });

      return merged;
    }
  };

  // ═══════════════════════════════════════════
  // MAIN ROUTER
  // ═══════════════════════════════════════════

  function SmartRouter(options) {
    this.options = options || {};
    this.strategy = this.options.strategy || 'hybrid';
    this.maxVoters = this.options.maxVoters || 3;
    this.availableProviders = this.options.providers || [];
  }

  SmartRouter.prototype.setProviders = function(providers) {
    this.availableProviders = providers;
  };

  SmartRouter.prototype.setStrategy = function(strategy) {
    if (RoutingStrategies[strategy]) {
      this.strategy = strategy;
    }
  };

  SmartRouter.prototype.route = function(query, analysis) {
    analysis = analysis || (window.X1Judge ? window.X1Judge.analyzeQuery(query) : { type: 'conversational', complexity: 'moderate' });

    var strategyFn = RoutingStrategies[this.strategy] || RoutingStrategies.hybrid;
    var candidates = strategyFn.call(RoutingStrategies, analysis, this.availableProviders);

    // Limit to maxVoters
    var selected = candidates.slice(0, this.maxVoters);

    // Map to provider objects
    var providers = [];
    selected.forEach(function(name) {
      var p = findProvider(name, this.availableProviders);
      if (p) providers.push(p);
    }.bind(this));

    log.info('Routed ' + query.substring(0, 30) + '... to: ' + providers.map(function(p) { return p.name; }).join(', '));

    return {
      analysis: analysis,
      strategy: this.strategy,
      candidates: candidates,
      selected: providers,
      count: providers.length
    };
  };

  SmartRouter.prototype.routeAndExecute = function(query, options) {
    options = options || {};
    var routing = this.route(query);
    var self = this;

    var votePromises = routing.selected.map(function(provider) {
      var start = Date.now();
      return provider.fn(query).then(function(txt) {
        var elapsed = Date.now() - start;
        var parsed = window.X1Judge ? window.X1Judge.parseResponse(txt) : { action: 'speak', text: txt };
        var result = {
          provider: provider.name,
          txt: txt,
          parsed: parsed,
          score: parsed ? 1 : -1,
          elapsed: elapsed,
          error: null
        };
        recordPerformance(provider.name, result);
        return result;
      }).catch(function(e) {
        var result = {
          provider: provider.name,
          txt: null,
          parsed: null,
          score: -1,
          elapsed: Date.now() - start,
          error: e.message || 'unknown'
        };
        recordPerformance(provider.name, result);
        return result;
      });
    });

    var timeoutPromise = new Promise(function(resolve) {
      setTimeout(function() { resolve({ timedOut: true }); }, options.timeout || 20000);
    });

    return Promise.race([Promise.all(votePromises), timeoutPromise]).then(function(results) {
      if (results.timedOut) results = [];

      var valid = results.filter(function(r) { return r.parsed && !r.error; });

      if (valid.length === 0) {
        return { ok: false, error: 'No valid responses', routing: routing, votes: results };
      }

      // Sort by score
      valid.sort(function(a, b) { return b.score - a.score; });

      return {
        ok: true,
        winner: valid[0],
        votes: valid,
        routing: routing,
        timestamp: Date.now()
      };
    });
  };

  SmartRouter.prototype.getPerformanceStats = function() {
    var stats = {};
    Object.keys(performanceHistory).forEach(function(provider) {
      stats[provider] = {
        calls: performanceHistory[provider].calls,
        successRate: performanceHistory[provider].calls > 0
          ? performanceHistory[provider].successes / performanceHistory[provider].calls
          : 0,
        avgScore: performanceHistory[provider].avgScore,
        avgLatency: performanceHistory[provider].avgLatency,
        banned: performanceHistory[provider].banned
      };
    });
    return stats;
  };

  SmartRouter.prototype.resetPerformance = function() {
    performanceHistory = {};
  };

  // ═══════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════

  function findProvider(name, providers) {
    for (var i = 0; i < providers.length; i++) {
      if (providers[i].name === name) return providers[i];
    }
    return null;
  }

  // ═══════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════

  window.X1Router = {
    version: '1.0.0',
    config: ROUTER_CONFIG,
    strategies: Object.keys(RoutingStrategies),

    SmartRouter: SmartRouter,
    RoutingStrategies: RoutingStrategies,

    createRouter: function(options) {
      return new SmartRouter(options);
    },

    recordPerformance: recordPerformance,
    isProviderAvailable: isProviderAvailable,
    getProviderScore: getProviderScore,

    healthCheck: function() {
      return Promise.resolve({
        ok: true,
        version: '1.0.0',
        strategies: Object.keys(RoutingStrategies),
        trackedProviders: Object.keys(performanceHistory)
      });
    }
  };

  log.info('X1Router loaded');

})();
