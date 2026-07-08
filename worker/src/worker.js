// ═══════════════════════════════════════════
// X1 Proxy — Cloudflare Worker
// AI gateway: validates → cascades providers → returns OpenAI-compat.
// ═══════════════════════════════════════════

import { PROVIDERS, activeProviders, byTier } from './providers.config.js';
import {
  cascade,
  createBreaker,
  CORS_HEADERS,
  jsonResponse
} from './lib.js';

export default {
  fetch: handleRequest
};

async function handleRequest(request, env, ctx) {
  var url = new URL(request.url);

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Health — left open, no secrets or spend-relevant info exposed.
  if (url.pathname === '/health') {
    return jsonResponse({
      status: 'ok',
      version: 'x1-proxy-v4',
      timestamp: Date.now()
    });
  }

  // GitHub OAuth code->token exchange. The extension shows the real GitHub
  // login/authorize popup (chrome.identity.launchWebAuthFlow) and gets back
  // an authorization `code`; exchanging that code for an access_token requires
  // the app's client_secret, which must never live in extension code (a
  // Chrome extension's source is fully readable by anyone who unpacks it —
  // that's exactly how the previous secret ended up leaked). The worker holds
  // it server-side instead. Placed BEFORE checkAuth deliberately: this is the
  // login flow itself (the extension has no PROXY_SHARED_SECRET context to
  // send yet at this point), it only costs GitHub API calls (not AI provider
  // spend), and gating it here would make login always fail with 401.
  if (url.pathname === '/github/exchange' && request.method === 'POST') {
    return exchangeGithubCode(request, env);
  }

  // Everything past this point costs money or leaks infra info — gate it.
  var authError = checkAuth(request, env);
  if (authError) return authError;

  var rateLimitError = await checkRateLimit(request, env, ctx);
  if (rateLimitError) return rateLimitError;

  // Debug
  if (url.pathname === '/debug') {
    return jsonResponse({
      version: 'x1-proxy-v4',
      providers: providerStatus(env),
      breaker: breakerSnapshot(env, ctx)
    });
  }

  // External command reception (B.14) — lets n8n/Zapier queue a command for
  // X1 to pick up on its next poll, without X1 needing a public URL of its own.
  if (url.pathname === '/commands/queue' && request.method === 'POST') {
    return queueCommand(request, env);
  }
  if (url.pathname === '/commands/poll' && request.method === 'GET') {
    return pollCommands(env);
  }

  // Only POST to /v1/chat/completions
  if (request.method !== 'POST' || url.pathname !== '/v1/chat/completions') {
    return jsonResponse({ error: 'Not found' }, 404);
  }

  // Parse + validate body
  var body;
  try { body = await request.json(); }
  catch (e) { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  var messages = body.messages;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return jsonResponse({ error: 'messages array required' }, 400);
  }

  // Build provider chain — fast tier first, then slow.
  var chain = byTier(activeProviders());

  // Cascade with breaker
  var breaker = getOrCreateBreaker(ctx);
  var result = await cascade(chain, messages, {
    perProviderMs: parseInt(env.PER_PROVIDER_MS) || 8000,
    totalBudgetMs: parseInt(env.TOTAL_BUDGET_MS) || 25000,
    temperature: body.temperature,
    max_tokens: body.max_tokens
  }, env, breaker);

  if (!result.ok) {
    return jsonResponse({
      error: 'All AI providers failed',
      attempts: result.attempts
    }, 503);
  }

  // OpenAI-compatible response
  var r = result.result;
  return jsonResponse({
    id: 'x1-' + Date.now(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: r.model,
    choices: [{
      index: 0,
      message: { role: 'assistant', content: r.text },
      finish_reason: 'stop'
    }],
    usage: r.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    x_provider: r.provider,
    x_latency_ms: r.latencyMs
  }, 200, {
    'X-AI-Provider': r.provider,
    'X-AI-Latency-Ms': String(r.latencyMs)
  });
}

// ── helpers ──

// Shared-secret gate. Fails closed: if PROXY_SHARED_SECRET isn't set, every
// paid/info-leaking route is refused rather than silently staying open.
// Set it with: npx wrangler secret put PROXY_SHARED_SECRET
// The extension must send the same value in the X-X1-Auth header (Settings → proxySecret).
function checkAuth(request, env) {
  var configured = env.PROXY_SHARED_SECRET;
  if (!configured) {
    return jsonResponse({ error: 'proxy_not_configured' }, 503);
  }
  var provided = request.headers.get('X-X1-Auth');
  if (provided !== configured) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }
  return null;
}

// Per-IP rate limit backed by KV. No-ops until X1_KV is bound in wrangler.toml
// (see the Phase 5 comment there) — the shared secret above is the primary gate.
async function checkRateLimit(request, env, ctx) {
  if (!env.X1_KV) return null;
  var ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  var limit = parseInt(env.RATE_LIMIT_PER_MIN) || 30;
  var bucket = 'rl:' + ip + ':' + Math.floor(Date.now() / 60000);
  var current = parseInt(await env.X1_KV.get(bucket)) || 0;
  if (current >= limit) {
    return jsonResponse({ error: 'rate_limited' }, 429);
  }
  ctx.waitUntil(env.X1_KV.put(bucket, String(current + 1), { expirationTtl: 90 }));
  return null;
}

// External command queue (B.14). Requires X1_KV — without it, commands would
// only survive within a single isolate and could vanish before X1 ever polls,
// so this fails explicitly rather than pretending to queue reliably.
var COMMAND_QUEUE_KEY = 'x1:command-queue';
var COMMAND_QUEUE_MAX = 50;

async function queueCommand(request, env) {
  if (!env.X1_KV) return jsonResponse({ error: 'queue_not_configured', hint: 'bind X1_KV in wrangler.toml' }, 501);
  var body;
  try { body = await request.json(); } catch (e) { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  if (!body || typeof body.command !== 'string' || !body.command.trim()) {
    return jsonResponse({ error: 'command (string) required' }, 400);
  }
  var raw = await env.X1_KV.get(COMMAND_QUEUE_KEY);
  var queue = [];
  try { queue = raw ? JSON.parse(raw) : []; } catch (e) { queue = []; }
  queue.push({ command: body.command.trim(), meta: body.meta || {}, queuedAt: Date.now() });
  if (queue.length > COMMAND_QUEUE_MAX) queue = queue.slice(queue.length - COMMAND_QUEUE_MAX);
  await env.X1_KV.put(COMMAND_QUEUE_KEY, JSON.stringify(queue));
  return jsonResponse({ ok: true, queued: queue.length });
}

async function pollCommands(env) {
  if (!env.X1_KV) return jsonResponse({ commands: [] });
  var raw = await env.X1_KV.get(COMMAND_QUEUE_KEY);
  var queue = [];
  try { queue = raw ? JSON.parse(raw) : []; } catch (e) { queue = []; }
  if (queue.length > 0) await env.X1_KV.put(COMMAND_QUEUE_KEY, JSON.stringify([]));
  return jsonResponse({ commands: queue });
}

// client_id is not secret (GitHub OAuth app IDs are public, and this one is
// already embedded in the extension's authorize URL) — only the secret set
// via `npx wrangler secret put GITHUB_CLIENT_SECRET` stays server-side.
var GITHUB_CLIENT_ID = 'Ov23limUz0ywpxqoPJXo';

async function exchangeGithubCode(request, env) {
  if (!env.GITHUB_CLIENT_SECRET) {
    return jsonResponse({ error: 'github_oauth_not_configured', hint: 'set GITHUB_CLIENT_SECRET via wrangler secret put' }, 503);
  }
  var body;
  try { body = await request.json(); } catch (e) { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  if (!body || typeof body.code !== 'string' || !body.code) {
    return jsonResponse({ error: 'code required' }, 400);
  }
  var res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: body.code,
      redirect_uri: body.redirect_uri
    })
  });
  var data = await res.json().catch(function () { return {}; });
  if (!data.access_token) {
    return jsonResponse({ error: data.error_description || data.error || 'exchange_failed' }, 400);
  }
  return jsonResponse({ access_token: data.access_token });
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

// Per-worker breaker, persisted via ctx (only survives within a single isolate).
// For cross-worker sharing, swap to KV-backed state in Phase 5.
function getOrCreateBreaker(ctx) {
  if (!ctx.__x1breaker) ctx.__x1breaker = createBreaker({});
  return ctx.__x1breaker;
}

function breakerSnapshot(env, ctx) {
  var b = getOrCreateBreaker(ctx);
  return b.snapshot();
}