// src/providers.config.js
var PROVIDERS = [
  {
    name: "kimi-together",
    label: "Kimi K2 (Moonshot AI, via Together AI)",
    envKey: "TOGETHER_KEY",
    url: "https://api.together.xyz/v1/chat/completions",
    model: "moonshotai/Kimi-K2-Instruct",
    tier: "fast",
    cost: 0,
    authStyle: "bearer",
    active: true,
    notes: 'Kimi K2 (Moonshot AI, modelo chino MoE con fuerte capacidad agentica/tool-use) via Together AI. Anadido a peticion del usuario (2026-07-08) para el sector Desarrollo/Estrategia. VERIFICADO 2026-07-08: Groq NO tiene ningun modelo Kimi/Moonshot en su catalogo (consultado /v1/models en vivo \u2014 se probaron "moonshotai/kimi-k2-instruct" y "-0905", ambos 404); Together SI lo lista bajo este id exacto. Requiere TOGETHER_KEY como wrangler secret (`npx wrangler secret put TOGETHER_KEY`, clave gratuita en together.ai) \u2014 sin ella cae en no_key y el cascade sigue con NVIDIA/Groq/Gemini como hasta ahora, sin romper nada.'
  },
  {
    name: "kimi-moonshot",
    label: "Kimi K2 (Moonshot AI, API oficial)",
    envKey: "MOONSHOT_KEY",
    url: "https://api.moonshot.ai/v1/chat/completions",
    model: "kimi-k2-0905-preview",
    tier: "fast",
    cost: 0,
    authStyle: "bearer",
    active: false,
    notes: "Alternativa directa a kimi-together si Together se retira o el usuario prefiere la API oficial de Moonshot (platform.moonshot.ai). Desactivada por defecto para no duplicar el mismo modelo dos veces en la cascada \u2014 activar solo si se deja de usar kimi-together. Requiere MOONSHOT_KEY."
  },
  {
    name: "groq",
    label: "Groq",
    envKey: "GROQ_KEY",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    tier: "fast",
    cost: 1,
    authStyle: "bearer",
    active: true,
    notes: "Ultra-fast Llama 70B. Reactivado para YC demo (2026-07-04)."
  },
  {
    name: "cerebras",
    label: "Cerebras",
    envKey: "CEREBRAS_KEY",
    url: "https://api.cerebras.ai/v1/chat/completions",
    model: "llama-3.3-70b",
    tier: "fast",
    cost: 1,
    authStyle: "bearer",
    active: false,
    notes: "Ultra-fast inference. Desactivado temporalmente."
  },
  {
    name: "sambanova",
    label: "SambaNova",
    envKey: "SAMBANOVA_KEY",
    url: "https://api.sambanova.ai/v1/chat/completions",
    model: "Meta-Llama-3.1-70B-Instruct",
    tier: "fast",
    cost: 1,
    authStyle: "bearer",
    active: false,
    notes: "Descartado del cat\xE1logo objetivo (sin free tier real y durable)."
  },
  {
    name: "grok",
    label: "Grok (xAI)",
    envKey: "GROK_KEY",
    url: "https://api.x.ai/v1/chat/completions",
    model: "grok-3-mini-fast",
    tier: "fast",
    cost: 2,
    authStyle: "bearer",
    active: false,
    notes: "Descartado del cat\xE1logo objetivo."
  },
  {
    name: "openai",
    label: "OpenAI",
    envKey: "OPENAI_KEY",
    url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
    tier: "slow",
    cost: 3,
    authStyle: "bearer",
    active: false,
    notes: "Descartado del cat\xE1logo objetivo."
  },
  {
    name: "gemini",
    label: "Gemini",
    envKey: "GEMINI_KEY",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: "gemini-2.0-flash",
    tier: "fast",
    cost: 1,
    authStyle: "bearer",
    active: true,
    notes: "Segundo proveedor confirmado (2026-07-03, decision de Ivan: solo NVIDIA NIM + Gemini). Requiere GEMINI_KEY como wrangler secret para activarse de verdad \u2014 la entrada estaba desactivada, el codigo esta listo pero falta el secreto."
  },
  {
    name: "mistral",
    label: "Mistral",
    envKey: "MISTRAL_KEY",
    url: "https://api.mistral.ai/v1/chat/completions",
    model: "mistral-small-latest",
    tier: "slow",
    cost: 2,
    authStyle: "bearer",
    active: false,
    notes: "Mistral small. Desactivado temporalmente."
  },
  {
    name: "deepseek",
    label: "DeepSeek",
    envKey: "DEEPSEEK_KEY",
    url: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-chat",
    tier: "slow",
    cost: 1,
    authStyle: "bearer",
    active: false,
    notes: "Descartado del cat\xE1logo objetivo."
  },
  {
    name: "together",
    label: "Together AI",
    envKey: "TOGETHER_KEY",
    url: "https://api.together.xyz/v1/chat/completions",
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    tier: "slow",
    cost: 1,
    authStyle: "bearer",
    active: false,
    notes: "Descartado del cat\xE1logo objetivo."
  },
  {
    name: "openrouter",
    label: "OpenRouter",
    envKey: "OPENROUTER_KEY",
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: "meta-llama/llama-3.3-70b-instruct",
    tier: "slow",
    cost: 2,
    authStyle: "bearer",
    active: false,
    notes: "Multi-provider router. Desactivado temporalmente."
  },
  {
    name: "opencode",
    label: "OpenCode Zen",
    envKey: "OPENCODE_KEY",
    url: "https://opencode.ai/zen/v1/chat/completions",
    model: "big-pickle",
    tier: "slow",
    cost: 0,
    authStyle: "bearer",
    active: false,
    notes: "Descartado del cat\xE1logo objetivo."
  },
  {
    name: "nvidia-glm",
    label: "NVIDIA NIM \u2014 GLM 5.1",
    envKey: "NVIDIA_KEY",
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    model: "z-ai/glm-5.1",
    tier: "fast",
    cost: 0,
    authStyle: "bearer",
    active: true,
    notes: "Modelo primario por decisi\xF3n expl\xEDcita. Requiere NVIDIA_KEY como wrangler secret (nunca en c\xF3digo fuente)."
  },
  {
    name: "nvidia-nemotron",
    label: "NVIDIA NIM \u2014 Nemotron 3 Ultra",
    envKey: "NVIDIA_KEY",
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    model: "nvidia/nemotron-3-ultra-550b-a55b",
    tier: "fast",
    cost: 0,
    authStyle: "bearer",
    active: true,
    notes: "Misma clave que nvidia-glm (NVIDIA_KEY). Fallback si el modelo GLM 5.1 falla o se retira del cat\xE1logo NIM. Los 5 modelos NVIDIA comparten cuota/infraestructura \u2014 no son independientes entre s\xED ante una ca\xEDda de NVIDIA o revocaci\xF3n de clave."
  },
  {
    name: "nvidia-gptoss",
    label: "NVIDIA NIM \u2014 gpt-oss 120B",
    envKey: "NVIDIA_KEY",
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    model: "openai/gpt-oss-120b",
    tier: "slow",
    cost: 0,
    authStyle: "bearer",
    active: true,
    notes: "Misma clave que nvidia-glm (NVIDIA_KEY). Razonamiento/tool-use \u2014 reemplaza a nvidia-deepseek (2026-07-03, decision de Ivan: 6 familias de modelo max, gpt-oss/llama/qwen en vez de deepseek directo)."
  },
  {
    name: "nvidia-llama",
    label: "NVIDIA NIM \u2014 Llama 4 Maverick",
    envKey: "NVIDIA_KEY",
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    model: "meta/llama-4-maverick-17b-128e-instruct",
    tier: "fast",
    cost: 0,
    authStyle: "bearer",
    active: true,
    notes: "Misma clave que nvidia-glm (NVIDIA_KEY). Multimodal nativo \u2014 modelo mas usado del catalogo NIM."
  },
  {
    name: "nvidia-qwen",
    label: "NVIDIA NIM \u2014 Qwen3 Coder 480B",
    envKey: "NVIDIA_KEY",
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    model: "qwen/qwen3-coder-480b-a35b-instruct",
    tier: "slow",
    cost: 0,
    authStyle: "bearer",
    active: true,
    notes: "Misma clave que nvidia-glm (NVIDIA_KEY). Especializado en agentic coding."
  },
  {
    name: "cloudflare",
    label: "Cloudflare Workers AI",
    envKey: "CF_AI_KEY",
    url: "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1/chat/completions",
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    tier: "fast",
    cost: 0,
    authStyle: "cf",
    active: false,
    notes: "Descartado del cat\xE1logo objetivo."
  },
  {
    name: "anthropic",
    label: "Anthropic",
    envKey: "ANTHROPIC_KEY",
    url: "https://api.anthropic.com/v1/messages",
    model: "claude-3-5-haiku-latest",
    tier: "slow",
    cost: 4,
    authStyle: "anthropic",
    active: false,
    notes: "Claude. Different API shape (messages, not chat.completions). Disabled until Phase 6."
  }
];
function activeProviders(filter = {}) {
  return PROVIDERS.filter(function(p) {
    if (!p.active) return false;
    if (filter.tier && p.tier !== filter.tier) return false;
    return true;
  });
}
function byTier(list) {
  return list.slice().sort(function(a, b) {
    if (a.tier === b.tier) return a.cost - b.cost;
    return a.tier === "fast" ? -1 : 1;
  });
}

// src/lib.js
function buildHeaders(provider, env, apiKey) {
  switch (provider.authStyle) {
    case "bearer":
      return { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey };
    case "xai":
      return { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey };
    case "gemini":
      return { "Content-Type": "application/json" };
    case "anthropic":
      return {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      };
    case "cf":
      return { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey };
    default:
      return { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey };
  }
}
function resolveUrl(provider, env) {
  if (provider.name === "cloudflare") {
    var acct = env.CF_ACCOUNT_ID || "";
    return provider.url.replace("{account_id}", acct);
  }
  return provider.url;
}
async function callProvider(provider, messages, options, env) {
  options = options || {};
  var startedAt = Date.now();
  var apiKey = env[provider.envKey];
  if (!apiKey) {
    return { ok: false, error: "no_key", provider: provider.name, latencyMs: 0 };
  }
  var url = resolveUrl(provider, env);
  var headers = buildHeaders(provider, env, apiKey);
  var body;
  if (provider.authStyle === "anthropic") {
    var systemMsg = (messages.find(function(m) {
      return m.role === "system";
    }) || {}).content || "";
    var userMsgs = messages.filter(function(m) {
      return m.role !== "system";
    });
    body = JSON.stringify({
      model: provider.model,
      system: systemMsg,
      messages: userMsgs,
      max_tokens: options.max_tokens || 1024,
      temperature: options.temperature != null ? options.temperature : 0.1
    });
  } else {
    body = JSON.stringify({
      model: provider.model,
      messages,
      temperature: options.temperature != null ? options.temperature : 0.1,
      max_tokens: options.max_tokens || 1024,
      stream: false
    });
  }
  try {
    var res = await fetch(url, { method: "POST", headers, body, signal: options.signal });
    var data;
    try {
      data = await res.json();
    } catch (e) {
      return { ok: false, error: "invalid_json", provider: provider.name, latencyMs: Date.now() - startedAt, status: res.status };
    }
    if (!res.ok || data.error) {
      return {
        ok: false,
        error: data.error && (data.error.message || data.error.code) || "http_" + res.status,
        provider: provider.name,
        latencyMs: Date.now() - startedAt,
        status: res.status
      };
    }
    var text = extractText(provider, data);
    var usage = data.usage || null;
    if (!text || !isValidContent(text)) {
      return { ok: false, error: "empty_or_invalid", provider: provider.name, latencyMs: Date.now() - startedAt };
    }
    return {
      ok: true,
      text,
      provider: provider.name,
      model: provider.model,
      latencyMs: Date.now() - startedAt,
      usage
    };
  } catch (e) {
    return {
      ok: false,
      error: e.name === "AbortError" ? "timeout" : e.message || "unknown",
      provider: provider.name,
      latencyMs: Date.now() - startedAt
    };
  }
}
function extractText(provider, data) {
  if (provider.authStyle === "anthropic") {
    return (data.content || []).map(function(b) {
      return b.text || "";
    }).join("").trim();
  }
  return (data.choices && data.choices[0] ? data.choices[0].message && data.choices[0].message.content || "" : "").trim();
}
function isValidContent(txt) {
  if (!txt || typeof txt !== "string") return false;
  var lower = txt.toLowerCase();
  var badSignals = [
    "does not support image",
    "this model does not support",
    "does not support vision",
    "cannot process image",
    "image input not supported",
    "vision input not supported",
    "unsupported image",
    "image.("
  ];
  for (var i = 0; i < badSignals.length; i++) {
    if (lower.indexOf(badSignals[i]) !== -1) return false;
  }
  if (lower.indexOf("cannot read") !== -1 && (lower.indexOf("image") !== -1 || lower.indexOf("png") !== -1 || lower.indexOf("jpg") !== -1 || lower.indexOf("gif") !== -1 || lower.indexOf("webp") !== -1)) return false;
  if (txt.length < 2) return false;
  return true;
}
function createBreaker(env) {
  var state = {};
  var thresholds = parseInt(env.BREAKER_FAILS) || 3;
  var cooldownMs = parseInt(env.BREAKER_COOLDOWN_MS) || 6e4;
  function record(name, ok) {
    if (!state[name]) state[name] = { failures: 0, lastFailure: 0, openUntil: 0 };
    if (ok) {
      state[name].failures = 0;
      state[name].openUntil = 0;
    } else {
      state[name].failures += 1;
      state[name].lastFailure = Date.now();
      if (state[name].failures >= thresholds) {
        state[name].openUntil = Date.now() + cooldownMs;
      }
    }
  }
  function isOpen(name) {
    var s = state[name];
    if (!s) return false;
    if (s.openUntil && Date.now() < s.openUntil) return true;
    if (s.openUntil && Date.now() >= s.openUntil) {
      s.openUntil = 0;
      s.failures = 0;
    }
    return false;
  }
  function snapshot() {
    var out = {};
    Object.keys(state).forEach(function(k) {
      out[k] = state[k];
    });
    return out;
  }
  function reset(name) {
    if (name) delete state[name];
    else state = {};
  }
  return { record, isOpen, snapshot, reset };
}
async function retry(fn, options) {
  options = options || {};
  var attempts = options.attempts || 2;
  var baseMs = options.baseMs || 300;
  var capMs = options.capMs || 3e3;
  var lastErr;
  for (var i = 0; i < attempts; i++) {
    try {
      var r = await fn(i);
      if (r && r.ok) return r;
      lastErr = r;
    } catch (e) {
      lastErr = { ok: false, error: e.message };
    }
    if (i < attempts - 1) {
      var delay = Math.min(capMs, baseMs * Math.pow(2, i));
      delay += Math.random() * delay * 0.3;
      await new Promise(function(r2) {
        setTimeout(r2, delay);
      });
    }
  }
  return lastErr;
}
async function cascade(providers, messages, options, env, breaker) {
  options = options || {};
  var perProviderMs = options.perProviderMs || 8e3;
  var totalBudgetMs = options.totalBudgetMs || 25e3;
  var startedAt = Date.now();
  var attempts = [];
  for (var i = 0; i < providers.length; i++) {
    if (Date.now() - startedAt > totalBudgetMs) {
      attempts.push({ provider: providers[i].name, error: "budget_exceeded" });
      break;
    }
    var p = providers[i];
    if (breaker && breaker.isOpen(p.name)) {
      attempts.push({ provider: p.name, error: "breaker_open" });
      continue;
    }
    var remaining = totalBudgetMs - (Date.now() - startedAt);
    var perMs = Math.min(perProviderMs, remaining);
    if (perMs <= 0) break;
    var controller = new AbortController();
    var timer = setTimeout(function() {
      controller.abort();
    }, perMs);
    var result = await retry(function() {
      return callProvider(p, messages, { signal: controller.signal, temperature: options.temperature, max_tokens: options.max_tokens }, env);
    }, { attempts: 2, baseMs: 200, capMs: 1e3 });
    clearTimeout(timer);
    if (breaker) breaker.record(p.name, !!result.ok);
    attempts.push({
      provider: p.name,
      ok: !!result.ok,
      error: result.ok ? null : result.error,
      latencyMs: result.latencyMs
    });
    if (result.ok) {
      return { ok: true, result, attempts };
    }
  }
  return { ok: false, attempts, error: "all_failed" };
}
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
function jsonResponse(data, status, extraHeaders) {
  var headers = Object.assign({}, CORS_HEADERS, { "Content-Type": "application/json" });
  if (extraHeaders) {
    Object.keys(extraHeaders).forEach(function(k) {
      headers[k] = extraHeaders[k];
    });
  }
  return new Response(JSON.stringify(data), { status: status || 200, headers });
}

// src/worker.js
var worker_default = {
  fetch: handleRequest
};
async function handleRequest(request, env, ctx) {
  var url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (url.pathname === "/health") {
    return jsonResponse({
      status: "ok",
      version: "x1-proxy-v4",
      timestamp: Date.now()
    });
  }
  var authError = checkAuth(request, env);
  if (authError) return authError;
  var rateLimitError = await checkRateLimit(request, env, ctx);
  if (rateLimitError) return rateLimitError;
  if (url.pathname === "/debug") {
    return jsonResponse({
      version: "x1-proxy-v4",
      providers: providerStatus(env),
      breaker: breakerSnapshot(env, ctx)
    });
  }
  if (url.pathname === "/debug/provider" && request.method === "GET") {
    var name = url.searchParams.get("name");
    var target = PROVIDERS.find(function(p) {
      return p.name === name;
    });
    if (!target) return jsonResponse({ error: "unknown_provider", name }, 404);
    var r = await callProvider(target, [{ role: "user", content: "say hi in one word" }], { max_tokens: 20 }, env);
    return jsonResponse(r);
  }
  if (url.pathname === "/commands/queue" && request.method === "POST") {
    return queueCommand(request, env);
  }
  if (url.pathname === "/commands/poll" && request.method === "GET") {
    return pollCommands(env);
  }
  if (request.method !== "POST" || url.pathname !== "/v1/chat/completions") {
    return jsonResponse({ error: "Not found" }, 404);
  }
  var body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  var messages = body.messages;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return jsonResponse({ error: "messages array required" }, 400);
  }
  var chain = byTier(activeProviders());
  var breaker = getOrCreateBreaker(ctx);
  var result = await cascade(chain, messages, {
    perProviderMs: parseInt(env.PER_PROVIDER_MS) || 8e3,
    totalBudgetMs: parseInt(env.TOTAL_BUDGET_MS) || 25e3,
    temperature: body.temperature,
    max_tokens: body.max_tokens
  }, env, breaker);
  if (!result.ok) {
    return jsonResponse({
      error: "All AI providers failed",
      attempts: result.attempts
    }, 503);
  }
  var r = result.result;
  return jsonResponse({
    id: "x1-" + Date.now(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1e3),
    model: r.model,
    choices: [{
      index: 0,
      message: { role: "assistant", content: r.text },
      finish_reason: "stop"
    }],
    usage: r.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    x_provider: r.provider,
    x_latency_ms: r.latencyMs
  }, 200, {
    "X-AI-Provider": r.provider,
    "X-AI-Latency-Ms": String(r.latencyMs)
  });
}
function checkAuth(request, env) {
  var configured = env.PROXY_SHARED_SECRET;
  if (!configured) {
    return jsonResponse({ error: "proxy_not_configured" }, 503);
  }
  var provided = request.headers.get("X-X1-Auth");
  if (provided !== configured) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }
  return null;
}
async function checkRateLimit(request, env, ctx) {
  if (!env.X1_KV) return null;
  var ip = request.headers.get("CF-Connecting-IP") || "unknown";
  var limit = parseInt(env.RATE_LIMIT_PER_MIN) || 30;
  var bucket = "rl:" + ip + ":" + Math.floor(Date.now() / 6e4);
  var current = parseInt(await env.X1_KV.get(bucket)) || 0;
  if (current >= limit) {
    return jsonResponse({ error: "rate_limited" }, 429);
  }
  ctx.waitUntil(env.X1_KV.put(bucket, String(current + 1), { expirationTtl: 90 }));
  return null;
}
var COMMAND_QUEUE_KEY = "x1:command-queue";
var COMMAND_QUEUE_MAX = 50;
async function queueCommand(request, env) {
  if (!env.X1_KV) return jsonResponse({ error: "queue_not_configured", hint: "bind X1_KV in wrangler.toml" }, 501);
  var body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  if (!body || typeof body.command !== "string" || !body.command.trim()) {
    return jsonResponse({ error: "command (string) required" }, 400);
  }
  var raw = await env.X1_KV.get(COMMAND_QUEUE_KEY);
  var queue = [];
  try {
    queue = raw ? JSON.parse(raw) : [];
  } catch (e) {
    queue = [];
  }
  queue.push({ command: body.command.trim(), meta: body.meta || {}, queuedAt: Date.now() });
  if (queue.length > COMMAND_QUEUE_MAX) queue = queue.slice(queue.length - COMMAND_QUEUE_MAX);
  await env.X1_KV.put(COMMAND_QUEUE_KEY, JSON.stringify(queue));
  return jsonResponse({ ok: true, queued: queue.length });
}
async function pollCommands(env) {
  if (!env.X1_KV) return jsonResponse({ commands: [] });
  var raw = await env.X1_KV.get(COMMAND_QUEUE_KEY);
  var queue = [];
  try {
    queue = raw ? JSON.parse(raw) : [];
  } catch (e) {
    queue = [];
  }
  if (queue.length > 0) await env.X1_KV.put(COMMAND_QUEUE_KEY, JSON.stringify([]));
  return jsonResponse({ commands: queue });
}
function providerStatus(env) {
  var out = {};
  PROVIDERS.forEach(function(p) {
    out[p.name] = {
      active: p.active,
      tier: p.tier,
      cost: p.cost,
      configured: !!env[p.envKey],
      model: p.model
    };
  });
  return out;
}
function getOrCreateBreaker(ctx) {
  if (!ctx.__x1breaker) ctx.__x1breaker = createBreaker({});
  return ctx.__x1breaker;
}
function breakerSnapshot(env, ctx) {
  var b = getOrCreateBreaker(ctx);
  return b.snapshot();
}
export {
  worker_default as default
};
