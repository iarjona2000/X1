export const CLOUD = 'https://x1-proxy.baosx1.workers.dev';
export const SECRET = '9ff4b7dda5f7defd5f7fb7c32c133428bc87e8efeb8550d3ce1e5838c1d3b850';

const MEM_KEY = 'x1_mem';
const VOTE_KEY = 'x1_votes';
const MAX_MEM = 24;
const AI = '../assets/ai/';

export const AGENTS = [
  { id: 'research',   name: 'Research',   ai: 'Gemini',  aiIcon: AI + 'googlegemini.svg' },
  { id: 'writer',     name: 'Writer',     ai: 'Claude',  aiIcon: AI + 'anthropic.svg' },
  { id: 'developer',  name: 'Developer',  ai: 'GPT-4o',  aiIcon: AI + 'openai.svg' },
  { id: 'marketing',  name: 'Marketing',  ai: 'Gemini',  aiIcon: AI + 'googlegemini.svg' },
  { id: 'finance',    name: 'Finance',    ai: 'Claude',  aiIcon: AI + 'anthropic.svg' },
  { id: 'legal',      name: 'Legal',      ai: 'Mistral', aiIcon: AI + 'mistralai.svg' },
  { id: 'email',      name: 'Email',      ai: 'Llama',   aiIcon: AI + 'meta.svg' },
  { id: 'meeting',    name: 'Meeting',    ai: 'Gemini',  aiIcon: AI + 'googlegemini.svg' }
];

export function agentById(id) {
  return AGENTS.find(a => a.id === id) || AGENTS[0];
}

const AGENT_STYLES = {
  research:  'Eres un investigador. Busca, analiza, sintetiza. Responde en el idioma del usuario.',
  writer:    'Eres un escritor profesional. Texto claro, conciso, bien estructurado. Responde en el idioma del usuario.',
  developer: 'Eres un programador senior. Codigo limpio, explicaciones breves. Responde en el idioma del usuario.',
  marketing: 'Eres un estratega de marketing. Analiza audiencias, posicionamiento, canales. Responde en el idioma del usuario.',
  finance:   'Eres un analista financiero. Preciso con numeros, identifica tendencias. Responde en el idioma del usuario.',
  legal:     'Eres un asesor legal. Preciso, referencia conceptos, identifica riesgos. Responde en el idioma del usuario.',
  email:     'Eres un asistente de email. Profesional, claro, eficiente. Responde en el idioma del usuario.',
  meeting:   'Eres un secretario de reunion. Extrae decisiones y accionables. Responde en el idioma del usuario.'
};

const GREETINGS = [
  /^hola/i, /^buenas/i, /^hey/i, /^hello/i, /^hi\b/i, /^heyy/i,
  /^qu[eé] tal/i, /^c[oó]mo est[áa]s/i, /^buen[oa]s/i,
  /^gracias/i, /^thanks/i, /^thank you/i,
  /^s[ií]$/i, /^no$/i, /^ok$/i, /^vale/i, /^bien$/i, /^jaja/i, /^lol/i
];

export function isSimple(text) {
  const t = text.trim();
  if (t.length < 3) return true;
  for (const g of GREETINGS) {
    if (g.test(t)) {
      const rest = t.replace(g, '').trim();
      if (rest.length <= 5) return true;
    }
  }
  return false;
}

function api(messages, opts = {}) {
  return fetch(CLOUD + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-X1-Auth': SECRET },
    body: JSON.stringify({ messages, max_tokens: opts.max_tokens || 600, temperature: opts.temperature || 0.3 }),
    signal: AbortSignal.timeout(opts.timeout || 15000)
  }).then(r => r.ok ? r.json() : null).then(d => {
    if (!d) return null;
    const content = d.choices?.[0]?.message?.content;
    return content ? content.trim() : null;
  }).catch(() => null);
}

function systemPrompt(agentId) {
  return 'Eres X1, un agente de navegador.\n\n' + (AGENT_STYLES[agentId] || AGENT_STYLES.research);
}

export function planSteps(query, agentId) {
  const a = agentById(agentId);
  const msgs = [
    { role: 'system', content: systemPrompt(agentId) + '\n\nPlanifica los pasos para cumplir la solicitud. Devuelve SOLO JSON valido: {"steps":[{"app":"App","label":"Accion"}],"response":"Respuesta"}' },
    { role: 'user', content: 'Agente: ' + a.name + '\n\n' + query }
  ];
  return api(msgs, { max_tokens: 600, temperature: 0.3 }).then(text => {
    if (!text) return null;
    try { const j = JSON.parse(text); if (j.steps && j.response) return j; } catch (e) {}
    const m = text.match(/\{[\s\S]*\}/);
    if (m) { try { const j = JSON.parse(m[0]); if (j.steps && j.response) return j; } catch (e) {} }
    return { steps: [{ app: 'Done', label: 'Completado' }], response: text };
  });
}

export function simpleAnswer(text, agentId) {
  const msgs = [
    { role: 'system', content: systemPrompt(agentId) + '\nResponde breve y naturalmente.' },
    { role: 'user', content: text }
  ];
  return api(msgs, { max_tokens: 150, temperature: 0.5, timeout: 8000 });
}

export function warm() {
  api([{ role: 'user', content: 'ping' }], { max_tokens: 1, timeout: 5000 }).catch(() => {});
}

export function loadMem() {
  try {
    const raw = localStorage.getItem(MEM_KEY);
    if (raw) { const d = JSON.parse(raw); if (d?.messages) return d; }
  } catch (e) {}
  return null;
}

export function saveMem(state) {
  try {
    localStorage.setItem(MEM_KEY, JSON.stringify({
      messages: (state.messages || []).slice(-MAX_MEM),
      active: state.active, mid: state.mid || 0
    }));
  } catch (e) {}
}

export function clearMem() {
  try { localStorage.removeItem(MEM_KEY); } catch (e) {}
}

export function hasEngine() {
  return typeof chrome !== 'undefined' && !!(chrome.runtime?.sendMessage);
}

export function execInX1(command) {
  return new Promise(resolve => {
    if (!hasEngine()) { resolve(null); return; }
    let done = false;
    const finish = v => { if (!done) { done = true; resolve(v); } };
    try {
      chrome.runtime.sendMessage({ type: 'VOICE_COMMAND_EXEC', command, wantsText: true }, resp => {
        if (chrome.runtime.lastError) { finish(null); return; }
        finish(resp?.text?.trim() || null);
      });
    } catch (e) { finish(null); }
    setTimeout(() => finish(null), 25000);
  });
}

export function loadVotes() {
  try { const r = localStorage.getItem(VOTE_KEY); return r ? JSON.parse(r) : []; } catch (e) { return []; }
}

export function recordVote(vote) {
  const votes = loadVotes();
  votes.push({ ...vote, timestamp: Date.now() });
  try { localStorage.setItem(VOTE_KEY, JSON.stringify(votes.slice(-100))); } catch (e) {}
}

export function getPreferences() {
  const votes = loadVotes();
  if (!votes.length) return {};
  const counts = {};
  for (const v of votes) counts[v.winner] = (counts[v.winner] || 0) + 1;
  return counts;
}
