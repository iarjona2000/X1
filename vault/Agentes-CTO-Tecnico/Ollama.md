---
tags: [agente, "tema/cto", "nivel-2", candidato, candidato-lote-3, ya-integrado]
dominio: cto
subdominio: Inferencia local / MLOps
capacidades: [sirve-modelos-locales, cero-coste-por-llamada]
nivel_integracion: api-selfhosted
candidato_desde: 2026-07-06
comparado_con: ["[[vLLM]]"]
fuente: censo GitHub (≥10k estrellas), categoría "Inferencia y serving local de modelos", ollama/ollama, 175.419⭐, Go
---

# Ollama

**Repo:** [ollama/ollama](https://github.com/ollama/ollama) — 175.419⭐, Go, el estándar de facto para correr modelos abiertos en local.

**Ya integrado en X1** (referencia, no nueva investigación): `docs/X1_CAPABILITIES.md` y `docs/SYSTEM_ARCHITECTURE.md` ya documentan a Ollama como uno de los providers registrados en `X1Pool`. Esta nota lo cataloga formalmente en la vertical técnica para que quede visible en el mapa de la bóveda, junto al resto del panorama de inferencia local.

**Qué es:** ejecuta modelos abiertos (Llama, Qwen, DeepSeek, Gemma, GPT-OSS...) en el hardware del propio usuario, API compatible con OpenAI, instalación en minutos en Windows.

**Comparado con:** [[vLLM]] — Ollama está optimizado para uso personal/de un solo usuario (instalación trivial); vLLM está pensado para servir a muchos usuarios simultáneos con mayor throughput, a costa de una instalación más compleja.

## Enlaces
[[00-CTO]]
