---
tags: [categoria, "tema/conectores", conector-mcp]
---

# Conectores (ecosistema MCP de Claude)

Catálogo de 59 conectores MCP tomados directamente del directorio oficial de Claude (claude.com/connectors, vía [rdmgator12/awesome-claude-connectors](https://github.com/rdmgator12/awesome-claude-connectors) — 343 conectores verificados en total, esta es una selección curada de los más relevantes para X1). Todos son Nivel 1 (MCP) por definición — el mismo protocolo que `X1MCPClient` ya implementa. Petición explícita de Ivan (2026-07-05): "añade todos los conectores que puedas, si es posible todos los de Claude".

Distinto de los demás clústeres: esto no son personas/especialistas, son **conectores de infraestructura/datos** — encajan con cualquier rol (Legal puede usar Docusign, Finanzas puede usar Stripe, etc.), así que viven en su propio clúster transversal en vez de plegarse en uno temático.

### AI y ML

| Conector | Qué conecta |
|---|---|
| [[Hugging-Face]] | catálogo de modelos y datasets, inferencia |
| [[ElevenLabs-Agents]] | voz sintética y agentes de voz |
| [[Wolfram]] | cómputo simbólico y conocimiento estructurado |
| [[Mem0]] | memoria persistente para agentes de IA |

### Automatización e integración

| Conector | Qué conecta |
|---|---|
| [[Zapier]] | conecta miles de apps sin código, el conector "universal" |
| [[n8n]] | automatización visual self-hosted, alternativa abierta a Zapier |
| [[Make]] | automatización visual (ex-Integromat) |
| [[IFTTT]] | automatización simple consumer-grade |
| [[Workato]] | integración enterprise |

### Calendario y programación

| Conector | Qué conecta |
|---|---|
| [[Google-Calendar]] | ya cubierto en X1 vía googleApi() inline — este es el MCP oficial equivalente |
| [[Calendly]] | programación de reuniones con disponibilidad pública |
| [[Clockwise]] | optimización de calendario de equipo |

### Nube e infraestructura

| Conector | Qué conecta |
|---|---|
| [[AWS-API-MCP-Server]] | servidor MCP oficial de AWS |
| [[Azure-MCP-Server]] | servidor MCP oficial de Azure |
| [[Cloudflare]] | Workers, DNS, KV — X1 ya tiene su propio Worker desplegado |
| [[Kubernetes]] | gestión de clústeres |
| [[Vercel]] | despliegue de apps web |
| [[Supabase]] | Postgres + auth + storage as a service |

### CMS y construcción web

| Conector | Qué conecta |
|---|---|
| [[Shopify]] | e-commerce — complementa el CRM ya integrado (Pipedrive/HubSpot) |
| [[WordPresscom]] | gestión de contenido |
| [[Webflow]] | diseño web visual con código real |

### Comunicación

| Conector | Qué conecta |
|---|---|
| [[Slack]] | mensajería de equipo — altísimo valor, patrón idéntico a Gmail ya integrado |
| [[Gmail]] | MCP oficial — X1 ya tiene su propia integración inline, alternativa estándar |
| [[Outlook]] | correo/calendario Microsoft, para usuarios fuera de Google Workspace |
| [[Zoom]] | videollamadas — relevante para la transcripción de reuniones ya existente |
| [[Twilio]] | SMS/voz programático |

### Atención al cliente

| Conector | Qué conecta |
|---|---|
| [[Intercom]] | chat de soporte y CRM de clientes |
| [[Zoho-Desk]] | helpdesk |

### Datos y analítica

| Conector | Qué conecta |
|---|---|
| [[BigQuery]] | data warehouse de Google |
| [[Snowflake]] | data warehouse |
| [[PostHog]] | analítica de producto open-source |
| [[Metabase]] | BI open-source self-hosted |

### Diseño y creatividad

| Conector | Qué conecta |
|---|---|
| [[Figma]] | diseño de interfaces — alto valor para el rol de Design ya en la bóveda |
| [[Canva]] | diseño gráfico simplificado |
| [[Miro]] | pizarra colaborativa |

### Herramientas de desarrollo

| Conector | Qué conecta |
|---|---|
| [[GitHub-MCP]] | oficial — issues, PRs, código — el más natural de todos dado que ya clonamos repos de GitHub a mano |
| [[GitLab]] | alternativa self-hostable a GitHub |
| [[Sourcegraph]] | búsqueda de código a gran escala |

### Documentos y archivos

| Conector | Qué conecta |
|---|---|
| [[Google-Drive]] | MCP oficial — X1 ya tiene su propia integración inline, alternativa estándar |
| [[Dropbox]] | almacenamiento de archivos |
| [[Docusign]] | firma electrónica — encaja directamente con el rol Legal |

### Finanzas y trading

| Conector | Qué conecta |
|---|---|
| [[Stripe]] | pagos — alto valor, X1 ya genera facturas (Invoice-Generator) |
| [[QuickBooks]] | contabilidad — encaja con el rol de Finanzas |
| [[Xero]] | contabilidad, alternativa a QuickBooks |
| [[PayPal]] | pagos |

### Jobs / empleo

| Conector | Qué conecta |
|---|---|
| [[LinkedIn]] | búsqueda de candidatos y networking profesional |
| [[Indeed]] | bolsa de empleo |

### Legal

| Conector | Qué conecta |
|---|---|
| [[CourtListener]] | jurisprudencia real, base de datos legal pública — encaja con el hueco de "investigación jurídica" del Lote 1 |
| [[Harvey]] | plataforma legal de IA para despachos |

### Marketing y ventas

| Conector | Qué conecta |
|---|---|
| [[HubSpot]] | ya integrado en X1 (CRM push) — este es el MCP oficial, más completo que el wrapper actual |
| [[Salesforce]] | CRM enterprise — alternativa/complemento a Pipedrive/HubSpot |
| [[Apolloio]] | prospección B2B y datos de contacto |

### Gestión de proyectos

| Conector | Qué conecta |
|---|---|
| [[Jira]] | seguimiento de tickets/sprints — muy usado, encaja con Operaciones/PMO |
| [[Asana]] | gestión de tareas de equipo |
| [[Linear]] | seguimiento de issues moderno, muy usado en equipos de producto/ingeniería |
| [[Mondaycom]] | gestión de trabajo visual |

### Productividad

| Conector | Qué conecta |
|---|---|
| [[Notion]] | notas/wiki/bases de datos — altísimo valor, el más pedido de esta categoría |
| [[Microsoft-Teams]] | comunicación/colaboración Microsoft |
| [[Evernote]] | notas personales |

## Enlaces
[[00-Indice]]
