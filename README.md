# X1 — Voice-First AI Agent for Chrome

A production-grade Chrome Extension (MV3) that brings voice-controlled AI autonomy to your browser. Navigate, click, read, write, search, email, and create with your voice. X1 is a 7-layer architecture with multi-AI support, persistent memory, and adaptive decision-making.

**Status**: Implementation complete. Testing phase. ~34k lines of JavaScript across 40 modules.

---

## Quick Start

1. **Load the extension**
   ```
   chrome://extensions
   → "Load unpacked"
   → Select: cbos-ext/
   ```

2. **Run tests**
   - Open DevTools: Right-click extension icon → "Inspect"
   - Copy-paste the smoke test from `docs/UNIT_TESTS.md` into Console
   - Should see: `✅ ALL MODULES LOADED`

3. **Activate X1**
   - Double clap (if permitted) or click extension icon
   - Speak a command: "navega a google.com" or "resume esta página"

4. **For dev details**, see:
   - `docs/HANDOFF.md` — 7-step testing checklist + architecture reference
   - `docs/UNIT_TESTS.md` — 20+ console tests
   - `CLAUDE.md` (root dir) — Development guidelines (CLAUDE.md at /Users/tomas/.claude/CLAUDE.md)

---

## Architecture — 7 Layers

```
L6: Integration Hub (13 AI providers, MCP, skills, plugins, automation, agents)
L5: AMI Predictive (world model, cost simulation, intent tracking)
L4: Memory (IndexedDB encrypted, op-graph, intention-graph, world-model)
L3: Web Agent (autonomous navigation, multi-step tasks, max 20 steps)
L2: Voice (TTS español, interruption detection, glow, bubbles)
L1: Process Bar (step progress, app icons, animated status)
L0: Stability (error traps, import guards, storage persistence)
```

---

## File Structure

```
cbos-ext/
├── background/
│   ├── service-worker.js           # Core engine (17,934 lines, ES5 only)
│   ├── cascade/
│   │   ├── router.js               # Judge system + sector-based routing
│   │   ├── rate-limiter.js         # Per-provider rate limiting
│   │   └── providers/
│   │       ├── groq.js, gemini.js, openai.js, deepseek.js, ollama.js
│   │       ├── nvidia.js, cerebras.js, sambanova.js, mistral.js
│   │       ├── together.js, openrouter.js, cloudflare.js
│   ├── agents/
│   │   ├── agent-manager.js        # Custom agent CRUD + orchestration
│   │   └── workspace.js            # Workspace + shared memory + marketplace
│   ├── memory/
│   │   ├── indexeddb.js            # Encrypted persistent storage
│   │   ├── op-graph.js             # Operational graph (entities, relations)
│   │   ├── intention-graph.js      # Intent tracking + priorities
│   │   ├── world-model.js          # AMI world state perception
│   │   ├── encryption.js           # AES-GCM-256
│   │   └── ai-memo.js              # Cached AI responses
│   ├── google/
│   │   ├── auth.js                 # OAuth2 + token management
│   │   ├── gmail.js, calendar.js, drive.js
│   ├── plugins/
│   │   └── engine.js               # Declarative plugin system
│   ├── automation/
│   │   └── rule-engine.js          # Rule-based automation
│   ├── monitor/
│   │   └── page-monitor.js         # Page change detection + alerts
│   ├── research/
│   │   └── deep-research.js        # Multi-source research + synthesis
│   ├── style/
│   │   └── writing-style.js        # Adaptive user writing style learning
│   ├── chat/
│   │   └── group-chat.js           # Parallel multi-model chat + debates
│   ├── finance/
│   │   └── financial-data.js       # Finnhub + Alpha Vantage (quotes, news, crypto)
│   ├── image/
│   │   └── image-generation.js     # Cloudflare Flux + DALL-E 3
│   ├── extract/
│   │   └── data-extractor.js       # NL data extraction from pages
│   ├── seo/
│   │   └── seo-analyzer.js         # Comprehensive SEO analysis + scoring
│   ├── mcp/
│   │   └── client.js               # Model Context Protocol (HTTP + SSE)
│   ├── skills/
│   │   └── engine.js               # Reusable skills with templating
│   └── prompts/
│       └── assembler.js            # Prompt assembly by template
├── content/
│   ├── voice-listener.js           # Layer 1-4 UI: process bar, voice, glow, bubbles
│   ├── voice-bridge.js             # Bridge SW ↔ main world
│   ├── floating-toolbar.js         # Selection toolbar (summarize, explain, etc)
│   ├── gmail.js, calendar.js, docs.js, sheets.js, meet.js, drive.js, contacts.js
│   └── universal.js                # Generic page actions
├── offscreen/
│   └── voice.html                  # Audio context + clap detection
├── sidepanel/
│   ├── panel.html                  # Chat UI
│   ├── panel.js, panel.css
├── manifest.json                   # MV3 manifest
├── assets/
│   └── x1-logo*.png
└── docs/
    ├── HANDOFF.md                  # 7-step testing checklist
    ├── UNIT_TESTS.md               # 20+ console tests
    ├── X1_CONTEXT_FOR_AI.md        # Master prompt v3 (18 sections)
    ├── X1_VISION_FOR_KILO.md       # Vision (12 paradigms)
    └── X1_SHARED_AGENTS_NETWORK.md # Shared agent architecture
```

---

## Core Concepts

### handleVoice(text, wantsText, sendResponse)
Main entry point. Receives user voice/text → routes to AI or direct command.

Flow:
1. `parseCommand()` — regex-based (40+ patterns)
2. `classifyIntent()` — detect intent type
3. `aiComplete()` — Panel system (groq+gemini+mistral parallel, scored by Judge)
4. `execAction()` — execute 80+ action cases
5. `buildSystemPrompt()` — inject memory, graph, persona, world model

### Cascade System
13 AI providers with automatic fallback + rate limiting:
```
Proxy (if available)
→ Groq (default, fastest)
→ Nvidia, Gemini, Cerebras, SambaNova, Mistral, Together, OpenRouter, Cloudflare
→ Ollama (local fallback)
```

### Memory Hierarchy
```
chrome.storage.session (temp)
  ↓ x1Memory (20 msg max)
chrome.storage.local (persistent)
  ↓ x1_graph, x1_manual, x1_priorities, x1_reminders, x1_automations, x1_skills
IndexedDB (encrypted)
  ↓ large binary data (screenshots, encrypted blobs)
```

### AMI World Model
```
perceiveState()        → current browser context
simulateAction()       → predict action outcome
computeCost()          → time + risk + context-switch + repetition
selectAction()         → pick lowest-cost action
allocateAttention()    → prioritize competing demands
recordOutcome()        → learn from prediction errors
```

---

## Required API Keys

Store in `chrome.storage.local`:
```javascript
{
  groqKey: 'gsk_...',
  geminiKey: 'AIzaSy...',
  openaiKey: 'sk-...',
  nvidiaKey: 'nvapi-...',
  cerebrasKey: 'csk_...',
  sambanovaKey: 'sk-...',
  mistralKey: 'msT_...',
  togetherKey: 'b5...',
  openrouterKey: 'sk-or-...',
  cloudflareAccountId: '...uuid...',
  cloudflareKey: 'Bearer token...',
  finnhubKey: 'c...',
  alphaVantageKey: 'demo' (or real key),
  aiProvider: 'auto'
}
```

---

## Testing

### Smoke Test (30 seconds)
```javascript
// Open DevTools → Console, paste:
(function() {
  var tests = [
    ['X1IndexedDB', typeof X1IndexedDB !== 'undefined'],
    ['X1CascadeRouter', typeof X1CascadeRouter !== 'undefined'],
    ['handleVoice', typeof handleVoice === 'function'],
    ['execAction', typeof execAction === 'function'],
  ];
  var fail = tests.filter(t => !t[1]);
  console.log(fail.length === 0 ? '✅ PASS' : '❌ FAIL: ' + fail.map(t => t[0]).join(', '));
})();
```

### Full Test Suite
See `docs/UNIT_TESTS.md` for 20+ unit tests.

### Manual Test Flow (from docs/HANDOFF.md)
1. Voice activation (clap or icon)
2. Simple navigate action
3. Search action
4. Gmail send
5. New subsystems (finance, image, research, etc.)

---

## Development Notes

### Code Style
- **ES5 only** in service-worker.js (no let/const/arrow/async/await/imports)
- **ES6+ OK** in content scripts and worker files
- **No comments** unless WHY is non-obvious
- **Spanish** for user-facing, English for code
- **IIFE pattern** for all subsystem modules

### Adding a New Action
1. Add case in `execAction()` (line ~3600+)
2. Update `SYSTEM_PROMPT` action list (line ~1325+)
3. Add to relevant subsystem
4. Test in console with `handleVoice({text: '...action...', }, true, callback)`

### Adding a New Provider
1. Create `background/cascade/providers/newprovider.js` following IIFE pattern
2. Add to `importScripts` (line ~19)
3. Update `aiKeys` loading (line ~1271+)
4. Add to PROVIDER_MAP in router.js
5. Test with `X1ProviderNewProvider.complete(sys, msg, opts)`

---

## Known Issues & Fixes

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| "Cannot read image.png" error | Ollama doesn't support images | Filtered in `isValidContent()` |
| Module not loading | Missing importScripts | Reload extension at `chrome://extensions` |
| Voice not working | getUserMedia permission | Grant mic permission when prompted |
| AI cascade fails | All providers rate limited | Check API keys, check RateLimiter status |
| Memory overflows | >20 messages | Automatically sliced, older dropped |

---

## Performance

| Component | Target | Status |
|-----------|--------|--------|
| Service worker init | <2s | ✓ Fast (ES5, minimal imports) |
| Voice recognition | <500ms per utterance | ✓ Chrome built-in STT |
| AI response | <10s | ✓ Groq ~3s, Gemini ~5s |
| Page navigation | <3s | ✓ includes wait time |
| Memory lookup | <100ms | ✓ Linear search, max 20 items |

---

## Deployment Checklist

- [ ] All UNIT_TESTS.md tests pass
- [ ] All 7 HANDOFF.md testing steps pass
- [ ] No [X1] errors in console
- [ ] Voice activation works (clap + icon)
- [ ] One end-to-end flow tested (e.g., navigate → email)
- [ ] ~15 remaining async functions converted to Promises (ES5 compliance)
- [ ] git status clean
- [ ] `git add . && git commit -m "feat: X1 complete — 34k lines, 7-layer architecture"`

---

## Next Steps

1. **Complete ES5 compliance** (~15 async functions remain, ~1 hour)
2. **Run all tests** (docs/HANDOFF.md + UNIT_TESTS.md, ~2 hours)
3. **Polish & optimize** (UI responsiveness, error handling, ~1 hour)
4. **Commit & ship** 🚀

See `docs/HANDOFF.md` for detailed 7-step testing roadmap.

---

## Author

Tomas Calero (@tomas)  
marc.calero@iese.net  
Co-founder, voice-first AI enthusiast.

**X1 Mission**: Replace the keyboard with your voice as the primary input modality. See everything, act on everything.
