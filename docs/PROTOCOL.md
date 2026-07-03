# X1 — Protocolo de Mensajes

**Versión**: 1.0.0
**Estado**: activo, en uso por `background/service-worker.js` (vía `importScripts('protocol.js')`).
**Single source of truth**: `background/protocol.js`.

Este documento es la **especificación humana** del contrato entre la UI
(popup, options, content scripts, page tabs) y el service worker. La
implementación vive en `background/protocol.js`; si algo difiere, **el código
manda** y este doc se actualiza después.

---

## Convenciones

| Sufijo | Dirección | Sentido |
|---|---|---|
| `REQ_*` | UI → SW | Pide algo, espera respuesta |
| `EVT_*` | SW → UI | Broadcast, fire-and-forget, no espera respuesta |
| `ERR_*` | SW → UI | Terminator de un REQ fallido |

**Shape base de mensaje:**

```javascript
// REQUEST
{ type: 'CHAT', query: 'hola', history: [...], agentId: 'opcional' }

// RESPONSE (éxito)
{ ok: true, data: { /* payload del resultado */ } }

// RESPONSE (error)
{ ok: false, error: { message: '...', code: 'VALIDATION', context: {} } }
```

**Nunca** mandes strings mágicos directamente. Importa `X1Protocol` y usa las
constantes:

```javascript
chrome.runtime.sendMessage({ type: X1Protocol.REQ.CHAT, query: 'hola' });
```

---

## REQUESTS (UI → SW)

### Bootstrap

| Tipo | Payload | Validación |
|---|---|---|
| `INIT` | `{ password }` | password string no vacío |
| `IS_READY` | `{}` | (sin schema) |

### Chat & reasoning

| Tipo | Payload | Validación |
|---|---|---|
| `CHAT` | `{ query, history?, agentId? }` | query string no vacío |
| `COMPARE` | `{ query, models[], sector? }` | query + models[] con ≥2 |
| `VOTE` | `{ vote }` | payload objeto |
| `FACT_CHECK` | `{ answer, query }` | ambos strings |
| `SUGGESTIONS` | `{}` | (sin schema) |

### Agents

| Tipo | Payload | Validación |
|---|---|---|
| `AGENT_LIST` | `{}` | (sin schema) |
| `AGENT_CREATE` | `{ config }` | config objeto |
| `AGENT_UPDATE` | `{ id, patch }` | id string + patch objeto |
| `AGENT_DELETE` | `{ id }` | id string |
| `AGENT_RUN` | `{ id, goal, history? }` | id + goal strings |
| `AGENT_ADD_KNOWLEDGE` | `{ id, documents[] }` | id string + array |
| `AGENT_SEED` | `{}` | (sin schema) |

### Teams / collaboration

| Tipo | Payload | Validación |
|---|---|---|
| `TEAM_CREATE` | `{ name, description?, agentIds[] }` | name + agentIds[] |
| `TEAM_LIST` | `{}` | (sin schema) |
| `TEAM_RUN` | `{ teamId, goal }` | teamId + goal strings |
| `TEAM_RUNS` | `{}` | (sin schema) |

### Projects

| Tipo | Payload | Validación |
|---|---|---|
| `PROJECT_CREATE` | `{ name, goal?, deadlineDays? }` | name string |
| `PROJECT_LIST` | `{}` | (sin schema) |
| `PROJECT_REPORT` | `{ id }` | id string |
| `PROJECT_UPDATE_TASK` | `{ projectId, taskId, status }` | 3 strings |
| `PROJECT_DELAYS` | `{}` | (sin schema) |

### Fine-tuning

| Tipo | Payload | Validación |
|---|---|---|
| `FINETUNE_DATASET` | `{ examples[], format? }` | examples array |
| `FINETUNE_CREATE` | `{ baseModel, dataset, agentId }` | 3 strings |
| `FINETUNE_JOBS` | `{}` | (sin schema) |
| `FINETUNE_EVAL` | `{ baseModel, tunedModel, testQueries[] }` | 3 strings + array |

### Workspace (Google, etc.)

| Tipo | Payload | Validación |
|---|---|---|
| `WORKSPACE_LOGIN` | `{}` | (sin schema) |
| `WORKSPACE_LOGOUT` | `{}` | (sin schema) |
| `WORKSPACE_STATUS` | `{}` | (sin schema) |
| `WORKSPACE_INBOX` | `{}` | (sin schema) |
| `WORKSPACE_MEETING_PREP` | `{}` | (sin schema) |

### Memory

| Tipo | Payload | Validación |
|---|---|---|
| `MEMORY_STATS` | `{}` | (sin schema) |
| `MEMORY_REMEMBER` | `{ text, type?, sector? }` | text string |
| `MEMORY_RECALL` | `{ query, k? }` | query string |
| `MEMORY_FORGET_ALL` | `{}` | (sin schema) |

### Config / API keys

| Tipo | Payload | Validación |
|---|---|---|
| `CONFIG_GET` | `{}` | (sin schema) |
| `CONFIG_SAVE` | `{ config }` | config objeto |
| `SET_API_KEY` | `{ provider, apiKey }` | ambos strings |
| `TEST_PROVIDERS` | `{}` | (sin schema) |

### History & votes

| Tipo | Payload | Validación |
|---|---|---|
| `HISTORY_GET` | `{}` | (sin schema) |
| `HISTORY_CLEAR` | `{}` | (sin schema) |
| `VOTES_GET` | `{}` | (sin schema) |

### Cost / metrics / planning

| Tipo | Payload | Validación |
|---|---|---|
| `BUDGET_STATUS` | `{}` | (sin schema) |
| `METRICS_SUMMARY` | `{}` | (sin schema) |
| `SELECT_MODEL` | `{ query, critical? }` | query string |
| `PLAN_TASK` | `{ goal }` | goal string |

### System

| Tipo | Payload | Validación |
|---|---|---|
| `HEALTH` | `{}` | (sin schema) |

---

## EVENTS (SW → UI)

| Tipo | Payload | Cuándo se emite |
|---|---|---|
| `TOKEN` | `{ token }` | Streaming: cada fragmento de respuesta |
| `DONE` | `{}` | Streaming: fin del stream |
| `STEP_PROGRESS` | `{ action, app, description, status, index }` | Step UI update (multi-step actions) |
| `AGENT_PROGRESS` | `{ agentName, stepName, status, icon }` | Agent UI update (long-running agents) |
| `BUDGET_ALERT` | `{ text }` | Aviso de presupuesto |
| `VOICE_RESULT` | `{ text, showText, error, suggestions[] }` | Resultado de comando de voz |
| `AGENT_STATUS` | `{ text, isLast }` | Estado de agente |
| `API_RESULT` | `{ action, ok, data, error }` | Resultado de `X1_API` calls |

---

## ERROR CODES (`ERR_CODE`)

| Código | Cuándo se devuelve |
|---|---|
| `UNKNOWN` | Error no categorizado |
| `NOT_FOUND` | El tipo de mensaje no existe en el handler registry |
| `AUTH` | X1 no está desbloqueado (falta `INIT`) |
| `VALIDATION` | El payload no pasó el `validateRequest(type, payload)` |
| `TIMEOUT` | La operación excedió el tiempo máximo |
| `RATE_LIMIT` | El provider fue rate-limited |
| `PROVIDER` | El provider upstream falló (sin red, 5xx, etc.) |
| `INTERNAL` | Error inesperado en el handler (bug) |

---

## LEGACY_ALIAS — tipos del protocolo antiguo

Mientras conviven los dos protocolos, estos alias mapean los tipos legacy
(`X1_*`) a los nuevos. Se eliminan cuando ya no hay emisores en el código
viejo.

| Tipo legacy | Tipo nuevo |
|---|---|
| `X1_OPEN_PANEL` | `IS_READY` |
| `X1_GREET` | `SUGGESTIONS` |
| `VOICE_COMMAND_EXEC` | `CHAT` |
| `X1_TOGGLE` | (null, UI-only) |
| `X1_VOICE_RESULT` | (null, SW → UI event) |
| `X1_AGENT_STATUS` | (null, SW → UI event) |
| `X1_STEP_PROGRESS` | (null, SW → UI event) |
| `X1_API_RESULT` | (null, SW → UI event) |
| `X1_AGENT_PROGRESS` | (null, SW → UI event) |
| `X1_BUDGET_ALERT` | (null, SW → UI event) |

Para migrar un emisor legacy:

```javascript
// ANTES
chrome.runtime.sendMessage({ type: 'X1_GREET' });

// DESPUÉS
var mapped = X1Protocol.resolveLegacyType('X1_GREET') || X1Protocol.REQ.SUGGESTIONS;
chrome.runtime.sendMessage({ type: mapped });
```

---

## API expuesta

`protocol.js` se carga con `importScripts('protocol.js')` desde el SW, y queda
disponible como `self.X1Protocol` (SW) y `window.X1Protocol` (content scripts / page).

```javascript
X1Protocol.REQ.CHAT                       // string 'CHAT'
X1Protocol.EVT.TOKEN                      // string 'TOKEN'
X1Protocol.ERR_CODE.VALIDATION            // string 'VALIDATION'
X1Protocol.LEGACY_ALIAS.X1_GREET          // string 'SUGGESTIONS'
X1Protocol.isRequest(type)                // boolean
X1Protocol.isEvent(type)                   // boolean
X1Protocol.resolveLegacyType(type)        // string | null
X1Protocol.validateRequest(type, payload) // null | string (motivo del fallo)
X1Protocol.okResponse(data)               // { ok: true, data }
X1Protocol.errResponse(msg, code, ctx)    // { ok: false, error: {...} }
```

También se exponen `X1Validators` (objeto plano) y `X1Responses` (helpers)
por separado para callers que prefieran el estilo granular.

---

## Tests

`tests/protocol.test.js` cubre:

- Catálogo de REQ y EVT (≥40 REQ, ≥8 EVT, congelados, no se solapan)
- ERR_CODE values
- LEGACY_ALIAS resolución (legacy → new, UI-only → null, unknown → null)
- Helpers (`isRequest`, `isEvent`, `okResponse`, `errResponse`)
- Validadores: happy path + sad path para cada tipo con schema
- Compat: tipos sin schema pasan siempre
- Inmutabilidad: `Object.freeze` impide mutación de REQ

Para ejecutar: cargar `protocol.js` + `protocol.test.js` en un contexto
donde `window` exista (página HTML, DevTools console en la extensión
cargada, o un test harness).

---

## Cómo añadir un nuevo REQ

1. Añadir el identificador a `protocol.js` en el objeto `REQ` correspondiente
   (orden: por superficie: bootstrap → chat → agents → teams → projects → finetune → workspace → memory → config → history → cost → system).
2. Si tiene schema, añadir un `validators[REQ.X] = function(p) { ... }`.
3. Añadir fila en la tabla de este doc.
4. Añadir tests en `tests/protocol.test.js` (happy + sad).
5. Implementar el handler en el código que consume el REQ.
6. Si tiene alias legacy, añadirlo también.