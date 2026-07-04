---
tags: [sistema/orquestacion]
---

# Cascada de proveedores — `aiComplete()`

**Fuente:** `background/service-worker.js`, función `aiComplete(userMsg, opts)` (~línea 3313). Solo documentación — no se ha tocado esta función.

Orden real de intentos, de más barato/rápido a más caro/lento:

1. **Caché de respuesta** (hash simple del mensaje, TTL 5 min) — si hay hit, ni siquiera se llama a un proveedor.
2. **FCC (Free Claude Code) bridge** — si `X1FCCBridge.isAvailable()` (proxy local o fallback cloud), responde por ahí y termina. Es el camino más barato con calidad tipo Claude.
3. **WebLLM local** — si hay un modelo cargado en el navegador (`X1WebLLMBridge.isLoaded()`), responde sin salir a red.
4. **Carrera simple de 1-2 proveedores** — para el resto de casos, usa `X1Judge.analyzeQuery()` (si existe) para clasificar la consulta y decide entre un proveedor o una carrera corta, en vez de mandar la pregunta a los 6-8 proveedores registrados en `X1Pool`.

## Por qué importa para la bóveda

Esta cascada es el motivo por el que **[[Propuestas-Vinculadas|las 5 propuestas de orquestación]]** de Ivan hablan de "reducir antes de decidir" — el mismo patrón (barato primero, caro solo si hace falta) es el que se propone para elegir *agentes* de la bóveda, no solo modelos de lenguaje.

## Enlaces
[[00-Sistema-Orquestacion]] · [[AI-Judge-Voting-Router-Pool]]
