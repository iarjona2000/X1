(function() {
  'use strict';

  var input = document.getElementById('input');
  var btnSend = document.getElementById('btn-send');
  var btnMic = document.getElementById('btn-mic');
  var btnNew = document.getElementById('btn-new');
  var btnSettings = document.getElementById('btn-settings');
  var messagesEl = document.getElementById('messages');
  var statusDot = document.getElementById('status-dot');
  var statusText = document.getElementById('status-text');
  var tabs = document.querySelectorAll('.tab');
  var tabViews = document.querySelectorAll('.tab-view');

  var listening = false;
  var recognition = null;
  var currentThinking = null;
  var messages = [];

  // ——— Init ———

  showWelcome();
  initVoice();
  loadTabs();
  checkConnection();

  // ——— Tab switching ———

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var target = this.getAttribute('data-tab');
      tabs.forEach(function(t) { t.classList.remove('active'); });
      tabViews.forEach(function(v) { v.classList.remove('active'); });
      this.classList.add('active');
      document.getElementById('tab-' + target).classList.add('active');
      if (target === 'calendar') loadCalendar();
      if (target === 'email') loadEmail();
      if (target === 'tasks') loadTasks();
    });
  });

  // ——— Welcome ———

  function checkConnection() {
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
      statusDot.style.background = '#ef4444';
      statusText.textContent = 'Offline';
      return;
    }
    try {
      chrome.runtime.sendMessage({ type: 'PING' }, function(response) {
        if (chrome.runtime.lastError || !response) {
          statusDot.style.background = '#ef4444';
          statusText.textContent = 'Offline';
        } else {
          statusDot.style.background = '#22c55e';
          statusText.textContent = 'Ready';
        }
      });
    } catch(e) {
      statusDot.style.background = '#ef4444';
      statusText.textContent = 'Offline';
    }
  }

  function showWelcome() {
    messagesEl.innerHTML = '';
    var welcome = document.createElement('div');
    welcome.className = 'welcome';
    welcome.innerHTML =
      '<img src="../assets/x1-logo.png" alt="X1" class="welcome-logo">' +
      '<h1>How can I help?</h1>' +
      '<p>Navigate, search, manage your email and calendar, or simply ask.</p>' +
      '<div class="suggestions">' +
        '<button class="suggestion" data-cmd="What meetings do I have today?">Meetings today</button>' +
        '<button class="suggestion" data-cmd="Summarize my unread emails">Unread emails</button>' +
        '<button class="suggestion" data-cmd="Search for the latest news">Latest news</button>' +
        '<button class="suggestion" data-cmd="What can you do?">Your capabilities</button>' +
      '</div>';
    messagesEl.appendChild(welcome);

    welcome.querySelectorAll('.suggestion').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var cmd = this.getAttribute('data-cmd');
        input.value = cmd;
        sendMessage();
      });
    });
  }

  // ——— Messages ———

  function addMessage(role, text) {
    var welcomeEl = messagesEl.querySelector('.welcome');
    if (welcomeEl) welcomeEl.remove();

    var msg = document.createElement('div');
    msg.className = 'msg msg-' + role;

    var body = document.createElement('div');
    body.className = 'msg-body';

    if (role === 'ai') {
      body.innerHTML = formatText(text);
    } else {
      body.textContent = text;
    }

    msg.appendChild(body);
    messagesEl.appendChild(msg);
    scrollToBottom();

    messages.push({ role: role, text: text });

    return msg;
  }

  function showThinking() {
    var welcomeEl = messagesEl.querySelector('.welcome');
    if (welcomeEl) welcomeEl.remove();

    var msg = document.createElement('div');
    msg.className = 'msg msg-ai';
    msg.innerHTML =
      '<div class="msg-thinking">' +
        '<div class="thinking-dots"><span></span><span></span><span></span></div>' +
        'Thinking' +
      '</div>';
    messagesEl.appendChild(msg);
    scrollToBottom();
    currentThinking = msg;

    statusDot.classList.add('thinking');
    statusText.textContent = 'Thinking';

    return msg;
  }

  function removeThinking() {
    if (currentThinking) {
      currentThinking.remove();
      currentThinking = null;
    }
    statusDot.classList.remove('thinking');
    statusText.textContent = 'Ready';
  }

  function addStep(data) {
    var step = document.createElement('div');
    step.className = 'msg msg-ai';

    var inner = document.createElement('div');
    inner.className = 'msg-step';

    if (data.icon) {
      var img = document.createElement('img');
      img.src = data.icon;
      img.alt = '';
      inner.appendChild(img);
    }

    var text = document.createElement('span');
    text.textContent = data.description || data.app || 'Processing';
    inner.appendChild(text);

    var dot = document.createElement('span');
    dot.className = 'step-status ' + (data.status || 'active');
    inner.appendChild(dot);

    step.appendChild(inner);
    step.setAttribute('data-step-id', data.id || '');
    messagesEl.appendChild(step);
    scrollToBottom();

    return step;
  }

  function updateStep(id, status) {
    var el = messagesEl.querySelector('[data-step-id="' + id + '"] .step-status');
    if (el) {
      el.className = 'step-status ' + status;
    }
  }

  function formatText(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  function scrollToBottom() {
    var chatView = document.getElementById('tab-chat');
    chatView.scrollTop = chatView.scrollHeight;
  }

  // ——— Send message ———

  function sendMessage() {
    var text = input.value.trim();
    if (!text) return;

    input.value = '';
    autoResize();
    addMessage('user', text);
    showThinking();

    var responded = false;
    var panelTimeout = setTimeout(function() {
      if (!responded) {
        responded = true;
        removeThinking();
        addMessage('ai', 'Sin respuesta del servidor. Verifica que tienes una API key configurada en Settings.');
      }
    }, 28000);

    function doSend() {
      chrome.runtime.sendMessage(
        { type: 'VOICE_COMMAND_EXEC', command: text, raw: text, wantsText: true },
        function(response) {
          if (responded) return;
          responded = true;
          clearTimeout(panelTimeout);
          removeThinking();
          if (chrome.runtime.lastError) {
            var errMsg = chrome.runtime.lastError.message || '';
            if (errMsg.indexOf('Receiving end does not exist') !== -1) {
              addMessage('ai', 'Service worker no disponible. Recarga la extension desde chrome://extensions.');
            } else {
              addMessage('ai', 'Error de conexion: ' + errMsg);
            }
            return;
          }
          if (response && response.text) {
            addMessage('ai', response.text);
            speak(response.text);
          } else if (response && response.error) {
            addMessage('ai', response.error);
          } else {
            addMessage('ai', 'Sin respuesta. Revisa tus API keys en Settings.');
          }
        }
      );
    }

    try {
      if (!chrome.runtime || !chrome.runtime.sendMessage) {
        responded = true;
        clearTimeout(panelTimeout);
        removeThinking();
        addMessage('ai', 'Extension desconectada. Recarga la extension.');
        return;
      }
      chrome.runtime.sendMessage({ type: 'PING' }, function(pong) {
        if (chrome.runtime.lastError) {
          if (!responded) {
            responded = true;
            clearTimeout(panelTimeout);
            removeThinking();
            addMessage('ai', 'Service worker no disponible. Recarga la extension desde chrome://extensions.');
          }
          return;
        }
        doSend();
      });
    } catch(e) {
      if (!responded) {
        responded = true;
        clearTimeout(panelTimeout);
        removeThinking();
        addMessage('ai', 'Error: ' + e.message);
      }
    }
  }

  // ——— Input handling ———

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener('input', autoResize);

  function autoResize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }

  btnSend.addEventListener('click', sendMessage);

  // ——— Voice ———

  function initVoice() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = function(e) {
      var transcript = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      input.value = transcript;
      if (e.results[e.results.length - 1].isFinal) {
        stopListening();
        sendMessage();
      }
    };

    recognition.onend = function() {
      if (listening) stopListening();
    };

    recognition.onerror = function() {
      stopListening();
    };
  }

  btnMic.addEventListener('click', function() {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  });

  function startListening() {
    if (!recognition) return;
    listening = true;
    btnMic.classList.add('listening');
    statusText.textContent = 'Listening';
    try { recognition.start(); } catch(e) {}
  }

  function stopListening() {
    listening = false;
    btnMic.classList.remove('listening');
    statusText.textContent = 'Ready';
    try { recognition.stop(); } catch(e) {}
  }

  // ——— TTS ———

  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    var clean = text.replace(/<[^>]+>/g, '').replace(/\(risas\)/gi, '');
    if (!clean.trim()) return;

    var utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'es-ES';
    utter.rate = 1.05;
    utter.pitch = 1.05;

    var voices = window.speechSynthesis.getVoices();
    for (var i = 0; i < voices.length; i++) {
      if (voices[i].lang && voices[i].lang.indexOf('es') === 0) {
        utter.voice = voices[i];
        break;
      }
    }

    window.speechSynthesis.speak(utter);
  }

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = function() {};
  }

  // ——— New conversation ———

  btnNew.addEventListener('click', function() {
    messages = [];
    showWelcome();
  });

  // ——— Settings ———

  btnSettings.addEventListener('click', function() {
    showSettings();
  });

  function showSettings() {
    var overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    overlay.innerHTML =
      '<div class="settings-header">' +
        '<h2>Settings</h2>' +
        '<button class="icon-btn" id="btn-close-settings">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="settings-content">' +
        '<div class="settings-section">' +
          '<h3>AI Provider</h3>' +
          '<div class="setting-row">' +
            '<span class="setting-label">Provider</span>' +
            '<select class="setting-select" id="setting-provider">' +
              '<option value="auto">Auto (recommended)</option>' +
              '<option value="groq">Groq</option>' +
              '<option value="nvidia">NVIDIA</option>' +
              '<option value="gemini">Gemini</option>' +
              '<option value="openrouter">OpenRouter</option>' +
              '<option value="cerebras">Cerebras</option>' +
              '<option value="mistral">Mistral</option>' +
              '<option value="deepseek">DeepSeek</option>' +
              '<option value="ollama">Ollama (local)</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div class="settings-section">' +
          '<h3>API Keys</h3>' +
          '<div class="setting-row">' +
            '<span class="setting-label">Groq</span>' +
            '<input class="setting-input" type="password" data-key="groqKey" placeholder="gsk_...">' +
          '</div>' +
          '<div class="setting-row">' +
            '<span class="setting-label">Gemini</span>' +
            '<input class="setting-input" type="password" data-key="geminiKey" placeholder="AIza...">' +
          '</div>' +
          '<div class="setting-row">' +
            '<span class="setting-label">OpenRouter</span>' +
            '<input class="setting-input" type="password" data-key="openrouterKey" placeholder="sk-or-...">' +
          '</div>' +
          '<div class="setting-row">' +
            '<span class="setting-label">NVIDIA</span>' +
            '<input class="setting-input" type="password" data-key="nvidiaKey" placeholder="nvapi-...">' +
          '</div>' +
        '</div>' +
        '<div class="settings-section">' +
          '<h3>Voice</h3>' +
          '<div class="setting-row">' +
            '<span class="setting-label">Language</span>' +
            '<select class="setting-select" id="setting-lang">' +
              '<option value="es-ES">Spanish</option>' +
              '<option value="en-US">English</option>' +
              '<option value="fr-FR">French</option>' +
              '<option value="de-DE">German</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.getElementById('app').appendChild(overlay);

    chrome.storage.local.get(['aiProvider', 'groqKey', 'geminiKey', 'openrouterKey', 'nvidiaKey'], function(r) {
      if (r.aiProvider) {
        var sel = overlay.querySelector('#setting-provider');
        if (sel) sel.value = r.aiProvider;
      }
      overlay.querySelectorAll('.setting-input[data-key]').forEach(function(inp) {
        var k = inp.getAttribute('data-key');
        if (r[k]) inp.value = r[k];
      });
    });

    overlay.querySelector('#btn-close-settings').addEventListener('click', function() {
      var provider = overlay.querySelector('#setting-provider').value;
      var data = { aiProvider: provider };
      overlay.querySelectorAll('.setting-input[data-key]').forEach(function(inp) {
        var k = inp.getAttribute('data-key');
        var v = inp.value.trim();
        if (v) data[k] = v;
      });
      chrome.storage.local.set(data);
      overlay.remove();
    });
  }

  // ——— Load tab data ———

  function loadTabs() {
    loadTasks();
  }

  function loadTasks() {
    chrome.storage.local.get(['cbos_tasks'], function(r) {
      var list = document.getElementById('tasks-list');
      var tasks = (r && r.cbos_tasks) || [];
      if (!tasks.length) {
        list.innerHTML = '<div class="empty-state">No tasks yet</div>';
        return;
      }
      list.innerHTML = '';
      tasks.forEach(function(task, i) {
        var item = document.createElement('div');
        item.className = 'task-item';
        item.innerHTML =
          '<div class="task-check ' + (task.done ? 'done' : '') + '" data-i="' + i + '"></div>' +
          '<span class="task-text ' + (task.done ? 'done' : '') + '">' + escapeHtml(task.text) + '</span>';
        list.appendChild(item);
      });

      list.querySelectorAll('.task-check').forEach(function(check) {
        check.addEventListener('click', function() {
          var idx = parseInt(this.getAttribute('data-i'));
          tasks[idx].done = !tasks[idx].done;
          chrome.storage.local.set({ cbos_tasks: tasks });
          loadTasks();
        });
      });
    });

    var addBtn = document.getElementById('btn-add-task');
    if (addBtn && !addBtn._bound) {
      addBtn._bound = true;
      addBtn.addEventListener('click', function() {
        var text = prompt('Task description:');
        if (!text || !text.trim()) return;
        chrome.storage.local.get(['cbos_tasks'], function(r) {
          var tasks = (r && r.cbos_tasks) || [];
          tasks.push({ text: text.trim(), done: false, date: new Date().toISOString() });
          chrome.storage.local.set({ cbos_tasks: tasks });
          loadTasks();
        });
      });
    }
  }

  function loadCalendar() {
    var list = document.getElementById('calendar-list');
    list.innerHTML = '<div class="empty-state">Loading calendar...</div>';

    chrome.runtime.sendMessage(
      { type: 'VOICE_COMMAND_EXEC', command: 'list today calendar', raw: 'calendar today', wantsText: true },
      function(response) {
        if (chrome.runtime.lastError || !response) {
          list.innerHTML = '<div class="empty-state">Could not load calendar</div>';
          return;
        }
        if (response.calendarData && response.calendarData.length) {
          list.innerHTML = '';
          response.calendarData.forEach(function(ev) {
            var item = document.createElement('div');
            item.className = 'cal-item';
            var time = '';
            if (ev.start && ev.start.dateTime) {
              var d = new Date(ev.start.dateTime);
              time = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
            }
            item.innerHTML =
              '<span class="cal-time">' + time + '</span>' +
              '<div>' +
                '<div class="cal-title">' + escapeHtml(ev.summary || 'No title') + '</div>' +
                (ev.location ? '<div class="cal-location">' + escapeHtml(ev.location) + '</div>' : '') +
              '</div>';
            list.appendChild(item);
          });
        } else if (response.text) {
          list.innerHTML = '';
          var p = document.createElement('div');
          p.style.padding = '12px 0';
          p.style.fontFamily = 'var(--serif)';
          p.style.fontSize = '15px';
          p.style.lineHeight = '1.6';
          p.innerHTML = formatText(response.text);
          list.appendChild(p);
        } else {
          list.innerHTML = '<div class="empty-state">No events today</div>';
        }
      }
    );
  }

  function loadEmail() {
    var list = document.getElementById('email-list');
    var count = document.getElementById('email-count');
    list.innerHTML = '<div class="empty-state">Loading emails...</div>';

    chrome.runtime.sendMessage(
      { type: 'VOICE_COMMAND_EXEC', command: 'read last 5 emails', raw: 'emails', wantsText: true },
      function(response) {
        if (chrome.runtime.lastError || !response) {
          list.innerHTML = '<div class="empty-state">Could not load emails</div>';
          return;
        }
        if (response.text) {
          list.innerHTML = '';
          var p = document.createElement('div');
          p.style.padding = '12px 0';
          p.style.fontFamily = 'var(--serif)';
          p.style.fontSize = '15px';
          p.style.lineHeight = '1.6';
          p.innerHTML = formatText(response.text);
          list.appendChild(p);
          count.textContent = '';
        } else {
          list.innerHTML = '<div class="empty-state">No unread emails</div>';
          count.textContent = '0';
        }
      }
    );
  }

  // ——— Messages from service worker ———

  chrome.runtime.onMessage.addListener(function(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === 'X1_STEP_PROGRESS') {
      var stepId = (msg.app || '') + '-' + Date.now();
      addStep({
        id: stepId,
        app: msg.app,
        description: msg.description,
        icon: msg.icon,
        status: msg.status || 'active'
      });
    }

    if (msg.type === 'X1_VOICE_RESULT') {
      removeThinking();
      if (msg.text) {
        addMessage('ai', msg.text);
      }
    }
  });

  // ——— Keyboard shortcut ———

  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.code === 'Space') {
      e.preventDefault();
      if (listening) {
        stopListening();
      } else {
        startListening();
      }
    }
  });

  // ——— Utilities ———

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
