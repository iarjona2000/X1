---
tags: [moc, indice]
---

# X1 — Vault de Agentes Externos

Vault de Obsidian (basta con abrir esta carpeta en Obsidian, no requiere configuración) para organizar la incorporación de **agentes de IA externos y públicos** a X1 — la evolución de la idea original de ABOS/CBOS, pero con agentes que viven fuera de X1 (GitHub, APIs, servidores MCP) en vez de personas simuladas por prompt dentro de la extensión.

## División de responsabilidades

- **Socio**: orquestación, razonamiento, Panel+Juez, FCC (`x1-bridge.js`, `x1-integration.js`, `core/judge.js`, `core/ensemble.js`, `ai-judge.js`/`ai-voting.js`/`ai-router.js`/`ai-pool.js`, `fcc-bridge.js` y todo `background/integrations/free-claude-code/`). **No tocar nada de esto, de ahora en adelante (instrucción explícita de Ivan, 2026-07-04).**
- **Ivan (yo)**: exclusivamente ampliar y optimizar este vault. Propuestas de orquestación (no implementación) para el socio en `X1/docs/PROPUESTAS_ORQUESTACION.md`.

## Mapa de contenidos

- [[01-Mecanismo-de-Integracion]] — cómo se conecta X1 (extensión MV3) a un agente externo
- [[02-Plan-de-Fases]] — qué se incorpora primero, qué después
- [[03-Directorios-MCP]] — dónde buscar más agentes en el futuro
- [[06-Plan-de-Expansion-Masiva]] — plan de ampliación masiva por temas, búsqueda en GitHub, listón de calidad

### Por categoría (agentes candidatos, con enlaces reales investigados)

- [[Agentes-Nucleo/00-Nucleo|Núcleo IA]] — orquestación (socio), research, atención al cliente
- [[Agentes-Finanzas/00-Finanzas|Finanzas (CFO)]]
- [[Agentes-Marketing/00-Marketing|Marketing y SEO (CMO)]]
- [[Agentes-Legal/00-Legal|Legal (CLO)]]
- [[Agentes-RRHH/00-RRHH|RRHH (CHRO)]]
- [[Agentes-Research/00-Research|Research / OSINT]]
- [[Agentes-Operaciones/00-Operaciones|Operaciones (COO / PMO)]]
- [[Agentes-Atencion-Cliente/00-Atencion|Atención al cliente]]
- [[Agentes-Ventas-CRM/00-Ventas|Ventas / CRM (CRO)]] — ya integrado en X1 (Pipedrive/HubSpot)
- [[Agentes-Estrategia/00-Estrategia|Estrategia]]
- [[Agentes-Conectores/00-Conectores|Conectores (ecosistema MCP de Claude)]] — 59 conectores, transversal a todos los roles

### Importación en bloque de `agency-agents` (nivel 4 — plantilla de prompt, ver [[01-Mecanismo-de-Integracion]])

217 personas (las 16 divisiones reales del catálogo, según `agency-agents/divisions.json` — excluye `strategy/`, `integrations/` y `examples/`, que no son agentes) de [github.com/msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) (clonado en `C:\Users\Ivan\agency-agents`), importadas 2026-07-04 vía `vault/scripts/import-agency-agents.js`. Las divisiones con equivalente temático directo (finance, marketing+paid-media, sales, support, project-management) se plegaron dentro de los clusters de arriba (sección "agency-agents" al final de cada hub); el resto forma clusters nuevos, propios:

- [[Agentes-Agency-Academic/00-Academic|Academic]]
- [[Agentes-Agency-Design/00-Design|Design]]
- [[Agentes-Agency-Engineering/00-Engineering|Engineering]]
- [[Agentes-Agency-GameDev/00-GameDev|Game Development]]
- [[Agentes-Agency-GIS/00-GIS|GIS]]
- [[Agentes-Agency-Product/00-Product|Product]]
- [[Agentes-Agency-Security/00-Security|Security]]
- [[Agentes-Agency-SpatialComputing/00-SpatialComputing|Spatial Computing]]
- [[Agentes-Agency-Specialized/00-Specialized|Specialized]]
- [[Agentes-Agency-Testing/00-Testing|Testing]]

## Estado general

Fase 1 en curso: un candidato investigado y documentado por cada rol de agente mencionado en los documentos ABOS originales (CEO, CFO, CMO, CRO, COO, CTO, CHRO, CLO, CPO, Research, Customer Service). Fases posteriores: ampliar cobertura, evaluar candidatos alternativos, decidir cuáles se integran de verdad en el código.

`agency-agents` es una capa aparte (nivel 4, prompt-only) y no forma parte de esa numeración de fases — sirve como cantera de personas listas para promover a plugins reales de X1 cuando encajen (ver [[02-Plan-de-Fases]]).
