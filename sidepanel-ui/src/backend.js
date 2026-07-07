import * as T from './tools.js';

T.loadMemory();

const AI = '../assets/ai/';
const PROXY_URL = 'https://x1-proxy.calezamindset.workers.dev/v1/chat/completions';
const PROXY_SECRET = '9ff4b7dda5f7defd5f7fb7c32c133428bc87e8efeb8550d3ce1e5838c1d3b850';

var AGENT_PROVIDER_MAP = {
  developer:  { provider: 'nvidia-qwen',    model: 'Qwen3 Coder 480B',   repo: 'QwenLM/Qwen',         source: 'Alibaba' },
  writer:     { provider: 'nvidia-llama',   model: 'Llama 4 Maverick 17B', repo: 'meta/llama',           source: 'Meta' },
  research:   { provider: 'gemini',         model: 'Gemini 2.0 Flash',    repo: 'google/gemini',        source: 'Google' },
  marketing:  { provider: 'nvidia-nemotron', model: 'Nemotron 3 Ultra 550B', repo: 'nvidia/nemotron',     source: 'NVIDIA' },
  finance:    { provider: 'nvidia-glm',     model: 'GLM 5.1',             repo: 'THUDM/GLM-5',          source: 'Zhipu AI' },
  legal:      { provider: 'kimi-together',  model: 'Kimi K2',             repo: 'moonshotai/Kimi-K2',    source: 'Moonshot AI' },
  email:      { provider: 'groq',           model: 'Llama 3.3 70B',       repo: 'meta/llama',           source: 'Meta via Groq' },
  meeting:    { provider: 'gemini',         model: 'Gemini 2.0 Flash',    repo: 'google/gemini',        source: 'Google' },
};

var SECTOR_PROMPTS = {
  developer: 'Eres un arquitecto de software experto. Modelo activo: Qwen3 Coder 480B (Alibaba, open source).\n\n## Estándares de Código\n- SIEMPRE crear objetos nuevos, NUNCA mutar: usa spread operator `{...obj, prop: val}`\n- Archivos pequeños (200-400 líneas, máximo 800). Muchos archivos pequeños > pocos grandes\n- Funciones < 50 líneas. Sin anidamiento > 4 niveles\n- Nombres descriptivos: verb-nombre para funciones (`fetchMarketData`), adjective-nombre para booleanos (`isAuthenticated`)\n- Manejo completo de errores: siempre try/catch con mensajes claros\n- Sin console.log, sin valores hardcoded, sin sentinelas mágicas\n- Validación de entrada en todos los límites\n\n## Patrones Arquitectónicos\n- **Repository Pattern**: Abstract acceso a datos\n- **Service Layer**: Lógica de negocio separada\n- **Middleware Pattern**: Pipeline request/response\n- **Composition Over Inheritance**: Componentes compuestos\n- **Custom Hooks**: Lógica reutilizable con estado\n\n## Seguridad (OBLIGATORIO)\n- Sin secrets hardcodeados (API keys, passwords, tokens)\n- Prevención SQL injection (queries parametrizadas)\n- Prevención XSS (sanitizar HTML)\n- CSRF protection\n- Rate limiting en todos los endpoints\n- Mensajes de error sin datos sensibles\n\nResponde EN ESPAÑOL con ejemplos de código funcionales, buenas prácticas y explicaciones claras. Usa bloques de código, negrita para conceptos clave. Estructura tu respuesta con headers, pasos y ejemplos reales.',

  writer: 'Eres un escritor profesional. Modelo activo: Llama 4 Maverick 17B (Meta, open source).\n\n## Estándares de Calidad\n- KISS: Solución más simple que funcione\n- DRY: Extraer lógica común, crear componentes reutilizables\n- YAGNI: No construir features antes de que se necesiten\n- Código es leído más que escrito: nombres claros > comentarios\n- Self-documenting code preferido sobre comments\n\nResponde EN ESPAÑOL con textos fluidos, bien estructurados y adaptados al tono solicitado. Crea contenido original de alta calidad literaria.',

  research: 'Eres un investigador experto. Modelo activo: Gemini 2.0 Flash (Google).\n\n## Metodología de Investigación\n- Análisis multi-perspectiva: revisar desde ángulos diferentes\n- Verificar fuentes cruzadas\n- Citar datos precisos con referencias\n- Estructurar: hallazgos → análisis → recomendaciones\n- Identificar riesgos y mitigaciones\n\n## Patrones de Análisis\n- **Architecture Decision Records (ADR)** para decisiones significativas\n- **Trade-off Analysis**: Pros / Cons / Alternativas / Decisión\n- **Red Flags**: Big Ball of Mud, Golden Hammer, Premature Optimization\n\nResponde EN ESPAÑOL con información estructurada, datos precisos y referencias. Usa negrita para términos clave, listas para clasificar.',

  marketing: 'Eres un estratega de marketing. Modelo activo: Nemotron 3 Ultra 550B (NVIDIA, open source).\n\n## Enfoque Analítico\n- Métricas cuantificables (CAC, LTV, ROI, conversion rates)\n- Segmentación de audiencia con datos\n- Estrategias accionables con timeline\n- Análisis competitivo estructurado\n\nResponde EN ESPAÑOL con análisis de mercado, estrategias accionables y métricas.',

  finance: 'Eres un analista financiero. Modelo activo: GLM 5.1 (Zhipu AI, open source).\n\n## Estándares Financieros\n- Datos numéricos precisos con fuentes\n- Análisis de riesgo estructurado\n- Métricas: ROI, IRR, NPV, payback period\n- Escenarios: optimista / base / pesimista\n\nResponde EN ESPAÑOL con datos numéricos precisos, tendencias y riesgos.',

  legal: 'Eres un asesor legal. Modelo activo: Kimi K2 (Moonshot AI, open source).\n\n## Estándares Legales\n- Lenguaje jurídico claro y preciso\n- Citar cláusulas y estructuras contractuales\n- Identificar riesgos legales\n- Recomendar acciones con base normativa\n\nResponde EN ESPAÑOL con lenguaje jurídico claro, citando cláusulas y estructuras contractuales.',

  email: 'Eres un ejecutivo de cuentas. Modelo activo: Llama 3.3 70B (Meta via Groq, open source).\n\n## Estándares de Comunicación\n- Tono profesional pero cercano\n- Estructura: asunto → saludo → cuerpo → CTA → despedida\n- Emails concisos (< 200 palabras ideal)\n- Sin jerga innecesaria\n\nResponde EN ESPAÑOL con correos profesionales, claros y efectivos. Estructura: asunto, saludo, cuerpo, despedida.',

  meeting: 'Eres un asistente ejecutivo. Modelo activo: Gemini 2.0 Flash (Google).\n\n## Estándares de Reuniones\n- Agenda con timeboxes claros\n- Resumen ejecutivo con decisiones y action items\n- Seguimiento: quién hace qué para cuándo\n- Notas estructuradas: contexto → discusión → decisiones → próximos pasos\n\nResponde EN ESPAÑOL con agendas de reunión, resúmenes ejecutivos y seguimiento de acción.',
};

export const AGENTS = [
  { id: 'auto',      name: 'AUTO',      ai: 'Automatico',  provider: null,          letter: 'A', aiIcon: AI + '../dist/x1-logo.png', color: '#26251E' },
  { id: 'research',   name: 'Research',   ai: 'Gemini 2.0 Flash',  provider: 'gemini',           letter: 'R', aiIcon: AI + 'googlegemini.svg',  color: '#4285f4' },
  { id: 'writer',     name: 'Writer',     ai: 'Llama 4 Maverick',  provider: 'nvidia-llama',     letter: 'W', aiIcon: AI + 'anthropic.svg',     color: '#d97706' },
  { id: 'developer',  name: 'Developer',  ai: 'Qwen3 Coder 480B',  provider: 'nvidia-qwen',      letter: 'D', aiIcon: AI + 'openai.svg',        color: '#10a37f' },
  { id: 'marketing',  name: 'Marketing',  ai: 'Nemotron 3 Ultra',   provider: 'nvidia-nemotron',  letter: 'M', aiIcon: AI + 'googlegemini.svg',  color: '#4285f4' },
  { id: 'finance',    name: 'Finance',    ai: 'GLM 5.1',           provider: 'nvidia-glm',       letter: 'F', aiIcon: AI + 'anthropic.svg',     color: '#d97706' },
  { id: 'legal',      name: 'Legal',      ai: 'Kimi K2',           provider: 'kimi-together',    letter: 'L', aiIcon: AI + 'mistralai.svg',     color: '#ff7000' },
  { id: 'email',      name: 'Email',      ai: 'Llama 3.3 70B',     provider: 'groq',             letter: 'E', aiIcon: AI + 'meta.svg',          color: '#0668e1' },
  { id: 'meeting',    name: 'Meeting',    ai: 'Gemini 2.0 Flash',  provider: 'gemini',           letter: 'G', aiIcon: AI + 'googlegemini.svg',  color: '#4285f4' }
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
  if (/escribir|texto|articul|blog|contenido|documento|\bdoc\b|informe|carta|resume|resumen|ensayo|guion|presentacion|slide|crea|genera|redacta/.test(t)) return 'writer';
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
  var map = AGENT_PROVIDER_MAP[agentId];
  var name = agent ? agent.name : agentId;
  var model = map ? map.model : 'IA';
  var provider = map ? map.provider : 'proxy';
  var repo = map ? map.repo : '';
  var source = map ? map.source : '';
  var sector = sectorForAgent(agentId);
  var reason = '**Sector:** ' + sector + '  \n**Agente:** ' + name + '  \n**Modelo:** ' + model + ' (' + source + ', [' + repo + '](https://github.com/' + repo + '))  \n**Provider:** `' + provider + '`  \n';
  if (/codigo|code|programa/.test(t)) reason += '**Routing:** Qwen3 Coder 480B via nvidia-qwen (agente Coding)';
  else if (/email|correo|gmail/.test(t)) reason += '**Routing:** Llama 3.3 70B via groq (agente Email)';
  else if (/reunion|meeting/.test(t)) reason += '**Routing:** Gemini 2.0 Flash via gemini (agente Meeting)';
  else if (/marketing|ventas/.test(t)) reason += '**Routing:** Nemotron 3 Ultra 550B via nvidia-nemotron (agente Marketing)';
  else if (/finanzas|inversion/.test(t)) reason += '**Routing:** GLM 5.1 via nvidia-glm (agente Finance)';
  else if (/legal|contrato/.test(t)) reason += '**Routing:** Kimi K2 via kimi-together (agente Legal)';
  else if (/escribir|texto|articul/.test(t)) reason += '**Routing:** Llama 4 Maverick via nvidia-llama (agente Writer)';
  else reason += '**Routing:** Gemini 2.0 Flash via gemini (agente Research)';
  reason += '\n\n**Infraestructura:** Proxy Cloudflare Worker (cascade con prefer_provider) + Service Worker X1 (acciones Google, Dex, email, calendario, docs).';
  return reason;
}

const GREETINGS = /^(hola|buenas|hey|hi|hello|que tal|como estas|buen[ao]s|saludos|gracias|ok|vale|perfecto|chao|adios|bye|buenos dias|buenas tardes|buenas noches|que onda|que hay|que pas|whats up|sup|hey|xup|yep|nope|si|no|dale|vamos|genial|increible|bien|mal|regular|mas o menos|asi asi|comprendo|entendido|entiendo|perfecto|excelente|genial|fantastico|maravilloso|ok then|cool|nice|good|bad|fine|great|awesome|amazing|hello there|good morning|good afternoon|good evening)$/i;
function isGreeting(q) { return GREETINGS.test(q.trim()); }

var proxyLastFail = 0;
var PROXY_COOLDOWN_MS = 3000;
export async function callAI(query, opts) {
  opts = opts || {};
  if (Date.now() - proxyLastFail < PROXY_COOLDOWN_MS) return null;
  var startedAt = Date.now();
  var maxTokens = opts.maxTokens || 2048;
  var timeoutMs = opts.timeoutMs || 30000;
  try {
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, timeoutMs);
    var messages = [
      { role: 'system', content: opts.systemPrompt || 'Eres System X1. Responde EN ESPAÑOL de forma clara y util.' }
    ];
    var recentMem = T.getMemoryStore ? T.getMemoryStore().slice(-8) : [];
    for (var i = 0; i < recentMem.length; i++) {
      messages.push({ role: recentMem[i].role === 'assistant' ? 'assistant' : 'user', content: recentMem[i].content });
    }
    messages.push({ role: 'user', content: query });
    var response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-X1-Auth': PROXY_SECRET },
      body: JSON.stringify({
        messages: messages,
        max_tokens: maxTokens,
        temperature: opts.temperature || 0.1,
        prefer_provider: opts.preferProvider || undefined
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!response.ok) {
      var errData; try { errData = await response.json(); } catch (e) { errData = {}; }
      console.warn('[X1] Proxy HTTP error:', response.status, errData.error || '');
      proxyLastFail = Date.now();
      return { error: errData.error || ('HTTP ' + response.status), provider: 'proxy' };
    }
    var data = await response.json();
    var text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
    if (!text) {
      console.warn('[X1] Proxy empty response:', JSON.stringify(data).slice(0, 200));
      return { error: 'empty_response', provider: data.x_provider || 'proxy' };
    }
    proxyLastFail = 0;
    return { text: text, model: data.model || 'desconocido', provider: data.x_provider || 'proxy', latencyMs: Date.now() - startedAt };
  } catch (e) {
    console.warn('[X1] Proxy fetch error:', e.name, e.message);
    proxyLastFail = Date.now();
    return { error: e.name === 'AbortError' ? 'timeout' : (e.message || 'error'), provider: 'proxy' };
  }
}

async function executeViaSW(query) {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) return null;
  try {
    var result = await new Promise(function(resolve) {
      chrome.runtime.sendMessage({ type: 'VOICE_COMMAND_EXEC', command: query, wantsText: true, timeoutMs: 30000 }, function(r) {
        if (chrome.runtime.lastError) { resolve(null); return; }
        resolve(r);
      });
    });
    if (result && result.text && result.text.length > 0) return result.text;
  } catch (e) { /* SW not available */ }
  return null;
}

export async function smartQuery(query, agentId) {
  T.addMemory('user', query);
  var sector = sectorForAgent(agentId);
  var agent = AGENTS.find(function(a) { return a.id === agentId; });
  var map = AGENT_PROVIDER_MAP[agentId] || AGENT_PROVIDER_MAP.research;
  var preferProvider = map.provider;

  var isActionQuery = /\b(crear|enviar|borrar|eliminar|buscar|leer|clasi[fy]|triage|exportar|importar|agregar|editar|actualizar|bloquear|desbloquear|contacto|email|correo|gmail|calendario|evento|reunion|doc|sheet|slides|nota|tab|scrape|linkedin|pdf)\b/i.test(query);
  var isGenericAgent = !agentId || agentId === 'research';

  if (isActionQuery || isGenericAgent) {
    try {
      var swResult = await executeViaSW(query);
      if (swResult) {
        T.addMemory('assistant', swResult);
        return { response: swResult, tools: [], judgeReason: null, sector: sector, model: 'x1-engine', provider: 'sw', latencyMs: 0, agentName: agent ? agent.name : 'X1', agentModel: map.model, agentRepo: map.repo };
      }
    } catch (e) { /* SW not available */ }
  }

  if (isGreeting(query)) {
    try {
      var res = await callAI(query, { maxTokens: 300, temperature: 0.7 });
      var greet = res && res.text ? res.text : 'Hola! Soy System X1. En que puedo ayudarte?';
      T.addMemory('assistant', greet);
      return { response: greet, tools: [], judgeReason: null, sector: sector, model: res && res.model || null, provider: res && res.provider || null, latencyMs: res && res.latencyMs || 0, agentName: agent ? agent.name : 'X1', agentModel: map.model, agentRepo: map.repo };
    } catch (e) {
      var greetFallback = 'Hola! Soy System X1. En que puedo ayudarte?';
      T.addMemory('assistant', greetFallback);
      return { response: greetFallback, tools: [], judgeReason: null, sector: sector, model: null, provider: null, latencyMs: 0, agentName: agent ? agent.name : 'X1', agentModel: map.model, agentRepo: map.repo };
    }
  }

  var judgeReason = getJudgeReason(query, agentId);
  var systemPrompt = SECTOR_PROMPTS[agentId] || SECTOR_PROMPTS.research;

  var aiResult = null;
  for (var attempt = 0; attempt < 2; attempt++) {
    aiResult = await callAI(query, { systemPrompt: systemPrompt, preferProvider: preferProvider });
    if (aiResult && aiResult.text) break;
    if (attempt === 0) await new Promise(function(r) { setTimeout(r, 1500); });
  }

  if (aiResult && aiResult.text) {
    T.addMemory('assistant', aiResult.text);
    return {
      response: aiResult.text, tools: [],
      judgeReason: judgeReason, sector: sector,
      model: aiResult.model, provider: aiResult.provider, latencyMs: aiResult.latencyMs,
      agentName: agent ? agent.name : 'X1', agentModel: map.model, agentRepo: map.repo
    };
  }

  var toolResults = null;
  try { toolResults = await T.executeTools(query, agentId); } catch (e) { toolResults = null; }
  var toolText = null;
  try { toolText = T.formatToolResults(query, toolResults || {}); } catch (e) { toolText = null; }
  if (toolText) {
    var toolsUsed = T.toolsUsedList(toolResults || {});
    T.addMemory('assistant', toolText);
    return { response: 'Resultados de busqueda:\n\n' + toolText, tools: toolsUsed, judgeReason: judgeReason, sector: sector, agentName: agent ? agent.name : 'X1', agentModel: map.model, agentRepo: map.repo };
  }

  var localFallback = buildLocalFallback(query, agentId, sector);
  T.addMemory('assistant', localFallback);
  return { response: localFallback, tools: [], judgeReason: judgeReason, sector: sector, agentName: agent ? agent.name : 'X1', agentModel: map.model, agentRepo: map.repo };
}

function buildLocalFallback(query, agentId, sector) {
  var t = query.toLowerCase().trim();
  var agent = AGENTS.find(function(a) { return a.id === agentId; });
  var agentName = agent ? agent.name : 'X1';
  var agentAI = agent ? agent.ai : 'IA';
  if (isGreeting(query)) return 'Hola. Soy **System X1** en modo local (sin conexion IA). Puedo ayudarte con:\n\n- **Google**: Gmail, Calendar, Docs, Sheets, Drive, Contacts\n- **GitHub**: repos, PRs, issues\n- **Navegacion**: buscar, leer paginas, extraer datos\n\nConecta Google en Configuracion para funciones completas.';
  if (/^(quien eres|que eres|como te llamas|que puedes hacer|ayuda|help)/.test(t))
    return 'Soy **System X1**. **' + agentName + '** (' + agentAI + ') activo para **' + sector + '**.\n\n## Capacidades\n- **Agentes IA**: Developer (Qwen3), Writer (Llama 4), Research (Gemini), Marketing (Nemotron), Finance (GLM), Legal (Kimi), Email (Llama 3.3)\n- **Google**: Gmail, Calendar, Docs, Sheets, Drive, Contacts, Tasks\n- **GitHub**: repos, PRs, issues, analysis\n- **Herramientas**: web search, npm, Stack Overflow\n- **Autonomia**: agente loop, scraping, multi-step tasks\n\nEscribe tu pregunta o usa los botones de accion rapida.';
  if (/^(que agentes|que ias|que modelos|que puedes)/.test(t))
    return '**Agentes disponibles:**\n\n| Agente | Modelo | Provider |\n|--------|--------|----------|\n| Developer | Qwen3 Coder 480B | nvidia-qwen |\n| Writer | Llama 4 Maverick | nvidia-llama |\n| Research | Gemini 2.0 Flash | gemini |\n| Marketing | Nemotron 3 Ultra | nvidia-nemotron |\n| Finance | GLM 5.1 | nvidia-glm |\n| Legal | Kimi K2 | kimi-together |\n| Email | Llama 3.3 70B | groq |\n| Meeting | Gemini 2.0 Flash | gemini |\n\nCada agente usa un modelo diferente via proxy Cloudflare Worker.';
  return '**Modo local.** Agente **' + agentName + '** (' + agentAI + ') para **' + sector + '**.\n\nLa IA no esta disponible ahora. Intenta de nuevo en unos segundos.\n\nMientras tanto, puedo ayudarte con:\n- Abrir Gmail, Calendar, Docs\n- Buscar en la web\n- Leer la pagina actual\n- Gestionar repositorios GitHub';
}

export { getMemoryContext, addMemory, clearMemory, loadMemory } from './tools.js';

export function hasEngine() { return typeof chrome !== 'undefined' && !!(chrome.runtime?.sendMessage); }

export function loadConversations() { try { var raw = localStorage.getItem('x1_conversations'); if (raw) { var d = JSON.parse(raw); if (Array.isArray(d)) return d; } } catch (e) {} return []; }
export function saveConversations(list) { try { localStorage.setItem('x1_conversations', JSON.stringify(list.slice(0, 100))); } catch (e) {} }
export function getUser() { try { var raw = localStorage.getItem('x1_user'); if (raw) return JSON.parse(raw); } catch (e) {} return null; }
export function saveUser(user) { try { localStorage.setItem('x1_user', JSON.stringify(user)); } catch (e) {} }

export function checkGoogleAuth() {
  return new Promise(function(r) {
    if (typeof chrome === 'undefined') { r({logged:false}); return; }
    chrome.storage.local.get(['google_token','google_user'], function(d) {
      r({logged:!!(d.google_token), user:d.google_user||null});
    });
  });
}
export function loginGoogle() {
  return new Promise(function(resolve) {
    if (typeof chrome === 'undefined') { resolve(null); return; }
    if (!chrome.identity) {
      chrome.runtime.sendMessage({ type: 'X1_AUTH_LOGIN_GOOGLE' }, function(resp) {
        if (chrome.runtime.lastError) { resolve(null); return; }
        if (resp && resp.ok) resolve({email:resp.email,name:resp.name,picture:resp.picture});
        else resolve(null);
      });
      return;
    }
    var timedOut = false;
    var timer = setTimeout(function() { timedOut = true; resolve(null); }, 25000);
    chrome.identity.getAuthToken({interactive:true}, function(token) {
      if (timedOut) return;
      clearTimeout(timer);
      if (chrome.runtime.lastError || !token) {
        loginGoogleWebFlow().then(function(info) { resolve(info); }).catch(function() { resolve(null); });
        return;
      }
      chrome.storage.local.set({google_token:token});
      fetch('https://www.googleapis.com/oauth2/v2/userinfo', {headers:{Authorization:'Bearer '+token}}).then(function(r){return r.json();}).then(function(info){
        if (info && info.email) {
          chrome.storage.local.set({google_user:{email:info.email,name:info.name,picture:info.picture}});
          resolve({email:info.email,name:info.name,picture:info.picture});
        } else { resolve(null); }
      }).catch(function() {
        loginGoogleWebFlow().then(function(info2) { resolve(info2); }).catch(function() { resolve(null); });
      });
    });
  });
}
function loginGoogleWebFlow() {
  return new Promise(function(resolve) {
    if (typeof chrome === 'undefined' || !chrome.identity) { resolve(null); return; }
    var redirectUri = chrome.identity.getRedirectURL();
    var clientId = '653077619345-erf587evo9le3t8p9ku5i8t485rdo6lc.apps.googleusercontent.com';
    var scopes = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/contacts.readonly';
    var authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=' + clientId + '&redirect_uri=' + encodeURIComponent(redirectUri) + '&response_type=token&scope=' + encodeURIComponent(scopes) + '&prompt=consent';
    var timedOut = false;
    var timer = setTimeout(function() { timedOut = true; resolve(null); }, 25000);
    chrome.identity.launchWebAuthFlow({url:authUrl, interactive:true}, function(responseUrl) {
      if (timedOut) return;
      clearTimeout(timer);
      if (chrome.runtime.lastError || !responseUrl) { resolve(null); return; }
      var hash = responseUrl.split('#')[1];
      if (!hash) { resolve(null); return; }
      var params = {};
      hash.split('&').forEach(function(p) { var kv = p.split('='); params[kv[0]] = decodeURIComponent(kv[1] || ''); });
      var token = params.access_token;
      if (!token) { resolve(null); return; }
      chrome.storage.local.set({google_token:token});
      fetch('https://www.googleapis.com/oauth2/v2/userinfo', {headers:{Authorization:'Bearer '+token}}).then(function(r){return r.json();}).then(function(info){
        if (info && info.email) {
          chrome.storage.local.set({google_user:{email:info.email,name:info.name,picture:info.picture}});
          resolve({email:info.email,name:info.name,picture:info.picture});
        } else { resolve(null); }
      }).catch(function() { resolve(null); });
    });
  });
}
export function logoutGoogle() { return new Promise(function(resolve) { try { if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) { chrome.storage.local.remove(['google_token', 'google_user'], function() { resolve(true); }); } else { resolve(false); } } catch (e) { resolve(false); } }); }
export function getGoogleUser() { return new Promise(function(resolve) { if (typeof chrome === 'undefined') { resolve(null); return; } chrome.storage.local.get('google_user', function(r) { resolve(r && r.google_user ? r.google_user : null); }); }); }
export function checkGithubAuth() { return new Promise(function(resolve) { try { if (typeof chrome === 'undefined' || !chrome.storage?.local) { resolve(false); return; } chrome.storage.local.get('github_user', function(r) { resolve(!!(r?.github_user?.login)); }); } catch (e) { resolve(false); } }); }
export function loginGithub() { return new Promise(function(resolve, reject) { if (typeof chrome === 'undefined' || !chrome.identity) { reject(new Error('chrome.identity no disponible')); return; } var clientId = 'Ov23limUz0ywpxqoPJXo'; var redirectUrl = chrome.identity.getRedirectURL(); var authUrl = 'https://github.com/login/oauth/authorize?client_id=' + clientId + '&redirect_uri=' + encodeURIComponent(redirectUrl) + '&scope=read:user+user:email'; var timedOut = false; var timer = setTimeout(function() { timedOut = true; reject(new Error('Tiempo agotado')); }, 30000); chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, function(redirectUrl) { if (timedOut) return; clearTimeout(timer); if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; } if (!redirectUrl) { reject(new Error('Cancelado')); return; } try { var urlObj = new URL(redirectUrl); var code = urlObj.searchParams.get('code'); if (!code) { reject(new Error('Sin codigo')); return; } resolve({ code: code }); } catch (e) { reject(new Error('URL invalida')); } }); }); }
export function startGithubDeviceFlow() { return fetch('https://github.com/login/device/code', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ client_id: 'Ov23limUz0ywpxqoPJXo', scope: 'read:user user:email' }) }).then(function(r) { if (!r.ok) return r.json().then(function(data) { throw new Error(data.error_description || ('HTTP ' + r.status)); }, function() { throw new Error('HTTP ' + r.status); }); return r.json(); }).then(function(data) { if (data.error) throw new Error(data.error_description || data.error); return { device_code: data.device_code, user_code: data.user_code, verification_uri: data.verification_uri || 'https://github.com/login/device', interval: data.interval || 5 }; }); }
export function pollGithubToken(device_code) { return new Promise(function(resolve, reject) { var attempts = 0; var maxAttempts = 60; function poll() { if (attempts >= maxAttempts) { reject(new Error('Tiempo agotado')); return; } attempts++; fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ client_id: 'Ov23limUz0ywpxqoPJXo', client_secret: '7997bfe3d604dfbc9f6c65bbb46620d44cfe26c8', device_code: device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }) }).then(function(r) { return r.json(); }).then(function(data) { if (data.access_token) { resolve(data.access_token); return; } if (data.error === 'authorization_pending') { setTimeout(poll, 5000); return; } if (data.error === 'slow_down') { setTimeout(poll, 8000); return; } if (data.error === 'expired_token') { reject(new Error('Codigo expirado')); return; } if (data.error === 'access_denied') { reject(new Error('Denegado')); return; } setTimeout(poll, 5000); }).catch(function() { setTimeout(poll, 5000); }); } poll(); }); }
export function fetchGithubUser(token) { return fetch('https://api.github.com/user', { headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' } }).then(function(r) { return r.json(); }).then(function(info) { if (info.message) throw new Error(info.message); var user = { login: info.login, name: info.name, avatar_url: info.avatar_url, email: info.email }; try { chrome.storage.local.set({ github_token: token, github_user: user }); } catch (e) {} return user; }); }
export function fetchGithubRepos(token) { return fetch('https://api.github.com/user/repos?sort=updated&per_page=10', { headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' } }).then(function(r) { return r.json(); }).then(function(repos) { if (!Array.isArray(repos)) return []; return repos.map(function(r) { return { name: r.full_name, description: r.description || '', language: r.language, stars: r.stargazers_count, url: r.html_url }; }); }).catch(function() { return []; }); }
export function fetchGithubStarred(token) { return fetch('https://api.github.com/user/starred?sort=updated&per_page=10', { headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' } }).then(function(r) { return r.json(); }).then(function(repos) { if (!Array.isArray(repos)) return []; return repos.map(function(r) { return { name: r.full_name, description: r.description || '', language: r.language, stars: r.stargazers_count, url: r.html_url }; }); }).catch(function() { return []; }); }
export function fetchGithubIssues(token) { return fetch('https://api.github.com/user/issues?sort=updated&per_page=10&state=open', { headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' } }).then(function(r) { return r.json(); }).then(function(issues) { if (!Array.isArray(issues)) return []; return issues.map(function(i) { return { title: i.title, repo: i.repository_url?.split('/').slice(-2).join('/'), state: i.state, url: i.html_url }; }); }).catch(function() { return []; }); }
export function logoutGithub() { return new Promise(function(resolve) { try { if (typeof chrome !== 'undefined' && chrome.storage?.local) { chrome.storage.local.remove(['github_token', 'github_user'], function() { resolve(true); }); } else { resolve(false); } } catch (e) { resolve(false); } }); }
export function getGithubUser() { return new Promise(function(resolve) { try { if (typeof chrome === 'undefined' || !chrome.storage?.local) { resolve(null); return; } chrome.storage.local.get('github_user', function(r) { resolve(r?.github_user || null); }); } catch (e) { resolve(null); } }); }
export function getGithubToken() { return new Promise(function(resolve) { try { if (typeof chrome === 'undefined' || !chrome.storage?.local) { resolve(null); return; } chrome.storage.local.get('github_token', function(r) { resolve(r?.github_token || null); }); } catch (e) { resolve(null); } }); }
export function validateGithubToken(token) { return fetch('https://api.github.com/user', { headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' } }).then(function(r) { if (!r.ok) throw new Error('Token invalido'); return r.json(); }).then(function(info) { if (info.message) throw new Error(info.message); if (!info.login) throw new Error('No login'); var user = { login: info.login, name: info.name, avatar_url: info.avatar_url, email: info.email }; try { chrome.storage.local.set({ github_token: token, github_user: user }); } catch (e) {} return user; }); }
