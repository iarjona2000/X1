---
tags: [agente, "tema/cto", "nivel-2", candidato, candidato-lote-3]
dominio: cto
subdominio: Inferencia local / MLOps
capacidades: [sirve-modelos-multiusuario, alto-throughput]
nivel_integracion: api-selfhosted
candidato_desde: 2026-07-06
comparado_con: ["[[Ollama]]"]
fuente: censo GitHub (≥10k estrellas), categoría "Inferencia y serving local de modelos", vllm-project/vllm, 85.313⭐, Python
---

# vLLM

**Repo:** [vllm-project/vllm](https://github.com/vllm-project/vllm) — 85.313⭐, Python, motor de serving de referencia para producción a escala.

**Qué es:** motor de inferencia y serving de alto throughput y memoria eficiente para LLMs, orientado a servir a muchos usuarios simultáneos (a diferencia de Ollama, pensado para un solo usuario/equipo local).

**Por qué entra en CTO:** candidato de referencia si X1 (o el socio) necesitara alguna vez servir un modelo propio a escala en vez de depender solo de APIs de terceros o de Ollama para uso individual — pieza de infraestructura MLOps, no un agente en sí.

**Comparado con:** [[Ollama]] — Ollama para desarrollo/uso individual (instalación trivial); vLLM para producción multiusuario (instalación y operación más exigentes, throughput muy superior).

## Enlaces
[[00-CTO]]
