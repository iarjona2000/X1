var X1CascadeRouter = (function() {

  var TASK_TYPES = {
    CONVERSATIONAL: 'conversational',
    EMAIL: 'email',
    AGENT: 'agent',
    TRANSLATION: 'translation',
    RESEARCH: 'research',
    ANALYSIS: 'analysis',
    CODE: 'code',
    CREATIVE: 'creative',
    EXTRACTION: 'extraction'
  };

  var PROVIDER_ORDER = {
    conversational: ['proxy', 'groq', 'gemini', 'openai', 'mistral', 'ollama'],
    email: ['groq', 'gemini', 'openai', 'proxy', 'ollama'],
    agent: ['groq', 'proxy', 'gemini', 'deepseek', 'ollama'],
    translation: ['gemini', 'proxy', 'groq', 'ollama'],
    research: ['gemini', 'proxy', 'groq', 'openai', 'ollama'],
    analysis: ['gemini', 'groq', 'proxy', 'openai', 'ollama'],
    code: ['groq', 'proxy', 'gemini', 'deepseek', 'ollama'],
    creative: ['proxy', 'openai', 'gemini', 'groq', 'ollama'],
    extraction: ['groq', 'proxy', 'gemini', 'ollama']
  };

  var SECTOR_RUBRICS = {
    conversational: { maxTokens: 300, temperature: 0.7, topP: 0.9 },
    email: { maxTokens: 500, temperature: 0.4, topP: 0.85 },
    agent: { maxTokens: 200, temperature: 0.1, topP: 0.8 },
    translation: { maxTokens: 1000, temperature: 0.2, topP: 0.9 },
    research: { maxTokens: 1500, temperature: 0.3, topP: 0.85 },
    analysis: { maxTokens: 800, temperature: 0.3, topP: 0.85 },
    code: { maxTokens: 1000, temperature: 0.1, topP: 0.8 },
    creative: { maxTokens: 800, temperature: 0.8, topP: 0.95 },
    extraction: { maxTokens: 500, temperature: 0.1, topP: 0.8 }
  };

  function classifyTask(userMessage, pageContext) {
    var msg = (userMessage || '').toLowerCase();
    var ctx = (pageContext || '').toLowerCase();

    if (/traduce|translate|traducci|en ingl[eé]s|en franc[eé]s|en alem[aá]n/i.test(msg)) return TASK_TYPES.TRANSLATION;
    if (/investiga|research|deep research|busca info|competitor|mercado/i.test(msg)) return TASK_TYPES.RESEARCH;
    if (/analiza|compara|eval[uú]a|analyze|compare|evaluate/i.test(msg)) return TASK_TYPES.ANALYSIS;
    if (/programa|escribe c[oó]digo|c[oó]digo|code|implement|function|class|refactor/i.test(msg)) return TASK_TYPES.CODE;
    if (/escribe un|crea un|haz un|generate|write|create|draft/i.test(msg)) return TASK_TYPES.CREATIVE;
    if (/extrae|extract|scrape|saca|obt[eé]n/i.test(msg)) return TASK_TYPES.EXTRACTION;
    if (/email|correo|mandar|enviar|draft|reply/i.test(msg)) return TASK_TYPES.EMAIL;
    if (/navega|clic|click|rellena|submit|scroll|escribe en/i.test(msg) || ctx.length > 200) return TASK_TYPES.AGENT;

    return TASK_TYPES.CONVERSATIONAL;
  }

  function getProviderOrder(taskType) {
    return PROVIDER_ORDER[taskType] || PROVIDER_ORDER.conversational;
  }

  function getRubric(taskType) {
    return SECTOR_RUBRICS[taskType] || SECTOR_RUBRICS.conversational;
  }

  function buildSystemPromptForTask(taskType, context) {
    var rubric = getRubric(taskType);
    var basePrompt = 'Eres X1, un asistente de IA. Responde en español de forma clara y concisa. ';
    basePrompt += 'Fecha: ' + (context.date || new Date().toISOString()) + '. ';
    if (context.memory && context.memory.length) {
      basePrompt += 'Contexto reciente: ' + context.memory.slice(-3).map(function(m) { return m.content; }).join(' | ') + '. ';
    }
    if (context.pageCtx) basePrompt += 'Página actual: ' + context.pageCtx.substring(0, 500) + '. ';
    basePrompt += 'Sé ' + (rubric.temperature < 0.3 ? 'preciso y directo' : rubric.temperature < 0.6 ? 'equilibrado' : 'creativo') + '. ';
    if (taskType === TASK_TYPES.EMAIL) basePrompt += 'Redacta en formato de correo electrónico profesional. ';
    if (taskType === TASK_TYPES.AGENT) basePrompt += 'Responde SOLO con JSON: {"action":"...","params":{...}}. ';
    if (taskType === TASK_TYPES.TRANSLATION) basePrompt += 'Traduce el texto manteniendo el tono y formato original. ';
    if (taskType === TASK_TYPES.EXTRACTION) basePrompt += 'Extrae la información solicitada en formato JSON estructurado. ';
    return basePrompt;
  }

  function runPanel(userMsg, taskType, providers, context) {
    var rubric = getRubric(taskType);
    var systemPrompt = buildSystemPromptForTask(taskType, context);
    var calls = providers.map(function(provider) {
      return callProviderSafe(provider, systemPrompt, userMsg, rubric).then(function(result) {
        return { provider: provider, text: result, error: null };
      }).catch(function(err) {
        return { provider: provider, text: null, error: err.message || 'fallo' };
      });
    });
    return Promise.allSettled(calls).then(function(results) {
      var fulfilled = [];
      results.forEach(function(r) {
        if (r.status === 'fulfilled' && r.value && r.value.text) fulfilled.push(r.value);
      });
      return judgePanel(fulfilled, userMsg, taskType);
    });
  }

  function callProviderSafe(provider, systemPrompt, userMsg, rubric) {
    return new Promise(function(resolve, reject) {
      var timeout = setTimeout(function() { reject(new Error('timeout')); }, 15000);
      try {
        chrome.runtime.sendMessage({
          type: 'AI_COMPLETE',
          provider: provider,
          systemPrompt: systemPrompt,
          userMsg: userMsg,
          maxTokens: rubric.maxTokens,
          temperature: rubric.temperature
        }, function(resp) {
          clearTimeout(timeout);
          if (resp && resp.text) resolve(resp.text);
          else reject(new Error((resp && resp.error) || 'no response'));
        });
      } catch(e) { clearTimeout(timeout); reject(e); }
    });
  }

  function judgePanel(candidates, userMsg, taskType) {
    if (!candidates || candidates.length === 0) return { winner: null, alternatives: [], reason: 'no_candidates' };
    if (candidates.length === 1) return { winner: candidates[0], alternatives: [], reason: 'single_candidate' };
    var judgeProvider = candidates[1].provider;
    if (candidates.length > 2) judgeProvider = candidates[2].provider;
    var judgePrompt = 'Eres un juez imparcial. Evalúa estas respuestas para: "' + userMsg.substring(0, 100) + '". ';
    judgePrompt += 'Selecciona la mejor basándote en: precisión, claridad, utilidad. ';
    judgePrompt += 'Respuestas:\n';
    candidates.forEach(function(c, i) { judgePrompt += '[' + i + ' ' + c.provider + ']: ' + (c.text || '').substring(0, 200) + '\n'; });
    judgePrompt += 'Responde SOLO con el número de la mejor respuesta (0-' + (candidates.length - 1) + ').';
    return callProviderSafe(judgeProvider, 'Eres un juez neutral.', judgePrompt, { maxTokens: 10, temperature: 0.1 }).then(function(judgeResult) {
      var winnerIdx = parseInt(judgeResult) || 0;
      if (isNaN(winnerIdx) || winnerIdx < 0 || winnerIdx >= candidates.length) winnerIdx = 0;
      var winner = candidates[winnerIdx];
      var alternatives = candidates.filter(function(_, i) { return i !== winnerIdx; });
      return { winner: winner, alternatives: alternatives, reason: 'judge_selected' };
    }).catch(function() {
      return { winner: candidates[0], alternatives: candidates.slice(1), reason: 'judge_failed_fallback' };
    });
  }

  return {
    TASK_TYPES: TASK_TYPES,
    classifyTask: classifyTask,
    getProviderOrder: getProviderOrder,
    getRubric: getRubric,
    buildSystemPromptForTask: buildSystemPromptForTask,
    runPanel: runPanel,
    judgePanel: judgePanel
  };
})();
