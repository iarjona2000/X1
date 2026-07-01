/**
 * Lógica de la página de configuración
 */

import StorageManager from '../core/storage.js';
import ConfigManager from '../core/config.js';
import ModelManager from '../core/models.js';
import { MODELS, SECTORS, DEFAULT_CONFIG } from '../utils/constants.js';

/** Proveedores con BYOK (deben tener un input apikey-<id> en options.html). */
const PROVIDERS = [
  'openai', 'anthropic', 'google', 'groq', 'huggingface', 'cohere',
  'deepseek', 'minimax', 'moonshot', 'zhipu'
];

// Estado
let currentPassword = null;

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
  await initializeStorage();
  await loadConfiguration();
  attachEventListeners();
});

/**
 * Inicializar el sistema de almacenamiento
 */
async function initializeStorage() {
  // Solicitar contraseña para cifrado
  const password = prompt('Introduce una contraseña para proteger tus API keys:');
  if (!password) {
    alert('La contraseña es requerida para proteger tus datos.');
    return;
  }

  currentPassword = password;
  await StorageManager.init(password);
}

/**
 * Cargar configuración actual
 */
async function loadConfiguration() {
  const config = await ConfigManager.load();

  // Llenar API keys
  for (const provider of PROVIDERS) {
    const apiKey = await StorageManager.getApiKey(provider);
    const input = document.getElementById(`apikey-${provider}`);
    if (apiKey && input) {
      input.value = apiKey;
    }
  }

  // Llenar modelo por defecto
  populateModelSelector('default-model', config.defaultModel);

  // Llenar routing por sector
  for (const sector of Object.values(SECTORS)) {
    const model = await ConfigManager.getModelForSector(sector);
    const select = document.querySelector(`[data-sector="${sector}"]`);
    if (select) {
      populateModelSelector(select, model);
    }
  }

  // Llenar otras preferencias
  document.getElementById('comparison-models').value = config.comparisonModels;
  document.getElementById('max-comparisons').value = config.maxComparisonsPerDay || 10;
  document.getElementById('ollama-enabled').checked = config.ollama?.enabled;
  document.getElementById('ollama-endpoint').value = config.ollama?.endpoint || 'http://localhost:11434';
  document.getElementById('proactivity-level').value = config.proactivityLevel;
  document.getElementById('dark-mode').checked = config.darkMode !== false;

  // Mostrar/ocultar configuración de Ollama
  updateOllamaVisibility();
}

/**
 * Llenar un selector con modelos disponibles
 */
function populateModelSelector(elementId, selectedModel) {
  const select = typeof elementId === 'string'
    ? document.getElementById(elementId)
    : elementId;

  if (!select) return;

  // Obtener todos los modelos disponibles
  const allModels = {};
  for (const [provider, models] of Object.entries(MODELS)) {
    Object.entries(models).forEach(([modelKey, modelInfo]) => {
      allModels[modelKey] = modelInfo;
    });
  }

  // Agrupar por proveedor
  select.innerHTML = '<option value="">Automático</option>';

  for (const [provider, models] of Object.entries(MODELS)) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = provider;

    Object.entries(models).forEach(([modelKey, modelInfo]) => {
      const option = document.createElement('option');
      option.value = modelKey;
      option.textContent = modelInfo.name;
      if (modelKey === selectedModel) option.selected = true;
      optgroup.appendChild(option);
    });

    select.appendChild(optgroup);
  }
}

/**
 * Adjuntar event listeners
 */
function attachEventListeners() {
  // API Keys
  document.getElementById('save-apis-btn')?.addEventListener('click', saveApiKeys);
  document.getElementById('test-apis-btn')?.addEventListener('click', testApiConnections);

  // Modelo por defecto
  document.getElementById('default-model')?.addEventListener('change', async (e) => {
    const config = await ConfigManager.load();
    config.defaultModel = e.target.value;
    await ConfigManager.save(config);
    showStatus('✅ Modelo por defecto guardado', 'success');
  });

  // Routing por sector
  document.querySelectorAll('.sector-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const sector = e.target.dataset.sector;
      const model = e.target.value;
      if (model) {
        await ConfigManager.setModelForSector(sector, model);
        showStatus(`✅ Modelo para ${sector} actualizado`, 'success');
      }
    });
  });

  // Comparación
  document.getElementById('comparison-models')?.addEventListener('change', async (e) => {
    await ConfigManager.setComparisonModels(parseInt(e.target.value));
    showStatus('✅ Configuración de comparación guardada', 'success');
  });

  // Ollama
  document.getElementById('ollama-enabled')?.addEventListener('change', async (e) => {
    await ConfigManager.setOllamaEnabled(e.target.checked);
    updateOllamaVisibility();
    showStatus(`✅ Ollama ${e.target.checked ? 'habilitado' : 'deshabilitado'}`, 'success');
  });

  // Proactividad
  document.getElementById('proactivity-level')?.addEventListener('change', async (e) => {
    await ConfigManager.setProactivityLevel(e.target.value);
    showStatus('✅ Nivel de proactividad guardado', 'success');
  });

  // Data
  document.getElementById('clear-history-btn')?.addEventListener('click', clearHistory);
  document.getElementById('reset-btn')?.addEventListener('click', resetAll);
  document.getElementById('export-data-btn')?.addEventListener('click', exportData);
}

/**
 * Guardar API keys
 */
async function saveApiKeys() {
  try {
    for (const provider of PROVIDERS) {
      const input = document.getElementById(`apikey-${provider}`);
      if (input?.value) {
        await StorageManager.setApiKey(provider, input.value);
      }
    }

    showStatus('✅ API keys guardadas de forma segura', 'success');
  } catch (error) {
    showStatus(`❌ Error guardando API keys: ${error.message}`, 'error');
  }
}

/**
 * Probar conexiones a APIs
 */
async function testApiConnections() {
  const btn = document.getElementById('test-apis-btn');
  btn.disabled = true;
  btn.textContent = '🧪 Probando...';

  try {
    const providers = [...PROVIDERS, 'ollama'];
    const results = {};

    for (const provider of providers) {
      results[provider] = await ModelManager.testConnection(provider);
    }

    const connected = Object.entries(results)
      .filter(([_, ok]) => ok)
      .map(([p]) => p)
      .join(', ');

    if (connected) {
      showStatus(`✅ Conectado a: ${connected}`, 'success');
    } else {
      showStatus('❌ No se pudo conectar a ningún proveedor', 'error');
    }
  } catch (error) {
    showStatus(`❌ Error probando conexiones: ${error.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🧪 Probar conexiones';
  }
}

/**
 * Actualizar visibilidad de configuración de Ollama
 */
function updateOllamaVisibility() {
  const enabled = document.getElementById('ollama-enabled').checked;
  const config = document.getElementById('ollama-config');
  if (config) {
    config.style.display = enabled ? 'block' : 'none';
  }
}

/**
 * Limpiar historial
 */
async function clearHistory() {
  if (confirm('¿Estás seguro? Esto eliminará todo tu historial de chat.')) {
    await StorageManager.clearHistory();
    showStatus('✅ Historial limpiado', 'success');
  }
}

/**
 * Reset completo
 */
async function resetAll() {
  if (confirm('⚠️ Esto eliminará TODA tu configuración, votos e historial. ¿Está bien?')) {
    await ConfigManager.reset();
    await StorageManager.delete('x1_votes');
    await StorageManager.delete('x1_history');
    await StorageManager.delete('x1_preferences');
    showStatus('✅ Sistema reseteado', 'success');
    setTimeout(() => location.reload(), 1000);
  }
}

/**
 * Exportar datos
 */
async function exportData() {
  try {
    const config = await ConfigManager.load();
    const votes = await StorageManager.get('x1_votes') || [];
    const history = await StorageManager.get('x1_history') || [];

    const data = { config, votes, history, timestamp: new Date().toISOString() };
    const json = JSON.stringify(data, null, 2);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `x1-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showStatus('✅ Datos exportados', 'success');
  } catch (error) {
    showStatus(`❌ Error exportando datos: ${error.message}`, 'error');
  }
}

/**
 * Mostrar mensaje de estado
 */
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('api-status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'status-message';
    }, 3000);
  }
}
