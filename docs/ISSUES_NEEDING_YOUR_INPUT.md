# X1 — Issues That Need Your (or Your Partner's) Decision

Companion to `docs/SYSTEM_ARCHITECTURE.md`. Everything here is something I found, confirmed, and **deliberately did not fix myself** — either because it's inside the Panel+Judge/orchestration territory you've asked me not to touch, or because the "fix" is actually a product/architecture decision, not a line-level bug patch. Grouped by who should decide, then by size.

This list grows as the audit continues — check the date on each entry.

---

## Needs a decision with your partner (Panel+Judge / orchestration territory)

### 1. The real judge system isn't wired into `aiComplete()`
**Found:** 2026-07-04, refined 2026-07-04 (second pass). `aiComplete()` (`service-worker.js:3269`), the function every voice command actually goes through, does a 2-provider speed race with a heuristic score — not an LLM judge. A complete rubric-based panel-judge subsystem (`RUBRICS`, `judgeRound`, daily caps, judge rotation, calibration — `service-worker.js:3099-3267`) sits right next to it and is never called. Separately, `X1Judge.runJudge` (`ai-judge.js`), all of `X1Voting`, and all of `X1Router` have zero production callers. The x1-core `EnsembleEngine`/`Orchestrator` IS wired end-to-end through `x1-api.js`'s own real `X1_API` message handler (confirmed — an earlier draft of this said `X1_API` had no handler anywhere, that was wrong, it just missed that `x1-api.js` registers its own listener separately from `service-worker.js`). It even has front-end trigger functions ready in `content/voice-listener.js` (`x1CompareModels`, `x1RunAgent`, `x1Plan`, `x1ShowBudget`, `x1FactCheckText`, `x1SearchMemory`), correctly wired through the `postMessage` bridge — but **nothing anywhere calls those trigger functions**: no button, no keyboard shortcut, no context menu, no voice-command route. **Also newly confirmed**: the judge that `EnsembleEngine` itself calls (`x1-core`'s `JudgeSystem`) is *also* purely heuristic (length/keyword/regex scoring, zero LLM calls) — so even the most "wired" of the five judge implementations doesn't actually use an LLM to judge anything. Five implementations, zero real LLM-based judging happening anywhere in production.
**Why it needs both of you:** picking which implementation (if any) becomes the real path — or wiring the one trigger function that's cheapest to connect — is exactly the kind of call that's supposed to be made together, not unilaterally by either of us.
**Suggested next step:** a short conversation — do you want (a) the existing rubric-panel-judge in `service-worker.js` wired into `aiComplete`'s complex-query branch, (b) the x1-core `EnsembleEngine` path exposed via a real voice trigger (cheapest — the plumbing already works end-to-end, someone just needs to make one voice command or button call `window.x1CompareModels()`), (c) build a real LLM-as-judge step into one of the five instead of heuristic scoring, or (d) simplify by deleting the unused ones?

### 2. `x1-integration.js` is still intentionally broken
**Found:** earlier session, re-confirmed 2026-07-04. Crashes on an unguarded `window` reference at line 18 (MV3 service workers have no `window`). Left broken on purpose — it would monkey-patch `aiComplete`/`execAction`/`parseCommand` and expose `x1CompareResponses`/`x1EvaluateResponse`/`x1RecordVote`, all judge-adjacent.
**Why it needs your partner:** activating it is a behavior decision (it changes how `aiComplete` and command parsing work), not a mechanical fix, and it directly overlaps with issue #1.
**Suggested next step:** decide together whether to activate it (fixing the `window` bug the same mechanical way as everywhere else) as part of whatever you decide for #1, or delete it if the judge-wiring decision goes a different direction and makes this file moot.

### 3. `ai-router.js`'s `self`-shadowing bug
**Found:** 2026-07-04. `routeAndExecute` (`ai-router.js:286`) does `var self = this`, shadowing the global `self` — so its own `self.X1Judge.parseResponse(...)` call always resolves `undefined`. Currently harmless (this function has zero production callers), but would silently misbehave the moment `X1Router` is ever wired in.
**Why it needs your partner:** it's inside `ai-router.js`, one of the four files explicitly named as his territory.
**Suggested next step:** a one-line rename (`var self` → `var router` or similar) whenever `X1Router` gets activated — not urgent before then.

---

## Needs your product/architecture call (not judge territory, but bigger than a bug fix)

### 4. Two separate "agent" systems, three separate built-in-agent catalogs
**Found:** 2026-07-04 (the storage-key collision between them was fixed — see `SYSTEM_ARCHITECTURE.md` §15 — but the deeper redundancy wasn't).
`X1AgentManager` (`background/agents/agent-manager.js`, 7 built-ins) and the x1-core bundle's `AgentManager` (reached via `agents-x1.js`, 6 presets + its own `seedDefaults()` 3 more) are unrelated systems with no shared model and no single "list all agents" call.
**Decision needed:** consolidate to one, or keep both and document which is "the real one" for new features. No urgency — they no longer corrupt each other's data — but every new agent-related feature has to pick one arbitrarily right now.

### 5. Four unconnected "memory" implementations
**Found:** 2026-07-04. `background/memory/*.js` (IndexedDB-backed, well-built, zero callers), ad-hoc `chrome.storage.local` keys scattered through `service-worker.js` (the actual live memory for most features), the modular per-feature stores (`x1_plugins`, `x1_mcp_servers`, etc.), and `X1Core.MemoryManager` (reached only via `x1-api.js`, the only one hooked to a documented message API).
**Decision needed:** is `background/memory/*.js` meant to become the real memory layer eventually (per earlier project notes about a "Phase 2 IndexedDB memory layer")? If so it needs to actually be wired to something. If not, it's ~6 files of dead weight worth removing.

### 6. Duplicate Google integration
**Found:** 2026-07-04. `background/google/*.js` (`X1GoogleAuth`/`X1GmailAPI`/`X1CalendarAPI`/`X1DriveAPI`) are well-built, real, and **completely unused** — every actual Gmail/Calendar/Drive voice action goes through a separate, hand-rolled `googleApi()` helper inline in `service-worker.js`.
**Decision needed:** this one's lower-stakes than #1 (not judge territory), a good candidate for either of us to consolidate in a future session — flagging here rather than doing it now since your instruction was "put decisions in this doc," not "fix everything regardless."

### 7. The 22 AI-tool bridges: roughly a third can't work as written
**Found:** 2026-07-04. Of the 22 `background/ai/*-bridge.js` files (added in one batch), ~7 call `document`/`window`/`localStorage`/microphone APIs that don't exist in a Chrome extension service worker — they load fine (fixed earlier) but fail or silently no-op on every actual call (`piper-bridge.js`, `huggingface-bridge.js`, `leveldb-bridge.js`, `page-agent-bridge.js`, most of `playwright-bridge.js`, `webllm-bridge.js`'s model-loading path, `freeweb-bridge.js`/`n0x-bridge.js`'s content-extraction helpers). Another ~4 (`browserai-bridge.js`, `ffmpeg-bridge.js`, `sharp-bridge.js`, `chartjs-bridge.js`) are explicit, self-admitted stubs with no real backend at all.
**Decision needed:** these are your partner's additions — worth telling him directly which ones don't work and why (DOM/`window` doesn't exist in a service worker; fixing for real means moving that logic into a content script or an offscreen document, which is real new work, not a patch). Full per-file status table is in `SYSTEM_ARCHITECTURE.md` §5.3.

---

## Smaller, deferred (not urgent, just documented so nothing gets lost)

### 8. `X1DeepResearch.research()` hijacks the user's active browser tab
`deep-research.js:87` — navigates the user's current tab to Google search as part of its research loop, which is disruptive if that tab was in use, and depends on brittle Google result-page CSS selectors that will break whenever Google changes its markup. Fixing means redesigning the capture approach (e.g. a background tab instead) — new work, not a patch.

### 9. `X1DataExtractor.extractBySelector()` is a stub
`data-extractor.js` — always returns `null`. Any schema-based extraction relying on a CSS selector silently gets nothing. Needs a real implementation if this code path is actually wanted.

### 10. Dead-but-harmless modules, loaded and never called
`background/seo/seo-analyzer.js`, `background/monitor/page-monitor.js`, `background/prompts/assembler.js` — each has a working replacement implemented inline elsewhere in `service-worker.js`. Not deleted since removing a working (if disconnected) module is your call, not mine to make unilaterally.

### 11. Gemini model-name drift
`geminiComplete`'s default (`service-worker.js:1960`, `gemini-2.5-flash`) doesn't match `geminiVision`'s and the Worker's (`gemini-2.0-flash`). Both are valid models — likely just drift from editing at different times, not a real bug, but worth a decision on which one you actually want as the standard.

---

## From the second audit pass (2026-07-04) — voice engine, x1-core classes, UI layer

### 12. `SYSTEM_PROMPT` advertises 11 actions `execAction` can't perform
**Found:** 2026-07-04. The voice-command grammar's SISTEMA and INTENCIONES lines tell the model it can produce `saveWorkspace`, `restoreWorkspace`, `listWorkspaces`, `runSwarm`, `generateChapter`, `checkNoise`, `blockDomain`, `setAutonomy`, `trackIntention`, `findIntention`, `updateIntention` — none of these have a matching `case` in the 129-case `execAction` switch. If the model ever emits one, it silently falls to a no-op default and just echoes text.
**Decision needed:** implement the missing `execAction` cases (there are 11, real work), or trim the grammar so it stops promising things it can't do. Silently doing nothing is worse than either extreme — right now a user could ask for one of these and get a confident-sounding but empty response.
**Where:** `service-worker.js`, SYSTEM_PROMPT around line 1525/1538 (grammar) vs. the `execAction` switch, 3578-5028.

### 13. Which `runSkill`/`deepResearch` implementation should be canonical
**Found:** 2026-07-04, fixed the immediate bug (duplicate dead `case` removed — see `SYSTEM_ARCHITECTURE.md` §15 #12) but not this deeper question. The implementations that got deleted as dead code (`X1SkillEngine.runSkill`, `X1DeepResearch.research`) were arguably more complete than the ones that actually run today (a legacy inline `x1Skills` array lookup, and a simpler local `deepResearch()` helper). I didn't swap which one wins — that's a product choice, not a dead-code cleanup.
**Decision needed:** do you want to switch `execAction`'s `'runSkill'`/`'deepResearch'` cases to call the module-based implementations instead? Would need checking whether any real user data exists in the legacy `x1Skills` storage format first.

### 14. `FactChecker` is always constructed broken
**Found:** 2026-07-04. `x1-api.js:257` does `new C.FactChecker({})` — no `workspace` — so every evidence check inside `_checkDocument`/`_checkEmail`/`_checkCalendar` throws internally, gets silently swallowed by a try/catch, and the `factCheck` X1_API action always reports every claim as `unverified`, never actually querying Drive/Gmail/Calendar.
**Decision needed:** this isn't a line patch — `FactChecker` expects `workspace.drive`/`.gmail`/`.calendar` to be real, queryable API clients, and nothing in the codebase currently builds that object. Fixing it means designing and building a `workspace` adapter (could reuse `background/google/*.js`'s well-built-but-currently-unused Gmail/Calendar/Drive wrappers — see item in `SYSTEM_ARCHITECTURE.md` §7 — as the backing implementation, which would also solve two problems at once). Real feature work, not urgent unless you actually want fact-checking to work.

### 15. `PredictiveAssistant` has no message handler
**Found:** 2026-07-04. Fully built (calendar/email/document/routine suggestion heuristics, no LLM needed), exported from the x1-core bundle, but `x1-api.js`'s handler set has no entry that ever instantiates or calls it — unlike its sibling classes (`BudgetManager`, `MemoryManager`, `ProjectManager`, etc.), which all have real handlers. Confirmed via grep: zero references to "predictive" anywhere in `x1-api.js`.
**Decision needed:** worth a 10-line handler addition if you want proactive suggestions surfaced anywhere — but per item #1, even if wired to `x1-api.js`, nothing currently calls the `X1_API` message layer's other working features either (same "plumbing exists, nobody flips the switch" pattern as the judge/orchestrator triggers). Probably worth bundling with a broader decision about whether to build real UI triggers for the `x1-api.js`-backed feature set at all.

### 16. Three separate, non-integrated budget/cost trackers
**Found:** 2026-07-04. `x1-core`'s `BudgetManager` (real daily/monthly spend tracking, `canAfford()` gating) is never called by `aiComplete()`. `service-worker.js` has its own two, separate cost-tracking systems (`costTracker`, `financialTracker`, plus a third storage key `x1ApiBudgets`) that don't share code with it or each other.
**Decision needed:** same shape as the agent/memory redundancy — consolidate, or pick one as canonical and document it. Not urgent (none of them currently block anything), but a new "add spend limits" feature would have to guess which of three trackers to extend.

### 17. Two (or three) simultaneous microphone pipelines
**Found:** 2026-07-04. `sidepanel/panel.js` and `content/voice-listener.js` each run a fully independent `SpeechRecognition` instance, both bound to the same `Ctrl+Space` shortcut; `voice-listener.js` additionally runs a separate `getUserMedia` stream for barge-in detection while X1 is speaking. A user with the side panel open who also triggers the on-page assistant can end up with 2-3 concurrent acquisitions of the same microphone.
**Decision needed:** this needs a "who owns the mic" design — e.g. the side panel and on-page assistant should probably coordinate via a shared `chrome.storage`/message flag so only one is ever actually listening at a time. Not a line patch; a real UX/architecture call, and possibly connected to item #18 below.

### 18. The side panel's TTS is fully built and never called
**Found:** 2026-07-04. `sidepanel/panel.js` has a complete `speak()` function (voice selection, HTML-stripping, rate/pitch tuning) that is never invoked anywhere in the file — the wired-up, "real" UI never actually talks back, despite `content/voice-listener.js`'s separate on-page assistant doing TTS via its own `humanSpeak()`.
**Decision needed:** was this intentional (avoid two things talking over each other, given item #17's mic-ownership problem is really a speaker-ownership problem too) or just an oversight? If you want the side panel to speak, it's a one-line call once you've also decided #17.

### 19. `content/floating-toolbar.js`'s selection-popup may silently fail
**Found:** 2026-07-04. Same root cause as the `voice-listener.js` bug that got fixed this session (a `"world":"MAIN"` script calling `chrome.runtime.sendMessage` where the extension API isn't reliably available) — but this one already has a defensive guard (`if (chrome.runtime && chrome.runtime.sendMessage)`), so instead of throwing it just silently does nothing when unavailable. Lower confidence than the fixed bug since I haven't verified in a real browser whether `chrome.runtime` is actually reachable here or not.
**Decision needed/possible fix:** if the Resumir/Explicar/Traducir/etc. buttons on text selection don't seem to work for you, this is why — fixing it properly means extending `content/voice-bridge.js`'s relay contract to cover `TOOLBAR_ACTION`-shaped messages the same way it already covers voice commands and `X1_API` calls, which I held off on this session since it touches a shared bridge file used by multiple scripts and I'd already made one meaningful, verified change to that flow (item in `SYSTEM_ARCHITECTURE.md` §15 #13).

---

*Last updated: 2026-07-04, second pass of the full system audit (voice command engine, x1-core support classes, UI layer).*
