const GITHUB_API = 'https://api.github.com';
const SEARCH_API = 'https://api.github.com/search';

let memoryStore = [];
const MEMORY_KEY = 'x1_memory';
const MAX_MEMORY = 50;

let actionLog = [];
const ACTION_KEY = 'x1_action_log';
const MAX_ACTIONS = 200;

let repoData = {};
const REPO_KEY = 'x1_repo_data';

export function loadMemory() {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (raw) memoryStore = JSON.parse(raw);
  } catch (e) { memoryStore = []; }
  return memoryStore;
}

export function saveMemory() {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memoryStore.slice(-MAX_MEMORY)));
  } catch (e) {}
}

export function addMemory(role, content) {
  memoryStore.push({ role, content, ts: Date.now() });
  if (memoryStore.length > MAX_MEMORY) memoryStore = memoryStore.slice(-MAX_MEMORY);
  saveMemory();
}

export function getMemoryContext() {
  return memoryStore.slice(-8).map(m =>
    (m.role === 'user' ? 'Usuario' : 'X1') + ': ' + m.content
  ).join('\n');
}

export function clearMemory() {
  memoryStore = [];
  saveMemory();
}

export function loadActionLog() {
  try {
    const raw = localStorage.getItem(ACTION_KEY);
    if (raw) actionLog = JSON.parse(raw);
  } catch (e) { actionLog = []; }
  return actionLog;
}

export function saveActionLog() {
  try {
    localStorage.setItem(ACTION_KEY, JSON.stringify(actionLog.slice(-MAX_ACTIONS)));
  } catch (e) {}
}

export function logAction(action) {
  actionLog.push({ ...action, ts: Date.now() });
  if (actionLog.length > MAX_ACTIONS) actionLog = actionLog.slice(-MAX_ACTIONS);
  saveActionLog();
}

export function loadRepoData() {
  try {
    const raw = localStorage.getItem(REPO_KEY);
    if (raw) repoData = JSON.parse(raw);
  } catch (e) { repoData = {}; }
  return repoData;
}

export function saveRepoData() {
  try {
    localStorage.setItem(REPO_KEY, JSON.stringify(repoData));
  } catch (e) {}
}

export function addToRepo(agentId, entry) {
  if (!repoData[agentId]) repoData[agentId] = [];
  repoData[agentId].push({ ...entry, ts: Date.now(), id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) });
  if (repoData[agentId].length > 100) repoData[agentId] = repoData[agentId].slice(-100);
  saveRepoData();
}

export function getRepoData(agentId) {
  return repoData[agentId] || [];
}

export function getAllRepoData() {
  return repoData;
}

export function isImportantAction(action) {
  const t = (action.query || action.description || '').toLowerCase();
  if (/contrato|contract|firma|sign|seleccion|selected|aceptado|acepte|proyecto|project|entrevista|interview|oferta|offer|empleo|job|trabajo|work|reunion|meeting|presentacion|presentation|pitch|demo|lanzamiento|launch|venta|sale|compra|purchase|inversion|investment|acuerdo|agreement|colaboracion|collaboration|partnership|cliente|client|usuario|user|registr|signup|pago|payment|factura|invoice|presupuesto|budget|-meta|goal|target|deadline|fecha|date|importante|important|recordatorio|reminder|idea|idea|decision|decision|plan|plan|estrategia|strategy|contacto|contact|email|correo|mensaje|message/.test(t)) return true;
  if (/buscar|search|google|que es|what is|define|explica|explain|leer|read|ver|view|scroll|naveg|navigate/.test(t)) return false;
  return false;
}

export function buildActionProcess(tools, query) {
  const steps = [];
  if (tools.includes('github')) steps.push({ app: 'github', description: 'Buscando en GitHub', status: 'done' });
  if (tools.includes('npm')) steps.push({ app: 'npm', description: 'Buscando en npm', status: 'done' });
  if (tools.includes('stackoverflow')) steps.push({ app: 'stackoverflow', description: 'Buscando en Stack Overflow', status: 'done' });
  if (tools.includes('web')) steps.push({ app: 'web', description: 'Buscando en la web', status: 'done' });
  if (tools.includes('gmail')) steps.push({ app: 'gmail', description: 'Leyendo Gmail', status: 'done' });
  if (tools.includes('calendar')) steps.push({ app: 'calendar', description: 'Consultando calendario', status: 'done' });
  return steps;
}

export function detectTools(query) {
  var t = query.toLowerCase().trim();
  if (/^(hola|buenas|hey|hi|hello|que tal|como estas|buen[ao]s|saludos|gracias|ok|vale|perfecto|chao|adiós|bye)$/i.test(t)) return [];
  var tools = [];
  if (/github|repo|repositorio|codigo fuente|source/.test(t)) tools.push('github');
  if (/buscar|search|investiga|que es|define|explica|encuentra/.test(t)) tools.push('github');
  if (/npm|paquete|package|dependencia/.test(t)) tools.push('npm');
  if (/stack.?overflow|solucion|error|bug/.test(t)) tools.push('stackoverflow');
  if (/recuerda|memory|memoria|guarda|recuerdo/.test(t)) tools.push('memory');
  if (tools.length === 0) tools.push('github', 'npm');
  return tools;
}

export async function githubSearch(query) {
  try {
    const r = await fetch(SEARCH_API + '/repositories?q=' + encodeURIComponent(query) + '&sort=stars&per_page=3');
    if (!r.ok) return null;
    const d = await r.json();
    return (d.items || []).map(repo => ({
      name: repo.full_name,
      description: repo.description || '',
      stars: repo.stargazers_count,
      language: repo.language,
      url: repo.html_url
    }));
  } catch (e) { return null; }
}

export async function githubSearchCode(query) {
  try {
    const r = await fetch(SEARCH_API + '/code?q=' + encodeURIComponent(query) + '&per_page=3');
    if (!r.ok) return null;
    const d = await r.json();
    return (d.items || []).map(item => ({
      name: item.name,
      path: item.path,
      repo: item.repository?.full_name,
      url: item.html_url
    }));
  } catch (e) { return null; }
}

export async function npmSearch(query) {
  try {
    const r = await fetch('https://registry.npmjs.org/-/v1/search?text=' + encodeURIComponent(query) + '&size=3');
    if (!r.ok) return null;
    const d = await r.json();
    return (d.objects || []).map(p => ({
      name: p.package?.name,
      description: p.package?.description,
      version: p.package?.version,
      url: 'https://www.npmjs.com/package/' + p.package?.name
    }));
  } catch (e) { return null; }
}

export async function stackOverflowSearch(query) {
  try {
    const r = await fetch('https://api.stackexchange.com/2.3/search?order=desc&sort=relevance&intitle=' + encodeURIComponent(query) + '&site=stackoverflow&pagesize=3');
    if (!r.ok) return null;
    const d = await r.json();
    return (d.items || []).map(q => ({
      title: q.title,
      answers: q.answer_count,
      score: q.score,
      url: q.link
    }));
  } catch (e) { return null; }
}

export async function executeTools(query) {
  const tools = detectTools(query);
  const results = {};
  const promises = tools.map(async tool => {
    switch (tool) {
      case 'github': {
        const repos = await githubSearch(query);
        if (repos) results.github = repos;
        const code = await githubSearchCode(query);
        if (code) results.code = code;
        break;
      }
      case 'npm': {
        const pkgs = await npmSearch(query);
        if (pkgs) results.npm = pkgs;
        break;
      }
      case 'stackoverflow': {
        const so = await stackOverflowSearch(query);
        if (so) results.stackoverflow = so;
        break;
      }
      case 'memory': {
        results.memory = getMemoryContext();
        break;
      }
    }
  });
  await Promise.allSettled(promises);
  return results;
}

export function buildResponse(query, toolResults) {
  const parts = [];
  const t = query.toLowerCase();

  if (toolResults.github && toolResults.github.length > 0) {
    parts.push(' Repositorios en GitHub:');
    toolResults.github.forEach(r => {
      parts.push(' ' + r.name + ' (' + r.stars + ' estrellas, ' + (r.language || 'N/A') + ')');
      if (r.description) parts.push('   ' + r.description);
      parts.push('   ' + r.url);
    });
  }

  if (toolResults.code && toolResults.code.length > 0) {
    parts.push(' Codigo encontrado:');
    toolResults.code.forEach(c => {
      parts.push(' ' + c.repo + '/' + c.path);
      parts.push('   ' + c.url);
    });
  }

  if (toolResults.npm && toolResults.npm.length > 0) {
    parts.push(' Paquetes npm:');
    toolResults.npm.forEach(p => {
      parts.push(' ' + p.name + ' v' + p.version + ': ' + (p.description || ''));
    });
  }

  if (toolResults.stackoverflow && toolResults.stackoverflow.length > 0) {
    parts.push(' Stack Overflow:');
    toolResults.stackoverflow.forEach(q => {
      parts.push(' ' + q.title + ' (' + q.answers + ' respuestas, score: ' + q.score + ')');
      parts.push('   ' + q.url);
    });
  }

  if (parts.length > 0) {
    return parts.join('\n');
  }

  return 'No encontre resultados para "' + query + '". Intenta con otros terminos.';
}
