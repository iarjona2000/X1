---
tags: [sistema/codigo-seguridad]
---

# Seguridad de la extensión — resumen

**Fuente completa:** `X1/docs/SYSTEM_ARCHITECTURE.md`, `X1/docs/X1_CAPABILITIES.md`.

## Manejo de claves de API

Las claves reales de proveedores de IA **no viven en el código de la extensión** — X1 tiene un proxy propio en Cloudflare Worker (`x1-proxy.baosx1.workers.dev`, en producción) que centraliza las claves del lado servidor; el catálogo de proveedores es configuración versionada (`worker/src/providers.config.js`), así que añadir un proveedor nuevo es una entrada de config, no una clave nueva en el cliente.

## La única excepción documentada

`service-worker.js:1417` — la extensión envía una cabecera `X-X1-Auth` con `aiKeys.proxySecret || PROXY_SHARED_SECRET`, y ese valor de fallback está hardcodeado en claro en el código fuente enviado. Es una excepción **ya discutida y aceptada**: no es una credencial real, es un identificador de aplicación para filtrar tráfico de escáneres automatizados contra el Worker — pero merece constar aquí para que quede trazado, no oculto.

## Por qué esta nota vive en `Codigo-Seguridad/` y no en `Sistema-Orquestacion/`

El proxy/Worker es infraestructura de despliegue y seguridad de X1 como programa, no parte del razonamiento del orquestador (Judge/Voting/Router/Ensemble, ver [[../Sistema-Orquestacion/00-Sistema-Orquestacion|Sistema-Orquestacion]]) — de ahí el clúster separado, siguiendo la misma regla de aislamiento por tema del resto de la bóveda.

## Enlaces
[[00-Codigo-Seguridad]] · [[Arquitectura-X1]]
