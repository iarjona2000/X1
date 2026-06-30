(function() {
  'use strict';
  console.log('[X1] Contacts content script loaded');

  function getGoogleContactEmail() {
    var emailEl = document.querySelector('input[type="email"], [aria-label*="email" i], [aria-label*="correo" i]');
    if (emailEl) return emailEl.value || emailEl.getAttribute('data-initial-value') || '';
    var spans = document.querySelectorAll('span, div');
    for (var i = 0; i < spans.length; i++) {
      var t = spans[i].textContent || '';
      if (/^[\w.-]+@[\w.-]+\.\w{2,}$/.test(t.trim()) && t.trim().length < 60) {
        return t.trim();
      }
    }
    return '';
  }

  function getContactName() {
    var titleEl = document.querySelector('h1, h2, [itemprop="name"], [aria-label*="name" i]');
    if (titleEl) return titleEl.textContent.trim();
    var urlMatch = location.pathname.match(/\/contact\/?([^/?#]+)/);
    if (urlMatch) return decodeURIComponent(urlMatch[1].replace(/\+/g, ' '));
    return document.title.replace(' - Google Contacts', '').replace(' - Contacts', '').trim();
  }

  function addContactAction() {
    var container = document.querySelector('div[role="main"], main, #page');
    if (!container) return;
    var name = getContactName();
    if (!name || name === 'Google Contacts' || name === 'Contacts') return;
    btn = document.getElementById('x1-contact-btn');
    if (btn) return;
    btn = document.createElement('button');
    btn.id = 'x1-contact-btn';
    btn.textContent = 'X1';
    btn.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9999;background:#1a1a1a;color:#fff;border:none;border-radius:10px;padding:8px 14px;font-family:Inter,sans-serif;font-size:11px;font-weight:600;cursor:pointer;text-transform:uppercase;letter-spacing:.06em;box-shadow:0 2px 12px rgba(0,0,0,.15);transition:all .2s ease';
    btn.addEventListener('click', function() {
      var email = getGoogleContactEmail();
      var info = name;
      if (email) info += ' (' + email + ')';
      chrome.runtime.sendMessage({
        type: 'VOICE_COMMAND_EXEC',
        command: 'guardar contacto: ' + info,
        raw: 'save contact',
        wantsText: true
      });
    });
    document.body.appendChild(btn);
  }
  var btn = null;

  var observer = new MutationObserver(function() {
    if (!document.getElementById('x1-contact-btn')) addContactAction();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(addContactAction, 2000);
  setTimeout(addContactAction, 5000);

  function monitorContactPage() {
    if (location.hostname.indexOf('contacts.google.com') !== -1 || location.hostname.indexOf('google.com/contacts') !== -1) {
      addContactAction();
    }
  }
  setInterval(monitorContactPage, 3000);
  monitorContactPage();
})();
