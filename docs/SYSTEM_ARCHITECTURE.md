# X1 System Architecture — Full Audit

**As of:** 2026-07-04, commit range up to and including this document's own commit.
**Method:** six parallel, read-heavy research passes across the entire codebase (not a skim — every file named below was actually opened and traced for real callers, not just grepped for its own definition), followed by direct verification and fixes for anything clearly safe to fix. This document reports what the code **actually does when it runs**, not what its comments/names claim it does — the two disagree in a lot of places here, and that gap is the most important thing in this document.
**Scope boundary respected throughout:** per `X1-Agents-Vault/00-Indice.md`, orchestration/reasoning/Panel+Judge internals (`x1-bridge.js`, `x1-integration.js` logic, `ai-judge.js`, `ai-voting.js`, `ai-router.js`, `ai-pool.js` internals, `x1-core` orchestrator/ensemble/collaborative) are the partner's territory. Everything there is documented in full, nothing there was rewritten — only bugs in files clearly outside that boundary were fixed (listed in §12).
**This will drift.** Re-verify against the code before trusting any specific claim here for anything you're about to build on — that's the whole lesson of this document.

---

## 0. Executive summary

X1 is a Chrome MV3 extension (background service worker, ~20,000 lines in `service-worker.js` alone) built by two people in parallel over about a week, plus a companion Cloudflare Worker proxy and a large "x1-core" webpack bundle. It genuinely does a lot — voice command parsing, Gmail/Calendar/Drive actions, multi-provider AI cascade, page extraction, plugins, automation rules, an Alt+Click vision feature, meeting transcription. But there is a **large gap between what the codebase advertises (in file names, comments, and commit messages) and what actually executes** when a user talks to X1 today. The three biggest gaps:

1. **The "Panel+Judge" system — the stated centerpiece of the whole project — barely runs.** `aiComplete()`, the real brain entry point, does a 2-provider speed race with a cheap heuristic score, not an LLM judge evaluating candidates. A complete, well-built rubric-based judge system (daily caps, judge rotation, calibration) sits directly next to it in the same file and is **never called**. `X1Judge.runJudge`, all of `X1Voting`, and all of `X1Router` have **zero production callers** — they're fully implemented and completely disconnected. See §3.
2. **Two separate "agent" systems and two separate "memory" concepts coexist**, unaware of each other, one pair of which was silently corrupting each other's data via an identical storage key until this session (fixed, §12). See §4, §7.
3. **Of the 22 "AI tool" bridge files** the partner added in one large batch, roughly a third do genuine work, a third are explicit stubs, and a third look real but fail on every call because they use `document`/`window`/`localStorage` APIs that don't exist in a service worker. See §6.

None of this means the project is broken — the voice assistant, Gmail/Calendar actions, the AI cascade's fast path, extraction, and several plugins are real and working. It means: **when deciding what to build on, check this document's "live" column, not the file's existence.**

---

## 1. AI Providers & Model Cascade

Two layers exist: the extension's own client-side provider functions, and a separate Cloudflare Worker proxy with its own provider catalog. They overlap but are not the same thing.

### 1.1 Cloudflare Worker (`worker/`)

- **`worker/src/providers.config.js`** — single source of truth `PROVIDERS` array, 18 entries. **6 active**: `gemini` (gemini-2.0-flash), `nvidia-glm` (z-ai/glm-5.1, primary), `nvidia-nemotron` (nvidia/nemotron-3-ultra-550b-a55b), `nvidia-gptoss` (openai/gpt-oss-120b), `nvidia-llama` (meta/llama-4-maverick-17b-128e-instruct, "most-used, multimodal"), `nvidia-qwen` (qwen/qwen3-coder-480b-a35b-instruct, agentic coding). 12 disabled by explicit decision (groq/cerebras/sambanova/grok/openai/mistral/deepseek/together/openrouter/opencode/cloudflare/anthropic) — this is intentional curation, not neglect. Comment in-file explicitly documents the correlated-failure risk: all 5 NVIDIA models share one key/infra.
- **`worker/src/worker.js` + `lib.js`** — `handleRequest` routes `GET /health` (open), `GET /debug` (auth-gated, dumps provider/breaker status), `POST /commands/queue` + `GET /commands/poll` (KV-backed external command queue, degrades to 501/empty if `X1_KV` isn't bound — it isn't by default), `POST /v1/chat/completions` (the real endpoint). Auth: `checkAuth()` fails closed if `PROXY_SHARED_SECRET` is unset (503), else checks header `X-X1-Auth` (401 on mismatch). Rate limiting is per-IP via KV, no-ops if unbound. `cascade()` in `lib.js` iterates the tier-sorted active-provider chain with a real circuit breaker (3-failure threshold, 60s cooldown, half-open reset), per-provider 8s timeout, 2 retries, 25s total budget.
- Deployed at `https://x1-proxy.baosx1.workers.dev` (hardcoded in the extension, not in `wrangler.toml`). The extension sends `X-X1-Auth: aiKeys.proxySecret || PROXY_SHARED_SECRET` — that fallback constant is hardcoded in cleartext in the shipped extension source (`service-worker.js:1417`), a deliberate, previously-discussed exception (it's an app-identifier to filter scanner traffic, not a real credential — see project memory) but worth knowing it's there.
- Minor dead code: `lib.js`'s `buildHeaders` has an unreachable `'gemini'` auth-style branch (the real gemini entry uses `authStyle:'bearer'`).

### 1.2 Extension-side providers (`background/service-worker.js`)

- **NVIDIA**: `nvidiaCompleteWithModel(userMsg, model)` is the shared implementation (5s timeout, `temperature:0.1`, `max_tokens:2000`), with 5 thin wrappers (`nvidiaGlmComplete`, `nvidiaNemotronComplete`, `nvidiaGptOssComplete`, `nvidiaLlamaComplete`, `nvidiaQwenComplete`) matching the worker's 5 active NVIDIA entries.
- **Gemini**: `geminiComplete(userMsg, options)` self-throttles 30s after a 429, default model `gemini-2.5-flash` — note this **differs** from `geminiVision`'s and the worker's `gemini-2.0-flash` (unintentional drift, not fixed — low risk, both are valid Gemini models, just inconsistent).
- **Proxy**: `proxyComplete(userMsg)` calls the Worker above, self-throttles 10s after failure.
- **Ollama**: `ollamaComplete(userMsg)` probes `localhost:11434` first (2s timeout, cached), for local/offline use.
- **Vision**: `callVisionProvider(provider, base64Image, prompt)` — as of this session, real branches for `gemini` and `nvidia-llama` only (`openai`/`groq` branches exist in the code but are never invoked — both callers only ever pass `['gemini', 'nvidia-llama']`, fixed this session, see §12). Feeds `content/pointer-interaction.js`'s Alt+Click region-ask (`answerAboutRegion`) and `handleAgentVision`.

### 1.3 Routing — `aiComplete()`'s actual candidate list, and two things that duplicate it

- **`ROUTE_MATRIX`/`getRoutedChain(taskType)`** (service-worker.js ~2192-2241) — a real, thoughtful per-task-type ordered provider list (e.g. `sensitive: ['ollama']` only, deliberately no cloud fallback for privacy). **Not used by `aiComplete`.**
- **`getAllProviders()`** (~3382-3393, local to `aiComplete`) — a second, separately hand-maintained flat list of the same 8 providers. **This is what `aiComplete` actually iterates.** Two lists to keep in sync for the same 8 providers, and the task-aware one isn't the one that runs.
- **`aiProviders`** (~6768) — a *third*, older, vision/metadata-only map, feeds `callVisionProvider`/`getAvailableProviders`/`getDefaultProvider`. Cleaned up this session (stale model list, dead `'groq'` default — §12) but still a third parallel structure.
- **`X1Pool`** (`background/ai/ai-pool.js`) — a fourth structure, a proper registry (`register/get/getAll/getActive/getByCapability/getByFamily/select/...`). Fixed this session so it actually registers its 8 providers without crashing (was throwing on load, §12 from the prior session) — but repo-wide grep confirms **nothing reads from it**. It's populated, correctly, and consumed by nobody. A ready-made "single source of truth" that isn't the source of truth for anything yet.
- **`background/cascade/*`** (`rate-limiter.js`, 12 `providers/*.js`, `router.js`) — a **fifth**, almost entirely dead parallel provider system, loaded early in `importScripts`. `router.js`'s `PROVIDER_FNS` reference bare global functions (`groqComplete`, `nvidiaComplete`, etc.) that don't exist anywhere in the repo — every entry always resolves `null`, so `runPanel`/`judgeRound`/`callProviderDirect` in this file are permanently dead. The only live consumer of this whole subsystem is `classifyTask()` nudging intent-classification scores — not picking or calling any provider. `X1RateLimiter` here is called by the (dead) cascade providers, never by `service-worker.js`.

**Net effect**: there are five different "list of AI providers" data structures in this codebase (`ROUTE_MATRIX`/`getRoutedChain`, `getAllProviders`, `aiProviders`, `X1Pool`, `cascade/*`), and exactly one of them (`getAllProviders`) is what a real user's message actually routes through.

### 1.4 `aiComplete(userMsg, opts)` itself (service-worker.js:3269-3511)

The real entry point, called from 20+ places. Flow: hash-keyed response cache check (**dead**, see §13 — resets every call so it never hits) → WebLLM local fast-path if loaded and `!opts.forceJudge` → `X1Judge.analyzeQuery()` for complexity classification only → **simple query → 1 provider; complex query → up to 2 providers raced via `firstWins`** (first valid response wins, or best heuristic `scoreResponse` among finishers) → 5s global timeout. No LLM ever judges/synthesizes across candidates in this path — "Panel+Judge" as commonly meant (N models answer, a judge model evaluates and picks/merges) does not run here. See §3 for the full picture of why.

---

## 2. Agents

**Two entirely separate, unaware-of-each-other agent systems ship in this extension.**

### 2.1 `X1AgentManager` (`background/agents/agent-manager.js`)

Small ES5 CRUD+call layer. 7 built-ins (`builtin_research/legal/marketing/finance/support/writer/developer`), all `model:'auto'`. `callAgent()` now correctly bakes `systemPrompt` into the message before calling `aiComplete`/`geminiComplete` (fixed last session — was silently discarding every persona). `PROVIDER_MAP` is `gemini/ollama/proxy/auto` only. **Narrow usage**: 3 call sites in `service-worker.js`, plus the barely-used `X1Workspace` (`background/agents/workspace.js`, full CRUD for shared workspaces/marketplace — itself has zero external callers anywhere).

### 2.2 The x1-core bundle's `AgentManager` (`background/x1-core/core/agents/agent-manager.js`, bundled)

Much richer: ReAct-style tool-calling loop (`AgentRuntime.run`, builds system prompt + memory/knowledge context, executes tool calls, native function-calling with an inline-parsing fallback), a `ToolRegistry` (OpenAI-style function-def generation), knowledge-base attachment per agent, and its own `TaskGraph` orchestrator (LangGraph-style state-merging graph executor, `addNode/addEdge/addConditionalEdge/run`, unrelated to the item above). Reached via `X1Bridge.raw().AgentManager` from `background/agents-x1.js`, which seeds **6 more presets** (research/email/code/meeting/writing/analyst agents, each with tools[] and a Spanish system prompt) ~2s after every service-worker start, and patches `parseCommand` with 6 new Spanish voice-trigger regexes (`investiga...`, `correo:...`, `programa...`, `prepara reunión...`, `escribe un/una...`, `analiza...`) that route to these agents. `agents-x1.js` was fully non-functional until last session (see §12) — it's live now.

### 2.3 The bug this caused (fixed this session)

Both systems persisted to the **identical** `chrome.storage.local` key `x1_agents`, with mutually incompatible schemas. Since `agents-x1.js`'s auto-seed runs on every startup, the two systems were silently corrupting/shadowing each other's stored agent lists. Fixed by giving `X1AgentManager` (the far less-used of the two) its own key, `x1_agents_simple`. **Not fixed, and out of scope for a bug-fix pass**: the deeper redundancy — two unrelated "what is an agent" concepts, two persistence layers, three separate built-in-agent catalogs (7 + 6 + x1-core's own 3 via `seedDefaults()` = 16 total across three seed sources), no shared model, no single "list all agents" call. Consolidating this is an architecture decision, not a bug fix.

---

## 3. Orchestration & Judge — the big one

**This is the partner's territory** (`X1-Agents-Vault/00-Indice.md`: "Socio: orquestación, razonamiento, Panel+Juez... No tocar esta parte"). Documented in full below; nothing in this section was modified.

### 3.1 What's live from a real voice command

Just `aiComplete`'s simple-single-provider / 2-provider-speed-race path (§1.4). That's it. No judge model.

### 3.2 What's fully built, sitting right next to `aiComplete`, and never called by it

`service-worker.js` (lines ~3099-3267, right above `aiComplete`) contains a **complete, well-designed rubric-based panel-judge system**: `RUBRICS` (per technical-task-type grading criteria), `JUDGE_ROTATION`, `isHighRiskTask()` (selective-activation gate), `canUsePanelJudgeToday()`/`incrementPanelJudgeUsage()` (daily cap), `recordCalibration()`, `pickJudgeProvider()` (same-family exclusion), `judgeRound()`, `heuristicWinner()`. This matches project history's description of a carefully-designed selective-activation Panel+Judge feature built in an earlier session. **It has zero callers.** `aiComplete` never invokes it.

### 3.3 What's built as standalone modules, also never wired into the live path

- **`background/ai/ai-judge.js`** (`X1Judge`) — real query analysis (9 types, complexity, intent, language, entities — this part **is** used, by `aiComplete` and `ai-router.js`), a `VOTER_MATRIX`, scoring/ranking/consensus detection, and a full `runJudge()` pipeline with WebLLM-as-judge shortcut and history storage. **`runJudge` has zero production callers** — only `analyzeQuery`/`parseResponse` are ever actually invoked.
- **`background/ai/ai-voting.js`** (`X1Voting`) — `VoteCollector`, a real weighted 5-factor `ScoringEngine`, `ConsensusDetector`, `RankingEngine`. **Zero production callers anywhere.**
- **`background/ai/ai-router.js`** (`X1Router`) — a `SmartRouter` with 5 routing strategies and auto-ban-after-3-failures performance tracking. **Zero production callers.** Also has its own internal bug: `routeAndExecute` does `var self = this`, shadowing the global `self`, so its own `self.X1Judge.parseResponse` call would silently never fire even if the function were ever called.
- **`background/x1-core/background/orchestrator.js` + `core/ensemble.js` + `core/collaborative.js`** (bundled, not stale relative to source) — `Orchestrator` (chat/planTask/selectModel/budgetStatus/compare/recordVote/factCheck/health), `EnsembleEngine.compare` (genuinely fans N models out in parallel, judge-scores them, blind A/B/C labeling — the closest thing in this codebase to "real Panel+Judge"), `CollaborativeEngine` (named agent teams). **These ARE wired end-to-end** — through `background/x1-api.js`'s `X1_API` message handlers (`compare`, `planTask`, `teamCreate/List/Run`, `factCheck`, `budgetStatus`), reachable via `chrome.runtime.sendMessage`. The front-end even has ready-made trigger functions for this — `content/voice-listener.js`'s `window.x1CompareModels`, `x1RunAgent`, `x1Plan`, `x1ShowBudget`, `x1FactCheckText`, `x1SearchMemory`. **But nothing calls those trigger functions** — no voice-command parser, no UI button, nothing in the repo invokes them. The plumbing is complete from message handler to orchestrator class; the last mile (something actually calling `x1CompareModels()`) doesn't exist.
- **`background/x1-integration.js`** — deliberately inert (crashes on an unguarded `window` reference at line 18, moved to load *last* in `importScripts` this session so its crash doesn't take down other files, per an explicit in-code comment explaining why it's not "fixed": it would monkey-patch `aiComplete`/`execAction`/`parseCommand` and expose `x1CompareResponses`/`x1EvaluateResponse`/`x1RecordVote` — judge-adjacent, partner's call). If ever activated it would also expose `x1Budget`, `x1PlanTask`, `x1FactCheck`, `x1GetSuggestions`, `x1Agent`, `x1Compare` as convenience wrappers around the x1-core classes above.

### 3.4 Summary table

| Piece | Built? | Wired to a real trigger? |
|---|---|---|
| `aiComplete` speed-race (1-2 providers) | Yes | **Yes — this is what actually runs today** |
| Rubric panel-judge (`RUBRICS`/`judgeRound`/daily cap) | Yes, complete | No |
| `X1Judge.runJudge` | Yes, complete | No |
| `X1Voting` | Yes, complete | No |
| `X1Router` | Yes, complete (has its own `self`-shadowing bug) | No |
| x1-core `Orchestrator`/`EnsembleEngine`/`CollaborativeEngine` | Yes, complete | Wired to `X1_API` messages — but nothing calls the front-end triggers that would reach it |
| `x1-integration.js` judge wrappers | Yes, complete | No — deliberately inert |

**Bottom line**: X1 has, by count, built *five* separate implementations of "compare multiple AI answers and pick/synthesize the best one" (rubric panel-judge, `X1Judge`, `X1Voting`, `X1Router`, `EnsembleEngine`) across two people's sessions, plus the simple 2-way race that's actually live. None of the four sophisticated ones are reachable from a real user interaction today.

---

## 4. Plugins & Automation

### 4.1 `X1PluginEngine` (`background/plugins/engine.js`)

Real, functional. 8 step types: `search` (Tavily API), `synthesize`, `navigate`, `extract` (injects a content script to grab page text), `write`, `webhook` (POST to a URL, 15s timeout), `notify`, `calculate` (`safeCalc` — a genuine hand-rolled shunting-yard arithmetic evaluator with `avg/sum/min/max` shortcuts, division-by-zero returns 0). `matchPlugin` does substring trigger matching against the user's message. Fixed this session: `synthesize`/`extract` used to hardcode a nonexistent `groqComplete` function and silently fall through to one bare `geminiComplete()` call with no persona, no cache, no cascade — now routed through `aiComplete()`, the real brain entry point, and a new manifest-level `persona` field lets each plugin carry its own identity instead of one generic framing. `'webhook'` was implemented but not in the validator's `validTypes` — fixed. 4 built-ins ship: `market-research`, `daily-briefing`, `email-triage`, `lead-generator`.

### 4.2 `background/plugins/agency-plugins.js` (new this session)

16 specialist personas promoted from the imported `agency-agents` catalog (see §13) into real plugins: Change Management Consultant, Automation Governance Architect, Data Privacy Officer, ESG & Sustainability Officer, Grant Writer, Organizational Psychologist, Pricing Analyst, Database Optimizer, Codebase Onboarding Engineer, Incident Response Commander, Security Architect, Accessibility Auditor, Test Results Analyzer, UX Architect, Product Manager, GIS Analyst. Each has Spanish+English trigger phrases and a condensed persona; a few use `extract`+`synthesize` to read the current page first (Accessibility Auditor, Security Architect, UX Architect, Codebase Onboarding Engineer).

### 4.3 `background/automation/rule-engine.js` (`X1AutomationEngine`)

Real cron-based (5-field, supports `*`/`/step`/lists/ranges) and page-visit-triggered rules via `chrome.alarms`. `parseNaturalLanguageRule()` also had the dead-`groqComplete` bug — fixed this session, now uses `aiComplete`. A rule can trigger a plugin (`X1PluginEngine.executePlugin`) or emit a generic action object consumed elsewhere as a normal X1 command — it has no execution capability of its own beyond those two paths.

### 4.4 `background/skills/engine.js` (`X1SkillEngine`)

Named multi-step macros (navigate/search/extract/ai/speak/wait/click/type/exec) with `{{param}}` templating between steps. Storage key `x1_skills`, kept deliberately separate from a legacy string-based skill store (`x1_skills_legacy`) after an earlier collision fix. **Bug fixed this session**: the `ai` step called `aiComplete(system, prompt, {maxTokens,temperature})` — three arguments, but `aiComplete`'s real signature is `(userMsg, opts)` where `opts` only ever reads `.forceJudge`. This meant the *system* text was sent as the actual message, the real task `prompt` was silently dropped, and the token/temperature object was ignored entirely. Fixed to bake both into one string, matching the convention used everywhere else.

---

## 5. Integrations, Bridges & MCP

### 5.1 `background/mcp/client.js` (`X1MCPClient`)

Real, functional MCP client — JSON-RPC 2.0 `tools/call`/`tools/list` over HTTP or SSE, `addServer/removeServer/callTool/listTools/testConnection`, persisted to `chrome.storage.local['x1_mcp_servers']`. This is the intended **Level-1 integration path** per the vault's own doctrine (external MCP servers, near-zero code cost) — genuinely ready to use once a user points it at a real MCP server. (`mcpRegistrySearch()`, referenced in earlier vault notes, actually lives in `service-worker.js` itself, not in this file.)

### 5.2 `background/integrations/registry.js` (`X1Integrations`)

A working plain-JS registry (`register/get/list/setEnabled/checkHealth/checkAll`). All 22 bridge files below self-register into it on load — the earlier assumption that "only ~6 go through the registry" is **no longer accurate**; effectively all of them do now.

### 5.3 The 22 "AI tool bridge" files (`background/ai/*-bridge.js`)

Added by the partner in one large batch (commits `cddd5ec`/`c8da7e8`/`466775b`/`c4a7cf3`). All fixed for the `window`→`self` MV3 loading crash in an earlier session. That fix only touched each file's top-level export line — it did **not** fix the DOM/window/localStorage calls buried inside many of their actual methods, which is why the honest status varies wildly per file:

| File | Status |
|---|---|
| `transformers-bridge.js` | **Real** — HF Inference API, no DOM needed. Most genuinely functional bridge. |
| `openwebui-bridge.js` | **Real** — fetch client to a local Open WebUI server. |
| `chromadb-bridge.js` | **Real** — functional in-memory vector store (hash-based fake embeddings, real cosine similarity). |
| `d3-bridge.js` | **Real** — pure-JS scale/shape/SVG-string math (not actual D3, but functional). |
| `langchain-bridge.js` | **Real** — generic Chain/Agent/Memory primitives, functional as building blocks. |
| `whisper-bridge.js` | **Partially real** — HF Inference API path works; mic-recording path is dead in a service worker. |
| `kilo-bridge.js` | **Reimplementation** — delegates to X1's own `execAction`/`aiComplete`, not real Kilo Code. Still lists a dependency on a bridge deleted 2026-07-03. |
| `llamaindex-bridge.js` | **Reimplementation** — in-memory keyword-scored "RAG," not real LlamaIndex. |
| `piper-bridge.js` | **Broken on call** — uses `window.AudioContext`, undefined in a service worker. |
| `huggingface-bridge.js` | **Broken on call** — uses `localStorage` for config persistence, undefined in a SW; silently no-ops. |
| `leveldb-bridge.js` | **Broken on call** — same `localStorage` issue; falls back to in-memory only, lost on every SW restart. |
| `sqlite-bridge.js` | **Fake** — regex-parsed toy SQL engine, in-memory, no real SQLite/WASM. |
| `tesseract-bridge.js` | **Partially broken** — HF API path could work; canvas-based fallback uses `document.*`, dead in SW. |
| `page-agent-bridge.js` | **Broken on call** — entirely `document.*`/`window.*`/DOM-typed; nothing in it works in a SW. |
| `freeweb-bridge.js` | **Partially broken** — search works (fetch+regex); content-extraction helpers use `document.createElement`, dead in SW. |
| `n0x-bridge.js` | **Partially broken** — same pattern as freeweb (search works, extraction doesn't). |
| `webllm-bridge.js` | **Broken on call** — tries to inject a `<script src="cdn...">` tag via `document.createElement`, impossible in a SW; also ignores the one genuinely-cloned local dependency it has (see below). |
| `playwright-bridge.js` | **Mostly broken** — only `goto()` (a fetch) works; everything else is `document.*`. |
| `browserai-bridge.js` | **Explicit stub** — returns hardcoded placeholder strings. |
| `ffmpeg-bridge.js` | **Explicit stub** — comments literally say "(simulated)." |
| `sharp-bridge.js` | **Explicit stub** — always returns an empty `ArrayBuffer(0)`. |
| `chartjs-bridge.js` | **Explicit stub** — no canvas, returns canned objects. |

**Cloned-dependency check** (`background/integrations/*`): of the 6 subdirectories these bridges cite as their backing library, only `web-llm/` is actually populated (275 real files, genuinely cloned). `browserai/`, `freeweb/`, `n0x/`, `page-agent/`, `token-free-gateway/` are empty — no `.gitmodules` configured. This is moot either way: **none of the 22 bridges actually load from `background/integrations/*` at runtime** — the `path:` field in each bridge's registration is purely descriptive metadata, never `importScripts`'d or `fetch`'d. Even `webllm-bridge.js`, whose backing repo genuinely exists locally, ignores those 275 files and tries a CDN `<script>` injection instead — which fails for the DOM reason above regardless of what's on disk.

---

## 6. Memory & Storage

**Four unconnected "memory" implementations exist:**

1. **`background/memory/*.js`** (`X1IndexedDB`, `X1OpGraph`, `X1Encryption`, `X1IntentionGraph`, `X1WorldModel`, `X1AIMemo`) — load cleanly (fixed from fully-orphaned in an earlier session), well-built (IndexedDB CRUD, AES-GCM encryption, intent-prediction, session/task/error tracking), and **completely disconnected**. `X1AIMemo` is the only one with internal cross-references; it itself has zero external callers. This is the "real IndexedDB memory layer" referenced as a future-Phase-2 goal in earlier project notes — it now exists and loads, but nothing feeds it.
2. **Ad-hoc `chrome.storage.local` keys scattered through `service-worker.js`** — `x1Skills`→`x1_skills_legacy`, `x1PriceAlerts`, `x1PageMonitors`, etc. This remains the actual live "memory" for most features.
3. **The modular per-feature stores** — `x1_agents_simple` (agents), `x1_plugins`, `x1_mcp_servers`, `x1_skills`, `x1_automation_rules` — each its own island, no cross-querying.
4. **`X1Core.MemoryManager`** (x1-core bundle) — reached only via `x1-api.js`'s `memoryRecall`/`memoryRemember`/`memoryStats` handlers. This is the only one of the four actually reachable through a documented message API (`X1_API` messages from the front-end).

There is also a naming collision worth knowing about while reading the code: `handleMeetingEnd` writes to a module-scope `opGraph` variable in `service-worker.js` — a same-named but entirely different object from `X1OpGraph` (item 1). They are not related.

---

## 7. Google Workspace Integration

`background/google/*.js` (`X1GoogleAuth`, `X1GmailAPI`, `X1CalendarAPI`, `X1DriveAPI`) load cleanly and are **well-built, real Google API wrappers** — but are **entirely unused**. Every actual Gmail/Calendar/Drive/Sheets/Docs voice action in `service-worker.js` goes through a separate, hand-rolled `googleApi(url, method, body)` helper built on its own `getGoogleToken()`, hitting the same REST endpoints directly. Two independent, fully-duplicate Google integrations ship in the same extension; only the inline one is live.

Meeting-transcription action items (`handleMeetingEnd` → `createTask()`) go to a **local**, in-extension task list — despite `content/tasks.js` implying a Tasks UI, there is no Google Tasks API integration anywhere in the codebase.

---

## 8. Content Scripts (`content/`)

- **`pointer-interaction.js`** — Alt+Click anywhere opens a small floating input box at the click point; sends `{type:'X1_POINTER_ASK', x, y, devicePixelRatio, question}`. All actual image work (capture, OffscreenCanvas crop, vision-model call) happens in the background (`answerAboutRegion`) — this file is just the UI trigger.
- **`meeting-transcription.js`** — manual floating toggle button (deliberately not auto-start, to avoid fighting the main voice assistant for mic access). Uses the Web Speech API, auto-restarts on silence-timeout, sends the full transcript to the background on stop or `beforeunload`.
- **`calendar.js`/`docs.js`/`gmail.js`/`meet.js`/`sheets.js`/`universal.js`** — near-identical page-data extractors per Google Workspace surface.
- **`contacts.js`**, **`drive.js`** (floating action button), **`floating-toolbar.js`** (shared UI), **`tasks.js`** (floating local task panel), **`voice-bridge.js`** (relays page-injected commands to the background), **`voice-listener.js`** (the main voice command UI/listener, largest content script — also home to the unreachable `x1CompareModels`/`x1RunAgent`/etc. triggers from §3.3).
- **`fix-join.js`** and **`rewrite-premium.js`** are **not real content scripts** — they're Node.js build/dev scripts with a hardcoded path from a different developer's machine (`C:\Users\tomas\Desktop\cbos-ext\...`), sitting in the shipped `content/` folder but absent from `manifest.json`, so they never execute. Harmless, but stray.

---

## 9. Other feature modules — real vs. dead

| Module | Status |
|---|---|
| `background/extract/data-extractor.js` (`X1DataExtractor`) | Real, genuinely complementary to the inline `extractStructuredData`+`jsonToCsv`+Firecrawl path in `service-worker.js` — different outputs (CSV download vs. raw AI JSON), both wired to distinct voice actions. `extractBySelector()` is a stub, always returns `null`. |
| `background/seo/seo-analyzer.js` (`X1SEOAnalyzer`) | **Dead code** — loaded, never called. The real `'seoAnalysis'` action uses a separate, less-thorough inline `analyzeSEO()` in `service-worker.js`. |
| `background/finance/financial-data.js` (`X1FinancialData`) | Real — Finnhub + AlphaVantage, both `'financialQuote'` and `'stockQuote'` voice actions call the same function (not two separate implementations, despite what earlier notes implied). |
| `background/image/image-generation.js` (`X1ImageGen`) | Real — Cloudflare Flux tried first, falls back to OpenAI DALL-E 3, history saved to storage. |
| `background/research/deep-research.js` (`X1DeepResearch`) | Real and wired, but **hijacks the user's active tab** (`chrome.tabs.update` to Google search) as part of its research loop — disruptive if the tab was in use, and scraping depends on brittle Google result-page selectors. |
| `background/style/writing-style.js` (`X1WritingStyle`) | Real and wired — learns a user's writing style from samples, feeds a style prompt fragment back into generation. |
| `background/chat/group-chat.js` (`X1GroupChat`) | Real and wired — multi-provider chat/debate sessions, bypasses the normal cascade/circuit-breaker (calls 10 cascade providers directly). |
| `background/monitor/page-monitor.js` (`X1PageMonitor`) | **Dead code** — loaded, never called. Real page-monitoring logic is inline in `service-worker.js` (see §12 for a duplicate-declaration bug fixed there this session). |
| `background/prompts/assembler.js` (`X1PromptAssembler`) | **Dead code** — a full templated prompt-assembly system, loaded, never referenced elsewhere. |

---

## 10. Manifest, Permissions & UI

- **`manifest.json`**: MV3, no `"type":"module"` on the service worker (matters — it's why `importScripts()` is used throughout instead of ES module imports). `host_permissions` lists explicit Google domains *and* a blanket `https://*/*`/`http://*/*` — the explicit entries are redundant given the wildcard, but harmless. The wildcard itself is a deliberate, previously-discussed choice (X1's web-agent features need to act on arbitrary pages). 12 `content_scripts` entries. OAuth scopes cover Gmail (rw), Calendar, Sheets, Docs, Drive (readonly+file), Tasks, Contacts (readonly) — note Tasks scope is requested but, per §7, never actually used by any Tasks API call.
- **`manifest.json.bak`** is a snapshot of an earlier, differently-branded config ("C-BOS — AI Business Operating System") — narrower permissions, has `"type":"module"`, different content-script set. Historical artifact, not live.
- **UI**: `sidepanel/panel.html`+`panel.js` is the **real, manifest-wired** side panel (terminal-styled, Spanish-default, real `SpeechRecognition`+`speechSynthesis`). `sidepanel/index.html` (a separate ~11,000-line React bundle) and several `sidepanel/sidepanel-v2.*`/`terminal*.html` variants exist on disk but aren't referenced by the current manifest — alternate/WIP UI builds. `x1.html` is a standalone branding asset. `onboarding.html` is a first-run page. `oauth.html` handles the Google OAuth implicit-flow callback.
- **Root `package.json`** has no scripts and only 2 dependencies (`cloudflare`, `sharp`) — no build step for the extension itself. `worker/package.json` has real `dev`/`deploy` scripts via `wrangler`.
- **`tests/`** — hand-rolled `assert()`-based scripts meant to be pasted into a live console or loaded as extension pages, not run via `npm test` (no jest/mocha config exists anywhere).

---

## 11. Obsidian Vault & `agency-agents` (external agent catalog)

Covered in detail in `X1-Agents-Vault/` itself (separate from this document, and — worth knowing — that vault's own git history turned out to be rooted at the whole home directory with zero commits, not a real scoped repo; files are safe on disk, just not yet properly version-controlled). Summary: `X1-Agents-Vault` catalogs real external AI tools/services per ABOS role (CFO/CMO/CLO/etc.), with a 4-level integration priority doctrine (MCP > self-hosted API > SaaS API > prompt-only). This session added 217 more personas from the `github.com/msitarzewski/agency-agents` repo (already cloned locally) as lightweight, auto-generated notes across 15 vault clusters (5 folded into existing hubs, 10 new `Agentes-Agency-*` clusters), respecting the vault's existing "isolated cluster" design rule. 16 of those 217 were promoted into real X1 plugins (§4.2).

---

## 12. Bugs fixed during this audit

All fixes below are additive/corrective — no judge/orchestration/voting/router internals touched, consistent with the scope boundary in the header. Each was verified (Node `vm` simulation of the actual load/call sequence, or direct code tracing) before being applied. Commit history has the full diffs and reasoning for each.

**From the prior session** (context for this one — already live):
1. `service-worker.js`'s `registerDefaultProviders()` referenced a nonexistent `groqComplete` function unguarded — threw on the first line, so `X1Pool` registered zero providers. Fixed.
2. `agents/agent-manager.js`'s `PROVIDER_MAP` passed `systemPrompt` as `aiComplete`'s options-object argument instead of baking it into the message — every built-in agent ran with no persona. Fixed.
3. `plugins/engine.js`'s `synthesize`/`extract` steps hardcoded a nonexistent `groqComplete`, silently falling through to a bare `geminiComplete()` with no persona/cache/cascade. Rewired through `aiComplete`. Added a per-plugin `persona` field. Added `'webhook'` to the step-type validator (was implemented, never validated).
4. `x1-api.js`/`agents-x1.js` had the same unguarded-`window` MV3 crash as the 26 bridge files — fixed, and reordered in `importScripts` so `x1-integration.js`'s still-deliberately-broken crash (see §3.3) no longer takes them down too.
5. `callVisionProvider`'s fallback list was `['gemini','openai','groq']` — both fallbacks dead (no key / no function). Replaced with `['gemini','nvidia-llama']`, reusing an already-active model instead of adding a new catalog entry.
6. 16 `agency-agents` personas promoted to real `X1PluginEngine` plugins (`plugins/agency-plugins.js`).

**From this session (this document's own audit pass)**:
7. **`service-worker.js`: duplicate `addPageMonitor`/`removePageMonitor`/`loadPageMonitors`/`checkPageMonitors` declarations** (~L2655 and ~L7852, incompatible array-vs-object storage shapes). Plain JS function-declaration hoisting meant the second (later) declaration always won — the first ~95 lines were pure dead code, and worse, `ensureMonitorAlarm()` (which *is* live, used by the Price Alert system) referenced `pageMonitors.some(...)`, which would throw (`.some` doesn't exist on the object-shaped survivor) the moment it actually ran. Removed the dead first copy; simplified `ensureMonitorAlarm` to not depend on `pageMonitors`'s shape at all, fixing the latent crash.
8. **`skills/engine.js`'s `ai` step** called `aiComplete(system, prompt, {maxTokens,temperature})` — a 3-argument call against a 2-argument, options-object function. The real task `prompt` was silently dropped (sent as an unread 2nd positional arg), only `system` reached the model. Fixed to bake both into one message string.
9. **Storage-key collision**: `agents/agent-manager.js`'s `X1AgentManager` and the x1-core bundle's `AgentManager` (reached via `agents-x1.js`) both persisted to `chrome.storage.local['x1_agents']` with incompatible schemas — the x1-core one auto-writes on every startup, silently corrupting/shadowing whichever the other had stored. Gave `X1AgentManager` (the far less-used system) its own key, `x1_agents_simple`.
10. **`service-worker.js`'s `aiProviders.nvidia.models`** still listed the retired `deepseek-ai/deepseek-v4-pro`; updated to the 5 actually-active NVIDIA models.
11. **`service-worker.js`'s `getDefaultProvider()`** fell back to `"groq"`, a provider with no corresponding completion function anywhere in the file. Changed to `"auto"`, matching how `loadAIKeys()` itself normalizes legacy `groq`/`opencode` values. (This function currently has zero callers, so the practical impact is nil today — fixed for correctness/consistency anyway since it's cheap and misleading otherwise.)

## 13. Known bugs found but NOT fixed (in partner's territory, or too large for a bug-fix pass)

Listed here rather than silently left out, so nothing gets lost. None of these were touched, per the scope boundary.

**Inside judge/orchestration territory (not touched, per the explicit "no tocar" boundary):**
- `service-worker.js:3275` (inside `aiComplete`) — `responseCache` is declared with `var` *inside* the function body, so it's re-initialized to `{}` on every single call. The cache check a few lines later can never hit — every call is a guaranteed miss. The fix is a one-line hoist (move the `var responseCache = {}` to module scope, outside the function), but that changes `aiComplete`'s runtime behavior (repeat identical queries would start returning cached answers), and `aiComplete` is the literal center of Panel+Judge territory — left for the partner.
- `ai-router.js:286` — `var self = this` inside `routeAndExecute` shadows the global `self`, so its own `self.X1Judge.parseResponse(...)` call always resolves `undefined` and silently falls through to a naive fallback. Moot today since `routeAndExecute` has no production callers anyway, but would bite immediately if `X1Router` were ever wired in as-is.
- The entire disconnected panel-judge / `X1Judge.runJudge` / `X1Voting` / `X1Router` / front-end-trigger-to-`EnsembleEngine` gap described in §3 — this is a wiring/architecture decision, not a bug with an obvious one-line fix, and it's the core of what "no tocar" protects.

**Outside judge territory, but larger than a mechanical fix (left as documented findings for a dedicated pass):**
- The ~9 AI bridge files that call `document`/`window`/`localStorage` APIs unavailable in a service worker (piper, huggingface, leveldb, page-agent, most of playwright, webllm's script-injection path, freeweb/n0x's extraction helpers, tesseract's canvas fallback) — fixing these for real means moving that logic into a content script or an offscreen document (a real architectural addition), not a line-level patch.
- `background/seo/seo-analyzer.js`, `background/monitor/page-monitor.js`, `background/prompts/assembler.js`, `background/google/*.js` (all 4 files), `background/memory/*.js` (all 6 files) — genuinely dead/orphaned code. Left in place rather than deleted, since removing a working (if disconnected) module is a product decision (wire it in vs. delete it), not a bug fix — flagged here for you to decide.
- `X1DataExtractor.extractBySelector()` — a stub that always returns `null`; any caller relying on selector-based extraction gets silently nothing. Implementing it is new work, not a fix.
- `X1DeepResearch.research()` hijacking the user's active tab to navigate to Google search as part of its research loop — a real UX concern, but changing it means redesigning how this feature captures search results (e.g. a background tab instead), not a one-line fix.

## 14. Recommendations (not acted on — decisions for you and your partner)

1. **Decide whether to connect the real judge system to `aiComplete`, or delete/simplify it.** Five separate "evaluate multiple AI answers" implementations for one feature that isn't live is a lot of maintained-but-dormant surface area. This is squarely a Panel+Judge architecture call — not mine to make unilaterally, but worth a direct conversation given how much has been built.
2. **Decide whether the 22 AI bridges are worth keeping as-is.** A third of them cannot ever work in a service worker without a real architectural change (moving DOM-dependent logic into an offscreen document or content script). If they're aspirational/future work, fine — but right now they inflate load time and the `X1Integrations` registry with entries that fail the moment anything calls them.
3. **Consolidate or clearly separate the two agent systems and four memory systems** — at minimum, document (as this file does) which one is "the real one" so nobody builds a new feature on the wrong one.
4. **The Google integration duplication** (`background/google/*.js` vs. inline `googleApi()`) is a good candidate for a clean, low-risk consolidation whenever someone has a free session — same author-territory concerns don't apply here since it's not judge/orchestration.

---

## 15. Reference: dependency/load order

`background/service-worker.js`'s `importScripts()` list, current order: memory/* → cascade/rate-limiter+providers/*+router → google/* → agents/agent-manager+workspace → plugins/engine+agency-plugins → automation/monitor/research/style/chat/finance/image/extract/seo/mcp/skills/prompts → `x1-core/bundle/x1-core.js` → `x1-bridge.js` → `protocol.js` → `integrations/registry.js` → 22 `ai/*-bridge.js` → `ai-judge.js`/`ai-voting.js`/`ai-router.js`/`ai-pool.js` → `x1-api.js` → `agents-x1.js` → `x1-integration.js` (last, deliberately — see §3.3).
