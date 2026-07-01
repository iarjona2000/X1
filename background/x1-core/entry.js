/**
 * Entry point for X1Core library bundle.
 * Imports all key backend modules and exports them as a global X1Core object.
 */

// ── Core ──
export { CryptoManager } from './core/crypto.js';
export { StorageManager } from './core/storage.js';
export { ConfigManager } from './core/config.js';
export { ModelManager } from './core/models.js';
export { JudgeSystem } from './core/judge.js';
export { Logger } from './core/logger.js';
export { MODELS, SECTORS, SCORING_WEIGHTS, STORAGE_KEYS, API_ENDPOINTS, DEFAULT_CONFIG, UI_THEME } from './core/constants.js';

// ── Providers ──
export { registry, ProviderRegistry } from './core/providers/index.js';

// ── Workspace ──
export { workspace, WorkspaceManager } from './core/workspace/index.js';
export { GoogleAuth } from './core/workspace/google-auth.js';
export { GoogleApiClient } from './core/workspace/google-api.js';
export { GmailService } from './core/workspace/gmail-service.js';
export { CalendarService } from './core/workspace/calendar-service.js';
export { DocsService } from './core/workspace/docs-service.js';
export { SheetsService } from './core/workspace/sheets-service.js';
export { DriveService } from './core/workspace/drive-service.js';

// ── Agent Framework ──
export { AgentManager } from './core/agents/agent-manager.js';
export { AgentRuntime } from './core/agents/agent-runtime.js';
export { Agent } from './core/agents/agent.js';
export { Tool } from './core/agents/tool.js';

// ── Memory ──
export { MemoryManager } from './core/memory/memory-manager.js';
export { MultilevelMemory } from './core/memory/multilevel-memory.js';
export { VectorStore } from './core/memory/vector-store.js';
export * from './core/memory/vector-math.js';
export { EmbeddingService, embeddings } from './core/memory/embeddings.js';

// ── Planning & Orchestration ──
export { TreeOfThoughts } from './core/planning/tree-of-thoughts.js';
export { TaskGraph } from './core/orchestration/task-graph.js';
export { Supervisor } from './core/orchestration/supervisor.js';

// ── Cost ──
export * from './core/cost/pricing.js';
export { BudgetManager } from './core/cost/budget-manager.js';

// ── Integrations ──
export { N8NIntegration } from './core/integrations/n8n.js';
export { FineTuneManager } from './core/integrations/finetune.js';

// ── Other Core Modules ──
export { Router } from './core/router.js';
export { TaskRouter } from './core/task-router.js';
export { EnsembleEngine } from './core/ensemble.js';
export { FactChecker } from './core/factcheck.js';
export { PredictiveAssistant } from './core/predictive.js';
export { MetricsCollector } from './core/metrics.js';
export { CollaborativeEngine } from './core/collaborative.js';
export { ProjectManager } from './core/project-manager.js';
export { PersonaManager } from './core/persona.js';
export { PromptBuilder } from './core/prompt-builder.js';

// ── Background ──
export { Orchestrator, orchestrator } from './background/orchestrator.js';
export { MessageRouter } from './background/message-router.js';

// ── Utils ──
export { bus, EVENTS } from './utils/event-bus.js';
export { X1Error, NotFoundError, wrapError } from './utils/errors.js';
export * from './utils/rate-limiter.js';
export * from './utils/http.js';
export * from './utils/cache.js';
export * from './utils/async.js';
export * from './utils/validation.js';
export * from './utils/text.js';
export * from './utils/id.js';
