(function(){

  console.log('[X1] Premium Terminal v10 — Full Layer Stack');

  var recognition = null;
  var isActive = false;
  var processing = false;
  var autoRestartTimer = null;
  var silenceTimer = null;
  var lastTranscript = '';

  var panelEl = null;
  var inputEl = null;
  var outputEl = null;
  var statusEl = null;
  var processBarEl = null;
  var glowEl = null;
  var bubblesEl = null;
  var initAttempts = 0;
  var MAX_INIT_ATTEMPTS = 20;
  var stepCards = {};
  var bubbleQueue = [];
  var audioCtx = null;
  var analyser = null;
  var micStream = null;
  var speechInterruptActive = false;

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
    '  --x1-accent-blue: #3b82f6;',
    '  --x1-accent-green: #22c55e;',
    '  --x1-accent-purple: #a855f7;',
    '  --x1-accent-red: #ef4444;',
    '  --x1-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06);',
    '  --x1-shadow-lg: 0 4px 24px rgba(0,0,0,0.08), 0 12px 48px rgba(0,0,0,0.06);',
    '}',
    '',
    '/* ─── PROCESS BAR (Layer 1) ─── */',
    '#x1-process-bar {',
    '  position: fixed !important;',
    '  top: 16px !important;',
    '  left: 50% !important;',
    '  transform: translateX(-50%) !important;',
    '  z-index: 2147483647 !important;',
    '  display: flex !important;',
    '  flex-direction: row !important;',
    '  gap: 8px !important;',
    '  padding: 8px 16px !important;',
    '  background: rgba(255,255,255,0.85) !important;',
    '  backdrop-filter: blur(16px) !important;',
    '  -webkit-backdrop-filter: blur(16px) !important;',
    '  border: 1px solid var(--x1-border) !important;',
    '  border-radius: 14px !important;',
    '  box-shadow: var(--x1-shadow-lg) !important;',
    '  max-width: calc(100vw - 40px) !important;',
    '  overflow-x: auto !important;',
    '  overflow-y: visible !important;',
    '  scrollbar-width: none !important;',
    '  opacity: 0 !important;',
    '  transform: translateX(-50%) translateY(-12px) !important;',
    '  transition: opacity 0.35s ease, transform 0.35s ease !important;',
    '  pointer-events: auto !important;',
    '}',
    '#x1-process-bar.visible {',
    '  opacity: 1 !important;',
    '  transform: translateX(-50%) translateY(0) !important;',
    '}',
    '#x1-process-bar::-webkit-scrollbar { display: none !important; }',
    '',
    '.x1-step-card {',
    '  display: flex !important;',
    '  align-items: center !important;',
    '  gap: 8px !important;',
    '  padding: 6px 12px !important;',
    '  background: rgba(255,255,255,0.9) !important;',
    '  border: 1px solid var(--x1-border) !important;',
    '  border-radius: 10px !important;',
    '  white-space: nowrap !important;',
    '  font-family: var(--x1-sans) !important;',
    '  font-size: 11px !important;',
    '  font-weight: 500 !important;',
    '  color: var(--x1-text) !important;',
    '  animation: x1-step-slide 0.3s ease !important;',
    '  flex-shrink: 0 !important;',
    '}',
    '.x1-step-card .step-icon {',
    '  width: 18px !important;',
    '  height: 18px !important;',
    '  border-radius: 4px !important;',
    '  display: flex !important;',
    '  align-items: center !important;',
    '  justify-content: center !important;',
    '  font-size: 10px !important;',
    '  font-weight: 600 !important;',
    '  color: #fff !important;',
    '  flex-shrink: 0 !important;',
    '  overflow: hidden !important;',
    '}',
    '.x1-step-card .step-icon img { width: 100%; height: 100%; object-fit: contain; }',
    '.x1-step-card .step-desc { flex: 1 !important; min-width: 0 !important; }',
    '.x1-step-card .step-dot {',
    '  width: 8px !important;',
    '  height: 8px !important;',
    '  border-radius: 50% !important;',
    '  flex-shrink: 0 !important;',
    '  transition: background 0.3s ease !important;',
    '}',
    '.x1-step-card .step-dot.active {',
    '  background: var(--x1-accent-blue) !important;',
    '  animation: x1-dot-pulse 1.2s ease-in-out infinite !important;',
    '}',
    '.x1-step-card .step-dot.done {',
    '  background: var(--x1-accent-green) !important;',
    '}',
    '.x1-step-card .step-dot.error {',
    '  background: var(--x1-accent-red) !important;',
    '}',
    '',
    '@keyframes x1-step-slide {',
    '  from { opacity: 0; transform: translateX(20px); }',
    '  to { opacity: 1; transform: translateX(0); }',
    '}',
    '@keyframes x1-dot-pulse {',
    '  0%, 100% { opacity: 1; transform: scale(1); }',
    '  50% { opacity: 0.6; transform: scale(1.3); }',
    '}',
    '',
    '/* ─── GLOW (Layer 3) ─── */',
    '#x1-glow {',
    '  position: fixed !important;',
    '  bottom: 0 !important;',
    '  left: 0 !important;',
    '  width: 100% !important;',
    '  height: 180px !important;',
    '  z-index: 2147483646 !important;',
    '  pointer-events: none !important;',
    '  background: radial-gradient(ellipse 80% 100% at 50% 100%, rgba(59,130,246,0.12) 0%, transparent 70%) !important;',
    '  transition: background 1.2s ease !important;',
    '  opacity: 0 !important;',
    '  transition: opacity 0.6s ease, background 1.2s ease !important;',
    '}',
    '#x1-glow.visible { opacity: 1 !important; }',
    '#x1-glow.listening { background: radial-gradient(ellipse 80% 100% at 50% 100%, rgba(59,130,246,0.15) 0%, transparent 70%) !important; }',
    '#x1-glow.speaking { background: radial-gradient(ellipse 80% 100% at 50% 100%, rgba(34,197,94,0.15) 0%, transparent 70%) !important; }',
    '#x1-glow.thinking { background: radial-gradient(ellipse 80% 100% at 50% 100%, rgba(168,85,247,0.15) 0%, transparent 70%) !important; }',
    '',
    '/* ─── BUBBLES (Layer 4) ─── */',
    '#x1-bubbles {',
    '  position: fixed !important;',
    '  bottom: 100px !important;',
    '  left: 50% !important;',
    '  transform: translateX(-50%) !important;',
    '  z-index: 2147483646 !important;',
    '  display: flex !important;',
    '  flex-direction: column-reverse !important;',
    '  gap: 8px !important;',
    '  align-items: center !important;',
    '  pointer-events: none !important;',
    '  max-width: min(440px, calc(100vw - 40px)) !important;',
    '}',
    '.x1-bubble {',
    '  padding: 10px 16px !important;',
    '  background: rgba(255,255,255,0.92) !important;',
    '  backdrop-filter: blur(12px) !important;',
    '  -webkit-backdrop-filter: blur(12px) !important;',
    '  border: 1px solid var(--x1-border) !important;',
    '  border-radius: 12px !important;',
    '  box-shadow: var(--x1-shadow) !important;',
    '  font-family: var(--x1-sans) !important;',
    '  font-size: 12px !important;',
    '  line-height: 1.5 !important;',
    '  color: var(--x1-text) !important;',
    '  max-width: 100% !important;',
    '  animation: x1-bubble-in 0.35s ease !important;',
    '  pointer-events: auto !important;',
    '}',
    '.x1-bubble.assistant {',
    '  border-left: 3px solid var(--x1-accent) !important;',
    '}',
    '.x1-bubble.user {',
    '  border-left: 3px solid var(--x1-accent-blue) !important;',
    '  background: rgba(245,247,250,0.92) !important;',
    '}',
    '.x1-bubble.thinking {',
    '  border-left: 3px solid var(--x1-accent-purple) !important;',
    '  font-style: italic !important;',
    '  color: var(--x1-text-secondary) !important;',
    '  animation: x1-think-pulse 1.6s ease-in-out infinite !important;',
    '}',
    '.x1-bubble.removing {',
    '  animation: x1-bubble-out 0.25s ease forwards !important;',
    '}',
    '',
    '@keyframes x1-bubble-in {',
    '  from { opacity: 0; transform: translateY(12px) scale(0.95); }',
    '  to { opacity: 1; transform: translateY(0) scale(1); }',
    '}',
    '@keyframes x1-bubble-out {',
    '  from { opacity: 1; transform: translateY(0) scale(1); }',
    '  to { opacity: 0; transform: translateY(8px) scale(0.95); }',
    '}',
    '@keyframes x1-think-pulse {',
    '  0%, 100% { opacity: 0.8; }',
    '  50% { opacity: 0.4; }',
    '}',
    '',
    '/* ─── MAIN PANEL ─── */',
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
  ].join('\n');
  document.head.appendChild(style);

  // ─── LAYER 1: PROCESS BAR ───

  function createProcessBar() {
    if (processBarEl) return;
    processBarEl = document.createElement('div');
    processBarEl.id = 'x1-process-bar';
    document.body.appendChild(processBarEl);
  }

  function showStepProgress(app, description, status) {
    createProcessBar();
    var cardId = 'step-' + app.replace(/[^a-zA-Z0-9]/g, '-') + '-' + Date.now();
    if (stepCards[cardId] && status === 'active') return;
    var card = document.createElement('div');
    card.className = 'x1-step-card';
    card.id = cardId;
    var iconBg = '#666';
    var iconLetter = (app || 'X')[0].toUpperCase();
    var iconColors = {
      'Gmail': '#ea4335', 'Google Docs': '#4285f4', 'Calendar': '#34a853',
      'Sheets': '#0f9d58', 'Meet': '#00897b', 'Drive': '#ffbb00',
      'YouTube': '#ff0000', 'GitHub': '#333', 'Google': '#4285f4',
      'Search': '#4285f4', 'Docs': '#4285f4', 'Navigate': '#333'
    };
    var matchedColor = null;
    for (var key in iconColors) {
      if (app && app.toLowerCase() === key.toLowerCase()) {
        matchedColor = iconColors[key];
        break;
      }
    }
    if (app && iconColors[app]) matchedColor = iconColors[app];
    card.innerHTML =
      '<div class="step-icon" style="background:' + (matchedColor || iconBg) + '">' +
        (app && app.toLowerCase() === 'gmail' ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.9 12 9.818l6.545-4.918 1.528-1.407c1.618-1.214 3.927-.059 3.927 1.964z"/></svg>' :
        '<span>' + iconLetter + '</span>') +
      '</div>' +
      '<span class="step-desc">' + (description || app || 'Step') + '</span>' +
      '<span class="step-dot ' + (status || 'active') + '"></span>';
    processBarEl.appendChild(card);
    stepCards[cardId] = card;
    processBarEl.classList.add('visible');
    processBarEl.scrollLeft = processBarEl.scrollWidth;
    return cardId;
  }

  function updateStepStatus(cardId, status) {
    var card = document.getElementById(cardId);
    if (!card) return;
    var dot = card.querySelector('.step-dot');
    if (dot) dot.className = 'step-dot ' + (status || 'active');
    if (status === 'done' || status === 'error') {
      setTimeout(function() {
        var allDone = true;
        var cards = processBarEl ? processBarEl.querySelectorAll('.step-dot') : [];
        cards.forEach(function(d) {
          if (d.className.indexOf('done') === -1 && d.className.indexOf('error') === -1) allDone = false;
        });
        if (allDone) {
          setTimeout(function() {
            if (processBarEl) processBarEl.classList.remove('visible');
          }, 3000);
        }
      }, 500);
    }
  }

  // ─── LAYER 2: HUMAN-LIKE SPEECH ───

  function humanSpeak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var cleanText = text;
    var hasLaugh = /\(risas\)/i.test(cleanText);
    cleanText = cleanText.replace(/\(risas\)/gi, '');
    cleanText = cleanText.replace(/<[^>]+>/g, '');
    if (!cleanText.trim()) {
      setStatus('listo');
      return;
    }
    var utter = new SpeechSynthesisUtterance(cleanText);
    utter.lang = 'es-ES';
    utter.rate = 1.05;
    utter.pitch = 1.05;
    utter.volume = 1.0;
    var voices = window.speechSynthesis.getVoices();
    for (var i = 0; i < voices.length; i++) {
      if (voices[i].lang && voices[i].lang.indexOf('es') === 0) {
        utter.voice = voices[i];
        break;
      }
    }
    setStatus('hablando');
    updateGlow('speaking');
    if (hasLaugh) {
      addBubble('*risas*', 'thinking');
    }
    speechInterruptActive = true;
    startInterruptionDetection();
    utter.onend = function() {
      stopInterruptionDetection();
      speechInterruptActive = false;
      setStatus('listo');
      updateGlow('idle');
    };
    utter.onerror = function() {
      stopInterruptionDetection();
      speechInterruptActive = false;
      setStatus('listo');
      updateGlow('idle');
    };
    window.speechSynthesis.speak(utter);
  }

  function startInterruptionDetection() {
    if (audioCtx) return;
    try {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
        micStream = stream;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        var bufferLength = analyser.frequencyBinCount;
        var dataArray = new Uint8Array(bufferLength);
        var highCount = 0;
        function checkInterruption() {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          var sum = 0;
          for (var i = 0; i < bufferLength; i++) sum += dataArray[i];
          var rms = sum / bufferLength;
          if (rms > 18) { highCount++; } else { highCount = 0; }
          if (highCount >= 3) {
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
              window.speechSynthesis.cancel();
              setStatus('escuchando');
              updateGlow('listening');
              addBubble('Interrumpido — te escucho...', 'thinking');
              setTimeout(function() {
                if (isActive) startListening();
              }, 300);
            }
            highCount = 0;
            stopInterruptionDetection();
            return;
          }
          if (speechInterruptActive) requestAnimationFrame(checkInterruption);
        }
        checkInterruption();
      }).catch(function(e) {
        console.log('[X1] Interruption detection unavailable:', e.message);
      });
    } catch(e) {
      console.log('[X1] Interruption detection error:', e.message);
    }
  }

  function stopInterruptionDetection() {
    speechInterruptActive = false;
    if (audioCtx) {
      try { audioCtx.close(); } catch(e) {}
      audioCtx = null;
      analyser = null;
    }
    if (micStream) {
      micStream.getTracks().forEach(function(t) { t.stop(); });
      micStream = null;
    }
  }

  // ─── LAYER 3: GLOW ───

  function createGlow() {
    if (glowEl) return;
    glowEl = document.createElement('div');
    glowEl.id = 'x1-glow';
    document.body.appendChild(glowEl);
    setTimeout(function() { glowEl.classList.add('visible'); }, 100);
  }

  function updateGlow(state) {
    if (!glowEl) return;
    glowEl.className = 'visible';
    if (state === 'listening') glowEl.classList.add('listening');
    else if (state === 'speaking') glowEl.classList.add('speaking');
    else if (state === 'thinking') glowEl.classList.add('thinking');
  }

  // ─── LAYER 4: BUBBLES ───

  function createBubblesContainer() {
    if (bubblesEl) return;
    bubblesEl = document.createElement('div');
    bubblesEl.id = 'x1-bubbles';
    document.body.appendChild(bubblesEl);
  }

  function addBubble(text, role) {
    createBubblesContainer();
    bubbleQueue.push({ text: text, role: role || 'assistant' });
    renderBubbles();
  }

  function renderBubbles() {
    if (!bubblesEl) return;
    var visible = bubblesEl.querySelectorAll('.x1-bubble:not(.removing)');
    var maxBubbles = 3;
    if (visible.length >= maxBubbles) {
      var oldest = visible[visible.length - 1];
      if (oldest) {
        oldest.classList.add('removing');
        setTimeout(function() { if (oldest && oldest.parentNode) oldest.remove(); }, 300);
      }
    }
    if (bubbleQueue.length > 0) {
      var item = bubbleQueue.shift();
      var bubble = document.createElement('div');
      bubble.className = 'x1-bubble ' + (item.role || 'assistant');
      bubble.textContent = item.text;
      bubblesEl.appendChild(bubble);
      var timeout = Math.max(4000, item.text.length * 60 + 2000);
      timeout = Math.min(timeout, 15000);
      setTimeout(function() {
        bubble.classList.add('removing');
        setTimeout(function() { if (bubble.parentNode) bubble.remove(); }, 300);
      }, timeout);
    }
  }

  function showThinkBubble() {
    createBubblesContainer();
    var existing = bubblesEl.querySelector('.x1-bubble.thinking');
    if (existing) return;
    var bubble = document.createElement('div');
    bubble.className = 'x1-bubble thinking';
    bubble.textContent = 'Pensando...';
    bubblesEl.appendChild(bubble);
    setTimeout(function() {
      if (bubble.parentNode) {
        bubble.classList.add('removing');
        setTimeout(function() { if (bubble.parentNode) bubble.remove(); }, 300);
      }
    }, 20000);
  }

  function removeThinkBubble() {
    if (!bubblesEl) return;
    var think = bubblesEl.querySelector('.x1-bubble.thinking');
    if (think) {
      think.classList.add('removing');
      setTimeout(function() { if (think.parentNode) think.remove(); }, 300);
    }
  }

  // ─── MAIN PANEL ───

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
      '  <div id="x1-bar-logo">',
      '    <div id="x1-bar-logo-icon">X</div>',
      '    <span id="x1-bar-title">X1</span>',
      '  </div>',
      '  <span id="x1-bar-status">listo</span>',
      '  <button id="x1-bar-close" aria-label="Close">&times;</button>',
      '</div>',
      '<div id="x1-bar-output" role="log" aria-live="polite"></div>',
      '<textarea id="x1-bar-input" placeholder="Escribe un mensaje..." rows="1" aria-label="Mensaje"></textarea>',
      '<div id="x1-bar-footer">',
      '  <span id="x1-bar-hint">Ctrl + Space para voz</span>',
      '  <div id="x1-bar-actions">',
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
        addBubble(text, 'user');
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
    if (panelEl) { panelEl.remove(); panelEl = null; inputEl = null; outputEl = null; statusEl = null; }
    if (processBarEl) { processBarEl.remove(); processBarEl = null; }
    if (glowEl) { glowEl.remove(); glowEl = null; }
    if (bubblesEl) { bubblesEl.remove(); bubblesEl = null; }
    stopInterruptionDetection();
    stopVoice();
  }

  function togglePanel() {
    if (panelEl) destroyPanel();
    else { createPanel(); createGlow(); createBubblesContainer(); createProcessBar(); }
  }

  function setStatus(text) { if (statusEl) statusEl.textContent = text; }

  function addMessage(role, text) {
    renderMessage(role, text, true);
    try { chrome.runtime.sendMessage({type: 'X1_ADD_MESSAGE', role: role, text: text}).catch(function(){}); } catch(e) {}
  }

  function renderMessage(role, text, scroll) {
    if (!outputEl) return;
    var msg = document.createElement('div');
    msg.id = 'x1-bar-msg';
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
    msg.id = 'x1-bar-msg';
    msg.className = 'x1-bar-msg error';
    msg.textContent = text;
    outputEl.appendChild(msg);
    outputEl.scrollTop = outputEl.scrollHeight;
    addBubble(text, 'user');
  }

  function processCommand(cmd) {
    if (processing) { addError('Espera un momento...'); return; }
    setStatus('procesando');
    updateGlow('thinking');
    showThinkBubble();
    processing = true;
    var startTime = Date.now();
    var timeoutMs = 15000;
    chrome.runtime.sendMessage({
      type: 'VOICE_COMMAND_EXEC',
      command: cmd,
      raw: cmd,
      wantsText: true
    }).then(function(resp) {
      processing = false;
      removeThinkBubble();
      var elapsed = Date.now() - startTime;
      if (resp && resp.text) {
        var cleanText = resp.text.replace(/^ERROR:\s*/i, '').trim();
        if (!cleanText || /cannot read|does not support image|image\.png|image\.jpg|image\.jpeg|image\.gif|image\.webp|image\.bmp|image\.svg|image\.ico|model does not support|vision not supported|no image support|inform the user/i.test(cleanText)) {
          cleanText = 'Hecho. ¿Algo más?';
        }
        addMessage('assistant', cleanText);
        addBubble(cleanText, 'assistant');
        if (resp.showText) humanSpeak(cleanText);
      } else if (resp && resp.error) {
        addError('Error: ' + resp.error.replace(/^ERROR:\s*/i, ''));
      } else {
        addError('Sin respuesta. Intenta de nuevo.');
      }
      setStatus('listo');
      updateGlow('idle');
    }).catch(function(e) {
      processing = false;
      removeThinkBubble();
      setStatus('error');
      updateGlow('idle');
      addError('Error de conexión.');
      setTimeout(function() { setStatus('listo'); }, 2500);
    });
    setTimeout(function() {
      if (processing) {
        processing = false;
        removeThinkBubble();
        addError('Sin respuesta (timeout). Intenta de nuevo.');
        setStatus('listo');
        updateGlow('idle');
      }
    }, timeoutMs);
  }

  function toggleVoice() { if (isActive) stopVoice(); else startVoice(); }

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
          addBubble(transcript, 'user');
          processCommand(transcript);
        }
        stopVoice();
      };
      recognition.onerror = function(event) {
        if (event.error === 'no-speech') { /* silent */ }
        else if (event.error === 'audio-capture') addError('Micrófono no disponible.');
        else addError('Error de voz: ' + event.error);
        stopVoice();
      };
      recognition.onend = function() { stopVoice(); };
      recognition.start();
      isActive = true;
      setStatus('escuchando');
      updateGlow('listening');
      var micBtn = document.getElementById('x1-bar-mic');
      if (micBtn) { micBtn.classList.add('recording'); micBtn.textContent = 'Parar'; }
      scheduleAutoRestart();
    } catch(e) {
      addError('Error al iniciar voz: ' + e.message);
    }
  }

  function stopVoice() {
    if (recognition) { try { recognition.stop(); } catch(e) {} recognition = null; }
    isActive = false;
    cancelAutoRestart();
    setStatus('listo');
    updateGlow('idle');
    var micBtn = document.getElementById('x1-bar-mic');
    if (micBtn) { micBtn.classList.remove('recording'); micBtn.textContent = 'Voz'; }
  }

  function startListening() {
    if (isActive) return;
    startVoice();
  }

  function scheduleAutoRestart() {
    cancelAutoRestart();
    autoRestartTimer = setTimeout(function() {
      if (isActive && !processing) startVoice();
    }, 3000);
  }

  function cancelAutoRestart() {
    if (autoRestartTimer) { clearTimeout(autoRestartTimer); autoRestartTimer = null; }
  }

  // ─── LISTEN VIA POSTMESSAGE ───

  window.addEventListener('message', function(e) {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.source === 'x1-step-progress') {
      showStepProgress(e.data.app, e.data.description, e.data.status);
    }
    if (e.data.source === 'x1-voice-response') {
      addBubble(e.data.text || 'Respuesta recibida', 'assistant');
      removeThinkBubble();
      if (e.data.speak) humanSpeak(e.data.text);
    }
    if (e.data.source === 'x1-agent-status') {
      if (e.data.text === 'thinking' || e.data.text === 'processing') {
        updateGlow('thinking');
        showThinkBubble();
      } else {
        removeThinkBubble();
        updateGlow('idle');
      }
    }
  });

  // ─── KEYBOARD ───

  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      if (!panelEl) { createPanel(); createGlow(); createBubblesContainer(); createProcessBar(); }
      if (isActive) stopVoice();
      else startVoice();
    }
  });

  // ─── CHROME MESSAGES ───

  chrome.runtime.onMessage.addListener(function(msg) {
    if (msg.type === 'X1_TOGGLE') togglePanel();
    if (msg.type === 'X1_AGENT_STATUS') setStatus(msg.text || 'procesando');
    if (msg.type === 'X1_STEP_PROGRESS') {
      var cardId = showStepProgress(msg.app, msg.description, msg.status || 'active');
      if (msg.stepId && cardId) stepCards[msg.stepId] = cardId;
    }
  });

  // ─── SPEAK FUNCTION (public) ───
  window.x1Speak = humanSpeak;

  // ─── INIT ───

  function init() {
    initAttempts++;
    if (!panelEl) createPanel();
    if (panelEl && inputEl) { setStatus('listo'); return true; }
    if (initAttempts < MAX_INIT_ATTEMPTS) setTimeout(init, 400);
    return false;
  }

  init();
  setTimeout(init, 2000);
  setTimeout(init, 5000);
  setTimeout(init, 8000);

})();
