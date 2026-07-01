(function() {
  if (window.__x1MeetingTranscriptLoaded) return;
  window.__x1MeetingTranscriptLoaded = true;

  var BTN_ID = 'x1-meeting-transcribe-btn';
  var recognition = null;
  var listening = false;
  var segments = [];
  var startedAt = null;

  function buildButton() {
    var btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.textContent = '🎙️ Transcribir con X1';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;' +
      'background:rgba(24,24,27,0.92);backdrop-filter:blur(12px);color:#fff;' +
      'border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:8px 16px;' +
      'font-family:Inter,system-ui,sans-serif;font-size:12px;cursor:pointer;' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.3);';
    btn.addEventListener('click', function() {
      if (listening) stopTranscription(); else startTranscription();
    });
    document.body.appendChild(btn);
    return btn;
  }

  function updateButton(btn) {
    btn.textContent = listening ? '⏹️ Detener transcripcion' : '🎙️ Transcribir con X1';
    btn.style.background = listening ? 'rgba(220,38,38,0.85)' : 'rgba(24,24,27,0.92)';
  }

  function startTranscription() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Reconocimiento de voz no disponible en este navegador.'); return; }
    segments = [];
    startedAt = Date.now();
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = document.documentElement.lang || 'es-ES';

    recognition.onresult = function(event) {
      for (var i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          segments.push({ text: event.results[i][0].transcript.trim(), time: Date.now() - startedAt });
        }
      }
    };
    recognition.onerror = function(e) { console.error('[X1 Meeting] recognition error:', e.error); };
    recognition.onend = function() {
      if (listening) { try { recognition.start(); } catch(e) {} } // auto-restart, Web Speech stops after silence
    };

    try {
      recognition.start();
      listening = true;
      var btn = document.getElementById(BTN_ID);
      if (btn) updateButton(btn);
    } catch(e) {
      console.error('[X1 Meeting] could not start recognition:', e.message);
    }
  }

  function stopTranscription() {
    listening = false;
    if (recognition) { try { recognition.stop(); } catch(e) {} }
    var btn = document.getElementById(BTN_ID);
    if (btn) updateButton(btn);

    if (segments.length === 0) return;
    var transcript = segments.map(function(s) { return s.text; }).join('\n');
    chrome.runtime.sendMessage({
      type: 'X1_MEETING_END',
      transcript: transcript,
      url: location.href,
      title: document.title,
      durationMs: Date.now() - (startedAt || Date.now())
    }).catch(function() {});
  }

  window.addEventListener('beforeunload', function() {
    if (listening) stopTranscription();
  });

  var ready = setInterval(function() {
    if (document.body) {
      clearInterval(ready);
      buildButton();
    }
  }, 500);
  setTimeout(function() { clearInterval(ready); }, 15000);
})();
