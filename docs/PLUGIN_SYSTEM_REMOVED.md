# X1 — Bloque `x1PluginSystem` eliminado (2026-07-13)

> **Por qué:** El subdirectorio `plugins/` (con sus clases hook + registry) se borró completo el **2026-07-13**. En `background/service-worker.js` quedaban 5 reliquias silenciosas que instanciaban clases que ya no existían:
>
> - `var x1PluginSystem = {...}`
> - `function initializePluginSystem()` — lanzaba `new X1PluginHooks()` y `new X1PluginRegistry()`, ambas **nunca importadas**
> - `function executePluginHook(hookName, data)` — guard `if (!x1PluginSystem.hooks) return …` siempre disparaba early-exit
> - `function registerBuiltinPluginHooks()` — mismo guard, mismo early-exit
> - `registerHealthCheck("plugin_system", …)` — leía `x1PluginSystem.loaded` y `x1PluginSystem.registry` (siempre null)
>
> Un `try/catch` interno se tragaba el `ReferenceError` sin hacer ruido. El bloque entero era dead code que solo sobrevivía porque el catch absorbía el throw.

## Símbolos eliminados

| Símbolo | Línea pre-cleanup (background/service-worker.js) | Por qué muerto |
|---------|--------------------------------------------------|----------------|
| `var x1PluginSystem = { loaded, registry, hooks, activePlugins }` | L7283 | Solo lo consumía el bloque muerto |
| `function initializePluginSystem()` | L7291 | `new X1PluginHooks()` + `new X1PluginRegistry()` → ReferenceError |
| `function executePluginHook(hookName, data)` | L7306 | Depende de `x1PluginSystem.hooks` (siempre null) |
| `function registerBuiltinPluginHooks()` | L7314 | Igual — depende de `x1PluginSystem.hooks` |
| `registerHealthCheck("plugin_system", …)` | L13239 | Llamaba a `x1PluginSystem.loaded/registry` |

## Lo que sigue vivo (deliberadamente preservado)

| Nombre | Línea / Ruta | Por qué se preserva |
|--------|--------------|---------------------|
| `X1PluginEngine` | `background/plugins/engine.js` (cargado en `importScripts` L47) | Motor de plugins moderno — código independiente del bloque eliminado |
| `executePluginHooks` (PLURAL — distinto!) | `background/service-worker.js` L19699 | Tiene su propio `pluginHooks[]` array independiente |
| `pluginHooks` (array independiente) | `background/service-worker.js` L19699+ | Cola de callbacks inyectados dinámicamente por el engine |

> **Cuidado singular/plural:** `executePluginHook` (singular, eliminado) ≠ `executePluginHooks` (plural, vivo en L19699). Funciones distintas con firmas distintas. La plural ya no dependía de `x1PluginSystem` para nada, por eso sobrevivió.

## Cómo verificar que no quedan restos (grep anchors)

```bash
# Devuelve 0 hits (limpio) — corre desde Desktop/cbos-ext-backup-2026-07-07/:
grep -nE 'initializePluginSystem\(|executePluginHook\(|registerBuiltinPluginHooks\(' background/service-worker.js   # 0
grep -n 'plugin_system' background/service-worker.js                                                                # 0
grep -nE 'X1PluginHooks|X1PluginRegistry' background/service-worker.js                                              # 0
grep -rn 'x1PluginSystem' sidepanel-ui/ x1-extension/ tests/ docs/                                                   # 0 fuera de background/

# Devuelve 1 hit (auto-referencia en el breadcrumb del SW, esperado):
grep -n 'x1PluginSystem' background/service-worker.js                                                               # 1 (L del breadcrumb SW)

# Verifica que los vivos siguen activos:
grep -n 'executePluginHooks' background/service-worker.js                                                          # ≥1 (L19699+)
grep -n 'pluginHooks' background/service-worker.js                                                                # ≥1 (L19699+)
```

## Provenance de los números de línea

> Los anchors `L7283` (donde estaba `var x1PluginSystem = {...}`) y `L13239` (donde estaba `registerHealthCheck("plugin_system", …)`) están **confirmados** por dumps directos del cleanup turn + re-verificados con `grep -n` este mismo turn.
> 
> Los intra-bloque (`L7291` / `L7306` / `L7314` que apuntan a funciones individuales dentro del bloque eliminado) son **estimaciones del layout típico heredadas del cleanup turn** — NO están verificadas fresh. Para valores exactos del bloque eliminado: `git log --oneline -- background/service-worker.js`, identifica el commit inmediatamente anterior al cleanup del 2026-07-13, y haz checkout para grep directo.
> 
> La posición exacta importa poco porque el bloque entero está borrado — lo crítico es confirmar ZERO referencias en producción post-2026-07-13. Si encuentras hits a `x1PluginSystem` después de esa fecha, son código añadido post-cleanup (no reliquia).

## Métricas del cleanup

- **LOC neto removido:** ~36 (SW pasó de **22,075 → 22,039** líneas)
- **Funciones + objetos eliminados:** 5 (4 funciones + 1 var scope + 1 health-check)
- **Riesgo residual:** ninguno
- **Validación:** `node --check background/service-worker.js` OK · `tests/orchestrator/capability-shared.test.js` 20/20 OK

## Notas para el siguiente archeólogo

- Si te encuentras un grep hit a `x1PluginSystem` en producción después de este cleanup, es **nuevo código añadido post-2026-07-13** (no reliquia). El bloque histórico debe estar limpio.
- Si extrañas algún comportamiento de los hooks borrados, mira primero `background/plugins/engine.js` (la API moderna) y `executePluginHooks` en L19699 (los hooks que SÍ viven).
- La razón original por la que `plugins/` se borró el 2026-07-13 está documentada en `docs/HANDOFF.md` §10 y en los commits `cddd5ec / c8da7e8 / 466775b / c4a7cf3` del 2026-07-04 (fusión de los 26 bridges del partner) — no es contexto perdido, está en git.
