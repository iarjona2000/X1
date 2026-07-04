---
tags: [agente, conector, "tema/conectores", "categoria/herramientas-de-desarrollo", "nivel-1"]
tier: mcp
dominio: conectores
subdominio: Herramientas de desarrollo
nivel_integracion: mcp
fuente: censo GitHub (≥10k estrellas), categoría "MCP y protocolos", ChromeDevTools/chrome-devtools-mcp, 45.576⭐, TypeScript
candidato_desde: 2026-07-06
---

# Chrome DevTools MCP

**Categoría:** Herramientas de desarrollo

**Qué conecta:** DevTools de Chrome (consola, red, rendimiento, inspección DOM) expuesto como servidor MCP oficial — para depuración e introspección de páginas, distinto de la automatización general que ofrece Playwright MCP.

Repo: [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp). Mismo protocolo que `X1MCPClient` ya implementa — añadirlo a X1 es `X1MCPClient.addServer({name: 'Chrome DevTools MCP', url: '<url del servidor MCP>'})`. No requiere código nuevo en X1, solo configuración.

## Enlaces
[[00-Conectores]]
