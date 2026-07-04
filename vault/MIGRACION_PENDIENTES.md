---
tags: [meta, migracion]
---

# Migración de manifest — notas pendientes de revisión manual

Generado por `scripts/migrate-vault.cjs` en modo **dry-run** (2026-07-04). Ninguna nota fue modificada.

Resumen: **0** notas listas para manifest automático · **118** requieren revisión manual · 118 totales.

El campo que más frecuentemente falta es `integration_ref` — el spec §12 ya avisa de que ese dato (cómo se conecta el agente en la práctica) casi nunca puede inferirse del texto de la nota y debe rellenarse a mano, en vez de con un valor por defecto que rompería el dispatch (§10) sin avisar.

| Nota | Clúster | Nivel | Motivos de revisión |
|---|---|---|---|
| `vault\Agentes-CEO-Estrategia\Firecrawl.md` | ceo-estrategia | 3 | falta integration_ref (nivel 3) — dato de conexión real, revisión manual |
| `vault\Agentes-CEO-Estrategia\GPT-Researcher.md` | ceo-estrategia | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CEO-Estrategia\OpenOKR.md` | ceo-estrategia | ? | sin capacidades (capacidades) declaradas; nivel de integración no inferible |
| `vault\Agentes-CEO-Estrategia\OpenOSINT.md` | ceo-estrategia | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-CEO-Estrategia\OpenTwins.md` | ceo-estrategia | ? | sin capacidades (capacidades) declaradas; nivel de integración no inferible |
| `vault\Agentes-CEO-Estrategia\OSINT-Agent-Skills.md` | ceo-estrategia | 1 | falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-CEO-Estrategia\Second-Me.md` | ceo-estrategia | ? | sin capacidades (capacidades) declaradas; nivel de integración no inferible |
| `vault\Agentes-CEO-Estrategia\SpiderFoot.md` | ceo-estrategia | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CEO-Estrategia\Taranis-AI.md` | ceo-estrategia | ? | sin capacidades (capacidades) declaradas; nivel de integración no inferible |
| `vault\Agentes-CEO-Estrategia\TrendRadar.md` | ceo-estrategia | 1 | falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-CFO-Finanzas\AI-CFO-Agent.md` | cfo-finanzas | 2 | sin capacidades (capacidades) declaradas; falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CFO-Finanzas\AI-Trader.md` | cfo-finanzas | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CFO-Finanzas\FinRL.md` | cfo-finanzas | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CFO-Finanzas\FinRobot.md` | cfo-finanzas | 2 | sin capacidades (capacidades) declaradas; falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CFO-Finanzas\OpenBB.md` | cfo-finanzas | 1 | falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-CFO-Finanzas\TradingAgents.md` | cfo-finanzas | ? | sin capacidades (capacidades) declaradas; nivel de integración no inferible |
| `vault\Agentes-CMO-Marketing\Claude-SEO.md` | cmo-marketing | ? | sin capacidades (capacidades) declaradas; nivel de integración no inferible |
| `vault\Agentes-CMO-Marketing\OpenSEO.md` | cmo-marketing | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-CMO-Marketing\Postiz.md` | cmo-marketing | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CMO-Marketing\SEO-Agent-Playwright.md` | cmo-marketing | ? | sin capacidades (capacidades) declaradas; nivel de integración no inferible |
| `vault\Agentes-CLO-Legal\AI-Legal-Claude.md` | clo-legal | ? | sin capacidades (capacidades) declaradas; nivel de integración no inferible |
| `vault\Agentes-CLO-Legal\Legal-MCP.md` | clo-legal | 1 | falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-CLO-Legal\OpenContracts.md` | clo-legal | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-CHRO-RRHH\EazyRecruit.md` | chro-rrhh | ? | sin capacidades (capacidades) declaradas; nivel de integración no inferible |
| `vault\Agentes-CHRO-RRHH\Hiring-Agent-Interviewstreet.md` | chro-rrhh | ? | sin capacidades (capacidades) declaradas; nivel de integración no inferible |
| `vault\Agentes-CHRO-RRHH\Horilla.md` | chro-rrhh | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CHRO-RRHH\ResumeGPT.md` | chro-rrhh | ? | sin capacidades (capacidades) declaradas; nivel de integración no inferible |
| `vault\Agentes-CRO-Ventas\Twenty.md` | cro-ventas | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-COO-Operaciones\Activepieces.md` | coo-operaciones | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-COO-Operaciones\Chatwoot.md` | coo-operaciones | 2 | sin capacidades (capacidades) declaradas; falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-COO-Operaciones\Frappe-Helpdesk.md` | coo-operaciones | ? | sin capacidades (capacidades) declaradas; nivel de integración no inferible |
| `vault\Agentes-COO-Operaciones\Huginn.md` | coo-operaciones | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-COO-Operaciones\Kestra.md` | coo-operaciones | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-COO-Operaciones\NocoBase.md` | coo-operaciones | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-COO-Operaciones\Plexo.md` | coo-operaciones | ? | sin capacidades (capacidades) declaradas; nivel de integración no inferible |
| `vault\Agentes-COO-Operaciones\PMO-CrewAI.md` | coo-operaciones | ? | sin capacidades (capacidades) declaradas; nivel de integración no inferible |
| `vault\Agentes-CTO-Tecnico\Aider.md` | cto-tecnico | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CTO-Tecnico\AnythingLLM.md` | cto-tecnico | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CTO-Tecnico\AutoGen.md` | cto-tecnico | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CTO-Tecnico\Browser-Use.md` | cto-tecnico | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CTO-Tecnico\Chat2DB.md` | cto-tecnico | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CTO-Tecnico\Coqui-TTS.md` | cto-tecnico | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CTO-Tecnico\Crawl4AI.md` | cto-tecnico | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CTO-Tecnico\FastMCP.md` | cto-tecnico | 1 | falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-CTO-Tecnico\LangGraph.md` | cto-tecnico | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CTO-Tecnico\LiteLLM.md` | cto-tecnico | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CTO-Tecnico\MCP-Servers-Oficial.md` | cto-tecnico | 1 | falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-CTO-Tecnico\MinerU.md` | cto-tecnico | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CTO-Tecnico\Ollama.md` | cto-tecnico | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CTO-Tecnico\OmniParser.md` | cto-tecnico | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CTO-Tecnico\PaddleOCR.md` | cto-tecnico | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CTO-Tecnico\Qdrant.md` | cto-tecnico | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CTO-Tecnico\Shannon.md` | cto-tecnico | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CTO-Tecnico\vLLM.md` | cto-tecnico | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CTO-Tecnico\Whisper.md` | cto-tecnico | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-CTO-Tecnico\Zerox.md` | cto-tecnico | 2 | falta integration_ref (nivel 2) — dato de conexión real, revisión manual |
| `vault\Agentes-Conectores\Apolloio.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Asana.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\AWS-API-MCP-Server.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Azure-MCP-Server.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\BigQuery.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Calendly.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Canva.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Chrome-DevTools-MCP.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Clockwise.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Cloudflare.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\CourtListener.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Docusign.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Dropbox.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\ElevenLabs-Agents.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Evernote.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Figma.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\GitHub-MCP.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\GitLab.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Gmail.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Google-Calendar.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Google-Drive.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Harvey.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\HubSpot.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Hugging-Face.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\IFTTT.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Indeed.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Intercom.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Jira.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Kubernetes.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Linear.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\LinkedIn.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Make.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\MCP-Toolbox-Databases.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Mem0.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Metabase.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Microsoft-Teams.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Miro.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Mondaycom.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\n8n.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Notion.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Outlook.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\PayPal.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Playwright-MCP.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\PostHog.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\QuickBooks.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Salesforce.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Shopify.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Slack.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Snowflake.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Sourcegraph.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Stripe.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Supabase.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Twilio.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Vercel.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Webflow.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Wolfram.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\WordPresscom.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Workato.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Xero.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Zapier.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Zoho-Desk.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
| `vault\Agentes-Conectores\Zoom.md` | conectores | 1 | sin capacidades (capacidades) declaradas; falta integration_ref (nombre de herramienta MCP) |
