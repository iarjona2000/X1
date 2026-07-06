import { sendToEngine } from './backend.js';

// ── Automatizacion de repositorios de GitHub ──
// Detecta PRs abiertos del usuario, orquesta una revision con IA (panel + juez
// via el service-worker) y publica el comentario en el PR.

var GH = 'https://api.github.com';

function ghHeaders(token) {
  return { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' };
}

// PRs abiertos del usuario (across repos) via Search API.
export function fetchOpenPRs(token) {
  var q = encodeURIComponent('is:pr is:open author:@me');
  return fetch(GH + '/search/issues?q=' + q + '&sort=updated&per_page=20', { headers: ghHeaders(token) })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !Array.isArray(d.items)) return [];
      return d.items.map(function (pr) {
        var parts = (pr.repository_url || '').split('/').slice(-2);
        return {
          title: pr.title,
          number: pr.number,
          url: pr.html_url,
          owner: parts[0] || '',
          repo: parts[1] || '',
          updated: pr.updated_at,
          comments: pr.comments || 0,
        };
      });
    })
    .catch(function () { return []; });
}

// Diff crudo del PR (truncado para no pasarse de contexto).
export function fetchPRDiff(token, owner, repo, number) {
  return fetch(GH + '/repos/' + owner + '/' + repo + '/pulls/' + number, {
    headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github.v3.diff' },
  })
    .then(function (r) { return r.ok ? r.text() : ''; })
    .then(function (txt) { return (txt || '').slice(0, 12000); })
    .catch(function () { return ''; });
}

// Orquesta la revision: usa el panel + juez del service-worker ("compara
// respuestas" activa la ruta multi-IA + arbitro en handleVoice).
export function reviewPRDiff(title, diff) {
  // Usa el analisis del repositorio (seccion "Tu Repositorio") como contexto.
  var analysis = loadRepoAnalysis();
  var context = analysis && analysis.report
    ? '\n\nContexto del repositorio (analisis previo de X1):\n' + String(analysis.report).slice(0, 1500) + '\n'
    : '';
  var prompt =
    'compara respuestas Actua como revisor de codigo senior. Revisa este Pull Request y responde en espanol con este formato:\n' +
    '1) Resumen del cambio\n2) Problemas (bugs, seguridad, rendimiento)\n3) Sugerencias concretas\n4) Veredicto: APROBAR / CAMBIOS / RECHAZAR\n' +
    context + '\nPR: "' + title + '"\n\nDiff:\n' + diff;
  return sendToEngine(prompt);
}

// Publica la revision como comentario en el PR.
export function publishPRComment(token, owner, repo, number, body) {
  return fetch(GH + '/repos/' + owner + '/' + repo + '/issues/' + number + '/comments', {
    method: 'POST',
    headers: ghHeaders(token),
    body: JSON.stringify({ body: body }),
  })
    .then(function (r) { return r.ok; })
    .catch(function () { return false; });
}

// ── Analisis exhaustivo del repositorio ──

export function fetchRepoMeta(token, owner, repo) {
  return fetch(GH + '/repos/' + owner + '/' + repo, { headers: ghHeaders(token) })
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; });
}

// Arbol de ficheros del repo (recursivo).
export function fetchRepoTree(token, owner, repo, branch) {
  return fetch(GH + '/repos/' + owner + '/' + repo + '/git/trees/' + encodeURIComponent(branch) + '?recursive=1', { headers: ghHeaders(token) })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !Array.isArray(d.tree)) return [];
      return d.tree
        .filter(function (n) { return n.type === 'blob'; })
        .map(function (n) { return { path: n.path, size: n.size || 0 }; });
    })
    .catch(function () { return []; });
}

export function fetchFileContent(token, owner, repo, path) {
  var encoded = path.split('/').map(encodeURIComponent).join('/');
  return fetch(GH + '/repos/' + owner + '/' + repo + '/contents/' + encoded, { headers: ghHeaders(token) })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.content) return '';
      try { return decodeURIComponent(escape(atob(d.content.replace(/\n/g, '')))); }
      catch (e) { try { return atob(d.content.replace(/\n/g, '')); } catch (e2) { return ''; } }
    })
    .catch(function () { return ''; });
}

var LANG_MAP = {
  js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript',
  py: 'Python', java: 'Java', go: 'Go', rs: 'Rust', rb: 'Ruby', php: 'PHP',
  c: 'C', h: 'C', cpp: 'C++', hpp: 'C++', cs: 'C#', swift: 'Swift', kt: 'Kotlin',
  css: 'CSS', scss: 'CSS', html: 'HTML', json: 'JSON', md: 'Markdown',
  yml: 'YAML', yaml: 'YAML', sh: 'Shell', sql: 'SQL', vue: 'Vue',
};

export function languageStats(files) {
  var langs = {};
  files.forEach(function (f) {
    var ext = (f.path.split('.').pop() || '').toLowerCase();
    var l = LANG_MAP[ext];
    if (l) langs[l] = (langs[l] || 0) + 1;
  });
  return langs;
}

// Analisis a fondo: lee ficheros clave + arbol y genera un informe con IA.
// El resultado se guarda para que lo use la seccion de Automatizacion.
export function analyzeRepo(token, owner, repo, meta, files, onStep) {
  var langs = languageStats(files);
  var stats = {
    fileCount: files.length,
    languages: langs,
    totalSize: files.reduce(function (a, f) { return a + (f.size || 0); }, 0),
  };

  var keyNames = ['README.md', 'readme.md', 'README', 'package.json', 'requirements.txt', 'go.mod', 'Cargo.toml', 'pom.xml', 'tsconfig.json', 'manifest.json', 'Dockerfile', 'pyproject.toml'];
  var keyFiles = files
    .filter(function (f) { return keyNames.indexOf(f.path.split('/').pop()) !== -1 && f.path.split('/').length <= 2; })
    .slice(0, 6);

  if (onStep) onStep('Leyendo ' + keyFiles.length + ' ficheros clave');

  return Promise.all(
    keyFiles.map(function (f) {
      return fetchFileContent(token, owner, repo, f.path).then(function (c) {
        return { path: f.path, content: (c || '').slice(0, 3000) };
      });
    })
  ).then(function (contents) {
    if (onStep) onStep('Analizando con IA (panel + juez)');
    var tree = files.slice(0, 150).map(function (f) { return f.path; }).join('\n');
    var prompt =
      'compara respuestas Analiza a fondo este repositorio de GitHub y devuelve un informe EXHAUSTIVO en espanol con estas secciones:\n' +
      '1) Proposito y tipo de proyecto\n2) Stack y lenguajes\n3) Arquitectura y estructura de carpetas\n4) Ficheros clave y su rol\n5) Calidad y riesgos observados\n6) Recomendaciones concretas de mejora\n\n' +
      'Repo: ' + owner + '/' + repo + '\nDescripcion: ' + ((meta && meta.description) || 'N/A') +
      '\nLenguaje principal: ' + ((meta && meta.language) || 'N/A') + '\nFicheros: ' + files.length + '\n\n' +
      'Arbol (parcial):\n' + tree + '\n\nContenido de ficheros clave:\n' +
      contents.map(function (c) { return '=== ' + c.path + ' ===\n' + c.content; }).join('\n\n');

    return sendToEngine(prompt).then(function (report) {
      var analysis = {
        repo: owner + '/' + repo,
        owner: owner,
        name: repo,
        meta: meta,
        stats: stats,
        files: files,
        report: report || 'El motor de IA no devolvio analisis ahora mismo. Reintentalo en unos segundos.',
        at: Date.now(),
      };
      saveRepoAnalysis(analysis);
      return analysis;
    });
  });
}

export function saveRepoAnalysis(a) {
  try { localStorage.setItem('x1_repo_analysis', JSON.stringify(a)); } catch (e) {}
}

export function loadRepoAnalysis() {
  try {
    var r = localStorage.getItem('x1_repo_analysis');
    return r ? JSON.parse(r) : null;
  } catch (e) { return null; }
}
