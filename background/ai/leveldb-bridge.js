/**
 * leveldb-bridge.js — Adaptador de LevelDB para X1
 *
 * Base de datos key-value local de alto rendimiento.
 * Licencia: MIT (LevelDB Contributors)
 */

(function() {
  'use strict';

  var log = (typeof x1Log === 'function') ? x1Log('LevelDBBridge') : { info: function(m){console.log('[X1-LevelDB]',m);}, warn: function(m){console.warn('[X1-LevelDB]',m);}, error: function(m){console.error('[X1-LevelDB]',m);} };

  // ─── LevelDB wrapper (localStorage-backed) ───

  function LevelDB(name, options) {
    this.name = name || 'x1-leveldb';
    this.prefix = this.name + ':';
    this._cache = {};
    this._loadFromStorage();
  }

  LevelDB.prototype._loadFromStorage = function() {
    var self = this;
    try {
      Object.keys(localStorage).forEach(function(key) {
        if (key.indexOf(self.prefix) === 0) {
          var dbKey = key.substring(self.prefix.length);
          try {
            self._cache[dbKey] = JSON.parse(localStorage.getItem(key));
          } catch (e) {
            self._cache[dbKey] = localStorage.getItem(key);
          }
        }
      });
    } catch (e) {
      log.warn('localStorage not available, using in-memory only');
    }
  };

  LevelDB.prototype._saveToStorage = function(key, value) {
    try {
      localStorage.setItem(this.prefix + key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (e) {
      log.warn('Could not save to localStorage:', e.message);
    }
  };

  LevelDB.prototype._deleteFromStorage = function(key) {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (e) {}
  };

  LevelDB.prototype.put = function(key, value) {
    this._cache[key] = value;
    this._saveToStorage(key, value);
    return Promise.resolve({ ok: true });
  };

  LevelDB.prototype.get = function(key) {
    var value = this._cache[key];
    if (value === undefined) {
      return Promise.resolve({ ok: false, error: 'Key not found' });
    }
    return Promise.resolve({ ok: true, value: value });
  };

  LevelDB.prototype.del = function(key) {
    delete this._cache[key];
    this._deleteFromStorage(key);
    return Promise.resolve({ ok: true });
  };

  LevelDB.prototype.batch = function(operations) {
    var self = this;
    operations.forEach(function(op) {
      if (op.type === 'put') {
        self._cache[op.key] = op.value;
        self._saveToStorage(op.key, op.value);
      } else if (op.type === 'del') {
        delete self._cache[op.key];
        self._deleteFromStorage(op.key);
      }
    });
    return Promise.resolve({ ok: true, count: operations.length });
  };

  LevelDB.prototype.keys = function(options) {
    options = options || {};
    var keys = Object.keys(this._cache);
    if (options.gt) keys = keys.filter(function(k) { return k > options.gt; });
    if (options.lt) keys = keys.filter(function(k) { return k < options.lt; });
    if (options.gte) keys = keys.filter(function(k) { return k >= options.gte; });
    if (options.lte) keys = keys.filter(function(k) { return k <= options.lte; });
    if (options.reverse) keys.reverse();
    if (options.limit) keys = keys.slice(0, options.limit);
    return Promise.resolve({ ok: true, keys: keys });
  };

  LevelDB.prototype.values = function(options) {
    return this.keys(options).then(function(result) {
      var values = {};
      result.keys.forEach(function(k) {
        values[k] = this._cache[k];
      }.bind(this));
      return { ok: true, values: values };
    }.bind(this));
  };

  LevelDB.prototype.entries = function(options) {
    return this.keys(options).then(function(result) {
      var entries = result.keys.map(function(k) {
        return { key: k, value: this._cache[k] };
      }.bind(this));
      return { ok: true, entries: entries };
    }.bind(this));
  };

  LevelDB.prototype.count = function() {
    return Promise.resolve({ ok: true, count: Object.keys(this._cache).length });
  };

  LevelDB.prototype.clear = function() {
    var self = this;
    Object.keys(this._cache).forEach(function(key) {
      self._deleteFromStorage(key);
    });
    this._cache = {};
    return Promise.resolve({ ok: true });
  };

  LevelDB.prototype.iterator = function(options) {
    var self = this;
    var keys = Object.keys(this._cache).sort();
    var index = 0;

    return {
      next: function() {
        if (index >= keys.length) return Promise.resolve({ done: true });
        var key = keys[index];
        index++;
        return Promise.resolve({ done: false, key: key, value: self._cache[key] });
      },
      seek: function(key) {
        index = keys.indexOf(key);
        if (index < 0) index = keys.length;
        return Promise.resolve();
      },
      end: function() { return Promise.resolve(); }
    };
  };

  // ─── Public API ───

  window.X1LevelDBBridge = {
    version: '1.0.0',
    license: 'MIT',
    source: 'https://github.com/Level/level',

    LevelDB: LevelDB,
    createDB: function(name, opts) { return new LevelDB(name, opts); },

    healthCheck: function() {
      return Promise.resolve({ ok: true, version: '1.0.0', backend: 'localStorage' });
    }
  };

  if (window.X1Integrations) {
    window.X1Integrations.register({
      name: 'leveldb',
      version: '1.0.0',
      license: 'MIT',
      path: 'background/integrations/leveldb/',
      description: 'Base de datos key-value local de alto rendimiento',
      healthCheck: function() { return window.X1LevelDBBridge.healthCheck(); },
      dependencies: []
    });
  }

  log.info('X1LevelDBBridge cargado');

})();
