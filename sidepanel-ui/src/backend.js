/*
 * X1 — conexión con el backend (SIN CAMBIOS de contrato).
 *
 * Extraído verbatim de sidepanel/panel.js: mismo endpoint del proxy, mismo
 * secreto, mismo protocolo de mensajes, misma memoria en localStorage y los
 * mismos planificadores (planSteps / simpleAnswer). La UI nueva (Fluent) solo
 * consume estas funciones; la lógica de red no se toca.
 */

export const CLOUD = 'https://x1-proxy.baosx1.workers.dev';
export const SECRET = '9ff4b7dda5f7defd5f7fb7c32c133428bc87e8efeb8550d3ce1e5838c1d3b850';
const MEM_KEY = 'x1_mem';
const MAX_MEM = 40;

export const AGENTS = [
  { id: 'research', name: 'Research', repo: 'iarjona2000/research-lib' },
  { id: 'writer', name: 'Writer', repo: 'iarjona2000/content-models' },
  { id: 'developer', name: 'Developer', repo: 'iarjona2000/codebase' },
  { id: 'marketing', name: 'Marketing', repo: 'iarjona2000/marketing-kit' },
  { id: 'finance', name: 'Finance', repo: 'iarjona2000/finance-models' },
  { id: 'legal', name: 'Legal', repo: 'iarjona2000/legal-docs' },
  { id: 'email', name: 'Email', repo: 'iarjona2000/email-templates' },
  { id: 'meeting', name: 'Meeting', repo: 'iarjona2000/meeting-notes' }
];

export const FALLBACK_ANSWERS = {
  research: 'Here\'s what I found. I searched multiple sources and cross-referenced the results. The main signal is clear. Saved to memory.',
  writer: 'Done. The draft front-loads the key message and uses short paragraphs. I can adjust the tone.',
  developer: 'I read the relevant code. Core logic is sound. I can generate the helper, add tests, or wire it in.',
  marketing: 'I analysed the page. Three angles stood out. I can expand any into a campaign wireframe.',
  finance: 'The numbers check out. Revenue is growing; margin is the metric to watch. I can build scenarios.',
  legal: 'I reviewed against the legal knowledge base. Two clauses worth a second look.',
  email: 'Done. I read your inbox and drafted a reply. Review and send when ready.',
  meeting: 'Transcribed. Three decisions, four action items. Recap ready to share.'
};

const GREETINGS = [
  /^hola/i, /^buenas/i, /^hey/i, /^hello/i, /^hi\b/i, /^heyy/i,
  /^qu[eé] tal/i, /^c[oó]mo est[áa]s/i, /^buen[oa]s/i,
  /^gracias/i, /^thanks/i, /^thank you/i,
  /^who are you/i, /^qu[eé] eres/i, /^qu[eé] puedes hacer/i,
  /^q tal/i, /^tal/i,
  /^s[ií]/i, /^no$/i, /^ok$/i, /^vale/i, /^de acuerdo/i,
  /^buen trabajo/i, /^nice/i, /^great/i, /^perfect/i,
  /^bien$/i, /^mal$/i, /^jaja/i, /^lol/i
];

const QUICK_REPLIES = {
  hola: '¡Hola! ¿En qué puedo ayudarte hoy?',
  quien: 'Soy X1, un agente autónomo de navegador. Puedo buscar información, leer páginas, crear documentos, escribir código y actuar en tu navegador. ¿Qué necesitas?',
  gracias: '¡De nada! Si necesitas algo más, aquí estoy.',
  bien: 'Me alegra. ¿En qué puedo ayudarte?',
  default: 'Claro, ¿qué necesitas que haga?'
};

export function agentById(id) {
  return AGENTS.find((a) => a.id === id) || AGENTS[0];
}

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

export function quickReply(text) {
  const t = text.trim().toLowerCase();
  if (/^hola|^buenas|^hey|^hello|^hi\b|^heyy/.test(t)) return QUICK_REPLIES.hola;
  if (/^thanks|^thank you|^gracias/.test(t)) return QUICK_REPLIES.gracias;
  if (/quien eres|who are you|qu[eé] eres|qu[eé] puedes hacer/.test(t)) return QUICK_REPLIES.quien;
  if (/^bien$|^mal$|^bien y tu/.test(t)) return QUICK_REPLIES.bien;
  if (/^s[ií]$|^ok$|^vale$|^de acuerdo$/.test(t)) return QUICK_REPLIES.default;
  return null;
}

/* ── Memoria (localStorage) ── */

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

/* ── Parser JSON tolerante ── */

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

/* ── Planificador (llamada real al proxy) ── */

export function planSteps(query, activeId) {
  const a = agentById(activeId);
  const msgs = [
    { role: 'system', content: 'You are X1, a browser agent. Plan the steps needed to fulfil the user\'s request.\n\nReturn ONLY valid JSON (no markdown, no explanation) with this structure:\n{\n  "steps": [\n    {"app": "AppName", "label": "ShortLabel"},\n    ...\n  ],\n  "response": "Your answer to the user"\n}\n\nPossible app names: GitHub, Google, LinkedIn, Docs, Style, PDF, Search, Read, Code, Draft, Email, Synthesize, Test, Export, Result, Done.\n\nExample for "create a document about someone":\n{"steps":[{"app":"GitHub","label":"Repo"},{"app":"Google","label":"Search"},{"app":"LinkedIn","label":"Profile"},{"app":"Docs","label":"Create"},{"app":"Style","label":"Format"},{"app":"PDF","label":"Export"},{"app":"Done","label":"Result"}],"response":"I created the document. Here it is..."}\n\nBe concise. Always end with a "Done" or "Result" step. The response must be in the user\'s language.' },
    { role: 'user', content: 'Agent: ' + a.name + '\nRepo: ' + a.repo + '\n\n' + query }
  ];

  return fetch(CLOUD + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-X1-Auth': SECRET },
    body: JSON.stringify({ messages: msgs, max_tokens: 600, temperature: 0.3 }),
    signal: AbortSignal.timeout(15000)
  }).then((r) => (r.ok ? r.json() : null)).then((d) => {
    if (!d) return null;
    const t = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    if (!t || !t.trim()) return null;
    const parsed = parseJSON(t);
    if (parsed && parsed.steps && parsed.response) return parsed;
    return { steps: [{ app: 'Done', label: 'Result' }], response: t.trim() };
  }).catch(() => null);
}

export function simpleAnswer(text, activeId) {
  const a = agentById(activeId);
  const msgs = [
    { role: 'system', content: 'You are X1, a browser agent. Reply briefly and naturally. Current agent: ' + a.name },
    { role: 'user', content: text }
  ];
  return fetch(CLOUD + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-X1-Auth': SECRET },
    body: JSON.stringify({ messages: msgs, max_tokens: 150, temperature: 0.5 }),
    signal: AbortSignal.timeout(8000)
  }).then((r) => (r.ok ? r.json() : null)).then((d) => {
    if (!d) return null;
    const t = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    return (t || '').trim() || null;
  }).catch(() => null);
}

export function warm() {
  fetch(CLOUD + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-X1-Auth': SECRET },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
    signal: AbortSignal.timeout(8000)
  }).catch(() => {});
}
