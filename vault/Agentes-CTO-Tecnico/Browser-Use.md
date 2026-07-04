---
tags: [agente, "tema/cto", "nivel-2", candidato, candidato-lote-3]
dominio: cto
subdominio: Frameworks de agentes
capacidades: [navega, automatiza, extrae, hace-clic, rellena-formularios]
nivel_integracion: api-selfhosted
candidato_desde: 2026-07-06
comparado_con: ["[[LangGraph]]", "[[AutoGen]]", "[[OmniParser]]"]
fuente: censo GitHub (≥10k estrellas), categoría "Agentes de IA", browser-use/browser-use, 102.583⭐, Python
---

# Browser-Use

**Repo:** [browser-use/browser-use](https://github.com/browser-use/browser-use) — 102.583⭐, Python, activo.

**Qué es:** framework que hace las páginas web "accesibles" para agentes de IA — expone el DOM de forma estructurada para que un LLM pueda navegar, hacer clic, rellenar formularios y extraer datos sin depender de selectores CSS frágiles. Es, en esencia, la misma clase de problema que resuelve el `content/pointer-interaction.js` de X1, pero como framework reutilizable e independiente de X1.

**Por qué entra en CTO y no en Conectores:** no es un conector a un servicio SaaS concreto — es una pieza de infraestructura de automatización de navegador, comparable en función (no en cobertura) a lo que ya hace X1 nativamente. Se cataloga aquí como referencia técnica del panorama competitivo/complementario, no como un conector a instalar.

**Comparado con:** [[LangGraph]] (orquestación de grafos de agentes, no específico de navegador) y [[AutoGen]] (conversación entre agentes con roles, tampoco navegador-específico) — Browser-Use es el único de los tres centrado exclusivamente en interacción web.

## Enlaces
[[00-CTO]]
