import { callAI } from './backend.js';
import { githubSearch, npmSearch, stackOverflowSearch } from './tools.js';

// ── Automatizacion de repositorios de GitHub ──
// 1) Analisis exhaustivo de un repo (analyzeRepo).
// 2) Revision de PRs abiertos con panel+juez (reviewPRDiff).
// 3) Constructor autonomo: dado un objetivo en texto libre, X1 lo interpreta
//    usando el analisis previo del repo, lo divide en tareas concretas
//    (una si el objetivo ya es concreto, varias si es amplio: "arregla todos
//    los problemas"), y para cada tarea investiga (GitHub/npm/StackOverflow +
//    una URL si lo decide), consulta el panel de IAs, propone cambios de
//    fichero y PUBLICA la rama + PR automaticamente — sin pedir confirmacion.
// Cada fase reporta pasos estructurados via onStep({id,title,detail,status,why})
// para que la UI (ProcessLog) muestre siempre donde esta X1, que IA respondio
// y por que — nunca debe quedar una fase muda mas de un instante.

var GH = 'https://api.github.com';

function ghHeaders(token) {
  return { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' };
}

// Emite un paso; si esta 'active' le clava un timestamp para que la UI pueda
// mostrar un contador de segundos en vivo (asi nunca "parece colgado" aunque
// una consulta a la IA tarde 30-60s en responder de verdad).
function emit(onStep, step) {
  if (!onStep) return;
  if (step.status === 'active' && !step.startedAt) step.startedAt = Date.now();
  onStep(step);
}

var PROVIDER_LABELS = {
  nvidiaGlm: 'NVIDIA NIM — GLM 5.1',
  nvidiaNemotron: 'NVIDIA NIM — Nemotron 3 Ultra',
  nvidiaGptOss: 'NVIDIA NIM — gpt-oss 120B',
  nvidiaLlama: 'NVIDIA NIM — Llama 4 Maverick',
  nvidiaQwen: 'NVIDIA NIM — Qwen3 Coder',
  gemini: 'Google Gemini',
  proxy: 'Panel en la nube (Groq / NVIDIA / Gemini vía proxy)',
  ollama: 'Ollama (modelo local)',
};
function providerLabel(id) { return PROVIDER_LABELS[id] || (id ? id : 'IA'); }

var AGENT_SYSTEM_PROMPT = 'Eres X1, un agente de automatizacion de software. Responde SIEMPRE en espanol, de forma directa y sin relleno conversacional. Sigue el formato EXACTO que pida cada instruccion (si se pide JSON puro, responde solo JSON, sin fences de markdown ni texto antes o despues).';

// Llama al proxy directamente (fetch desde el sidepanel, sin pasar por el
// service worker) y devuelve {text, label, provider} donde label ya incluye
// el modelo real que respondio y cuanto tardo, listo para meter en un detail.
function askAI(prompt, opts) {
  opts = opts || {};
  var t0 = Date.now();
  return callAI(prompt, {
    maxTokens: opts.maxTokens,
    timeoutMs: opts.timeoutMs,
    systemPrompt: AGENT_SYSTEM_PROMPT,
  }).then(function (r) {
    var secs = Math.round((Date.now() - t0) / 1000);
    if (!r || !r.text) {
      var errLabel = (r && r.error) || 'sin respuesta';
      return { text: null, label: errLabel + ' · ' + secs + 's', provider: r && r.provider };
    }
    var label = (r.model && r.model !== 'desconocido' ? r.model : providerLabel(r.provider)) + ' · ' + secs + 's';
    return { text: r.text, label: label, provider: r.provider };
  });
}

// ── PRs abiertos del usuario (across repos) via Search API. ──
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

// Orquesta la revision: usa el panel + juez ("forceJudge") del motor de IA.
export function reviewPRDiff(title, diff) {
  var analysis = loadRepoAnalysis();
  var context = analysis && analysis.report
    ? '\n\nContexto del repositorio (analisis previo de X1):\n' + String(analysis.report).slice(0, 1500) + '\n'
    : '';
  var prompt =
    'Actua como revisor de codigo senior. Revisa este Pull Request y responde en espanol con este formato:\n' +
    '1) Resumen del cambio\n2) Problemas (bugs, seguridad, rendimiento)\n3) Sugerencias concretas\n4) Veredicto: APROBAR / CAMBIOS / RECHAZAR\n' +
    context + '\nPR: "' + title + '"\n\nDiff:\n' + diff;
  return askAI(prompt, { timeoutMs: 25000, maxTokens: 1500 }).then(function (r) { return r.text; });
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

// ── Repositorio: metadatos, arbol, contenido de ficheros ──

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

// Contenido de un fichero. Devuelve tambien el sha (necesario para actualizar
// via la Contents API al publicar cambios).
export function fetchFile(token, owner, repo, path) {
  var encoded = path.split('/').map(encodeURIComponent).join('/');
  return fetch(GH + '/repos/' + owner + '/' + repo + '/contents/' + encoded, { headers: ghHeaders(token) })
    .then(function (r) { return r.status === 404 ? null : (r.ok ? r.json() : null); })
    .then(function (d) {
      if (!d || !d.content) return { content: '', sha: null, exists: false };
      var content = '';
      try { content = decodeURIComponent(escape(atob(d.content.replace(/\n/g, '')))); }
      catch (e) { try { content = atob(d.content.replace(/\n/g, '')); } catch (e2) { content = ''; } }
      return { content: content, sha: d.sha, exists: true };
    })
    .catch(function () { return { content: '', sha: null, exists: false }; });
}

export function fetchFileContent(token, owner, repo, path) {
  return fetchFile(token, owner, repo, path).then(function (f) { return f.content; });
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

function fmtBytes(n) {
  if (!n) return '0 B';
  if (n > 1048576) return (n / 1048576).toFixed(1) + ' MB';
  if (n > 1024) return (n / 1024).toFixed(1) + ' KB';
  return n + ' B';
}

// ── Analisis exhaustivo del repositorio (con proceso visible paso a paso) ──
// El resultado se guarda para que lo use la seccion de Automatizacion como
// contexto de un objetivo autonomo.
export function analyzeRepo(token, owner, repo, meta, files, onStep) {
  var langs = languageStats(files);
  var stats = {
    fileCount: files.length,
    languages: langs,
    totalSize: files.reduce(function (a, f) { return a + (f.size || 0); }, 0),
  };

  emit(onStep, {
    id: 'tree', title: 'Arbol de ficheros leido', status: 'done',
    detail: files.length + ' ficheros · ' + Object.keys(langs).slice(0, 4).join(', ') + (Object.keys(langs).length > 4 ? '…' : ''),
    why: 'Necesario para conocer la estructura de carpetas y el stack antes de leer nada en detalle.',
  });

  var keyNames = ['README.md', 'readme.md', 'README', 'package.json', 'requirements.txt', 'go.mod', 'Cargo.toml', 'pom.xml', 'tsconfig.json', 'manifest.json', 'Dockerfile', 'pyproject.toml'];
  var keyFiles = files
    .filter(function (f) { return keyNames.indexOf(f.path.split('/').pop()) !== -1 && f.path.split('/').length <= 2; })
    .slice(0, 4);

  if (keyFiles.length === 0) {
    emit(onStep, { id: 'nokeys', title: 'Sin ficheros clave en la raiz', status: 'done', detail: 'No hay README/package.json/etc en el nivel superior; X1 analizara solo con el arbol de ficheros.' });
  }

  var readSteps = keyFiles.map(function (f) { return { id: 'read:' + f.path, title: 'Leyendo ' + f.path, status: 'active' }; });
  readSteps.forEach(function (s) { emit(onStep, s); });

  return Promise.all(
    keyFiles.map(function (f, i) {
      return fetchFileContent(token, owner, repo, f.path).then(function (c) {
        emit(onStep, {
          id: 'read:' + f.path, title: 'Leido ' + f.path, status: 'done',
          detail: fmtBytes((c || '').length),
          why: readWhy(f.path),
        });
        // Cap a 1500 chars: el objetivo es que la IA entienda el rol del
        // fichero, no que reciba el fuente entero — cada caracter de mas aqui
        // es tiempo de espera de mas para el usuario, multiplicado por
        // cada fichero clave.
        return { path: f.path, content: (c || '').slice(0, 1500) };
      });
    })
  ).then(function (contents) {
    emit(onStep, {
      id: 'ai', title: 'Consultando panel de IA (varios modelos + arbitro)', status: 'active',
      why: 'Con el arbol y los ficheros clave ya leidos, X1 pide un informe conciso: proposito, stack, arquitectura, riesgos y recomendaciones.',
    });
    var tree = files.slice(0, 100).map(function (f) { return f.path; }).join('\n');
    var prompt =
      'Analiza este repositorio de GitHub y devuelve un informe en espanol, en formato MARKDOWN, con EXACTAMENTE estas 6 secciones (usa "## " para cada titulo):\n' +
      '## Proposito\n## Stack\n## Arquitectura\n## Ficheros clave\n## Riesgos\n## Recomendaciones\n\n' +
      'Reglas: se CONCISO y directo (3-5 frases o 3-6 bullets por seccion, nunca mas). ' +
      'En "Riesgos" y "Recomendaciones" nombra ficheros y acciones CONCRETAS (nada de generalidades tipo "mejorar el codigo"), usa listas con "- ". ' +
      '"Recomendaciones" es la seccion mas importante: el usuario la usara para decidir que construir despues, cada punto debe ser una accion accionable por si sola.\n\n' +
      'Repo: ' + owner + '/' + repo + '\nDescripcion: ' + ((meta && meta.description) || 'N/A') +
      '\nLenguaje principal: ' + ((meta && meta.language) || 'N/A') + '\nFicheros: ' + files.length + '\n\n' +
      'Arbol (parcial):\n' + tree + '\n\nContenido de ficheros clave (resumido):\n' +
      contents.map(function (c) { return '=== ' + c.path + ' ===\n' + c.content; }).join('\n\n');

    return askAI(prompt, { timeoutMs: 25000, maxTokens: 1800 }).then(function (r) {
      var report = r.text;
      var ok = !!(report && report.trim());
      emit(onStep, {
        id: 'ai', title: ok ? 'Informe generado' : 'El panel de IA no respondio a tiempo', status: ok ? 'done' : 'error',
        detail: ok ? (report.length + ' caracteres · respondido por ' + r.label) : ('Fallo tras ' + r.label + ' — pulsa "Analizar a fondo" para reintentar'),
      });
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

function readWhy(path) {
  var name = path.split('/').pop();
  if (/readme/i.test(name)) return 'El README suele explicar el proposito del proyecto y como usarlo.';
  if (name === 'package.json') return 'Define dependencias, scripts y el stack de JavaScript/Node.';
  if (name === 'requirements.txt' || name === 'pyproject.toml') return 'Define las dependencias de Python del proyecto.';
  if (name === 'go.mod') return 'Define el modulo y dependencias de Go.';
  if (name === 'Cargo.toml') return 'Define el paquete y dependencias de Rust.';
  if (name === 'manifest.json') return 'Indica que es una extension de navegador y sus permisos.';
  if (name === 'Dockerfile') return 'Indica como se construye y despliega el proyecto.';
  return 'Fichero de configuracion relevante para entender el proyecto.';
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

// ── Lectura de una URL que la propia IA decida consultar (documentacion,
// RFC, guia oficial...). Extraccion de texto simple (sin parser HTML real). ──
export function fetchUrlText(url) {
  return fetch(url, { headers: { 'Accept': 'text/html,text/plain' } })
    .then(function (r) { return r.ok ? r.text() : ''; })
    .then(function (html) {
      var text = String(html)
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return text.slice(0, 4000);
    })
    .catch(function () { return ''; });
}

// Extraccion tolerante de JSON de la respuesta de un modelo (puede venir con
// fences de markdown, comas colgantes, etc).
function extractJSON(txt) {
  if (!txt) return null;
  var cleaned = String(txt).replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
  var m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); }
  catch (e) {
    try {
      var fixed = m[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      return JSON.parse(fixed);
    } catch (e2) { return null; }
  }
}

// ── Constructor autonomo ──
// Dado un objetivo en texto libre (+ opcionalmente contexto de un repo ya
// analizado), X1: 1) interpreta el objetivo y lo divide en tareas concretas
// (usando el analisis de riesgos/recomendaciones del repo si el objetivo es
// amplio, p.ej. "arregla todos los problemas"), 2) por cada tarea investiga
// en GitHub/npm/StackOverflow y, si lo decide, lee una URL, 3) genera una
// propuesta concreta de ficheros a crear/modificar + titulo y descripcion de
// PR. Cada fase reporta pasos via onStep — el llamador (PRAgent.jsx) publica
// la propuesta automaticamente en cuanto esta lista, sin pedir confirmacion.
export function runAutoBuild(goal, repoCtx, onStep) {
  emit(onStep, { id: 'plan', title: 'Entendiendo el objetivo', status: 'active', detail: '"' + goal + '"' });

  var repoBlock = repoCtx
    ? '\nRepositorio de referencia: ' + repoCtx.repo + '\nInforme de analisis previo de X1 (usalo para identificar problemas CONCRETOS si el objetivo es amplio):\n' + String(repoCtx.report || '').slice(0, 4000) + '\n'
    : '\n(No hay un repositorio de referencia seleccionado; propon una investigacion util igualmente, sin poder detallar problemas concretos de codigo.)\n';

  var planPrompt =
    'Eres un agente de automatizacion de software autonomo. El usuario pide:\n"' + goal + '"\n' + repoBlock +
    '\nDivide esto en TAREAS concretas y accionables. Si el objetivo ya es especifico (una sola cosa clara), devuelve UNA tarea. ' +
    'Si el objetivo es amplio o vago (p.ej. "arregla todos los problemas", "mejora el proyecto", "revisa todo"), usa el informe de analisis de arriba para identificar hasta 5 problemas o recomendaciones CONCRETAS y crea una tarea por cada una — nombra ficheros reales del informe, no generalidades.\n\n' +
    'Responde SOLO con JSON (sin markdown, sin texto fuera del JSON) con esta forma exacta:\n' +
    '{"resumen":"una frase global de que vas a hacer","tareas":[' +
    '{"titulo":"titulo corto de la tarea","motivo":"por que hace falta, citando el informe o el objetivo",' +
    '"busquedas":["hasta 2 terminos de busqueda utiles (librerias, ejemplos, soluciones)"],' +
    '"leer_url":"una URL real y concreta (documentacion oficial, guia) si conoces una relevante, o null",' +
    '"archivos":[{"path":"ruta/al/archivo.ext","motivo":"por que hay que crear o modificar este fichero"}]}' +
    ']}\n' +
    'Maximo 5 tareas, maximo 3 archivos por tarea. Si una tarea no requiere tocar codigo (solo investigacion), deja "archivos" como [].';

  return askAI(planPrompt, { timeoutMs: 20000, maxTokens: 1200 }).then(function (r) {
    var parsed = extractJSON(r.text);
    var tareas = (parsed && Array.isArray(parsed.tareas) && parsed.tareas.length) ? parsed.tareas : [{ titulo: goal, motivo: goal, busquedas: [goal], leer_url: null, archivos: [] }];
    var resumen = (parsed && parsed.resumen) || goal;

    emit(onStep, {
      id: 'plan', title: 'Objetivo dividido en ' + tareas.length + ' tarea(s)', status: 'done',
      detail: resumen + ' · respondido por ' + r.label,
      why: tareas.map(function (t, i) { return (i + 1) + '. ' + t.titulo; }).join(' · '),
    });

    return runTasksSequentially(goal, tareas, repoCtx, onStep).then(function (results) {
      return aggregateProposal(resumen, tareas, results);
    });
  });
}

// Procesa las tareas UNA A UNA (no en paralelo) para que el log se lea como
// una secuencia clara — "Tarea 1/3", "Tarea 2/3"... — y para no saturar los
// proveedores de IA con llamadas simultaneas.
function runTasksSequentially(goal, tareas, repoCtx, onStep) {
  var results = [];
  var chain = Promise.resolve();
  tareas.forEach(function (tarea, i) {
    chain = chain.then(function () {
      var tag = 'Tarea ' + (i + 1) + '/' + tareas.length;
      emit(onStep, { id: 't' + i + ':title', title: tag + ': ' + tarea.titulo, status: 'done', detail: tarea.motivo });
      return runResearch(tarea, onStep, i).then(function (research) {
        return proposeChanges(goal, tarea, research, repoCtx, onStep, i).then(function (proposal) {
          results.push({ tarea: tarea, proposal: proposal });
        });
      });
    });
  });
  return chain.then(function () { return results; });
}

function runResearch(tarea, onStep, taskIdx) {
  var tagPrefix = 't' + taskIdx + ':';
  var searches = (tarea.busquedas || []).slice(0, 2);
  var researchSteps = [];

  var searchPromise = Promise.all(searches.map(function (term) {
    emit(onStep, { id: tagPrefix + 'search:' + term, title: 'Investigando: "' + term + '"', status: 'active' });
    return Promise.all([githubSearch(term), npmSearch(term), stackOverflowSearch(term)]).then(function (r) {
      var github = r[0] || [], npm = r[1] || [], so = r[2] || [];
      var found = github.length + npm.length + so.length;
      var topBits = [];
      if (github[0]) topBits.push('repo: ' + github[0].name);
      if (npm[0]) topBits.push('npm: ' + npm[0].name);
      if (so[0]) topBits.push('SO: ' + so[0].title);
      emit(onStep, {
        id: tagPrefix + 'search:' + term, title: 'Investigado: "' + term + '"',
        status: found ? 'done' : 'error',
        detail: found ? (github.length + ' repos · ' + npm.length + ' paquetes npm · ' + so.length + ' hilos SO') : 'Sin resultados',
        why: topBits.length ? 'Mas relevante: ' + topBits.join(' · ') : null,
      });
      researchSteps.push({ term: term, github: github, npm: npm, stackoverflow: so });
    });
  }));

  var urlPromise;
  if (tarea.leer_url) {
    emit(onStep, { id: tagPrefix + 'url', title: 'Leyendo pagina: ' + tarea.leer_url, status: 'active' });
    urlPromise = fetchUrlText(tarea.leer_url).then(function (text) {
      emit(onStep, {
        id: tagPrefix + 'url', title: 'Pagina leida: ' + tarea.leer_url,
        status: text ? 'done' : 'error',
        detail: text ? fmtBytes(text.length) + ' de texto extraido' : 'No se pudo leer la pagina',
        why: 'X1 decidio que esta pagina podia tener informacion relevante para esta tarea.',
      });
      return text;
    });
  } else {
    urlPromise = Promise.resolve('');
  }

  return Promise.all([searchPromise, urlPromise]).then(function (r) {
    return { searches: researchSteps, urlText: r[1] };
  });
}

function proposeChanges(goal, tarea, research, repoCtx, onStep, taskIdx) {
  var tagPrefix = 't' + taskIdx + ':';
  var files = tarea.archivos || [];
  if (!files.length) {
    emit(onStep, { id: tagPrefix + 'propose', title: 'Sin cambios de fichero para esta tarea', status: 'done', detail: 'Era de investigacion; revisa los resultados de arriba.' });
    return Promise.resolve({ titulo_pr: null, descripcion_pr: null, archivos: [] });
  }

  emit(onStep, { id: tagPrefix + 'read-existing', title: 'Leyendo estado actual de ' + files.length + ' fichero(s)', status: 'active' });
  var readExisting = repoCtx
    ? Promise.all(files.map(function (f) {
        return fetchFile(repoCtx.token, repoCtx.owner, repoCtx.name, f.path).then(function (existing) {
          return Object.assign({}, f, { current: existing.content, sha: existing.sha, exists: existing.exists });
        });
      }))
    : Promise.resolve(files.map(function (f) { return Object.assign({}, f, { current: '', sha: null, exists: false }); }));

  return readExisting.then(function (filesWithState) {
    emit(onStep, {
      id: tagPrefix + 'read-existing', title: 'Estado actual leido', status: 'done',
      detail: filesWithState.map(function (f) { return f.path + (f.exists ? ' (existente)' : ' (nuevo)'); }).join(', '),
    });

    emit(onStep, { id: tagPrefix + 'generate', title: 'Generando propuesta con panel de IA', status: 'active', why: 'Combina el objetivo, la investigacion y el contenido actual de cada fichero para escribir el cambio completo.' });

    var researchBlock = (research.searches || []).map(function (s) {
      var lines = [];
      s.github.forEach(function (r) { lines.push('- [repo] ' + r.name + ': ' + (r.description || '')); });
      s.npm.forEach(function (p) { lines.push('- [npm] ' + p.name + ': ' + (p.description || '')); });
      s.stackoverflow.forEach(function (q) { lines.push('- [SO] ' + q.title); });
      return 'Busqueda "' + s.term + '":\n' + lines.join('\n');
    }).join('\n\n');

    var urlBlock = research.urlText ? '\nContenido leido de ' + tarea.leer_url + ':\n' + research.urlText + '\n' : '';

    var prompt =
      'Eres un agente de automatizacion de software. Objetivo general del usuario:\n"' + goal + '"\n\n' +
      'Tarea concreta a resolver ahora: ' + tarea.titulo + '\nMotivo: ' + tarea.motivo + '\n\n' +
      'Investigacion realizada:\n' + (researchBlock || '(sin resultados relevantes)') + '\n' + urlBlock +
      '\nFicheros a crear/modificar (con su contenido ACTUAL si ya existen):\n' +
      filesWithState.map(function (f) { return '=== ' + f.path + ' (' + (f.exists ? 'existente' : 'nuevo') + ') ===\n' + (f.current || '(vacio, fichero nuevo)').slice(0, 1800); }).join('\n\n') +
      '\n\nResponde SOLO con JSON (sin markdown) con esta forma exacta:\n' +
      '{"titulo_pr":"titulo corto para esta tarea","descripcion_pr":"descripcion en espanol de que cambia y por que",' +
      '"archivos":[{"path":"mismo path de arriba","contenido":"contenido COMPLETO del fichero tras el cambio"}]}';

    return askAI(prompt, { timeoutMs: 35000, maxTokens: 3500 }).then(function (r) {
      var proposal = extractJSON(r.text);
      var ok = !!(proposal && Array.isArray(proposal.archivos) && proposal.archivos.length);
      emit(onStep, {
        id: tagPrefix + 'generate', title: ok ? 'Propuesta generada' : 'El panel de IA no devolvio una propuesta valida',
        status: ok ? 'done' : 'error',
        detail: (ok ? (proposal.archivos.length + ' fichero(s) listos para revisar') : 'Reintenta esta tarea con mas detalle') + ' · respondido por ' + r.label,
      });
      if (!ok) return { titulo_pr: null, descripcion_pr: null, archivos: [], error: true };
      var withSha = proposal.archivos.map(function (f) {
        var match = filesWithState.find(function (e) { return e.path === f.path; });
        return Object.assign({}, f, {
          sha: match ? match.sha : null, exists: match ? match.exists : false, motivo: match ? match.motivo : '',
          current: match ? match.current : '',
        });
      });
      return { titulo_pr: proposal.titulo_pr || tarea.titulo, descripcion_pr: proposal.descripcion_pr || tarea.motivo, archivos: withSha };
    });
  });
}

// Agrega los resultados de todas las tareas en una sola propuesta publicable:
// ficheros deduplicados por path (si dos tareas tocan el mismo fichero, gana
// la ultima) y un titulo/descripcion de PR que resume todas las tareas.
function aggregateProposal(resumen, tareas, results) {
  var allFiles = [];
  var seen = {};
  results.forEach(function (r) {
    (r.proposal.archivos || []).forEach(function (f) {
      if (seen[f.path] != null) { allFiles[seen[f.path]] = f; return; }
      seen[f.path] = allFiles.length;
      allFiles.push(f);
    });
  });

  var descripcion = results.map(function (r, i) {
    var t = r.tarea;
    return (i + 1) + '. ' + t.titulo + (r.proposal.descripcion_pr ? ' — ' + r.proposal.descripcion_pr : '');
  }).join('\n');

  var anyError = results.some(function (r) { return r.proposal.error; });

  return {
    titulo_pr: results.length === 1 ? (results[0].proposal.titulo_pr || resumen) : ('X1: ' + resumen),
    descripcion_pr: descripcion || resumen,
    archivos: allFiles,
    resumen: resumen,
    tareas: tareas.map(function (t, i) { return { titulo: t.titulo, motivo: t.motivo, archivos: (results[i] && results[i].proposal.archivos) || [] }; }),
    error: anyError && allFiles.length === 0,
  };
}

// Publica la propuesta como rama + commits + PR. Solo se llama cuando el
// usuario pulsa "Publicar cambios" — nunca de forma automatica.
export function publishAutoBuild(token, owner, repo, defaultBranch, proposal, onStep) {
  var branchName = 'x1/' + slugify(proposal.titulo_pr || 'auto-build') + '-' + Date.now().toString(36);

  emit(onStep, { id: 'branch', title: 'Creando rama ' + branchName, status: 'active' });
  return fetch(GH + '/repos/' + owner + '/' + repo + '/git/ref/heads/' + encodeURIComponent(defaultBranch), { headers: ghHeaders(token) })
    .then(function (r) { return r.json(); })
    .then(function (refData) {
      var baseSha = refData && refData.object && refData.object.sha;
      if (!baseSha) throw new Error('No se pudo leer la rama base');
      return fetch(GH + '/repos/' + owner + '/' + repo + '/git/refs', {
        method: 'POST', headers: ghHeaders(token),
        body: JSON.stringify({ ref: 'refs/heads/' + branchName, sha: baseSha }),
      });
    })
    .then(function (r) { if (!r.ok) throw new Error('No se pudo crear la rama'); })
    .then(function () {
      emit(onStep, { id: 'branch', title: 'Rama creada: ' + branchName, status: 'done' });
      var commitSteps = proposal.archivos.map(function (f) {
        emit(onStep, { id: 'commit:' + f.path, title: 'Escribiendo ' + f.path, status: 'active' });
        var body = {
          message: 'X1: ' + (proposal.titulo_pr || 'cambios automaticos') + ' — ' + f.path,
          content: btoa(unescape(encodeURIComponent(f.contenido || ''))),
          branch: branchName,
        };
        if (f.sha) body.sha = f.sha;
        return fetch(GH + '/repos/' + owner + '/' + repo + '/contents/' + f.path.split('/').map(encodeURIComponent).join('/'), {
          method: 'PUT', headers: ghHeaders(token), body: JSON.stringify(body),
        }).then(function (r) {
          emit(onStep, { id: 'commit:' + f.path, title: (r.ok ? 'Escrito ' : 'Fallo al escribir ') + f.path, status: r.ok ? 'done' : 'error' });
          return r.ok;
        });
      });
      return Promise.all(commitSteps);
    })
    .then(function (results) {
      if (results.indexOf(false) !== -1) throw new Error('Algunos ficheros no se pudieron escribir');
      emit(onStep, { id: 'pr', title: 'Abriendo Pull Request', status: 'active' });
      return fetch(GH + '/repos/' + owner + '/' + repo + '/pulls', {
        method: 'POST', headers: ghHeaders(token),
        body: JSON.stringify({
          title: proposal.titulo_pr || 'Cambios automaticos de X1',
          head: branchName, base: defaultBranch,
          body: (proposal.descripcion_pr || '') + '\n\n---\nGenerado autonomamente por X1.',
        }),
      });
    })
    .then(function (r) { return r.json(); })
    .then(function (pr) {
      if (!pr || !pr.html_url) throw new Error('No se pudo crear el Pull Request');
      emit(onStep, { id: 'pr', title: 'Pull Request creado', status: 'done', detail: pr.html_url });
      return { url: pr.html_url, number: pr.number, branch: branchName };
    })
    .catch(function (e) {
      emit(onStep, { id: 'pr', title: 'Error al publicar: ' + e.message, status: 'error' });
      throw e;
    });
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'cambio';
}
