# Propuestas de orquestación inteligente para la bóveda de agentes

**Para:** el socio — la orquestación es tu terreno, esto es un menú de opciones, no una decisión tomada ni una implementación. Nada de este documento se ha escrito en código; no se ha tocado `ai-judge.js`, `ai-voting.js`, `ai-router.js`, `ai-pool.js`, `x1-integration.js`, `x1-bridge.js`, ni ninguna pieza de `x1-core/core/orchestrator.js` / `ensemble.js` / `collaborative.js` / `judge.js`, ni el nuevo FCC. Es explícitamente tu llamada qué hacer con esto, si es que quieres hacer algo.

**Por qué existe este documento:** Ivan e Iván (yo) nos encargamos de ampliar la bóveda de Obsidian (`vault/`) con cientos, y camino a miles, de agentes/personas por tema. Ese catálogo no sirve de nada si no hay una forma de **elegir cuáles usar para un prompt concreto, coordinarlos entre sí, y conectarlos** con lo que ya sabe hacer X1. Ese "elegir + coordinar + conectar" es justo lo que ya intentaste resolver cinco veces distintas para elegir entre 6-8 modelos de lenguaje (rúbricas, `X1Judge`, `X1Voting`, `X1Router`, `EnsembleEngine`+`JudgeSystem`) — pero **elegir entre 6 modelos de lenguaje parecidos y elegir entre potencialmente miles de personas especializadas por tema son problemas de escala y naturaleza distintos.** Este documento son cinco propuestas para ese segundo problema, pensadas para poder reutilizar lo que ya construiste en vez de partir de cero.

---

## El problema, en concreto

Dado un prompt de usuario:
1. **Elegir** — de entre N agentes de la bóveda (hoy 233+, la vault en crecimiento activo), ¿cuáles son relevantes?
2. **Coordinar** — si hacen falta varios (ej. "analiza este contrato y dime el impacto fiscal" → Legal + Finanzas), ¿en qué orden, con qué contexto compartido?
3. **Conectar** — cada agente de la bóveda tiene un nivel de integración distinto (MCP real, API self-hosted, SaaS, o solo prompt/plugin — ver `vault/01-Mecanismo-de-Integracion.md`). Elegir el agente no basta, hay que saber invocarlo.

A escala de miles de candidatos, mandarle la lista entera a un LLM en cada prompt no es viable (coste, latencia, ruido). Todas las propuestas de abajo giran en torno a cómo **reducir la lista rápido y barato antes de decidir con más cuidado**.

---

## Propuesta 1 — Router semántico por embeddings

**Idea:** usar `MemoryManager`/`EmbeddingService` (`x1-core/core/memory/`) — ya real, ya con `LocalVectorStore` y fallback determinista sin clave de API (confirmado en la auditoría, no es un mockup) — para indexar cada nota de agente de la bóveda (nombre + descripción + vibe) como un vector, una sola vez. En cada prompt: embeber el prompt, buscar los K más similares por coseno.

- **A favor:** es la propuesta que menos código nuevo necesita — `MemoryManager` ya existe, ya funciona, y ya es tuyo (lo construiste tú). Escala bien a miles de agentes sin coste por prompt más allá de un embedding.
- **En contra:** similitud semántica pura falla con prompts ambiguos o que tocan varios temas a la vez ("ayúdame con la campaña y el presupuesto" puede rankear mal). No resuelve coordinación por sí sola.

## Propuesta 2 — Clasificador de clúster + match dentro del clúster

**Idea:** la bóveda ya está organizada en clústeres temáticos aislados por diseño explícito (`vault/04-Diseno-de-Red.md` — "no juntes programación con marketing"). Un clasificador barato (podría ser tu propio `Router.detectSector()` de `x1-core/core/router.js`, hoy solo usado para elegir modelo, reutilizable aquí) decide primero EL CLÚSTER, y solo dentro de ese clúster se hace match fino (por trigger/keyword, como ya hace `X1PluginEngine.matchPlugin`, o un segundo embedding más barato porque el universo ya es pequeño).

- **A favor:** respeta y aprovecha una decisión de diseño que Ivan ya tomó a propósito para la bóveda. Dos pasos baratos, sin necesitar un índice vectorial grande desde el primer día.
- **En contra:** si el clasificador de clúster falla, todo lo de después falla con él. Prompts que cruzan clústeres (Finanzas+Legal) necesitan un caso especial.

## Propuesta 3 — Panel + Juez aplicado a elegir agente, no modelo

**Idea:** reutilizar tal cual el sistema de rúbricas (`RUBRICS`, `judgeRound`, activación selectiva, límite diario) y/o `EnsembleEngine`+`JudgeSystem` — pero para una tarea distinta a la que se diseñaron: en vez de "¿cuál de 6 modelos responde mejor?", "¿cuál de estos 3-5 agentes candidatos (ya reducidos por la Propuesta 1 o 2) encaja mejor con este prompt?". Las rúbricas ya están pensadas por "tipo de tarea técnica", que encaja mejor con "qué especialista necesito" que con "qué modelo genérico responde mejor".

- **A favor:** es la única propuesta que le da un trabajo genuinamente nuevo y bien encajado a infraestructura que ya construiste y que hoy no corre en producción — no haría falta escribir un sistema de juicio nuevo, solo cambiarle qué compara.
- **En contra:** sigue sin resolver el "reducir de miles a unos pocos" — necesita ir montada encima de la Propuesta 1 o 2 como pre-filtro, no sustituye a ninguna.

## Propuesta 4 — Filtro por metadatos/etiquetas, sin ML

**Idea:** cada nota de agente de la bóveda lleva etiquetas estructuradas (dominio, subdominio, verbos de capacidad, nivel de integración — parecido a como `X1PluginEngine` ya usa `trigger[]`). Un filtro determinista por coincidencia de etiqueta reduce la lista antes de cualquier llamada a IA o embedding.

- **A favor:** el más barato y rápido de los cinco, el más fácil de depurar (se puede ver exactamente por qué se eligió un agente). Nada de esto compite con tu terreno — es metadata de la bóveda, que es responsabilidad nuestra mantener.
- **En contra:** requiere disciplina de etiquetado constante a medida que la bóveda crece (mi script de importación tendría que generarlas). No generaliza bien a prompts que no encajan con ninguna etiqueta prevista.

## Propuesta 5 — Pipeline híbrido (las cuatro anteriores combinadas)

**Idea, como arquitectura objetivo a la que llegar por partes, no como algo a construir de golpe:**
1. Filtro por etiquetas (Propuesta 4) para el caso común — instantáneo.
2. Si nada encaja con confianza, fallback a búsqueda semántica (Propuesta 1).
3. Para prompts genuinamente ambiguos o multi-tema, escalar a Panel+Juez (Propuesta 3) entre los mejores candidatos de los pasos 1-2.
4. Para coordinar varios agentes elegidos, usar `CollaborativeEngine.runAdHoc()` o `TaskGraph` (`x1-core`) — ya construidos, ya pensados exactamente para esto (equipos de agentes con nombre, grafo de estado con aristas condicionales), simplemente sin nadie llamándolos hoy.

| Propuesta | Coste por prompt | Escala a miles | Reutiliza código tuyo ya construido | Resuelve coordinación |
|---|---|---|---|---|
| 1. Embeddings | Bajo (1 embedding) | Sí | Sí (`MemoryManager`) | No |
| 2. Clúster + match | Muy bajo | Sí | Parcial (`Router.detectSector`) | No |
| 3. Panel+Juez | Alto (varias llamadas LLM) | No por sí sola | Sí, mucho (5 sistemas dormidos) | Parcial (elige, no secuencia) |
| 4. Etiquetas | Casi cero | Sí | No (nuevo, pero simple) | No |
| 5. Híbrido | Variable, el mínimo necesario por caso | Sí | Sí, el más completo | Sí (vía `TaskGraph`) |

---

## Sobre "conectar"

Independientemente de cuál(es) propuesta(s) elijas para "elegir", conectar con el agente elegido depende de su nivel de integración (ya documentado en `vault/01-Mecanismo-de-Integracion.md`, doctrina existente, no nueva):
- **Nivel 1 (MCP):** `X1MCPClient.callTool()` — ya real.
- **Nivel 2/3 (API propia/SaaS):** función wrapper dedicada, patrón ya usado (Finnhub, Pipedrive, etc.).
- **Nivel 4 (prompt/plugin):** `X1PluginEngine.executePlugin()` o `X1AgentManager.callAgent()` — ya real.

Para que cualquiera de las cinco propuestas pueda de verdad "conectar" y no solo "elegir", cada nota de la bóveda necesitaría declarar cuál de estos cuatro caminos usar — es metadata, no orquestación, así que es algo que nosotros podemos empezar a añadir en la bóveda sin tocar tu código, dejando el enganche real (leer esa metadata y ejecutar) para cuando decidas qué propuesta seguir.

---

## Recomendación (si la pides — la decisión sigue siendo tuya)

Empezaría por la Propuesta 4 (etiquetas) porque es la única pieza que podemos construir nosotros por nuestra cuenta, en la bóveda, sin esperar a nada tuyo ni tocar tu código — y deja la puerta abierta a que actives cualquiera de las otras cuatro más adelante sin tener que rehacerla. La Propuesta 3 (Panel+Juez para elegir agente) es la que más aprovecha lo que ya construiste, y personalmente me parece la más interesante de las cinco por eso — pero es la más cara y la que menos escala sola, así que tendría sentido como el escalón final de la 5, no como punto de partida.

---

## Qué hacemos nosotros mientras tanto

Empezamos a etiquetar cada nota nueva de la bóveda con metadata estructurada (dominio, nivel de integración, capacidades) desde ya — útil para la Propuesta 4 si la quieres, y no bloquea ni presupone ninguna decisión tuya. Ver `vault/06-Plan-de-Expansion-Masiva.md` para el plan completo de ampliación de la bóveda.
