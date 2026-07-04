# X1 — Browser Agent (Voice + Text)

<img src="assets/x1-logo.png" alt="X1" width="140"/>

**X1 ve lo que tú ves en el navegador.** Habla o escribe, y X1 entiende el contexto, navega, busca en la web, extrae datos, gestiona email y calendario, y ejecuta tareas multi-paso — todo desde el sidepanel o por voz. Sin API keys. Sin costes.

---

## Diseño: Microsoft Fluent 2

X1 usa **Microsoft Fluent 2** (React v9 `@fluentui/react-components`) como sistema de diseño:

| Elemento | Tokens Fluent 2 |
|----------|----------------|
| Brand ramp | Indigo/violeta personalizado (no #0078d4 de MS) |
| Fondo app | `colorNeutralBackground2` |
| Cards respuesta | `colorNeutralBackground1` + `shadow2` + `borderRadiusLarge` |
| Burbuja usuario | `colorBrandBackground` (índigo 70) |
| Botón enviar | `appearance="primary"` shape circular |
| Tipografía | **Segoe UI** system-ui |
| Tema oscuro | Toggle vía `createDarkTheme` + localStorage |

Solo vista **Chat** — sin Agents, Calendar, Email, Tasks, Activity, ni Settings.

---

## Arquitectura (6 capas)

```
Layer 5: AMI Predictivo ──── world model, simulación ───── ████░░ 60%
Layer 4: Memoria ─────────── op-graph, intenciones ──────── ██████ 100%
Layer 3: Web Agent ───────── agent loop 20 steps ────────── ██████ 100%
Layer 2: Voz humana ──────── TTS, interrupción ──────────── ██████ 100%
Layer 1: Proceso ─────────── barra + iconos ─────────────── ██████ 100%
Layer 0: Sistema ─────────── SW, bridges ────────────────── ██████ 100%
```

---

## Estructura del repo

| Ruta | Qué es |
|------|--------|
| `background/` | Service Worker (~4270 lines) + módulos (agents, ai, google, integrations, x1-core) |
| `sidepanel/` | Side panel UI (Fluent 2 React en `panel.html` + `dist/panel-ui.js`) |
| `sidepanel-ui/` | Fuente React del sidepanel (JSX, esbuild → `sidepanel/dist/`) |
| `content/` | Content scripts (voice, bridge, gmail, calendar, docs, etc.) |
| `offscreen/` | Offscreen document (clap detection) |
| `worker/` | Cloudflare Worker (proxy AI server-side) |
| `plugins/` | Sistema de plugins (core, registry, hooks, manifest) |
| `vault/` | Obsidian vault — documentación de agentes CEO, CFO, CTO, etc. |
| `docs/` | Documentación adicional (handoff, issues, protocol, architecture) |
| `assets/` | Logos e iconos de apps |
| `x1-extension/` | Copia de referencia de una versión anterior empaquetada con webpack |

---

## Demo (30s)

1. Abre Chrome → `chrome://extensions` → "Load unpacked" → selecciona `cbos-ext/`
2. Abre el sidepanel (icono X1 en la barra)
3. Escribe: *"investiga las últimas tendencias en IA para 2026"*
4. X1 planea los pasos, ejecuta y responde en tiempo real

---

## Build del sidepanel (Fluent 2)

```bash
cd sidepanel-ui
npm install
npm run build   # → ../sidepanel/dist/panel-ui.js
```

---

## Stack

| Componente | Tecnología |
|------------|-----------|
| Extension API | Chrome MV3 |
| Service Worker | ES5 (classic script, sin imports) |
| Sidepanel UI | React 18 + Fluent 2 (esbuild) |
| Voice (TTS) | Web Speech API + AnalyserNode |
| AI Cascade | Proxy Cloudflare → Groq → Grok → OpenAI → Gemini → Ollama |
| Google Auth | chrome.identity OAuth2 |
| Plugins | Sistema propio (hooks + registry) |
| Vault | Obsidian markdown |
| Worker Server | Cloudflare Workers (wrangler) |

---

## Equipo

Iván Arjona (@iarjona2000) — arquitectura, agentes, integraciones
Tomás Calero (Tomahawk999) — voz, experiencia de usuario
