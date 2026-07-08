import * as T from './tools.js';

const AI = '../assets/ai/';
const PROXY_URL = 'https://x1-proxy.calezamindset.workers.dev/v1/chat/completions';
const PROXY_SECRET = '9ff4b7dda5f7defd5f7fb7c32c133428bc87e8efeb8550d3ce1e5838c1d3b850';

// Prompts de sistema por sector — cada uno describe un rol + modelo open-source diferente.
const SECTOR_PROMPTS = {
  developer: 'Eres un arquitecto de software experto, entrenado sobre Qwen3 Coder 480B (open source, Alibaba). Responde EN ESPAÑOL con ejemplos de codigo funcionales, buenas practicas y explicaciones claras. Usa `codigo` para bloques, **negrita** para conceptos clave. Cuando sea relevante, menciona repositorios open-source de referencia.',
  writer: 'Eres un escritor profesional, entrenado sobre Llama 4 Maverick 17B (open source, Meta). Responde EN ESPAÑOL con textos fluidos, bien estructurados y adaptados al tono solicitado. Usa **negrita** para titulos, listas para enumerar. Crea contenido original de alta calidad literaria.',
  research: 'Eres un investigador entrenado sobre Gemini 2.0 Flash (Google). Responde EN ESPAÑOL con informacion estructurada, datos precisos y referencias. Usa **negrita** para terminos clave, listas para clasificar, y proporciona contexto profundo.',
  marketing: 'Eres un estratega de marketing entrenado sobre Nemotron 3 Ultra 550B (open source, NVIDIA). Responde EN ESPAÑOL con analisis de mercado, estrategias accionables y metricas. Usa **negrita** para KPIs, listas para canales y acciones.',
  finance: 'Eres un analista financiero entrenado sobre GLM 5.1 (open source, Zhipu AI). Responde EN ESPAÑOL con datos numericos precisos, tendencias y riesgos. Usa **negrita** para cifras clave y terminos financieros.',
  legal: 'Eres un asesor legal entrenado sobre Mistral Small (open source, Mistral AI). Responde EN ESPAÑOL con lenguaje juridico claro, citando clausulas y estructuras contractuales. Usa **negrita** para terminos legales importantes.',
  email: 'Eres un ejecutivo de cuentas entrenado sobre Llama 3.3 70B (open source, Meta via Groq). Responde EN ESPAÑOL con correos profesionales, claros y efectivos. Estructura: asunto, saludo, cuerpo, despedida.',
  meeting: 'Eres un asistente ejecutivo entrenado sobre Gemini 2.0 Flash (Google). Responde EN ESPAÑOL con agendas de reunion, resumenes ejecutivos y seguimiento de accion. Usa **negrita** para roles y fechas.',
};

export const AGENTS = [
  { id: 'research',   name: 'Research',   ai: 'Gemini',      repo: 'google/gemini',         aiIcon: AI + 'googlegemini.svg',  color: '#4285f4' },
  { id: 'writer',     name: 'Writer',     ai: 'Llama 4',     repo: 'meta/llama',            aiIcon: AI + 'anthropic.svg',     color: '#d97706' },
  { id: 'developer',  name: 'Developer',  ai: 'Qwen3 Coder', repo: 'QwenLM/Qwen',           aiIcon: AI + 'openai.svg',         color: '#10a37f' },
  { id: 'marketing',  name: 'Marketing',  ai: 'Nemotron',    repo: 'nvidia/nemotron',       aiIcon: AI + 'googlegemini.svg',  color: '#4285f4' },
  { id: 'finance',    name: 'Finance',    ai: 'GLM 5.1',     repo: 'THUDM/GLM-5',           aiIcon: AI + 'anthropic.svg',     color: '#d97706' },
  { id: 'legal',      name: 'Legal',      ai: 'Mistral',     repo: 'mistralai/mistral',     aiIcon: AI + 'mistralai.svg',     color: '#ff7000' },
  { id: 'email',      name: 'Email',      ai: 'Llama 3.3',   repo: 'meta/llama',            aiIcon: AI + 'meta.svg',          color: '#0668e1' },
  { id: 'meeting',    name: 'Meeting',    ai: 'Gemini',      repo: 'google/gemini',         aiIcon: AI + 'googlegemini.svg',  color: '#4285f4' }
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
  developer: 'Desarrollo', email: 'Comunicacion', meeting: 'Reuniones',
  marketing: 'Marketing', finance: 'Finanzas', legal: 'Legal',
  writer: 'Redaccion', research: 'Investigacion'
};

export function detectSector(query) { return SECTOR_BY_AGENT[getBestAgent(query)] || 'Investigacion'; }
export function sectorForAgent(agentId) { return SECTOR_BY_AGENT[agentId] || 'Investigacion'; }

export function getJudgeReason(query, agentId) {
  var t = query.toLowerCase();
  var agent = AGENTS.find(function(a) { return a.id === agentId; });
  var name = agent ? agent.name : agentId;
  var model = agent ? agent.ai : 'IA';
  var repo = agent ? agent.repo : '';
  var sector = sectorForAgent(agentId);
  var reason = '**Sector:** ' + sector + '  \n**Agente:** ' + name + '  \n**Modelo:** ' + model + ' (open source: [' + repo + '](https://github.com/' + repo + '))  \n';

  if (/codigo|code|programa/.test(t)) reason += '**Motivo:** Terminos de programacion detectados. Qwen3 Coder 480B es el modelo open-source mas potente para generacion de codigo.';
  else if (/email|correo|gmail/.test(t)) reason += '**Motivo:** Intencion de correo detectada. Llama 3.3 70B via Groq optimizado para redaccion profesional.';
  else if (/reunion|meeting/.test(t)) reason += '**Motivo:** Contexto de reunion detectado. Gemini 2.0 Flash integra Google Calendar.';
  else if (/marketing|ventas/.test(t)) reason += '**Motivo:** Terminos de marketing detectados. Nemotron 3 Ultra analiza tendencias de mercado.';
  else if (/finanzas|inversion/.test(t)) reason += '**Motivo:** Contexto financiero detectado. GLM 5.1 preciso con datos numericos.';
  else if (/legal|contrato/.test(t)) reason += '**Motivo:** Terminos legales detectados. Mistral Small interpreta documentos juridicos.';
  else if (/escribir|texto|articul/.test(t)) reason += '**Motivo:** Redaccion detectada. Llama 4 Maverick genera texto creativo de alta calidad.';
  else reason += '**Motivo:** Consulta general. Gemini 2.0 Flash sintetiza informacion multi-fuente.';

  reason += '\n\n**Infraestructura:** Proxy Cloudflare Worker → cascada de IAs open-source (Groq, NVIDIA NIM).';
  return reason;
}

const GREETINGS = /^(hola|buenas|hey|hi|hello|que tal|como estas|buen[ao]s|saludos|gracias|ok|vale|perfecto|chao|adios|bye|buenos dias|buenas tardes|buenas noches|que onda|que hay|que pas|whats up|sup|hey|xup|yep|nope|si|no|dale|vamos|genial|increible|bien|mal|regular|mas o menos|asi asi|comprendo|entendido|entiendo|perfecto|excelente|genial|fantastico|maravilloso|ok then|cool|nice|good|bad|fine|great|awesome|amazing|hello there|good morning|good afternoon|good evening)$/i;
function isGreeting(q) { return GREETINGS.test(q.trim()); }

var proxyLastFail = 0;
export async function callAI(query, opts) {
  opts = opts || {};
  if (Date.now() - proxyLastFail < 5000) return null;
  var startedAt = Date.now();
  var maxTokens = opts.maxTokens || 2000;
  var timeoutMs = opts.timeoutMs || 20000;
  try {
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, timeoutMs);
    var response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-X1-Auth': PROXY_SECRET },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: opts.systemPrompt || 'Eres System X1. Responde EN ESPAÑOL de forma clara y util.' },
          { role: 'user', content: query }
        ],
        max_tokens: maxTokens,
        temperature: opts.temperature || 0.1
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    proxyLastFail = 0;
    if (!response.ok) {
      var errData; try { errData = await response.json(); } catch (e) { errData = {}; }
      proxyLastFail = Date.now();
      return { error: errData.error || ('HTTP ' + response.status), provider: 'proxy' };
    }
    var data = await response.json();
    var text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
    if (!text) return { error: 'empty_response', provider: data.x_provider || 'proxy' };
    return { text: text, model: data.model || 'desconocido', provider: data.x_provider || 'proxy', latencyMs: Date.now() - startedAt };
  } catch (e) {
    proxyLastFail = Date.now();
    return { error: e.name === 'AbortError' ? 'timeout' : (e.message || 'error'), provider: 'proxy' };
  }
}

export async function smartQuery(query, agentId) {
  T.addMemory('user', query);
  var sector = sectorForAgent(agentId);
  var agent = AGENTS.find(function(a) { return a.id === agentId; });

  if (isGreeting(query)) {
    var res = await callAI(query, { maxTokens: 300, temperature: 0.7 });
    var greet = res && res.text ? res.text : 'Hola! Soy System X1. En que puedo ayudarte?';
    T.addMemory('assistant', greet);
    return { response: greet, tools: [], judgeReason: null, sector: sector, model: res && res.model || null, provider: res && res.provider || null, latencyMs: res && res.latencyMs || 0, agentName: agent ? agent.name : 'X1', agentModel: agent ? agent.ai : 'IA', agentRepo: agent ? agent.repo : '' };
  }

  var judgeReason = getJudgeReason(query, agentId);

  // 1) IA por sector: cada sector usa su propio system prompt + modelo open-source
  var systemPrompt = SECTOR_PROMPTS[agentId] || SECTOR_PROMPTS.research;
  var aiResult = await callAI(query, { systemPrompt: systemPrompt });
  if (aiResult && aiResult.text) {
    T.addMemory('assistant', aiResult.text);
    return {
      response: aiResult.text, tools: [],
      judgeReason: judgeReason, sector: sector,
      model: aiResult.model, provider: aiResult.provider, latencyMs: aiResult.latencyMs,
      agentName: agent ? agent.name : 'X1', agentModel: agent ? agent.ai : 'IA', agentRepo: agent ? agent.repo : ''
    };
  }

  // 2) Tools (GitHub/npm/SO) cuando la IA falla
  var toolResults = null;
  try { toolResults = await T.executeTools(query, agentId); } catch (e) { toolResults = null; }
  var toolText = null;
  try { toolText = T.formatToolResults(query, toolResults || {}); } catch (e) { toolText = null; }
  if (toolText) {
    var toolsUsed = T.toolsUsedList(toolResults || {});
    T.addMemory('assistant', toolText);
    return { response: 'El motor IA esta temporalmente sin conexion. Resultados de busqueda:\n\n' + toolText, tools: toolsUsed, judgeReason: judgeReason, sector: sector, agentName: agent ? agent.name : 'X1', agentModel: agent ? agent.ai : 'IA', agentRepo: agent ? agent.repo : '' };
  }

  // 3) Fallback local
  var localFallback = buildLocalFallback(query, agentId, sector);
  T.addMemory('assistant', localFallback);
  return { response: localFallback, tools: [], judgeReason: judgeReason, sector: sector, agentName: agent ? agent.name : 'X1', agentModel: agent ? agent.ai : 'IA', agentRepo: agent ? agent.repo : '' };
}

function buildLocalFallback(query, agentId, sector) {
  var t = query.toLowerCase().trim();
  var agent = AGENTS.find(function(a) { return a.id === agentId; });
  var agentName = agent ? agent.name : 'X1';
  var agentAI = agent ? agent.ai : 'IA';

  if (isGreeting(query)) return 'Hola. Soy System X1 en modo local (sin conexion IA). Puedo orientarte.';
  if (/^(quien eres|que eres|como te llamas|que puedes hacer|que sabes hacer|ayuda|help|que haces)/.test(t))
    return 'Soy **System X1**. Uso modelos open-source de GitHub. **' + agentName + '** (' + agentAI + ') activo para **' + sector + '**.';
  if (/codigo|code|programa|funcion|componente|react|debug|script|api|html|css|bug|error/.test(t))
    return '**Consulta de desarrollo.** Agente: ' + agentName + ' (' + agentAI + '). IA offline. Prueba: **"busca en github..."**';
  if (/email|correo|gmail|mensaje|redacta/.test(t))
    return '**Sector Comunicacion.** IA offline. Dime destinatario + tema y preparo borrador.';
  if (/documento|doc|writer|redaccion|redactar|escribir|texto|informe|propuesta|carta|ensayo|articulo|plantilla|resume|resumen|ensayo|guion|presentacion|slide/.test(t))
    return '**Sector Redaccion.** IA offline. Dime tipo de documento y tema, genero borrador.';
  if (/marketing|ventas|campana|seo|anuncio|ad|estrategia/.test(t))
    return '**Marketing.** IA offline. Dime producto/objetivo para estructura de campana.';
  if (/finanzas|inversion|budget|dinero|stock|cotizacion|mercado/.test(t))
    return '**Finanzas.** IA offline. Dime activo para contexto general.';
  if (/legal|contrato|ley|clausula|terminos/.test(t))
    return '**Legal.** IA offline. Dime tipo de contrato para orientacion.';
  if (/reunion|meeting|calendario|agenda|preparar|prepara/.test(t))
    return '**Reuniones.** IA offline. Dime reunion para preparar agenda.';
  if (/^(que es|que son|define|definicion|explica|explicame|cual es|cuales son|como funciona|como se hace|por que|para que)/.test(t))
    return '**Busqueda conceptual.** IA offline. Prueba con **"busca en github..."**';
  return '**Modo local.** Agente **' + agentName + '** (' + agentAI + '), sector **' + sector + '**. IA offline.';
}

export { getMemoryContext, addMemory, clearMemory, loadMemory } from './tools.js';

// ── Auth helpers ──
export function hasEngine() { return typeof chrome !== 'undefined' && !!(chrome.runtime?.sendMessage); }

export function loadConversations() { try { var raw = localStorage.getItem('x1_conversations'); if (raw) { var d = JSON.parse(raw); if (Array.isArray(d)) return d; } } catch (e) {} return []; }
export function saveConversations(list) { try { localStorage.setItem('x1_conversations', JSON.stringify(list.slice(0, 100))); } catch (e) {} }
export function getUser() { try { var raw = localStorage.getItem('x1_user'); if (raw) return JSON.parse(raw); } catch (e) {} return null; }
export function saveUser(user) { try { localStorage.setItem('x1_user', JSON.stringify(user)); } catch (e) {} }

export function checkGoogleAuth() { return new Promise(function(resolve) { if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) { resolve({logged:false}); return; } chrome.runtime.sendMessage({ type: 'X1_AUTH_CHECK_GOOGLE' }, function(resp) { if (chrome.runtime.lastError) { resolve({logged:false}); return; } resolve(resp || {logged:false}); }); }); }
export function loginGoogle() { return new Promise(function(resolve) { if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) { resolve(null); return; } chrome.runtime.sendMessage({ type: 'X1_AUTH_LOGIN_GOOGLE' }, function(resp) { if (chrome.runtime.lastError) { resolve(null); return; } resolve(resp && resp.ok ? resp : null); }); }); }
export function logoutGoogle() { return new Promise(function(resolve) { if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) { resolve(false); return; } chrome.runtime.sendMessage({ type: 'X1_AUTH_LOGOUT_GOOGLE' }, function(resp) { if (chrome.runtime.lastError) { resolve(false); return; } resolve(resp?.ok ?? false); }); }); }
export function getGoogleUser() { return new Promise(function(resolve) { if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) { resolve(null); return; } chrome.runtime.sendMessage({ type: 'X1_AUTH_CHECK_GOOGLE' }, function(resp) { if (chrome.runtime.lastError) { resolve(null); return; } resolve(resp?.user || null); }); }); }
export function checkGithubAuth() { return new Promise(function(resolve) { try { if (typeof chrome === 'undefined' || !chrome.storage?.local) { resolve(false); return; } chrome.storage.local.get('github_user', function(r) { resolve(!!(r?.github_user?.login)); }); } catch (e) { resolve(false); } }); }
// Abre el popup REAL de GitHub (github.com/login/oauth/authorize — usuario/
// contraseña + pantalla "Authorize"), vía chrome.identity.launchWebAuthFlow.
// Devuelve el authorization `code`; para canjearlo por un token hace falta el
// client_secret de la app, que NUNCA debe vivir en el codigo de la extension
// (el codigo de una extension desempaquetada es legible por cualquiera — asi
// se filtro el secreto anterior). Por eso loginGithubOAuth() abajo manda el
// code al Worker (que guarda el secreto server-side) en vez de canjearlo aqui.
export function loginGithub() { return new Promise(function(resolve, reject) { if (typeof chrome === 'undefined' || !chrome.identity) { reject(new Error('chrome.identity no disponible')); return; } var clientId = 'Ov23limUz0ywpxqoPJXo'; var redirectUrl = chrome.identity.getRedirectURL(); var authUrl = 'https://github.com/login/oauth/authorize?client_id=' + clientId + '&redirect_uri=' + encodeURIComponent(redirectUrl) + '&scope=read:user+user:email'; var timedOut = false; var timer = setTimeout(function() { timedOut = true; reject(new Error('Tiempo agotado')); }, 60000); chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, function(responseUrl) { if (timedOut) return; clearTimeout(timer); if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; } if (!responseUrl) { reject(new Error('Cancelado')); return; } try { var urlObj = new URL(responseUrl); var code = urlObj.searchParams.get('code'); if (!code) { reject(new Error('Sin codigo en la respuesta')); return; } resolve({ code: code, redirectUrl: redirectUrl }); } catch (e) { reject(new Error('URL invalida')); } }); }); }

function exchangeGithubCode(code, redirectUrl) {
  return fetch('https://x1-proxy.calezamindset.workers.dev/github/exchange', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code, redirect_uri: redirectUrl }),
  }).then(function (r) { return r.json(); }).then(function (data) {
    if (!data || !data.access_token) throw new Error((data && data.error) || 'No se pudo canjear el codigo de GitHub');
    return data.access_token;
  });
}

// Flujo completo: popup real de GitHub -> canje seguro via Worker -> guarda
// usuario+token. Esto es lo que debe llamar el boton "Continuar con GitHub".
export function loginGithubOAuth() {
  return loginGithub().then(function (r) {
    return exchangeGithubCode(r.code, r.redirectUrl);
  }).then(function (token) {
    return fetchGithubUser(token);
  });
}
export function fetchGithubUser(token) { return fetch('https://api.github.com/user', { headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' } }).then(function(r) { return r.json(); }).then(function(info) { if (info.message) throw new Error(info.message); var user = { login: info.login, name: info.name, avatar_url: info.avatar_url, email: info.email }; try { chrome.storage.local.set({ github_token: token, github_user: user }); } catch (e) {} return user; }); }
export function fetchGithubRepos(token) { return fetch('https://api.github.com/user/repos?sort=updated&per_page=10', { headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' } }).then(function(r) { return r.json(); }).then(function(repos) { if (!Array.isArray(repos)) return []; return repos.map(function(r) { return { name: r.full_name, description: r.description || '', language: r.language, stars: r.stargazers_count, url: r.html_url }; }); }).catch(function() { return []; }); }
export function fetchGithubStarred(token) { return fetch('https://api.github.com/user/starred?sort=updated&per_page=10', { headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' } }).then(function(r) { return r.json(); }).then(function(repos) { if (!Array.isArray(repos)) return []; return repos.map(function(r) { return { name: r.full_name, description: r.description || '', language: r.language, stars: r.stargazers_count, url: r.html_url }; }); }).catch(function() { return []; }); }
export function fetchGithubIssues(token) { return fetch('https://api.github.com/user/issues?sort=updated&per_page=10&state=open', { headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' } }).then(function(r) { return r.json(); }).then(function(issues) { if (!Array.isArray(issues)) return []; return issues.map(function(i) { return { title: i.title, repo: i.repository_url?.split('/').slice(-2).join('/'), state: i.state, url: i.html_url }; }); }).catch(function() { return []; }); }
export function logoutGithub() { return new Promise(function(resolve) { try { if (typeof chrome !== 'undefined' && chrome.storage?.local) { chrome.storage.local.remove(['github_token', 'github_user'], function() { resolve(true); }); } else { resolve(false); } } catch (e) { resolve(false); } }); }
export function getGithubUser() { return new Promise(function(resolve) { try { if (typeof chrome === 'undefined' || !chrome.storage?.local) { resolve(null); return; } chrome.storage.local.get('github_user', function(r) { resolve(r?.github_user || null); }); } catch (e) { resolve(null); } }); }
export function getGithubToken() { return new Promise(function(resolve) { try { if (typeof chrome === 'undefined' || !chrome.storage?.local) { resolve(null); return; } chrome.storage.local.get('github_token', function(r) { resolve(r?.github_token || null); }); } catch (e) { resolve(null); } }); }
export function validateGithubToken(token) { return fetch('https://api.github.com/user', { headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' } }).then(function(r) { if (!r.ok) throw new Error('Token invalido'); return r.json(); }).then(function(info) { if (info.message) throw new Error(info.message); if (!info.login) throw new Error('No login'); var user = { login: info.login, name: info.name, avatar_url: info.avatar_url, email: info.email }; try { chrome.storage.local.set({ github_token: token, github_user: user }); } catch (e) {} return user; }); }
