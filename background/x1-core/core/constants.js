/**
 * Constantes y configuraciones globales de X1
 */

export const MODELS = {
  OPENAI: {
    'gpt-4o': { name: 'GPT-4 Omni', provider: 'openai', costPerMTok: 0.015 },
    'gpt-4-turbo': { name: 'GPT-4 Turbo', provider: 'openai', costPerMTok: 0.01 },
    'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', provider: 'openai', costPerMTok: 0.0005 }
  },
  ANTHROPIC: {
    'claude-3.5-sonnet': { name: 'Claude 3.5 Sonnet', provider: 'anthropic', costPerMTok: 0.003 },
    'claude-3-opus': { name: 'Claude 3 Opus', provider: 'anthropic', costPerMTok: 0.015 },
    'claude-3-haiku': { name: 'Claude 3 Haiku', provider: 'anthropic', costPerMTok: 0.00025 }
  },
  GOOGLE: {
    'gemini-1.5-pro': { name: 'Gemini 1.5 Pro', provider: 'google', costPerMTok: 0.00175 },
    'gemini-1.5-flash': { name: 'Gemini 1.5 Flash', provider: 'google', costPerMTok: 0.0000375 }
  },
  GROQ: {
    'mixtral-8x7b': { name: 'Mixtral 8x7B', provider: 'groq', costPerMTok: 0.00027 },
    'llama2-70b': { name: 'Llama 2 70B', provider: 'groq', costPerMTok: 0.0009 }
  },
  HUGGINGFACE: {
    'mistral-7b': { name: 'Mistral 7B', provider: 'huggingface', free: true },
    'llama2-7b': { name: 'Llama 2 7B', provider: 'huggingface', free: true }
  },
  OLLAMA: {
    'llama3': { name: 'Llama 3', provider: 'ollama', local: true },
    'mistral': { name: 'Mistral', provider: 'ollama', local: true },
    'phi3': { name: 'Phi 3', provider: 'ollama', local: true }
  },
  DEEPSEEK: {
    'deepseek-chat': { name: 'DeepSeek Chat (V3)', provider: 'deepseek', costPerMTok: 0.00028 },
    'deepseek-reasoner': { name: 'DeepSeek Reasoner (R1)', provider: 'deepseek', costPerMTok: 0.00219 }
  },
  MINIMAX: {
    'MiniMax-Text-01': { name: 'MiniMax Text 01', provider: 'minimax', costPerMTok: 0.0011 }
  },
  MOONSHOT: {
    'moonshot-v1-128k': { name: 'Kimi 128k', provider: 'moonshot', costPerMTok: 0.0024 },
    'moonshot-v1-32k': { name: 'Kimi 32k', provider: 'moonshot', costPerMTok: 0.0024 }
  },
  ZHIPU: {
    'glm-4-plus': { name: 'GLM-4 Plus', provider: 'zhipu', costPerMTok: 0.0044 },
    'glm-4-flash': { name: 'GLM-4 Flash (gratis)', provider: 'zhipu', free: true }
  }
};

export const SECTORS = {
  LEGAL: 'legal',
  MARKETING: 'marketing',
  FINANCE: 'finance',
  SUPPORT: 'support',
  TECHNICAL: 'technical',
  GENERAL: 'general'
};

export const SCORING_WEIGHTS = {
  [SECTORS.LEGAL]: {
    normativePrecision: 0.7,
    clarity: 0.2,
    structure: 0.1
  },
  [SECTORS.MARKETING]: {
    persuasion: 0.5,
    brandTone: 0.3,
    brevity: 0.2
  },
  [SECTORS.FINANCE]: {
    numericAccuracy: 0.8,
    auditableExplanation: 0.2
  },
  [SECTORS.SUPPORT]: {
    resolution: 0.4,
    empathy: 0.4,
    tone: 0.2
  },
  [SECTORS.TECHNICAL]: {
    functionalCorrectness: 0.6,
    readability: 0.2,
    bestPractices: 0.2
  },
  [SECTORS.GENERAL]: {
    relevance: 0.5,
    clarity: 0.3,
    conciseness: 0.2
  }
};

export const STORAGE_KEYS = {
  API_KEYS: 'x1_api_keys',
  CONFIG: 'x1_config',
  VOTES: 'x1_votes',
  HISTORY: 'x1_chat_history',
  AGENTS: 'x1_agents',
  PREFERENCES: 'x1_preferences'
};

export const API_ENDPOINTS = {
  OLLAMA: 'http://localhost:11434',
  HUGGINGFACE: 'https://api-inference.huggingface.co/v1',
  GROQ: 'https://api.groq.com/openai/v1',
  COHERE: 'https://api.cohere.ai/v1'
};

export const DEFAULT_CONFIG = {
  defaultModel: 'gpt-4o-mini',
  comparisonModels: 3,
  // Lista explícita de modelos a enfrentar en modo comparativo (si vacía, el
  // router selecciona una mezcla diversa por defecto).
  comparisonModelList: [],
  defaultSector: SECTORS.GENERAL,
  maxComparisonsPerDay: 10,
  proactivityLevel: 'medium',
  darkMode: true,
  // Presupuesto de gasto (USD). Consumido por BudgetManager.
  budget: {
    daily: 5,
    monthly: 150,
    alertThreshold: 0.75,
    allowCritical: true
  },
  vectorDB: {
    enabled: false,
    provider: 'weaviate', // 'weaviate' | 'pinecone' | 'local'
    endpoint: 'http://localhost:8080'
  },
  ollama: {
    enabled: false,
    endpoint: API_ENDPOINTS.OLLAMA
  },
  // Integración de automatización N8N.
  n8n: {
    enabled: false,
    webhookUrl: ''
  },
  // Personalidad y estilo de respuesta por defecto.
  persona: {
    name: 'Atlas',
    style: 'casual' // formal | casual | academic | creative | concise
  }
};

export const UI_THEME = {
  PRIMARY: '#1f2937',
  ACCENT: '#3b82f6',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  BACKGROUND: '#ffffff',
  TEXT: '#1f2937'
};
