---
tags: [meta, diseno]
---

# Diseño de red — por qué está separado así

Instrucción explícita de Ivan (2026-07-03): "crea una red neuronal separada y conectada por temas, por ejemplo no juntes programación con marketing." Esto es una regla de diseño, no una sugerencia — se aplica a todo lo que se añada en el futuro.

**Actualización 2026-07-05:** los "temas" ahora son verticales de la jerarquía CEO (CFO, CMO, CLO, CHRO, CRO, COO, CTO, CPO, CEO) en vez de departamentos sueltos — la regla de aislamiento no cambia, solo cambian los nombres de los clústeres.

## Regla

Cada carpeta `Agentes-X/` es un **clúster cerrado**: sus notas solo se enlazan entre sí y con su propia nota `00-X.md` (el hub / Map of Content de esa vertical CEO). **Nunca** un agente de CMO enlaza directamente a un agente de CLO, aunque compartan mecanismo de integración (MCP) o estén en la misma Fase.

La única excepción son los documentos **meta** (`00-Indice`, `01-Mecanismo-de-Integracion`, `02-Plan-de-Fases`, `03-Directorios-MCP`, este mismo) — esos SÍ enlazan a todos los temas, porque su función es precisamente ser el puente entre clústeres, no un tema en sí.

## Por qué importa (no es capricho)

Si todo enlaza con todo, el grafo de Obsidian se convierte en una bola de pelo donde no se distingue nada — pierdes exactamente la utilidad de tener un "cerebro" (ver de un vistazo qué está denso, qué está vacío, qué falta). Con clústeres separados, el grafo de Obsidian (Ctrl+G) muestra visualmente 8 islas conectadas solo por el centro — así se ve de un vistazo qué categoría tiene más agentes investigados y cuál está floja.

## Taxonomía de tags (para el panel de tags, complementa los enlaces)

Cada nota de agente lleva, además de su carpeta, un tag `tema/X`:

`tema/ceo` · `tema/cfo` · `tema/cmo` · `tema/clo` · `tema/chro` · `tema/cro` · `tema/coo` · `tema/cto` · `tema/cpo` · `tema/conectores` (transversal, no es una vertical)

Más los tags transversales ya existentes (`agente`, `candidato`, `candidato-fase-1`, `candidato-fase-2`) que sí pueden repetirse entre temas — esos son propiedades del agente, no el tema en sí, y no rompen el aislamiento del grafo (los tags no dibujan líneas en el grafo por defecto, solo los enlaces `[[...]]` lo hacen).

## Cómo verificarlo tú mismo

Abre el vault en Obsidian → pulsa el icono de grafo (o Ctrl+G) → deberías ver 8 grupos claramente separados, cada uno colgando de los 4-5 documentos meta del centro. Si ves una nota de un tema enlazada directamente dentro de otro clúster sin pasar por el índice, es un error — dímelo y lo corrijo.

## Enlaces
[[00-Indice]]
