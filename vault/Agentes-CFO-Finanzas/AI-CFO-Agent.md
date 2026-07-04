---
tags: [agente, finanzas, candidato]
tier: rest-api-self-hosted
rol_abos: CFO Agent
estado: candidato-fase-1
---

# AI CFO Agent

**Qué hace:** Subes un CSV de transacciones semanales → en ~30s genera un "cockpit financiero": Financial Health Score, KPIs, runway y análisis Monte Carlo de supervivencia, inteligencia competitiva, informes con IA y un "CFO Decision Engine".

**Repositorio:** [github.com/daniel-st3/ai-cfo-agent](https://github.com/daniel-st3/ai-cfo-agent)
**Stack:** FastAPI + LangGraph + Next.js + Claude Haiku
**Licencia:** MIT confirmada ("fork it, deploy it, build products on top of it") — verificado 2026-07-04
**Coste:** self-hosted, ~$0.003 por ejecución de LLM (paga el usuario su propia clave Claude)

## Endpoints reales (verificados contra el README, 2026-07-04)
`POST /analyze` (subir CSV, multipart/form-data: date, category, amount, customer_id) · `POST /report` (briefing CFO) · `POST /board-prep` · `POST /vc-memo` · `GET /benchmarks` · `GET /analyze/template` (plantilla CSV en blanco) · WebSocket `ws://localhost:8000/ws/pipeline/{run_id}` (progreso en tiempo real).

## YA CONSTRUIDO en X1 (esta noche, 2026-07-04)
- `cfoAgentAnalyze(csvText)` en `background/service-worker.js` — hace el POST /analyze real con FormData.
- Campo Settings `cfoAgentUrl`.
- Comando de voz: `analiza finanzas con cfo agent: <csv pegado>`.
- **No probado en vivo** (necesita el servidor corriendo) — el contrato de API está verificado por documentación, no por llamada real.

## Despliegue (lo ejecutas tú, verificado contra el README real 2026-07-04)
```bash
git clone https://github.com/daniel-st3/ai-cfo-agent.git
cd ai-cfo-agent
# ver README para variables de entorno (clave Claude)
.venv/bin/uvicorn api.main:app --host 0.0.0.0 --port 8000
```
Sin Docker necesario para desarrollo — producción usa `gunicorn` con workers uvicorn.

## Enlaces
[[00-CFO]] · [[01-Mecanismo-de-Integracion]]
