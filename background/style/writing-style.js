var X1WritingStyle = (function() {
  var STORAGE_KEY = 'x1_writing_styles';
  var styles = {};
  var MAX_SAMPLES = 50;

  function loadStyles() {
    return new Promise(function(resolve) {
      chrome.storage.local.get(STORAGE_KEY, function(data) {
        styles = data[STORAGE_KEY] || {};
        resolve(styles);
      });
    });
  }

  function saveStyles() {
    return new Promise(function(resolve) {
      var obj = {};
      obj[STORAGE_KEY] = styles;
      chrome.storage.local.set(obj, function() { resolve(); });
    });
  }

  function analyzeSample(text) {
    if (!text || text.length < 20) return null;
    var sentences = text.split(/[.!?]+/).filter(function(s) { return s.trim().length > 0; });
    var words = text.split(/\s+/).filter(function(w) { return w.length > 0; });
    var avgSentLen = sentences.length > 0 ? words.length / sentences.length : 0;
    var avgWordLen = words.length > 0 ? words.reduce(function(sum, w) { return sum + w.length; }, 0) / words.length : 0;
    var commaCount = (text.match(/,/g) || []).length;
    var questionCount = (text.match(/\?/g) || []).length;
    var exclamCount = (text.match(/!/g) || []).length;
    var emojiCount = (text.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
    var capsWords = words.filter(function(w) { return w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w); }).length;
    var formalWords = ['therefore', 'however', 'furthermore', 'consequently', 'nevertheless', 'por tanto', 'sin embargo', 'asimismo', 'no obstante'];
    var casualWords = ['ok', 'yeah', 'cool', 'lol', 'haha', 'jaja', 'vale', 'guay', 'mola', 'tio'];
    var formalCount = 0;
    var casualCount = 0;
    var lower = text.toLowerCase();
    formalWords.forEach(function(w) { if (lower.indexOf(w) !== -1) formalCount++; });
    casualWords.forEach(function(w) { if (lower.indexOf(w) !== -1) casualCount++; });

    return {
      avgSentenceLength: Math.round(avgSentLen * 10) / 10,
      avgWordLength: Math.round(avgWordLen * 10) / 10,
      commasPerSentence: sentences.length > 0 ? Math.round(commaCount / sentences.length * 10) / 10 : 0,
      questionRatio: sentences.length > 0 ? Math.round(questionCount / sentences.length * 100) / 100 : 0,
      exclamationRatio: sentences.length > 0 ? Math.round(exclamCount / sentences.length * 100) / 100 : 0,
      emojiDensity: words.length > 0 ? Math.round(emojiCount / words.length * 100) / 100 : 0,
      capsRatio: words.length > 0 ? Math.round(capsWords / words.length * 100) / 100 : 0,
      formalityScore: formalCount - casualCount,
      wordCount: words.length,
      timestamp: Date.now()
    };
  }

  function learnFrom(userId, text, context) {
    if (!userId || !text) return Promise.resolve(null);
    var analysis = analyzeSample(text);
    if (!analysis) return Promise.resolve(null);
    if (context) analysis.context = context;
    if (!styles[userId]) styles[userId] = { samples: [], profile: null };
    styles[userId].samples.push(analysis);
    if (styles[userId].samples.length > MAX_SAMPLES) {
      styles[userId].samples = styles[userId].samples.slice(-MAX_SAMPLES);
    }
    styles[userId].profile = buildProfile(styles[userId].samples);
    return saveStyles().then(function() { return styles[userId].profile; });
  }

  function buildProfile(samples) {
    if (!samples || samples.length === 0) return null;
    var totals = {
      avgSentenceLength: 0, avgWordLength: 0, commasPerSentence: 0,
      questionRatio: 0, exclamationRatio: 0, emojiDensity: 0,
      capsRatio: 0, formalityScore: 0
    };
    var keys = Object.keys(totals);
    samples.forEach(function(s) {
      keys.forEach(function(k) { totals[k] += s[k] || 0; });
    });
    var profile = {};
    keys.forEach(function(k) { profile[k] = Math.round(totals[k] / samples.length * 100) / 100; });
    profile.sampleCount = samples.length;
    if (profile.formalityScore > 1) profile.tone = 'formal';
    else if (profile.formalityScore < -1) profile.tone = 'casual';
    else profile.tone = 'neutral';
    if (profile.avgSentenceLength > 20) profile.complexity = 'complex';
    else if (profile.avgSentenceLength < 10) profile.complexity = 'simple';
    else profile.complexity = 'moderate';
    if (profile.emojiDensity > 0.05) profile.usesEmoji = true;
    if (profile.questionRatio > 0.3) profile.questionHeavy = true;
    return profile;
  }

  function getProfile(userId) {
    if (!userId || !styles[userId]) return null;
    return styles[userId].profile;
  }

  function getStylePrompt(userId) {
    var profile = getProfile(userId);
    if (!profile) return '';
    var parts = [];
    parts.push('Writing style: ' + profile.tone + ', ' + profile.complexity + ' sentences');
    if (profile.avgSentenceLength) parts.push('avg ' + profile.avgSentenceLength + ' words/sentence');
    if (profile.usesEmoji) parts.push('uses emoji');
    if (profile.questionHeavy) parts.push('asks many questions');
    return parts.join('. ') + '.';
  }

  function clearUser(userId) {
    delete styles[userId];
    return saveStyles();
  }

  function getAllProfiles() {
    var result = {};
    Object.keys(styles).forEach(function(uid) {
      if (styles[uid].profile) result[uid] = styles[uid].profile;
    });
    return result;
  }

  return {
    loadStyles: loadStyles,
    learnFrom: learnFrom,
    getProfile: getProfile,
    getStylePrompt: getStylePrompt,
    clearUser: clearUser,
    getAllProfiles: getAllProfiles,
    analyzeSample: analyzeSample
  };
})();
