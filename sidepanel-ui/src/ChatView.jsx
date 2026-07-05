import * as React from 'react';
import * as B from './backend.js';
import { ProcessTimeline } from './ProcessTimeline.jsx';

const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";
const C = {
  border: '#d0d7de', borderSubtle: '#d8dee4', bg: '#ffffff', bgSubtle: '#f6f8fa',
  fg: '#1f2328', fgMuted: '#59636e', fgSubtle: '#818b98', fgAccent: '#0969da',
  fgSuccess: '#1a7f37', fgDanger: '#d1242f', fgAttention: '#bf8700',
};

function timeAgo(ts) {
  var d = Date.now() - ts;
  if (d < 60000) return 'ahora';
  if (d < 3600000) return Math.floor(d / 60000) + 'm';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h';
  return Math.floor(d / 86400000) + 'd';
}

const AGENTS = [
  { id: 'auto',     name: 'AUTO',      ai: 'Automatico',   letter: 'A', color: '#0969da', aiIcon: 'dist/x1-logo.png' },
  { id: 'research',  name: 'Research',  ai: 'Gemini',       letter: 'R', color: '#4285f4', aiIcon: '../assets/ai/googlegemini.svg' },
  { id: 'writer',    name: 'Writer',    ai: 'Claude',       letter: 'W', color: '#d97706', aiIcon: '../assets/ai/anthropic.svg' },
  { id: 'developer', name: 'Developer', ai: 'GPT-4o',       letter: 'D', color: '#10a37f', aiIcon: '../assets/ai/openai.svg' },
  { id: 'marketing', name: 'Marketing', ai: 'Gemini',       letter: 'M', color: '#4285f4', aiIcon: '../assets/ai/googlegemini.svg' },
  { id: 'finance',   name: 'Finance',   ai: 'Claude',       letter: 'F', color: '#d97706', aiIcon: '../assets/ai/anthropic.svg' },
  { id: 'legal',     name: 'Legal',     ai: 'Mistral',      letter: 'L', color: '#ff7000', aiIcon: '../assets/ai/mistralai.svg' },
  { id: 'email',     name: 'Email',     ai: 'Llama',        letter: 'E', color: '#0668e1', aiIcon: '../assets/ai/meta.svg' },
  { id: 'meeting',   name: 'Meeting',   ai: 'Gemini',       letter: 'G', color: '#4285f4', aiIcon: '../assets/ai/googlegemini.svg' },
];

function agentById(id) {
  return AGENTS.find(function(a) { return a.id === id; }) || AGENTS[0];
}

function AgentAvatar({ agent, size }) {
  size = size || 20;
  if (agent.aiIcon) {
    return React.createElement('img', { src: agent.aiIcon, alt: '', style: { width: size, height: size, borderRadius: '4px', objectFit: 'contain' }, onError: function(e) { e.currentTarget.style.display = 'none'; } });
  }
  return React.createElement('div', {
    style: {
      width: size, height: size, borderRadius: '4px',
      background: agent.color || '#0969da', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.55, fontWeight: '600',
    }
  }, agent.letter);
}

function ToolIcon({ tool, size }) {
  size = size || 14;
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
  { label: 'Resumir', prompt: 'Resume la pagina que tengo abierta' },
  { label: 'Investigar', prompt: 'Investiga sobre esta pagina' },
  { label: 'Codigo', prompt: 'Escribe codigo para esto' },
  { label: 'Email', prompt: 'Redacta un email profesional' },
];

export function ChatView({ conversations, activeConv, onSelectConv, onCreateConv, onEnsureConv, onUpdateConv }) {
  const [text, setText] = React.useState('');
  const textRef = React.useRef('');
  const [busy, setBusy] = React.useState(false);
  const [activeAgent, setActiveAgent] = React.useState('auto');
  const [agentMenu, setAgentMenu] = React.useState(false);
  const [procSteps, setProcSteps] = React.useState([]);
  const logRef = React.useRef(null);
  const safetyRef = React.useRef(null);
  const clearProcRef = React.useRef(null);
  const busyRef = React.useRef(false);

  React.useEffect(function() { busyRef.current = busy; }, [busy]);
  React.useEffect(function() { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [activeConv && activeConv.messages && activeConv.messages.length]);

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
    if (clearProcRef.current) clearTimeout(clearProcRef.current);

    var agentId = activeAgent === 'auto' ? B.getBestAgent(q) : activeAgent;
    var judgeReason = B.getJudgeReason(q, agentId);
    var sector = B.detectSector(q);
    var pickedAgent = agentById(agentId);

    // Proceso de seleccion visible (juez): sector -> IA -> consulta -> respuesta.
    var aiIcon = pickedAgent.aiIcon;
    setProcSteps([
      { id: 1, iconSrc: aiIcon, description: 'Sector: ' + sector, status: 'active' },
      { id: 2, iconSrc: aiIcon, description: 'IA: ' + pickedAgent.ai, status: 'pending' },
      { id: 3, iconSrc: aiIcon, description: 'Consultando ' + pickedAgent.ai, status: 'pending' },
      { id: 4, iconSrc: aiIcon, description: 'Respuesta', status: 'pending' },
    ]);
    setTimeout(function() { setStep(1, 'done'); setStep(2, 'active'); }, 200);
    setTimeout(function() { setStep(2, 'done'); setStep(3, 'active'); }, 450);

    var title = conv.messages.length === 0 ? q.slice(0, 40) : conv.title;
    var userMsg = { id: Date.now(), role: 'user', content: q, timestamp: Date.now() };
    var aiMsg = { id: Date.now() + 1, role: 'assistant', content: '', status: 'thinking', agent: agentId, toolsUsed: [], judgeReason: judgeReason, sector: sector };
    var newMessages = conv.messages.concat([userMsg, aiMsg]);
    onUpdateConv(conv.id, { messages: newMessages, title: title, agent: agentId });

    function finishProc(ok) {
      setStep(3, 'done'); setStep(4, ok ? 'done' : 'error');
      if (clearProcRef.current) clearTimeout(clearProcRef.current);
      clearProcRef.current = setTimeout(function() { setProcSteps([]); }, 1400);
    }

    safetyRef.current = setTimeout(function() {
      if (busyRef.current) {
        patchMsg(conv.id, aiMsg.id, { content: 'Tiempo de espera agotado.', status: 'done' });
        finishProc(false);
        setBusy(false);
      }
    }, 24000);

    B.smartQuery(q, agentId).then(function(result) {
      if (safetyRef.current) clearTimeout(safetyRef.current);
      setStep(3, 'done'); setStep(4, 'active');
      if (result) patchMsg(conv.id, aiMsg.id, { content: result.response || 'Completado.', status: 'done', toolsUsed: result.tools || [], judgeReason: result.judgeReason || judgeReason, sector: result.sector || sector });
      else patchMsg(conv.id, aiMsg.id, { content: 'No pude procesar eso.', status: 'done' });
      finishProc(true);
      setBusy(false);
    }).catch(function() {
      if (safetyRef.current) clearTimeout(safetyRef.current);
      patchMsg(conv.id, aiMsg.id, { content: 'Error de conexion.', status: 'done' });
      finishProc(false);
      setBusy(false);
    });
  }

  var agent = agentById(activeAgent);
  var msgs = (activeConv && activeConv.messages) || [];

  return React.createElement('div', { style: { display: 'flex', flex: 1, overflow: 'hidden', fontFamily: F } },

    // Sidebar conversaciones
    React.createElement('div', { style: { width: '260px', borderRight: '1px solid #d0d7de', display: 'flex', flexDirection: 'column', background: '#f6f8fa' } },
      React.createElement('div', { style: { padding: '12px', borderBottom: '1px solid #d0d7de' } },
        React.createElement('button', {
          onClick: onCreateConv,
          style: {
            width: '100%', padding: '6px 12px', borderRadius: '6px',
            border: '1px solid rgba(27,31,36,0.15)', background: '#2da44e', color: '#ffffff',
            fontSize: '12px', fontWeight: '600', cursor: 'pointer',
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
          return React.createElement('div', {
            key: c.id, onClick: function() { onSelectConv(c.id); },
            style: {
              padding: '12px', borderRadius: '6px', cursor: 'pointer', marginBottom: '6px',
              background: isActive ? '#ddf4ff' : 'transparent',
              border: isActive ? '1px solid rgba(9,105,218,0.2)' : '1px solid transparent',
              transition: 'all 80ms',
            },
            onMouseEnter: function(e) { if (!isActive) e.currentTarget.style.background = '#eaeef2'; },
            onMouseLeave: function(e) { if (!isActive) e.currentTarget.style.background = 'transparent'; },
          },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' } },
              React.createElement('div', { style: { fontSize: '13px', fontWeight: isActive ? '600' : '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isActive ? '#1f2328' : '#24292f', flex: 1 } }, c.title || 'Nueva conversacion'),
              React.createElement('span', { style: { fontSize: '11px', color: '#818b98', flexShrink: 0, marginLeft: '6px' } }, timeAgo(c.updatedAt || c.createdAt))
            ),
            React.createElement('div', { style: { fontSize: '12px', color: '#59636e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '1.6' } }, preview),
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' } },
              React.createElement('span', { style: { fontSize: '11px', color: '#818b98' } }, msgCount + ' mensaje' + (msgCount !== 1 ? 's' : '')),
              c.agent && React.createElement('span', { style: { fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: '#ddf4ff', color: '#0969da', fontWeight: '500' } }, c.agent)
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

      // Header
      React.createElement('div', { style: { padding: '10px 16px', borderBottom: '1px solid #d0d7de', display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff' } },
        React.createElement('div', { style: { position: 'relative' } },
          React.createElement('button', {
            onClick: function() { setAgentMenu(function(v) { return !v; }); },
            style: {
              display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
              background: '#f6f8fa', border: '1px solid #d0d7de', borderRadius: '6px',
              fontSize: '13px', cursor: 'pointer', transition: 'border-color 80ms',
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
              minWidth: '200px', background: '#ffffff', border: '1px solid #d0d7de',
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
                React.createElement(AgentAvatar, { agent: a, size: 24 }),
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
        React.createElement('span', { style: { fontSize: '12px', color: '#818b98', fontWeight: '500' } }, 'System X1')
      ),

      // Proceso de seleccion (juez) visible en vivo
      procSteps.length > 0 ? React.createElement(ProcessTimeline, { steps: procSteps }) : null,

      // Messages
      React.createElement('div', { ref: logRef, style: { flex: 1, overflow: 'auto', padding: '24px 20px' } },
        msgs.length === 0 ?
          React.createElement('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' } },
            React.createElement('div', { style: { width: '56px', height: '56px', borderRadius: '50%', background: '#f6f8fa', border: '1px solid #d0d7de', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
              React.createElement('svg', { viewBox: '0 0 16 16', width: '24', height: '24', fill: '#818b98' },
                React.createElement('path', { d: 'M8 0a8 8 0 110 16A8 8 0 018 0zM1.5 8a6.5 6.5 0 1013 0 6.5 6.5 0 00-13 0zm7.25-3.25v2.992l2.028.812a.75.75 0 01-.557 1.392l-2.5-1A.751.751 0 017.25 8.25v-3.5a.75.75 0 011.5 0z' })
              )
            ),
            React.createElement('div', { style: { fontSize: '16px', fontWeight: '600', color: '#1f2328' } }, 'System X1'),
            React.createElement('div', { style: { fontSize: '14px', color: '#59636e', maxWidth: '280px', textAlign: 'center', lineHeight: '1.7' } }, 'Escribe tu consulta. Puedo buscar en GitHub, npm, Stack Overflow y mas.')
          )
        :
          React.createElement('div', { style: { maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' } },
            msgs.map(function(m) {
              return React.createElement('div', { key: m.id, style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                m.role === 'user' ?
                  React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
                    React.createElement('div', {
                      style: {
                        maxWidth: '70%', padding: '12px 16px', borderRadius: '16px 16px 4px 16px',
                        background: '#ddf4ff', fontSize: '14px', lineHeight: '1.8', color: '#1f2328',
                      }
                    }, m.content)
                  )
                :
                  React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'flex-start' } },
                    React.createElement(AgentAvatar, { agent: agentById(m.agent), size: 20 }),
                    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                      React.createElement('div', { style: { fontSize: '12px', fontWeight: '600', color: '#59636e', marginBottom: '4px' } }, agentById(m.agent).name),
                      m.status === 'thinking' ?
                        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' } },
                          React.createElement('div', { style: { display: 'flex', gap: '4px' } },
                            React.createElement('span', { style: { width: '6px', height: '6px', borderRadius: '50%', background: '#0969da', animation: 'pulse 1s infinite' } }),
                            React.createElement('span', { style: { width: '6px', height: '6px', borderRadius: '50%', background: '#0969da', animation: 'pulse 1s infinite 0.2s' } }),
                            React.createElement('span', { style: { width: '6px', height: '6px', borderRadius: '50%', background: '#0969da', animation: 'pulse 1s infinite 0.4s' } })
                          ),
                          React.createElement('span', { style: { fontSize: '12px', color: '#818b98' } }, 'Pensando...')
                        )
                      :
                      m.status === 'done' && m.content ?
                        React.createElement('div', { style: { fontSize: '14px', lineHeight: '1.8', color: '#1f2328' } },
                          m.judgeReason && React.createElement('div', {
                            style: {
                              padding: '12px 16px', borderRadius: '6px', marginBottom: '12px',
                              background: '#f6f8fa', border: '1px solid #d0d7de',
                              fontSize: '12px', color: '#59636e', lineHeight: '1.7',
                            }
                          },
                            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' } },
                              React.createElement('span', { style: { fontWeight: '600', color: '#1f2328', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' } }, 'Sistema juez'),
                              m.sector && React.createElement('span', { style: { fontSize: '10px', padding: '1px 8px', borderRadius: '999px', background: '#ddf4ff', color: '#0969da', fontWeight: '600' } }, m.sector)
                            ),
                            React.createElement('div', null, m.judgeReason)
                          ),
                          React.createElement('div', {
                            style: {
                              padding: '4px 0', borderRadius: '4px',
                              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                              borderLeft: '2px solid #d0d7de', paddingLeft: '16px',
                              lineHeight: '1.85',
                            }
                          }, m.content),
                          m.toolsUsed && m.toolsUsed.length > 0 ?
                            React.createElement('div', { style: { display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' } },
                              m.toolsUsed.map(function(tool) {
                                return React.createElement('span', {
                                  key: tool,
                                  style: {
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                                    background: '#f6f8fa', border: '1px solid #d0d7de', color: '#59636e',
                                  }
                                },
                                  React.createElement(ToolIcon, { tool: tool, size: 12 }),
                                  tool
                                );
                              })
                            )
                          : null
                        )
                      : null
                    )
                  )
              );
            })
          )
      ),

      // Quick actions
      React.createElement('div', { style: { padding: '4px 20px 10px', display: 'flex', gap: '8px', flexWrap: 'wrap' } },
        QUICK.map(function(q) {
          return React.createElement('button', {
            key: q.label,
            onClick: function() { send(q.prompt); },
            style: {
              padding: '3px 10px', border: '1px solid #d0d7de', borderRadius: '999px',
              background: '#ffffff', fontSize: '12px', color: '#59636e', cursor: 'pointer',
              fontFamily: F, transition: 'background 80ms',
            },
            onMouseEnter: function(e) { e.currentTarget.style.background = '#f6f8fa'; },
            onMouseLeave: function(e) { e.currentTarget.style.background = '#ffffff'; },
          }, q.label);
        })
      ),

      // Input
      React.createElement('div', { style: { padding: '0 20px 16px' } },
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
            value: text,
            onChange: function(e) { setText(e.target.value); textRef.current = e.target.value; },
            placeholder: 'Escribe tu mensaje...',
            rows: 1,
            style: {
              flex: 1, border: 'none', outline: 'none', resize: 'none',
              fontSize: '14px', fontFamily: F, lineHeight: '1.5',
              background: 'transparent', minHeight: '22px', maxHeight: '100px', color: '#1f2328',
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
