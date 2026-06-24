console.log('[X1] SW starting...');

// ═══════════════════════════════════════════
// CONVERSATION MEMORY
// ═══════════════════════════════════════════

var memory = [], MAX_MEM = 20;
function addMem(role, content) {
  // Never store invalid/image error text in memory
  if(typeof content==='string'&&!isValidContent(content)) return;
  if(typeof content==='string'&&content.length>3) memory.push({role: role, content: content});
  if (memory.length > MAX_MEM) memory = memory.slice(-MAX_MEM);
  try { chrome.storage.session.set({x1Memory: memory}); } catch(e) {}
}
try {
  chrome.storage.session.get('x1Memory', function(r) {
    if (r && r.x1Memory) { memory = r.x1Memory; console.log('[X1] Memory restored:', memory.length); }
  });
} catch(e) {}

// ═══════════════════════════════════════════
// NAVIGATION MAP
// ═══════════════════════════════════════════

var NAV = {
  gmail:'https://mail.google.com', correo:'https://mail.google.com', mail:'https://mail.google.com',
  calendar:'https://calendar.google.com', calendario:'https://calendar.google.com',
  docs:'https://docs.google.com', documentos:'https://docs.google.com',
  sheets:'https://docs.google.com/spreadsheets', hojas:'https://docs.google.com/spreadsheets', excel:'https://docs.google.com/spreadsheets',
  drive:'https://drive.google.com', youtube:'https://www.youtube.com', yt:'https://www.youtube.com',
  meet:'https://meet.google.com', maps:'https://www.google.com/maps', mapas:'https://www.google.com/maps',
  twitter:'https://twitter.com', xcom:'https://twitter.com', linkedin:'https://www.linkedin.com',
  github:'https://github.com', whatsapp:'https://web.whatsapp.com',
  instagram:'https://www.instagram.com', insta:'https://www.instagram.com',
  spotify:'https://open.spotify.com', notion:'https://www.notion.so', figma:'https://www.figma.com',
  chatgpt:'https://chatgpt.com', claude:'https://claude.ai', amazon:'https://www.amazon.es',
  reddit:'https://www.reddit.com', tiktok:'https://www.tiktok.com', twitch:'https://www.twitch.tv',
  netflix:'https://www.netflix.com', facebook:'https://www.facebook.com', slack:'https://slack.com',
  trello:'https://trello.com', canva:'https://www.canva.com', zoom:'https://zoom.us',
  perplexity:'https://www.perplexity.ai', deepseek:'https://chat.deepseek.com'
};

// ═══════════════════════════════════════════
// MONTH / DAY NAME PARSING
// ═══════════════════════════════════════════

var MONTHS = {enero:0,febrero:1,marzo:2,abril:3,mayo:4,junio:5,julio:6,agosto:7,septiembre:8,octubre:9,noviembre:10,diciembre:11,
  ene:0,feb:1,mar:2,abr:3,jun:5,jul:6,ago:7,sep:8,sept:8,oct:9,nov:10,dic:11};
var DAYS = {'lunes':1,'martes':2,'miercoles':3,'jueves':4,'viernes':5,'sabado':6,'domingo':7,
  'lun':1,'mar':2,'mie':3,'jue':4,'vie':5,'sab':6,'dom':7};

function parseDate(str) {
  str = str.toLowerCase().trim();
  var now = new Date();
  var d = now.getDate(), m = now.getMonth(), y = now.getFullYear();
  // "hoy", "ahora"
  if (/^hoy|ahora|hoy\s+mismo/i.test(str)) return {date:fmtDate(now)};
  // "mañana"
  if (/^ma['ñ']ana/i.test(str)) { var t = new Date(now); t.setDate(t.getDate()+1); return {date:fmtDate(t)}; }
  // "pasado mañana"
  if (/^pasado\s+ma['ñ']ana/i.test(str)) { var t = new Date(now); t.setDate(t.getDate()+2); return {date:fmtDate(t)}; }
  // "el lunes", "el martes que viene"
  var dayMatch = str.match(/(lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado|domingo)(?:\s+que\s+viene)?/i);
  if (dayMatch) {
    var targetDay = DAYS[dayMatch[1].toLowerCase().replace('é','e').replace('á','a')];
    var currentDay = now.getDay() || 7;
    var diff = targetDay - currentDay;
    if (diff <= 0) diff += 7;
    var t = new Date(now); t.setDate(t.getDate() + diff);
    return {date:fmtDate(t)};
  }
  // "15 de enero", "15 enero", "15/1"
  var dateMatch = str.match(/(\d{1,2})\s*(?:\/|de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|jun|jul|ago|sep|oct|nov|dic|\d{1,2})/i);
  if (dateMatch) {
    var day = parseInt(dateMatch[1]);
    var month = MONTHS[dateMatch[2].toLowerCase()];
    if (month === undefined) month = parseInt(dateMatch[2]) - 1;
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) return {date:fmtDate2(day, month, y)};
  }
  // "próximo/a X" (e.g., "próximo viernes")
  var prox = str.match(/pr[oó]xim[oa]\s+(lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado|domingo)/i);
  if (prox) {
    var target = DAYS[prox[1].toLowerCase().replace('é','e').replace('á','a')];
    var cur = now.getDay() || 7;
    var diff2 = target - cur;
    if (diff2 <= 0) diff2 += 7;
    if (diff2 === 0) diff2 = 7;
    var t2 = new Date(now); t2.setDate(t2.getDate() + diff2);
    return {date:fmtDate(t2)};
  }
  return {date:fmtDate(now)};
}

function parseTime(str) {
  var m = str.match(/(\d{1,2}):(\d{2})\s*(?:h|horas?)?/i) || str.match(/(\d{1,2})\s*(?:h|horas?)\s*(\d{2})?/i) || str.match(/a\s*(?:las?\s+)?(\d{1,2})(?::(\d{2}))?\s*(?:de\s+la\s+)?(ma['ñ']ana|tarde|noche)?/i);
  if (m) {
    var h = parseInt(m[1]), min = m[2] ? parseInt(m[2]) : 0;
    if (m[3] && (m[3].toLowerCase().includes('tarde') || m[3].toLowerCase().includes('noche'))) { if (h < 12) h += 12; }
    if (m[3] && m[3].toLowerCase().includes('mañana')) { if (h >= 12) h -= 12; }
    return h + ':' + (min < 10 ? '0' : '') + min;
  }
  return null;
}

function fmtDate(d) { return d.getFullYear() + '-' + ((d.getMonth()+1)<10?'0':'') + (d.getMonth()+1) + '-' + (d.getDate()<10?'0':'') + d.getDate(); }
function fmtDate2(d, m, y) { return y + '-' + ((m+1)<10?'0':'') + (m+1) + '-' + (d<10?'0':'') + d; }

// ═══════════════════════════════════════════
// MAIN COMMAND PARSER
// ═══════════════════════════════════════════

function parseCommand(cmd) {
  var l = cmd.toLowerCase().trim();

  // ══ ONLY handle commands that are 100% unambiguous via regex ══
  // Everything else goes to AI for proper interpretation

  // ── API KEY CONFIG (must be regex — contains the key itself) ──
  var mApiKey = l.match(/(?:configura|config|api\s*key|clave)\s+(grok|groq|openai|gemini|anthropic|opencode)\s+(\S+)/i);
  if (mApiKey) {
    var provider = mApiKey[1].toLowerCase();
    var apikey = mApiKey[2];
    var storageKey = provider + 'Key';
    var obj = {}; obj[storageKey] = apikey;
    chrome.storage.local.set(obj);
    aiKeys[storageKey] = apikey;
    return {action:'speak', text: provider.charAt(0).toUpperCase()+provider.slice(1)+' configurado.'};
  }

  // ── CHANGE AI PROVIDER ──
  var mUseAI = l.match(/^(?:usa|utiliza|cambia\s*a)\s+(grok|groq|openai|gemini|opencode|ollama|auto)$/i);
  if (mUseAI) {
    var prov = mUseAI[1].toLowerCase();
    chrome.storage.local.set({aiProvider: prov});
    aiKeys.aiProvider = prov;
    return {action:'speak', text:'Ahora uso '+prov+'.'};
  }

  // ── CHECK CURRENT AI PROVIDER ──
  if (/^(?:qu[eé]\s+)?(?:ia|ai|inteligencia)\s+(?:usas|tienes|est[aá]s\s+usando)$/i.test(l)) {
    var provName = aiKeys.aiProvider || 'auto';
    return {action:'speak', text:'Actualmente uso ' + provName + '. Puedes cambiarme con: usa groq/grok/openai/opencode/gemini/ollama.'};
  }

  // ── GOOGLE AUTH ──
  if (/^(?:conecta|conectar)\s*(?:con\s*)?google$/i.test(l)) return {action:'loginGoogle'};
  if (/^(?:desconecta|desconectar)\s*(?:de\s*)?google$/i.test(l)) return {action:'logoutGoogle'};

  // ── DOCUMENT CREATION (BEFORE navigation to avoid "pon" conflict) ──
  // "pon X en un documento/doc/nota"
  var mPonDoc = l.match(/^pon\s+(.+?)\s+en\s+(?:un\s+)?(?:documento|doc|nota|archivo)$/i);
  if (mPonDoc) return {action:'newDoc', title:'', content:mPonDoc[1].trim()};
  // "crea un documento [con/sobre/de] X"
  var mCrearDoc = l.match(/^(?:crea|haz|abre)\s+un\s+(?:documento|doc|nota)\s+(?:con|sobre|de|llamado|titulado)\s+(.+)$/i);
  if (mCrearDoc) return {action:'newDoc', title:mCrearDoc[1].trim().substring(0,50), content:mCrearDoc[1].trim()};
  // "crea un documento/doc" (empty)
  if (/^(?:crea|abre)\s+un\s+(?:documento|doc|nota)$/i.test(l)) return {action:'newDoc'};
  // "crea una hoja/spreadsheet/excel" / "crea una presentación/slide"
  if (/^(?:crea|abre)\s+un[oa]\s+(?:hoja|spreadsheet|excel|sheet)$/i.test(l)) return {action:'newSheet'};
  if (/^(?:crea|abre)\s+un[oa]\s+(?:presentaci[oó]n|slide|slides)$/i.test(l)) return {action:'newSlide'};

  // ── NAVIGATION ──
  var mNav = l.match(/^(?:abre|ve\s+a|ll[eé]vame\s+a|entra\s+en|pon)\s+(.+)$/i);
  if (mNav) {
    var dest = mNav[1].trim().replace(/\.$/, '');
    // Skip "en un documento" from "pon" that already matched above
    if (/^en\s+(?:un\s+)?(?:documento|doc)/i.test(dest)) { /* already handled */ } else {
      var navKey = dest.replace(/\s+/g, '').toLowerCase();
      if (NAV[navKey]) return {action:'navigate', url:NAV[navKey], speech:'Abriendo ' + dest};
      if (/^https?:\/\//.test(dest) || /^[\w-]+\.\w{2,}/.test(dest)) return {action:'navigate', url:dest.startsWith('http')?dest:'https://'+dest, speech:'Abriendo ' + dest};
    }
  }

  // ── EXPLICIT SEARCH ──
  var mSearch = l.match(/^(?:busca|buscar|googlea)\s+(.+)$/i);
  if (mSearch) return {action:'search', query:mSearch[1].trim()};

  // ── TAB MANAGEMENT ──
  if (/^(?:organiza|ordena|limpia|agrupa)\s+(?:las\s+)?(?:pesta[ñn]as|tabs)$/i.test(l)) return {action:'tabGroupByDomain'};
  if (/^(?:agrupa)\s+(?:las\s+)?(?:pesta[ñn]as|tabs)\s+(?:en\s+un\s+)?(?:grupo\s+)?(?:llamado\s+)?["""]?(.+?)["""]?$/i.test(l)) {
    var mGrp = l.match(/(?:llamado|llamada)\s+["""]?(.+?)["""]?$/i);
    return {action:'tabGroup', name: mGrp ? mGrp[1].trim() : 'Grupo'};
  }
  var mCloseTabs = l.match(/^cierra\s+(?:las\s+)?pesta[ñn]as\s+(?:de|con)\s+(.+)$/i);
  if (mCloseTabs) return {action:'closeTabs', query:mCloseTabs[1].trim()};
  if (/^nueva\s+pesta[ñn]a\s+(?:con|de|para)\s+(.+)$/i.test(l)) {
    var mNewTab = l.match(/^nueva\s+pesta[ñn]a\s+(?:con|de|para)\s+(.+)$/i);
    return {action:'newTab', url:'https://www.google.com/search?q='+encodeURIComponent(mNewTab[1].trim())};
  }

  // ── SIMPLE UI ACTIONS ──
  if (/^(?:baja|scroll\s*down|desplaza\s+abajo)$/i.test(l)) return {action:'scroll', direction:'down'};
  if (/^(?:sube|scroll\s*up|desplaza\s+arriba)$/i.test(l)) return {action:'scroll', direction:'up'};
  if (/^(?:vuelve\s+)?atr[aá]s$/i.test(l)) return {action:'back'};
  if (/^cierra\s+(?:esta\s+)?(?:pesta[ñn]a|tab)$/i.test(l)) return {action:'closeTab'};
  if (/^nueva\s+pesta[ñn]a$/i.test(l)) return {action:'newTab'};

  // ── READ PAGE ──
  if (/^(?:lee|leer|qu[eé]\s+hay|qu[eé]\s+dice|resume)\s+(?:la\s+)?(?:p[aá]gina|web|pantalla|esto|documento)?$/i.test(l)) return {action:'readPage'};

  // ── CLICK ──
  var mClick = l.match(/^(?:haz\s+)?(?:clic|click|pulsa|toca|presiona|pincha)\s+(?:en\s+|sobre\s+)?(.+)$/i);
  if (mClick && mClick[1].length > 1 && mClick[1].length < 80) return {action:'click', text:mClick[1].trim()};

  // ── TYPE IN DOC ──
  var mType = l.match(/^escribe\s+(.+?)(?:\s+en\s+(?:la\s+)?(?:p[aá]gina|campo|documento))?$/i);
  if (mType && mType[1].length > 3) return {action:'typeInDoc', text:mType[1].trim()};

  // ── KEY PRESS ──
  var mKey = l.match(/^(?:pulsa|presiona|teclea)\s+(.+)$/i);
  if (mKey) {
    var keyMap = {enter:'Enter',escape:'Escape',esc:'Escape',tab:'Tab',espacio:' ',borrar:'Backspace',supr:'Delete',delete:'Delete',flechaizquierda:'ArrowLeft',flechaizquierdo:'ArrowLeft',flechaderecha:'ArrowRight',flechaderecho:'ArrowRight',flechaarriba:'ArrowUp',flechaabajo:'ArrowDown',home:'Home',end:'End',intro:'Enter',retorno:'Enter'};
    var mapped = keyMap[mKey[1].toLowerCase().replace(/[^a-z]/g,'')];
    if (mapped) return {action:'pressKey', key:mapped};
  }

  // Everything else → return null → goes to AI
  return null;
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function getActiveTab() {
  return new Promise(function(resolve) {
    chrome.tabs.query({active:true, currentWindow:true}, function(tabs) {
      resolve(tabs && tabs[0] ? tabs[0] : null);
    });
  });
}

function execFn(tabId, fn, args) {
  return chrome.scripting.executeScript({
    target:{tabId:tabId}, world:'MAIN',
    func:fn, args:args||[]
  }).then(function(r) {
    if(!r||!r[0]) return null;
    if(r[0].error) throw new Error(r[0].error.message||String(r[0].error));
    return r[0].result;
  }).catch(function(e){
    if(e.message&&e.message.includes('host_permissions')) throw new Error('La extensión no tiene permiso en esta web. Añade el dominio a host_permissions en manifest.json.');
    throw e;
  });
}

// ═══════════════════════════════════════════
// SW KEEPALIVE (prevents MV3 from killing SW during long tasks)
// ═══════════════════════════════════════════

var keepaliveTimer = null;

function startKeepalive() {
  if (keepaliveTimer) return;
  console.log('[X1] Starting keepalive');
  keepaliveTimer = setInterval(function() {
    // Chrome API calls reset the SW inactivity timer
    chrome.storage.local.get('keepalive', function() {});
    // Also fetch a lightweight endpoint to keep network alive
    if (PROXY_URL) {
      fetch(PROXY_URL + '/health', {signal:AbortSignal.timeout(3000)}).catch(function(){});
    }
  }, 15000); // Every 15s
}

function stopKeepalive() {
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer);
    keepaliveTimer = null;
    console.log('[X1] Stopped keepalive');
  }
}

// ═══════════════════════════════════════════
// UNIFIED PAGE READER (used by agent loop & actions)
// ═══════════════════════════════════════════

function readPage(tabId) {
  return execFn(tabId, function() {
    try{
      var items=[], seen={}, els=[];
      // Collect EVERY clickable/interactive element with its text
      var sel='button,a[href],[role="button"],[role="menuitem"],[role="tab"],[role="link"],[role="option"],input:not([type=hidden]),textarea,[contenteditable],[onclick],select';
      document.querySelectorAll(sel).forEach(function(el,i){
        if(i>60||!el.offsetParent)return;
        try{
          var text=(el.textContent||'').trim().substring(0,80);
          var aria=el.getAttribute('aria-label')||'';
          var title=el.getAttribute('title')||'';
          var ph=el.getAttribute('placeholder')||'';
          var val=el.getAttribute('value')||'';
          var label = text||aria||title||ph||val;
          if(!label)return;
          var key = label.substring(0,30);
          if(seen[key])return;seen[key]=true;
          // Tag type prefix for context
          var tag = el.tagName.toLowerCase();
          if(tag==='a' && el.getAttribute('href')) tag='link';
          if(tag==='input') tag='input:'+(el.getAttribute('type')||'text');
          items.push('['+tag+'] '+label.substring(0,60));
          // Also build structured els for other uses
          els.push({
            tag:el.tagName.toLowerCase(),
            text:text,
            placeholder:el.getAttribute('placeholder')||'',
            ariaLabel:el.getAttribute('aria-label')||'',
            id:el.id||'', type:el.getAttribute('type')||'',
            name:el.getAttribute('name')||'', href:el.getAttribute('href')||''
          });
        }catch(e){}
      });
      // Collect headings and visible labels
      document.querySelectorAll('h1,h2,h3,h4,h5,h6,strong,b,label,span:not([contenteditable])').forEach(function(el){
        try{
          if(!el.offsetParent)return;
          var t=(el.textContent||'').trim().substring(0,60);
          if(t&&!seen[t.substring(0,30)]){seen[t.substring(0,30)]=true;items.push('[heading] '+t);}
        }catch(e){}
      });
      // Collect visible body text for context
      var bodyText = (document.body.innerText||'').trim().substring(0,1200);
      // Scroll info
      var scrollInfo = {
        height: document.body.scrollHeight,
        visible: window.innerHeight + window.scrollY,
        atBottom: (window.innerHeight + window.scrollY) >= document.body.scrollHeight - 80
      };
      // Favicon
      var favicon = '';
      var iconLink = document.querySelector('link[rel*="icon"]');
      if(iconLink) favicon = iconLink.href;
      else favicon = window.location.origin + '/favicon.ico';
      return {
        items:items, title:document.title,
        url:window.location.href,
        body:bodyText,
        els:els,
        favicon:favicon,
        scrollInfo:scrollInfo
      };
    }catch(e){return{items:[],title:'',url:'',body:'',els:[],favicon:'',scrollInfo:{atBottom:true}};}
  });
}

// ═══════════════════════════════════════════
// GOOGLE AUTH
// ═══════════════════════════════════════════

function loginGoogle() {
  return new Promise(function(resolve, reject) {
    chrome.identity.getAuthToken({interactive:true}, function(token) {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!token) return reject(new Error('No se obtuvo token'));
      chrome.storage.local.set({google_token:token});
      fetch('https://www.googleapis.com/oauth2/v2/userinfo', {headers:{Authorization:'Bearer '+token}})
        .then(function(r){return r.json();})
        .then(function(info){
          chrome.storage.local.set({google_user:{email:info.email,name:info.name,picture:info.picture}});
          resolve(info);
        }).catch(reject);
    });
  });
}

function isLoggedIn() {
  return new Promise(function(resolve) {
    chrome.storage.local.get('google_user', function(r) {
      resolve(!!(r && r.google_user && r.google_user.email));
    });
  });
}

function logoutGoogle() {
  return new Promise(function(resolve, reject) {
    chrome.storage.local.get('google_token', function(r) {
      if (r && r.google_token) fetch('https://accounts.google.com/o/oauth2/revoke?token='+r.google_token).catch(function(){});
      chrome.identity.clearAllCachedAuthTokens(function() {
        chrome.storage.local.remove(['google_token','google_user'], function() { resolve(); });
      });
    });
  });
}

function getGoogleToken() {
  return new Promise(function(resolve, reject) {
    chrome.identity.getAuthToken({interactive:false}, function(token) {
      if (chrome.runtime.lastError || !token) {
        return reject(new Error('No autenticado. Di "conecta Google".'));
      }
      resolve(token);
    });
  });
}

function googleApi(url, method, body) {
  return getGoogleToken().then(function(token) {
    if(!token) return {error:{message:'No hay token de Google. Di "conecta Google" primero.'}};
    return fetch(url, {
      method:method||'GET',
      headers:{Authorization:'Bearer '+token, 'Content-Type':'application/json'},
      body:body?JSON.stringify(body):undefined
    }).then(function(r){
      if(r.status === 401 || r.status === 403) return {error:{message:'Token expirado. Di "conecta Google" para renovar.'}};
      if(r.status === 204) return {ok:true}; // DELETE returns 204
      return r.json();
    });
  }).catch(function(e){
    console.error('[X1] Google API error:', e.message);
    return {error:{message:'Google no conectado. Di "conecta Google".'}};
  });
}

// ═══════════════════════════════════════════
// MULTI-AI ENGINE (Proxy → Groq → OpenCode → Ollama)
// ═══════════════════════════════════════════

var PROXY_URL = 'https://x1-proxy.calezamindset.workers.dev';

var aiKeys = {};
function loadAIKeys() {
  return new Promise(function(resolve) {
    chrome.storage.local.get(['groqKey','opencodeKey','aiProvider'], function(r) {
      aiKeys = r || {};
      // Auto: proxy first, then cascade
      if (!aiKeys.aiProvider || aiKeys.aiProvider === 'groq' || aiKeys.aiProvider === 'opencode') {
        aiKeys.aiProvider = 'auto';
        chrome.storage.local.set({aiProvider: 'auto'});
      }
      resolve(aiKeys);
    });
  });
}
loadAIKeys();

var googleUser = null;
function loadGoogleUser() {
  chrome.storage.local.get('google_user', function(r) {
    if (r && r.google_user) {
      googleUser = r.google_user;
      console.log('[X1] Cached Google user:', googleUser.email);
    } else {
      googleUser = null;
    }
  });
}
loadGoogleUser();

chrome.storage.onChanged.addListener(function(changes) {
  if (changes.groqKey || changes.opencodeKey || changes.aiProvider) loadAIKeys();
  if (changes.google_user) loadGoogleUser();
});

var SYSTEM_PROMPT_COMPACT = true;
var SYSTEM_PROMPT = [
'X1 asistente voz Chrome. Hoy:{DATE}. Español. Email usuario:{USER_EMAIL}',
'Responde SOLO JSON valido. Sin markdown ni texto extra.',
'',
'ACCIONES (responde con una de estas):',
'navigate: {"action":"navigate","url":"https://..."}',
'search: {"action":"search","query":"..."} SOLO si piden buscar explicitamente',
'newTab/closeTab/closeTabs/back/scroll/newWindow',
'click: {"action":"click","text":"texto del boton"}',
'pressKey: {"action":"pressKey","key":"Enter|Escape|Tab|..."}',
'typeInDoc: {"action":"typeInDoc","text":"texto COMPLETO largo"} para escribir en docs/inputs',
'readPage/readSelection: leer contenido pagina',
'',
'PESTANAS: tabGroup,tabGroupByDomain,tabGroupProject,tabWorkspace,tabCleanup',
'',
'ESCRITURA: dictate,dictateAndInsert,rewrite(+tone),expandText,summarize,correctText,continueWriting,changeLanguage',
'',
'GMAIL: gmailSend(to,subject,body),gmailDraft,gmailDraftReply,gmailRead(query),gmailSearch,gmailSummarize(count,groupBy),gmailTriage(action,messageIds),gmailLabel(operation:list/add/remove,messageId,label)',
'',
'CALENDAR: calendarCreate(summary,date YYYY-MM-DD,time HH:MM,duration,description,attendees),calendarList(date),calendarWeek,calendarCheckAvailability,calendarSuggestTime,calendarUpdate(eventId,...),calendarDelete(eventId),calendarDecline(eventId)',
'',
'DOCS: newDoc(content completo),newSheet(title),newSlide,sheetsCreate,sheetsRead,sheetsAppend,sheetsUpdate',
'',
'AGENTE WEB: agentTask(goal,url) para Canva/Replit/Notion/cualquier web,agentFillForm,agentExtractData,agentAnalyzePage,agentScreenshot,tomar captura pantalla,agentScrollAndCapture(leer todo scroll)',
'',
'MEMORIA: remember(entity,type,properties,relations),queryGraph,setKnowledge,getKnowledge,setPriority,getPriorities,remind(text,when),listReminders,createSnippet,insertSnippet',
'',
'AUTOMATIZACION: createAutomation(trigger,schedule,steps,name),listAutomations,toggleAutomation,deleteAutomation,createSkill,runSkill',
'',
'CODIGO: code,codeWithGoal(goal,language),generateCode,explainCode,debugCode,reviewCode',
'',
'SISTEMA: speak(text),ask(question,options),notify(title,message),showText,wait(ms),done,steps([acciones]),loginGoogle,logoutGoogle,checkGoogle,research(topic)',
'',
'REGLAS CRITICAS:',
'1. NUNCA digas \"no puedo leer imagenes\" ni \"cannot read image\" ni hables de limitaciones de vision. Solo responde con acciones.',
'2. typeInDoc/newDoc/gmailSend: genera TU el contenido completo (200+ palabras si tema complejo)',
'3. Fechas: calcula reales. manana=YYYY-MM-DD del dia siguiente',
'4. Preguntas simples (que es X?): usa speak. NO busques en Google',
'5. NUNCA uses search salvo que digan busca/googlea explicitamente',
'6. Multi-tarea: usa steps:[accion1,accion2,...]',
'7. Si Google no conectado: speak pidiendo conecta Google',
'',
'EJEMPLOS:',
'"escribe sobre Banco Sabadell" -> {"action":"typeInDoc","text":"El Banco Sabadell es una entidad financiera espanola fundada en 1881 en Sabadell, Barcelona...(500+ palabras)"}',
'"agenda reunion manana a las 3" -> {"action":"calendarCreate","summary":"Reunion","date":"(YYYY-MM-DD manana)","time":"15:00","duration":60}',
'"organiza mis pestanas" -> {"action":"tabGroupByDomain"}',
'"que es la IA?" -> {"action":"speak","text":"La inteligencia artificial es..."}',
'"preparame el dia" -> {"action":"steps","steps":[{"action":"gmailSummarize","count":5},{"action":"calendarList","date":"(hoy)"},{"action":"speak","text":"Buenos dias..."}]}',
'"manda email a ana@test.com" -> {"action":"gmailSend","to":"ana@test.com","subject":"Asunto","body":"Hola Ana..."}',
'"crea logo en Canva" -> {"action":"agentTask","goal":"crear logo profesional","url":"https://www.canva.com"}',
'',
'{GRAPH}',
'{MANUAL}',
'{MEMORY}',
].join('\n');

// ── Knowledge stores (cached in memory, persisted to chrome.storage.local) ──
var opGraph = {entities:[]};
var knowledgeManual = {entries:[]};
var userPriorities = [];
var reminders = [];
var x1Automations = [];
var x1Snippets = [];
var x1Skills = [];

function loadKnowledge() {
  chrome.storage.local.get(['x1_graph','x1_manual','x1_priorities','x1_reminders','x1_automations','x1_snippets','x1_skills'], function(r) {
    if(r.x1_graph) try{opGraph=JSON.parse(r.x1_graph);}catch(e){}
    if(r.x1_manual) try{knowledgeManual=JSON.parse(r.x1_manual);}catch(e){}
    if(r.x1_priorities) try{userPriorities=JSON.parse(r.x1_priorities);}catch(e){}
    if(r.x1_reminders) try{reminders=JSON.parse(r.x1_reminders);}catch(e){}
    if(r.x1_automations) try{x1Automations=JSON.parse(r.x1_automations);}catch(e){}
    if(r.x1_snippets) try{x1Snippets=JSON.parse(r.x1_snippets);}catch(e){}
    if(r.x1_skills) try{x1Skills=JSON.parse(r.x1_skills);}catch(e){}
    console.log('[X1] Knowledge loaded: graph='+opGraph.entities.length+' manual='+knowledgeManual.entries.length+' automations='+x1Automations.length);
  });
}
loadKnowledge();

function saveGraph(){chrome.storage.local.set({x1_graph:JSON.stringify(opGraph)});}
function saveManual(){chrome.storage.local.set({x1_manual:JSON.stringify(knowledgeManual)});}
function savePriorities(){chrome.storage.local.set({x1_priorities:JSON.stringify(userPriorities)});}
function saveReminders(){chrome.storage.local.set({x1_reminders:JSON.stringify(reminders)});}
function saveAutomations(){chrome.storage.local.set({x1_automations:JSON.stringify(x1Automations)});}
function saveSnippets(){chrome.storage.local.set({x1_snippets:JSON.stringify(x1Snippets)});}
function saveSkills(){chrome.storage.local.set({x1_skills:JSON.stringify(x1Skills)});}

function buildSystemPrompt() {
  var now = new Date();
  var date = now.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) +
    ' ' + now.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
  // Filter memory: exclude any entries with image-related error text
  var cleanMem = memory.filter(function(m){return isValidContent(m.content);});
  var mem = cleanMem.slice(-8).map(function(m){return m.role+': '+m.content;}).join('\n');

  var graph = '(vacío)';
  var ents = opGraph.entities||[];
  if(ents.length) graph = ents.map(function(e){
    return e.type+': '+e.name+(e.properties?' ('+JSON.stringify(e.properties)+')':'')+(e.relations?' → '+e.relations.map(function(r){return r.target+' ['+r.type+']';}).join(', '):'');
  }).join('\n');

  var manual = '(vacío)';
  var entries = knowledgeManual.entries||[];
  if(entries.length) manual = entries.map(function(e){return e.topic+': '+e.content;}).join('\n');

  var userEmail = (googleUser && googleUser.email) ? googleUser.email : 'marc.calero@iese.net';
  var prompt = SYSTEM_PROMPT.replace('{DATE}', date).replace('{MEMORY}', mem || '(ninguna)');
  prompt = prompt.replace('{GRAPH}', graph).replace('{MANUAL}', manual);
  prompt = prompt.replace('{USER_EMAIL}', userEmail);
  return prompt;
}

// ── Grok / xAI (Elon Musk's AI) ──
function isValidContent(txt) {
  if(!txt) return false;
  // Only reject actual image-reading error patterns — be very targeted
  if(txt.match(/cannot\s+read\s+(image|file|png|jpg|jpeg|gif|webp)/i)) return false;
  if(txt.match(/does\s+not\s+support\s+(image|vision)/i)) return false;
  if(txt.match(/this\s+model\s+does\s+not\s+support/i)) return false;
  // Don't reject short texts — they can be valid actions
  return true;
}

// ── Groq (free, ultra-fast ~0.3s) ──
function groqComplete(userMsg) {
  var key = aiKeys.groqKey;
  if (!key) return Promise.resolve(null);
  return fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body:JSON.stringify({
      model:'llama-3.3-70b-versatile',
      messages:[{role:'system',content:buildSystemPrompt()},{role:'user',content:userMsg}],
      temperature:0.1, max_tokens:1000
    }),
    signal:AbortSignal.timeout(20000)
  }).then(function(r){return r.json();}).then(function(data){
    if(data.error) { console.error('[X1] Groq error:', data.error); return null; }
    var txt = (data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content||'').trim();
    if(!isValidContent(txt)) return null;
    return txt;
  }).catch(function(e){ console.error('[X1] Groq fail:', e.message); return null; });
}

// ── X1 Proxy (Cloudflare Worker — primary when deployed) ──
var proxyLastFail = 0;
function proxyComplete(userMsg) {
  if (!PROXY_URL) return Promise.resolve(null);
  // Skip proxy if it failed in the last 30s (cache failure)
  if (Date.now() - proxyLastFail < 30000) { console.log('[X1] Proxy skipped (cached failure)'); return Promise.resolve(null); }
  console.log('[X1] Calling proxy...');
  return fetch(PROXY_URL + '/v1/chat/completions', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      messages:[{role:'system',content:buildSystemPrompt()},{role:'user',content:userMsg}]
    }),
    signal:AbortSignal.timeout(25000)
  }).then(function(r){return r.json();}).then(function(data){
    if(data.error) { console.error('[X1] Proxy error:', data.error); proxyLastFail = Date.now(); return null; }
    proxyLastFail = 0; // Reset on success
    var txt = (data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content||'').trim();
    if(!isValidContent(txt)) { proxyLastFail = Date.now(); return null; }
    console.log('[X1] Proxy response:', txt.substring(0,200));
    return txt;
  }).catch(function(e){ console.error('[X1] Proxy fail:', e.message); proxyLastFail = Date.now(); return null; });
}

// ── OpenCode Zen (OpenAI-compatible, free models: big-pickle, deepseek-v4-flash-free) ──
function opencodeComplete(userMsg) {
  var key = aiKeys.opencodeKey;
  if (!key) return Promise.resolve(null);
  return fetch('https://opencode.ai/zen/v1/chat/completions', {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body:JSON.stringify({
      model:'big-pickle',
      messages:[{role:'system',content:buildSystemPrompt()},{role:'user',content:userMsg}],
      temperature:0.1, max_tokens:1000
    }),
    signal:AbortSignal.timeout(20000)
  }).then(function(r){return r.json();}).then(function(data){
    if(data.error) { console.error('[X1] OpenCode error:', data.error); return null; }
    var txt = (data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content||'').trim();
    if(!isValidContent(txt)) return null;
    return txt;
  }).catch(function(e){ console.error('[X1] OpenCode fail:', e.message); return null; });
}

// ── Ollama (local fallback) ──
var ollamaModels = null;

function checkOllama() {
  if (ollamaModels !== null) return Promise.resolve(ollamaModels.length > 0);
  return fetch('http://localhost:11434/api/tags', {signal:AbortSignal.timeout(2000)})
    .then(function(r){return r.json();})
    .then(function(data){
      var names = (data&&data.models||[]).map(function(m){return m.name;});
      ollamaModels = names;
      return names.length>0;
    }).catch(function(){ollamaModels=[];return false;});
}

function ollamaComplete(userMsg) {
  return checkOllama().then(function(has){
    if(!has) return null;
    var model = ollamaModels[0];
    // Sanitize messages: strip data:image references that confuse text-only models
    var sys = buildSystemPrompt().replace(/data:image\/[a-z]+;base64,[^\s]+/gi,'').replace(/!\[.*?\]\(.*?\)/g,'');
    var usr = (userMsg||'').replace(/data:image\/[a-z]+;base64,[^\s]+/gi,'').replace(/!\[.*?\]\(.*?\)/g,'');
    return fetch('http://localhost:11434/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:model, messages:[
        {role:'system',content:sys},
        {role:'user',content:usr}
      ], stream:false, options:{temperature:0.1}}),
      signal:AbortSignal.timeout(20000)
    }).then(function(r){return r.json();}).then(function(data){
      if(data&&data.error) return null;
      var txt = (data&&data.message&&data.message.content||'').trim();
      if(!isValidContent(txt)) return null;
      return txt;
    }).catch(function(){return null;});
  });
}

// ── Universal AI dispatcher (always cascades on failure) ──
function aiComplete(userMsg) {
  function parseJSON(txt) {
    if(!txt) return null;
    txt = txt.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
    // Try to find a JSON object
    var m = txt.match(/\{[\s\S]*\}/);
    if(m){
      try{return JSON.parse(m[0]);}catch(e){
        try{var fixed=m[0].replace(/,\s*}/g,'}').replace(/,\s*]/g,']').replace(/'/g,'"');return JSON.parse(fixed);}catch(e2){}
      }
    }
    // Array of actions (steps shorthand)
    var ma = txt.match(/\[[\s\S]*\]/);
    if(ma){try{return{steps:JSON.parse(ma[0])};}catch(e){}}
    // Non-JSON → speak it
    if(txt.length > 3) return {action:'speak',text:txt};
    return null;
  }

  function getChain() {
    var all = [
      {name:'proxy', fn:proxyComplete, has:true},
      {name:'groq', fn:groqComplete, has:!!aiKeys.groqKey},
      {name:'opencode', fn:opencodeComplete, has:!!aiKeys.opencodeKey},
      {name:'ollama', fn:ollamaComplete, has:true}
    ];
    var pref = aiKeys.aiProvider || 'auto';
    if (pref !== 'auto') {
      var first = all.filter(function(p){return p.name===pref;});
      var rest = all.filter(function(p){return p.name!==pref;});
      return first.concat(rest);
    }
    return all;
  }

  function ensureKeysLoaded() {
    // Skip storage fetch if keys are already populated (cached)
    if (aiKeys && (aiKeys.groqKey || aiKeys.opencodeKey)) return Promise.resolve(aiKeys);
    return loadAIKeys();
  }

  return ensureKeysLoaded().then(function() {
    var chain = getChain().filter(function(p){return p.has;});
    console.log('[X1] AI chain:', chain.map(function(p){return p.name;}).join(' > '));

    function tryNext(i) {
      if (i >= chain.length) return Promise.resolve(null);
      var p = chain[i];
      console.log('[X1] Trying:', p.name);
      return p.fn(userMsg).then(function(txt) {
        if (!txt) {
          console.warn('[X1] Provider ' + p.name + ' returned empty/null response');
          return tryNext(i + 1);
        }
        var result = parseJSON(txt);
        if (result) {
          console.log('[X1] OK via', p.name);
          return result;
        } else {
          console.warn('[X1] Provider ' + p.name + ' returned non-JSON/invalid output:', txt);
          return tryNext(i + 1);
        }
      }).catch(function(e) {
        console.error('[X1]', p.name, 'failed:', e.message || e);
        return tryNext(i + 1);
      });
    }
    return tryNext(0);
  });
}

// ═══════════════════════════════════════════
// TEXT INPUT ENGINE (works across Google Docs, editors, textareas, etc.)
// ═══════════════════════════════════════════

function typeTextInPage(tabId, text) {
  // Check if this is a Google Docs page — if so, use Docs API instead of DOM manipulation
  return new Promise(function(resolve) {
    chrome.tabs.get(tabId, function(tab) {
      var url = tab && tab.url || '';
      var docMatch = url.match(/docs\.google\.com\/document\/d\/([^/]+)/);
      if(docMatch) {
        // Google Docs detected — use API to append text (most reliable method)
        var docId = docMatch[1];
        googleApi('https://docs.googleapis.com/v1/documents/' + docId).then(function(doc) {
          if(doc.error) throw new Error(doc.error.message);
          var endIndex = doc.body.content[doc.body.content.length - 1].endIndex - 1;
          return googleApi('https://docs.googleapis.com/v1/documents/' + docId + ':batchUpdate', 'POST', {
            requests: [{insertText: {location: {index: Math.max(1, endIndex)}, text: text}}]
          });
        }).then(function() {
          resolve('typed');
        }).catch(function(e) {
          console.log('[X1] Docs API failed, trying DOM:', e.message);
          typeDOMFallback(tabId, text).then(resolve);
        });
      } else {
        // Not Google Docs — use DOM strategies
        typeDOMFallback(tabId, text).then(resolve);
      }
    });
  });
}

function typeDOMFallback(tabId, text) {
  return execFn(tabId, function(txt) {
    // ── STRATEGY 1: Google Docs iframe (fallback if API failed) ──
    var iframe = document.querySelector('.docs-texteventtarget-iframe');
    if(iframe) {
      try {
        var innerDoc = iframe.contentDocument;
        if(innerDoc) {
          var target = innerDoc.querySelector('[contenteditable="true"]') || innerDoc.body;
          if(target) {
            target.focus();
            // Try execCommand first
            var ok = document.execCommand('insertText', false, txt);
            if(!ok) {
              // Try InputEvent approach
              var paragraphs = txt.split('\n');
              for(var pi=0; pi<paragraphs.length; pi++) {
                if(pi > 0) {
                  target.dispatchEvent(new InputEvent('beforeinput', {inputType:'insertParagraph', bubbles:true, cancelable:true, composed:true}));
                }
                if(paragraphs[pi]) {
                  target.dispatchEvent(new InputEvent('beforeinput', {inputType:'insertText', data:paragraphs[pi], bubbles:true, cancelable:true, composed:true}));
                }
              }
            }
            return 'typed';
          }
        }
      } catch(e) { /* fall through */ }
    }

    // ── STRATEGY 2: Monaco Editor (VS Code web, Replit, CodeSandbox) ──
    var monaco = document.querySelector('.monaco-editor textarea.inputarea, .monaco-editor .inputarea');
    if(monaco) {
      monaco.focus();
      monaco.value = txt;
      monaco.dispatchEvent(new Event('input', {bubbles:true}));
      return 'typed';
    }

    // ── STRATEGY 3: CodeMirror (v5 and v6) ──
    var cm = document.querySelector('.CodeMirror');
    if(cm && cm.CodeMirror) { cm.CodeMirror.replaceSelection(txt); return 'typed'; }
    var cm6 = document.querySelector('.cm-editor .cm-content');
    if(cm6) { cm6.focus(); document.execCommand('insertText', false, txt); return 'typed'; }

    // ── STRATEGY 4: Ace Editor ──
    var ace = document.querySelector('.ace_editor');
    if(ace && ace.env && ace.env.editor) { ace.env.editor.insert(txt); return 'typed'; }

    // ── STRATEGY 5: contenteditable (Notion, Slack, WhatsApp Web) ──
    var ce = document.querySelector('[contenteditable="true"]:not([aria-hidden="true"])');
    if(ce) {
      ce.focus();
      var ok5 = document.execCommand('insertText', false, txt);
      if(!ok5) { ce.textContent += txt; ce.dispatchEvent(new Event('input', {bubbles:true})); }
      return 'typed';
    }

    // ── STRATEGY 6: textarea / input ──
    var ta = document.querySelector('textarea:not([readonly]),input[type="text"]:not([readonly]),input:not([type]):not([readonly])');
    if(ta) {
      ta.focus(); ta.click();
      var ok6 = document.execCommand('insertText', false, txt);
      if(!ok6) {
        var pos = ta.selectionStart || ta.value.length;
        ta.value = ta.value.substring(0, pos) + txt + ta.value.substring(ta.selectionEnd || pos);
        ta.selectionStart = ta.selectionEnd = pos + txt.length;
      }
      ta.dispatchEvent(new Event('input', {bubbles:true}));
      return 'typed';
    }

    // ── STRATEGY 7: active element last resort ──
    var el = document.activeElement;
    if(el && el !== document.body) {
      if(el.value !== undefined) { el.value += txt; el.dispatchEvent(new Event('input',{bubbles:true})); return 'typed'; }
      if(document.execCommand('insertText', false, txt)) return 'typed';
    }
    return 'failed';
  }, [text]);
}

// Write content into a NEW Google Doc using Docs API (most reliable)
function writeNewDocWithAPI(title, content) {
  return googleApi('https://docs.googleapis.com/v1/documents', 'POST', {title: title || 'Documento X1'})
    .then(function(doc) {
      if(!doc || doc.error || !doc.documentId) {
        return {error: true, msg: doc && doc.error ? doc.error.message : 'No se pudo crear el documento'};
      }
      var docId = doc.documentId;
      // Insert content via Docs API batchUpdate
      return googleApi('https://docs.googleapis.com/v1/documents/' + docId + ':batchUpdate', 'POST', {
        requests: [{insertText: {location: {index: 1}, text: content}}]
      }).then(function() {
        return {error: false, url: 'https://docs.google.com/document/d/' + docId + '/edit', docId: docId};
      });
    }).catch(function(e) {
      return {error: true, msg: e.message};
    });
}

// ═══════════════════════════════════════════
// ACTION EXECUTOR
// ═══════════════════════════════════════════

function execAction(act, tabId) {
  return new Promise(function(resolve, reject) {
    try {
    switch (act.action) {
      case 'navigate':
        chrome.tabs.update(tabId, {url:act.url}, function() { resolve({text:act.speech||'Listo.'}); });
        break;
      case 'search':
        chrome.tabs.update(tabId, {url:'https://www.google.com/search?q='+encodeURIComponent(act.query||'')}, function() { resolve({text:act.speech||'Buscando.'}); });
        break;
      case 'newDoc':
        if(act.content) {
          stepCounter[tabId] = 0;
          var ndIdx = stepProgress(tabId, 'Google Docs', 'Creando documento'+(act.title?' "'+act.title.substring(0,25)+'"':''));
          writeNewDocWithAPI(act.title || '', act.content).then(function(result) {
            if(result.error) {
              stepError(tabId, ndIdx);
              chrome.tabs.update(tabId, {url:'https://docs.google.com/document/create'}, function() {
                var attempts = 0;
                function tryType() {
                  attempts++;
                  if(attempts > 10) { resolve({text:'Documento creado pero no pude escribir. Conecta Google.'}); return; }
                  typeTextInPage(tabId, act.content).then(function(r){
                    if(r === 'typed') resolve({text:'Documento creado con contenido.'});
                    else setTimeout(tryType, 2500);
                  }).catch(function(){ setTimeout(tryType, 2500); });
                }
                setTimeout(tryType, 5000);
              });
            } else {
              stepDone(tabId, ndIdx);
              chrome.tabs.update(tabId, {url:result.url}, function() { resolve({text:'Documento creado con contenido.'}); });
            }
          });
        } else {
          chrome.tabs.update(tabId, {url:'https://docs.google.com/document/create'}, function() { resolve({text:'Documento creado.'}); });
        }
        break;
      case 'newSheet':
        chrome.tabs.update(tabId, {url:'https://docs.google.com/spreadsheets/create'}, function() { resolve({text:'Hoja creada.'}); });
        break;
      case 'newSlide':
        chrome.tabs.update(tabId, {url:'https://docs.google.com/presentation/create'}, function() { resolve({text:'Presentación creada.'}); });
        break;
      case 'newTab':
        chrome.tabs.create({url:act.url||undefined}, function() { resolve({text:act.speech||'Nueva pestaña.'}); });
        break;
      case 'closeTab':
        chrome.tabs.remove(tabId, function() { resolve({text:act.speech||'Cerrada.'}); });
        break;
      case 'back':
        chrome.tabs.goBack(tabId, function() { resolve({text:act.speech||'Atrás.'}); });
        break;
      case 'scroll':
        execFn(tabId, function(dir){window.scrollBy(0,dir==='up'?-500:500);}, [act.direction||'down']).then(function(){resolve({text:act.speech||'Scroll.'});});
        break;
      case 'readPage':
        execFn(tabId, function(){return{title:document.title,url:location.href,text:(document.body.innerText||'').substring(0,3000)};})
          .then(function(d){resolve({text:'Página leída.',pageData:d});});
        break;
      case 'click':
        execFn(tabId, function(txt) {
          var els=document.querySelectorAll('a,button,[role="button"],input[type="submit"],[onclick],.clickable,[tabindex]');
          for(var i=0;i<els.length;i++){
            if((els[i].textContent||'').toLowerCase().includes(txt.toLowerCase())||
               (els[i].getAttribute('aria-label')||'').toLowerCase().includes(txt.toLowerCase())||
               (els[i].getAttribute('title')||'').toLowerCase().includes(txt.toLowerCase())||
               (els[i].getAttribute('placeholder')||'').toLowerCase().includes(txt.toLowerCase())){
              els[i].click();return'ok';
            }
          }
          return'not found';
        }, [act.text||'']).then(function(r){resolve({text:r==='ok'?'Clic hecho.':'No encontré "'+act.text+'" en la página.'});});
        break;
      case 'pressKey':
        execFn(tabId, function(k){document.activeElement?.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));}, [act.key])
          .then(function(){resolve({text:'Tecla pulsada.'});});
        break;
      case 'typeInDoc': case 'dictate': case 'dictateAndInsert':
        typeTextInPage(tabId, act.text||'').then(function(r){
          resolve({text:r==='failed'?'No se pudo escribir. Prueba a hacer clic en el documento primero.':'Escrito.'});
        }).catch(function(e){resolve({text:'Error al escribir: '+e.message, showText:true});});
        break;
      case 'speak':
        resolve({text:act.text||''});
        break;
      case 'rewrite': case 'expandText': case 'correctText': case 'continueWriting': case 'changeLanguage': case 'summarize':
        if(act.text) {
          typeTextInPage(tabId, act.text).then(function(r){
            resolve({text: r==='failed' ? act.text : 'Texto insertado.', showText: r==='failed'});
          }).catch(function(){ resolve({text:act.text, showText:true}); });
        } else {
          resolve({text:'Acción completada.'});
        }
        break;
      case 'loginGoogle':
        loginGoogle().then(function(){resolve({text:'Google conectado correctamente. Ya puedes usar Gmail, Calendar y Sheets.'});})
          .catch(function(e){resolve({text:'Error: '+e.message, showText:true});});
        break;
      case 'logoutGoogle':
        logoutGoogle().then(function(){resolve({text:'Google desconectado.'});})
          .catch(function(e){resolve({text:'Error: '+e.message, showText:true});});
        break;
      case 'checkGoogle':
        isLoggedIn().then(function(c){resolve({text:c?'Google está conectado.':'No conectado. Di "conecta Google".'});});
        break;
      case 'gmailSend': {
        if(!act.to) return resolve({text:'Necesito una dirección de correo. ¿A quién envío?'});
        stepCounter[tabId] = 0;
        var gsIdx = stepProgress(tabId, 'Gmail', 'Enviando email a '+act.to.substring(0,25));
        function b64EncodeUnicode(str) {
          return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
            return String.fromCharCode(parseInt(p1, 16));
          }));
        }
        var subjectEncoded = '=?utf-8?B?' + b64EncodeUnicode(act.subject||'Sin asunto') + '?=';
        var rawEmail = 'Content-Type: text/plain; charset=utf-8\r\nTo: '+act.to+'\r\nSubject: '+subjectEncoded+'\r\n\r\n'+(act.body||'');
        var rawB64 = b64EncodeUnicode(rawEmail).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
        googleApi('https://gmail.googleapis.com/gmail/v1/users/me/messages/send','POST',{raw:rawB64})
          .then(function(r){ if(r.id){stepDone(tabId,gsIdx);} else {stepError(tabId,gsIdx);} resolve({text:r.id?'Correo enviado a '+act.to+'.':('Error al enviar: '+(r.error?.message||'revisa que Google esté conectado')), showText:!!r.error});})
          .catch(function(e){stepError(tabId,gsIdx);resolve({text:'Error: '+e.message+'. Prueba a decir "conecta Google" primero.', showText:true});});
        break;
      }
      case 'gmailDraft': {
        if(!act.to) return resolve({text:'Necesito una dirección de correo.'});
        function b64EncodeUnicode(str) {
          return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
            return String.fromCharCode(parseInt(p1, 16));
          }));
        }
        var subjectEncoded = '=?utf-8?B?' + b64EncodeUnicode(act.subject||'Borrador') + '?=';
        var draftRaw = 'Content-Type: text/plain; charset=utf-8\r\nTo: '+act.to+'\r\nSubject: '+subjectEncoded+'\r\n\r\n'+(act.body||'');
        var rawB64 = b64EncodeUnicode(draftRaw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
        googleApi('https://gmail.googleapis.com/gmail/v1/users/me/drafts','POST',{message:{raw:rawB64}})
          .then(function(r){resolve({text:r.id?'Borrador creado para '+act.to+'.':'Error: '+JSON.stringify(r),showText:!r.id});})
          .catch(function(e){resolve({text:'Error: '+e.message+'. ¿Google está conectado?', showText:true});});
        break;
      }
      case 'gmailRead':
        googleApi('https://gmail.googleapis.com/gmail/v1/users/me/messages?q='+encodeURIComponent(act.query||'')+'&maxResults=5').then(function(r){
          if(r.error) return resolve({text:'Error leyendo correos: '+(r.error.message||'conecta Google.'), showText:true});
          if(!r.messages||!r.messages.length) return resolve({text:'No hay correos'+(act.query?' sobre "'+act.query+'"':'')+'.'});
          Promise.all(r.messages.map(function(m){return googleApi('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+m.id,'GET');}))
            .then(function(msgs){
              var lines = msgs.filter(function(m){return m.payload;}).map(function(m){
                var h=m.payload.headers,sub='',from=''; h.forEach(function(x){if(x.name==='Subject')sub=x.value;if(x.name==='From')from=x.value;});
                return '• '+from+': "'+sub+'" — '+(m.snippet||'').substring(0,100);
              });
              resolve({text:'Tienes '+msgs.length+' correo'+(msgs.length>1?'s':'')+':\n'+lines.join('\n')});
            });
        }).catch(function(e){resolve({text:'Error Gmail: '+e.message+'. Di "conecta Google".', showText:true});});
        break;
      case 'gmailDraftReply':
        googleApi('https://gmail.googleapis.com/gmail/v1/users/me/messages?q='+encodeURIComponent(act.messageId||'')).then(function(r){
          if(!r.messages||!r.messages.length) return resolve({text:'No encontré el mensaje.'});
          googleApi('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+r.messages[0].id).then(function(msg){
            var h=msg.payload.headers,sub='',from='',to='';
            h.forEach(function(x){if(x.name==='Subject')sub=x.value;if(x.name==='From')from=x.value;if(x.name==='To')to=x.value;});
            var replyBody=(act.context||'')+'\n\n---\n'+msg.snippet;
            function b64EncodeUnicode(str) {
              return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
                return String.fromCharCode(parseInt(p1, 16));
              }));
            }
            var raw='To: '+from+'\r\nSubject: Re: '+sub+'\r\n\r\n'+replyBody;
            var rawB64 = b64EncodeUnicode(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
            googleApi('https://gmail.googleapis.com/gmail/v1/users/me/drafts','POST',{message:{raw:rawB64}})
              .then(function(d){resolve({text:'Borrador de respuesta a "'+sub+'" creado.'});});
          });
        });
        break;
      case 'gmailSearch':
        googleApi('https://gmail.googleapis.com/gmail/v1/users/me/messages?q='+encodeURIComponent(act.query||'')+'&maxResults=10').then(function(r){
          if(!r.messages||!r.messages.length) return resolve({text:'Sin resultados para "'+act.query+'".'});
          Promise.all(r.messages.map(function(m){return googleApi('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+m.id);}))
            .then(function(msgs){
              var lines=msgs.map(function(m){var h=m.payload.headers,sub='',from='';h.forEach(function(x){if(x.name==='Subject')sub=x.value;if(x.name==='From')from=x.value;});return '• '+from+': "'+sub+'" — '+m.snippet.substring(0,120);});
              resolve({text:msgs.length+' resultados para "'+act.query+'":\n'+lines.join('\n'), showText:true});
            });
        });
        break;
      case 'calendarCreate':
        (function(){
          stepCounter[tabId] = 0;
          var ccIdx = stepProgress(tabId, 'Google Calendar', 'Creando evento: '+(act.summary||'Evento').substring(0,30));
          var calDate = act.date || fmtDate(new Date());
          if (calDate && !/^\d{4}-\d{2}-\d{2}$/.test(calDate)) calDate = parseDate(calDate).date;
          var calTime = act.time || '10:00';
          if (calTime && !/^\d{1,2}:\d{2}$/.test(calTime)) { var pt = parseTime(calTime); if(pt) calTime = pt; else calTime = '10:00'; }
          var startISO = calDate+'T'+calTime+':00';
          var endH = parseInt(calTime.split(':')[0]) + Math.floor((parseInt(calTime.split(':')[1])+(act.duration||60))/60);
          var endM = (parseInt(calTime.split(':')[1])+(act.duration||60))%60;
          var endISO = calDate+'T'+(endH<10?'0':'')+endH+':'+(endM<10?'0':'')+endM+':00';
          var evBody = {summary:act.summary||'Evento',description:act.description||'',start:{dateTime:startISO, timeZone:'Europe/Madrid'},end:{dateTime:endISO, timeZone:'Europe/Madrid'}};
          if(act.attendees && Array.isArray(act.attendees)) evBody.attendees = act.attendees.map(function(e){return{email:e};});
          googleApi('https://www.googleapis.com/calendar/v3/calendars/primary/events','POST',evBody)
            .then(function(r){
              if(r.error){stepError(tabId,ccIdx);resolve({text:'Error al crear evento: '+(r.error.message||'Conecta Google primero.'), showText:true});}
              else{stepDone(tabId,ccIdx);resolve({text:'Evento "'+evBody.summary+'" creado para el '+calDate+' a las '+calTime+'.'});}
            }).catch(function(e){stepError(tabId,ccIdx);resolve({text:'Error: '+e.message+'. Di "conecta Google".', showText:true});});
        })();
        break;
      case 'calendarList':
        var listDate = act.date || fmtDate(new Date());
        if (!/^\d{4}-\d{2}-\d{2}$/.test(listDate)) listDate = parseDate(listDate).date;
        var dayStart = listDate+'T00:00:00Z';
        var dayEnd = listDate+'T23:59:59Z';
        googleApi('https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin='+dayStart+'&timeMax='+dayEnd+'&orderBy=startTime&singleEvents=true')
          .then(function(r){
            if(r.error) return resolve({text:'Error leyendo calendario: '+(r.error.message||'conecta Google.'), showText:true});
            var items=(r.items||[]).map(function(e){return '• '+e.summary+' '+((e.start?.dateTime||e.start?.date||'').replace('T',' a las ').substring(0,16));});
            resolve({text:items.length?'Eventos del '+listDate+':\n'+items.join('\n'):'No hay eventos el '+listDate+'.'});
          }).catch(function(e){resolve({text:'Error Calendar: '+e.message+'. Di "conecta Google".', showText:true});});
        break;
      case 'tabGroup':
        (function(){
          chrome.tabs.query({currentWindow:true}, function(tabs){
            if(tabs.length<2) return resolve({text:'Solo hay una pestaña.'});
            var ids = tabs.map(function(t){return t.id;});
            chrome.tabs.group({tabIds:ids}, function(groupId){
              chrome.tabGroups.update(groupId,{title:act.name||'Grupo'},function(){resolve({text:ids.length+' pestañas agrupadas como "'+act.name+'".'});});
            });
          });
        })();
        break;
      case 'codeWithGoal': case 'generateCode': case 'explainCode': case 'debugCode': case 'reviewCode': case 'code':
        (function(){
          var codeDesc = act.description || act.goal || act.code || act.language || 'programa simple';
          var lang = act.language || 'python';
          stepCounter[tabId] = 0;
          var s1 = stepProgress(tabId, 'AI', 'Generando código: ' + codeDesc.substring(0,40));
          var codePrompt = 'Escribe código en '+lang+' para: '+codeDesc+'. Responde SOLO el código, sin explicaciones ni markdown ni backticks. Código limpio y funcional.';
          aiComplete(codePrompt).then(function(codeResult){
            stepDone(tabId, s1);
            if(!codeResult || !codeResult.text) { resolve({text:'No pude generar el código.', showText:true}); return; }
            var code = codeResult.text.replace(/^```[\w]*\n?/,'').replace(/\n?```$/,'').trim();
            var s2 = stepProgress(tabId, 'Google Docs', 'Creando documento con el código');
            writeNewDocWithAPI('Código: '+codeDesc.substring(0,50), code).then(function(docResult){
              if(docResult && !docResult.error) {
                stepDone(tabId, s2);
                chrome.tabs.update(tabId, {url:docResult.url}, function(){
                  resolve({text:'Código creado en Google Docs.'});
                });
              } else {
                stepError(tabId, s2);
                resolve({text:code, showText:true});
              }
            }).catch(function(){
              stepError(tabId, s2);
              resolve({text:code, showText:true});
            });
          }).catch(function(e){
            stepError(tabId, s1);
            resolve({text:'Error generando código: '+e.message, showText:true});
          });
        })();
        break;
      case 'wait':
        setTimeout(function(){resolve({text:'Esperado.'});}, act.ms||2000);
        break;
      case 'done':
        resolve({text:'Completado.'});
        break;
      case 'agentTask':
        runAgentLoop(tabId, act.goal||'', act.url||'', resolve);
        break;
      case 'closeTabs':
        chrome.tabs.query({currentWindow:true}, function(tabs){
          var ids = tabs.filter(function(t){return t.id!==tabId && (t.url||'').toLowerCase().includes((act.query||'').toLowerCase());}).map(function(t){return t.id;});
          if(!ids.length) return resolve({text:'No encontré pestañas con "'+act.query+'".'});
          chrome.tabs.remove(ids, function(){resolve({text:ids.length+' pestañas cerradas.'});});
        });
        break;
      case 'tabCleanup':
        chrome.tabs.query({currentWindow:true}, function(tabs){
          var now=Date.now(), closed=0;
          var toClose=tabs.filter(function(t){return t.id!==tabId && !t.active && !t.pinned;});
          if(!toClose.length) return resolve({text:'No hay pestañas para limpiar.'});
          chrome.tabs.remove(toClose.map(function(t){return t.id;}), function(){resolve({text:toClose.length+' pestañas inactivas cerradas.'});});
        });
        break;
      case 'showText':
        resolve({text:act.text||'', showText:true});
        break;
      case 'notify':
        chrome.notifications.create({type:'basic',iconUrl:'assets/icon-128.png',title:act.title||'X1',message:act.message||act.text||''});
        resolve({text:'Notificación enviada.'});
        break;
      // ── KNOWLEDGE MANUAL ──
      case 'setKnowledge':
        var found=false;
        for(var ki=0;ki<knowledgeManual.entries.length;ki++){
          if(knowledgeManual.entries[ki].topic===act.topic){knowledgeManual.entries[ki].content=act.content;found=true;break;}
        }
        if(!found) knowledgeManual.entries.push({topic:act.topic,content:act.content,date:new Date().toISOString()});
        saveManual();
        resolve({text:'Guardado en Knowledge Manual: '+act.topic});
        break;
      case 'getKnowledge':
        var entry=knowledgeManual.entries.find(function(e){return e.topic.toLowerCase().includes((act.topic||'').toLowerCase());});
        resolve({text:entry?entry.topic+': '+entry.content:'No tengo información sobre "'+act.topic+'".'});
        break;
      case 'remember':
        opGraph.entities.push({name:act.entity,type:act.type||'unknown',properties:act.properties||{},relations:act.relations||[],date:new Date().toISOString()});
        saveGraph();
        resolve({text:'Añadido al grafo: '+act.entity+' ('+act.type+')'});
        break;
      case 'queryGraph':
        var q=(act.query||'').toLowerCase();
        var matches=opGraph.entities.filter(function(e){return e.name.toLowerCase().includes(q)||(e.type||'').toLowerCase().includes(q)||JSON.stringify(e.properties||{}).toLowerCase().includes(q);});
        if(!matches.length) resolve({text:'No encontré "'+act.query+'" en el grafo.'});
        else resolve({text:matches.map(function(e){return e.type+': '+e.name+(e.properties?' — '+JSON.stringify(e.properties):'');}).join('\n'), showText:true});
        break;
      case 'setPriority':
        userPriorities.unshift({text:act.text,date:new Date().toISOString()});
        if(userPriorities.length>10) userPriorities=userPriorities.slice(0,10);
        savePriorities();
        resolve({text:'Prioridad establecida: '+act.text});
        break;
      case 'getPriorities':
        resolve({text:userPriorities.length?'Prioridades:\n'+userPriorities.map(function(p,i){return(i+1)+'. '+p.text;}).join('\n'):'No hay prioridades definidas.'});
        break;
      case 'remind':
        var r={text:act.text,when:act.when||'',created:new Date().toISOString(),id:'rem_'+Date.now()};
        reminders.push(r);
        saveReminders();
        resolve({text:'Recordatorio creado: '+act.text+(act.when?' para '+act.when:'')});
        break;
      case 'listReminders':
        resolve({text:reminders.length?'Recordatorios:\n'+reminders.map(function(r){return '• '+r.text+(r.when?' ('+r.when+')':'');}).join('\n'):'No hay recordatorios.'});
        break;
      case 'dismissReminder':
        reminders=reminders.filter(function(r){return r.id!==act.id;});
        saveReminders();
        resolve({text:'Recordatorio descartado.'});
        break;
      // ── AUTOMATIONS ──
      case 'createAutomation':
        x1Automations.push({
          id:'auto_'+Date.now(), name:act.name||'Automatización', trigger:act.trigger||'manual',
          schedule:act.schedule||'', steps:act.steps||[], enabled:true, created:new Date().toISOString()
        });
        saveAutomations();
        resolve({text:'Automatización "'+act.name+'" creada.'+(act.schedule?' Programada: '+act.schedule:'')});
        break;
      case 'listAutomations':
        resolve({text:x1Automations.length?'Automatizaciones:\n'+x1Automations.map(function(a,i){return(i+1)+'. '+a.name+(a.enabled?' ✓':' ✗')+(a.schedule?' ('+a.schedule+')':'');}).join('\n'):'No hay automatizaciones.'});
        break;
      case 'toggleAutomation':
        var autoIdx=x1Automations.findIndex(function(a){return a.id===act.id||a.name===act.name;});
        if(autoIdx>=0){x1Automations[autoIdx].enabled=act.enable!==undefined?act.enable:!x1Automations[autoIdx].enabled;saveAutomations();resolve({text:'Automatización '+(x1Automations[autoIdx].enabled?'activada':'desactivada')+'.'});}
        else resolve({text:'No encontré esa automatización.'});
        break;
      case 'deleteAutomation':
        x1Automations=x1Automations.filter(function(a){return a.id!==act.id&&a.name!==act.name;});
        saveAutomations();
        resolve({text:'Automatización eliminada.'});
        break;
      // ── SNIPPETS ──
      case 'createSnippet':
        x1Snippets.push({trigger:act.trigger, text:act.text, created:new Date().toISOString()});
        saveSnippets();
        resolve({text:'Snippet "'+act.trigger+'" creado. Di "'+act.trigger+'" para insertarlo.'});
        break;
      case 'insertSnippet':
        var snip=x1Snippets.find(function(s){return s.trigger.toLowerCase()===(act.trigger||'').toLowerCase();});
        if(snip) {
          typeTextInPage(tabId, snip.text).then(function(r){
            resolve({text:r==='failed'?snip.text:'Snippet insertado.', showText:r==='failed'});
          });
        } else resolve({text:'No encontré el snippet "'+act.trigger+'".'});
        break;
      case 'listSnippets':
        resolve({text:x1Snippets.length?'Snippets:\n'+x1Snippets.map(function(s){return '• "'+s.trigger+'" → '+s.text.substring(0,50)+'...';}).join('\n'):'No hay snippets.'});
        break;
      // ── SKILLS PERSONALIZADOS ──
      case 'createSkill':
        x1Skills.push({name:act.name, trigger:act.trigger||act.name, steps:act.steps||[], created:new Date().toISOString()});
        saveSkills();
        resolve({text:'Skill "'+act.name+'" creado. Di "'+act.trigger+'" para ejecutarlo.'});
        break;
      case 'runSkill':
        var skill=x1Skills.find(function(s){return s.name.toLowerCase()===(act.name||'').toLowerCase()||s.trigger.toLowerCase()===(act.name||'').toLowerCase();});
        if(skill&&skill.steps&&skill.steps.length) {
          execAction({action:'steps',steps:skill.steps}, tabId).then(resolve);
        } else resolve({text:'No encontré el skill "'+act.name+'".'});
        break;
      // ── CALENDAR AVANZADO ──
      case 'calendarWeek': {
        var today=new Date();
        var weekStart=new Date(today); weekStart.setDate(today.getDate()-today.getDay()+1);
        var weekEnd=new Date(weekStart); weekEnd.setDate(weekStart.getDate()+6);
        googleApi('https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin='+weekStart.toISOString()+'&timeMax='+weekEnd.toISOString()+'&orderBy=startTime&singleEvents=true')
          .then(function(r){
            if(r.error) return resolve({text:'Error: '+(r.error.message||'conecta Google.'), showText:true});
            var items=(r.items||[]).map(function(e){var d=e.start?.dateTime||e.start?.date||'';return '• '+d.substring(5,10)+' '+d.substring(11,16)+' — '+e.summary;});
            resolve({text:items.length?'Agenda de la semana:\n'+items.join('\n'):'No hay eventos esta semana.', showText:true});
          }).catch(function(e){resolve({text:'Error Calendar: '+e.message, showText:true});});
        break;
      }
      case 'calendarFree': case 'calendarCheckAvailability': {
        var checkDate=act.date||fmtDate(new Date());
        if (!/^\d{4}-\d{2}-\d{2}$/.test(checkDate)) checkDate = parseDate(checkDate).date;
        googleApi('https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin='+checkDate+'T00:00:00Z&timeMax='+checkDate+'T23:59:59Z&orderBy=startTime&singleEvents=true')
          .then(function(r){
            var busy=(r.items||[]).map(function(e){return{s:e.start?.dateTime||'',e:e.end?.dateTime||'',n:e.summary};});
            var slots=['09:00-10:00','10:00-11:00','11:00-12:00','12:00-13:00','14:00-15:00','15:00-16:00','16:00-17:00','17:00-18:00'];
            var free=slots.filter(function(s){var sh=parseInt(s);return!busy.some(function(b){var bh=parseInt((b.s||'').substring(11,13));return bh===sh;});});
            resolve({text:'El '+checkDate+':\nOcupado: '+(busy.length?busy.map(function(b){return b.n+' ('+((b.s||'').substring(11,16)||'?')+')';}).join(', '):'nada')+'\nLibre: '+(free.length?free.join(', '):'sin huecos')});
          });
        break;
      }
      // ── GMAIL AVANZADO ──
      case 'gmailSummary': case 'gmailSummarize':
        googleApi('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults='+(act.count||10)).then(function(r){
          if(r.error) return resolve({text:'No pude leer correos: '+(r.error.message||'conecta Google primero.'), showText:true});
          if(!r.messages||!r.messages.length) return resolve({text:'No tienes correos sin leer.'});
          Promise.all(r.messages.slice(0,10).map(function(m){return googleApi('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+m.id);}))
            .then(function(msgs){
              var lines=msgs.filter(function(m){return m.payload;}).map(function(m){var h=m.payload.headers,sub='',from='';h.forEach(function(x){if(x.name==='Subject')sub=x.value;if(x.name==='From')from=x.value.replace(/<.*>/,'').trim();});return '• '+from+': '+sub;});
              resolve({text:msgs.length+' correos sin leer:\n'+lines.join('\n'), showText:true});
            });
        }).catch(function(e){resolve({text:'Error con Gmail: '+e.message+'. Di "conecta Google".', showText:true});});
        break;
      // ── SHEETS AVANZADO ──
      case 'sheetsCreate':
        googleApi('https://sheets.googleapis.com/v4/spreadsheets','POST',{properties:{title:act.title||'X1 Sheet'}})
          .then(function(r){
            if(r.spreadsheetId) {
              chrome.tabs.update(tabId, {url:r.spreadsheetUrl||('https://docs.google.com/spreadsheets/d/'+r.spreadsheetId)});
              resolve({text:'Hoja "'+act.title+'" creada.'});
            } else resolve({text:'Error creando hoja: '+JSON.stringify(r), showText:true});
          });
        break;
      case 'sheetsRead':
        googleApi('https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27+and+name+contains+%27'+encodeURIComponent(act.query||'')+'%27&orderBy=modifiedTime+desc&pageSize=1')
          .then(function(r){
            if(!r.files||!r.files.length) return resolve({text:'No encontré hoja "'+act.query+'".'});
            var id=r.files[0].id;
            return googleApi('https://sheets.googleapis.com/v4/spreadsheets/'+id+'/values/A1:Z20').then(function(d){
              var rows=(d.values||[]).map(function(row){return row.join(' | ');});
              resolve({text:'Datos de "'+r.files[0].name+'":\n'+rows.join('\n'), showText:true});
            });
          });
        break;
      case 'sheetsAppend':
        googleApi('https://sheets.googleapis.com/v4/spreadsheets/'+act.sheetId+'/values/A:A:append?valueInputOption=USER_ENTERED','POST',{values:act.values||[]})
          .then(function(r){resolve({text:r.updates?'Añadidas '+(r.updates.updatedRows||0)+' filas.':'Error: '+JSON.stringify(r)});});
        break;
      case 'sheetsUpdate':
        googleApi('https://sheets.googleapis.com/v4/spreadsheets/'+act.sheetId+'/values/'+(act.range||'A1')+'?valueInputOption=USER_ENTERED','PUT',{values:act.values||[]})
          .then(function(r){resolve({text:r.updatedCells?'Actualizado '+r.updatedCells+' celdas.':'Error: '+JSON.stringify(r)});});
        break;
      // ── GMAIL AVANZADO EXTRA ──
      case 'gmailTriage':
        (function(){
          var ids=act.messageIds||[];
          if(!ids.length) return resolve({text:'No hay mensajes para clasificar.'});
          var action=act.triageAction||act.action||'archive';
          if(action==='archive'){
            Promise.all(ids.map(function(id){return googleApi('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+id+'/modify','POST',{removeLabelIds:['INBOX']});}))
              .then(function(){resolve({text:ids.length+' correos archivados.'});});
          } else if(action==='label'){
            Promise.all(ids.map(function(id){return googleApi('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+id+'/modify','POST',{addLabelIds:[act.label||'STARRED']});}))
              .then(function(){resolve({text:ids.length+' correos etiquetados.'});});
          } else if(action==='flag'||action==='vip'){
            Promise.all(ids.map(function(id){return googleApi('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+id+'/modify','POST',{addLabelIds:['STARRED']});}))
              .then(function(){resolve({text:ids.length+' correos marcados como importantes.'});});
          } else resolve({text:'Acción "'+action+'" no soportada.'});
        })();
        break;
      // ── CALENDAR EXTRA ──
      case 'calendarDelete':
        if(!act.eventId) return resolve({text:'Necesito el ID del evento.'});
        googleApi('https://www.googleapis.com/calendar/v3/calendars/primary/events/'+act.eventId,'DELETE')
          .then(function(){resolve({text:'Evento eliminado.'});});
        break;
      case 'calendarSuggestTime': {
        var sugDate=act.date||fmtDate(new Date());
        var sugDur=act.duration||60;
        googleApi('https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin='+sugDate+'T08:00:00Z&timeMax='+sugDate+'T20:00:00Z&orderBy=startTime&singleEvents=true')
          .then(function(r){
            var busy=(r.items||[]).map(function(e){return{s:parseInt((e.start?.dateTime||'').substring(11,13))||0,e:parseInt((e.end?.dateTime||'').substring(11,13))||0};});
            var slots=[];
            for(var h=9;h<=18;h++){
              var isBusy=busy.some(function(b){return h>=b.s&&h<b.e;});
              if(!isBusy) slots.push(h+':00');
            }
            resolve({text:slots.length?'Huecos disponibles el '+sugDate+': '+slots.join(', '):'No hay huecos el '+sugDate+'.'});
          });
        break;
      }
      // ── AGENT AVANZADO ──
      case 'agentAnalyzePage':
        readPageEnhanced(tabId).then(function(page){
          resolve({text:'Página: '+page.title+'\nURL: '+page.url+'\nElementos: '+page.els.length+'\nTexto:\n'+page.body.substring(0,1500), showText:true});
        }).catch(function(e){resolve({text:'Error leyendo: '+e.message});});
        break;
      case 'agentExtractData':
        readPageEnhanced(tabId).then(function(page){
          var fields=act.fields||[];
          var result={};
          var body=(page.body||'').toLowerCase();
          fields.forEach(function(f){
            var fl=f.toLowerCase();
            var idx=body.indexOf(fl);
            if(idx>=0){
              var after=page.body.substring(idx+f.length, idx+f.length+200).replace(/^[\s:=\-]+/,'');
              result[f]=after.split(/[\n\r]/)[0].trim().substring(0,150);
            } else result[f]='(no encontrado)';
          });
          resolve({text:'Datos extraídos:\n'+Object.keys(result).map(function(k){return k+': '+result[k];}).join('\n'), showText:true});
        });
        break;
      case 'agentFillForm':
        (function(){
          var fields=act.fields||{};
          var keys=Object.keys(fields);
          if(!keys.length) return resolve({text:'No hay campos para rellenar.'});
          execFn(tabId, function(fieldsJSON){
            var fields=JSON.parse(fieldsJSON);
            var filled=0;
            var inputs=document.querySelectorAll('input,textarea,select,[contenteditable]');
            Object.keys(fields).forEach(function(key){
              var val=fields[key];
              for(var i=0;i<inputs.length;i++){
                var el=inputs[i];
                var label=(el.getAttribute('placeholder')||'')+' '+(el.getAttribute('name')||'')+' '+(el.getAttribute('aria-label')||'')+' '+(el.getAttribute('id')||'');
                if(label.toLowerCase().includes(key.toLowerCase())){
                  if(el.tagName==='SELECT'){el.value=val;el.dispatchEvent(new Event('change',{bubbles:true}));}
                  else{el.focus();el.value='';document.execCommand('insertText',false,val);}
                  filled++;break;
                }
              }
            });
            return filled;
          }, [JSON.stringify(fields)]).then(function(n){resolve({text:'Rellenados '+n+' campos.'});});
        })();
        break;
      case 'agentTaskAdvanced':
        if(act.url) chrome.tabs.update(tabId, {url:act.url});
        runAgentLoop(tabId, act.goal||'', act.url||'', resolve);
        break;
      // ── READ SELECTION ──
      case 'readSelection':
        execFn(tabId, function(){return window.getSelection().toString();}).then(function(t){
          resolve({text:t?'Texto seleccionado: '+t:'No hay texto seleccionado.'});
        });
        break;
      // ── TAB AVANZADO ──
      case 'tabGroupProject':
        (function(){
          var urls=act.tabs||[];
          if(!urls.length) return resolve({text:'No hay URLs para el grupo.'});
          var tabIds=[];
          var done=0;
          urls.forEach(function(u){
            chrome.tabs.create({url:u,active:false}, function(t){
              tabIds.push(t.id);done++;
              if(done>=urls.length){
                chrome.tabs.group({tabIds:tabIds}, function(gid){
                  chrome.tabGroups.update(gid,{title:act.name||'Proyecto'},function(){resolve({text:'Grupo "'+act.name+'" creado con '+urls.length+' pestañas.'});});
                });
              }
            });
          });
        })();
        break;
      case 'tabGroupByDomain':
        chrome.tabs.query({currentWindow:true}, function(tabs){
          var domains={};
          tabs.forEach(function(t){var dm=(t.url||'').match(/https?:\/\/(?:www\.)?([^/]+)/);var key=dm?dm[1]:'other';if(!domains[key])domains[key]=[];domains[key].push(t.id);});
          var keys=Object.keys(domains),done=0;
          if(!keys.length) return resolve({text:'No hay pestañas.'});
          keys.forEach(function(d){var ids=domains[d];if(ids.length<2){done++;if(done>=keys.length)resolve({text:'Pestañas organizadas.'});return;}
            chrome.tabs.group({tabIds:ids},function(gid){chrome.tabGroups.update(gid,{title:d},function(){done++;if(done>=keys.length)resolve({text:'Pestañas organizadas por dominio.'});});});
          });
        });
        break;
      case 'newWindow':
        chrome.windows.create({}, function(){resolve({text:'Nueva ventana abierta.'});});
        break;
      case 'tabWorkspace': case 'tabSave': case 'tabRestore':
        var wsOp = act.wsAction || act.operation || act.op || (act.action==='tabSave'?'save':act.action==='tabRestore'?'restore':'list');
        if(wsOp === 'save') {
          chrome.tabs.query({currentWindow:true}, function(tabs){
            var urls = tabs.map(function(t){return t.url;}).filter(function(u){return u && !u.startsWith('chrome://');});
            chrome.storage.local.get('x1_workspaces', function(r){
              var ws = r.x1_workspaces ? JSON.parse(r.x1_workspaces) : {};
              ws[act.name||'default'] = {urls:urls, saved:new Date().toISOString()};
              chrome.storage.local.set({x1_workspaces:JSON.stringify(ws)});
              resolve({text:'Espacio de trabajo "'+act.name+'" guardado con '+urls.length+' pestañas.'});
            });
          });
        } else if(wsOp === 'restore') {
          chrome.storage.local.get('x1_workspaces', function(r){
            var ws = r.x1_workspaces ? JSON.parse(r.x1_workspaces) : {};
            var space = ws[act.name||'default'];
            if(!space) return resolve({text:'No encontré el espacio "'+act.name+'".'});
            space.urls.forEach(function(url){chrome.tabs.create({url:url});});
            resolve({text:'Espacio "'+act.name+'" restaurado: '+space.urls.length+' pestañas.'});
          });
        } else {
          chrome.storage.local.get('x1_workspaces', function(r){
            var ws = r.x1_workspaces ? JSON.parse(r.x1_workspaces) : {};
            var names = Object.keys(ws);
            resolve({text:names.length?'Espacios guardados: '+names.join(', '):'No hay espacios guardados.'});
          });
        }
        break;
      // ── GENERAL ──
      case 'research':
        chrome.tabs.update(tabId, {url:'https://www.perplexity.ai/search?q='+encodeURIComponent(act.query||act.topic||'')}, function(){
          resolve({text:'Investigando: '+(act.query||act.topic)});
        });
        break;
      case 'ask':
        resolve({text:act.question||'¿Qué quieres hacer?'});
        break;
      case 'suggest': case 'suggestAutomations':
        resolve({text:'Basado en tu uso, sugiero: 1) Resumen de emails cada mañana. 2) Limpieza de pestañas diaria. 3) Recordatorio de seguimiento de deals. Di "crea automatización" para configurar.'});
        break;
      case 'steps':
        if(!Array.isArray(act.steps)||!act.steps.length){resolve({text:'Hecho.'});break;}
        startKeepalive();
        stepCounter[tabId] = 0;
        var stepData={};
        var stepIdxs=[];
        (function next(i, txt){
          if(i>=act.steps.length){stopKeepalive();resolve({text:txt||'Completado todas las acciones.'});return;}
          var step=act.steps[i];
          if(step.action==='newDoc'&&!step.content&&stepData.lastContent) step.content=stepData.lastContent;
          if(step.action==='speak'&&!step.text&&stepData.lastContent) step.text=stepData.lastContent.substring(0,500);
          if(step.action==='typeInDoc'&&!step.text&&stepData.lastContent) step.text=stepData.lastContent.substring(0,200);
          var appName = stepActionToApp(step.action);
          var desc = stepActionToDesc(step);
          var sIdx = stepProgress(tabId, appName, desc);
          stepIdxs.push(sIdx);
          execAction(step, tabId).then(function(res){
            stepDone(tabId, sIdx);
            if(res&&res.pageData&&res.pageData.text) stepData.lastContent=res.pageData.text;
            else if(res&&res.text&&res.text.length>80) stepData.lastContent=res.text;
            var delay=(step.action==='navigate'||step.action==='newDoc'||step.action==='search'||step.action==='research')?2000:200;
            var nt=step.action==='speak'?(res.text||''):txt;
            if(!nt&&stepData.lastContent&&step.action==='speak') nt=stepData.lastContent.substring(0,200);
            setTimeout(function(){next(i+1, nt);}, delay);
          }).catch(function(e){
            stepError(tabId, sIdx);
            setTimeout(function(){next(i+1, txt);}, 200);
          });
        })(0,'');
        break;
      // ── SCREENSHOT ──
      case 'agentScreenshot':
        chrome.tabs.captureVisibleTab(null, {format:'png'}, function(dataUrl){
          if(chrome.runtime.lastError) resolve({text:'Error: '+chrome.runtime.lastError.message, showText:true});
          else resolve({text:'Captura tomada.', imageData:dataUrl, showText:true});
        });
        break;
      // ── SCROLL AND CAPTURE ──
      case 'agentScrollAndCapture':
        (function(){
          var allText = [];
          function scrollAndRead(scrollsLeft){
            if(scrollsLeft <= 0) {
              resolve({text: 'Contenido capturado:\n' + allText.join('\n---\n').substring(0,3000), showText: true});
              return;
            }
            execFn(tabId, function(){
              var text = (document.body.innerText || '').substring(0,2000);
              window.scrollBy(0, window.innerHeight * 0.8);
              return text;
            }).then(function(text){
              if(text) allText.push(text);
              setTimeout(function(){ scrollAndRead(scrollsLeft - 1); }, 1000);
            }).catch(function(e){
              resolve({text: 'Error: '+e.message, showText: true});
            });
          }
          scrollAndRead(3);
        })();
        break;
      // ── GMAIL LABELS ──
      case 'gmailLabel':
        (function(){
          var op = act.operation || 'list';
          if(op === 'list'){
            googleApi('https://gmail.googleapis.com/gmail/v1/users/me/labels').then(function(r){
              if(r.error) resolve({text:'Error: '+(r.error.message||'conecta Google.'), showText:true});
              else resolve({text:'Etiquetas:\n'+(r.labels||[]).map(function(l){return '• '+l.name;}).join('\n')});
            });
          } else if(op === 'add' && act.messageId && act.label){
            googleApi('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+act.messageId+'/modify','POST',{addLabelIds:[act.label]})
              .then(function(){resolve({text:'Etiqueta "'+act.label+'" añadida.'});});
          } else if(op === 'remove' && act.messageId && act.label){
            googleApi('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+act.messageId+'/modify','POST',{removeLabelIds:[act.label]})
              .then(function(){resolve({text:'Etiqueta "'+act.label+'" eliminada.'});});
          } else resolve({text:'Operación no soportada. Usa: list, add, remove.'});
        })();
        break;
      // ── CALENDAR UPDATE ──
      case 'calendarUpdate':
        if(!act.eventId) return resolve({text:'Necesito el ID del evento.'});
        (function(){
          var updBody = {};
          if(act.summary) updBody.summary = act.summary;
          if(act.description) updBody.description = act.description;
          if(act.date || act.time){
            var updDate = act.date || fmtDate(new Date());
            var updTime = act.time || '10:00';
            if(!/^\d{4}-\d{2}-\d{2}$/.test(updDate)) updDate = parseDate(updDate).date;
            if(!/^\d{1,2}:\d{2}$/.test(updTime)){var pt=parseTime(updTime);if(pt)updTime=pt;}
            var dur = act.duration || 60;
            var endH = parseInt(updTime.split(':')[0]) + Math.floor((parseInt(updTime.split(':')[1])+dur)/60);
            var endM = (parseInt(updTime.split(':')[1])+dur)%60;
            updBody.start = {dateTime:updDate+'T'+updTime+':00', timeZone:'Europe/Madrid'};
            updBody.end = {dateTime:updDate+'T'+(endH<10?'0':'')+endH+':'+(endM<10?'0':'')+endM+':00', timeZone:'Europe/Madrid'};
          }
          googleApi('https://www.googleapis.com/calendar/v3/calendars/primary/events/'+act.eventId,'PATCH',updBody)
            .then(function(r){
              if(r.error) resolve({text:'Error: '+(r.error.message||'no se pudo actualizar'), showText:true});
              else resolve({text:'Evento actualizado: '+(r.summary||'')});
            });
        })();
        break;
      // ── CALENDAR DECLINE ──
      case 'calendarDecline':
        if(!act.eventId) return resolve({text:'Necesito el ID del evento.'});
        googleApi('https://www.googleapis.com/calendar/v3/calendars/primary/events/'+act.eventId,'PATCH',{status:'cancelled'})
          .then(function(r){
            if(r.error) resolve({text:'Error: '+(r.error.message||'no se pudo rechazar'), showText:true});
            else resolve({text:'Evento rechazado.'});
          });
        break;
      default:
        resolve({text:act.text||act.speech||'Acción ejecutada.'});
    }
    } catch(err) { resolve({text:'Error ejecutando acción: '+err.message, showText:true}); }
  });
}

// ═══════════════════════════════════════════
// AGENT LOOP (multi-step web tasks)
// ═══════════════════════════════════════════

function agentStatus(tabId, text, isLast, opts) {
  var msg = {type:'X1_AGENT_STATUS', text:text, isLast:isLast||false};
  if(opts) { msg.step = opts.step||0; msg.action = opts.action||''; msg.target = opts.target||''; msg.icon = opts.icon||''; msg.status = opts.status||'running'; }
  try{chrome.tabs.sendMessage(tabId,msg);}catch(e){}
}

var stepCounter = {};
function stepProgress(tabId, app, description, status) {
  if(!stepCounter[tabId]) stepCounter[tabId] = 0;
  var idx = stepCounter[tabId]++;
  try{chrome.tabs.sendMessage(tabId, {type:'X1_STEP_PROGRESS', action:'add', app:app, description:description, status:status||'active', index:idx});}catch(e){}
  return idx;
}
function stepDone(tabId, idx) {
  try{chrome.tabs.sendMessage(tabId, {type:'X1_STEP_PROGRESS', action:'update', index:idx, status:'done'});}catch(e){}
}
function stepError(tabId, idx) {
  try{chrome.tabs.sendMessage(tabId, {type:'X1_STEP_PROGRESS', action:'update', index:idx, status:'error'});}catch(e){}
}
function stepClear(tabId) {
  stepCounter[tabId] = 0;
  try{chrome.tabs.sendMessage(tabId, {type:'X1_STEP_PROGRESS', action:'clear'});}catch(e){}
}
function stepActionToApp(action) {
  var map = {
    'calendarList':'Google Calendar','calendarCreate':'Google Calendar','calendarWeek':'Google Calendar',
    'calendarUpdate':'Google Calendar','calendarDelete':'Google Calendar','calendarDecline':'Google Calendar',
    'calendarCheckAvailability':'Google Calendar','calendarSuggestTime':'Google Calendar',
    'gmailRead':'Gmail','gmailSend':'Gmail','gmailDraft':'Gmail','gmailDraftReply':'Gmail',
    'gmailSearch':'Gmail','gmailSummarize':'Gmail','gmailTriage':'Gmail','gmailLabel':'Gmail',
    'newDoc':'Google Docs','typeInDoc':'Google Docs','readPage':'Google Docs',
    'newSheet':'Google Sheets','sheetsRead':'Google Sheets','sheetsAppend':'Google Sheets','sheetsUpdate':'Google Sheets',
    'newSlide':'Google Slides',
    'navigate':'Google','search':'Search','click':'Google',
    'speak':'AI','showText':'AI',
    'agentTask':'AI','research':'Search',
    'generateCode':'Code','codeWithGoal':'Code','explainCode':'Code','debugCode':'Code','reviewCode':'Code','code':'Code',
    'rewrite':'AI','expandText':'AI','summarize':'AI','correctText':'AI','continueWriting':'AI','changeLanguage':'AI',
    'tabGroup':'Google','tabGroupByDomain':'Google','tabCleanup':'Google','tabWorkspace':'Google',
    'remember':'AI','queryGraph':'AI','setKnowledge':'AI','remind':'AI',
    'loginGoogle':'Google','checkGoogle':'Google'
  };
  return map[action] || 'X1';
}
function stepActionToDesc(step) {
  var a = step.action;
  if(a==='calendarList') return 'Consultando eventos del día';
  if(a==='calendarCreate') return 'Creando evento: '+(step.summary||step.title||'').substring(0,30);
  if(a==='calendarWeek') return 'Consultando semana';
  if(a==='gmailRead') return 'Leyendo correos'+(step.query?' de '+step.query:'');
  if(a==='gmailSend') return 'Enviando email a '+(step.to||'').substring(0,25);
  if(a==='gmailDraft') return 'Creando borrador';
  if(a==='gmailSummarize') return 'Resumiendo emails';
  if(a==='newDoc') return 'Preparando documento';
  if(a==='typeInDoc') return 'Escribiendo texto';
  if(a==='readPage') return 'Leyendo página';
  if(a==='navigate') return 'Navegando a '+(step.url||'').substring(0,30);
  if(a==='search') return 'Buscando: '+(step.query||'').substring(0,30);
  if(a==='speak') return 'Respondiendo';
  if(a==='research') return 'Investigando: '+(step.query||step.topic||'').substring(0,30);
  if(a==='click') return 'Clic en '+(step.text||'').substring(0,25);
  if(a==='newSheet') return 'Creando hoja de cálculo';
  if(a==='sheetsRead') return 'Leyendo hoja';
  if(a==='loginGoogle') return 'Conectando Google';
  return (step.text||step.goal||step.query||a).substring(0,35);
}

// Global icon mapping for agent status UI
function iconUrlForPage(pageUrl) {
  if(!pageUrl) return '';
  var u = pageUrl.toLowerCase();
  var name = '';
  if(u.indexOf('replit')>=0) name = 'replit';
  else if(u.indexOf('canva')>=0) name = 'canva';
  else if(u.indexOf('notion')>=0) name = 'notion';
  else if(u.indexOf('gmail')>=0||u.indexOf('mail.google')>=0) name = 'gmail';
  else if(u.indexOf('calendar')>=0) name = 'calendar';
  else if(u.indexOf('docs.google')>=0) name = 'docs';
  else if(u.indexOf('sheets')>=0) name = 'sheets';
  else if(u.indexOf('drive')>=0) name = 'drive';
  else if(u.indexOf('github')>=0) name = 'github';
  else if(u.indexOf('linkedin')>=0) name = 'linkedin';
  else if(u.indexOf('meet')>=0||u.indexOf('zoom')>=0) name = 'meet';
  else if(u.indexOf('slack')>=0) name = 'slack';
  else if(u.indexOf('whatsapp')>=0) name = 'whatsapp';
  else if(u.indexOf('hubspot')>=0) name = 'hubspot';
  else if(u.indexOf('chat')>=0) name = 'chat';
  else if(u.indexOf('forms')>=0) name = 'forms';
  else if(u.indexOf('keep')>=0||u.indexOf('tasks')>=0) name = 'tasks';
  if(name) {
    try { return chrome.runtime.getURL('assets/'+name+'_48dp.png'); } catch(e) { return ''; }
  }
  return '';
}

function runAgentLoop(tabId, goal, url, resolve) {
  startKeepalive();
  // Ensure AI keys are fresh before starting agent loop
  loadAIKeys().then(function() {
    var step=0, maxSteps=15, noProgress=0, lastAction='', lastTarget='';
    var prevScrollHeight=0, scrollStallCount=0;
    var pageCache = null;

    if(url){
    var domain = url.replace(/https?:\/\//,'').split('/')[0].replace('www.','');
    var initialIcon = iconUrlForPage(url);
    agentStatus(tabId,'Abriendo '+domain+'...', false, {step:0,action:'navigate',target:domain,icon:initialIcon,status:'running'});
    chrome.tabs.update(tabId,{url:url});
  }

  function finishAgent(res) { stopKeepalive(); resolve(res); }

  function sendStep(action, target, isDone) {
    var status = isDone ? 'done' : 'running';
    var pageUrl = pageCache ? pageCache.url : '';
    var ico = iconUrlForPage(pageUrl);
    var display = action + (target ? ' ' + String(target).substring(0,35) : '');
    agentStatus(tabId, display, !!isDone, {step:step,action:action,target:String(target||'').substring(0,35),icon:ico,status:status});
  }

  function next() {
    if(step>=maxSteps){sendStep('done','Limite alcanzado',true);finishAgent({text:'Complete '+step+' pasos.'});return;}
    if(step===0&&url){setTimeout(next,2500);step++;return;}
    ++step;
    sendStep('...','analizando pagina');

    readPage(tabId).then(function(page){
      pageCache = page;
      if(page.scrollInfo) prevScrollHeight = page.scrollInfo.height;
      var items = page.items;
      if(!items.length){sendStep('done','sin elementos',true);finishAgent({text:'No hay elementos interactivos.'});return;}

      var itemStr = items.slice(0,20).join('\n');
      var bodyStr = page.body.substring(0,250);
      var agentPrompt = 'OBJ:'+goal+'\nPG:'+page.title+'\nELEMS:\n'+itemStr+'\n'+
        (bodyStr?'TXT:'+bodyStr+'\n':'')+
        (page.scrollInfo&&!page.scrollInfo.atBottom?'[MAs CONTENIDO]\n':'')+
        'RPTA: click "texto" | type "texto" | scroll | done. NO menciones imagenes. SOLO accion.';

      function agentAI(prompt) {
        function callOpenAICompat(url, key, model) {
          return fetch(url, {
            method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
            body:JSON.stringify({model:model,messages:[{role:'system',content:'Eres agente web. SOLO ACCIONES. No hables de imagenes ni vision.'},{role:'user',content:prompt}],temperature:0,max_tokens:80}),
            signal:AbortSignal.timeout(15000)
          }).then(function(r){return r.json();}).then(function(d){
            var t = (d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content||'').trim();
            if(!isValidContent(t)) throw new Error('invalid');
            return t;
          });
        }
        function tryProxy() {
          if(!PROXY_URL) return Promise.reject('no proxy');
          return fetch(PROXY_URL+'/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:'Eres agente web. SOLO ACCIONES. No hables de imagenes.'},{role:'user',content:prompt}]}),signal:AbortSignal.timeout(15000)}).then(function(r){return r.json();}).then(function(d){var t=(d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content||'').trim();if(!isValidContent(t)) throw new Error('bad');return t;});
        }
        var fallbacks = [];
        if(aiKeys.groqKey) fallbacks.push(function(){return callOpenAICompat('https://api.groq.com/openai/v1/chat/completions',aiKeys.groqKey,'llama-3.3-70b-versatile');});
        if(aiKeys.opencodeKey) fallbacks.push(function(){return callOpenAICompat('https://opencode.ai/zen/v1/chat/completions',aiKeys.opencodeKey,'big-pickle');});
        function tryFallback(i) { if(i>=fallbacks.length) return Promise.resolve(null); return fallbacks[i]().catch(function(){return tryFallback(i+1);}); }
        return tryProxy().catch(function(){return tryFallback(0);});
      }

      agentAI(agentPrompt).then(function(reply){
        if(!reply){ heuristicFallback('no reply'); return; }
        reply = reply.trim().toLowerCase();

        var action = null;
        var cm = reply.match(/click\s+["""'']?\s*([^""'']+)["""'']?/i);
        if(cm && cm[1].trim().length>1) action={action:'click', text:cm[1].replace(/["""'']/g,'').trim()};
        if(!action){
          var tm = reply.match(/type\s+["""'']?\s*([^""'']+)["""'']?/i);
          if(tm && tm[1].trim().length>1) action={action:'typeInDoc', text:tm[1].replace(/["""'']/g,'').trim()};
        }
        if(!action && /scroll/i.test(reply)) action={action:'scroll', direction:'down'};
        if(!action && /^done|complet|listo|hecho/i.test(reply)){ sendStep('done','objetivo completado',true); finishAgent({text:'Hecho.'}); return; }

        if(!action || (action.action===lastAction && (action.text||'')===lastTarget)){
          noProgress++;
          if(noProgress>=3){ heuristicFallback('sin progreso'); return; }
          sendStep('...','otra opcion');
          setTimeout(next,600);
          return;
        }
        noProgress=0; lastAction=action.action; lastTarget=action.text||'';
        sendStep(action.action, action.text||action.url||'');

        execAction(action,tabId).then(function(){
          if(action.action==='scroll'){
            readPage(tabId).then(function(p2){
              var nh = p2.scrollInfo ? p2.scrollInfo.height : 0;
              if(nh > prevScrollHeight && prevScrollHeight > 0){
                scrollStallCount=0; prevScrollHeight=nh;
                sendStep('scroll','cargando mas');
                setTimeout(next,600);
              } else {
                scrollStallCount++;
                setTimeout(next,300);
              }
            }).catch(function(){setTimeout(next,300);});
          } else {
            setTimeout(next,1200);
          }
        }).catch(function(e){ heuristicFallback(e.message); });
      }).catch(function(e){
        var first = items[0];
        if(first && first.indexOf('[')===0){
          var tgt = first.replace(/\[[^\]]+\]\s*/,'');
          sendStep('click',tgt);
          execAction({action:'click',text:tgt},tabId).then(function(){setTimeout(next,1200);}).catch(function(){heuristicFallback('click fail');});
        } else if(page.body && page.body.length>50){
          sendStep('scroll','buscando');
          execAction({action:'scroll',direction:'down'},tabId).then(function(){setTimeout(next,600);}).catch(function(){heuristicFallback('scroll fail');});
        } else { heuristicFallback('no options'); }
      });
    }).catch(function(e){
      sendStep('done','error: '+e.message,true);
      finishAgent({text:'Error: '+e.message, showText:true});
    });
  }

  function heuristicFallback(reason){
    stopKeepalive();
    sendStep('done','necesito ayuda',true);
    finishAgent({text:'No puedo continuar solo. Di exactamente "click en [texto]" o "escribe [texto]".'});
  }

  if(url){next();}else{step=1;next();}
  });
}

// ═══════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════

function handleVoice(cmd, wantsText, sendResponse) {
  var done = false;
  function respond(data) {
    if(done) return; done = true;
    data.showText = wantsText || data.showText || false;
    data.source = 'x1-voice-response';
    data.type = 'X1_VOICE_RESPONSE';
    // Send via tab message so it survives page navigation
    getActiveTab().then(function(tab){if(tab&&tab.id)chrome.tabs.sendMessage(tab.id,data).catch(function(){});});
    sendResponse(data);
  }
  var timer = setTimeout(function(){respond({text:'Tiempo agotado. Intenta de nuevo.', showText:true});}, 120000);

  addMem('user', cmd);

  getActiveTab().then(function(tab){
    if(!tab||!tab.id){clearTimeout(timer);respond({text:'No hay pestaña activa.'});return;}

    var tabId = tab.id; // Capture tabId upfront to survive navigation

    var action = parseCommand(cmd);
    if(action){
      clearTimeout(timer);
      addMem('assistant', JSON.stringify(action));
      execAction(action, tabId).then(respond).catch(function(e){respond({text:'Error: '+e.message, showText:true});});
      return;
    }

    // No regex match → AI decides
    aiComplete(cmd).then(function(llmAction){
      clearTimeout(timer);
      if(!llmAction){
        var activeKeys = Object.keys(aiKeys).filter(function(k){return aiKeys[k] && k !== 'aiProvider';});
        console.error('[X1] All AI providers returned null. Active keys:', activeKeys.join(', '));
        // Fallback: try to handle as a speak action with the command itself
        respond({text:'No pude conectar con ningún proveedor de IA. Claves activas: '+activeKeys.join(', ')+'. Verifica tu conexión a internet o prueba "usa groq".', showText:true});
        return;
      }
      addMem('assistant', JSON.stringify(llmAction));
      execAction(llmAction, tabId).then(respond).catch(function(e){respond({text:'Error: '+e.message, showText:true});});
    }).catch(function(e){
      clearTimeout(timer);
      respond({text:'Error de IA: '+e.message, showText:true});
    });
  }).catch(function(e){
    clearTimeout(timer);
    respond({text:'Error: '+e.message, showText:true});
  });
}

// ═══════════════════════════════════════════
// OFFSCREEN (clap detection)
// ═══════════════════════════════════════════

function ensureOffscreen() {
  chrome.offscreen.createDocument({
    url:'offscreen/voice.html',
    reasons:['USER_MEDIA','AUDIO_PLAYBACK'],
    justification:'Audio capture for clap detection and voice commands.'
  }).catch(function(){});
}

// ═══════════════════════════════════════════
// PROACTIVE ENGINE
// ═══════════════════════════════════════════

function getGreeting() {
  var h = new Date().getHours();
  if (h < 7) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

// Generate a proactive briefing: calendar + emails + reminders
function generateBriefing() {
  var today = fmtDate(new Date());
  var greeting = getGreeting();
  var parts = [greeting + ', soy X1.'];

  return isLoggedIn().then(function(logged) {
    if (!logged) {
      parts.push('Conecta tu cuenta de Google para que pueda prepararte el día. Di: conecta Google.');
      return parts.join(' ');
    }

    // Fetch calendar + emails in parallel
    var calP = googleApi('https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin='+today+'T00:00:00Z&timeMax='+today+'T23:59:59Z&orderBy=startTime&singleEvents=true')
      .catch(function(){return{items:[]};});
    var mailP = googleApi('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=5')
      .catch(function(){return{};});

    return Promise.all([calP, mailP]).then(function(results) {
      var cal = results[0];
      var mail = results[1];

      // Calendar summary
      var events = cal.items || [];
      if (events.length > 0) {
        var now = new Date();
        var upcoming = events.filter(function(e){
          var start = new Date(e.start?.dateTime || e.start?.date || '');
          return start > now;
        });
        if (upcoming.length > 0) {
          var next = upcoming[0];
          var nextTime = (next.start?.dateTime || '').substring(11,16);
          parts.push('Tienes ' + events.length + ' evento' + (events.length>1?'s':'') + ' hoy.');
          parts.push('El próximo es "' + next.summary + '" a las ' + nextTime + '.');
        } else {
          parts.push('Tenías ' + events.length + ' evento' + (events.length>1?'s':'') + ' hoy, ya pasaron todos.');
        }
      } else {
        parts.push('No tienes eventos en el calendario hoy.');
      }

      // Email summary
      var unread = (mail.messages || []).length;
      if (unread > 0) {
        parts.push('Tienes ' + (mail.resultSizeEstimate || unread) + ' correo' + (unread>1?'s':'') + ' sin leer.');
      } else {
        parts.push('No tienes correos pendientes.');
      }

      // Reminders
      if (reminders.length > 0) {
        parts.push('Y ' + reminders.length + ' recordatorio' + (reminders.length>1?'s':'') + ' pendiente' + (reminders.length>1?'s':'') + '.');
      }

      parts.push('¿En qué te puedo ayudar?');
      return parts.join(' ');
    });
  }).catch(function(e) {
    return greeting + ', soy X1. ' + '¿En qué te puedo ayudar?';
  });
}

// Send proactive speech to the active tab
function proactiveSpeak(text, tabId) {
  var msg = {type:'X1_VOICE_RESPONSE', source:'x1-voice-response', text:text, showText:false, error:null};
  if (tabId) {
    chrome.tabs.sendMessage(tabId, msg).catch(function(){});
  } else {
    getActiveTab().then(function(tab){
      if(tab && tab.id) chrome.tabs.sendMessage(tab.id, msg).catch(function(){});
    });
  }
}

// Track if we already greeted today
var lastGreetDate = '';

function greetAndBrief(tabId) {
  var today = fmtDate(new Date());
  var isFirstGreet = (lastGreetDate !== today);
  lastGreetDate = today;

  if (isFirstGreet) {
    // Full briefing on first activation of the day
    generateBriefing().then(function(text) {
      proactiveSpeak(text, tabId);
    });
  } else {
    // Quick greeting on subsequent activations
    proactiveSpeak(getGreeting() + '. ¿Qué necesitas?', tabId);
  }
}

// ═══════════════════════════════════════════
// PROACTIVE INTELLIGENCE
// ═══════════════════════════════════════════

// VIP detection: check if email sender is in operational graph or is a known contact
function getVIPEmails() {
  var vips = [];
  // Check operational graph for people/contacts
  if (opGraph && opGraph.entities) {
    opGraph.entities.forEach(function(e) {
      if (e.type === 'person' || e.type === 'contact' || e.type === 'cliente' || e.type === 'investor') {
        if (e.properties && e.properties.email) vips.push(e.properties.email.toLowerCase());
        // Also check for name-based matching later
      }
    });
  }
  // Add known VIP domains
  vips.push('@iese.net');
  return vips;
}

// Check for important emails from VIPs or with urgent keywords
function checkImportantEmails() {
  return isLoggedIn().then(function(logged) {
    if (!logged) return null;
    return googleApi('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=10')
      .then(function(r) {
        if (!r.messages || !r.messages.length) return null;
        return Promise.all(r.messages.slice(0,10).map(function(m) {
          return googleApi('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+m.id);
        }));
      }).then(function(msgs) {
        if (!msgs || !msgs.length) return null;
        var vips = getVIPEmails();
        var urgentKeywords = ['urgente','importante','asap','deadline','vencimiento','mañana','hoy','emergencia','priority','critical','bloqueante','factura','invoice','firmar','sign','aprobación','approval','contrato','contract','oferta','proposal'];
        var important = [];
        msgs.forEach(function(msg) {
          if (!msg || !msg.payload) return;
          var h = msg.payload.headers, from = '', sub = '';
          h.forEach(function(x) { if (x.name === 'From') from = x.value; if (x.name === 'Subject') sub = x.value; });
          var fromLower = from.toLowerCase();
          var subLower = sub.toLowerCase();
          // Check if from VIP
          var isVIP = false;
          for (var vi = 0; vi < vips.length; vi++) {
            if (fromLower.indexOf(vips[vi].toLowerCase().replace('@','')) >= 0) { isVIP = true; break; }
          }
          // Check for urgent keywords
          var hasUrgent = false;
          for (var ki = 0; ki < urgentKeywords.length; ki++) {
            if (subLower.indexOf(urgentKeywords[ki]) >= 0) { hasUrgent = true; break; }
          }
          if (isVIP || hasUrgent) {
            important.push({from: from, subject: sub, isVIP: isVIP, snippet: (msg.snippet||'').substring(0,100)});
          }
        });
        return important.length ? important : null;
      }).catch(function() { return null; });
  });
}

// Deal flow monitoring: check entities not updated in >7 days
function checkDealFlow() {
  if (!opGraph || !opGraph.entities || !opGraph.entities.length) return [];
  var now = new Date();
  var staleDeals = [];
  opGraph.entities.forEach(function(e) {
    if (e.type === 'deal' || e.type === 'opportunity' || e.type === 'proyecto' || e.type === 'project') {
      if (e.date) {
        var updated = new Date(e.date);
        var daysSince = Math.round((now - updated) / 86400000);
        if (daysSince >= 7) {
          staleDeals.push({name: e.name, daysSince: daysSince, type: e.type});
        }
      }
    }
  });
  return staleDeals;
}

// ═══════════════════════════════════════════
// BACKGROUND ALARMS (proactive checks)
// ═══════════════════════════════════════════

chrome.alarms.create('x1-meeting-check', {periodInMinutes: 5});
chrome.alarms.create('x1-email-check', {periodInMinutes: 30});
chrome.alarms.create('x1-deal-check', {periodInMinutes: 1440}); // Once per day

chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === 'x1-meeting-check') {
    // Check for meetings starting in 10-15 minutes
    isLoggedIn().then(function(logged) {
      if (!logged) return;
      var now = new Date();
      var soon = new Date(now.getTime() + 15 * 60000);
      googleApi('https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin='+now.toISOString()+'&timeMax='+soon.toISOString()+'&orderBy=startTime&singleEvents=true')
        .then(function(r) {
          var events = (r.items || []).filter(function(e) {
            var start = new Date(e.start?.dateTime || '');
            var mins = Math.round((start - now) / 60000);
            return mins >= 8 && mins <= 15;
          });
          if (events.length > 0) {
            var e = events[0];
            var mins = Math.round((new Date(e.start?.dateTime || '') - now) / 60000);
            var msg = 'Tienes "' + e.summary + '" en ' + mins + ' minutos.';
            if (e.hangoutLink) msg += ' Tiene enlace de Meet.';
            chrome.notifications.create('meeting-'+e.id, {
              type:'basic', iconUrl:'assets/icon-128.png',
              title:'Reunión en '+mins+' min', message:e.summary
            });
            proactiveSpeak(msg);
          }
        }).catch(function(){});
    });
  }

  if (alarm.name === 'x1-email-check') {
    isLoggedIn().then(function(logged) {
      if (!logged) return;
      checkImportantEmails().then(function(important) {
        if (!important) return;
        var msg = 'Tienes ' + important.length + ' correo' + (important.length>1?'s':'') + ' importante' + (important.length>1?'s':'') + '. ';
        important.forEach(function(m) {
          msg += '"' + m.subject + '" de ' + m.from.replace(/<.*>/,'').trim() + '. ';
        });
        chrome.notifications.create('emails-'+Date.now(), {
          type:'basic', iconUrl:'assets/icon-128.png',
          title: important.length + ' correo' + (important.length>1?'s':'') + ' importante' + (important.length>1?'s':''),
          message: important.map(function(m){return m.subject;}).join(', ')
        });
        proactiveSpeak(msg);
      }).catch(function(){});
    });
  }

  if (alarm.name === 'x1-deal-check') {
    var stale = checkDealFlow();
    if (stale.length > 0) {
      var msg = 'Tienes ' + stale.length + ' deal' + (stale.length>1?'s':'') + ' sin actualizar: ';
      stale.forEach(function(d) {
        msg += d.name + ' (' + d.daysSince + ' días), ';
      });
      chrome.notifications.create('deals-'+Date.now(), {
        type:'basic', iconUrl:'assets/icon-128.png',
        title: stale.length + ' deal' + (stale.length>1?'s':'') + ' sin actividad',
        message: stale.map(function(d){return d.name + ' ('+d.daysSince+'d)';}).join(', ')
      });
      proactiveSpeak(msg);
    }
  }
});

// ═══════════════════════════════════════════
// CONTEXT DETECTION (for X1 Context tab)
// ═══════════════════════════════════════════

function detectPageContext(host, url, title) {
  var result = {summary:'', contact:null, insight:null};

  if(host.indexOf('mail.google')!==-1) {
    result.summary = 'Gmail - Bandeja de entrada';
    result.insight = 'X1 puede resumir tus emails, redactar respuestas, hacer triage automatico y buscar correos por persona o tema.';
  } else if(host.indexOf('calendar.google')!==-1) {
    result.summary = 'Google Calendar';
    result.insight = 'X1 puede crear eventos, verificar disponibilidad, sugerir horarios y preparar resumen semanal.';
  } else if(host.indexOf('docs.google')!==-1) {
    result.summary = 'Google Docs - Documento';
    result.insight = 'X1 puede dictar texto, resumir el documento, reescribir secciones, traducir y continuar escribiendo.';
  } else if(host.indexOf('sheets.google')!==-1) {
    result.summary = 'Google Sheets - Hoja de calculo';
    result.insight = 'X1 puede leer datos, crear hojas nuevas, agregar filas y actualizar celdas.';
  } else if(host.indexOf('linkedin')!==-1) {
    result.summary = 'LinkedIn';
    if(url.indexOf('/in/')!==-1) {
      var nameMatch = title.match(/^(.+?)[\s|–\-]/);
      if(nameMatch) {
        result.contact = {name: nameMatch[1].trim(), role: 'Perfil de LinkedIn'};
        result.insight = 'X1 detecta un perfil. Puedo analizar la informacion, redactar un mensaje personalizado o guardar el contacto.';
      }
    } else {
      result.insight = 'X1 puede analizar perfiles, redactar mensajes personalizados y guardar informacion de contactos.';
    }
  } else if(host.indexOf('github')!==-1) {
    result.summary = 'GitHub';
    result.insight = 'X1 puede leer el contenido de esta pagina, analizar codigo y crear resumen del repositorio.';
  } else if(host.indexOf('youtube')!==-1) {
    result.summary = 'YouTube';
    result.insight = 'X1 puede leer el titulo y descripcion del video. Di "lee la pagina" para obtener mas detalle.';
  } else if(host.indexOf('notion')!==-1) {
    result.summary = 'Notion';
    result.insight = 'X1 puede leer y resumir el contenido de esta pagina de Notion.';
  } else {
    result.summary = title ? title.substring(0,60) : host;
    result.insight = 'X1 puede leer esta pagina, extraer informacion, hacer click en elementos y navegar por ti.';
  }

  // Check operational graph for contact info
  if(opGraph && opGraph.length > 0 && result.contact && result.contact.name) {
    var contactName = result.contact.name.toLowerCase();
    for(var i=0; i<opGraph.length; i++) {
      var entity = opGraph[i];
      if(entity.name && entity.name.toLowerCase().indexOf(contactName)!==-1) {
        if(entity.properties) {
          if(entity.properties.role) result.contact.role = entity.properties.role;
          if(entity.properties.emails) result.contact.emails = entity.properties.emails;
        }
        if(entity.relations && entity.relations.length > 0) {
          result.contact.relations = entity.relations.length + ' conexiones en el grafo';
        }
        break;
      }
    }
  }

  return result;
}

// ═══════════════════════════════════════════
// LISTENERS
// ═══════════════════════════════════════════

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if(!msg) return;
  if(msg.type==='X1_GET_CONTEXT'){
    var url = msg.url || '';
    var title = msg.title || '';
    var host = '';
    try { host = new URL(url).hostname; } catch(e) {}
    var data = {page:{title:title, domain:host, favicon:'https://www.google.com/s2/favicons?domain='+host+'&sz=32', summary:''}};
    var detected = detectPageContext(host, url, title);
    if(detected.summary) data.page.summary = detected.summary;
    if(detected.contact) data.contact = detected.contact;
    if(detected.insight) data.insight = detected.insight;
    sendResponse(data);
    return false;
  }
  if(msg.type==='X1_GREET'){
    var greeting = getGreeting();
    generateBriefing().then(function(briefText){
      sendResponse({text: briefText});
    }).catch(function(){
      sendResponse({text: greeting + '. Soy X1, tu agente. Dime en que puedo ayudarte.'});
    });
    return true;
  }
  if(msg.type==='VOICE_COMMAND_EXEC'){
    handleVoice(msg.command||'', msg.wantsText||false, sendResponse);
    return true;
  }
  if(msg.type==='X1_TOGGLE' && sender && sender.tab && sender.tab.id){
    chrome.tabs.sendMessage(sender.tab.id, {type:'X1_TOGGLE'});
    return false;
  }
  if(msg.type==='X1_CLAP'){
    getActiveTab().then(function(tab){
      if(!tab||!tab.id) return;
      chrome.tabs.sendMessage(tab.id, {type:'X1_TOGGLE'}).then(function(){
        setTimeout(function(){ greetAndBrief(tab.id); }, 500);
      }).catch(function(){
        chrome.scripting.executeScript({target:{tabId:tab.id}, files:['content/voice-listener.js'], world:'MAIN'})
          .then(function(){return chrome.scripting.executeScript({target:{tabId:tab.id}, files:['content/voice-bridge.js']});})
          .then(function(){
            setTimeout(function(){
              chrome.tabs.sendMessage(tab.id,{type:'X1_TOGGLE'});
              setTimeout(function(){ greetAndBrief(tab.id); }, 800);
            },300);
          })
          .catch(function(e){console.error('[X1]',e);});
      });
    });
    return false;
  }
});

// Icon click → toggle bar + proactive greeting
chrome.action.onClicked.addListener(function(tab){
  if(!tab.id) return;
  chrome.tabs.sendMessage(tab.id, {type:'X1_TOGGLE'}).then(function() {
    // Bar is now visible — greet + brief
    setTimeout(function(){ greetAndBrief(tab.id); }, 500);
  }).catch(function(){
    // Scripts not injected yet
    chrome.scripting.executeScript({target:{tabId:tab.id}, files:['content/voice-listener.js'], world:'MAIN'})
      .then(function(){return chrome.scripting.executeScript({target:{tabId:tab.id}, files:['content/voice-bridge.js']});})
      .then(function(){
        setTimeout(function(){
          chrome.tabs.sendMessage(tab.id,{type:'X1_TOGGLE'});
          setTimeout(function(){ greetAndBrief(tab.id); }, 800);
        },300);
      })
      .catch(function(e){console.error('[X1]',e);});
  });
});

chrome.runtime.onInstalled.addListener(function(){
  console.log('[X1] Instalado');
  ensureOffscreen();
  // Set up alarms on install
  chrome.alarms.create('x1-meeting-check', {periodInMinutes: 5});
  chrome.alarms.create('x1-email-check', {periodInMinutes: 30});
});

ensureOffscreen();

console.log('[X1] SW Ready');
