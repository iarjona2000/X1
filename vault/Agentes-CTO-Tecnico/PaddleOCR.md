---
tags: [agente, "tema/cto", "nivel-2", candidato, candidato-lote-3]
dominio: cto
subdominio: Visión y OCR
capacidades: [extrae-texto, offline, multi-idioma, puente-a-llm]
nivel_integracion: api-selfhosted
candidato_desde: 2026-07-06
comparado_con: ["[[Zerox]]"]
fuente: censo GitHub (≥10k estrellas), categoría "Modelos LLM" (clasificación aproximada del censo — es OCR, no un modelo LLM), PaddlePaddle/PaddleOCR, 84.643⭐, Python
---

# PaddleOCR

**Repo:** [PaddlePaddle/PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) — 84.643⭐, Python, activo, mantenido por Baidu.

**Corrección 2026-07-06:** reemplaza a `Tesseract` (tesseract-ocr/tesseract, 75.089⭐), elegido inicialmente como baseline offline. Al revisar el censo completo de nuevo (instrucción de Ivan: comprobar que no hay otro repo del mismo "producto" y quedarse con el mejor), PaddleOCR tiene más estrellas para la misma categoría (OCR self-hosted, sin modelo de visión de pago) y además está explícitamente diseñado para "convertir cualquier PDF/imagen en datos estructurados para IA" — más alineado con el caso de uso de X1 que un motor de OCR genérico.

**Qué es:** toolkit de OCR ligero y potente — convierte PDFs/imágenes en datos estructurados listos para LLMs, soporta 100+ idiomas, corre offline sin depender de un modelo de visión de pago (a diferencia de [[Zerox]]).

**Comparado con:** [[Zerox]] — Zerox usa un modelo de visión (mejor en documentos muy complejos, con coste por llamada); PaddleOCR es gratis y offline, con mejor puente a LLMs que un OCR clásico tipo Tesseract.

## Enlaces
[[00-CTO]]
