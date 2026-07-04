---
tags: [agente, "tema/cto", "nivel-2", candidato, candidato-lote-3]
dominio: cto
subdominio: Visión y OCR
capacidades: [extrae-texto, offline, multi-idioma]
nivel_integracion: api-selfhosted
candidato_desde: 2026-07-06
comparado_con: ["[[Zerox]]"]
fuente: censo GitHub (≥10k estrellas), categoría "Visión por computador y OCR", tesseract-ocr/tesseract, 75.089⭐, C++
---

# Tesseract

**Repo:** [tesseract-ocr/tesseract](https://github.com/tesseract-ocr/tesseract) — 75.089⭐, C++, el motor de OCR open-source más establecido y usado del mundo (originado en HP, mantenido hoy por Google).

**Qué es:** motor de reconocimiento óptico de caracteres clásico — convierte imagen a texto plano, sin necesidad de un modelo de IA generativo ni conexión a internet. Cero coste por llamada, funciona 100% local.

**Por qué entra en CTO:** el baseline gratuito y offline frente a soluciones basadas en modelos de visión — para casos donde el documento es simple (texto limpio, sin tablas complejas) no hace falta pagar por un modelo de visión.

**Comparado con:** [[Zerox]] — Zerox entiende layout/tablas vía modelo de visión (mejor en documentos complejos, con coste); Tesseract es gratis, offline, y suficiente para texto simple.

## Enlaces
[[00-CTO]]
