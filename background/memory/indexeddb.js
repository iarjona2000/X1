var X1IndexedDB = (function() {

  var DB_NAME = 'x1-memory';
  var DB_VERSION = 2;
  var db = null;

  var STORES = {
    entities: { keyPath: 'id', indexes: ['type', 'name', 'date'] },
    relations: { keyPath: 'id', indexes: ['sourceId', 'targetId', 'type'] },
    memories: { keyPath: 'id', indexes: ['role', 'timestamp'] },
    monitors: { keyPath: 'id', indexes: ['url', 'interval'] },
    snapshots: { keyPath: 'id', indexes: ['monitorId', 'timestamp'] },
    tasks: { keyPath: 'id', indexes: ['status', 'created'] },
    intentions: { keyPath: 'id', indexes: ['category', 'status'] },
    predictions: { keyPath: 'id', indexes: ['timestamp'] },
    plugins: { keyPath: 'id', indexes: ['enabled', 'type'] },
    skills: { keyPath: 'id', indexes: ['name', 'created'] },
    settings: { keyPath: 'key' }
  };

  function openDB() {
    return new Promise(function(resolve, reject) {
      if (db) { resolve(db); return; }
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = function(e) { reject(new Error('IndexedDB open failed: ' + e.target.error)); };
      request.onsuccess = function(e) {
        db = e.target.result;
        db.onerror = function(ev) { console.error('[X1-IDB] Error:', ev.target.error); };
        db.onversionchange = function() { db.close(); db = null; };
        resolve(db);
      };
      request.onupgradeneeded = function(e) {
        var database = e.target.result;
        Object.keys(STORES).forEach(function(storeName) {
          if (!database.objectStoreNames.contains(storeName)) {
            var cfg = STORES[storeName];
            var store = database.createObjectStore(storeName, { keyPath: cfg.keyPath, autoIncrement: cfg.keyPath === 'id' });
            if (cfg.indexes) {
              cfg.indexes.forEach(function(idx) {
                store.createIndex(idx, idx, { unique: false });
              });
            }
          }
        });
      };
    });
  }

  function getStore(storeName, mode) {
    return openDB().then(function(database) {
      var tx = database.transaction(storeName, mode || 'readonly');
      return tx.objectStore(storeName);
    });
  }

  function put(storeName, data) {
    return getStore(storeName, 'readwrite').then(function(store) {
      return new Promise(function(resolve, reject) {
        var req = store.put(data);
        req.onsuccess = function() { resolve(req.result); };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  }

  function get(storeName, id) {
    return getStore(storeName).then(function(store) {
      return new Promise(function(resolve, reject) {
        var req = store.get(id);
        req.onsuccess = function() { resolve(req.result); };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  }

  function getAll(storeName) {
    return getStore(storeName).then(function(store) {
      return new Promise(function(resolve, reject) {
        var req = store.getAll();
        req.onsuccess = function() { resolve(req.result || []); };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  }

  function queryByIndex(storeName, indexName, value) {
    return getStore(storeName).then(function(store) {
      return new Promise(function(resolve, reject) {
        var index = store.index(indexName);
        var req = index.getAll(value);
        req.onsuccess = function() { resolve(req.result || []); };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  }

  function remove(storeName, id) {
    return getStore(storeName, 'readwrite').then(function(store) {
      return new Promise(function(resolve, reject) {
        var req = store.delete(id);
        req.onsuccess = function() { resolve(true); };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  }

  function clear(storeName) {
    return getStore(storeName, 'readwrite').then(function(store) {
      return new Promise(function(resolve, reject) {
        var req = store.clear();
        req.onsuccess = function() { resolve(true); };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  }

  function count(storeName) {
    return getStore(storeName).then(function(store) {
      return new Promise(function(resolve, reject) {
        var req = store.count();
        req.onsuccess = function() { resolve(req.result); };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  }

  function bulkPut(storeName, items) {
    return getStore(storeName, 'readwrite').then(function(store) {
      return new Promise(function(resolve, reject) {
        var tx = store.transaction;
        var completed = 0;
        items.forEach(function(item) {
          var req = store.put(item);
          req.onsuccess = function() { completed++; if (completed >= items.length) resolve(true); };
          req.onerror = function(e) { reject(e.target.error); };
        });
        if (items.length === 0) resolve(true);
      });
    });
  }

  function getDBInfo() {
    return openDB().then(function(database) {
      var info = { name: database.name, version: database.version, stores: [] };
      for (var i = 0; i < database.objectStoreNames.length; i++) {
        var sName = database.objectStoreNames[i];
        info.stores.push({ name: sName, count: 0 });
      }
      return info;
    });
  }

  function closeDB() {
    if (db) { db.close(); db = null; }
  }

  function deleteDB() {
    closeDB();
    return new Promise(function(resolve, reject) {
      var req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = function() { resolve(true); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  }

  return {
    openDB: openDB, getStore: getStore, put: put, get: get, getAll: getAll,
    queryByIndex: queryByIndex, remove: remove, clear: clear, count: count,
    bulkPut: bulkPut, getDBInfo: getDBInfo, closeDB: closeDB, deleteDB: deleteDB,
    STORES: STORES, DB_NAME: DB_NAME
  };
})();
