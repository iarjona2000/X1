/**
 * Content Script para Google Workspace
 * Detecta el contexto (Gmail, Docs, etc) e inyecta funcionalidades
 */

console.log('[X1] Workspace content script cargado');

const url = window.location.href;
let context = 'unknown';

if (url.includes('mail.google.com')) {
  context = 'gmail';
  initializeGmail();
} else if (url.includes('docs.google.com')) {
  context = 'docs';
  initializeDocs();
} else if (url.includes('sheets.google.com')) {
  context = 'sheets';
  initializeSheets();
} else if (url.includes('calendar.google.com')) {
  context = 'calendar';
  initializeCalendar();
}

console.log(`[X1] Contexto detectado: ${context}`);

/**
 * Gmail
 */
function initializeGmail() {
  // Inyectar botón para redactar con IA
  addGmailButton();
}

function addGmailButton() {
  // Observar cambios en DOM para agregar botón cuando sea necesario
  const observer = new MutationObserver(() => {
    const composeArea = document.querySelector('[role="main"]');
    if (composeArea && !composeArea.querySelector('[data-x1-compose-btn]')) {
      const btn = document.createElement('button');
      btn.setAttribute('data-x1-compose-btn', 'true');
      btn.textContent = '✨ Ayuda con IA';
      btn.style.cssText = `
        padding: 8px 12px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin: 8px;
        font-size: 13px;
      `;
      btn.onclick = () => {
        chrome.runtime.sendMessage({
          type: 'REQUEST_GMAIL_ASSIST',
          context: 'gmail'
        });
      };
      composeArea.appendChild(btn);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Google Docs
 */
function initializeDocs() {
  // Agregar botón en la barra de herramientas
  addDocsButton();
}

function addDocsButton() {
  const observer = new MutationObserver(() => {
    const toolbar = document.querySelector('[aria-label="Main menu"]')?.parentElement;
    if (toolbar && !toolbar.querySelector('[data-x1-docs-btn]')) {
      const btn = document.createElement('button');
      btn.setAttribute('data-x1-docs-btn', 'true');
      btn.textContent = '✨ X1';
      btn.title = 'Ayuda con IA para tu documento';
      btn.style.cssText = `
        padding: 8px 12px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
      `;
      btn.onclick = () => {
        const selectedText = window.getSelection().toString();
        chrome.runtime.sendMessage({
          type: 'REQUEST_DOCS_ASSIST',
          selectedText: selectedText,
          context: 'docs'
        });
      };
      toolbar.appendChild(btn);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Google Sheets
 */
function initializeSheets() {
  console.log('[X1] Google Sheets - No implementado aún');
}

/**
 * Google Calendar
 */
function initializeCalendar() {
  console.log('[X1] Google Calendar - No implementado aún');
}

// Escuchar mensajes desde popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[X1] Mensaje en workspace:', request.type);

  switch (request.type) {
    case 'INSERT_TEXT':
      insertTextAtCursor(request.text);
      sendResponse({ success: true });
      break;

    case 'GET_SELECTED_TEXT':
      const selected = window.getSelection().toString();
      sendResponse({ text: selected });
      break;

    default:
      sendResponse({ error: 'Tipo de mensaje desconocido' });
  }
});

function insertTextAtCursor(text) {
  // Obtener el elemento activo (input, textarea, contenteditable)
  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLInputElement) {
    const start = activeElement.selectionStart;
    const end = activeElement.selectionEnd;
    activeElement.value = activeElement.value.substring(0, start) + text + activeElement.value.substring(end);
    activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (activeElement.contentEditable === 'true') {
    document.execCommand('insertText', false, text);
  }
}

console.log('[X1] Workspace inicializado');
