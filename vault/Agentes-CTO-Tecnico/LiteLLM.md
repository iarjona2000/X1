---
tags: [agente, "tema/cto", "nivel-2", candidato, candidato-lote-3]
dominio: cto
subdominio: Frameworks de agentes
capacidades: [unifica-proveedores, controla-coste, balancea-carga]
nivel_integracion: api-selfhosted
candidato_desde: 2026-07-06
comparado_con: []
fuente: censo GitHub (≥10k estrellas), categoría "Frameworks y orquestación LLM", BerriAI/litellm, 52.565⭐, Python
---

# LiteLLM

**Repo:** [BerriAI/litellm](https://github.com/BerriAI/litellm) — 52.565⭐, Python, activo.

**Qué es:** SDK y proxy server que llama a 100+ APIs de LLM (Bedrock, Azure, OpenAI, VertexAI, Cohere, Anthropic, Sagemaker, HuggingFace, vLLM, NVIDIA NIM...) con un formato unificado tipo OpenAI, con tracking de coste, guardrails, balanceo de carga y logging incluidos.

**Por qué entra en CTO:** referencia directa de un patrón que X1 ya implementa de forma propia — el gateway multi-proveedor (`X1Pool`, documentado en el clúster `Sistema-Orquestacion`) resuelve un problema muy similar al que LiteLLM resuelve como librería de terceros. Se cataloga como panorama competitivo/de referencia, no como reemplazo — el sistema del socio no se toca.

## Enlaces
[[00-CTO]]
