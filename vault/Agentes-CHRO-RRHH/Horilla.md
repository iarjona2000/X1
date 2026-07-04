---
tags: [agente, rrhh, candidato-lote-1, "tema/rrhh", "nivel-2"]
tier: rest-api-self-hosted
dominio: recursos humanos
subdominio: HRMS completo, reclutamiento
capacidades: [gestion-de-nomina, seguimiento-de-candidatos, publicacion-de-empleos, entrevistas]
nivel_integracion: api-selfhosted
rol_abos: CHRO Agent
estado: candidato-lote-1
candidato_desde: 2026-07-04
comparado_con: ["[[EazyRecruit]]", "[[Hiring-Agent-Interviewstreet]]"]
---

# Horilla

**Qué hace:** HRMS (Human Resource Management System) open-source completo, no solo un agente de reclutamiento — cubre nómina, gestión de empleados, y un módulo de reclutamiento con publicación de ofertas, seguimiento de candidatos (ATS), pipelines personalizables, y programación de entrevistas.

**Organización:** Cybrosys, comunidad activa.
**Repositorio:** [github.com/horilla-opensource/horilla](https://github.com/horilla-opensource/horilla) (Django + PostgreSQL, licencia compatible con MIT)
**Web:** [horilla.com](https://www.horilla.com/)

**Por qué es distinto a lo ya elegido:** `Hiring-Agent-Interviewstreet` y `EazyRecruit` son herramientas centradas SOLO en reclutamiento/ATS. Horilla es un HRMS completo — más pesado de desplegar, pero cubre todo el ciclo de vida del empleado, no solo la contratación. Útil si el objetivo evoluciona de "agente de contratación" a "agente de RRHH" más amplio, tal y como el propio documento ABOS menciona "CHRO Agent" (más que solo "Hiring Agent").

**Nivel de integración:** 2 (self-hosted, Django) — el usuario despliega su propia instancia, X1 llama a su API REST una vez esté corriendo, mismo patrón que `cfoAgentAnalyze()`.

## Enlaces
[[00-CHRO]]
