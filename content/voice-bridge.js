(function() {

  var log = function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[X1-Bridge]');
    console.log.apply(console, args);
  };
  var error = function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[X1-Bridge]');
    console.error.apply(console, args);
  };

  // ─── Pending API requests ───
  var pendingRequests = {};
  var REQUEST_TIMEOUT = 35000;

  // ─── MAIN → SW (postMessage relay) ───

  window.addEventListener('message', function(event) {
    var data = event.data;
    if (!data || typeof data !== 'object') return;

    // ── Voice commands (source: "x1-voice") ──
    if (data.source === 'x1-voice') {
      if (data.type === 'open-panel') {
        chrome.runtime.sendMessage({type: 'X1_OPEN_PANEL'}).catch(function(){});
        return;
      }
      if (data.type !== 'command') return;

      if (data.command === 'x1-greet') {
        chrome.runtime.sendMessage({type: 'X1_GREET'}).then(function(resp) {
          if (resp && resp.text) {
            window.postMessage({
              source: 'x1-voice-response',
              text: resp.text,
              showText: false,
              error: null,
              suggestions: resp.suggestions || []
            }, '*');
          }
        }).catch(function(e) { error('greet error:', e); });
        return;
      }

      log('→ SW voice:', data.command);
      sendVoice(data.command, data.raw, data.wantsText || false);
      return;
    }

    // ── X1 API calls (source: "x1-api-request") ──
    if (data.source === 'x1-api-request') {
      var action = data.action;
      var payload = data.payload || {};
      var requestId = data.requestId || ('x1_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));

      var timer = setTimeout(function() {
        delete pendingRequests[requestId];
        window.postMessage({
          source: 'x1-api-response',
          action: action,
          requestId: requestId,
          ok: false,
          data: null,
          error: 'Request timed out after 35s'
        }, '*');
      }, REQUEST_TIMEOUT);

      pendingRequests[requestId] = { action: action, timer: timer };

      log('→ SW API:', action, requestId);

      chrome.runtime.sendMessage({
        type: 'X1_API',
        action: action,
        payload: payload,
        requestId: requestId,
        _bridgeRequest: true
      }).then(function(resp) {
        cleanup(requestId);
        var r = resp || {};
        window.postMessage({
          source: 'x1-api-response',
          action: action,
          requestId: requestId,
          ok: r.ok !== false,
          data: r.data || null,
          error: r.error || null
        }, '*');
      }).catch(function(err) {
        cleanup(requestId);
        error('API error:', action, err);
        window.postMessage({
          source: 'x1-api-response',
          action: action,
          requestId: requestId,
          ok: false,
          data: null,
          error: err.message || 'Bridge error'
        }, '*');
      });
      return;
    }
  });

  function cleanup(id) {
    var p = pendingRequests[id];
    if (p) {
      clearTimeout(p.timer);
      delete pendingRequests[id];
    }
  }

  // ─── Voice send with retry ───

  var retryCount = 0;
  var MAX_RETRIES = 2;
  var RETRY_DELAY = 1000;

  function sendVoice(cmd, raw, wantsText, attempt) {
    attempt = attempt || 0;
    chrome.runtime.sendMessage({
      type: 'VOICE_COMMAND_EXEC',
      command: cmd,
      raw: raw,
      wantsText: wantsText
    }).then(function(resp) {
      retryCount = 0;
      var r = resp || {};
      window.postMessage({
        source: 'x1-voice-response',
        text: r.text || r.error || 'Sin respuesta',
        showText: wantsText || r.showText || false,
        error: r.error || null
      }, '*');
    }).catch(function(err) {
      error('voice error:', err);
      if (attempt < MAX_RETRIES) {
        retryCount++;
        setTimeout(function() {
          sendVoice(cmd, raw, wantsText, attempt + 1);
        }, RETRY_DELAY);
      } else {
        window.postMessage({
          source: 'x1-voice-response',
          text: 'Error de conexión. Recarga la página (F5).',
          showText: true,
          error: 'disconnected'
        }, '*');
      }
    });
  }

  // ─── SW → MAIN (chrome.runtime → postMessage) ───

  chrome.runtime.onMessage.addListener(function(msg) {
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      case 'X1_TOGGLE':
        window.postMessage({source: 'x1-voice-control', action: 'toggle'}, '*');
        break;

      case 'X1_VOICE_RESULT':
        window.postMessage({
          source: 'x1-voice-response',
          text: msg.text || 'Hecho',
          showText: msg.showText || false,
          error: msg.error || null,
          suggestions: msg.suggestions || []
        }, '*');
        break;

      case 'X1_STEP_PROGRESS':
        window.postMessage({
          source: 'x1-step-progress',
          action: msg.action || 'add',
          app: msg.app || '',
          description: msg.description || '',
          status: msg.status || 'active',
          index: msg.index != null ? msg.index : -1,
          stepId: msg.stepId || ''
        }, '*');
        break;

      case 'X1_API_RESULT':
        window.postMessage({
          source: 'x1-api-response',
          action: msg.action || '',
          requestId: msg.requestId || '',
          ok: msg.ok !== false,
          data: msg.data || null,
          error: msg.error || null
        }, '*');
        break;

      case 'X1_AGENT_PROGRESS':
        window.postMessage({
          source: 'x1-agent-progress',
          agentName: msg.agentName || '',
          stepName: msg.stepName || '',
          status: msg.status || 'active',
          icon: msg.icon || ''
        }, '*');
        break;

      case 'X1_AGENT_STATUS':
        window.postMessage({
          source: 'x1-voice-status',
          text: msg.text || '',
          isLast: msg.isLast || false
        }, '*');
        break;

      case 'X1_BUDGET_ALERT':
        window.postMessage({
          source: 'x1-budget-alert',
          text: msg.text || ''
        }, '*');
        break;
    }
  });

  log('Bridge loaded — relaying voice + API messages');

})();
