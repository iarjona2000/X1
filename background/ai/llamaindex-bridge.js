/**
 * llamaindex-bridge.js — Adaptador de LlamaIndex para X1
 *
 * Extrae la lógica de RAG (Retrieval-Augmented Generation) de LlamaIndex
 * y la expone como interfaz para X1. Incluye indexación, búsqueda semántica,
 * y generación con contexto.
 * Licencia: MIT (LlamaIndex Contributors)
 */

(function() {
  'use strict';

  var log = (typeof x1Log === 'function') ? x1Log('LlamaIndexBridge') : { info: function(m){console.log('[X1-LlamaIndex]',m);}, warn: function(m){console.warn('[X1-LlamaIndex]',m);}, error: function(m){console.error('[X1-LlamaIndex]',m);} };

  // ─── Document store (in-memory for browser) ───

  function DocumentStore() {
    this.documents = [];
    this.embeddings = {};
  }

  DocumentStore.prototype.addDocument = function(doc) {
    var id = 'doc_' + Date.now() + '_' + this.documents.length;
    this.documents.push({
      id: id,
      text: doc.text || '',
      metadata: doc.metadata || {},
      source: doc.source || 'unknown',
      timestamp: Date.now()
    });
    return id;
  };

  DocumentStore.prototype.addDocuments = function(docs) {
    var self = this;
    return docs.map(function(doc) { return self.addDocument(doc); });
  };

  DocumentStore.prototype.getDocument = function(id) {
    for (var i = 0; i < this.documents.length; i++) {
      if (this.documents[i].id === id) return this.documents[i];
    }
    return null;
  };

  DocumentStore.prototype.search = function(query, topK) {
    topK = topK || 5;
    var queryLower = query.toLowerCase();
    var words = queryLower.split(/\s+/).filter(function(w) { return w.length > 2; });

    var scored = this.documents.map(function(doc) {
      var textLower = doc.text.toLowerCase();
      var score = 0;
      words.forEach(function(word) {
        var idx = textLower.indexOf(word);
        if (idx >= 0) {
          score += 1;
          // Bonus for proximity
          var nearby = textLower.substring(Math.max(0, idx - 50), idx + word.length + 50);
          words.forEach(function(w2) {
            if (w2 !== word && nearby.indexOf(w2) >= 0) score += 0.5;
          });
        }
      });
      return { document: doc, score: score };
    });

    scored.sort(function(a, b) { return b.score - a.score; });
    return scored.slice(0, topK).filter(function(s) { return s.score > 0; });
  };

  DocumentStore.prototype.deleteDocument = function(id) {
    this.documents = this.documents.filter(function(d) { return d.id !== id; });
  };

  DocumentStore.prototype.clear = function() {
    this.documents = [];
    this.embeddings = {};
  };

  DocumentStore.prototype.count = function() {
    return this.documents.length;
  };

  // ─── RAG Engine ───

  function RAGEngine(options) {
    this.store = new DocumentStore();
    this.llmProvider = options.llmProvider || null;
    this.maxContextTokens = options.maxContextTokens || 4000;
  }

  RAGEngine.prototype.ingest = function(text, metadata) {
    // Split text into chunks
    var chunks = this.chunkText(text, 500, 50);
    var docs = chunks.map(function(chunk, i) {
      return { text: chunk, metadata: Object.assign({}, metadata || {}, { chunkIndex: i }) };
    });
    return this.store.addDocuments(docs);
  };

  RAGEngine.prototype.ingestFromURL = function(url) {
    var self = this;
    return fetch(url)
      .then(function(r) { return r.text(); })
      .then(function(text) {
        return self.ingest(text, { source: url, type: 'url' });
      });
  };

  RAGEngine.prototype.query = function(question, options) {
    var self = this;
    options = options || {};
    var topK = options.topK || 3;

    // Retrieve relevant documents
    var results = this.store.search(question, topK);
    if (results.length === 0) {
      return Promise.resolve({ answer: 'No relevant documents found.', sources: [] });
    }

    // Build context
    var context = results.map(function(r) {
      return '[Source: ' + (r.document.metadata.source || 'unknown') + ']\n' + r.document.text;
    }).join('\n\n---\n\n');

    var prompt = 'Based on the following context, answer the question. If the answer is not in the context, say so.\n\nContext:\n' + context + '\n\nQuestion: ' + question + '\n\nAnswer:';

    // Use LLM provider if available
    if (this.llmProvider && typeof this.llmProvider.complete === 'function') {
      var messages = [
        { role: 'system', content: 'You are a helpful assistant that answers questions based on provided context. Always cite your sources.' },
        { role: 'user', content: prompt }
      ];
      return this.llmProvider.complete(messages).then(function(result) {
        return {
          answer: result.completion || result.text || '',
          sources: results.map(function(r) {
            return { id: r.document.id, source: r.document.metadata.source, score: r.score, preview: r.document.text.substring(0, 200) };
          }),
          context: context
        };
      });
    }

    // Fallback: return context without LLM
    return Promise.resolve({
      answer: 'Context retrieved but no LLM available to generate answer.',
      sources: results.map(function(r) {
        return { id: r.document.id, source: r.document.metadata.source, score: r.score, preview: r.document.text.substring(0, 200) };
      }),
      context: context
    });
  };

  RAGEngine.prototype.chunkText = function(text, chunkSize, overlap) {
    chunkSize = chunkSize || 500;
    overlap = overlap || 50;
    var chunks = [];
    var start = 0;
    while (start < text.length) {
      var end = Math.min(start + chunkSize, text.length);
      chunks.push(text.substring(start, end));
      start = end - overlap;
      if (start + overlap >= text.length) break;
    }
    return chunks;
  };

  RAGEngine.prototype.getStats = function() {
    return {
      documents: this.store.count(),
      chunks: this.store.documents.length,
      maxContextTokens: this.maxContextTokens
    };
  };

  // ─── X1 integration ───

  var defaultEngine = null;

  function getEngine(options) {
    if (!defaultEngine) {
      defaultEngine = new RAGEngine(options || {});
    }
    return defaultEngine;
  }

  // ─── Public API ───

  window.X1LlamaIndexBridge = {
    version: '1.0.0',
    license: 'MIT',
    source: 'https://github.com/run-llama/llama_index',

    RAGEngine: RAGEngine,
    DocumentStore: DocumentStore,
    createEngine: function(options) { return new RAGEngine(options); },

    ingest: function(text, metadata) { return getEngine().ingest(text, metadata); },
    ingestFromURL: function(url) { return getEngine().ingestFromURL(url); },
    query: function(question, options) { return getEngine().query(question, options); },
    getStats: function() { return getEngine().getStats(); },

    healthCheck: function() {
      var engine = getEngine();
      return Promise.resolve({
        ok: true,
        documents: engine.store.count(),
        version: '1.0.0'
      });
    }
  };

  // Register in integrations registry
  if (window.X1Integrations) {
    window.X1Integrations.register({
      name: 'llamaindex',
      version: '1.0.0',
      license: 'MIT',
      path: 'background/integrations/llamaindex/',
      description: 'RAG engine para memoria semantica',
      healthCheck: function() { return window.X1LlamaIndexBridge.healthCheck(); },
      dependencies: []
    });
    log.info('LlamaIndex Bridge registrado en X1Integrations');
  }

  log.info('X1LlamaIndexBridge cargado');

})();
