// ═══════════════════════════════════════════
// X1 Proxy — Provider Catalog
// Single source of truth for all AI providers.
// Adding a new provider = adding one entry here.
// ═══════════════════════════════════════════

// Each provider:
//   name      — internal id
//   label     — display name
//   envKey    — secret name in wrangler
//   url       — chat completions endpoint (OpenAI-compatible)
//   model     — default model id
//   tier      — 'fast' (<2s typical) | 'slow' (>2s typical)
//   cost      — relative cost (1 = cheapest)
//   authStyle — 'bearer' for OpenAI-compat / 'xai' for Grok / 'gemini' for Google
//   active    — false to disable without removing the entry
//   notes     — free-form

export const PROVIDERS = [
  {
    name: 'groq',
    label: 'Groq',
    envKey: 'GROQ_KEY',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    tier: 'fast',
    cost: 1,
    authStyle: 'bearer',
    active: true,
    notes: 'Ultra-fast Llama 70B. Reactivado para YC demo (2026-07-04).'
  },
  {
    name: 'cerebras',
    label: 'Cerebras',
    envKey: 'CEREBRAS_KEY',
    url: 'https://api.cerebras.ai/v1/chat/completions',
    model: 'llama-3.3-70b',
    tier: 'fast',
    cost: 1,
    authStyle: 'bearer',
    active: false,
    notes: 'Ultra-fast inference. Desactivado temporalmente.'
  },
  {
    name: 'sambanova',
    label: 'SambaNova',
    envKey: 'SAMBANOVA_KEY',
    url: 'https://api.sambanova.ai/v1/chat/completions',
    model: 'Meta-Llama-3.1-70B-Instruct',
    tier: 'fast',
    cost: 1,
    authStyle: 'bearer',
    active: false,
    notes: 'Descartado del catálogo objetivo (sin free tier real y durable).'
  },
  {
    name: 'grok',
    label: 'Grok (xAI)',
    envKey: 'GROK_KEY',
    url: 'https://api.x.ai/v1/chat/completions',
    model: 'grok-3-mini-fast',
    tier: 'fast',
    cost: 2,
    authStyle: 'bearer',
    active: false,
    notes: 'Descartado del catálogo objetivo.'
  },
  {
    name: 'openai',
    label: 'OpenAI',
    envKey: 'OPENAI_KEY',
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    tier: 'slow',
    cost: 3,
    authStyle: 'bearer',
    active: false,
    notes: 'Descartado del catálogo objetivo.'
  },
  {
    name: 'gemini',
    label: 'Gemini',
    envKey: 'GEMINI_KEY',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-2.0-flash',
    tier: 'fast',
    cost: 1,
    authStyle: 'bearer',
    active: true,
    notes: 'Segundo proveedor confirmado (2026-07-03, decision de Ivan: solo NVIDIA NIM + Gemini). Requiere GEMINI_KEY como wrangler secret para activarse de verdad — la entrada estaba desactivada, el codigo esta listo pero falta el secreto.'
  },
  {
    name: 'mistral',
    label: 'Mistral',
    envKey: 'MISTRAL_KEY',
    url: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-small-latest',
    tier: 'slow',
    cost: 2,
    authStyle: 'bearer',
    active: false,
    notes: 'Mistral small. Desactivado temporalmente.'
  },
  {
    name: 'deepseek',
    label: 'DeepSeek',
    envKey: 'DEEPSEEK_KEY',
    url: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    tier: 'slow',
    cost: 1,
    authStyle: 'bearer',
    active: false,
    notes: 'Descartado del catálogo objetivo.'
  },
  {
    name: 'together',
    label: 'Together AI',
    envKey: 'TOGETHER_KEY',
    url: 'https://api.together.xyz/v1/chat/completions',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    tier: 'slow',
    cost: 1,
    authStyle: 'bearer',
    active: false,
    notes: 'Descartado del catálogo objetivo.'
  },
  {
    name: 'openrouter',
    label: 'OpenRouter',
    envKey: 'OPENROUTER_KEY',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.3-70b-instruct',
    tier: 'slow',
    cost: 2,
    authStyle: 'bearer',
    active: false,
    notes: 'Multi-provider router. Desactivado temporalmente.'
  },
  {
    name: 'opencode',
    label: 'OpenCode Zen',
    envKey: 'OPENCODE_KEY',
    url: 'https://opencode.ai/zen/v1/chat/completions',
    model: 'big-pickle',
    tier: 'slow',
    cost: 0,
    authStyle: 'bearer',
    active: false,
    notes: 'Descartado del catálogo objetivo.'
  },
  {
    name: 'nvidia-glm',
    label: 'NVIDIA NIM — GLM 5.1',
    envKey: 'NVIDIA_KEY',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'z-ai/glm-5.1',
    tier: 'fast',
    cost: 0,
    authStyle: 'bearer',
    active: true,
    notes: 'Modelo primario por decisión explícita. Requiere NVIDIA_KEY como wrangler secret (nunca en código fuente).'
  },
  {
    name: 'nvidia-nemotron',
    label: 'NVIDIA NIM — Nemotron 3 Ultra',
    envKey: 'NVIDIA_KEY',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'nvidia/nemotron-3-ultra-550b-a55b',
    tier: 'fast',
    cost: 0,
    authStyle: 'bearer',
    active: true,
    notes: 'Misma clave que nvidia-glm (NVIDIA_KEY). Fallback si el modelo GLM 5.1 falla o se retira del catálogo NIM. Los 5 modelos NVIDIA comparten cuota/infraestructura — no son independientes entre sí ante una caída de NVIDIA o revocación de clave.'
  },
  {
    name: 'nvidia-gptoss',
    label: 'NVIDIA NIM — gpt-oss 120B',
    envKey: 'NVIDIA_KEY',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'openai/gpt-oss-120b',
    tier: 'slow',
    cost: 0,
    authStyle: 'bearer',
    active: true,
    notes: 'Misma clave que nvidia-glm (NVIDIA_KEY). Razonamiento/tool-use — reemplaza a nvidia-deepseek (2026-07-03, decision de Ivan: 6 familias de modelo max, gpt-oss/llama/qwen en vez de deepseek directo).'
  },
  {
    name: 'nvidia-llama',
    label: 'NVIDIA NIM — Llama 4 Maverick',
    envKey: 'NVIDIA_KEY',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'meta/llama-4-maverick-17b-128e-instruct',
    tier: 'fast',
    cost: 0,
    authStyle: 'bearer',
    active: true,
    notes: 'Misma clave que nvidia-glm (NVIDIA_KEY). Multimodal nativo — modelo mas usado del catalogo NIM.'
  },
  {
    name: 'nvidia-qwen',
    label: 'NVIDIA NIM — Qwen3 Coder 480B',
    envKey: 'NVIDIA_KEY',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'qwen/qwen3-coder-480b-a35b-instruct',
    tier: 'slow',
    cost: 0,
    authStyle: 'bearer',
    active: true,
    notes: 'Misma clave que nvidia-glm (NVIDIA_KEY). Especializado en agentic coding.'
  },
  {
    name: 'cloudflare',
    label: 'Cloudflare Workers AI',
    envKey: 'CF_AI_KEY',
    url: 'https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1/chat/completions',
    model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    tier: 'fast',
    cost: 0,
    authStyle: 'cf',
    active: false,
    notes: 'Descartado del catálogo objetivo.'
  },
  {
    name: 'anthropic',
    label: 'Anthropic',
    envKey: 'ANTHROPIC_KEY',
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-haiku-latest',
    tier: 'slow',
    cost: 4,
    authStyle: 'anthropic',
    active: false,
    notes: 'Claude. Different API shape (messages, not chat.completions). Disabled until Phase 6.'
  }
];

// Helper: only active providers, optionally filtered by tier.
export function activeProviders(filter = {}) {
  return PROVIDERS.filter(function(p) {
    if (!p.active) return false;
    if (filter.tier && p.tier !== filter.tier) return false;
    return true;
  });
}

// Helper: order providers by cost (cheap → expensive).
export function byCost(list) {
  return list.slice().sort(function(a, b) { return a.cost - b.cost; });
}

// Helper: order providers by tier (fast → slow).
export function byTier(list) {
  return list.slice().sort(function(a, b) {
    if (a.tier === b.tier) return a.cost - b.cost;
    return a.tier === 'fast' ? -1 : 1;
  });
}