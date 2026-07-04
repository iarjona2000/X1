---
tags: [agente, conector, "tema/conectores", "categoria/herramientas-de-desarrollo", "nivel-1"]
tier: mcp
dominio: conectores
subdominio: Herramientas de desarrollo
nivel_integracion: mcp
fuente: censo GitHub (≥10k estrellas), categoría "MCP y protocolos", microsoft/playwright-mcp, 34.672⭐, TypeScript
candidato_desde: 2026-07-06
---

# Playwright MCP

**Categoría:** Herramientas de desarrollo

**Qué conecta:** automatización de navegador de propósito general (navegar, hacer clic, rellenar formularios, extraer contenido) vía el motor Playwright de Microsoft, expuesto como servidor MCP oficial.

Repo: [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp). Mismo protocolo que `X1MCPClient` ya implementa — añadirlo a X1 es `X1MCPClient.addServer({name: 'Playwright MCP', url: '<url del servidor MCP>'})`. No requiere código nuevo en X1, solo configuración.

## Enlaces
[[00-Conectores]]
