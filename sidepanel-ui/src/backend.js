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
  if (/escribir|texto|articul|blog|contenido|documento|\bdoc\b|informe|carta|resume|resumen|ensayo|guion|guión|presentacion|presentación|slide|crea|genera|redacta/.test(t)) return 'writer';
  return 'research';
}

var SECTOR_BY_AGENT = {
  developer: 'Desarrollo',
  email:     'Comunicacion',
  meeting:   'Reuniones',
  marketing: 'Marketing',
  finance:   'Finanzas',
  legal:     'Legal',
  writer:    'Redaccion',
  research:  'Investigacion'
};

export function detectSector(query) {
  return SECTOR_BY_AGENT[getBestAgent(query)] || 'Investigacion';
}

export function sectorForAgent(agentId) {
  return SECTOR_BY_AGENT[agentId] || 'Investigacion';
}

export function getJudgeReason(query, agentId) {
  var t = query.toLowerCase();
  var agent = AGENTS.find(function(a) { return a.id === agentId; });
  var name = agent ? agent.name : agentId;
  var sector = sectorForAgent(agentId);
  var prefix = 'Sector detectado: ' + sector + '. ';
  return prefix + getJudgeReasonBody(t, name);
}

function getJudgeReasonBody(t, name) {

  if (/codigo|code|programa|funcion|componente|react|debug|script|api|html|css|bug|error/.test(t)) {
    return 'Detecte terminos de programacion y desarrollo. Selecciono ' + name + ' porque GPT-4o es el mas fuerte en generacion y analisis de codigo. Herramientas: busqueda en GitHub y npm para encontrar repos y paquetes relevantes.';
  }
  if (/email|correo|gmail|mensaje|redacta/.test(t)) {
    return 'Detecte intencion de comunicacion por correo. Selecciono ' + name + ' porque Llama esta optimizado para redaccion de emails profesionales. Herramientas: acceso a Gmail para contexto de mensajes anteriores.';
  }
  if (/reunion|meeting|calendario|agenda/.test(t)) {
    return 'Detecte contexto de reunion o calendario. Selecciono ' + name + ' porque Gemini tiene mejor integracion con Google Calendar. Herramientas: lectura de calendario y preparacion de agenda.';
  }
  if (/marketing|ventas|campana|seo/.test(t)) {
    return 'Detecte terminos de marketing y ventas. Selecciono ' + name + ' porque Gemini analiza tendencias de mercado. Herramientas: busqueda web para datos de mercado y competencia.';
  }
  if (/finanzas|inversion|budget|dinero|stock/.test(t)) {
    return 'Detecte contexto financiero. Selecciono ' + name + ' porque Claude analiza datos numericos con precision. Herramientas: busqueda de datos financieros y cotizaciones.';
  }
  if (/legal|contrato|ley/.test(t)) {
    return 'Detecte terminos legales. Selecciono ' + name + ' porque Mistral interpreta documentos juridicos. Herramientas: busqueda de regulaciones y precedent legal.';
  }
  if (/escribir|texto|articul|blog|contenido|documento|\bdoc\b|informe|carta|resume|resumen|ensayo|guion|guión|presentacion|presentación|slide|crea|genera|redacta/.test(t)) {
    return 'Detecte intencion de redaccion o creacion de contenido. Selecciono ' + name + ' porque Claude genera documentos y textos de alta calidad. Herramientas: analisis de tono, estructura y estilo.';
  }
  return 'Consulta general sin keywords especificos. Selecciono ' + name + ' como investigador por defecto. Gemini sintetiza informacion de multiples fuentes: GitHub, npm y Stack Overflow.';
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

// Un intento de enviar la consulta al SW. Resuelve {text} o {woke:true} si el
// puerto se cerro (SW dormido) para poder reintentar, o null si falla de verdad.
function engineAttempt(query) {
  return new Promise(function(resolve) {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
      resolve({ text: null }); return;
    }
    var settled = false;
    var timer = setTimeout(function() {
      if (settled) return; settled = true; resolve({ text: null });
    }, 24000);
    try {
      chrome.runtime.sendMessage({ type: 'VOICE_COMMAND_EXEC', command: query, wantsText: true }, function(resp) {
        if (settled) return; settled = true; clearTimeout(timer);
        if (chrome.runtime.lastError) { resolve({ text: null, woke: true }); return; }
        var text = resp && (resp.text || resp.error);
        resolve({ text: text ? String(text) : null });
      });
    } catch (e) {
      if (!settled) { settled = true; clearTimeout(timer); resolve({ text: null, woke: true }); }
    }
  });
}

// Envia la consulta al motor real (service-worker via VOICE_COMMAND_EXEC).
// Reintenta una vez si el primer intento fallo por SW dormido (puerto cerrado).
export async function sendToEngine(query) {
  var first = await engineAttempt(query);
  if (first.text) return first.text;
  if (first.woke) {
    await new Promise(function(r) { setTimeout(r, 500); });
    var second = await engineAttempt(query);
    if (second.text) return second.text;
  }
  return null;
}

export async function smartQuery(query, agentId) {
  T.addMemory('user', query);
  var sector = sectorForAgent(agentId);

  if (isGreeting(query)) {
    var hour = new Date().getHours();
    var saludo = hour < 12 ? 'Buenos dias' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
    var greet = saludo + '! Soy X1, tu asistente de IA. Puedo ayudarte a buscar repositorios en GitHub, paquetes npm, soluciones en Stack Overflow y mas. En que puedo ayudarte?';
    T.addMemory('assistant', greet);
    return { response: greet, tools: [], judgeReason: null, sector: sector };
  }

  var judgeReason = getJudgeReason(query, agentId);

  // 1) Motor real (cascada de IA + juez del backend).
  var engineText = await sendToEngine(query);
  if (engineText && engineText.trim()) {
    T.addMemory('assistant', engineText);
    return { response: engineText, tools: [], judgeReason: judgeReason, sector: sector };
  }

  // 2) Fallback local inteligente: aunque no haya motor, damos una respuesta util.
  var localFallback = buildLocalFallback(query, agentId, sector);
  T.addMemory('assistant', localFallback);
  return { response: localFallback, tools: [], judgeReason: judgeReason, sector: sector };
}

// Respuesta local cuando el motor de IA no esta disponible.
// Analiza la consulta y produce una respuesta util basada en patrones.
function buildLocalFallback(query, agentId, sector) {
  var t = query.toLowerCase().trim();
  var agent = AGENTS.find(function(a) { return a.id === agentId; });
  var agentName = agent ? agent.name : 'X1';

  // Saludo
  if (isGreeting(query)) {
    return 'Hola. Soy X1 en modo local (sin conexion al motor de IA). Puedo orientarte mientras se restablece el motor. En que puedo ayudarte?';
  }

  // Pregunta de identidad o ayuda
  if (/^(quien eres|que eres|como te llamas|que puedes hacer|que sabes hacer|ayuda|help|que haces)/.test(t)) {
    return 'Soy System X1, un asistente multi-agente. Cada agente esta especializado en un sector (Desarrollo, Email, Reuniones, Marketing, Finanzas, Legal, Redaccion, Investigacion). El agente ' + agentName + ' esta activo ahora. Cuando el motor de IA este disponible, podre darte respuestas completas; mientras tanto, puedo orientarte.';
  }

  // Intenta busqueda en herramientas aunque no parezca obvio
  var searchTools = T.detectTools(query);
  if (searchTools.length > 0) {
    // Dejamos que executeTools haga su trabajo en la rama offline original
    // (este path no se ejecuta porque smartQuery ya retorno antes si habia tools)
    return null;
  }

  // Pregunta general de programacion -> sugerir busqueda
  if (/codigo|code|programa|funcion|componente|react|debug|script|api|html|css|bug|error/.test(t)) {
    return 'Modo local activo. Para tu consulta de desarrollo, te sugiero buscar en GitHub o npm. Prueba: "busca repositorios de ' + query.replace(/^(busca|buscar|encuentra|encuentrame)\s+/i, '').slice(0, 60) + ' en github" o "busca paquetes npm de ' + query.replace(/^(busca|buscar|encuentra|encuentrame)\s+/i, '').slice(0, 60) + '".';
  }

  // Pregunta de email -> sugerir gmail
  if (/email|correo|gmail|mensaje|redacta/.test(t)) {
    return 'Modo local. Para emails puedo acceder a Gmail si inicias sesion. Prueba a conectarte desde la pestana de Ajustes. Mientras tanto, dime el destinatario y el tema y preparo un borrador.';
  }

  // Pregunta de reunion -> sugerir calendar
  if (/reunion|meeting|calendario|agenda/.test(t)) {
    return 'Modo local. Para reuniones puedo leer Google Calendar si inicias sesion. Prueba "mostrame las reuniones de hoy" cuando estes autenticado.';
  }

  // Respuesta generica orientada
  return 'Modo local activo (motor de IA temporalmente no disponible). ' + agentName + ' esta seleccionado para el sector ' + sector + '. Para consultas de busqueda, prueba con palabras como "github", "npm" o "stackoverflow" para que use las herramientas disponibles. Ejemplo: "busca en github ' + query.slice(0, 50) + '".';
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
