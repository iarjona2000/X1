---
tags: [mcp, directorio]
---

# Directorios donde buscar más agentes (fases futuras)

- **[MCP Registry oficial](https://registry.modelcontextprotocol.io/)** — registro oficial de Anthropic. +9.650 servidores verificados (mayo 2026). Punto de partida por defecto.
- **[Awesome MCP Servers](https://mcpservers.org/)** — directorio comunitario, navegable por categoría.
- **[MCP Market](https://mcpmarket.com/)** — otro directorio comunitario.
- **[AI Agents List — MCP Servers](https://aiagentslist.com/mcp-servers)** — 593+ servidores MCP filtrables por lenguaje/categoría.
- **[GitHub topic mcp-server](https://github.com/topics/mcp-server)** — ~16.000 repos con este tag (mayo 2026).
- **[awesome-ai-agents-2026 (ARUNAGIRINATHAN-K)](https://github.com/ARUNAGIRINATHAN-K/awesome-ai-agents-2026)** — 300+ agentes/frameworks catalogados, no todos MCP pero buena cantera para Fase 2.
- **[500-AI-Agents-Projects (ashishpatel26)](https://github.com/ashishpatel26/500-AI-Agents-Projects)** — colección por industria (salud, finanzas, educación, retail...).

## Descubrimiento programático (para X1, no manual)

El registro oficial expone una **API REST pública** que cualquier programa puede consultar en tiempo de ejecución para buscar servidores por nombre/categoría — no hace falta navegarlo a mano. Esto es exactamente lo que le añadí a X1 esta noche: una función que consulta `registry.modelcontextprotocol.io` por búsqueda de texto y lista resultados, sin ejecutar nada, solo lectura HTTP. Ver [[../background/mcp/registry-search|nota de integración]] en la sección de código.

## Categorías sin candidato claro (honestidad, no forzar un encaje malo)

- **Pricing Optimizer** (ABOS): la investigación solo encontró herramientas de control de coste de *llamadas a LLM* (LiteLLM, Langfuse) — un concepto totalmente distinto a "optimizar el precio de venta de tu producto". No hay un agente open-source real para esto todavía.
- **Board Reporting Agent** (ABOS): la búsqueda solo encontró herramientas de "gobernanza de agentes de IA" (seguridad/políticas de ejecución), que es un significado distinto de "gobernanza corporativa" al que se refería el documento original (preparar informes para el consejo). Sin candidato real encontrado.

## Enlaces
[[00-Indice]] · [[01-Mecanismo-de-Integracion]]
