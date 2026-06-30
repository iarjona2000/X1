(function() {
  var toolbar = null;
  var TOOLBAR_ID = 'x1-floating-toolbar';

  function removeToolbar() {
    if (toolbar && toolbar.parentNode) {
      toolbar.parentNode.removeChild(toolbar);
    }
    toolbar = null;
  }

  function createButton(label, type) {
    var btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.3);color:#fff;padding:4px 10px;border-radius:12px;font-size:11px;font-family:Inter,system-ui,sans-serif;cursor:pointer;white-space:nowrap;transition:all 0.15s ease;';
    btn.addEventListener('mouseenter', function() {
      btn.style.background = 'rgba(255,255,255,0.2)';
      btn.style.borderColor = 'rgba(255,255,255,0.5)';
    });
    btn.addEventListener('mouseleave', function() {
      btn.style.background = 'none';
      btn.style.borderColor = 'rgba(255,255,255,0.3)';
    });
    btn.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopPropagation();
    });
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var selectedText = toolbar ? toolbar.getAttribute('data-text') : '';
      if (selectedText && window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'TOOLBAR_ACTION',
          action: type,
          selectedText: selectedText,
          pageUrl: location.href,
          pageTitle: document.title
        });
      }
      removeToolbar();
    });
    return btn;
  }

  function showToolbar(rect, text) {
    removeToolbar();

    toolbar = document.createElement('div');
    toolbar.id = TOOLBAR_ID;
    toolbar.setAttribute('data-text', text);
    toolbar.style.cssText = 'position:absolute;z-index:2147483647;display:flex;gap:4px;padding:6px 8px;background:rgba(24,24,27,0.92);backdrop-filter:blur(12px);border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);animation:x1-toolbar-in 0.15s ease;';

    var style = document.createElement('style');
    style.textContent = '@keyframes x1-toolbar-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}';
    toolbar.appendChild(style);

    var actions = [
      {label: 'Resumir', type: 'summarize'},
      {label: 'Explicar', type: 'explain'},
      {label: 'Traducir', type: 'translate'},
      {label: 'Reescribir', type: 'rewrite'},
      {label: 'Preguntar', type: 'ask'},
      {label: 'Guardar', type: 'saveToMemory'}
    ];

    for (var i = 0; i < actions.length; i++) {
      toolbar.appendChild(createButton(actions[i].label, actions[i].type));
    }

    var top = window.scrollY + rect.top - 44;
    var left = window.scrollX + rect.left;
    if (top < window.scrollY + 10) top = window.scrollY + rect.bottom + 8;
    if (left + 400 > window.innerWidth + window.scrollX) left = window.innerWidth + window.scrollX - 420;
    if (left < window.scrollX + 10) left = window.scrollX + 10;

    toolbar.style.top = top + 'px';
    toolbar.style.left = left + 'px';

    document.body.appendChild(toolbar);
  }

  document.addEventListener('mouseup', function(e) {
    if (toolbar && toolbar.contains(e.target)) return;

    setTimeout(function() {
      var sel = window.getSelection();
      var text = sel ? sel.toString().trim() : '';
      if (text.length < 5) {
        removeToolbar();
        return;
      }
      try {
        var range = sel.getRangeAt(0);
        var rect = range.getBoundingClientRect();
        if (rect.width > 0) {
          showToolbar(rect, text.substring(0, 2000));
        }
      } catch(ex) {}
    }, 10);
  });

  document.addEventListener('mousedown', function(e) {
    if (toolbar && !toolbar.contains(e.target)) {
      removeToolbar();
    }
  });

  document.addEventListener('scroll', function() {
    removeToolbar();
  }, true);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') removeToolbar();
  });
})();
