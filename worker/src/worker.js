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

  // Health
  if (url.pathname === '/health') {
    return jsonResponse({
      status: 'ok',
      version: 'x1-proxy-v4',
      timestamp: Date.now(),
      providers: providerStatus(env)
    });
  }

  // Debug
  if (url.pathname === '/debug') {
    return jsonResponse({
      version: 'x1-proxy-v4',
      providers: providerStatus(env),
      breaker: breakerSnapshot(env, ctx)
    });
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