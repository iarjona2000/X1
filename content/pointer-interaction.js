(function() {
  var POPUP_ID = 'x1-pointer-popup';
  var popup = null;

  function removePopup() {
    if (popup && popup.parentNode) popup.parentNode.removeChild(popup);
    popup = null;
  }

  function showAskBox(clientX, clientY) {
    removePopup();
    popup = document.createElement('div');
    popup.id = POPUP_ID;
    popup.style.cssText = 'position:fixed;z-index:2147483647;left:' + clientX + 'px;top:' + clientY + 'px;' +
      'background:rgba(24,24,27,0.95);backdrop-filter:blur(12px);border-radius:12px;padding:8px;' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.15);' +
      'font-family:Inter,system-ui,sans-serif;';

    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Pregunta sobre esta zona de la pantalla...';
    input.style.cssText = 'width:280px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);' +
      'border-radius:8px;color:#fff;padding:6px 10px;font-size:12px;outline:none;';
    popup.appendChild(input);
    document.body.appendChild(popup);
    input.focus();

    // Keep the ask box on-screen if it would overflow the viewport.
    var rect = popup.getBoundingClientRect();
    if (rect.right > window.innerWidth) popup.style.left = (window.innerWidth - rect.width - 10) + 'px';
    if (rect.bottom > window.innerHeight) popup.style.top = (window.innerHeight - rect.height - 10) + 'px';

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { removePopup(); return; }
      if (e.key !== 'Enter') return;
      var question = input.value.trim();
      if (!question) return;
      askAboutRegion(clientX, clientY, question);
    });

    input.addEventListener('mousedown', function(e) { e.stopPropagation(); });
  }

  function showAnswer(text) {
    if (!popup) return;
    popup.innerHTML = '';
    var body = document.createElement('div');
    body.style.cssText = 'max-width:320px;color:#fff;font-size:12px;line-height:1.5;white-space:pre-wrap;';
    body.textContent = text;
    popup.appendChild(body);
  }

  function askAboutRegion(clientX, clientY, question) {
    if (popup) showAnswer('Analizando...');
    chrome.runtime.sendMessage({
      type: 'X1_POINTER_ASK',
      x: clientX,
      y: clientY,
      devicePixelRatio: window.devicePixelRatio || 1,
      question: question
    }, function(response) {
      if (chrome.runtime.lastError) { showAnswer('Error: ' + chrome.runtime.lastError.message); return; }
      showAnswer((response && response.text) || 'Sin respuesta.');
    });
  }

  document.addEventListener('click', function(e) {
    if (!e.altKey) return;
    if (popup && popup.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    showAskBox(e.clientX, e.clientY);
  }, true);

  document.addEventListener('mousedown', function(e) {
    if (popup && !popup.contains(e.target)) removePopup();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') removePopup();
  });
})();
