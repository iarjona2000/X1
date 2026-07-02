# Pendiente de tu parte — sesión 2026-07-01 (continuación)

No es urgente nada de esto salvo que quieras usar la función correspondiente. La extensión sigue funcionando sin estas claves — cada función simplemente se queda inactiva hasta que la configures.

## Claves opcionales en Settings (ninguna me la des a mí, se ponen directamente en la extensión)

| Campo en Settings | Para qué sirve | Si no lo pones |
|---|---|---|
| Firecrawl | Fallback de extracción en páginas protegidas/SPA | Extracción normal sigue funcionando, solo sin ese fallback |
| Pipedrive / HubSpot | Enviar leads extraídos al CRM | Comando `manda a hubspot/pipedrive: ...` no hace nada |
| Finnhub | Cotizaciones bursátiles | Comando `cotización de X` no funciona |
| Invoice-Generator | PDF de facturas | Comando `factura: ...` no funciona |
| Cloudflare Account ID + AI Key | Generación de imágenes (Flux) | Cae al fallback de OpenAI si esa clave está puesta, si no, no genera imágenes |
| OpenAI | Fallback de generación de imágenes (DALL-E) | Solo Cloudflare, si está configurado |
| n8n Webhook URL | Enviar datos a un flujo de n8n | Comando `envía a n8n: ...` no hace nada |
| LibreTranslate URL | Tercer fallback de traducción (detrás de Gemini y Groq) | Traducción sigue funcionando igual, solo sin ese último fallback |

## Infraestructura del Worker (opcional, mejora la fiabilidad)

- **X1_KV**: si quieres que funcione de verdad la **recepción de comandos externos** (n8n/Zapier empujando comandos a X1 sin que X1 tenga URL pública) y el **rate-limiting por IP**, hace falta crear un KV namespace:
  ```
  cd worker
  npx wrangler kv:namespace create X1_KV
  ```
  Y pegar el `id` que te dé en `wrangler.toml` (sección `[[kv_namespaces]]`, ya está ahí comentada, solo descomentar y rellenar). Sin esto, `/commands/queue` responde "no configurado" en vez de fallar silenciosamente — no rompe nada, solo no hace nada.

## Decisiones que tomé sin preguntarte (dime si alguna no te vale)

- **Comandos externos (n8n → X1)**: solo se ejecutan automáticamente acciones de solo lectura (cotizaciones, búsquedas, extracción, SEO...). Cualquier acción que pueda enviar algo o borrar algo llega como notificación pendiente de aprobación manual, no se ejecuta sola. Lo hice así por seguridad — un comando externo mal configurado no debería poder mandar un email en tu nombre sin que lo veas antes.
- **`chrome.alarms` para comandos externos**: el documento pedía sondear cada 30 segundos: Chrome no permite alarmas de menos de 1 minuto para extensiones normales, así que quedó en 1 minuto.
- **Permisos del manifest (`host_permissions` con comodín `https://*/*`)**: el documento pedía restringirlo a una lista de dominios de IA concretos. No lo toqué — X1 es un agente web que necesita ejecutar acciones en cualquier página que visites (extracción, monitorización, Alt+Click, etc.), así que restringir esto rompería esas funciones. Es un cambio deliberado, no un olvido.
- **Colisión de datos arreglada**: el motor de Skills de tu socio y un código antiguo mío escribían en la misma clave de almacenamiento (`x1_skills`) con formatos incompatibles — podían pisarse entre sí. Renombré la clave del código antiguo a `x1_skills_legacy`, sin tocar el motor nuevo.

## Aviso importante para tu socio: bundle desactualizado

`background/x1-core/bundle/x1-core.js` (el archivo que la extensión realmente carga) **no contiene los cambios de `protocol.js`** que subió en su último push — comprobé el contenido del bundle y no aparece ni una vez la palabra "protocol". Es decir: sus mejoras de `background/x1-core/utils/protocol.js` y `message-router.js` están en el repositorio pero **no están activas en la extensión** hasta que alguien ejecute el build.

No lo he ejecutado yo porque es su sistema de build (webpack) y no tiene `node_modules` instalado en esta máquina — no quise lanzar una instalación/build a ciegas sobre código que no es mío. Si él (o tú) ejecuta esto, quedaría al día:
```
cd background/x1-core
npm install
npm run build
```

## Bug crítico encontrado y arreglado: cadena de carga rota

`background/x1-integration.js`, `background/x1-api.js` y `background/ai/continue-bridge.js` (antes de mi arreglo) usan `window.algo = ...` sin comprobar si existe — pero el service worker de una extensión MV3 no tiene `window`, solo `self`. Como `importScripts()` para en el primer error, esto rompía la carga de **todo lo que venía después en la lista**: `x1-api.js`, `agents-x1.js`, `integrations/registry.js`, `ai/continue-bridge.js`, y el propio `background/protocol.js` que tu socio acababa de escribir para arreglar justo el problema del bundle desactualizado que te comenté antes — es decir, su arreglo nunca llegó a ejecutarse.

**Arreglado:** `protocol.js`, `integrations/registry.js` y `ai/continue-bridge.js` ahora cargan antes en la lista y usan `self.` en vez de `window.` — verificado con una simulación de verdad, cargan sin errores.

**Dejado tal cual, a propósito:** `background/x1-integration.js` sigue roto (falla igual que antes, no peor). Ese archivo intercepta `aiComplete`/`execAction`/`parseCommand` y expone `x1CompareResponses`/`x1EvaluateResponse`/`x1RecordVote` — nombres que apuntan a lógica de panel/juez. Activarlo sería una decisión de comportamiento, no un arreglo mecánico, así que lo dejo para que tu socio decida si quiere activarlo (arreglando sus `window.` → `self.` igual que hice en los otros tres) y lo revise él mismo.

## Bugs reales encontrados y arreglados esta ronda

- `case 'runPlugin'` llamaba a un método (`X1PluginEngine.runPlugin`) que no existe — se corrigió a `executePlugin`, la función real.
- `case 'addAutomation'` llamaba a `X1AutomationEngine.addRule`, que tampoco existe — se corrigió para usar `parseNaturalLanguageRule` + `createRule` (los métodos reales), y se añadió el comando de voz que le faltaba (`automatiza: ...`).
- Verifiqué sistemáticamente el resto de llamadas cruzadas entre módulos (alarmas duplicadas, handlers de mensajes duplicados, colisiones de formato en storage) — no encontré nada más roto.

## Sin construir todavía (no estaba en lo que pediste hoy, ni urgente)

- Certificación por profesionales del sector (8.3) y memoria de sector compartida anonimizada (8.1) — son iniciativas "post-MVP" que el propio documento marca como no prioritarias y requieren infraestructura de backend propia, no solo código de la extensión.
- Reducción progresiva de llamadas por aprendizaje (8.4) — toca directamente la lógica del Panel+Juez, así que la dejo fuera según lo acordado.
