---
tags: [agente, conector, "tema/conectores", "categoria/gestin-de-proyectos", "nivel-1"]
tier: mcp
dominio: conectores
subdominio: Gestión de proyectos
nivel_integracion: mcp
fuente: Claude Connectors Directory (Anthropic) — mismo protocolo MCP que X1MCPClient ya soporta
candidato_desde: 2026-07-05
---

# Linear

**Categoría:** Gestión de proyectos

**Qué conecta:** seguimiento de issues moderno, muy usado en equipos de producto/ingeniería

Servidor MCP disponible en el directorio oficial de conectores de Claude (claude.com/connectors). Mismo protocolo que `X1MCPClient` ya implementa — añadirlo a X1 es `X1MCPClient.addServer({name: 'Linear', url: '<url del servidor MCP>'})` una vez el usuario tenga (o despliegue) ese servidor corriendo. No requiere código nuevo en X1, solo configuración.

## Enlaces
[[00-Conectores]]
