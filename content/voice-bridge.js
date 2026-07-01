(()=>{

  var retryCount = 0;
  var MAX_RETRIES = 2;
  var RETRY_DELAY = 1000;

  console.log("[X1] voice-bridge loaded");
  window.addEventListener("message", function(event) {
    if (event.data?.source !== "x1-voice") return;
    if (event.data.type === "open-panel") {
      chrome.runtime.sendMessage({type: "X1_OPEN_PANEL"}).catch(function(){});
      return;
    }
    if (event.data.type !== "command") return;
    var cmd = event.data.command;
    if (cmd === "x1-greet") {
      chrome.runtime.sendMessage({type: "X1_GREET"}).then(function(resp) {
        if (resp?.text) {
          window.postMessage({source: "x1-voice-response", text: resp.text, showText: false, error: null, suggestions: resp.suggestions || []}, "*");
        }
      }).catch(function(e) { console.error("[X1] bridge greet error:", e); });
      return;
    }

    console.log("[X1] bridge → SW:", cmd);
    sendWithRetry(cmd, event.data.raw, event.data.wantsText || false);
  });

  function sendWithRetry(cmd, raw, wantsText, attempt) {
    attempt = attempt || 0;
    console.log("[X1] bridge sending to SW, attempt:", attempt);
    chrome.runtime.sendMessage({
      type: "VOICE_COMMAND_EXEC",
      command: cmd,
      raw: raw,
      wantsText: wantsText
    }).then(function(resp) {
      retryCount = 0;
      console.log("[X1] bridge ← SW response:", resp);
      window.postMessage({
        source: "x1-voice-response",
        text: resp?.text || resp?.error || "Sin respuesta",
        showText: wantsText || resp?.showText || false,
        error: resp?.error || null
      }, "*");
    }).catch(function(err) {
      console.error("[X1] bridge sendMessage error:", err);
      if (attempt < MAX_RETRIES) {
        retryCount++;
        console.log("[X1] Retrying... attempt", retryCount);
        setTimeout(function() {
          sendWithRetry(cmd, raw, wantsText, attempt + 1);
        }, RETRY_DELAY);
      } else {
        window.postMessage({
          source: "x1-voice-response",
          text: "Error de conexión. Recarga la página (F5).",
          showText: true,
          error: "disconnected"
        }, "*");
      }
    });
  }

  chrome.runtime.onMessage.addListener(function(msg) {
    if (msg?.type === "X1_TOGGLE") {
      window.postMessage({source: "x1-voice-control", action: "toggle"}, "*");
    }
    if (msg?.type === "X1_VOICE_RESULT") {
      window.postMessage({source: "x1-voice-response", text: msg.text || "Hecho", showText: msg.showText || false, error: msg.error || null, suggestions: msg.suggestions || []}, "*");
    }
    if (msg?.type === "X1_AGENT_STATUS") {
      window.postMessage({source: "x1-voice-status", text: msg.text || "", isLast: msg.isLast || false}, "*");
    }
    if (msg?.type === "X1_STEP_PROGRESS") {
      window.postMessage({
        source: "x1-step-progress",
        action: msg.action || "add",
        app: msg.app || "",
        description: msg.description || "",
        status: msg.status || "active",
        index: msg.index != null ? msg.index : -1
      }, "*");
    }
    if (msg?.type === "X1_API_RESULT") {
      window.postMessage({
        source: "x1-api-response",
        action: msg.action || "",
        ok: msg.ok !== false,
        data: msg.data || null,
        error: msg.error || null
      }, "*");
    }
    if (msg?.type === "X1_AGENT_PROGRESS") {
      window.postMessage({
        source: "x1-agent-progress",
        agentName: msg.agentName || "",
        stepName: msg.stepName || "",
        status: msg.status || "active",
        icon: msg.icon || ""
      }, "*");
    }
    if (msg?.type === "X1_BUDGET_ALERT") {
      window.postMessage({
        source: "x1-budget-alert",
        text: msg.text || ""
      }, "*");
    }
  });

})()