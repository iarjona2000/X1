---
tags: [categoria, ceo-vertical, "tema/ceo"]
rol_abos: CEO Agent, Strategic Planner, Research Agent
---

# CEO — Estrategia e Inteligencia

Reestructurado 2026-07-05: fusiona `Agentes-Estrategia` y `Agentes-Research` bajo la vertical del propio CEO (planificación estratégica e inteligencia de mercado/competencia son función directa del máximo nivel, no un departamento aparte). También incorpora, sin investigación nueva, la nota de frontera que vivía en `Agentes-Nucleo`.

**Frontera importante (heredada de `Agentes-Nucleo`):** el CEO Agent como *orquestador* — el AI Router multi-modelo y la memoria vectorial empresarial — es responsabilidad exclusiva del socio (`x1-bridge.js`, `x1-integration.js`, `core/judge.js`, `core/ensemble.js`, `core/task-router.js`, `core/memory/*`, y ahora también `fcc-bridge.js`/FCC). No se investiga ni se construye aquí — este hub cataloga los *agentes* que ese orquestador dirigiría, no el orquestador en sí. Ver `X1/docs/PROPUESTAS_ORQUESTACION.md` para las propuestas (no decisiones) de cómo podría funcionar esa pieza central.

## Planificación estratégica
- [[OpenOKR]] — gestión de OKRs open-source. No es "IA" en sí — estructura de datos sobre la que X1 genera/actualiza OKRs con su propia cascada.
- [[OpenTwins]] — digital twins open-source.
- [[Second-Me]] — modelo personal de IA que aprende del usuario.

## Investigación / OSINT (informa decisiones de nivel CEO)
- [[OpenOSINT]] — **elegido para Fase 1**. Servidor MCP propio, funciona con Claude/GPT-4/modelos locales.
- [[Taranis-AI]] — recolección de noticias/inteligencia situacional continua.
- [[SpiderFoot]] — 200+ módulos de automatización OSINT, para barridos amplios.
- [[OSINT-Agent-Skills]] — MCP puro con 23 herramientas (DNS, Shodan, certificados, brechas de datos, blockchain).
- [[GPT-Researcher]] — **Lote 3**. Agente autónomo de investigación general con informes citados, distinto de las herramientas OSINT (seguridad/infraestructura).
- [[Firecrawl]] — **Lote 3**. Scraping/búsqueda web a escala como API gestionada, infraestructura de research general.

Nota de uso: herramientas OSINT son legítimas para investigación de mercado/competencia (el caso de uso de X1), pero todas advierten explícitamente de uso autorizado solamente — no usar para vigilancia de personas sin consentimiento.

## Enlaces
[[00-Indice]] · [[02-Plan-de-Fases]] · [[06-Plan-de-Expansion-Masiva]]
