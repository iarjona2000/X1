---
tags: [agente, research, candidato-lote-1, "tema/research", "nivel-2"]
tier: rest-api-self-hosted
dominio: research
subdominio: OSINT automatizado
capacidades: [reconocimiento, correlacion-de-datos, mapeo-de-superficie-de-ataque]
nivel_integracion: api-selfhosted
rol_abos: Research Agent
estado: candidato-lote-1
candidato_desde: 2026-07-04
comparado_con: ["[[OpenOSINT]]", "[[Taranis-AI]]"]
---

# SpiderFoot

**Qué hace:** automatización OSINT con más de 200 módulos — reconocimiento automático, correlación de datos entre fuentes (dominios, IPs, redes sociales, brechas de datos, metadatos), y mapeo de superficie de ataque/huella digital. Uno de los proyectos OSINT más maduros y ampliamente usados del ecosistema (referencia constante en listas "awesome-osint").

**Repositorio:** [github.com/smicallef/spiderfoot](https://github.com/smicallef/spiderfoot)

**Por qué junto a OpenOSINT y no en su lugar:** OpenOSINT (elegido Fase 1) está pensado para uso conversacional con un LLM (REPL interactivo, funciona con Claude/GPT-4). SpiderFoot es más una plataforma de automatización pura — 200+ módulos ejecutándose en paralelo, pensada para correr un escaneo completo y darte un informe, no para conversar paso a paso. Complementario: OpenOSINT para investigación dirigida por el usuario, SpiderFoot para barridos automatizados amplios.

**Nivel de integración:** 2 (self-hosted, API REST propia una vez desplegado).

## Enlaces
[[00-Research]]
