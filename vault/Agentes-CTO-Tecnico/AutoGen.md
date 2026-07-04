---
tags: [agente, "tema/cto", "nivel-2", candidato, candidato-lote-3]
dominio: cto
subdominio: Frameworks de agentes
capacidades: [orquesta, asigna-roles, colabora, conversa-entre-agentes]
nivel_integracion: api-selfhosted
candidato_desde: 2026-07-06
comparado_con: ["[[LangGraph]]", "[[Browser-Use]]"]
fuente: censo GitHub (≥10k estrellas), categoría "Frameworks y orquestación LLM", microsoft/autogen, 59.480⭐, Python
---

# AutoGen

**Repo:** [microsoft/autogen](https://github.com/microsoft/autogen) — 59.480⭐, Python, activo, mantenido por Microsoft Research.

**Corrección 2026-07-06:** reemplaza a `CrewAI` (crewAIInc/crewAI, 54.872⭐), elegido inicialmente en el nicho de "equipos de agentes con roles." Al revisar el censo completo de nuevo (instrucción de Ivan: comprobar que no hay otro repo del mismo "producto" y quedarse con el mejor), AutoGen tiene más estrellas para la misma categoría (orquestación de múltiples agentes colaborando) y es el framework de referencia detrás de buena parte de la investigación pública sobre sistemas multiagente.

**Qué es:** framework para orquestar conversaciones entre múltiples agentes con roles/capacidades definidas — el modelo mental es "agentes que conversan entre sí para resolver una tarea," con soporte nativo para bucles de crítica/revisión entre agentes.

**Por qué entra en CTO:** es la contraparte de terceros más directamente comparable al `CollaborativeEngine` del socio (equipos con nombre, documentado en el clúster `Sistema-Orquestacion`) — útil como referencia de qué patrones de diseño ya son estándar en el ecosistema, sin que esto implique tocar el código del socio.

**Comparado con:** [[LangGraph]] (más control de bajo nivel sobre el flujo, curva de aprendizaje mayor) y [[Browser-Use]] (navegador-específico) — AutoGen es el más fuerte en patrones de "conversación entre agentes" (crítica, revisión, consenso); CrewAI (descartado aquí, con algo menos de estrellas) prioriza simplicidad de setup para equipos con roles fijos.

## Enlaces
[[00-CTO]]
