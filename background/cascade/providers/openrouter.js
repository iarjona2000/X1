var X1ProviderOpenRouter = (function() {

  var BASE_URL = 'https://openrouter.ai/api/v1';
  var DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
  var FALLBACK_MODELS = ['google/gemini-2.0-flash-exp:free', 'mistralai/mistral-small-3.1-24b-instruct:free'];

  function getKey() { return (typeof aiKeys !== 'undefined' && aiKeys.openrouterKey) || ''; }

  function complete(systemPrompt, userMsg, options) {
    return new Promise(function(resolve, reject) {
      var key = getKey();
      if (!key) { reject(new Error('OPENROUTER_KEY_NOT_SET')); return; }
      var model = (options && options.model) || DEFAULT_MODEL;
      var maxTokens = (options && options.maxTokens) || 500;
      var temperature = (options && options.temperature != null) ? options.temperature : 0.7;
      var messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: userMsg });
      fetch(BASE_URL + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key,
          'HTTP-Referer': 'https://x1.caleza.ai',
          'X-Title': 'X1 AI Agent'
        },
        body: JSON.stringify({ model: model, messages: messages, max_tokens: maxTokens, temperature: temperature }),
        signal: AbortSignal.timeout(20000)
      }).then(function(r) { return r.json(); }).then(function(data) {
        if (data.error) {
          if (data.error.message && data.error.message.indexOf('rate') !== -1 && FALLBACK_MODELS.length > 0) {
            var fallback = FALLBACK_MODELS.shift();
            options = options || {};
            options.model = fallback;
            return complete(systemPrompt, userMsg, options).then(resolve).catch(reject);
          }
          reject(new Error(data.error.message || 'OPENROUTER_ERROR'));
          return;
        }
        if (typeof X1RateLimiter !== 'undefined') X1RateLimiter.recordCall('openrouter');
        var text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (text) resolve(text);
        else reject(new Error('OPENROUTER_EMPTY'));
      }).catch(function(e) { reject(e); });
    });
  }

  function testKey(key) {
    return fetch(BASE_URL + '/auth/key', {
      headers: { 'Authorization': 'Bearer ' + key },
      signal: AbortSignal.timeout(10000)
    }).then(function(r) { return r.json(); }).then(function(data) { return !!data.data; }).catch(function() { return false; });
  }

  return { getKey: getKey, complete: complete, testKey: testKey, DEFAULT_MODEL: DEFAULT_MODEL };
})();
