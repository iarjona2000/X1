---
tags: [agente, "tema/cto", "nivel-1", candidato, candidato-lote-3]
dominio: cto
subdominio: MCP e infraestructura de herramientas
capacidades: [expone-herramientas, referencia-oficial]
nivel_integracion: mcp
candidato_desde: 2026-07-06
comparado_con: ["[[FastMCP]]"]
fuente: censo GitHub (≥10k estrellas), categoría "MCP y protocolos", modelcontextprotocol/servers, 88.036⭐, TypeScript
---

# MCP Servers (oficial)

**Repo:** [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) — 88.036⭐, TypeScript, mantenido por Anthropic/el propio proyecto MCP.

**Qué es:** la colección de referencia oficial de servidores MCP (filesystem, git, fetch, memoria, etc.) — la implementación canónica contra la que se comparan todos los demás servidores MCP del ecosistema, incluidos los 59 ya catalogados en el clúster transversal `Agentes-Conectores`.

**Por qué entra en CTO y no en Conectores:** Conectores cataloga *productos* concretos (Slack, Notion, Stripe...) conectables vía MCP; esta nota documenta el *protocolo mismo* — la fuente de la que salen los patrones que implementan esos conectores. Referencia técnica de infraestructura, no un conector a instalar por sí solo.

**Comparado con:** [[FastMCP]] — este repo es la referencia/implementaciones oficiales ya construidas; FastMCP es el framework para construir servidores MCP *nuevos* rápidamente. Se complementan, no compiten.

## Enlaces
[[00-CTO]]
