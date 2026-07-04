---
tags: [agente, "tema/cto", "nivel-2", candidato, candidato-lote-3]
dominio: cto
subdominio: Frameworks de agentes
capacidades: [orquesta, encadena, mantiene-estado, bifurca]
nivel_integracion: api-selfhosted
candidato_desde: 2026-07-06
comparado_con: ["[[Browser-Use]]", "[[CrewAI]]"]
fuente: censo GitHub (≥10k estrellas), categoría "Agentes de IA", langchain-ai/langgraph, 36.443⭐, Python
---

# LangGraph

**Repo:** [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) — 36.443⭐, Python, activo, mantenido por LangChain.

**Qué es:** framework para construir agentes como grafos de estado — cada nodo es un paso (llamar a un modelo, ejecutar una herramienta, esperar input humano), las aristas deciden el siguiente paso según el estado acumulado. Es el estándar de facto para flujos de agentes con bifurcaciones condicionales y bucles, no solo cadenas lineales.

**Por qué entra en CTO:** referencia técnica del panorama de frameworks de orquestación de agentes de terceros — comparable conceptualmente al `TaskGraph`/`CollaborativeEngine` que el socio ya construyó en `x1-core` (documentado en el clúster `Sistema-Orquestacion`), pero es software independiente de X1, no parte de su código.

**Comparado con:** [[Browser-Use]] (navegador-específico) y [[CrewAI]] (equipos de rol con menos control de bajo nivel sobre el flujo) — LangGraph es el más flexible mecánicamente, a costa de más código explícito por flujo.

## Enlaces
[[00-CTO]]
