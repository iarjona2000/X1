// ═══════════════════════════════════════════
// X1 Proxy — Core Library
// Unified: callProvider, parseJSON, circuitBreaker, retry-with-backoff.
// ═══════════════════════════════════════════

import { PROVIDERS } from './providers.config.js';

// ── Headers per auth style ──
function buildHeaders(provider, env, apiKey) {
  switch (provider.authStyle) {
    case 'bearer':
      return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey };
    case 'xai':
      return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey };
    case 'gemini':
      return { 'Content-Type': 'application/json' };
    case 'anthropic':
      return {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      };
    case 'cf':
      return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey };
    default:
      return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey };
  }
}

function resolveUrl(provider, env) {
  if (provider.name === 'cloudflare') {
    var acct = env.CF_ACCOUNT_ID || '';
    return provider.url.replace('{account_id}', acct);
  }
  return provider.url;
}

// ── Unified provider call (single source of truth) ──
// Returns { ok, text, provider, model, latencyMs, usage, error }
export async function callProvider(provider, messages, options, env) {
  options = options || {};
  var startedAt = Date.now();
  var apiKey = env[provider.envKey];
  if (!apiKey) {
    return { ok: false, error: 'no_key', provider: provider.name, latencyMs: 0 };
  }

  var url = resolveUrl(provider, env);
  var headers = buildHeaders(provider, env, apiKey);
  var body;

  if (provider.authStyle === 'anthropic') {
    // Anthropic uses a different body shape
    var systemMsg = (messages.find(function(m) { return m.role === 'system'; }) || {}).content || '';
    var userMsgs = messages.filter(function(m) { return m.role !== 'system'; });
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
      messages: messages,
      temperature: options.temperature != null ? options.temperature : 0.1,
      max_tokens: options.max_tokens || 1024,
      stream: false
    });
  }

  try {
    var res = await fetch(url, { method: 'POST', headers: headers, body: body, signal: options.signal });
    var data;
    try { data = await res.json(); } catch (e) {
      return { ok: false, error: 'invalid_json', provider: provider.name, latencyMs: Date.now() - startedAt, status: res.status };
    }

    if (!res.ok || data.error) {
      return {
        ok: false,
        error: (data.error && (data.error.message || data.error.code)) || ('http_' + res.status),
        provider: provider.name,
        latencyMs: Date.now() - startedAt,
        status: res.status
      };
    }

    // Extract text in a provider-aware way
    var text = extractText(provider, data);
    var usage = data.usage || null;
    if (!text || !isValidContent(text)) {
      return { ok: false, error: 'empty_or_invalid', provider: provider.name, latencyMs: Date.now() - startedAt };
    }

    return {
      ok: true,
      text: text,
      provider: provider.name,
      model: provider.model,
      latencyMs: Date.now() - startedAt,
      usage: usage
    };
  } catch (e) {
    return {
      ok: false,
      error: e.name === 'AbortError' ? 'timeout' : (e.message || 'unknown'),
      provider: provider.name,
      latencyMs: Date.now() - startedAt
    };
  }
}

function extractText(provider, data) {
  if (provider.authStyle === 'anthropic') {
    return ((data.content || []).map(function(b) { return b.text || ''; }).join('')).trim();
  }
  return ((data.choices && data.choices[0]) ? (data.choices[0].message && data.choices[0].message.content || '') : '').trim();
}

// ── Output validation ──
export function isValidContent(txt) {
  if (!txt || typeof txt !== 'string') return false;
  var lower = txt.toLowerCase();
  var badSignals = [
    'does not support image',
    'this model does not support',
    'does not support vision',
    'cannot process image',
    'image input not supported',
    'vision input not supported',
    'unsupported image',
    'image.('
  ];
  for (var i = 0; i < badSignals.length; i++) {
    if (lower.indexOf(badSignals[i]) !== -1) return false;
  }
  if (lower.indexOf('cannot read') !== -1 && (lower.indexOf('image') !== -1 || lower.indexOf('png') !== -1 || lower.indexOf('jpg') !== -1 || lower.indexOf('gif') !== -1 || lower.indexOf('webp') !== -1)) return false;
  if (txt.length < 2) return false;
  return true;
}

// ── JSON extraction from model output ──
export function parseJSON(txt) {
  if (!txt || typeof txt !== 'string') return null;
  // Strip code fences
  var cleaned = txt.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();

  // Try strict object parse
  var m = cleaned.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch (e) {
      try {
        var fixed = m[0]
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/'/g, '"');
        return JSON.parse(fixed);
      } catch (e2) { /* fall through */ }
    }
  }
  // Try array
  var ma = cleaned.match(/\[[\s\S]*\]/);
  if (ma) {
    try { return { steps: JSON.parse(ma[0]) }; } catch (e) { /* fall through */ }
  }
  // Fallback: treat whole text as 'speak'
  if (cleaned.length > 3) return { action: 'speak', text: cleaned };
  return null;
}

// ── Circuit breaker per provider ──
// State: { failures: number, lastFailure: ms, openUntil: ms }
// Open = skip provider until openUntil. Closed = try normally.
export function createBreaker(env) {
  var state = {};
  var thresholds = parseInt(env.BREAKER_FAILS) || 3;
  var cooldownMs = parseInt(env.BREAKER_COOLDOWN_MS) || 60000;

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
      // half-open: reset, will try once
      s.openUntil = 0;
      s.failures = 0;
    }
    return false;
  }

  function snapshot() {
    var out = {};
    Object.keys(state).forEach(function(k) { out[k] = state[k]; });
    return out;
  }

  function reset(name) {
    if (name) delete state[name];
    else state = {};
  }

  return { record: record, isOpen: isOpen, snapshot: snapshot, reset: reset };
}

// ── Retry with exponential backoff + jitter ──
export async function retry(fn, options) {
  options = options || {};
  var attempts = options.attempts || 2;
  var baseMs = options.baseMs || 300;
  var capMs = options.capMs || 3000;
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
      delay += Math.random() * delay * 0.3; // ±30% jitter
      await new Promise(function(r) { setTimeout(r, delay); });
    }
  }
  return lastErr;
}

// ── Cascade with breaker + retry ──
// Tries each provider in order, skipping open breakers, with one retry each.
// Returns first ok result, or aggregated failure.
export async function cascade(providers, messages, options, env, breaker) {
  options = options || {};
  var perProviderMs = options.perProviderMs || 8000;
  var totalBudgetMs = options.totalBudgetMs || 25000;
  var startedAt = Date.now();
  var attempts = [];

  for (var i = 0; i < providers.length; i++) {
    if (Date.now() - startedAt > totalBudgetMs) {
      attempts.push({ provider: providers[i].name, error: 'budget_exceeded' });
      break;
    }
    var p = providers[i];
    if (breaker && breaker.isOpen(p.name)) {
      attempts.push({ provider: p.name, error: 'breaker_open' });
      continue;
    }

    var remaining = totalBudgetMs - (Date.now() - startedAt);
    var perMs = Math.min(perProviderMs, remaining);
    if (perMs <= 0) break;
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, perMs);

    var result = await retry(function() {
      return callProvider(p, messages, { signal: controller.signal, temperature: options.temperature, max_tokens: options.max_tokens }, env);
    }, { attempts: 2, baseMs: 200, capMs: 1000 });

    clearTimeout(timer);

    if (breaker) breaker.record(p.name, !!result.ok);
    attempts.push({
      provider: p.name,
      ok: !!result.ok,
      error: result.ok ? null : result.error,
      latencyMs: result.latencyMs
    });
    if (result.ok) {
      return { ok: true, result: result, attempts: attempts };
    }
  }

  return { ok: false, attempts: attempts, error: 'all_failed' };
}

// ── CORS headers ──
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// ── JSON response helper ──
export function jsonResponse(data, status, extraHeaders) {
  var headers = Object.assign({}, CORS_HEADERS, { 'Content-Type': 'application/json' });
  if (extraHeaders) {
    Object.keys(extraHeaders).forEach(function(k) { headers[k] = extraHeaders[k]; });
  }
  return new Response(JSON.stringify(data), { status: status || 200, headers: headers });
}