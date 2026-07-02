/**
 * ai-voting.js — Sistema de Votos de X1
 *
 * Maneja la coleccion, scoring, consenso y ranking de respuestas
 * de multiples IAs. El corazon del sistema democrático de X1.
 *
 * Licencia: Propia de X1
 */

(function() {
  'use strict';

  var log = {
    info: function(m) { console.log('[X1-Voting]', m); },
    warn: function(m) { console.warn('[X1-Voting]', m); },
    error: function(m) { console.error('[X1-Voting]', m); }
  };

  // ═══════════════════════════════════════════
  // VOTE COLLECTION
  // ═══════════════════════════════════════════

  function VoteCollector(options) {
    this.options = options || {};
    this.votes = [];
    this.startTime = Date.now();
    this.timeout = this.options.timeout || 20000;
    this.minVotes = this.options.minVotes || 2;
    this.targetVotes = this.options.targetVotes || 3;
  }

  VoteCollector.prototype.addVote = function(vote) {
    if (!vote || !vote.provider) return false;

    // Check for duplicate
    var existing = this.votes.find(function(v) { return v.provider === vote.provider; });
    if (existing) {
      log.warn('Duplicate vote from ' + vote.provider + ', ignoring');
      return false;
    }

    this.votes.push({
      provider: vote.provider,
      txt: vote.txt || null,
      parsed: vote.parsed || null,
      score: vote.score || 0,
      elapsed: vote.elapsed || 0,
      error: vote.error || null,
      timestamp: Date.now()
    });

    log.info('Vote added from ' + vote.provider + ' (score: ' + (vote.score || 0) + ')');
    return true;
  };

  VoteCollector.prototype.hasEnoughVotes = function() {
    return this.votes.length >= this.minVotes;
  };

  VoteCollector.prototype.hasTargetVotes = function() {
    return this.votes.length >= this.targetVotes;
  };

  VoteCollector.prototype.isTimedOut = function() {
    return (Date.now() - this.startTime) >= this.timeout;
  };

  VoteCollector.prototype.getValidVotes = function() {
    return this.votes.filter(function(v) { return v.parsed && !v.error; });
  };

  VoteCollector.prototype.getInvalidVotes = function() {
    return this.votes.filter(function(v) { return !v.parsed || v.error; });
  };

  VoteCollector.prototype.getStats = function() {
    var valid = this.getValidVotes();
    var invalid = this.getInvalidVotes();
    return {
      total: this.votes.length,
      valid: valid.length,
      invalid: invalid.length,
      elapsed: Date.now() - this.startTime,
      providers: this.votes.map(function(v) { return v.provider; })
    };
  };

  // ═══════════════════════════════════════════
  // SCORING ENGINE
  // ═══════════════════════════════════════════

  var ScoringEngine = {
    weights: {
      responseQuality: 0.35,
      typeAlignment: 0.25,
      speed: 0.15,
      completeness: 0.15,
      originality: 0.10
    },

    score: function(vote, analysis, allVotes) {
      var scores = {
        responseQuality: this.scoreResponseQuality(vote, analysis),
        typeAlignment: this.scoreTypeAlignment(vote, analysis),
        speed: this.scoreSpeed(vote, allVotes),
        completeness: this.scoreCompleteness(vote, analysis),
        originality: this.scoreOriginality(vote, allVotes)
      };

      var totalScore = 0;
      Object.keys(scores).forEach(function(key) {
        totalScore += scores[key] * ScoringEngine.weights[key];
      });

      return {
        total: Math.round(totalScore * 100) / 100,
        breakdown: scores,
        grade: this.getGrade(totalScore)
      };
    },

    scoreResponseQuality: function(vote, analysis) {
      if (!vote.parsed || vote.error) return 0;
      var score = 0;
      var txt = vote.txt || '';

      // Valid action
      if (vote.parsed.action) score += 0.3;
      if (vote.parsed.action === 'speak' && vote.parsed.text && vote.parsed.text.length > 10) score += 0.2;
      if (vote.parsed.action === 'steps' && vote.parsed.steps && vote.parsed.steps.length > 0) score += 0.3;

      // Text quality
      if (txt.length > 20 && txt.length < 800) score += 0.1;
      if (txt.length > 100) score += 0.1;

      return Math.min(1, score);
    },

    scoreTypeAlignment: function(vote, analysis) {
      if (!vote.parsed) return 0;
      var score = 0;
      var txt = (vote.txt || '').toLowerCase();

      switch (analysis.type) {
        case 'code':
          if (/```/.test(txt) || vote.parsed.code) score += 0.4;
          if (/\b(funci[oó]n|clase|variable|return|if|for|while)\b/.test(txt)) score += 0.3;
          if (vote.parsed.steps && vote.parsed.steps.some(function(s) { return s.code; })) score += 0.3;
          break;
        case 'reasoning':
          if (/\b(porque|por que|raz[oó]n|por lo tanto|adem[aá]s|sin embargo|conclusi[oó]n)\b/i.test(txt)) score += 0.4;
          if (vote.parsed.steps && vote.parsed.steps.length > 1) score += 0.3;
          if (txt.length > 100) score += 0.3;
          break;
        case 'creative':
          if (txt.length > 50) score += 0.3;
          if (!/\b(no puedo|no tengo|no es posible)\b/i.test(txt)) score += 0.3;
          if (/\b(historia|narrativa|cuento|poema|ensayo)\b/i.test(txt)) score += 0.4;
          break;
        case 'translation':
          if (txt.length > 20) score += 0.4;
          if (!/\b(no puedo traducir|error de traducci[oó]n)\b/i.test(txt)) score += 0.3;
          if (/\b(traducci[oó]n|traducido|translate)\b/i.test(txt)) score += 0.3;
          break;
        default:
          score = 0.5;
      }

      return Math.min(1, score);
    },

    scoreSpeed: function(vote, allVotes) {
      if (!allVotes || allVotes.length === 0) return 0.5;
      var avgElapsed = allVotes.reduce(function(sum, v) { return sum + (v.elapsed || 0); }, 0) / allVotes.length;
      if (avgElapsed === 0) return 0.5;

      var ratio = vote.elapsed / avgElapsed;
      if (ratio < 0.5) return 1;
      if (ratio < 0.8) return 0.8;
      if (ratio < 1.2) return 0.6;
      if (ratio < 1.5) return 0.4;
      return 0.2;
    },

    scoreCompleteness: function(vote, analysis) {
      if (!vote.parsed) return 0;
      var score = 0;
      var txt = vote.txt || '';

      // Response has substance
      if (txt.length > 50) score += 0.3;
      if (txt.length > 150) score += 0.2;

      // Has structured data
      if (vote.parsed.steps && vote.parsed.steps.length > 0) score += 0.2;
      if (vote.parsed.text && vote.parsed.text.length > 50) score += 0.2;

      // Covers the query
      if (analysis.complexity === 'complex' && txt.length > 200) score += 0.1;

      return Math.min(1, score);
    },

    scoreOriginality: function(vote, allVotes) {
      if (!allVotes || allVotes.length < 2) return 0.5;

      var txt = (vote.txt || '').toLowerCase();
      var uniqueWords = {};
      txt.split(/\s+/).forEach(function(w) { uniqueWords[w] = true; });
      var wordCount = Object.keys(uniqueWords).length;

      // Check overlap with other votes
      var maxOverlap = 0;
      allVotes.forEach(function(other) {
        if (other.provider === vote.provider) return;
        var otherTxt = (other.txt || '').toLowerCase();
        var otherWords = {};
        otherTxt.split(/\s+/).forEach(function(w) { otherWords[w] = true; });

        var overlap = 0;
        Object.keys(uniqueWords).forEach(function(w) {
          if (otherWords[w]) overlap++;
        });
        var overlapRatio = wordCount > 0 ? overlap / wordCount : 0;
        maxOverlap = Math.max(maxOverlap, overlapRatio);
      });

      // Lower overlap = higher originality
      return Math.max(0, 1 - maxOverlap);
    },

    getGrade: function(score) {
      if (score >= 0.8) return 'A';
      if (score >= 0.6) return 'B';
      if (score >= 0.4) return 'C';
      if (score >= 0.2) return 'D';
      return 'F';
    }
  };

  // ═══════════════════════════════════════════
  // CONSENSUS DETECTOR
  // ═══════════════════════════════════════════

  var ConsensusDetector = {
    detect: function(scoredVotes) {
      if (scoredVotes.length < 2) {
        return {
          has: scoredVotes.length === 1,
          strength: scoredVotes.length === 1 ? 1 : 0,
          type: scoredVotes.length === 1 ? 'unanimous' : 'none',
          details: 'Not enough votes for consensus'
        };
      }

      var scores = scoredVotes.map(function(v) { return v.score.total; });
      var maxScore = Math.max.apply(null, scores);
      var minScore = Math.min.apply(null, scores);
      var avgScore = scores.reduce(function(a, b) { return a + b; }, 0) / scores.length;
      var variance = scores.reduce(function(sum, s) { return sum + Math.pow(s - avgScore, 2); }, 0) / scores.length;

      // Count votes close to the winner
      var threshold = maxScore * 0.85;
      var agreeing = scoredVotes.filter(function(v) { return v.score.total >= threshold; });
      var agreementRatio = agreeing.length / scoredVotes.length;

      // Determine consensus type
      var type = 'none';
      var strength = 0;

      if (agreementRatio >= 0.9 && variance < 0.05) {
        type = 'unanimous';
        strength = 1;
      } else if (agreementRatio >= 0.7) {
        type = 'strong';
        strength = agreementRatio;
      } else if (agreementRatio >= 0.5) {
        type = 'moderate';
        strength = agreementRatio;
      } else if (agreementRatio >= 0.3) {
        type = 'weak';
        strength = agreementRatio;
      } else {
        type = 'split';
        strength = agreementRatio;
      }

      return {
        has: agreementRatio >= 0.6,
        strength: strength,
        type: type,
        agreementRatio: agreementRatio,
        variance: variance,
        agreeing: agreeing.map(function(v) { return v.provider; }),
        details: this.buildDetails(type, agreeing, scoredVotes)
      };
    },

    buildDetails: function(type, agreeing, all) {
      var names = agreeing.map(function(v) { return v.provider; }).join(', ');
      var total = all.length;

      switch (type) {
        case 'unanimous':
          return 'All ' + total + ' IAs agree: ' + names;
        case 'strong':
          return agreeing.length + '/' + total + ' IAs agree: ' + names;
        case 'moderate':
          return 'Partial consensus (' + agreeing.length + '/' + total + '): ' + names;
        case 'weak':
          return 'Weak consensus, many alternatives';
        case 'split':
          return 'No consensus, votes are split';
        default:
          return 'Insufficient data';
      }
    }
  };

  // ═══════════════════════════════════════════
  // RANKING ENGINE
  // ═══════════════════════════════════════════

  var RankingEngine = {
    rank: function(votes, analysis) {
      var scored = votes.map(function(vote) {
        var score = ScoringEngine.score(vote, analysis, votes);
        return {
          provider: vote.provider,
          txt: vote.txt,
          parsed: vote.parsed,
          score: score,
          elapsed: vote.elapsed,
          error: vote.error,
          rank: 0
        };
      });

      // Sort by total score (descending), then by elapsed (ascending)
      scored.sort(function(a, b) {
        if (b.score.total !== a.score.total) return b.score.total - a.score.total;
        return a.elapsed - b.elapsed;
      });

      // Assign ranks
      scored.forEach(function(v, i) {
        v.rank = i + 1;
      });

      return scored;
    },

    getTopN: function(ranked, n) {
      return ranked.slice(0, n || 1);
    },

    getAlternatives: function(ranked) {
      return ranked.slice(1);
    },

    getBestResponse: function(ranked) {
      if (ranked.length === 0) return null;
      var best = ranked[0];
      return {
        provider: best.provider,
        response: best.parsed,
        score: best.score,
        rank: 1
      };
    }
  };

  // ═══════════════════════════════════════════
  // VOTING SESSION MANAGER
  // ═══════════════════════════════════════════

  function VotingSession(query, options) {
    this.query = query;
    this.options = options || {};
    this.collector = new VoteCollector(this.options);
    this.analysis = null;
    this.ranked = null;
    this.consensus = null;
    this.result = null;
  }

  VotingSession.prototype.start = function(analysis) {
    this.analysis = analysis;
    this.collector.startTime = Date.now();
    log.info('Voting session started for: ' + this.query.substring(0, 50) + '...');
  };

  VotingSession.prototype.addVote = function(vote) {
    return this.collector.addVote(vote);
  };

  VotingSession.prototype.isComplete = function() {
    return this.collector.hasTargetVotes() || this.collector.isTimedOut();
  };

  VotingSession.prototype.finalize = function() {
    var validVotes = this.collector.getValidVotes();

    if (validVotes.length === 0) {
      this.result = {
        ok: false,
        error: 'No valid votes received',
        stats: this.collector.getStats()
      };
      return this.result;
    }

    // Rank votes
    this.ranked = RankingEngine.rank(validVotes, this.analysis);

    // Detect consensus
    this.consensus = ConsensusDetector.detect(this.ranked);

    // Build final result
    var best = RankingEngine.getBestResponse(this.ranked);
    var alternatives = RankingEngine.getAlternatives(this.ranked);

    this.result = {
      ok: true,
      query: this.query,
      analysis: this.analysis,
      winner: best,
      alternatives: alternatives.map(function(a) {
        return {
          provider: a.provider,
          score: a.score,
          rank: a.rank,
          preview: (a.txt || '').substring(0, 100)
        };
      }),
      consensus: this.consensus,
      stats: this.collector.getStats(),
      timestamp: Date.now()
    };

    return this.result;
  };

  VotingSession.prototype.getSummary = function() {
    if (!this.result) return 'Session not finalized';
    var r = this.result;
    var summary = 'Voting Summary:\n';
    summary += 'Query: ' + r.query.substring(0, 50) + '...\n';
    summary += 'Analysis: ' + JSON.stringify(r.analysis) + '\n';
    summary += 'Winner: ' + r.winner.provider + ' (score: ' + r.winner.score.total + ')\n';
    summary += 'Consensus: ' + (r.consensus ? r.consensus.type : 'none') + ' (' + (r.consensus ? Math.round(r.consensus.strength * 100) : 0) + '%)\n';
    summary += 'Alternatives: ' + r.alternatives.length + '\n';
    summary += 'Stats: ' + JSON.stringify(r.stats);
    return summary;
  };

  // ═══════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════

  window.X1Voting = {
    version: '1.0.0',

    VoteCollector: VoteCollector,
    ScoringEngine: ScoringEngine,
    ConsensusDetector: ConsensusDetector,
    RankingEngine: RankingEngine,
    VotingSession: VotingSession,

    createSession: function(query, options) {
      return new VotingSession(query, options);
    },

    score: function(vote, analysis, allVotes) {
      return ScoringEngine.score(vote, analysis, allVotes);
    },

    detectConsensus: function(scoredVotes) {
      return ConsensusDetector.detect(scoredVotes);
    },

    rank: function(votes, analysis) {
      return RankingEngine.rank(votes, analysis);
    },

    healthCheck: function() {
      return Promise.resolve({
        ok: true,
        version: '1.0.0',
        capabilities: ['collect', 'score', 'rank', 'consensus', 'synthesize']
      });
    }
  };

  log.info('X1Voting loaded');

})();
