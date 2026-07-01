var X1FinancialData = (function() {
  var FINNHUB_BASE = 'https://finnhub.io/api/v1';
  var ALPHA_BASE = 'https://www.alphavantage.co/query';
  var CACHE = {};
  var CACHE_TTL = 60000;

  function getFinnhubKey() { return (typeof aiKeys !== 'undefined' && aiKeys.finnhubKey) || ''; }
  function getAlphaKey() { return (typeof aiKeys !== 'undefined' && aiKeys.alphaVantageKey) || ''; }

  function cachedFetch(url, ttl) {
    var now = Date.now();
    if (CACHE[url] && (now - CACHE[url].time) < (ttl || CACHE_TTL)) {
      return Promise.resolve(CACHE[url].data);
    }
    return fetch(url, { signal: AbortSignal.timeout(15000) })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        CACHE[url] = { data: data, time: now };
        return data;
      });
  }

  function getQuote(symbol) {
    var key = getFinnhubKey();
    if (!key) return Promise.reject(new Error('FINNHUB_KEY_NOT_SET'));
    var url = FINNHUB_BASE + '/quote?symbol=' + encodeURIComponent(symbol.toUpperCase()) + '&token=' + key;
    return cachedFetch(url).then(function(data) {
      if (!data || data.c === 0) return Promise.reject(new Error('QUOTE_NOT_FOUND'));
      return {
        symbol: symbol.toUpperCase(),
        current: data.c,
        change: data.d,
        changePercent: data.dp,
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose: data.pc,
        timestamp: data.t ? data.t * 1000 : Date.now()
      };
    });
  }

  function getCompanyProfile(symbol) {
    var key = getFinnhubKey();
    if (!key) return Promise.reject(new Error('FINNHUB_KEY_NOT_SET'));
    var url = FINNHUB_BASE + '/stock/profile2?symbol=' + encodeURIComponent(symbol.toUpperCase()) + '&token=' + key;
    return cachedFetch(url, 300000);
  }

  function getCompanyNews(symbol, daysBack) {
    var key = getFinnhubKey();
    if (!key) return Promise.reject(new Error('FINNHUB_KEY_NOT_SET'));
    var to = new Date();
    var from = new Date(to.getTime() - (daysBack || 7) * 86400000);
    var fmt = function(d) { return d.toISOString().split('T')[0]; };
    var url = FINNHUB_BASE + '/company-news?symbol=' + encodeURIComponent(symbol.toUpperCase()) +
      '&from=' + fmt(from) + '&to=' + fmt(to) + '&token=' + key;
    return cachedFetch(url, 300000).then(function(data) {
      return Array.isArray(data) ? data.slice(0, 10) : [];
    });
  }

  function getMarketSentiment(symbol) {
    var key = getFinnhubKey();
    if (!key) return Promise.reject(new Error('FINNHUB_KEY_NOT_SET'));
    var url = FINNHUB_BASE + '/stock/recommendation?symbol=' + encodeURIComponent(symbol.toUpperCase()) + '&token=' + key;
    return cachedFetch(url, 300000).then(function(data) {
      return Array.isArray(data) ? data.slice(0, 5) : [];
    });
  }

  function getTimeSeries(symbol, interval) {
    var key = getAlphaKey();
    if (!key) return Promise.reject(new Error('ALPHA_VANTAGE_KEY_NOT_SET'));
    var fn = interval === 'weekly' ? 'TIME_SERIES_WEEKLY' :
             interval === 'monthly' ? 'TIME_SERIES_MONTHLY' : 'TIME_SERIES_DAILY';
    var url = ALPHA_BASE + '?function=' + fn + '&symbol=' + encodeURIComponent(symbol.toUpperCase()) +
      '&outputsize=compact&apikey=' + key;
    return cachedFetch(url, 300000).then(function(data) {
      var seriesKey = Object.keys(data).find(function(k) { return k.indexOf('Time Series') !== -1; });
      if (!seriesKey) return [];
      var raw = data[seriesKey];
      var points = [];
      var dates = Object.keys(raw).slice(0, 30);
      dates.forEach(function(date) {
        points.push({
          date: date,
          open: parseFloat(raw[date]['1. open']),
          high: parseFloat(raw[date]['2. high']),
          low: parseFloat(raw[date]['3. low']),
          close: parseFloat(raw[date]['4. close']),
          volume: parseInt(raw[date]['5. volume'], 10)
        });
      });
      return points;
    });
  }

  function searchSymbol(query) {
    var key = getAlphaKey();
    if (!key) return Promise.reject(new Error('ALPHA_VANTAGE_KEY_NOT_SET'));
    var url = ALPHA_BASE + '?function=SYMBOL_SEARCH&keywords=' + encodeURIComponent(query) + '&apikey=' + key;
    return cachedFetch(url, 600000).then(function(data) {
      if (!data.bestMatches) return [];
      return data.bestMatches.map(function(m) {
        return { symbol: m['1. symbol'], name: m['2. name'], type: m['3. type'], region: m['4. region'] };
      });
    });
  }

  function getCryptoQuote(symbol) {
    var key = getAlphaKey();
    if (!key) return Promise.reject(new Error('ALPHA_VANTAGE_KEY_NOT_SET'));
    var url = ALPHA_BASE + '?function=CURRENCY_EXCHANGE_RATE&from_currency=' + encodeURIComponent(symbol) +
      '&to_currency=USD&apikey=' + key;
    return cachedFetch(url).then(function(data) {
      var rate = data['Realtime Currency Exchange Rate'];
      if (!rate) return null;
      return {
        symbol: symbol,
        price: parseFloat(rate['5. Exchange Rate']),
        bid: parseFloat(rate['8. Bid Price']),
        ask: parseFloat(rate['9. Ask Price']),
        timestamp: rate['6. Last Refreshed']
      };
    });
  }

  function getMarketSummary() {
    var indices = ['SPY', 'QQQ', 'DIA', 'IWM', 'VIX'];
    var promises = indices.map(function(sym) {
      return getQuote(sym).catch(function() { return null; });
    });
    return Promise.all(promises).then(function(results) {
      var summary = {};
      indices.forEach(function(sym, i) {
        if (results[i]) summary[sym] = results[i];
      });
      return summary;
    });
  }

  function clearCache() { CACHE = {}; }

  return {
    getQuote: getQuote,
    getCompanyProfile: getCompanyProfile,
    getCompanyNews: getCompanyNews,
    getMarketSentiment: getMarketSentiment,
    getTimeSeries: getTimeSeries,
    searchSymbol: searchSymbol,
    getCryptoQuote: getCryptoQuote,
    getMarketSummary: getMarketSummary,
    clearCache: clearCache
  };
})();
