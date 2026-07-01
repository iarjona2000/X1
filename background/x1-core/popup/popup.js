/**
 * Lógica del popup de chat de X1.
 *
 * A diferencia de la versión anterior (que llamaba a los modelos directamente
 * desde el popup), esta versión delega TODA la lógica en el service worker a
 * través del message-router. Así el popup es una capa fina de presentación y
 * aprovecha el backend completo: routing por sector/tarea, memoria, control de
 * presupuesto, aprendizaje de votos, nuevos proveedores, etc.
 */

import { MODELS } from '../core/constants.js';
import Logger from '../core/logger.js';

const logger = new Logger('Popup');
let initialized = false;

/* ------------------------------------------------------------------ *
 * Cliente de mensajería con el service worker
 * ------------------------------------------------------------------ */

/**
 * Envía una acción al service worker y devuelve `data` o lanza el error.
 * @param {string} type - Tipo de acción (CHAT, COMPARE, VOTE, …)
 * @param {Object} [payload]
 * @returns {Promise<*>}
 */
function call(type, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, ...payload }, (res) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!res) {
        reject(new Error('Sin respuesta del servicio en segundo plano'));
        return;
      }
      if (!res.ok) {
        reject(new Error(res.error?.message || 'Error desconocido'));
        return;
      }
      resolve(res.data);
    });
  });
}

/* ------------------------------------------------------------------ *
 * Inicialización
 * ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', async () => {
  setupModelSelector();
  attachEventListeners();
  exposeGlobals();
  await unlock();
  if (initialized) {
    await Promise.all([loadSectorDefault(), refreshBudget()]);
  }
});

/**
 * Solicita la contraseña e inicializa el backend (idempotente).
 */
async function unlock() {
  const password = prompt('Introduce tu contraseña para acceder a X1:');
  if (!password) {
    setStatus('🔒 X1 bloqueado. Recarga para introducir la contraseña.', true);
    disableInputs(true);
    return;
  }
  try {
    await call('INIT', { password });
    initialized = true;
    setStatus('');
    disableInputs(false);
  } catch (error) {
    logger.error('Error inicializando:', error.message);
    setStatus(`Error al desbloquear: ${error.message}`, true);
    disableInputs(true);
  }
}

/**
 * Rellena el selector de modelos por defecto desde el catálogo local.
 */
function setupModelSelector() {
  const select = document.getElementById('quick-model-select');
  if (!select) return;
  select.innerHTML = '';
  for (const [provider, models] of Object.entries(MODELS)) {
    const group = document.createElement('optgroup');
    group.label = provider;
    for (const [key, model] of Object.entries(models)) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = model.name || key;
      group.appendChild(option);
    }
    select.appendChild(group);
  }
}

/**
 * Ajusta el selector de sector al valor configurado.
 */
async function loadSectorDefault() {
  try {
    const config = await call('CONFIG_GET');
    const modelSelect = document.getElementById('quick-model-select');
    if (modelSelect && config.defaultModel) modelSelect.value = config.defaultModel;
  } catch (error) {
    logger.debug('No se pudo cargar la configuración:', error.message);
  }
}

/* ------------------------------------------------------------------ *
 * Manejadores de eventos
 * ------------------------------------------------------------------ */

function attachEventListeners() {
  const sendBtn = document.getElementById('send-btn');
  const compareBtn = document.getElementById('compare-btn');
  const userInput = document.getElementById('user-input');
  const settingsBtn = document.getElementById('settings-btn');
  const historyBtn = document.getElementById('history-btn');

  userInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
  sendBtn?.addEventListener('click', handleSend);
  compareBtn?.addEventListener('click', handleCompare);
  settingsBtn?.addEventListener('click', openSettingsModal);
  historyBtn?.addEventListener('click', openHistoryModal);

  document.addEventListener('click', (e) => {
    if (e.target.id === 'close-comparison-btn') {
      document.getElementById('comparison-view').style.display = 'none';
    }
    const historyModal = document.getElementById('history-modal');
    const settingsModal = document.getElementById('settings-modal');
    if (e.target === historyModal) closeHistoryModal();
    if (e.target === settingsModal) closeSettingsModal();
  });
}

/**
 * Envío normal: el backend enruta al mejor modelo y responde.
 */
async function handleSend() {
  if (!initialized) return;
  const userInput = document.getElementById('user-input');
  const message = userInput.value.trim();
  if (!message) return;

  userInput.value = '';
  addChatMessage('user', message);
  showLoading('Generando respuesta…');

  try {
    const data = await call('CHAT', { query: message, history: [] });
    hideLoading();
    addChatMessage('assistant', data.text, data.model);
    if (data.cost != null) {
      setStatus(`Modelo: ${data.model} · sector: ${data.sector || '—'} · coste: $${Number(data.cost).toFixed(4)}`);
    }
    refreshBudget();
  } catch (error) {
    hideLoading();
    logger.error('Error:', error.message);
    addChatMessage('error', error.message);
  }
}

/**
 * Modo comparativo: el backend ejecuta varios modelos y evalúa.
 */
async function handleCompare() {
  if (!initialized) return;
  const userInput = document.getElementById('user-input');
  const message = userInput.value.trim();
  if (!message) {
    setStatus('Escribe una pregunta primero', true);
    return;
  }

  userInput.value = '';
  addChatMessage('user', message);
  showLoading('Comparando modelos (puede tardar)…');

  try {
    const sector = document.getElementById('quick-sector-select')?.value;
    const data = await call('COMPARE', { query: message, sector });
    hideLoading();
    showComparisonView(data);
  } catch (error) {
    hideLoading();
    logger.error('Error en comparación:', error.message);
    addChatMessage('error', error.message);
  }
}

/**
 * Renderiza las opciones A/B/C para voto ciego con el nuevo formato del backend.
 * @param {{options:Array<{label,model,text,score}>, judge:Object}} data
 */
function showComparisonView(data) {
  const view = document.getElementById('comparison-view');
  const container = document.getElementById('comparison-options');
  container.innerHTML = '';

  const winnerModel = data.judge?.winner || null;

  for (const opt of data.options) {
    const isWinner = winnerModel && opt.model === winnerModel;
    const el = document.createElement('div');
    el.className = `comparison-option ${isWinner ? 'winner' : ''}`;
    const scoreText = opt.score != null ? `${Number(opt.score).toFixed(1)}/10` : '—';

    const header = document.createElement('div');
    header.className = 'option-header';
    header.innerHTML =
      `<div class="option-title">Opción ${opt.label}</div>` +
      `<div class="option-score"${isWinner ? ' style="background:#10b981;"' : ''}>${scoreText}</div>`;

    const modelLine = document.createElement('div');
    modelLine.className = 'option-model';
    // El modelo se revela solo tras votar (voto ciego): lo guardamos en dataset.
    modelLine.textContent = '🤖 (oculto hasta votar)';

    const textEl = document.createElement('div');
    textEl.className = 'option-text';
    textEl.textContent = opt.text;

    const voteBtn = document.createElement('button');
    voteBtn.className = 'btn btn-vote';
    voteBtn.textContent = '👍 Esta es la mejor';
    voteBtn.addEventListener('click', () => voteForModel(opt.model, opt.label, el, modelLine));

    el.append(header, modelLine, textEl, voteBtn);
    el.dataset.model = opt.model;
    container.appendChild(el);
  }

  view.style.display = 'block';
}

/**
 * Registra el voto del usuario y revela los modelos.
 * @param {string} model
 * @param {string} label
 * @param {HTMLElement} chosenEl
 * @param {HTMLElement} modelLine
 */
async function voteForModel(model, label, chosenEl, modelLine) {
  try {
    const sector = document.getElementById('quick-sector-select')?.value;
    await call('VOTE', { vote: { winner: model, sector, reason: 'Voto directo del usuario' } });

    // Revelar modelos y resaltar el elegido
    document.querySelectorAll('.comparison-option').forEach((opt) => {
      const revealed = opt.querySelector('.option-model');
      if (revealed) revealed.textContent = `🤖 ${opt.dataset.model}`;
      if (opt !== chosenEl) {
        opt.style.opacity = '0.4';
        opt.style.pointerEvents = 'none';
      } else {
        opt.classList.add('winner');
      }
    });
    if (modelLine) modelLine.textContent = `🤖 ${model} ✅`;
    addChatMessage('system', `✅ Voto registrado: ${model} es tu favorito para tareas de ${sector || 'este tipo'}.`);
  } catch (error) {
    logger.error('Error registrando voto:', error.message);
    setStatus(`Error registrando voto: ${error.message}`, true);
  }
}

/* ------------------------------------------------------------------ *
 * Render de mensajes y estado
 * ------------------------------------------------------------------ */

function addChatMessage(role, content, model = null) {
  const chat = document.getElementById('chat-messages');
  const welcome = chat.querySelector('.welcome-message');
  if (welcome) welcome.remove();

  const el = document.createElement('div');
  el.className = `chat-message message-${role}`;
  const inner = document.createElement('div');

  if (role === 'assistant') {
    inner.className = 'message-content';
    const modelTag = document.createElement('div');
    modelTag.className = 'message-model';
    modelTag.textContent = `🤖 ${model || ''}`;
    const p = document.createElement('p');
    p.textContent = content;
    inner.append(modelTag, p);
  } else if (role === 'error') {
    inner.className = 'message-content error';
    const p = document.createElement('p');
    p.textContent = `⚠️ ${content}`;
    inner.appendChild(p);
  } else if (role === 'system') {
    inner.className = 'message-content system';
    const p = document.createElement('p');
    p.textContent = content;
    inner.appendChild(p);
  } else {
    inner.className = 'message-content';
    const p = document.createElement('p');
    p.textContent = content;
    inner.appendChild(p);
  }

  el.appendChild(inner);
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}

function showLoading(text = 'Procesando…') {
  const loader = document.getElementById('loading-indicator');
  document.getElementById('loading-text').textContent = text;
  loader.style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading-indicator').style.display = 'none';
}

/**
 * Muestra un mensaje de estado bajo el input.
 * @param {string} text
 * @param {boolean} [isError=false]
 */
function setStatus(text, isError = false) {
  const status = document.getElementById('input-status');
  if (!status) return;
  status.textContent = text;
  status.style.color = isError ? '#ef4444' : '#6b7280';
}

function disableInputs(disabled) {
  ['send-btn', 'compare-btn', 'user-input'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
}

/**
 * Muestra el presupuesto diario restante en el estado.
 */
async function refreshBudget() {
  try {
    const status = await call('BUDGET_STATUS');
    const remaining = status.daily?.remaining ?? 0;
    const limit = status.daily?.limit ?? 0;
    const el = document.getElementById('input-status');
    if (el && !el.textContent) {
      el.textContent = `Presupuesto hoy: $${remaining.toFixed(2)} / $${limit.toFixed(2)}`;
      el.style.color = remaining < limit * 0.25 ? '#f59e0b' : '#6b7280';
    }
  } catch (error) {
    logger.debug('Sin presupuesto disponible:', error.message);
  }
}

/* ------------------------------------------------------------------ *
 * Modales
 * ------------------------------------------------------------------ */

async function openHistoryModal() {
  try {
    const history = (await call('HISTORY_GET')) || [];
    const list = document.getElementById('history-list');
    if (!history.length) {
      list.innerHTML = '<p style="text-align:center;color:#999;">No hay historial</p>';
    } else {
      list.innerHTML = '';
      history
        .slice(-20)
        .reverse()
        .forEach((msg) => {
          const item = document.createElement('div');
          item.className = 'history-item';
          const role = document.createElement('div');
          role.className = 'history-role';
          role.textContent = msg.role === 'user' ? '👤' : '🤖';
          const text = document.createElement('div');
          text.className = 'history-text';
          text.textContent = (msg.content || '').substring(0, 100);
          const time = document.createElement('div');
          time.className = 'history-time';
          time.textContent = msg.timestamp ? new Date(msg.timestamp).toLocaleString('es-ES') : '';
          item.append(role, text, time);
          list.appendChild(item);
        });
    }
    document.getElementById('history-modal').style.display = 'flex';
  } catch (error) {
    logger.error('Error abriendo historial:', error.message);
    setStatus(`Error: ${error.message}`, true);
  }
}

function closeHistoryModal() {
  document.getElementById('history-modal').style.display = 'none';
}

async function clearHistoryConfirm() {
  if (!confirm('¿Eliminar todo el historial?')) return;
  try {
    await call('HISTORY_CLEAR');
    closeHistoryModal();
    setStatus('Historial limpiado');
  } catch (error) {
    setStatus(`Error: ${error.message}`, true);
  }
}

function openSettingsModal() {
  document.getElementById('settings-modal').style.display = 'flex';
}

function closeSettingsModal() {
  document.getElementById('settings-modal').style.display = 'none';
}

function openFullSettings() {
  chrome.runtime.openOptionsPage();
}

/**
 * Expone al ámbito global las funciones invocadas por onclick inline en el HTML.
 */
function exposeGlobals() {
  window.closeHistoryModal = closeHistoryModal;
  window.clearHistoryConfirm = clearHistoryConfirm;
  window.closeSettingsModal = closeSettingsModal;
  window.openFullSettings = openFullSettings;
}
