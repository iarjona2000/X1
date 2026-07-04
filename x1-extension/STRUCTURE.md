# X1 Project Structure (reference copy)

> Esta documentación describe la estructura de la **versión empaquetada con webpack** (`x1-extension/`).  
> La versión activa de X1 está en la raíz de `cbos-ext/`. Esta copia se mantiene como referencia.

---

## Árbol de directorios

```
x1-extension/
├── .env.example                  # Variables de entorno (plantilla)
├── .gitignore                    # Archivos a ignorar en Git
├── package.json                  # Dependencias NPM
├── webpack.config.js             # Configuración de bundling
├── jest.config.js                # Configuración de tests
├── manifest.json                 # Manifest de extensión MV3
│
├── dist/                         # 📦 Archivos compilados (generado por webpack)
│   ├── manifest.json
│   ├── popup.html
│   ├── options.html
│   ├── popup.js
│   ├── options.js
│   ├── background.js
│   ├── chat.js
│   ├── workspace.js
│   └── styles.css
│
├── src/
│   ├── core/                     # 🎯 Módulos centrales (lógica de negocio)
│   │   ├── crypto.js             # Cifrado AES-256 (generador de claves, encript/decrypt)
│   │   ├── storage.js            # Almacenamiento con cifrado (StorageManager)
│   │   ├── config.js             # Gestión de configuración (ConfigManager)
│   │   ├── models.js             # Integración multi-IA (ModelManager)
│   │   ├── judge.js              # Sistema de evaluación (JudgeSystem)
│   │   └── logger.js             # Sistema de logging (Logger)
│   │
│   ├── utils/                    # 🛠️ Utilidades compartidas
│   │   ├── constants.js          # Constantes: MODELS, SECTORS, SCORING_WEIGHTS
│   │   └── helpers.js            # Funciones auxiliares
│   │
│   ├── popup/                    # 💬 Interfaz de chat
│   │   ├── popup.html            # HTML del popup
│   │   ├── popup.js              # Lógica del popup (chat, comparación, historial)
│   │   └── popup.css             # Estilos del popup (glassmorphism, modo oscuro)
│   │
│   ├── options/                  # ⚙️ Página de configuración
│   │   ├── options.html          # HTML (API keys, sector routing, Ollama)
│   │   ├── options.js            # Lógica (guardar, probar conexiones, reset)
│   │   └── options.css           # Estilos (formularios, validación)
│   │
│   ├── background/               # 🔧 Service Worker
│   │   └── service-worker.js     # Enrutamiento de mensajes, cache
│   │
│   └── content/                  # 🌐 Content Scripts
│       ├── chat.js               # Inyecta widget flotante de chat
│       └── workspace.js          # Integración Gmail/Docs/Sheets/Calendar
│
├── tests/                        # 🧪 Tests unitarios
│   ├── judge.test.js             # Tests de evaluación
│   ├── models.test.js            # Tests de modelos
│   └── storage.test.js           # Tests de almacenamiento (opcional)
│
└── docs/                         # 📚 Documentación
    ├── API.md                    # Referencia de módulos y funciones
    ├── EXAMPLES.md               # Ejemplos de uso
    └── ARCHITECTURE.md           # Diagrama de arquitectura (opcional)
```

---

## Responsabilidades por módulo

### `src/core/crypto.js`

**Cifrado de datos con Web Crypto API**

```
CryptoManager (clase estática)
├── generateKeyFromPassword(password)     → genera clave AES-256 desde contraseña
├── encrypt(text, key)                    → cifra texto, retorna base64
├── decrypt(encryptedText, key)           → descifra texto
└── hash(text)                            → SHA-256 hash
```

**Usado por:** StorageManager para cifrar/descifrar datos

---

### `src/core/storage.js`

**Almacenamiento seguro local**

```
StorageManager (clase estática)
├── init(password)                        → inicializa clave de cifrado
├── set(key, value)                       → guarda dato cifrado
├── get(key)                              → obtiene y descifra dato
├── setApiKey(provider, key)              → guarda API key cifrada
├── getApiKey(provider)                   → obtiene API key
├── addVote(vote)                         → agrega voto a historial
├── getVotes()                            → obtiene todos los votos
├── addToHistory(message)                 → agrega al historial de chat
├── getHistory()                          → obtiene historial completo
├── clearHistory()                        → borra historial
└── delete(key)                           → elimina dato específico
```

**Almacenamiento:** `chrome.storage.local` (persistente)

---

### `src/core/config.js`

**Gestión de configuración**

```
ConfigManager (clase estática)
├── load()                                → carga configuración de storage
├── save(config)                          → persiste configuración
├── getModelForSector(sector)             → modelo asignado al sector
├── setModelForSector(sector, model)      → asigna modelo a sector
├── getRouting()                          → todas las rutas sector→modelo
├── setComparisonModels(numModels)        → cantidad de modelos a comparar
├── getOllamaConfig()                     → configuración de Ollama
├── setOllamaEnabled(enabled)             → habilita/deshabilita Ollama
├── setProactivityLevel(level)            → 'low' | 'medium' | 'high'
├── validateApiKeys()                     → verifica que hay keys configuradas
├── getProviderForModel(modelName)        → infiere proveedor desde modelo
└── reset()                               → vuelve a configuración por defecto
```

**Almacenamiento:** `chrome.storage.local` (persistente)

---

### `src/core/models.js`

**Integración multi-IA**

```
ModelManager (clase estática)
├── call(model, systemPrompt, userMessage, options)
│   └── retorna {text, model, tokens}
│   └── soporta: OpenAI, Anthropic, Google, Groq, HuggingFace, Ollama, Cohere
│
├── testConnection(provider)              → valida que proveedor funciona
├── getAvailableModels(provider)          → lista de modelos del proveedor
└── estimateCost(model, inputTokens, outputTokens)
    └── retorna costo en USD
```

**Proveedores:**
- OpenAI: gpt-4o, gpt-4-turbo, gpt-3.5-turbo
- Anthropic: claude-3.5-sonnet, claude-3-opus, claude-3-haiku
- Google: gemini-1.5-pro, gemini-1.5-flash
- Groq: mixtral-8x7b, llama2-70b
- HuggingFace: mistral-7b (gratuito)
- Ollama: llama3, mistral, phi3 (local)
- Cohere: command-r, command-light

---

### `src/core/judge.js`

**Sistema de evaluación y selección**

```
JudgeSystem (clase estática)
├── evaluateResponse(response, query)     → score 1-10 para respuesta
├── compare(responses, query)             → compara múltiples respuestas
│   └── retorna {winner, scores, consensus, ranking}
│
├── recordVote(vote)                      → guarda voto del usuario
├── updatePreferences(vote)               → aprende de preferencias
├── getPreferredModel(sector)             → modelo más votado para sector
│
├── hasNormativePrecision(text, query)    → check para sector legal
├── isWellStructured(text)                → check para sector legal
├── isPersuasive(text)                    → check para sector marketing
├── hasNumericAccuracy(text)              → check para sector finance
├── showsEmpathy(text)                    → check para sector support
├── isResolutive(text)                    → check para sector support
├── isFunctionallyCorrect(text)           → check para sector technical
└── hasHallucinations(text)               → detecta alucinaciones en cualquier respuesta
```

**Evaluación:**
- Valida longitud de respuesta (10-10k chars)
- Verifica relevancia (keywords en respuesta)
- Aplica pesos específicos por sector
- Detecta alucinaciones comunes

---

### `src/core/logger.js`

**Sistema de logging**

```
Logger (clase)
├── constructor(moduleName)               → crea logger con nombre
├── log(message, data?)                   → log genérico
├── debug(message, data?)                 → log con emoji 🐛
├── info(message)                         → log con emoji ℹ️
├── warn(message)                         → log con emoji ⚠️
├── error(message, error?)                → log con emoji ❌
└── success(message)                      → log con emoji ✅
```

**Formato:** `[ModuleName] Mensaje`

---

### `src/utils/constants.js`

**Constantes globales**

```
MODELS                                     → definiciones de modelos por proveedor
  ├── OPENAI
  ├── ANTHROPIC
  ├── GOOGLE
  ├── GROQ
  ├── HUGGINGFACE
  ├── OLLAMA
  └── COHERE

SECTORS                                    → tipos de dominio
  ├── LEGAL
  ├── MARKETING
  ├── FINANCE
  ├── SUPPORT
  ├── TECHNICAL
  └── GENERAL

SCORING_WEIGHTS                            → pesos de evaluación por sector
  ├── legal: {normativePrecision, clarity, structure}
  ├── marketing: {persuasion, brandTone, length}
  ├── finance: {numericAccuracy, explanation, comparison}
  ├── support: {empathy, resolution, clarity}
  ├── technical: {correctness, bestPractices, explanation}
  └── general: {relevance, clarity, completeness}
```

---

### `src/popup/popup.html`

**Interfaz de chat**

```html
<header>                           ← Logo + acciones
  <h1>X1</h1>
  <button>⚙️ Configuración</button>
  <button>📋 Historial</button>
</header>

<div id="chat">                     ← Área de mensajes
  <div class="message user">...</div>
  <div class="message assistant">...</div>
</div>

<div id="comparison">               ← Vista de comparación (oculta)
  <div class="option">...</div>   ← 2-4 opciones
  <button>👍 Esta es la mejor</button>
</div>

<div id="input">                    ← Área de entrada
  <textarea placeholder="Escribe aquí..."></textarea>
  <button>Enviar</button>
  <button>⚖️ Comparar</button>
</div>
```

---

### `src/options/options.html`

**Página de configuración**

```html
<section id="api-keys">            ← Ingreso de API keys
  <input type="password" placeholder="OpenAI key">
  <input type="password" placeholder="Anthropic key">
  ...
</section>

<section id="model-routing">        ← Rutas por sector
  <select>Modelo por defecto</select>
  <select>Sector legal</select>
  <select>Sector marketing</select>
  ...
</section>

<section id="comparison">           ← Configuración de comparación
  <select>Número de modelos</select>
</section>

<section id="ollama">               ← Soporte local
  <input type="checkbox">Habilitar Ollama
  <input type="text" placeholder="Endpoint">
</section>

<section id="data">                 ← Gestión de datos
  <button>Probar conexiones</button>
  <button>Guardar APIs</button>
  <button>Reset completo</button>
</section>
```

---

### `src/background/service-worker.js`

**Service Worker (MV3)**

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch(request.type) {
    case 'SEND_MESSAGE':           ← Chat message
    case 'VOTE':                   ← User vote
    case 'GET_CONFIG':             ← Config request
    case 'GET_HISTORY':            ← History request
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  // Track tab changes
});
```

**Responsabilidades:**
- Enrutamiento de mensajes
- Almacenamiento en caché
- Gestión de votos
- Escucha de eventos de tabas

---

### `src/content/chat.js`

**Widget de chat flotante**

```javascript
// Inyecta iframe flotante en cualquier página
// Posicionado fixed bottom-right
// Z-index alto para no ocultarse
// Responde a mensaje CLOSE_CHAT
```

---

### `src/content/workspace.js`

**Integración con aplicaciones**

```javascript
// Detecta contexto: Gmail, Docs, Sheets, Calendar
// Inyecta botones "✨ Ayuda con IA"
// Maneja:
// - INSERT_TEXT (inserta en textarea, input, contentEditable)
// - GET_SELECTED_TEXT (obtiene texto seleccionado)
```

---

## Flujo de datos

### 1. Usuario envía mensaje en popup

```
popup.html (input)
  ↓
popup.js (handleSend)
  ↓
chrome.runtime.sendMessage
  ↓
service-worker.js (onMessage)
  ↓
ModelManager.call(model, ...)
  ↓
API del proveedor (OpenAI, Anthropic, etc.)
  ↓
Respuesta → service-worker
  ↓
StorageManager.addToHistory
  ↓
chrome.runtime.sendMessage (reply)
  ↓
popup.js (handleResponse)
  ↓
Mostrar mensaje en chat
```

### 2. Usuario activa modo comparativo

```
popup.js (handleCompare)
  ↓
ModelManager.call (en paralelo, 2-4 modelos)
  ↓
JudgeSystem.compare(responses)
  ↓
Mostrar opciones con puntuaciones
  ↓
Usuario vota
  ↓
JudgeSystem.recordVote
  ↓
StorageManager.addVote
  ↓
Preferencias actualizadas
```

### 3. Configuración de API keys

```
options.html (form)
  ↓
options.js (saveApiKeys)
  ↓
StorageManager.setApiKey (para cada proveedor)
  ↓
CryptoManager.encrypt (AES-256)
  ↓
chrome.storage.local (persistencia)
```

---

## Estados y Storage

### chrome.storage.local

```
x1_config: {
  defaultModel: 'gpt-3.5-turbo',
  comparisonModels: 3,
  routing: {
    legal: 'claude-3.5-sonnet',
    marketing: 'gpt-4o',
    ...
  },
  ollama: { enabled: false, endpoint: 'localhost:11434' },
  proactivity: 'medium',
  darkMode: true
}

x1_votes: [
  { winner: 'gpt-4', timestamp, reason, sector },
  { winner: 'claude-3.5', timestamp, reason, sector },
  ...
]

x1_history: [
  { role: 'user', content: 'Pregunta', timestamp },
  { role: 'assistant', content: 'Respuesta', model: 'gpt-4' },
  ...
]

x1_api_keys: {                         ← CIFRADOS
  openai: 'encrypted:...',
  anthropic: 'encrypted:...',
  ...
}
```

---

## Build & Deploy

### Desarrollo

```bash
npm run watch     # Auto-rebuild en cambios
npm run dev       # Dev + watch
npm run test      # Tests
```

### Producción

```bash
npm run build     # Compila a dist/
```

### Chrome

```
chrome://extensions/
→ Modo de desarrollador
→ Cargar extensión sin empaquetar
→ Seleccionar dist/
```

---

## Sequence Diagram

```
User                Popup            SW           ModelManager    API
 │                   │               │                │            │
 ├──"Enviar"─────────>│               │                │            │
 │                   ├─sendMessage──>│                │            │
 │                   │               ├─call()────────>│            │
 │                   │               │                ├─fetch────>│
 │                   │               │                │<──response│
 │                   │               │<─result────────│            │
 │                   │  addToHistory │                │            │
 │                   │<─sendMessage──│                │            │
 │                   │               │                │            │
 │<─mostrar msg──────┤               │                │            │
```

---

## Convenciones

### Nombres

- **Módulos:** PascalCase (StorageManager, ConfigManager)
- **Funciones:** camelCase (handleSend, getModelForSector)
- **Constantes:** UPPER_SNAKE_CASE (DEFAULT_MODEL, MAX_TOKENS)
- **Archivos:** kebab-case o snake_case (popup.js, service-worker.js)

### Async/Await

Todos los módulos usan `async/await` de manera consistente. No hay callbacks.

### Error Handling

Cada función intenta capturar y loguear errores de manera específica. Las excepciones se propagan al usuario vía UI.

### Tests

- Jest para unitarios
- jsdom para DOM
- Cobertura en src/core/ y src/utils/

---

## Próximos pasos (Phase 2)

- [ ] Vector DB (Weaviate/Pinecone) para memoria
- [ ] UI de creación de agentes
- [ ] Fine-tuning con Hugging Face
- [ ] Integración N8N
- [ ] LangGraph para orquestación
- [ ] Asistente predictivo
- [ ] Agentes colaborativos
- [ ] Sistema de fact-checking
- [ ] Gestor autónomo de proyectos
