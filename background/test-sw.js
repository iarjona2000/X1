// Minimal test service worker
console.log('[TEST] Service worker started');

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  console.log('[TEST] Got message:', msg.type);

  if (msg.type === 'VOICE_COMMAND_EXEC') {
    console.log('[TEST] Voice command:', msg.command);
    sendResponse({ ok: true, text: 'Echo: ' + msg.command, showText: false });
    return false;
  }

  if (msg.type === 'X1_TOGGLE' && sender && sender.tab && sender.tab.id) {
    chrome.tabs.sendMessage(sender.tab.id, { type: 'X1_TOGGLE' });
  }
});

chrome.action.onClicked.addListener(function(tab) {
  if (!tab.id) return;
  console.log('[TEST] Icon clicked, tab:', tab.id);
  chrome.tabs.sendMessage(tab.id, { type: 'X1_TOGGLE' }).catch(function() {
    console.log('[TEST] Injecting scripts...');
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/voice-listener.js'],
      world: 'MAIN'
    }).then(function() {
      return chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/voice-bridge.js']
      });
    }).then(function() {
      setTimeout(function() {
        chrome.tabs.sendMessage(tab.id, { type: 'X1_TOGGLE' });
      }, 300);
    }).catch(function(e) {
      console.error('[TEST] Inject failed:', e);
    });
  });
});

console.log('[TEST] Listeners registered');
