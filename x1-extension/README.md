# X1 Extension — Reference copy (older version)

Copia de referencia de una versión anterior de X1 empaquetada con webpack (concepto original: multi-modelo con BYOK). La versión activa del proyecto está en la raíz de `cbos-ext/`.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎯 Características

- **Chat conversacional** con múltiples modelos de IA
- **Modo comparativo**: compara 2-4 modelos en paralelo y vota por el mejor
- **Aprendizaje personalizado**: el sistema mejora según tus preferencias
- **Enrutamiento inteligente**: asigna modelos específicos por sector (legal, marketing, finanzas, etc)
- **BYOK (Bring Your Own Key)**: usa tus propias claves API (OpenAI, Anthropic, Google, Groq, etc)
- **Modelos locales**: soporte para Ollama (privacidad total, sin costos)
- **Integración con Workspace**: redacta emails, edita documentos con ayuda de IA
- **Cifrado local**: tus API keys se cifran con AES-256
- **Historial persistente**: guarda tu conversación localmente

## 🚀 Instalación Rápida

### 1. Clonar el repositorio
```bash
git clone https://github.com/tuusuario/x1-extension.git
cd x1-extension
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Construir la extensión
```bash
npm run build
```

### 4. Cargar en Chrome
1. Abre `chrome://extensions`
2. Activa **"Modo de desarrollador"** (arriba a la derecha)
3. Haz clic en **"Cargar extensión sin empaquetar"**
4. Selecciona la carpeta `x1-extension/dist`

### 5. Configurar API Keys
1. Haz clic en el icono de X1 en tu barra de herramientas
2. Abre la pestaña "⚙️ Configuración Rápida"
3. Haz clic en **"⚙️ Configuración Completa"**
4. Introduce tus API keys

## 📋 Configuración

### API Keys Soportadas

| Proveedor | Key | Modelos | Precio |
|-----------|-----|---------|--------|
| **OpenAI** | `sk-...` | GPT-4o, GPT-4 Turbo, GPT-3.5 | Pago |
| **Anthropic** | `sk-ant-...` | Claude 3.5 Sonnet, Opus, Haiku | Pago |
| **Google** | `AIza...` | Gemini 1.5 Pro, Flash | Pago |
| **Groq** | `gsk_...` | Mixtral, Llama | Freemium |
| **HuggingFace** | `hf_...` | Mistral, Llama (gratuitos) | Gratuito |
| **Cohere** | `cohere_...` | Command, Embed | Freemium |
| **Ollama** | Local | Llama3, Mistral, Phi | Gratuito (local) |

### Enrutamiento por Sector

Asigna modelos específicos para cada tipo de trabajo:

- **⚖️ Legal**: Claude (precisión normativa)
- **📢 Marketing**: Gemini (creatividad)
- **💰 Finanzas**: GPT-4 (análisis numérico)
- **🎧 Atención al Cliente**: Haiku (rapidez)
- **💻 Técnico**: Mixtral (código)

## 💬 Uso

### Chat Normal
1. Escribe tu pregunta
2. Haz clic en **"Enviar"** o presiona Enter
3. Recibe respuesta del modelo configurado

### Modo Comparativo
1. Escribe tu pregunta
2. Haz clic en **"⚖️ Comparar"**
3. X1 compara 2-4 modelos en paralelo
4. Haz clic en **"👍 Esta es la mejor"** para indicar cuál te gusta
5. El sistema aprende de tu voto para futuras recomendaciones

### Integración con Workspace

#### Gmail
- Haz clic en **"✨ Ayuda con IA"** al redactar
- Genera ideas, correcciones, traducciones

#### Google Docs
- Selecciona texto y haz clic en **"✨ X1"**
- Reescribe, resume, traduce en el documento

## 🔐 Privacidad y Seguridad

- **Cifrado local**: Tus API keys se cifran con AES-256 usando Web Crypto API
- **Sin telemetría**: Nada se envía a servidores de terceros (excepto a tus proveedores de IA)
- **Datos locales**: Historial y preferencias se guardan en tu navegador
- **Modelos locales**: Usa Ollama para privacidad total sin conexión a internet

## 🧪 Desarrollo

### Scripts disponibles
```bash
npm run dev       # Modo desarrollo con watch
npm run build     # Construir para producción
npm run test      # Ejecutar tests
npm run lint      # Verificar código
```

### Estructura del proyecto
```
x1-extension/
├── src/
│   ├── background/         # Service Worker
│   ├── content/            # Content scripts (Gmail, Docs, etc)
│   ├── popup/              # Chat UI
│   ├── options/            # Página de configuración
│   ├── core/               # Lógica core (models, judge, storage)
│   └── utils/              # Utilidades
├── manifest.json           # Manifest MV3
├── package.json
└── webpack.config.js
```

### Debugging
```bash
# Ver logs de la extensión
chrome://extensions → X1 → Inspeccionar → Consola

# Ver logs del popup
Chrome DevTools (F12) → Consola

# Ver logs de content scripts
Chrome DevTools → Consola (en la página)
```

## 📚 API Reference

### StorageManager
```javascript
import { StorageManager } from './core/storage.js';

// Guardar dato cifrado
await StorageManager.set('x1_config', configObject);

// Recuperar dato
const config = await StorageManager.get('x1_config');

// API keys
await StorageManager.setApiKey('openai', 'sk-...');
const key = await StorageManager.getApiKey('openai');
```

### ModelManager
```javascript
import { ModelManager } from './core/models.js';

// Llamar a un modelo
const response = await ModelManager.call(
  'gpt-3.5-turbo',
  'Eres un asistente útil.',
  'Pregunta del usuario',
  { temperature: 0.7, maxTokens: 1000 }
);

// Probar conexión
const ok = await ModelManager.testConnection('openai');
```

### JudgeSystem
```javascript
import { JudgeSystem } from './core/judge.js';

// Evaluar respuesta
const score = await JudgeSystem.evaluateResponse(
  { text: '...', model: 'gpt-4', sector: 'legal' },
  'pregunta original'
);

// Comparar múltiples respuestas
const result = await JudgeSystem.compare(responses, query);

// Registrar voto del usuario
await JudgeSystem.recordVote({
  winner: 'gpt-4',
  reason: 'Más preciso',
  sector: 'legal'
});
```

## 🤝 Contribuir

¿Quieres mejorar X1? ¡Bienvenido!

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/tu-feature`
3. Haz cambios y testes
4. Commit: `git commit -am 'Agrega mi feature'`
5. Push: `git push origin feature/tu-feature`
6. Abre un Pull Request

## 📄 Licencia

MIT — Usa libremente en proyectos personales y comerciales

## 🙋 Soporte

- 📧 Email: support@x1.ai
- 🐛 Issues: https://github.com/tuusuario/x1-extension/issues
- 💬 Discussiones: https://github.com/tuusuario/x1-extension/discussions

## 🗺️ Roadmap

- [ ] Integración con Ollama mejorada
- [ ] Agentes especializados (abogado, contador, etc)
- [ ] Fine-tuning con Hugging Face
- [ ] Vector DB para memoria persistente
- [ ] Integración con N8N
- [ ] Workspace colaborativo
- [ ] Marketplace de agentes

---

Hecho con ❤️ para la comunidad de IA
