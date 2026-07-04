---
tags: [meta, plan, por-confirmar]
---

# Candidatos por confirmar (censo GitHub)

**Para Ivan.** Instrucción (2026-07-06): *"filtra buscando agentes y cosas que puedan servir a X1; si tienes dudas, crea un documento con todos los repositorios para que yo confirme."*

Los candidatos **claros** ya se añadieron a sus verticales (ver `06-Plan-de-Expansion-Masiva.md`, Lote 3). Este documento reúne los que **no añadí porque tengo una duda genuina** — cada bloque explica la duda. Marca ✅ (añadir) / ❌ (descartar) al lado de cada uno, o dime el criterio y lo aplico en bloque. No he tocado la bóveda con ninguno de estos todavía.

---

## Bloque A — Finanzas: ¿saturamos CFO o ya está cubierto?

CFO ya tiene 6 candidatos (AI-CFO-Agent, FinRobot, TradingAgents, OpenBB, AI-Trader, FinRL). Estos son buenos pero solapan parcialmente. **Duda: ¿cuántos candidatos por vertical quieres — el mejor de cada nicho, o un catálogo amplio?**

| Repo | ⭐ | Qué aporta distinto | Mi recomendación |
|---|--:|---|---|
| [virattt/ai-hedge-fund](https://github.com/virattt/ai-hedge-fund) | 60.800 | Equipo multi-agente que simula un fondo de cobertura (analistas + gestor de riesgo + PM) | ✅ el más distinto y con más estrellas |
| [microsoft/qlib](https://github.com/microsoft/qlib) | 45.589 | Plataforma quant orientada a IA (Microsoft), muy madura | ⚠️ solapa con FinRobot/FinRL |
| [virattt/dexter](https://github.com/virattt/dexter) | 27.303 | Agente autónomo de investigación financiera profunda | ⚠️ solapa con GPT-Researcher aplicado a finanzas |
| [AI4Finance-Foundation/FinGPT](https://github.com/AI4Finance-Foundation/FinGPT) | 20.775 | LLM financiero afinado (mismo colectivo que FinRobot/FinRL) | ⚠️ mismo colectivo, ya representado |
| [Fincept-Corporation/FinceptTerminal](https://github.com/Fincept-Corporation/FinceptTerminal) | 27.929 | Terminal de mercado tipo Bloomberg open-source | ⚠️ solapa con OpenBB |

---

## Bloque B — Capas de memoria: ¿terreno del socio?

Estas son "memoria persistente para agentes" — infraestructura de razonamiento/estado. **Duda: esto cae en la orquestación del socio (que ya tiene `MemoryManager`/`LocalVectorStore`), no en mi terreno de catálogo de agentes. ¿Las cataloga la bóveda como referencia, o las dejo fuera por ser su territorio?**

| Repo | ⭐ | Qué es |
|---|--:|---|
| [mem0ai/mem0](https://github.com/mem0ai/mem0) | 60.061 | Capa de memoria universal para agentes |
| [getzep/graphiti](https://github.com/getzep/graphiti) | 28.351 | Grafos de conocimiento en tiempo real para agentes |
| [topoteretes/cognee](https://github.com/topoteretes/cognee) | 26.863 | Memoria a largo plazo con grafo de conocimiento self-hosted |
| [letta-ai/letta](https://github.com/letta-ai/letta) | 23.642 | Agentes con estado, memoria avanzada (ex-MemGPT) |

Mi recomendación: **dejarlas fuera** (o como mucho una nota de referencia en `Sistema-Orquestacion/`), porque memoria = razonamiento = socio. Confírmame.

---

## Bloque C — Interfaces de chat: ¿agentes para X1, o competidores de X1?

Estas son UIs de chat/asistentes completos. **Duda: no son "agentes que X1 orquesta" — son alternativas *a* X1 mismo. Creo que no encajan en la bóveda, pero las listo por si quieres tenerlas como referencia competitiva.**

| Repo | ⭐ | Qué es |
|---|--:|---|
| [open-webui/open-webui](https://github.com/open-webui/open-webui) | 144.140 | Interfaz de IA (Ollama/OpenAI) |
| [lobehub/lobehub](https://github.com/lobehub/lobehub) | 79.439 | "Chief Agent Operator", gestiona equipos de agentes |
| [CherryHQ/cherry-studio](https://github.com/CherryHQ/cherry-studio) | 48.134 | Estudio de productividad IA, 300+ asistentes |
| [danny-avila/LibreChat](https://github.com/danny-avila/LibreChat) | 40.257 | Clon de ChatGPT con agentes/MCP/skills |

Mi recomendación: **fuera de la bóveda de agentes** (son productos rivales, no piezas orquestables). ¿De acuerdo?

---

## Bloque D — Frameworks de "IA personal" / augmentación

Solapan conceptualmente con lo que *es* X1 (un middleman de IA). **Duda: ¿referencia útil o ruido?**

| Repo | ⭐ | Qué es | Mi recomendación |
|---|--:|---|---|
| [danielmiessler/Fabric](https://github.com/danielmiessler/Fabric) | 42.792 | Framework de "patterns" (prompts) para augmentar humanos con IA | ⚠️ es colección de prompts (Nivel 4) — contra la política actual |
| [khoj-ai/khoj](https://github.com/khoj-ai/khoj) | 35.463 | "Segundo cerebro" IA self-hostable, agentes + research | ✅ software real, podría ir a CTO o CEO |
| [OpenBB ya añadido] | — | — | — |

---

## Bloque E — RAG / knowledge completos (¿duplican Qdrant + AnythingLLM?)

CTO ya tiene Qdrant (base vectorial) y AnythingLLM (app RAG). Estos son apps RAG más grandes. **Duda: ¿me quedo con AnythingLLM como el "RAG llave en mano" o prefieres uno de estos como el elegido?**

| Repo | ⭐ | Qué es |
|---|--:|---|
| [infiniflow/ragflow](https://github.com/infiniflow/ragflow) | 84.241 | Motor RAG líder + capacidades de agente |
| [zylon-ai/private-gpt](https://github.com/zylon-ai/private-gpt) | 57.306 | Chat con documentos 100% privado |
| [QuivrHQ/quivr](https://github.com/QuivrHQ/quivr) | 39.184 | RAG opinado para integrar en apps |
| [labring/FastGPT](https://github.com/labring/FastGPT) | 28.807 | Plataforma de Q&A basada en conocimiento + workflow visual |

Mi recomendación: **RAGFlow** (más estrellas, combina RAG + agente) podría sustituir a AnythingLLM como el elegido. Tu decides.

---

## Bloque F — Automatización de navegador/scraping (¿duplican Browser-Use/OmniParser/Crawl4AI?)

CTO ya tiene Browser-Use (DOM), OmniParser (visión), Crawl4AI (scraping). **Duda: ¿alguno de estos es mejor que los ya elegidos para su nicho?**

| Repo | ⭐ | Qué es |
|---|--:|---|
| [browserbase/stagehand](https://github.com/browserbase/stagehand) | 23.331 | SDK para agentes de navegador |
| [Skyvern-AI/skyvern](https://github.com/Skyvern-AI/skyvern) | 22.100 | Automatiza flujos de navegador con IA |
| [ScrapeGraphAI/Scrapegraph-ai](https://github.com/ScrapeGraphAI/Scrapegraph-ai) | 27.969 | Scraper basado en IA |
| [web-infra-dev/midscene](https://github.com/web-infra-dev/midscene) | 13.939 | Automatización de UI dirigida por visión |

Mi recomendación: **dejar los ya elegidos** (Browser-Use tiene 102k⭐, muy por encima). Confírmame si quieres alguno como alternativa documentada.

---

## Bloque G — Voz (¿duplican Whisper/Coqui-TTS?)

CTO ya tiene Whisper (STT) y Coqui-TTS (TTS). Muchas alternativas en el censo. **Duda: ¿un candidato por nicho basta, o quieres alternativas listadas?**

Notables: [myshell-ai/OpenVoice](https://github.com/myshell-ai/OpenVoice) (36.860⭐, clonación de voz), [FunAudioLLM/CosyVoice](https://github.com/FunAudioLLM/CosyVoice) (21.962⭐), [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) (24.017⭐, Whisper optimizado), [pipecat-ai/pipecat](https://github.com/pipecat-ai/pipecat) (13.172⭐, IA conversacional de voz), [livekit/agents](https://github.com/livekit/agents) (11.227⭐, agentes de voz en tiempo real).

Mi recomendación: **mantener Whisper + Coqui-TTS** como los elegidos; `faster-whisper` es solo Whisper optimizado (misma familia). Confírmame.

---

## Bloque H — Ciencia e investigación (Lote 4, vertical aún por decidir)

Estos abren el terreno de "ciencia" que aún no tiene vertical. **Duda: ¿creamos una vertical de ciencia, los metemos bajo CEO (informan estrategia), o esperamos al Lote 4 dedicado?**

| Repo | ⭐ | Qué es |
|---|--:|---|
| [SakanaAI/AI-Scientist](https://github.com/SakanaAI/AI-Scientist) | 14.144 | Descubrimiento científico automatizado de principio a fin |
| [stanford-oval/storm](https://github.com/stanford-oval/storm) | 29.808 | Genera informes largos con citas (research) |
| [kaixindelele/ChatPaper](https://github.com/kaixindelele/ChatPaper) | 19.648 | Resume/traduce/revisa papers de arXiv |

Mi recomendación: **esperar al Lote 4** (búsqueda dedicada de ciencia con `awesome-bioinformatics` etc.), no forzarlos desde este censo generalista. Confírmame.

---

## Resumen: qué necesito de ti

1. **¿Cuántos candidatos por vertical?** El mejor de cada nicho (lo que hago ahora) vs. catálogo amplio con alternativas. Esto decide los Bloques A y G de golpe.
2. **Bloque B (memoria):** ¿terreno del socio (fuera) o referencia en la bóveda?
3. **Bloque C (chat UIs):** ¿fuera por ser competidores, o los quieres como referencia?
4. **Bloque E (RAG):** ¿mantengo AnythingLLM o lo sustituyo por RAGFlow?
5. **Bloque H (ciencia):** ¿vertical nueva ahora, o Lote 4 dedicado?

Con tus respuestas, aplico todo en una tanda y no vuelvo a preguntar por estos.

## Enlaces
[[00-Indice]] · [[06-Plan-de-Expansion-Masiva]]
