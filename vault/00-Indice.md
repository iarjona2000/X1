---
tags: [moc, indice]
---

# X1 — Vault de Agentes Externos

Vault de Obsidian (basta con abrir esta carpeta en Obsidian, no requiere configuración) para organizar la incorporación de **agentes de IA externos y públicos** a X1 — la evolución de la idea original de ABOS/CBOS, pero con agentes que viven fuera de X1 (GitHub, APIs, servidores MCP) en vez de personas simuladas por prompt dentro de la extensión.

**Reestructurado 2026-07-05** de clústeres por departamento a una jerarquía **CEO → orquestador especializado por vertical → agentes** (instrucción explícita de Ivan). Se retiraron las 217 personas de prompt de `agency-agents` (Nivel 4, sin software real detrás) y los 16 plugins de X1 que se construyeron a partir de ellas — la bóveda cataloga solo agentes/herramientas reales verificables en GitHub.

## División de responsabilidades

- **Socio**: orquestación, razonamiento, Panel+Juez, FCC (`x1-bridge.js`, `x1-integration.js`, `core/judge.js`, `core/ensemble.js`, `ai-judge.js`/`ai-voting.js`/`ai-router.js`/`ai-pool.js`, `fcc-bridge.js` y todo `background/integrations/free-claude-code/`). **No tocar nada de esto, de ahora en adelante (instrucción explícita de Ivan, 2026-07-04).**
- **Ivan (yo)**: exclusivamente ampliar y optimizar este vault. Propuestas de orquestación (no implementación) para el socio en `X1/docs/PROPUESTAS_ORQUESTACION.md`.

## Mapa de contenidos

- [[01-Mecanismo-de-Integracion]] — cómo se conecta X1 (extensión MV3) a un agente externo
- [[02-Plan-de-Fases]] — qué se incorpora primero, qué después
- [[03-Directorios-MCP]] — dónde buscar más agentes en el futuro
- [[04-Diseno-de-Red]] — regla de aislamiento de clústeres (ahora por vertical CEO, no por departamento)
- [[06-Plan-de-Expansion-Masiva]] — plan de ampliación masiva por temas, búsqueda en GitHub, listón de calidad

## Verticales (jerarquía CEO — orquestador especializado por vertical, sin departamentos)

- [[Agentes-CEO/00-CEO|CEO — Estrategia e Inteligencia]] — planificación estratégica + research/OSINT. Incluye la nota de frontera sobre el orquestador central (terreno del socio).
- [[Agentes-CFO/00-CFO|CFO — Finanzas]]
- [[Agentes-CMO/00-CMO|CMO — Marketing y SEO]]
- [[Agentes-CLO/00-CLO|CLO — Legal]]
- [[Agentes-CHRO/00-CHRO|CHRO — RRHH]]
- [[Agentes-CRO/00-CRO|CRO — Ventas / CRM]] — ya integrado en X1 (Pipedrive/HubSpot)
- [[Agentes-COO/00-COO|COO — Operaciones]] — PMO, atención al cliente, cadena de suministro/procurement
- [[Agentes-CTO/00-CTO|CTO — Técnico / Ingeniería]] — nuevo, vacío, pendiente de candidatos reales (Lote 3)
- [[Agentes-CPO/00-CPO|CPO — Producto y Diseño]] — nuevo, vacío, pendiente de candidatos reales

## Transversal (no es una vertical/departamento, cruza todas las CEO)

- [[Agentes-Conectores/00-Conectores|Conectores (ecosistema MCP de Claude)]] — 59 conectores (Slack, Notion, GitHub, Stripe, Linear, Jira…), cualquier CEO puede usarlos

## Estado general

Fase 1 completa (un candidato real investigado por cada vertical original de ABOS). Fase 2 en curso: ampliación masiva por temas nuevos y candidatos alternativos, ver [[06-Plan-de-Expansion-Masiva]] para el plan por lotes — proceso abierto, sin punto final natural, en ejecución continua.
