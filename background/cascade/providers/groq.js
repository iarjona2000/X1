var X1ProviderGroq = (function() {

  var BASE_URL = 'https://api.groq.com/openai/v1';
  var DEFAULT_MODEL = 'llama-3.3-70b-versatile';
  var FALLBACK_MODELS = ['llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
  var API_KEY = '';

  function setKey(key) { API_KEY = key; }

  function getKey() { return API_KEY || (typeof aiKeys !== 'undefined' && aiKeys.groqKey) || ''; }

  function complete(systemPrompt, userMsg, options) {
    return new Promise(function(resolve, reject) {
      var key = getKey();
      if (!key) { reject(new Error('GROQ_API_KEY_NOT_SET')); return; }
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
            if (typeof X1RateLimiter !== 'undefined') X1RateLimiter.setCooldown('groq', 15000);
            if (FALLBACK_MODELS.length > 0) {
              var fallback = FALLBACK_MODELS.shift();
              options = options || {};
              options.model = fallback;
              return complete(systemPrompt, userMsg, options).then(resolve).catch(reject);
            }
          }
          reject(new Error(data.error.message || 'GROQ_ERROR'));
          return;
        }
        if (typeof X1RateLimiter !== 'undefined') X1RateLimiter.recordCall('groq');
        var text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (text) resolve(text);
        else reject(new Error('GROQ_EMPTY_RESPONSE'));
      }).catch(function(e) { reject(e); });
    });
  }

  function testKey(key) {
    return fetch(BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 })
    }).then(function(r) { return r.json(); }).then(function(data) {
      return !data.error;
    });
  }

  return { setKey: setKey, getKey: getKey, complete: complete, testKey: testKey, DEFAULT_MODEL: DEFAULT_MODEL };
})();
