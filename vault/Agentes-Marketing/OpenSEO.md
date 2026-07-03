---
tags: [agente, marketing, candidato]
tier: mcp
rol_abos: CMO Agent / SEO Intelligence
estado: candidato-fase-1
---

# OpenSEO

**Qué hace:** Alternativa open-source a Semrush/Ahrefs. **Expone un servidor MCP** para que cualquier agente de IA (Claude Code, OpenClaw, Hermes, o X1) use los datos SEO directamente.

**Repositorio:** [github.com/every-app/open-seo](https://github.com/every-app/open-seo)
**Coste:** la app en sí es gratis, se autoaloja; solo pagas el uso de APIs de terceros que tú mismo conectes.

## Cómo se conectaría a X1
Nivel 1 (MCP) — el mejor caso posible: el usuario despliega OpenSEO una vez, añade la URL del servidor MCP en Settings de X1 (`X1MCPClient.addServer()`), y queda disponible para la acción `mcpCall` sin escribir ni una línea nueva en `service-worker.js`.

## Despliegue (lo ejecutas tú, verificado contra el README real 2026-07-04)
```bash
git clone https://github.com/every-app/open-seo.git
cd open-seo
cp .env.example .env
# Pon tu DATAFORSEO_API_KEY en .env
docker compose up -d
# Abre http://localhost:3001 (puerto por defecto)
```
Dentro de la app: botón "AI & Agents" en la cabecera → sigue las instrucciones para obtener la URL exacta del servidor MCP (el README no la fija, la genera la app).

## Enlaces
[[00-Marketing]] · [[01-Mecanismo-de-Integracion]]
