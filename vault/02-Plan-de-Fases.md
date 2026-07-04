---
tags: [plan]
---

# Plan de fases

## Fase 0 — Este documento (hecho)
Investigación real (no inventada) de al menos un candidato por rol de agente mencionado en los documentos ABOS/CBOS originales. Vault de Obsidian montado. Mecanismo de integración definido.

**Nota 2026-07-05:** la bóveda se reestructuró de clústeres por "departamento" a una jerarquía CEO → orquestador especializado por vertical → agentes (ver [[06-Plan-de-Expansion-Masiva]]), y se retiraron las 217 personas de prompt de `agency-agents` (sin software real detrás) por instrucción explícita de Ivan. Las rutas de la tabla de abajo se actualizaron a las nuevas carpetas; el contenido/decisiones de Fase 1 no cambian.

## Fase 1 — Cobertura mínima de los roles originales
Para cada rol con un candidato claro y de bajo esfuerzo (Nivel 1 o 2), construir la integración real en X1, siguiendo el patrón ya usado esta sesión (función wrapper + campo Settings + comando de voz/acción):

| Rol ABOS | Candidato elegido | Nivel | Prioridad |
|---|---|---|---|
| Research Agent (bajo CEO) | [[Agentes-CEO/OpenOSINT\|OpenOSINT]] | 1 (MCP) | Alta — MCP ya soportado, coste ~0 |
| CMO / SEO | [[Agentes-CMO/OpenSEO\|OpenSEO]] | 1 (MCP) | Alta |
| CLO (Legal) | [[Agentes-CLO/OpenContracts\|OpenContracts]] | 1 (MCP) | Alta |
| CFO | [[Agentes-CFO/AI-CFO-Agent\|AI CFO Agent]] | 2 (self-hosted) | Media — **código ya escrito** en X1 (`cfoAgentAnalyze()`), sin probar en vivo |
| CHRO (RRHH) | [[Agentes-CHRO/Hiring-Agent-Interviewstreet\|Hiring Agent]] | 2/3 | Media |
| COO / Operaciones | [[Agentes-COO/Plexo\|Plexo]] | 2 | Media (cambiado de PMO-CrewAI 2026-07-04: ese repo está en "DRAFT stage", sin instalación documentada) |
| Customer Service (bajo COO) | [[Agentes-COO/Chatwoot\|Chatwoot]] | 2 (API propia) | Media — despliegue no es de una línea, ver nota del agente |
| CRO / Ventas | Pipedrive / HubSpot | 3 (SaaS) | **Ya hecho** (sesión previa) |
| Descubrimiento de más agentes | Registro oficial MCP | — | **Ya hecho** — `mcpRegistrySearch()` en X1, verificado contra la API real en vivo |

CEO Agent / orquestador: **no aplica** — es el socio quien decide esa pieza. **Importante (2026-07-04):** el socio está construyendo su propio sistema extenso de "AI Judge/Voting/Router/Pool" con ~21 bridges propios (continue, kilo, openwebui, llamaindex, piper, whisper, huggingface, langchain, webllm, etc.) — ver la nota de fusión en [[05-Notas-de-Fusion]] para el estado de esa colisión con el trabajo de esta noche.

## Fase 2 — Ampliar cobertura
Añadir alternativas por rol (los documentos de research listan 2-4 candidatos por categoría, no solo el elegido en Fase 1), y cubrir roles secundarios de los documentos ABOS que no son estrictamente "Agent" con nombre propio pero sí son función de IA externa incorporable (Money Opportunity Engine, Pricing Optimizer, Growth hacking engine, etc.)

## Fase 3 — Directorio propio
Una vez haya 10+ agentes integrados, construir una card de "Integration Store" en el Settings de X1 (Sección 4.3 del Master Prompt v3 ya lo pedía para MCP) para que activar/desactivar cada agente sea un toggle, no código.

## Enlaces
[[00-Indice]] · [[01-Mecanismo-de-Integracion]]
