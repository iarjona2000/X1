---
tags: [agente, "tema/cto", "nivel-2", candidato, candidato-lote-3]
dominio: cto
subdominio: Frameworks de agentes
capacidades: [orquesta, asigna-roles, colabora]
nivel_integracion: api-selfhosted
candidato_desde: 2026-07-06
comparado_con: ["[[LangGraph]]", "[[Browser-Use]]"]
fuente: censo GitHub (≥10k estrellas), categoría "Agentes de IA", crewAIInc/crewAI, 54.872⭐, Python
---

# CrewAI

**Repo:** [crewAIInc/crewAI](https://github.com/crewAIInc/crewAI) — 54.872⭐, Python, activo.

**Qué es:** framework para orquestar "equipos" de agentes con roles definidos (ej. investigador, redactor, revisor) que colaboran secuencial o jerárquicamente sobre una tarea compartida. El modelo mental es más cercano a "montar un equipo" que a "diseñar un grafo de estados."

**Por qué entra en CTO:** es la contraparte de terceros más directamente comparable al `CollaborativeEngine` del socio (equipos con nombre, documentado en el clúster `Sistema-Orquestacion`) — útil como referencia de qué patrones de diseño ya son estándar en el ecosistema, sin que esto implique tocar el código del socio.

**Comparado con:** [[LangGraph]] (más control de bajo nivel, curva de aprendizaje mayor) y [[Browser-Use]] (navegador-específico) — CrewAI es el más rápido de prototipar para "varios agentes con roles claros," el menos indicado si el flujo necesita bifurcaciones condicionales complejas.

## Enlaces
[[00-CTO]]
