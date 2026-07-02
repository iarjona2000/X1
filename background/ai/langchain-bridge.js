/**
 * langchain-bridge.js — Adaptador de LangChain.js para X1
 *
 * Extrae la logica de LangChain (chains, agents, memory, retrieval)
 * y la expone como interfaz ES5 para X1.
 * Licencia: MIT (LangChain Contributors)
 */

(function() {
  'use strict';

  var log = (typeof x1Log === 'function') ? x1Log('LangChainBridge') : { info: function(m){console.log('[X1-LangChain]',m);}, warn: function(m){console.warn('[X1-LangChain]',m);}, error: function(m){console.error('[X1-LangChain]',m);} };

  // ─── Chain base ───

  function Chain(options) {
    this.name = options.name || 'unnamed-chain';
    this.steps = [];
    this.memory = null;
  }

  Chain.prototype.addStep = function(step) {
    this.steps.push(step);
    return this;
  };

  Chain.prototype.setMemory = function(memory) {
    this.memory = memory;
    return this;
  };

  Chain.prototype.run = function(input) {
    var self = this;
    var current = input;
    var stepIndex = 0;

    function nextStep() {
      if (stepIndex >= self.steps.length) {
        return Promise.resolve(current);
      }
      var step = self.steps[stepIndex];
      stepIndex++;

      if (typeof step === 'function') {
        return Promise.resolve(step(current)).then(function(result) {
          current = result;
          return nextStep();
        });
      }
      if (step && typeof step.run === 'function') {
        return step.run(current).then(function(result) {
          current = result;
          return nextStep();
        });
      }
      return nextStep();
    }

    return nextStep().then(function(result) {
      if (self.memory) {
        self.memory.add({ input: input, output: result });
      }
      return result;
    });
  };

  // ─── Conversational Chain ───

  function ConversationalChain(options) {
    Chain.call(this, options);
    this.llm = options.llm || null;
    this.systemPrompt = options.systemPrompt || 'You are a helpful assistant.';
  }

  ConversationalChain.prototype = Object.create(Chain.prototype);
  ConversationalChain.prototype.constructor = ConversationalChain;

  ConversationalChain.prototype.predict = function(message, history) {
    var self = this;
    history = history || [];

    var messages = [{ role: 'system', content: this.systemPrompt }];
    history.forEach(function(h) {
      messages.push({ role: h.role || 'user', content: h.content });
    });
    messages.push({ role: 'user', content: message });

    if (this.llm && typeof this.llm.complete === 'function') {
      return this.llm.complete(messages).then(function(result) {
        if (self.memory) {
          self.memory.add({ role: 'user', content: message });
          self.memory.add({ role: 'assistant', content: result.completion || result.text || '' });
        }
        return result.completion || result.text || '';
      });
    }

    return Promise.resolve('LLM not configured');
  };

  // ─── Retrieval Chain ───

  function RetrievalChain(options) {
    Chain.call(this, options);
    this.retriever = options.retriever || null;
    this.llm = options.llm || null;
    this.topK = options.topK || 3;
  }

  RetrievalChain.prototype = Object.create(Chain.prototype);
  RetrievalChain.prototype.constructor = RetrievalChain;

  RetrievalChain.prototype.query = function(question) {
    var self = this;
    if (!this.retriever) {
      return Promise.resolve('No retriever configured');
    }

    return this.retriever.search(question, this.topK).then(function(results) {
      var context = results.map(function(r) { return r.text || r.content || ''; }).join('\n\n');
      var prompt = 'Context:\n' + context + '\n\nQuestion: ' + question + '\n\nAnswer:';

      if (self.llm && typeof self.llm.complete === 'function') {
        return self.llm.complete([
          { role: 'system', content: 'Answer based on the provided context.' },
          { role: 'user', content: prompt }
        ]).then(function(result) {
          return { answer: result.completion || result.text || '', sources: results };
        });
      }
      return { answer: context, sources: results };
    });
  };

  // ─── Agent ───

  function Agent(options) {
    this.name = options.name || 'agent';
    this.llm = options.llm || null;
    this.tools = options.tools || [];
    this.maxIterations = options.maxIterations || 10;
  }

  Agent.prototype.run = function(goal) {
    var self = this;
    var iteration = 0;
    var history = [];

    function step() {
      if (iteration >= self.maxIterations) {
        return Promise.resolve({ result: 'Max iterations reached', history: history });
      }
      iteration++;

      var toolNames = self.tools.map(function(t) { return t.name; }).join(', ');
      var context = 'Goal: ' + goal + '\nTools: ' + toolNames + '\nHistory:\n';
      history.forEach(function(h, i) {
        context += (i + 1) + '. Action: ' + h.action + ', Result: ' + (h.result.ok ? 'OK' : 'ERROR') + '\n';
      });
      context += '\nNext action (JSON): {"tool": "name", "params": {...}} or {"done": true, "summary": "..."}';

      if (!self.llm || typeof self.llm.complete !== 'function') {
        return Promise.resolve({ result: 'No LLM configured', history: history });
      }

      return self.llm.complete([
        { role: 'system', content: 'You are an agent. Respond with JSON only.' },
        { role: 'user', content: context }
      ]).then(function(response) {
        var text = response.completion || response.text || '';
        var parsed = null;
        try { parsed = JSON.parse(text); } catch (e) {
          var match = text.match(/\{[\s\S]*\}/);
          if (match) try { parsed = JSON.parse(match[0]); } catch (e2) {}
        }

        if (!parsed) {
          history.push({ action: 'parse_error', result: { ok: false } });
          return step();
        }

        if (parsed.done) {
          return { result: parsed.summary || 'Done', history: history };
        }

        var tool = self.tools.find(function(t) { return t.name === parsed.tool; });
        if (tool && typeof tool.execute === 'function') {
          return tool.execute(parsed.params || {}).then(function(result) {
            history.push({ action: parsed.tool, params: parsed.params, result: result });
            return step();
          });
        }

        history.push({ action: parsed.tool || 'unknown', result: { ok: false, error: 'Tool not found' } });
        return step();
      });
    }

    return step();
  };

  // ─── Memory ───

  function ConversationMemory(options) {
    this.messages = [];
    this.maxMessages = (options && options.maxMessages) || 50;
  }

  ConversationMemory.prototype.add = function(message) {
    this.messages.push(message);
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
  };

  ConversationMemory.prototype.getHistory = function() {
    return this.messages.slice();
  };

  ConversationMemory.prototype.clear = function() {
    this.messages = [];
  };

  ConversationMemory.prototype.getSummary = function() {
    return this.messages.map(function(m) {
      return (m.role || 'user') + ': ' + (m.content || '').substring(0, 100);
    }).join('\n');
  };

  // ─── Retriever ───

  function MemoryRetriever(options) {
    this.documents = [];
    this.maxResults = (options && options.maxResults) || 5;
  }

  MemoryRetriever.prototype.addDocument = function(doc) {
    this.documents.push(doc);
  };

  MemoryRetriever.prototype.search = function(query, topK) {
    topK = topK || this.maxResults;
    var queryLower = query.toLowerCase();
    var words = queryLower.split(/\s+/).filter(function(w) { return w.length > 2; });

    var scored = this.documents.map(function(doc) {
      var text = (doc.text || doc.content || '').toLowerCase();
      var score = 0;
      words.forEach(function(word) {
        if (text.indexOf(word) >= 0) score += 1;
      });
      return { document: doc, score: score };
    });

    scored.sort(function(a, b) { return b.score - a.score; });
    return Promise.resolve(scored.slice(0, topK).map(function(s) { return s.document; }));
  };

  // ─── Public API ───

  window.X1LangChainBridge = {
    version: '1.0.0',
    license: 'MIT',
    source: 'https://github.com/langchain-ai/langchainjs',

    Chain: Chain,
    ConversationalChain: ConversationalChain,
    RetrievalChain: RetrievalChain,
    Agent: Agent,
    ConversationMemory: ConversationMemory,
    MemoryRetriever: MemoryRetriever,

    createChain: function(opts) { return new Chain(opts || {}); },
    createConversationalChain: function(opts) { return new ConversationalChain(opts || {}); },
    createRetrievalChain: function(opts) { return new RetrievalChain(opts || {}); },
    createAgent: function(opts) { return new Agent(opts || {}); },
    createMemory: function(opts) { return new ConversationMemory(opts || {}); },
    createRetriever: function(opts) { return new MemoryRetriever(opts || {}); },

    healthCheck: function() {
      return Promise.resolve({ ok: true, version: '1.0.0', components: ['Chain', 'Agent', 'Memory', 'Retriever'] });
    }
  };

  if (window.X1Integrations) {
    window.X1Integrations.register({
      name: 'langchain',
      version: '1.0.0',
      license: 'MIT',
      path: 'background/integrations/langchain/',
      description: 'Framework de AI chains, agents y memory',
      healthCheck: function() { return window.X1LangChainBridge.healthCheck(); },
      dependencies: []
    });
  }

  log.info('X1LangChainBridge cargado');

})();
