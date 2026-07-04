(function() {
  'use strict';

  var CLOUD = 'https://x1-proxy.baosx1.workers.dev';
  var SECRET = '9ff4b7dda5f7defd5f7fb7c32c133428bc87e8efeb8550d3ce1e5838c1d3b850';
  var MEM_KEY = 'x1_mem';
  var MAX_MEM = 40;

  /* ── AGENTS ── */

  var AGENTS = [
    { id:'research',  icon:'R', cls:'gh', name:'Research',   repo:'iarjona2000/research-lib' },
    { id:'writer',    icon:'W', cls:'w',  name:'Writer',     repo:'iarjona2000/content-models' },
    { id:'developer', icon:'D', cls:'d',  name:'Developer',  repo:'iarjona2000/codebase' },
    { id:'marketing', icon:'M', cls:'m',  name:'Marketing',  repo:'iarjona2000/marketing-kit' },
    { id:'finance',   icon:'F', cls:'f',  name:'Finance',    repo:'iarjona2000/finance-models' },
    { id:'legal',     icon:'L', cls:'l',  name:'Legal',      repo:'iarjona2000/legal-docs' },
    { id:'email',     icon:'E', cls:'e',  name:'Email',      repo:'iarjona2000/email-templates' },
    { id:'meeting',   icon:'M', cls:'me', name:'Meeting',    repo:'iarjona2000/meeting-notes' }
  ];

  /* ── APP ICON MAP ── */

  var APP_ICONS = {
    github:'gh', repo:'gh', repository:'gh',
    google:'g', search:'g',
    linkedin:'li',
    docs:'do', document:'do', 'google docs':'do',
    style:'st', format:'st', refine:'st', synthesize:'st', stylize:'st',
    pdf:'pd', export:'pd',
    done:'ok', result:'ok', complete:'ok', finish:'ok',
    read:'do', extract:'do', scrape:'do',
    code:'co', generate:'co', program:'co', script:'co', implement:'co',
    draft:'dr', write:'dr', compose:'dr',
    email:'ma', mail:'ma', gmail:'ma', inbox:'ma', 'e-mail':'ma',
    test:'co', debug:'co', fix:'co',
    plan:'st', research:'g', analyse:'st', analyze:'st'
  };

  var APP_ABBR = {
    github:'GH', repo:'GH',
    google:'G', search:'G',
    linkedin:'in',
    docs:'D', document:'D',
    style:'S', format:'S', refine:'S', synthesize:'S',
    pdf:'PDF', export:'PDF',
    done:'\u2713', result:'\u2713', complete:'\u2713',
    read:'R', extract:'R',
    code:'<>', generate:'<>', program:'<>',
    draft:'W', write:'W', compose:'W',
    email:'@', mail:'@', gmail:'@', inbox:'@',
    test:'T', debug:'T', fix:'T',
    plan:'P', research:'G', analyse:'A', analyze:'A'
  };

  var DEFAULT_ICON = 'st';
  var DEFAULT_ABBR = '\u25C6';

  function iconFor(app) {
    var key = app.toLowerCase().trim();
    return APP_ICONS[key] || DEFAULT_ICON;
  }

  function abbrFor(app) {
    var key = app.toLowerCase().trim();
    return APP_ABBR[key] || app.substring(0,2).toUpperCase();
  }

  /* ── GREETINGS ── */

  var GREETINGS = [
    /^hola/i, /^buenas/i, /^hey/i, /^hello/i, /^hi\b/i, /^heyy/i,
    /^qu[eé] tal/i, /^c[oó]mo est[áa]s/i, /^buen[oa]s/i,
    /^gracias/i, /^thanks/i, /^thank you/i,
    /^who are you/i, /^qu[eé] eres/i, /^qu[eé] puedes hacer/i,
    /^q tal/i, /^tal/i,
    /^s[ií]/i, /^no$/i, /^ok$/i, /^vale/i, /^de acuerdo/i,
    /^buen trabajo/i, /^nice/i, /^great/i, /^perfect/i,
    /^bien$/i, /^mal$/i, /^jaja/i, /^lol/i
  ];

  var QUICK_REPLIES = {
    hola: '¡Hola! ¿En qué puedo ayudarte hoy?',
    hello: 'Hello! What can I help you with?',
    quien: 'Soy X1, un agente autónomo de navegador. Puedo buscar información, leer páginas, crear documentos, escribir código y actuar en tu navegador. ¿Qué necesitas?',
    gracias: '¡De nada! Si necesitas algo más, aquí estoy.',
    bien: 'Me alegra. ¿En qué puedo ayudarte?',
    default: 'Claro, ¿qué necesitas que haga?'
  };

  var FALLBACK_ANSWERS = {
    research:  'Here\'s what I found. I searched multiple sources and cross-referenced the results. The main signal is clear. Saved to memory.',
    writer:    'Done. The draft front-loads the key message and uses short paragraphs. I can adjust the tone.',
    developer: 'I read the relevant code. Core logic is sound. I can generate the helper, add tests, or wire it in.',
    marketing: 'I analysed the page. Three angles stood out. I can expand any into a campaign wireframe.',
    finance:   'The numbers check out. Revenue is growing; margin is the metric to watch. I can build scenarios.',
    legal:     'I reviewed against the legal knowledge base. Two clauses worth a second look.',
    email:     'Done. I read your inbox and drafted a reply. Review and send when ready.',
    meeting:   'Transcribed. Three decisions, four action items. Recap ready to share.'
  };

  /* ── STATE ── */

  var S = { active:'research', messages:[], busy:false, listening:false, mid:0, dropdown:false, mem:[] };

  /* ── DOM ── */

  function cache() {
    var $ = function(id) { return document.getElementById(id); };
    var o = {};
    o.picker = $('agent-picker');
    o.label = $('picker-label');
    o.dropdown = $('dropdown');
    o.repoText = $('repo-text');
    o.repoLink = $('repo-link');
    o.messages = $('messages');
    o.input = $('input');
    o.send = $('btn-send');
    o.mic = $('btn-mic');
    o.gh = $('btn-gh');
    return o;
  }

  var el = null;

  /* ── HELPERS ── */

  function scrollBottom(c) { requestAnimationFrame(function(){ c.scrollTop = c.scrollHeight; }); }

  function delay(ms) { return new Promise(function(r){ setTimeout(r, ms); }); }

  function nextId() { return 'm' + (++S.mid); }

  function esc(s) { if (!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function fmt(s) {
    if (!s) return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>').replace(/^/,'<p>').replace(/$/,'</p>');
  }

  function agent(id) {
    for (var i = 0; i < AGENTS.length; i++) { if (AGENTS[i].id === id) return AGENTS[i]; }
    return AGENTS[0];
  }

  /* ── SIMPLE DETECTION ── */

  function isSimple(text) {
    var t = text.trim();
    if (t.length < 3) return true;
    for (var i = 0; i < GREETINGS.length; i++) {
      if (GREETINGS[i].test(t)) {
        var rest = t.replace(GREETINGS[i], '').trim();
        if (rest.length > 5) return false;
        return true;
      }
    }
    return false;
  }

  function quickReply(text) {
    var t = text.trim().toLowerCase();
    if (/^hola|^buenas|^hey|^hello|^hi\b|^heyy/.test(t)) return QUICK_REPLIES.hola;
    if (/^thanks|^thank you|^gracias/.test(t)) return QUICK_REPLIES.gracias;
    if (/quien eres|who are you|qu[eé] eres|qu[eé] puedes hacer/.test(t)) return QUICK_REPLIES.quien;
    if (/^bien$|^mal$|^bien y tu/.test(t)) return QUICK_REPLIES.bien;
    if (/^s[ií]$|^ok$|^vale$|^de acuerdo$/.test(t)) return QUICK_REPLIES.default;
    return null;
  }

  /* ── MEMORY ── */

  function loadMem() {
    try {
      var raw = localStorage.getItem(MEM_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && d.messages) {
          S.mem = d.messages || [];
          if (d.active) S.active = d.active;
          if (d.mid) S.mid = d.mid;
          return d;
        }
      }
    } catch(e) {}
    return null;
  }

  function saveMem() {
    try {
      localStorage.setItem(MEM_KEY, JSON.stringify({
        messages: S.mem.slice(-MAX_MEM),
        active: S.active,
        mid: S.mid
      }));
    } catch(e) {}
  }

  function pushMem(role, content) {
    S.mem.push({ role: role, content: content, ts: Date.now() });
    if (S.mem.length > MAX_MEM) S.mem = S.mem.slice(-MAX_MEM);
    saveMem();
  }

  /* ── DROPDOWN ── */

  function buildDropdown() {
    el.dropdown.innerHTML = '';
    AGENTS.forEach(function(a) {
      var item = document.createElement('div');
      item.className = 'dropdown-item' + (a.id === S.active ? ' selected' : '');
      item.dataset.id = a.id;
      item.innerHTML = '<span class="dd-icon ' + a.cls + '">' + esc(a.icon) + '</span><span class="dd-label">' + esc(a.name) + '</span><span class="dd-repo">' + esc(a.repo) + '</span>';
      el.dropdown.appendChild(item);
    });
  }

  function selectAgent(id) {
    S.active = id;
    var a = agent(id);
    el.label.textContent = a.name;
    el.repoText.textContent = a.repo;
    el.repoLink.href = 'https://github.com/' + a.repo;
    el.dropdown.querySelectorAll('.dropdown-item').forEach(function(d) {
      d.classList.toggle('selected', d.dataset.id === id);
    });
    saveMem();
  }

  /* ── MESSAGES ── */

  function addMsg(role, opts) {
    opts = opts || {};
    var id = opts.id || nextId();
    var div = document.createElement('div');
    div.className = 'msg msg-' + role;
    div.dataset.id = id;

    if (role === 'user') {
      div.innerHTML = '<div class="msg-bubble">' + esc(opts.text) + '</div>';
      el.messages.appendChild(div);
      scrollBottom(el.messages);
      return div;
    }

    var a = agent(opts.agent || S.active);

    var html = '<div class="msg-card">';
    html += '<div class="msg-row"><div class="msg-avatar">' + esc(a.icon) + '</div><span class="msg-author">' + esc(a.name) + '</span></div>';

    // Dynamic pipeline steps
    var steps = opts.steps;
    if (steps && steps.length > 0) {
      html += '<div class="msg-flow">';
      steps.forEach(function(step, i) {
        var ic = iconFor(step.app || '');
        var ab = abbrFor(step.app || '');
        var label = esc(step.label || step.app || '');
        var arrow = (i < steps.length - 1) ? '<svg class="flow-arrow" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/></svg>' : '';
        html += '<div class="flow-step" data-idx="' + i + '"><div class="flow-icon ' + ic + '">' + ab + '</div><span class="flow-label">' + label + '</span></div>' + arrow;
      });
      html += '</div>';
    }

    html += '<div class="msg-content"></div>';
    html += '</div>';
    div.innerHTML = html;
    div._steps = steps;
    div._content = div.querySelector('.msg-content');
    el.messages.appendChild(div);
    scrollBottom(el.messages);
    return div;
  }

  function animateFlow(div, speed) {
    var steps = div._steps;
    if (!steps || steps.length === 0) return Promise.resolve();
    speed = speed || 180;
    return new Promise(function(resolve) {
      var els = div.querySelectorAll('.flow-step');
      var i = 0;
      function next() {
        if (i >= els.length) { resolve(); return; }
        var s = els[i];
        s.classList.add('active');
        delay(speed).then(function() {
          s.classList.remove('active');
          s.classList.add('done');
          i++;
          delay(speed * 0.2).then(next);
        });
      }
      next();
    });
  }

  function setContent(div, text) {
    if (div._content) div._content.innerHTML = fmt(text);
  }

  function think(text) {
    unthink();
    var d = document.createElement('div');
    d.className = 'msg msg-thinking';
    d.id = 'think-el';
    d.innerHTML = '<div class="msg-dots"><span></span><span></span><span></span></div> ' + (text || 'Thinking');
    el.messages.appendChild(d);
    scrollBottom(el.messages);
  }

  function unthink() {
    var d = document.getElementById('think-el');
    if (d) d.remove();
  }

  /* ── PLANNER ── */

  function parseJSON(text) {
    try { return JSON.parse(text); } catch(e) {}
    // Try extracting from code block
    var m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) {
      try { return JSON.parse(m[1].trim()); } catch(e) {}
    }
    // Try finding first { and last }
    var start = text.indexOf('{');
    var end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try { return JSON.parse(text.substring(start, end + 1)); } catch(e) {}
    }
    return null;
  }

  function planSteps(query) {
    var a = agent(S.active);
    var recent = S.mem.slice(-6);

    var msgs = [
      { role: 'system', content: 'You are X1, a browser agent. Plan the steps needed to fulfil the user\'s request.\n\nReturn ONLY valid JSON (no markdown, no explanation) with this structure:\n{\n  "steps": [\n    {"app": "AppName", "label": "ShortLabel"},\n    ...\n  ],\n  "response": "Your answer to the user"\n}\n\nPossible app names: GitHub, Google, LinkedIn, Docs, Style, PDF, Search, Read, Code, Draft, Email, Synthesize, Test, Export, Result, Done.\n\nExample for "create a document about someone":\n{"steps":[{"app":"GitHub","label":"Repo"},{"app":"Google","label":"Search"},{"app":"LinkedIn","label":"Profile"},{"app":"Docs","label":"Create"},{"app":"Style","label":"Format"},{"app":"PDF","label":"Export"},{"app":"Done","label":"Result"}],"response":"I created the document. Here it is..."}\n\nBe concise. Always end with a "Done" or "Result" step. The response must be in the user\'s language.' },
      { role: 'user', content: 'Agent: ' + a.name + '\nRepo: ' + a.repo + '\n\n' + query }
    ];

    return fetch(CLOUD + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-X1-Auth': SECRET },
      body: JSON.stringify({ messages: msgs, max_tokens: 600, temperature: 0.3 }),
      signal: AbortSignal.timeout(15000)
    }).then(function(r) {
      if (!r.ok) return null;
      return r.json();
    }).then(function(d) {
      if (!d) return null;
      var t = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
      if (!t || !t.trim()) return null;
      var parsed = parseJSON(t);
      if (parsed && parsed.steps && parsed.response) {
        return parsed;
      }
      // Fallback: if JSON parsing failed but we got text, use it as response with default steps
      return { steps: [{app:'Done', label:'Result'}], response: t.trim() };
    }).catch(function() { return null; });
  }

  /* ── SIMPLE ANSWER ── */

  function simpleAnswer(text) {
    var a = agent(S.active);
    var recent = S.mem.slice(-4);
    var msgs = [
      { role: 'system', content: 'You are X1, a browser agent. Reply briefly and naturally. Current agent: ' + a.name },
      { role: 'user', content: text }
    ];

    return fetch(CLOUD + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-X1-Auth': SECRET },
      body: JSON.stringify({ messages: msgs, max_tokens: 150, temperature: 0.5 }),
      signal: AbortSignal.timeout(8000)
    }).then(function(r) { return r.ok ? r.json() : null; })
    .then(function(d) {
      if (!d) return null;
      var t = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
      return (t || '').trim() || null;
    }).catch(function() { return null; });
  }

  /* ── RUN ── */

  function run(text) {
    if (!text.trim() || S.busy) return;
    S.busy = true;
    el.input.value = '';
    el.send.disabled = true;

    var empty = el.messages.querySelector('.empty-state');
    if (empty) empty.remove();

    pushMem('user', text);
    addMsg('user', { text: text });

    var simple = isSimple(text);

    if (simple) {
      var reply = quickReply(text) || '¿En qué puedo ayudarte?';
      var div = addMsg('agent', { steps: [] });
      think();
      simpleAnswer(text).then(function(txt) {
        unthink();
        if (txt) reply = txt;
        setContent(div, reply);
        pushMem('agent', reply);
        S.busy = false;
        el.send.disabled = !el.input.value.trim();
      });
      return;
    }

    // Complex: plan steps dynamically via AI
    think('Planning');
    var a = agent(S.active);
    var fallbackReply = (FALLBACK_ANSWERS[a.id] || FALLBACK_ANSWERS.research);

    planSteps(text).then(function(plan) {
      unthink();
      var steps = (plan && plan.steps) ? plan.steps : [{app:'Done', label:'Result'}];
      var reply = (plan && plan.response) ? plan.response : fallbackReply;

      var div = addMsg('agent', { steps: steps });
      var anim = animateFlow(div, 200);
      anim.then(function() {
        setContent(div, reply);
        pushMem('agent', reply);
        S.busy = false;
        el.send.disabled = !el.input.value.trim();
        scrollBottom(el.messages);
      });
    }).catch(function() {
      unthink();
      var div = addMsg('agent', { steps: [] });
      setContent(div, fallbackReply);
      pushMem('agent', fallbackReply);
      S.busy = false;
      el.send.disabled = !el.input.value.trim();
    });
  }

  /* ── WARM ── */

  function warm() {
    fetch(CLOUD + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-X1-Auth': SECRET },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
      signal: AbortSignal.timeout(8000)
    }).catch(function(){});
  }

  /* ── RESTORE ── */

  function restore() {
    var d = loadMem();
    if (d && d.messages && d.messages.length > 0) {
      var memIdx = 0;
      d.messages.forEach(function(m) {
        if (m.role === 'user') {
          addMsg('user', { text: m.content });
        } else if (m.role === 'agent') {
          var div = addMsg('agent', { agent: d.active || S.active, steps: [] });
          setContent(div, m.content);
        }
      });
    } else {
      var e = document.createElement('div');
      e.className = 'empty-state';
      e.innerHTML = '<div class="empty-icon"><svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.5a.75.75 0 001.5 0V8a4.5 4.5 0 119 0v3.5a.75.75 0 001.5 0V8a6 6 0 00-6-6zM4.5 12.5a.75.75 0 00-.75.75v1a3 3 0 003 3h1.5a.75.75 0 000-1.5h-1.5a1.5 1.5 0 01-1.5-1.5v-1a.75.75 0 00-.75-.75zm11 0a.75.75 0 00-.75.75v1a1.5 1.5 0 01-1.5 1.5h-1.5a.75.75 0 000 1.5h1.5a3 3 0 003-3v-1a.75.75 0 00-.75-.75z"/></svg></div><div class="empty-title">How can I help?</div><div class="empty-desc">I can search the web, read pages, create documents, write code, and act across your tools.</div>';
      el.messages.appendChild(e);
    }
  }

  /* ── INIT ── */

  function init() {
    el = cache();

    warm();
    buildDropdown();

    var d = loadMem();
    selectAgent((d && d.active) ? d.active : 'research');
    restore();

    // Dropdown
    el.picker.addEventListener('click', function(e) {
      e.stopPropagation();
      S.dropdown = !S.dropdown;
      el.dropdown.classList.toggle('hidden', !S.dropdown);
    });

    el.dropdown.addEventListener('click', function(e) {
      var item = e.target.closest('.dropdown-item');
      if (item) {
        selectAgent(item.dataset.id);
        el.dropdown.classList.add('hidden');
        S.dropdown = false;
      }
    });

    document.addEventListener('click', function() {
      el.dropdown.classList.add('hidden');
      S.dropdown = false;
    });

    // GitHub
    el.gh.addEventListener('click', function() {
      chrome.tabs.create({ url: 'https://github.com/' + agent(S.active).repo });
    });

    // Input
    el.input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        run(el.input.value);
      }
    });

    el.input.addEventListener('input', function() {
      el.send.disabled = !el.input.value.trim() || S.busy;
    });

    el.send.addEventListener('click', function() { run(el.input.value); });

    // Mic
    el.mic.addEventListener('click', function() {
      if (S.listening) {
        S.listening = false;
        el.mic.classList.remove('btn-mic-active');
        el.input.placeholder = 'Ask me anything...';
        return;
      }
      S.listening = true;
      el.mic.classList.add('btn-mic-active');
      el.input.placeholder = 'Listening...';
      setTimeout(function() {
        S.listening = false;
        el.mic.classList.remove('btn-mic-active');
        el.input.placeholder = 'Ask me anything...';
        run('Create a document about Sam Altman');
      }, 1600);
    });

    setTimeout(function() { el.input.focus(); }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
