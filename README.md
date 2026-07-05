# X1 — Autonomous Browser Agent

<img src="assets/x1-logo.png" alt="X1" width="140"/>

**X1 is a voice-first, autonomous browser agent that sees what you see.** Speak or type, and X1 understands context, navigates the web, searches, extracts data, manages email/calendar, fills forms, and executes multi-step tasks — all from the Chrome sidepanel. Built on a 6-layer architecture with an Adaptive Machine Intelligence (AMI) world model.

---

## What X1 Does

| Capability | Description |
|------------|-------------|
| **Voice Control** | Continuous conversation mode with human-like TTS (Spanish). Interruption detection — talk over X1 and it stops and listens. Double-clap activation. |
| **Autonomous Navigation** | Multi-step web agent with up to 20 steps. Clicks, types, scrolls, reads, navigates, and loops until the task is complete. |
| **Process Transparency** | Real-time process bar showing each step with app icons (Google, npm, Stack Overflow, web), status dots (pulse=active, green=done, red=error), and descriptions. |
| **Multi-AI Cascade** | 7-provider failover: Cloudflare Worker proxy → OpenCode Zen → Groq (Llama 3.3 70B) → Grok (xAI) → OpenAI (GPT-4o-mini) → Gemini (2.0 Flash) → Ollama (local). Zero downtime. |
| **Google Integration** | Gmail (send, draft, read, search, summarize, triage), Calendar (create, list, availability, suggest times), Docs, Sheets — all via `chrome.identity` OAuth2. |
| **GitHub Integration** | Device Flow login, repository search, code search, user profiles. Agent-as-repository paradigm. |
| **npm + Stack Overflow** | Package search, version info, weekly downloads. SO search with accepted answers ranked. |
| **Memory & Context** | Conversation memory (last 20 messages), operational graph (entities + relations), knowledge manual, user priorities, intention graph. |
| **Adaptive Intelligence** | AMI world model: perceive → simulate → compute cost → select action. Agent modes: executor, explorer, thinker, creator, social, focus. |
| **8 Personas** | Hacker, mentor, storyteller, trader, poet, critic, strategist, friend — each with unique tone, vocabulary, and emoji style. |
| **Ceremony System** | Multi-step templates for research, meetings, code, analysis, trading — auto-detected by keyword matching. |
| **Smart Reply** | Reads last email, generates reply draft, opens compose. |
| **Daily Digest** | Full briefing: calendar + unread email summary, generated as a doc. |
| **Focus Mode** | Single-tab deep work — auto-returns to current tab, minimizes interruptions. |
| **Socratic Mode** | For exploratory/philosophical questions — generates guiding questions with options instead of direct answers. |

---

## Architecture (6 Layers)

```
Layer 5: AMI Predictive ──── world model, simulate actions, cost ── ██████ 100%
Layer 4: Memory + Intention ── op-graph, priorities, intentions ───── ██████ 100%
Layer 3: Web Agent ──────────── autonomous loop, 20 steps max ────── ██████ 100%
Layer 2: Human Voice ────────── TTS prosody, interruption, glow ──── ██████ 100%
Layer 1: Process Bar ────────── step cards, app icons, status ────── ██████ 100%
Layer 0: System Stability ───── service worker, bridges, auth ────── ██████ 100%
```

### Communication Flow

```
User speaks (mic)
  → voice-listener.js (MAIN world — captures audio)
    → window.postMessage → voice-bridge.js (ISOLATED world)
      → chrome.runtime.sendMessage → service-worker.js
        → parseCommand || aiComplete → execAction
          → chrome.tabs.* / chrome.scripting.* / chrome.identity.*
          → stepProgress() → X1_STEP_PROGRESS
            → voice-bridge → x1-step-progress → process bar renders
      ← chrome.runtime.sendMessage (reply)
    ← window.postMessage ← voice-bridge.js
  → voice-listener.js displays response + humanSpeak() via TTS
  → Auto-listens for next command
```

---

## Multi-AI Engine

| Provider | Model | Role | Timeout |
|----------|-------|------|---------|
| **Proxy** (Cloudflare Worker) | OpenCode Zen → Groq | First try, server-side keys | 20s |
| **OpenCode Zen** | zen | Direct fallback | 20s |
| **Groq** | Llama 3.3 70B Versatile | Fastest, most reliable | 20s |
| **Grok** | grok-3-mini-fast | xAI provider | 15s |
| **OpenAI** | GPT-4o-mini | Premium fallback | 20s |
| **Gemini** | 2.0 Flash | Google fallback | 20s |
| **Ollama** | Local models | Offline fallback | 20s |

All providers share `isValidContent()` validation to filter vision errors and "cannot read image" responses.

---

## AMI — Adaptive Machine Intelligence

Yann LeCun-inspired world model architecture:

| Function | Purpose |
|----------|---------|
| `perceiveState()` | Reads page context, tabs, time, memory, active intention |
| `simulateAction()` | Predicts outcome before execution (expectedOutcome, cost, risk) |
| `computeCost()` | Multi-factor: timeCost + riskCost + contextSwitchCost + repetitionCost |
| `selectAction()` | Simulates candidates, returns lowest-cost action |
| `getAgentMode()` | Analyzes state → executor / explorer / thinker / creator / social / focus |
| `allocateAttention()` | Prioritizes competing demands by urgency + relevance |
| `recordOutcome()` | Stores prediction vs reality for learning |
| `predictNextAction()` | Suggests next best action from prediction history |
| `getWorldContext()` | Compact state for system prompt injection |

---

## Repository Structure

| Path | Description | Lines |
|------|-------------|-------|
| `background/service-worker.js` | Core engine: AMI, persona, AI cascade, ceremonies, commands, Google APIs, agent loop | 19,273 |
| `content/voice-listener.js` | MAIN world: process bar, human TTS, glow effect, conversation bubbles, interruption detection | 1,085 |
| `content/voice-bridge.js` | ISOLATED world: relay postMessage ↔ chrome.runtime | 210 |
| `sidepanel-ui/src/main.jsx` | Entry point: createRoot, GithubLogin (Device Flow + OAuth + PAT + guest) | 246 |
| `sidepanel-ui/src/App.jsx` | Sidebar, settings, Chat/Repo tabs, conversation management | 155 |
| `sidepanel-ui/src/ChatView.jsx` | Agent picker, messages, thinking dots, tool badges, process timeline | 324 |
| `sidepanel-ui/src/RepoView.jsx` | Local/GitHub/Tools tabs, search, filters, categories | 329 |
| `sidepanel-ui/src/backend.js` | AI cascade, Device Flow, OAuth, smart query, greeting detection | 357 |
| `sidepanel-ui/src/tools.js` | GitHub/npm/SO/web APIs, memory localStorage, greeting skip | 163 |
| `sidepanel-ui/src/ProcessTimeline.jsx` | Step cards with app icons, pulse animation | 76 |
| `offscreen/voice.html` | Clap detection via AudioContext + AnalyserNode | 92 |
| `worker/src/worker.js` | Cloudflare Worker: server-side AI cascade, rate limiting | 178 |
| `manifest.json` | MV3 manifest: permissions, sidePanel, content scripts (MAIN + ISOLATED) | 130 |
| **Total** | **Source code (excluding node_modules)** | **~22,640** |

---

## Design System

All styles are inline using exact GitHub hex colors. No external UI frameworks.

| Token | Value | Usage |
|-------|-------|-------|
| Border | `#d0d7de` | Cards, inputs, dividers |
| Background | `#ffffff` | Main bg |
| Background Subtle | `#f6f8fa` | Secondary bg, hover states |
| Foreground | `#1f2328` | Primary text |
| Foreground Muted | `#59636e` | Secondary text |
| Accent | `#0969da` | Links, active states |
| Success | `#1a7f37` | Done status |
| Danger | `#d1242f` | Error status |
| Attention | `#bf8700` | Warning, attention |
| Font | `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif` | System font stack |

### Process Bar (Layer 1)
- Floating at top center with glassmorphism (`backdrop-filter: blur`)
- Sequential step cards: app icon (original favicon) + description + animated status dot
- Status: pulse animation (active), green checkmark (done), red X (error)
- Auto-scroll to latest step, auto-hides 3s after completion

### Human-Like Speech (Layer 2)
- SpeechSynthesis with Spanish voice selection, 1.05 rate/pitch
- Laughter support: `(risas)` tag adds chuckle before speaking
- Interruption: Web Audio API AnalyserNode monitors mic during speech
- RMS threshold > 18 for 3 consecutive checks → stop speaking + re-listen

### Conversation Bubbles (Layer 4)
- Stackable bubbles with glassmorphism, max 3 visible
- Auto-remove after timeout (increasing with bubble count)
- Think bubble during processing with 20-second fallback

---

## Voice Interface

### Activation
- **Double-clap**: Offscreen audio detection → `X1_CLAP` → `X1_TOGGLE`
- **Extension icon click**: SW sends `X1_TOGGLE`

### Continuous Conversation
- Auto-restarts listening after each response
- 2.5s silence timeout → auto-sends transcription
- User can interrupt speech by talking

---

## Google Integration

### Auth
```javascript
chrome.identity.getAuthToken({ interactive: true }, function(token) { ... })
```
- `loginGoogle()`, `logoutGoogle()`, `isLoggedIn()`, `getGoogleToken()`
- OAuth2 scope: gmail.modify, calendar, spreadsheets, drive.file

### API Calls (raw fetch, no SDKs)
| Service | Actions |
|---------|---------|
| **Gmail** | Send, draft, read, search, summarize, triage, labels |
| **Calendar** | Create, list day/week, availability, suggest times, update, delete, decline |
| **Docs** | Create via navigate `/create`, inject text via scripting |
| **Sheets** | Create via API, read via API |

---

## GitHub Integration

### Login Methods (3 options)
1. **Device Flow**: `POST /login/device/code` → user enters code at github.com/login/device → poll for token
2. **OAuth Web Flow**: `chrome.identity.launchWebAuthFlow` with callback URL
3. **Manual PAT**: User pastes personal access token directly
4. **Guest Mode**: Tool-only access (GitHub/npm/SO search, no AI responses)

### Capabilities
- Repository search (name, language, stars, description)
- Code search (filename, content)
- User profile lookup
- Agent-as-repository paradigm (each AI agent = repository + IA)

---

## Tools Engine

| Tool | Source | Method |
|------|--------|--------|
| GitHub Search | `api.github.com/search/repositories` | GET |
| Code Search | `api.github.com/search/code` | GET |
| npm Search | `registry.npmjs.org/-/v1/search` | GET |
| Stack Overflow | `api.stackexchange.com/2.3/search/advanced` | GET |
| Web Search | `duckduckgo.com/?q=...&format=json` | GET |

### Smart Query
- Detects greetings (hola, hey, hi, etc.) → skips all tools, responds conversationally
- Detects topic → selects appropriate tools via `detectTools()`
- Executes tools in parallel → `buildSmartResponse()` summarizes results

---

## Knowledge Stores

| Store | Storage Key | Format |
|-------|-------------|--------|
| Conversation Memory | `cbosMemory` (session) | Array max 20 `{role, content}` |
| Operational Graph | `cbos_graph` (local) | `{entities: [{name, type, properties, relations, date}]}` |
| Knowledge Manual | `cbos_manual` (local) | `{entries: [{topic, content, date}]}` |
| User Priorities | `cbos_priorities` (local) | Array `[{text, date}]` max 10 |
| Reminders | `cbos_reminders` (local) | Array `[{text, when, created, id}]` |
| Intention Graph | `cbos_intentions` (local) | Array `[{text, type, goal, status, created}]` |
| Tool Memory | `x1_memory` (localStorage) | `{github:[], npm:[], so:[], web:[]}` |

---

## Command Parser

40+ regex-based direct commands checked BEFORE AI fallback:

| Category | Commands |
|----------|----------|
| Navigation | `navega a`, `abre`, `ve a`, `ir a` |
| Search | `busca`, `search`, `encuentra`, `google` |
| Gmail | `email`, `correo`, `gmail`, `envia email`, `redacta email` |
| Calendar | `reunion`, `meeting`, `calendario`, `agenda` |
| Tabs | `nueva pestaña`, `cierra pestaña`, `cambia a pestaña` |
| Scroll | `scroll`, `baja`, `sube` |
| Read | `lee`, `read`, `que dice` |
| Click | `click`, `dale click`, `presiona` |
| Type | `escribe`, `type`, `escribir` |
| Google Auth | `login google`, `logout google` |
| Code | `programa`, `escribe codigo`, `debug` |
| Config | `cambia provider`, `apikey` |
| Focus | `focus mode`, `modo enfoque` |

---

## Ceremony System (Multi-Step Templates)

| Ceremony | Keywords | Steps |
|----------|----------|-------|
| **Research** | investiga, research, busca info sobre | navigate → readPage → search → readPage → summarize |
| **Meeting** | prepara reunion, meeting prep | navigate → readPage → search → calendarList → gmailRead → readPage → speak |
| **Code** | programa, escribe codigo en | codeWithGoal |
| **Analyze** | analiza, compara, evalua | navigate → readPage → search → readPage → speak |
| **Trading** | mercado, bolsa, trading, stock | navigate → readPage → readPage → speak |

---

## Build

```bash
# Sidepanel UI
cd sidepanel-ui
npm install
npm run build   # → ../sidepanel/dist/panel-ui.js (~196kb)

# Cloudflare Worker
cd worker
npm install
npx wrangler deploy
```

### Bundle
- **esbuild** bundler, single output file
- React 18 + ReactDOM 18 only (no @primer, no @fluentui)
- ~196kb minified

---

## Stack

| Component | Technology |
|-----------|-----------|
| Extension API | Chrome MV3 |
| Service Worker | ES5 classic script (no imports, no let/const, no arrow functions) |
| Sidepanel UI | React 18 (esbuild, inline styles, GitHub hex colors) |
| Voice (TTS) | Web Speech API + AnalyserNode |
| Voice Activation | Offscreen AudioContext (clap detection) |
| AI Cascade | Cloudflare Worker proxy → 7 providers |
| Google Auth | `chrome.identity` OAuth2 |
| GitHub Auth | Device Flow + Web OAuth + Manual PAT |
| GitHub/npm/SO APIs | Raw fetch, no SDKs |
| Worker Server | Cloudflare Workers (wrangler) |
| Memory | chrome.storage.local + localStorage |

---

## Environment Variables / API Keys

All keys stored in `chrome.storage.local`, loaded via `loadAIKeys()`:

| Key | Provider | Default |
|-----|----------|---------|
| `groq_key` | Groq | (empty) |
| `openai_key` | OpenAI | (empty) |
| `gemini_key` | Gemini | (empty) |
| `xai_key` | xAI/Grok | (empty) |
| `ollama_url` | Ollama | `http://localhost:11434` |
| `ai_provider` | Active provider | `auto` (cascade) |

---

## Team

- **Ivan Arjona** (@iarjona2000) — Architecture, AMI, integrations, agent system
- **Tomas Calero** (Tomahawk999) — Voice, UX, process bar, human-like speech

---

## License

Private — All rights reserved.
