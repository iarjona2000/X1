var X1PageMonitor = (function() {
  var monitors = [];
  var STORAGE_KEY = 'x1_monitors';
  var SNAPSHOT_PREFIX = 'x1_monitor_snap_';
  var HISTORY_PREFIX = 'x1_monitor_hist_';
  var ALARM_PREFIX = 'x1-monitor-';
  var MAX_HISTORY = 20;

  function loadMonitors() {
    return new Promise(function(resolve) {
      chrome.storage.local.get(STORAGE_KEY, function(data) {
        monitors = data[STORAGE_KEY] || [];
        resolve(monitors);
      });
    });
  }

  function saveMonitors() {
    return new Promise(function(resolve) {
      var obj = {};
      obj[STORAGE_KEY] = monitors;
      chrome.storage.local.set(obj, function() {
        resolve();
      });
    });
  }

  function generateId() {
    return 'mon-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
  }

  function stripHtml(html) {
    return String(html)
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractPrice(text) {
    var patterns = [
      /\$\s*([\d,]+\.?\d*)/,
      /USD\s*([\d,]+\.?\d*)/i,
      /([\d,]+\.?\d*)\s*USD/i,
      /€\s*([\d,]+\.?\d*)/,
      /EUR\s*([\d,]+\.?\d*)/i,
      /([\d,]+\.?\d*)\s*EUR/i,
      /£\s*([\d,]+\.?\d*)/,
      /GBP\s*([\d,]+\.?\d*)/i,
      /price[:\s]*\$?([\d,]+\.?\d*)/i,
      /cost[:\s]*\$?([\d,]+\.?\d*)/i,
      /([\d,]+\.\d{2})/
    ];
    for (var i = 0; i < patterns.length; i++) {
      var match = text.match(patterns[i]);
      if (match) {
        var priceStr = match[1].replace(/,/g, '');
        var price = parseFloat(priceStr);
        if (!isNaN(price) && price > 0) return price;
      }
    }
    return null;
  }

  function computeDiff(oldText, newText) {
    if (!oldText) return 'Initial snapshot captured.';
    var oldLines = oldText.split('. ');
    var newLines = newText.split('. ');
    var added = [];
    var removed = [];
    for (var i = 0; i < newLines.length; i++) {
      var found = false;
      for (var j = 0; j < oldLines.length; j++) {
        if (newLines[i] === oldLines[j]) { found = true; break; }
      }
      if (!found && newLines[i].trim().length > 10) added.push(newLines[i].trim());
    }
    for (var k = 0; k < oldLines.length; k++) {
      var found2 = false;
      for (var l = 0; l < newLines.length; l++) {
        if (oldLines[k] === newLines[l]) { found2 = true; break; }
      }
      if (!found2 && oldLines[k].trim().length > 10) removed.push(oldLines[k].trim());
    }
    var diff = '';
    if (added.length > 0) {
      diff += 'Added: ' + added.slice(0, 5).join('; ');
    }
    if (removed.length > 0) {
      if (diff) diff += ' | ';
      diff += 'Removed: ' + removed.slice(0, 5).join('; ');
    }
    return diff || 'Minor formatting changes detected.';
  }

  function addMonitor(config) {
    if (!config || !config.url) return Promise.reject(new Error('URL is required'));

    var monitor = {
      id: config.id || generateId(),
      url: config.url,
      interval: config.interval || 30,
      type: config.type || 'changes',
      threshold: config.threshold || null,
      selector: config.selector || null,
      label: config.label || config.url.substring(0, 50),
      enabled: true,
      createdAt: new Date().toISOString(),
      lastCheck: null,
      lastChange: null,
      checkCount: 0
    };

    for (var i = 0; i < monitors.length; i++) {
      if (monitors[i].id === monitor.id) {
        monitors[i] = monitor;
        return saveMonitors().then(function() {
          setupMonitorAlarm(monitor);
          return monitor;
        });
      }
    }
    monitors.push(monitor);
    return saveMonitors().then(function() {
      setupMonitorAlarm(monitor);
      return monitor;
    });
  }

  function setupMonitorAlarm(monitor) {
    var alarmName = ALARM_PREFIX + monitor.id;
    chrome.alarms.clear(alarmName, function() {
      if (!monitor.enabled) return;
      chrome.alarms.create(alarmName, {
        delayInMinutes: 1,
        periodInMinutes: Math.max(1, monitor.interval)
      });
    });
  }

  function removeMonitor(monitorId) {
    var newMonitors = [];
    for (var i = 0; i < monitors.length; i++) {
      if (monitors[i].id !== monitorId) newMonitors.push(monitors[i]);
    }
    monitors = newMonitors;
    var alarmName = ALARM_PREFIX + monitorId;
    return new Promise(function(resolve) {
      chrome.alarms.clear(alarmName, function() {
        var snapKey = SNAPSHOT_PREFIX + monitorId;
        var histKey = HISTORY_PREFIX + monitorId;
        chrome.storage.local.remove([snapKey, histKey], function() {
          saveMonitors().then(function() {
            resolve(true);
          });
        });
      });
    });
  }

  function listMonitors() {
    return monitors.slice();
  }

  function checkPage(monitorId) {
    var monitor = null;
    for (var i = 0; i < monitors.length; i++) {
      if (monitors[i].id === monitorId) { monitor = monitors[i]; break; }
    }
    if (!monitor) return Promise.reject(new Error('Monitor not found: ' + monitorId));

    var snapKey = SNAPSHOT_PREFIX + monitorId;
    var histKey = HISTORY_PREFIX + monitorId;

    return fetch(monitor.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) X1Monitor/1.0',
        'Accept': 'text/html,application/xhtml+xml,*/*'
      }
    }).then(function(resp) {
      if (!resp.ok) throw new Error('Fetch failed: ' + resp.status);
      return resp.text();
    }).then(function(html) {
      var currentText = stripHtml(html);
      if (monitor.selector) {
        var selectorMatch = html.match(new RegExp('<[^>]*(?:id|class)=["\'][^"\']*' + monitor.selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^"\']*["\'][^>]*>([\\s\\S]*?)</', 'i'));
        if (selectorMatch) {
          currentText = stripHtml(selectorMatch[1]);
        }
      }
      currentText = currentText.substring(0, 10000);

      return new Promise(function(resolve) {
        chrome.storage.local.get([snapKey, histKey], function(data) {
          var lastSnapshot = data[snapKey] || null;
          var history = data[histKey] || [];
          var result = {
            changed: false,
            diff: '',
            oldValue: null,
            newValue: null,
            monitorId: monitorId,
            label: monitor.label,
            timestamp: new Date().toISOString()
          };

          if (monitor.type === 'price') {
            var currentPrice = extractPrice(currentText);
            var lastPrice = lastSnapshot ? extractPrice(lastSnapshot) : null;
            result.newValue = currentPrice;
            result.oldValue = lastPrice;

            if (currentPrice !== null && lastPrice !== null) {
              var priceDiff = Math.abs(currentPrice - lastPrice);
              var threshold = monitor.threshold || 0;
              if (priceDiff > threshold) {
                result.changed = true;
                var direction = currentPrice > lastPrice ? 'increased' : 'decreased';
                result.diff = 'Price ' + direction + ' from ' + lastPrice + ' to ' + currentPrice + ' (change: ' + priceDiff.toFixed(2) + ')';
              }
            } else if (currentPrice !== null && lastPrice === null) {
              result.changed = true;
              result.diff = 'Initial price captured: ' + currentPrice;
            }
          } else {
            result.oldValue = lastSnapshot ? lastSnapshot.substring(0, 200) : null;
            result.newValue = currentText.substring(0, 200);

            if (lastSnapshot) {
              var similarity = 0;
              var minLen = Math.min(currentText.length, lastSnapshot.length);
              var maxLen = Math.max(currentText.length, lastSnapshot.length);
              if (maxLen > 0) {
                var matching = 0;
                for (var ci = 0; ci < minLen; ci++) {
                  if (currentText[ci] === lastSnapshot[ci]) matching++;
                }
                similarity = matching / maxLen;
              }
              if (similarity < 0.95) {
                result.changed = true;
                result.diff = computeDiff(lastSnapshot, currentText);
              }
            } else {
              result.changed = true;
              result.diff = 'Initial snapshot captured.';
            }
          }

          monitor.lastCheck = result.timestamp;
          monitor.checkCount = (monitor.checkCount || 0) + 1;
          if (result.changed) {
            monitor.lastChange = result.timestamp;
          }

          var saveObj = {};
          saveObj[snapKey] = currentText;

          if (result.changed) {
            history.push({
              timestamp: result.timestamp,
              diff: result.diff,
              oldValue: result.oldValue,
              newValue: result.newValue
            });
            if (history.length > MAX_HISTORY) {
              history = history.slice(history.length - MAX_HISTORY);
            }
            saveObj[histKey] = history;
          }

          chrome.storage.local.set(saveObj, function() {
            saveMonitors().then(function() {
              resolve(result);
            });
          });
        });
      });
    }).catch(function(err) {
      return {
        changed: false,
        diff: '',
        oldValue: null,
        newValue: null,
        error: err.message || 'Check failed',
        monitorId: monitorId,
        label: monitor ? monitor.label : monitorId,
        timestamp: new Date().toISOString()
      };
    });
  }

  function handleMonitorAlarm(alarmName) {
    if (alarmName.indexOf(ALARM_PREFIX) !== 0) return Promise.resolve(null);
    var monitorId = alarmName.substring(ALARM_PREFIX.length);

    return checkPage(monitorId).then(function(result) {
      if (result.changed && !result.error) {
        chrome.notifications.create('x1-monitor-change-' + monitorId + '-' + Date.now(), {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('assets/icon-128.png'),
          title: 'X1 Monitor: ' + (result.label || 'Page Changed'),
          message: result.diff.substring(0, 200),
          priority: 2
        });
      }
      return result;
    });
  }

  function getMonitorHistory(monitorId) {
    var histKey = HISTORY_PREFIX + monitorId;
    return new Promise(function(resolve) {
      chrome.storage.local.get(histKey, function(data) {
        resolve(data[histKey] || []);
      });
    });
  }

  return {
    loadMonitors: loadMonitors,
    addMonitor: addMonitor,
    removeMonitor: removeMonitor,
    listMonitors: listMonitors,
    checkPage: checkPage,
    handleMonitorAlarm: handleMonitorAlarm,
    getMonitorHistory: getMonitorHistory
  };
})();
