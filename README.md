# X1 — Browser Agent (Voice + Text)

**X1 ve lo que tú ves en el navegador.** Habla o escribe, y X1 entiende el contexto, navega, busca en la web, extrae datos, gestiona email y calendario, y ejecuta tareas multi-paso — todo desde el sidepanel o por voz. Sin API keys. Sin costes.

---

## Demo (30s)

1. Abre Chrome → extensiones → "Load unpacked" → selecciona `cbos-ext/`
2. Abre el sidepanel (icono X1 en la barra)
3. Escribe: *"investiga las últimas tendencias en IA para 2026"*
4. X1 responde en ~1s, busca en la web, sintetiza resultados

---

## Cómo funciona

```
Tú hablas/escribes → panel.js o voice-listener.js
  → JUEZ (free-claude-code, 38.4k ⭐):
      • Local: proxy Python con 18 providers (Groq, Cerebras, Gemini, etc.)
      • Cloud: Cloudflare Worker (NVIDIA NIM + Groq, sub-1s)
      • Siempre disponible: si local falla, pasa a cloud
  → execAction() ejecuta: clic, escribir, navegar, email...
  → X1 responde por voz + texto
```

No hay dependencias externas. El Judge (free-claude-code) se ejecuta localmente via `start-fcc.bat` o en cloud automáticamente.

---

## Stack (0 APIs de pago)

| Repo | Estrellas | Rol |
|------|-----------|-----|
| [free-claude-code](https://github.com/Alishahryar1/free-claude-code) | 38.4k ⭐ | Judge: proxy de IA con 18 providers |
| [freeweb-mcp](https://github.com/xenitV1/freeweb) | 46 ⭐ | Búsqueda web multi-motor |
| [web-llm](https://github.com/mlc-ai/web-llm) | 13.9k ⭐ | Inferencia local vía WebGPU |
| [page-agent](https://github.com/nicepage/page-agent) | — | Automatización de páginas |
| [token-free-gateway](https://github.com/token-free/token-free-gateway) | — | Gateway sin tokens |
| [n0x](https://github.com/n0x-ai/n0x) | — | Motor de búsqueda adicional |

---

## Estado: 5 capas

```
Layer 5: AMI Predictivo ──── world model, simulación ── ████░░ 60%
Layer 4: Memoria ─────────── op-graph, intenciones ──── ██████ 100%
Layer 3: Web Agent ───────── agent loop 20 steps ────── ██████ 100%
Layer 2: Voz humana ──────── TTS, interrupción ──────── ██████ 100%
Layer 1: Proceso ─────────── barra + iconos ─────────── ██████ 100%
Layer 0: Sistema ─────────── SW, bridges ────────────── ██████ 100%
```

---

## Equipo

Iván Arjona (@iarjona2000) — arquitectura, agentes, integraciones  
Tomás Calero (Tomahawk999) — voz, experiencia de usuario