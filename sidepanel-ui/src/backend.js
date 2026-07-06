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
// opts.forceJudge activa panel+juez con timeout largo (informes exhaustivos);
// opts.clientTimeoutMs ajusta cuanto espera este lado antes de rendirse.
function engineAttempt(query, opts) {
  opts = opts || {};
  return new Promise(function(resolve) {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
      resolve({ text: null }); return;
    }
    var settled = false;
    var clientTimeoutMs = opts.clientTimeoutMs || 24000;
    var timer = setTimeout(function() {
      if (settled) return; settled = true; resolve({ text: null });
    }, clientTimeoutMs);
    try {
      chrome.runtime.sendMessage({
        type: 'VOICE_COMMAND_EXEC', command: query, wantsText: true,
        forceJudge: !!opts.forceJudge, timeoutMs: opts.timeoutMs, maxTokens: opts.maxTokens,
      }, function(resp) {
        if (settled) return; settled = true; clearTimeout(timer);
        if (chrome.runtime.lastError) { resolve({ text: null, woke: true }); return; }
        var text = resp && (resp.text || resp.error);
        resolve({ text: text ? String(text) : null, provider: resp && resp.provider, attempts: resp && resp.attempts });
      });
    } catch (e) {
      if (!settled) { settled = true; clearTimeout(timer); resolve({ text: null, woke: true }); }
    }
  });
}

// Igual que sendToEngine pero devuelve tambien metadata de que IA respondio
// (backend.js._provider / _attempts, ver firstWins() en service-worker.js),
// para poder explicar en la UI quien contesto exactamente.
export async function sendToEngineMeta(query, opts) {
  var first = await engineAttempt(query, opts);
  if (first.text) return { text: first.text, provider: first.provider, attempts: first.attempts };
  if (first.woke) {
    await new Promise(function(r) { setTimeout(r, 500); });
    var second = await engineAttempt(query, opts);
    if (second.text) return { text: second.text, provider: second.provider, attempts: second.attempts };
  }
  return { text: null, provider: null, attempts: null };
}

// Envia la consulta al motor real (service-worker via VOICE_COMMAND_EXEC).
// Reintenta una vez si el primer intento fallo por SW dormido (puerto cerrado).
export async function sendToEngine(query, opts) {
  var r = await sendToEngineMeta(query, opts);
  return r.text;
}

export async function smartQuery(query, agentId) {
  T.addMemory('user', query);
  var sector = sectorForAgent(agentId);

  if (isGreeting(query)) {
    var hour = new Date().getHours();
    var saludo = hour < 12 ? 'Buenos dias' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
    var greet = saludo + '! Soy System X1. Tengo 8 agentes especializados (Research, Writer, Developer, Marketing, Finance, Legal, Email, Meeting). En que puedo ayudarte?';
    T.addMemory('assistant', greet);
    return { response: greet, tools: [], judgeReason: null, sector: sector };
  }

  var judgeReason = getJudgeReason(query, agentId);

  // 1) Motor real (cascada de IA + juez del backend via VOICE_COMMAND_EXEC).
  var engineText = await sendToEngine(query);
  if (engineText && engineText.trim() && !/^(Procesando\.\.\.|Tiempo de espera|Error de conexion)/.test(engineText.trim())) {
    T.addMemory('assistant', engineText);
    return { response: engineText, tools: [], judgeReason: judgeReason, sector: sector };
  }

  // 2) Tools integradas: si el agente o la query sugieren herramientas, ejecutarlas.
  var toolResults = null;
  try { toolResults = await T.executeTools(query, agentId); } catch (e) { toolResults = null; }
  var toolText = null;
  try { toolText = T.formatToolResults(query, toolResults || {}); } catch (e) { toolText = null; }

  if (toolText) {
    var toolsUsed = T.toolsUsedList(toolResults || {});
    T.addMemory('assistant', toolText);
    var intro = 'No tengo motor de IA activo, pero encontre esto con mis herramientas:\n\n';
    return { response: intro + toolText, tools: toolsUsed, judgeReason: judgeReason, sector: sector };
  }

  // 3) Fallback local ultimo recurso
  var localFallback = buildLocalFallback(query, agentId, sector);
  T.addMemory('assistant', localFallback);
  return { response: localFallback, tools: [], judgeReason: judgeReason, sector: sector };
}

// Respuesta local cuando el motor de IA no esta disponible.
function buildLocalFallback(query, agentId, sector) {
  var t = query.toLowerCase().trim();
  var agent = AGENTS.find(function(a) { return a.id === agentId; });
  var agentName = agent ? agent.name : 'X1';

  if (isGreeting(query)) {
    return 'Hola. Soy System X1 en modo local (motor de IA offline). Puedo orientarte. En que puedo ayudarte?';
  }

  if (/^(quien eres|que eres|como te llamas|que puedes hacer|que sabes hacer|ayuda|help|que haces)/.test(t)) {
    return 'Soy System X1, asistente multi-agente con 8 especialistas: Research (Gemini), Writer (Claude), Developer (GPT-4o), Marketing (Gemini), Finance (Claude), Legal (Mistral), Email (Llama), Meeting (Gemini). Actualmente el agente ' + agentName + ' esta activo para el sector ' + sector + '. Cuando el motor este disponible, hare analisis completos. Mientras, puedo buscar en GitHub, npm, Stack Overflow si incluyes keywords como "github", "npm" o "error".';
  }

  if (/codigo|code|programa|funcion|componente|react|debug|script|api|html|css|bug|error/.test(t)) {
    return 'Consulta de desarrollo detectada (sector ' + sector + ', agente ' + agentName + '). El motor de IA esta offline. Para resultados inmediatos puedo buscar en GitHub y npm. Prueba con: **"busca en github ' + query.replace(/^(busca|buscar|encuentra|encuentrame|necesito|quiero|dame)\s+/i, '').slice(0, 50) + '"** o **"busca paquetes npm de ' + query.replace(/^(busca|buscar|encuentra|encuentrame|necesito|quiero|dame)\s+/i, '').slice(0, 50) + '"**.';
  }

  // Email
  if (/email|correo|gmail|mensaje|redacta/.test(t)) {
    return 'Modo local activo. Para emails puedo acceder a Gmail si inicias sesion con Google (pestana Ajustes). Mientras, dime el destinatario y tema y preparo un borrador aqui mismo.';
  }

  // Redaccion / Writer
  if (/documento|doc|writer|redaccion|redactar|escribir|texto|informe|propuesta|carta|ensayo|articulo|plantilla|resume|resumen|ensayo|guion|presentacion|slide/.test(t)) {
    return 'Modo local. ' + agentName + ' esta seleccionado para Redaccion. Dime el tipo de documento y el tema, y te genero un borrador estructurado ahora mismo. Ejemplo: "escribe un email de seguimiento para un cliente".';
  }

  // Marketing
  if (/marketing|ventas|campana|seo|anuncio|ad|estrategia/.test(t)) {
    return 'Sector Marketing, agente ' + agentName + '. Motor offline. Dime el producto/servicio y el objetivo, y te propongo una estructura de campana.';
  }

  // Finance
  if (/finanzas|inversion|budget|dinero|stock|cotizacion|mercado/.test(t)) {
    return 'Sector Finanzas, agente ' + agentName + '. Motor offline. Para cotizaciones en tiempo real necesito conexion. Dime que activo te interesa y te doy contexto general.';
  }

  // Legal
  if (/legal|contrato|ley|clausula|terminos/.test(t)) {
    return 'Sector Legal, agente ' + agentName + '. Motor offline. Puedo orientarte con clausulas tipo o estructura contractual. Dime el tipo de contrato.';
  }

  // Reuniones
  if (/reunion|meeting|calendario|agenda|preparar|prepara/.test(t)) {
    return 'Sector Reuniones, agente ' + agentName + '. Motor offline. Para integracion con Calendar necesitas iniciar sesion Google. Mientras, dime que reunion quieres preparar y hago agenda.';
  }

  // Pregunta conceptual -> guiar
  if (/^(que es|que son|define|definicion|explica|explicame|cual es|cuales son|como funciona|como se hace|por que|para que)/.test(t)) {
    return 'Pregunta conceptual en modo local. Motor offline. Para buscar informacion, reformula con "github", "npm" o "busca" en tu consulta.';
  }

  // Generica orientada
  return 'Modo local (motor offline). Agente ' + agentName + ', sector ' + sector + '. Para mejores resultados:\n- Codigo/busqueda: incluye "github", "npm" o "error" en tu consulta\n- Redaccion: dime tipo de documento y tema\n- Emails: "destinatario+tema"\nCuando el motor este activo, dare respuestas completas.';
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
        throw new Error(data.error_description || ('Error HTTP ' + r.status));
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

// Proxy CORS-friendly para Device Flow GitHub (vía Cloudflare Worker).
// Resuelve el problema "Device Flow must be explicitly enabled for this App"
// y los errores de CORS si el navegador bloquea la petición directa.
const GITHUB_PROXY_URL = 'https://c-bos-proxy.calezamindset.workers.dev';

export function startGithubDeviceFlowViaProxy() {
  return fetch(GITHUB_PROXY_URL + '/github/device/code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: 'Ov23limUz0ywpxqoPJXo',
      scope: 'read:user user:email'
    })
  }).then(function(r) { return r.json(); });
}

export function pollGithubTokenViaProxy(device_code) {
  return new Promise(function(resolve, reject) {
    var attempts = 0;
    var maxAttempts = 60;
    function poll() {
      if (attempts >= maxAttempts) { reject(new Error('Tiempo de espera agotado')); return; }
      attempts++;
      fetch(GITHUB_PROXY_URL + '/github/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: 'Ov23limUz0ywpxqoPJXo',
          client_secret: '7997bfe3d604dfbc9f6c65bbb46620d44cfe26c8',
          device_code: device_code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        })
      }).then(function(r) { return r.json(); }).then(function(data) {
        if (data.error === 'authorization_pending') { setTimeout(poll, 5000); return; }
        if (data.error === 'slow_down') { setTimeout(poll, 8000); return; }
        if (data.error === 'expired_token') { reject(new Error('El codigo ha expirado')); return; }
        if (data.error === 'access_denied') { reject(new Error('Autorizacion denegada')); return; }
        if (data.access_token) { resolve(data.access_token); return; }
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

export function validateGithubToken(token) {
  return fetch('https://api.github.com/user', {
    headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' }
  }).then(r => {
    if (!r.ok) throw new Error('Token inválido (HTTP ' + r.status + ')');
    return r.json();
  }).then(info => {
    if (info.message) throw new Error(info.message);
    if (!info.login) throw new Error('No login en respuesta');
    var user = { login: info.login, name: info.name, avatar_url: info.avatar_url, email: info.email };
    try { chrome.storage.local.set({ github_token: token, github_user: user }); } catch (e) {}
    return user;
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
