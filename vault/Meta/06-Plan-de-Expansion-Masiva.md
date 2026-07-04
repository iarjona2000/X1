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

**Actualización 2026-07-05 — cambio de política, no solo de estructura:** los 217 agentes de `agency-agents` (Nivel 4, prompts puros, sin software real detrás) y los 16 plugins de X1 construidos a partir de ellos **se retiraron por completo**, instrucción explícita de Ivan — la bóveda cataloga exclusivamente agentes/herramientas reales verificables en GitHub, nunca personas de prompt como relleno o alternativa secundaria. Cualquier hueco que antes se consideraba "cubierto (parcial) vía agency-agents" vuelve a ser un hueco real hasta que se encuentre un candidato de verdad.

También se reestructuró la bóveda entera de clústeres por departamento a una jerarquía **CEO → orquestador especializado por vertical → agentes** (sin "departamentos" sueltos) — ver `00-Indice.md` para el mapa actual de verticales (CEO/CFO/CMO/CLO/CHRO/CRO/COO/CTO/CPO + Conectores transversal).

---

## 2. Universo de temas (taxonomía objetivo, por vertical CEO)

Cobertura amplia deliberada, no solo lo que ya está. Marco qué vertical tiene candidatos reales (✅) vs. hueco real hoy (⬜) — "✅" ya no significa "cubierto por agency-agents", significa que hay al menos un agente real investigado:

**CFO** — ✅ Finanzas/Contabilidad (4 candidatos) · ⬜ Banca/Fintech, Seguros

**CMO** — ✅ Marketing/SEO (3 candidatos) · ⬜ resto de marketing (contenido, publicidad, redes) sin candidato real todavía

**CLO** — ✅ Legal (3 candidatos) · ⬜ propiedad intelectual, inmigración/visados como sub-especialidad propia

**CHRO** — ✅ RRHH (4 candidatos)

**CRO** — ✅ Ventas/CRM (ya integrado en X1, Pipedrive/HubSpot)

**COO** — ✅ PMO/Operaciones (2), Atención al cliente (2), Cadena de suministro (1, nuevo) · ⬜ Retail/E-commerce específico, Bienes raíces, Manufactura, Construcción/ingeniería civil

**CEO** — ✅ Estrategia (3), Research/OSINT (4)

**CTO — vacío, hueco total tras retirar agency-agents.** Antes "cubierto (parcial)" por 6 clústeres de personas de prompt (Engineering/Security/Testing/GIS/SpatialComputing/GameDev) — ninguno era un agente real. ⬜ Ingeniería de software, seguridad (por sub-especialidad: forense, red team, threat intel), testing, GIS, MLOps/datos, DevOps/SRE, spatial computing, game dev — todo pendiente de candidatos reales.

**CPO — vacío, hueco total.** Antes "cubierto (parcial)" por 2 clústeres de agency-agents (Product/Design) — ninguno real. ⬜ Gestión de producto, diseño.

**Sin vertical CEO clara (evaluar si necesitan una nueva o encajan en una existente)**
- ⬜ Ciencia e investigación: bioinformática, química, medicina/salud, ciencia climática — candidatas a vivir bajo CEO (informan estrategia) o como vertical propia si crecen mucho.
- ⬜ Creativo no cubierto: escritura/edición, audio/vídeo, música — candidatas a CMO o vertical propia.
- ⬜ Transversal: traducción/localización, accesibilidad, cumplimiento normativo/privacidad de datos — como Conectores, podrían vivir fuera de la jerarquía CEO si de verdad cruzan todas las verticales.

Cada hueco es candidato a poblar una vertical existente o, si de verdad no encaja en ninguna CEO, a justificar una nueva — respetando la regla de aislamiento (`04-Diseno-de-Red.md`) y la instrucción de "nada de departamentos sueltos".

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

1. **Lote 1 (hecho, 2026-07-04) — rellenar huecos flacos**: CLO (+1, Legal-MCP), CHRO (+1, Horilla), CEO/Research (+2, SpiderFoot + OSINT-Agent-Skills).
2. **Lote 2 (en curso) — verticales de negocio no cubiertas**: Cadena de suministro (hecho, NocoBase, ahora vive bajo COO), CFO/datos de mercado (hecho, OpenBB) — pendiente: banca/fintech, seguros, bienes raíces, retail/e-commerce (todos bajo COO o vertical propia si crecen).
3. **Lote 2.5 (hecho, 2026-07-05) — Conectores**: 59 conectores MCP del directorio oficial de Claude, clúster transversal nuevo.
4. **Lote 3 — CTO desde cero**: MLOps/datos, DevOps/SRE, ciberseguridad por sub-especialidad, testing, GIS, spatial computing, game dev — todo el territorio que antes "cubría" agency-agents sin agentes reales, ahora hueco total.
5. **Lote 4 — CPO desde cero + ciencia e investigación**: gestión de producto, diseño, bioinformática, química, medicina, clima.
6. **Lote 5 — creativo y transversal restante**: escritura, audio/vídeo, traducción, accesibilidad, cumplimiento normativo.
7. **Lotes posteriores — mantenimiento**: revisar candidatos ya elegidos cada cierto tiempo (el ecosistema cambia), y seguir añadiendo verticales o clústeres nuevos que vayan apareciendo.

Cada lote se documenta con su propio resumen (candidatos investigados, elegidos, descartados y por qué) siguiendo el mismo patrón que `05-Notas-de-Fusion.md` ya usa para dejar rastro de decisiones.

---

## Enlaces
[[00-Indice]] · [[01-Mecanismo-de-Integracion]] · [[02-Plan-de-Fases]] · [[04-Diseno-de-Red]]
