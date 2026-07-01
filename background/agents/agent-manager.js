var X1AgentManager = (function() {

  var STORAGE_KEY = 'x1_agents';
  var METRICS_KEY = 'x1_agent_metrics';

  var PROVIDER_MAP = {
    groq: function(msg, sys) { return typeof groqComplete === 'function' ? groqComplete(msg, sys) : Promise.resolve(null); },
    grok: function(msg, sys) { return typeof grokComplete === 'function' ? grokComplete(msg, sys) : Promise.resolve(null); },
    openai: function(msg, sys) { return typeof openaiComplete === 'function' ? openaiComplete(msg, sys) : Promise.resolve(null); },
    gemini: function(msg, sys) { return typeof geminiComplete === 'function' ? geminiComplete(msg, sys) : Promise.resolve(null); },
    ollama: function(msg, sys) { return typeof ollamaComplete === 'function' ? ollamaComplete(msg, sys) : Promise.resolve(null); },
    proxy: function(msg, sys) { return typeof proxyComplete === 'function' ? proxyComplete(msg, sys) : Promise.resolve(null); },
    auto: function(msg, sys) { return typeof aiComplete === 'function' ? aiComplete(msg, sys) : Promise.resolve(null); }
  };

  var BUILT_IN_AGENTS = [
    {
      id: 'builtin_research',
      name: 'Research Agent',
      description: 'Deep web research and information synthesis',
      model: 'auto',
      systemPrompt: 'You are a research specialist. Analyze sources critically, cross-reference facts, and provide comprehensive summaries with key findings. Always cite your reasoning.',
      permissions: ['navigate', 'readPage', 'search'],
      knowledgeSources: [],
      visibility: 'public',
      builtIn: true
    },
    {
      id: 'builtin_legal',
      name: 'Legal Agent',
      description: 'Legal document analysis and compliance review',
      model: 'auto',
      systemPrompt: 'You are a legal analyst. Review documents for legal implications, identify risks, summarize terms and conditions, and flag potential compliance issues. Always note you are not providing legal advice.',
      permissions: ['readPage'],
      knowledgeSources: [],
      visibility: 'public',
      builtIn: true
    },
    {
      id: 'builtin_marketing',
      name: 'Marketing Agent',
      description: 'Marketing copy, campaign strategy, and brand analysis',
      model: 'auto',
      systemPrompt: 'You are a marketing strategist. Create compelling copy, analyze brand positioning, suggest campaign strategies, and optimize messaging for target audiences.',
      permissions: ['readPage', 'navigate'],
      knowledgeSources: [],
      visibility: 'public',
      builtIn: true
    },
    {
      id: 'builtin_finance',
      name: 'Finance Agent',
      description: 'Financial analysis, reporting, and market insights',
      model: 'auto',
      systemPrompt: 'You are a financial analyst. Analyze financial data, create reports, interpret market trends, and provide data-driven insights. Always note limitations of your analysis.',
      permissions: ['readPage', 'navigate', 'search'],
      knowledgeSources: [],
      visibility: 'public',
      builtIn: true
    },
    {
      id: 'builtin_support',
      name: 'Support Agent',
      description: 'Customer support responses and issue resolution',
      model: 'auto',
      systemPrompt: 'You are a customer support specialist. Respond empathetically, diagnose issues systematically, provide clear solutions, and escalate when needed. Keep responses professional and helpful.',
      permissions: ['readPage'],
      knowledgeSources: [],
      visibility: 'public',
      builtIn: true
    },
    {
      id: 'builtin_writer',
      name: 'Writer Agent',
      description: 'Content creation, editing, and style adaptation',
      model: 'auto',
      systemPrompt: 'You are a professional writer and editor. Create clear, engaging content adapted to the requested style and audience. Edit for clarity, grammar, and impact.',
      permissions: ['readPage'],
      knowledgeSources: [],
      visibility: 'public',
      builtIn: true
    },
    {
      id: 'builtin_developer',
      name: 'Developer Agent',
      description: 'Code generation, debugging, and technical architecture',
      model: 'auto',
      systemPrompt: 'You are a senior software developer. Write clean, efficient code. Debug systematically. Suggest architectural improvements. Follow best practices for the relevant language and framework.',
      permissions: ['readPage', 'navigate', 'search'],
      knowledgeSources: [],
      visibility: 'public',
      builtIn: true
    }
  ];

  function generateId() {
    return 'agent_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  function loadAgents() {
    return new Promise(function(resolve) {
      chrome.storage.local.get(STORAGE_KEY, function(data) {
        resolve(data[STORAGE_KEY] || []);
      });
    });
  }

  function saveAgents(agents) {
    var obj = {};
    obj[STORAGE_KEY] = agents;
    return new Promise(function(resolve) {
      chrome.storage.local.set(obj, function() {
        resolve();
      });
    });
  }

  function loadMetrics() {
    return new Promise(function(resolve) {
      chrome.storage.local.get(METRICS_KEY, function(data) {
        resolve(data[METRICS_KEY] || {});
      });
    });
  }

  function saveMetrics(metrics) {
    var obj = {};
    obj[METRICS_KEY] = metrics;
    return new Promise(function(resolve) {
      chrome.storage.local.set(obj, function() {
        resolve();
      });
    });
  }

  function createAgent(config) {
    var agent = {
      id: generateId(),
      name: config.name || 'Unnamed Agent',
      description: config.description || '',
      model: config.model || 'auto',
      systemPrompt: config.systemPrompt || '',
      permissions: config.permissions || [],
      knowledgeSources: config.knowledgeSources || [],
      visibility: config.visibility || 'private',
      builtIn: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    return loadAgents().then(function(agents) {
      agents.push(agent);
      return saveAgents(agents).then(function() {
        return agent;
      });
    });
  }

  function getAgent(agentId) {
    var builtIn = null;
    for (var i = 0; i < BUILT_IN_AGENTS.length; i++) {
      if (BUILT_IN_AGENTS[i].id === agentId) {
        builtIn = BUILT_IN_AGENTS[i];
        break;
      }
    }
    if (builtIn) return Promise.resolve(builtIn);

    return loadAgents().then(function(agents) {
      for (var j = 0; j < agents.length; j++) {
        if (agents[j].id === agentId) return agents[j];
      }
      return null;
    });
  }

  function listAgents() {
    return loadAgents().then(function(agents) {
      return BUILT_IN_AGENTS.concat(agents);
    });
  }

  function updateAgent(agentId, updates) {
    return loadAgents().then(function(agents) {
      for (var i = 0; i < agents.length; i++) {
        if (agents[i].id === agentId) {
          var keys = Object.keys(updates);
          for (var k = 0; k < keys.length; k++) {
            if (keys[k] !== 'id' && keys[k] !== 'builtIn' && keys[k] !== 'createdAt') {
              agents[i][keys[k]] = updates[keys[k]];
            }
          }
          agents[i].updatedAt = Date.now();
          return saveAgents(agents).then(function() {
            return agents[i];
          });
        }
      }
      return null;
    });
  }

  function deleteAgent(agentId) {
    return loadAgents().then(function(agents) {
      var filtered = [];
      for (var i = 0; i < agents.length; i++) {
        if (agents[i].id !== agentId) filtered.push(agents[i]);
      }
      return saveAgents(filtered).then(function() {
        return filtered.length < agents.length;
      });
    });
  }

  function callAgent(agentId, userMsg, context) {
    return getAgent(agentId).then(function(agent) {
      if (!agent) return Promise.resolve(null);

      var sysPrompt = agent.systemPrompt;
      if (context) {
        sysPrompt = sysPrompt + '\n\nContext:\n' + (typeof context === 'string' ? context : JSON.stringify(context));
      }

      var providerFn = PROVIDER_MAP[agent.model] || PROVIDER_MAP.auto;
      return providerFn(userMsg, sysPrompt).then(function(response) {
        if (response && typeof isValidContent === 'function' && !isValidContent(response)) {
          return null;
        }
        return response;
      });
    });
  }

  function orchestrateAgents(agentIds, userMsg, context) {
    var results = [];
    var currentInput = userMsg;
    var currentContext = context || '';

    function runNext(index) {
      if (index >= agentIds.length) {
        return Promise.resolve({
          finalOutput: currentInput,
          contributions: results
        });
      }
      var aid = agentIds[index];
      var enrichedContext = currentContext;
      if (results.length > 0) {
        enrichedContext = enrichedContext + '\n\nPrevious agent output:\n' + results[results.length - 1].output;
      }
      return callAgent(aid, currentInput, enrichedContext).then(function(output) {
        results.push({
          agentId: aid,
          output: output || ''
        });
        if (output) currentInput = output;
        return runNext(index + 1);
      });
    }

    return runNext(0);
  }

  function getAgentMetrics(agentId) {
    return loadMetrics().then(function(allMetrics) {
      var m = allMetrics[agentId];
      if (!m) {
        return {
          agentId: agentId,
          useCount: 0,
          successCount: 0,
          failCount: 0,
          totalSatisfaction: 0,
          ratingCount: 0,
          successRate: 0,
          avgSatisfaction: 0
        };
      }
      return {
        agentId: agentId,
        useCount: m.useCount || 0,
        successCount: m.successCount || 0,
        failCount: m.failCount || 0,
        totalSatisfaction: m.totalSatisfaction || 0,
        ratingCount: m.ratingCount || 0,
        successRate: m.useCount > 0 ? ((m.successCount || 0) / m.useCount) : 0,
        avgSatisfaction: m.ratingCount > 0 ? ((m.totalSatisfaction || 0) / m.ratingCount) : 0
      };
    });
  }

  function recordAgentOutcome(agentId, outcome) {
    return loadMetrics().then(function(allMetrics) {
      if (!allMetrics[agentId]) {
        allMetrics[agentId] = {
          useCount: 0,
          successCount: 0,
          failCount: 0,
          totalSatisfaction: 0,
          ratingCount: 0
        };
      }
      var m = allMetrics[agentId];
      m.useCount = (m.useCount || 0) + 1;
      if (outcome.success) {
        m.successCount = (m.successCount || 0) + 1;
      } else {
        m.failCount = (m.failCount || 0) + 1;
      }
      if (typeof outcome.satisfaction === 'number' && outcome.satisfaction >= 1 && outcome.satisfaction <= 5) {
        m.totalSatisfaction = (m.totalSatisfaction || 0) + outcome.satisfaction;
        m.ratingCount = (m.ratingCount || 0) + 1;
      }
      m.lastUsed = outcome.timestamp || Date.now();
      return saveMetrics(allMetrics);
    });
  }

  function getBuiltInAgents() {
    return BUILT_IN_AGENTS.slice();
  }

  return {
    createAgent: createAgent,
    getAgent: getAgent,
    listAgents: listAgents,
    updateAgent: updateAgent,
    deleteAgent: deleteAgent,
    callAgent: callAgent,
    orchestrateAgents: orchestrateAgents,
    getAgentMetrics: getAgentMetrics,
    recordAgentOutcome: recordAgentOutcome,
    getBuiltInAgents: getBuiltInAgents
  };

})();
