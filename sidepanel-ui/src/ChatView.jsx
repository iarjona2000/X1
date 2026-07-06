import * as React from 'react';
import * as B from './backend.js';
import { ProcessTimeline } from './ProcessTimeline.jsx';
import { Markdown } from './Markdown.jsx';

const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";
const C = {
  border: '#d0d7de', borderSubtle: '#d8dee4', bg: '#ffffff', bgSubtle: '#f6f8fa',
  fg: '#1f2328', fgMuted: '#59636e', fgSubtle: '#818b98', fgAccent: '#0969da',
  fgSuccess: '#1a7f37', fgDanger: '#d1242f', fgAttention: '#bf8700',
  accentUnderline: '#fd8c73',
};

function timeAgo(ts) {
  var d = Date.now() - ts;
  if (d < 60000) return 'ahora';
  if (d < 3600000) return Math.floor(d / 60000) + 'm';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h';
  return Math.floor(d / 86400000) + 'd';
}

const AGENTS = [
  { id: 'auto',      name: 'AUTO',      ai: 'Automatico', letter: 'A', color: '#0969da', aiIcon: 'dist/x1-logo.png' },
  { id: 'research',  name: 'Research',  ai: 'Gemini',    letter: 'R', color: '#4285f4', aiIcon: '../assets/ai/googlegemini.svg' },
  { id: 'writer',    name: 'Writer',    ai: 'Claude',    letter: 'W', color: '#d97706', aiIcon: '../assets/ai/anthropic.svg' },
  { id: 'developer', name: 'Developer', ai: 'GPT-4o',    letter: 'D', color: '#10a37f', aiIcon: '../assets/ai/openai.svg' },
  { id: 'marketing', name: 'Marketing', ai: 'Gemini',    letter: 'M', color: '#4285f4', aiIcon: '../assets/ai/googlegemini.svg' },
  { id: 'finance',   name: 'Finance',   ai: 'Claude',    letter: 'F', color: '#d97706', aiIcon: '../assets/ai/anthropic.svg' },
  { id: 'legal',     name: 'Legal',     ai: 'Mistral',   letter: 'L', color: '#ff7000', aiIcon: '../assets/ai/mistralai.svg' },
  { id: 'email',     name: 'Email',     ai: 'Llama',      letter: 'E', color: '#0668e1', aiIcon: '../assets/ai/meta.svg' },
  { id: 'meeting',   name: 'Meeting',   ai: 'Gemini',    letter: 'G', color: '#4285f4', aiIcon: '../assets/ai/googlegemini.svg' },
];

function agentById(id) {
  return AGENTS.find(function(a) { return a.id === id; }) || AGENTS[0];
}

function AgentAvatar({ agent, size }) {
  size = size || 20;
  if (agent.aiIcon) {
    return React.createElement('img', {
      src: agent.aiIcon, alt: '',
      style: { width: size, height: size, borderRadius: '4px', objectFit: 'contain', flexShrink: 0 },
      onError: function(e) { e.currentTarget.style.display = 'none'; }
    });
  }
  return React.createElement('div', {
    style: {
      width: size, height: size, borderRadius: '4px',
      background: agent.color || '#0969da', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.55, fontWeight: '600', flexShrink: 0,
    }
  }, agent.letter);
}

function ToolIcon({ tool, size }) {
  size = size || 12;
  var colors = { github: '#1f2328', npm: '#cb3837', stackoverflow: '#f48024', web: '#de5833' };
  var letters = { github: 'G', npm: 'N', stackoverflow: 'S', web: 'W' };
  return React.createElement('div', {
    style: {
      width: size, height: size, borderRadius: '3px',
      background: colors[tool] || '#656d76', color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.5, fontWeight: '700', flexShrink: 0,
    }
  }, letters[tool] || '?');
}

const QUICK = [
  { label: 'Resumir',    prompt: 'Resume la pagina que tengo abierta' },
  { label: 'Investigar', prompt: 'Investiga sobre esta pagina' },
  { label: 'Codigo',     prompt: 'Escribe codigo para esto' },
  { label: 'Email',      prompt: 'Redacta un email profesional' },
];

export function ChatView({ conversations, activeConv, onSelectConv, onCreateConv, onEnsureConv, onUpdateConv }) {
  const [text, setText] = React.useState('');
  const textRef = React.useRef('');
  const taRef = React.useRef(null);
  const [busy, setBusy] = React.useState(false);
  const [activeAgent, setActiveAgent] = React.useState('auto');
  const [agentMenu, setAgentMenu] = React.useState(false);
  const [procSteps, setProcSteps] = React.useState([]);
  const logRef = React.useRef(null);
  const safetyRef = React.useRef(null);
  const clearProcRef = React.useRef(null);
  const busyRef = React.useRef(false);

  React.useEffect(function() { busyRef.current = busy; }, [busy]);

  // Auto-scroll suave al ultimo mensaje cuando llega.
  React.useEffect(function() {
    if (logRef.current) {
      logRef.current.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [activeConv && activeConv.messages && activeConv.messages.length, activeConv && activeConv.messages && activeConv.messages.length > 0 && activeConv.messages[activeConv.messages.length - 1].content]);

  // Auto-resize del textarea segun contenido.
  React.useEffect(function() {
    if (!taRef.current) return;
    var ta = taRef.current;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

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
    var q = (input || textRef.current).trim();
    if (!q || busyRef.current) return;
    var conv = activeConv || (onEnsureConv && onEnsureConv());
    if (!conv) return;
    setBusy(true); setText(''); textRef.current = '';
    if (taRef.current) taRef.current.style.height = 'auto';
    if (clearProcRef.current) clearTimeout(clearProcRef.current);

    var agentId = activeAgent === 'auto' ? B.getBestAgent(q) : activeAgent;
    var judgeReason = B.getJudgeReason(q, agentId);
    var sector = B.detectSector(q);
    var pickedAgent = agentById(agentId);

    // Timeline del proceso: sector -> IA -> tools -> respuesta
    var aiIcon = pickedAgent.aiIcon;
    setProcSteps([
      { id: 1, iconSrc: aiIcon, description: 'Sector: ' + sector,            sub: 'Clasificando tu consulta',   status: 'active' },
      { id: 2, iconSrc: aiIcon, description: 'IA: ' + pickedAgent.ai,         sub: 'Agente ' + pickedAgent.name,   status: 'pending' },
      { id: 3, iconSrc: aiIcon, description: 'Procesando',                    sub: 'Razonando + herramientas',     status: 'pending' },
      { id: 4, iconSrc: aiIcon, description: 'Respuesta',                     sub: 'Redactando',                  status: 'pending' },
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
        finishProc(false);
        setBusy(false);
      }
    }, 24000);

    B.smartQuery(q, agentId).then(function(result) {
      if (safetyRef.current) clearTimeout(safetyRef.current);
      setStep(3, 'done'); setStep(4, 'active');
      if (result) {
        var processSteps = [
          { icon: 'sector', label: 'Sector',       detail: result.sector || sector },
          { icon: 'agent',  label: 'Agente',        detail: (result.agentName || pickedAgent.name) + ' (' + (result.agentModel || pickedAgent.ai) + ')' },
          { icon: 'repo',   label: 'Repo Open-Source', detail: result.agentRepo || pickedAgent.repo || '' },
          { icon: 'ai',     label: 'Proveedor',     detail: (result.provider || 'proxy') + ' - ' + (result.model || 'desconocido') },
          { icon: 'clock',  label: 'Latencia',      detail: (result.latencyMs || '?') + 'ms' },
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
          processSteps: [{ icon: 'error', label: 'Estado', detail: 'IA no disponible' }], finishedAt: Date.now() });
      }
      finishProc(true); setBusy(false);
    }).catch(function(err) {
      if (safetyRef.current) clearTimeout(safetyRef.current);
      patchMsg(conv.id, aiMsg.id, { content: 'Error: ' + ((err && err.message) || 'desconocido'), status: 'done',
        processSteps: [{ icon: 'error', label: 'Error', detail: (err && err.message) || 'desconocido' }], finishedAt: Date.now() });
      finishProc(false); setBusy(false);
    });
  }

  var agent = agentById(activeAgent);
  var msgs = (activeConv && activeConv.messages) || [];
  var [googleOk, setGoogleOk] = React.useState(null);
  var [googleUser, setGoogleUser] = React.useState(null);
  var [googleError, setGoogleError] = React.useState(null);
  var [showGoogleMenu, setShowGoogleMenu] = React.useState(false);
  var [googleLoading, setGoogleLoading] = React.useState(false);
  React.useEffect(function() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'X1_AUTH_CHECK_GOOGLE' }, function(r) {
        if (!chrome.runtime.lastError && r) {
          setGoogleOk(r.logged);
          if (r.user) setGoogleUser(r.user);
        } else {
          setGoogleOk(false);
        }
      });
    } else {
      setGoogleOk(false);
    }
  }, []);

  // Panel de razonamiento del juez (estilo "Thinking" de Claude/o1).
  function ReasoningPanel({ msg }) {
    if (!msg.judgeReason) return null;
    return React.createElement('div', {
      style: {
        marginBottom: '10px',
        background: '#f6f8fa',
        border: '1px solid #d0d7de',
        borderRadius: '6px',
        padding: '10px 12px',
        fontSize: '12px',
        color: '#59636e',
        lineHeight: '1.6',
        fontFamily: F,
      }
    },
      React.createElement('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: '6px',
          marginBottom: '6px', paddingBottom: '6px',
          borderBottom: '1px solid #d8dee4',
        }
      },
        React.createElement('svg', { viewBox: '0 0 16 16', width: '13', height: '13', fill: '#59636e' },
          React.createElement('path', { d: 'M8 0a8 8 0 110 16A8 8 0 018 0zM1.5 8a6.5 6.5 0 1013 0 6.5 6.5 0 00-13 0zm6.25-3.25v2.992l2.028.812a.75.75 0 01-.557 1.392l-2.5-1A.751.751 0 017.25 8.25v-3.5a.75.75 0 011.5 0z' })
        ),
        React.createElement('span', {
          style: { fontWeight: '600', color: '#1f2328', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }
        }, 'Razonamiento'),
        msg.sector && React.createElement('span', {
          style: {
            fontSize: '10px', padding: '1px 8px', borderRadius: '999px',
            background: '#ddf4ff', color: '#0969da', fontWeight: '600',
          }
        }, msg.sector)
      ),
      React.createElement('div', { style: { fontSize: '12px', color: '#59636e' } }, msg.judgeReason)
    );
  }

  // Indicador "Pensando..." con 3 puntos animados.
  function ThinkingDots() {
    return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' } },
      React.createElement('div', { style: { display: 'flex', gap: '4px' } },
        React.createElement('span', { style: { width: '6px', height: '6px', borderRadius: '50%', background: '#0969da', animation: 'pulse 1s infinite' } }),
        React.createElement('span', { style: { width: '6px', height: '6px', borderRadius: '50%', background: '#0969da', animation: 'pulse 1s infinite 0.2s' } }),
        React.createElement('span', { style: { width: '6px', height: '6px', borderRadius: '50%', background: '#0969da', animation: 'pulse 1s infinite 0.4s' } })
      ),
      React.createElement('span', { style: { fontSize: '12px', color: '#818b98', fontFamily: F } }, 'Pensando...')
    );
  }

  return React.createElement('div', { style: { display: 'flex', flex: 1, overflow: 'hidden', fontFamily: F } },

    // Sidebar conversaciones (260px, GitHub Primer)
    React.createElement('div', { style: { width: '260px', borderRight: '1px solid #d0d7de', display: 'flex', flexDirection: 'column', background: '#f6f8fa' } },
      React.createElement('div', { style: { padding: '12px', borderBottom: '1px solid #d0d7de' } },
        React.createElement('button', {
          onClick: onCreateConv,
          style: {
            width: '100%', padding: '6px 12px', borderRadius: '6px',
            border: '1px solid rgba(27,31,36,0.15)', background: '#2da44e', color: '#ffffff',
            fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: F,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
          }
        }, '+ Nueva conversacion')
      ),
      React.createElement('div', { style: { flex: 1, overflow: 'auto', padding: '6px 8px' } },
        conversations.map(function(c) {
          var isActive = activeConv && activeConv.id === c.id;
          var msgCount = c.messages ? c.messages.length : 0;
          var lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
          var preview = lastMsg ? (lastMsg.content || '').slice(0, 60) : 'Sin mensajes';
          var cAgent = agentById(c.agent || 'research');
          return React.createElement('div', {
            key: c.id, onClick: function() { onSelectConv(c.id); },
            style: {
              padding: '10px 12px', borderRadius: '6px', cursor: 'pointer', marginBottom: '4px',
              background: isActive ? '#ddf4ff' : 'transparent',
              border: isActive ? '1px solid rgba(9,105,218,0.2)' : '1px solid transparent',
              transition: 'all 80ms',
            },
            onMouseEnter: function(e) { if (!isActive) e.currentTarget.style.background = '#eaeef2'; },
            onMouseLeave: function(e) { if (!isActive) e.currentTarget.style.background = 'transparent'; },
          },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' } },
              React.createElement('div', { style: { fontSize: '13px', fontWeight: isActive ? '600' : '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isActive ? '#1f2328' : '#24292f', flex: 1 } }, c.title || 'Nueva conversacion'),
              React.createElement('span', { style: { fontSize: '11px', color: '#818b98', flexShrink: 0, marginLeft: '6px' } }, timeAgo(c.updatedAt || c.createdAt))
            ),
            React.createElement('div', { style: { fontSize: '12px', color: '#59636e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, preview),
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' } },
              msgCount > 0 && React.createElement('span', { style: { fontSize: '11px', color: '#818b98' } }, msgCount + ' msg'),
              React.createElement('span', {
                style: {
                  fontSize: '10px', padding: '1px 6px', borderRadius: '999px',
                  background: '#ddf4ff', color: '#0969da', fontWeight: '500',
                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                }
              }, cAgent.name)
            )
          );
        }),
        conversations.length === 0 && React.createElement('div', { style: { padding: '24px 16px', textAlign: 'center', color: '#818b98', fontSize: '12px' } },
          React.createElement('svg', { viewBox: '0 0 16 16', width: '22', height: '22', fill: '#afb8c1', style: { marginBottom: '8px' } },
            React.createElement('path', { d: 'M1.75 1h8.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 10.25 10H7.061l-2.574 2.573A1.458 1.458 0 0 1 2 11.543V10h-.25A1.75 1.75 0 0 1 0 8.25v-5.5C0 1.784.784 1 1.75 1ZM1.5 2.75v5.5c0 .138.112.25.25.25h1a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h3.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25Z' })
          ),
          React.createElement('div', null, 'No hay conversaciones')
        )
      )
    ),

    // Chat area
    React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 } },

      // Header con selector de agente (UnderlineNav style)
      React.createElement('div', { style: { padding: '8px 16px', borderBottom: '1px solid #d0d7de', display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff' } },
        React.createElement('div', { style: { position: 'relative' } },
          React.createElement('button', {
            onClick: function() { setAgentMenu(function(v) { return !v; }); },
            style: {
              display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
              background: '#f6f8fa', border: '1px solid #d0d7de', borderRadius: '6px',
              fontSize: '13px', cursor: 'pointer', transition: 'border-color 80ms', fontFamily: F,
            },
            onMouseEnter: function(e) { e.currentTarget.style.borderColor = '#0969da'; },
            onMouseLeave: function(e) { e.currentTarget.style.borderColor = '#d0d7de'; },
          },
            React.createElement(AgentAvatar, { agent: agent, size: 16 }),
            React.createElement('span', { style: { fontWeight: '600', color: '#1f2328' } }, agent.name),
            React.createElement('span', { style: { color: '#59636e', fontSize: '12px' } }, agent.ai),
            React.createElement('svg', { viewBox: '0 0 16 16', width: '12', height: '12', fill: '#59636e' },
              React.createElement('path', { d: 'M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z' })
            )
          ),
          agentMenu && React.createElement('div', {
            style: {
              position: 'absolute', top: '100%', left: 0, zIndex: 30, marginTop: '4px',
              minWidth: '210px', background: '#ffffff', border: '1px solid #d0d7de',
              borderRadius: '6px', boxShadow: '0 8px 24px rgba(140,149,159,0.2)', padding: '4px',
            }
          },
            AGENTS.map(function(a) {
              var isActive = activeAgent === a.id;
              return React.createElement('div', {
                key: a.id,
                onClick: function() { setActiveAgent(a.id); setAgentMenu(false); },
                style: {
                  padding: '6px 8px', borderRadius: '4px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: isActive ? '#ddf4ff' : 'transparent',
                  transition: 'background 80ms',
                },
                onMouseEnter: function(e) { if (!isActive) e.currentTarget.style.background = '#eaeef2'; },
                onMouseLeave: function(e) { if (!isActive) e.currentTarget.style.background = isActive ? '#ddf4ff' : 'transparent'; },
              },
                React.createElement(AgentAvatar, { agent: a, size: 22 }),
                React.createElement('div', { style: { flex: 1 } },
                  React.createElement('div', { style: { fontSize: '13px', fontWeight: '600', color: '#1f2328' } }, a.name),
                  React.createElement('div', { style: { fontSize: '11px', color: '#59636e' } }, a.ai)
                ),
                isActive && React.createElement('svg', { viewBox: '0 0 16 16', width: '14', height: '14', fill: '#0969da' },
                  React.createElement('path', { d: 'M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z' })
                )
              );
            })
          )
        ),
        React.createElement('div', { style: { flex: 1 } }),
        React.createElement('span', { style: { fontSize: '12px', color: '#818b98', fontWeight: '500' } }, 'System X1'),
        React.createElement('div', { style: { position: 'relative' } },
          googleOk === false && !googleLoading ? React.createElement('button', {
            onClick: async function() {
              setGoogleError(null);
              setGoogleLoading(true);
              var r = await B.loginGoogle();
              setGoogleLoading(false);
              if (r) { setGoogleOk(true); setGoogleUser({email:r.email,name:r.name,picture:r.picture}); }
              else { setGoogleError('No se pudo conectar. Prueba de nuevo.'); setTimeout(function() { setGoogleError(null); }, 8000); }
            },
            style: {
              display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px',
              background: '#ffffff', border: '1px solid #dadce0', borderRadius: '20px',
              fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: F,
              color: '#3c4043', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              transition: 'all 80ms',
            },
            onMouseEnter: function(e) { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)'; },
            onMouseLeave: function(e) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; },
          },
            React.createElement('svg', { viewBox: '0 0 48 48', width: '18', height: '18' },
              React.createElement('path', { fill: '#EA4335', d: 'M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z' }),
              React.createElement('path', { fill: '#4285F4', d: 'M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z' }),
              React.createElement('path', { fill: '#FBBC05', d: 'M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.87 7.35 2.56 10.56l7.97-5.97z' }),
              React.createElement('path', { fill: '#34A853', d: 'M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z' }),
              React.createElement('path', { fill: 'none', d: 'M0 0h48v48H0z' })
            ),
            googleLoading ? 'Conectando...' : 'Iniciar sesión con Google'
          ) : googleLoading ? React.createElement('button', {
            style: {
              display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px',
              background: '#ffffff', border: '1px solid #dadce0', borderRadius: '20px',
              fontSize: '13px', fontWeight: '500', cursor: 'default', fontFamily: F,
              color: '#80868b', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }
          },
            React.createElement('div', { style: { width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #dadce0', borderTopColor: '#4285f4', animation: 'spin 0.8s linear infinite' } }),
            'Conectando con Google...'
          ) : React.createElement('div', {
            style: {
              display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '2px 6px',
              borderRadius: '6px', background: '#f0fff4',
              border: '1px solid #b7e1c0',
              transition: 'all 80ms',
            },
            onClick: function() { setShowGoogleMenu(function(v) { return !v; }); setGoogleError(null); },
            title: googleUser ? googleUser.email : 'Google conectado',
            onMouseEnter: function(e) { e.currentTarget.style.borderColor = '#b7e1c0'; },
            onMouseLeave: function(e) { e.currentTarget.style.borderColor = '#b7e1c0'; },
          },
            googleUser && googleUser.picture ?
              React.createElement('img', { src: googleUser.picture, alt: '', style: { width: '18px', height: '18px', borderRadius: '50%' }, onError: function(e) { e.currentTarget.style.display = 'none'; } })
            :
              React.createElement('svg', { viewBox: '0 0 24 24', width: '16', height: '16', fill: googleOk === true ? '#1a7f37' : googleOk === false ? '#818b98' : '#d0d7de' },
                React.createElement('path', { d: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z', fill: googleOk === true ? '#34A853' : '#818b98' }),
                React.createElement('path', { d: 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z', fill: googleOk === true ? '#4285F4' : '#818b98' }),
                React.createElement('path', { d: 'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z', fill: googleOk === true ? '#FBBC05' : '#818b98' }),
                React.createElement('path', { d: 'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z', fill: googleOk === true ? '#EA4335' : '#818b98' })
              ),
            googleUser && React.createElement('span', { style: { fontSize: '11px', color: '#1a7f37', fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, googleUser.name || googleUser.email),
            React.createElement('svg', { viewBox: '0 0 16 16', width: '10', height: '10', fill: '#1a7f37' },
              React.createElement('path', { d: 'M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z' })
            )
          ),
          showGoogleMenu && googleOk && React.createElement('div', {
            style: {
              position: 'absolute', top: '100%', right: 0, zIndex: 30, marginTop: '4px',
              width: '220px', background: '#ffffff', border: '1px solid #d0d7de',
              borderRadius: '6px', boxShadow: '0 8px 24px rgba(140,149,159,0.2)', padding: '8px',
            }
          },
            googleUser && React.createElement('div', { style: { padding: '6px 8px', borderBottom: '1px solid #d8dee4', marginBottom: '6px' } },
              googleUser.picture && React.createElement('img', { src: googleUser.picture, alt: '', style: { width: '32px', height: '32px', borderRadius: '50%', marginBottom: '4px' }, onError: function(e) { e.currentTarget.style.display = 'none'; } }),
              React.createElement('div', { style: { fontSize: '13px', fontWeight: '600', color: '#1f2328' } }, googleUser.name || 'Google'),
              React.createElement('div', { style: { fontSize: '11px', color: '#59636e' } }, googleUser.email)
            ),
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', fontSize: '12px', color: '#1f2328' } },
                React.createElement('svg', { viewBox: '0 0 16 16', width: '14', height: '14', fill: '#1a7f37' }, React.createElement('path', { d: 'M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z' })),
                React.createElement('span', { style: { flex: 1 } }, 'Gmail'),
                React.createElement('span', { style: { color: '#1a7f37', fontWeight: 500 } }, 'Conectado')
              ),
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', fontSize: '12px', color: '#1f2328' } },
                React.createElement('svg', { viewBox: '0 0 16 16', width: '14', height: '14', fill: '#1a7f37' }, React.createElement('path', { d: 'M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z' })),
                React.createElement('span', { style: { flex: 1 } }, 'Calendar'),
                React.createElement('span', { style: { color: '#1a7f37', fontWeight: 500 } }, 'Conectado')
              ),
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', fontSize: '12px', color: '#1f2328' } },
                React.createElement('svg', { viewBox: '0 0 16 16', width: '14', height: '14', fill: '#1a7f37' }, React.createElement('path', { d: 'M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z' })),
                React.createElement('span', { style: { flex: 1 } }, 'Sheets'),
                React.createElement('span', { style: { color: '#1a7f37', fontWeight: 500 } }, 'Conectado')
              ),
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', fontSize: '12px', color: '#1f2328' } },
                React.createElement('svg', { viewBox: '0 0 16 16', width: '14', height: '14', fill: '#1a7f37' }, React.createElement('path', { d: 'M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z' })),
                React.createElement('span', { style: { flex: 1 } }, 'Docs'),
                React.createElement('span', { style: { color: '#1a7f37', fontWeight: 500 } }, 'Conectado')
              )
            ),
            React.createElement('div', { style: { borderTop: '1px solid #d8dee4', marginTop: '8px', paddingTop: '6px' } },
              React.createElement('button', {
                onClick: async function() { await B.logoutGoogle(); setGoogleOk(false); setGoogleUser(null); setShowGoogleMenu(false); },
                style: { width: '100%', padding: '4px 8px', border: 'none', background: 'transparent', fontSize: '12px', color: '#d1242f', cursor: 'pointer', textAlign: 'left', borderRadius: '4px' },
                onMouseEnter: function(e) { e.currentTarget.style.background = '#f6f8fa'; },
                onMouseLeave: function(e) { e.currentTarget.style.background = 'transparent'; },
              }, 'Desconectar Google')
            )
          )
        )
      ),

      googleError ? React.createElement('div', { style: { padding: '6px 20px', background: '#fff0ee', color: '#d1242f', fontSize: '12px', borderBottom: '1px solid #ffc2c2', fontFamily: F } }, googleError) : null,

      // Mensajes (ProcessTimeline eliminado de aqui, ahora por cada respuesta abajo)
      React.createElement('div', { ref: logRef, style: { flex: 1, overflow: 'auto', padding: '20px' } },
        msgs.length === 0 && googleOk === false ?
          React.createElement('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0' } },
            React.createElement('div', { style: { width: '75px', height: '75px', marginBottom: '24px' } },
              React.createElement('svg', { viewBox: '0 0 48 48', width: '75', height: '75' },
                React.createElement('path', { fill: '#EA4335', d: 'M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z' }),
                React.createElement('path', { fill: '#4285F4', d: 'M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z' }),
                React.createElement('path', { fill: '#FBBC05', d: 'M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.87 7.35 2.56 10.56l7.97-5.97z' }),
                React.createElement('path', { fill: '#34A853', d: 'M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z' })
              )
            ),
            React.createElement('div', { style: { fontSize: '24px', fontWeight: '400', color: '#202124', fontFamily: 'Google Sans, sans-serif', marginBottom: '8px' } }, 'Iniciar sesión'),
            React.createElement('div', { style: { fontSize: '14px', color: '#5f6368', fontFamily: F, marginBottom: '28px', textAlign: 'center', maxWidth: '280px', lineHeight: '1.5' } },
              'Usa tu cuenta de Google para activar Gmail, Calendar y Sheets en X1'
            ),
            React.createElement('div', { style: { width: '100%', maxWidth: '320px', marginBottom: '16px' } },
              React.createElement('div', { style: {
                border: '1px solid #dadce0', borderRadius: '4px', padding: '13px 15px',
                fontSize: '14px', color: '#202124', fontFamily: F, background: '#f8f9fa',
                display: 'flex', alignItems: 'center', gap: '10px',
              } },
                React.createElement('div', { style: { width: '20px', height: '20px', borderRadius: '50%', background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                  React.createElement('svg', { viewBox: '0 0 24 24', width: '12', height: '12', fill: '#4285f4' },
                    React.createElement('path', { d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10h5v-2h-5c-4.34 0-8-3.66-8-8s3.66-8 8-8 8 3.66 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57V12c0-2.76-2.24-5-5-5s-5 2.24-5 5 2.24 5 5 5c1.38 0 2.64-.56 3.54-1.47.65.89 1.77 1.47 2.96 1.47 1.97 0 3.5-1.6 3.5-3.57V12c0-5.52-4.48-10-10-10zm0 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z' })
                  )
                ),
                React.createElement('span', { style: { color: '#5f6368' } }, 'tucuenta@gmail.com')
              )
            ),
            React.createElement('button', {
              onClick: async function() {
                setGoogleError(null);
                setGoogleLoading(true);
                var r = await B.loginGoogle();
                setGoogleLoading(false);
                if (r) { setGoogleOk(true); setGoogleUser({email:r.email,name:r.name,picture:r.picture}); }
                else { setGoogleError('No se pudo conectar. Asegurate de que Google Cloud Console tenga configurado el redirect URI.'); }
              },
              disabled: googleLoading,
              style: {
                padding: '9px 24px', borderRadius: '4px', border: 'none',
                background: googleLoading ? '#f1f3f4' : '#1a73e8',
                color: googleLoading ? '#80868b' : '#ffffff',
                fontSize: '14px', fontWeight: '500', cursor: googleLoading ? 'default' : 'pointer',
                fontFamily: 'Google Sans, sans-serif', letterSpacing: '0.25px',
                transition: 'all 80ms', boxShadow: googleLoading ? 'none' : '0 1px 3px rgba(26,115,232,0.3)',
              },
              onMouseEnter: function(e) { if (!googleLoading) { e.currentTarget.style.background = '#1b66c9'; e.currentTarget.style.boxShadow = '0 1px 5px rgba(26,115,232,0.4)'; } },
              onMouseLeave: function(e) { if (!googleLoading) { e.currentTarget.style.background = '#1a73e8'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(26,115,232,0.3)'; } },
            }, googleLoading ? 'Conectando...' : 'Iniciar sesión con Google'),
            React.createElement('div', { style: { marginTop: '32px', fontSize: '12px', color: '#5f6368', fontFamily: F, textAlign: 'center', maxWidth: '280px', lineHeight: '1.5' } },
              'Al iniciar sesión, X1 podrá acceder a tu Gmail, Calendar, Sheets y Docs.'
            ),
            React.createElement('div', { style: { marginTop: '24px', display: 'flex', gap: '24px', fontSize: '12px', color: '#5f6368', fontFamily: F } },
              React.createElement('a', { href: '#', style: { color: '#1a73e8', textDecoration: 'none' }, onClick: function(e) { e.preventDefault(); B.loginGoogle().then(function(r) { if (r) { setGoogleOk(true); setGoogleUser({email:r.email,name:r.name,picture:r.picture}); } }); } }, 'Ayuda'),
              React.createElement('a', { href: '#', style: { color: '#1a73e8', textDecoration: 'none' }, onClick: function(e) { e.preventDefault(); } }, 'Privacidad'),
              React.createElement('a', { href: '#', style: { color: '#1a73e8', textDecoration: 'none' }, onClick: function(e) { e.preventDefault(); } }, 'Términos')
            )
          )
        :
        msgs.length === 0 ?
          React.createElement('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' } },
            React.createElement('div', { style: { width: '56px', height: '56px', borderRadius: '50%', background: '#f6f8fa', border: '1px solid #d0d7de', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
              React.createElement('img', { src: 'dist/x1-logo.png', alt: 'X1', style: { width: '32px', height: '32px', borderRadius: '4px', objectFit: 'contain' }, onError: function(e) { e.currentTarget.style.display = 'none'; } })
            ),
            React.createElement('div', { style: { fontSize: '17px', fontWeight: '600', color: '#1f2328', fontFamily: F } }, 'System X1'),
            React.createElement('div', { style: { fontSize: '14px', color: '#59636e', maxWidth: '300px', textAlign: 'center', lineHeight: '1.7', fontFamily: F } },
              'Preguntame lo que quieras. Tengo 8 agentes especializados. Puedo buscar en GitHub, npm, Stack Overflow y mas.'
            ),
            React.createElement('div', { style: { display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '320px' } },
              QUICK.map(function(q) {
                return React.createElement('button', {
                  key: q.label,
                  onClick: function() { send(q.prompt); },
                  style: {
                    padding: '4px 12px', border: '1px solid #d0d7de', borderRadius: '999px',
                    background: '#ffffff', fontSize: '12px', color: '#59636e', cursor: 'pointer',
                    fontFamily: F, transition: 'all 80ms',
                  },
                  onMouseEnter: function(e) { e.currentTarget.style.background = '#f6f8fa'; e.currentTarget.style.borderColor = '#0969da'; e.currentTarget.style.color = '#0969da'; },
                  onMouseLeave: function(e) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#d0d7de'; e.currentTarget.style.color = '#59636e'; },
                }, q.label);
              })
            )
          )
        :
          React.createElement('div', { style: { maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' } },
            msgs.map(function(m) {
              var mAgent = agentById(m.agent || 'research');
              var elapsed = m.finishedAt && m.startedAt ? Math.round((m.finishedAt - m.startedAt) / 100) / 10 : null;
              return React.createElement('div', { key: m.id, style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                m.role === 'user' ?
                  React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
                    React.createElement('div', {
                      style: {
                        maxWidth: '75%', padding: '10px 14px', borderRadius: '14px 14px 4px 14px',
                        background: '#ddf4ff', fontSize: '14px', lineHeight: '1.6', color: '#1f2328',
                        fontFamily: F, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }
                    }, m.content)
                  )
                :
                  // Mensaje del asistente: avatar + nombre + razonamiento + respuesta + tools + meta
                  React.createElement('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-start' } },
                    React.createElement(AgentAvatar, { agent: mAgent, size: 22 }),
                    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                      // Nombre del agente + IA
                      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' } },
                        React.createElement('span', { style: { fontSize: '13px', fontWeight: '600', color: '#1f2328', fontFamily: F } }, mAgent.name),
                        React.createElement('span', { style: { fontSize: '11px', color: '#818b98' } }, mAgent.ai),
                        elapsed != null && React.createElement('span', { style: { fontSize: '10px', color: '#818b98' } }, elapsed + 's')
                      ),
                      // Estado "thinking" -> puntos animados
                      m.status === 'thinking' ?
                        React.createElement(ThinkingDots, null)
                      :
                      // Estado "done" con contenido
                      m.status === 'done' && m.content ?
                        React.createElement('div', null,
                          // Panel de razonamiento del juez (estilo Claude/o1 "Thinking")
                          React.createElement(ReasoningPanel, { msg: m }),
                          // Cuerpo de la respuesta (formato markdown)
                          React.createElement('div', { style: { padding: '4px 0' } },
                            React.createElement(Markdown, { text: m.content })
                          ),
                          // Badges de herramientas usadas
                          m.toolsUsed && m.toolsUsed.length > 0 ?
                            React.createElement('div', { style: { display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' } },
                              m.toolsUsed.map(function(tool) {
                                return React.createElement('span', {
                                  key: tool,
                                  style: {
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                                    background: '#f6f8fa', border: '1px solid #d0d7de', color: '#59636e',
                                    fontFamily: F,
                                  }
                                },
                                  React.createElement(ToolIcon, { tool: tool, size: 12 }),
                                  tool
                                );
                              })
                            )
                          : null,
                          // Panel de proceso debajo de la respuesta
                          m.processSteps ? React.createElement('div', {
                            style: {
                              marginTop: '12px', borderTop: '1px solid #d8dee4', paddingTop: '10px',
                              display: 'flex', flexDirection: 'column', gap: '6px',
                            }
                          },
                            React.createElement('div', { style: { fontSize: '11px', fontWeight: '600', color: '#59636e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' } }, 'Proceso de ejecucion'),
                            m.processSteps.map(function(ps, i) {
                              var iconSvg = null;
                              if (ps.icon === 'sector') iconSvg = React.createElement('svg', { viewBox: '0 0 16 16', width: '12', height: '12', fill: '#59636e' }, React.createElement('path', { d: 'M1.75 1h8.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0110.25 10H7.061l-2.574 2.573A1.458 1.458 0 012 11.543V10h-.25A1.75 1.75 0 010 8.25v-5.5C0 1.784.784 1 1.75 1z' }));
                              else if (ps.icon === 'agent') iconSvg = React.createElement('svg', { viewBox: '0 0 16 16', width: '12', height: '12', fill: '#59636e' }, React.createElement('path', { d: 'M10.561 8.073a6.005 6.005 0 013.432 5.142.75.75 0 11-1.498.07 4.5 4.5 0 00-8.99 0 .75.75 0 11-1.498-.07 6.004 6.004 0 013.431-5.142 3.999 3.999 0 115.123 0zM10.5 5a2.5 2.5 0 10-5 0 2.5 2.5 0 005 0z' }));
                              else if (ps.icon === 'repo') iconSvg = React.createElement('svg', { viewBox: '0 0 16 16', width: '12', height: '12', fill: '#59636e' }, React.createElement('path', { d: 'M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9z' }));
                              else if (ps.icon === 'ai') iconSvg = React.createElement('svg', { viewBox: '0 0 16 16', width: '12', height: '12', fill: '#59636e' }, React.createElement('path', { d: 'M8 0a8 8 0 110 16A8 8 0 018 0zM1.5 8a6.5 6.5 0 1013 0 6.5 6.5 0 00-13 0zm6.25-3.25v2.992l2.028.812a.75.75 0 01-.557 1.392l-2.5-1A.751.751 0 017.25 8.25v-3.5a.75.75 0 011.5 0z' }));
                              else if (ps.icon === 'clock') iconSvg = React.createElement('svg', { viewBox: '0 0 16 16', width: '12', height: '12', fill: '#59636e' }, React.createElement('path', { d: 'M8 0a8 8 0 110 16A8 8 0 018 0zM1.5 8a6.5 6.5 0 1013 0 6.5 6.5 0 00-13 0zm6.25-3.25v3a.75.75 0 01-.22.53l-2 2a.75.75 0 01-1.06-1.06l1.78-1.78V4.75a.75.75 0 111.5 0z' }));
                              else iconSvg = React.createElement('svg', { viewBox: '0 0 16 16', width: '12', height: '12', fill: '#d1242f' }, React.createElement('path', { d: 'M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z' }));
                              return React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' } },
                                iconSvg,
                                React.createElement('span', { style: { color: '#59636e', flexShrink: 0, minWidth: '60px', fontWeight: 500 } }, ps.label),
                                React.createElement('span', { style: { color: '#1f2328' } }, ps.detail)
                              );
                            })
                          ) : null
                        )
                      : null
                    )
                  )
              );
            })
          )
      ),

      // Input area (GitHub Primer) con auto-resize
      React.createElement('div', { style: { padding: '0 20px 14px' } },
        React.createElement('div', {
          style: {
            display: 'flex', alignItems: 'flex-end', gap: '10px',
            background: '#ffffff', border: '1px solid #d0d7de', borderRadius: '6px',
            padding: '10px 12px',
            transition: 'border-color 80ms',
          },
          onFocus: function(e) { e.currentTarget.style.borderColor = '#0969da'; },
          onBlur: function(e) { e.currentTarget.style.borderColor = '#d0d7de'; },
        },
          React.createElement('textarea', {
            ref: taRef,
            value: text,
            onChange: function(e) { setText(e.target.value); textRef.current = e.target.value; },
            placeholder: 'Escribe tu mensaje a ' + agent.name + '...',
            rows: 1,
            style: {
              flex: 1, border: 'none', outline: 'none', resize: 'none',
              fontSize: '14px', fontFamily: F, lineHeight: '1.5',
              background: 'transparent', minHeight: '22px', maxHeight: '120px', color: '#1f2328',
              overflow: 'auto',
            },
            onKeyDown: function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }
          }),
          React.createElement('button', {
            onClick: function() { send(); },
            disabled: !text.trim() || busy,
            style: {
              width: '28px', height: '28px', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: text.trim() && !busy ? 'pointer' : 'default',
              background: text.trim() && !busy ? '#2da44e' : '#f6f8fa',
              color: text.trim() && !busy ? '#ffffff' : '#818b98',
              flexShrink: 0, transition: 'background 80ms',
            }
          },
            React.createElement('svg', { viewBox: '0 0 16 16', width: '14', height: '14', fill: 'currentColor' },
              React.createElement('path', { d: 'M.989 8 .064 2.68a1.342 1.342 0 0 1 1.85-1.462l13.402 5.744a1.13 1.13 0 0 1 0 2.076L1.913 14.782a1.343 1.343 0 0 1-1.85-1.463L.99 8Zm.603-5.288L2.38 7.25h4.87a.75.75 0 0 1 0 1.5H2.38l-.788 4.538L13.929 8Z' })
            )
          )
        )
      )
    )
  );
}
