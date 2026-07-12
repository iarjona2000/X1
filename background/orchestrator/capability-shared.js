// ─────────────────────────────────────────────────────────────────────────
// background/orchestrator/capability-shared.js
// Capa compartida para los 3 motores de automation:
//   - X1PluginEngine   (background/plugins/engine.js)
//   - X1SkillEngine    (background/skills/engine.js)
//   - X1AutomationEngine (background/automation/rule-engine.js)
//
// Por que existe: el audit detecto que los 3 motores resuelven los mismos
// problemas (parser de expresiones, templating de params, llamadas a
// aiComplete con firmas divergentes, limpieza de fences de markdown en
// respuestas del LLM) cada uno a su manera. Sin esta capa, cualquier
// trabajo futuro (cola de horas, prioridades, keepalive de automation)
// chocara contra 3 arquitecturas incompatibles. Esta capa es el
// CONTRATO unico.
//
// Que exporta (self.X1CapabilityShared):
//   safeCalc(expr)        — parser matematico seguro (antes en plugin only)
//   resolveParams(step,ctx) — templater {{var}} + {var} (antes skill only)
//   unifiedAiCall(prompt, opts) — wrapper consistente de aiComplete
//                                  (antes persona+prompt en plugin vs
//                                  system+prompt en skill)
//   normalizeStep(step)   — aliasa step.action → step.type (engines leen
//                            un solo campo canonico)
//   sanitizeAiResponse(text) — strip ```json / ``` fences antes de
//                               JSON.parse (antes en rule-engine only)
//   stepProgressSafe(t,a,d,s) — typeof-guard alrededor del global
//   KNOWN_STEP_TYPES      — array canonico para validateStepType()
//
// Carga: importScripts DESPUES de la cascade de IA (aiComplete global)
// y ANTES de plugins/engine.js + skills/engine.js. Si no esta cargado
// cuando un engine arranca, el engine lanza error explicito.
//
// Cumple ES5 strict (compat MV3 SW) — nada de arrow/let/const/classes.
// ─────────────────────────────────────────────────────────────────────────
(function (self) {
  'use strict';

  // ── Constantes ────────────────────────────────────────────────────────
  // Vocabulario canonico de tipos de step. Tanto engines validan contra
  // este array aunque internamente cada uno mantiene su propio campo
  // (plugin usa `type`, skill usa `action` — normalizeStep los unifica).
  var KNOWN_STEP_TYPES = [
    'search', 'synthesize', 'navigate', 'extract', 'write',
    'notify', 'calculate', 'webhook',
    'speak', 'wait', 'click', 'type', 'exec', 'ai'
  ];

  // Keys que NO deben templarse — son estructurales del step, no params
  // del usuario. Plugin usa `type`, Skill usa `action` — ambos excluidos.
  var STRUCTURAL_KEYS = {
    type: true, action: true, saveAs: true, optional: true,
    description: true, app: true, steps: true, trigger: true,
    persona: true, system: true
  };

  // ── safeCalc(expr) ───────────────────────────────────────────────────
  // Parser matematico seguro: solo acepta digitos, operadores + - * / (),
  // comas y letras a-z (para avg/sum/min/max). Elimina cualquier otro
  // caracter antes de evaluar. Sin eval() — algoritmo Shunting Yard
  // implementado a mano.
  // ANTES: solo background/plugins/engine.js lo tenia (L37-141).
  function safeCalc(expr) {
    var tokens = String(expr).replace(/[^0-9+\-*/.(),a-z ]/gi, '').trim();

    function applyOp(nums, ops) {
      var b = nums.pop();
      var a = nums.pop();
      var op = ops.pop();
      if (op === '+') nums.push(a + b);
      else if (op === '-') nums.push(a - b);
      else if (op === '*') nums.push(a * b);
      else if (op === '/') nums.push(b !== 0 ? a / b : 0);
    }

    function precedence(op) {
      if (op === '+' || op === '-') return 1;
      if (op === '*' || op === '/') return 2;
      return 0;
    }

    function parseNumbers(str) {
      var result = [];
      var parts = str.split(',');
      for (var i = 0; i < parts.length; i++) {
        var n = parseFloat(parts[i].trim());
        if (!isNaN(n)) result.push(n);
      }
      return result;
    }

    var avgMatch = tokens.match(/^avg\((.+)\)$/i);
    if (avgMatch) {
      var avgNums = parseNumbers(avgMatch[1]);
      if (avgNums.length === 0) return 0;
      var avgSum = 0;
      for (var ai = 0; ai < avgNums.length; ai++) avgSum += avgNums[ai];
      return avgSum / avgNums.length;
    }

    var sumMatch = tokens.match(/^sum\((.+)\)$/i);
    if (sumMatch) {
      var sumNums = parseNumbers(sumMatch[1]);
      var sumTotal = 0;
      for (var si = 0; si < sumNums.length; si++) sumTotal += sumNums[si];
      return sumTotal;
    }

    var minMatch = tokens.match(/^min\((.+)\)$/i);
    if (minMatch) {
      var minNums = parseNumbers(minMatch[1]);
      if (minNums.length === 0) return 0;
      var minVal = minNums[0];
      for (var mi = 1; mi < minNums.length; mi++) {
        if (minNums[mi] < minVal) minVal = minNums[mi];
      }
      return minVal;
    }

    var maxMatch = tokens.match(/^max\((.+)\)$/i);
    if (maxMatch) {
      var maxNums = parseNumbers(maxMatch[1]);
      if (maxNums.length === 0) return 0;
      var maxVal = maxNums[0];
      for (var xi = 1; xi < maxNums.length; xi++) {
        if (maxNums[xi] > maxVal) maxVal = maxNums[xi];
      }
      return maxVal;
    }

    var nums = [];
    var ops = [];
    var i = 0;
    while (i < tokens.length) {
      var ch = tokens[i];
      if (ch === ' ') { i++; continue; }
      if (ch === '(') { ops.push(ch); i++; continue; }
      if (ch === ')') {
        while (ops.length && ops[ops.length - 1] !== '(') applyOp(nums, ops);
        ops.pop();
        i++;
        continue;
      }
      if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
        if (ch === '-' && (i === 0 || tokens[i - 1] === '(' || tokens[i - 1] === '+' || tokens[i - 1] === '-' || tokens[i - 1] === '*' || tokens[i - 1] === '/')) {
          var neg = '-';
          i++;
          while (i < tokens.length && (tokens[i] >= '0' && tokens[i] <= '9' || tokens[i] === '.')) {
            neg += tokens[i];
            i++;
          }
          nums.push(parseFloat(neg));
          continue;
        }
        while (ops.length && ops[ops.length - 1] !== '(' && precedence(ops[ops.length - 1]) >= precedence(ch)) applyOp(nums, ops);
        ops.push(ch);
        i++;
        continue;
      }
      if ((ch >= '0' && ch <= '9') || ch === '.') {
        var numStr = '';
        while (i < tokens.length && ((tokens[i] >= '0' && tokens[i] <= '9') || tokens[i] === '.')) {
          numStr += tokens[i];
          i++;
        }
        nums.push(parseFloat(numStr));
        continue;
      }
      i++;
    }
    while (ops.length) applyOp(nums, ops);
    return nums.length ? nums[0] : 0;
  }

  // ── resolveParams(step, ctxParams) ───────────────────────────────────
  // Templater que acepta tanto {{var}} (skill style) como {var}
  // (plugin style). Ignora keys estructurales del step para que el user
  // pueda escribir `step.query` y no clash con `step.action`.
  // ANTES: solo background/skills/engine.js L172-187 lo tenia (sin `type`
  //        en STRUCTURAL_KEYS — bug fijo del L223 original).
  function resolveParams(step, ctxParams) {
    var resolved = {};
    if (!step) return resolved;
    var params = ctxParams || {};
    Object.keys(step).forEach(function (key) {
      if (STRUCTURAL_KEYS[key]) return;
      var val = step[key];
      if (typeof val === 'string') {
        // {{var}} — skill style
        val = val.replace(/\{\{(\w+)\}\}/g, function (m, name) {
          return params[name] !== undefined ? String(params[name]) : m;
        });
        // {var} — plugin style (synthesis / userMsg / extracted)
        val = val.replace(/\{(\w+)\}/g, function (m, name) {
          return params[name] !== undefined ? String(params[name]) : m;
        });
      }
      resolved[key] = val;
    });
    return resolved;
  }

  // ── unifiedAiCall(prompt, opts) ─────────────────────────────────────
  // Wrapper consistente de aiComplete. ANTES:
  //   plugin: aiComplete(persona + '\n\n' + prompt)
  //   skill:  aiComplete(system + '\n\n' + prompt)
  // Estos eran divergentes y facil de bug-ear en engines nuevos. Aqui
  // definimos una sola firma: opts.persona || opts.system como prefijo,
  // fallback a 'You are a helpful assistant.' si nada.
  function unifiedAiCall(prompt, opts) {
    if (typeof aiComplete !== 'function') return Promise.reject(new Error('AI_NOT_AVAILABLE'));
    var o = opts || {};
    var persona = o.persona || o.system || 'You are a helpful assistant.';
    return aiComplete(persona + '\n\n' + (prompt || ''));
  }

  // ── normalizeStep(step) ─────────────────────────────────────────────
  // Aliasa step.action → step.type (skill style → plugin style) sin
  // mutar el original. Despues de esto, AMBOS engines pueden leer
  // `step.type` y delegan al dispatcher unificado. `wait` pasa nativo
  // (antes solo skill lo soportaba — ahora plugins también).
  function normalizeStep(step) {
    if (!step) return step;
    var clone = {};
    Object.keys(step).forEach(function (k) { clone[k] = step[k]; });
    if (clone.type === undefined && clone.action !== undefined) {
      clone.type = clone.action;
    }
    return clone;
  }

  // ── sanitizeAiResponse(text) ────────────────────────────────────────
  // Strip ```json y ``` fences antes de JSON.parse. ANTES: solo
  // background/automation/rule-engine.js L168 lo hacia — bug-prone
  // porque plugin/skills nunca limpiaban y json.parse crasheaba.
  function sanitizeAiResponse(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  }

  // ── stepProgressSafe(tabId, app, desc, status) ──────────────────────
  // Wrapper con typeof-guard del stepProgress global. ANTES: skills
  // engine.js llamaba stepProgress(tabId,...) directo — si el global
  // no existia (caso x1-integration.js no cargado) crasheaba. Ahora
  // degrada a console.log y no rompe.
  function stepProgressSafe(tabId, app, desc, status) {
    try {
      if (typeof stepProgress === 'function' && tabId) {
        stepProgress(tabId, app || 'X1', desc || '', status || 'active');
      } else if (typeof console !== 'undefined') {
        console.log('[X1-CapShared] step:', app, status, desc);
      }
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('[X1-CapShared] stepProgress safe:', e.message);
    }
  }

  // ── API publica ───────────────────────────────────────────────────
  self.X1CapabilityShared = {
    safeCalc: safeCalc,
    resolveParams: resolveParams,
    unifiedAiCall: unifiedAiCall,
    normalizeStep: normalizeStep,
    sanitizeAiResponse: sanitizeAiResponse,
    stepProgressSafe: stepProgressSafe,
    KNOWN_STEP_TYPES: KNOWN_STEP_TYPES,
    STRUCTURAL_KEYS: STRUCTURAL_KEYS
  };

  console.log('[X1-CapabilityShared] loaded: 7 helpers + KNOWN_STEP_TYPES (n=' + KNOWN_STEP_TYPES.length + ')');
})(typeof self !== 'undefined' ? self : this);
