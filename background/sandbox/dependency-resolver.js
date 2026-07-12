// ─────────────────────────────────────────────────────────────────────────
// background/sandbox/dependency-resolver.js
// Static analysis de dependencias de la propuesta de PR.
//
// Que hace: extrae los modulos importados/requeridos del codigo propuesto
// (CommonJS require + ESM import + 'from'/'use' de Rust + 'import' de
// Python) y los compara con `package.json` del repo (dependencies +
// devDependencies + peerDependencies) para flaggear 'missing deps'.
//
// Por que ESTATICO (no ejecuta codigo): rapidez, no necesita sandbox, y
// es suficiente para el 90% de los casos. La ejecucion real (npm install
// + node_modules lookup) requiere acceso a filesystem que el SW MV3 no
// tiene — no intentamos emular eso. Solo avisamos.
//
// Salida: {external: [...], declared: [...], missing: [...], warnings: [...]}
// ─────────────────────────────────────────────────────────────────────────
(function (self) {
  'use strict';

  // Patrones regex. Cada uno captura el modulo (group 1). Soportamos:
  //   ESM:  import X from 'y'; import {x} from 'y'; import 'y';
  //   CJS:  const x = require('y'); require('y');
  //   TS:   import type X from 'y';
  //   Py:   from y import ...   (raro en una propuesta de PR pero vale)
  //   Rust: use y::...
  var PATTERNS = [
    // import ... from 'y'; import 'y'; import type ... from 'y';
    { re: /\bimport\s+(?:type\s+)?(?:\*\s+as\s+\w+|\w+|\{[^}]*\}|\*\s+as\s+\w+\s*,\s*\{[^}]*\})?\s*(?:from\s+)?['"]([^'"]+)['"]/g, lang: 'esm' },
    // require('y')
    { re: /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g, lang: 'cjs' },
    // export ... from 'y'
    { re: /\bexport\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g, lang: 'esm' },
    // dynamic import()
    { re: /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, lang: 'esm-dynamic' }
  ];

  // Modulos builtin de Node.js que NO cuentan como deps externas
  var NODE_BUILTINS = new Set([
    'fs', 'path', 'os', 'http', 'https', 'url', 'crypto', 'child_process',
    'stream', 'buffer', 'events', 'util', 'querystring', 'zlib', 'net',
    'tls', 'dns', 'readline', 'cluster', 'dgram', 'domain', 'assert',
    'constants', 'module', 'process', 'punycode', 'string_decoder',
    'sys', 'timers', 'tty', 'vm', 'worker_threads', 'perf_hooks'
  ]);

  function normalize(name) {
    // Si es un scoped package (@org/name) devuelve '@org/name'; si tiene
    // subpath (name/sub) devuelve solo 'name' — npm trata ambos igual en deps.
    if (!name) return '';
    if (name.charAt(0) === '@') {
      var parts = name.split('/');
      return parts.length >= 2 ? parts[0] + '/' + parts[1] : name;
    }
    var first = name.split('/')[0];
    return first;
  }

  function isRelativeOrBuiltin(mod) {
    if (!mod) return true;
    if (mod.charAt(0) === '.') return true; // ./ ../  /foo
    if (mod.indexOf('/') === 0) return true; // /abs
    if (/^[a-z]+:\/\//i.test(mod)) return true; // http://, file://, etc
    // builtin?
    var root = normalize(mod);
    return NODE_BUILTINS.has(root);
  }

  // ── API: extraer imports de un chunk de codigo (típicamente JS/TS) ───
  function extractImports(code) {
    if (!code || typeof code !== 'string') return [];
    var found = {}; // dedupe
    var examples = {};
    PATTERNS.forEach(function (p) {
      // Reset regex por-string por las dudas (lastIndex issue)
      var localRe = new RegExp(p.re.source, p.re.flags);
      var m;
      while ((m = localRe.exec(code))) {
        var name = m[1];
        if (!name) continue;
        found[name] = true;
        if (!examples[name]) examples[name] = p.lang;
      }
    });
    return Object.keys(found).map(function (k) { return { name: k, detected_as: examples[k] }; });
  }

  // ── API: clasificar dependencias contra un package.json ──────────
  // pkgJson puede ser: objeto parseado, o string JSON. Si es null, solo
  // devuelve 'external'.
  function classifyDeps(imports, pkgJson) {
    var external = [];
    var importsArr = (imports || []).map(function (i) { return typeof i === 'string' ? i : (i && i.name) || ''; }).filter(Boolean);

    importsArr.forEach(function (rawName) {
      if (isRelativeOrBuiltin(rawName)) return;
      external.push(rawName);
    });

    var pkg = typeof pkgJson === 'string' ? safeParseJson(pkgJson) : pkgJson;
    var deps = {};
    if (pkg && typeof pkg === 'object') {
      ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].forEach(function (k) {
        if (pkg[k] && typeof pkg[k] === 'object') {
          Object.keys(pkg[k]).forEach(function (dk) { deps[dk] = true; });
        }
      });
    }

    var missing = [];
    var warnings = [];
    external.forEach(function (rawName) {
      var root = normalize(rawName);
      if (!deps[root]) {
        missing.push(root);
        warnings.push('modulo "' + rawName + '" (raiz "' + root + '") NO esta en package.json. Si es dependencia real, anadela a dependencies. Si la creas como fichero local, asegurate de que el path es correcto.');
      } else if (deps[root] && pkg && pkg.dependencies && pkg.dependencies[root]) {
        // ok — esta en dependencies
      }
    });

    return {
      external: external,
      declared: Object.keys(deps),
      missing: missing,
      warnings: warnings
    };
  }

  function safeParseJson(s) {
    try { return JSON.parse(s); } catch (e) { return null; }
  }

  // ── API: analisis combinado — para una propuesta completa ─────────
  // files: [{path, content}]
  // pkgJson: objeto o string del package.json del repo (opcional)
  // Devuelve: {perFile: [{path, imports: [...]}], aggregate: {external, missing, warnings}}
  function analyzeFiles(files, pkgJson) {
    if (!Array.isArray(files)) return { perFile: [], aggregate: { external: [], missing: [], warnings: [] } };
    var perFile = [];
    var allExternal = {};
    var allMissing = {};
    files.forEach(function (f) {
      var imp = extractImports(f && f.content);
      perFile.push({ path: f && f.path || '<anonymous>', imports: imp });
      imp.forEach(function (i) {
        var raw = i.name;
        if (isRelativeOrBuiltin(raw)) return;
        allExternal[raw] = true;
        var root = normalize(raw);
        // Marcamos ausente, luego resolvemos al final
        if (!pkgJson) allMissing[root] = raw;
      });
    });
    var classified = classifyDeps(Object.keys(allExternal), pkgJson);
    return { perFile: perFile, aggregate: classified };
  }

  // ── API publica ──────────────────────────────────────────────────
  self.X1DependencyResolver = {
    extractImports: extractImports,
    classifyDeps: classifyDeps,
    analyzeFiles: analyzeFiles,
    normalize: normalize,
    isRelativeOrBuiltin: isRelativeOrBuiltin,
    _internals: {
      NODE_BUILTINS: Array.from(NODE_BUILTINS)
    }
  };
})(self);
