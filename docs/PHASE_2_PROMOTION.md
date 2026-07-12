# PHASE 2 PROMOTION — Plan para llegar a 'compite con Claude Code'

> **STATUS**: Aprobado por Tomas (2026-07-07) — opcion B del milestone gate. Arquitectura validada por thinker-with-files-gemini. Pendiente: implementacion.

## Objetivo

Convertir el **autopiloto preview-beta** (Phase 1) en una **herramienta capaz de competir con Claude Code** ejecutando codigo localmente, con feedback loop REAL, tests unitarios del REPL, watchdog de horas-entera y visibilidad multi-file. **6 sesiones** de trabajo condensado (~12-24h profundo).

## Decisiones de arquitectura (thinker 2026-07-07)

### Pillar 1 — LOCAL EXECUTION (el gap mas grande)

- **Choice: v86 WASM** (no child_process via offscreen, no Playwright, no pure AST).
- **Donde vive**: `offscreen/keepalive.html` (offscreen doc, sobrevive MV3 SW termination). Necesita `SharedArrayBuffer` con COOP/COEP headers, o fallback a TypedArray (mas lento pero garantizado).
- **Que deprecamos**: `background/sandbox/repl-iframe.html` (sandboxed iframe eval). v86 es el reemplazo real.
- **Iteracion**: "Write to virtual FS" → "Spawn `node --test`" → "Return stdout/stderr".
- **Estimacion**: **2 sesiones** (1: WASM worker boot + Linux fs, 2: Virtual FS shim + SW IPC bridge).

### Pillar 2 — MULTI-FILE BUNDLING

- **Choice: `esbuild-wasm`** (live WASM bundler, ~100KB; maneja TS/JSX; bundles in-memory instantaneo).
- **Donde vive**: nuevo modulo `background/sandbox/bundler.js`. Importable via `importScripts('sandbox/bundler.js')`.
- **Integracion**: bundle de la propuesta multi-file en un solo artefacto CJS, escribir al virtual FS de v86, ejecutar.

### Pillar 3 — WATCHDOG (visibility de horas-entera)

- **Choice**: dentro de `background/orchestrator/keep-alive.js` (no fragmentar orchestration).
- **Milestones a notificar** via `chrome.notifications.create`:
  - >5 PRs/hora (suspect runaway)
  - Consecutive crash loops (3x fail en <30 min)
  - API quota >90%
  - Autopiloto pausado reactivado por usuario
  - Auto-cycle completes exitosamente (cada ~25 min)
- **Estimacion**: **1 sesion**.

### Pillar 4 — TESTS UNITARIOS

- **Strategy**: `node --test` directo (mock `chrome.*` global). NO Puppeteer para module logic.
- **Coverage target**: `repl-runner.js` + `dependency-resolver.js` (~20 tests, ~100ms runtime).
- **Por que no extension-tests**: Playwright Chrome Extension es flaky, breaks on updates, 100MB+ infra para 5% ROI.
- **Estimacion**: **1 sesion**.

### Pillar 5 — E2E

- **Strategy**: 5-minute manual smoke tests (los 5 descritos en HANDOFF.md PHASE 1 STATUS). Sin Playwright.
- **Por que**: extension E2E tiene 0% ROI hasta tener core engine estable (Phase 2 pilares 1-3 completos).

## SEQUENCING (6 sesiones)

```
Sesion 1   DERISK   v86 WASM engine + Node boot              [Pillar 1a]
                          └─ si falla: fallback a AST-only, modo `node`-lite
Sesion 2   STAB     Virtual FS bridge + `node --test` loop     [Pillar 1b]
                          └─ gate: al menos 1 test simple pasa en v86
Sesion 3   STAB     esbuild-wasm bundle integration           [Pillar 2]
                          └─ gate: bundle + run completo en REPL
Sesion 4   STAB     Tests unitarios (node --test)              [Pillar 4]
                          └─ gate: 20 tests verdes, <200ms
Sesion 5   POLISH   Watchdog + chrome.notifications            [Pillar 3]
                          └─ gate: 5 milestones disparando notifications reales
Sesion 6   PROMOTE  Smoke test Phase 2 manual                 [Pillar 5]
                          └─ gate: los 5 tests pasan, listo para marketing 'compite con Claude Code'
                          └─ DECISION: ¿promover a Phase 3 (extras: GPT-4 integration, GUI desktop)?
```

## ESTIMACION TOTAL

| Pillar | Sesiones | Horas condensadas |
|--------|----------|-------------------|
| Pillar 1 (v86 + fs + bridge) | 2 | 4-8h |
| Pillar 2 (esbuild) | 1 | 2-4h |
| Pillar 4 (unit tests) | 1 | 2-4h |
| Pillar 3 (watchdog) | 1 | 2-4h |
| Pillar 5 (e2e smoke) | 1 | 0.5-1h |
| **TOTAL** | **6** | **10-21h** |

## RISKS + FAIL-OPEN

### Risk 1 — v86 memory/CSP limits

Chrome offscreen docs pueden ser matados silentemente si exceden heuristicas de memoria. v86+Node requiere ~150MB RAM.

- **Fail-open**: mantener `repl-iframe.html` (eval-only) intacto. Si v86 no bootea en Sesion 1, fallback automatico al modo AST-only del Phase 1.
- **Deteccion**: `try { bootV86(); } catch { bootASTMode(); };` en init de `v86-bridge.js`.

### Risk 2 — Cross-Origin Isolation (SharedArrayBuffer)

v86 high-performance mode requiere COOP/COEP headers (no disponibles en extension manifests).

- **Fail-open**: usar v86 build sin SharedArrayBuffer (mas lento pero funciona). Reduce ~30% performance de `node --test` pero no bloquea la ejecucion.

### Risk 3 — `npm install` en red v86

v86's networking stack en browser es limitado. `npm install` real probablemente falla o dropea paquetes.

- **Fail-open**: usar **esbuild-wasm para bundlear dependencias desde `esm.sh` o `unpkg` ANTES de ejecutar en v86**. Bypass completo de `npm` — resuelve los missing deps ANTES de meter el codigo a v86.

### Risk 4 — Bundle size creep

v86 (~2MB WASM) + esbuild-wasm (~100KB) + esm.sh fetches + virtual FS ~ +5-10MB total. Manifest eventualmente llega a 8MB+. Chrome puede poner la extension bajo `PENDING` en chrome://extensions.

- **Mitigacion**: cargar v86 lazy (only when validating a code proposal, not at idle). Compression via `Content-Encoding` en el bundle.
- **Decision**: empezar sin optimizacion premature. Bundle size es feature flag for Phase 3.

### Risk 5 — Hand-off knowledge of execution semantics

El usuario (Tomas) necesita saber que ahora `node --test` corre REAL en el navegador. Documentar esto prominentemente para no pensar que es magic — es emulation.

- **Mitigacion**: poner una disclaimer al inicio de cada emit cuando la validation corre en v86: `'ejecutando en Node virtual (v86 WASM, no es un Node real)'`.

## DEPENDENCIES (lo que necesita antes de empezar)

1. **v86 binaries**: descargar de https://github.com/copy/v86/releases el `nodejs-vXX-linux-v86.wasm` (compatible con webpack/rollup). Licencia: MIT. ~1.5MB binario.
2. **esbuild-wasm**: `npm i esbuild-wasm` o vendoring directo. Licencia: MIT.
3. **Service Worker permissions**: `chrome.notifications` requiere declaracion en manifest. Ya esta (tested).
4. **Cross-Origin Isolation**: si va con SharedArrayBuffer mode, revisar `web_accessible_resources` y host_permissions.

## ARCHITECTURE OVERVIEW (final)

```
proposeChanges (sidepanel-ui/src/github-agent.js)
    ↓ {type: 'X1_SANDBOX_VALIDATE', files: [...]}
X1_SANDBOX_VALIDATE (background/service-worker.js)
    ↓ X1SandboxREPL.validateFiles(...)
background/sandbox/bundler.js [Phase 2 NEW: esbuild-wasm]
    ↓ bundle proposal to single CJS
background/sandbox/v86-bridge.js [Phase 2 NEW: v86 WASM]
    ↓ boot node18-linux-v86.bin with virtual FS
offscreen/keepalive.html hosts v86 iframe + boots the WASM
    ↓ return stdout/stderr of node --test
X1DependencyResolver.analyzeFiles [Phase 1: static]
    ↓ ok? proceed to publish / feedback loop continue
```

## VALIDATION GATE (end of Phase 2)

Antes de promover a marketing:

- [ ] 6 sesiones completadas (calendar Tomas check)
- [ ] 20+ unit tests verdes
- [ ] Smoke test adversario PASA (`require('paquete-no-existe')` detectado y corregido por Sector Desarrollor en iter 2)
- [ ] Smoke test 30min autopiloto PASA (SW sigue vivo, PRs publicados correctamente, notifications reparadas)
- [ ] Bundle size < 8MB (manifest acceptable)
- [ ] `docs/PHASE_3_PROMOTION.md` esbozado (siguiente nivel: GUI desktop, multi-repo coordination)

## NOT SHIPPING THIS SESSION

Phase 2 = plan only esta sesion. Implementacion arranca Sesion 1 (cuando vos dispongas). Cualquier cambio de arquitectura deberia re-validarse con un nuevo thinker.

## REFERENCES

- HANDOFF.md PHASE 1 STATUS — definicion de gaps
- HANDOFF.md Keep-Alive MV3 — base del watchdog
- HANDOFF.md Feedback loop iterativo — pipeline que valida v86 output
- v86: https://github.com/copy/v86 (MIT, soporta Node 18 via `node18-linux-v86.wasm`)
- esbuild-wasm: https://esbuild.github.io/getting-started/#bundling-for-the-web (MIT)
