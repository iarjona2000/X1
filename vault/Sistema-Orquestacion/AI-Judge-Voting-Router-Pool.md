---
tags: [sistema/orquestacion]
---

# AI Judge / Voting / Router / Pool — el sistema propio de X1

**Fuente:** `background/ai/ai-judge.js`, `ai-voting.js`, `ai-router.js`, `ai-pool.js`. Solo documentación — no se ha tocado ninguno de estos archivos.

Cuatro piezas separadas que colaboran:

- **`X1Pool`** (`ai-pool.js`) — el registro dinámico de proveedores de IA. Cada proveedor se auto-registra con su capacidad, coste y estado; expone `register/unregister/get/getAll/getActive/getByCapability/getByFamily/select`, salud (`updateHealth/isHealthy/getHealthStatus`) y estadísticas (`getStats`). Es la fuente de verdad de "qué IAs están disponibles ahora mismo".
- **`X1Judge`** (`ai-judge.js`) — el motor central: `analyzeQuery()` clasifica la pregunta (idioma, entidades, tipo, complejidad), `selectVoters()` decide a qué proveedores del pool preguntar, `scoreVote()`/`rankVotes()` puntúan y ordenan las respuestas, `detectConsensus()` mide si coinciden, `synthesizeResponses()`/`buildSynthesis()` fusionan varias respuestas en una, y `runJudge()` es la orquesta completa de extremo a extremo.
- **`X1Voting`** (`ai-voting.js`) — `VoteCollector` y `VotingSession`: la recolección, scoring y consenso/ranking de los votos de múltiples IAs. Es el motor "democrático" que usa `X1Judge` por debajo.
- **`X1Router`** (`ai-router.js`) — `SmartRouter`: analiza consultas y las asigna a las IAs más adecuadas según tipo de tarea, complejidad, rendimiento histórico (`recordPerformance`) y disponibilidad (`isProviderAvailable`, `getProviderScore`).

## Cómo encajan entre sí

`X1Pool` sabe *quién* está disponible. `X1Router` decide *a quién preguntar* según historial e idoneidad. `X1Judge` orquesta la ronda completa (analizar → seleccionar votantes → recoger → puntuar → sintetizar), apoyándose en `X1Voting` para la parte de consenso. En la práctica, `aiComplete()` (ver [[Cascada-Proveedores]]) solo llega a este camino completo cuando ninguno de los fast-paths (caché, FCC, WebLLM) resuelve la consulta primero.

## Enlaces
[[00-Sistema-Orquestacion]] · [[Cascada-Proveedores]] · [[Ensemble-Collaborative]]
