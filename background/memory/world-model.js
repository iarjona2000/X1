var X1WorldModel = (function() {

  var state = {
    user: { mood: 'neutral', urgency: 'normal', sessionStart: Date.now(), lastActive: Date.now() },
    browser: { tabCount: 0, activeDomain: '', openDomains: [], focusedElement: '' },
    tasks: [],
    patterns: {},
    errors: [],
    attention: [],
    context: { date: '', time: '', dayOfWeek: '', isWeekend: false }
  };

  function updateContext() {
    var now = new Date();
    state.context.date = now.toISOString().split('T')[0];
    state.context.time = now.toTimeString().split(' ')[0];
    state.context.dayOfWeek = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][now.getDay()];
    state.context.isWeekend = now.getDay() === 0 || now.getDay() === 6;
  }

  function recordEvent(event, data) {
    var now = Date.now();
    state.user.lastActive = now;
    switch (event) {
      case 'command':
        state.tasks.push({ cmd: (data && data.cmd) || '', time: now, result: (data && data.result) || 'pending', action: (data && data.action) || 'unknown' });
        if (state.tasks.length > 100) state.tasks = state.tasks.slice(-100);
        var hourKey = 'h' + new Date().getHours();
        if (!state.patterns[hourKey]) state.patterns[hourKey] = {};
        var action = (data && data.action) || 'unknown';
        state.patterns[hourKey][action] = (state.patterns[hourKey][action] || 0) + 1;
        if (/urgent|ya|rapido|ahora|inmediat/i.test((data && data.cmd) || '')) state.user.urgency = 'high';
        else state.user.urgency = 'normal';
        break;
      case 'tabChange':
        state.browser.activeDomain = (data && data.domain) || '';
        state.browser.tabCount = (data && data.tabCount) || 0;
        if (data && data.domain && state.browser.openDomains.indexOf(data.domain) === -1) {
          state.browser.openDomains.push(data.domain);
        }
        break;
      case 'navigation':
        state.browser.activeDomain = (data && data.domain) || '';
        break;
      case 'error':
        state.errors.push({ message: (data && data.message) || 'unknown', time: now, stack: (data && data.stack) || '' });
        if (state.errors.length > 20) state.errors = state.errors.slice(-20);
        break;
      case 'attention':
        state.attention.push({ source: (data && data.source) || '', priority: (data && data.priority) || 0, time: now });
        if (state.attention.length > 50) state.attention = state.attention.slice(-50);
        break;
    }
    updateContext();
    save();
  }

  function getState() {
    updateContext();
    var recentErrors = state.errors.slice(-3);
    var recentTasks = state.tasks.slice(-5);
    var topPatterns = Object.keys(state.patterns).sort(function(a, b) {
      var ca = Object.values(state.patterns[a]).reduce(function(s, v) { return s + v; }, 0);
      var cb = Object.values(state.patterns[b]).reduce(function(s, v) { return s + v; }, 0);
      return cb - ca;
    }).slice(0, 3);
    return {
      user: state.user,
      browser: state.browser,
      recentTasks: recentTasks,
      recentErrors: recentErrors,
      topPatterns: topPatterns,
      context: state.context,
      attention: state.attention.slice(-5)
    };
  }

  function getSummary() {
    var s = getState();
    var lines = [];
    lines.push('Sesión: ' + Math.round((Date.now() - s.user.sessionStart) / 60000) + ' min');
    if (s.browser.activeDomain) lines.push('Dominio: ' + s.browser.activeDomain);
    lines.push('Tabs: ' + s.browser.tabCount);
    if (s.user.urgency === 'high') lines.push('URGENTE');
    if (s.recentTasks.length) lines.push('Últimas: ' + s.recentTasks.map(function(t) { return t.cmd.substring(0, 40); }).join(' | '));
    if (s.topPatterns.length) lines.push('Patrones: ' + s.topPatterns.join(', '));
    return lines.join(' // ');
  }

  function predictNextAction() {
    var hour = 'h' + new Date().getHours();
    var hourPatterns = state.patterns[hour] || {};
    var sorted = Object.keys(hourPatterns).sort(function(a, b) { return hourPatterns[b] - hourPatterns[a]; });
    return sorted.slice(0, 3);
  }

  function getAttentionScore() {
    var s = getState();
    var score = 0;
    if (s.user.urgency === 'high') score += 5;
    if (s.recentErrors.length > 0) score += 3;
    if (s.browser.tabCount > 10) score += 2;
    if (s.attention.length > 0) score += Math.max.apply(null, s.attention.map(function(a) { return a.priority; }));
    return score;
  }

  function allocateAttention() {
    var items = [];
    if (state.user.urgency === 'high') items.push({ source: 'user_urgency', priority: 10 });
    state.attention.forEach(function(a) { items.push(a); });
    if (state.errors.length > 0) items.push({ source: 'recent_errors', priority: 8, count: state.errors.length });
    items.sort(function(a, b) { return b.priority - a.priority; });
    return items.slice(0, 5);
  }

  function clear() {
    state.user = { mood: 'neutral', urgency: 'normal', sessionStart: Date.now(), lastActive: Date.now() };
    state.tasks = [];
    state.patterns = {};
    state.errors = [];
    state.attention = [];
    save();
  }

  function save() {
    try { chrome.storage.session.set({ x1WorldModel: state }); } catch(e) {}
  }

  function load() {
    try {
      chrome.storage.session.get('x1WorldModel', function(r) {
        if (r && r.x1WorldModel) {
          state = r.x1WorldModel;
          state.user.sessionStart = Date.now();
        }
      });
    } catch(e) {}
  }

  load();
  setInterval(save, 30000);

  return {
    recordEvent: recordEvent, getState: getState, getSummary: getSummary,
    predictNextAction: predictNextAction, getAttentionScore: getAttentionScore,
    allocateAttention: allocateAttention, clear: clear
  };
})();
