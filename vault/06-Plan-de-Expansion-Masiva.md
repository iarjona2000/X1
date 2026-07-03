---
tags: [meta, plan, expansion]
---

# Plan de expansión masiva de la bóveda

**Instrucción de Ivan (2026-07-04):** ampliar y optimizar la bóveda de agentes es ahora nuestro único terreno — la orquestación es responsabilidad exclusiva del socio (ver `X1/docs/PROPUESTAS_ORQUESTACION.md`, propuestas, no decisiones). El objetivo: para cada tema que la bóveda pueda plausiblemente cubrir, tener catalogado el mejor candidato real posible — comparando siempre entre varios, buscando en repositorios públicos de GitHub, con el listón puesto en "conocimiento igual o mayor que Claude *en ese dominio concreto*" (un especialista real y profundo, no otro envoltorio genérico de prompt).

Esto es un proceso **abierto, no una tarea con final** — el objetivo declarado es "ampliar la bóveda lo máximo posible", y el ecosistema de repos públicos cambia cada semana. Este documento es el plan de cómo lo abordamos por fases, no una lista cerrada de qué se hace una vez y se cierra.

---

## 1. El listón: qué cuenta como "mejor candidato"

No cualquier repo de GitHub — la barra es específicamente **especialización que un modelo generalista no tiene**:

- Un modelo o herramienta *entrenado/afinado* en el dominio (no solo un prompt de sistema envolviendo un LLM genérico).
- Acceso a datos/bases de conocimiento reales del dominio (jurisprudencia, bases de compuestos químicos, catálogos de CVEs, genomas, normativa fiscal por país…).
- Ejecuta acciones reales, no solo conversa (una herramienta de análisis de contratos que de verdad extrae cláusulas, no solo "actúa como abogado").
- Comunidad/mantenimiento real — señales: estrellas, actividad reciente, issues respondidos, no un repo abandonado de una tarde de hackathon.

Los 217 agentes ya importados de `agency-agents` (Nivel 4, prompts puros) son precisamente lo que este listón busca **sustituir** cuando exista algo mejor — no se borran, pero cuando encontremos un candidato de Nivel 1-3 real y superior para el mismo hueco, ese pasa a ser el elegido y el de `agency-agents` queda como alternativa secundaria en la misma nota de clúster, igual que ya se hizo con Finanzas/Legal/Marketing en la Fase 1 original (ver `02-Plan-de-Fases.md`).

---

## 2. Universo de temas (taxonomía objetivo)

Cobertura amplia deliberada, no solo lo que ya está. Marco lo que ya tiene cluster (✅) vs. lo que es hueco real hoy:

**Negocio**
- ✅ Finanzas/Contabilidad, Legal, RRHH, Marketing, Ventas/CRM, Operaciones/PM, Estrategia, Atención al cliente
- ⬜ Cadena de suministro/procurement, Seguros, Banca/Fintech, Bienes raíces, Retail/E-commerce específico

**Técnico**
- ✅ Ingeniería de software (general), Seguridad, Testing, GIS, Spatial computing, Game dev
- ⬜ Datos/ML/MLOps como especialidad propia (más allá del "AI Engineer" genérico ya importado), DevOps/SRE como cluster propio, Ciberseguridad por sub-especialidad (forense, red team, threat intel — ya hay algunas personas pero sin candidatos externos reales investigados)

**Ciencia e investigación**
- ⬜ Biología/bioinformática, Química, Medicina/salud, Ciencia climática/ambiental, Herramientas de investigación académica (más allá de OpenOSINT)

**Creativo**
- ✅ Diseño (parcial, vía agency-agents)
- ⬜ Escritura/edición como vertical propia, Producción de audio/vídeo, Música

**Vertical/industria**
- ⬜ Construcción/ingeniería civil, Manufactura, Educación, Inmigración/visados, Propiedad intelectual, Cumplimiento normativo/regulatorio, Privacidad de datos

**Transversal**
- ⬜ Traducción/localización, Accesibilidad

Cada hueco (⬜) es candidato a convertirse en un **clúster nuevo**, respetando la regla de aislamiento (`04-Diseno-de-Red.md`) — nunca se mezclan.

---

## 3. Metodología de búsqueda por tema

1. **Empezar por listas "awesome-\*"** — alguien ya hizo la comparación inicial. Buscar `awesome-<tema>` en GitHub (ej. `awesome-legal-tech`, `awesome-bioinformatics`, `awesome-mlops`) y usarlas como cantera, no como resultado final.
2. **Búsqueda directa** por tema + intención (`<tema> AI agent github`, `<tema> open source tool self-hosted`, `<tema> MCP server`) — priorizando explícitamente resultados con servidor MCP (Nivel 1 de `01-Mecanismo-de-Integracion.md`, coste de integración ~cero).
3. **Comparar 2-4 candidatos reales por hueco**, igual que se hizo en la Fase 1 original — no quedarse con el primero. Anotar por qué se descartaron los demás, igual que `FinRobot.md`/`AI-CFO-Agent.md` ya documentan.
4. **Verificar que el repo está vivo** — commits recientes, no un README huérfano de 2021.
5. **Clasificar nivel de integración** (1-4) desde el primer momento, no a posteriori.

## 4. Formato de nota (nuevo: metadata estructurada)

A partir de ahora, cada nota de agente añade una cabecera de metadata más rica que la usada en la importación masiva de `agency-agents`, para dejar el terreno preparado para la Propuesta 4 de orquestación (filtro por etiquetas) sin necesidad de rehacer nada si el socio la elige:

```yaml
---
tags: [agente, "tema/<dominio>", "nivel-<1-4>"]
dominio: <dominio principal>
subdominio: <opcional, más específico>
capacidades: [<verbos: analiza, redacta, extrae, monitoriza...>]
nivel_integracion: <mcp | api-selfhosted | saas | prompt>
candidato_desde: <fecha>
comparado_con: ["[[Otro-Candidato-1]]", "[[Otro-Candidato-2]]"]
---
```

Esto no es orquestación — es metadata de catálogo, terreno nuestro. Si el socio activa cualquiera de las 5 propuestas del otro documento, esta metadata ya está lista.

## 5. Orden de ejecución (por lotes, iterativo)

1. **Lote 1 — rellenar huecos en clústeres ya existentes pero flacos** (Legal: 2 notas, RRHH: 3, Research: 2, Núcleo: 0 candidatos externos reales) — más rápido, más impacto inmediato.
2. **Lote 2 — verticales de negocio no cubiertas** (cadena de suministro, banca/fintech, seguros, bienes raíces).
3. **Lote 3 — técnico especializado** (MLOps/datos, DevOps/SRE, ciberseguridad por sub-especialidad).
4. **Lote 4 — ciencia e investigación** (bioinformática, química, medicina, clima).
5. **Lote 5 — creativo y transversal** (escritura, audio/vídeo, traducción, accesibilidad, cumplimiento).
6. **Lotes posteriores — mantenimiento**: revisar candidatos ya elegidos cada cierto tiempo (el ecosistema cambia), y seguir añadiendo verticales que vayan apareciendo.

Cada lote se documenta con su propio resumen (candidatos investigados, elegidos, descartados y por qué) siguiendo el mismo patrón que `05-Notas-de-Fusion.md` ya usa para dejar rastro de decisiones.

---

## Enlaces
[[00-Indice]] · [[01-Mecanismo-de-Integracion]] · [[02-Plan-de-Fases]] · [[04-Diseno-de-Red]]
