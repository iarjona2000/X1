var X1ProviderGemini = (function() {

  var BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
  var DEFAULT_MODEL = 'gemini-2.0-flash';
  var FALLBACK_MODELS = ['gemini-1.5-flash', 'gemini-1.5-pro'];
  var API_KEY = '';

  function setKey(key) { API_KEY = key; }

  function getKey() { return API_KEY || (typeof aiKeys !== 'undefined' && aiKeys.geminiKey) || ''; }

  function complete(systemPrompt, userMsg, options) {
    return new Promise(function(resolve, reject) {
      var key = getKey();
      if (!key) { reject(new Error('GEMINI_API_KEY_NOT_SET')); return; }
      var model = (options && options.model) || DEFAULT_MODEL;
      var maxTokens = (options && options.maxTokens) || 500;
      var temperature = (options && options.temperature) || 0.7;
      var contents = [];
      if (systemPrompt) contents.push({ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userMsg }] });
      else contents.push({ role: 'user', parts: [{ text: userMsg }] });
      var body = { contents: contents, generationConfig: { maxOutputTokens: maxTokens, temperature: temperature } };
      fetch(BASE_URL + '/models/' + model + ':generateContent?key=' + key, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function(r) { return r.json(); }).then(function(data) {
        if (data.error) {
          if (data.error.message && data.error.message.indexOf('RATE_LIMIT') !== -1) {
            if (typeof X1RateLimiter !== 'undefined') X1RateLimiter.setCooldown('gemini', 10000);
            if (FALLBACK_MODELS.length > 0) {
              var fallback = FALLBACK_MODELS.shift();
              options = options || {}; options.model = fallback;
              return complete(systemPrompt, userMsg, options).then(resolve).catch(reject);
            }
          }
          reject(new Error(data.error.message || 'GEMINI_ERROR'));
          return;
        }
        if (typeof X1RateLimiter !== 'undefined') X1RateLimiter.recordCall('gemini');
        var text = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text;
        if (text) resolve(text);
        else reject(new Error('GEMINI_EMPTY_RESPONSE'));
      }).catch(function(e) { reject(e); });
    });
  }

  function testKey(key) {
    return fetch(BASE_URL + '/models?key=' + key).then(function(r) { return r.json(); }).then(function(data) {
      return !data.error;
    });
  }

  function translate(text, targetLang) {
    var sysPrompt = 'Traduce el siguiente texto al ' + targetLang + '. Responde SOLO con la traducción, sin explicaciones.';
    return complete(sysPrompt, text, { model: DEFAULT_MODEL, maxTokens: 1000, temperature: 0.2 });
  }

  function analyzeImage(base64Image, question) {
    var key = getKey();
    if (!key) return Promise.reject(new Error('GEMINI_API_KEY_NOT_SET'));
    return fetch(BASE_URL + '/models/' + DEFAULT_MODEL + ':generateContent?key=' + key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image } },
          { text: question || 'Describe esta imagen en detalle.' }
        ]}],
        generationConfig: { maxOutputTokens: 500, temperature: 0.3 }
      })
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.error) throw new Error(data.error.message || 'GEMINI_VISION_ERROR');
      return data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text || '';
    });
  }

  return { setKey: setKey, getKey: getKey, complete: complete, testKey: testKey, translate: translate, analyzeImage: analyzeImage, DEFAULT_MODEL: DEFAULT_MODEL };
})();
