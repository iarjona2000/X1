---
tags: [agente, "tema/cto", "nivel-2", candidato, candidato-lote-3]
dominio: cto
subdominio: Voz y audio
capacidades: [genera-voz, clona-voz, multi-idioma]
nivel_integracion: api-selfhosted
candidato_desde: 2026-07-06
comparado_con: ["[[Whisper]]"]
fuente: censo GitHub (≥10k estrellas), categoría "Voz, audio y música con IA", coqui-ai/TTS, 45.683⭐, Python
---

# Coqui TTS

**Repo:** [coqui-ai/TTS](https://github.com/coqui-ai/TTS) — 45.683⭐, Python, toolkit de texto-a-voz maduro, probado en producción e investigación.

**Qué es:** motor de síntesis de voz (TTS) self-hosted, con soporte de clonación de voz y múltiples idiomas — la contraparte de Whisper para el lado de generación de audio.

**Por qué entra en CTO:** X1 tiene una función `speak()` de TTS completa ya escrita en el side panel que **nunca se llama** (hallazgo de la auditoría previa, ver `docs/SYSTEM_ARCHITECTURE.md`) — si el socio decide activarla, este es un candidato self-hosted real para no depender de una API de pago.

**Comparado con:** [[Whisper]] — direcciones opuestas del mismo problema de voz (Whisper transcribe, Coqui TTS genera).

## Enlaces
[[00-CTO]]
