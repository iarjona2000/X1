/**
 * Tests para todos los bridges de integraciones
 * kilo-bridge, openwebui-bridge, llamaindex-bridge, piper-bridge, whisper-bridge, huggingface-bridge
 */

(function() {
  'use strict';

  var passed = 0;
  var failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
      console.log('[TEST] OK', message);
    } else {
      failed++;
      console.error('[TEST] FAIL', message);
    }
  }

  function runTests() {
    console.log('[TEST] ================================');
    console.log('[TEST] Iniciando tests de todos los bridges...');
    console.log('[TEST] ================================');

    // === Kilo Bridge ===
    console.log('[TEST] --- Kilo Bridge ---');
    assert(typeof window.X1KiloBridge === 'object', 'X1KiloBridge existe');
    assert(typeof window.X1KiloBridge.executeTool === 'function', 'Kilo executeTool es funcion');
    assert(typeof window.X1KiloBridge.runAgent === 'function', 'Kilo runAgent es funcion');
    assert(typeof window.X1KiloBridge.listTools === 'function', 'Kilo listTools es funcion');

    var kiloTools = window.X1KiloBridge.listTools();
    assert(Array.isArray(kiloTools), 'Kilo listTools retorna array');
    assert(kiloTools.length === 10, 'Kilo tiene 10 tools');
    assert(kiloTools[0].name === 'search_files', 'Primera tool es search_files');

    // === OpenWebUI Bridge ===
    console.log('[TEST] --- OpenWebUI Bridge ---');
    assert(typeof window.X1OpenWebUIBridge === 'object', 'X1OpenWebUIBridge existe');
    assert(typeof window.X1OpenWebUIBridge.createClient === 'function', 'OpenWebUI createClient es funcion');
    assert(typeof window.X1OpenWebUIBridge.chatComplete === 'function', 'OpenWebUI chatComplete es funcion');
    assert(typeof window.X1OpenWebUIBridge.chatStream === 'function', 'OpenWebUI chatStream es funcion');
    assert(typeof window.X1OpenWebUIBridge.listModels === 'function', 'OpenWebUI listModels es funcion');

    var owClient = window.X1OpenWebUIBridge.createClient({ baseUrl: 'http://test:8080', model: 'test' });
    assert(owClient && typeof owClient.chat === 'function', 'OpenWebUI client creado');

    // === LlamaIndex Bridge ===
    console.log('[TEST] --- LlamaIndex Bridge ---');
    assert(typeof window.X1LlamaIndexBridge === 'object', 'X1LlamaIndexBridge existe');
    assert(typeof window.X1LlamaIndexBridge.createEngine === 'function', 'LlamaIndex createEngine es funcion');
    assert(typeof window.X1LlamaIndexBridge.ingest === 'function', 'LlamaIndex ingest es funcion');
    assert(typeof window.X1LlamaIndexBridge.query === 'function', 'LlamaIndex query es funcion');

    var engine = window.X1LlamaIndexBridge.createEngine();
    assert(engine && typeof engine.ingest === 'function', 'LlamaIndex engine creado');

    // Test ingest and query
    engine.ingest('This is a test document about artificial intelligence. AI is transforming the world.', { source: 'test' });
    var stats = engine.getStats();
    assert(stats.documents > 0, 'LlamaIndex documents ingested: ' + stats.documents);

    return engine.query('What is AI?').then(function(result) {
      assert(typeof result === 'object', 'LlamaIndex query retorna objeto');
      assert(typeof result.answer === 'string', 'LlamaIndex query tiene answer');
      assert(Array.isArray(result.sources), 'LlamaIndex query tiene sources');

      // === Piper Bridge ===
      console.log('[TEST] --- Piper Bridge ---');
      assert(typeof window.X1PiperBridge === 'object', 'X1PiperBridge existe');
      assert(typeof window.X1PiperBridge.createTTS === 'function', 'Piper createTTS es funcion');
      assert(typeof window.X1PiperBridge.speak === 'function', 'Piper speak es funcion');
      assert(typeof window.X1PiperBridge.getVoices === 'function', 'Piper getVoices es funcion');

      var voices = window.X1PiperBridge.getVoices();
      assert(Array.isArray(voices), 'Piper getVoices retorna array');
      assert(voices.length === 10, 'Piper tiene 10 voces');
      assert(voices[0].lang === 'es', 'Primera voz es espanol');

      var tts = window.X1PiperBridge.createTTS({ voice: 'en_US-lessac-medium' });
      assert(tts && typeof tts.synthesize === 'function', 'Piper TTS creado');

      // === Whisper Bridge ===
      console.log('[TEST] --- Whisper Bridge ---');
      assert(typeof window.X1WhisperBridge === 'object', 'X1WhisperBridge existe');
      assert(typeof window.X1WhisperBridge.createSTT === 'function', 'Whisper createSTT es funcion');
      assert(typeof window.X1WhisperBridge.transcribe === 'function', 'Whisper transcribe es funcion');
      assert(typeof window.X1WhisperBridge.listen === 'function', 'Whisper listen es funcion');
      assert(typeof window.X1WhisperBridge.getModels === 'function', 'Whisper getModels es funcion');

      var models = window.X1WhisperBridge.getModels();
      assert(Array.isArray(models), 'Whisper getModels retorna array');
      assert(models.length === 5, 'Whisper tiene 5 modelos');
      assert(models[0].id === 'tiny', 'Primero modelo es tiny');
      assert(models[4].id === 'large', 'Ultimo modelo es large');

      var stt = window.X1WhisperBridge.createSTT({ model: 'small', language: 'en' });
      assert(stt && typeof stt.transcribe === 'function', 'Whisper STT creado');

      // === HuggingFace Bridge ===
      console.log('[TEST] --- HuggingFace Bridge ---');
      assert(typeof window.X1HuggingFaceBridge === 'object', 'X1HuggingFaceBridge existe');
      assert(typeof window.X1HuggingFaceBridge.create === 'function', 'HuggingFace create es funcion');
      assert(typeof window.X1HuggingFaceBridge.speak === 'function', 'HuggingFace speak es funcion');
      assert(typeof window.X1HuggingFaceBridge.listen === 'function', 'HuggingFace listen es funcion');

      var hf = window.X1HuggingFaceBridge.create();
      assert(hf && typeof hf.speak === 'function', 'HuggingFace bridge creado');

      var features = hf.getFeatures();
      assert(typeof features === 'object', 'HuggingFace features es objeto');
      assert(typeof features.piper_tts_enabled === 'boolean', 'HuggingFace tiene piper_tts_enabled');
      assert(typeof features.whisper_stt_enabled === 'boolean', 'HuggingFace tiene whisper_stt_enabled');
      assert(typeof features.huggingface_api_key === 'string', 'HuggingFace tiene api_key');

      // Test feature toggles
      hf.setFeature('piper_tts_enabled', false);
      assert(hf.getFeatures().piper_tts_enabled === false, 'HuggingFace feature toggle funciona');
      hf.setFeature('piper_tts_enabled', true);

      // === Health Checks ===
      console.log('[TEST] --- Health Checks ---');

      return Promise.all([
        window.X1KiloBridge.healthCheck(),
        window.X1OpenWebUIBridge.healthCheck(),
        window.X1LlamaIndexBridge.healthCheck(),
        window.X1PiperBridge.healthCheck(),
        window.X1WhisperBridge.healthCheck(),
        window.X1HuggingFaceBridge.healthCheck()
      ]).then(function(results) {
        assert(results[0].ok === true, 'Kilo health check OK');
        assert(results[1].ok === true, 'OpenWebUI health check OK');
        assert(results[2].ok === true, 'LlamaIndex health check OK');
        assert(results[3].ok === true, 'Piper health check OK');
        assert(results[4].ok === true, 'Whisper health check OK');
        assert(results[5].ok === true, 'HuggingFace health check OK');

        // === Registry Check ===
        console.log('[TEST] --- Registry ---');
        if (window.X1Integrations) {
          var list = window.X1Integrations.list();
          assert(list.length >= 7, 'Registry tiene al menos 7 integraciones (actual: ' + list.length + ')');

          var names = list.map(function(i) { return i.name; });
          assert(names.indexOf('continue') >= 0, 'Registry incluye continue');
          assert(names.indexOf('kilo') >= 0, 'Registry incluye kilo');
          assert(names.indexOf('openwebui') >= 0, 'Registry incluye openwebui');
          assert(names.indexOf('llamaindex') >= 0, 'Registry incluye llamaindex');
          assert(names.indexOf('piper') >= 0, 'Registry incluye piper');
          assert(names.indexOf('whisper') >= 0, 'Registry incluye whisper');
          assert(names.indexOf('huggingface') >= 0, 'Registry incluye huggingface');
        }

        console.log('[TEST] ================================');
        console.log('[TEST] TOTAL Pasados:', passed, '| Fallados:', failed);
        console.log('[TEST] ================================');
        return { passed: passed, failed: failed };
      });
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runTests: runTests };
  } else {
    setTimeout(runTests, 200);
  }

})();
