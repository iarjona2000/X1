var X1AIMemo = (function() {

  function saveMemo(text, url, title, options) {
    var memo = {
      id: 'memo_' + Date.now(),
      text: text,
      url: url || '',
      title: title || '',
      type: options && options.type || 'DOCUMENT',
      tags: options && options.tags || [],
      timestamp: new Date().toISOString(),
      source: options && options.source || 'manual'
    };
    return X1IndexedDB.put('entities', memo).then(function() {
      if (typeof X1OpGraph !== 'undefined') {
        X1OpGraph.addEntity({
          name: title || text.substring(0, 50),
          type: 'DOCUMENT',
          properties: { text: text, url: url, tags: memo.tags, source: memo.source, memoId: memo.id }
        });
        var extracted = X1OpGraph.extractEntitiesFromText(text);
        if (extracted.length > 0 && memo.id) {
          extracted.forEach(function(ent) {
            X1OpGraph.addRelation(memo.id, ent.id, 'MENTIONS');
          });
        }
      }
      return memo;
    });
  }

  function getMemo(id) {
    return X1IndexedDB.get('entities', id);
  }

  function getAllMemos() {
    return X1IndexedDB.queryByIndex('entities', 'type', 'DOCUMENT');
  }

  function searchMemos(query) {
    var lower = (query || '').toLowerCase();
    return getAllMemos().then(function(memos) {
      return memos.filter(function(m) {
        return (m.text && m.text.toLowerCase().indexOf(lower) !== -1) ||
               (m.title && m.title.toLowerCase().indexOf(lower) !== -1) ||
               (m.tags && m.tags.some(function(t) { return t.toLowerCase().indexOf(lower) !== -1; }));
      });
    });
  }

  function saveFromSelection(selectedText, pageUrl, pageTitle) {
    return saveMemo(selectedText, pageUrl, pageTitle, { source: 'selection', type: 'DOCUMENT' });
  }

  function saveFromConversation(text, context) {
    return saveMemo(text, context && context.url, context && context.title, { source: 'conversation', type: 'MEMORY', tags: (context && context.tags) || [] });
  }

  function deleteMemo(id) {
    return X1IndexedDB.remove('entities', id);
  }

  function getMemoStats() {
    return getAllMemos().then(function(memos) {
      var stats = { total: memos.length, byTag: {}, byMonth: {} };
      memos.forEach(function(m) {
        if (m.tags) { m.tags.forEach(function(t) { stats.byTag[t] = (stats.byTag[t] || 0) + 1; }); }
        var month = (m.timestamp || '').substring(0, 7);
        if (month) stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
      });
      return stats;
    });
  }

  return { saveMemo: saveMemo, getMemo: getMemo, getAllMemos: getAllMemos, searchMemos: searchMemos, saveFromSelection: saveFromSelection, saveFromConversation: saveFromConversation, deleteMemo: deleteMemo, getMemoStats: getMemoStats };
})();
