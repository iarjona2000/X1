---
tags: [agente, conector, "tema/conectores", "categoria/datos-y-analitica", "nivel-1"]
tier: mcp
dominio: conectores
subdominio: Datos y analítica
nivel_integracion: mcp
fuente: censo GitHub (≥10k estrellas), categoría "MCP y protocolos", googleapis/mcp-toolbox, 15.845⭐, Go
candidato_desde: 2026-07-06
---

# MCP Toolbox for Databases

**Categoría:** Datos y analítica

**Qué conecta:** servidor MCP genérico de Google para bases de datos — a diferencia de los conectores específicos ya catalogados (Snowflake, BigQuery, Supabase), este es un toolbox de propósito general que se adapta a cualquier motor de base de datos soportado, útil cuando no hace falta un conector dedicado por producto.

Repo: [googleapis/mcp-toolbox](https://github.com/googleapis/mcp-toolbox). Mismo protocolo que `X1MCPClient` ya implementa — añadirlo a X1 es `X1MCPClient.addServer({name: 'MCP Toolbox Databases', url: '<url del servidor MCP>'})`. No requiere código nuevo en X1, solo configuración.

## Enlaces
[[00-Conectores]]
