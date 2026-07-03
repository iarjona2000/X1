(function() {
  'use strict';

  var input = document.getElementById('input');
  var btnSend = document.getElementById('btn-send');
  var btnMic = document.getElementById('btn-mic');
  var btnNew = document.getElementById('btn-new');
  var messagesEl = document.getElementById('messages');
  var headerTitle = document.getElementById('header-title');

  var listening = false;
  var recognition = null;
  var currentThinking = null;
  var messages = [];
  var responded = false;
  var panelTimeout = null;
  var webLLMEngine = null;
  var webLLMLoaded = false;
  var activeRequestId = null;
  var thinkToggle = false;
  var searchToggle = false;

  function detectWebGPU() {
    if (typeof navigator === 'undefined' || !navigator.gpu) return Promise.resolve({ supported: false });
    return navigator.gpu.requestAdapter().then(function(adapter) {
      if (!adapter) return { supported: false };
      return adapter.requestDevice().then(function() { return { supported: true, adapter: adapter }; }).catch(function() { return { supported: false }; });
    }).catch(function() { return { supported: false }; });
  }

  function loadWebLLM() {
    if (webLLMLoaded && webLLMEngine) return Promise.resolve({ ok: true });
    if (typeof window.webllm === 'undefined') {
      return new Promise(function(resolve) {
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@latest/lib/index.js';
        script.onload = function() {
          window.webllm.CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC').then(function(engine) {
            webLLMEngine = engine; webLLMLoaded = true;
            console.log('[X1-sidepanel] WebLLM loaded');
            resolve({ ok: true });
          }).catch(function(e) { console.error('[X1-sidepanel] WebLLM load failed:', e); resolve({ ok: false, error: e.message }); });
        };
        script.onerror = function() { resolve({ ok: false, error: 'Failed to load WebLLM script' }); };
        document.head.appendChild(script);
      });
    }
    return Promise.resolve({ ok: true });
  }

  function webLLMComplete(userMsg) {
    if (!webLLMLoaded || !webLLMEngine) {
      return loadWebLLM().then(function() {
        if (!webLLMLoaded || !webLLMEngine) return { ok: false, error: 'WebLLM not available' };
        return performWebLLMInference(userMsg);
      });
    }
    return performWebLLMInference(userMsg);
  }

  function performWebLLMInference(userMsg) {
    return webLLMEngine.chat.completions.create({
      messages: [{ role: 'user', content: userMsg }],
      max_tokens: 256, temperature: 0.7
    }).then(function(response) {
      return { ok: true, text: response.choices[0].message.content, model: 'Llama-3.2-1B-WebLLM' };
    }).catch(function(e) { return { ok: false, error: e.message }; });
  }

  function clearPanelTimeout() {
    responded = true;
    if (panelTimeout) { clearTimeout(panelTimeout); panelTimeout = null; }
    stopResponseFallback();
  }

  showWelcome();
  initVoice();
  checkConnection();
  checkProviderHealth();

  var fccStatusItem = document.querySelector('.ps-item.clickable');
  if (fccStatusItem) {
    fccStatusItem.addEventListener('click', function() {
      chrome.tabs.create({ url: 'fcc-start.html' });
    });
  }

  btnNew.addEventListener('click', function() {
    messages = [];
    headerTitle.textContent = 'Nueva conversación';
    showWelcome();
  });

  function checkConnection() {
    if (!chrome.runtime || !chrome.runtime.sendMessage) { return; }
    try {
      chrome.runtime.sendMessage({ type: 'PING' }, function(response) {
        if (chrome.runtime.lastError || !response) { return; }
      });
    } catch(e) {}
  }

  function checkProviderHealth() {
    if (!chrome.runtime || !chrome.runtime.sendMessage) return;
    var psItems = document.querySelectorAll('.ps-item');
    psItems.forEach(function(item) {
      var dot = item.querySelector('.ps-dot');
      if (dot) dot.className = 'ps-dot checking';
    });
    chrome.runtime.sendMessage({ type: 'PROVIDER_HEALTH' }, function(health) {
      if (chrome.runtime.lastError || !health || !health.providers) return;
      health.providers.forEach(function(p) {
        var item = document.querySelector('.ps-item[data-provider="' + p.name + '"]');
        if (item) {
          var dot = item.querySelector('.ps-dot');
          if (dot) {
            if (p.status === 'healthy') dot.className = 'ps-dot online';
            else if (p.status === 'unhealthy' || p.status === 'unavailable') dot.className = 'ps-dot offline';
            else dot.className = 'ps-dot checking';
          }
        }
      });
    });
    setTimeout(checkProviderHealth, 30000);
  }

  function showWelcome() {
    messagesEl.innerHTML = '';
    var welcome = document.createElement('div');
    welcome.className = 'welcome';
    welcome.innerHTML =
      '<img src="../assets/x1-logo-blue.png" alt="X1" class="welcome-logo">' +
      '<h1>Hola, soy X1</h1>' +
      '<p class="welcome-sub">Tu asistente en el navegador. Pregúntame lo que quieras o elige una idea para empezar.</p>' +
      '<div class="welcome-suggestions">' +
        '<button class="welcome-suggestion" data-cmd="Resumir esta pagina web">' +
          '<svg class="sug-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' +
          '<span>Resumir esta página web</span>' +
        '</button>' +
        '<button class="welcome-suggestion" data-cmd="Redactar un correo profesional">' +
          '<svg class="sug-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>' +
          '<span>Redactar un correo profesional</span>' +
        '</button>' +
        '<button class="welcome-suggestion" data-cmd="Explicar un concepto dificil">' +
          '<svg class="sug-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M9 18h6M10 22h4M12 2v4M7 12a5 5 0 0110 0c0 2-2 3-2 5h-6c0-2-2-3-2-5z"/></svg>' +
          '<span>Explicar un concepto difícil</span>' +
        '</button>' +
      '</div>';
    messagesEl.appendChild(welcome);

    welcome.querySelectorAll('.welcome-suggestion').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var cmd = this.getAttribute('data-cmd');
        input.value = cmd;
        sendMessage();
      });
    });
  }

  function addMessage(role, text, stream) {
    var welcomeEl = messagesEl.querySelector('.welcome');
    if (welcomeEl) welcomeEl.remove();
    headerTitle.textContent = role === 'user' ? (text || '').substring(0, 40) + '...' : 'Conversación';

    var msg = document.createElement('div');
    msg.className = 'msg msg-' + role;

    if (role === 'ai') {
      var header = document.createElement('div');
      header.className = 'msg-ai-header';
      header.innerHTML = '<img src="../assets/x1-logo-blue.png" alt="X1" class="ai-logo"><span class="ai-label">X1 Assistant</span>';
      msg.appendChild(header);

      var body = document.createElement('div');
      body.className = 'msg-body';
      if (stream) {
        body.textContent = '';
        msg._streaming = true;
      } else {
        body.innerHTML = formatText(text);
      }
      msg.appendChild(body);

      var actions = document.createElement('div');
      actions.className = 'msg-ai-actions';
      actions.innerHTML =
        '<button class="ai-action-btn" title="Copiar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>' +
        '<button class="ai-action-btn" title="Me gusta"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg></button>' +
        '<button class="ai-action-btn" title="No me gusta"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10zM17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg></button>' +
        '<button class="ai-action-btn" title="Regenerar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg></button>';
      msg.appendChild(actions);
    } else {
      var body = document.createElement('div');
      body.className = 'msg-body';
      body.textContent = text;
      msg.appendChild(body);
    }

    messagesEl.appendChild(msg);
    scrollToBottom();
    messages.push({ role: role, text: text });
    return msg;
  }

  function streamAiText(msgElement, fullText) {
    if (!msgElement || !msgElement._streaming) return;
    var body = msgElement.querySelector('.msg-body');
    if (!body) return;
    var index = 0;
    var chunkSize = 3;
    var interval = setInterval(function() {
      if (index < fullText.length) {
        body.innerHTML = formatText(fullText.substring(0, index + chunkSize));
        index += chunkSize;
        scrollToBottom();
      } else {
        clearInterval(interval);
        body.innerHTML = formatText(fullText);
        msgElement._streaming = false;
        scrollToBottom();
      }
    }, 16);
  }

  function addStep(app, desc, status) {
    var welcomeEl = messagesEl.querySelector('.welcome');
    if (welcomeEl) welcomeEl.remove();
    var step = document.createElement('div');
    step.className = 'msg-step';
    step.innerHTML = '<span>' + app + '</span><span>' + desc + '</span><span class="step-status ' + status + '"></span>';
    messagesEl.appendChild(step);
    scrollToBottom();
    return step;
  }

  function updateStep(id, status) {
    var el = messagesEl.querySelector('[data-step-id="' + id + '"] .step-status');
    if (el) el.className = 'step-status ' + status;
  }

  function formatText(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>').replace(/^/, '<p>').replace(/$/, '</p>');
  }

  function scrollToBottom() {
    var chatView = document.getElementById('tab-chat');
    chatView.scrollTop = chatView.scrollHeight;
  }

  function showThinking() {
    removeThinking();
    var el = document.createElement('div');
    el.className = 'msg msg-thinking';
    el.innerHTML = '<div class="thinking-dots"><span></span><span></span><span></span></div> Pensando...';
    messagesEl.appendChild(el);
    currentThinking = el;
    scrollToBottom();
  }

  function removeThinking() {
    if (currentThinking) { currentThinking.remove(); currentThinking = null; }
  }

  function sendMessage() {
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMessage('user', text);
    showThinking();
    responded = false;
    activeRequestId = Date.now() + '-' + Math.floor(Math.random() * 10000);
    if (panelTimeout) { clearTimeout(panelTimeout); panelTimeout = null; }
    panelTimeout = setTimeout(function() {
      if (!responded) {
        responded = true; clearTimeout(panelTimeout); panelTimeout = null;
        removeThinking(); stopResponseFallback();
        webLLMComplete(text).then(function(result) {
          clearPanelTimeout(); removeThinking();
          if (result && result.ok && result.text) {
            var aiMsg = addMessage('ai', result.text, true);
            streamAiText(aiMsg, result.text);
          } else {
            addMessage('ai', 'Arranca FCC proxy (start-fcc.bat) o configura una API key en Settings.');
          }
        }).catch(function(e) {
          clearPanelTimeout(); removeThinking();
          addMessage('ai', 'No se pudo cargar el cerebro local. ' + e.message);
        });
      }
    }, 8000);

    function doSend() {
      var requestId = activeRequestId;
      console.log('[X1-sidepanel] Sending:', text.substring(0, 50), 'requestId:', requestId);
      startResponseFallback(requestId);
      chrome.runtime.sendMessage(
        { type: 'VOICE_COMMAND_EXEC', command: text, raw: text, wantsText: true, requestId: requestId },
        function(response) {
          if (chrome.runtime.lastError) {
            if (!responded) { responded = true; clearTimeout(panelTimeout); removeThinking(); stopResponseFallback(); }
            return;
          }
          if (response && response.ack) console.log('[X1-sidepanel] ack received');
        }
      );
    }

    setTimeout(function() { if (!responded) stopResponseFallback(); }, 32000);

    try {
      if (!chrome.runtime || !chrome.runtime.sendMessage) {
        responded = true; clearTimeout(panelTimeout); removeThinking();
        addMessage('ai', 'Extensión desconectada. Recarga la extensión.');
        return;
      }
      chrome.runtime.sendMessage({ type: 'PING' }, function(pong) {
        if (chrome.runtime.lastError) {
          if (!responded) { responded = true; clearTimeout(panelTimeout); removeThinking(); }
          return;
        }
        doSend();
      });
    } catch(e) {
      if (!responded) { responded = true; clearTimeout(panelTimeout); removeThinking(); }
    }
  }

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  input.addEventListener('input', function() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
    var canSend = input.value.trim().length > 0;
    btnSend.disabled = !canSend;
  });

  btnSend.addEventListener('click', sendMessage);

  document.querySelectorAll('.toggle-chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      var toggle = this.getAttribute('data-toggle');
      var pressed = this.getAttribute('aria-pressed') === 'true';
      this.setAttribute('aria-pressed', String(!pressed));
      if (toggle === 'think') thinkToggle = !pressed;
      if (toggle === 'search') searchToggle = !pressed;
    });
  });

  function initVoice() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = function(e) {
      var transcript = '';
      for (var i = e.resultIndex; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      input.value = transcript;
      if (e.results[e.results.length - 1].isFinal) { stopListening(); sendMessage(); }
    };
    recognition.onend = function() { if (listening) stopListening(); };
    recognition.onerror = function() { stopListening(); };
  }

  btnMic.addEventListener('click', function() {
    if (listening) stopListening(); else startListening();
  });

  function startListening() {
    if (!recognition) return;
    listening = true;
    btnMic.classList.add('listening');
    try { recognition.start(); } catch(e) {}
  }

  function stopListening() {
    listening = false;
    btnMic.classList.remove('listening');
    try { recognition.stop(); } catch(e) {}
  }

  // ── RESPONSE FALLBACK (storage polling) ──
  var responseFallbackTimer = null;

  function startResponseFallback(requestId) {
    stopResponseFallback();
    var attempts = 0;
    responseFallbackTimer = setInterval(function() {
      attempts++;
      if (attempts > 30) { stopResponseFallback(); return; }
      try {
        chrome.storage.local.get('x1_last_response', function(data) {
          if (data && data.x1_last_response && data.x1_last_response.requestId === requestId) {
            if (!responded) {
              clearPanelTimeout();
              responded = true;
              removeThinking();
              var resp = data.x1_last_response;
              if (resp.text) {
                var aiMsg = addMessage('ai', resp.text, true);
                streamAiText(aiMsg, resp.text);
              } else {
                addMessage('ai', 'Comando ejecutado.');
              }
              chrome.storage.local.remove('x1_last_response');
              stopResponseFallback();
            }
          }
        });
      } catch(e) {}
    }, 1000);
  }

  function stopResponseFallback() {
    if (responseFallbackTimer) { clearInterval(responseFallbackTimer); responseFallbackTimer = null; }
  }

  // ── LISTEN FOR RESPONSES ──
  try {
    chrome.runtime.onMessage.addListener(function(request) {
      if (request && request.type === 'X1_VOICE_RESPONSE' && !responded) {
        clearPanelTimeout();
        removeThinking();
        if (request.text) {
          var aiMsg = addMessage('ai', request.text, true);
          streamAiText(aiMsg, request.text);
        } else {
          addMessage('ai', request.error || 'Comando ejecutado.');
        }
      }
    });
  } catch(e) {}

})();
