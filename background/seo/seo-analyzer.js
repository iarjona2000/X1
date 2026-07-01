var X1SEOAnalyzer = (function() {

  function analyze(tabId) {
    return new Promise(function(resolve, reject) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: function() {
          var r = {};
          r.url = location.href;
          r.title = document.title || '';
          r.titleLength = r.title.length;
          var metaDesc = document.querySelector('meta[name="description"]');
          r.description = metaDesc ? metaDesc.getAttribute('content') || '' : '';
          r.descriptionLength = r.description.length;
          var canonical = document.querySelector('link[rel="canonical"]');
          r.canonical = canonical ? canonical.href : '';
          r.hasCanonical = !!canonical;
          r.h1 = [];
          document.querySelectorAll('h1').forEach(function(el) { r.h1.push(el.textContent.trim()); });
          r.h2 = [];
          document.querySelectorAll('h2').forEach(function(el) { r.h2.push(el.textContent.trim()); });
          r.h3Count = document.querySelectorAll('h3').length;
          r.h4Count = document.querySelectorAll('h4').length;
          var imgs = document.querySelectorAll('img');
          r.totalImages = imgs.length;
          r.imagesWithoutAlt = 0;
          imgs.forEach(function(img) { if (!img.alt || img.alt.trim() === '') r.imagesWithoutAlt++; });
          var links = document.querySelectorAll('a[href]');
          r.totalLinks = links.length;
          r.internalLinks = 0;
          r.externalLinks = 0;
          r.nofollowLinks = 0;
          var host = location.hostname;
          links.forEach(function(a) {
            if (a.hostname === host) r.internalLinks++;
            else r.externalLinks++;
            if (a.rel && a.rel.indexOf('nofollow') !== -1) r.nofollowLinks++;
          });
          r.hasViewport = !!document.querySelector('meta[name="viewport"]');
          r.hasCharset = !!document.querySelector('meta[charset]') || !!document.querySelector('meta[http-equiv="Content-Type"]');
          r.hasRobots = !!document.querySelector('meta[name="robots"]');
          var robotsMeta = document.querySelector('meta[name="robots"]');
          r.robotsContent = robotsMeta ? robotsMeta.getAttribute('content') || '' : '';
          r.hasHreflang = document.querySelectorAll('link[hreflang]').length > 0;
          r.ogTags = {};
          document.querySelectorAll('meta[property^="og:"]').forEach(function(m) {
            r.ogTags[m.getAttribute('property')] = m.getAttribute('content') || '';
          });
          r.twitterTags = {};
          document.querySelectorAll('meta[name^="twitter:"]').forEach(function(m) {
            r.twitterTags[m.getAttribute('name')] = m.getAttribute('content') || '';
          });
          r.hasStructuredData = document.querySelectorAll('script[type="application/ld+json"]').length > 0;
          r.structuredDataCount = document.querySelectorAll('script[type="application/ld+json"]').length;
          var text = document.body ? document.body.innerText : '';
          r.wordCount = text.split(/\s+/).filter(function(w) { return w.length > 0; }).length;
          r.hasHTTPS = location.protocol === 'https:';
          r.language = document.documentElement.lang || '';
          return r;
        }
      }, function(results) {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        var data = results && results[0] && results[0].result;
        if (!data) { reject(new Error('SEO_EXTRACTION_FAILED')); return; }
        resolve(generateReport(data));
      });
    });
  }

  function generateReport(data) {
    var score = 100;
    var issues = [];
    var warnings = [];
    var passed = [];

    if (!data.title) { score -= 15; issues.push('Missing page title'); }
    else if (data.titleLength < 30) { score -= 5; warnings.push('Title too short (' + data.titleLength + ' chars, recommend 50-60)'); }
    else if (data.titleLength > 60) { score -= 3; warnings.push('Title too long (' + data.titleLength + ' chars, recommend 50-60)'); }
    else { passed.push('Title length OK (' + data.titleLength + ')'); }

    if (!data.description) { score -= 10; issues.push('Missing meta description'); }
    else if (data.descriptionLength < 120) { score -= 3; warnings.push('Meta description short (' + data.descriptionLength + ' chars, recommend 150-160)'); }
    else if (data.descriptionLength > 160) { score -= 2; warnings.push('Meta description long (' + data.descriptionLength + ')'); }
    else { passed.push('Meta description length OK'); }

    if (data.h1.length === 0) { score -= 10; issues.push('No H1 tag found'); }
    else if (data.h1.length > 1) { score -= 5; warnings.push('Multiple H1 tags (' + data.h1.length + ')'); }
    else { passed.push('Single H1 tag present'); }

    if (!data.hasCanonical) { score -= 5; warnings.push('No canonical URL set'); }
    else { passed.push('Canonical URL set'); }

    if (data.imagesWithoutAlt > 0) {
      score -= Math.min(10, data.imagesWithoutAlt * 2);
      issues.push(data.imagesWithoutAlt + ' images without alt text');
    } else if (data.totalImages > 0) { passed.push('All images have alt text'); }

    if (!data.hasHTTPS) { score -= 10; issues.push('Not using HTTPS'); }
    else { passed.push('HTTPS enabled'); }

    if (!data.hasViewport) { score -= 5; issues.push('Missing viewport meta tag'); }
    else { passed.push('Viewport meta present'); }

    if (data.wordCount < 300) { score -= 5; warnings.push('Low word count (' + data.wordCount + ', recommend 300+)'); }
    else { passed.push('Good content length (' + data.wordCount + ' words)'); }

    if (Object.keys(data.ogTags).length === 0) { score -= 3; warnings.push('No Open Graph tags'); }
    else { passed.push('Open Graph tags present'); }

    if (!data.hasStructuredData) { score -= 3; warnings.push('No structured data (JSON-LD)'); }
    else { passed.push('Structured data found (' + data.structuredDataCount + ')'); }

    if (!data.language) { score -= 3; warnings.push('No lang attribute on html'); }
    else { passed.push('Language set: ' + data.language); }

    return {
      url: data.url,
      score: Math.max(0, score),
      grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
      issues: issues,
      warnings: warnings,
      passed: passed,
      details: {
        title: data.title,
        description: data.description,
        h1: data.h1,
        h2: data.h2,
        images: { total: data.totalImages, withoutAlt: data.imagesWithoutAlt },
        links: { total: data.totalLinks, internal: data.internalLinks, external: data.externalLinks },
        wordCount: data.wordCount,
        ogTags: data.ogTags,
        structuredData: data.hasStructuredData
      }
    };
  }

  function comparePages(tabId1, tabId2) {
    return Promise.all([analyze(tabId1), analyze(tabId2)]).then(function(results) {
      return {
        page1: results[0],
        page2: results[1],
        scoreDiff: results[0].score - results[1].score,
        page1Better: results[0].score > results[1].score
      };
    });
  }

  return {
    analyze: analyze,
    comparePages: comparePages,
    generateReport: generateReport
  };
})();
