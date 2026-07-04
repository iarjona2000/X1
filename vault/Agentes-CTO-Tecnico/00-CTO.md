---
tags: [categoria, ceo-vertical, "tema/cto"]
rol_abos: CTO Agent (hueco nuevo bajo la jerarquía CEO)
---

# CTO — Técnico / Ingeniería

Poblado 2026-07-06 (Lote 3) a partir de un censo completo de GitHub (5.354 repositorios con ≥10.000 estrellas, 35 categorías) — filtrado a los candidatos con relevancia real de IA/agente, deduplicado, un ganador por nicho distinto. La mayoría de las 5.354 filas del censo son ruido no-IA para esta bóveda (frameworks de frontend genéricos, lenguajes de programación, apps móviles, etc.) — se descartaron explícitamente, ver `Meta/06-Plan-de-Expansion-Masiva.md` para el registro completo de qué se incluyó y qué no.

**Segunda pasada (2026-07-06, mismo día):** revisión completa del censo verificando que ningún candidato ya elegido tuviera una alternativa con más estrellas para el mismo "producto" (instrucción explícita de Ivan). Resultado: 3 sustituciones y 3 candidatos nuevos — ver el detalle en cada nota (`Corrección 2026-07-06`) y en `Meta/06-Plan-de-Expansion-Masiva.md`.

Antes existían 6 clústeres separados por "departamento técnico" (`Agentes-Agency-Engineering`, `Security`, `Testing`, `GIS`, `SpatialComputing`, `GameDev`), 100% personas de prompt sin software real detrás — retirados. Todo lo de aquí es software real verificado en GitHub.

## Frameworks de agentes
- [[Browser-Use]] — framework de automatización de navegador para agentes de IA.
- [[LangGraph]] — orquestación de agentes como grafos de estado.
- [[AutoGen]] — **sustituye a CrewAI** (2026-07-06, más estrellas para el mismo nicho de equipos de agentes). Conversación entre agentes con roles definidos.
- [[LiteLLM]] — gateway unificado a 100+ APIs de LLM, referencia del mismo patrón que `X1Pool`.

## MCP e infraestructura de herramientas
- [[MCP-Servers-Oficial]] — implementaciones de referencia oficiales del protocolo.
- [[FastMCP]] — framework para construir servidores/clientes MCP propios.

## RAG y bases vectoriales
- [[Qdrant]] — base de datos vectorial de alto rendimiento, self-hosted.
- [[AnythingLLM]] — aplicación RAG completa lista para usar.

## Asistentes de código
- [[Aider]] — pair-programming con IA en terminal, el más establecido del nicho.

## Visión y OCR
- [[Zerox]] — OCR/extracción de documentos vía modelos de visión, entiende layout complejo.
- [[PaddleOCR]] — **sustituye a Tesseract** (2026-07-06, más estrellas para el mismo nicho de OCR self-hosted/offline). Toolkit ligero orientado a puente con LLMs.

## Voz y audio
- [[Whisper]] — reconocimiento de voz (STT), ya mencionado en la arquitectura de X1.
- [[Coqui-TTS]] — síntesis de voz (TTS) self-hosted, candidato para activar la función `speak()` sin usar del side panel.

## Ciberseguridad
- [[Shannon]] — **elegido**. Pentester de IA autónomo de caja blanca, el más maduro de tres alternativas comparadas (vs. pentagi, hexstrike-ai, strix).

## Inferencia local / MLOps
- [[Ollama]] — ya integrado en X1 como provider, catalogado aquí por completitud del mapa.
- [[vLLM]] — serving multiusuario de alto throughput para producción a escala.

## Scraping y datos web
- [[Crawl4AI]] — **sustituye a Scrapling** (2026-07-06, más estrellas para el mismo nicho de scraping adaptativo orientado a IA). Vs. Firecrawl (servicio gestionado, catalogado bajo CEO-Estrategia).

## Datos conversacionales
- [[Chat2DB]] — **Lote 3, segunda pasada**. Cliente de base de datos en lenguaje natural, elegido sobre DB-GPT y WrenAI (más estrellas).

## Automatización de GUI por visión
- [[OmniParser]] — **Lote 3, segunda pasada**. Parseo de pantalla puramente por visión (cualquier app, no solo navegador), complementa a Browser-Use.

## Enlaces
[[00-Indice]] · [[Meta/02-Plan-de-Fases]] · [[Meta/06-Plan-de-Expansion-Masiva]]
