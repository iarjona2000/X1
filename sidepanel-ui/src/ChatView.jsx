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
  { id: 'auto',     name: 'X1',       ai: 'Automatico',   letter: 'X', color: '#0969da', aiIcon: 'dist/x1-logo.png' },
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

export function ChatView({ conversations, activeConv, onSelectConv, onCreateConv, onUpdateConv }) {
  const [text, setText] = React.useState('');
  const textRef = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [activeAgent, setActiveAgent] = React.useState('auto');
  const [agentMenu, setAgentMenu] = React.useState(false);
  const logRef = React.useRef(null);
  const safetyRef = React.useRef(null);
  const busyRef = React.useRef(false);

  React.useEffect(function() { busyRef.current = busy; }, [busy]);
  React.useEffect(function() { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [activeConv && activeConv.messages && activeConv.messages.length]);

  function patchMsg(convId, msgId, patch) {
    onUpdateConv(convId, { messages: function(prevMsgs) {
      return prevMsgs.map(function(m) { return m.id === msgId ? Object.assign({}, m, patch) : m; });
    }});
  }

  function send(input) {
    var q = (input || textRef.current).trim();
    if (!q || busyRef.current || !activeConv) return;
    setBusy(true); setText(''); textRef.current = '';
    var agentId = activeAgent === 'auto' ? B.getBestAgent(q) : activeAgent;
    var title = activeConv.messages.length === 0 ? q.slice(0, 40) : activeConv.title;
    var userMsg = { id: Date.now(), role: 'user', content: q, timestamp: Date.now() };
    var aiMsg = { id: Date.now() + 1, role: 'assistant', content: '', status: 'thinking', agent: agentId, toolsUsed: [] };
    var newMessages = activeConv.messages.concat([userMsg, aiMsg]);
    onUpdateConv(activeConv.id, { messages: newMessages, title: title, agent: agentId });

    safetyRef.current = setTimeout(function() {
      if (busyRef.current) {
        patchMsg(activeConv.id, aiMsg.id, { content: 'Tiempo de espera agotado.', status: 'done' });
        setBusy(false);
      }
    }, 20000);

    B.smartQuery(q, agentId).then(function(result) {
      if (safetyRef.current) clearTimeout(safetyRef.current);
      if (result) patchMsg(activeConv.id, aiMsg.id, { content: result.response || 'Completado.', status: 'done', toolsUsed: result.tools || [] });
      else patchMsg(activeConv.id, aiMsg.id, { content: 'No pude procesar eso.', status: 'done' });
      setBusy(false);
    }).catch(function() {
      if (safetyRef.current) clearTimeout(safetyRef.current);
      patchMsg(activeConv.id, aiMsg.id, { content: 'Error de conexion.', status: 'done' });
      setBusy(false);
    });
  }

  var agent = agentById(activeAgent);
  var msgs = (activeConv && activeConv.messages) || [];

  return React.createElement('div', { style: { display: 'flex', flex: 1, overflow: 'hidden', fontFamily: F } },

    // Sidebar conversaciones
    React.createElement('div', { style: { width: '220px', borderRight: '1px solid #d0d7de', display: 'flex', flexDirection: 'column', background: '#f6f8fa' } },
      React.createElement('div', { style: { padding: '12px', borderBottom: '1px solid #d0d7de' } },
        React.createElement('button', {
          onClick: onCreateConv,
          style: {
            width: '100%', padding: '5px 12px', borderRadius: '6px',
            border: '1px solid rgba(27,31,36,0.15)', background: '#2da44e', color: '#ffffff',
            fontSize: '12px', fontWeight: '600', cursor: 'pointer',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
          }
        }, '+ Nueva')
      ),
      React.createElement('div', { style: { flex: 1, overflow: 'auto', padding: '4px 8px' } },
        conversations.map(function(c) {
          var isActive = activeConv && activeConv.id === c.id;
          return React.createElement('div', {
            key: c.id, onClick: function() { onSelectConv(c.id); },
            style: {
              padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', marginBottom: '2px',
              background: isActive ? '#ddf4ff' : 'transparent',
              transition: 'background 80ms',
            },
            onMouseEnter: function(e) { if (!isActive) e.currentTarget.style.background = '#eaeef2'; },
            onMouseLeave: function(e) { if (!isActive) e.currentTarget.style.background = 'transparent'; },
          },
            React.createElement('div', { style: { fontSize: '13px', fontWeight: isActive ? '600' : '400', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isActive ? '#1f2328' : '#24292f' } }, c.title || 'Nueva'),
            React.createElement('div', { style: { fontSize: '11px', color: '#59636e', marginTop: '2px' } }, timeAgo(c.updatedAt || c.createdAt))
          );
        })
      )
    ),

    // Chat area
    React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 } },

      // Header
      React.createElement('div', { style: { padding: '8px 16px', borderBottom: '1px solid #d0d7de', display: 'flex', alignItems: 'center', gap: '10px', background: '#ffffff' } },
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
            React.createElement('div', { style: { fontSize: '14px', color: '#59636e', maxWidth: '260px', textAlign: 'center', lineHeight: '1.5' } }, 'Escribe tu consulta. Puedo buscar en GitHub, npm, Stack Overflow y mas.')
          )
        :
          React.createElement('div', { style: { maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' } },
            msgs.map(function(m) {
              return React.createElement('div', { key: m.id, style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                m.role === 'user' ?
                  React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
                    React.createElement('div', {
                      style: {
                        maxWidth: '70%', padding: '10px 14px', borderRadius: '16px 16px 4px 16px',
                        background: '#ddf4ff', fontSize: '14px', lineHeight: '1.6', color: '#1f2328',
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
                        React.createElement('div', { style: { fontSize: '14px', lineHeight: '1.7', color: '#1f2328' } },
                          React.createElement('div', {
                            style: {
                              padding: '12px 16px', borderRadius: '4px',
                              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                              borderLeft: '2px solid #d0d7de', paddingLeft: '14px',
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
      React.createElement('div', { style: { padding: '0 20px 8px', display: 'flex', gap: '6px', flexWrap: 'wrap' } },
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
            display: 'flex', alignItems: 'flex-end', gap: '8px',
            background: '#ffffff', border: '1px solid #d0d7de', borderRadius: '6px',
            padding: '8px 12px',
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
              React.createElement('path', { d: '.156 1.763a.75.75 0 011.028-.319l13.25 7.25a.75.75 0 010 1.314l-13.25 7.25a.75.75 0 01-1.028-.319.75.75 0 01-.003-.722L3.237 8 .153 2.485a.75.75 0 01.003-.722z' })
            )
          )
        )
      )
    )
  );
}
