---
tags: [sistema/codigo-seguridad]
---

# Arquitectura de X1 — resumen

**Fuente completa:** `X1/docs/SYSTEM_ARCHITECTURE.md`. Extensión Chrome MV3 (`manifest_version: 3`).

## Piezas principales

- **Service worker** (`background/service-worker.js`) — proceso de fondo único, sin `window` (solo `self`), carga decenas de módulos vía `importScripts()` en un orden concreto que importa (un módulo que rompe aborta todo lo que viene después en la lista).
- **Content scripts** — inyectados por dominio (`content/gmail.js` en `mail.google.com`, `content/calendar.js` en `calendar.google.com`, etc.), más scripts de interacción genéricos (`content/pointer-interaction.js`).
- **Side panel** — UI en DOM plano, sin framework; se comunica con el service worker por mensajes (`PING`/`VOICE_COMMAND_EXEC` → `X1_STEP_PROGRESS`/`X1_VOICE_RESPONSE`), con un fallback de polling cada 300ms sobre `chrome.storage.local` por si se pierde la carrera de mensajes.

## Permisos declarados (`manifest.json`)

`identity, storage, tabs, tabGroups, alarms, scripting, notifications, offscreen, sidePanel, downloads`. `host_permissions` incluye dominios específicos de Google Workspace (Gmail, Calendar, Docs, Sheets, Drive) más `https://*/*` y `http://*/*` — acceso amplio, coherente con ser un "agente de navegador" que actúa sobre cualquier página.

## OAuth2

Scopes de Google: Gmail (readonly/compose/send/modify), Calendar (readonly/events), Sheets, Docs, Drive (readonly/file), Tasks, Contacts (readonly) — todo bajo un único `client_id` en el manifest.

## Enlaces
[[00-Codigo-Seguridad]] · [[Seguridad-Extension]]
