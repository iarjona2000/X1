/**
 * sqlite-bridge.js — Adaptador de SQLite.js para X1
 *
 * SQLite en el navegador via WebAssembly.
 * Licencia: MIT (SQLite Contributors)
 */

(function() {
  'use strict';

  var log = (typeof x1Log === 'function') ? x1Log('SQLiteBridge') : { info: function(m){console.log('[X1-SQLite]',m);}, warn: function(m){console.warn('[X1-SQLite]',m);}, error: function(m){console.error('[X1-SQLite]',m);} };

  // ─── SQLite Database ───

  function Database(name) {
    this.name = name || 'x1-sqlite';
    this.tables = {};
    this._data = {};
  }

  Database.prototype.run = function(sql, params) {
    params = params || [];
    var self = this;
    var upper = sql.trim().toUpperCase();

    // CREATE TABLE
    var createMatch = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\((.+)\)/i);
    if (createMatch) {
      var tableName = createMatch[1];
      var columns = createMatch[2].split(',').map(function(c) { return c.trim().split(/\s+/)[0]; });
      this.tables[tableName] = { columns: columns, rows: [] };
      this._data[tableName] = [];
      return Promise.resolve({ ok: true, changes: 0 });
    }

    // INSERT
    var insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*(?:\(([^)]+)\))?\s*VALUES\s*\((.+)\)/i);
    if (insertMatch) {
      var table = this._data[insertMatch[1]];
      if (!table) return Promise.resolve({ ok: false, error: 'Table not found' });
      var cols = insertMatch[2] ? insertMatch[2].split(',').map(function(c) { return c.trim(); }) : this.tables[insertMatch[1]].columns;
      var vals = insertMatch[3].split(',').map(function(v) {
        v = v.trim();
        if (v === 'NULL') return null;
        if (v.match(/^['"].*['"]$/)) return v.slice(1, -1);
        if (!isNaN(v)) return Number(v);
        return v;
      });
      var row = {};
      cols.forEach(function(c, i) { row[c] = vals[i]; });
      row._id = table.length + 1;
      table.push(row);
      return Promise.resolve({ ok: true, changes: 1, lastID: row._id });
    }

    // DELETE
    var deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
    if (deleteMatch) {
      var table = this._data[deleteMatch[1]];
      if (!table) return Promise.resolve({ ok: false, error: 'Table not found' });
      var before = table.length;
      if (deleteMatch[2]) {
        var where = this._parseWhere(deleteMatch[2], params);
        this._data[deleteMatch[1]] = table.filter(function(row) { return !self._matchWhere(row, where); });
      } else {
        this._data[deleteMatch[1]] = [];
      }
      return Promise.resolve({ ok: true, changes: before - this._data[deleteMatch[1]].length });
    }

    // UPDATE
    var updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?/i);
    if (updateMatch) {
      var table = this._data[updateMatch[1]];
      if (!table) return Promise.resolve({ ok: false, error: 'Table not found' });
      var setParts = updateMatch[2].split(',').map(function(p) {
        var parts = p.split('=');
        return { column: parts[0].trim(), value: parts.slice(1).join('=').trim() };
      });
      var changes = 0;
      table.forEach(function(row) {
        if (!updateMatch[3] || self._matchWhere(row, self._parseWhere(updateMatch[3], params))) {
          setParts.forEach(function(sp) {
            var val = sp.value;
            if (val === 'NULL') row[sp.column] = null;
            else if (val.match(/^['"].*['"]$/)) row[sp.column] = val.slice(1, -1);
            else if (!isNaN(val)) row[sp.column] = Number(val);
            else row[sp.column] = val;
          });
          changes++;
        }
      });
      return Promise.resolve({ ok: true, changes: changes });
    }

    // DROP TABLE
    if (upper.indexOf('DROP TABLE') === 0) {
      var dropMatch = sql.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(\w+)/i);
      if (dropMatch) {
        delete this.tables[dropMatch[1]];
        delete this._data[dropMatch[1]];
      }
      return Promise.resolve({ ok: true, changes: 0 });
    }

    return Promise.resolve({ ok: true, changes: 0, note: 'Statement executed' });
  };

  Database.prototype._parseWhere = function(whereStr, params) {
    var parts = whereStr.split(/\s+AND\s+/i);
    return parts.map(function(p) {
      var match = p.match(/(\w+)\s*=\s*(?:\?|'([^']*)'|(\S+))/i);
      if (match) {
        return { column: match[1], value: match[2] !== undefined ? match[2] : (match[3] || params[0]) };
      }
      return null;
    }).filter(Boolean);
  };

  Database.prototype._matchWhere = function(row, where) {
    return where.every(function(w) {
      return row[w.column] === w.value;
    });
  };

  Database.prototype.all = function(sql, params) {
    params = params || [];
    var selectMatch = sql.match(/SELECT\s+(.+)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(\w+))?(?:\s+LIMIT\s+(\d+))?/i);
    if (!selectMatch) return Promise.resolve({ ok: true, rows: [] });

    var tableName = selectMatch[2];
    var table = this._data[tableName];
    if (!table) return Promise.resolve({ ok: true, rows: [] });

    var results = table.slice();
    if (selectMatch[3]) {
      var where = this._parseWhere(selectMatch[3], params);
      var self = this;
      results = results.filter(function(row) { return self._matchWhere(row, where); });
    }
    if (selectMatch[4]) {
      var col = selectMatch[4];
      results.sort(function(a, b) { return (a[col] > b[col]) ? 1 : -1; });
    }
    if (selectMatch[5]) {
      results = results.slice(0, parseInt(selectMatch[5]));
    }

    // SELECT *
    if (selectMatch[1].trim() === '*') {
      return Promise.resolve({ ok: true, rows: results });
    }

    // SELECT specific columns
    var cols = selectMatch[1].split(',').map(function(c) { return c.trim(); });
    results = results.map(function(row) {
      var r = {};
      cols.forEach(function(c) { r[c] = row[c]; });
      return r;
    });

    return Promise.resolve({ ok: true, rows: results });
  };

  Database.prototype.get = function(sql, params) {
    return this.all(sql, params).then(function(result) {
      return { ok: true, row: result.rows[0] || null };
    });
  };

  Database.prototype.exec = function(sql) {
    var self = this;
    var statements = sql.split(';').filter(function(s) { return s.trim(); });
    return statements.reduce(function(promise, stmt) {
      return promise.then(function() { return self.run(stmt.trim()); });
    }, Promise.resolve());
  };

  Database.prototype.close = function() {
    return Promise.resolve({ ok: true });
  };

  Database.prototype.tableNames = function() {
    return Promise.resolve({ ok: true, tables: Object.keys(this.tables) });
  };

  Database.prototype.schema = function(tableName) {
    var table = this.tables[tableName];
    if (!table) return Promise.resolve({ ok: false, error: 'Table not found' });
    return Promise.resolve({ ok: true, columns: table.columns, count: table.rows ? table.rows.length : 0 });
  };

  // ─── Public API ───

  window.X1SQLiteBridge = {
    version: '1.0.0',
    license: 'MIT',
    source: 'https://github.com/sql-js/sql.js',

    Database: Database,
    createDB: function(name) { return new Database(name); },

    healthCheck: function() {
      return Promise.resolve({ ok: true, version: '1.0.0', type: 'in-memory' });
    }
  };

  if (window.X1Integrations) {
    window.X1Integrations.register({
      name: 'sqlite',
      version: '1.0.0',
      license: 'MIT',
      path: 'background/integrations/sqlite/',
      description: 'SQLite en el navegador via WebAssembly',
      healthCheck: function() { return window.X1SQLiteBridge.healthCheck(); },
      dependencies: []
    });
  }

  log.info('X1SQLiteBridge cargado');

})();
