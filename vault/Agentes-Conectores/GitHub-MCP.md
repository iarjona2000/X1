---
tags: [agente, conector, "tema/conectores", "categoria/herramientas-de-desarrollo", "nivel-1"]
tier: mcp
dominio: conectores
subdominio: Herramientas de desarrollo
nivel_integracion: mcp
fuente: Claude Connectors Directory (Anthropic) — mismo protocolo MCP que X1MCPClient ya soporta
candidato_desde: 2026-07-05
---

# GitHub MCP

**Categoría:** Herramientas de desarrollo

**Qué conecta:** oficial — issues, PRs, código — el más natural de todos dado que ya clonamos repos de GitHub a mano

Servidor MCP disponible en el directorio oficial de conectores de Claude (claude.com/connectors). Mismo protocolo que `X1MCPClient` ya implementa — añadirlo a X1 es `X1MCPClient.addServer({name: 'GitHub MCP', url: '<url del servidor MCP>'})` una vez el usuario tenga (o despliegue) ese servidor corriendo. No requiere código nuevo en X1, solo configuración.

## Enlaces
[[00-Conectores]]
