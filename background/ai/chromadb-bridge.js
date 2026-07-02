/**
 * chromadb-bridge.js — Adaptador de ChromaDB para X1
 *
 * Base de datos vectorial para busqueda semantica y embeddings.
 * Licencia: Apache-2.0 (ChromaDB Contributors)
 */

(function() {
  'use strict';

  var log = (typeof x1Log === 'function') ? x1Log('ChromaDBBridge') : { info: function(m){console.log('[X1-ChromaDB]',m);}, warn: function(m){console.warn('[X1-ChromaDB]',m);}, error: function(m){console.error('[X1-ChromaDB]',m);} };

  // ─── Collection ───

  function Collection(name, options) {
    this.name = name;
    this.metadata = (options && options.metadata) || {};
    this.documents = [];
    this.ids = [];
    this.embeddings = [];
    this.metadatas = [];
  }

  Collection.prototype.add = function(documents, ids, metadatas, embeddings) {
    var self = this;
    ids = ids || documents.map(function(_, i) { return 'doc_' + Date.now() + '_' + i; });
    metadatas = metadatas || documents.map(function() { return {}; });
    embeddings = embeddings || [];

    documents.forEach(function(doc, i) {
      self.documents.push(doc);
      self.ids.push(ids[i]);
      self.metadatas.push(metadatas[i]);
      self.embeddings.push(embeddings[i] || self._simpleEmbed(doc));
    });

    return Promise.resolve({ ok: true, count: documents.length });
  };

  Collection.prototype._simpleEmbed = function(text) {
    // Simple TF-IDF-like embedding
    var words = text.toLowerCase().split(/\s+/);
    var vec = new Array(100).fill(0);
    words.forEach(function(w) {
      var hash = 0;
      for (var i = 0; i < w.length; i++) {
        hash = ((hash << 5) - hash) + w.charCodeAt(i);
        hash |= 0;
      }
      vec[Math.abs(hash) % 100] += 1;
    });
    // Normalize
    var norm = Math.sqrt(vec.reduce(function(s, v) { return s + v * v; }, 0));
    if (norm > 0) vec = vec.map(function(v) { return v / norm; });
    return vec;
  };

  Collection.prototype.query = function(queryEmbedding, nResults) {
    var self = this;
    nResults = nResults || 5;

    if (typeof queryEmbedding === 'string') {
      queryEmbedding = this._simpleEmbed(queryEmbedding);
    }

    var scored = this.documents.map(function(doc, i) {
      var similarity = self._cosineSimilarity(queryEmbedding, self.embeddings[i]);
      return { id: self.ids[i], document: doc, metadata: self.metadatas[i], distance: 1 - similarity, similarity: similarity };
    });

    scored.sort(function(a, b) { return b.similarity - a.similarity; });
    var results = scored.slice(0, nResults);

    return Promise.resolve({
      ok: true,
      ids: [results.map(function(r) { return r.id; })],
      documents: [results.map(function(r) { return r.document; })],
      metadatas: [results.map(function(r) { return r.metadata; })],
      distances: [results.map(function(r) { return r.distance; })]
    });
  };

  Collection.prototype._cosineSimilarity = function(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    var dot = 0, normA = 0, normB = 0;
    for (var i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
  };

  Collection.prototype.get = function(ids, options) {
    var self = this;
    var results = [];
    if (ids) {
      ids.forEach(function(id) {
        var idx = self.ids.indexOf(id);
        if (idx >= 0) {
          results.push({ id: id, document: self.documents[idx], metadata: self.metadatas[idx] });
        }
      });
    } else {
      self.documents.forEach(function(doc, i) {
        results.push({ id: self.ids[i], document: doc, metadata: self.metadatas[i] });
      });
    }
    return Promise.resolve({ ok: true, ids: results.map(function(r) { return r.id; }), documents: results.map(function(r) { return r.document; }), metadatas: results.map(function(r) { return r.metadata; }) });
  };

  Collection.prototype.update = function(ids, documents, metadatas, embeddings) {
    var self = this;
    ids.forEach(function(id, i) {
      var idx = self.ids.indexOf(id);
      if (idx >= 0) {
        if (documents && documents[i]) self.documents[idx] = documents[i];
        if (metadatas && metadatas[i]) self.metadatas[idx] = metadatas[i];
        if (embeddings && embeddings[i]) self.embeddings[idx] = embeddings[i];
      }
    });
    return Promise.resolve({ ok: true });
  };

  Collection.prototype.delete = function(ids) {
    var self = this;
    ids.forEach(function(id) {
      var idx = self.ids.indexOf(id);
      if (idx >= 0) {
        self.ids.splice(idx, 1);
        self.documents.splice(idx, 1);
        self.metadatas.splice(idx, 1);
        self.embeddings.splice(idx, 1);
      }
    });
    return Promise.resolve({ ok: true, deleted: ids.length });
  };

  Collection.prototype.count = function() {
    return Promise.resolve(this.documents.length);
  };

  Collection.prototype.peek = function(limit) {
    limit = limit || 10;
    return Promise.resolve({
      ok: true,
      ids: this.ids.slice(0, limit),
      documents: this.documents.slice(0, limit),
      metadatas: this.metadatas.slice(0, limit)
    });
  };

  Collection.prototype.modify = function(metadata) {
    Object.assign(this.metadata, metadata);
    return Promise.resolve({ ok: true });
  };

  // ─── ChromaDB Client ───

  function ChromaClient(options) {
    this.collections = {};
    this.url = (options && options.url) || 'http://localhost:8000';
  }

  ChromaClient.prototype.createCollection = function(name, options) {
    this.collections[name] = new Collection(name, options);
    return Promise.resolve(this.collections[name]);
  };

  ChromaClient.prototype.getCollection = function(name) {
    return Promise.resolve(this.collections[name] || null);
  };

  ChromaClient.prototype.deleteCollection = function(name) {
    delete this.collections[name];
    return Promise.resolve({ ok: true });
  };

  ChromaClient.prototype.listCollections = function() {
    var names = Object.keys(this.collections);
    return Promise.resolve(names.map(function(n) { return { name: n }; }));
  };

  ChromaClient.prototype.heartbeat = function() {
    return Promise.resolve({ ok: true, nanosecond: Date.now() * 1000000 });
  };

  // ─── Public API ───

  window.X1ChromaDBBridge = {
    version: '1.0.0',
    license: 'Apache-2.0',
    source: 'https://github.com/chroma-core/chroma',

    Collection: Collection,
    ChromaClient: ChromaClient,
    createClient: function(opts) { return new ChromaClient(opts || {}); },

    healthCheck: function() {
      return Promise.resolve({ ok: true, version: '1.0.0', type: 'in-memory' });
    }
  };

  if (window.X1Integrations) {
    window.X1Integrations.register({
      name: 'chromadb',
      version: '1.0.0',
      license: 'Apache-2.0',
      path: 'background/integrations/chromadb/',
      description: 'Base de datos vectorial para busqueda semantica',
      healthCheck: function() { return window.X1ChromaDBBridge.healthCheck(); },
      dependencies: []
    });
  }

  log.info('X1ChromaDBBridge cargado');

})();
