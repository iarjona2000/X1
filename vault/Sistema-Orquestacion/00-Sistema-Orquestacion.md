---
tags: [sistema/orquestacion, meta-agentes]
---

# Sistema de Orquestación — mapa de documentación

**Frontera importante:** este clúster documenta, no implementa. Todo el código descrito aquí (`background/ai/*`, `background/x1-core/core/*`, `x1-bridge.js`, `x1-integration.js`, `fcc-bridge.js`) es terreno exclusivo del socio — instrucción explícita de Ivan (2026-07-04): *"no quiero que toques nada suyo de ahora en adelante."* Ninguna nota de este clúster ha llevado a modificar ese código; son notas de referencia para que el "cerebro" completo de X1 —no solo el catálogo de agentes— se vea estructurado en el mismo vault (instrucción de Ivan, 2026-07-06).

No lleva prefijo CEO porque no es una vertical de agentes candidatos — es el propio orquestador que en la jerarquía CEO (ver [[../00-Indice|00-Indice]]) dirige a los CEO-especialistas.

## Qué hay documentado aquí

- [[Cascada-Proveedores]] — el fast-path de `aiComplete()` en `service-worker.js`: proxy Cloudflare → FCC → WebLLM → carrera simple de 1-2 proveedores.
- [[AI-Judge-Voting-Router-Pool]] — el sistema propio de X1 (`background/ai/ai-judge.js`, `ai-voting.js`, `ai-router.js`, `ai-pool.js`): quién vota, cómo se puntúa, cómo se enruta.
- [[Ensemble-Collaborative]] — el motor de `background/x1-core/core/` (`judge.js`, `ensemble.js`, `collaborative.js`, `orchestrator.js`): el sistema más nuevo, construido por el socio, hoy sin nadie llamándolo en producción.
- [[Propuestas-Vinculadas]] — enlace a `docs/PROPUESTAS_ORQUESTACION.md`, las cinco propuestas de Ivan para conectar este sistema con el catálogo de agentes de la bóveda (opciones, no una decisión).

## Por qué existe este clúster

Ivan: *"quiero que todo el programa se vea estructurado en el cerebro de Obsidian"* — la bóveda antes solo mapeaba agentes externos candidatos. Este clúster completa el mapa con la pieza que ya construyó el socio (el orquestador, su cascada de proveedores, y su proceso de razonamiento/consenso), para que el grafo de Obsidian muestre el programa entero, no solo la mitad.

## Enlaces
[[../00-Indice]] · [[../Meta/04-Diseno-de-Red]]
