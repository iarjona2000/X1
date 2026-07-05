import * as T from './tools.js';

const AI = '../assets/ai/';

export const AGENTS = [
  { id: 'auto',      name: 'AUTO',      ai: 'Automatico',  letter: 'A', color: '#656d76', aiIcon: null,             sector: 'general',     desc: 'Selecciona la mejor IA segun la consulta' },
  { id: 'research',   name: 'Research',   ai: 'Gemini',      letter: 'R', color: '#4285f4', aiIcon: AI + 'googlegemini.svg', sector: 'investigacion', desc: 'Analisis profundo y síntesis de información' },
  { id: 'writer',     name: 'Writer',     ai: 'Claude',      letter: 'W', color: '#d97706', aiIcon: AI + 'anthropic.svg',    sector: 'escritura',    desc: 'Contenido creativo y redacción profesional' },
  { id: 'developer',  name: 'Developer',  ai: 'GPT-4o',      letter: 'D', color: '#10a37f', aiIcon: AI + 'openai.svg',       sector: 'tecnologia',   desc: 'Código, arquitectura y resolución de bugs' },
  { id: 'marketing',  name: 'Marketing',  ai: 'Gemini',      letter: 'M', color: '#4285f4', aiIcon: AI + 'googlegemini.svg', sector: 'marketing',    desc: 'Estrategia digital, SEO y campañas' },
  { id: 'finance',    name: 'Finance',    ai: 'Claude',      letter: 'F', color: '#d97706', aiIcon: AI + 'anthropic.svg',    sector: 'finanzas',     desc: 'Análisis financiero, inversiones y presupuestos' },
  { id: 'legal',      name: 'Legal',      ai: 'Mistral',     letter: 'L', color: '#ff7000', aiIcon: AI + 'mistralai.svg',    sector: 'legal',        desc: 'Contratos, compliance y asesoría jurídica' },
  { id: 'email',      name: 'Email',      ai: 'Llama',       letter: 'E', color: '#0668e1', aiIcon: AI + 'meta.svg',         sector: 'comunicacion', desc: 'Redacción de emails y gestión de correo' },
  { id: 'meeting',    name: 'Meeting',    ai: 'Gemini',      letter: 'G', color: '#4285f4', aiIcon: AI + 'googlegemini.svg', sector: 'reuniones',    desc: 'Preparación y seguimiento de reuniones' },
];

export function agentById(id) {
  return AGENTS.find(a => a.id === id) || AGENTS[0];
}

export function getAgentReasoning(query) {
  const t = query.toLowerCase();
  if (/codigo|code|programa|funcion|componente|react|debug|script|api|html|css|bug|error|bug|deploy|build/.test(t)) {
    return { agent: 'developer', reason: 'Detecté términos técnicos de programación. GPT-4o es el más fuerte en código.' };
  }
  if (/email|correo|gmail|mensaje|redacta|escribir email/.test(t)) {
    return { agent: 'email', reason: 'Detecté intención de comunicación por correo. Llama optimiza la redacción.' };
  }
  if (/reunion|meeting|calendario|agenda|preparar/.test(t)) {
    return { agent: 'meeting', reason: 'Detecté contexto de reunión. Gemini gestiona calendarios y agendas.' };
  }
  if (/marketing|ventas|campana|seo|publicidad|marca/.test(t)) {
    return { agent: 'marketing', reason: 'Detecté términos de marketing. Gemini analiza tendencias digitales.' };
  }
  if (/finanzas|inversion|budget|dinero|stock|presupuesto|conta/.test(t)) {
    return { agent: 'finance', reason: 'Detecté contexto financiero. Claude analiza datos con precisión.' };
  }
  if (/legal|contrato|ley|regulacion|compliance|firma/.test(t)) {
    return { agent: 'legal', reason: 'Detecté términos legales. Mistral interpreta documentos jurídicos.' };
  }
  if (/escribir|texto|articul|blog|contenido|redactar|copy/.test(t)) {
    return { agent: 'writer', reason: 'Detecté intención de escritura creativa. Claude genera contenido de calidad.' };
  }
  return { agent: 'research', reason: 'Consulta general. Gemini sintetiza información de múltiples fuentes.' };
}

function summarizeForAgent(agent, results) {
  const parts = [];
  const hasGithub = results.github && results.github.length > 0;
  const hasCode = results.code && results.code.length > 0;
  const hasNpm = results.npm && results.npm.length > 0;
  const hasSO = results.stackoverflow && results.stackoverflow.length > 0;

  if (hasGithub) {
    const top = results.github[0];
    parts.push('Encontré ' + results.github.length + ' repositorios relevantes.');
    parts.push('El más popular es ' + top.name + ' (' + top.stars + ' estrellas, ' + (top.language || 'N/A') + ').');
    if (top.description) parts.push('Descripción: ' + top.description);
    if (results.github.length > 1) {
      parts.push('También hay ' + (results.github.length - 1) + ' repositorios más que podrían ser útiles.');
    }
  }

  if (hasNpm) {
    const top = results.npm[0];
    parts.push('En npm encontré ' + results.npm.length + ' paquetes. El más relevante es ' + top.name + ' v' + top.version + '.');
    if (top.description) parts.push(top.description);
  }

  if (hasSO) {
    const top = results.stackoverflow[0];
    parts.push('En Stack Overflow hay ' + results.stackoverflow.length + ' discusiones relevantes. La mejor es: "' + top.title + '" con ' + top.answers + ' respuestas.');
  }

  if (hasCode) {
    parts.push('Encontré ' + results.code.length + ' archivos de código relevantes.');
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(' ');
}

const GREETINGS = /^(hola|buenas|hey|hi|hello|que tal|como estas|buen[ao]s|saludos|gracias|ok|vale|perfecto|chao|adios|bye|buenos dias|buenas tardes|buenas noches|que onda|que hay|que pas|whats up|sup|hey|xup|yep|nope|si|no|dale|vamos|genial|increible|bien|mal|regular|mas o menos|asi asi|comprendo|entendido|entiendo|perfecto|excelente|genial|fantastico|maravilloso|ok then|cool|nice|good|bad|fine|great|awesome|amazing|hello there|good morning|good afternoon|good evening)$/i;

function isGreeting(q) {
  return GREETINGS.test(q.trim());
}

export async function smartQuery(query, agentId) {
  T.addMemory('user', query);

  if (isGreeting(query)) {
    var hour = new Date().getHours();
    var saludo = hour < 12 ? 'Buenos dias' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
    var response = saludo + '! Soy X1, tu asistente de IA. Cada agente tiene su propio repositorio y sector especializado. En que puedo ayudarte?';
    T.addMemory('assistant', response);
    return { response: response, tools: [], process: [], reasoning: null };
  }

  var isAuto = agentId === 'auto';
  var reasoning = isAuto ? getAgentReasoning(query) : null;
  var selectedAgent = isAuto ? reasoning.agent : agentId;
  var agent = agentId === 'auto' ? 'auto' : selectedAgent;

  var toolResults = await T.executeTools(query);
  var summary = summarizeForAgent(selectedAgent, toolResults);
  var response;

  if (summary) {
    response = summary;
  } else {
    response = 'Encontre información relevante para tu consulta. ¿Quieres que profundice en algún aspecto específico?';
  }

  T.addMemory('assistant', response);

  var toolsUsed = Object.keys(toolResults).filter(function(k) {
    if (k === 'github' && toolResults.github && toolResults.github.length > 0) return true;
    if (k === 'code' && toolResults.code && toolResults.code.length > 0) return true;
    if (k === 'npm' && toolResults.npm && toolResults.npm.length > 0) return true;
    if (k === 'stackoverflow' && toolResults.stackoverflow && toolResults.stackoverflow.length > 0) return true;
    return false;
  });

  var process = T.buildActionProcess(toolsUsed, query);

  if (T.isImportantAction({ query: query })) {
    T.addToRepo(selectedAgent, {
      type: 'action',
      query: query,
      response: response.substring(0, 500),
      tools: toolsUsed,
      agent: selectedAgent,
    });
  }

  T.logAction({
    query: query,
    agent: selectedAgent,
    tools: toolsUsed,
    isImportant: T.isImportantAction({ query: query }),
  });

  return {
    response: response,
    tools: toolsUsed,
    process: process,
    reasoning: reasoning,
    agent: selectedAgent,
  };
}

export function getMemoryContext() { return T.getMemoryContext(); }
export function addMemory(role, content) { T.addMemory(role, content); }
export function clearMemory() { T.clearMemory(); }
export function loadMemory() { return T.loadMemory(); }

export function getRepoData(agentId) { return T.getRepoData(agentId); }
export function getAllRepoData() { return T.getAllRepoData(); }
export function loadRepoData() { return T.loadRepoData(); }

export function checkGoogleAuth() {
  return new Promise(resolve => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) { resolve(false); return; }
    chrome.runtime.sendMessage({ type: 'X1_AUTH_CHECK_GOOGLE' }, resp => {
      if (chrome.runtime.lastError) { resolve(false); return; }
      resolve(resp?.logged ?? false);
    });
  });
}

export function loginGoogle() {
  return new Promise(resolve => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) { resolve(false); return; }
    chrome.runtime.sendMessage({ type: 'X1_AUTH_LOGIN_GOOGLE' }, resp => {
      if (chrome.runtime.lastError) { resolve(false); return; }
      resolve(resp?.ok ?? false);
    });
  });
}

export function logoutGoogle() {
  return new Promise(resolve => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) { resolve(false); return; }
    chrome.runtime.sendMessage({ type: 'X1_AUTH_LOGOUT_GOOGLE' }, resp => {
      if (chrome.runtime.lastError) { resolve(false); return; }
      resolve(resp?.ok ?? false);
    });
  });
}

export function checkGithubAuth() {
  return new Promise(resolve => {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) { resolve(false); return; }
      chrome.storage.local.get('github_user', r => resolve(!!(r?.github_user?.login)));
    } catch (e) { resolve(false); }
  });
}

export function loginGithub() {
  return new Promise(function(resolve, reject) {
    if (typeof chrome === 'undefined' || !chrome.identity) {
      reject(new Error('chrome.identity no disponible'));
      return;
    }
    var clientId = 'Ov23limUz0ywpxqoPJXo';
    var redirectUrl = chrome.identity.getRedirectURL();
    var authUrl = 'https://github.com/login/oauth/authorize?client_id=' + clientId +
      '&redirect_uri=' + encodeURIComponent(redirectUrl) +
      '&scope=read:user user:email repo';
    var timedOut = false;
    var timer = setTimeout(function() {
      timedOut = true;
      reject(new Error('Tiempo de espera agotado.'));
    }, 30000);
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, function(redirectUrl) {
      if (timedOut) return;
      clearTimeout(timer);
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!redirectUrl) { reject(new Error('Cancelado por el usuario')); return; }
      try {
        var urlObj = new URL(redirectUrl);
        var code = urlObj.searchParams.get('code');
        if (!code) { reject(new Error('No se obtuvo codigo de autorizacion')); return; }
        resolve({ code: code });
      } catch (e) { reject(new Error('URL de respuesta invalida')); }
    });
  });
}

export function startGithubDeviceFlow() {
  return fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      client_id: 'Ov23limUz0ywpxqoPJXo',
      scope: 'read:user user:email repo'
    })
  }).then(function(r) {
    if (!r.ok) {
      return r.json().then(function(data) {
        throw new Error(data.error_description || 'Error HTTP ' + r.status);
      }, function() {
        throw new Error('Error HTTP ' + r.status + ' al contactar GitHub');
      });
    }
    return r.json();
  }).then(function(data) {
    if (data.error) throw new Error(data.error_description || data.error);
    return {
      device_code: data.device_code,
      user_code: data.user_code,
      verification_uri: data.verification_uri || 'https://github.com/login/device',
      interval: data.interval || 5
    };
  });
}

export function pollGithubToken(device_code) {
  return new Promise(function(resolve, reject) {
    var attempts = 0;
    var maxAttempts = 60;
    function poll() {
      if (attempts >= maxAttempts) { reject(new Error('Tiempo de espera agotado')); return; }
      attempts++;
      fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          client_id: 'Ov23limUz0ywpxqoPJXo',
          client_secret: '7997bfe3d604dfbc9f6c65bbb46620d44cfe26c8',
          device_code: device_code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        })
      }).then(function(r) { return r.json(); }).then(function(data) {
        if (data.access_token) { resolve(data.access_token); return; }
        if (data.error === 'authorization_pending') { setTimeout(poll, 5000); return; }
        if (data.error === 'slow_down') { setTimeout(poll, 8000); return; }
        if (data.error === 'expired_token') { reject(new Error('El codigo ha expirado. Intenta de nuevo.')); return; }
        if (data.error === 'access_denied') { reject(new Error('Autorizacion denegada.')); return; }
        setTimeout(poll, 5000);
      }).catch(function() { setTimeout(poll, 5000); });
    }
    poll();
  });
}

export function exchangeGithubCode(code) {
  return fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ client_id: 'Ov23limUz0ywpxqoPJXo', client_secret: '7997bfe3d604dfbc9f6c65bbb46620d44cfe26c8', code })
  }).then(r => r.json()).then(data => {
    if (data.error) throw new Error(data.error_description || data.error);
    if (!data.access_token) throw new Error('No token');
    return data.access_token;
  });
}

export function fetchGithubUser(token) {
  return fetch('https://api.github.com/user', {
    headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' }
  }).then(r => r.json()).then(info => {
    if (info.message) throw new Error(info.message);
    const user = { login: info.login, name: info.name, avatar_url: info.avatar_url, email: info.email };
    try { chrome.storage.local.set({ github_token: token, github_user: user }); } catch (e) {}
    return user;
  });
}

export function fetchGithubRepos(token) {
  return fetch('https://api.github.com/user/repos?sort=updated&per_page=10', {
    headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' }
  }).then(r => r.json()).then(repos => {
    if (!Array.isArray(repos)) return [];
    return repos.map(r => ({
      name: r.full_name,
      description: r.description || '',
      language: r.language,
      stars: r.stargazers_count,
      updated: r.updated_at,
      url: r.html_url,
      private: r.private,
    }));
  }).catch(() => []);
}

export function fetchGithubStarred(token) {
  return fetch('https://api.github.com/user/starred?sort=updated&per_page=10', {
    headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' }
  }).then(r => r.json()).then(repos => {
    if (!Array.isArray(repos)) return [];
    return repos.map(r => ({
      name: r.full_name,
      description: r.description || '',
      language: r.language,
      stars: r.stargazers_count,
      url: r.html_url,
    }));
  }).catch(() => []);
}

export function fetchGithubIssues(token) {
  return fetch('https://api.github.com/user/issues?sort=updated&per_page=10&state=open', {
    headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' }
  }).then(r => r.json()).then(issues => {
    if (!Array.isArray(issues)) return [];
    return issues.map(i => ({
      title: i.title,
      repo: i.repository_url?.split('/').slice(-2).join('/'),
      state: i.state,
      url: i.html_url,
      created: i.created_at,
    }));
  }).catch(() => []);
}

export function createGithubRepo(token, name, description) {
  return fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name, description: description, private: true, auto_init: true })
  }).then(r => r.json()).then(data => {
    if (data.message) throw new Error(data.message);
    return { name: data.full_name, url: data.html_url, private: data.private };
  });
}

export function pushToGithubRepo(token, repoName, path, content, message) {
  return fetch('https://api.github.com/repos/' + repoName + '/contents/' + path, {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: message, content: btoa(unescape(encodeURIComponent(content))), })
  }).then(r => r.json()).then(data => {
    if (data.message) throw new Error(data.message);
    return { sha: data.content?.sha, url: data.content?.html_url };
  });
}

export function readGithubRepoFile(token, repoName, path) {
  return fetch('https://api.github.com/repos/' + repoName + '/contents/' + path, {
    headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' }
  }).then(r => r.json()).then(data => {
    if (data.message) return null;
    return decodeURIComponent(escape(atob(data.content || '')));
  }).catch(() => null);
}

export function logoutGithub() {
  return new Promise(resolve => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.remove(['github_token', 'github_user'], () => resolve(true));
      } else { resolve(false); }
    } catch (e) { resolve(false); }
  });
}

export function getGithubUser() {
  return new Promise(resolve => {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) { resolve(null); return; }
      chrome.storage.local.get('github_user', r => resolve(r?.github_user || null));
    } catch (e) { resolve(null); }
  });
}

export function getGithubToken() {
  return new Promise(resolve => {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) { resolve(null); return; }
      chrome.storage.local.get('github_token', r => resolve(r?.github_token || null));
    } catch (e) { resolve(null); }
  });
}

export function hasEngine() {
  return typeof chrome !== 'undefined' && !!(chrome.runtime?.sendMessage);
}

export function loadConversations() {
  try {
    const raw = localStorage.getItem('x1_conversations');
    if (raw) { const d = JSON.parse(raw); if (Array.isArray(d)) return d; }
  } catch (e) {}
  return [];
}

export function saveConversations(list) {
  try { localStorage.setItem('x1_conversations', JSON.stringify(list.slice(0, 100))); } catch (e) {}
}

export function getUser() {
  try {
    const raw = localStorage.getItem('x1_user');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function saveUser(user) {
  try { localStorage.setItem('x1_user', JSON.stringify(user)); } catch (e) {}
}
