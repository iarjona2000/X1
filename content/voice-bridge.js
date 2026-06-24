(()=>{

  console.log("[X1] voice-bridge loaded");
  window.addEventListener("message", (event) => {
    if (event.data?.source !== "x1-voice") return;
    if (event.data.type !== "command") return;
    const cmd = event.data.command;

    if (cmd === "x1-greet") {
      chrome.runtime.sendMessage({type: "X1_GREET"}).then((resp) => {
        if (resp?.text) {
          window.postMessage({source: "x1-voice-response", text: resp.text, showText: false, error: null}, "*");
        }
      }).catch(() => {});
      return;
    }

    console.log("[X1] bridge → SW:", cmd);
    chrome.runtime.sendMessage({
      type: "VOICE_COMMAND_EXEC",
      command: cmd,
      raw: event.data.raw,
      wantsText: event.data.wantsText || false
    }).then((resp) => {
      console.log("[X1] bridge ← SW:", resp);
      window.postMessage({
        source: "x1-voice-response",
        text: resp?.text || resp?.error || "Sin respuesta",
        showText: event.data.wantsText || resp?.showText || false,
        error: resp?.error || null
      }, "*");
    }).catch((err) => {
      console.error("[X1] bridge error:", err);
      window.postMessage({
        source: "x1-voice-response",
        text: "Recarga la página (F5) para reconectar",
        showText: true,
        error: "disconnected"
      }, "*");
    });
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "X1_TOGGLE") window.postMessage({
      source: "x1-voice-control",
      action: "toggle"
    }, "*");

    if (msg?.type === "X1_VOICE_RESULT") window.postMessage({
      source: "x1-voice-response",
      text: msg.text || "Hecho",
      showText: msg.showText || false,
      error: null
    }, "*");

    if (msg?.type === "X1_AGENT_STATUS") {
      window.postMessage({
        source: "x1-voice-status",
        text: msg.text || "",
        isLast: msg.isLast || false
      }, "*");
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

    if (msg?.type === "X1_VOICE_RESPONSE") window.postMessage({
      source: "x1-voice-response",
      text: msg.text || "Hecho",
      showText: msg.showText || false,
      error: msg.error || null
    }, "*");
  });

})()