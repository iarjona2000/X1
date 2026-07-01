var X1Workspace = (function() {

  var WS_KEY = 'x1_workspaces';
  var SHARED_AGENTS_KEY = 'x1_ws_shared_agents';
  var SHARED_MEMORY_KEY = 'x1_ws_shared_memory';
  var AUDIT_KEY = 'x1_ws_audit';
  var PERMISSIONS_KEY = 'x1_ws_permissions';

  function generateId(prefix) {
    return (prefix || 'ws') + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  function storageGet(key) {
    return new Promise(function(resolve) {
      chrome.storage.local.get(key, function(data) {
        resolve(data[key] || null);
      });
    });
  }

  function storageSet(key, value) {
    var obj = {};
    obj[key] = value;
    return new Promise(function(resolve) {
      chrome.storage.local.set(obj, function() {
        resolve();
      });
    });
  }

  function createWorkspace(config) {
    var ws = {
      id: generateId('ws'),
      name: config.name || 'Unnamed Workspace',
      description: config.description || '',
      type: config.type || 'personal',
      members: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    return storageGet(WS_KEY).then(function(workspaces) {
      var list = workspaces || [];
      list.push(ws);
      return storageSet(WS_KEY, list).then(function() {
        return ws;
      });
    });
  }

  function getWorkspace(workspaceId) {
    return storageGet(WS_KEY).then(function(workspaces) {
      var list = workspaces || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === workspaceId) return list[i];
      }
      return null;
    });
  }

  function listWorkspaces() {
    return storageGet(WS_KEY).then(function(workspaces) {
      return workspaces || [];
    });
  }

  function updateWorkspaceList(workspaceId, updater) {
    return storageGet(WS_KEY).then(function(workspaces) {
      var list = workspaces || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === workspaceId) {
          var result = updater(list[i]);
          list[i].updatedAt = Date.now();
          return storageSet(WS_KEY, list).then(function() {
            return result;
          });
        }
      }
      return null;
    });
  }

  function addMember(workspaceId, member) {
    return updateWorkspaceList(workspaceId, function(ws) {
      for (var i = 0; i < ws.members.length; i++) {
        if (ws.members[i].email === member.email) {
          ws.members[i].role = member.role || ws.members[i].role;
          ws.members[i].name = member.name || ws.members[i].name;
          return ws;
        }
      }
      ws.members.push({
        email: member.email,
        role: member.role || 'viewer',
        name: member.name || '',
        addedAt: Date.now()
      });
      return ws;
    });
  }

  function removeMember(workspaceId, email) {
    return updateWorkspaceList(workspaceId, function(ws) {
      var filtered = [];
      for (var i = 0; i < ws.members.length; i++) {
        if (ws.members[i].email !== email) filtered.push(ws.members[i]);
      }
      ws.members = filtered;
      return ws;
    });
  }

  function shareAgent(workspaceId, agentId) {
    return storageGet(SHARED_AGENTS_KEY).then(function(data) {
      var map = data || {};
      if (!map[workspaceId]) map[workspaceId] = [];
      for (var i = 0; i < map[workspaceId].length; i++) {
        if (map[workspaceId][i].agentId === agentId) {
          return map[workspaceId][i];
        }
      }
      var entry = {
        agentId: agentId,
        sharedAt: Date.now()
      };
      map[workspaceId].push(entry);
      return storageSet(SHARED_AGENTS_KEY, map).then(function() {
        return entry;
      });
    });
  }

  function getSharedAgents(workspaceId) {
    return storageGet(SHARED_AGENTS_KEY).then(function(data) {
      var map = data || {};
      return map[workspaceId] || [];
    });
  }

  function addSharedMemory(workspaceId, entity) {
    return storageGet(SHARED_MEMORY_KEY).then(function(data) {
      var map = data || {};
      if (!map[workspaceId]) map[workspaceId] = [];
      var entry = {
        id: generateId('mem'),
        type: entity.type || 'PROJECT',
        name: entity.name || '',
        attributes: entity.attributes || {},
        relations: entity.relations || [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      map[workspaceId].push(entry);
      return storageSet(SHARED_MEMORY_KEY, map).then(function() {
        return entry;
      });
    });
  }

  function getSharedMemory(workspaceId, query) {
    return storageGet(SHARED_MEMORY_KEY).then(function(data) {
      var map = data || {};
      var entries = map[workspaceId] || [];
      if (!query) return entries;

      var q = query.toLowerCase();
      var results = [];
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        var nameMatch = e.name && e.name.toLowerCase().indexOf(q) !== -1;
        var typeMatch = e.type && e.type.toLowerCase().indexOf(q) !== -1;
        if (nameMatch || typeMatch) results.push(e);
      }
      return results;
    });
  }

  function addAuditEvent(workspaceId, event) {
    return storageGet(AUDIT_KEY).then(function(data) {
      var map = data || {};
      if (!map[workspaceId]) map[workspaceId] = [];
      var entry = {
        id: generateId('audit'),
        action: event.action || '',
        agentId: event.agentId || null,
        userId: event.userId || null,
        details: event.details || '',
        timestamp: event.timestamp || Date.now()
      };
      map[workspaceId].push(entry);
      if (map[workspaceId].length > 500) {
        map[workspaceId] = map[workspaceId].slice(map[workspaceId].length - 500);
      }
      return storageSet(AUDIT_KEY, map).then(function() {
        return entry;
      });
    });
  }

  function getAuditLog(workspaceId, limit) {
    return storageGet(AUDIT_KEY).then(function(data) {
      var map = data || {};
      var entries = map[workspaceId] || [];
      var max = limit || 50;
      if (entries.length <= max) return entries.slice().reverse();
      return entries.slice(entries.length - max).reverse();
    });
  }

  function setPermissions(workspaceId, agentId, permissions) {
    return storageGet(PERMISSIONS_KEY).then(function(data) {
      var map = data || {};
      var key = workspaceId + '::' + agentId;
      map[key] = {
        canRead: permissions.canRead || [],
        canWrite: permissions.canWrite || [],
        canExecute: permissions.canExecute || [],
        updatedAt: Date.now()
      };
      return storageSet(PERMISSIONS_KEY, map).then(function() {
        return map[key];
      });
    });
  }

  function getAgentMarketplace() {
    return storageGet(SHARED_AGENTS_KEY).then(function(sharedData) {
      var map = sharedData || {};
      var allSharedIds = {};
      var wsIds = Object.keys(map);
      for (var w = 0; w < wsIds.length; w++) {
        var agents = map[wsIds[w]];
        for (var a = 0; a < agents.length; a++) {
          allSharedIds[agents[a].agentId] = wsIds[w];
        }
      }

      if (typeof X1AgentManager === 'undefined') return [];

      return X1AgentManager.listAgents().then(function(allAgents) {
        var publicAgents = [];
        for (var i = 0; i < allAgents.length; i++) {
          var ag = allAgents[i];
          if (ag.visibility === 'public' && allSharedIds[ag.id]) {
            publicAgents.push({
              id: ag.id,
              name: ag.name,
              description: ag.description,
              model: ag.model,
              workspaceId: allSharedIds[ag.id],
              builtIn: ag.builtIn || false
            });
          }
        }
        return publicAgents;
      });
    });
  }

  return {
    createWorkspace: createWorkspace,
    getWorkspace: getWorkspace,
    listWorkspaces: listWorkspaces,
    addMember: addMember,
    removeMember: removeMember,
    shareAgent: shareAgent,
    getSharedAgents: getSharedAgents,
    addSharedMemory: addSharedMemory,
    getSharedMemory: getSharedMemory,
    addAuditEvent: addAuditEvent,
    getAuditLog: getAuditLog,
    setPermissions: setPermissions,
    getAgentMarketplace: getAgentMarketplace
  };

})();
