/**
 * Content Script para inyectar chat en cualquier página
 */

console.log('[X1] Chat content script cargado');

// Crear flotante con chat
function initializeChat() {
  // Solo inicializar si no existe ya
  if (document.getElementById('x1-chat-widget')) return;

  const widget = document.createElement('div');
  widget.id = 'x1-chat-widget';
  widget.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 380px;
      height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 5px 40px rgba(0,0,0,0.16);
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 9999;
    ">
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px;
        border-radius: 12px 12px 0 0;
        font-weight: 600;
        cursor: pointer;
      ">
        🤖 X1 Chat
        <button style="
          float: right;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 20px;
        " onclick="this.closest('#x1-chat-widget').style.display='none'">✕</button>
      </div>
      <iframe
        src="chrome-extension://${chrome.runtime.id}/src/popup/popup.html"
        style="
          border: none;
          flex: 1;
          width: 100%;
          height: 100%;
        "
      ></iframe>
    </div>
  `;

  document.body.appendChild(widget);
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeChat);
} else {
  initializeChat();
}

// Escuchar mensajes del popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CLOSE_CHAT') {
    const widget = document.getElementById('x1-chat-widget');
    if (widget) widget.style.display = 'none';
  }
});

console.log('[X1] Chat widget inicializado');
