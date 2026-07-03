/**
 * piper-bridge.js — Adaptador de Piper TTS para X1
 *
 * Integra Piper TTS (Text-to-Speech) de Hugging Face para sintetizar voz
 * de alta calidad en el navegador. Soporta múltiples voces y idiomas.
 * Licencia: Apache 2.0 (Piper Contributors / Hugging Face)
 */

(function() {
  'use strict';

  var log = (typeof x1Log === 'function') ? x1Log('PiperBridge') : { info: function(m){console.log('[X1-Piper]',m);}, warn: function(m){console.warn('[X1-Piper]',m);}, error: function(m){console.error('[X1-Piper]',m);} };

  // ─── Piper TTS Client ───

  var VOICE_CATALOG = {
    'es_ES': { id: 'es_ES-shrunk-medium', name: 'Spanish (Spain) - Medium', lang: 'es', sampleRate: 22050 },
    'es_MX': { id: 'es_MX-shrunk-medium', name: 'Spanish (Mexico) - Medium', lang: 'es', sampleRate: 22050 },
    'en_US': { id: 'en_US-lessac-medium', name: 'English (US) - Medium', lang: 'en', sampleRate: 22050 },
    'en_GB': { id: 'en_GB-alba-medium', name: 'English (GB) - Medium', lang: 'en', sampleRate: 22050 },
    'fr_FR': { id: 'fr_FR-siwis-medium', name: 'French (France) - Medium', lang: 'fr', sampleRate: 22050 },
    'de_DE': { id: 'de_DE-thorsten-medium', name: 'German - Medium', lang: 'de', sampleRate: 22050 },
    'it_IT': { id: 'it_IT-riccardo-x_low', name: 'Italian - Low', lang: 'it', sampleRate: 22050 },
    'pt_BR': { id: 'pt_BR-faber-medium', name: 'Portuguese (Brazil) - Medium', lang: 'pt', sampleRate: 22050 },
    'ja_JP': { id: 'ja_JP-kokoro-medium', name: 'Japanese - Medium', lang: 'ja', sampleRate: 22050 },
    'ko_KR': { id: 'ko_KR-jangmi-medium', name: 'Korean - Medium', lang: 'ko', sampleRate: 22050 }
  };

  function PiperTTS(options) {
    this.voice = options.voice || 'es_ES-shrunk-medium';
    this.speakerId = options.speakerId || 0;
    this.lengthScale = options.lengthScale || 1.0;
    this.noiseScale = options.noiseScale || 0.667;
    this.noiseW = options.noiseW || 0.8;
    this.apiBase = options.apiBase || 'https://huggingface.co/api/models';
  }

  PiperTTS.prototype.synthesize = function(text, options) {
    var self = this;
    options = options || {};

    // Use Hugging Face Inference API
    var url = 'https://api-inference.huggingface.co/models/' + this.voice;
    var body = { inputs: text };
    var headers = { 'Content-Type': 'application/json' };
    if (options.apiKey) headers['Authorization'] = 'Bearer ' + options.apiKey;

    return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) })
      .then(function(r) {
        if (!r.ok) throw new Error('HuggingFace API error: ' + r.status);
        return r.arrayBuffer();
      })
      .then(function(buffer) {
        return { ok: true, audio: buffer, format: 'wav', sampleRate: 22050 };
      })
      .catch(function(err) {
        log.error('Piper synthesis error:', err.message);
        return { ok: false, error: err.message };
      });
  };

  PiperTTS.prototype.synthesizeLocal = function(text) {
    // Fallback to browser SpeechSynthesis API
    return new Promise(function(resolve) {
      if (typeof speechSynthesis === 'undefined') {
        return resolve({ ok: false, error: 'SpeechSynthesis not available' });
      }

      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = function() { resolve({ ok: true, method: 'browser' }); };
      utterance.onerror = function(e) { resolve({ ok: false, error: e.error }); };

      speechSynthesis.speak(utterance);
    });
  };

  PiperTTS.prototype.getVoices = function() {
    var voices = [];
    Object.keys(VOICE_CATALOG).forEach(function(key) {
      var v = VOICE_CATALOG[key];
      voices.push({ id: v.id, name: v.name, lang: v.lang, locale: key });
    });
    return voices;
  };

  // ─── X1 integration ───

  var defaultTTS = null;

  function getDefaultTTS(options) {
    if (!defaultTTS) {
      defaultTTS = new PiperTTS(options || {});
    }
    return defaultTTS;
  }

  function x1Speak(text, options) {
    var tts = getDefaultTTS(options);
    return tts.synthesize(text, options).then(function(result) {
      if (result.ok && result.audio) {
        // Play the audio
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return audioCtx.decodeAudioData(result.audio).then(function(buffer) {
          var source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(audioCtx.destination);
          source.start();
          return { ok: true, method: 'piper', duration: buffer.duration };
        });
      }
      // Fallback to browser TTS
      return tts.synthesizeLocal(text);
    });
  }

  // ─── Public API ───

  self.X1PiperBridge = {
    version: '1.0.0',
    license: 'Apache-2.0',
    source: 'https://github.com/rhasspy/piper',
    huggingFace: 'https://huggingface.co/rhasspy',

    PiperTTS: PiperTTS,
    VOICE_CATALOG: VOICE_CATALOG,
    createTTS: function(options) { return new PiperTTS(options); },

    speak: x1Speak,
    synthesize: function(text, options) { return getDefaultTTS(options).synthesize(text, options); },
    getVoices: function() { return getDefaultTTS().getVoices(); },

    healthCheck: function() {
      var hasSpeechSynthesis = typeof speechSynthesis !== 'undefined';
      return Promise.resolve({
        ok: true,
        voices: Object.keys(VOICE_CATALOG).length,
        speechSynthesis: hasSpeechSynthesis,
        version: '1.0.0'
      });
    }
  };

  // Register in integrations registry
  if (self.X1Integrations) {
    self.X1Integrations.register({
      name: 'piper',
      version: '1.0.0',
      license: 'Apache-2.0',
      path: 'offscreen/integrations/piper/',
      description: 'TTS local de alta calidad (Piper + HuggingFace)',
      healthCheck: function() { return self.X1PiperBridge.healthCheck(); },
      dependencies: []
    });
    log.info('Piper Bridge registrado en X1Integrations');
  }

  log.info('X1PiperBridge cargado - voces:', Object.keys(VOICE_CATALOG).length);

})();
