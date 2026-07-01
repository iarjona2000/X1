# X1 Examples

Ejemplos prácticos de uso de X1.

---

## Chat Básico

### Enviar un mensaje y recibir respuesta

```javascript
import ModelManager from '../core/models.js';
import StorageManager from '../core/storage.js';

async function sendMessage(userMessage) {
  // Inicializar storage
  const password = prompt('Contraseña:');
  await StorageManager.init(password);

  try {
    // Obtener configuración
    const config = await ConfigManager.load();
    const model = config.defaultModel;

    // Llamar al modelo
    const response = await ModelManager.call(
      model,
      'Eres un asistente amigable y útil.',
      userMessage,
      { temperature: 0.7, maxTokens: 1000 }
    );

    console.log(`${model}:`, response.text);

    // Guardar en historial
    await StorageManager.addToHistory({
      role: 'user',
      content: userMessage
    });
    await StorageManager.addToHistory({
      role: 'assistant',
      content: response.text,
      model: model
    });

    return response.text;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

---

## Modo Comparativo

### Comparar 3 modelos y dejar que el usuario vote

```javascript
import ModelManager from '../core/models.js';
import JudgeSystem from '../core/judge.js';
import StorageManager from '../core/storage.js';
import ConfigManager from '../core/config.js';

async function compareModels(query) {
  const config = await ConfigManager.load();
  const sector = 'legal';

  // Modelos a comparar
  const models = [
    'gpt-4o',
    'claude-3.5-sonnet',
    'gemini-1.5-pro'
  ];

  // Llamar a todos en paralelo
  const responses = await Promise.all(
    models.map(model =>
      ModelManager.call(
        model,
        'Eres un abogado experto.',
        query,
        { temperature: 0.7, maxTokens: 800 }
      ).then(response => ({
        ...response,
        sector
      }))
    )
  );

  // Evaluar y comparar
  const comparison = await JudgeSystem.compare(responses, query);

  console.log('Ganador:', comparison.winner.model);
  console.log('Puntuaciones:');
  for (const [model, score] of comparison.scores) {
    console.log(`  ${model}: ${score}/10`);
  }

  return comparison;
}

// El usuario elige el ganador
async function voteForBest(model, sector = 'legal') {
  await JudgeSystem.recordVote({
    winner: model,
    reason: 'Mejor respuesta',
    sector
  });

  console.log(`Voto registrado: ${model}`);
}
```

---

## Enrutamiento por Sector

### Automáticamente seleccionar modelo según el tipo de tarea

```javascript
import ConfigManager from '../core/config.js';
import ModelManager from '../core/models.js';

async function handleQuery(query, sector = 'general') {
  // Obtener modelo recomendado para el sector
  let model = await ConfigManager.getModelForSector(sector);
  
  if (!model) {
    // Si no hay modelo específico, usar defecto
    const config = await ConfigManager.load();
    model = config.defaultModel;
  }

  console.log(`Usando ${model} para sector ${sector}`);

  // Llamar al modelo
  const response = await ModelManager.call(
    model,
    'Eres un experto en este tema.',
    query,
    { temperature: 0.5, maxTokens: 1000 }
  );

  return response;
}

// Ejemplos de uso
await handleQuery('¿Qué dice el artículo 25 de la ley?', 'legal');
await handleQuery('Redacta un email persuasivo para mi cliente', 'marketing');
await handleQuery('Analiza este balance financiero', 'finance');
```

---

## Configuración Personalizada

### Configurar rutas por sector

```javascript
import ConfigManager from '../core/config.js';

async function setupRouting() {
  // Configurar modelo para cada sector
  await ConfigManager.setModelForSector('legal', 'claude-3.5-sonnet');
  await ConfigManager.setModelForSector('marketing', 'gemini-1.5-pro');
  await ConfigManager.setModelForSector('finance', 'gpt-4o');
  await ConfigManager.setModelForSector('technical', 'mixtral-8x7b');

  console.log('Routing configurado');
}

// Obtener y mostrar configuración actual
async function showRouting() {
  const routing = await ConfigManager.getRouting();
  
  for (const [sector, model] of Object.entries(routing)) {
    console.log(`${sector} → ${model}`);
  }
}
```

---

## Integración con Google Workspace

### Gmail - Redactar email con ayuda de IA

```javascript
// En workspace.js, cuando el usuario hace clic en "Ayuda con IA"
async function assistWithEmail(subject) {
  const model = 'gpt-3.5-turbo';
  
  const prompt = `Redacta un email profesional con este asunto: ${subject}`;

  const response = await ModelManager.call(
    model,
    'Eres un asistente de redacción profesional.',
    prompt,
    { temperature: 0.6, maxTokens: 500 }
  );

  // Insertar en el campo de composición
  chrome.tabs.sendMessage(chrome.tabs.query({}, tabs => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'INSERT_TEXT',
        text: response.text
      });
    }
  }));
}
```

### Google Docs - Mejorar texto seleccionado

```javascript
async function improveSelectedText(action = 'enhance') {
  // Obtener texto seleccionado
  const selectedText = window.getSelection().toString();

  if (!selectedText) {
    alert('Selecciona texto primero');
    return;
  }

  const prompts = {
    enhance: `Mejora este texto haciéndolo más claro y profesional: "${selectedText}"`,
    shorten: `Resume este texto en una sola frase: "${selectedText}"`,
    expand: `Expande este concepto en un párrafo completo: "${selectedText}"`,
    translate: `Traduce al inglés: "${selectedText}"`
  };

  const response = await ModelManager.call(
    'gpt-3.5-turbo',
    'Eres un experto en escritura profesional.',
    prompts[action],
    { temperature: 0.6, maxTokens: 300 }
  );

  // Reemplazar texto seleccionado
  document.execCommand('insertText', false, response.text);
}
```

---

## Manejo de Errores

### Manejar errores de conexión

```javascript
import Logger from '../core/logger.js';

const logger = new Logger('ErrorHandler');

async function callModelWithFallback(query, primaryModel, fallbackModel) {
  try {
    const response = await ModelManager.call(primaryModel, 'Sistema', query);
    return response;
  } catch (primaryError) {
    logger.warn(`Error con ${primaryModel}, intentando ${fallbackModel}`);
    
    try {
      const response = await ModelManager.call(fallbackModel, 'Sistema', query);
      return response;
    } catch (fallbackError) {
      logger.error('Ambos modelos fallaron', { primaryError, fallbackError });
      throw new Error('No se pudo procesar la consulta');
    }
  }
}
```

### Validar configuración antes de usar

```javascript
async function ensureConfigured() {
  const validation = await ConfigManager.validateApiKeys();
  
  if (!validation.valid) {
    throw new Error(`API keys faltantes: ${validation.missingProviders.join(', ')}`);
  }

  logger.success('Configuración válida');
}
```

---

## Testing

### Test unitario para JudgeSystem

```javascript
describe('JudgeSystem', () => {
  test('debería preferir respuesta más larga y relevante', async () => {
    const responses = [
      {
        text: 'No sé',
        model: 'small-model',
        sector: 'general'
      },
      {
        text: 'Aquí está el análisis completo: [análisis detallado]',
        model: 'large-model',
        sector: 'general'
      }
    ];

    const result = await JudgeSystem.compare(responses, 'analiza esto');
    
    expect(result.winner.model).toBe('large-model');
    expect(result.consensus).toBe(true);
  });
});
```

---

## Patrones Avanzados

### Cadena de consultas con contexto

```javascript
async function askFollowUp(previousResponse, followUpQuestion) {
  const context = `
    Contexto anterior: ${previousResponse}
    Nueva pregunta: ${followUpQuestion}
  `;

  const response = await ModelManager.call(
    'gpt-3.5-turbo',
    'Mantén el contexto de la conversación anterior.',
    context,
    { temperature: 0.7, maxTokens: 1000 }
  );

  return response;
}
```

### Modo Agente - Múltiples turnos

```javascript
async function agentConversation(goal) {
  const history = [];
  let currentGoal = goal;

  for (let i = 0; i < 5; i++) {
    // Obtener siguiente paso
    const prompt = `Meta: ${currentGoal}\nHistorial: ${JSON.stringify(history)}`;

    const response = await ModelManager.call(
      'gpt-4o',
      'Eres un agente inteligente.',
      prompt,
      { temperature: 0.5, maxTokens: 200 }
    );

    history.push({
      step: i + 1,
      action: response.text
    });

    if (response.text.includes('DONE')) {
      break;
    }
  }

  return history;
}
```
