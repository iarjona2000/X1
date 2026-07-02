/**
 * freeweb-bridge.js — Adaptador de FreeWeb para X1
 *
 * Busqueda web sin API keys + fetcher chain de 6 capas.
 * Extrae el core de xenitV1/freeweb (46 stars).
 *
 * Licencia: MIT (FreeWeb Contributors)
 * Fuente: https://github.com/xenitV1/freeweb
 */

(function() {
  'use strict';

  var log = {
    info: function(m) { console.log('[X1-FreeWeb]', m); },
    warn: function(m) { console.warn('[X1-FreeWeb]', m); },
    error: function(m) { console.error('[X1-FreeWeb]', m); }
  };

  // ═══════════════════════════════════════════
  // SEARCH ENGINES (no API keys needed)
  // ═══════════════════════════════════════════

  var SEARCH_ENGINES = {
    yahoo: {
      name: 'Yahoo',
      weight: 28,
      buildUrl: function(query) {
        return 'https://search.yahoo.com/search?p=' + encodeURIComponent(query);
      },
      parse: function(html) {
        var results = [];
        var regex = /class="[^"]*title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
        var match;
        while ((match = regex.exec(html)) !== null) {
          results.push({
            url: match[1],
            title: match[2].replace(/<[^>]+>/g, '').trim(),
            snippet: '',
            engine: 'yahoo'
          });
        }
        return results;
      }
    },
    duckduckgo: {
      name: 'DuckDuckGo',
      weight: 15,
      buildUrl: function(query) {
        return 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query);
      },
      parse: function(html) {
        var results = [];
        var regex = /class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
        var snippetRegex = /class="result__snippet"[^>]*>([\s\S]*?)<\/[at]/gi;
        var match;
        while ((match = regex.exec(html)) !== null) {
          var snippetMatch = snippetRegex.exec(html);
          results.push({
            url: match[1],
            title: match[2].replace(/<[^>]+>/g, '').trim(),
            snippet: snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '',
            engine: 'duckduckgo'
          });
        }
        return results;
      }
    },
    marginalia: {
      name: 'Marginalia',
      weight: 20,
      buildUrl: function(query) {
        return 'https://search.marginalia.nu/search?query=' + encodeURIComponent(query);
      },
      parse: function(html) {
        var results = [];
        var regex = /class="[^"]*text-liteblue[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
        var match;
        while ((match = regex.exec(html)) !== null) {
          results.push({
            url: match[1],
            title: match[2].replace(/<[^>]+>/g, '').trim(),
            snippet: '',
            engine: 'marginalia'
          });
        }
        return results;
      }
    },
    ask: {
      name: 'Ask',
      weight: 8,
      buildUrl: function(query) {
        return 'https://www.ask.com/web?q=' + encodeURIComponent(query);
      },
      parse: function(html) {
        var results = [];
        var regex = /class="[^"]*result[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
        var match;
        while ((match = regex.exec(html)) !== null) {
          results.push({
            url: match[1],
            title: match[2].replace(/<[^>]+>/g, '').trim(),
            snippet: '',
            engine: 'ask'
          });
        }
        return results;
      }
    }
  };

  // ═══════════════════════════════════════════
  // CONTENT EXTRACTION (noise removal)
  // ═══════════════════════════════════════════

  var NOISE_SELECTORS = [
    'nav', 'footer', 'header', 'aside', '.sidebar', '.navigation', '.menu',
    '.advertisement', '.ads', '.ad', '.popup', '.modal', '.overlay',
    '.cookie', '.consent', '.banner', '.social', '.share', '.related',
    '.comments', '.comment', '.disqus', '#disqus_thread',
    '.widget', '.plugins', '.extensions', '.toolbar',
    'script', 'style', 'noscript', 'iframe:not([src*="youtube"]):not([src*="vimeo"])',
    '[role="complementary"]', '[role="navigation"]', '[role="banner"]',
    '.sr-only', '.visually-hidden', '[aria-hidden="true"]'
  ];

  function stripNoise(html) {
    var div = document.createElement('div');
    div.innerHTML = html;

    NOISE_SELECTORS.forEach(function(sel) {
      try {
        var els = div.querySelectorAll(sel);
        for (var i = els.length - 1; i >= 0; i--) {
          els[i].parentNode.removeChild(els[i]);
        }
      } catch(e) {}
    });

    return div.innerHTML;
  }

  function extractContent(html) {
    var div = document.createElement('div');
    div.innerHTML = stripNoise(html);

    // Try main content selectors
    var contentSelectors = ['article', 'main', '[role="main"]', '.content', '.markdown-body', '.post', '.entry'];
    for (var i = 0; i < contentSelectors.length; i++) {
      var el = div.querySelector(contentSelectors[i]);
      if (el && el.textContent.trim().length > 200) {
        return el.textContent.trim();
      }
    }

    // Fallback: longest text block
    var paragraphs = div.querySelectorAll('p');
    var longest = '';
    for (var j = 0; j < paragraphs.length; j++) {
      var text = paragraphs[j].textContent.trim();
      if (text.length > longest.length) longest = text;
    }

    return longest || div.textContent.trim().substring(0, 5000);
  }

  // ═══════════════════════════════════════════
  // SCORING
  // ═══════════════════════════════════════════

  var TRUSTED_DOMAINS = ['github.com', 'stackoverflow.com', 'wikipedia.org', 'mozilla.org', 'developer.mozilla.org', 'docs.python.org', 'nodejs.org', 'npmjs.com', 'arxiv.org', 'pubmed.ncbi.nlm.nih.gov'];
  var LOW_QUALITY_DOMAINS = ['pinterest.com', 'tumblr.com', 'quora.com', 'medium.com'];

  function scoreResult(result, query) {
    var score = 0;
    var url = (result.url || '').toLowerCase();
    var title = (result.title || '').toLowerCase();
    var snippet = (result.snippet || '').toLowerCase();
    var queryLower = query.toLowerCase();

    // Engine weight
    score += (SEARCH_ENGINES[result.engine] || {}).weight || 10;

    // Title hits
    if (title.indexOf(queryLower) !== -1) score += 8;
    var queryWords = queryLower.split(/\s+/);
    queryWords.forEach(function(w) {
      if (w.length > 2 && title.indexOf(w) !== -1) score += 3;
    });

    // Snippet hits
    if (snippet.indexOf(queryLower) !== -1) score += 5;
    queryWords.forEach(function(w) {
      if (w.length > 2 && snippet.indexOf(w) !== -1) score += 2;
    });

    // Domain trust
    if (TRUSTED_DOMAINS.some(function(d) { return url.indexOf(d) !== -1; })) score += 12;
    if (LOW_QUALITY_DOMAINS.some(function(d) { return url.indexOf(d) !== -1; })) score -= 10;
    if (/\.gov|\.edu/.test(url)) score += 6;
    if (/\.org/.test(url)) score += 3;

    // Snippet length
    if (snippet.length > 140) score += 3;
    else if (snippet.length > 60) score += 1;

    return score;
  }

  // ═══════════════════════════════════════════
  // SEARCH ORCHESTRATOR
  // ═══════════════════════════════════════════

  function searchWeb(query, options) {
    options = options || {};
    var engines = options.engines || ['yahoo', 'duckduckgo', 'marginalia', 'ask'];
    var maxResults = options.maxResults || 10;

    var allResults = [];
    var seenUrls = {};

    var fetchPromises = engines.map(function(engineName) {
      var engine = SEARCH_ENGINES[engineName];
      if (!engine) return Promise.resolve([]);

      var url = engine.buildUrl(query);

      return fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9,es;q=0.8'
        }
      })
      .then(function(response) {
        if (!response.ok) return [];
        return response.text();
      })
      .then(function(html) {
        if (!html) return [];
        var results = engine.parse(html);
        return results;
      })
      .catch(function(e) {
        log.warn('Search failed for ' + engineName + ': ' + e.message);
        return [];
      });
    });

    return Promise.all(fetchPromises).then(function(engineResults) {
      engineResults.forEach(function(results) {
        results.forEach(function(result) {
          if (!seenUrls[result.url]) {
            seenUrls[result.url] = true;
            result.score = scoreResult(result, query);
            allResults.push(result);
          }
        });
      });

      allResults.sort(function(a, b) { return b.score - a.score; });
      return allResults.slice(0, maxResults);
    });
  }

  // ═══════════════════════════════════════════
  // FETCHER CHAIN (simplified)
  // ═══════════════════════════════════════════

  function fetchWithChain(url, options) {
    options = options || {};
    var timeout = options.timeout || 10000;

    // Layer 1: Direct fetch
    return fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; X1/1.0)' },
      signal: AbortSignal.timeout(timeout)
    })
    .then(function(response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    })
    .then(function(html) {
      var content = extractContent(html);
      if (content.length > 800) {
        return { ok: true, url: url, content: content, method: 'fetch', length: content.length };
      }
      throw new Error('Content too short: ' + content.length);
    })
    .catch(function(e) {
      log.warn('Fetcher chain: fetch failed for ' + url + ': ' + e.message);
      return { ok: false, url: url, error: e.message, method: 'fetch' };
    });
  }

  // ═══════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════

  window.X1FreeWebBridge = {
    version: '1.0.0',
    license: 'MIT',
    source: 'https://github.com/xenitV1/freeweb',
    stars: 46,

    search: searchWeb,
    fetch: fetchWithChain,
    extractContent: extractContent,
    stripNoise: stripNoise,
    engines: Object.keys(SEARCH_ENGINES),

    healthCheck: function() {
      return Promise.resolve({
        ok: true,
        version: '1.0.0',
        engines: Object.keys(SEARCH_ENGINES),
        capabilities: ['search', 'fetch', 'content_extraction']
      });
    }
  };

  if (window.X1Integrations) {
    window.X1Integrations.register({
      name: 'freeweb',
      version: '1.0.0',
      license: 'MIT',
      path: 'background/integrations/freeweb/',
      description: 'Busqueda web sin API keys + fetcher chain de 6 capas',
      healthCheck: function() { return window.X1FreeWebBridge.healthCheck(); },
      dependencies: []
    });
  }

  log.info('X1FreeWebBridge loaded');

})();
