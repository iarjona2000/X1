---
tags: [agente, legal, candidato-lote-1, "tema/legal", "nivel-1"]
tier: mcp
dominio: legal
subdominio: gestión de casos, investigación jurídica
capacidades: [consulta-bases-de-datos-legales, gestion-de-casos, investigacion-juridica]
nivel_integracion: mcp
rol_abos: CLO Agent
estado: candidato-lote-1
candidato_desde: 2026-07-04
comparado_con: ["[[OpenContracts]]"]
---

# Legal MCP

**Qué hace:** servidor MCP (Model Context Protocol) diseñado específicamente para profesionales y despachos legales — conecta asistentes de IA con bases de datos legales, sistemas de gestión de casos, y herramientas de investigación jurídica.

**Repositorio:** [github.com/agentic-ops/legal-mcp](https://github.com/agentic-ops/legal-mcp)

**Nivel de integración:** 1 (MCP directo) — coste de incorporación prácticamente cero vía `X1MCPClient.addServer()`, igual que OpenContracts.

**Por qué se añade junto a OpenContracts, no en su lugar:** OpenContracts está centrado en inteligencia documental (analizar/extraer de contratos ya existentes). Legal MCP está más orientado a flujo de trabajo de despacho (gestión de casos, investigación) — cubren huecos distintos del mismo rol CLO, no compiten directamente. Repositorio más joven (buscando colaboración con profesionales legales para casos de estudio según su propia descripción) — vigilar madurez antes de recomendarlo como elegido principal.

## Enlaces
[[00-CLO]]
