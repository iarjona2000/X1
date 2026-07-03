/**
 * huggingface-bridge.js — Integración unificada de Hugging Face para X1
 *
 * Conecta Piper TTS (voz) y Whisper STT (reconocimiento) con feature flags
 * para controlar el uso de modelos locales vs. API. Gestiona la configuración
 * de Hugging Face y proporciona una interfaz unificada.
 * Licencia: MIT + Apache-2.0 (Hugging Face ecosystem)
 */

(function() {
  'use strict';

  var log = (typeof x1Log === 'function') ? x1Log('HuggingFaceBridge') : { info: function(m){console.log('[X1-HuggingFace]',m);}, warn: function(m){console.warn('[X1-HuggingFace]',m);}, error: function(m){console.error('[X1-HuggingFace]',m);} };

  // ─── Feature Flags ───

  var FEATURE_FLAGS = {
    piper_tts_enabled: true,
    piper_tts_local: false,
    piper_tts_voice: 'es_ES-shrunk-medium',
    whisper_stt_enabled: true,
    whisper_stt_local: false,
    whisper_stt_model: 'base',
    whisper_stt_language: 'es',
    huggingface_api_key: '',
    huggingface_api_base: 'https://api-inference.huggingface.co/models'
  };

  // ─── Configuration Manager ───

  function HFConfig() {
    this.flags = Object.assign({}, FEATURE_FLAGS);
  }

  HFConfig.prototype.get = function(key) {
    return this.flags[key];
  };

  HFConfig.prototype.set = function(key, value) {
    this.flags[key] = value;
    this.save();
  };

  HFConfig.prototype.load = function() {
    try {
      var saved = localStorage.getItem('x1_huggingface_config');
      if (saved) {
        var parsed = JSON.parse(saved);
        Object.assign(this.flags, parsed);
      }
    } catch (e) {
      log.warn('Could not load HF config:', e.message);
    }
  };

  HFConfig.prototype.save = function() {
    try {
      localStorage.setItem('x1_huggingface_config', JSON.stringify(this.flags));
    } catch (e) {
      log.warn('Could not save HF config:', e.message);
    }
  };

  HFConfig.prototype.getAll = function() {
    return Object.assign({}, this.flags);
  };

  // ─── Unified Hugging Face Bridge ───

  function HuggingFaceBridge(options) {
    this.config = new HFConfig();
    this.config.load();

    if (options) {
      Object.keys(options).forEach(function(k) {
        if (FEATURE_FLAGS.hasOwnProperty(k)) {
          this.config.set(k, options[k]);
        }
      }, this);
    }
  }

  // TTS methods
  HuggingFaceBridge.prototype.speak = function(text, options) {
    if (!this.config.get('piper_tts_enabled')) {
      return Promise.resolve({ ok: false, error: 'Piper TTS disabled by feature flag' });
    }

    var opts = Object.assign({
      voice: this.config.get('piper_tts_voice'),
      apiKey: this.config.get('huggingface_api_key'),
      apiBase: this.config.get('huggingface_api_base')
    }, options || {});

    if (this.config.get('piper_tts_local')) {
      // Use local Piper WASM
      return this._speakLocal(text, opts);
    }

    // Use HuggingFace API
    if (self.X1PiperBridge) {
      return self.X1PiperBridge.speak(text, opts);
    }

    // Fallback to browser TTS
    return this._speakBrowser(text);
  };

  HuggingFaceBridge.prototype._speakLocal = function(text, options) {
    // Local Piper WASM would go here
    log.info('Local Piper TTS not yet implemented, using browser fallback');
    return this._speakBrowser(text);
  };

  HuggingFaceBridge.prototype._speakBrowser = function(text) {
    return new Promise(function(resolve) {
      if (typeof speechSynthesis === 'undefined') {
        return resolve({ ok: false, error: 'SpeechSynthesis not available' });
      }
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      utterance.onend = function() { resolve({ ok: true, method: 'browser' }); };
      utterance.onerror = function(e) { resolve({ ok: false, error: e.error }); };
      speechSynthesis.speak(utterance);
    });
  };

  // STT methods
  HuggingFaceBridge.prototype.listen = function(duration, options) {
    if (!this.config.get('whisper_stt_enabled')) {
      return Promise.resolve({ ok: false, error: 'Whisper STT disabled by feature flag' });
    }

    var opts = Object.assign({
      model: this.config.get('whisper_stt_model'),
      language: this.config.get('whisper_stt_language'),
      apiKey: this.config.get('huggingface_api_key'),
      apiBase: this.config.get('huggingface_api_base')
    }, options || {});

    if (this.config.get('whisper_stt_local')) {
      // Local whisper.cpp WASM
      return this._listenLocal(duration, opts);
    }

    // Use HuggingFace API
    if (self.X1WhisperBridge) {
      return self.X1WhisperBridge.listen(duration || 10, opts);
    }

    return Promise.resolve({ ok: false, error: 'Whisper not available' });
  };

  HuggingFaceBridge.prototype._listenLocal = function(duration, options) {
    // Local whisper.cpp WASM would go here
    log.info('Local Whisper STT not yet implemented, using API fallback');
    if (self.X1WhisperBridge) {
      return self.X1WhisperBridge.listen(duration || 10, options);
    }
    return Promise.resolve({ ok: false, error: 'Whisper not available' });
  };

  HuggingFaceBridge.prototype.transcribe = function(audioInput, options) {
    if (!this.config.get('whisper_stt_enabled')) {
      return Promise.resolve({ ok: false, error: 'Whisper STT disabled by feature flag' });
    }

    var opts = Object.assign({
      model: this.config.get('whisper_stt_model'),
      language: this.config.get('whisper_stt_language'),
      apiKey: this.config.get('huggingface_api_key'),
      apiBase: this.config.get('huggingface_api_base')
    }, options || {});

    if (self.X1WhisperBridge) {
      return self.X1WhisperBridge.transcribe(audioInput, opts);
    }
    return Promise.resolve({ ok: false, error: 'Whisper not available' });
  };

  // Configuration methods
  HuggingFaceBridge.prototype.setApiKey = function(key) {
    this.config.set('huggingface_api_key', key);
  };

  HuggingFaceBridge.prototype.setFeature = function(feature, value) {
    this.config.set(feature, value);
  };

  HuggingFaceBridge.prototype.getFeatures = function() {
    return this.config.getAll();
  };

  HuggingFaceBridge.prototype.enableTTS = function(enabled) {
    this.config.set('piper_tts_enabled', enabled);
  };

  HuggingFaceBridge.prototype.enableSTT = function(enabled) {
    this.config.set('whisper_stt_enabled', enabled);
  };

  HuggingFaceBridge.prototype.setTTSVoice = function(voice) {
    this.config.set('piper_tts_voice', voice);
  };

  HuggingFaceBridge.prototype.setSTTModel = function(model) {
    this.config.set('whisper_stt_model', model);
  };

  HuggingFaceBridge.prototype.setSTTLanguage = function(lang) {
    this.config.set('whisper_stt_language', lang);
  };

  // Health check
  HuggingFaceBridge.prototype.healthCheck = function() {
    var hasPiper = !!self.X1PiperBridge;
    var hasWhisper = !!self.X1WhisperBridge;
    var hasSpeechSynthesis = typeof speechSynthesis !== 'undefined';
    var hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    return Promise.resolve({
      ok: true,
      piper: {
        available: hasPiper,
        enabled: this.config.get('piper_tts_enabled'),
        local: this.config.get('piper_tts_local'),
        voice: this.config.get('piper_tts_voice')
      },
      whisper: {
        available: hasWhisper,
        enabled: this.config.get('whisper_stt_enabled'),
        local: this.config.get('whisper_stt_local'),
        model: this.config.get('whisper_stt_model'),
        language: this.config.get('whisper_stt_language')
      },
      browser: {
        speechSynthesis: hasSpeechSynthesis,
        getUserMedia: hasGetUserMedia
      },
      apiKey: this.config.get('huggingface_api_key') ? 'configured' : 'not configured',
      version: '1.0.0'
    });
  };

  // ─── Public API ───

  self.X1HuggingFaceBridge = {
    version: '1.0.0',
    license: 'MIT + Apache-2.0',
    source: 'https://huggingface.co',

    HuggingFaceBridge: HuggingFaceBridge,
    create: function(options) { return new HuggingFaceBridge(options); },

    // Quick access methods (using default bridge instance)
    speak: function(text, options) {
      return new HuggingFaceBridge().speak(text, options);
    },
    listen: function(duration, options) {
      return new HuggingFaceBridge().listen(duration, options);
    },
    transcribe: function(audioInput, options) {
      return new HuggingFaceBridge().transcribe(audioInput, options);
    },

    healthCheck: function() {
      return new HuggingFaceBridge().healthCheck();
    }
  };

  // Register in integrations registry
  if (self.X1Integrations) {
    self.X1Integrations.register({
      name: 'huggingface',
      version: '1.0.0',
      license: 'MIT',
      path: 'background/integrations/huggingface/',
      description: 'Integracion unificada de Hugging Face (Piper TTS + Whisper STT)',
      healthCheck: function() { return self.X1HuggingFaceBridge.healthCheck(); },
      dependencies: ['piper', 'whisper']
    });
    log.info('HuggingFace Bridge registrado en X1Integrations');
  }

  log.info('X1HuggingFaceBridge cargado');

})();
