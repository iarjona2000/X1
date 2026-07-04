---
tags: [agente, atencion-cliente, candidato]
tier: rest-api-self-hosted
rol_abos: Customer Service Agent
estado: candidato-fase-1
---

# Chatwoot

**Qué hace:** Plataforma de atención al cliente open-source y autoalojada — chat en vivo, soporte por email, bandeja omnicanal. Alternativa directa a Intercom/Zendesk/Salesforce Service Cloud, con IA para clasificación y respuesta.

**Repositorio:** [github.com/chatwoot/chatwoot](https://github.com/chatwoot/chatwoot)
**Madurez:** muy alta, proyecto establecido con API REST documentada.

## Cómo se conectaría a X1
Nivel 2 (self-hosted API): el usuario despliega Chatwoot (Docker oficial disponible), X1 usa su API REST para clasificar/enrutar mensajes entrantes y generar respuestas asistidas — mismo patrón que Pipedrive/HubSpot ya construidos esta sesión.

## Despliegue — sin comando de una línea (verificado 2026-07-04)
El README no trae un `docker run` copiar-pegar simple — Chatwoot es lo bastante grande (Rails + Postgres + Redis + Sidekiq) que su despliegue real está en [chatwoot.com/deploy](https://chatwoot.com/deploy) (con opciones de un clic para Heroku/DigitalOcean) o la imagen Docker en [hub.docker.com/r/chatwoot/chatwoot](https://hub.docker.com/r/chatwoot/chatwoot). Sigue siendo el candidato más maduro de la categoría, pero el despliegue es una tarde de trabajo, no 5 minutos — ten esto en cuenta antes de priorizarlo.

## Enlaces
[[00-COO]] · [[01-Mecanismo-de-Integracion]]
