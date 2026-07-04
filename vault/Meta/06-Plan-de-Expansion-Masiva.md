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

**CTO — poblado en el Lote 3 (2026-07-06), 17 candidatos.** ✅ Frameworks de agentes (4), MCP/infraestructura (2), RAG/vectores (2), asistentes de código (1), visión/OCR (2), voz/audio (2), ciberseguridad (1), inferencia local/MLOps (2), scraping (1). ⬜ Testing, GIS, spatial computing, game dev — el censo GitHub de julio 2026 no dio candidatos con enfoque de IA/agente real en estas cuatro sub-especialidades (dominadas por librerías genéricas sin componente de IA), siguen siendo hueco real.

**CPO — sigue vacío tras el Lote 3.** El censo GitHub no sacó a la luz candidatos reales de gestión de producto/diseño con enfoque de IA (dominado por librerías de UI genéricas) — ⬜ Gestión de producto, diseño, sigue pendiente de una búsqueda dedicada.

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
4. **Lote 3 (hecho, 2026-07-06) — censo GitHub completo (5.354 repos, ≥10k estrellas, 35 categorías) → CTO desde cero + refuerzo de otras verticales**. Metodología: filtrado por relevancia real de IA/agente (la mayoría del censo es ruido no-IA — frontend genérico, lenguajes de programación, apps móviles, juegos, blockchain — descartado explícitamente por no cumplir el listón de la sección 1), deduplicado contra la bóveda existente, un ganador por nicho distinto cuando había varios candidatos comparables.
   - **CTO-Tecnico (+17, vertical antes vacía):** Frameworks de agentes (Browser-Use, LangGraph, CrewAI, LiteLLM) · MCP (MCP-Servers-Oficial, FastMCP) · RAG/vectores (Qdrant, AnythingLLM) · Código (Aider) · Visión/OCR (Zerox, Tesseract) · Voz (Whisper, Coqui-TTS) · Ciberseguridad (Shannon, elegido sobre pentagi/hexstrike-ai por mayor tracción y enfoque de caja blanca) · Inferencia local/MLOps (Ollama — ya integrado en X1, catalogado por completitud; vLLM) · Scraping (Scrapling).
   - **CEO-Estrategia (+2):** GPT-Researcher, Firecrawl — investigación general y scraping a escala, distintos del enfoque OSINT/seguridad ya cubierto.
   - **CFO-Finanzas (+2):** AI-Trader (trading 100% autónomo), FinRL (aprendizaje por refuerzo, técnica distinta a los agentes de lenguaje ya catalogados).
   - **COO-Operaciones (+3):** Kestra, Activepieces (automatización de procesos, alternativas a n8n), Huginn (monitorización continua encadenable).
   - **Conectores (+3):** Playwright-MCP, Chrome-DevTools-MCP, MCP-Toolbox-Databases — herramientas de protocolo/desarrollo genéricas, no conectores de producto SaaS ya cubiertos (se verificó explícitamente que GitHub-MCP.md y Figma.md ya cubrían los repos equivalentes del censo, para no duplicar).
   - **CMO/CLO/CHRO/CPO:** sin candidatos nuevos — el censo no sacó a la luz repos con enfoque de IA/agente real y tracción suficiente en estos dominios (hueco genuino, no una omisión; una búsqueda dedicada por tema seguirá siendo necesaria, no derivada de este censo generalista).
   - **Testing, GIS, spatial computing, game dev (dentro de CTO):** siguen como hueco — el censo no dio candidatos con componente de IA/agente real en estas cuatro sub-especialidades.
4.5. **Lote 3, segunda pasada (hecho, 2026-07-06) — verificación exhaustiva de "mismo producto, mejor repo"**, instrucción explícita de Ivan tras revisar el Lote 3: releer categorías no cubiertas en la primera pasada (Modelos LLM, ML/DL, Bases de datos, APIs/Backend, Frontend, Apps móviles, Redes, Lenguajes, Self-hosted, Multimedia, SO, Juegos, Blockchain, Educación, Otros) y comprobar que ningún candidato ya elegido tuviera una alternativa con más estrellas para el mismo nicho:
   - **Sustituciones (mismo nicho, repo con más estrellas encontrado):** `Scrapling` (67.992⭐) → [[../Agentes-CTO-Tecnico/Crawl4AI|Crawl4AI]] (70.868⭐, unclecode/crawl4ai) · `Tesseract` (75.089⭐) → [[../Agentes-CTO-Tecnico/PaddleOCR|PaddleOCR]] (84.643⭐, PaddlePaddle/PaddleOCR) · `CrewAI` (54.872⭐) → [[../Agentes-CTO-Tecnico/AutoGen|AutoGen]] (59.480⭐, microsoft/autogen).
   - **Candidatos nuevos encontrados (nichos distintos, no cubiertos en la primera pasada):** CRO-Ventas +1 ([[../Agentes-CRO-Ventas/Twenty|Twenty]], 52.143⭐, primer candidato real de esta vertical — CRM open-source AI-nativo) · CTO-Tecnico +2 ([[../Agentes-CTO-Tecnico/Chat2DB|Chat2DB]], 25.839⭐, datos conversacionales/texto-a-SQL; [[../Agentes-CTO-Tecnico/OmniParser|OmniParser]], 24.999⭐, automatización de GUI por visión, no solo navegador).
   - **CRO ya no es un hueco total** — Twenty es su primer candidato investigado, distinto de Pipedrive/HubSpot (ya integrados en X1, no investigados por la bóveda).
5. **Lote 4 — CPO desde cero + ciencia e investigación**: gestión de producto, diseño, bioinformática, química, medicina, clima. El censo GitHub del Lote 3 no cubrió este terreno — sigue pendiente de búsqueda dedicada.
6. **Lote 5 — creativo y transversal restante**: escritura, audio/vídeo, traducción, accesibilidad, cumplimiento normativo.
7. **Lotes posteriores — mantenimiento**: revisar candidatos ya elegidos cada cierto tiempo (el ecosistema cambia), y seguir añadiendo verticales o clústeres nuevos que vayan apareciendo.

Cada lote se documenta con su propio resumen (candidatos investigados, elegidos, descartados y por qué) siguiendo el mismo patrón que `05-Notas-de-Fusion.md` ya usa para dejar rastro de decisiones.

---

## Enlaces
[[00-Indice]] · [[01-Mecanismo-de-Integracion]] · [[02-Plan-de-Fases]] · [[04-Diseno-de-Red]]
