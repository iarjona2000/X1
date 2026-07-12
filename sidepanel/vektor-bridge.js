/**
 * vektor-bridge.js — wiring del side panel Vektor (sidepanel/vektor.html)
 * al service worker (background/service-worker.js) via chrome.runtime + X1Protocol.
 *
 * No toca NADA del DOM del diseno. Solo:
 *   1. Lee inputs del usuario (composer, file chips, mode toggle, model selector, diff buttons)
 *   2. Manda REQ.* al SW (CHAT, DIFF_ACCEPT, DIFF_REJECT, SELECT_MODEL)
 *   3. Renderiza la respuesta del SW en burbujas nuevas dentro del chat area
 *
 * Loaded by sidepanel/vektor.html via <script src="vektor-bridge.js"></script>
 * justo antes de </body>.
 *
 * Estilo: ES5 strict + IIFE, alineado con background/protocol.js y
 * background/diff-committer.js.
 *
 * El SW entiende los REQ usados aqui (ver background/service-worker.js line 6910
 * para CHAT; background/diff-committer.js line 294 para DIFF_ACCEPT/REJECT).
 * Si X1Protocol esta disponible globalmente, lo usamos; si no, fallback a
 * string literals que coinciden con X1Protocol.REQ.*.
 */

(function () {
  'use strict';

  // ─── Protocolo ────────────────────────────────────────────────────────
  // El content script background/protocol.js NO se inyecta en paginas
  // chrome-extension:// (el side panel es una de ellas), asi que X1Protocol
  // puede no estar disponible. Fallback a strings literales.

  function getProtocol() {
    if (typeof X1Protocol !== 'undefined' && X1Protocol && X1Protocol.REQ) {
      return X1Protocol;
    }
    return {
      REQ: {
        CHAT: 'CHAT',
        DIFF_ACCEPT: 'DIFF_ACCEPT',
        DIFF_REJECT: 'DIFF_REJECT',
        SELECT_MODEL: 'SELECT_MODEL',
        HEALTH: 'HEALTH',
        IS_READY: 'IS_READY',
      },
      EVT: {
        TOKEN: 'TOKEN',
        DONE: 'DONE',
        STEP_PROGRESS: 'STEP_PROGRESS',
      },
      ERR_CODE: {
        UNKNOWN: 'UNKNOWN',
        TIMEOUT: 'TIMEOUT',
        PROVIDER: 'PROVIDER',
        VALIDATION: 'VALIDATION',
        RATE_LIMIT: 'RATE_LIMIT',
        AUTH: 'AUTH',
        INTERNAL: 'INTERNAL',
      },
    };
  }

  function reqName(name) {
    var p = getProtocol();
    return p && p.REQ && p.REQ[name] ? p.REQ[name] : name;
  }

  // ─── Element finders (sin IDs, el diseno Vektor no los tiene) ─────────

  // Encuentra leaf element (sin hijos) con texto exacto
  function $leaf(root, text) {
    var scope = root || document;
    var all = scope.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      if (all[i].childElementCount === 0) {
        if ((all[i].textContent || '').trim() === text) return all[i];
      }
    }
    return null;
  }

  // Busca un boton cuyo texto (de cualquier hijo leaf) sea exactamente `text`
  function $btnByText(text) {
    var btns = document.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      if ((btns[i].textContent || '').trim() === text) return btns[i];
    }
    return null;
  }

  // Busca un boton que contenga un <span class="material-symbols-outlined">
  // con el nombre de icono dado
  function $btnByIcon(iconName) {
    var spans = document.querySelectorAll('span.material-symbols-outlined');
    for (var i = 0; i < spans.length; i++) {
      if ((spans[i].textContent || '').trim() === iconName) {
        var btn = spans[i].closest('button');
        if (btn) return btn;
      }
    }
    return null;
  }

  // Busca un div cuyo texto (de cualquier hijo leaf) sea exactamente `text`
  function $divByText(text) {
    var divs = document.querySelectorAll('div');
    for (var i = 0; i < divs.length; i++) {
      // ignorar el chat area y containers grandes: solo divs "leaf-ish"
      if (divs[i].childElementCount > 0 && divs[i].children.length < 5) {
        if ((divs[i].textContent || '').trim() === text) return divs[i];
      }
    }
    return null;
  }

  // Encuentra el chat area: el unico div con overflow-y-auto + space-y-4 + flex-col
  function $chatArea() {
    if ($chatArea._cached) return $chatArea._cached;
    var divs = document.querySelectorAll('main div');
    for (var i = 0; i < divs.length; i++) {
      var cn = divs[i].className || '';
      if (cn.indexOf('overflow-y-auto') !== -1 &&
          cn.indexOf('space-y-4') !== -1 &&
          cn.indexOf('flex-col') !== -1) {
        $chatArea._cached = divs[i];
        return divs[i];
      }
    }
    return null;
  }

  // ─── RPC al SW ────────────────────────────────────────────────────────

  function rpc(type, payload) {
    return new Promise(function (resolve) {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        resolve({ ok: false, error: 'chrome.runtime.sendMessage no disponible (¿abierto fuera de la extension?)' });
        return;
      }
      try {
        chrome.runtime.sendMessage(Object.assign({ type: type }, payload || {}), function (resp) {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(resp || { ok: false, error: 'sin respuesta del SW' });
        });
      } catch (e) {
        resolve({ ok: false, error: (e && e.message) || 'sendMessage error' });
      }
    });
  }

  // ─── Estado ───────────────────────────────────────────────────────────

  var state = {
    mode: 'agent',          // 'agent' o 'chat'
    model: 'SWE-1.6',
    activeFiles: ['engine.py'],
    activeTab: 'chat',
    context: [],
  };

  var busy = false;

  // ─── Chat rendering ──────────────────────────────────────────────────

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function appendUserBubble(text) {
    var area = $chatArea();
    if (!area) return null;
    var d = document.createElement('div');
    d.className = 'flex gap-2 justify-end mt-1';
    d.innerHTML =
      '<div class="flex-1 bg-surface-container-low border border-accents-2 rounded-lg p-3 shadow-sm">' +
        '<div class="flex items-center gap-1.5 mb-1 text-primary">' +
          '<span class="material-symbols-outlined text-[14px]">account_tree</span>' +
          '<span class="font-body-sm text-[12px] font-semibold">Tu prompt</span>' +
        '</div>' +
        '<p class="font-body-sm text-[13px] text-primary leading-snug">' + esc(text) + '</p>' +
      '</div>';
    area.appendChild(d);
    area.scrollTop = area.scrollHeight;
    return d;
  }

  function appendAIBubble() {
    var area = $chatArea();
    if (!area) return null;
    var d = document.createElement('div');
    d.className = 'flex gap-2';
    d.innerHTML =
      '<div class="flex-1 space-y-2">' +
        '<p class="font-body-sm text-[13px] text-primary leading-snug vkb-text">' +
          '<span class="vkb-thinking">Procesando…</span>' +
        '</p>' +
        '<p class="font-body-sm text-[11px] text-accents-5 vkb-meta"></p>' +
      '</div>';
    area.appendChild(d);
    area.scrollTop = area.scrollHeight;
    return d;
  }

  function fillAI(bubble, text, meta) {
    if (!bubble) return;
    var t = bubble.querySelector('.vkb-text');
    var m = bubble.querySelector('.vkb-meta');
    if (t) t.innerHTML = esc(text).replace(/\n/g, '<br>');
    if (m && meta) m.textContent = meta;
  }

  function appendErr(msg) {
    var area = $chatArea();
    if (!area) return;
    var d = document.createElement('div');
    d.className = 'flex gap-2';
    d.innerHTML =
      '<div class="flex-1 border border-error/30 bg-error/5 rounded-lg p-2">' +
        '<p class="font-body-sm text-[12px] text-error">' + esc(msg) + '</p>' +
      '</div>';
    area.appendChild(d);
    area.scrollTop = area.scrollHeight;
  }

  // ─── Composer (textarea + send button) ───────────────────────────────

  function wireComposer() {
    var ta = document.querySelector('textarea');
    if (!ta) return;
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        submit();
      }
    });

    var btn = $btnByIcon('arrow_upward');
    if (btn) btn.addEventListener('click', submit);

    // Cmd/Ctrl+L enfoca el textarea (matches placeholder hint)
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'l' || e.key === 'L') && !e.shiftKey) {
        var tag = (document.activeElement && document.activeElement.tagName) || '';
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          ta.focus();
        }
      }
    });
  }

  async function submit() {
    if (busy) return;
    var ta = document.querySelector('textarea');
    if (!ta) return;
    var text = (ta.value || '').trim();
    if (!text) return;

    busy = true;
    ta.value = '';
    appendUserBubble(text);
    var bubble = appendAIBubble();

    // Timeout duro: si el SW no responde en 25s, mostramos el error
    var to = setTimeout(function () {
      if (busy) {
        fillAI(bubble, '(timeout — el SW no responde en 25s)', 'timeout');
        busy = false;
      }
    }, 25000);

    var resp;
    try {
      resp = await rpc(reqName('CHAT'), { query: text, mode: state.mode, model: state.model });
    } catch (e) {
      resp = { ok: false, error: (e && e.message) || 'excepción en rpc' };
    }
    clearTimeout(to);
    busy = false;

    if (resp && resp.text) {
      var meta = '';
      if (resp.provider) meta += 'provider: ' + resp.provider;
      if (resp.attempts) meta += (meta ? ' · ' : '') + resp.attempts + ' intento(s)';
      fillAI(bubble, resp.text, meta);
    } else {
      var errMsg = (resp && resp.error && resp.error.message) || (resp && resp.error) || 'error desconocido';
      fillAI(bubble, 'Error: ' + errMsg, '');
    }
  }

  // ─── Tabs (Chat / Repository / Settings) — visual toggle ─────────────

  function wireTabs() {
    var labels = ['Chat', 'Repository', 'Settings'];
    labels.forEach(function (label) {
      var btn = $btnByText(label);
      if (!btn) return;
      btn.addEventListener('click', function () {
        labels.forEach(function (l) {
          var b = $btnByText(l);
          if (!b) return;
          if (l === label) {
            b.className = 'font-body-sm text-[12px] text-primary border-b-[2px] border-primary font-semibold';
          } else {
            b.className = 'font-body-sm text-[12px] text-accents-5 hover:text-primary transition-colors';
          }
        });
        state.activeTab = label.toLowerCase();
      });
    });
  }

  // ─── File chips (engine.py / train.py / program.md) — visual toggle ──

  function wireFileChips() {
    var names = ['engine.py', 'train.py', 'program.md'];
    names.forEach(function (name) {
      var leaf = $leaf(document, name);
      if (!leaf) return;
      var chip = leaf.parentElement;
      if (!chip) return;
      chip.addEventListener('click', function () {
        var idx = state.activeFiles.indexOf(name);
        if (idx === -1) {
          state.activeFiles.push(name);
          chip.className = 'flex items-center gap-1 px-2 py-0.5 bg-surface-container-lowest border border-accents-2 rounded font-code-sm text-primary shadow-sm hover:border-accents-4 transition-colors cursor-pointer';
        } else {
          state.activeFiles.splice(idx, 1);
          chip.className = 'flex items-center gap-1 px-2 py-0.5 text-accents-5 hover:text-primary hover:bg-accents-1 rounded transition-colors font-code-sm cursor-pointer';
        }
      });
    });
  }

  // ─── Diff Accept / Reject ────────────────────────────────────────────

  function wireDiff() {
    var acceptBtn = $btnByText('Accept');
    var rejectBtn = $btnByText('Reject');
    if (acceptBtn) acceptBtn.addEventListener('click', function () { diffAction('accept', acceptBtn); });
    if (rejectBtn) rejectBtn.addEventListener('click', function () { diffAction('reject', rejectBtn); });
  }

  async function diffAction(kind, btn) {
    if (btn.disabled) return;
    var card = btn.closest('.border.border-accents-2.rounded-lg');
    var fileName = '';
    var lines = [];
    if (card) {
      var fileEl = card.querySelector('.font-code-sm');
      if (fileEl) fileName = (fileEl.textContent || '').trim();
      var diffLines = card.querySelectorAll('.text-error, .text-emerald-700');
      diffLines.forEach(function (el) {
        var raw = (el.textContent || '');
        var op = raw.indexOf('-') === 0 ? '-' : '+';
        lines.push({ kind: op, text: raw.replace(/^[-+]\s*/, '') });
      });
    }
    if (!fileName) fileName = 'engine.py'; // fallback al del diseno

    btn.disabled = true;
    var orig = btn.textContent;
    btn.textContent = kind === 'accept' ? 'Commiteando…' : 'Rechazando…';

    var resp;
    try {
      resp = await rpc(reqName(kind === 'accept' ? 'DIFF_ACCEPT' : 'DIFF_REJECT'), {
        diff: { fileName: fileName, lines: lines },
        reason: kind === 'reject' ? 'user_rejected' : undefined,
      });
    } catch (e) {
      resp = { ok: false, error: (e && e.message) || 'excepción en rpc' };
    }

    if (resp && resp.ok) {
      btn.textContent = kind === 'accept' ? 'Commit ✓' : 'Rechazado ✓';
      btn.classList.add('opacity-60');
      if (kind === 'accept' && resp.data && resp.data.htmlUrl) {
        appendInfoBubble('Commit: ' + resp.data.htmlUrl);
      } else if (resp.data && resp.data.message) {
        appendInfoBubble(resp.data.message);
      }
    } else {
      btn.disabled = false;
      btn.textContent = orig;
      var errMsg = (resp && resp.error && resp.error.message) || (resp && resp.error) || 'error';
      appendErr('Diff ' + kind + ': ' + errMsg);
    }
  }

  function appendInfoBubble(msg) {
    var area = $chatArea();
    if (!area) return;
    var d = document.createElement('div');
    d.className = 'flex gap-2';
    d.innerHTML =
      '<div class="flex-1 border border-accents-2 bg-surface-container-low rounded-lg p-2">' +
        '<p class="font-body-sm text-[12px] text-accents-6">' + esc(msg) + '</p>' +
      '</div>';
    area.appendChild(d);
    area.scrollTop = area.scrollHeight;
  }

  // ─── Agent / Chat toggle (scoped al contenedor del composer) ──────────

  function wireModeToggle() {
    // El toggle vive en un div con bg-surface-container-low p-0.5 (el contenedor
    // de los dos botones Agent/Chat). Buscamos ese contenedor.
    var divs = document.querySelectorAll('div');
    var toggle = null;
    for (var i = 0; i < divs.length; i++) {
      var cn = divs[i].className || '';
      if (/bg-surface-container-low p-0\.5/.test(cn) && divs[i].querySelectorAll('button').length === 2) {
        toggle = divs[i];
        break;
      }
    }
    if (!toggle) return;
    var labels = ['Agent', 'Chat'];
    labels.forEach(function (label) {
      var btn = $btnByText(label);
      if (!btn || !toggle.contains(btn)) return;
      btn.addEventListener('click', function () {
        state.mode = label.toLowerCase();
        labels.forEach(function (l) {
          var b = $btnByText(l);
          if (!b) return;
          if (l === label) {
            b.className = 'px-1.5 py-0.5 rounded shadow-sm bg-surface-container-lowest text-primary text-[10px] font-medium flex items-center gap-0.5';
          } else {
            b.className = 'px-1.5 py-0.5 rounded text-accents-6 hover:text-primary text-[10px] font-medium flex items-center gap-0.5';
          }
        });
      });
    });
  }

  // ─── Model selector (SWE-1.6) — cycle + REQ.SELECT_MODEL ─────────────

  function wireModel() {
    var leaves = document.querySelectorAll('span, div');
    var labelEl = null;
    for (var i = 0; i < leaves.length; i++) {
      var t = (leaves[i].textContent || '').trim();
      if (t.indexOf('SWE-1.6') === 0) { labelEl = leaves[i]; break; }
    }
    if (!labelEl) return;
    var container = labelEl.closest('div[class*="cursor-pointer"]') || labelEl.parentElement;
    if (!container) return;
    container.style.cursor = 'pointer';
    container.addEventListener('click', function () {
      var models = ['SWE-1.6', 'GPT-4o', 'Claude 3.5', 'Gemini 2.0'];
      var idx = models.indexOf(state.model);
      state.model = models[(idx + 1) % models.length];
      // Reemplaza solo el text node que contiene el modelo (no el icono)
      var nodes = container.childNodes;
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].nodeType === 3 && /SWE-1\.6|GPT-4o|Claude 3\.5|Gemini 2\.0/.test(nodes[i].nodeValue)) {
          nodes[i].nodeValue = nodes[i].nodeValue.replace(/SWE-1\.6|GPT-4o|Claude 3\.5|Gemini 2\.0/, state.model);
          break;
        }
      }
      rpc(reqName('SELECT_MODEL'), { model: state.model, query: '' });
    });
  }

  // ─── Health check al cargar (no bloqueante, solo log) ────────────────

  function pingHealth() {
    rpc(reqName('HEALTH')).then(function (resp) {
      if (resp && resp.ok) {
        console.log('[Vektor bridge] SW health OK', resp.data || '');
      } else {
        console.warn('[Vektor bridge] SW health respondió con error', resp && resp.error);
      }
    });
  }

  // ─── Init ────────────────────────────────────────────────────────────

  function init() {
    if (init._done) return;
    init._done = true;
    wireTabs();
    wireFileChips();
    wireComposer();
    wireModeToggle();
    wireModel();
    wireDiff();
    pingHealth();
    console.log('[Vektor bridge] wired: composer, tabs, file chips, mode toggle, model selector, diff accept/reject');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
