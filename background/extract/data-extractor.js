var X1DataExtractor = (function() {

  function extractFromPage(tabId, schema) {
    return new Promise(function(resolve, reject) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: function() {
          var result = {};
          result.title = document.title;
          result.url = location.href;
          result.text = document.body ? document.body.innerText.substring(0, 10000) : '';
          result.meta = {};
          var metas = document.querySelectorAll('meta[name], meta[property]');
          for (var i = 0; i < metas.length; i++) {
            var name = metas[i].getAttribute('name') || metas[i].getAttribute('property');
            if (name) result.meta[name] = metas[i].getAttribute('content') || '';
          }
          result.links = [];
          var anchors = document.querySelectorAll('a[href]');
          for (var j = 0; j < Math.min(anchors.length, 50); j++) {
            result.links.push({ text: anchors[j].textContent.trim().substring(0, 100), href: anchors[j].href });
          }
          result.images = [];
          var imgs = document.querySelectorAll('img[src]');
          for (var k = 0; k < Math.min(imgs.length, 20); k++) {
            result.images.push({ src: imgs[k].src, alt: imgs[k].alt || '' });
          }
          result.tables = [];
          var tables = document.querySelectorAll('table');
          for (var t = 0; t < Math.min(tables.length, 5); t++) {
            var rows = [];
            var trs = tables[t].querySelectorAll('tr');
            for (var r = 0; r < Math.min(trs.length, 50); r++) {
              var cells = [];
              var tds = trs[r].querySelectorAll('td, th');
              for (var c = 0; c < tds.length; c++) {
                cells.push(tds[c].textContent.trim().substring(0, 200));
              }
              rows.push(cells);
            }
            result.tables.push(rows);
          }
          return result;
        }
      }, function(results) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        var pageData = results && results[0] && results[0].result;
        if (!pageData) { reject(new Error('NO_PAGE_DATA')); return; }
        if (schema) {
          resolve(applySchema(pageData, schema));
        } else {
          resolve(pageData);
        }
      });
    });
  }

  function applySchema(data, schema) {
    var result = {};
    Object.keys(schema).forEach(function(field) {
      var rule = schema[field];
      if (typeof rule === 'string') {
        if (rule === 'title') result[field] = data.title;
        else if (rule === 'url') result[field] = data.url;
        else if (rule === 'text') result[field] = data.text;
        else if (rule === 'links') result[field] = data.links;
        else if (rule === 'images') result[field] = data.images;
        else if (rule === 'tables') result[field] = data.tables;
        else {
          var match = findInText(data.text, rule);
          result[field] = match;
        }
      } else if (rule && rule.selector) {
        result[field] = extractBySelector(data, rule);
      }
    });
    return result;
  }

  function findInText(text, pattern) {
    if (!text || !pattern) return null;
    try {
      var re = new RegExp(pattern, 'i');
      var match = text.match(re);
      return match ? match[0] : null;
    } catch(e) {
      var idx = text.toLowerCase().indexOf(pattern.toLowerCase());
      if (idx === -1) return null;
      return text.substring(idx, idx + pattern.length + 200);
    }
  }

  function extractBySelector(data, rule) {
    return null;
  }

  function extractWithAI(tabId, query) {
    return extractFromPage(tabId).then(function(pageData) {
      var prompt = 'Extract the following from this page data:\n' +
        'Query: ' + query + '\n\n' +
        'Page title: ' + pageData.title + '\n' +
        'Page URL: ' + pageData.url + '\n' +
        'Page text (first 3000 chars): ' + pageData.text.substring(0, 3000) + '\n\n' +
        'Return ONLY a JSON object with the extracted data. No explanation.';
      if (typeof aiComplete === 'function') {
        return aiComplete('You are a data extraction assistant. Return only valid JSON.', prompt, { maxTokens: 500, temperature: 0.1 })
          .then(function(text) {
            try {
              var cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
              return JSON.parse(cleaned);
            } catch(e) {
              return { raw: text, query: query };
            }
          });
      }
      return { pageData: pageData, query: query };
    });
  }

  function extractEmails(text) {
    if (!text) return [];
    var matches = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g);
    return matches ? Array.from(new Set(matches)) : [];
  }

  function extractPhones(text) {
    if (!text) return [];
    var matches = text.match(/[\+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}/g);
    return matches ? matches.filter(function(p) { return p.replace(/\D/g, '').length >= 7; }) : [];
  }

  function extractPrices(text) {
    if (!text) return [];
    var matches = text.match(/[$€£¥]\s?[\d,.]+|\d+[.,]\d{2}\s?(?:USD|EUR|GBP|JPY)/gi);
    return matches || [];
  }

  function extractDates(text) {
    if (!text) return [];
    var patterns = [
      /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g,
      /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/g,
      /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}/gi,
      /\d{1,2} (?:de )?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?: de)? \d{4}/gi
    ];
    var results = [];
    patterns.forEach(function(p) {
      var m = text.match(p);
      if (m) results = results.concat(m);
    });
    return results;
  }

  return {
    extractFromPage: extractFromPage,
    extractWithAI: extractWithAI,
    extractEmails: extractEmails,
    extractPhones: extractPhones,
    extractPrices: extractPrices,
    extractDates: extractDates,
    applySchema: applySchema
  };
})();
