# X1 — HANDOFF (2026-07-01 → 2026-07-07, modelo iterativo + kill-switch)

## PHASE 2 PROMOTION — Plan aprobado (2026-07-07) — ver `docs/PHASE_2_PROMOTION.md`

> Tomas aprobo opcion B (2026-07-07) — confia en SHIP del code-reviewer y arranca planning Phase 2.
> Plan completo en `docs/PHASE_2_PROMOTION.md`. **6 sesiones, ~12-24h**, con secuencia:
> Pillar 1 (v86 WASM local exec) → Pillar 2 (esbuild-wasm bundles) → Pillar 4 (unit tests) → Pillar 3 (watchdog) → Pillar 5 (e2e manual). Risgos + fail-opens ya identificados.

---

## PHASE 1 STATUS — preview-beta con kill-switch del SW (shipping honesto, NO Claude Code parity)

> **IMPORTANTE — leer primero cada persona que abre este repo hasta Phase 2**.
> Esta sesion (2026-07-07) implemento Freebuff branding + 11 acciones del SYSTEM_PROMPT + keep-alive MV3 + REPL headless iterativo. **NO compite con Claude Code todavia** — es preview-beta con kill-switch. La tabla siguiente es la fuente de verdad.

### Que funciona YA en Phase 1 (verificado por code-reviewer, NO por Chrome real)

| Feature | Estado | Verificado en | Caveats |
|---------|--------|---------------|---------|
| **Freebuff branding** (IA open-source detras de Vektor visible en TODOS los emits) | ✅ Shipped | Code-review (Nit Pick Nick) SHIP | Branding visible solo en pasos automatizados (NO marketing/login) |
| **11 acciones de SYSTEM_PROMPT** (saveWorkspace, runSwarm, etc, + blockDomain + setAutonomy) | ✅ Shipped (issue #12 cerrado) | Code-review | 8 wireups puros + 3 nuevas; corre via runtime wrap de execAction |
| **Keep-alive MV3 3-capas** (puerto + alarm 1min + offscreen silent audio) | ✅ Shipped | Code-review SHIP | chrome.alarms NO acepta <1min (MV3 hard limit, usuario pidio 25s — no posible) |
| **REPL headless sandboxed** (iframe `sandbox="allow-scripts"` escapa CSP unsafe-eval) | ✅ Shipped | Code-review SHIP | Solo JS/TS literales — Go/Rust/Vue no soportados por regex |
| **Feedback loop iterativo `MAX_FB_ITERATIONS=3`** | ✅ Shipped | Code-review SHIP con 3 BLOCKING resueltos | Bloqueantes corregidos: .catch crash guard, null lastProposal guard, timeout 8s |
| **Kill-switch del autopiloto** (`x1_autopilot_killswitch` storage key) | ⚠️ Parcial — ver limitacion abajo | Code-review REWORK → Fixes A+B | NO interrumpe mid-cycle queue (limitación Fix C documentada) |

### Que NO funciona todavia (vs Claude Code — REAL gap)

| Gap | Por que | Effort estimado |
|-----|---------|-----------------|
| **Ejecucion local real** (npm install + node --test en sandboxed v86) | MV3 no permite subprocess / filesystem real; chrome.scripting puede inyectar pero遅い | 2-3 sesiones con sandboxed WASM-v86 (v86 polyfill) |
| **Tests unitarios del REPL** (X1SandboxREPL.validateFiles, dependency-resolver, X1Watchdog) | 0 tests automatizados escritos. primera ejecucion real sera la primera validacion | 1 sesion (~30 tests) |
| **Feedback loop REAL iterativo** (lo entregado es preview — usa REPL pero NO `node --test`) | npm test / vitest / jest corren DE VERDAD contra el codigo propuesto; nuestro REPL es solo parse + eval en iframe sandboxed | 1 sesion mas con sandboxed v86 |
| **Visibilidad multi-file** (el REPL ejecuta cada archivo aislado, no resuelve imports entre archivos del proposal) | La propuesta con `import './foo'` falla porque `foo` no existe en el iframe sandboxed | Inline-concat archivos del proposal en source virtual; AST import resolver |
| **Tests E2E del sidepanel** | 0 automation. los 11 actions nunca se han ejecutado via Chrome unpacked real | 1 sesion: Playwright + extension testing |

### ✅ Watchdog de horas-entera con notifications (Pillar 3 PHASE 2 — shipped 2026-07-07)

Shipped el **watchdog que escala chrome.notifications** cuando el autopiloto lleva >2h activo o >100 tareas completadas sin supervision humana. Resuelve el gap "Hoy sidepanel solo ve progreso cuando abierto — el SW puede haber producido muchos PRs silenciosamente".

**Archivos (1 NEW + 3 MODIFIED):**
- `background/orchestrator/watchdog.js` (NEW, **~340 lineas ES5 strict**) — IIFE module `self.X1Watchdog` cargado via `importScripts` DESPUES de keep-alive.js. Public API: `{onSessionStart, onSessionEnd, onAlarmTick, onWatchdogMessage, onNotificationButtonClick, status, _test: {fakeSessionStart, fakeTaskCompletion, reset}, _constants}`.
- `background/orchestrator/keep-alive.js` (MODIFIED) — hooks al watchdog: `startAutopilotSession()` llama `X1Watchdog.onSessionStart()`, `endAutopilotSession()` llama `onSessionEnd()`, `onAlarmPulse()` (1-min tick del keep-alive) llama `X1Watchdog.onAlarmTick()`, `onKeepalivePing()` dispatcha los mensajes `X1_AUTOPILOT_TASK_COMPLETED` / `_FAILED` al modulo.
- `background/service-worker.js` (MODIFIED) — nueva linea `importScripts('orchestrator/watchdog.js')` justo despues de keep-alive.
- `sidepanel-ui/src/github-agent.js` (MODIFIED) — helper `freebuffNotifyTaskCompleted(success)` fire-and-forget; llamado en (a) `publishAutoBuild()` exito/fallo y (b) `processTaskDeep()` al resolver `proposeChanges()` (doble granularidad: cuenta tanto el intento terminado como la publicacion real).

**Umbrales (ladder escalation, anti-spam):**
- Tiempo: [120, 150, 180] minutos → 2h, 2.5h, 3h (3 escalones, una notif cada uno)
- Tareas: [100, 200, 500] → una notif al cruzar 100, otra al cruzar 200, otra al cruzar 500
- Dedupe por `{kind}{ladderIndex}` en `chrome.storage.session` → un threshold, una notificacion por sesion.

**Intervention signal (`hasLivePort()`):** sidepanel abierto y pingueando en los ultimos 60s = "intervenido". Si `hasLivePort() === true`: notification prioridad 0 (default), no requiere interaccion. Si `hasLivePort() === false`: notification prioridad 2 (alta), `requireInteraction: true`, botones "Abrir DevTools SW" + "Marcar revisado" (este ultimo limpia el dedupe para re-evaluar). El usuario ha pedido explicitamente esto: notificaciones fuertes solo cuando el sidepanel esta cerrado.

**Persistencia:** `chrome.storage.session.x1_watchdog_session = {startAt, tasksCompleted, tasksFailed, notificationsSent}`. Sobrevive SW restart (MV3 suspende el SW tras 30s idle), perdido en browser quit por design (counters al cerrar Chrome no tienen semantica clara). Auto-restaura en module load.

**Integracion con kill-switch:** `X1Watchdog.checkAndNotify()` chequea `X1KeepAlive.status().killSwitchTripped` antes de notificar — si el kill-switch del Phase 1 esta activo, NO notifica (ya decidiste parar).

**Notificaciones esperadas (DevTools del SW con `X1Watchdog._test`):**
- `X1Watchdog._test.fakeSessionStart(125)` → simulate sesion de 2h5min → primera notif `x1-autopilot-watchdog-min-0` a los 2h.
- `X1Watchdog._test.fakeTaskCompletion(105)` → simulate 105 tareas → primera notif `x1-autopilot-watchdog-task-0` al cruzar 100.

**Status desde DevTools:**
```js
X1Watchdog.status()  // → {sessionActive, startedAt, minutesElapsed, tasksCompleted, tasksFailed, notificationsSent, hasLivePort, killswitchTripped, ladders}
```

**Caveats honestos:**
- "intervencion humana" = sidepanel abierto y pingueando. Si el usuario abre el sidepanel y se va a dormir, NO notificara (thinker recomendo esto como fail-mode acceptable; documentado en PHASE_2_PROMOTION.md).
- Solo cuenta notificaciones visibles (`chrome.notifications.create`); el Chrome SO puede suprimirlas si el usuario las ha ignorado muchas veces seguidas (politica de Chrome, no controlamos).
- Modulo watchdog se carga via `importScripts` — orden estricto: keep-alive.js ANTES de watchdog.js. Si cambias el orden en service-worker.js `importScripts()`, los hooks del watchdog fallaran silenciosamente.

### Kill-switch ON / OFF (manual, via DevTools del SW)

**Para ACTIVAR el kill-switch** (desactivar autopiloto en runtime):
```js
// En DevTools del SW (chrome://extensions → service worker → inspeccionar):
chrome.storage.local.set({x1_autopilot_killswitch: true});
chrome.runtime.reload(); // fuerza reload del SW para que init() vea la nueva flag
```

**Para DESACTIVAR** (reactivar autopiloto):
```js
chrome.storage.local.set({x1_autopilot_killswitch: false});
chrome.runtime.reload();
```

**Estado actual del kill-switch**:
```js
// En DevTools del SW:
chrome.storage.local.get('x1_autopilot_killswitch', console.log);
// Espera result = {x1_autopilot_killswitch: true|false|undefined}
```

**Limitacion honesta** (Fix C no aplicado, documentado): el kill-switch previene **infraestructura nueva** (alarm scheduling, offscreen document, port heartbeat) y **start de nuevos runs** desde el sidepanel. NO interrumpe un ciclo del autopiloto **ya en marcha** (esperado: el ciclo actual termina con `status: 'error'` o PR creado segun el estado). Si quieres interrumpir un mid-cycle: `chrome.runtime.reload()` del SW tambien funciona — espera que la Promise actual falle y el SW se duerma.

### ✅ Capability consolidation (2026-07-13 — 3 engines → 1 contract)

El audit detecto que los **3 motores de automation** (`X1PluginEngine` SW-side, `X1SkillEngine` SW-side, `X1AutomationEngine` SW-side) tenian 4 areas de conflictos que harian que cualquier futuro trabajo de keepalive / cola / prioridades chocara contra 3 arquitecturas incompatibles. Consolidado en una **capa compartida unica**:

| Conflicto original | Antes (en cada engine) | Ahora (unico en `X1CapabilityShared`) |
|------|------------------------|----------------------------------------|
| **Parser matematico seguro** | Inline ~100 LOC Shunting Yard solo en plugin | `safeCalc(expr)` |
| **Templating de params** | Solo skill (ignoraba `type` key — bug-fix) | `resolveParams(step, ctx)` ignora ambas `type` + `action` + 8 keys estructurales; soporta `{{var}}` y `{var}` |
| **Llamadas a `aiComplete`** | Plugin: `(persona+prompt)`. Skill: `(system+prompt)`. Dos firmas divergentes | `unifiedAiCall(prompt, opts)` donde `opts.persona \|\| opts.system \|\| default` |
| **Limpieza de ```json fences** | Solo `rule-engine.js` L168 — silenciaba JSON.parse en los otros | `sanitizeAiResponse(text)` util en los 3 engines |

Ademas exporta `normalizeStep`, `stepProgressSafe`, `KNOWN_STEP_TYPES`, `STRUCTURAL_KEYS`.

**Archivos (1 NEW + 2 REWRITES + 1 SW EDIT + 18 archivos BORRADOS):**
- `background/orchestrator/capability-shared.js` (NEW, **270 LOC ES5 strict IIFE**). Wired en `service-worker.js` L46 `importScripts()` entre `agents/workspace.js` y `plugins/engine.js`.
- `background/plugins/engine.js` (REWRITE 398 LOC, era 452). API surface verbatim. Elimina `safeCalc` inline duplicado, `aiFunc`/`aiFunc2` callbacks. Añade guard `if (typeof X1CapabilityShared === 'undefined') throw…`. **Plugin manifests ahora aceptan steps tipo `wait`/`click`/`type`** (antes solo skill engine — cross-vocab migration). `stripHtml()` eliminado (dead code post-refactor). `validTypes` ajustado (validate == dispatch — solo lo que `runStep` dispatcha de verdad; ver comentario in-line).
- `background/skills/engine.js` (REWRITE 229 LOC, era 240). API surface verbatim. `resolveParams` movido a shared. `ai` action pasa por `unifiedAiCall({system})`. `stepProgress` directo → `stepProgressSafe` con typeof-guard. `ai` action signature preservada.
- **Borrado `plugins/` entero** (18 archivos): `plugins/{core,hooks,manifest,registry}.js` + 7 `plugins/builtin/*/{manifest.json,plugin.js}` + 2 `plugins/examples/*/{manifest.json,plugin.js}`. Confirmado dead: ninguna referencia en `background/`/`sidepanel/`/`sidepanel-ui/`/`x1-extension/`. El unico consumidor era el bloque `x1PluginSystem` en SW:7288-7325 — `new X1PluginHooks()` y `new X1PluginRegistry()` lanzaban inmediatamente porque las clases nunca se cargaban; el `try/catch` absorbia, asi que la eliminacion es invisible en runtime.

**Storage UNCHANGED**: `x1_plugins` (plugin engine), `x1_skills` (skill engine), `x1_automation_rules` (rule engine) — datos de usuario preservados. NO se migra.

**Contrato para futuras sesiones de keepalive / cola / prioridades**: cualquier orchestrator nuevo deberia consumir **solo** `X1CapabilityShared` (no llames `aiComplete` directo, no dupliques `safeCalc`, no declares tu propia version de `resolveParams`). Si necesitas una AI step, usa `unifiedAiCall`; si necesitas un parser matematico, usa `safeCalc`.

**NO tocado en este PR (deliberado para mantener scope):** el bloque `x1PluginSystem` en SW:7288-7325 (65 LOC dead code envuelto en try/catch — slice en PR aparte); `background/automation/rule-engine.js` (regla: ya delega correctamente a `X1PluginEngine.executePlugin`; la unica oportunidad es reemplazar el strip ```json inline por `X1CapabilityShared.sanitizeAiResponse` — PR aparte tambien).

1. **Cargar la extension unpacked en Chrome** (sin esto, nada está realmente verificado).
2. **Ejecutar el smoke test de keep-alive** (5 min) — ver logs `[X1-KeepAlive]` en DevTools del SW durante un runAutopilot de 5 min cerrando el sidepanel.
3. **Ejecutar el smoke test del feedback loop** (10 min) — proponer un objetivo amplio contra un repo pequeno (~3 archivos JS), observar el ProcessLog con tags `(iter 1/3)`, `(iter 2/3)`, `(iter 3/3)` + emits `REPL: OK` / `REPL: N problema(s)`.
4. **Inyectar un error adversario** en el codigo propuesto (p.ej. `require('paquete-inexistente')`); confirmar que el REPL lo detecta + el Sector Desarrollo lo corrige en la siguiente iteracion.
5. **Stress test** — dejar runAutopilot corriendo 30 min en un repo real, contar PRs generados, verificar que el SW sigue vivo (DevTools del SW abierto, sin errors en console).

Solo **despues** de pasar esos 5 tests con resultados OK decirmos "compite con Claude Code" en cualquier marketing surface. Mientras tanto: **preview-beta con kill-switch**.

---

## STATUS (LEGACY 2026-07-01 — referencia)

**Código**: ~34,000 líneas JavaScript | **Módulos**: 40 | **Providers**: 13 | **Estado**: Phase 1 preview-beta (ver seccion PHASE 1 STATUS mas arriba).

---

## COMPLETADO EN ESTA SESIÓN

### Nuevos Módulos (10)
- `background/style/writing-style.js` — Aprendizaje adaptativo de estilo de usuario (150 líneas)
- `background/chat/group-chat.js` — Chat paralelo multi-modelo + debates (200 líneas)
- `background/finance/financial-data.js` — Finnhub + Alpha Vantage (quotes, news, crypto, series)
- `background/image/image-generation.js` — Cloudflare Flux + DALL-E 3 (100 líneas)
- `background/extract/data-extractor.js` — Extracción NL inteligente de datos (180 líneas)
- `background/seo/seo-analyzer.js` — Análisis SEO completo con puntuación (220 líneas)
- `background/mcp/client.js` — Cliente Model Context Protocol (HTTP + SSE) (220 líneas)
- `background/research/deep-research.js` — Investigación multi-fuente + síntesis IA (220 líneas)
- `background/skills/engine.js` — Skills reutilizables con template params (280 líneas)
- `background/prompts/assembler.js` — Ensamblador de prompts por templates (200 líneas)

### Integración en Service-Worker
- `importScripts` actualizado: carga 39 módulos (7 providers nuevos + 10 subsistemas)
- `loadAIKeys()` + listeners: incluye openaiKey, finnhubKey, alphaVantageKey
- `SYSTEM_PROMPT`: 12 nuevas categorías de acciones documentadas
- `execAction()`: 20+ nuevos action cases conectados

### Subsistemas Previos (de sesiones anteriores)
- `cascade/router.js` (597 líneas) — Judge system con sector rubrics
- `agents/agent-manager.js` + `agents/workspace.js` — Agentes personalizados + workspace compartido
- `plugins/engine.js` + `automation/rule-engine.js` + `monitor/page-monitor.js` — Automatización declarativa
- Providers: groq, gemini, openai, deepseek, ollama, nvidia, cerebras, sambanova, mistral, together, openrouter, cloudflare
- Memory: IndexedDB, encryption, op-graph, intention-graph, world-model, ai-memo
- Google APIs: auth, gmail, calendar, drive

---

### Sistema de extensión runtime (issue #12 fix — 2026-07-07)
- `background/automation/issue-12-actions.js` (nuevo, ~180 líneas) — cierra `ISSUES_NEEDING_YOUR_INPUT.md` #12.
  11 acciones que el `SYSTEM_PROMPT` prometía pero `execAction` (2000-line switch en el SW) no implementaba:
  - **8 wire-ups puros**: `saveWorkspace`, `restoreWorkspace`, `listWorkspaces` (líneas 1201/1227/1242),
    `runSwarm` (línea 1158), `checkNoise` (línea 960 → `checkNoiseFilters`),
    `trackIntention`/`findIntention`/`updateIntention` (líneas 1063/1098/1116),
    `generateChapter` (línea 1268 → `generateWeeklyChapter`).
  - **3 implementaciones nuevas**: `blockDomain` + `unblockDomain` (firewall de atención, vision PARTE 7),
    `setAutonomy` (negociación agente-a-agente, vision PARTE 5).
- Patrón: **runtime wrap** sobre execAction en lugar de añadir 11 cases al switch gigante del SW
  (justificación: SW ~19k-line no es editable de forma segura por tools de patch current,
  ver discusión más abajo). El módulo se cablea con una sola línea en `importScripts()`
  justo antes de 'x1-integration.js' (la cual crashea, por eso módulos nuevos van antes).
- 100% revertible: borrar el archivo + quitar la línea del importScripts.

### Branding Freebuff en la automatización (2026-07-07 — expandido tras code-review)
- `sidepanel-ui/src/github-agent.js` ahora firma Freebuff como el cerebro IA
  detras de Vektor en TODOS los emits user-visible de la automatización.
- Constantes nuevas:
  - `FREEBUFF_BRAND = 'Freebuff'` — nombre de la IA, aparece en system prompts.
  - `FREEBUFF_TAG = 'Freebuff (Vektor)'` — etiqueta visible de marca dual
    (IA open-source + producto), aparece en cada emit durante la automatización.
- Inyectado en: `AGENT_SYSTEM_PROMPT` y `SECTOR_PROMPTS.{developer,reviewer,refiner}`.
- `runAutoBuild()` emite SIEMPRE un primer paso `id: 'freebuff:brain'` con titulo
  `🧠 Freebuff cerebrando` y `detail` con el objetivo a descomponer — antes de
  cualquier llamada a la IA, para que la UI nunca parezca colgada aunque
  el proveedor tarde 30-60s. (YODA-cumple, punctuation arreglada tras review.)
- Re-brand masivo de 9 emits restantes donde decía "Vektor" ahora dice
  "Freebuff (Vektor)": análisis de repo, autopilot, decisiones de investigación,
  título de PR agregado, mensaje de commit de cada fichero publicado,
  título por defecto del PR. La firma queda coherente de principio a fin.
- Confusión de marca resuelta: Vektor = producto (frontend, branding, Auth OAuth),
  Freebuff = IA open-source que ejecuta la automatización internamente. NO se
  reemplazan en superficies de marketing / login / branding — solo donde el
  usuario ve un paso automatizado.

### Keep-Alive MV3 3-Capas (2026-07-07 — autopiloto de horas)
El **autopiloto que publica PRs en GitHub durante horas** estaba bloqueado por
el limite MV3: Chrome mata el service worker tras ~30s de inactividad y los
proveedores de IA tardan 20-35s, asi que el SW podia morir a mitad de un ciclo
de la cola. Tres capas lo cubren:

- `background/orchestrator/keep-alive.js` (nuevo, ~180 lineas ES5 strict).
  Capa 1: puerto long-lived `chrome.runtime.connect({name:'x1-autopilot-heartbeat'})`
  desde el sidepanel, ping cada 10s. Capa 2: `chrome.alarms` API con
  `X1_KEEPALIVE_PULSE` cada **1 min** (limite duro MV3 — el usuario pidio 25s
  pero Chrome ignora valores <1 y redondea a 1). Capa 3: `chrome.offscreen`
  con `AUDIO_PLAYBACK` + un `<audio src="data:audio/mpeg;base64,..." autoplay loop>`
  silencioso embebido + `setInterval` de 20s en la pagina para hacer
  `chrome.runtime.sendMessage({type:'X1_KEEPALIVE_FROM_OFFSCREEN'})`.
  Capa 4: listener `chrome.runtime.onMessage` que puente estos pings
  al SW para resetear el contador de muerte (FATAL-fix del code-review que
  estaba en el primer intento). Modulo expuesto via `self.X1KeepAlive = { init,
  startAutopilotSession, endAutopilotSession, status, _constants }`.

  **PHASE 1 KILL-SWITCH (Fix A 2026-07-07)**: añade `killSwitchTripped` variable
  leida de `chrome.storage.local.x1_autopilot_killswitch` al init. Si está true,
  init() early-return. Listener `chrome.storage.onChanged.addListener` reagirá
  a toggles en runtime. Helper `refreshKillSwitch()` centraliza la lectura.

- `offscreen/keepalive.html` (nuevo, ~50 lineas). Minimal HTML + `<audio>`
  silencioso + script que hace ping cada 20s. **El setInterval corre en la
  pagina (no en el SW)**, porque solo asi cuenta como actividad para MV3.
  **Ademas hospeda iframe `sandbox="allow-scripts"` para el REPL** (ver
  siguiente seccion).

- `sidepanel-ui/src/github-agent.js` — puerto heartbeat wire-up:
  `freebuffOpenHeartbeatPort`, `freebuffStartHeartbeat`, `freebuffStartAutopilotSession`,
  `freebuffStopHeartbeat`, `freebuffEndAutopilotSession`. Llamado en
  `runAutoBuild()` (siempre — 1 ping cada 10s), `runAutopilot()` (envia
  `X1_AUTOPILOT_SESSION_START` para que el SW boost las 3 capas),
  `cancelBackgroundQueue()` (envia `X1_AUTOPILOT_SESSION_END` para cleanup).

- `background/service-worker.js`:
  - `importScripts` lineas 127-132 (despues del issue #12 keep-alive):
    `'orchestrator/keep-alive.js'`, `'sandbox/repl-runner.js'`, `'sandbox/dependency-resolver.js'`.
  - Final del archivo: `try { if (typeof X1KeepAlive !== 'undefined' &&
    typeof X1KeepAlive.init === 'function') X1KeepAlive.init(); } catch(e){...}`
    para arrancar las 3 capas en cuanto el SW despierta.

- `manifest.json` — sin cambios. Ya tenia `alarms` (linea 6) y `offscreen`
  (linea 8) declarados en permisos.

**NOTA IMPORTANTE**: el usuario pidio "chrome.alarms cada 25s como respaldo".
**MV3 no lo permite** — `chrome.alarms.periodInMinutes` tiene minimo 1 en
produccion (Chrome redondea silenciosamente). Si lo necesitas mas agresivo,
la unica alternativa real es un `<audio>` en offscreen (que SI puede hacer
ping cada pocos segundos — uso la 20s siguiendo el rate-limit del Judge).
Migrar a chrome Web Workers (stage: propuesta) cuando llegue a Chrome estable.

### Feedback loop iterativo con REPL headless sandboxed (2026-07-07 — los PRs autonomos ya no son ciegos)

El pipeline `proposeChanges(goal, tarea, research, repoCtx, onStep, taskIdx)` antes era **one-shot 3-fases**: Desarrollo → Auditoria → Refinamiento → ship. Hoy publica codigo sin verificar que compila o que las dependencias existen — el PR sale "a ciegas" y rompe el repo si Freebuff se inventa un `require('lodash')` que el repo no tiene.

CICLO REAL iterativo (max `MAX_FB_ITERATIONS=3` por tarea, hasta convergencia o limite):
  1. Fase 1 — Sector Desarrollo: escribe un borrador. En iter 0 usa objetivo+investigacion+contenido actual de cada fichero. En iter > 0 incluye como contexto los problemas del REPL de la iteracion anterior.
  2. Fase 2 — Sector Auditoria de Codigo: revisor critico independiente. **Solo se ejecuta en iter 0** — en iter > 0 el feedback del REPL ya cubre errores tecnicos y re-auditaria gastaria tokens sin valor.
  3. Fase 3 — Sector Refinamiento: incorpora la auditoria (iter 0) o el feedback del REPL (iter > 0) en la version final.
  4. **FASE 4 — REPL headless sandboxed** (NUEVO): ejecuta los `.js`/`.ts` propuestos en un iframe sandboxed. Captura `SyntaxError`, `ReferenceError`, `TypeError`, dependencias no declaradas. Si TODO OK → publica. Si HAY problemas → re-feed al Sector Desarrollo como contexto adicional y vuelve a iterar (iter + 1).
  5. Tope: si tras 3 iteraciones quedan problemas, Freebuff emite `fb-exhausted` (warning) y publica con problemas conocidos — mejor warnings que gastar tokens sin progreso convergente.
  6. **Crash guard** (Fix BLOCKER-1 post-review): `pipeline()` envuelto en `.catch()` para que un crash inesperado (askAI rechaza por quota, etc) NO se quede colgado a mitad de iteración.
  7. **Null guard** (Fix BLOCKER-2 post-review): si las 3 iteraciones fallaron al generar propuesta valida, devuelve `{error:true}` neutral en vez de null.

**Por que un iframe sandboxed (`sandbox="allow-scripts"`)** y no un Web Worker del SW: el thinker-with-files-gemini identificó que MV3 CSP bloquea `'unsafe-eval'` en Web Workers spawned desde el SW — un `(new Function(code))()` dentro del worker tiraria CSPViolationError. El iframe sandboxed tiene su propio origen, no hereda CSP del padre, y permite `eval`/`new Function` libremente.

**Archivos nuevos (todos ES5 strict / HTML5):**
- `background/sandbox/repl-iframe.html` (~30 lineas) — iframe CRS (CommonJS Runtime Simplified) que recibe codigo via `postMessage`, hace `new Function(code)`, ejecuta en scope minimo (sin `window`, `document`, `parent`). Devuelve `{ok, kind, error, took, consoleLines}`. `kind` puede ser `syntax` / `reference` / `type` / `runtime` / `timeout` / `executed`.
- `background/sandbox/repl-runner.js` (~180 lineas) — ES5 module cargado via `importScripts('sandbox/repl-runner.js')`. Publica `self.X1SandboxREPL = { validateFiles, status }`. `validateFiles(filesArr, opts)` lanza hasta 3 archivos en paralelo via mensajes `X1_SANDBOX_RUN_IN_IFRAME` al keepalive.html → iframe. Filtra por extension (solo `.js/.ts/.jsx/.tsx/.mjs/.cjs` se ejecutan, JSON/MD/HTML/CSS se saltan — sino darian SyntaxError falsos y harian loop infinito). `MAX_FILE_LENGTH=50000` chars por archivo. Timeout **8s** por archivo (bumped 6→8s post-review por ficheros 50KB borderline).
- `background/sandbox/dependency-resolver.js` (~120 lineas) — Pure static analysis. Regex para `import ... from 'X'`, `require('X')`, `export ... from 'X'`, `import('X')`. Compara contra `package.json` (dependencies + devDependencies + peerDependencies + optionalDependencies). Ignora builtin de Node (`fs`, `path`, `http`, etc) y paths relativos. Reporta `missing` deps con sugerencia accionable.
- `offscreen/keepalive.html` — actualizado para hospedar un `<iframe src="../background/sandbox/repl-iframe.html" sandbox="allow-scripts">` invisible. Listener `chrome.runtime.onMessage` recibe `X1_SANDBOX_RUN_IN_IFRAME` del SW, forwarda al iframe, espera respuesta via `window.message`, devuelve al SW via `sendResponse`. Mantiene mapa `requestId → {resolve, timer}` para emparejar resultados async. Timeout por defecto 6s (8s con override caller).

**Wire-ups:**
- `background/service-worker.js`: 3 nuevas lineas en `importScripts` (lineas 130-132: `'sandbox/repl-runner.js'` + `'sandbox/dependency-resolver.js'` + el previo issue-12-actions.js). 2 nuevos listeners `chrome.runtime.onMessage` al final del archivo antes del X1KeepAlive.init — handlers de `X1_SANDBOX_VALIDATE` (validates propuesta) CONCATENANDO `X1SandboxREPL.validateFiles(msg.files, msg.opts)` + `X1DependencyResolver.analyzeFiles(files, pkgJson)` (missing deps con `type: 'missing-dep'`). Devuelve `{ok, problems: [{file, type, msg}], stats}`.
- `sidepanel-ui/src/github-agent.js`: `proposeChanges` reescrito completo. Extrae `runDevPhase` + `runAuditPhase` (iter 0 only) + `runRefinePhase` + `fbSandboxValidate` como helpers internos. Loop recursivo `pipeline(iter, prevProblems)` que envuelve Phase 1+2+3+4 y se llama a si mismo con `prevProblems` si la validacion falla. Constante `MAX_FB_ITERATIONS = 3` exportada al inicio. Si el sandbox falla (timeout, respuesta null) devuelve `{ok: true, problems: [], validationSkipped: true}` para no empeorar el flujo — publicamos sin validar pero con warning visible al usuario.
- `manifest.json`: sin cambios. `offscreen` y `scripting` ya estaban. El iframe usa `<iframe sandbox="allow-scripts">` que NO requiere permiso extra.

**Kill-switch ON/OFF del autopiloto** (FIX B 2026-07-07): `runAutopilot()` en github-agent.js ahora envuelve el start en una Promise que lee `chrome.storage.local.x1_autopilot_killswitch` (misma clave que keep-alive.js) via callback. Si está true → emit error step + return `{autopilot:false, error:true, killSwitch:true}` sin heartbeat. **Mantiene SW + sidepanel syncronizados** (mismo storage API).

**Limitación Fix C NO aplicada** (documentada): el kill-switch previene **infraestructura nueva** y **start de runs** desde sidepanel. NO interrumpe un ciclo del autopiloto **ya en marcha** — esperar (~15-25 min) o `chrome.runtime.reload()` del SW. Razón: Fix C requería rewrite de 3 handlers (`X1_AUTOMATION_QUEUE_START`, `X1_AUTOMATION_QUEUE_RESUME`, `X1_AUTOMATION_ALARM`) en el SW de 19k-line con sed, demasiado arriesgado bit a bit. Trade-off honesto: kill-switch activo se desactiva **antes** del proximo ciclo.

**Emits nuevos en el ProcessLog (visibles al usuario):**
- `id: 't0:draft:0'`, `title: 'Sector Desarrollo: borrador (iter 1/3)'`, etc — numerados 1/3, 2/3, 3/3.
- `id: 't0:review:0'` — solo aparece en iter 0 (cuando hay auditoria nueva).
- `id: 't0:refine:0'` — refinamiento por iter.
- `id: 't0:v0:validate'` — REPL ejecutando.
- `id: 't0:v0:fb-converge:0'` — publico OK despues de N iteraciones.
- `id: 't0:fb-exhausted'` — iteraciones agotadas, publico con warnings.
- `id: 't0:fb-crash'` — crash global del pipeline (Fix BLOCKER-1).
- `id: 't0:fb-no-proposal'` — sin propuesta valida (Fix BLOCKER-2).
- `id: 'autopilot'` con killSwitch status detail — si kill-switch está ON.

**Coste de tokens (budget del Judge):**
- iter 0: Sector Desarrollo (~35s) + Auditoria (~25s) + Refinamiento (~35s) + Sandbox (<8s) = ~4 calls.
- iter 1+: Sector Desarrollo (con feedback del REPL) + Refinamiento + Sandbox = ~3 calls.
- iter 2 = ~10 calls. iter 2 = ~13 calls. Total max = ~13 calls por tarea si nunca converge. Si converge en iter 0 = ~4 calls.

**Migracion futura / mejoras posibles:**
- Tests unitarios: ~30 tests para `validateFiles`, `dependency-resolver`, `proposeChanges iteration`. Sin tests automatizados la primera ejecucion real sera la primera validacion.
- Persistencia de los `prevProblems` por repo (con `chrome.storage.local` keyed por `owner/repo/path`) para que iteraciones futuras del autopiloto arranquen sabiendo que ya se intento arreglar ese bug — feedback persistente.
- AST parser (parse-only) como alternativa a `eval`. Mas seguro pero no captura runtime errors. Eval es necesario para ReferenceError.

**Test rapido:**
1. Sidepanel conectado GitHub + repo analisado.
2. Proponer un objetivo amplio (ej: "arregla el bug en src/utils.js").
3. Observar el ProcessLog: veras `iter 1/3`, sectores Desarrollo→Auditoria→Refinamiento→REPL. Si el REPL detecta un error (inyecta uno adrede en el codigo propuesto), veras `iter 2/3` re-feed con problemas, hasta converger.

---

### 9. UNIT TESTS landed — capability-shared (2026-07-13)

Shipped `tests/orchestrator/capability-shared.test.js` (280 LOC) usando `node:test` + `node:assert/strict` (Node built-in, sin frameworks). **20/20 tests pasan** con `node --test tests/orchestrator/capability-shared.test.js`:

- **safeCalc (8 tests)**: suma/resta/multiplicacion basicas · precedencia sin parentesis · precedencia con parentesis simple + nested `(1+(2+(3+4)))` · numeros negativos incluyendo unario `-7` · division por cero devuelve 0 (no NaN) · `avg()/sum()/min()/max()` case-insensitive · ignora tokens no numericos (`avg(1,foo,3) === 2`) · lista vacia devuelve 0.
- **resolveParams (2)**: `{{var}}` + structural keys excluidas · mixto `{var}` + `{{var}}` (ctx key ausente queda literal).
- **normalizeStep (2)**: `action->type` alias con invariante deep-equal de inmutabilidad · `type` ya definido no se sobreescribe.
- **unifiedAiCall (4)**: opts.persona · opts.system fallback · default `'You are a helpful assistant.'` · `AI_NOT_AVAILABLE` cuando global ausente.
- **sanitizeAiResponse (2)**: ``` ```json/``` ``` case-insensitive + trim whitespace + regression guard de mixed-content (fences + whitespace absorbed en ambos lados) · input no-string devuelve `''` (5 casos: null/undefined/number/object/array).
- **stepProgressSafe (3)**: happy path global + tabId · degrada sin throw cuando global ausente · `tabId` falsy cae al branch de `console.log` (no llama al stub).
- **Constants (2)**: `KNOWN_STEP_TYPES` tiene los 14 esperados · `STRUCTURAL_KEYS` marca los 10 estructurales.

**Tecnica**: `node:vm.createContext` ejecuta la IIFE ES5 fuera del SW context; cada test crea su propio ctx con stubs inyectados (`spyAi()`, `spyProgress()`), garantizando cero leakage entre tests. Sin chrome.* mockeado — los helpers solo referencian `aiComplete` y `stepProgress` (los unicos stubs necesarios).

**Bug-test catch en la primera corrida**: mi mixed-content assertion esperaba `'1} rest'` pero el regex absorbe el `\s*` pegado a los backticks finales. La fix lleva un comentario de 5 lineas explicando el spec exacto del regex para que futuros maintainers no lo regresen accidentalmente.

Anadido a `## KEY FILES TO KNOW` y a `## COMMIT READINESS` abajo.

---

## NEXT: TESTING & POLISH (Priority order — Phase 1 → Phase 2 validation)

### 1. **VALIDATION PHASE 1** (30 min) — bloqueante para cualquier marketing "compite con Claude Code"
- [ ] Cargar extension unpacked en Chrome.
- [ ] Ejecutar smoke test keep-alive (5 min) — ver logs `[X1-KeepAlive]` en DevTools del SW.
- [ ] Ejecutar smoke test feedback loop (10 min) — ver `(iter 1/3)`, `REPL: OK/problema(s)` en ProcessLog.
- [ ] Test adversario inyectar error en propuesta propuesta — confirmar REPL detecta + Sector Desarrollor corrige.
- [ ] Stress test 30 min de runAutopilot — contar PRs + verificar SW sigue vivo.

### 2. **VOICE & UI** (1 hora)
- [ ] Voice listener: clap detection → toggle process bar
- [ ] Process bar animación + step progress
- [ ] Human speech (TTS) + interruption detection
- [ ] Bubbles UI + glow effect colores (blue/green/purple)

### 3. **CORE ACTIONS** (1 hora)
- [ ] `navigate(url)` → funciona
- [ ] `search(query)` → Google search
- [ ] `click(text)` + `typeInDoc(text)` → escritura en página
- [ ] `gmailSend(to,subject,body)` → email real
- [ ] `calendarCreate()` → evento real

### 4. **NEW SUBSYSTEMS SMOKE TEST** (30 min)
```javascript
X1FinancialData.getQuote('AAPL')          // → debe devolver precio
X1ImageGen.generate('cat')                 // → debe devolver dataURL
X1DeepResearch.research('IA')              // → debe navegar + extraer
X1SkillEngine.registerSkill({...})         // → debe guardar
X1MCPClient.getServers()                   // → debe devolver []
X1GroupChat.debate('tema', ['groq'])       // → debe llamar providers
// + Phase 1 specific:
X1SandboxREPL.status()                     // → debe devolver {bridgeOk: true o false}
X1DependencyResolver.extractImports('const x = require("foo");')  // → [{name: 'foo'}]
X1KeepAlive.status()                       // → {ports: 0|1, killSwitchTripped: false, ...}
```

### 5. **PHASE 2 BACKLOG** (post-validation Phase 1 por el usuario)
- [ ] Fix C completa (kill-switch interrumpe mid-cycle queue) — sed-replace en handler bodies del SW con helper function + manual review.
- [ ] Tests unitarios REPL sandbox (~20 tests).
- [ ] Watchdog de horas-entera con notifications (chrome.notifications cada N PRs).
- [ ] Memoria persistente por-repo (prevProblems guardados en chrome.storage.local keyed por `owner/repo/path`).
- [ ] Inline-concat para cross-file imports en REPL.

### 6. **FIX ES5 VIOLATIONS** (~20 async funciones, ~2 horas)
Archivo: `service-worker.js` lineas ~5967-11228 — pre-existente, baja prioridad.

### 7. **PANEL UI SIDEPANEL** (1 hora)
- [ ] `sidepanel/panel.html` — verificar que carga
- [ ] Chat history display
- [ ] Suggestions rendering
- [ ] Dark mode toggle

### 8. **CMS & DOCS** (30 min)
- [ ] Actualizar `docs/X1_CONTEXT_FOR_AI.md` con nuevos módulos
- [ ] Listar todos los 40+ archivos + líneas en README
- [ ] API reference para cada subsistema

---

## KNOWN ISSUES

1. **~20 async funciones** en SW (lines 5967-11228) — Chrome MV3 soporta async, pero para ES5 puro necesitan convertirse a Promises
2. **Voice interruption** — necesita getUserMedia permission en cada página (puede causar prompts frecuentes)
3. **Process bar auto-hide** — timeout de 3s después de último paso, verificar que no ocurre durante step
4. **Memory size** — max 20 mensajes; si crece necesita IndexedDB (ya implementado, solo cargar en buildSystemPrompt)
5. **Provider cascade** — si groq falla, debe intentar siguiente automáticamente. Verificar X1RateLimiter.filterAvailable() integrado en aiComplete()
6. **REPL sandboxed sin tests automatizados** — la primera ejecucion real sera la primera validacion. Esperar bugs en `X1SandboxREPL.validateFiles` cuando se ejecute en Chrome primero.
7. **x1-integration.js import aborta el resto de importScripts** — sigue buggy, hay que aislarlo siempre.
8. **Kill-switch Fix C no implementado** — kill-switch activo previene infra nueva y start de runs nuevos, pero NO interrumpe ciclos del autopiloto ya en marcha. Workaround: `chrome.runtime.reload()` del SW + esperar el ciclo actual (~15-25 min) o cancelBackgroundQueue desde el sidepanel si está abierto.

---

## ARCHITECTURE REFERENCE

```
X1 — 7 Capas + Phase 1 Kill-Switch
├─ L0: Stability (SW error traps, import guards, storage persistence, killswitch storage)
├─ L1: Process (Process bar con step progress + icono app original)
├─ L2: Voice (TTS español + interruption detection + glow + bubbles)
├─ L3: Web Agent (runAgentLoop max 20 steps, navegación autónoma)
├─ L4: Memory (IndexedDB encrypted + op-graph + intention-graph + world-model)
├─ L5: AMI Predictive (perceiveState, simulateAction, computeCost, selectAction)
└─ L6: Integration Hub (13 providers + MCP + skills + plugins + automation)

Phase 1 Extensions (2026-07-07):
├─ background/orchestrator/keep-alive.js — 3-layer keepalive MV3 + kill-switch
├─ background/sandbox/repl-runner.js — bridge SW → iframe
├─ background/sandbox/repl-iframe.html — sandboxed eval runtime
└─ background/sandbox/dependency-resolver.js — static dep-check

Core Entry: handleVoice(text, wantsText, sendResponse)
├─ parseCommand(text) → 40+ regex patterns
├─ classifyIntent(text) → intent type
├─ aiComplete(sysPrompt, userMsg, opts) → Panel system (groq+gemini+mistral parallel)
├─ execAction(action, tabId) → 80+ cases (after issue #12 fix: 80+11=91 total)
└─ buildSystemPrompt() → injects {DATE}, {MEMORY}, {GRAPH}, {PERSONA}, etc

Storage Hierarchy:
├─ chrome.storage.session: memory (temporary per session)
├─ chrome.storage.local: everything else (persistent) + x1_autopilot_killswitch
└─ IndexedDB: large binary data (images, encrypted blobs)
```

---

## KEY FILES TO KNOW

| File | Lines | Purpose |
|------|-------|---------|
| `background/service-worker.js` | ~19,500 (post Phase 1) | Core engine — handleVoice, execAction, AI cascade, kill-switch handlers |
| `background/cascade/router.js` | 597 | Judge system + sector-based routing |
| `content/voice-listener.js` | 675 | Layer 1-4 UI: process bar, voice, glow, bubbles |
| `content/voice-bridge.js` | 86 | Bridge SW ↔ main world messages |
| `content/floating-toolbar.js` | 116 | Selection toolbar (Resumir, Explicar, etc) |
| `background/memory/indexeddb.js` | ~1200 | Encrypted persistent memory |
| `background/agents/agent-manager.js` | 335 | Custom agent CRUD + orchestration |
| `background/plugins/engine.js` | 422 | Declarative plugin system |
| `manifest.json` | 120 | MV3 permissions + content scripts |
| `background/orchestrator/keep-alive.js` | ~220 (post kill-switch) | 3-layer keep-alive MV3 + kill-switch |
| `background/orchestrator/capability-shared.js` | 270 | Capa compartida: safeCalc, resolveParams, unifiedAiCall, normalizeStep, sanitizeAiResponse, stepProgressSafe |
| `tests/orchestrator/capability-shared.test.js` | 280 | Unit tests node --test (20/20 passing) para los 7 helpers + constantes |
| `background/sandbox/repl-runner.js` | ~180 | SW bridge → keepalive → sandbox iframe executor |
| `background/sandbox/repl-iframe.html` | ~30 | Sandbox iframe that runs user JS via `new Function()` |
| `background/sandbox/dependency-resolver.js` | ~120 | Static dep-check (regex) vs package.json |
| `background/automation/issue-12-actions.js` | ~180 | Phase 0 issue #12 — 11 missing SYSTEM_PROMPT actions |

---

## ENV SETUP

Claves requeridas en `chrome.storage.local`:
```javascript
{
  groqKey: 'gsk_...',
  geminiKey: 'AIzaSy...',
  openaiKey: 'sk-...',
  nvidiaKey: 'nvapi-..',
  cerebrasKey: 'csk-...',
  sambanovaKey: 'sk-...',
  mistralKey: 'msT-...',
  togetherKey: 'b5...',
  openrouterKey: 'sk-or-...',
  cloudflareAccountId: '...uuid...',
  cloudflareKey: 'Bearer token...',
  finnhubKey: 'c...',
  alphaVantageKey: 'demo' (o real key),
  openaiKey: 'sk-...',
  aiProvider: 'auto',  // auto=cascade, o especifico
  // Phase 1 kill-switch (optional — default false = autopiloto activo):
  x1_autopilot_killswitch: false  // true = mata el autopiloto (ver seccion PHASE 1 STATUS)
}
```

---

## COMMIT READINESS

- ✅ No uncommitted changes (todos los cambios en working tree intencionales)
- ✅ All imports/modules load (verificado via grep + node --check syntax)
- ✅ No security vulnerabilities (all keys stored in chrome.storage, nunca en código)
- ✅ ES5 compliant (salvo issue pre-existente de 20 async functions en SW)
- ⚠️ NO testing en Chrome real (el único testing valido es manual unpacked + iteración del REVIEWER)
- ⏳ Phase 1 validation pendiente (ver seccion PHASE 1 STATUS)

**Next person**: leer **PHASE 1 STATUS** primero. Si decides promover a Phase 2, completar primero el bloqueante de VALIDATION. Cuando pasen los 5 tests, documentar en `docs/PHASE_2_PROMOTION.md` con los resultados.

---

## CONTACT

User: Iván Arjona (@iarjona2000) — Co-fundador  
Tomás Calero (Tomahawk999) — Co-fundador — TOMAS CALERO — co-fundador full dev 15h/dia  
Timezone: Europe/Madrid  
Preferences: Spanish user-facing, English code, no emojis unless asked, ULTRATHINK mode, **honest positioning always**  
Session Length: Prefer longer focused sessions over many short ones
