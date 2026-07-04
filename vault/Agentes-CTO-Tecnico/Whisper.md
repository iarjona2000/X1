---
tags: [agente, "tema/cto", "nivel-2", candidato, candidato-lote-3]
dominio: cto
subdominio: Voz y audio
capacidades: [transcribe, reconoce-voz, multi-idioma]
nivel_integracion: api-selfhosted
candidato_desde: 2026-07-06
comparado_con: ["[[Coqui-TTS]]"]
fuente: censo GitHub (≥10k estrellas), categoría "Voz, audio y música con IA", openai/whisper, 104.135⭐, Python
---

# Whisper

**Repo:** [openai/whisper](https://github.com/openai/whisper) — 104.135⭐, Python, el modelo de reconocimiento de voz (ASR) open-weight más usado del ecosistema.

**Qué es:** transcripción de voz a texto robusta y multi-idioma, entrenada con supervisión débil a gran escala. Corre local (via `whisper.cpp`/`faster-whisper`, ambos también en el censo) sin necesidad de API de pago.

**Por qué entra en CTO:** X1 ya menciona Whisper local en su propia arquitectura de voz (ver `docs/SYSTEM_ARCHITECTURE.md`) — esta nota lo cataloga formalmente como el candidato de referencia para reconocimiento de voz self-hosted en la bóveda, disponible para cualquier flujo que necesite STT sin depender de una API externa.

**Comparado con:** [[Coqui-TTS]] — Whisper es reconocimiento (voz→texto); Coqui-TTS es el sentido opuesto (texto→voz). Se complementan, no compiten.

## Enlaces
[[00-CTO]]
