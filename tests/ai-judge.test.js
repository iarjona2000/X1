/**
 * ai-judge.test.js — Tests del Sistema Judge de X1
 *
 * Tests unitarios para el motor central del Juez, sistema de votos,
 * router inteligente, y pool de providers.
 */

(function() {
  'use strict';

  var passed = 0;
  var failed = 0;
  var total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      passed++;
      console.log('  PASS: ' + message);
    } else {
      failed++;
      console.error('  FAIL: ' + message);
    }
  }

  function assertEqual(actual, expected, message) {
    assert(actual === expected, message + ' (got: ' + actual + ', expected: ' + expected + ')');
  }

  function assertType(obj, type, message) {
    assert(typeof obj === type, message + ' (got: ' + typeof obj + ', expected: ' + type + ')');
  }

  function assertArray(arr, message) {
    assert(Array.isArray(arr), message + ' (got: ' + typeof arr + ')');
  }

  function assertObject(obj, message) {
    assert(typeof obj === 'object' && obj !== null && !Array.isArray(obj), message);
  }

  // ═══════════════════════════════════════════
  // TESTS: X1Judge
  // ═══════════════════════════════════════════

  console.log('\n=== X1Judge Tests ===');

  // Test analyzeQuery
  (function() {
    console.log('\n--- analyzeQuery ---');

    var result = X1Judge.analyzeQuery('programa una funcion en JavaScript');
    assertEqual(result.type, 'code', 'Detects code query');
    assertEqual(result.complexity, 'simple', 'Simple complexity for short query');

    result = X1Judge.analyzeQuery('por que el cielo es azul? explica la razon scientifica');
    assertEqual(result.type, 'reasoning', 'Detects reasoning query');

    result = X1Judge.analyzeQuery('escribe una historia sobre un robot');
    assertEqual(result.type, 'creative', 'Detects creative query');

    result = X1Judge.analyzeQuery('traduce esto al ingles');
    assertEqual(result.type, 'translation', 'Detects translation query');

    result = X1Judge.analyzeQuery('ejecuta una busqueda en google');
    assertEqual(result.type, 'agentic', 'Detects agentic query');

    result = X1Judge.analyzeQuery('investiga sobre inteligencia artificial');
    assertEqual(result.type, 'research', 'Detects research query');

    result = X1Judge.analyzeQuery('que es un contrato legal');
    assertEqual(result.type, 'sensitive', 'Detects sensitive query');

    result = X1Judge.analyzeQuery('hola que tal');
    assertEqual(result.type, 'conversational', 'Default conversational type');

    // Language detection
    result = X1Judge.analyzeQuery('what is machine learning');
    assertEqual(result.language, 'en', 'Detects English language');

    result = X1Judge.analyzeQuery('que es el aprendizaje automatico');
    assertEqual(result.language, 'es', 'Detects Spanish language');

    // Complexity
    result = X1Judge.analyzeQuery('explica el tema');
    assertEqual(result.complexity, 'moderate', 'Moderate complexity for medium query');

    result = X1Judge.analyzeQuery('compara los pros y contras de React vs Vue vs Angular y explicame por que es mejor cada uno para diferentes casos de uso y cuales son las diferencias principales entre ellos');
    assertEqual(result.complexity, 'complex', 'Complex complexity for long multi-part query');
  })();

  // Test parseResponse
  (function() {
    console.log('\n--- parseResponse ---');

    var result = X1Judge.parseResponse(null);
    assertEqual(result, null, 'Null input returns null');

    result = X1Judge.parseResponse('');
    assertEqual(result, null, 'Empty string returns null');

    result = X1Judge.parseResponse('hola');
    assertEqual(result, null, 'Short text returns null');

    result = X1Judge.parseResponse('Esta es una respuesta larga del usuario');
    assertObject(result, 'Long text returns speak object');
    assertEqual(result.action, 'speak', 'Action is speak');
    assertEqual(result.text, 'Esta es una respuesta larga del usuario', 'Text is preserved');

    result = X1Judge.parseResponse('{"action":"speak","text":"hello"}');
    assertObject(result, 'JSON object parsed');
    assertEqual(result.action, 'speak', 'Action parsed correctly');
    assertEqual(result.text, 'hello', 'Text parsed correctly');

    result = X1Judge.parseResponse('```json\n{"action":"speak","text":"hello"}\n```');
    assertObject(result, 'Markdown JSON parsed');
    assertEqual(result.action, 'speak', 'Markdown action parsed');

    result = X1Judge.parseResponse('[{"action":"navigate","url":"google.com"}]');
    assertObject(result, 'Array parsed as steps');
    assertArray(result.steps, 'Steps is array');
  })();

  // Test scoreVote
  (function() {
    console.log('\n--- scoreVote ---');

    var analysis = { type: 'conversational', complexity: 'simple' };

    var score = X1Judge.scoreVote({ parsed: null, error: 'timeout' }, analysis);
    assertEqual(score, -1, 'Error vote gets -1');

    score = X1Judge.scoreVote({ parsed: { action: 'speak', text: 'hello world' }, txt: 'hello world', elapsed: 1000 }, analysis);
    assert(score > 0, 'Valid speak vote gets positive score');

    score = X1Judge.scoreVote({ parsed: { action: 'steps', steps: [{action: 'navigate'}] }, txt: 'navigate', elapsed: 2000 }, analysis);
    assert(score > 2, 'Steps vote gets higher score');

    // Code type bonus
    analysis.type = 'code';
    score = X1Judge.scoreVote({ parsed: { action: 'speak', text: '```javascript\nconsole.log("hello")\n```' }, txt: '```javascript\nconsole.log("hello")\n```', elapsed: 1500 }, analysis);
    assert(score > 3, 'Code query with code gets bonus');
  })();

  // Test rankVotes
  (function() {
    console.log('\n--- rankVotes ---');

    var analysis = { type: 'conversational', complexity: 'simple' };
    var votes = [
      { provider: 'groq', parsed: { action: 'speak', text: 'short' }, txt: 'short', elapsed: 1000 },
      { provider: 'gemini', parsed: { action: 'speak', text: 'a longer response with more detail' }, txt: 'a longer response with more detail', elapsed: 2000 },
      { provider: 'mistral', parsed: { action: 'steps', steps: [] }, txt: 'steps', elapsed: 1500 }
    ];

    var ranked = X1Judge.rankVotes(votes, analysis);
    assertArray(ranked, 'Returns array');
    assertEqual(ranked.length, 3, 'All votes ranked');
    assert(ranked[0].score >= ranked[1].score, 'First has higher score than second');
    assert(ranked[1].score >= ranked[2].score, 'Second has higher score than third');
  })();

  // Test detectConsensus
  (function() {
    console.log('\n--- detectConsensus ---');

    var result = X1Judge.detectConsensus([]);
    assertEqual(result.has, false, 'No consensus with empty votes');

    result = X1Judge.detectConsensus([{ score: 5 }]);
    assertEqual(result.has, false, 'No consensus with single vote');

    result = X1Judge.detectConsensus([
      { score: 5 }, { score: 5 }, { score: 5 }
    ]);
    assertEqual(result.has, true, 'Consensus with equal scores');
    assertEqual(result.strength, 1, 'Full strength with equal scores');

    result = X1Judge.detectConsensus([
      { score: 5 }, { score: 3 }, { score: 1 }
    ]);
    assertEqual(result.has, false, 'No consensus with spread scores');
  })();

  // ═══════════════════════════════════════════
  // TESTS: X1Voting
  // ═══════════════════════════════════════════

  console.log('\n=== X1Voting Tests ===');

  // Test VoteCollector
  (function() {
    console.log('\n--- VoteCollector ---');

    var collector = new X1Voting.VoteCollector({ minVotes: 2, targetVotes: 3, timeout: 5000 });
    assertObject(collector, 'Creates VoteCollector');

    var added = collector.addVote({ provider: 'groq', txt: 'hello', parsed: { action: 'speak' } });
    assertEqual(added, true, 'Adds valid vote');
    assertEqual(collector.votes.length, 1, 'Vote count is 1');

    added = collector.addVote({ provider: 'groq', txt: 'duplicate', parsed: { action: 'speak' } });
    assertEqual(added, false, 'Rejects duplicate vote');
    assertEqual(collector.votes.length, 1, 'Vote count still 1');

    added = collector.addVote({ provider: 'gemini', txt: 'world', parsed: { action: 'speak' } });
    assertEqual(added, true, 'Adds second vote');
    assertEqual(collector.votes.length, 2, 'Vote count is 2');

    assertEqual(collector.hasEnoughVotes(), true, 'Has enough votes');
    assertEqual(collector.hasTargetVotes(), false, 'Does not have target votes');

    var valid = collector.getValidVotes();
    assertEqual(valid.length, 2, 'Two valid votes');

    var stats = collector.getStats();
    assertEqual(stats.total, 2, 'Stats total is 2');
    assertEqual(stats.valid, 2, 'Stats valid is 2');
  })();

  // Test ScoringEngine
  (function() {
    console.log('\n--- ScoringEngine ---');

    var vote = { provider: 'groq', txt: 'hello world', parsed: { action: 'speak', text: 'hello world' }, elapsed: 1000 };
    var analysis = { type: 'conversational', complexity: 'simple' };

    var score = X1Voting.ScoringEngine.score(vote, analysis, [vote]);
    assertObject(score, 'Returns score object');
    assertType(score.total, 'number', 'Total is number');
    assertObject(score.breakdown, 'Breakdown is object');
    assertType(score.grade, 'string', 'Grade is string');

    vote = { provider: 'groq', txt: '```javascript\nconsole.log("hello")\n```', parsed: { action: 'speak', text: 'code' }, elapsed: 2000 };
    analysis.type = 'code';
    score = X1Voting.ScoringEngine.score(vote, analysis, [vote]);
    assert(score.breakdown.typeAlignment > 0, 'Code type alignment positive for code query');
  })();

  // Test ConsensusDetector
  (function() {
    console.log('\n--- ConsensusDetector ---');

    var result = X1Voting.ConsensusDetector.detect([]);
    assertEqual(result.has, false, 'No consensus with empty');

    result = X1Voting.ConsensusDetector.detect([
      { provider: 'groq', score: { total: 0.9 } },
      { provider: 'gemini', score: { total: 0.9 } },
      { provider: 'mistral', score: { total: 0.9 } }
    ]);
    assertEqual(result.has, true, 'Consensus with equal scores');
    assertEqual(result.type, 'unanimous', 'Unanimous type');

    result = X1Voting.ConsensusDetector.detect([
      { provider: 'groq', score: { total: 0.9 } },
      { provider: 'gemini', score: { total: 0.2 } },
      { provider: 'mistral', score: { total: 0.1 } }
    ]);
    assertEqual(result.has, false, 'No consensus with spread scores');
    assertEqual(result.type, 'split', 'Split type');
  })();

  // Test RankingEngine
  (function() {
    console.log('\n--- RankingEngine ---');

    var votes = [
      { provider: 'groq', txt: 'short', parsed: { action: 'speak', text: 'short' }, elapsed: 1000 },
      { provider: 'gemini', txt: 'a longer response with more detail and information', parsed: { action: 'speak', text: 'longer' }, elapsed: 2000 },
      { provider: 'mistral', txt: 'medium response', parsed: { action: 'steps', steps: [] }, elapsed: 1500 }
    ];
    var analysis = { type: 'conversational', complexity: 'simple' };

    var ranked = X1Voting.RankingEngine.rank(votes, analysis);
    assertArray(ranked, 'Returns array');
    assertEqual(ranked.length, 3, 'All votes ranked');
    assertEqual(ranked[0].rank, 1, 'First has rank 1');
    assertEqual(ranked[1].rank, 2, 'Second has rank 2');
    assertEqual(ranked[2].rank, 3, 'Third has rank 3');

    var top = X1Voting.RankingEngine.getTopN(ranked, 2);
    assertEqual(top.length, 2, 'TopN returns 2');

    var best = X1Voting.RankingEngine.getBestResponse(ranked);
    assertObject(best, 'Best response is object');
    assertEqual(best.rank, 1, 'Best has rank 1');
  })();

  // Test VotingSession
  (function() {
    console.log('\n--- VotingSession ---');

    var session = X1Voting.createSession('test query', { minVotes: 2 });
    assertObject(session, 'Creates session');

    session.start({ type: 'conversational', complexity: 'simple' });
    assertObject(session.analysis, 'Analysis set');

    session.addVote({ provider: 'groq', txt: 'hello', parsed: { action: 'speak' }, elapsed: 1000 });
    assertEqual(session.collector.votes.length, 1, 'Vote added');

    session.addVote({ provider: 'gemini', txt: 'world', parsed: { action: 'speak' }, elapsed: 2000 });
    assertEqual(session.collector.votes.length, 2, 'Second vote added');

    assertEqual(session.isComplete(), true, 'Session is complete');

    var result = session.finalize();
    assertObject(result, 'Finalize returns result');
    assertEqual(result.ok, true, 'Result is ok');
    assertObject(result.winner, 'Result has winner');
    assertArray(result.alternatives, 'Result has alternatives');
  })();

  // ═══════════════════════════════════════════
  // TESTS: X1Router
  // ═══════════════════════════════════════════

  console.log('\n=== X1Router Tests ===');

  // Test SmartRouter
  (function() {
    console.log('\n--- SmartRouter ---');

    var router = X1Router.createRouter({ maxVoters: 3 });
    assertObject(router, 'Creates router');

    // Mock providers
    var mockProviders = [
      { name: 'groq', fn: function() { return Promise.resolve('ok'); }, has: true, fast: true },
      { name: 'gemini', fn: function() { return Promise.resolve('ok'); }, has: true, fast: true },
      { name: 'mistral', fn: function() { return Promise.resolve('ok'); }, has: true, fast: true },
      { name: 'ollama', fn: function() { return Promise.resolve('ok'); }, has: true, fast: false }
    ];
    router.setProviders(mockProviders);

    var routing = router.route('programa una funcion');
    assertObject(routing, 'Route returns object');
    assertEqual(routing.strategy, 'hybrid', 'Default strategy is hybrid');
    assert(routing.selected.length > 0, 'Has selected providers');

    // Test different strategies
    router.setStrategy('typeBased');
    routing = router.route('programa una funcion');
    assertEqual(routing.strategy, 'typeBased', 'Strategy updated');

    router.setStrategy('performanceBased');
    routing = router.route('test');
    assertEqual(routing.strategy, 'performanceBased', 'Performance strategy');
  })();

  // Test RoutingStrategies
  (function() {
    console.log('\n--- RoutingStrategies ---');

    var mockProviders = [
      { name: 'groq', has: true },
      { name: 'gemini', has: true },
      { name: 'mistral', has: true },
      { name: 'ollama', has: true }
    ];

    var analysis = { type: 'code', complexity: 'simple' };
    var result = X1Router.RoutingStrategies.typeBased(analysis, mockProviders);
    assertArray(result, 'Type-based returns array');
    assert(result.indexOf('groq') !== -1, 'Code type includes groq');

    analysis.type = 'reasoning';
    result = X1Router.RoutingStrategies.typeBased(analysis, mockProviders);
    assert(result.indexOf('groq') !== -1, 'Reasoning type includes groq');

    result = X1Router.RoutingStrategies.diversityRouting(analysis, mockProviders);
    assertArray(result, 'Diversity returns array');
    assert(result.length <= 4, 'Diversity limits to 4');
  })();

  // Test performance tracking
  (function() {
    console.log('\n--- Performance Tracking ---');

    X1Router.resetPerformance();

    X1Router.recordPerformance('groq', { score: 8, elapsed: 1000 });
    X1Router.recordPerformance('groq', { score: 7, elapsed: 1500 });
    X1Router.recordPerformance('gemini', { score: 9, elapsed: 2000 });

    var score = X1Router.getProviderScore('groq');
    assert(score > 0, 'Groq has positive score');

    score = X1Router.getProviderScore('gemini');
    assert(score > 0, 'Gemini has positive score');

    score = X1Router.getProviderScore('nonexistent');
    assertEqual(score, 0.5, 'Unknown provider has 0.5 score');

    assert(X1Router.isProviderAvailable('groq'), 'Groq is available');
  })();

  // ═══════════════════════════════════════════
  // TESTS: X1Pool
  // ═══════════════════════════════════════════

  console.log('\n=== X1Pool Tests ===');

  (function() {
    console.log('\n--- Provider Registration ---');

    var registered = X1Pool.register({
      name: 'test-provider',
      displayName: 'Test Provider',
      family: 'test',
      fn: function() { return Promise.resolve('test'); },
      has: true
    });
    assertEqual(registered, true, 'Registers provider');

    var provider = X1Pool.get('test-provider');
    assertObject(provider, 'Gets provider');
    assertEqual(provider.name, 'test-provider', 'Provider name correct');
    assertEqual(provider.displayName, 'Test Provider', 'Display name correct');

    var all = X1Pool.getAll();
    assertArray(all, 'getAll returns array');
    assert(all.length > 0, 'Has providers');

    var active = X1Pool.getActive();
    assertArray(active, 'getActive returns array');

    var byFamily = X1Pool.getByFamily('test');
    assertArray(byFamily, 'getByFamily returns array');
    assert(byFamily.length === 1, 'One test provider');

    var byCap = X1Pool.getByCapability('text');
    assertArray(byCap, 'getByCapability returns array');

    X1Pool.unregister('test-provider');
    provider = X1Pool.get('test-provider');
    assertEqual(provider, null, 'Provider unregistered');
  })();

  (function() {
    console.log('\n--- Health Management ---');

    X1Pool.updateHealth('groq', true);
    assert(X1Pool.isHealthy('groq'), 'Groq is healthy');

    X1Pool.updateHealth('groq', false);
    X1Pool.updateHealth('groq', false);
    X1Pool.updateHealth('groq', false);
    assert(!X1Pool.isHealthy('groq'), 'Groq unhealthy after 3 failures');

    var health = X1Pool.getHealthStatus();
    assertObject(health, 'Health status is object');
  })();

  (function() {
    console.log('\n--- Provider Selection ---');

    var selected = X1Pool.select({ count: 2 });
    assertArray(selected, 'Select returns array');
    assert(selected.length <= 2, 'Respects count limit');

    selected = X1Pool.select({ capability: 'code' });
    assertArray(selected, 'Select by capability returns array');

    selected = X1Pool.select({ family: 'meta' });
    assertArray(selected, 'Select by family returns array');
  })();

  (function() {
    console.log('\n--- Pool Stats ---');

    var stats = X1Pool.getStats();
    assertObject(stats, 'Stats is object');
    assertType(stats.total, 'number', 'Total is number');
    assertType(stats.active, 'number', 'Active is number');
    assertType(stats.healthy, 'number', 'Healthy is number');
    assertObject(stats.byFamily, 'byFamily is object');
    assertObject(stats.byCapability, 'byCapability is object');
  })();

  // ═══════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════

  console.log('\n══════════════════════════════════════════');
  console.log('TEST SUMMARY: ' + passed + ' passed, ' + failed + ' failed, ' + total + ' total');
  console.log('══════════════════════════════════════════');

  if (failed > 0) {
    console.error('SOME TESTS FAILED!');
  } else {
    console.log('ALL TESTS PASSED!');
  }

})();
