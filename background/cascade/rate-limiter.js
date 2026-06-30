var X1RateLimiter = (function() {

  var state = {
    calls: {},
    cooldowns: {}
  };

  var DEFAULTS = {
    groq: { maxCalls: 30, windowMs: 60000, cooldownMs: 2000 },
    gemini: { maxCalls: 60, windowMs: 60000, cooldownMs: 1000 },
    openai: { maxCalls: 500, windowMs: 60000, cooldownMs: 500 },
    proxy: { maxCalls: 60, windowMs: 60000, cooldownMs: 1000 },
    openrouter: { maxCalls: 200, windowMs: 60000, cooldownMs: 500 },
    cerebras: { maxCalls: 30, windowMs: 60000, cooldownMs: 2000 },
    mistral: { maxCalls: 50, windowMs: 60000, cooldownMs: 1000 },
    deepseek: { maxCalls: 60, windowMs: 60000, cooldownMs: 1000 },
    ollama: { maxCalls: 100, windowMs: 60000, cooldownMs: 200 },
    nvidia: { maxCalls: 30, windowMs: 60000, cooldownMs: 2000 },
    sambanova: { maxCalls: 30, windowMs: 60000, cooldownMs: 2000 },
    together: { maxCalls: 50, windowMs: 60000, cooldownMs: 1000 },
    cloudflare: { maxCalls: 100, windowMs: 60000, cooldownMs: 500 }
  };

  function getConfig(provider) {
    return DEFAULTS[provider] || { maxCalls: 20, windowMs: 60000, cooldownMs: 3000 };
  }

  function checkRateLimit(provider) {
    var config = getConfig(provider);
    var now = Date.now();
    var key = provider;
    if (!state.calls[key]) state.calls[key] = [];
    if (!state.cooldowns[key]) state.cooldowns[key] = 0;
    if (state.cooldowns[key] > now) return { allowed: false, reason: 'cooldown', retryAfter: state.cooldowns[key] - now };
    var window = config.windowMs;
    state.calls[key] = state.calls[key].filter(function(t) { return t > now - window; });
    if (state.calls[key].length >= config.maxCalls) {
      return { allowed: false, reason: 'rate_limit', retryAfter: window };
    }
    return { allowed: true };
  }

  function recordCall(provider) {
    var key = provider;
    if (!state.calls[key]) state.calls[key] = [];
    state.calls[key].push(Date.now());
  }

  function setCooldown(provider, ms) {
    state.cooldowns[provider] = Date.now() + (ms || 10000);
  }

  function clearCooldown(provider) {
    state.cooldowns[provider] = 0;
  }

  function getCooldown(provider) {
    var remaining = state.cooldowns[provider] - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  function getStatus() {
    var status = {};
    Object.keys(DEFAULTS).forEach(function(p) {
      var now = Date.now();
      var window = DEFAULTS[p].windowMs;
      if (!state.calls[p]) state.calls[p] = [];
      state.calls[p] = state.calls[p].filter(function(t) { return t > now - window; });
      status[p] = {
        callsInWindow: state.calls[p].length,
        maxCalls: DEFAULTS[p].maxCalls,
        cooldown: getCooldown(p),
        available: checkRateLimit(p).allowed && getCooldown(p) === 0
      };
    });
    return status;
  }

  function filterAvailable(providers) {
    return providers.filter(function(p) { return checkRateLimit(p).allowed; });
  }

  function filterWithSurvivors(providers, minSurvivors) {
    minSurvivors = minSurvivors || 2;
    var available = [];
    var unavailable = [];
    providers.forEach(function(p) {
      if (checkRateLimit(p).allowed) available.push(p);
      else unavailable.push(p);
    });
    if (available.length < minSurvivors && unavailable.length > 0) {
      var nextAvailable = unavailable.sort(function(a, b) {
        var ca = getCooldown(a), cb = getCooldown(b);
        return ca - cb;
      });
      while (available.length < minSurvivors && nextAvailable.length > 0) {
        var next = nextAvailable.shift();
        clearCooldown(next);
        available.push(next);
      }
    }
    return available;
  }

  function resetAll() {
    state.calls = {};
    state.cooldowns = {};
  }

  function saveState() {
    try { chrome.storage.session.set({ x1RateLimiter: state }); } catch(e) {}
  }

  function loadState() {
    try {
      chrome.storage.session.get('x1RateLimiter', function(r) {
        if (r && r.x1RateLimiter) {
          state.calls = r.x1RateLimiter.calls || {};
          state.cooldowns = r.x1RateLimiter.cooldowns || {};
        }
      });
    } catch(e) {}
  }

  loadState();
  setInterval(saveState, 30000);

  return {
    checkRateLimit: checkRateLimit,
    recordCall: recordCall,
    setCooldown: setCooldown,
    clearCooldown: clearCooldown,
    getCooldown: getCooldown,
    getStatus: getStatus,
    filterAvailable: filterAvailable,
    filterWithSurvivors: filterWithSurvivors,
    resetAll: resetAll,
    getConfig: getConfig
  };
})();
