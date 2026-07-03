# X1 — Browser Agent (Voice + Text)

**X1 ve lo que tú ves en el navegador.** Habla o escribe, y X1 entiende el contexto, navega, hace clic, busca en la web, extrae datos, rellena formularios, gestiona email/calendario, y ejecuta tareas multi-paso de forma autónoma — todo desde el sidepanel o por voz.

**Zero API keys needed.** X1 funciona íntegramente con repositorios open-source clonados e integrados directamente en el proyecto.

---

## Cómo funciona

```
Tú hablas/escribes → voice-listener.js o sidepanel panel.js capturan input
  → voice-bridge.js relay al Service Worker
    → FCC proxy (free-claude-code, 38.4k ⭐) da IA nivel Claude via 18 providers
    → FreeWeb (4 buscadores, sin API key) para búsqueda web
    → WebLLM (MLC) como fallback local vía WebGPU
  → execAction() ejecuta: clic, escribir, scroll, navegar, leer, email...
  → stepProgress() actualiza la barra de proceso en tiempo real
← X1 responde por voz + texto en sidepanel
```

## Stack (0 APIs externas, solo GitHub repos)

| Repo | Estrellas | Rol |
|------|-----------|-----|
| [free-claude-code](https://github.com/Alishahryar1/free-claude-code) | 38.4k ⭐ | Cerebro principal: proxy local con 18 providers (Claude, Gemini, Groq, DeepSeek, etc.) vía Anthropic Messages API |
| [freeweb-mcp](https://github.com/xenitV1/freeweb) | 46 ⭐ | Búsqueda web sin API keys: Yahoo, DuckDuckGo, Marginalia, Ask + extracción de contenido |
| [web-llm](https://github.com/mlc-ai/web-llm) | 13.9k ⭐ | Inferencia local via WebGPU (fallback offline) |
| [page-agent](https://github.com/nicepage/page-agent) | — | Automatización de páginas web |
| [token-free-gateway](https://github.com/token-free/token-free-gateway) | — | Gateway de IA sin tokens |
| [n0x](https://github.com/n0x-ai/n0x) | — | Motor de búsqueda adicional |

No necesitas API keys de OpenAI, Groq, Gemini ni ningún proveedor. Todo funciona con código abierto ejecutándose localmente.

---

## Quick Start

```bash
# 1. Arranca el proxy FCC (IA nivel Claude, local y gratis)
start-fcc.bat          # Windows
# o:
uv run uvicorn server:app --host 0.0.0.0 --port 8082

# 2. Carga la extensión en Chrome
chrome://extensions → "Load unpacked" → selecciona cbos-ext/

# 3. Habla
Haz clic en el icono de X1 → dices: "investiga las últimas tendencias en IA"
```

---

## Arquitectura

```
cbos-ext/
├── background/
│   ├── service-worker.js       # Core engine (~21,000 lines, ES5)
│   ├── ai/                     # Bridges a GitHub repos
│   │   ├── fcc-bridge.js       # free-claude-code (Judge principal)
│   │   ├── freeweb-bridge.js   # Búsqueda web sin API keys
│   │   ├── webllm-bridge.js    # WebLLM local (fallback)
│   │   ├── page-agent-bridge.js
│   │   ├── browserai-bridge.js
│   │   ├── n0x-bridge.js
│   │   ├── ai-judge.js         # Sistema Judge
│   │   ├── ai-pool.js          # Pool de providers
│   │   └── ai-router.js        # Enrutamiento inteligente
│   └── integrations/           # Repos clonados
│       ├── free-claude-code/   # 38.4k ⭐ — proxy de IA
│       ├── freeweb/            # Búsqueda web
│       ├── web-llm/            # LLM local
│       └── ...                  # Más repos
├── content/
│   ├── voice-listener.js       # UI: barra de proceso, voz, glow, bubbles
│   └── voice-bridge.js         # Bridge MAIN ↔ SW
├── sidepanel/
│   ├── panel.html
│   ├── panel.js                # Chat UI + provider status
│   └── panel.css
└── docs/
    ├── X1_CONTEXT_FOR_AI.md    # Contexto completo para IAs
    └── X1_VISION_FOR_KILO.md   # Visión del producto
```

**~362,000 líneas totales** (109,000 propias + 253,000 de repos open-source integrados).

---

## Lo que X1 puede hacer

| Categoría | Acciones |
|-----------|----------|
| 🌐 **Navegación** | Abrir URLs, hacer clic, scroll, leer páginas, extraer contenido |
| 🔍 **Búsqueda** | Buscar en la web (FreeWeb), investigación multi-fuente, síntesis |
| 📧 **Email** | Leer, buscar, responder, resumir, organizar por labels (Gmail) |
| 📅 **Calendario** | Ver日程, crear eventos, sugerir horarios, reuniones |
| 📝 **Documentos** | Crear docs, hojas, presentaciones en Google Workspace |
| 🤖 **Autónomo** | Agent loop multi-paso (hasta 20 steps): navega, lee, decide, ejecuta |
| 🧠 **Memoria** | Graph operacional, intenciones, prioridades, conocimiento manual |
| 🎤 **Voz** | TTS natural en español, detección de silencio, interrupción por voz |
| 📊 **Judge** | Sistema de votación multi-IA para respuestas de alta calidad |

---

## Estado

```
Layer 5: AMI Predictivo ──── world model, simulación de costes
Layer 4: Memoria ─────────── op-graph, intenciones, prioridades
Layer 3: Web Agent ───────── agent loop autónomo (20 steps)
Layer 2: Voz humana ──────── TTS, interrupción, risas, pausas
Layer 1: Proceso ─────────── barra de proceso con iconos + pasos
Layer 0: Sistema ─────────── SW, manifest, bridges
```

✅ Capas 0-4 completas. Layer 5 (AMI Predictivo) en progreso.

---

## Para Y Combinator

X1 no es una API wrapper. Es un **middleman de IA** que copia e implementa los mejores repos open-source de GitHub, los integra en una extensión de Chrome, y los orquesta con un sistema Judge central. Sin costes de API, sin rate limits, sin dependencias externas.

**Pitch**: *"X1 ve lo que ves en el navegador. Habla o escribe, y X1 navega, busca, extrae, rellena formularios, gestiona email — usando IA nivel Claude sin pagar un céntimo."*

---

## Autores

Iván Arjona (@iarjona2000) — Co-fundador, arquitectura backend e integración de agentes  
Tomás Calero (Tomahawk999) — Co-fundador, diseño de voz y experiencia de usuario
