# DECISIONES.md — desviaciones de la especificación de orquestación

Registro de cada punto donde la implementación del sistema de resolución de
agentes (`PROMPT_CLAUDE_CODE_ORQUESTACION.md`) se desvía de una especificación
cerrada del documento, o toma una decisión donde el documento deja algo
implícito. Cada entrada: fecha, motivo, alternativas consideradas.

Formato pedido por la sección 0 del spec.

---

## 2026-07-06 — Ubicación del subsistema

**Decisión:** el código vive en `background/x1-core/core/orchestration/vault/`
(módulos ES) y los tests en `background/x1-core/tests/vault/`.

**Motivo:** el spec exige "tests que pasan en ejecución real", y `x1-core` es el
único sub-proyecto con Jest instalado. El sistema reutiliza módulos de
`x1-core/core/` (`memory/`, `orchestration/task-graph.js`, futuros `judge`/
`ensemble`), así que vivir a su lado permite imports relativos directos.

**Alternativas:** (a) `background/orchestration/` en ES5 cargable por el service
worker vía importScripts — descartado porque no podría ejecutar los tests que el
spec exige y no podría importar los módulos ESM de x1-core; (b) un paquete npm
nuevo — sobreingeniería para esta fase.

---

## 2026-07-06 — Harness de tests de x1-core roto; se corre con entorno `node`

**Hallazgo (no desviación del spec, sino del entorno):** la suite de `x1-core`
está rota de fábrica por dos motivos: `jest.config.js` mapea `@core/@utils` a
`<rootDir>/src/...` pero los ficheros se movieron a `<rootDir>/core|utils/`; y
falta la dependencia `jest-environment-jsdom` (Jest 28+ ya no la incluye).

**Decisión:** los tests de este subsistema usan imports relativos (no los alias
`@core` rotos) y se ejecutan con `npx jest --testEnvironment=node tests/vault`.
Son lógica pura sin DOM, así que `node` es el entorno correcto y esquiva ambos
fallos sin tocar la config compartida.

**Pendiente para el socio/Iván:** arreglar `jest.config.js` (apuntar a `core/`
y `utils/`, o restaurar `src/`) e instalar `jest-environment-jsdom` para que la
suite heredada vuelva a correr. No lo toco aquí para no cambiar infraestructura
compartida sin acordarlo.

---

## 2026-07-06 — Esquema de manifest: superset compatible con el de Iván

**Desviación de §4:** el spec define el front-matter en inglés (`domain`,
`capabilities`, `integration_level` entero 1-4, `integration_ref`, `cluster`…).
La bóveda YA usa (commit de Iván, `Meta/06-Plan-de-Expansion-Masiva.md`) un
esquema propio en español: `dominio`, `subdominio`, `capacidades`,
`nivel_integracion` (enum string `mcp|api-selfhosted|saas|prompt`), más un
`tier` heredado.

**Decisión:** no se le pide a Iván re-etiquetar 122 notas. `normalizeFrontmatter()`
traduce el esquema de Iván al canónico como **superset compatible** —acepta ambos
nombres de campo y mapea los enums de nivel a los enteros 1-4 vía `LEVEL_ALIASES`.
El manifest canónico sigue siendo el contrato interno del embudo; la bóveda no
tiene que cambiar.

**Motivo:** la división de responsabilidades (`vault/00-Indice.md`) es explícita —
la bóveda es territorio de Iván, la orquestación del socio. Imponer el esquema
inglés a la bóveda cruzaría esa frontera y rompería el trabajo en curso de Iván.

**Alternativa descartada:** exigir el esquema del spec literalmente y migrar todas
las notas — habría entrado en conflicto directo con los lotes de expansión que
Iván está commiteando cada pocas horas.

---

## 2026-07-06 — Catálogo de clústeres: 10 verticales reales, no las del spec

**Desviación de §4:** el ejemplo del spec usa `cluster: legal-finanzas` y da por
hecho un catálogo tipo el de la propuesta original. La bóveda real fue
reestructurada por Iván (2026-07-05/06) a una jerarquía CEO con 10 carpetas
concretas.

**Decisión:** el catálogo cerrado (`clusters.js` + `vault/00-Catalogo-Clusters.md`)
se extrae por inspección directa de las 10 carpetas `Agentes-*` reales, como el
propio §4 ordena cuando no existe un catálogo formal previo. Ids resultantes:
`ceo-estrategia`, `cfo-finanzas`, `cmo-marketing`, `clo-legal`, `chro-rrhh`,
`cro-ventas`, `coo-operaciones`, `cto-tecnico`, `cpo-producto`, `conectores`.

**Nota:** cada clúster admite varios alias de dominio (el tag de rol CEO y el de
tópico: `cfo`≈`finanzas`) porque la bóveda etiqueta de forma inconsistente entre
notas — el código tolera la variación real en vez de exigir disciplina retroactiva.

---

## 2026-07-06 — `vault/06-Plan-de-Expansion-Masiva.md` sí existe (contra lo que asumí)

**Aclaración:** un borrador anterior de estas decisiones anotó que el documento
`vault/06-...` citado por el spec no existía. Tras la reestructuración de Iván,
sí existe, en `vault/Meta/06-Plan-de-Expansion-Masiva.md`. Sin desviación real.

---

## 2026-07-06 — Stemming ligero conservador (sin género)

**Desviación menor de §5:** el spec pide "manejo de plurales/género". Se
implementa plural (`-es`, `-s`) pero NO reducción de género (`-a`/`-o`), porque
colapsar género genera más falsos positivos que aciertos en español
(`marketing`≠`marketinga`, pero `crítico`/`crítica` cambian de sentido). En su
lugar, `extractPromptTerms` conserva tanto la forma original como la lematizada,
así no se pierde ningún match. Revisable con datos reales de retrieval.

---

## 2026-07-06 — §8: qué sistema de juez se reutiliza para la etapa 3

**Decisión:** se reutiliza el CONTRATO de `JudgeSystem` (x1-core/core/judge.js),
no el de `ai-judge.js`/`ai-voting.js` ni `EnsembleEngine`.

**Dos razones concretas basadas en el código leído:**
1. `JudgeSystem.compare(responses, query)` ya devuelve exactamente
   `{winner, ranking, consensus}` — la forma que la etapa 3 necesita para elegir
   entre 2-4 candidatos. Los otros sistemas (`ai-voting.js`, `EnsembleEngine`)
   orquestan además llamadas a varios proveedores, lo que sobra para "elegir
   agente" (no hay que generar respuestas, solo puntuar encaje).
2. `JudgeSystem` es estático y sin estado interno, así que envolverlo para
   puntuar "encaje de agente" no obliga a instanciar ni tocar su lógica.

**Matiz importante (confirmado leyendo el código, coincide con la auditoría
`ISSUES_NEEDING_YOUR_INPUT.md` #1):** el scoring de `JudgeSystem` es puramente
heurístico sobre el TEXTO de una respuesta ya generada — no aplica a un agente
que todavía no ha respondido. Por eso la etapa 3 NO llama a `JudgeSystem`
directamente: define un juez INYECTABLE (`stage3_panelJudge({judgeFn})`). En
producción ese `judgeFn` sería una llamada LLM real que puntúa encaje; el
fallback (`heuristicAgentJudge`) reusa la INTENCIÓN de las rúbricas
(`SCORING_WEIGHTS`) reinterpretadas por `adaptRubricToAgentSelection`. Se deja
al socio la decisión de conectar un juez LLM real cuando quiera.

---

## 2026-07-06 — Frontera de integración: subsistema construido y probado, NO cableado a producción todavía

**Alcance real de esta entrega:** el embudo completo (`resolveAgentsForPrompt` +
etapas 0-3 + caché + coordinación + dispatch + logging) está implementado y
cubierto por 160 tests en verde DENTRO de `x1-core`. NO está aún llamado desde
el service worker en vivo ni desde `x1-bridge.js`/`x1-integration.js`.

**Por qué:** el spec §3 dice explícitamente que el punto de integración es "solo
añadir la llamada a `resolveAgentsForPrompt` donde hoy se decide a qué se
responde, sin tocar la lógica interna de `x1-bridge.js`/`x1-integration.js`". Ese
cableado (a) cruza al service worker, que otra sesión concurrente está editando
en paralelo, y (b) requiere primero completar la metadata de la bóveda
(`integration_ref`, ver `vault/MIGRACION_PENDIENTES.md`: 0 de 118 notas listas
para dispatch real). Cablearlo a ciegas ahora activaría un dispatch que fallaría
en producción. Queda como el siguiente paso explícito, a hacer de forma
coordinada, no en paralelo a otra sesión.
