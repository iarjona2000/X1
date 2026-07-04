---
tags: [meta, diseno]
---

# Diseño de red — por qué está separado así

Instrucción explícita de Ivan (2026-07-03): "crea una red neuronal separada y conectada por temas, por ejemplo no juntes programación con marketing." Esto es una regla de diseño, no una sugerencia — se aplica a todo lo que se añada en el futuro.

**Actualización 2026-07-05:** los "temas" ahora son verticales de la jerarquía CEO (CFO, CMO, CLO, CHRO, CRO, COO, CTO, CPO, CEO) en vez de departamentos sueltos — la regla de aislamiento no cambia, solo cambian los nombres de los clústeres.

**Actualización 2026-07-06 (optimización de eficiencia, instrucción de Ivan):** cada carpeta vertical ahora lleva CEO **y** departamento/tema a la vez (`Agentes-CFO-Finanzas`, `Agentes-CMO-Marketing`...) para que el nombre de la carpeta comunique ambos niveles sin abrir la nota. Los documentos meta se agruparon en `Meta/` como su propio clúster (documentos, no agentes). Se añaden dos clústeres transversales nuevos, sin CEO porque no son verticales de agentes sino documentación del programa entero: `Sistema-Orquestacion/` (el Juez/Voting/Router/Pool/Ensemble del socio — solo notas descriptivas, cero código tocado) y `Codigo-Seguridad/` (arquitectura y seguridad de la extensión X1). Con esto el grafo de Obsidian representa el programa completo — agentes, orquestador y código — no solo el catálogo de agentes.

## Regla

Cada carpeta `Agentes-CEO-Departamento/` es un **clúster cerrado**: sus notas solo se enlazan entre sí y con su propia nota `00-X.md` (el hub / Map of Content de esa vertical). **Nunca** un agente de CMO-Marketing enlaza directamente a un agente de CLO-Legal, aunque compartan mecanismo de integración (MCP) o estén en la misma Fase. `Sistema-Orquestacion/` y `Codigo-Seguridad/` siguen la misma regla de aislamiento que un clúster de agentes — simplemente no llevan prefijo CEO porque no orquestan agentes propios, documentan una pieza transversal del programa.

La única excepción son los documentos **meta** (todo `Meta/*`, más `00-Indice` en la raíz) — esos SÍ enlazan a todos los temas, porque su función es precisamente ser el puente entre clústeres, no un tema en sí.

## Por qué importa (no es capricho)

Si todo enlaza con todo, el grafo de Obsidian se convierte en una bola de pelo donde no se distingue nada — pierdes exactamente la utilidad de tener un "cerebro" (ver de un vistazo qué está denso, qué está vacío, qué falta). Con clústeres separados, el grafo de Obsidian (Ctrl+G) muestra visualmente cada vertical + los dos transversales como islas conectadas solo por el centro (`00-Indice` y `Meta/`) — así se ve de un vistazo qué categoría tiene más agentes investigados, cuál está floja, y ahora también cómo encaja el propio sistema de orquestación y la base de código en el mismo mapa.

## Taxonomía de tags (para el panel de tags, complementa los enlaces)

Cada nota de agente lleva, además de su carpeta, un tag `tema/X` (una vertical CEO):

`tema/ceo` · `tema/cfo` · `tema/cmo` · `tema/clo` · `tema/chro` · `tema/cro` · `tema/coo` · `tema/cto` · `tema/cpo` · `tema/conectores` (transversal, no es una vertical)

Las notas de los dos clústeres nuevos no llevan `tema/*` (no son agentes de una vertical) — llevan en su lugar `sistema/orquestacion` o `sistema/codigo-seguridad`, para que el panel de tags distinga claramente "catálogo de agentes por tema" de "documentación del programa".

Más los tags transversales ya existentes (`agente`, `candidato`, `candidato-fase-1`, `candidato-fase-2`) que sí pueden repetirse entre temas — esos son propiedades del agente, no el tema en sí, y no rompen el aislamiento del grafo (los tags no dibujan líneas en el grafo por defecto, solo los enlaces `[[...]]` lo hacen).

## Cómo verificarlo tú mismo

Abre el vault en Obsidian → pulsa el icono de grafo (o Ctrl+G) → deberías ver las 9 verticales CEO-Departamento + Conectores + Sistema-Orquestacion + Codigo-Seguridad como grupos claramente separados, cada uno colgando de `00-Indice` y `Meta/`. Si ves una nota de un tema enlazada directamente dentro de otro clúster sin pasar por el índice, es un error — dímelo y lo corrijo.

## Enlaces
[[00-Indice]]
