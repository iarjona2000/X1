var X1ImageGen = (function() {
  var HISTORY_KEY = 'x1_image_history';
  var MAX_HISTORY = 50;

  function generateWithCloudflare(prompt, options) {
    if (typeof X1ProviderCloudflare === 'undefined' || typeof X1ProviderCloudflare.generateImage !== 'function') {
      return Promise.reject(new Error('CLOUDFLARE_IMAGE_UNAVAILABLE'));
    }
    return X1ProviderCloudflare.generateImage(prompt, options).then(function(dataUrl) {
      if (!dataUrl) return Promise.reject(new Error('IMAGE_GENERATION_FAILED'));
      saveToHistory(prompt, dataUrl, 'cloudflare');
      return { url: dataUrl, provider: 'cloudflare', prompt: prompt };
    });
  }

  function generateWithOpenAI(prompt, options) {
    var key = (typeof aiKeys !== 'undefined' && aiKeys.openaiKey) || '';
    if (!key) return Promise.reject(new Error('OPENAI_KEY_NOT_SET'));
    var size = (options && options.size) || '1024x1024';
    var quality = (options && options.quality) || 'standard';
    return fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: 'dall-e-3', prompt: prompt, n: 1, size: size, quality: quality, response_format: 'b64_json' }),
      signal: AbortSignal.timeout(60000)
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.error) return Promise.reject(new Error(data.error.message));
      if (!data.data || !data.data[0]) return Promise.reject(new Error('NO_IMAGE_DATA'));
      var b64 = data.data[0].b64_json;
      var dataUrl = 'data:image/png;base64,' + b64;
      saveToHistory(prompt, dataUrl, 'openai-dalle3');
      return { url: dataUrl, provider: 'openai-dalle3', prompt: prompt, revised_prompt: data.data[0].revised_prompt };
    });
  }

  function generate(prompt, options) {
    var provider = (options && options.provider) || 'auto';
    if (provider === 'openai' || provider === 'dalle') {
      return generateWithOpenAI(prompt, options);
    }
    if (provider === 'cloudflare' || provider === 'flux') {
      return generateWithCloudflare(prompt, options);
    }
    return generateWithCloudflare(prompt, options).catch(function() {
      return generateWithOpenAI(prompt, options);
    });
  }

  function saveToHistory(prompt, dataUrl, provider) {
    chrome.storage.local.get(HISTORY_KEY, function(data) {
      var history = data[HISTORY_KEY] || [];
      history.unshift({
        prompt: prompt,
        provider: provider,
        thumbnail: dataUrl.substring(0, 100),
        timestamp: Date.now()
      });
      if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
      var obj = {};
      obj[HISTORY_KEY] = history;
      chrome.storage.local.set(obj);
    });
  }

  function getHistory() {
    return new Promise(function(resolve) {
      chrome.storage.local.get(HISTORY_KEY, function(data) {
        resolve(data[HISTORY_KEY] || []);
      });
    });
  }

  function enhancePrompt(basicPrompt) {
    var enhancements = [
      'high quality, detailed, professional',
      '8k resolution, sharp focus',
      'studio lighting, cinematic composition'
    ];
    return basicPrompt + ', ' + enhancements[Math.floor(Math.random() * enhancements.length)];
  }

  return {
    generate: generate,
    generateWithCloudflare: generateWithCloudflare,
    generateWithOpenAI: generateWithOpenAI,
    getHistory: getHistory,
    enhancePrompt: enhancePrompt
  };
})();
