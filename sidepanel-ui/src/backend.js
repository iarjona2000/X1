import * as T from './tools.js';

const AI = '../assets/ai/';

export const AGENTS = [
  { id: 'research',   name: 'Research',   ai: 'Gemini',  aiIcon: AI + 'googlegemini.svg',  color: '#4285f4' },
  { id: 'writer',     name: 'Writer',     ai: 'Claude',  aiIcon: AI + 'anthropic.svg',     color: '#d97706' },
  { id: 'developer',  name: 'Developer',  ai: 'GPT-4o',  aiIcon: AI + 'openai.svg',         color: '#10a37f' },
  { id: 'marketing',  name: 'Marketing',  ai: 'Gemini',  aiIcon: AI + 'googlegemini.svg',  color: '#4285f4' },
  { id: 'finance',    name: 'Finance',    ai: 'Claude',  aiIcon: AI + 'anthropic.svg',     color: '#d97706' },
  { id: 'legal',      name: 'Legal',      ai: 'Mistral', aiIcon: AI + 'mistralai.svg',     color: '#ff7000' },
  { id: 'email',      name: 'Email',      ai: 'Llama',   aiIcon: AI + 'meta.svg',          color: '#0668e1' },
  { id: 'meeting',    name: 'Meeting',    ai: 'Gemini',  aiIcon: AI + 'googlegemini.svg',  color: '#4285f4' }
];

export function agentById(id) {
  return AGENTS.find(a => a.id === id) || AGENTS[0];
}

export function getBestAgent(query) {
  const t = query.toLowerCase();
  if (/codigo|code|programa|funcion|componente|react|debug|script|api|html|css|bug|error/.test(t)) return 'developer';
  if (/email|correo|gmail|mensaje|redacta/.test(t)) return 'email';
  if (/reunion|meeting|calendario|agenda/.test(t)) return 'meeting';
  if (/marketing|ventas|campana|seo/.test(t)) return 'marketing';
  if (/finanzas|inversion|budget|dinero|stock/.test(t)) return 'finance';
  if (/legal|contrato|ley/.test(t)) return 'legal';
  if (/escribir|texto|articul|blog|contenido/.test(t)) return 'writer';
  return 'research';
}

function summarizeRepos(repos) {
  if (!repos || repos.length === 0) return '';
  return repos.map(r =>
    r.name + ' (' + (r.language || 'N/A') + ', ' + formatNumber(r.stars) + ' stars)' +
    (r.description ? '\n  ' + r.description : '')
  ).join('\n');
}

function summarizeCode(code) {
  if (!code || code.length === 0) return '';
  return code.map(c => c.repo + '/' + c.path).join('\n');
}

function summarizePkgs(pkgs) {
  if (!pkgs || pkgs.length === 0) return '';
  return pkgs.map(p => p.name + ' v' + p.version + (p.description ? ' - ' + p.description : '')).join('\n');
}

function summarizeSO(so) {
  if (!so || so.length === 0) return '';
  return so.map(q => q.title + ' (' + q.answers + ' respuestas)').join('\n');
}

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n;
}

const GREETINGS = /^(hola|buenas|hey|hi|hello|que tal|como estas|buen[ao]s|saludos|gracias|ok|vale|perfecto|chao|adios|bye|buenos dias|buenas tardes|buenas noches|que onda|que hay|que pas|whats up|sup|hey|xup|yep|nope|si|no|dale|vamos|genial|increible|bien|mal|regular|mas o menos|asi asi|comprendo|entendido|entiendo|perfecto|excelente|genial|fantastico|maravilloso|ok then|cool|nice|good|bad|fine|great|awesome|amazing|hello there|good morning|good afternoon|good evening)$/i;

function isGreeting(q) {
  return GREETINGS.test(q.trim());
}

function buildSmartResponse(query, results) {
  var t = query.toLowerCase();

  if (isGreeting(query)) {
    var hour = new Date().getHours();
    var saludo = hour < 12 ? 'Buenos dias' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
    return saludo + '! Soy X1, tu asistente de IA. Puedo ayudarte a buscar repositorios en GitHub, paquetes npm, soluciones en Stack Overflow y mas. En que puedo ayudarte?';
  }

  var parts = [];
  var hasGithub = results.github && results.github.length > 0;
  var hasCode = results.code && results.code.length > 0;
  var hasNpm = results.npm && results.npm.length > 0;
  var hasSO = results.stackoverflow && results.stackoverflow.length > 0;

  if (hasGithub) {
    parts.push('Encontre ' + results.github.length + ' repositorios en GitHub:\n');
    results.github.forEach(function(r, i) {
      parts.push((i + 1) + '. ' + r.name);
      if (r.description) parts.push('   ' + r.description);
      parts.push('   ' + formatNumber(r.stars) + ' stars | ' + (r.language || 'N/A') + '\n');
    });
  }

  if (hasCode) {
    parts.push('Codigo relevante encontrado:');
    results.code.forEach(function(c) {
      parts.push('  ' + c.repo + '/' + c.path);
    });
  }

  if (hasNpm) {
    parts.push('Paquetes npm:');
    results.npm.forEach(function(p) {
      parts.push('  ' + p.name + ' v' + p.version + (p.description ? ': ' + p.description : ''));
    });
  }

  if (hasSO) {
    parts.push('Soluciones en Stack Overflow:');
    results.stackoverflow.forEach(function(q) {
      parts.push('  ' + q.title + ' (' + q.answers + ' respuestas)');
    });
  }

  if (parts.length === 0) {
    return 'No encontre resultados para "' + query + '". Intenta con otros terminos o revisa la ortografia.';
  }

  return parts.join('\n');
}

export async function smartQuery(query, agentId) {
  T.addMemory('user', query);
  if (isGreeting(query)) {
    var hour = new Date().getHours();
    var saludo = hour < 12 ? 'Buenos dias' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
    var response = saludo + '! Soy X1, tu asistente de IA. Puedo ayudarte a buscar repositorios en GitHub, paquetes npm, soluciones en Stack Overflow y mas. En que puedo ayudarte?';
    T.addMemory('assistant', response);
    return { response: response, tools: [] };
  }
  var toolResults = await T.executeTools(query);
  var response = buildSmartResponse(query, toolResults);
  T.addMemory('assistant', response);
  var toolsUsed = Object.keys(toolResults).filter(function(k) {
    if (k === 'github' && toolResults.github && toolResults.github.length > 0) return true;
    if (k === 'code' && toolResults.code && toolResults.code.length > 0) return true;
    if (k === 'npm' && toolResults.npm && toolResults.npm.length > 0) return true;
    if (k === 'stackoverflow' && toolResults.stackoverflow && toolResults.stackoverflow.length > 0) return true;
    return false;
  });
  return { response: response, tools: toolsUsed };
}

export function getMemoryContext() { return T.getMemoryContext(); }
export function addMemory(role, content) { T.addMemory(role, content); }
export function clearMemory() { T.clearMemory(); }
export function loadMemory() { return T.loadMemory(); }

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
      '&scope=read:user+user:email';
    var timedOut = false;
    var timer = setTimeout(function() {
      timedOut = true;
      reject(new Error('Tiempo de espera agotado. Revisa que la URL de callback este registrada en tu GitHub App.'));
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
      scope: 'read:user user:email'
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
