var X1ProviderDeepSeek = (function() {

  var BASE_URL = 'https://api.deepseek.com';
  var DEFAULT_MODEL = 'deepseek-chat';
  var FALLBACK_MODELS = ['deepseek-reasoner'];
  var API_KEY = '';

  function setKey(key) { API_KEY = key; }

  function getKey() { return API_KEY || (typeof aiKeys !== 'undefined' && aiKeys.deepseekKey) || ''; }

  function complete(systemPrompt, userMsg, options) {
    return new Promise(function(resolve, reject) {
      var key = getKey();
      if (!key) { reject(new Error('DEEPSEEK_API_KEY_NOT_SET')); return; }
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
        if (data.error) { reject(new Error(data.error.message || 'DEEPSEEK_ERROR')); return; }
        if (typeof X1RateLimiter !== 'undefined') X1RateLimiter.recordCall('deepseek');
        var text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (text) resolve(text); else reject(new Error('DEEPSEEK_EMPTY_RESPONSE'));
      }).catch(function(e) { reject(e); });
    });
  }

  return { setKey: setKey, getKey: getKey, complete: complete, DEFAULT_MODEL: DEFAULT_MODEL };
})();
