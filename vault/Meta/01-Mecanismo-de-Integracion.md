---
tags: [arquitectura]
---

# Mecanismo de integración: cómo conecta X1 con un agente externo

X1 es una extensión de Chrome MV3. No puede ejecutar código Python arbitrario, ni lanzar procesos, ni cargar SDKs remotos (regla del propio proyecto, ver `X1_Master_Prompt_v3`, sección 17.0). Eso descarta instalar un framework de agentes (CrewAI, LangGraph, AutoGen...) *dentro* de la extensión — y de todas formas esa capa de orquestación es del socio, no mía.

Lo que sí puede hacer X1: llamar por `fetch()` a lo que sea que el agente externo exponga. Cuatro niveles, de mejor a peor encaje:

## Nivel 1 — Servidor MCP (preferido)

Cada vez más proyectos de agentes exponen un servidor MCP (Model Context Protocol — el estándar que Anthropic empujó y que ya tiene [+10.000 servidores públicos activos](https://registry.modelcontextprotocol.io/)). X1 **ya tiene un cliente MCP funcional** (`background/mcp/client.js`, `X1MCPClient`, HTTP/SSE, verificado esta sesión).

**Coste de añadir un agente de este nivel: cero código nuevo.** Solo:
1. El usuario despliega/ejecuta el servidor MCP del agente (muchos son un `docker run` o `npm start`).
2. Se añade la URL en Settings → MCP servers (`X1MCPClient.addServer({name, url})`).
3. Ya está disponible como herramienta para cualquier acción que use `mcpCall`.

Candidatos encontrados que ya exponen MCP: OpenSEO, OpenOSINT, OpenContracts (ver notas por categoría).

## Nivel 2 — API REST autoalojada (self-hosted)

El agente es un proyecto (normalmente FastAPI/Node) que el usuario despliega él mismo (local, VPS, Docker) y expone una URL propia. X1 necesita:
1. Una función wrapper (`fetch()` con la URL + headers), igual patrón que Finnhub/Pipedrive/HubSpot ya construidos.
2. Un campo en Settings para la URL base y, si aplica, la clave.

Coste: ~30-60 líneas por agente, ya soy rápido haciendo esto (7 integraciones de este tipo esta sesión).

## Nivel 3 — API SaaS con clave

El agente vive en un servicio de terceros con API pública y (a veces) tier gratuito. Mismo patrón que Nivel 2, sin que el usuario tenga que desplegar nada — solo pedir una clave.

## Nivel 4 — Definición importada (prompt/config), NO código

Para proyectos que en realidad son solo una plantilla de prompt o un "skill" (muchos repos de "AI agent" son esto) — se importan como manifiesto JSON del motor de plugins de X1 (`background/plugins/engine.js`, ya soporta pasos search/synthesize/extract/write/notify/calculate/webhook) y se ejecutan con la propia cascada de IA de X1. Es 100% legal en MV3 (nada de código remoto) pero es el nivel *menos* "externo" — usar solo cuando no exista API/MCP real.

## Regla de prioridad

Para cada rol de agente (CFO, CMO, CLO...), buscar en este orden: ¿tiene MCP? → ¿tiene API propia autoalojable? → ¿tiene SaaS con API? → si no, ¿vale la pena importarlo como definición de plugin?

## Enlaces
[[00-Indice]] · [[02-Plan-de-Fases]]
