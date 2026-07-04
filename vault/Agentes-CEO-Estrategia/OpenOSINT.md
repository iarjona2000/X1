---
tags: [agente, research, candidato]
tier: mcp
rol_abos: Research Agent
estado: candidato-fase-1
---

# OpenOSINT

**Qué hace:** Agente de OSINT (Open Source Intelligence) con REPL interactivo, **servidor MCP** y CLI. 16 herramientas. Describes un objetivo en lenguaje natural y el agente decide qué herramientas ejecutar, las encadena según lo que encuentra, y compila un informe estructurado en Markdown. Funciona con Claude, GPT-4 o modelos locales.

**Repositorio:** [github.com/OpenOSINT/OpenOSINT](https://github.com/OpenOSINT/OpenOSINT) (790 estrellas)
**Uso:** solo investigación autorizada (research de mercado, análisis competitivo — no vigilancia de personas)

## Cómo se conectaría a X1 — AVISO IMPORTANTE
Verificado el README real (2026-07-04): la configuración MCP de OpenOSINT que documentan es **stdio** (`"command": "python", "args": [...]`), no HTTP/SSE. **`X1MCPClient` de X1 solo soporta HTTP/SSE** (STDIO necesitaría native messaging, fuera de alcance para MV3 — así lo dice el propio Master Prompt de X1). Esto significa que OpenOSINT **no es un candidato Nivel 1 directo tal cual**, salvo que:
- se le añada un wrapper HTTP encima (alguien más ya lo hizo para otro proyecto: mirar si existe un `mcp-proxy` genérico que exponga un servidor stdio como HTTP), o
- se use vía su instalación `pip install "openosint[web]"` si esa interfaz web expone algo REST utilizable directamente (sin confirmar, pendiente de revisar).

Bajado de "candidato Fase 1 limpio" a **revisar antes de comprometerse** — dejo [[Taranis-AI]] como alternativa si esto no cuaja.

## Despliegue (lo ejecutas tú, si decides seguir investigando esto)
```bash
pip install openosint
# o desde fuente:
git clone https://github.com/OpenOSINT/OpenOSINT.git
cd OpenOSINT && pip install -e .
```
Variables de entorno en `.env` (copiar de `.env.example`): `ANTHROPIC_API_KEY` como mínimo.

## Enlaces
[[00-CEO]] · [[01-Mecanismo-de-Integracion]]
