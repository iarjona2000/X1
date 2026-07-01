var X1GroupChat = (function() {
  var sessions = {};
  var PROVIDER_MAP = {
    groq: function(s, u, o) { return typeof X1ProviderGroq !== 'undefined' ? X1ProviderGroq.complete(s, u, o) : Promise.reject(new Error('GROQ_UNAVAILABLE')); },
    nvidia: function(s, u, o) { return typeof X1ProviderNvidia !== 'undefined' ? X1ProviderNvidia.complete(s, u, o) : Promise.reject(new Error('NVIDIA_UNAVAILABLE')); },
    gemini: function(s, u, o) { return typeof X1ProviderGemini !== 'undefined' ? X1ProviderGemini.complete(s, u, o) : Promise.reject(new Error('GEMINI_UNAVAILABLE')); },
    cerebras: function(s, u, o) { return typeof X1ProviderCerebras !== 'undefined' ? X1ProviderCerebras.complete(s, u, o) : Promise.reject(new Error('CEREBRAS_UNAVAILABLE')); },
    mistral: function(s, u, o) { return typeof X1ProviderMistral !== 'undefined' ? X1ProviderMistral.complete(s, u, o) : Promise.reject(new Error('MISTRAL_UNAVAILABLE')); },
    sambanova: function(s, u, o) { return typeof X1ProviderSambaNova !== 'undefined' ? X1ProviderSambaNova.complete(s, u, o) : Promise.reject(new Error('SAMBANOVA_UNAVAILABLE')); },
    together: function(s, u, o) { return typeof X1ProviderTogether !== 'undefined' ? X1ProviderTogether.complete(s, u, o) : Promise.reject(new Error('TOGETHER_UNAVAILABLE')); },
    openrouter: function(s, u, o) { return typeof X1ProviderOpenRouter !== 'undefined' ? X1ProviderOpenRouter.complete(s, u, o) : Promise.reject(new Error('OPENROUTER_UNAVAILABLE')); },
    cloudflare: function(s, u, o) { return typeof X1ProviderCloudflare !== 'undefined' ? X1ProviderCloudflare.complete(s, u, o) : Promise.reject(new Error('CLOUDFLARE_UNAVAILABLE')); },
    ollama: function(s, u, o) { return typeof X1ProviderOllama !== 'undefined' ? X1ProviderOllama.complete(s, u, o) : Promise.reject(new Error('OLLAMA_UNAVAILABLE')); }
  };

  function createSession(id, providers, systemPrompt) {
    var pid = id || 'gc_' + Date.now();
    sessions[pid] = {
      id: pid,
      providers: providers || ['groq', 'gemini', 'mistral'],
      systemPrompt: systemPrompt || 'You are a helpful AI assistant participating in a group discussion. Be concise and add unique value.',
      history: [],
      created: Date.now()
    };
    return sessions[pid];
  }

  function getSession(id) { return sessions[id] || null; }

  function sendToAll(sessionId, userMessage) {
    var session = sessions[sessionId];
    if (!session) return Promise.reject(new Error('SESSION_NOT_FOUND'));
    session.history.push({ role: 'user', content: userMessage, time: Date.now() });
    var contextMsg = userMessage;
    if (session.history.length > 1) {
      var recent = session.history.slice(-6);
      var ctx = recent.map(function(m) {
        return (m.provider ? '[' + m.provider + ']' : '[user]') + ': ' + m.content;
      }).join('\n');
      contextMsg = 'Conversation so far:\n' + ctx + '\n\nRespond to the latest message.';
    }
    var promises = session.providers.map(function(providerName) {
      var callFn = PROVIDER_MAP[providerName];
      if (!callFn) return Promise.resolve({ provider: providerName, error: 'PROVIDER_NOT_FOUND' });
      return callFn(session.systemPrompt, contextMsg, { maxTokens: 400, temperature: 0.8 })
        .then(function(text) {
          return { provider: providerName, text: text, time: Date.now() };
        })
        .catch(function(e) {
          return { provider: providerName, error: e.message, time: Date.now() };
        });
    });
    return Promise.all(promises).then(function(results) {
      results.forEach(function(r) {
        if (r.text) {
          session.history.push({ role: 'assistant', provider: r.provider, content: r.text, time: r.time });
        }
      });
      return { sessionId: sessionId, responses: results };
    });
  }

  function sendToOne(sessionId, providerName, userMessage) {
    var session = sessions[sessionId];
    if (!session) return Promise.reject(new Error('SESSION_NOT_FOUND'));
    var callFn = PROVIDER_MAP[providerName];
    if (!callFn) return Promise.reject(new Error('PROVIDER_NOT_FOUND'));
    session.history.push({ role: 'user', content: userMessage, time: Date.now(), target: providerName });
    return callFn(session.systemPrompt, userMessage, { maxTokens: 600, temperature: 0.7 })
      .then(function(text) {
        var entry = { role: 'assistant', provider: providerName, content: text, time: Date.now() };
        session.history.push(entry);
        return entry;
      });
  }

  function debate(topic, providers, rounds) {
    var provs = providers || ['groq', 'gemini', 'mistral'];
    var numRounds = rounds || 2;
    var session = createSession(null, provs, 'You are in a debate. Present your position clearly and respond to other participants. Be concise (max 100 words).');
    var chain = Promise.resolve();
    var allResponses = [];

    function doRound(roundNum) {
      chain = chain.then(function() {
        var prompt = roundNum === 0
          ? 'Debate topic: ' + topic + '. Present your initial position.'
          : 'Continue the debate. Here are previous responses:\n' +
            allResponses.slice(-provs.length).map(function(r) {
              return '[' + r.provider + ']: ' + r.text;
            }).join('\n') + '\n\nRespond with your counterpoint or agreement.';
        return sendToAll(session.id, prompt).then(function(result) {
          result.responses.forEach(function(r) { if (r.text) allResponses.push(r); });
        });
      });
    }

    for (var i = 0; i < numRounds; i++) { doRound(i); }

    return chain.then(function() {
      return { sessionId: session.id, topic: topic, rounds: numRounds, responses: allResponses };
    });
  }

  function getAvailableProviders() {
    var available = [];
    Object.keys(PROVIDER_MAP).forEach(function(name) {
      available.push(name);
    });
    return available;
  }

  function closeSession(id) {
    var session = sessions[id];
    delete sessions[id];
    return session || null;
  }

  function getHistory(sessionId) {
    var session = sessions[sessionId];
    return session ? session.history : [];
  }

  return {
    createSession: createSession,
    getSession: getSession,
    sendToAll: sendToAll,
    sendToOne: sendToOne,
    debate: debate,
    getAvailableProviders: getAvailableProviders,
    closeSession: closeSession,
    getHistory: getHistory,
    PROVIDER_MAP: PROVIDER_MAP
  };
})();
