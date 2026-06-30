(function() {
  'use strict';
  console.log('[X1] Drive content script loaded');

  var style = document.createElement('style');
  style.textContent = '.x1-drive-btn{position:fixed;bottom:80px;right:20px;z-index:9999;background:#1a1a1a;color:#fff;border:none;border-radius:10px;padding:8px 14px;font-family:Inter,sans-serif;font-size:11px;font-weight:600;cursor:pointer;text-transform:uppercase;letter-spacing:.06em;box-shadow:0 2px 12px rgba(0,0,0,.15);transition:all .2s ease;display:none}.x1-drive-btn:hover{background:#333;transform:translateY(-1px)}';
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.className = 'x1-drive-btn';
  btn.textContent = 'X1';
  btn.title = 'X1 — Analizar archivo';
  document.body.appendChild(btn);

  btn.addEventListener('click', function() {
    var filename = document.title.replace(' - Google Drive', '').replace(' - Drive', '').trim();
    var fileType = 'unknown';
    if (location.href.indexOf('/document') !== -1) fileType = 'doc';
    else if (location.href.indexOf('/spreadsheet') !== -1 || location.href.indexOf('/sheet') !== -1) fileType = 'sheet';
    else if (location.href.indexOf('/presentation') !== -1) fileType = 'slide';
    else if (location.href.indexOf('/folder') !== -1) fileType = 'folder';
    else if (location.href.indexOf('/file') !== -1) fileType = 'file';
    try {
      chrome.runtime.sendMessage({
        type: 'VOICE_COMMAND_EXEC',
        command: 'analiza este archivo de Drive: ' + filename + ', tipo: ' + fileType,
        raw: 'drive analysis',
        wantsText: true
      }, function(resp) {
        if (resp && resp.text) {
          var bubble = document.createElement('div');
          bubble.style.cssText = 'position:fixed;bottom:120px;right:20px;z-index:9999;background:#fff;border:1px solid #e5e3df;border-radius:12px;padding:12px 16px;font-family:Inter,sans-serif;font-size:12px;line-height:1.5;color:#1a1a1a;box-shadow:0 4px 20px rgba(0,0,0,.08);max-width:300px;animation:fadeIn .3s ease';
          bubble.textContent = resp.text.substring(0, 200);
          document.body.appendChild(bubble);
          setTimeout(function() { bubble.style.opacity = '0'; bubble.style.transition = 'opacity .3s ease'; setTimeout(function() { bubble.remove(); }, 300); }, 6000);
        }
      });
    } catch(e) {}
  });

  setTimeout(function() { btn.style.display = 'block'; }, 2000);

  window.addEventListener('message', function(e) {
    if (e.data && e.data.source === 'x1-voice-response' && e.data.text) {
      btn.style.display = 'block';
    }
  });
})();
