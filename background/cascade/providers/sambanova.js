var X1ProviderSambaNova = (function() {

  var BASE_URL = 'https://api.sambanova.ai/v1';
  var DEFAULT_MODEL = 'Meta-Llama-3.3-70B-Instruct';

  function getKey() { return (typeof aiKeys !== 'undefined' && aiKeys.sambanovaKey) || ''; }

  function complete(systemPrompt, userMsg, options) {
    return new Promise(function(resolve, reject) {
      var key = getKey();
      if (!key) { reject(new Error('SAMBANOVA_KEY_NOT_SET')); return; }
      var model = (options && options.model) || DEFAULT_MODEL;
      var maxTokens = (options && options.maxTokens) || 500;
      var temperature = (options && options.temperature != null) ? options.temperature : 0.7;
      var messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: userMsg });
      fetch(BASE_URL + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: model, messages: messages, max_tokens: maxTokens, temperature: temperature, stream: false }),
        signal: AbortSignal.timeout(15000)
      }).then(function(r) { return r.json(); }).then(function(data) {
        if (data.error) {
          if (typeof X1RateLimiter !== 'undefined') X1RateLimiter.setCooldown('sambanova', 15000);
          reject(new Error(data.error.message || 'SAMBANOVA_ERROR'));
          return;
        }
        if (typeof X1RateLimiter !== 'undefined') X1RateLimiter.recordCall('sambanova');
        var text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (text) resolve(text);
        else reject(new Error('SAMBANOVA_EMPTY'));
      }).catch(function(e) { reject(e); });
    });
  }

  function testKey(key) {
    return fetch(BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: DEFAULT_MODEL, messages: [{ role: 'user', content: 'hi' }], max_tokens: 1, stream: false }),
      signal: AbortSignal.timeout(10000)
    }).then(function(r) { return r.json(); }).then(function(data) { return !data.error; }).catch(function() { return false; });
  }

  return { getKey: getKey, complete: complete, testKey: testKey, DEFAULT_MODEL: DEFAULT_MODEL };
})();
