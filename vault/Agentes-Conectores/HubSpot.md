---
tags: [agente, conector, "tema/conectores", "categoria/marketing-y-ventas", "nivel-1"]
tier: mcp
dominio: conectores
subdominio: Marketing y ventas
nivel_integracion: mcp
fuente: Claude Connectors Directory (Anthropic) — mismo protocolo MCP que X1MCPClient ya soporta
candidato_desde: 2026-07-05
---

# HubSpot

**Categoría:** Marketing y ventas

**Qué conecta:** ya integrado en X1 (CRM push) — este es el MCP oficial, más completo que el wrapper actual

Servidor MCP disponible en el directorio oficial de conectores de Claude (claude.com/connectors). Mismo protocolo que `X1MCPClient` ya implementa — añadirlo a X1 es `X1MCPClient.addServer({name: 'HubSpot', url: '<url del servidor MCP>'})` una vez el usuario tenga (o despliegue) ese servidor corriendo. No requiere código nuevo en X1, solo configuración.

## Enlaces
[[00-Conectores]]
