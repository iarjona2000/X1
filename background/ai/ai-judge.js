/**
 * ai-judge.js — Motor Central del Juez de X1
 *
 * El Juez es el cerebro: recibe la pregunta del usuario, la analiza,
 * la envia a las IAs mas adecuadas, recopila votos, y sintetiza
 * la mejor respuesta. X1 no tiene IA propia — el Juez ORQUESTA.
 *
 * Licencia: Propia de X1
 */

(function() {
  'use strict';

  var log = {
    info: function(m) { console.log('[X1-Judge]', m); },
    warn: function(m) { console.warn('[X1-Judge]', m); },
    error: function(m) { console.error('[X1-Judge]', m); }
  };

  // ═══════════════════════════════════════════
  // JUDGE CONFIGURATION
  // ═══════════════════════════════════════════

  var JUDGE_CONFIG = {
    minVoters: 2,
    maxVoters: 5,
    defaultVoters: 3,
    synthesisThreshold: 0.3,
    consensusMinScore: 0.7,
    dailyJudgeLimit: 50,
    timeoutPerProvider: 15000,
    globalTimeout: 25000
  };

  // ═══════════════════════════════════════════
  // QUERY ANALYSIS
  // ═══════════════════════════════════════════

  var QUERY_TYPES = {
    CONVERSATIONAL: 'conversational',
    REASONING: 'reasoning',
    CODE: 'code',
    CREATIVE: 'creative',
    TRANSLATION: 'translation',
    MULTIMODAL: 'multimodal',
    AGENTIC: 'agentic',
    RESEARCH: 'research',
    SENSITIVE: 'sensitive'
  };

  function analyzeQuery(query) {
    var q = (query || '').toLowerCase();
    var analysis = {
      type: QUERY_TYPES.CONVERSATIONAL,
      complexity: 'simple',
      intent: 'answer',
      language: detectLanguage(q),
      entities: extractEntities(q),
      urgency: 'normal'
    };

    // Type detection
    if (/\b(programa|c[oó]digo|funci[oó]n|clase|variable|bug|error|compila|ejecuta|debug|refactor|implementa)\b/.test(q)) {
      analysis.type = QUERY_TYPES.CODE;
    } else if (/\b(por qu[eé]|explica|razona|analiza|compara|eval[uú]a|argumenta|demuestra|calcula)\b/.test(q)) {
      analysis.type = QUERY_TYPES.REASONING;
    } else if (/\b(escribe|crea|genera|redacta|cuenta|narrativa|historia|poema|ensayo|art[ií]culo)\b/.test(q)) {
      analysis.type = QUERY_TYPES.CREATIVE;
    } else if (/\b(traduce|translate|al [aá]rabes?|al ingl[eé]s|al franc[eé]s|al alem[aá]n)\b/.test(q)) {
      analysis.type = QUERY_TYPES.TRANSLATION;
    } else if (/\b(imagen|foto|captura|pantalla|visual|video|audio|sonido)\b/.test(q)) {
      analysis.type = QUERY_TYPES.MULTIMODAL;
    } else if (/\b(ejecuta|actua|navega|abre|cierra|busca en|click|escrape|automatiza)\b/.test(q)) {
      analysis.type = QUERY_TYPES.AGENTIC;
    } else if (/\b(investiga|busca info|research|documenta|resume|art[ií]culos|papers|fuentes)\b/.test(q)) {
      analysis.type = QUERY_TYPES.RESEARCH;
    } else if (/\b(contrato|cl[aá]usula|demanda|factura|impuesto|m[eé]dico|diagn[oó]stico|dosis|legal)\b/.test(q)) {
      analysis.type = QUERY_TYPES.SENSITIVE;
    }

    // Complexity detection
    if (q.length > 300 || (q.split('?').length > 2) || /\b(y tambi[eé]n|adem[aá]s|compar[ae]|pros y contras|pasos?|etapas?)\b/.test(q)) {
      analysis.complexity = 'complex';
    } else if (q.length > 100 || /\b(c[oó]mo|qu[eé] es|cu[aá]ndo|d[oó]nde|qui[eé]n)\b/.test(q)) {
      analysis.complexity = 'moderate';
    }

    // Intent detection
    if (/\b(c[oó]mo|haz|ejecuta|act[uú]a|navega|abre)\b/.test(q)) {
      analysis.intent = 'action';
    } else if (/\b(qu[eé] es|cu[aá]l es|definici[oó]n|significa)\b/.test(q)) {
      analysis.intent = 'definition';
    } else if (/\b(por qu[eé]|raz[oó]n|causa|explicaci[oó]n)\b/.test(q)) {
      analysis.intent = 'explanation';
    } else if (/\b(resume|resumen|tl;dr|sintetiza)\b/.test(q)) {
      analysis.intent = 'summary';
    }

    // Urgency detection
    if (/\b(urgente|importante|ahora|ya|rápidamente|importante)\b/.test(q)) {
      analysis.urgency = 'high';
    }

    return analysis;
  }

  function detectLanguage(text) {
    if (/\b(el|la|los|las|es|son|est[aá]|tiene|hay|puedo|quiero|necesito)\b/.test(text)) return 'es';
    if (/\b(the|is|are|have|has|can|do|does|what|how|why|when|where)\b/.test(text)) return 'en';
    if (/\b(le|la|les|des|est|sont|avoir|faire|quoi|comment|pourquoi)\b/.test(text)) return 'fr';
    if (/\b(der|die|das|ist|sind|hat|kann|was|wie|warum|wo)\b/.test(text)) return 'de';
    return 'es';
  }

  function extractEntities(text) {
    var entities = [];
    var urls = text.match(/https?:\/\/[^\s]+/g);
    if (urls) entities.push({ type: 'url', values: urls });
    var emails = text.match(/[\w.-]+@[\w.-]+\.\w+/g);
    if (emails) entities.push({ type: 'email', values: emails });
    var numbers = text.match(/\b\d+\.?\d*\b/g);
    if (numbers) entities.push({ type: 'number', values: numbers.slice(0, 5) });
    return entities;
  }

  // ═══════════════════════════════════════════
  // VOTER SELECTION
  // ═══════════════════════════════════════════

  var VOTER_MATRIX = {
    conversational: {
      primary: ['groq', 'gemini', 'cerebras'],
      secondary: ['mistral', 'openrouter', 'proxy'],
      judge: ['nvidiaNemotron', 'mistral', 'openrouter']
    },
    reasoning: {
      primary: ['groq', 'nvidiaGlm', 'nvidiaDeepseek'],
      secondary: ['gemini', 'cerebras', 'mistral'],
      judge: ['nvidiaNemotron', 'openrouter']
    },
    code: {
      primary: ['groq', 'mistral', 'nvidiaDeepseek'],
      secondary: ['openrouter', 'cerebras', 'gemini'],
      judge: ['nvidiaNemotron', 'gemini']
    },
    creative: {
      primary: ['gemini', 'groq', 'openrouter'],
      secondary: ['mistral', 'cerebras', 'proxy'],
      judge: ['nvidiaNemotron', 'mistral']
    },
    translation: {
      primary: ['gemini', 'groq', 'mistral'],
      secondary: ['openrouter', 'proxy', 'cerebras'],
      judge: ['nvidiaNemotron', 'gemini']
    },
    multimodal: {
      primary: ['gemini', 'openrouter', 'proxy'],
      secondary: ['groq', 'mistral'],
      judge: ['nvidiaNemotron', 'cerebras']
    },
    agentic: {
      primary: ['groq', 'gemini', 'mistral'],
      secondary: ['openrouter', 'cerebras', 'nvidiaGlm'],
      judge: ['nvidiaNemotron', 'nvidiaDeepseek']
    },
    research: {
      primary: ['gemini', 'groq', 'openrouter'],
      secondary: ['cerebras', 'mistral', 'proxy'],
      judge: ['nvidiaNemotron', 'nvidiaDeepseek']
    },
    sensitive: {
      primary: ['ollama', 'proxy'],
      secondary: ['mistral'],
      judge: []
    }
  };

  function selectVoters(analysis, availableProviders) {
    var matrix = VOTER_MATRIX[analysis.type] || VOTER_MATRIX.conversational;
    var voters = [];
    var usedNames = [];

    // Primary voters (always try these first)
    matrix.primary.forEach(function(name) {
      if (voters.length >= JUDGE_CONFIG.maxVoters) return;
      if (usedNames.indexOf(name) !== -1) return;
      var provider = findProvider(name, availableProviders);
      if (provider && provider.has) {
        voters.push(provider);
        usedNames.push(name);
      }
    });

    // Secondary voters (if we need more)
    if (voters.length < JUDGE_CONFIG.minVoters) {
      matrix.secondary.forEach(function(name) {
        if (voters.length >= JUDGE_CONFIG.defaultVoters) return;
        if (usedNames.indexOf(name) !== -1) return;
        var provider = findProvider(name, availableProviders);
        if (provider && provider.has) {
          voters.push(provider);
          usedNames.push(name);
        }
      });
    }

    // For complex queries, add more voters
    if (analysis.complexity === 'complex' && voters.length < JUDGE_CONFIG.maxVoters) {
      matrix.secondary.forEach(function(name) {
        if (voters.length >= JUDGE_CONFIG.maxVoters) return;
        if (usedNames.indexOf(name) !== -1) return;
        var provider = findProvider(name, availableProviders);
        if (provider && provider.has) {
          voters.push(provider);
          usedNames.push(name);
        }
      });
    }

    return voters;
  }

  function findProvider(name, availableProviders) {
    for (var i = 0; i < availableProviders.length; i++) {
      if (availableProviders[i].name === name) return availableProviders[i];
    }
    return null;
  }

  // ═══════════════════════════════════════════
  // VOTING & SCORING
  // ═══════════════════════════════════════════

  function scoreVote(vote, analysis) {
    var score = 0;
    var txt = vote.txt || '';
    var parsed = vote.parsed;

    // Base score for valid response
    if (!parsed || vote.error) return -1;

    // Action validity
    if (parsed.action) score += 2;
    if (parsed.action === 'speak' && parsed.text && parsed.text.length > 5) score += 2;
    if (parsed.action === 'steps' && parsed.steps && parsed.steps.length > 0) score += 3;

    // Response quality
    if (txt.length > 20 && txt.length < 800) score += 1;
    if (txt.length > 100) score += 1;

    // Type-specific scoring
    if (analysis.type === QUERY_TYPES.CODE) {
      if (parsed.code || (parsed.text && /```/.test(parsed.text))) score += 2;
      if (parsed.action === 'steps' && parsed.steps.some(function(s) { return s.code; })) score += 1;
    } else if (analysis.type === QUERY_TYPES.REASONING) {
      if (parsed.text && /\b(porque|por que|raz[oó]n|por lo tanto|adem[aá]s|sin embargo)\b/i.test(parsed.text)) score += 1;
      if (parsed.steps && parsed.steps.length > 1) score += 1;
    } else if (analysis.type === QUERY_TYPES.CREATIVE) {
      if (parsed.text && parsed.text.length > 50) score += 1;
      if (parsed.text && !/\b(no puedo|no tengo|no es posible|no puedo ayudar)\b/i.test(parsed.text)) score += 1;
    }

    // Penalty for bad content
    if (/\b(no puedo|no tengo|no es posible|no puedo ayudar|lo siento)\b/i.test(txt) && txt.length < 30) score -= 2;
    if (/\[placeholder\]/i.test(txt)) score -= 3;
    if (/\b(error|failed|timeout)\b/i.test(txt) && txt.length < 50) score -= 2;

    // Speed bonus (faster is better)
    if (vote.elapsed < 2000) score += 1;
    else if (vote.elapsed < 5000) score += 0.5;

    return score;
  }

  function rankVotes(votes, analysis) {
    var ranked = votes.map(function(vote) {
      return {
        provider: vote.provider,
        txt: vote.txt,
        parsed: vote.parsed,
        score: scoreVote(vote, analysis),
        elapsed: vote.elapsed,
        error: vote.error
      };
    });

    ranked.sort(function(a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.elapsed - b.elapsed;
    });

    return ranked;
  }

  function detectConsensus(rankedVotes) {
    if (rankedVotes.length < 2) return { has: false, strength: 0 };

    var topScore = rankedVotes[0].score;
    var consensusCount = rankedVotes.filter(function(v) {
      return v.score >= topScore * 0.8;
    }).length;

    var strength = consensusCount / rankedVotes.length;
    return {
      has: strength >= JUDGE_CONFIG.consensusMinScore,
      strength: strength,
      count: consensusCount,
      total: rankedVotes.length
    };
  }

  // ═══════════════════════════════════════════
  // JUDGE SYNTHESIS
  // ═══════════════════════════════════════════

  function synthesizeResponses(rankedVotes, analysis, query) {
    var winner = rankedVotes[0];
    var alternatives = rankedVotes.slice(1);

    // If strong consensus, pick the winner directly
    var consensus = detectConsensus(rankedVotes);
    if (consensus.has) {
      return {
        winner: winner.parsed,
        winnerProvider: winner.provider,
        confidence: consensus.strength,
        consensus: true,
        alternatives: alternatives.map(function(a) {
          return { provider: a.provider, score: a.score, preview: (a.txt || '').substring(0, 100) };
        }),
        synthesis: null
      };
    }

    // If weak consensus or no consensus, synthesize
    var synthesis = buildSynthesis(rankedVotes, analysis, query);

    return {
      winner: synthesis || winner.parsed,
      winnerProvider: winner.provider,
      confidence: consensus.strength,
      consensus: false,
      alternatives: alternatives.map(function(a) {
        return { provider: a.provider, score: a.score, preview: (a.txt || '').substring(0, 100) };
      }),
      synthesis: synthesis ? 'synthesized' : null
    };
  }

  function buildSynthesis(rankedVotes, analysis, query) {
    if (rankedVotes.length < 2) return null;

    var best = rankedVotes[0];
    var second = rankedVotes[1];

    // If scores are very close, merge responses
    if (Math.abs(best.score - second.score) <= 1) {
      var mergedText = mergeTexts(best.txt, second.txt, analysis.type);
      if (mergedText) {
        return {
          action: best.parsed.action || 'speak',
          text: mergedText,
          mergedFrom: [best.provider, second.provider]
        };
      }
    }

    return null;
  }

  function mergeTexts(text1, text2, type) {
    if (!text1 || !text2) return null;

    // For conversational, prefer shorter/cleaner
    if (type === QUERY_TYPES.CONVERSATIONAL) {
      return text1.length <= text2.length ? text1 : text2;
    }

    // For code, prefer the one with code blocks
    if (type === QUERY_TYPES.CODE) {
      var hasCode1 = /```/.test(text1);
      var hasCode2 = /```/.test(text2);
      if (hasCode1 && !hasCode2) return text1;
      if (hasCode2 && !hasCode1) return text2;
      return text1.length > text2.length ? text1 : text2;
    }

    // For reasoning, take the longer/more detailed one
    if (type === QUERY_TYPES.REASONING) {
      return text1.length > text2.length ? text1 : text2;
    }

    // Default: take the best scored one
    return text1;
  }

  // ═══════════════════════════════════════════
  // JUDGE MAIN ORCHESTRATOR
  // ═══════════════════════════════════════════

  function runJudge(query, options) {
    options = options || {};
    var startTime = Date.now();

    // 1. Analyze the query
    var analysis = analyzeQuery(query);
    log.info('Query analysis: ' + JSON.stringify(analysis));

    // 2. Check if WebLLM brain is available
    var hasWebLLM = typeof X1WebLLMBridge !== 'undefined' && X1WebLLMBridge.isLoaded();

    if (hasWebLLM) {
      log.info('Using WebLLM as Judge brain (local inference)');
      return X1WebLLMBridge.judgeQuery(query, {
        maxTokens: options.maxTokens || 256,
        temperature: 0.3
      }).then(function(result) {
        var totalElapsed = Date.now() - startTime;
        return {
          ok: true,
          query: query,
          analysis: analysis,
          verdict: {
            winner: result.response || { action: 'speak', text: 'Judge processed locally' },
            winnerProvider: 'webllm-local',
            confidence: 0.9,
            consensus: true,
            alternatives: [],
            synthesis: 'local_webllm'
          },
          votes: [{ provider: 'webllm-local', score: 10, elapsed: totalElapsed, preview: 'Local WebLLM inference' }],
          totalElapsed: totalElapsed,
          timestamp: Date.now(),
          source: 'webllm'
        };
      });
    }

    // 3. Fallback to external providers
    log.info('WebLLM not available, using external providers');

    var availableProviders = options.providers || getDefaultProviders();
    var activeProviders = availableProviders.filter(function(p) { return p.has; });

    if (activeProviders.length === 0) {
      log.warn('No providers available');
      return Promise.resolve({
        ok: false,
        error: 'No hay proveedores de IA disponibles',
        analysis: analysis
      });
    }

    // 3. Select voters
    var voters = selectVoters(analysis, activeProviders);
    log.info('Selected voters: ' + voters.map(function(v) { return v.name; }).join(', '));

    if (voters.length === 0) {
      log.warn('No voters selected, using first available');
      voters = activeProviders.slice(0, 1);
    }

    // 4. Collect votes (parallel)
    var votePromises = voters.map(function(voter) {
      var start = Date.now();
      return voter.fn(query).then(function(txt) {
        var elapsed = Date.now() - start;
        var parsed = parseResponse(txt);
        return {
          provider: voter.name,
          txt: txt,
          parsed: parsed,
          elapsed: elapsed,
          error: null
        };
      }).catch(function(e) {
        return {
          provider: voter.name,
          txt: null,
          parsed: null,
          elapsed: Date.now() - start,
          error: e.message || 'unknown'
        };
      });
    });

    // 5. Wait for all votes (with timeout)
    var timeoutPromise = new Promise(function(resolve) {
      setTimeout(function() {
        resolve({ timedOut: true });
      }, JUDGE_CONFIG.globalTimeout);
    });

    return Promise.race([
      Promise.all(votePromises),
      timeoutPromise
    ]).then(function(results) {
      if (results.timedOut) {
        log.warn('Judge timed out, using partial results');
        results = [];
      }

      var validVotes = results.filter(function(r) { return r.parsed && !r.error; });
      var totalElapsed = Date.now() - startTime;

      log.info('Received ' + validVotes.length + '/' + results.length + ' valid votes in ' + totalElapsed + 'ms');

      if (validVotes.length === 0) {
        // All votes failed, try cascade
        return cascadeFallback(query, activeProviders);
      }

      // 6. Rank votes
      var ranked = rankVotes(validVotes, analysis);

      // 7. Synthesize final answer
      var verdict = synthesizeResponses(ranked, analysis, query);

      // 8. Build result
      var judgeResult = {
        ok: true,
        query: query,
        analysis: analysis,
        verdict: verdict,
        votes: ranked.map(function(r) {
          return {
            provider: r.provider,
            score: r.score,
            elapsed: r.elapsed,
            preview: (r.txt || '').substring(0, 150)
          };
        }),
        totalElapsed: totalElapsed,
        timestamp: Date.now()
      };

      // Store for calibration
      storeJudgeResult(judgeResult);

      return judgeResult;
    });
  }

  // ═══════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════

  function parseResponse(txt) {
    if (!txt) return null;

    // Try JSON parse
    txt = txt.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
    var m = txt.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch (e) {
        try {
          var fixed = m[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/'/g, '"');
          return JSON.parse(fixed);
        } catch (e2) {}
      }
    }

    // Try array parse
    var ma = txt.match(/\[[\s\S]*\]/);
    if (ma) {
      try {
        return { steps: JSON.parse(ma[0]) };
      } catch (e) {}
    }

    // Treat as speak
    if (txt.length > 3) {
      return { action: 'speak', text: txt };
    }

    return null;
  }

  function getDefaultProviders() {
    // This will be replaced by ai-pool.js
    return [];
  }

  function cascadeFallback(query, providers) {
    log.info('All votes failed, trying cascade fallback');
    var fallbackChain = providers.filter(function(p) { return p.has; });

    function tryNext(i) {
      if (i >= fallbackChain.length) return Promise.resolve(null);
      var p = fallbackChain[i];
      return p.fn(query).then(function(txt) {
        if (!txt) return tryNext(i + 1);
        var parsed = parseResponse(txt);
        if (!parsed) return tryNext(i + 1);
        return {
          ok: true,
          query: query,
          verdict: {
            winner: parsed,
            winnerProvider: p.provider,
            confidence: 0.5,
            consensus: false,
            alternatives: [],
            synthesis: 'cascade_fallback'
          },
          votes: [{ provider: p.provider, score: 1, elapsed: 0, preview: (txt || '').substring(0, 100) }],
          totalElapsed: 0,
          timestamp: Date.now()
        };
      }).catch(function() {
        return tryNext(i + 1);
      });
    }

    return tryNext(0);
  }

  function storeJudgeResult(result) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get('x1JudgeHistory', function(r) {
          var history = (r && r.x1JudgeHistory) || [];
          history.push({
            query: result.query.substring(0, 100),
            type: result.analysis.type,
            winnerProvider: result.verdict.winnerProvider,
            confidence: result.verdict.confidence,
            consensus: result.verdict.consensus,
            voteCount: result.votes.length,
            timestamp: result.timestamp
          });
          if (history.length > 200) history = history.slice(-200);
          chrome.storage.local.set({ x1JudgeHistory: history });
        });
      }
    } catch (e) {}
  }

  // ═══════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════

  self.X1Judge = {
    version: '1.0.0',
    config: JUDGE_CONFIG,
    queryTypes: QUERY_TYPES,

    analyzeQuery: analyzeQuery,
    selectVoters: selectVoters,
    scoreVote: scoreVote,
    rankVotes: rankVotes,
    detectConsensus: detectConsensus,
    synthesizeResponses: synthesizeResponses,
    runJudge: runJudge,
    parseResponse: parseResponse,

    healthCheck: function() {
      return Promise.resolve({
        ok: true,
        version: '1.0.0',
        config: JUDGE_CONFIG,
        queryTypes: Object.keys(QUERY_TYPES)
      });
    }
  };

  log.info('X1Judge loaded');

})();
