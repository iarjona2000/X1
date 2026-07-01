var X1DeepResearch = (function() {
  var SEARCH_ENGINE = 'https://www.google.com/search?q=';
  var MAX_STEPS = 8;
  var MAX_SOURCES = 10;

  function research(query, options) {
    var opts = options || {};
    var maxSteps = opts.maxSteps || MAX_STEPS;
    var tabId = opts.tabId;
    var depth = opts.depth || 'standard';

    if (!tabId) return Promise.reject(new Error('TAB_ID_REQUIRED'));

    var state = {
      query: query,
      sources: [],
      findings: [],
      step: 0,
      searchQueries: [query],
      startTime: Date.now()
    };

    return generateSearchQueries(query, depth).then(function(queries) {
      state.searchQueries = queries;
      return executeResearchLoop(state, tabId, maxSteps);
    });
  }

  function generateSearchQueries(query, depth) {
    var queries = [query];
    if (depth === 'deep' || depth === 'thorough') {
      var expansions = [
        query + ' research',
        query + ' analysis',
        query + ' comparison',
        query + ' statistics data',
        query + ' expert opinion'
      ];
      if (depth === 'thorough') {
        expansions.push(query + ' case study');
        expansions.push(query + ' pros cons');
        expansions.push(query + ' latest news ' + new Date().getFullYear());
      }
      queries = queries.concat(expansions);
    }
    return Promise.resolve(queries);
  }

  function executeResearchLoop(state, tabId, maxSteps) {
    if (state.step >= maxSteps || state.step >= state.searchQueries.length) {
      return synthesize(state);
    }

    var currentQuery = state.searchQueries[state.step];
    state.step++;

    if (typeof stepProgress === 'function') {
      stepProgress(tabId, 'Google', 'Searching: ' + currentQuery.substring(0, 50), 'active');
    }

    return searchAndExtract(tabId, currentQuery).then(function(results) {
      results.forEach(function(r) {
        if (r && r.text && state.sources.length < MAX_SOURCES) {
          state.sources.push({
            url: r.url || '',
            title: r.title || '',
            snippet: r.text.substring(0, 500),
            query: currentQuery
          });
        }
      });
      return executeResearchLoop(state, tabId, maxSteps);
    }).catch(function() {
      return executeResearchLoop(state, tabId, maxSteps);
    });
  }

  function searchAndExtract(tabId, query) {
    var searchUrl = SEARCH_ENGINE + encodeURIComponent(query);
    return navigateAndWait(tabId, searchUrl, 3000).then(function() {
      return extractSearchResults(tabId);
    });
  }

  function navigateAndWait(tabId, url, waitMs) {
    return new Promise(function(resolve) {
      chrome.tabs.update(tabId, { url: url }, function() {
        setTimeout(resolve, waitMs || 3000);
      });
    });
  }

  function extractSearchResults(tabId) {
    return new Promise(function(resolve) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: function() {
          var results = [];
          var items = document.querySelectorAll('.g, .tF2Cxc, [data-hveid]');
          for (var i = 0; i < Math.min(items.length, 5); i++) {
            var link = items[i].querySelector('a[href]');
            var snippet = items[i].querySelector('.VwiC3b, .st, .IsZvec');
            var title = items[i].querySelector('h3');
            if (link && (snippet || title)) {
              results.push({
                url: link.href,
                title: title ? title.textContent : '',
                text: snippet ? snippet.textContent : ''
              });
            }
          }
          return results;
        }
      }, function(r) {
        if (chrome.runtime.lastError || !r || !r[0]) { resolve([]); return; }
        resolve(r[0].result || []);
      });
    });
  }

  function visitAndExtract(tabId, url) {
    return navigateAndWait(tabId, url, 4000).then(function() {
      return new Promise(function(resolve) {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: function() {
            var article = document.querySelector('article, [role="main"], main, .content, .post');
            var text = article ? article.innerText : (document.body ? document.body.innerText : '');
            return {
              url: location.href,
              title: document.title,
              text: text.substring(0, 5000)
            };
          }
        }, function(r) {
          if (chrome.runtime.lastError || !r || !r[0]) { resolve(null); return; }
          resolve(r[0].result);
        });
      });
    });
  }

  function synthesize(state) {
    var sourceSummary = state.sources.map(function(s, i) {
      return (i + 1) + '. [' + s.title + '] ' + s.snippet;
    }).join('\n');

    var prompt = 'Research query: ' + state.query + '\n\n' +
      'Sources found (' + state.sources.length + '):\n' + sourceSummary + '\n\n' +
      'Synthesize these sources into a comprehensive research report. Include:\n' +
      '1. Key findings\n2. Common themes\n3. Contradictions or debates\n4. Conclusion\n' +
      'Cite source numbers [1], [2], etc. Be thorough but concise.';

    var result = {
      query: state.query,
      sources: state.sources,
      steps: state.step,
      duration: Date.now() - state.startTime
    };

    if (typeof aiComplete === 'function') {
      return aiComplete('You are a research synthesis assistant.', prompt, { maxTokens: 1000, temperature: 0.3 })
        .then(function(synthesis) {
          result.synthesis = synthesis;
          return result;
        })
        .catch(function() {
          result.synthesis = 'Synthesis unavailable. Raw sources collected: ' + state.sources.length;
          return result;
        });
    }

    result.synthesis = sourceSummary;
    return Promise.resolve(result);
  }

  function quickSearch(tabId, query) {
    return searchAndExtract(tabId, query);
  }

  return {
    research: research,
    quickSearch: quickSearch,
    visitAndExtract: visitAndExtract,
    synthesize: synthesize
  };
})();
