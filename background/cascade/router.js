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

  var SECTOR_RUBRICS = {
    legal: {
      primary: { name: 'precision', weight: 0.7 },
      secondary: { name: 'clarity', weight: 0.3 },
      maxTokens: 1000,
      temperature: 0.2,
      topP: 0.85
    },
    marketing: {
      primary: { name: 'persuasion', weight: 0.7 },
      secondary: { name: 'brevity', weight: 0.3 },
      maxTokens: 600,
      temperature: 0.7,
      topP: 0.9
    },
    finanzas: {
      primary: { name: 'numerical_accuracy', weight: 0.7 },
      secondary: { name: 'explanation', weight: 0.3 },
      maxTokens: 800,
      temperature: 0.15,
      topP: 0.8
    },
    customer_service: {
      primary: { name: 'resolution', weight: 0.7 },
      secondary: { name: 'empathy', weight: 0.3 },
      maxTokens: 500,
      temperature: 0.5,
      topP: 0.9
    },
    technical: {
      primary: { name: 'correctness', weight: 0.7 },
      secondary: { name: 'readability', weight: 0.3 },
      maxTokens: 1000,
      temperature: 0.1,
      topP: 0.8
    },
    general: {
      primary: { name: 'relevance', weight: 0.7 },
      secondary: { name: 'clarity', weight: 0.3 },
      maxTokens: 500,
      temperature: 0.5,
      topP: 0.9
    }
  };

  var TASK_RUBRICS = {
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

  var ALL_PROVIDERS = [
    'proxy', 'groq', 'nvidia', 'ollama', 'opencode', 'gemini',
    'openrouter', 'cerebras', 'sambanova', 'mistral', 'deepseek',
    'together', 'cloudflare'
  ];

  var PROVIDER_FNS = {
    proxy: function(m) { return typeof proxyComplete === 'function' ? proxyComplete(m) : Promise.resolve(null); },
    groq: function(m) { return typeof groqComplete === 'function' ? groqComplete(m) : Promise.resolve(null); },
    nvidia: function(m) { return typeof nvidiaComplete === 'function' ? nvidiaComplete(m) : Promise.resolve(null); },
    ollama: function(m) { return typeof ollamaComplete === 'function' ? ollamaComplete(m) : Promise.resolve(null); },
    opencode: function(m) { return typeof opencodeComplete === 'function' ? opencodeComplete(m) : Promise.resolve(null); },
    gemini: function(m) { return typeof geminiComplete === 'function' ? geminiComplete(m) : Promise.resolve(null); },
    openrouter: function(m) { return typeof openrouterComplete === 'function' ? openrouterComplete(m) : Promise.resolve(null); },
    cerebras: function(m) { return typeof cerebrasComplete === 'function' ? cerebrasComplete(m) : Promise.resolve(null); },
    sambanova: function(m) { return typeof sambanovaComplete === 'function' ? sambanovaComplete(m) : Promise.resolve(null); },
    mistral: function(m) { return typeof mistralComplete === 'function' ? mistralComplete(m) : Promise.resolve(null); },
    deepseek: function(m) { return typeof deepseekComplete === 'function' ? deepseekComplete(m) : Promise.resolve(null); },
    together: function(m) { return typeof togetherComplete === 'function' ? togetherComplete(m) : Promise.resolve(null); },
    cloudflare: function(m) { return typeof cloudflareComplete === 'function' ? cloudflareComplete(m) : Promise.resolve(null); }
  };

  function classifyTask(userMessage, pageContext) {
    var msg = (userMessage || '').toLowerCase();
    var ctx = (pageContext || '').toLowerCase();

    if (/traduce|translate|traducci|en ingl[eé]s|en franc[eé]s|en alem[aá]n|en portugu[eé]s|en italiano|en chino|en japon[eé]s/i.test(msg)) return TASK_TYPES.TRANSLATION;
    if (/investiga|research|deep research|busca info|competitor|mercado|indaga|explora sobre/i.test(msg)) return TASK_TYPES.RESEARCH;
    if (/analiza|compara|eval[uú]a|analyze|compare|evaluate|diagn[oó]stic/i.test(msg)) return TASK_TYPES.ANALYSIS;
    if (/programa|escribe c[oó]digo|c[oó]digo|code|implement|function|class|refactor|debug|fix bug/i.test(msg)) return TASK_TYPES.CODE;
    if (/escribe un|crea un|haz un|generate|write|create|draft|redacta|comp[oó]n/i.test(msg)) return TASK_TYPES.CREATIVE;
    if (/extrae|extract|scrape|saca|obt[eé]n|parse|lee los datos/i.test(msg)) return TASK_TYPES.EXTRACTION;
    if (/email|correo|mandar|enviar|draft|reply|responde al mail|reenv[ií]a/i.test(msg)) return TASK_TYPES.EMAIL;
    if (/navega|clic|click|rellena|submit|scroll|escribe en|abre la p[aá]gina/i.test(msg) || ctx.length > 200) return TASK_TYPES.AGENT;

    return TASK_TYPES.CONVERSATIONAL;
  }

  function detectSector(userMsg, pageContext) {
    var msg = (userMsg || '').toLowerCase();
    var ctx = (pageContext || '').toLowerCase();
    var combined = msg + ' ' + ctx;

    if (/legal|contrato|cl[aá]usula|ley|normativa|regulaci|jur[ií]dic|abogad/i.test(combined)) return 'legal';
    if (/marketing|publicidad|campa[ñn]a|marca|branding|copy|anuncio|ad |ads /i.test(combined)) return 'marketing';
    if (/finanza|financier|inversi|balance|cuenta|banco|trading|bolsa|stock|cripto|bitcoin|presupuesto|fiscal/i.test(combined)) return 'finanzas';
    if (/cliente|soporte|queja|reclamaci|ticket|incidencia|customer|support|help desk/i.test(combined)) return 'customer_service';
    if (/t[eé]cnic|servidor|api|base de datos|deploy|devops|infraestructur|arquitectur|backend|frontend|bug|error/i.test(combined)) return 'technical';

    return 'general';
  }

  function getProviderOrder(taskType) {
    return PROVIDER_ORDER[taskType] || PROVIDER_ORDER.conversational;
  }

  function getRubric(taskType, sector) {
    var taskRubric = TASK_RUBRICS[taskType] || TASK_RUBRICS.conversational;
    var sectorRubric = SECTOR_RUBRICS[sector || 'general'] || SECTOR_RUBRICS.general;
    return {
      maxTokens: Math.max(taskRubric.maxTokens, sectorRubric.maxTokens),
      temperature: (taskRubric.temperature + sectorRubric.temperature) / 2,
      topP: (taskRubric.topP + sectorRubric.topP) / 2,
      primary: sectorRubric.primary,
      secondary: sectorRubric.secondary
    };
  }

  function buildSystemPromptForTask(taskType, context) {
    var rubric = TASK_RUBRICS[taskType] || TASK_RUBRICS.conversational;
    var basePrompt = 'Eres X1, un asistente de IA. Responde en español de forma clara y concisa. ';
    basePrompt += 'Fecha: ' + (context.date || new Date().toISOString()) + '. ';
    if (context.memory && context.memory.length) {
      basePrompt += 'Contexto reciente: ' + context.memory.slice(-3).map(function(m) { return m.content; }).join(' | ') + '. ';
    }
    if (context.pageCtx) basePrompt += 'Pagina actual: ' + context.pageCtx.substring(0, 500) + '. ';
    basePrompt += 'Se ' + (rubric.temperature < 0.3 ? 'preciso y directo' : rubric.temperature < 0.6 ? 'equilibrado' : 'creativo') + '. ';
    if (taskType === TASK_TYPES.EMAIL) basePrompt += 'Redacta en formato de correo electronico profesional. ';
    if (taskType === TASK_TYPES.AGENT) basePrompt += 'Responde SOLO con JSON: {"action":"...","params":{...}}. ';
    if (taskType === TASK_TYPES.TRANSLATION) basePrompt += 'Traduce el texto manteniendo el tono y formato original. ';
    if (taskType === TASK_TYPES.EXTRACTION) basePrompt += 'Extrae la informacion solicitada en formato JSON estructurado. ';
    if (taskType === TASK_TYPES.CODE) basePrompt += 'Escribe codigo limpio, funcional y bien estructurado. ';
    if (taskType === TASK_TYPES.RESEARCH) basePrompt += 'Investiga en profundidad y cita fuentes cuando sea posible. ';
    if (taskType === TASK_TYPES.ANALYSIS) basePrompt += 'Analiza de forma critica con datos y evidencia. ';
    return basePrompt;
  }

  function callProviderDirect(providerName, systemPrompt, userMsg, rubric) {
    var fn = PROVIDER_FNS[providerName];
    if (!fn) return Promise.resolve(null);

    var fullMsg = systemPrompt + '\n\nUsuario: ' + userMsg;

    return new Promise(function(resolve) {
      try {
        var result = fn(fullMsg);
        if (result && typeof result.then === 'function') {
          var timer = setTimeout(function() { resolve(null); }, 20000);
          result.then(function(text) {
            clearTimeout(timer);
            if (text && typeof isValidContent === 'function' && !isValidContent(text)) {
              resolve(null);
            } else {
              resolve(text || null);
            }
          }).catch(function() {
            clearTimeout(timer);
            resolve(null);
          });
        } else {
          resolve(result || null);
        }
      } catch(e) {
        resolve(null);
      }
    });
  }

  function pickJudge(candidates) {
    var candidateNames = {};
    var i;
    for (i = 0; i < candidates.length; i++) {
      candidateNames[candidates[i]] = true;
    }

    for (i = 0; i < ALL_PROVIDERS.length; i++) {
      var p = ALL_PROVIDERS[i];
      if (!candidateNames[p]) {
        var fn = PROVIDER_FNS[p];
        if (fn) return p;
      }
    }

    if (candidates.length >= 3) return candidates[2];
    if (candidates.length >= 2) return candidates[1];
    return candidates[0] || 'groq';
  }

  function buildJudgePrompt(candidateResponses, userMsg, taskType, sectorRubric) {
    var primaryName = sectorRubric.primary ? sectorRubric.primary.name : 'relevance';
    var primaryWeight = sectorRubric.primary ? Math.round(sectorRubric.primary.weight * 100) : 70;
    var secondaryName = sectorRubric.secondary ? sectorRubric.secondary.name : 'clarity';
    var secondaryWeight = sectorRubric.secondary ? Math.round(sectorRubric.secondary.weight * 100) : 30;

    var labels = ['A', 'B', 'C', 'D', 'E'];
    var prompt = 'Eres un juez experto e imparcial. Tu trabajo es evaluar respuestas de IA de forma ciega.\n\n';
    prompt += 'PREGUNTA DEL USUARIO: "' + userMsg.substring(0, 500) + '"\n';
    prompt += 'TIPO DE TAREA: ' + taskType + '\n\n';
    prompt += 'CRITERIOS DE EVALUACION:\n';
    prompt += '1. ' + primaryName + ' (' + primaryWeight + '% del peso) - Puntua de 1 a 10\n';
    prompt += '2. ' + secondaryName + ' (' + secondaryWeight + '% del peso) - Puntua de 1 a 10\n\n';
    prompt += 'RESPUESTAS A EVALUAR:\n\n';

    for (var i = 0; i < candidateResponses.length; i++) {
      var label = labels[i] || String.fromCharCode(65 + i);
      var text = candidateResponses[i].text || '';
      if (text.length > 800) text = text.substring(0, 800) + '...';
      prompt += '--- Option ' + label + ' ---\n' + text + '\n\n';
    }

    prompt += 'INSTRUCCIONES:\n';
    prompt += 'Evalua cada opcion en los dos criterios. Responde SOLO con JSON valido, sin texto adicional:\n';
    prompt += '{"scores":[{"option":"A","primary":N,"secondary":N},{"option":"B","primary":N,"secondary":N}],"winner":"A","explanation":"breve razon"}\n';
    prompt += 'Donde N es un numero entero de 1 a 10.\n';
    prompt += 'El "winner" es la opcion con mayor puntuacion ponderada (' + primaryName + '*' + primaryWeight/100 + ' + ' + secondaryName + '*' + secondaryWeight/100 + ').';

    return prompt;
  }

  function parseJudgeResponse(rawText, candidateCount) {
    var text = (rawText || '').trim();

    var jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    var parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch(e) {
      try {
        var cleaned = jsonMatch[0]
          .replace(/,\s*\}/g, '}')
          .replace(/,\s*\]/g, ']')
          .replace(/'/g, '"');
        parsed = JSON.parse(cleaned);
      } catch(e2) {
        return null;
      }
    }

    if (!parsed || !parsed.scores || !Array.isArray(parsed.scores)) return null;

    var labels = ['A', 'B', 'C', 'D', 'E'];
    var validScores = [];
    for (var i = 0; i < parsed.scores.length; i++) {
      var s = parsed.scores[i];
      if (!s || !s.option) continue;
      var primary = parseInt(s.primary) || 5;
      var secondary = parseInt(s.secondary) || 5;
      if (primary < 1) primary = 1;
      if (primary > 10) primary = 10;
      if (secondary < 1) secondary = 1;
      if (secondary > 10) secondary = 10;
      validScores.push({
        option: String(s.option).toUpperCase().trim(),
        primary: primary,
        secondary: secondary
      });
    }

    if (validScores.length === 0) return null;

    var winner = (parsed.winner || 'A').toUpperCase().trim();
    var winnerIdx = labels.indexOf(winner);
    if (winnerIdx < 0 || winnerIdx >= candidateCount) winnerIdx = 0;

    return {
      scores: validScores,
      winner: labels[winnerIdx],
      winnerIndex: winnerIdx,
      explanation: parsed.explanation || ''
    };
  }

  function judgeRound(candidates, userMsg, taskType, sector) {
    if (!candidates || candidates.length < 2) {
      return Promise.resolve({
        winner: candidates && candidates[0] ? candidates[0] : null,
        scores: [],
        explanation: 'insufficient_candidates',
        confidence: 100,
        needsUserChoice: false
      });
    }

    var sectorRubric = SECTOR_RUBRICS[sector || 'general'] || SECTOR_RUBRICS.general;
    var candidateNames = candidates.map(function(c) { return c.provider; });
    var judgeProvider = pickJudge(candidateNames);
    var judgePrompt = buildJudgePrompt(candidates, userMsg, taskType, sectorRubric);
    var judgeSystemPrompt = 'Eres un juez experto neutral. Evaluas respuestas de IA de forma objetiva e imparcial. Responde SOLO con JSON valido.';

    return callProviderDirect(judgeProvider, judgeSystemPrompt, judgePrompt, { maxTokens: 300, temperature: 0.1 }).then(function(judgeResult) {
      if (!judgeResult) {
        return {
          winner: candidates[0],
          scores: [],
          explanation: 'judge_no_response',
          confidence: 0,
          needsUserChoice: true,
          judgeProvider: judgeProvider
        };
      }

      var parsed = parseJudgeResponse(judgeResult, candidates.length);
      if (!parsed) {
        return {
          winner: candidates[0],
          scores: [],
          explanation: 'judge_parse_failed',
          confidence: 0,
          needsUserChoice: true,
          judgeProvider: judgeProvider
        };
      }

      var primaryWeight = sectorRubric.primary ? sectorRubric.primary.weight : 0.7;
      var secondaryWeight = sectorRubric.secondary ? sectorRubric.secondary.weight : 0.3;

      var labels = ['A', 'B', 'C', 'D', 'E'];
      var weightedScores = [];
      for (var i = 0; i < parsed.scores.length; i++) {
        var s = parsed.scores[i];
        var idx = labels.indexOf(s.option);
        if (idx < 0 || idx >= candidates.length) continue;
        var total = (s.primary * primaryWeight) + (s.secondary * secondaryWeight);
        weightedScores.push({
          option: s.option,
          index: idx,
          primary: s.primary,
          secondary: s.secondary,
          total: Math.round(total * 100) / 100,
          provider: candidates[idx].provider
        });
      }

      weightedScores.sort(function(a, b) { return b.total - a.total; });

      var bestScore = weightedScores.length > 0 ? weightedScores[0] : null;
      var secondScore = weightedScores.length > 1 ? weightedScores[1] : null;

      var scoreDiff = 0;
      if (bestScore && secondScore) {
        scoreDiff = bestScore.total - secondScore.total;
      }

      var maxPossible = 10;
      var confidence = 0;
      if (bestScore) {
        confidence = Math.round((bestScore.total / maxPossible) * 100);
        if (scoreDiff > 0) {
          confidence = Math.min(100, confidence + Math.round(scoreDiff * 10));
        }
      }

      var needsUserChoice = scoreDiff <= 2;
      if (confidence < 60) needsUserChoice = true;

      var winnerIdx = bestScore ? bestScore.index : parsed.winnerIndex;
      var winner = candidates[winnerIdx] || candidates[0];

      return {
        winner: winner,
        scores: weightedScores,
        explanation: parsed.explanation,
        confidence: confidence,
        needsUserChoice: needsUserChoice,
        judgeProvider: judgeProvider,
        scoreDiff: scoreDiff
      };
    }).catch(function() {
      return {
        winner: candidates[0],
        scores: [],
        explanation: 'judge_error',
        confidence: 0,
        needsUserChoice: true,
        judgeProvider: judgeProvider
      };
    });
  }

  function saveCalibration(record) {
    return new Promise(function(resolve) {
      try {
        chrome.storage.local.get('x1_calibration', function(data) {
          var records = (data && data.x1_calibration) ? data.x1_calibration : [];
          records.push({
            sector: record.sector || 'general',
            taskType: record.taskType || 'conversational',
            judgeProvider: record.judgeProvider || '',
            winnerProvider: record.winnerProvider || '',
            userOverride: record.userOverride || null,
            scores: record.scores || [],
            confidence: record.confidence || 0,
            timestamp: Date.now()
          });

          if (records.length > 500) {
            records = records.slice(records.length - 500);
          }

          chrome.storage.local.set({ x1_calibration: records }, function() {
            resolve(true);
          });
        });
      } catch(e) {
        resolve(false);
      }
    });
  }

  function getCalibrationRecords(sector) {
    return new Promise(function(resolve) {
      try {
        chrome.storage.local.get('x1_calibration', function(data) {
          var records = (data && data.x1_calibration) ? data.x1_calibration : [];
          if (sector) {
            var filtered = [];
            for (var i = 0; i < records.length; i++) {
              if (records[i].sector === sector) filtered.push(records[i]);
            }
            resolve(filtered);
          } else {
            resolve(records);
          }
        });
      } catch(e) {
        resolve([]);
      }
    });
  }

  function getJudgeAgreementRate(sector) {
    return getCalibrationRecords(sector).then(function(records) {
      var withOverride = [];
      for (var i = 0; i < records.length; i++) {
        if (records[i].userOverride !== null && records[i].userOverride !== undefined) {
          withOverride.push(records[i]);
        }
      }

      if (withOverride.length < 5) {
        return {
          rate: null,
          totalVotes: withOverride.length,
          minRequired: 5,
          ready: false
        };
      }

      var agreements = 0;
      for (var j = 0; j < withOverride.length; j++) {
        var r = withOverride[j];
        if (r.userOverride === r.winnerProvider || r.userOverride === true) {
          agreements++;
        }
      }

      var rate = Math.round((agreements / withOverride.length) * 100);
      return {
        rate: rate,
        agreements: agreements,
        totalVotes: withOverride.length,
        ready: true
      };
    });
  }

  function runPanel(userMsg, taskType, candidates, context) {
    var sector = detectSector(userMsg, context.pageCtx || '');
    var rubric = getRubric(taskType, sector);
    var systemPrompt = buildSystemPromptForTask(taskType, context);

    var providerNames = [];
    for (var i = 0; i < candidates.length; i++) {
      providerNames.push(typeof candidates[i] === 'string' ? candidates[i] : candidates[i].provider || candidates[i]);
    }

    var calls = providerNames.map(function(provider) {
      return callProviderDirect(provider, systemPrompt, userMsg, rubric).then(function(text) {
        return { provider: provider, text: text, error: null };
      }).catch(function(err) {
        return { provider: provider, text: null, error: err.message || 'fallo' };
      });
    });

    return Promise.allSettled(calls).then(function(results) {
      var fulfilled = [];
      for (var k = 0; k < results.length; k++) {
        var r = results[k];
        if (r.status === 'fulfilled' && r.value && r.value.text) {
          fulfilled.push(r.value);
        }
      }

      if (fulfilled.length === 0) {
        return {
          winner: null,
          alternatives: [],
          judgeExplanation: 'no_candidates_succeeded',
          confidence: 0,
          needsUserChoice: false,
          sector: sector
        };
      }

      if (fulfilled.length === 1) {
        return {
          winner: fulfilled[0],
          alternatives: [],
          judgeExplanation: 'single_candidate',
          confidence: 100,
          needsUserChoice: false,
          sector: sector
        };
      }

      return judgeRound(fulfilled, userMsg, taskType, sector).then(function(judgeResult) {
        var winner = judgeResult.winner;
        var alternatives = [];
        for (var m = 0; m < fulfilled.length; m++) {
          if (fulfilled[m] !== winner) alternatives.push(fulfilled[m]);
        }

        var calibrationRecord = {
          sector: sector,
          taskType: taskType,
          judgeProvider: judgeResult.judgeProvider,
          winnerProvider: winner ? winner.provider : '',
          userOverride: null,
          scores: judgeResult.scores,
          confidence: judgeResult.confidence
        };
        saveCalibration(calibrationRecord);

        return {
          winner: winner,
          alternatives: alternatives,
          judgeExplanation: judgeResult.explanation,
          confidence: judgeResult.confidence,
          needsUserChoice: judgeResult.needsUserChoice,
          scores: judgeResult.scores,
          sector: sector,
          judgeProvider: judgeResult.judgeProvider
        };
      });
    });
  }

  return {
    TASK_TYPES: TASK_TYPES,
    classifyTask: classifyTask,
    getProviderOrder: getProviderOrder,
    getRubric: getRubric,
    runPanel: runPanel,
    judgeRound: judgeRound,
    pickJudge: pickJudge,
    saveCalibration: saveCalibration,
    getCalibrationRecords: getCalibrationRecords,
    getJudgeAgreementRate: getJudgeAgreementRate,
    buildSystemPromptForTask: buildSystemPromptForTask
  };

})();
