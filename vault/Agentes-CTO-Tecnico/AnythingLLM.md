---
tags: [agente, "tema/cto", "nivel-2", candidato, candidato-lote-3]
dominio: cto
subdominio: RAG y bases vectoriales
capacidades: [indexa-documentos, responde-con-fuentes, chat-local]
nivel_integracion: api-selfhosted
candidato_desde: 2026-07-06
comparado_con: ["[[Qdrant]]"]
fuente: censo GitHub (≥10k estrellas), categoría "RAG, embeddings y bases vectoriales", Mintplex-Labs/anything-llm, 62.549⭐, JavaScript
---

# AnythingLLM

**Repo:** [Mintplex-Labs/anything-llm](https://github.com/Mintplex-Labs/anything-llm) — 62.549⭐, JavaScript, activo.

**Qué es:** aplicación RAG completa, autoalojable — sube documentos, se indexan automáticamente, y chateas contra ellos con el modelo que elijas (local o API). Incluye agentes propios configurables, no solo Q&A sobre documentos.

**Por qué entra en CTO:** es el candidato más "listo para usar" si X1 necesita en algún momento una capa de RAG sobre documentos de la empresa sin construir un pipeline desde cero — funciona como aplicación independiente, no como librería a integrar en `service-worker.js`.

**Comparado con:** [[Qdrant]] — Qdrant es solo la base vectorial (una pieza); AnythingLLM es la aplicación entera (interfaz, indexado, chat, agentes) ya montada encima de una base vectorial propia.

## Enlaces
[[00-CTO]]
