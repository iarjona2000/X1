---
tags: [agente, conector, "tema/conectores", "categoria/nube-e-infraestructura", "nivel-1"]
tier: mcp
dominio: conectores
subdominio: Nube e infraestructura
nivel_integracion: mcp
fuente: Claude Connectors Directory (Anthropic) — mismo protocolo MCP que X1MCPClient ya soporta
candidato_desde: 2026-07-05
---

# Supabase

**Categoría:** Nube e infraestructura

**Qué conecta:** Postgres + auth + storage as a service

Servidor MCP disponible en el directorio oficial de conectores de Claude (claude.com/connectors). Mismo protocolo que `X1MCPClient` ya implementa — añadirlo a X1 es `X1MCPClient.addServer({name: 'Supabase', url: '<url del servidor MCP>'})` una vez el usuario tenga (o despliegue) ese servidor corriendo. No requiere código nuevo en X1, solo configuración.

## Enlaces
[[00-Conectores]]
