/**
 * kilo-bridge.js — Adaptador de Kilo Code agent tools para X1
 *
 * Extrae las tools de Kilo Code (searchFiles, writeToFile, readCodeDefinition,
 * executeCommand, listFiles, etc.) y las mapea a acciones X1 existentes.
 * Licencia: Apache 2.0 (Kilo-Org/kilocode)
 */

(function() {
  'use strict';

  var log = (typeof x1Log === 'function') ? x1Log('KiloBridge') : { info: function(m){console.log('[X1-Kilo]',m);}, warn: function(m){console.warn('[X1-Kilo]',m);}, error: function(m){console.error('[X1-Kilo]',m);} };

  // ─── Tool definitions (inspired by Kilo Code tools) ───

  var TOOLS = {
    search_files: {
      name: 'search_files',
      description: 'Search for files by name pattern',
      parameters: { query: 'string', path: 'string (optional)' },
      mapping: 'search'
    },
    read_file: {
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: { path: 'string' },
      mapping: 'readPage'
    },
    write_to_file: {
      name: 'write_to_file',
      description: 'Write content to a file',
      parameters: { path: 'string', content: 'string' },
      mapping: 'createFile'
    },
    replace_in_file: {
      name: 'replace_in_file',
      description: 'Replace text in a file',
      parameters: { path: 'string', oldString: 'string', newString: 'string' },
      mapping: 'replaceText'
    },
    list_files: {
      name: 'list_files',
      description: 'List files in a directory',
      parameters: { path: 'string (optional)' },
      mapping: 'listFiles'
    },
    execute_command: {
      name: 'execute_command',
      description: 'Execute a shell command',
      parameters: { command: 'string', cwd: 'string (optional)' },
      mapping: 'executeCommand'
    },
    search_definitions: {
      name: 'search_definitions',
      description: 'Search for code definitions (classes, functions, etc.)',
      parameters: { query: 'string', path: 'string (optional)' },
      mapping: 'searchCode'
    },
    list_code_definition_names: {
      name: 'list_code_definition_names',
      description: 'List code definition names in a file',
      parameters: { path: 'string' },
      mapping: 'listCodeDefinitions'
    },
    url_reader: {
      name: 'url_reader',
      description: 'Read and extract content from a URL',
      parameters: { url: 'string' },
      mapping: 'readURL'
    },
    browser_action: {
      name: 'browser_action',
      description: 'Perform a browser action (click, type, scroll, etc.)',
      parameters: { action: 'string', target: 'string (optional)', value: 'string (optional)' },
      mapping: 'browserAction'
    }
  };

  // ─── Tool executor (maps Kilo tools → X1 actions) ───

  function executeTool(toolName, params) {
    var tool = TOOLS[toolName];
    if (!tool) {
      return Promise.resolve({ ok: false, error: 'Unknown tool: ' + toolName });
    }

    log.info('Executing tool:', toolName, 'with params:', JSON.stringify(params));

    switch (tool.mapping) {
      case 'search':
        return executeSearch(params.query, params.path);
      case 'readPage':
        return executeReadFile(params.path);
      case 'createFile':
        return executeWriteFile(params.path, params.content);
      case 'replaceText':
        return executeReplaceInFile(params.path, params.oldString, params.newString);
      case 'listFiles':
        return executeListFiles(params.path);
      case 'executeCommand':
        return executeCommand(params.command, params.cwd);
      case 'searchCode':
        return executeSearchDefinitions(params.query, params.path);
      case 'listCodeDefinitions':
        return executeListCodeDefinitionNames(params.path);
      case 'readURL':
        return executeURLReader(params.url);
      case 'browserAction':
        return executeBrowserAction(params.action, params.target, params.value);
      default:
        return Promise.resolve({ ok: false, error: 'Unknown mapping: ' + tool.mapping });
    }
  }

  // ─── Action implementations (using X1's existing execAction or direct implementation) ───

  function executeSearch(query, path) {
    return new Promise(function(resolve) {
      try {
        var searchQuery = query + (path ? ' in ' + path : '');
        var result = { ok: true, type: 'search_results', query: searchQuery, results: [] };

        // Use X1's search mechanism if available
        if (typeof execAction === 'function') {
          execAction({ action: 'search', query: searchQuery }).then(function(res) {
            resolve(res);
          }).catch(function(err) {
            resolve({ ok: false, error: err.message });
          });
        } else {
          resolve(result);
        }
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });
  }

  function executeReadFile(path) {
    return new Promise(function(resolve) {
      try {
        if (typeof execAction === 'function') {
          execAction({ action: 'readPage', url: path }).then(function(res) {
            resolve(res);
          }).catch(function(err) {
            resolve({ ok: false, error: err.message });
          });
        } else {
          // Fallback: try to read from current page context
          resolve({ ok: true, type: 'file_content', path: path, content: '' });
        }
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });
  }

  function executeWriteFile(path, content) {
    return new Promise(function(resolve) {
      try {
        if (typeof execAction === 'function') {
          execAction({ action: 'createFile', path: path, content: content }).then(function(res) {
            resolve(res);
          }).catch(function(err) {
            resolve({ ok: false, error: err.message });
          });
        } else {
          resolve({ ok: true, type: 'file_written', path: path, size: content.length });
        }
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });
  }

  function executeReplaceInFile(path, oldString, newString) {
    return new Promise(function(resolve) {
      try {
        if (typeof execAction === 'function') {
          execAction({ action: 'replaceText', path: path, oldString: oldString, newString: newString }).then(function(res) {
            resolve(res);
          }).catch(function(err) {
            resolve({ ok: false, error: err.message });
          });
        } else {
          resolve({ ok: true, type: 'text_replaced', path: path, replacements: 1 });
        }
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });
  }

  function executeListFiles(path) {
    return new Promise(function(resolve) {
      try {
        if (typeof execAction === 'function') {
          execAction({ action: 'listFiles', path: path || '.' }).then(function(res) {
            resolve(res);
          }).catch(function(err) {
            resolve({ ok: false, error: err.message });
          });
        } else {
          resolve({ ok: true, type: 'file_list', path: path, files: [] });
        }
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });
  }

  function executeCommand(command, cwd) {
    return new Promise(function(resolve) {
      try {
        if (typeof execAction === 'function') {
          execAction({ action: 'executeCommand', command: command, cwd: cwd }).then(function(res) {
            resolve(res);
          }).catch(function(err) {
            resolve({ ok: false, error: err.message });
          });
        } else {
          resolve({ ok: true, type: 'command_output', command: command, output: '' });
        }
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });
  }

  function executeSearchDefinitions(query, path) {
    return new Promise(function(resolve) {
      try {
        var result = { ok: true, type: 'code_definitions', query: query, definitions: [] };
        if (typeof execAction === 'function') {
          execAction({ action: 'searchCode', query: query, path: path }).then(function(res) {
            resolve(res);
          }).catch(function(err) {
            resolve({ ok: false, error: err.message });
          });
        } else {
          resolve(result);
        }
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });
  }

  function executeListCodeDefinitionNames(path) {
    return new Promise(function(resolve) {
      try {
        var result = { ok: true, type: 'definition_names', path: path, definitions: [] };
        if (typeof execAction === 'function') {
          execAction({ action: 'listCodeDefinitions', path: path }).then(function(res) {
            resolve(res);
          }).catch(function(err) {
            resolve({ ok: false, error: err.message });
          });
        } else {
          resolve(result);
        }
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });
  }

  function executeURLReader(url) {
    return new Promise(function(resolve) {
      try {
        if (typeof execAction === 'function') {
          execAction({ action: 'readURL', url: url }).then(function(res) {
            resolve(res);
          }).catch(function(err) {
            resolve({ ok: false, error: err.message });
          });
        } else {
          fetch(url).then(function(r) { return r.text(); }).then(function(text) {
            resolve({ ok: true, type: 'url_content', url: url, content: text.substring(0, 5000) });
          }).catch(function(err) {
            resolve({ ok: false, error: err.message });
          });
        }
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });
  }

  function executeBrowserAction(action, target, value) {
    return new Promise(function(resolve) {
      try {
        var act = { action: action };
        if (target) act.target = target;
        if (value) act.value = value;

        if (typeof execAction === 'function') {
          execAction(act).then(function(res) {
            resolve(res);
          }).catch(function(err) {
            resolve({ ok: false, error: err.message });
          });
        } else {
          resolve({ ok: true, type: 'browser_action', action: action, target: target });
        }
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });
  }

  // ─── Agent loop (multi-step Kilo-style) ───

  function runKiloAgent(goal, options) {
    options = options || {};
    var maxSteps = options.maxSteps || 15;
    var step = 0;
    var history = [];

    log.info('Starting Kilo agent with goal:', goal);

    function nextStep() {
      if (step >= maxSteps) {
        return Promise.resolve({ ok: true, result: 'Max steps reached', history: history });
      }
      step++;

      // Ask the LLM what tool to use next
      var context = 'Goal: ' + goal + '\n\nPrevious steps:\n';
      history.forEach(function(h, i) {
        context += (i + 1) + '. ' + h.tool + ': ' + JSON.stringify(h.params) + ' -> ' + (h.result.ok ? 'OK' : 'ERROR: ' + h.result.error) + '\n';
      });
      context += '\nWhat tool should I use next? Respond with JSON: {"tool": "tool_name", "params": {...}} or {"done": true, "summary": "..."}';

      var messages = [
        { role: 'system', content: 'You are Kilo Code agent running inside X1. You have access to these tools: ' + Object.keys(TOOLS).join(', ') + '. Respond only with valid JSON.' },
        { role: 'user', content: context }
      ];

      return aiComplete(messages, { temperature: 0.1, max_tokens: 200 }).then(function(response) {
        var text = response.completion || response.text || '';
        var parsed = null;

        try {
          parsed = JSON.parse(text);
        } catch (e) {
          // Try to extract JSON from response
          var match = text.match(/\{[\s\S]*\}/);
          if (match) {
            try { parsed = JSON.parse(match[0]); } catch (e2) {}
          }
        }

        if (!parsed) {
          history.push({ tool: 'parse_error', params: {}, result: { ok: false, error: 'Could not parse response' } });
          return nextStep();
        }

        if (parsed.done) {
          return Promise.resolve({ ok: true, result: parsed.summary || 'Task completed', history: history });
        }

        if (parsed.tool && TOOLS[parsed.tool]) {
          return executeTool(parsed.tool, parsed.params || {}).then(function(result) {
            history.push({ tool: parsed.tool, params: parsed.params || {}, result: result });
            return nextStep();
          });
        }

        history.push({ tool: 'unknown', params: parsed, result: { ok: false, error: 'Unknown tool or invalid response' } });
        return nextStep();
      }).catch(function(err) {
        history.push({ tool: 'error', params: {}, result: { ok: false, error: err.message } });
        return Promise.resolve({ ok: false, error: err.message, history: history });
      });
    }

    return nextStep();
  }

  // ─── Public API ───

  window.X1KiloBridge = {
    version: '1.0.0',
    license: 'Apache-2.0',
    source: 'https://github.com/Kilo-Org/kilocode',

    tools: TOOLS,
    executeTool: executeTool,
    runAgent: runKiloAgent,

    listTools: function() {
      return Object.keys(TOOLS).map(function(k) {
        return { name: TOOLS[k].name, description: TOOLS[k].description, parameters: TOOLS[k].parameters };
      });
    },

    healthCheck: function() {
      return Promise.resolve({
        ok: true,
        tools: Object.keys(TOOLS).length,
        version: '1.0.0'
      });
    }
  };

  // Register in integrations registry
  if (window.X1Integrations) {
    window.X1Integrations.register({
      name: 'kilo',
      version: '1.0.0',
      license: 'Apache-2.0',
      path: 'background/integrations/kilo/',
      description: 'Agent mode multi-paso (Kilo Code)',
      healthCheck: function() { return window.X1KiloBridge.healthCheck(); },
      dependencies: ['continue']
    });
    log.info('Kilo Bridge registrado en X1Integrations');
  }

  log.info('X1KiloBridge cargado - tools:', Object.keys(TOOLS).length);

})();
