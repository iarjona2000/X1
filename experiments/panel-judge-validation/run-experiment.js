// X1 — Experimento de validación: Cascada actual vs Panel+Juez (sector Finanzas)
// Ver README.md en esta carpeta para instrucciones de uso.
//
// Claves API: SOLO por variable de entorno. Nunca las pegues en este archivo ni en el chat.
//   GROQ_KEY, NVIDIA_KEY, GEMINI_KEY, CEREBRAS_KEY, MISTRAL_KEY, OPENROUTER_KEY

const fs = require('fs');
const path = require('path');

const QUERIES_FILE = path.join(__dirname, 'queries.finanzas.json');
const RUBRIC_FILE = path.join(__dirname, 'rubric.finanzas.json');
const OUT_DIR = path.join(__dirname, 'results');

const KEYS = {
  groq: process.env.GROQ_KEY,
  nvidia: process.env.NVIDIA_KEY,
  gemini: process.env.GEMINI_KEY,
  cerebras: process.env.CEREBRAS_KEY,
  mistral: process.env.MISTRAL_KEY,
  openrouter: process.env.OPENROUTER_KEY
};

function systemPrompt(extra) {
  return 'Eres un asistente financiero preciso. Responde de forma directa y concisa, mostrando el razonamiento numérico cuando aplique.' + (extra || '');
}

async function callGroq(userMsg, extra) {
  if (!KEYS.groq) return null;
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEYS.groq },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemPrompt(extra) }, { role: 'user', content: userMsg }],
      temperature: 0.1, max_tokens: 800
    })
  }).then(r => r.json()).catch(() => null);
  return r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content
    ? r.choices[0].message.content.trim() : null;
}

async function callNvidia(userMsg, extra) {
  if (!KEYS.nvidia) return null;
  const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEYS.nvidia },
    body: JSON.stringify({
      model: 'z-ai/glm-5.1',
      messages: [{ role: 'system', content: systemPrompt(extra) }, { role: 'user', content: userMsg }],
      temperature: 0.1, max_tokens: 800
    })
  }).then(r => r.json()).catch(() => null);
  return r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content
    ? r.choices[0].message.content.trim() : null;
}

async function callGemini(userMsg, extra) {
  if (!KEYS.gemini) return null;
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + KEYS.gemini;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt(extra) }] },
      contents: [{ role: 'user', parts: [{ text: userMsg }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 800 }
    })
  }).then(r => r.json()).catch(() => null);
  const parts = r && r.candidates && r.candidates[0] && r.candidates[0].content && r.candidates[0].content.parts;
  if (!parts) return null;
  return parts.map(p => p.text || '').join('').trim() || null;
}

async function callCerebras(userMsg, extra) {
  if (!KEYS.cerebras) return null;
  const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEYS.cerebras },
    body: JSON.stringify({
      model: 'llama-3.3-70b',
      messages: [{ role: 'system', content: systemPrompt(extra) }, { role: 'user', content: userMsg }],
      temperature: 0.1, max_tokens: 800
    })
  }).then(r => r.json()).catch(() => null);
  return r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content
    ? r.choices[0].message.content.trim() : null;
}

async function callMistral(userMsg, extra) {
  if (!KEYS.mistral) return null;
  const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEYS.mistral },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [{ role: 'system', content: systemPrompt(extra) }, { role: 'user', content: userMsg }],
      temperature: 0.1, max_tokens: 800
    })
  }).then(r => r.json()).catch(() => null);
  return r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content
    ? r.choices[0].message.content.trim() : null;
}

async function callOpenrouter(userMsg, extra) {
  if (!KEYS.openrouter) return null;
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEYS.openrouter },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct',
      messages: [{ role: 'system', content: systemPrompt(extra) }, { role: 'user', content: userMsg }],
      temperature: 0.1, max_tokens: 800
    })
  }).then(r => r.json()).catch(() => null);
  return r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content
    ? r.choices[0].message.content.trim() : null;
}

const PROVIDER_FN = {
  groq: callGroq, nvidia: callNvidia, gemini: callGemini,
  cerebras: callCerebras, mistral: callMistral, openrouter: callOpenrouter
};

// Cascada actual: mismo orden que ROUTE_MATRIX.reasoning en service-worker.js
// (groq -> nvidia -> gemini -> openrouter), primero que responda gana.
async function cascadeAnswer(query) {
  const order = ['groq', 'nvidia', 'gemini', 'openrouter'];
  for (const name of order) {
    if (!KEYS[name]) continue;
    const text = await PROVIDER_FN[name](query);
    if (text) return { provider: name, text };
  }
  return null;
}

// Panel+Juez simplificado: 3-4 candidatos en paralelo + juez rotativo
// (el juez nunca es de la misma familia que un candidato de esa llamada).
async function panelJudge(query, rubric, judgeChoice) {
  const candidateNames = ['groq', 'nvidia', 'gemini', 'cerebras'].filter(n => KEYS[n]);
  const settled = await Promise.allSettled(candidateNames.map(n => PROVIDER_FN[n](query)));
  const candidates = settled
    .map((r, i) => (r.status === 'fulfilled' && r.value) ? { provider: candidateNames[i], text: r.value } : null)
    .filter(Boolean);

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return { winner: candidates[0], candidates, judged: false };

  const judgeName = ['mistral', 'openrouter'].includes(judgeChoice) && KEYS[judgeChoice] ? judgeChoice
    : (KEYS.mistral ? 'mistral' : (KEYS.openrouter ? 'openrouter' : null));
  if (!judgeName) return { winner: candidates[0], candidates, judged: false };

  const judgePrompt =
    'Estás evaluando ' + candidates.length + ' respuestas candidatas a la misma consulta financiera, con este rubric: ' +
    JSON.stringify(rubric) +
    '.\n\nPregunta original: ' + query +
    '\n\nCandidatas:\n' + candidates.map((c, i) => '[' + i + '] (' + c.provider + '): ' + c.text).join('\n\n') +
    '\n\nResponde SOLO con JSON: {"winnerIndex": number, "justification": "máx 2 frases"}';

  const raw = await PROVIDER_FN[judgeName](judgePrompt, ' Responde solo JSON, sin texto adicional.');
  let verdict = null;
  try {
    const m = raw && raw.match(/\{[\s\S]*\}/);
    verdict = m ? JSON.parse(m[0]) : null;
  } catch (e) { verdict = null; }

  const winnerIndex = (verdict && Number.isInteger(verdict.winnerIndex) && candidates[verdict.winnerIndex]) ? verdict.winnerIndex : 0;
  return {
    winner: candidates[winnerIndex],
    candidates,
    judge: judgeName,
    justification: verdict ? verdict.justification : null,
    judged: true
  };
}

async function main() {
  const queries = JSON.parse(fs.readFileSync(QUERIES_FILE, 'utf8'));
  const rubric = JSON.parse(fs.readFileSync(RUBRIC_FILE, 'utf8'));

  if (queries.length === 1 && queries[0].id === 'fin_001') {
    console.error('queries.finanzas.json todavía tiene el placeholder de ejemplo. Sustitúyelo por tus 20-30 consultas reales antes de correr el experimento.');
    process.exit(1);
  }

  const hasAnyKey = Object.values(KEYS).some(Boolean);
  if (!hasAnyKey) {
    console.error('No hay ninguna clave configurada como variable de entorno (GROQ_KEY, NVIDIA_KEY, GEMINI_KEY, CEREBRAS_KEY, MISTRAL_KEY, OPENROUTER_KEY). Ver README.md.');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const blindRows = [];
  const answerKey = [];

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    console.log('[' + (i + 1) + '/' + queries.length + '] ' + q.id + ' — corriendo cascada + panel...');

    const judgeChoice = i % 2 === 0 ? 'mistral' : 'openrouter';
    const [cascade, panel] = await Promise.all([
      cascadeAnswer(q.query),
      panelJudge(q.query, rubric, judgeChoice)
    ]);

    if (!cascade && !panel) {
      console.warn('  -> ambos brazos fallaron para ' + q.id + ', se omite.');
      continue;
    }

    // Aleatoriza qué brazo es A y cuál es B para que la evaluación sea ciega.
    const cascadeIsA = Math.random() < 0.5;
    const answerA = cascadeIsA ? cascade : panel;
    const answerB = cascadeIsA ? panel : cascade;

    blindRows.push({
      id: q.id,
      query: q.query,
      answerA: answerA ? answerA.winner ? answerA.winner.text : answerA.text : '[sin respuesta]',
      answerB: answerB ? answerB.winner ? answerB.winner.text : answerB.text : '[sin respuesta]'
    });

    answerKey.push({
      id: q.id,
      A: cascadeIsA ? 'cascada' : 'panel_juez',
      B: cascadeIsA ? 'panel_juez' : 'cascada',
      cascadeProvider: cascade ? cascade.provider : null,
      panelWinnerProvider: panel && panel.winner ? panel.winner.provider : null,
      panelCandidates: panel ? panel.candidates.map(c => c.provider) : [],
      panelJudge: panel ? panel.judge : null,
      panelJustification: panel ? panel.justification : null
    });
  }

  const sheetLines = ['# Hoja de evaluación ciega — Finanzas', '', 'Para cada consulta, marca cuál respuesta prefieres en grading.csv: A, B, o empate. No mires answer-key.json hasta terminar.', ''];
  for (const row of blindRows) {
    sheetLines.push('## ' + row.id);
    sheetLines.push('**Consulta:** ' + row.query);
    sheetLines.push('');
    sheetLines.push('**Respuesta A:**');
    sheetLines.push(row.answerA);
    sheetLines.push('');
    sheetLines.push('**Respuesta B:**');
    sheetLines.push(row.answerB);
    sheetLines.push('');
    sheetLines.push('---');
    sheetLines.push('');
  }
  fs.writeFileSync(path.join(OUT_DIR, 'blind-eval-sheet.md'), sheetLines.join('\n'));

  const gradingCsv = ['id,preferido(A/B/empate),notas'];
  for (const row of blindRows) gradingCsv.push(row.id + ',,');
  fs.writeFileSync(path.join(OUT_DIR, 'grading.csv'), gradingCsv.join('\n'));

  fs.writeFileSync(path.join(OUT_DIR, 'answer-key.json'), JSON.stringify(answerKey, null, 2));

  console.log('\nListo. ' + blindRows.length + ' consultas procesadas.');
  console.log('1. Abre results/blind-eval-sheet.md y lee las respuestas SIN abrir answer-key.json.');
  console.log('2. Rellena results/grading.csv con tu preferencia (A/B/empate) para cada id.');
  console.log('3. Corre: node score-results.js');
}

main().catch(e => { console.error('Error fatal:', e); process.exit(1); });
