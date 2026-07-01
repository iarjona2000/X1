var X1MCPClient = (function() {
  var connections = {};
  var STORAGE_KEY = 'x1_mcp_servers';

  function loadServers() {
    return new Promise(function(resolve) {
      chrome.storage.local.get(STORAGE_KEY, function(data) {
        var servers = data[STORAGE_KEY] || [];
        resolve(servers);
      });
    });
  }

  function saveServers(servers) {
    return new Promise(function(resolve) {
      var obj = {};
      obj[STORAGE_KEY] = servers;
      chrome.storage.local.set(obj, function() { resolve(); });
    });
  }

  function addServer(config) {
    if (!config || !config.url || !config.name) return Promise.reject(new Error('INVALID_SERVER_CONFIG'));
    return loadServers().then(function(servers) {
      var existing = servers.find(function(s) { return s.name === config.name; });
      if (existing) {
        Object.assign(existing, config);
      } else {
        servers.push({
          name: config.name,
          url: config.url,
          transport: config.transport || 'http',
          headers: config.headers || {},
          enabled: config.enabled !== false,
          added: Date.now()
        });
      }
      return saveServers(servers).then(function() { return servers; });
    });
  }

  function removeServer(name) {
    return loadServers().then(function(servers) {
      servers = servers.filter(function(s) { return s.name !== name; });
      if (connections[name]) {
        delete connections[name];
      }
      return saveServers(servers);
    });
  }

  function callTool(serverName, toolName, params) {
    return loadServers().then(function(servers) {
      var server = servers.find(function(s) { return s.name === serverName && s.enabled; });
      if (!server) return Promise.reject(new Error('SERVER_NOT_FOUND: ' + serverName));

      if (server.transport === 'sse') {
        return callSSE(server, toolName, params);
      }
      return callHTTP(server, toolName, params);
    });
  }

  function callHTTP(server, toolName, params) {
    var headers = { 'Content-Type': 'application/json' };
    if (server.headers) {
      Object.keys(server.headers).forEach(function(k) { headers[k] = server.headers[k]; });
    }
    var body = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: toolName, arguments: params || {} }
    };
    return fetch(server.url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.error) return Promise.reject(new Error(data.error.message || 'MCP_ERROR'));
      return data.result;
    });
  }

  function callSSE(server, toolName, params) {
    return new Promise(function(resolve, reject) {
      var headers = { 'Content-Type': 'application/json' };
      if (server.headers) {
        Object.keys(server.headers).forEach(function(k) { headers[k] = server.headers[k]; });
      }
      var body = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: toolName, arguments: params || {} }
      };
      fetch(server.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000)
      }).then(function(response) {
        if (!response.ok) { reject(new Error('SSE_HTTP_' + response.status)); return; }
        var contentType = response.headers.get('content-type') || '';
        if (contentType.indexOf('text/event-stream') !== -1) {
          return response.text().then(function(text) {
            var lines = text.split('\n');
            var result = '';
            lines.forEach(function(line) {
              if (line.indexOf('data: ') === 0) {
                try {
                  var parsed = JSON.parse(line.substring(6));
                  if (parsed.result) result = parsed.result;
                  else if (parsed.content) result = parsed.content;
                } catch(e) {
                  result += line.substring(6);
                }
              }
            });
            resolve(result || text);
          });
        }
        return response.json().then(function(data) {
          if (data.error) reject(new Error(data.error.message));
          else resolve(data.result);
        });
      }).catch(reject);
    });
  }

  function listTools(serverName) {
    return loadServers().then(function(servers) {
      var server = servers.find(function(s) { return s.name === serverName && s.enabled; });
      if (!server) return Promise.reject(new Error('SERVER_NOT_FOUND'));
      var headers = { 'Content-Type': 'application/json' };
      if (server.headers) {
        Object.keys(server.headers).forEach(function(k) { headers[k] = server.headers[k]; });
      }
      var body = { jsonrpc: '2.0', id: Date.now(), method: 'tools/list', params: {} };
      return fetch(server.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000)
      }).then(function(r) { return r.json(); }).then(function(data) {
        if (data.error) return [];
        return (data.result && data.result.tools) || [];
      });
    });
  }

  function listAllTools() {
    return loadServers().then(function(servers) {
      var promises = servers.filter(function(s) { return s.enabled; }).map(function(s) {
        return listTools(s.name).then(function(tools) {
          return { server: s.name, tools: tools };
        }).catch(function() {
          return { server: s.name, tools: [], error: true };
        });
      });
      return Promise.all(promises);
    });
  }

  function getServers() {
    return loadServers();
  }

  function testConnection(serverName) {
    return listTools(serverName).then(function(tools) {
      return { connected: true, toolCount: tools.length };
    }).catch(function(e) {
      return { connected: false, error: e.message };
    });
  }

  return {
    addServer: addServer,
    removeServer: removeServer,
    callTool: callTool,
    listTools: listTools,
    listAllTools: listAllTools,
    getServers: getServers,
    testConnection: testConnection,
    loadServers: loadServers
  };
})();
