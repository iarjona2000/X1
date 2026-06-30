const fs = require('fs');
const path = 'C:\\Users\\tomas\\Desktop\\cbos-ext\\content\\voice-listener.js';

const newCode = `(function(){

  console.log('[X1] Premium Terminal v8');

  var recognition = null;
  var isActive = false;
  var processing = false;

  var panelEl = null;
  var inputEl = null;
  var outputEl = null;
  var statusEl = null;
  var initAttempts = 0;
  var MAX_INIT_ATTEMPTS = 20;

  var style = document.createElement('style');
  style.textContent = [
    '@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap");',
    '',
    ':root {',
    '  --x1-serif: "Cormorant Garamond", "Georgia", "Times New Roman", serif;',
    '  --x1-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;',
    '  --x1-bg: #faf9f7;',
    '  --x1-surface: #ffffff;',
    '  --x1-border: #e5e3df;',
    '  --x1-border-strong: #d4d0ca;',
    '  --x1-text: #1a1a1a;',
    '  --x1-text-secondary: #5c5c5c;',
    '  --x1-text-tertiary: #8a8a8a;',
    '  --x1-accent: #1a1a1a;',
    '  --x1-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06);',
    '  --x1-shadow-lg: 0 4px 24px rgba(0,0,0,0.08), 0 12px 48px rgba(0,0,0,0.06);',
    '}',
    '',
    '#x1-bar {',
    '  position: fixed !important;',
    '  bottom: 32px !important;',
    '  left: 50% !important;',
    '  transform: translateX(-50%) !important;',
    '  z-index: 2147483647 !important;',
    '  width: min(440px, calc(100vw - 40px)) !important;',
    '  max-height: calc(100vh - 80px) !important;',
    '  display: flex !important;',
    '  flex-direction: column !important;',
    '  font-family: var(--x1-sans) !important;',
    '  font-size: 13px !important;',
    '  line-height: 1.5 !important;',
    '  color: var(--x1-text) !important;',
    '  background: var(--x1-surface) !important;',
    '  border: 1px solid var(--x1-border-strong) !important;',
    '  border-radius: 16px !important;',
    '  box-shadow: var(--x1-shadow-lg) !important;',
    '  overflow: hidden !important;',
    '  backdrop-filter: blur(20px) !important;',
    '  -webkit-backdrop-filter: blur(20px) !important;',
    '}',
    '',
    '#x1-bar::before {',
    '  content: "" !important;',
    '  position: absolute !important;',
    '  top: -60px !important;',
    '  left: 50% !important;',
    '  transform: translateX(-50%) !important;',
    '  width: 120px !important;',
    '  height: 120px !important;',
    '  background: radial-gradient(circle, rgba(26,26,26,0.03) 0%, transparent 70%) !important;',
    '  pointer-events: none !important;',
    '  z-index: 0 !important;',
    '}',
    '',
    '#x1-bar > * { position: relative; z-index: 1; }',
    '',
    '#x1-bar-header {',
    '  display: flex !important;',
    '  align-items: center !important;',
    '  justify-content: space-between !important;',
    '  padding: 14px 18px !important;',
    '  border-bottom: 1px solid var(--x1-border) !important;',
    '  background: var(--x1-surface) !important;',
    '}',
    '',
    '#x1-bar-logo {',
    '  display: flex !important;',
    '  align-items: center !important;',
    '  gap: 10px !important;',
    '}',
    '',
    '#x1-bar-logo-icon {',
    '  width: 28px !important;',
    '  height: 28px !important;',
    '  background: var(--x1-accent) !important;',
    '  color: var(--x1-bg) !important;',
    '  display: flex !important;',
    '  align-items: center !important;',
    '  justify-content: center !important;',
    '  font-family: var(--x1-serif) !important;',
    '  font-size: 14px !important;',
    '  font-weight: 600 !important;',
    '  border-radius: 8px !important;',
    '  letter-spacing: -0.02em !important;',
    '}',
    '',
    '#x1-bar-title {',
    '  font-family: var(--x1-serif) !important;',
    '  font-size: 16px !important;',
    '  font-weight: 600 !important;',
    '  letter-spacing: 0.02em !important;',
    '  color: var(--x1-text) !important;',
    '}',
    '',
    '#x1-bar-status {',
    '  font-family: var(--x1-sans) !important;',
    '  font-size: 10px !important;',
    '  font-weight: 500 !important;',
    '  text-transform: uppercase !important;',
    '  letter-spacing: 0.08em !important;',
    '  color: var(--x1-text-tertiary) !important;',
    '}',
    '',
    '#x1-bar-close {',
    '  background: transparent !important;',
    '  border: none !important;',
    '  color: var(--x1-text-tertiary) !important;',
    '  font-size: 18px !important;',
    '  cursor: pointer !important;',
    '  padding: 4px !important;',
    '  width: auto !important;',
    '  line-height: 1 !important;',
    '  transition: color 0.15s ease !important;',
    '  font-family: var(--x1-serif) !important;',
    '}',
    '#x1-bar-close:hover { color: var(--x1-text) !important; }',
    '',
    '#x1-bar-input {',
    '  width: 100% !important;',
    '  padding: 14px 18px !important;',
    '  border: none !important;',
    '  border-bottom: 1px solid var(--x1-border) !important;',
    '  background: var(--x1-surface) !important;',
    '  color: var(--x1-text) !important;',
    '  font-family: var(--x1-sans) !important;',
    '  font-size: 13px !important;',
    '  font-weight: 400 !important;',
    '  outline: none !important;',
    '  resize: none !important;',
    '  min-height: 44px !important;',
    '  max-height: 120px !important;',
    '  line-height: 1.5 !important;',
    '  letter-spacing: 0.01em !important;',
    '}',
    '#x1-bar-input::placeholder {',
    '  color: var(--x1-text-tertiary) !important;',
    '  font-style: italic !important;',
    '  font-family: var(--x1-serif) !important;',
    '}',
    '#x1-bar-input:focus { background: #fdfcfb !important; }',
    '',
    '#x1-bar-output {',
    '  max-height: 220px !important;',
    '  overflow-y: auto !important;',
    '  padding: 14px 18px !important;',
    '  background: var(--x1-bg) !important;',
    '  border-bottom: 1px solid var(--x1-border) !important;',
    '  font-size: 13px !important;',
    '  line-height: 1.6 !important;',
    '  color: var(--x1-text) !important;',
    '  scrollbar-width: thin !important;',
    '  scrollbar-color: var(--x1-border-strong) transparent !important;',
    '}',
    '#x1-bar-output::-webkit-scrollbar { width: 5px !important; }',
    '#x1-bar-output::-webkit-scrollbar-thumb { background: var(--x1-border-strong) !important; border-radius: 3px !important; }',
    '',
    '#x1-bar-msg {',
    '  margin-bottom: 10px !important;',
    '  padding: 10px 14px !important;',
    '  border-left: 2px solid var(--x1-border-strong) !important;',
    '  border-radius: 0 8px 8px 0 !important;',
    '  background: var(--x1-surface) !important;',
    '  transition: background 0.2s ease !important;',
    '}',
    '#x1-bar-msg:hover { background: #fdfcfb !important; }',
    '#x1-bar-msg.user {',
    '  background: #f5f4f2 !important;',
    '  border-left-color: var(--x1-accent) !important;',
    '}',
    '#x1-bar-msg.assistant { border-left-color: var(--x1-border-strong) !important; }',
    '#x1-bar-msg.error {',
    '  border-left-color: #c45c5c !important;',
    '  background: #fdf8f8 !important;',
    '  color: #8b3a3a !important;',
    '}',
    '',
    '#x1-bar-msg .meta {',
    '  font-family: var(--x1-sans) !important;',
    '  font-size: 9px !important;',
    '  font-weight: 600 !important;',
    '  text-transform: uppercase !important;',
    '  letter-spacing: 0.08em !important;',
    '  color: var(--x1-text-tertiary) !important;',
    '  margin-bottom: 4px !important;',
    '}',
    '',
    '#x1-bar-footer {',
    '  display: flex !important;',
    '  align-items: center !important;',
    '  justify-content: space-between !important;',
    '  padding: 10px 18px !important;',
    '  background: var(--x1-surface) !important;',
    '  border-top: 1px solid var(--x1-border) !important;',
    '}',
    '',
    '#x1-bar-hint {',
    '  font-family: var(--x1-sans) !important;',
    '  font-size: 9px !important;',
    '  font-weight: 500 !important;',
    '  text-transform: uppercase !important;',
    '  letter-spacing: 0.06em !important;',
    '  color: var(--x1-text-tertiary) !important;',
    '}',
    '',
    '#x1-bar-actions { display: flex !important; gap: 8px !important; }',
    '',
    '#x1-bar-btn {',
    '  padding: 6px 14px !important;',
    '  border: 1px solid var(--x1-border-strong) !important;',
    '  background: var(--x1-surface) !important;',
    '  color: var(--x1-text) !important;',
    '  font-family: var(--x1-sans) !important;',
    '  font-size: 10px !important;',
    '  font-weight: 600 !important;',
    '  text-transform: uppercase !important;',
    '  letter-spacing: 0.06em !important;',
    '  cursor: pointer !important;',
    '  transition: all 0.15s ease !important;',
    '  border-radius: 8px !important;',
    '}',
    '#x1-bar-btn:hover {',
    '  background: var(--x1-accent) !important;',
    '  color: var(--x1-bg) !important;',
    '  border-color: var(--x1-accent) !important;',
    '}',
    '#x1-bar-btn.recording {',
    '  background: var(--x1-accent) !important;',
    '  color: var(--x1-bg) !important;',
    '  animation: x1-pulse 2s ease-in-out infinite !important;',
    '}',
    '',
    '@keyframes x1-pulse {',
    '  0%, 100% { opacity: 1; }',
    '  50% { opacity: 0.7; }',
    '}',
    '',
    '#x1-orb, #x1-glow, #x1-process-bar, #x1-wave-canvas { display: none !important; }',
    '',
    '#x1-loading {',
    '  position: fixed !important;',
    '  bottom: 32px !important;',
    '  left: 50% !important;',
    '  transform: translateX(-50%) !important;',
    '  z-index: 2147483647 !important;',
    '  background: var(--x1-surface) !important;',
    '  border: 1px solid var(--x1-border-strong) !important;',
    '  padding: 10px 18px !important;',
    '  font-family: var(--x1-sans) !important;',
    '  font-size: 11px !important;',
    '  font-weight: 500 !important;',
    '  color: var(--x1-text) !important;',
    '  border-radius: 12px !important;',
    '  box-shadow: var(--x1-shadow) !important;',
    '}'
  ].join('\\n');
  document.head.appendChild(style);

  function createPanel() {
    if (panelEl) return;

    var existing = document.getElementById('x1-bar');
    if (existing) {
      panelEl = existing;
      inputEl = document.getElementById('x1-bar-input');
      outputEl = document.getElementById('x1-bar-output');
      statusEl = document.getElementById('x1-bar-status');
      return;
    }

    panelEl = document.createElement('div');
    panelEl.id = 'x1-bar';
    panelEl.setAttribute('role', 'region');
    panelEl.setAttribute('aria-label', 'X1 Assistant');
    panelEl.innerHTML = [
      '<div id="x1-bar-header">',
      '  <div class="x1-bar-logo">',
      '    <div class="x1-bar-logo-icon">X</div>',
      '    <span class="x1-bar-title">X1</span>',
      '  </div>',
      '  <span id="x1-bar-status" class="x1-bar-status">ready</span>',
      '  <button id="x1-bar-close" class="x1-bar-close" aria-label="Close">&times;</button>',
      '</div>',
      '<div id="x1-bar-output" role="log" aria-live="polite"></div>',
      '<textarea id="x1-bar-input" placeholder="Escribe un mensaje..." rows="1" aria-label="Mensaje"></textarea>',
      '<div id="x1-bar-footer">',
      '  <span class="x1-bar-hint">Ctrl + Space para voz</span>',
      '  <div class="x1-bar-actions">',
      '    <button id="x1-bar-send" class="x1-bar-btn">Enviar</button>',
      '    <button id="x1-bar-mic" class="x1-bar-btn">Voz</button>',
      '  </div>',
      '</div>'
    ].join('\n');

    var target = document.body || document.documentElement;
    if (!target) return;
    target.appendChild(panelEl);

    inputEl = document.getElementById('x1-bar-input');
    outputEl = document.getElementById('x1-bar-output');
    statusEl = document.getElementById('x1-bar-status');

    document.getElementById('x1-bar-send').addEventListener('click', function() {
      var text = inputEl.value.trim();
      if (text) {
        addMessage('user', text);
        inputEl.value = '';
        inputEl.style.height = 'auto';
        processCommand(text);
      }
    });

    document.getElementById('x1-bar-close').addEventListener('click', destroyPanel);

    document.getElementById('x1-bar-mic').addEventListener('click', toggleVoice);

    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('x1-bar-send').click();
      }
    });

    inputEl.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    setTimeout(function() { if (inputEl) inputEl.focus(); }, 150);
  }

  function destroyPanel() {
    if (panelEl) {
      panelEl.remove();
      panelEl = null;
      inputEl = null;
      outputEl = null;
      statusEl = null;
    }
  }

  function togglePanel() {
    if (panelEl) destroyPanel();
    else createPanel();
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function addMessage(role, text) {
    renderMessage(role, text, true);
    try {
      chrome.runtime.sendMessage({type: 'X1_ADD_MESSAGE', role: role, text: text}).catch(function(){});
    } catch(e) {}
  }

  function renderMessage(role, text, scroll) {
    if (!outputEl) return;
    var msg = document.createElement('div');
    msg.className = 'x1-bar-msg ' + (role || 'assistant');
    var meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = role === 'user' ? 'TÚ' : 'X1';
    msg.appendChild(meta);
    var body = document.createElement('div');
    body.textContent = text;
    msg.appendChild(body);
    outputEl.appendChild(msg);
    if (scroll !== false) outputEl.scrollTop = outputEl.scrollHeight;
  }

  function addError(text) {
    if (!outputEl) return;
    var msg = document.createElement('div');
    msg.className = 'x1-bar-msg error';
    msg.textContent = text;
    outputEl.appendChild(msg);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  function processCommand(cmd) {
    if (processing) {
      addError('Espera un momento...');
      return;
    }
    setStatus('procesando');
    processing = true;

    var startTime = Date.now();
    var timeoutMs = 15000;

    var messagePromise = new Promise(function(resolve, reject) {
      chrome.runtime.sendMessage({
        type: 'VOICE_COMMAND_EXEC',
        command: cmd,
        raw: cmd,
        wantsText: true
      }).then(resolve).catch(reject);
    });

    var timeoutPromise = new Promise(function(resolve) {
      setTimeout(function() {
        resolve({timeout: true, elapsed: Date.now() - startTime});
      }, timeoutMs);
    });

    Promise.race([messagePromise, timeoutPromise]).then(function(resp) {
      processing = false;
      var elapsed = Date.now() - startTime;

      if (resp && resp.timeout) {
        addError('Sin respuesta (' + elapsed + 'ms). Intenta de nuevo.');
        setStatus('error');
        setTimeout(function() { setStatus('listo'); }, 2500);
        return;
      }

      if (resp && resp.text) {
        var cleanText = resp.text.replace(/^ERROR:\\s*/i, '').trim();
        if (!cleanText || cleanText.toLowerCase().indexOf('cannot read') !== -1 || cleanText.toLowerCase().indexOf('does not support image') !== -1 || cleanText.toLowerCase().indexOf('image.png') !== -1) {
          cleanText = 'Hecho. ¿Algo más?';
        }
        addMessage('assistant', cleanText);
        if (resp.showText) speak(cleanText);
      } else if (resp && resp.error) {
        addError('Error: ' + resp.error.replace(/^ERROR:\\s*/i, ''));
      } else {
        addError('Sin respuesta. Intenta de nuevo.');
      }
      setStatus('listo');
    }).catch(function(e) {
      processing = false;
      setStatus('error');
      addError('Error de conexión.');
      setTimeout(function() { setStatus('listo'); }, 2500);
    });
  }

  function toggleVoice() {
    if (isActive) stopVoice();
    else startVoice();
  }

  function startVoice() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      addError('Voz no soportada en este navegador.');
      return;
    }
    try {
      var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'es-ES';
      recognition.onresult = function(event) {
        var transcript = '';
        for (var i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          addMessage('user', transcript);
          processCommand(transcript);
        }
        stopVoice();
      };
      recognition.onerror = function(event) {
        console.error('[X1] Voice error:', event.error);
        if (event.error === 'no-speech') {
          addError('No detecté voz. Intenta de nuevo.');
        } else if (event.error === 'audio-capture') {
          addError('Micrófono no disponible.');
        } else {
          addError('Error de voz: ' + event.error);
        }
        stopVoice();
      };
      recognition.onend = function() {
        stopVoice();
      };
      recognition.start();
      isActive = true;
      setStatus('escuchando');
      var micBtn = document.getElementById('x1-bar-mic');
      if (micBtn) {
        micBtn.classList.add('recording');
        micBtn.textContent = 'Parar';
      }
    } catch(e) {
      addError('Error al iniciar voz: ' + e.message);
    }
  }

  function stopVoice() {
    if (recognition) {
      try { recognition.stop(); } catch(e) {}
      recognition = null;
    }
    isActive = false;
    setStatus('listo');
    var micBtn = document.getElementById('x1-bar-mic');
    if (micBtn) {
      micBtn.classList.remove('recording');
      micBtn.textContent = 'Voz';
    }
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    setStatus('hablando');
    utterance.onend = function() { setStatus('listo'); };
    utterance.onerror = function() { setStatus('listo'); };
    window.speechSynthesis.speak(utterance);
  }

  function init() {
    initAttempts++;
    console.log('[X1] Init attempt ' + initAttempts + ' on', window.location.href);

    if (!panelEl) {
      createPanel();
    }

    if (panelEl && inputEl) {
      setStatus('listo');
      return true;
    }

    if (initAttempts < MAX_INIT_ATTEMPTS) {
      setTimeout(init, 400);
    }
    return false;
  }

  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      if (!panelEl) createPanel();
      if (isActive) stopVoice();
      else startVoice();
    }
  });

  chrome.runtime.onMessage.addListener(function(msg) {
    if (msg.type === 'X1_TOGGLE') {
      togglePanel();
    }
    if (msg.type === 'X1_AGENT_STATUS') {
      setStatus(msg.text || 'procesando');
    }
  });

  init();
  setTimeout(init, 2000);
  setTimeout(init, 5000);
  setTimeout(init, 8000);

})();
`;

fs.writeFileSync(path, newCode);
console.log('voice-listener.js v8 — Premium design + fixed responses');
