import * as React from 'react';

export const CLOUD = 'https://x1-proxy.baosx1.workers.dev';
export const SECRET = '9ff4b7dda5f7defd5f7fb7c32c133428bc87e8efeb8550d3ce1e5838c1d3b850';
const MEM_KEY = 'x1_mem';
const VOTE_KEY = 'x1_votes';
const MAX_MEM = 40;

const AI = '../assets/ai/';

export const AGENTS = [
  { id: 'research', name: 'Research', ai: 'Gemini', aiIcon: AI + 'googlegemini.svg' },
  { id: 'writer', name: 'Writer', ai: 'Claude', aiIcon: AI + 'anthropic.svg' },
  { id: 'developer', name: 'Developer', ai: 'GPT-4o', aiIcon: AI + 'openai.svg' },
  { id: 'marketing', name: 'Marketing', ai: 'Gemini', aiIcon: AI + 'googlegemini.svg' },
  { id: 'finance', name: 'Finance', ai: 'Claude', aiIcon: AI + 'anthropic.svg' },
  { id: 'legal', name: 'Legal', ai: 'Mistral', aiIcon: AI + 'mistralai.svg' },
  { id: 'email', name: 'Email', ai: 'Llama', aiIcon: AI + 'meta.svg' },
  { id: 'meeting', name: 'Meeting', ai: 'Gemini', aiIcon: AI + 'googlegemini.svg' }
];

export function agentById(id) {
  return AGENTS.find((a) => a.id === id) || AGENTS[0];
}

const GREETINGS = [
  /^hola/i, /^buenas/i, /^hey/i, /^hello/i, /^hi\b/i, /^heyy/i,
  /^qu[eé] tal/i, /^c[oó]mo est[áa]s/i, /^buen[oa]s/i,
  /^gracias/i, /^thanks/i, /^thank you/i,
  /^s[ií]$/i, /^no$/i, /^ok$/i, /^vale/i, /^de acuerdo/i,
  /^bien$/i, /^jaja/i, /^lol/i
];

export function isSimple(text) {
  const t = text.trim();
  if (t.length < 3) return true;
  for (const g of GREETINGS) {
    if (g.test(t)) {
      const rest = t.replace(g, '').trim();
      return rest.length <= 5;
    }
  }
  return false;
}

export function loadMem() {
  try {
    const raw = localStorage.getItem(MEM_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.messages) return d;
    }
  } catch (e) {}
  return null;
}

export function saveMem(state) {
  try {
    localStorage.setItem(MEM_KEY, JSON.stringify({
      messages: (state.messages || []).slice(-MAX_MEM),
      active: state.active,
      mid: state.mid || 0
    }));
  } catch (e) {}
}

export function clearMem() {
  try { localStorage.removeItem(MEM_KEY); } catch (e) {}
}

export function hasEngine() {
  return typeof chrome !== 'undefined' && !!(chrome.runtime && chrome.runtime.sendMessage);
}

export function execInX1(command) {
  return new Promise((resolve) => {
    if (!hasEngine()) { resolve(null); return; }
    let settled = false;
    const finish = (v) => { if (!settled) { settled = true; resolve(v); } };
    try {
      chrome.runtime.sendMessage({ type: 'VOICE_COMMAND_EXEC', command, wantsText: true }, (resp) => {
        if (chrome.runtime.lastError) { finish(null); return; }
        const text = resp && resp.text ? String(resp.text).trim() : '';
        finish(text || null);
      });
    } catch (e) { finish(null); }
    setTimeout(() => finish(null), 30000);
  });
}

function parseJSON(text) {
  try { return JSON.parse(text); } catch (e) {}
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1].trim()); } catch (e) {} }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.substring(start, end + 1)); } catch (e) {}
  }
  return null;
}

const SYSTEM_BASE = 'You are X1, a browser agent. ';

const AGENT_PROMPTS = {
  research: SYSTEM_BASE + 'You research the web thoroughly. Be analytical, cite sources, synthesize findings. Reply in the user\'s language.',
  writer: SYSTEM_BASE + 'You write clear, compelling content. Be concise, structured, and engaging. Reply in the user\'s language.',
  developer: SYSTEM_BASE + 'You write clean, well-structured code. Explain your approach briefly. Reply in the user\'s language.',
  marketing: SYSTEM_BASE + 'You are a marketing strategist. Analyse audiences, positioning, and channels. Reply in the user\'s language.',
  finance: SYSTEM_BASE + 'You are a financial analyst. Be precise with numbers, identify trends and risks. Reply in the user\'s language.',
  legal: SYSTEM_BASE + 'You are a legal analyst. Be precise, reference relevant concepts, identify risks. Reply in the user\'s language.',
  email: SYSTEM_BASE + 'You manage email communication. Be professional, clear, and efficient. Reply in the user\'s language.',
  meeting: SYSTEM_BASE + 'You prepare and summarise meetings. Extract decisions and action items. Reply in the user\'s language.'
};

const CRITICAL_PROMPT = SYSTEM_BASE + 'Analyse the same query from a critical perspective. Identify gaps, risks, or alternative approaches the first response might miss. Be constructive. Reply in the user\'s language.';

function apiCall(messages, opts = {}) {
  return fetch(CLOUD + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-X1-Auth': SECRET },
    body: JSON.stringify({
      messages,
      max_tokens: opts.max_tokens || 600,
      temperature: opts.temperature || 0.3
    }),
    signal: AbortSignal.timeout(opts.timeout || 15000)
  }).then((r) => (r.ok ? r.json() : null)).then((d) => {
    if (!d) return null;
    const t = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    const provider = d.x_provider || 'unknown';
    return { text: (t || '').trim(), provider };
  }).catch(() => null);
}

export function planSteps(query, activeId) {
  const a = agentById(activeId);
  const prompt = AGENT_PROMPTS[a.id] || AGENT_PROMPTS.research;
  const msgs = [
    { role: 'system', content: prompt + '\n\nPlan the steps needed. Return ONLY valid JSON: {"steps":[{"app":"...","label":"..."}],"response":"..."}' },
    { role: 'user', content: 'Agent: ' + a.name + '\n\n' + query }
  ];
  return apiCall(msgs, { max_tokens: 600, temperature: 0.3, timeout: 15000 }).then((r) => {
    if (!r || !r.text) return null;
    const parsed = parseJSON(r.text);
    if (parsed && parsed.steps && parsed.response) return parsed;
    return { steps: [{ app: 'Done', label: 'Result' }], response: r.text };
  });
}

export function simpleAnswer(text, activeId) {
  const a = agentById(activeId);
  const prompt = AGENT_PROMPTS[a.id] || AGENT_PROMPTS.research;
  const msgs = [
    { role: 'system', content: prompt + '\nReply briefly and naturally.' },
    { role: 'user', content: text }
  ];
  return apiCall(msgs, { max_tokens: 150, temperature: 0.5, timeout: 8000 }).then((r) => {
    return (r && r.text) || null;
  });
}

export function compareAnswers(query, activeId) {
  const a = agentById(activeId);
  const prompt = AGENT_PROMPTS[a.id] || AGENT_PROMPTS.research;
  const msgs = [
    { role: 'system', content: prompt },
    { role: 'user', content: query }
  ];
  const msgsCritical = [
    { role: 'system', content: CRITICAL_PROMPT },
    { role: 'user', content: query }
  ];
  return Promise.all([
    apiCall(msgs, { max_tokens: 400, temperature: 0.3, timeout: 15000 }),
    apiCall(msgsCritical, { max_tokens: 400, temperature: 0.5, timeout: 15000 })
  ]).then(([primary, critical]) => ({
    primary: primary || { text: 'Error al obtener respuesta', provider: 'error' },
    critical: critical || { text: 'Error al obtener respuesta crítica', provider: 'error' }
  }));
}

export function warm() {
  apiCall([{ role: 'user', content: 'ping' }], { max_tokens: 1, timeout: 8000 }).catch(() => {});
}

/* ── Judge / Voting System ── */

export function loadVotes() {
  try {
    const raw = localStorage.getItem(VOTE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

export function recordVote(vote) {
  const votes = loadVotes();
  votes.push({ ...vote, timestamp: Date.now() });
  try {
    localStorage.setItem(VOTE_KEY, JSON.stringify(votes.slice(-100)));
  } catch (e) {}
}

export function getPreferences() {
  const votes = loadVotes();
  if (!votes.length) return {};
  const counts = {};
  for (const v of votes) {
    const key = v.winner || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export const HONEST_ERROR = 'No he podido completar esto ahora mismo: no hay conexion con el motor de X1. Vuelve a intentarlo en unos segundos.';
