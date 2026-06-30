var X1ProviderOpenAI = (function() {

  var BASE_URL = 'https://api.openai.com/v1';
  var DEFAULT_MODEL = 'gpt-4o-mini';
  var FALLBACK_MODELS = ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
  var API_KEY = '';

  function setKey(key) { API_KEY = key; }

  function getKey() { return API_KEY || (typeof aiKeys !== 'undefined' && aiKeys.openaiKey) || ''; }

  function complete(systemPrompt, userMsg, options) {
    return new Promise(function(resolve, reject) {
      var key = getKey();
      if (!key) { reject(new Error('OPENAI_API_KEY_NOT_SET')); return; }
      var model = (options && options.model) || DEFAULT_MODEL;
      var maxTokens = (options && options.maxTokens) || 500;
      var temperature = (options && options.temperature) || 0.7;
      var messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: userMsg });
      fetch(BASE_URL + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: model, messages: messages, max_tokens: maxTokens, temperature: temperature })
      }).then(function(r) { return r.json(); }).then(function(data) {
        if (data.error) {
          if (data.error.message && data.error.message.indexOf('rate') !== -1) {
            if (typeof X1RateLimiter !== 'undefined') X1RateLimiter.setCooldown('openai', 10000);
            if (FALLBACK_MODELS.length > 0) {
              var fb = FALLBACK_MODELS.shift(); options = options || {}; options.model = fb;
              return complete(systemPrompt, userMsg, options).then(resolve).catch(reject);
            }
          }
          reject(new Error(data.error.message || 'OPENAI_ERROR')); return;
        }
        if (typeof X1RateLimiter !== 'undefined') X1RateLimiter.recordCall('openai');
        var text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (text) resolve(text); else reject(new Error('OPENAI_EMPTY_RESPONSE'));
      }).catch(function(e) { reject(e); });
    });
  }

  function testKey(key) {
    return fetch(BASE_URL + '/models', { headers: { 'Authorization': 'Bearer ' + key } }).then(function(r) { return r.ok; });
  }

  function generateImage(promptText) {
    var key = getKey();
    if (!key) return Promise.reject(new Error('OPENAI_API_KEY_NOT_SET'));
    return fetch(BASE_URL + '/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: 'dall-e-3', prompt: promptText, n: 1, size: '1024x1024' })
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.error) throw new Error(data.error.message);
      return data.data && data.data[0] && data.data[0].url || '';
    });
  }

  return { setKey: setKey, getKey: getKey, complete: complete, testKey: testKey, generateImage: generateImage, DEFAULT_MODEL: DEFAULT_MODEL };
})();
