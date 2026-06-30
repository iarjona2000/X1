var X1ProviderOllama = (function() {

  var BASE_URL = 'http://localhost:11434';
  var DEFAULT_MODEL = 'llama3.2';
  var FALLBACK_MODELS = ['llama3.1', 'mistral', 'phi3', 'qwen2.5'];
  var AVAILABLE_MODELS = [];
  var CHECKED = false;

  function setBaseUrl(url) { BASE_URL = url; }

  function checkAvailable() {
    if (CHECKED) return Promise.resolve(AVAILABLE_MODELS.length > 0);
    CHECKED = true;
    return fetch(BASE_URL + '/api/tags').then(function(r) { return r.json(); }).then(function(data) {
      if (data && data.models) {
        AVAILABLE_MODELS = data.models.map(function(m) { return m.name; });
        return AVAILABLE_MODELS.length > 0;
      }
      return false;
    }).catch(function() { return false; });
  }

  function getAvailableModels() { return AVAILABLE_MODELS; }

  function getBestModel(preferred) {
    if (AVAILABLE_MODELS.indexOf(preferred) !== -1) return preferred;
    for (var i = 0; i < FALLBACK_MODELS.length; i++) {
      for (var j = 0; j < AVAILABLE_MODELS.length; j++) {
        if (AVAILABLE_MODELS[j].indexOf(FALLBACK_MODELS[i]) === 0) return AVAILABLE_MODELS[j];
      }
    }
    return AVAILABLE_MODELS[0] || DEFAULT_MODEL;
  }

  function complete(systemPrompt, userMsg, options) {
    return new Promise(function(resolve, reject) {
      checkAvailable().then(function(available) {
        if (!available) { reject(new Error('OLLAMA_NOT_AVAILABLE')); return; }
        var model = getBestModel((options && options.model) || DEFAULT_MODEL);
        var maxTokens = (options && options.maxTokens) || 500;
        var temperature = (options && options.temperature) || 0.7;
        var prompt = userMsg;
        if (systemPrompt) prompt = systemPrompt + '\n\n' + userMsg;
        fetch(BASE_URL + '/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: model, prompt: prompt, stream: false, options: { num_predict: maxTokens, temperature: temperature } })
        }).then(function(r) { return r.json(); }).then(function(data) {
          if (data.error) { reject(new Error(data.error)); return; }
          if (typeof X1RateLimiter !== 'undefined') X1RateLimiter.recordCall('ollama');
          resolve(data.response || '');
        }).catch(function(e) { reject(e); });
      });
    });
  }

  return { setBaseUrl: setBaseUrl, checkAvailable: checkAvailable, getAvailableModels: getAvailableModels, complete: complete };
})();
