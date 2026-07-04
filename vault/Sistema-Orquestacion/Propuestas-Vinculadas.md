---
tags: [sistema/orquestacion]
---

# Propuestas de orquestación — vínculo externo

El documento completo vive fuera de la bóveda, en `X1/docs/PROPUESTAS_ORQUESTACION.md` (no se duplica aquí para evitar que se desincronice). Es un menú de cinco propuestas para el socio — ninguna implementada, ninguna decidida:

1. **Router semántico por embeddings** — reutiliza `MemoryManager`/`EmbeddingService`.
2. **Clasificador de clúster + match dentro del clúster** — reutiliza `Router.detectSector()`; converge con la jerarquía CEO de esta bóveda.
3. **Panel + Juez aplicado a elegir agente, no modelo** — reutiliza [[AI-Judge-Voting-Router-Pool]] y/o [[Ensemble-Collaborative]] para un trabajo nuevo.
4. **Filtro por metadatos/etiquetas, sin ML** — la única pieza que Ivan puede construir sin esperar al socio (metadata que ya se añade en cada nota nueva de agente).
5. **Pipeline híbrido** — las cuatro anteriores combinadas, más [[Ensemble-Collaborative|TaskGraph/CollaborativeEngine]] para coordinar varios agentes elegidos.

## Por qué está aquí y no copiado

`docs/PROPUESTAS_ORQUESTACION.md` es el documento "para el socio" fuera de la bóveda de agentes; esta nota es el puente que lo hace visible en el grafo de Obsidian de `Sistema-Orquestacion/`, cumpliendo el pedido de Ivan de que "todo el programa" —incluida esta pieza de decisión pendiente— se vea estructurado en el mismo cerebro.

## Enlaces
[[00-Sistema-Orquestacion]] · [[AI-Judge-Voting-Router-Pool]] · [[Ensemble-Collaborative]]
