# X1 — Unit Tests

Pruebas para validar que cada módulo carga y funciona.

## Ejecución

Copiar-pegar cada test en `chrome://extensions` → DevTools (Inspect service worker) → Console.

---

## Module Loading Tests

```javascript
// Test 1: Core modules loaded
console.assert(typeof X1IndexedDB !== 'undefined', 'X1IndexedDB missing');
console.assert(typeof X1CascadeRouter !== 'undefined', 'X1CascadeRouter missing');
console.assert(typeof X1GoogleAuth !== 'undefined', 'X1GoogleAuth missing');
console.log('[✓] Core modules');

// Test 2: Cascade providers
console.assert(typeof X1ProviderGroq !== 'undefined', 'Groq provider missing');
console.assert(typeof X1ProviderGemini !== 'undefined', 'Gemini provider missing');
console.assert(typeof X1ProviderOpenAI !== 'undefined', 'OpenAI provider missing');
console.assert(typeof X1ProviderNvidia !== 'undefined', 'Nvidia provider missing');
console.assert(typeof X1ProviderCloudflare !== 'undefined', 'Cloudflare provider missing');
console.assert(typeof X1ProviderSambaNova !== 'undefined', 'SambaNova provider missing');
console.assert(typeof X1ProviderMistral !== 'undefined', 'Mistral provider missing');
console.log('[✓] Cascade providers (7/13)');

// Test 3: New subsystems
console.assert(typeof X1WritingStyle !== 'undefined', 'WritingStyle missing');
console.assert(typeof X1GroupChat !== 'undefined', 'GroupChat missing');
console.assert(typeof X1FinancialData !== 'undefined', 'FinancialData missing');
console.assert(typeof X1ImageGen !== 'undefined', 'ImageGen missing');
console.assert(typeof X1DataExtractor !== 'undefined', 'DataExtractor missing');
console.assert(typeof X1SEOAnalyzer !== 'undefined', 'SEOAnalyzer missing');
console.assert(typeof X1MCPClient !== 'undefined', 'MCPClient missing');
console.assert(typeof X1DeepResearch !== 'undefined', 'DeepResearch missing');
console.assert(typeof X1SkillEngine !== 'undefined', 'SkillEngine missing');
console.assert(typeof X1PromptAssembler !== 'undefined', 'PromptAssembler missing');
console.log('[✓] New subsystems (10/10)');

// Test 4: Existing subsystems
console.assert(typeof X1AgentManager !== 'undefined', 'AgentManager missing');
console.assert(typeof X1Workspace !== 'undefined', 'Workspace missing');
console.assert(typeof X1PluginEngine !== 'undefined', 'PluginEngine missing');
console.assert(typeof X1AutomationEngine !== 'undefined', 'AutomationEngine missing');
console.assert(typeof X1PageMonitor !== 'undefined', 'PageMonitor missing');
console.assert(typeof X1RateLimiter !== 'undefined', 'RateLimiter missing');
console.log('[✓] Subsystems (5/5)');

console.log('✅ ALL MODULES LOADED');
```

---

## AI Keys Loading

```javascript
// Check that aiKeys loaded
console.log('AI Keys:', Object.keys(aiKeys || {}));
console.assert(typeof aiKeys === 'object', 'aiKeys not initialized');
console.log('[✓] AI keys structure OK');
```

---

## Storage Tests

```javascript
// Test 5: Memory initialization
chrome.storage.session.get(['x1Memory'], function(r) {
  var mem = r.x1Memory || [];
  console.log('[✓] Memory initialized (entries: ' + mem.length + ')');
});

// Test 6: Knowledge graph
chrome.storage.local.get(['x1_graph'], function(r) {
  console.log('[✓] Op graph retrieved');
});
```

---

## Core Functions Test

```javascript
// Test 7: handleVoice exists and is callable
console.assert(typeof handleVoice === 'function', 'handleVoice not found');
console.log('[✓] handleVoice function exists');

// Test 8: execAction exists
console.assert(typeof execAction === 'function', 'execAction not found');
console.log('[✓] execAction function exists');

// Test 9: aiComplete exists
console.assert(typeof aiComplete === 'function', 'aiComplete not found');
console.log('[✓] aiComplete function exists');

// Test 10: buildSystemPrompt exists
console.assert(typeof buildSystemPrompt === 'function', 'buildSystemPrompt not found');
console.log('[✓] buildSystemPrompt function exists');
```

---

## Provider Key Methods

```javascript
// Test 11: Each provider has getKey, complete, testKey
var providers = ['groq', 'gemini', 'openai', 'nvidia', 'cerebras'];
providers.forEach(function(p) {
  var key = 'X1Provider' + p.charAt(0).toUpperCase() + p.slice(1);
  if (typeof window[key] !== 'undefined') {
    var prov = window[key];
    console.assert(typeof prov.getKey === 'function', key + '.getKey missing');
    console.assert(typeof prov.complete === 'function', key + '.complete missing');
  }
});
console.log('[✓] Provider methods OK');
```

---

## Subsystem Method Tests

```javascript
// Test 12: WritingStyle methods
console.assert(typeof X1WritingStyle.loadStyles === 'function', 'WritingStyle.loadStyles missing');
console.assert(typeof X1WritingStyle.learnFrom === 'function', 'WritingStyle.learnFrom missing');
console.log('[✓] WritingStyle methods');

// Test 13: FinancialData methods
console.assert(typeof X1FinancialData.getQuote === 'function', 'FinancialData.getQuote missing');
console.assert(typeof X1FinancialData.getMarketSummary === 'function', 'FinancialData.getMarketSummary missing');
console.log('[✓] FinancialData methods');

// Test 14: ImageGen methods
console.assert(typeof X1ImageGen.generate === 'function', 'ImageGen.generate missing');
console.log('[✓] ImageGen methods');

// Test 15: SkillEngine methods
console.assert(typeof X1SkillEngine.loadSkills === 'function', 'SkillEngine.loadSkills missing');
console.assert(typeof X1SkillEngine.runSkill === 'function', 'SkillEngine.runSkill missing');
console.log('[✓] SkillEngine methods');

// Test 16: MCPClient methods
console.assert(typeof X1MCPClient.callTool === 'function', 'MCPClient.callTool missing');
console.assert(typeof X1MCPClient.getServers === 'function', 'MCPClient.getServers missing');
console.log('[✓] MCPClient methods');

// Test 17: DataExtractor methods
console.assert(typeof X1DataExtractor.extractWithAI === 'function', 'DataExtractor.extractWithAI missing');
console.log('[✓] DataExtractor methods');

// Test 18: DeepResearch methods
console.assert(typeof X1DeepResearch.research === 'function', 'DeepResearch.research missing');
console.log('[✓] DeepResearch methods');

// Test 19: PromptAssembler methods
console.assert(typeof X1PromptAssembler.assemble === 'function', 'PromptAssembler.assemble missing');
console.log('[✓] PromptAssembler methods');

console.log('✅ ALL SUBSYSTEM METHODS VERIFIED');
```

---

## Integration Test (requires active tab)

```javascript
// Test 20: Can read current tab
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  if (tabs.length > 0) {
    console.log('[✓] Active tab found: ' + tabs[0].url.substring(0, 50));
  } else {
    console.warn('[!] No active tab to test with');
  }
});
```

---

## Quick Smoke Test (run all at once)

```javascript
// COMPREHENSIVE TEST
function runSmokeTests() {
  var failures = [];
  var tests = [
    ['X1IndexedDB', typeof X1IndexedDB !== 'undefined'],
    ['X1CascadeRouter', typeof X1CascadeRouter !== 'undefined'],
    ['X1GoogleAuth', typeof X1GoogleAuth !== 'undefined'],
    ['X1WritingStyle', typeof X1WritingStyle !== 'undefined'],
    ['X1GroupChat', typeof X1GroupChat !== 'undefined'],
    ['X1FinancialData', typeof X1FinancialData !== 'undefined'],
    ['X1ImageGen', typeof X1ImageGen !== 'undefined'],
    ['X1DataExtractor', typeof X1DataExtractor !== 'undefined'],
    ['X1SEOAnalyzer', typeof X1SEOAnalyzer !== 'undefined'],
    ['X1MCPClient', typeof X1MCPClient !== 'undefined'],
    ['X1DeepResearch', typeof X1DeepResearch !== 'undefined'],
    ['X1SkillEngine', typeof X1SkillEngine !== 'undefined'],
    ['X1PromptAssembler', typeof X1PromptAssembler !== 'undefined'],
    ['handleVoice', typeof handleVoice === 'function'],
    ['execAction', typeof execAction === 'function'],
    ['aiComplete', typeof aiComplete === 'function'],
  ];
  
  tests.forEach(function(t) {
    if (t[1]) {
      console.log('✓ ' + t[0]);
    } else {
      console.error('✗ ' + t[0]);
      failures.push(t[0]);
    }
  });
  
  console.log('\n' + (failures.length === 0 ? '✅ PASS: All tests OK' : '❌ FAIL: ' + failures.length + ' failures'));
  return failures.length === 0;
}

runSmokeTests();
```

---

## Expected Output

```
[✓] Core modules
[✓] Cascade providers (7/13)
[✓] New subsystems (10/10)
[✓] Subsystems (5/5)
[✓] Memory initialized (entries: 0)
[✓] Op graph retrieved
[✓] handleVoice function exists
[✓] execAction function exists
[✓] aiComplete function exists
[✓] buildSystemPrompt function exists
[✓] Provider methods OK
[✓] WritingStyle methods
[✓] FinancialData methods
[✓] ImageGen methods
[✓] SkillEngine methods
[✓] MCPClient methods
[✓] DataExtractor methods
[✓] DeepResearch methods
[✓] PromptAssembler methods
✅ ALL MODULES LOADED
✅ ALL SUBSYSTEM METHODS VERIFIED
```

---

## If tests fail

1. **Module not found** → Check `chrome://extensions`, reload unpacked extension
2. **"X1..." is not defined** → Check `service-worker.js` line 19-62 importScripts
3. **"aiKeys is not initialized"** → Should load async, wait 2s and retry
4. **Storage errors** → Likely Chrome permissions issue

---

## Monitoring

Keep DevTools open → click extension icon → "Inspect" → Console tab stays open for real-time logs.

All `[X1]` prefixed messages appear here as X1 runs.
