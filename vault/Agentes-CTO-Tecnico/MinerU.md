---
tags: [agente, "tema/cto", "nivel-2", candidato, candidato-lote-3]
dominio: cto
subdominio: Procesamiento de documentos
capacidades: [convierte-a-markdown, extrae-estructura, prepara-para-llm]
nivel_integracion: api-selfhosted
candidato_desde: 2026-07-06
comparado_con: ["[[Zerox]]", "[[PaddleOCR]]"]
fuente: censo GitHub (≥10k estrellas), categoría "Agentes de IA", opendatalab/MinerU, 73.294⭐, Python
---

# MinerU

**Repo:** [opendatalab/MinerU](https://github.com/opendatalab/MinerU) — 73.294⭐, Python, activo.

**Qué es:** convierte documentos complejos (PDFs, Office) en markdown/JSON listos para LLMs — preserva estructura, tablas, fórmulas y orden de lectura, no solo el texto plano. Es la capa de "documento → datos que un agente puede consumir."

**Por qué entra en CTO:** nicho distinto de OCR puro — [[Zerox]]/[[PaddleOCR]] reconocen texto de imágenes; MinerU entiende la *estructura* del documento entero (secciones, tablas, jerarquía) para alimentar un pipeline de agente. Encaja directamente con la capacidad de "manipulación de documentos" de la visión original de X1 como middleman de IA. Elegido sobre alternativas del mismo nicho en el censo (`docling-project/docling` 62.616⭐, `datalab-to/marker` 37.137⭐) por mayor tracción.

**Comparado con:** [[Zerox]] (OCR por visión, coste por llamada, buen layout), [[PaddleOCR]] (OCR offline gratis) — MinerU opera un nivel por encima: no "lee letras" sino que estructura el documento completo en markdown/JSON.

## Enlaces
[[00-CTO]]
