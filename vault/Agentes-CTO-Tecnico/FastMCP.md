---
tags: [agente, "tema/cto", "nivel-1", candidato, candidato-lote-3]
dominio: cto
subdominio: MCP e infraestructura de herramientas
capacidades: [construye-servidores-mcp, expone-herramientas]
nivel_integracion: mcp
candidato_desde: 2026-07-06
comparado_con: ["[[MCP-Servers-Oficial]]"]
fuente: censo GitHub (≥10k estrellas), categoría "MCP y protocolos", PrefectHQ/fastmcp, 25.964⭐, Python
---

# FastMCP

**Repo:** [PrefectHQ/fastmcp](https://github.com/PrefectHQ/fastmcp) — 25.964⭐, Python, mantenido por el equipo de Prefect.

**Qué es:** framework Python de alto nivel para construir servidores y clientes MCP rápidamente — decoradores simples sobre funciones Python para exponerlas como herramientas MCP, sin escribir el boilerplate del protocolo a mano.

**Por qué entra en CTO:** relevante si en algún momento X1 o el socio necesitan exponer una capacidad propia de X1 *como* servidor MCP (en vez de solo consumir servidores MCP de terceros vía `X1MCPClient`) — este sería el framework más directo para hacerlo, sin tocar la lógica de orquestación existente.

**Comparado con:** [[MCP-Servers-Oficial]] — ese repo son implementaciones ya hechas para consumir; FastMCP es la herramienta para construir una nueva desde cero.

## Enlaces
[[00-CTO]]
