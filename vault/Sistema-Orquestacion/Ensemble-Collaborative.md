---
tags: [sistema/orquestacion]
---

# Ensemble / Collaborative / Orchestrator — el sistema x1-core del socio

**Fuente:** `background/x1-core/core/judge.js`, `core/ensemble.js`, `core/collaborative.js`, `background/orchestrator.js` (dentro de `background/x1-core/`). Solo documentación — no se ha tocado ninguno de estos archivos. Es la pieza más nueva del socio, construida con módulos ES (`import`/`export`), separada del sistema `ai/ai-*.js` más antiguo descrito en [[AI-Judge-Voting-Router-Pool]].

- **`JudgeSystem`** (`core/judge.js`) — evalúa respuestas individuales y compara varias para elegir la mejor según criterios ponderados (`SCORING_WEIGHTS`, `SECTORS` de `utils/constants.js`).
- **`EnsembleEngine`** (`core/ensemble.js`) — ejecuta varios modelos en paralelo sobre la misma consulta, evalúa las respuestas con `JudgeSystem`, y prepara el material para un **voto ciego del usuario** (opciones barajadas y etiquetadas A/B/C, sin revelar qué modelo generó cada una). También decide en modo automático si hace falta activar la comparación, cuando la confianza del juez es baja.
- **`CollaborativeEngine`** (`core/collaborative.js`) — capa sobre `Supervisor` (`core/orchestration/supervisor.js`) para definir **equipos con nombre** (conjuntos persistentes de agentes con un rol común) y lanzarlos sobre una tarea, guardando el historial paso a paso.
- **`Orquestador central`** (`background/orchestrator.js`) — singleton perezoso, punto único de integración: instancia y cablea providers, memoria, workspace, agentes, ensemble, router, predictivo, fact-check, proyectos, colaboración e integraciones; expone los métodos de alto nivel que el service worker enruta desde la UI.

## Estado (según auditoría previa, no verificado de nuevo aquí)

Sistema construido y funcional a nivel de módulo, pero sin nadie invocándolo activamente en el flujo de producción de `aiComplete()` (ver [[Cascada-Proveedores]]) al momento de escribir esta nota — es terreno del socio decidir cuándo y cómo activarlo.

## Por qué importa para la bóveda

La Propuesta 3 y la Propuesta 5 de `docs/PROPUESTAS_ORQUESTACION.md` (ver [[Propuestas-Vinculadas]]) proponen reutilizar exactamente `EnsembleEngine`+`JudgeSystem` y `CollaborativeEngine`/`TaskGraph`, pero para elegir y coordinar *agentes de la bóveda* en vez de modelos de lenguaje — infraestructura ya construida, sin trabajo activo hoy, con un encaje natural para ese problema distinto.

## Enlaces
[[00-Sistema-Orquestacion]] · [[AI-Judge-Voting-Router-Pool]] · [[Propuestas-Vinculadas]]
