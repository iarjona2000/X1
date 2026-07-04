---
tags: [agente, "tema/cto", "nivel-2", candidato, candidato-lote-3]
dominio: cto
subdominio: Visión y OCR
capacidades: [extrae-texto, entiende-layout, procesa-documentos]
nivel_integracion: api-selfhosted
candidato_desde: 2026-07-06
comparado_con: ["[[PaddleOCR]]"]
fuente: censo GitHub (≥10k estrellas), categoría "Visión por computador y OCR", getomni-ai/zerox, 12.238⭐, TypeScript
---

# Zerox

**Repo:** [getomni-ai/zerox](https://github.com/getomni-ai/zerox) — 12.238⭐, TypeScript, activo.

**Qué es:** OCR y extracción de documentos usando modelos de visión (no reconocimiento de caracteres clásico) — entiende layout, tablas y estructura del documento en vez de solo "leer letras," lo que lo hace más robusto en documentos complejos (facturas, contratos escaneados, formularios).

**Por qué entra en CTO:** complementa la capacidad de "manipulación de documentos" de la visión original de X1 como middleman de IA — candidato real para cualquier flujo que necesite extraer datos estructurados de PDFs/imágenes escaneadas más allá de lo que hace `MinerU`/`opendataloader-pdf` (mencionados en el mismo censo, no elegidos por menor tracción).

**Comparado con:** [[PaddleOCR]] — PaddleOCR es gratis, offline, sin dependencia de un modelo de visión (más barato, más rápido, peor con layouts muy complejos); Zerox requiere un modelo de visión (coste por llamada) pero entiende estructura, no solo texto plano.

## Enlaces
[[00-CTO]]
