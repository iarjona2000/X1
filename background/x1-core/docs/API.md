# X1 API Reference

Documentación completa de módulos y funciones de X1.

---

## Core Modules

### StorageManager

Gestión segura de almacenamiento local con cifrado AES-256.

```javascript
import StorageManager from '../core/storage.js';

// Inicializar (requerido una sola vez)
await StorageManager.init('password');

// Guardar datos cifrados
await StorageManager.set('key', { data: 'value' });

// Recuperar datos
const data = await StorageManager.get('key');

// Guardar API key
await StorageManager.setApiKey('openai', 'sk-...');

// Obtener API key
const key = await StorageManager.getApiKey('openai');

// Agregar voto
await StorageManager.addVote({
  winner: 'gpt-4',
  reason: 'Más preciso'
});

// Obtener todos los votos
const votes = await StorageManager.getVotes();

// Agregar al historial
await StorageManager.addToHistory({
  role: 'user',
  content: 'Tu mensaje'
});

// Obtener historial
const history = await StorageManager.getHistory();

// Limpiar historial
await StorageManager.clearHistory();

// Eliminar dato
await StorageManager.delete('key');
```

---

### ConfigManager

Gestión de configuración del usuario.

```javascript
import ConfigManager from '../core/config.js';

// Cargar configuración actual
const config = await ConfigManager.load();

// Guardar configuración
await ConfigManager.save(config);

// Obtener modelo para un sector
const model = await ConfigManager.getModelForSector('legal');

// Establecer modelo para un sector
await ConfigManager.setModelForSector('legal', 'claude-3.5-sonnet');

// Obtener reglas de routing
const routing = await ConfigManager.getRouting();

// Configurar número de modelos a comparar
await ConfigManager.setComparisonModels(3);

// Obtener configuración de Ollama
const ollamaConfig = await ConfigManager.getOllamaConfig();

// Habilitar/deshabilitar Ollama
await ConfigManager.setOllamaEnabled(true);

// Establecer nivel de proactividad
await ConfigManager.setProactivityLevel('medium'); // 'low', 'medium', 'high'

// Validar API keys configuradas
const validation = await ConfigManager.validateApiKeys();
// Returns: { valid: boolean, missingProviders: [] }

// Reset a valores por defecto
await ConfigManager.reset();
```

---

### ModelManager

Integración con múltiples proveedores de IA.

```javascript
import ModelManager from '../core/models.js';

// Llamar a un modelo
const response = await ModelManager.call(
  'gpt-3.5-turbo',                    // nombre del modelo
  'Eres un asistente útil.',          // system prompt
  'Mi pregunta aquí',                  // user message
  {                                   // opciones
    temperature: 0.7,
    maxTokens: 1000
  }
);

// Response structure:
// {
//   text: string,          // respuesta del modelo
//   model: string,         // nombre del modelo usado
//   tokens: number        // tokens usados
// }

// Probar conexión con un proveedor
const isConnected = await ModelManager.testConnection('openai');

// Obtener modelos disponibles
const models = ModelManager.getAvailableModels('openai');
// Returns: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']

// Estimar costo de una llamada
const cost = ModelManager.estimateCost(
  'gpt-3.5-turbo',  // modelo
  100,               // input tokens
  200                // output tokens
);
// Returns: 0.000075 (en USD)
```

---

### JudgeSystem

Sistema de evaluación y selección de respuestas.

```javascript
import JudgeSystem from '../core/judge.js';

// Evaluar una respuesta individual
const score = await JudgeSystem.evaluateResponse(
  {
    text: 'Respuesta del modelo',
    model: 'gpt-4',
    sector: 'legal'
  },
  'Pregunta original'
);
// Returns: 1-10

// Comparar múltiples respuestas
const result = await JudgeSystem.compare(
  [
    { text: '...', model: 'gpt-4', sector: 'legal' },
    { text: '...', model: 'claude-3.5', sector: 'legal' }
  ],
  'Pregunta original'
);

// Result structure:
// {
//   winner: { text, model, score },
//   scores: Map(model => score),
//   consensus: boolean,
//   ranking: [ { ...response, score }, ... ]
// }

// Registrar voto del usuario
await JudgeSystem.recordVote({
  winner: 'gpt-4',
  options: ['gpt-4', 'claude-3.5', 'gemini'],
  reason: 'Más preciso',
  sector: 'legal'
});

// Obtener modelo preferido para un sector
const preferred = await JudgeSystem.getPreferredModel('legal');
// Returns: 'gpt-4' o null
```

---

### CryptoManager

Cifrado de datos con AES-256 (Web Crypto API).

```javascript
import CryptoManager from '../core/crypto.js';

// Generar clave desde contraseña
const key = await CryptoManager.generateKeyFromPassword('mi-contraseña');

// Cifrar texto
const encrypted = await CryptoManager.encrypt('texto secreto', key);
// Returns: string en base64

// Descifrar texto
const decrypted = await CryptoManager.decrypt(encrypted, key);
// Returns: 'texto secreto'

// Hash SHA-256
const hash = await CryptoManager.hash('texto');
// Returns: hex string
```

---

### Logger

Sistema de logging para debugging.

```javascript
import Logger from '../core/logger.js';

const logger = new Logger('MyModule');

logger.log('Mensaje info', { data });
logger.debug('Mensaje debug', { data });
logger.info('Información importante');
logger.warn('Advertencia');
logger.error('Error', error);
logger.success('Operación exitosa');

// Output:
// [MyModule] Mensaje info { data }
// [MyModule] 🐛 Mensaje debug { data }
// [MyModule] ℹ️ Información importante
// [MyModule] ⚠️ Advertencia
// [MyModule] ❌ Error error
// [MyModule] ✅ Operación exitosa
```

---

## Content Script API

### Inyectar texto en el documento activo

```javascript
// En workspace.js
chrome.runtime.sendMessage({
  type: 'INSERT_TEXT',
  text: 'Texto a insertar'
});
```

### Obtener texto seleccionado

```javascript
chrome.runtime.sendMessage(
  { type: 'GET_SELECTED_TEXT' },
  (response) => {
    console.log('Texto seleccionado:', response.text);
  }
);
```

---

## Message API

Comunicación entre popup, service worker y content scripts.

### Desde popup → Service Worker

```javascript
chrome.runtime.sendMessage(
  { type: 'SEND_MESSAGE', message: 'Hola', model: 'gpt-4' },
  (response) => {
    console.log('Respuesta:', response);
  }
);
```

### Desde popup → Content Script

```javascript
chrome.tabs.sendMessage(tabId, {
  type: 'INSERT_TEXT',
  text: 'Contenido'
});
```

---

## Constants

### Modelos disponibles

```javascript
import { MODELS } from '../utils/constants.js';

MODELS.OPENAI          // { 'gpt-4o': {...}, 'gpt-3.5-turbo': {...}, ... }
MODELS.ANTHROPIC       // { 'claude-3.5-sonnet': {...}, ... }
MODELS.GOOGLE          // { 'gemini-1.5-pro': {...}, ... }
MODELS.GROQ            // { 'mixtral-8x7b': {...}, ... }
MODELS.HUGGINGFACE     // { 'mistral-7b': {...}, ... }
MODELS.OLLAMA          // { 'llama3': {...}, ... }
```

### Sectores

```javascript
import { SECTORS } from '../utils/constants.js';

SECTORS.LEGAL          // 'legal'
SECTORS.MARKETING      // 'marketing'
SECTORS.FINANCE        // 'finance'
SECTORS.SUPPORT        // 'support'
SECTORS.TECHNICAL      // 'technical'
SECTORS.GENERAL        // 'general'
```

### Pesos de evaluación

```javascript
import { SCORING_WEIGHTS } from '../utils/constants.js';

SCORING_WEIGHTS.legal      // { normativePrecision: 0.7, clarity: 0.2, ... }
SCORING_WEIGHTS.marketing  // { persuasion: 0.5, brandTone: 0.3, ... }
```

---

## Best Practices

### 1. Manejo de errores
```javascript
try {
  const response = await ModelManager.call(model, system, message);
} catch (error) {
  logger.error('Error llamando modelo:', error);
  // Mostrar error al usuario
}
```

### 2. Inicializar storage
```javascript
// Hacer solo una vez al cargar la extensión
const password = prompt('Contraseña:');
await StorageManager.init(password);
```

### 3. Cachear configuración
```javascript
const config = await ConfigManager.load();
// Reutilizar config múltiples veces en lugar de cargar cada vez
```

### 4. Validar antes de guardar
```javascript
const validation = await ConfigManager.validateApiKeys();
if (!validation.valid) {
  logger.warn('API keys faltantes:', validation.missingProviders);
}
```

### 5. Usar valores por defecto
```javascript
const config = await ConfigManager.load();
const model = config.defaultModel || 'gpt-3.5-turbo';
```
