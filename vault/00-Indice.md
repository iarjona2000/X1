---
tags: [moc, indice]
---

# X1 — Vault de Agentes Externos

Vault de Obsidian (basta con abrir esta carpeta en Obsidian, no requiere configuración) para organizar la incorporación de **agentes de IA externos y públicos** a X1 — la evolución de la idea original de ABOS/CBOS, pero con agentes que viven fuera de X1 (GitHub, APIs, servidores MCP) en vez de personas simuladas por prompt dentro de la extensión.

**Reestructurado 2026-07-05** de clústeres por departamento a una jerarquía **CEO → orquestador especializado por vertical → agentes** (instrucción explícita de Ivan). Se retiraron las 217 personas de prompt de `agency-agents` (Nivel 4, sin software real detrás) y los 16 plugins de X1 que se construyeron a partir de ellas — la bóveda cataloga solo agentes/herramientas reales verificables en GitHub.

**Optimizado 2026-07-06** para máxima nitidez visual en el grafo de Obsidian: cada vertical lleva ahora el nombre CEO **y** el departamento/tema que trata (`Agentes-CFO-Finanzas`, no solo `Agentes-CFO`), los documentos meta se agruparon en `Meta/`, y se añadieron dos clústeres transversales nuevos sin CEO —`Sistema-Orquestacion/` y `Codigo-Seguridad/`— para que el programa entero de X1 (no solo el catálogo de agentes) se vea estructurado en un mismo cerebro.

## División de responsabilidades

- **Socio**: orquestación, razonamiento, Panel+Juez, FCC (`x1-bridge.js`, `x1-integration.js`, `core/judge.js`, `core/ensemble.js`, `ai-judge.js`/`ai-voting.js`/`ai-router.js`/`ai-pool.js`, `fcc-bridge.js` y todo `background/integrations/free-claude-code/`). **No tocar nada de esto, de ahora en adelante (instrucción explícita de Ivan, 2026-07-04).** `Sistema-Orquestacion/` (más abajo) documenta este territorio sin modificarlo — es catálogo, no implementación.
- **Ivan (yo)**: exclusivamente ampliar y optimizar este vault. Propuestas de orquestación (no implementación) para el socio en `X1/docs/PROPUESTAS_ORQUESTACION.md`.

## Documentos meta

- [[Meta/01-Mecanismo-de-Integracion|01 — Mecanismo de Integración]] — cómo se conecta X1 (extensión MV3) a un agente externo
- [[Meta/02-Plan-de-Fases|02 — Plan de Fases]] — qué se incorpora primero, qué después
- [[Meta/03-Directorios-MCP|03 — Directorios MCP]] — dónde buscar más agentes en el futuro
- [[Meta/04-Diseno-de-Red|04 — Diseño de Red]] — regla de aislamiento de clústeres
- [[Meta/05-Notas-de-Fusion|05 — Notas de Fusión]] — historial de merges con el socio
- [[Meta/06-Plan-de-Expansion-Masiva|06 — Plan de Expansión Masiva]] — plan de ampliación por temas, búsqueda en GitHub, listón de calidad

## Verticales (jerarquía CEO — orquestador especializado por vertical, sin departamentos sueltos)

- [[Agentes-CEO-Estrategia/00-CEO|CEO-Estrategia — Estrategia e Inteligencia]] — planificación estratégica + research/OSINT. Incluye la nota de frontera sobre el orquestador central (terreno del socio).
- [[Agentes-CFO-Finanzas/00-CFO|CFO-Finanzas]]
- [[Agentes-CMO-Marketing/00-CMO|CMO-Marketing — Marketing y SEO]]
- [[Agentes-CLO-Legal/00-CLO|CLO-Legal]]
- [[Agentes-CHRO-RRHH/00-CHRO|CHRO-RRHH]]
- [[Agentes-CRO-Ventas/00-CRO|CRO-Ventas — Ventas / CRM]] — ya integrado en X1 (Pipedrive/HubSpot)
- [[Agentes-COO-Operaciones/00-COO|COO-Operaciones]] — PMO, atención al cliente, cadena de suministro/procurement
- [[Agentes-CTO-Tecnico/00-CTO|CTO-Tecnico — Técnico / Ingeniería]] — poblado en el Lote 3 (2026-07-06) desde el censo GitHub: frameworks de agentes, MCP, RAG/vectores, código, visión/OCR, voz, ciberseguridad, inferencia local
- [[Agentes-CPO-Producto/00-CPO|CPO-Producto — Producto y Diseño]] — nuevo, vacío, pendiente de candidatos reales

## Transversal (sin CEO — cruza todas las verticales o documenta el programa entero)

- [[Agentes-Conectores/00-Conectores|Conectores (ecosistema MCP de Claude)]] — 59 conectores (Slack, Notion, GitHub, Stripe, Linear, Jira…), cualquier CEO puede usarlos
- [[Sistema-Orquestacion/00-Sistema-Orquestacion|Sistema de Orquestación]] — mapa de documentación (no implementación) del Juez/Voting/Router/Pool/Ensemble del socio y la cascada de proveedores de IA de X1. Sin CEO: no son agentes, es el orquestador mismo.
- [[Codigo-Seguridad/00-Codigo-Seguridad|Código y Seguridad]] — arquitectura de la extensión X1 (MV3, permisos, manifest) y su postura de seguridad. Sin CEO: no son agentes candidatos.

## Estado general

Fase 1 completa (un candidato real investigado por cada vertical original de ABOS). Fase 2 en curso: ampliación masiva por temas nuevos y candidatos alternativos, ver [[Meta/06-Plan-de-Expansion-Masiva]] para el plan por lotes — proceso abierto, sin punto final natural, en ejecución continua.
