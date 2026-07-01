# 📦 Guía de Instalación de X1

Pasos detallados para instalar y configurar X1 en tu máquina.

---

## 1️⃣ Requisitos Previos

- **Node.js** (v16+): https://nodejs.org
- **Chrome/Chromium** (v90+)
- **Git** (opcional): para clonar el repositorio
- **API Keys** (al menos una):
  - OpenAI: https://platform.openai.com/api-keys
  - Anthropic: https://console.anthropic.com
  - Google: https://ai.google.dev
  - (O prueba con un proveedor gratuito como HuggingFace)

---

## 2️⃣ Descargar e Instalar

### Opción A: Clonar desde GitHub
```bash
git clone https://github.com/tuusuario/x1-extension.git
cd x1-extension
```

### Opción B: Descargar ZIP
1. Descarga la carpeta `x1-extension` desde GitHub
2. Extrae en tu carpeta de proyectos
3. Abre terminal en esa carpeta

---

## 3️⃣ Instalar Dependencias

```bash
npm install
```

Esto instala:
- webpack (empaquetador)
- babel (transpilador)
- jest (tests)
- Librerías de utilidad

---

## 4️⃣ Construir la Extensión

```bash
npm run build
```

Esto crea la carpeta `dist/` con los archivos compilados.

**Desarrollo (con auto-rebuild):**
```bash
npm run watch
```

---

## 5️⃣ Cargar en Chrome

1. Abre Chrome y ve a: `chrome://extensions/`

2. Activa **"Modo de desarrollador"** (arriba a la derecha)

3. Haz clic en **"Cargar extensión sin empaquetar"**

4. Selecciona la carpeta `dist/` del proyecto

5. ¡Listo! Deberías ver el icono de X1 en tu barra de herramientas

---

## 6️⃣ Configurar API Keys

### Primera vez que abres X1:

1. Haz clic en el icono de X1 en la barra de herramientas

2. Se abrirá el popup del chat

3. Haz clic en ⚙️ **"Configuración Rápida"**

4. Haz clic en **"⚙️ Configuración Completa"**

5. **Introduce tu contraseña** (para cifrar tus API keys)

6. En la sección "🔑 API Keys", completa los campos de tus proveedores:
   - OpenAI: `sk-...`
   - Anthropic: `sk-ant-...`
   - Google: `AIza...`
   - etc.

7. Haz clic en **"🧪 Probar conexiones"** para verificar

8. Haz clic en **"💾 Guardar APIs"**

### Obtener API Keys:

**OpenAI:**
- Ve a https://platform.openai.com/api-keys
- Crea una nueva clave
- Copia y pega en X1

**Anthropic (Claude):**
- Ve a https://console.anthropic.com/keys
- Crea una nueva clave
- Copia y pega en X1

**Google (Gemini):**
- Ve a https://ai.google.dev
- Crea un nuevo API key
- Copia y pega en X1

**HuggingFace (Gratuito):**
- Ve a https://huggingface.co/settings/tokens
- Crea un nuevo token
- Copia y pega en X1

---

## 7️⃣ (Opcional) Instalar Ollama para Modelos Locales

Si quieres usar modelos locales sin costos:

1. Descarga Ollama: https://ollama.ai
2. Instala y ejecuta
3. Abre terminal y ejecuta:
   ```bash
   ollama pull llama3
   ollama pull mistral
   ```
4. En X1, ve a Configuración → "🏠 Modelos Locales"
5. Habilita Ollama
6. ¡Listo! Ya puedes usar modelos locales

---

## 8️⃣ Primer Uso

### Chat Básico:

1. Abre cualquier página en Chrome
2. Haz clic en el icono de X1
3. Se abrirá el chat
4. Escribe una pregunta y presiona **Enter** o haz clic en **"Enviar"**
5. Espera la respuesta del modelo

### Modo Comparativo:

1. En el chat, escribe tu pregunta
2. Haz clic en **"⚖️ Comparar"** en lugar de "Enviar"
3. X1 comparará 2-3 modelos en paralelo
4. Haz clic en **"👍 Esta es la mejor"** para votar por tu favorito
5. X1 aprenderá de tu preferencia

### Integración con Gmail:

1. Abre Gmail (mail.google.com)
2. Comienza a redactar un correo
3. Deberías ver un botón **"✨ Ayuda con IA"**
4. Haz clic para generar el contenido

---

## 9️⃣ Solución de Problemas

### X1 no aparece en la barra de herramientas

1. Ve a `chrome://extensions`
2. Busca "X1"
3. Asegúrate de que esté **habilitada** (switch azul)
4. Si no aparece, intenta:
   - Actualizar: F5 en la página
   - Recargar extensión: En la página de extensiones, haz clic en el icono ↻ de "Recargar"

### No puedo enviar mensajes

1. Ve a Configuración → "🔑 API Keys"
2. Haz clic en "🧪 Probar conexiones"
3. Si hay un proveedor con ❌, tu API key puede ser inválida
4. Verifica tu clave en el dashboard del proveedor
5. Guarda nuevamente

### La contraseña no funciona

La contraseña se establece la **primera vez** que abres X1. Si olvidaste:

1. Ve a Configuración → "🗑️ Datos" 
2. Haz clic en "🔄 Reset completo"
3. Esto borrará toda la configuración (pero no los datos de Chrome)
4. Vuelve a configurar desde cero

### Error "No se pudo conectar a Ollama"

1. Asegúrate de que Ollama esté ejecutándose:
   ```bash
   ollama serve
   ```
2. En X1, verifica que el endpoint sea `http://localhost:11434`
3. Reinicia X1 (reload de la extensión)

---

## 🔟 Desarrollo

### Ver logs de la extensión

1. Ve a `chrome://extensions`
2. En la tarjeta de X1, haz clic en **"Inspect views"**
3. Se abrirá DevTools del service worker
4. Verás logs con prefijo `[X1]`

### Editar y recargar

1. Edita los archivos en `src/`
2. Ejecuta `npm run watch` para auto-compilar
3. En `chrome://extensions`, haz clic en ↻ para recargar
4. Recarga la página donde usas X1 (F5)

### Ejecutar tests

```bash
npm test
```

---

## 📞 Necesitas Ayuda?

- 📧 Email: support@x1.ai
- 🐛 Issues: https://github.com/tuusuario/x1-extension/issues
- 💬 Discussiones: https://github.com/tuusuario/x1-extension/discussions

---

¡Disfruta usando X1! 🚀
