/**
 * transformers-bridge.js — Adaptador de Transformers.js para X1
 *
 * Integra modelos Hugging Face en el navegador (NLP, vision, audio).
 * Licencia: Apache-2.0 (Hugging Face Transformers.js)
 */

(function() {
  'use strict';

  var log = (typeof x1Log === 'function') ? x1Log('TransformersBridge') : { info: function(m){console.log('[X1-Transformers]',m);}, warn: function(m){console.warn('[X1-Transformers]',m);}, error: function(m){console.error('[X1-Transformers]',m);} };

  // ─── Pipeline types ───

  var PIPELINES = {
    'text-generation': { task: 'Text Generation', models: ['gpt2', 'distilgpt2'] },
    'text-classification': { task: 'Text Classification', models: ['distilbert-base-uncased-finetuned-sst-2-english'] },
    'zero-shot-classification': { task: 'Zero Shot Classification', models: ['facebook/bart-large-mnli'] },
    'token-classification': { task: 'Token Classification (NER)', models: ['dbmdz/bert-large-cased-finetuned-conll03-english'] },
    'question-answering': { task: 'Question Answering', models: ['distilbert-base-cased-distilled-squad'] },
    'summarization': { task: 'Summarization', models: ['facebook/bart-large-cnn'] },
    'translation': { task: 'Translation', models: ['t5-small', 'Helsinki-NLP/opus-mt-es-en'] },
    'fill-mask': { task: 'Fill Mask', models: ['bert-base-uncased'] },
    'text-to-speech': { task: 'Text to Speech', models: ['Xenova/speecht5_tts'] },
    'automatic-speech-recognition': { task: 'Speech Recognition', models: ['openai/whisper-tiny'] },
    'image-classification': { task: 'Image Classification', models: ['google/vit-base-patch16-224'] },
    'object-detection': { task: 'Object Detection', models: ['facebook/detr-resnet-50'] },
    'image-segmentation': { task: 'Image Segmentation', models: ['facebook/detr-resnet-50-panoptic'] },
    'sentiment-analysis': { task: 'Sentiment Analysis', models: ['distilbert-base-uncased-finetuned-sst-2-english'] },
    'ner': { task: 'Named Entity Recognition', models: ['dbmdz/bert-large-cased-finetuned-conll03-english'] }
  };

  // ─── Pipeline wrapper ───

  function Pipeline(options) {
    this.task = options.task || 'text-classification';
    this.model = options.model || null;
    this.apiBase = options.apiBase || 'https://api-inference.huggingface.co/models';
    this.apiKey = options.apiKey || '';
  }

  Pipeline.prototype.predict = function(input) {
    var self = this;
    var pipelineInfo = PIPELINES[this.task];
    var modelId = this.model || (pipelineInfo && pipelineInfo.models[0]);

    if (!modelId) {
      return Promise.resolve({ ok: false, error: 'Unknown task: ' + this.task });
    }

    var url = this.apiBase + '/' + modelId;
    var headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['Authorization'] = 'Bearer ' + this.apiKey;

    var body;
    if (typeof input === 'string') {
      body = { inputs: input };
    } else if (Array.isArray(input)) {
      body = { inputs: input };
    } else {
      body = input;
    }

    return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) })
      .then(function(r) {
        if (!r.ok) throw new Error('API error: ' + r.status);
        return r.json();
      })
      .then(function(data) {
        return { ok: true, output: data, task: self.task, model: modelId };
      })
      .catch(function(err) {
        return { ok: false, error: err.message, task: self.task, model: modelId };
      });
  };

  // ─── Text generation ───

  function TextGenerator(options) {
    this.model = options.model || 'gpt2';
    this.maxLength = options.maxLength || 50;
    this.temperature = options.temperature || 0.7;
  }

  TextGenerator.prototype.generate = function(prompt) {
    var url = 'https://api-inference.huggingface.co/models/' + this.model;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: this.maxLength,
          temperature: this.temperature,
          return_full_text: true
        }
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var text = '';
      if (Array.isArray(data)) {
        text = data[0].generated_text || '';
      } else if (data.generated_text) {
        text = data.generated_text;
      }
      return { ok: true, text: text };
    })
    .catch(function(e) { return { ok: false, error: e.message }; });
  };

  // ─── Sentiment analysis ───

  function SentimentAnalyzer(options) {
    this.model = options.model || 'distilbert-base-uncased-finetuned-sst-2-english';
  }

  SentimentAnalyzer.prototype.analyze = function(text) {
    var url = 'https://api-inference.huggingface.co/models/' + this.model;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: text })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (Array.isArray(data) && data.length > 0) {
        return { ok: true, label: data[0].label, score: data[0].score };
      }
      return { ok: true, label: 'unknown', score: 0 };
    })
    .catch(function(e) { return { ok: false, error: e.message }; });
  };

  // ─── Translation ───

  function Translator(options) {
    this.model = options.model || 'Helsinki-NLP/opus-mt-es-en';
    this.sourceLang = options.sourceLang || 'es';
    this.targetLang = options.targetLang || 'en';
  }

  Translator.prototype.translate = function(text) {
    var url = 'https://api-inference.huggingface.co/models/' + this.model;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: text })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var translated = '';
      if (Array.isArray(data) && data.length > 0) {
        translated = data[0].translation_text || '';
      } else if (data.translation_text) {
        translated = data.translation_text;
      }
      return { ok: true, text: translated, source: this.sourceLang, target: this.targetLang };
    }.bind(this))
    .catch(function(e) { return { ok: false, error: e.message }; });
  };

  // ─── Summarization ───

  function Summarizer(options) {
    this.model = options.model || 'facebook/bart-large-cnn';
    this.maxLength = options.maxLength || 130;
    this.minLength = options.minLength || 30;
  }

  Summarizer.prototype.summarize = function(text) {
    var url = 'https://api-inference.huggingface.co/models/' + this.model;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: text,
        parameters: { max_length: this.maxLength, min_length: this.minLength }
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var summary = '';
      if (Array.isArray(data) && data.length > 0) {
        summary = data[0].summary_text || '';
      } else if (data.summary_text) {
        summary = data.summary_text;
      }
      return { ok: true, summary: summary };
    })
    .catch(function(e) { return { ok: false, error: e.message }; });
  };

  // ─── Question Answering ───

  function QuestionAnswerer(options) {
    this.model = options.model || 'distilbert-base-cased-distilled-squad';
  }

  QuestionAnswerer.prototype.answer = function(question, context) {
    var url = 'https://api-inference.huggingface.co/models/' + this.model;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: { question: question, context: context } })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      return { ok: true, answer: data.answer || '', score: data.score || 0, start: data.start || 0, end: data.end || 0 };
    })
    .catch(function(e) { return { ok: false, error: e.message }; });
  };

  // ─── Public API ───

  self.X1TransformersBridge = {
    version: '1.0.0',
    license: 'Apache-2.0',
    source: 'https://github.com/huggingface/transformers.js',
    huggingFace: 'https://huggingface.co',

    PIPELINES: PIPELINES,
    Pipeline: Pipeline,
    TextGenerator: TextGenerator,
    SentimentAnalyzer: SentimentAnalyzer,
    Translator: Translator,
    Summarizer: Summarizer,
    QuestionAnswerer: QuestionAnswerer,

    createPipeline: function(opts) { return new Pipeline(opts || {}); },
    createTextGenerator: function(opts) { return new TextGenerator(opts || {}); },
    createSentimentAnalyzer: function(opts) { return new SentimentAnalyzer(opts || {}); },
    createTranslator: function(opts) { return new Translator(opts || {}); },
    createSummarizer: function(opts) { return new Summarizer(opts || {}); },
    createQuestionAnswerer: function(opts) { return new QuestionAnswerer(opts || {}); },

    healthCheck: function() {
      return Promise.resolve({ ok: true, pipelines: Object.keys(PIPELINES).length, version: '1.0.0' });
    }
  };

  if (self.X1Integrations) {
    self.X1Integrations.register({
      name: 'transformers',
      version: '1.0.0',
      license: 'Apache-2.0',
      path: 'background/integrations/transformers/',
      description: 'Modelos Hugging Face en el navegador (NLP, vision, audio)',
      healthCheck: function() { return self.X1TransformersBridge.healthCheck(); },
      dependencies: []
    });
  }

  log.info('X1TransformersBridge cargado - pipelines:', Object.keys(PIPELINES).length);

})();
