---
tags: [agente, legal, candidato]
tier: mcp
rol_abos: CLO Agent
estado: candidato-fase-1
---

# OpenContracts

**Qué hace:** Plataforma de inteligencia documental open-source — grafo de citas programable con anotación humana, extracción estructurada, agentes de IA, y **servidor MCP integrado**. Autoalojable.

**Repositorio:** [github.com/Open-Source-Legal/OpenContracts](https://github.com/Open-Source-Legal/OpenContracts)
**Licencia:** MIT

## Cómo se conectaría a X1
Nivel 1 (MCP) confirmado — el README expone endpoints HTTP reales: `/mcp/` (público, corpus anónimos) y `/mcp/me/` (autenticado). Esto SÍ es HTTP, compatible con `X1MCPClient` (a diferencia de [[../Agentes-Research/OpenOSINT|OpenOSINT]], que usa stdio). El usuario despliega OpenContracts, añade `http://localhost:3000/mcp/` (o el puerto que use) en Settings de X1, disponible vía `mcpCall`.

## Despliegue (lo ejecutas tú, verificado contra el README real 2026-07-04)
```bash
git clone https://github.com/Open-Source-Legal/OpenContracts.git
cd OpenContracts
mkdir -p .envs/.local
cp ./docs/sample_env_files/backend/local/.django ./.envs/.local/.django
cp ./docs/sample_env_files/backend/local/.postgres ./.envs/.local/.postgres
cp ./docs/sample_env_files/frontend/local/django.auth.env ./.envs/.local/.frontend
docker compose -f local.yml build
docker compose -f local.yml --profile fullstack up
```
Accede en `http://localhost:3000` con `admin` / `Openc0ntracts_def@ult` (cámbiala).

## Enlaces
[[00-Legal]] · [[01-Mecanismo-de-Integracion]]
