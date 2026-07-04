---
tags: [meta, catalogo, orquestacion]
---

# Catálogo cerrado de clústeres — fuente de verdad para `validateManifest`

Extraído por inspección directa de la estructura real de `vault/` el 2026-07-06 (no inventado), para cumplir `PROMPT_CLAUDE_CODE_ORQUESTACION.md` §4: *"si ese documento no tiene hoy un catálogo explícito y cerrado, tu primera tarea de la Extensión A es extraerlo de los clústeres ya existentes en la bóveda por inspección directa"*.

**Terreno:** este documento vive en el territorio del socio (orquestación), no en el de Iván (catálogo de agentes) — es la pieza que la cascada de resolución necesita para validar `cluster` en cada manifest. No reestructura ni renombra ninguna carpeta de Iván.

## Regla de generación

Un clúster = una carpeta `Agentes-*/` con notas de agente reales (excluye carpetas puramente documentales). El `id` de clúster usado por el código es el slug en minúsculas del nombre de carpeta sin el prefijo `Agentes-`.

## Catálogo

| id (código) | Carpeta | Vertical CEO | Tags `tema/*` observados en sus notas | Nº notas (incl. hub) |
|---|---|---|---|---|
| `ceo-estrategia` | `Agentes-CEO-Estrategia` | CEO | `ceo`, `research` | 10 |
| `cfo-finanzas` | `Agentes-CFO-Finanzas` | CFO | `cfo`, `finanzas` | 7 |
| `cmo-marketing` | `Agentes-CMO-Marketing` | CMO | `cmo` | 4 |
| `clo-legal` | `Agentes-CLO-Legal` | CLO | `clo`, `legal` | 4 |
| `chro-rrhh` | `Agentes-CHRO-RRHH` | CHRO | `chro`, `rrhh` | 5 |
| `cro-ventas` | `Agentes-CRO-Ventas` | CRO | `cro` | 1 (solo hub — la integración real vive en código, Pipedrive/HubSpot, no como notas) |
| `coo-operaciones` | `Agentes-COO-Operaciones` | COO | `coo`, `cadena-suministro` | 9 |
| `cto-tecnico` | `Agentes-CTO-Tecnico` | CTO | `cto` | 18 |
| `cpo-producto` | `Agentes-CPO-Producto` | CPO | `cpo` | 1 (solo hub, vertical vacía — ver `Meta/06-Plan-de-Expansion-Masiva.md`) |
| `conectores` | `Agentes-Conectores` | — (transversal, sin CEO) | `conectores` | 63 |

**Total notas de agente candidatas a manifest**: 122 (137 notas totales en `vault/` menos las de `Meta/`, `Sistema-Orquestacion/`, `Codigo-Seguridad/` y los 10 hubs `00-*.md`, que no son agentes).

## Excluidos del catálogo de clústeres de agentes (documentación, no candidatos)

- `Meta/` — documentos de doctrina (`00-Indice`, `01` a `06`)
- `Sistema-Orquestacion/` — mapa de documentación del propio orquestador (terreno del socio), no contiene agentes candidatos
- `Codigo-Seguridad/` — arquitectura y seguridad de la extensión X1, no contiene agentes candidatos

Si `stage0_tagFilter`/`stage1_clusterFilter` encuentran una nota fuera de estas 10 carpetas, se trata como nota huérfana: se excluye con warning, igual que una nota con manifest inválido (regla de robustez de la sección 4 del spec).

## Discrepancia observada (no corregida aquí, solo documentada)

Las notas etiquetan `tema/<rol-CEO>` (p. ej. `tema/cfo`) o `tema/<tópico>` (p. ej. `tema/finanzas`) de forma inconsistente — algunos clústeres solo llevan el tag de rol (`cmo`, `cro`, `cto`, `cpo`), otros solo el de tópico serían redundantes si ambos se usaran a la vez. Para `stage0_tagFilter`, ambas formas deben tratarse como sinónimos del mismo clúster (ver mapeo de la tabla de arriba) — no se le pide a Iván que re-etiquete con disciplina retroactiva por esto, es responsabilidad del código de resolución tolerar la variación real de la bóveda.

## Enlaces
[[00-Indice]] · [[Meta/04-Diseno-de-Red]] · [[Meta/06-Plan-de-Expansion-Masiva]]
