/**
 * page-agent-bridge.js — Adaptador de PageAgent para X1
 *
 * Extrae el core de alibaba/page-agent (20k+ stars):
 * - DOM extraction engine (identificar elementos interactivos)
 * - Click/input/scroll simulation (W3C events)
 * - Text dehydration (DOM → texto legible para LLM)
 *
 * Licencia: MIT (Alibaba)
 * Fuente: https://github.com/alibaba/page-agent
 */

(function() {
  'use strict';

  var log = {
    info: function(m) { console.log('[X1-PageAgent]', m); },
    warn: function(m) { console.warn('[X1-PageAgent]', m); },
    error: function(m) { console.error('[X1-PageAgent]', m); }
  };

  // ═══════════════════════════════════════════
  // DOM EXTRACTION ENGINE (from page-agent dom_tree)
  // ═══════════════════════════════════════════

  var INTERACTIVE_TAGS = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY', 'DETAILS'];
  var INTERACTIVE_ROLES = ['button', 'link', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'radio', 'checkbox', 'tab', 'switch'];
  var SCROLLABLE_OVERFLOW = ['auto', 'scroll'];
  var HIGHLIGHT_ATTR = 'data-x1-highlight';
  var HIGHLIGHT_COUNTER = 0;

  function isInteractive(el) {
    if (!el || !el.tagName) return false;
    if (INTERACTIVE_TAGS.indexOf(el.tagName) !== -1) return true;
    if (el.getAttribute('role') && INTERACTIVE_ROLES.indexOf(el.getAttribute('role').toLowerCase()) !== -1) return true;
    if (el.getAttribute('tabindex') && parseInt(el.getAttribute('tabindex')) >= 0) return true;
    if (el.getAttribute('onclick') || el.getAttribute('onmousedown')) return true;
    return false;
  }

  function isVisible(el) {
    if (!el.offsetParent && el.tagName !== 'BODY' && el.tagName !== 'HTML') return false;
    var style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    return true;
  }

  function isScrollable(el) {
    if (el === document.body || el === document.documentElement) {
      return document.body.scrollHeight > window.innerHeight || document.documentElement.scrollHeight > window.innerHeight;
    }
    var style = window.getComputedStyle(el);
    return SCROLLABLE_OVERFLOW.indexOf(style.overflowY) !== -1 && el.scrollHeight > el.clientHeight;
  }

  function getElementText(el) {
    var text = el.textContent || '';
    text = text.replace(/\s+/g, ' ').trim();
    if (text.length > 100) text = text.substring(0, 97) + '...';
    return text;
  }

  function getElementDescription(el) {
    var tag = el.tagName.toLowerCase();
    var desc = tag;
    if (el.getAttribute('aria-label')) desc += ' aria-label="' + el.getAttribute('aria-label') + '"';
    if (el.getAttribute('placeholder')) desc += ' placeholder="' + el.getAttribute('placeholder') + '"';
    if (el.getAttribute('type')) desc += ' type="' + el.getAttribute('type') + '"';
    if (el.getAttribute('href')) desc += ' href="' + (el.getAttribute('href') || '').substring(0, 50) + '"';
    var text = getElementText(el);
    if (text) desc += ' "' + text + '"';
    return desc;
  }

  function extractDOMTree() {
    var interactive = [];
    var selectorMap = {};
    var textMap = {};

    function walk(node, depth) {
      if (!node || depth > 30) return;
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.hasAttribute('data-x1-not-interactive')) return;

      if (isInteractive(node) && isVisible(node)) {
        var idx = interactive.length;
        node.setAttribute(HIGHLIGHT_ATTR, idx);
        interactive.push(node);
        selectorMap[idx] = node;
        textMap[idx] = getElementDescription(node);
      }

      var children = node.children;
      for (var i = 0; i < children.length; i++) {
        walk(children[i], depth + 1);
      }
    }

    walk(document.body, 0);
    return {
      elements: interactive,
      selectorMap: selectorMap,
      textMap: textMap,
      count: interactive.length
    };
  }

  function flatTreeToString(tree) {
    var lines = [];
    var entries = Object.keys(tree.textMap);
    for (var i = 0; i < entries.length; i++) {
      var idx = entries[i];
      var isNew = i >= entries.length - 3;
      lines.push('[' + idx + ']' + (isNew ? '*' : '') + tree.textMap[idx]);
    }
    return lines.join('\n');
  }

  function cleanHighlights() {
    var els = document.querySelectorAll('[' + HIGHLIGHT_ATTR + ']');
    for (var i = 0; i < els.length; i++) {
      els[i].removeAttribute(HIGHLIGHT_ATTR);
    }
  }

  // ═══════════════════════════════════════════
  // DOM ACTIONS (from page-agent actions.ts)
  // ═══════════════════════════════════════════

  function scrollIntoViewIfNeeded(el) {
    if (el.scrollIntoViewIfNeeded) {
      el.scrollIntoViewIfNeeded();
    } else {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function clickElement(element) {
    return new Promise(function(resolve) {
      scrollIntoViewIfNeeded(element);
      setTimeout(function() {
        var rect = element.getBoundingClientRect();
        var x = rect.left + rect.width / 2;
        var y = rect.top + rect.height / 2;
        var target = document.elementFromPoint(x, y) || element;

        var eventOpts = { bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y };

        target.dispatchEvent(new PointerEvent('pointerover', eventOpts));
        target.dispatchEvent(new PointerEvent('pointerenter', eventOpts));
        target.dispatchEvent(new MouseEvent('mouseover', eventOpts));
        target.dispatchEvent(new MouseEvent('mouseenter', eventOpts));
        target.dispatchEvent(new PointerEvent('pointerdown', eventOpts));
        target.dispatchEvent(new MouseEvent('mousedown', eventOpts));

        if (typeof target.focus === 'function') {
          try { target.focus(); } catch(e) {}
        }

        target.dispatchEvent(new PointerEvent('pointerup', eventOpts));
        target.dispatchEvent(new MouseEvent('mouseup', eventOpts));
        target.dispatchEvent(new MouseEvent('click', eventOpts));

        // Handle links
        if (element.tagName === 'A' && element.getAttribute('target') === '_blank') {
          var href = element.getAttribute('href');
          if (href && href.indexOf('http') === 0) {
            window.open(href, '_blank');
          }
        }

        resolve({ ok: true, action: 'click', description: getElementDescription(element) });
      }, 100);
    });
  }

  function inputText(element, text) {
    return new Promise(function(resolve) {
      scrollIntoViewIfNeeded(element);
      element.focus();

      setTimeout(function() {
        var tag = element.tagName.toLowerCase();
        var isContentEditable = element.getAttribute('contenteditable') === 'true';

        if (tag === 'input' || tag === 'textarea') {
          // Native value setter for React compatibility
          var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
          var nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');

          if (tag === 'input' && nativeInputValueSetter) {
            nativeInputValueSetter.set.call(element, text);
          } else if (tag === 'textarea' && nativeTextareaValueSetter) {
            nativeTextareaValueSetter.set.call(element, text);
          } else {
            element.value = text;
          }

          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (isContentEditable) {
          // Try execCommand first
          var ok = document.execCommand('insertText', false, text);
          if (!ok) {
            // Fallback: set textContent
            element.textContent = text;
            element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
          }
        }

        resolve({ ok: true, action: 'input', text: text, description: getElementDescription(element) });
      }, 50);
    });
  }

  function selectOption(element, optionText) {
    return new Promise(function(resolve) {
      var options = element.options;
      var found = false;
      for (var i = 0; i < options.length; i++) {
        if (options[i].text.toLowerCase().indexOf(optionText.toLowerCase()) !== -1 || options[i].value.toLowerCase().indexOf(optionText.toLowerCase()) !== -1) {
          element.selectedIndex = i;
          element.dispatchEvent(new Event('change', { bubbles: true }));
          found = true;
          break;
        }
      }
      resolve({ ok: found, action: 'select', value: found ? optionText : null, description: getElementDescription(element) });
    });
  }

  function scrollPage(options) {
    return new Promise(function(resolve) {
      var down = options.down !== false;
      var pixels = options.pixels || window.innerHeight * 0.8;
      var element = options.element || null;

      if (element) {
        var scrollable = findScrollableParent(element);
        if (scrollable) {
          scrollable.scrollBy({ top: down ? pixels : -pixels, behavior: 'smooth' });
          resolve({ ok: true, action: 'scroll', direction: down ? 'down' : 'up', pixels: pixels, target: 'element' });
          return;
        }
      }

      window.scrollBy({ top: down ? pixels : -pixels, behavior: 'smooth' });
      resolve({ ok: true, action: 'scroll', direction: down ? 'down' : 'up', pixels: pixels, target: 'page' });
    });
  }

  function findScrollableParent(el) {
    var current = el;
    while (current && current !== document.body) {
      if (isScrollable(current)) return current;
      current = current.parentElement;
    }
    return null;
  }

  function executeScript(script) {
    return new Promise(function(resolve) {
      try {
        var result = eval(script);
        resolve({ ok: true, action: 'execute', result: String(result) });
      } catch (e) {
        resolve({ ok: false, action: 'execute', error: e.message });
      }
    });
  }

  // ═══════════════════════════════════════════
  // PAGE INFO
  // ═══════════════════════════════════════════

  function getPageInfo() {
    var scrollY = window.scrollY || window.pageYOffset;
    var scrollHeight = document.documentElement.scrollHeight;
    var clientHeight = window.innerHeight;
    var pagesAbove = Math.floor(scrollY / clientHeight);
    var pagesBelow = Math.floor((scrollHeight - scrollY - clientHeight) / clientHeight);
    var position = scrollHeight > 0 ? Math.round((scrollY / (scrollHeight - clientHeight)) * 100) : 0;

    return {
      url: window.location.href,
      title: document.title,
      scrollY: scrollY,
      scrollHeight: scrollHeight,
      clientHeight: clientHeight,
      pagesAbove: pagesAbove,
      pagesBelow: pagesBelow,
      position: position
    };
  }

  function getBrowserState() {
    var tree = extractDOMTree();
    var info = getPageInfo();
    var text = flatTreeToString(tree);

    return {
      url: info.url,
      title: info.title,
      pageInfo: info,
      interactiveElements: tree.count,
      domText: text,
      selectorMap: tree.selectorMap,
      textMap: tree.textMap
    };
  }

  // ═══════════════════════════════════════════
  // AGENT LOOP (simplified from page-agent)
  // ═══════════════════════════════════════════

  function executeTask(task, aiFunction, maxSteps) {
    maxSteps = maxSteps || 20;
    var steps = [];
    var stepCount = 0;

    function runStep() {
      if (stepCount >= maxSteps) {
        return Promise.resolve({ ok: true, steps: steps, message: 'Max steps reached' });
      }

      var state = getBrowserState();
      stepCount++;

      var prompt = 'Task: ' + task + '\n\nCurrent page: ' + state.title + '\nURL: ' + state.url + '\n\nInteractive elements:\n' + state.domText + '\n\nWhat should I do next? Respond with JSON: {"action": "click|input|scroll|done", "index": number, "text": string}';

      return aiFunction(prompt).then(function(response) {
        if (!response) return { ok: false, error: 'No AI response' };

        var parsed;
        try {
          parsed = typeof response === 'string' ? JSON.parse(response) : response;
        } catch(e) {
          parsed = { action: 'speak', text: response };
        }

        if (parsed.action === 'done' || parsed.action === 'speak') {
          steps.push({ step: stepCount, action: 'done', result: parsed });
          return { ok: true, steps: steps, result: parsed };
        }

        var actionPromise;
        if (parsed.action === 'click' && parsed.index !== undefined) {
          var el = state.selectorMap[parsed.index];
          if (el) {
            actionPromise = clickElement(el);
          } else {
            actionPromise = Promise.resolve({ ok: false, error: 'Element not found at index ' + parsed.index });
          }
        } else if (parsed.action === 'input' && parsed.index !== undefined && parsed.text) {
          var el = state.selectorMap[parsed.index];
          if (el) {
            actionPromise = inputText(el, parsed.text);
          } else {
            actionPromise = Promise.resolve({ ok: false, error: 'Element not found at index ' + parsed.index });
          }
        } else if (parsed.action === 'scroll') {
          actionPromise = scrollPage({ down: parsed.down !== false, pixels: parsed.pixels });
        } else {
          actionPromise = Promise.resolve({ ok: false, error: 'Unknown action: ' + parsed.action });
        }

        return actionPromise.then(function(result) {
          steps.push({ step: stepCount, action: parsed.action, result: result });
          return new Promise(function(resolve) {
            setTimeout(function() { resolve(runStep()); }, 1500);
          });
        });
      });
    }

    return runStep();
  }

  // ═══════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════

  window.X1PageAgentBridge = {
    version: '1.0.0',
    license: 'MIT',
    source: 'https://github.com/alibaba/page-agent',
    stars: 20555,

    extractDOMTree: extractDOMTree,
    flatTreeToString: flatTreeToString,
    cleanHighlights: cleanHighlights,
    getPageInfo: getPageInfo,
    getBrowserState: getBrowserState,

    clickElement: clickElement,
    inputText: inputText,
    selectOption: selectOption,
    scrollPage: scrollPage,
    executeScript: executeScript,

    executeTask: executeTask,

    healthCheck: function() {
      return Promise.resolve({
        ok: true,
        version: '1.0.0',
        capabilities: ['dom_extraction', 'click', 'input', 'scroll', 'select', 'execute_script', 'agent_loop']
      });
    }
  };

  if (window.X1Integrations) {
    window.X1Integrations.register({
      name: 'page-agent',
      version: '1.0.0',
      license: 'MIT',
      path: 'background/integrations/page-agent/',
      description: 'DOM extraction + agent loop para controlar paginas web',
      healthCheck: function() { return window.X1PageAgentBridge.healthCheck(); },
      dependencies: []
    });
  }

  log.info('X1PageAgentBridge loaded');

})();
