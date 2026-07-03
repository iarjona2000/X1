# X1 — Lo que hemos incorporado

Inventario positivo: solo lo que existe y está construido, sin bugs ni pendientes (eso vive en `docs/ISSUES_NEEDING_YOUR_INPUT.md`). Companion de `docs/SYSTEM_ARCHITECTURE.md`, que tiene el detalle técnico completo (líneas de código, citas file:line) de cada pieza mencionada aquí.

**Actualizado 2026-07-04** tras fusionar las dos ramas divergentes (la tuya vía mí, y la de tu socio tras su force-push) tal y como quedaron en `origin/main` commit `d1bd864`. Incluye ya el trabajo de tu socio: FCC (Free Claude Code) como nuevo proveedor rápido, el gateway Python vendorizado, y sus fixes de timeout/panel.

Cada elemento lleva una etiqueta de madurez, no es un bug, es solo honestidad sobre el alcance:
- 🟢 **En vivo** — se ejecuta hoy desde un comando de voz/acción real.
- 🟡 **Construido, sin conectar** — el código existe y funciona si se llama, pero nada lo llama todavía.
- ⚪ **Parcial** — funciona en algunos casos/condiciones, no en todos.

---

## 1. Agentes externos

La capa de "cualquier agente o IA externo se puede añadir".

### Modelos de IA como agentes intercambiables
- 🟢 **6 proveedores de modelo activos** en el catálogo propio: 5 modelos NVIDIA NIM (GLM 5.1, Nemotron-3 Ultra, gpt-oss 120B, Llama 4 Maverick, Qwen3 Coder 480B) + Gemini 2.5 Flash — cascada con fallback, circuit breaker y rate limiting real en el Worker de Cloudflare (`worker/src/lib.js`).
- 🟢 **FCC — Free Claude Code** (nuevo, fusionado 2026-07-04): un gateway Python completo (`background/integrations/free-claude-code/`, proyecto vendorizado de terceros) que enruta a **18 proveedores más** (OpenRouter, DeepSeek, Groq, Cerebras, Mistral, Kimi, Wafer, Fireworks, LM Studio, llama.cpp, Codestral, Zai, y más) mediante la Anthropic Messages API — X1 lo consulta como un proveedor rápido más de bajo nivel (`fcc-bridge.js`), con detección de disponibilidad y timeout propio.
- 🟢 **Proxy propio (Cloudflare Worker)** desplegado y en producción (`x1-proxy.baosx1.workers.dev`), con auth por secreto compartido y catálogo de proveedores versionado (`worker/src/providers.config.js`) — añadir un proveedor nuevo es una entrada de configuración.
- 🟢 **Ollama local** como proveedor offline/privado, con detección automática del modelo instalado.
- 🟢 **Groq** restaurado con una implementación real (fetch directo a la API, tier gratuito) tras la fusión — antes solo era una referencia rota.
- 🟡 **`X1Pool`** (`background/ai/ai-pool.js`) — registro formal de proveedores (register/get/getActive/getByFamily/select) con 8 proveedores registrados correctamente (los 6 de antes + FCC + Groq).

### Sistema de agentes (personas con rol)
- 🟢 **16 agentes construidos** entre dos catálogos (`X1AgentManager`: research/legal/marketing/finance/support/writer/developer; x1-core `AgentManager` vía `agents-x1.js`: research/email/code/meeting/writing/analyst), cada uno con system prompt propio, disparadores de voz en español, y llamada real a la cascada de IA.
- 🟢 **`AgentRuntime`** (x1-core) — bucle ReAct real con tool-calling nativo (OpenAI-style function defs) y fallback de parseo inline para proveedores sin function-calling nativo.
- 🟢 **`ToolRegistry`** — registro de herramientas invocables por un agente, con esquema de función auto-generado.

### Catálogo externo (Obsidian vault, dentro del repo en `vault/`)
- 🟢 **217 personas importadas** de [agency-agents](https://github.com/msitarzewski/agency-agents) (16 divisiones reales: ingeniería, seguridad, marketing, finanzas, diseño, GIS, testing, etc.), catalogadas y organizadas en 15 clusters temáticos aislados.
- 🟢 **16 de esas personas promovidas a plugins reales** de X1 (`background/plugins/agency-plugins.js`) — invocables por voz, con extracción de página cuando aplica.
- 🟢 **Candidatos de agentes externos reales investigados** por rol ABOS (CFO, CMO, Legal, RRHH, Research, Operaciones, Atención al cliente, Ventas) con nivel de integración evaluado (MCP / API self-hosted / SaaS / prompt).
- 🟢 **Descubrimiento programático de más agentes**: `mcpRegistrySearch()` consulta en vivo el registro oficial de MCP (`registry.modelcontextprotocol.io`, +9.650 servidores).

### Protocolo estándar para conectar cualquier agente
- 🟢 **Cliente MCP completo** (`X1MCPClient`, `background/mcp/client.js`) — JSON-RPC 2.0 real sobre HTTP/SSE, `addServer/callTool/listTools/testConnection`. Este es el mecanismo de nivel 1 (coste ~cero) para incorporar cualquier agente que exponga un servidor MCP.
- 🟢 **22 bridges a herramientas/frameworks de IA de terceros** (`background/ai/*-bridge.js`) — Transformers, Open WebUI, ChromaDB, D3, LangChain, Whisper, LlamaIndex, Kilo, Piper, HuggingFace, WebLLM (inferencia local vía WebGPU), SQLite, LevelDB, y más — todos registrados en un registro central (`X1Integrations`).
- 🟢 **Motor de plugins declarativo** (`X1PluginEngine`) — cualquier agente/tarea se puede definir como manifiesto JSON (id, trigger, pasos) sin tocar código, con 8 tipos de paso (search/synthesize/navigate/extract/write/webhook/notify/calculate).

---

## 2. Orquestación

La capa que decide qué agente/modelo usar y cómo combinar resultados.

### Motor de comandos de voz (el despachador central)
- 🟢 **Gramática de acciones completa** (`SYSTEM_PROMPT`) — ~130 líneas definiendo el contrato JSON que cualquier modelo debe seguir, con reglas de decisión rápida, ejemplos, y contexto dinámico (fecha, página actual, memoria, grafo de conocimiento).
- 🟢 **Despachador de acciones** (`execAction`) — 129 casos cubriendo ~118 acciones distintas: navegación, Gmail, Calendar, Docs, extracción, agentes, plugins, skills, MCP, finanzas, imagen, SEO, research, automatización.
- 🟢 **Parser de comandos regex** (`parseCommand`) — capa rápida para ~40 patrones inequívocos (configuración, negociación, CRM, keys) antes de escalar al LLM — evita mandar comandos sensibles/estructurados a un modelo.
- 🟢 **Encadenamiento de pasos** (`steps`) — una acción compuesta puede ejecutar N sub-acciones en secuencia, pasando resultados de una a la siguiente.

### Cascada multi-modelo y selección
- 🟢 **`aiComplete()`** — punto de entrada único usado en 20+ sitios: cache de respuesta, ruta rápida por el proxy de Cloudflare, **ruta rápida por FCC si está corriendo en local** (nuevo, fusionado 2026-07-04 — comprobado en el propio código: es un fast-path real dentro de `aiComplete`, no solo un registro sin usar), ruta rápida local (WebLLM), clasificación de complejidad, y solo si nada de eso responde, selección de 1-2 proveedores en paralelo con carrera por velocidad y scoring heurístico.
- 🟢 **FCC como fast-path prioritario** — cuando el proxy local FCC está disponible (`start-fcc.bat`), `aiComplete()` lo consulta directamente (`X1FCCBridge.generateText`) antes de llegar a la cascada normal. Es una mejora real y en vivo de la calidad/fiabilidad de una respuesta individual — no implementa por sí mismo comparación entre varias respuestas ni juicio (ver abajo, sigue siendo "un proveedor", no "el juez").
- 🟢 **`ROUTE_MATRIX`** — enrutado por tipo de tarea (conversacional/código/sensible/agente), con una ruta explícitamente privada-only (`sensitive: ['ollama']`, sin fallback a la nube) por decisión de diseño.
- 🟡 **Sistema de panel + juez con rúbricas** (`RUBRICS`, `judgeRound`, activación selectiva, límite diario, rotación de juez) — arquitectura completa de evaluación por rúbrica técnica, con calibración histórica.
- 🟡 **`X1Judge`** — análisis de consulta (9 tipos, complejidad, intención, idioma, entidades — esta parte sí está en vivo), matriz de votantes, consenso, y un pipeline completo de juicio con atajo de WebLLM-como-juez.
- 🟡 **`EnsembleEngine` + `JudgeSystem`** (x1-core) — abanico real de N modelos en paralelo con etiquetado ciego A/B/C y scoring por rúbrica, expuesto end-to-end vía mensajería `X1_API`.
- 🟡 **`Orchestrator`** (x1-core) — chat/planTask/selectModel/budgetStatus/compare/recordVote/factCheck/health, clase central que coordina las piezas de arriba.
- 🟡 **`CollaborativeEngine`** — equipos de agentes con nombre, ejecución ad-hoc multi-agente.
- 🟡 **`TaskGraph`** — orquestador de estado tipo LangGraph (nodos, aristas condicionales, ejecución con límite de pasos).
- 🟡 **`TreeOfThoughts`** — planificador real por beam-search: propone N pasos candidatos, el LLM puntúa cada plan parcial, se queda con los mejores.

### Automatización y reglas
- 🟢 **Motor de reglas** (`X1AutomationEngine`) — disparadores por cron (5 campos, con rangos/listas/steps) o por visita a página, ejecutando un plugin o una acción.
- 🟢 **Motor de skills** (`X1SkillEngine`) — macros nombradas multi-paso con templating de parámetros entre pasos.
- 🟢 **Presupuesto y coste** (`BudgetManager`, x1-core) — seguimiento real de gasto diario/mensual, gate de "puedo permitírmelo", selección del modelo más barato que cumple el trabajo.

---

## 3. Conectores

La capa de "manipular documentos y sistemas externos".

### Google Workspace
- 🟢 **Gmail** — leer, resumir, redactar, responder, triage, etiquetar, buscar.
- 🟢 **Calendar** — crear/editar/borrar eventos, buscar huecos libres, vista semanal.
- 🟢 **Docs** — creación de documentos nuevos y escritura de texto en vivo, con fallback de escritura simulada si la API falla.
- 🟢 **Sheets** — lectura y escritura de hojas de cálculo.
- 🟢 **Drive** — listar/leer/crear archivos.
- 🟢 **`X1GoogleAuth`/`X1GmailAPI`/`X1CalendarAPI`/`X1DriveAPI`** — wrappers completos y bien construidos de las 4 APIs, listos para reutilizar.

### Extracción y manipulación de datos
- 🟢 **Extracción estructurada** (`extractStructuredData` + `jsonToCsv`) — con fallback a Firecrawl para páginas protegidas/SPA, descarga real de CSV.
- 🟢 **Extracción libre por IA** (`X1DataExtractor.extractWithAI`) — JSON de forma libre a partir del contenido de la página.
- 🟢 **Alt+Click visual** — pregunta sobre cualquier región de la pantalla (captura + recorte + modelo de visión, con NVIDIA Llama 4 Maverick y Gemini como proveedores de visión).
- 🟢 **Transcripción de reuniones** — captura de audio vía Web Speech API, extracción de participantes/decisiones/tareas por IA, creación real de tareas.

### Conectores de negocio
- 🟢 **CRM** — envío de leads a Pipedrive y HubSpot.
- 🟢 **Finanzas** — cotizaciones y perfiles de empresa vía Finnhub, series temporales y cripto vía AlphaVantage.
- 🟢 **Generación de imágenes** — Cloudflare Flux con fallback a OpenAI DALL-E 3, historial guardado.
- 🟢 **Facturación** — generación de facturas vía Invoice-Generator.com.
- 🟢 **Webhooks salientes** — integración con n8n para disparar flujos externos.
- 🟢 **SEO** — análisis on-page (títulos, meta, headings, enlaces, Open Graph, JSON-LD) con puntuación.
- 🟢 **Research profundo** — expansión de consulta multi-paso con síntesis final por IA.
- 🟢 **Estilo de escritura** — aprendizaje del tono/complejidad/formalidad del usuario a partir de muestras, reutilizado en generación futura.
- 🟢 **Chat/debate multi-proveedor** (`X1GroupChat`) — varios modelos debatiendo la misma pregunta en rondas.
- 🟢 **Memoria semántica real** (`MemoryManager`, x1-core) — embeddings reales (con fallback determinista sin clave de API), búsqueda por similitud coseno, anonimización de PII antes de guardar.

### Interfaz y activación
- 🟢 **Panel lateral con voz** — reconocimiento de voz continuo, terminal-styled, español por defecto.
- 🟢 **Asistente flotante en cualquier página** — panel inyectado en toda web, con detección de interrupción (barge-in) mientras X1 habla.
- 🟢 **Barra de selección de texto** — resumir/explicar/traducir/reescribir/preguntar/guardar sobre cualquier texto seleccionado.
- 🟢 **Detector de doble palmada** — activación manos libres del asistente.

---

## Balance por capa

| Capa | Amplitud | Profundidad real |
|---|---|---|
| **Agentes externos** | Muy amplia — 6+18 modelos (FCC), 16+217 personas, MCP real, 22 bridges | Sólida en el mecanismo de incorporación (MCP, plugins, cascada, FCC); variable en los bridges individuales |
| **Orquestación** | Muy amplia — 5 sistemas de juicio/comparación construidos, planificador, presupuesto, equipos, y ahora FCC como fast-path real | FCC mejora la calidad de **una** respuesta individual, en vivo. Pero seguir comparando/juzgando entre varias respuestas — el corazón de "Panel+Juez" — sigue sin correr: los 5 sistemas construidos para eso continúan desconectados del camino real |
| **Conectores** | Amplia y madura — Google Workspace completo, extracción, CRM, finanzas, imagen, voz | La capa más terminada del proyecto — casi todo lo listado aquí corre en producción hoy |
