/**
 * n0x-bridge.js — Adaptador de n0x para X1
 *
 * Search engines (DuckDuckGo, Wikipedia, SearXNG) + RAG basics.
 * Extrae el core de ixchio/n0x (25 stars).
 *
 * Licencia: MIT (n0x Contributors)
 * Fuente: https://github.com/ixchio/n0x
 */

(function() {
  'use strict';

  var log = {
    info: function(m) { console.log('[X1-n0x]', m); },
    warn: function(m) { console.warn('[X1-n0x]', m); },
    error: function(m) { console.error('[X1-n0x]', m); }
  };

  // ═══════════════════════════════════════════
  // SEARCH ENGINES
  // ═══════════════════════════════════════════

  function searchDuckDuckGo(query, options) {
    options = options || {};
    var maxResults = options.maxResults || 5;
    var url = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query);

    return fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      }
    })
    .then(function(response) { return response.text(); })
    .then(function(html) {
      var results = [];
      var regex = /class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      var snippetRegex = /class="result__snippet"[^>]*>([\s\S]*?)<\/[at]/gi;
      var match;
      while ((match = regex.exec(html)) !== null && results.length < maxResults) {
        var snippetMatch = snippetRegex.exec(html);
        results.push({
          title: match[2].replace(/<[^>]+>/g, '').trim(),
          url: match[1],
          snippet: snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '',
          engine: 'duckduckgo'
        });
      }
      return { ok: true, results: results, engine: 'duckduckgo' };
    })
    .catch(function(e) {
      log.warn('DuckDuckGo search failed: ' + e.message);
      return { ok: false, error: e.message, engine: 'duckduckgo' };
    });
  }

  function searchWikipedia(query, options) {
    options = options || {};
    var lang = options.language || 'es';
    var maxResults = options.maxResults || 3;
    var url = 'https://' + lang + '.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(query);

    return fetch(url, {
      headers: { 'Accept': 'application/json' }
    })
    .then(function(response) {
      if (!response.ok) throw new Error('Not found');
      return response.json();
    })
    .then(function(data) {
      var results = [{
        title: data.title || query,
        url: data.content_urls ? data.content_urls.desktop.page : 'https://' + lang + '.wikipedia.org/wiki/' + encodeURIComponent(query),
        snippet: data.extract || '',
        engine: 'wikipedia',
        thumbnail: data.thumbnail ? data.thumbnail.source : null
      }];
      return { ok: true, results: results, engine: 'wikipedia' };
    })
    .catch(function(e) {
      log.warn('Wikipedia search failed: ' + e.message);
      return { ok: false, error: e.message, engine: 'wikipedia' };
    });
  }

  function searchSearXNG(query, options) {
    options = options || {};
    var baseUrl = options.baseUrl || 'https://searx.be';
    var maxResults = options.maxResults || 5;
    var url = baseUrl + '/search?q=' + encodeURIComponent(query) + '&format=json';

    return fetch(url, {
      headers: { 'Accept': 'application/json' }
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
      var results = (data.results || []).slice(0, maxResults).map(function(r) {
        return {
          title: r.title || '',
          url: r.url || '',
          snippet: r.content || '',
          engine: 'searxng',
          score: r.score || 0
        };
      });
      return { ok: true, results: results, engine: 'searxng' };
    })
    .catch(function(e) {
      log.warn('SearXNG search failed: ' + e.message);
      return { ok: false, error: e.message, engine: 'searxng' };
    });
  }

  // ═══════════════════════════════════════════
  // UNIFIED SEARCH
  // ═══════════════════════════════════════════

  function search(query, options) {
    options = options || {};
    var engines = options.engines || ['duckduckgo', 'wikipedia'];
    var maxResults = options.maxResults || 10;

    var searchFns = {
      duckduckgo: searchDuckDuckGo,
      wikipedia: searchWikipedia,
      searxng: searchSearXNG
    };

    var promises = engines.map(function(name) {
      var fn = searchFns[name];
      if (!fn) return Promise.resolve({ ok: false, error: 'Unknown engine: ' + name });
      return fn(query, options);
    });

    return Promise.all(promises).then(function(engineResults) {
      var allResults = [];
      var seenUrls = {};

      engineResults.forEach(function(result) {
        if (result.ok && result.results) {
          result.results.forEach(function(r) {
            if (!seenUrls[r.url]) {
              seenUrls[r.url] = true;
              allResults.push(r);
            }
          });
        }
      });

      return { ok: true, results: allResults.slice(0, maxResults), engines: engines };
    });
  }

  // ═══════════════════════════════════════════
  // PAGE FETCH + EXTRACT
  // ═══════════════════════════════════════════

  function fetchPage(url, options) {
    options = options || {};
    var timeout = options.timeout || 10000;

    return fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      },
      signal: AbortSignal.timeout(timeout)
    })
    .then(function(response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    })
    .then(function(html) {
      var content = extractReadableContent(html);
      return { ok: true, url: url, content: content, length: content.length };
    })
    .catch(function(e) {
      return { ok: false, url: url, error: e.message };
    });
  }

  function extractReadableContent(html) {
    var div = document.createElement('div');
    div.innerHTML = html;

    // Remove noise
    var noiseSelectors = ['nav', 'footer', 'header', 'aside', '.sidebar', '.ads', '.cookie', 'script', 'style', 'noscript'];
    noiseSelectors.forEach(function(sel) {
      try {
        var els = div.querySelectorAll(sel);
        for (var i = els.length - 1; i >= 0; i--) {
          els[i].parentNode.removeChild(els[i]);
        }
      } catch(e) {}
    });

    // Try main content
    var mainSelectors = ['article', 'main', '[role="main"]', '.content', '.post'];
    for (var i = 0; i < mainSelectors.length; i++) {
      var el = div.querySelector(mainSelectors[i]);
      if (el && el.textContent.trim().length > 200) {
        return el.textContent.trim().substring(0, 5000);
      }
    }

    return div.textContent.trim().substring(0, 5000);
  }

  // ═══════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════

  self.X1N0xBridge = {
    version: '1.0.0',
    license: 'MIT',
    source: 'https://github.com/ixchio/n0x',
    stars: 25,

    search: search,
    searchDuckDuckGo: searchDuckDuckGo,
    searchWikipedia: searchWikipedia,
    searchSearXNG: searchSearXNG,
    fetchPage: fetchPage,
    extractContent: extractReadableContent,

    engines: ['duckduckgo', 'wikipedia', 'searxng'],

    healthCheck: function() {
      return Promise.resolve({
        ok: true,
        version: '1.0.0',
        engines: ['duckduckgo', 'wikipedia', 'searxng'],
        capabilities: ['search', 'fetch', 'content_extraction']
      });
    }
  };

  if (self.X1Integrations) {
    self.X1Integrations.register({
      name: 'n0x',
      version: '1.0.0',
      license: 'MIT',
      path: 'background/integrations/n0x/',
      description: 'Search engines + RAG basics para X1',
      healthCheck: function() { return self.X1N0xBridge.healthCheck(); },
      dependencies: []
    });
  }

  log.info('X1N0xBridge loaded');

})();
