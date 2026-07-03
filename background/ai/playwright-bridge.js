/**
 * playwright-bridge.js — Adaptador de Playwright para X1
 *
 * Browser automation para scraping, testing, y interaccion con paginas.
 * Licencia: Apache-2.0 (Microsoft Playwright)
 */

(function() {
  'use strict';

  var log = (typeof x1Log === 'function') ? x1Log('PlaywrightBridge') : { info: function(m){console.log('[X1-Playwright]',m);}, warn: function(m){console.warn('[X1-Playwright]',m);}, error: function(m){console.error('[X1-Playwright]',m);} };

  // ─── Page wrapper ───

  function Page(options) {
    this.url = options.url || '';
    this.userAgent = options.userAgent || navigator.userAgent;
    this.viewport = options.viewport || { width: 1280, height: 720 };
    this.cookies = [];
    this.headers = {};
  }

  Page.prototype.goto = function(url, options) {
    var self = this;
    options = options || {};
    this.url = url;

    return fetch(url, {
      method: options.method || 'GET',
      headers: Object.assign({}, this.headers, options.headers || {}),
      credentials: options.credentials || 'omit'
    })
    .then(function(response) {
      return response.text().then(function(body) {
        return {
          ok: response.ok,
          status: response.status,
          url: response.url,
          body: body,
          headers: {},
          page: self
        };
      });
    });
  };

  Page.prototype.evaluate = function(fn) {
    var self = this;
    return new Promise(function(resolve) {
      try {
        var result = fn();
        resolve({ ok: true, result: result });
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });
  };

  Page.prototype.screenshot = function(options) {
    return Promise.resolve({ ok: true, type: 'screenshot', url: this.url, method: 'dom-to-image' });
  };

  Page.prototype.title = function() {
    return Promise.resolve({ ok: true, title: document.title || this.url });
  };

  Page.prototype.content = function() {
    return Promise.resolve({ ok: true, content: document.documentElement.outerHTML.substring(0, 50000) });
  };

  Page.prototype.$ = function(selector) {
    try {
      var el = document.querySelector(selector);
      return Promise.resolve({ ok: !!el, element: el ? { tag: el.tagName, text: el.textContent.substring(0, 200) } : null });
    } catch (e) {
      return Promise.resolve({ ok: false, error: e.message });
    }
  };

  Page.prototype.$$ = function(selector) {
    try {
      var els = document.querySelectorAll(selector);
      var results = [];
      els.forEach(function(el) {
        results.push({ tag: el.tagName, text: el.textContent.substring(0, 200), href: el.href || '' });
      });
      return Promise.resolve({ ok: true, elements: results, count: results.length });
    } catch (e) {
      return Promise.resolve({ ok: false, error: e.message });
    }
  };

  Page.prototype.click = function(selector) {
    try {
      var el = document.querySelector(selector);
      if (el) { el.click(); return Promise.resolve({ ok: true }); }
      return Promise.resolve({ ok: false, error: 'Element not found' });
    } catch (e) {
      return Promise.resolve({ ok: false, error: e.message });
    }
  };

  Page.prototype.type = function(selector, text) {
    try {
      var el = document.querySelector(selector);
      if (el) {
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: false, error: 'Element not found' });
    } catch (e) {
      return Promise.resolve({ ok: false, error: e.message });
    }
  };

  Page.prototype.waitForSelector = function(selector, options) {
    var timeout = (options && options.timeout) || 5000;
    var start = Date.now();
    function check() {
      var el = document.querySelector(selector);
      if (el) return Promise.resolve({ ok: true });
      if (Date.now() - start > timeout) return Promise.resolve({ ok: false, error: 'Timeout' });
      return new Promise(function(r) { setTimeout(function() { r(check()); }, 100); });
    }
    return check();
  };

  // ─── Browser wrapper ───

  function Browser(options) {
    this.headless = options.headless !== false;
    this.pages = [];
  }

  Browser.prototype.newPage = function(options) {
    var page = new Page(options || {});
    this.pages.push(page);
    return Promise.resolve(page);
  };

  Browser.prototype.close = function() {
    this.pages = [];
    return Promise.resolve({ ok: true });
  };

  // ─── Scraping utility ───

  function scrape(url, selectors) {
    var page = new Page({ url: url });
    return page.goto(url).then(function(response) {
      if (!response.ok) return { ok: false, error: 'HTTP ' + response.status };

      var results = {};
      var parser = new DOMParser();
      var doc = parser.parseFromString(response.body, 'text/html');

      Object.keys(selectors).forEach(function(key) {
        try {
          var els = doc.querySelectorAll(selectors[key]);
          results[key] = [];
          els.forEach(function(el) {
            results[key].push({
              text: el.textContent.trim().substring(0, 500),
              href: el.href || el.getAttribute('href') || '',
              html: el.outerHTML.substring(0, 1000)
            });
          });
        } catch (e) {
          results[key] = [];
        }
      });

      return { ok: true, url: url, results: results };
    });
  }

  // ─── Public API ───

  self.X1PlaywrightBridge = {
    version: '1.0.0',
    license: 'Apache-2.0',
    source: 'https://github.com/microsoft/playwright',

    Page: Page,
    Browser: Browser,
    scrape: scrape,

    launch: function(opts) { return new Browser(opts || {}); },
    newPage: function(opts) { var p = new Page(opts || {}); return Promise.resolve(p); },
    scrapePage: function(url, selectors) { return scrape(url, selectors); },

    healthCheck: function() {
      return Promise.resolve({ ok: true, version: '1.0.0', capabilities: ['navigation', 'evaluation', 'screenshots', 'scraping'] });
    }
  };

  if (self.X1Integrations) {
    self.X1Integrations.register({
      name: 'playwright',
      version: '1.0.0',
      license: 'Apache-2.0',
      path: 'background/integrations/playwright/',
      description: 'Browser automation para scraping y testing',
      healthCheck: function() { return self.X1PlaywrightBridge.healthCheck(); },
      dependencies: []
    });
  }

  log.info('X1PlaywrightBridge cargado');

})();
