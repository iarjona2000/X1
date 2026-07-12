# QA — Keep-Alive MV3 3-Capas (2026-07-07)

> **STATUS**: Tomas valida manualmente en Chrome unpacked. Yo NO puedo correr este test (browser-use agent no soporta cargar extensions unpacked).

## Pre-requisitos

- Chrome 109+ con `extensions` developer mode activado (`chrome://extensions → toggle arriba-derecha`).
- El proyecto extension esta en `C:\Users\tomas\Desktop\cbos-ext-backup-2026-07-07`.
- (Opcional pero recomendado) Tener `chrome.storage.local` con un proxy URL en `storage.local.proxyUrl` si quieres probar la Capa 1 (puerto heartbeat) correctamente. Si no: la Capa 1 queda inactiva pero las Capas 2 (alarm) y 3 (offscreen) siguen funcionando.

## Paso a paso

### Paso 1 — Cargar unpacked

1. Abrir `chrome://extensions` en Chrome.
2. Activar `Developer mode` (toggle arriba-derecha).
3. Click `Load unpacked` → seleccionar `C:\Users\tomas\Desktop\cbos-ext-backup-2026-07-07`.
4. La extension aparece con nombre "System X1" + el icono.
5. **NO debe haber errores rojos** en la tarjeta. Si los hay: abre DevTools (boton `service worker` → `inspect`) y pega el error aqui antes de continuar.

### Paso 2 — Verificar carga de modulos (DevTools del SW)

1. Click `service worker` → `inspect` en la tarjeta.
2. Se abre DevTools apuntando al SW. Console esta vacio al inicio.
3. Forzar arranque del keep-alive: ejecuta en la consola del SW:
   ```js
   X1KeepAlive.status()
   ```
4. **ESPERADO**: objeto `{ports: 0, alarmScheduled: true, offscreenCreated: true, listenersRegistered: true, killSwitchTripped: false, selfCheck: true}`.
5. **ESPERADO** en console (logs automaticos al init):
   ```
   [X1-KeepAlive] offscreen YA existe
   -- o --
   [X1-KeepAlive] offscreen document CREADO en offscreen/keepalive.html
   [X1-KeepAlive] alarm pulse scheduled (intervalo 1 min)
   ```
6. **NO ESPERADO** (real reportar a Buffy):
   - `[X1-KeepAlive] PHASE 1 KILL-SWITCH activo` → tienes `x1_autopilot_killswitch=true` en storage. Desactivalo (ver Paso 7).
   - `[X1-KeepAlive] init abortado` → fallo estructural. Pegar stack trace.
   - Cualquier `Error: ...` rojo.

### Paso 3 — Levantar sidepanel + Connect GitHub

1. Click el icono de la extension en Chrome toolbar → abre el sidepanel.
2. En el sidepanel, conectar GitHub (token personal con scopes `repo, write:PR`).
3. Analizar un repo pequeno (~5-15 archivos). Esperado: el `analyzeRepo` emite ~6-8 passos con tag de marca `Freebuff (Vektor)`.

### Paso 4 — Iniciar runAutopilot

1. Con el repo analisado, click `Activar autopiloto`.
2. Esperado en el ProcessLog: el emit `Activando autopiloto` con `why: "Freebuff (Vektor) decidira por si mismo..."`.
3. En DevTools del SW, **esperado nuevo log**:
   ```
   [X1-KeepAlive] heartbeat port abierto desde <tabId>   // Capa 1 activa
   [X1-KeepAlive] offscreen YA existe                       // Capa 3 ya estaba
   ```

### Paso 5 — Cerrar sidepanel (test Capa 1 → 2 → 3)

1. **CRITICO**: cerrar el sidepanel (NO cerrar DevTools del SW).
2. Esperar 5 minutos exactos. Cronometra.
3. **Esperado en console del SW** durante esos 5 minutos:
   - Cada ~10s (mientras sidepanel estaba abierto): pings `X1_SANDBIVE_FROM_OFFSCREEN` cada 20s (Capa 3 mantiene vivo).
   - **AL cerrar el sidepanel**: log `heartbeat port DESCONECTADO de <tabId> (restantes=0) — alarmas + offscreen toman el relevo`.
   - **Cada 1 min** desde el alarm: log `[X1-KeepAlive] alarm tick sin port vivo — aseguro offscreen (Capa 3)`.
   - Cada 20s: `[X1-KeepAlive/offscreen] ping from offscreen (puertos vivos=0)` — el offscreen esta despertando al SW.
4. **Esperado indicador de SW vivo**: el DevTools NO debe mostrar "(paused)" o "(inactive)" en la pestaña. El SW debe seguir "Active".

### Paso 6 — Re-abrir sidepanel

1. Re-abrir sidepanel (icono en toolbar).
2. **Esperado**: log `[Freebuff-Heartbeat] puerto keepalive ABIERTO al SW` en DevTools del sidepanel (no del SW).
3. En DevTools del SW: `[X1-KeepAlive] heartbeat port abierto desde <tabId>`.

### Paso 7 — Verificar kill-switch opcionalmente

Solo si quieres testear la Fase 1 kill-switch:
```js
chrome.storage.local.set({x1_autopilot_killswitch: true}, () => {
  chrome.runtime.reload();
});
```
Esperado: `[X1-KeepAlive] kill-switch DESACTIVADO en runtime` (o no aparece si nunca se activó). Sigue vida normal. Para apagar todo:
```js
chrome.storage.local.set({x1_autopilot_killswitch: true}, () => location.reload());
```
Esperado: tras reload, init() detectara `killSwitchTripped=true` y loggeara `PHASE 1 KILL-SWITCH activo — init abortado`.

## Que reportar a Buffy

Si algo falla, **pegar exactamente**:

1. **Errores rojos** del DevTools del SW (full stack trace).
2. **Logs relevantes** (los que se desvian de "ESPERADO").
3. **Salida de `X1KeepAlive.status()`** (snapshot del estado actual).
4. **Salida de `chrome.runtime.getManifest().version`** (version de la extension que tienes cargada).
5. **Chrome version**: `chrome://version` y mirar `Google Chrome   XX.X.XXXX`.

Si todo va OK: reportar "Phase 1 keep-alive: PASS" con los logs clave (init, port-abierto, port-desconectado, alarm-tick, port-reabierto) para tener el paper trail.

## Riesgos / Errores conocidos

| Lo que veras | Que significa | Como arreglarlo |
|---------------|--------------|-----------------|
| `x1-integration.js` error en rojo al cargar | El modulo buggy sigue intacto (issue pre-existente) | NO afecta keep-alive; lo relevante es que el SW carga aunque este modulo crashee, gracias al orden de importScripts |
| `[X1-KeepAlive] offscreen error: ...` | offscreen API falló al crear | Verificar manifest permissions `offscreen`. Si persiste, es limitacion del Chrome version |
| `[X1-KeepAlive] PHASE 1 KILL-SWITCH activo` al cargar | Tienes `x1_autopilot_killswitch=true` storage | Ejecutar `chrome.storage.local.set({x1_autopilot_killswitch:false}, ...)` + reload |
| `chrome.storage.local` no responde en console | Extension no tiene `storage` permission | Verificar `manifest.json` permissions — deberia estar |

## Notas

- **Tiempo total del test**: ~10-15 minutos (incluyendo espera de 5 min en Paso 5).
- **NO cerrar DevTools** durante Paso 5 — sino no podras ver los logs de Capa 2/3.
- **NO cerrar Chrome** durante el test — el SW muere al apagar Chrome.
- **NO recargar la extension** (`Update` button en chrome://extensions) durante el test — recarga el SW y resetea state.

Si todo sale OK, marca como `KEEP-ALIVE: PASS` y pasamos al siguiente smoke test (5 en total, ver HANDOFF.md Phase 1 STATUS seccion 'Que el usuario tiene que validar antes de pasar a Phase 2').
