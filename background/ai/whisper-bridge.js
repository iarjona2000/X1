/**
 * whisper-bridge.js — Adaptador de Whisper STT para X1
 *
 * Integra Whisper (Speech-to-Text) de Hugging Face para reconocimiento
 * de voz local y en la nube. Soporta múltiples idiomas y modelos.
 * Licencia: MIT (OpenAI Whisper / Hugging Face)
 */

(function() {
  'use strict';

  var log = (typeof x1Log === 'function') ? x1Log('WhisperBridge') : { info: function(m){console.log('[X1-Whisper]',m);}, warn: function(m){console.warn('[X1-Whisper]',m);}, error: function(m){console.error('[X1-Whisper]',m);} };

  // ─── Whisper STT Client ───

  var MODEL_CATALOG = {
    'tiny': { id: 'openai/whisper-tiny', params: '39M', speed: 'very fast', accuracy: 'low' },
    'base': { id: 'openai/whisper-base', params: '74M', speed: 'fast', accuracy: 'medium' },
    'small': { id: 'openai/whisper-small', params: '244M', speed: 'moderate', accuracy: 'good' },
    'medium': { id: 'openai/whisper-medium', params: '769M', speed: 'slow', accuracy: 'very good' },
    'large': { id: 'openai/whisper-large-v3', params: '1550M', speed: 'very slow', accuracy: 'best' }
  };

  function WhisperSTT(options) {
    this.model = options.model || 'base';
    this.language = options.language || 'es';
    this.apiBase = options.apiBase || 'https://api-inference.huggingface.co/models';
    this.returnTimestamps = options.returnTimestamps !== false;
  }

  WhisperSTT.prototype.transcribe = function(audioInput, options) {
    var self = this;
    options = options || {};

    var modelId = MODEL_CATALOG[this.model] ? MODEL_CATALOG[this.model].id : 'openai/whisper-base';
    var url = this.apiBase + '/' + modelId;
    var headers = {};
    if (options.apiKey) headers['Authorization'] = 'Bearer ' + options.apiKey;

    var body;
    if (audioInput instanceof ArrayBuffer || audioInput instanceof Blob) {
      body = audioInput;
      headers['Content-Type'] = 'audio/wav';
    } else if (typeof audioInput === 'string' && audioInput.startsWith('data:')) {
      // Base64 audio
      body = { inputs: audioInput };
      headers['Content-Type'] = 'application/json';
    } else {
      body = { inputs: audioInput };
      headers['Content-Type'] = 'application/json';
    }

    var fetchOptions = { method: 'POST', headers: headers };
    if (body instanceof ArrayBuffer || body instanceof Blob) {
      fetchOptions.body = body;
    } else {
      fetchOptions.body = JSON.stringify(body);
    }

    return fetch(url, fetchOptions)
      .then(function(r) {
        if (!r.ok) throw new Error('HuggingFace API error: ' + r.status);
        return r.json();
      })
      .then(function(data) {
        var text = '';
        var chunks = [];
        if (data.text) {
          text = data.text;
          chunks = [{ text: text, start: 0, end: 0 }];
        } else if (Array.isArray(data)) {
          chunks = data.map(function(d) { return { text: d.text || '', start: d.start || 0, end: d.end || 0 }; });
          text = chunks.map(function(c) { return c.text; }).join(' ');
        }
        return { ok: true, text: text, chunks: chunks, language: self.language, model: self.model };
      })
      .catch(function(err) {
        log.error('Whisper transcription error:', err.message);
        return { ok: false, error: err.message };
      });
  };

  WhisperSTT.prototype.transcribeFromMicrophone = function(duration, options) {
    var self = this;
    duration = duration || 10;
    options = options || {};

    return new Promise(function(resolve, reject) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return resolve({ ok: false, error: 'getUserMedia not available' });
      }

      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function(stream) {
          var mediaRecorder = new MediaRecorder(stream);
          var chunks = [];

          mediaRecorder.ondataavailable = function(e) {
            if (e.data.size > 0) chunks.push(e.data);
          };

          mediaRecorder.onstop = function() {
            stream.getTracks().forEach(function(t) { t.stop(); });
            var blob = new Blob(chunks, { type: 'audio/wav' });
            var reader = new FileReader();
            reader.onload = function() {
              self.transcribe(reader.result, options).then(resolve);
            };
            reader.readAsArrayBuffer(blob);
          };

          mediaRecorder.start();
          setTimeout(function() { mediaRecorder.stop(); }, duration * 1000);
        })
        .catch(function(err) {
          resolve({ ok: false, error: err.message });
        });
    });
  };

  WhisperSTT.prototype.getModels = function() {
    var models = [];
    Object.keys(MODEL_CATALOG).forEach(function(key) {
      var m = MODEL_CATALOG[key];
      models.push({ id: key, modelId: m.id, params: m.params, speed: m.speed, accuracy: m.accuracy });
    });
    return models;
  };

  // ─── X1 integration ───

  var defaultSTT = null;

  function getDefaultSTT(options) {
    if (!defaultSTT) {
      defaultSTT = new WhisperSTT(options || {});
    }
    return defaultSTT;
  }

  function x1Transcribe(audioInput, options) {
    return getDefaultSTT(options).transcribe(audioInput, options);
  }

  function x1Listen(duration, options) {
    return getDefaultSTT(options).transcribeFromMicrophone(duration, options);
  }

  // ─── Public API ───

  self.X1WhisperBridge = {
    version: '1.0.0',
    license: 'MIT',
    source: 'https://github.com/openai/whisper',
    huggingFace: 'https://huggingface.co/openai',

    WhisperSTT: WhisperSTT,
    MODEL_CATALOG: MODEL_CATALOG,
    createSTT: function(options) { return new WhisperSTT(options); },

    transcribe: x1Transcribe,
    listen: x1Listen,
    getModels: function() { return getDefaultSTT().getModels(); },

    healthCheck: function() {
      var hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      return Promise.resolve({
        ok: true,
        models: Object.keys(MODEL_CATALOG).length,
        getUserMedia: hasGetUserMedia,
        version: '1.0.0'
      });
    }
  };

  // Register in integrations registry
  if (self.X1Integrations) {
    self.X1Integrations.register({
      name: 'whisper',
      version: '1.0.0',
      license: 'MIT',
      path: 'offscreen/integrations/whisper/',
      description: 'STT local (Whisper + HuggingFace)',
      healthCheck: function() { return self.X1WhisperBridge.healthCheck(); },
      dependencies: []
    });
    log.info('Whisper Bridge registrado en X1Integrations');
  }

  log.info('X1WhisperBridge cargado - modelos:', Object.keys(MODEL_CATALOG).length);

})();
