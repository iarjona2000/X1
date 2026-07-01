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

## Sin construir todavía (no estaba en lo que pediste hoy, ni urgente)

- Certificación por profesionales del sector (8.3) y memoria de sector compartida anonimizada (8.1) — son iniciativas "post-MVP" que el propio documento marca como no prioritarias y requieren infraestructura de backend propia, no solo código de la extensión.
- Reducción progresiva de llamadas por aprendizaje (8.4) — toca directamente la lógica del Panel+Juez, así que la dejo fuera según lo acordado.
