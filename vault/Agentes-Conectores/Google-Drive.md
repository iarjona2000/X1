---
tags: [agente, conector, "tema/conectores", "categoria/documentos-y-archivos", "nivel-1"]
tier: mcp
dominio: conectores
subdominio: Documentos y archivos
nivel_integracion: mcp
fuente: Claude Connectors Directory (Anthropic) — mismo protocolo MCP que X1MCPClient ya soporta
candidato_desde: 2026-07-05
---

# Google Drive

**Categoría:** Documentos y archivos

**Qué conecta:** MCP oficial — X1 ya tiene su propia integración inline, alternativa estándar

Servidor MCP disponible en el directorio oficial de conectores de Claude (claude.com/connectors). Mismo protocolo que `X1MCPClient` ya implementa — añadirlo a X1 es `X1MCPClient.addServer({name: 'Google Drive', url: '<url del servidor MCP>'})` una vez el usuario tenga (o despliegue) ese servidor corriendo. No requiere código nuevo en X1, solo configuración.

## Enlaces
[[00-Conectores]]
