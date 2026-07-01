var X1ProviderCloudflare = (function() {

  var DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

  function getAccountId() { return (typeof aiKeys !== 'undefined' && aiKeys.cloudflareAccountId) || ''; }
  function getKey() { return (typeof aiKeys !== 'undefined' && aiKeys.cloudflareKey) || ''; }

  function complete(systemPrompt, userMsg, options) {
    return new Promise(function(resolve, reject) {
      var accountId = getAccountId();
      var key = getKey();
      if (!accountId || !key) { reject(new Error('CLOUDFLARE_KEYS_NOT_SET')); return; }
      var model = (options && options.model) || DEFAULT_MODEL;
      var maxTokens = (options && options.maxTokens) || 500;
      var temperature = (options && options.temperature != null) ? options.temperature : 0.7;
      var messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: userMsg });
      var url = 'https://api.cloudflare.com/client/v4/accounts/' + accountId + '/ai/run/' + model;
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ messages: messages, max_tokens: maxTokens, temperature: temperature, stream: false }),
        signal: AbortSignal.timeout(20000)
      }).then(function(r) { return r.json(); }).then(function(data) {
        if (!data.success && data.errors && data.errors.length > 0) {
          if (typeof X1RateLimiter !== 'undefined') X1RateLimiter.setCooldown('cloudflare', 10000);
          reject(new Error(data.errors[0].message || 'CLOUDFLARE_ERROR'));
          return;
        }
        if (typeof X1RateLimiter !== 'undefined') X1RateLimiter.recordCall('cloudflare');
        var text = data.result && data.result.response;
        if (text) resolve(text);
        else reject(new Error('CLOUDFLARE_EMPTY'));
      }).catch(function(e) { reject(e); });
    });
  }

  function testKey(accountId, key) {
    var url = 'https://api.cloudflare.com/client/v4/accounts/' + accountId + '/ai/run/@cf/meta/llama-3.1-8b-instruct';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], max_tokens: 1, stream: false }),
      signal: AbortSignal.timeout(10000)
    }).then(function(r) { return r.json(); }).then(function(data) { return !!data.success; }).catch(function() { return false; });
  }

  function generateImage(prompt, options) {
    var accountId = getAccountId();
    var key = getKey();
    if (!accountId || !key) return Promise.resolve(null);
    var model = (options && options.model) || '@cf/black-forest-labs/flux-1-schnell';
    var url = 'https://api.cloudflare.com/client/v4/accounts/' + accountId + '/ai/run/' + model;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ prompt: prompt, num_steps: 4 }),
      signal: AbortSignal.timeout(30000)
    }).then(function(r) {
      if (r.headers.get('content-type').indexOf('image') !== -1) {
        return r.arrayBuffer().then(function(buf) {
          var bytes = new Uint8Array(buf);
          var binary = '';
          for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          return 'data:image/png;base64,' + btoa(binary);
        });
      }
      return r.json().then(function(data) {
        if (data.result && data.result.image) return 'data:image/png;base64,' + data.result.image;
        return null;
      });
    }).catch(function() { return null; });
  }

  return { getKey: getKey, getAccountId: getAccountId, complete: complete, testKey: testKey, generateImage: generateImage, DEFAULT_MODEL: DEFAULT_MODEL };
})();
