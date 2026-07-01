var X1IntentionGraph = (function() {

  var intentions = [];
  var STORAGE_KEY = 'x1_intentions';

  var CATEGORIES = {
    EMAIL_COMPOSE: 'email_compose',
    EMAIL_READ: 'email_read',
    CALENDAR_CHECK: 'calendar_check',
    CALENDAR_CREATE: 'calendar_create',
    SEARCH: 'search',
    NAVIGATE: 'navigate',
    RESEARCH: 'research',
    CODE: 'code',
    DOCUMENT: 'document',
    MEETING: 'meeting',
    SOCIAL: 'social',
    SHOPPING: 'shopping',
    ANALYSIS: 'analysis',
    CREATIVE: 'creative',
    SYSTEM: 'system'
  };

  var TIME_SLOTS = {
    MORNING: [6, 7, 8, 9, 10, 11],
    AFTERNOON: [12, 13, 14, 15, 16, 17],
    EVENING: [18, 19, 20, 21],
    NIGHT: [22, 23, 0, 1, 2, 3, 4, 5]
  };

  var DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  function categorize(cmd, context) {
    var l = (cmd || '').toLowerCase();
    if (/email|correo|mandar|enviar|draft|reply|responder/i.test(l)) return CATEGORIES.EMAIL_COMPOSE;
    if (/leer|read|inbox|unread|bandeja|mensajes/i.test(l)) return CATEGORIES.EMAIL_READ;
    if (/calendar|calendario|reuni[oó]n|evento|meeting|agenda/i.test(l)) {
      if (/crea|create|nuev|agend|program/i.test(l)) return CATEGORIES.CALENDAR_CREATE;
      return CATEGORIES.CALENDAR_CHECK;
    }
    if (/busca|search|googlea|encuentr/i.test(l)) return CATEGORIES.SEARCH;
    if (/abre|ve a|navega|navigate|entra/i.test(l)) return CATEGORIES.NAVIGATE;
    if (/investiga|research|analiza|compara|eval[uú]a/i.test(l)) return CATEGORIES.RESEARCH;
    if (/programa|c[oó]digo|code|function|class|refactor|implement/i.test(l)) return CATEGORIES.CODE;
    if (/documento|doc|nota|notas|write|escribe|crea.*doc/i.test(l)) return CATEGORIES.DOCUMENT;
    if (/meeting|reuni[oó]n|prep[aá]ra/i.test(l)) return CATEGORIES.MEETING;
    if (/linkedin|twitter|social|post|tweet/i.test(l)) return CATEGORIES.SOCIAL;
    if (/compr[aá]|wallapop|vinted|amazon|precio|price/i.test(l)) return CATEGORIES.SHOPPING;
    if (/analiza|compare|compar|difference/i.test(l)) return CATEGORIES.ANALYSIS;
    if (/crea|generate|haz|make|creativ|diseñ/i.test(l)) return CATEGORIES.CREATIVE;
    if (/config|setup|api key|provider|cambia/i.test(l)) return CATEGORIES.SYSTEM;
    return CATEGORIES.ANALYSIS;
  }

  function getTimeSlot() {
    var hour = new Date().getHours();
    for (var slot in TIME_SLOTS) {
      if (TIME_SLOTS[slot].indexOf(hour) !== -1) return slot;
    }
    return 'AFTERNOON';
  }

  function getDayContext() {
    var date = new Date();
    var dayName = DAY_NAMES[date.getDay()];
    var dayOfMonth = date.getDate();
    var isWeekend = date.getDay() === 0 || date.getDay() === 6;
    return { dayName: dayName, dayOfMonth: dayOfMonth, isWeekend: isWeekend, timeSlot: getTimeSlot() };
  }

  function recordIntention(cmd, context) {
    var category = categorize(cmd, context);
    var dayContext = getDayContext();
    var existing = findIntention(category, dayContext);
    if (existing) {
      existing.count = (existing.count || 0) + 1;
      existing.lastUsed = Date.now();
      existing.lastCommand = cmd;
    } else {
      intentions.push({
        id: 'int_' + Date.now(),
        category: category,
        dayContext: dayContext,
        count: 1,
        firstUsed: Date.now(),
        lastUsed: Date.now(),
        lastCommand: cmd,
        preferredModel: null,
        preferredFormat: null,
        avgSatisfaction: 0,
        satisfactionCount: 0
      });
    }
    save();
    return category;
  }

  function findIntention(category, dayContext) {
    for (var i = 0; i < intentions.length; i++) {
      if (intentions[i].category === category &&
          intentions[i].dayContext.timeSlot === dayContext.timeSlot &&
          intentions[i].dayContext.dayName === dayContext.dayName) {
        return intentions[i];
      }
    }
    return null;
  }

  function getTopIntentions(limit) {
    var sorted = intentions.slice().sort(function(a, b) {
      return (b.count || 0) - (a.count || 0);
    });
    return sorted.slice(0, limit || 5);
  }

  function getPredictions() {
    var dayContext = getDayContext();
    var predictions = [];
    var now = Date.now();
    var nearFuture = now + 3600000;
    for (var i = 0; i < intentions.length; i++) {
      var int = intentions[i];
      if (int.dayContext.timeSlot === dayContext.timeSlot &&
          int.dayContext.dayName === dayContext.dayName &&
          int.count > 1) {
        var recency = now - int.lastUsed;
        if (recency < 86400000 * 7) {
          predictions.push({
            category: int.category,
            confidence: Math.min(int.count / 10, 0.95),
            lastCommand: int.lastCommand,
            preferredModel: int.preferredModel
          });
        }
      }
    }
    predictions.sort(function(a, b) { return b.confidence - a.confidence; });
    return predictions.slice(0, 3);
  }

  function recordSatisfaction(category, score) {
    for (var i = 0; i < intentions.length; i++) {
      if (intentions[i].category === category) {
        var int = intentions[i];
        var total = int.avgSatisfaction * int.satisfactionCount + score;
        int.satisfactionCount++;
        int.avgSatisfaction = total / int.satisfactionCount;
        save();
        return;
      }
    }
  }

  function setPreferredModel(category, model) {
    for (var i = 0; i < intentions.length; i++) {
      if (intentions[i].category === category) {
        intentions[i].preferredModel = model;
        save();
        return;
      }
    }
  }

  function getAll() { return intentions; }
  function count() { return intentions.length; }

  function clear() { intentions = []; save(); }

  function save() {
    try { chrome.storage.local.set({ [STORAGE_KEY]: intentions }); } catch(e) {}
  }

  function load() {
    try {
      chrome.storage.local.get(STORAGE_KEY, function(r) {
        if (r && r[STORAGE_KEY]) intentions = r[STORAGE_KEY];
      });
    } catch(e) {}
  }

  load();

  return {
    categorize: categorize, recordIntention: recordIntention, getPredictions: getPredictions,
    getTopIntentions: getTopIntentions, recordSatisfaction: recordSatisfaction,
    setPreferredModel: setPreferredModel, getAll: getAll, count: count,
    clear: clear, CATEGORIES: CATEGORIES
  };
})();
