import * as React from 'react';
import * as B from './backend.js';
import { ProcessTask } from './components/ui/task';
import { Markdown } from './Markdown.jsx';
import { Trash2, Paperclip, ArrowUp, Plus, Menu } from 'lucide-react';

var MCP_AGENTS = [
  { id: 'mcp-context7',    name: 'Context7',    category: 'docs',     letter: 'C7', tools: ['resolve-library-id', 'query-docs'] },
  { id: 'mcp-github',      name: 'GitHub',      category: 'devops',   letter: 'GH', tools: ['repos', 'issues', 'PRs', 'branches', 'search'] },
  { id: 'mcp-october',     name: 'Oct. Themes', category: 'design',   letter: 'OT', tools: ['get_theme', 'get_theme_by_id'] },
  { id: 'mcp-firecrawl',   name: 'Firecrawl',   category: 'research', letter: 'FC', tools: ['scrape', 'search', 'crawl', 'extract'] },
  { id: 'mcp-cf-docs',     name: 'CF Docs',     category: 'devops',   letter: 'CD', tools: ['search_docs'] },
  { id: 'mcp-cf-builds',   name: 'CF Builds',   category: 'devops',   letter: 'CB', tools: ['list_builds', 'get_build'] },
  { id: 'mcp-cf-bindings', name: 'CF Bindings', category: 'devops',   letter: 'CN', tools: ['list_bindings', 'get_binding'] },
  { id: 'mcp-cf-obs',      name: 'CF Obs',      category: 'devops',   letter: 'CO', tools: ['list_logs', 'get_metrics'] },
  { id: 'mcp-clickhouse',  name: 'ClickHouse',  category: 'data',     letter: 'CH', tools: ['query', 'list_databases', 'list_tables'] },
  { id: 'mcp-vercel',      name: 'Vercel',      category: 'devops',   letter: 'VC', tools: ['list_projects', 'deploy', 'get_deployment'] },
  { id: 'mcp-qdrant',      name: 'Qdrant',      category: 'memory',   letter: 'QD', tools: ['store', 'find', 'delete', 'list_collections'] },
  { id: 'mcp-filesystem',  name: 'Filesystem',  category: 'files',    letter: 'FS', tools: ['read_file', 'write_file', 'list_directory', 'search'] },
  { id: 'mcp-memory',      name: 'Memory',      category: 'memory',   letter: 'MG', tools: ['entities', 'relations', 'observations', 'search'] },
  { id: 'mcp-fetch',       name: 'Fetch',       category: 'research', letter: 'FT', tools: ['fetch_url'] },
  { id: 'mcp-git',         name: 'Git',         category: 'devops',   letter: 'GT', tools: ['log', 'diff', 'blame', 'status'] },
  { id: 'mcp-seqthink',    name: 'Seq. Think',  category: 'thinking', letter: 'ST', tools: ['sequential_thinking'] },
  { id: 'mcp-cognee',      name: 'Cognee',      category: 'memory',   letter: 'CG', tools: ['remember', 'recall', 'forget'] },
  { id: 'mcp-serena',      name: 'Serena',      category: 'code',     letter: 'SR', tools: ['search_code', 'edit_code', 'find_references'] },
];

var AGENTS = [
  { id: 'auto',      name: 'AUTO',      ai: 'Automatico' },
  { id: 'research',  name: 'Research',  ai: 'Gemini' },
  { id: 'writer',    name: 'Writer',    ai: 'Claude' },
  { id: 'developer', name: 'Developer', ai: 'GPT-4o' },
  { id: 'marketing', name: 'Marketing', ai: 'Gemini' },
  { id: 'finance',   name: 'Finance',   ai: 'Claude' },
  { id: 'legal',     name: 'Legal',     ai: 'Mistral' },
  { id: 'email',     name: 'Email',     ai: 'Llama' },
  { id: 'meeting',   name: 'Meeting',   ai: 'Gemini' },
];

function agentById(id) {
  return AGENTS.find(function(a) { return a.id === id; }) || AGENTS[0];
}

function stripMarkdown(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,4}\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAgentMention(text) {
  var match = text.match(/#(\w+)/);
  if (match) {
    var agentName = match[1].toLowerCase();
    var found = MCP_AGENTS.find(function(a) {
      return a.id.toLowerCase().includes(agentName) || a.name.toLowerCase().includes(agentName);
    });
    if (found) return { agent: found, cleanText: text.replace(match[0], '').trim() };
  }
  return { agent: null, cleanText: text };
}

var VektorLogo = function(props) {
  return React.createElement('span', {
    className: 'font-semibold tracking-tight text-gray-1000',
    style: { fontSize: props.size || 14, fontFamily: 'inherit', letterSpacing: '-0.03em', lineHeight: 1 },
  }, 'Vektor');
};

var VektorAvatar = function(props) {
  var size = props.size || 24;
  return React.createElement('div', {
    className: 'flex items-center justify-center shrink-0 rounded-full bg-neutral-100 text-gray-900',
    style: { width: size, height: size, fontSize: size * 0.5, fontWeight: 600, fontFamily: 'Geist Sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', letterSpacing: '-0.024em' },
  }, 'V');
};

function ThinkingDots() {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-900 animate-pulse" style={{ animation: 'pulse 1.4s ease-in-out infinite' }}></span>
        <span className="w-1.5 h-1.5 rounded-full bg-gray-900 animate-pulse" style={{ animation: 'pulse 1.4s ease-in-out 0.2s infinite' }}></span>
        <span className="w-1.5 h-1.5 rounded-full bg-gray-900 animate-pulse" style={{ animation: 'pulse 1.4s ease-in-out 0.4s infinite' }}></span>
      </div>
      <span className="text-label-13 text-muted-foreground">Pensando\u2026</span>
    </div>
  );
}

function ReasoningPanel({ msg }) {
  var [open, setOpen] = React.useState(false);
  if (!msg.judgeReason) return null;
  return (
    <div className="mb-2">
      <div onClick={function() { setOpen(function(v) { return !v; }); }} className="inline-flex items-center gap-1.5 cursor-pointer text-muted-foreground select-none">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
          <path d="M8 0a8 8 0 110 16A8 8 0 018 0zM1.5 8a6.5 6.5 0 1013 0 6.5 6.5 0 00-13 0zm6.25-3.25v2.992l2.028.812a.75.75 0 01-.557 1.392l-2.5-1A.751.751 0 017.25 8.25v-3.5a.75.75 0 011.5 0z" />
        </svg>
        <span className="text-label-12">Razonamiento{msg.sector ? ' \u00b7 ' + msg.sector : ''}</span>
        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" className="transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }}> <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z" /> </svg>
      </div>
      {open && (
        <div className="mt-1.5 pl-3 border-l border-neutral-300 text-label-13 text-muted-foreground">
          {msg.judgeReason}
        </div>
      )}
    </div>
  );
}

function ToolBadge({ tool }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-12 font-medium bg-neutral-100 text-gray-900">
      <span className="w-2.5 h-2.5 rounded-sm bg-gray-900 text-white inline-flex items-center justify-center font-medium text-label-13">
        {(tool || '?')[0].toUpperCase()}
      </span>
      {tool}
    </span>
  );
}

export function ChatView({ conversations, activeConv, onSelectConv, onCreateConv, onEnsureConv, onUpdateConv, onDeleteConv }) {
  var [confirmDeleteId, setConfirmDeleteId] = React.useState(null);
  var [hoveredConvId, setHoveredConvId] = React.useState(null);
  var [text, setText] = React.useState('');
  var textRef = React.useRef('');
  var composerRef = React.useRef(null);
  var [busy, setBusy] = React.useState(false);
  var [activeAgent, setActiveAgent] = React.useState('auto');
  var [activeMCPAgent, setActiveMCPAgent] = React.useState(null);
  var [procSteps, setProcSteps] = React.useState([]);
  var logRef = React.useRef(null);
  var safetyRef = React.useRef(null);
  var clearProcRef = React.useRef(null);
  var busyRef = React.useRef(false);
  var [showMobileMenu, setShowMobileMenu] = React.useState(false);

  React.useEffect(function() { busyRef.current = busy; }, [busy]);

  React.useEffect(function() {
    if (logRef.current) logRef.current.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [activeConv && activeConv.messages && activeConv.messages.length, activeConv && activeConv.messages && activeConv.messages.length > 0 && activeConv.messages[activeConv.messages.length - 1].content]);

  function handleComposerClick(e) {
    if (composerRef.current && composerRef.current.contains(e.target)) return;
    if (composerRef.current) {
      var editable = composerRef.current.querySelector('[contentEditable="true"]');
      if (editable) editable.focus();
    }
  }

  function patchMsg(convId, msgId, patch) {
    onUpdateConv(convId, { messages: function(prevMsgs) {
      return prevMsgs.map(function(m) { return m.id === msgId ? Object.assign({}, m, patch) : m; });
    }});
  }

  function setStep(id, status) {
    setProcSteps(function(prev) {
      return prev.map(function(s) { return s.id === id ? Object.assign({}, s, { status: status }) : s; });
    });
  }

  function send(input) {
    var q = (input || textRef.current || '').trim();
    if (!q || busyRef.current) return;

    var mention = parseAgentMention(q);
    var mcpAgent = mention.agent;
    var cleanQ = mention.cleanText || q;
    if (mcpAgent) { setActiveMCPAgent(mcpAgent.id); q = cleanQ; }

    var conv = activeConv || (onEnsureConv && onEnsureConv());
    if (!conv) return;
    setBusy(true); setText(''); textRef.current = '';
    if (clearProcRef.current) clearTimeout(clearProcRef.current);

    var agentId = activeMCPAgent || (activeAgent === 'auto' ? B.getBestAgent(q) : activeAgent);
    var judgeReason = B.getJudgeReason(q, activeAgent === 'auto' ? B.getBestAgent(q) : activeAgent);
    var sector = activeMCPAgent ? 'MCP' : B.detectSector(q);
    var pickedAgent = activeMCPAgent ? { name: activeMCPAgent, ai: 'MCP Agent' } : agentById(agentId);

    setProcSteps([
      { id: 1, description: 'Sector: ' + sector, sub: 'Clasificando tu consulta', status: 'active' },
      { id: 2, description: 'IA: ' + pickedAgent.ai, sub: 'Agente ' + pickedAgent.name, status: 'pending' },
      { id: 3, description: 'Procesando', sub: 'Razonando + herramientas', status: 'pending' },
      { id: 4, description: 'Respuesta', sub: 'Redactando', status: 'pending' },
    ]);
    setTimeout(function() { setStep(1, 'done'); setStep(2, 'active'); }, 300);
    setTimeout(function() { setStep(2, 'done'); setStep(3, 'active'); }, 700);

    var title = conv.messages.length === 0 ? q.slice(0, 42) : conv.title;
    var userMsg = { id: Date.now(), role: 'user', content: q, timestamp: Date.now() };
    var aiMsg = { id: Date.now() + 1, role: 'assistant', content: '', status: 'thinking', agent: agentId, toolsUsed: [], judgeReason: judgeReason, sector: sector, startedAt: Date.now() };
    var newMessages = conv.messages.concat([userMsg, aiMsg]);
    onUpdateConv(conv.id, { messages: newMessages, title: title, agent: agentId });

    function finishProc(ok) {
      setStep(3, 'done'); setStep(4, ok ? 'done' : 'error');
      if (clearProcRef.current) clearTimeout(clearProcRef.current);
      clearProcRef.current = setTimeout(function() { setProcSteps([]); }, 1600);
    }

    safetyRef.current = setTimeout(function() {
      if (busyRef.current) {
        patchMsg(conv.id, aiMsg.id, { content: 'Tiempo de espera agotado (24s). Intenta de nuevo.', status: 'done' });
        finishProc(false); setBusy(false);
      }
    }, 24000);

    B.smartQuery(q, agentId).then(function(result) {
      if (safetyRef.current) clearTimeout(safetyRef.current);
      setStep(3, 'done'); setStep(4, 'active');
      if (result) {
        var processSteps = [
          { label: 'Sector', detail: result.sector || sector },
          { label: 'Agente', detail: (result.agentName || pickedAgent.name) + ' (' + (result.agentModel || pickedAgent.ai) + ')' },
          { label: 'Proveedor', detail: (result.provider || 'proxy') + ' - ' + (result.model || 'desconocido') },
          { label: 'Latencia', detail: (result.latencyMs || '?') + 'ms' },
        ];
        patchMsg(conv.id, aiMsg.id, {
          content: result.response || 'Completado.', status: 'done',
          toolsUsed: result.tools || [], judgeReason: result.judgeReason || judgeReason,
          sector: result.sector || sector, model: result.model || null,
          provider: result.provider || null, latencyMs: result.latencyMs || 0,
          processSteps: processSteps, finishedAt: Date.now(),
        });
      } else {
        patchMsg(conv.id, aiMsg.id, { content: 'No pude procesar eso.', status: 'done',
          processSteps: [{ label: 'Estado', detail: 'IA no disponible' }], finishedAt: Date.now() });
      }
      finishProc(true); setBusy(false);
    }).catch(function(err) {
      if (safetyRef.current) clearTimeout(safetyRef.current);
      patchMsg(conv.id, aiMsg.id, { content: 'Error: ' + ((err && err.message) || 'desconocido'), status: 'done',
        processSteps: [{ label: 'Error', detail: (err && err.message) || 'desconocido' }], finishedAt: Date.now() });
      finishProc(false); setBusy(false);
    });
  }

  var agent = agentById(activeAgent);
  var msgs = (activeConv && activeConv.messages) || [];
  var [googleOk, setGoogleOk] = React.useState(null);
  var [googleUser, setGoogleUser] = React.useState(null);
  var [googleError, setGoogleError] = React.useState(null);
  React.useEffect(function() { if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) { chrome.runtime.sendMessage({ type: 'X1_AUTH_CHECK_GOOGLE' }, function(r) { if (!chrome.runtime.lastError && r) { setGoogleOk(r.logged); if (r.user) setGoogleUser(r.user); } }); } }, []);

  return (
    <div className="flex h-full overflow-hidden bg-neutral-50">
      {/* ═══ SIDEBAR — v0: w-64, bg-neutral-50, border-r neutral-200 ═══ */}
      <div className="flex flex-col w-64 border-r border-neutral-200 flex-shrink-0 bg-neutral-50">
        {/* New conversation */}
        <div className="p-4 pb-3">
          <button onClick={onCreateConv} className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-button-14 font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 w-full">
            <Plus size={14} />
            Nueva conversacion
          </button>
        </div>
        {/* Conversation list */}
        <div className="flex-1 overflow-auto px-2 pb-2">
          {conversations.map(function(c) {
            var isActive = activeConv && activeConv.id === c.id;
            var msgCount = c.messages ? c.messages.length : 0;
            var lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
            var preview = lastMsg ? stripMarkdown(lastMsg.content).slice(0, 55) : 'Sin mensajes';
            var isConfirming = confirmDeleteId === c.id;
            var isHovered = hoveredConvId === c.id;
            return (
              <div key={c.id}
                onClick={function() { onSelectConv(c.id); }}
                onMouseEnter={function() { setHoveredConvId(c.id); }}
                onMouseLeave={function() { setHoveredConvId(null); }}
                className={"cursor-pointer rounded-md p-3 mb-0.5 transition-colors " + (isActive ? "bg-white shadow-sm" : "hover:bg-neutral-100")}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex-1 truncate text-sm font-medium text-gray-900">{c.title || 'Nueva conversacion'}</div>
                  {onDeleteConv && (isHovered || isConfirming) && (
<button
                      onClick={function(e) {
                        e.stopPropagation();
                        if (isConfirming) { onDeleteConv(c.id); setConfirmDeleteId(null); }
                        else { setConfirmDeleteId(c.id); }
                      }}
                      className={isConfirming ? "ml-1.5 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors bg-gray-900 text-white" : "ml-1.5 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors text-muted-foreground hover:text-gray-900"}
                    >
                      <Trash2 size={10} />
                      {isConfirming ? 'Eliminar' : null}
                    </button>
                  )}
                </div>
                <div className="truncate text-xs text-muted-foreground">{preview}</div>
                {msgCount > 0 && <span className="text-[11px] text-muted-foreground">{msgCount} msg</span>}
              </div>
            );
          })}
          {conversations.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">No hay conversaciones</div>
          )}
        </div>
      </div>

      {/* ═══ CHAT AREA ═══ */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* ── Header — v0: h-[50px], px-3, hairline-b ── */}
        <header className="relative z-20 flex w-full shrink-0 items-center justify-between px-3 h-[50px] border-b border-neutral-200 bg-white">
          <div className="flex min-w-0 items-center gap-2">
            <VektorLogo size={16} />
            <span className="text-label-12 text-muted-foreground">{agent.name}</span>
          </div>
          <div className="flex flex-1 items-center justify-end">
            <div className="hidden md:flex flex-1 items-center gap-4 justify-between">
              <nav className="flex items-center gap-1">
                {AGENTS.map(function(a) {
                  var isActive = activeAgent === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={function() { setActiveAgent(a.id); setActiveMCPAgent(null); }}
                      className={isActive
                        ? "inline-flex items-center justify-center rounded-md px-2 py-1 text-sm font-medium transition-colors bg-neutral-100 text-gray-900"
                        : "inline-flex items-center justify-center rounded-md px-2 py-1 text-sm font-medium transition-colors text-muted-foreground hover:bg-neutral-100 hover:text-gray-900"}
                    >
                      {a.name}
                    </button>
                  );
                })}
              </nav>
              <div className="flex items-center gap-2">
                <div
                  className="cursor-pointer rounded-md p-1.5 transition-colors hover:bg-neutral-100"
                  onClick={googleOk ? null : async function() { var r = await B.loginGoogle(); if (r) { setGoogleOk(true); setGoogleUser({email:r.email,name:r.name,picture:r.picture}); } }}
                  title={googleOk && googleUser ? googleUser.email : 'Conectar Google'}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill={googleOk ? '#28a948' : 'currentColor'} className="text-muted-foreground">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </div>
              </div>
            </div>
            <button
              className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-neutral-100"
              onClick={function() { setShowMobileMenu(!showMobileMenu); }}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        {googleError && (
          <div className="border-b border-neutral-200 bg-red-500/10 px-5 py-1.5 text-xs text-red-600">{googleError}</div>
        )}

        {/* ── Messages — v0: centered, gap-16 lg:gap-32 ── */}
        <div ref={logRef} className="relative flex min-w-0 flex-1 flex-col overflow-y-auto bg-neutral-50">
          <div className="@container/page-layout relative mt-0">
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8">
              {msgs.length === 0 ? (
                <main className="z-0 flex w-full flex-col sm:px-6 px-3 gap-16 lg:gap-32">
                  <div className="-mt-8 lg:-mt-12 relative mx-auto flex w-full flex-col gap-4 min-h-[156.5px] md:min-h-[164.5px] pt-32 lg:pt-48">
                    <h1 className="text-center text-gray-900 text-heading-24 md:text-heading-32 text-balance">Vektor</h1>
                    <div className="group/form-container content-center relative mx-auto w-full max-w-[690px]">
                      <div className="text-center text-copy-14 text-muted-foreground">
                        Preguntame lo que quieras. Usa <span className="font-mono font-semibold text-gray-900">#</span> para agentes especializados.
                      </div>
                    </div>
                  </div>
                </main>
              ) : (
                <div className="flex w-full flex-col items-center" style={{ padding: '32px 24px 120px' }}>
                  <div className="flex w-full max-w-2xl flex-col gap-16">
                    {msgs.map(function(m) {
                      var mAgent = agentById(m.agent || 'research');
                      var elapsed = m.finishedAt && m.startedAt ? Math.round((m.finishedAt - m.startedAt) / 100) / 10 : null;
                      return (
                        <div key={m.id} className="flex flex-col">
                          {m.role === 'user' ? (
                            <div className="flex justify-end">
                              <div className="max-w-2xl rounded-xl bg-gray-900 text-white px-5 py-3 text-label-14 whitespace-pre-wrap break-words" style={{ lineHeight: '20px' }}>
                                {m.content}
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-3">
                              <VektorAvatar size={24} />
                              <div className="min-w-0 flex-1">
                                <div className="mb-1.5 flex items-center gap-2">
                                  <span className="text-label-14 font-semibold text-gray-900">{mAgent.name}</span>
                                  <span className="text-label-12 text-muted-foreground">{mAgent.ai}</span>
                                  {elapsed != null && <span className="text-label-12 text-muted-foreground">{elapsed}s</span>}
                                </div>
                                {m.status === 'thinking' ? (
                                  <ThinkingDots />
                                ) : m.status === 'done' && m.content ? (
                                  <div>
                                    <ReasoningPanel msg={m} />
                                    <div className="text-copy-14 text-gray-900" style={{ lineHeight: '22px' }}>
                                      <Markdown text={m.content} />
                                    </div>
                                    {m.toolsUsed && m.toolsUsed.length > 0 && (
                                      <div className="mt-3 flex flex-wrap gap-1.5">
                                        {m.toolsUsed.map(function(tool) { return <ToolBadge key={tool} tool={tool} />; })}
                                      </div>
                                    )}
                                    {m.processSteps && m.processSteps.length > 0 && (
                                      <div className="mt-4">
                                        <ProcessTask
                                          steps={m.processSteps.map(function(ps, i) {
                                            return {
                                              id: i, status: ps.status || 'done',
                                              description: ps.label || ps.description || 'Procesando',
                                              sub: ps.sector || ps.category || null,
                                              details: ps.detail || null,
                                              startedAt: ps.startedAt || null, finishedAt: ps.finishedAt || null,
                                            };
                                          })}
                                          isRunning={m.status === 'thinking'}
                                          title="Procedimiento de ejecucion"
                                        />
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ COMPOSER — v0: rounded-xl, material-medium, bg-neutral-100, border-neutral-300 ═══ */}
        <div className="relative flex w-full flex-col items-center bg-neutral-50" style={{ padding: '0 16px 16px' }}>
          <div
            ref={composerRef}
            onClick={handleComposerClick}
            className="@container/composer z-20 relative rounded-xl overflow-visible cursor-text p-3 w-full max-w-2xl"
            style={{
              background: 'oklch(0.97 0 0)',
              border: '1px solid oklch(0.922 0 0)',
              minHeight: 108,
              transition: 'border-color 200ms cubic-bezier(0.31, 0.1, 0.08, 0.96)',
              boxShadow: '0 4px 8px -2px rgba(0,0,0,.06), 0 2px 4px -2px rgba(0,0,0,.04), 0 0 0 1px rgba(0,0,0,.04)',
            }}
          >
            {activeMCPAgent && (
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2.5 py-1 text-xs text-gray-900">
                <span className="font-semibold">#</span>
                <span>{(MCP_AGENTS.find(function(a){return a.id===activeMCPAgent})||{}).name}</span>
                <button onClick={function(e) { e.stopPropagation(); setActiveMCPAgent(null); }} className="ml-0.5 border-none bg-transparent text-muted-foreground cursor-pointer text-xs">x</button>
              </div>
            )}
            <div
              contentEditable={true}
              role="textbox"
              aria-multiline={true}
              data-prompt-text={text}
              data-placeholder={activeMCPAgent ? 'MCP: ' + (MCP_AGENTS.find(function(a){return a.id===activeMCPAgent})||{}).name + '\u2026' : 'Escribe tu pregunta\u2026'}
              className="max-h-[330px] w-full overflow-y-auto bg-transparent text-label-14 border-none outline-none pb-2 min-h-[54px]"
              style={{
                fontFamily: 'inherit',
                letterSpacing: '-0.011em',
                fontVariantLigatures: 'none',
                fontFeatureSettings: '"liga" 0',
                color: 'oklch(0.145 0 0)',
              }}
              onInput={function(e) {
                var val = e.target.textContent || '';
                setText(val);
                textRef.current = val;
              }}
              onKeyDown={function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              dangerouslySetInnerHTML={{ __html: text }}
            />
            <div className="flex items-center justify-between">
              <button className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-neutral-200 transition-colors" title="Adjuntar">
                <Paperclip size={16} />
              </button>
<button
                onClick={function() { send(); }}
                disabled={!text.trim() || busy}
                className="inline-flex items-center justify-center rounded-full bg-gray-900 text-white transition-colors disabled:bg-neutral-300 disabled:text-neutral-500"
                style={{ width: 32, height: 32, border: 'none', cursor: text.trim() && !busy ? 'pointer' : 'not-allowed' }}
                title="Enviar"
              >
                <ArrowUp size={16} />
              </button>
            </div>
          </div>

          {/* Agent pills — v0: pills with proper styling */}
          <div className="mt-3 flex flex-wrap items-center justify-center" style={{ gap: 6 }}>
            {AGENTS.map(function(a) {
              var isActive = activeAgent === a.id;
              return (
                <button
                  key={a.id}
                  onClick={function() { setActiveAgent(a.id); setActiveMCPAgent(null); }}
                  className={isActive
                    ? "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors bg-gray-900 text-white"
                    : "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors bg-neutral-100 text-gray-900 hover:bg-neutral-200"}
                >
                  {a.name}
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-center text-label-12 text-muted-foreground">
            Usa <span className="font-mono font-semibold text-gray-900">#</span> para agentes especializados
          </div>
        </div>
      </div>
    </div>
  );
}