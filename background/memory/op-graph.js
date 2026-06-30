var X1OpGraph = (function() {

  var graph = {
    entities: [],
    relations: []
  };

  var STORAGE_KEY = 'x1_graph';

  function generateId() { return 'ent_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8); }

  function addEntity(data) {
    var entity = {
      id: generateId(),
      name: data.name || 'Unknown',
      type: data.type || 'UNKNOWN',
      properties: data.properties || {},
      relations: [],
      date: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    var existing = findEntityByName(data.name);
    if (existing) {
      existing.updated = new Date().toISOString();
      if (data.properties) Object.assign(existing.properties, data.properties);
      save();
      return existing;
    }
    graph.entities.push(entity);
    save();
    return entity;
  }

  function findEntityByName(name) {
    if (!name) return null;
    var lower = name.toLowerCase();
    for (var i = 0; i < graph.entities.length; i++) {
      if (graph.entities[i].name.toLowerCase() === lower) return graph.entities[i];
    }
    return null;
  }

  function findEntityById(id) {
    for (var i = 0; i < graph.entities.length; i++) {
      if (graph.entities[i].id === id) return graph.entities[i];
    }
    return null;
  }

  function getEntitiesByType(type) {
    return graph.entities.filter(function(e) { return e.type === type; });
  }

  function addRelation(sourceId, targetId, type, properties) {
    var rel = {
      id: 'rel_' + Date.now(),
      sourceId: sourceId,
      targetId: targetId,
      type: type || 'RELATED_TO',
      properties: properties || {},
      date: new Date().toISOString()
    };
    graph.relations.push(rel);
    var source = findEntityById(sourceId);
    var target = findEntityById(targetId);
    if (source && source.relations.indexOf(targetId) === -1) source.relations.push(targetId);
    if (target && target.relations.indexOf(sourceId) === -1) target.relations.push(sourceId);
    save();
    return rel;
  }

  function getRelations(entityId) {
    return graph.relations.filter(function(r) { return r.sourceId === entityId || r.targetId === entityId; });
  }

  function getConnectedEntities(entityId) {
    var connected = [];
    var rels = getRelations(entityId);
    rels.forEach(function(r) {
      var otherId = r.sourceId === entityId ? r.targetId : r.sourceId;
      var other = findEntityById(otherId);
      if (other && connected.indexOf(other) === -1) connected.push(other);
    });
    return connected;
  }

  function queryEntities(query) {
    var lower = (query || '').toLowerCase();
    if (!lower) return [];
    return graph.entities.filter(function(e) {
      return e.name.toLowerCase().indexOf(lower) !== -1 ||
        (e.properties.email && e.properties.email.toLowerCase().indexOf(lower) !== -1) ||
        (e.type && e.type.toLowerCase().indexOf(lower) !== -1) ||
        JSON.stringify(e.properties).toLowerCase().indexOf(lower) !== -1;
    }).slice(0, 10);
  }

  function extractEntitiesFromText(text) {
    var extracted = [];
    var personRegex = /([A-Z][a-záéíóúñ]+)\s+([A-Z][a-záéíóúñ]+)/g;
    var emailRegex = /([\w.-]+@[\w.-]+\.\w{2,})/g;
    var orgRegex = /(?:de\s+|en\s+|para\s+)?([A-Z][a-záéíóúñ]*(?:\s[A-Z][a-záéíóúñ]*){1,3})/g;
    var match;
    while ((match = emailRegex.exec(text)) !== null) {
      var email = match[1];
      if (!findEntityByProperty('email', email)) {
        var name = email.split('@')[0].replace(/[._]/g, ' ');
        extracted.push(addEntity({ name: name, type: 'PERSON', properties: { email: email } }));
      }
    }
    while ((match = personRegex.exec(text)) !== null) {
      var fullName = match[1] + ' ' + match[2];
      if (fullName.length > 5 && fullName.length < 50 && !findEntityByName(fullName) && !findEntityByEmailName(fullName)) {
        extracted.push(addEntity({ name: fullName, type: 'PERSON' }));
      }
    }
    return extracted;
  }

  function findEntityByProperty(key, value) {
    for (var i = 0; i < graph.entities.length; i++) {
      if (graph.entities[i].properties[key] === value) return graph.entities[i];
    }
    return null;
  }

  function findEntityByEmailName(name) {
    var lower = name.toLowerCase().replace(/[._]/g, ' ');
    for (var i = 0; i < graph.entities.length; i++) {
      var email = graph.entities[i].properties.email || '';
      if (email.toLowerCase().indexOf(lower) !== -1) return graph.entities[i];
    }
    return null;
  }

  function removeEntity(id) {
    graph.entities = graph.entities.filter(function(e) { return e.id !== id; });
    graph.relations = graph.relations.filter(function(r) { return r.sourceId !== id && r.targetId !== id; });
    save();
  }

  function getStats() {
    var types = {};
    graph.entities.forEach(function(e) {
      types[e.type] = (types[e.type] || 0) + 1;
    });
    return { entities: graph.entities.length, relations: graph.relations.length, types: types };
  }

  function getAll() { return { entities: graph.entities, relations: graph.relations }; }

  function clear() { graph.entities = []; graph.relations = []; save(); }

  function save() {
    try { chrome.storage.local.set({ [STORAGE_KEY]: graph }); } catch(e) {}
  }

  function load() {
    try {
      chrome.storage.local.get(STORAGE_KEY, function(r) {
        if (r && r[STORAGE_KEY]) {
          graph = r[STORAGE_KEY];
        }
      });
    } catch(e) {}
  }

  load();

  return {
    addEntity: addEntity, findEntityByName: findEntityByName, findEntityById: findEntityById,
    getEntitiesByType: getEntitiesByType, addRelation: addRelation, getRelations: getRelations,
    getConnectedEntities: getConnectedEntities, queryEntities: queryEntities,
    extractEntitiesFromText: extractEntitiesFromText, removeEntity: removeEntity,
    getStats: getStats, getAll: getAll, clear: clear, save: save, load: load
  };
})();
