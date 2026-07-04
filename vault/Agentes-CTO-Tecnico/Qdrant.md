---
tags: [agente, "tema/cto", "nivel-2", candidato, candidato-lote-3]
dominio: cto
subdominio: RAG y bases vectoriales
capacidades: [almacena-vectores, busca-similitud, filtra]
nivel_integracion: api-selfhosted
candidato_desde: 2026-07-06
comparado_con: ["[[AnythingLLM]]"]
fuente: censo GitHub (≥10k estrellas), categoría "RAG, embeddings y bases vectoriales", qdrant/qdrant, 32.920⭐, Rust
---

# Qdrant

**Repo:** [qdrant/qdrant](https://github.com/qdrant/qdrant) — 32.920⭐, Rust, activo, también disponible como servicio cloud gestionado.

**Qué es:** base de datos vectorial de alto rendimiento — almacena embeddings y responde búsquedas por similitud combinadas con filtrado estructurado (metadata). Es infraestructura, no un agente con personalidad, pero es la pieza que cualquier sistema RAG real necesita detrás.

**Por qué entra en CTO:** referencia técnica para cuando el socio (o Ivan, sobre esta bóveda) necesite un índice vectorial real más allá del `LocalVectorStore` que ya usa `MemoryManager` (documentado en el clúster `Sistema-Orquestacion`, y en `docs/PROPUESTAS_ORQUESTACION.md` Propuesta 1) — self-hostable, sin dependencia de un SaaS.

**Comparado con:** [[AnythingLLM]] — AnythingLLM es una app RAG completa lista para usar (interfaz + pipeline); Qdrant es solo la capa de almacenamiento vectorial, para quien quiera construir su propio pipeline encima.

## Enlaces
[[00-CTO]]
