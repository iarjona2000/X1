/**
 * X1Bridge.js — ES5 bridge for X1Core library bundle.
 * Loaded AFTER x1-core/bundle/x1-core.js via importScripts.
 * Exposes X1Core modules in a way accessible to cbos-ext's ES5 code.
 */
var X1Bridge = (function() {
  var C = typeof self !== 'undefined' && self.X1Core;
  if (!C) {
    console.error('[X1] X1Bridge: X1Core library not loaded');
    return { loaded: false, error: 'X1Core not found' };
  }

  console.log('[X1] X1Bridge: X1Core loaded with modules:', Object.keys(C).join(', '));

  return {
    loaded: true,

    // ── Core Classes ──
    CryptoManager: C.CryptoManager || null,
    StorageManager: C.StorageManager || null,
    ConfigManager: C.ConfigManager || null,
    ModelManager: C.ModelManager || null,
    JudgeSystem: C.JudgeSystem || null,
    Logger: C.Logger || null,

    // ── Constants ──
    MODELS: C.MODELS || null,
    SECTORS: C.SECTORS || null,
    SCORING_WEIGHTS: C.SCORING_WEIGHTS || null,
    STORAGE_KEYS: C.STORAGE_KEYS || null,
    API_ENDPOINTS: C.API_ENDPOINTS || null,
    DEFAULT_CONFIG: C.DEFAULT_CONFIG || null,

    // ── Providers ──
    registry: C.registry || null,
    ProviderRegistry: C.ProviderRegistry || null,

    // ── Workspace ──
    workspace: C.workspace || null,
    WorkspaceManager: C.WorkspaceManager || null,
    GoogleAuth: C.GoogleAuth || null,
    GoogleApiClient: C.GoogleApiClient || null,
    GmailService: C.GmailService || null,
    CalendarService: C.CalendarService || null,
    DocsService: C.DocsService || null,
    SheetsService: C.SheetsService || null,
    DriveService: C.DriveService || null,

    // ── Agent Framework ──
    AgentManager: C.AgentManager || null,
    AgentRuntime: C.AgentRuntime || null,
    Agent: C.Agent || null,
    Tool: C.Tool || null,

    // ── Memory ──
    MemoryManager: C.MemoryManager || null,
    MultilevelMemory: C.MultilevelMemory || null,
    VectorStore: C.VectorStore || null,
    EmbeddingService: C.EmbeddingService || null,

    // ── Planning & Orchestration ──
    TreeOfThoughts: C.TreeOfThoughts || null,
    TaskGraph: C.TaskGraph || null,
    Supervisor: C.Supervisor || null,

    // ── Cost ──
    BudgetManager: C.BudgetManager || null,

    // ── Integrations ──
    N8NIntegration: C.N8NIntegration || null,
    FineTuneManager: C.FineTuneManager || null,

    // ── Other Core ──
    Router: C.Router || null,
    TaskRouter: C.TaskRouter || null,
    EnsembleEngine: C.EnsembleEngine || null,
    FactChecker: C.FactChecker || null,
    PredictiveAssistant: C.PredictiveAssistant || null,
    MetricsCollector: C.MetricsCollector || null,
    CollaborativeEngine: C.CollaborativeEngine || null,
    ProjectManager: C.ProjectManager || null,
    PersonaManager: C.PersonaManager || null,
    PromptBuilder: C.PromptBuilder || null,

    // ── Orchestrator ──
    Orchestrator: C.Orchestrator || null,
    orchestrator: C.orchestrator || null,
    MessageRouter: C.MessageRouter || null,

    // ── Event Bus ──
    bus: C.bus || null,
    EVENTS: C.EVENTS || null,

    // ── Utility ──
    X1Error: C.X1Error || null,
    NotFoundError: C.NotFoundError || null,
    wrapError: C.wrapError || null,

    // ── Helper: create a new Logger instance ──
    createLogger: function(moduleName) {
      if (C.Logger) {
        return new C.Logger(moduleName || 'X1');
      }
      return null;
    },

    // ── Helper: initialize StorageManager with a password ──
    initStorage: function(password) {
      if (C.StorageManager && C.StorageManager.init) {
        return C.StorageManager.init(password);
      }
      return Promise.reject(new Error('StorageManager not available'));
    },

    // ── Helper: get X1Core raw reference ──
    raw: function() { return C; },

    // ── JudgeSystem helpers ──
    evaluateResponse: function(text, query, sector) {
      if (C.JudgeSystem && C.JudgeSystem.evaluateResponse) {
        return C.JudgeSystem.evaluateResponse({ text: text, model: 'any', sector: sector || 'general' }, query);
      }
      return Promise.resolve(5);
    },

    compareResponses: function(responses, query) {
      if (C.JudgeSystem && C.JudgeSystem.compare) {
        return C.JudgeSystem.compare(responses, query);
      }
      return Promise.resolve(null);
    },

    recordVote: function(vote) {
      if (C.JudgeSystem && C.JudgeSystem.recordVote) {
        return C.JudgeSystem.recordVote(vote);
      }
      return Promise.resolve();
    },

    // ── ConfigManager helpers ──
    getConfig: function() {
      if (C.ConfigManager && C.ConfigManager.load) {
        return C.ConfigManager.load();
      }
      return Promise.resolve({});
    },

    saveConfig: function(config) {
      if (C.ConfigManager && C.ConfigManager.save) {
        return C.ConfigManager.save(config);
      }
      return Promise.resolve();
    },

    // ── BudgetManager helper ──
    budgetStatus: function() {
      if (!C.BudgetManager) return Promise.resolve(null);
      var bm = new C.BudgetManager({
        store: { get: function(k) { return new Promise(function(r) { chrome.storage.local.get(k, function(v) { r(v); }); }); }, set: function(k, v) { return new Promise(function(r) { chrome.storage.local.set(v, function() { r(); }); }); } },
        getConfig: function() { return X1Bridge.getConfig(); }
      });
      return bm.status();
    },

    // ── Logger factory (creates logger tied to a module) ──
    log: function(module) {
      if (C.Logger) return new C.Logger(module || 'X1');
      return { log: function() {}, debug: function() {}, info: function() {}, warn: function() {}, error: function() {}, success: function() {} };
    },

    // ── Sector detection ──
    detectSector: function(text) {
      if (C.Router) {
        var router = new C.Router({ config: null, judge: null });
        return router.detectSector(text);
      }
      return { sector: 'general', confidence: 0 };
    },

    // ── Task classification ──
    classifyTask: function(text) {
      if (C.TaskRouter) {
        var tr = new C.TaskRouter();
        return tr.classify(text);
      }
      return { type: 'general', confidence: 0, scores: {} };
    },

    // ── Embedding helper ──
    embed: function(text, provider) {
      if (C.EmbeddingService && C.embeddings) {
        return C.embeddings.generate(text, provider);
      }
      return Promise.resolve(null);
    }
  };
})();
