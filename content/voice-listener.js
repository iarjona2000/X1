(()=>{

  var bar = null;
  var statusEl = null;
  var dotsWrap = null;
  var stepsWrap = null;
  var recognition = null;
  var active = false;
  var holdMode = false;
  var clickMode = false;
  var continuousMode = false;
  var finalTranscript = "";
  var isHidden = true;
  var speakingUtterance = null;
  var silenceTimer = null;
  var userText = "";
  var processing = false;
  var pendingWantsText = false;
  var currentSteps = [];
  var awaitingGreet = false;

  var APP_ICONS = {
    'google calendar': 'https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_22_2x.png',
    'calendar': 'https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_22_2x.png',
    'gmail': 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico',
    'google docs': 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico',
    'docs': 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico',
    'google sheets': 'https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico',
    'sheets': 'https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico',
    'google slides': 'https://ssl.gstatic.com/docs/presentations/images/favicon5.ico',
    'slides': 'https://ssl.gstatic.com/docs/presentations/images/favicon5.ico',
    'linkedin': 'https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca',
    'replit': 'https://replit.com/public/images/sm-favicon.svg',
    'canva': 'https://static.canva.com/static/images/favicon-1.ico',
    'notion': 'https://www.notion.so/images/favicon.ico',
    'github': 'https://github.githubassets.com/favicons/favicon-dark.svg',
    'hubspot': 'https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png',
    'google maps': 'https://maps.gstatic.com/mapfiles/maps_lite/images/2x/maps_app_icon.png',
    'maps': 'https://maps.gstatic.com/mapfiles/maps_lite/images/2x/maps_app_icon.png',
    'youtube': 'https://www.youtube.com/s/desktop/12d6b690/img/favicon_32x32.png',
    'search': 'https://www.google.com/favicon.ico',
    'google': 'https://www.google.com/favicon.ico',
    'drive': 'https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png',
    'code': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="%23333"/><text x="16" y="21" text-anchor="middle" fill="%2334D399" font-size="16" font-family="monospace">&lt;/&gt;</text></svg>',
    'ai': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="%237C6AFF"/><text x="16" y="21" text-anchor="middle" fill="white" font-size="14" font-weight="bold">AI</text></svg>',
    'x1': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="%237C6AFF"/><text x="16" y="21" text-anchor="middle" fill="white" font-size="10" font-weight="bold">X1</text></svg>'
  };

  function getAppIcon(name) {
    if(!name) return APP_ICONS['x1'];
    var k = name.toLowerCase().trim();
    if(APP_ICONS[k]) return APP_ICONS[k];
    for(var key in APP_ICONS) { if(k.indexOf(key)!==-1 || key.indexOf(k)!==-1) return APP_ICONS[key]; }
    return APP_ICONS['x1'];
  }

  function createBar() {
    if (bar) return;

    if(!document.getElementById("x1-css")) {
      var s = document.createElement("style");
      s.id = "x1-css";
      s.textContent = "@keyframes x1s{to{transform:rotate(360deg)}}";
      document.head.appendChild(s);
    }

    // Steps overlay (appears above the pill)
    stepsWrap = document.createElement("div");
    stepsWrap.setAttribute("style",
      "position:fixed;bottom:60px;left:50%;transform:translateX(-50%);z-index:2147483647;" +
      "display:flex;flex-direction:column;gap:0;width:280px;" +
      "background:rgba(10,10,10,0.95);border-radius:14px;overflow:hidden;" +
      "box-shadow:0 4px 24px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.06);" +
      "backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);" +
      "font-family:-apple-system,system-ui,'Segoe UI',sans-serif;" +
      "opacity:0;pointer-events:none;transition:opacity 0.25s,transform 0.25s;" +
      "transform:translateX(-50%) translateY(6px)"
    );
    document.body.appendChild(stepsWrap);

    // Main pill
    bar = document.createElement("div");
    bar.setAttribute("style",
      "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:2147483647;" +
      "display:flex;align-items:center;gap:8px;height:36px;padding:0 14px;" +
      "background:rgba(10,10,10,0.95);color:#fff;" +
      "font-family:-apple-system,system-ui,'Segoe UI',sans-serif;font-size:13px;" +
      "border-radius:40px;box-shadow:0 4px 24px rgba(0,0,0,0.35),0 0 0 1px rgba(255,255,255,0.06);" +
      "backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);" +
      "transition:opacity 0.3s,box-shadow 0.4s;opacity:0;pointer-events:none;user-select:none;" +
      "white-space:nowrap;max-width:360px"
    );

    // Dots
    dotsWrap = document.createElement("div");
    dotsWrap.setAttribute("style", "display:flex;align-items:center;gap:2px;height:16px;flex-shrink:0");
    for (var i = 0; i < 4; i++) {
      var d = document.createElement("div");
      d.setAttribute("style", "width:2.5px;height:4px;border-radius:1.5px;background:#7C6AFF;transition:height 0.08s ease");
      dotsWrap.appendChild(d);
    }
    bar.appendChild(dotsWrap);

    // Status
    statusEl = document.createElement("span");
    statusEl.setAttribute("style",
      "font-size:12px;color:rgba(255,255,255,0.45);overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0"
    );
    statusEl.textContent = "X1";
    bar.appendChild(statusEl);

    document.body.appendChild(bar);
  }

  // ── Steps ──

  function showSteps() {
    if(!stepsWrap) return;
    stepsWrap.style.opacity = "1";
    stepsWrap.style.pointerEvents = "auto";
    stepsWrap.style.transform = "translateX(-50%) translateY(0)";
  }

  function hideSteps() {
    if(!stepsWrap) return;
    stepsWrap.style.opacity = "0";
    stepsWrap.style.pointerEvents = "none";
    stepsWrap.style.transform = "translateX(-50%) translateY(6px)";
    setTimeout(function(){ if(stepsWrap) { stepsWrap.innerHTML = ""; currentSteps = []; } }, 300);
  }

  function addStep(app, description, status) {
    if(!stepsWrap) return;
    showSteps();

    var row = document.createElement("div");
    row.setAttribute("style",
      "display:flex;align-items:center;gap:10px;padding:8px 14px;" +
      (currentSteps.length > 0 ? "border-top:1px solid rgba(255,255,255,0.05);" : "")
    );

    var icon = document.createElement("img");
    icon.src = getAppIcon(app);
    icon.setAttribute("style", "width:20px;height:20px;border-radius:5px;object-fit:contain;flex-shrink:0");
    icon.onerror = function(){ this.src = APP_ICONS["x1"]; };
    row.appendChild(icon);

    var txt = document.createElement("div");
    txt.setAttribute("style", "flex:1;min-width:0");
    var appName = document.createElement("div");
    appName.setAttribute("style", "font-size:12px;font-weight:600;color:rgba(255,255,255,0.9);overflow:hidden;text-overflow:ellipsis;white-space:nowrap");
    appName.textContent = app || "X1";
    txt.appendChild(appName);
    if(description) {
      var desc = document.createElement("div");
      desc.setAttribute("style", "font-size:10px;color:rgba(255,255,255,0.35);overflow:hidden;text-overflow:ellipsis;white-space:nowrap");
      desc.textContent = description;
      txt.appendChild(desc);
    }
    row.appendChild(txt);

    var dot = document.createElement("div");
    dot.setAttribute("style", "width:14px;height:14px;flex-shrink:0");
    setDotStatus(dot, status || "active");
    row.appendChild(dot);

    stepsWrap.appendChild(row);
    currentSteps.push({el:row, dot:dot});
    return currentSteps.length - 1;
  }

  function setDotStatus(dot, status) {
    if(status === "done") {
      dot.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="7" fill="#34D399"/><path d="M4 7l2 2 4-4" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>';
    } else if(status === "error") {
      dot.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="7" fill="#f87171"/><path d="M5 5l4 4M9 5l-4 4" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>';
    } else {
      dot.innerHTML = '<div style="width:14px;height:14px;border:2px solid #7C6AFF;border-top-color:transparent;border-radius:50%;animation:x1s 0.8s linear infinite;box-sizing:border-box"></div>';
    }
  }

  function updateStep(index, status) {
    if(index >= 0 && index < currentSteps.length) setDotStatus(currentSteps[index].dot, status);
  }

  // ── Bar control ──

  function showBar() {
    if (!bar) createBar();
    isHidden = false;
    bar.style.opacity = "1";
    bar.style.pointerEvents = "auto";
  }

  function hideBarNow() {
    if (!bar) return;
    isHidden = true; continuousMode = false; processing = false;
    if (silenceTimer) clearTimeout(silenceTimer);
    stopListening(); stopSpeaking();
    bar.style.opacity = "0";
    bar.style.pointerEvents = "none";
    bar.style.boxShadow = "0 4px 24px rgba(0,0,0,0.35),0 0 0 1px rgba(255,255,255,0.06)";
    hideSteps();
  }

  function setStatus(text, color) {
    if (statusEl) { statusEl.textContent = text; statusEl.style.color = color || "rgba(255,255,255,0.45)"; }
  }

  function setDots(heights, color) {
    if (!dotsWrap) return;
    var c = color || "#7C6AFF";
    for (var i = 0; i < dotsWrap.children.length; i++) {
      dotsWrap.children[i].style.height = (heights[i] || 3) + "px";
      dotsWrap.children[i].style.background = c;
    }
  }

  function setGlow(mode) {
    if(!bar) return;
    if(mode === "listen") bar.style.boxShadow = "0 4px 24px rgba(0,0,0,0.35),0 0 0 1px rgba(124,106,255,0.25),0 0 12px rgba(124,106,255,0.1)";
    else if(mode === "speak") bar.style.boxShadow = "0 4px 24px rgba(0,0,0,0.35),0 0 0 1px rgba(52,211,153,0.25),0 0 12px rgba(52,211,153,0.1)";
    else bar.style.boxShadow = "0 4px 24px rgba(0,0,0,0.35),0 0 0 1px rgba(255,255,255,0.06)";
  }

  function animateWave() {
    if (!active && !holdMode) return;
    setDots([3 + Math.random()*12, 3 + Math.random()*12, 3 + Math.random()*12, 3 + Math.random()*12]);
    requestAnimationFrame(function() { setTimeout(animateWave, 90); });
  }

  // ── Voice ──

  function startListening() {
    if (active) return;
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setStatus("Sin voz", "#f87171"); return; }
    recognition = new SR();
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.onstart = function() {
      active = true;
      setStatus("Escuchando...", "rgba(255,255,255,0.6)");
      setGlow("listen");
      animateWave();
    };
    recognition.onresult = function(ev) {
      if (!holdMode && !clickMode && !continuousMode) return;
      var interim = "", final = "";
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) final += t; else interim += t;
      }
      if (final) finalTranscript += final;
      var display = (finalTranscript + interim).trim();
      if (display) {
        userText = display;
        setStatus(display.substring(0,60), "rgba(255,255,255,0.85)");
      }
      if ((clickMode || continuousMode) && (final || interim)) {
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(function() {
          if (!clickMode && !continuousMode) return;
          stopListening();
          var text = finalTranscript.trim();
          if (text) { processing = true; sendCommand(text); }
          else { setStatus("...", "rgba(255,255,255,0.3)"); }
        }, 2500);
      }
    };
    recognition.onerror = function(e) {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setStatus("Micro denegado", "#f87171");
        active = false;
      }
    };
    recognition.onend = function() {
      active = false;
      if (holdMode) try { recognition?.start(); } catch(e) {}
      else if (continuousMode && !processing) try { recognition?.start(); } catch(e) {}
    };
    try { recognition.start(); } catch(e) {}
  }

  function stopListening() {
    if (recognition) try { recognition.stop(); } catch(e) {}
    active = false;
  }

  function speakResponse(text, onEnd) {
    window.speechSynthesis.cancel();
    var clean = text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/[#_`>]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    if(clean.length > 300) clean = clean.substring(0, 300);
    var u = new SpeechSynthesisUtterance(clean);
    u.lang = "es-ES"; u.rate = 1.1; u.pitch = 1;
    var voices = window.speechSynthesis.getVoices();
    var v = voices.find(function(v) { return v.lang.startsWith("es") && v.name.includes("Google"); }) || voices.find(function(v) { return v.lang.startsWith("es"); });
    if (v) u.voice = v;
    u.onend = function() { speakingUtterance = null; onEnd?.(); };
    speakingUtterance = u;
    setGlow("speak");
    setDots([3,3,3,3], "#34D399");
    var sa = function() { if (!speakingUtterance) return; setDots([3+Math.random()*10, 3+Math.random()*10, 3+Math.random()*10, 3+Math.random()*10],"#34D399"); requestAnimationFrame(function(){setTimeout(sa,110);}); };
    sa();
    window.speechSynthesis.speak(u);
  }

  function stopSpeaking() { window.speechSynthesis.cancel(); speakingUtterance = null; }

  function done() {
    processing = false;
    setStatus("X1", "rgba(255,255,255,0.45)");
    setDots([3,3,3,3], "#7C6AFF");
    setGlow(null);
    setTimeout(hideSteps, 6000);
    setTimeout(function() {
      if (!continuousMode) return;
      finalTranscript = "";
      setStatus("Escuchando...", "rgba(255,255,255,0.6)");
      setGlow("listen");
      startListening();
    }, 1200);
  }

  function sendCommand(text) {
    userText = text;
    pendingWantsText = /escr[ií]be|muestra|enseña|texto|pantalla|escrito|apunta|anota|lista/i.test(text);
    setStatus("Pensando...", "rgba(255,255,255,0.5)");
    setDots([6,8,6,8], "#7C6AFF");
    if(stepsWrap) { stepsWrap.innerHTML = ""; currentSteps = []; }
    var ta = function() { if (!processing) return; setDots([4+Math.random()*8, 4+Math.random()*8, 4+Math.random()*8, 4+Math.random()*8],"#7C6AFF"); requestAnimationFrame(function(){setTimeout(ta,180);}); };
    ta();
    window.postMessage({ source: "x1-voice", type: "command", command: text, raw: text, wantsText: pendingWantsText }, "*");
    setTimeout(function() {
      if (processing) { processing = false; setStatus("Timeout", "rgba(255,255,255,0.3)"); done(); }
    }, 9e4);
  }

  function triggerGreeting() {
    awaitingGreet = true;
    window.postMessage({ source: "x1-voice", type: "command", command: "x1-greet", raw: "x1-greet", wantsText: false }, "*");
  }

  // ── Activation (Ctrl+Space) ──

  function activate() {
    if (speakingUtterance) stopSpeaking();
    createBar(); showBar();
    continuousMode = true; processing = false;
    finalTranscript = "";
    setStatus("Escuchando...", "rgba(255,255,255,0.6)");
    setGlow("listen");
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia({ audio: true }).then(function(s) {
      s.getTracks().forEach(function(t) { t.stop(); });
      startListening();
    }).catch(function() { setStatus("Micro denegado", "#f87171"); continuousMode = false; holdMode = false; clickMode = false; });
  }

  document.addEventListener("keydown", function(e) {
    if (e.code === "Space" && e.ctrlKey && !e.repeat) {
      e.preventDefault(); e.stopPropagation();
      if (continuousMode) { hideBarNow(); return; }
      holdMode = true; clickMode = false;
      activate();
    }
  }, true);

  document.addEventListener("keyup", function(e) {
    if (e.code === "Space" && holdMode) {
      e.preventDefault(); e.stopPropagation();
      holdMode = false; stopListening();
      var text = finalTranscript.trim();
      if (text) { userText = text; setStatus(text.substring(0,60), "rgba(255,255,255,0.7)"); processing = true; sendCommand(text); }
      else {
        setStatus("...", "rgba(255,255,255,0.3)");
        setTimeout(function() { if (continuousMode && !active) { finalTranscript = ""; setStatus("Escuchando...", "rgba(255,255,255,0.6)"); startListening(); } }, 500);
      }
    }
  }, true);

  // ── Messages ──

  window.addEventListener("message", function(ev) {
    var d = ev.data;
    if (!d) return;

    if (d.source === "x1-step-progress") {
      createBar(); showBar();
      if(d.action === "add") addStep(d.app, d.description, d.status || "active");
      else if(d.action === "update") updateStep(d.index, d.status);
      else if(d.action === "clear") hideSteps();
      return;
    }

    if (d.source === "x1-voice-status") {
      createBar(); showBar();
      setStatus(d.text, "rgba(255,255,255,0.6)");
      return;
    }

    if (d.source === "x1-voice-response") {
      if (awaitingGreet && !processing) {
        awaitingGreet = false;
        if (d.text) speakResponse(d.text, function() {
          setStatus("Escuchando...", "rgba(255,255,255,0.6)");
          setGlow("listen");
        });
        return;
      }
      if (!processing) return;
      processing = false;
      var reply = d.text || "";
      if (!reply) { setStatus("...", "rgba(255,255,255,0.3)"); done(); return; }
      setStatus(reply.substring(0,60), "rgba(255,255,255,0.7)");
      speakResponse(reply, function() { done(); });
      return;
    }

    if (d.source !== "x1-voice-control") return;
    if (d.action === "toggle") {
      if (isHidden) {
        clickMode = true; holdMode = false;
        activate();
        triggerGreeting();
      } else hideBarNow();
    }
  });

  window.speechSynthesis?.getVoices();
  console.log("[X1] ready");

})()
