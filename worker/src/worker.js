// ═══════════════════════════════════════════
// X1 Proxy — Cloudflare Worker
// Central AI gateway for X1 extension.
// Uses server-side keys, rate-limited per IP.
// ═══════════════════════════════════════════

var CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// ── Rate limiting ──

async function checkRateLimit(request, env) {
  var ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  var key = 'rl:' + ip;
  var limit = parseInt(env.RATE_LIMIT_PER_MIN) || 60;
  var kv = typeof X1_KV !== 'undefined' ? X1_KV : (typeof CBOS_KV !== 'undefined' ? CBOS_KV : null);
  if (!kv) return true;
  var count = parseInt(await kv.get(key)) || 0;
  if (count >= limit) return false;
  await kv.put(key, String(count + 1), { expirationTtl: 60 });
  return true;
}

// ── Provider functions ──

function callOpenAI(url, key, model, messages, signal) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.1,
      max_tokens: 1000
    }),
    signal: signal
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (data.error) return null;
    var txt = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
    if (!txt || /cannot\s+read|does\s+not\s+support\s+image|image\.(png|jpg|jpeg|gif|webp)/i.test(txt)) return null;
    return txt;
  }).catch(function() { return null; });
}

function tryOpenCode(messages, env, signal) {
  if (!env.OPENCODE_KEY) return Promise.resolve(null);
  return callOpenAI('https://opencode.ai/zen/v1/chat/completions', env.OPENCODE_KEY, 'big-pickle', messages, signal);
}

function tryGroq(messages, env, signal) {
  if (!env.GROQ_KEY) return Promise.resolve(null);
  return callOpenAI('https://api.groq.com/openai/v1/chat/completions', env.GROQ_KEY, 'llama-3.3-70b-versatile', messages, signal);
}

function tryGrok(messages, env, signal) {
  if (!env.GROK_KEY) return Promise.resolve(null);
  return callOpenAI('https://api.x.ai/v1/chat/completions', env.GROK_KEY, 'grok-3-mini-fast', messages, signal);
}

function tryOpenAI(messages, env, signal) {
  if (!env.OPENAI_KEY) return Promise.resolve(null);
  return callOpenAI('https://api.openai.com/v1/chat/completions', env.OPENAI_KEY, 'gpt-4o-mini', messages, signal);
}

function tryGemini(messages, env, signal) {
  if (!env.GEMINI_KEY) return Promise.resolve(null);
  return callOpenAI('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', env.GEMINI_KEY, 'gemini-2.0-flash', messages, signal);
}

// ── Cascade: try each provider until one returns valid text ──

function aiCascade(messages, env, signal) {
  var providers = [
    { name: 'groq', fn: tryGroq },
    { name: 'grok', fn: tryGrok },
    { name: 'openai', fn: tryOpenAI },
    { name: 'opencode', fn: tryOpenCode },
    { name: 'gemini', fn: tryGemini }
  ];
  function tryNext(i) {
    if (i >= providers.length) return Promise.resolve(null);
    var p = providers[i];
    console.log('Trying provider: ' + p.name);
    return p.fn(messages, env, signal).then(function(txt) {
      if (txt) {
        console.log('Provider ' + p.name + ' succeeded');
        return { text: txt, provider: p.name };
      }
      console.log('Provider ' + p.name + ' returned empty/invalid response');
      return tryNext(i + 1);
    }).catch(function(err) {
      console.log('Provider ' + p.name + ' failed with error: ' + (err ? (err.message || err) : 'unknown'));
      return tryNext(i + 1);
    });
  }
  return tryNext(0);
}

// ── Request handler ──

async function handleRequest(request, env) {
  var url = new URL(request.url);

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Health check
  if (url.pathname === '/health') {
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  // Debug
  if (url.pathname === '/debug') {
    return new Response(JSON.stringify({status:'ok',providers:['opencode','groq','grok','openai','gemini'],keys:{opencode:!!env.OPENCODE_KEY,groq:!!env.GROQ_KEY,grok:!!env.GROK_KEY,openai:!!env.OPENAI_KEY,gemini:!!env.GEMINI_KEY}}), {
      status:200, headers:{'Content-Type':'application/json',...CORS_HEADERS}
    });
  }

  // Only POST to /v1/chat/completions
  if (request.method !== 'POST' || url.pathname !== '/v1/chat/completions') {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  // Rate limit
  // (KV commented out for now — requires CF Workers Paid or KV namespace binding)
  // if (!(await checkRateLimit(request, env))) {
  //   return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
  //     status: 429,
  //     headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  //   });
  // }

  // Parse body
  var body;
  try { body = await request.json(); } catch(e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  var messages = body.messages;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages array required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  // Cascade through providers with 25s timeout total
  var controller = new AbortController();
  var timer = setTimeout(function() { controller.abort(); }, 25000);

  try {
    var result = await aiCascade(messages, env, controller.signal);
    clearTimeout(timer);

    if (!result || !result.text) {
      return new Response(JSON.stringify({ error: 'All AI providers failed' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    var text = result.text;
    var provider = result.provider;

    var responseHeaders = {};
    for (var k in CORS_HEADERS) {
      responseHeaders[k] = CORS_HEADERS[k];
    }
    responseHeaders['Content-Type'] = 'application/json';
    responseHeaders['X-AI-Provider'] = provider;

    return new Response(JSON.stringify({
      id: 'x1-' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'x1-proxy',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: text },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    }), {
      status: 200,
      headers: responseHeaders
    });
  } catch(e) {
    clearTimeout(timer);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

export default {
  fetch: handleRequest
};
