import * as React from 'react';
import * as B from './backend.js';
import { Markdown } from './Markdown.jsx';
import { FONT } from './theme.js';

const F = FONT;

const AGENTS = B.AGENTS;
const agentById = B.agentById;

function AgentAvatar({ agent, size }) {
  size = size || 20;
  if (agent.aiIcon) {
    return React.createElement('img', {
      src: agent.aiIcon, alt: '',
      style: { width: size, height: size, borderRadius: '8px', objectFit: 'contain', flexShrink: 0 },
      onError: function(e) { e.currentTarget.style.display = 'none'; }
    });
  }
  return React.createElement('div', {
    style: {
      width: size, height: size, borderRadius: '8px',
      background: '#e6e5e0', color: '#26251e',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.5, fontWeight: '600', flexShrink: 0,
    }
  }, agent.letter);
}

function ThinkingDots() {
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' } },
    React.createElement('div', { style: { display: 'flex', gap: '4px' } },
      React.createElement('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: '#f54e00', animation: 'pulse 1s infinite' } }),
      React.createElement('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: '#f54e00', animation: 'pulse 1s infinite 0.2s' } }),
      React.createElement('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: '#f54e00', animation: 'pulse 1s infinite 0.4s' } })
    ),
    React.createElement('span', { style: { fontSize: '13px', color: 'rgba(38,37,30,0.55)', fontFamily: F } }, 'Thinking...')
  );
}

function ProcessSteps({ steps, expanded, onToggle }) {
  if (!steps || steps.length === 0) return null;
  return React.createElement('div', { style: { marginTop: '8px' } },
    React.createElement('div', {
      onClick: onToggle,
      style: {
        display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
        padding: '4px 0', fontSize: '12px', color: 'rgba(38,37,30,0.55)', fontFamily: F,
        userSelect: 'none',
      }
    },
      React.createElement('svg', {
        viewBox: '0 0 16 16', width: '10', height: '10', fill: 'rgba(38,37,30,0.55)',
        style: { transition: 'transform 150ms', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' },
      }, React.createElement('path', { d: 'M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z' })),
      React.createElement('span', null, expanded ? 'Hide process' : 'Show process')
    ),
    expanded && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '4px', paddingBottom: '4px' } },
      steps.map(function(ps, i) {
        return React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' } },
          React.createElement('span', { style: { color: 'rgba(38,37,30,0.55)', flexShrink: 0, minWidth: '64px', fontWeight: 500 } }, ps.label),
          React.createElement('span', { style: { color: '#26251e' } }, ps.detail)
        );
      })
    )
  );
}

export function ChatView({ activeConv, onSelectConv, onEnsureConv, onUpdateConv }) {
  const [text, setText] = React.useState('');
  const textRef = React.useRef('');
  const taRef = React.useRef(null);
  const [busy, setBusy] = React.useState(false);
  const [activeAgent, setActiveAgent] = React.useState('auto');
  const [agentMenu, setAgentMenu] = React.useState(false);
  const logRef = React.useRef(null);
  const safetyRef = React.useRef(null);
  const clearProcRef = React.useRef(null);
  const busyRef = React.useRef(false);
  const [expandedSteps, setExpandedSteps] = React.useState({});

  React.useEffect(function() { busyRef.current = busy; }, [busy]);

  React.useEffect(function() {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [activeConv && activeConv.messages && activeConv.messages.length, activeConv && activeConv.messages && activeConv.messages.length > 0 && activeConv.messages[activeConv.messages.length - 1].content]);

  React.useEffect(function() {
    if (logRef.current) {
      requestAnimationFrame(function() { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; });
    }
  }, [activeConv && activeConv.id]);

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

    var title = conv.messages.length === 0 ? q.slice(0, 42) : conv.title;
    var userMsg = { id: Date.now(), role: 'user', content: q, timestamp: Date.now() };
    var aiMsg = { id: Date.now() + 1, role: 'assistant', content: '', status: 'thinking', agent: agentId, toolsUsed: [], judgeReason: judgeReason, sector: sector, startedAt: Date.now() };
    var newMessages = conv.messages.concat([userMsg, aiMsg]);
    onUpdateConv(conv.id, { messages: newMessages, title: title, agent: agentId });

    safetyRef.current = setTimeout(function() {
      if (busyRef.current) {
        patchMsg(conv.id, aiMsg.id, { content: 'Timeout (24s). Try again.', status: 'done' });
        if (clearProcRef.current) clearTimeout(clearProcRef.current);
        clearProcRef.current = setTimeout(function() { setExpandedSteps({}); }, 1600);
        setBusy(false);
      }
    }, 24000);

    B.smartQuery(q, agentId).then(function(result) {
      if (safetyRef.current) clearTimeout(safetyRef.current);
      if (result) {
        var processSteps = [
          { icon: 'sector', label: 'Sector',       detail: result.sector || sector },
          { icon: 'agent',  label: 'Agent',         detail: (result.agentName || pickedAgent.name) + ' (' + (result.agentModel || pickedAgent.ai) + ')' },
          { icon: 'ai',     label: 'Provider',      detail: (result.provider || 'proxy') + ' - ' + (result.model || 'unknown') },
          { icon: 'clock',  label: 'Latency',       detail: (result.latencyMs || '?') + 'ms' },
        ];
        var content = result.response || 'Done.';
        if (result.error) {
          content = '**Connection error:** ' + result.error + '\n\nTry again.';
          processSteps = [{ icon: 'error', label: 'Error', detail: result.error + ' (' + (result.provider || 'proxy') + ')' }];
        }
        patchMsg(conv.id, aiMsg.id, {
          content: content, status: 'done',
          toolsUsed: result.tools || [], judgeReason: result.judgeReason || judgeReason,
          sector: result.sector || sector, model: result.model || null,
          provider: result.provider || null, latencyMs: result.latencyMs || 0,
          processSteps: processSteps, finishedAt: Date.now(),
        });
      } else {
        patchMsg(conv.id, aiMsg.id, { content: 'Could not process that.', status: 'done',
          processSteps: [{ icon: 'error', label: 'Status', detail: 'AI unavailable' }], finishedAt: Date.now() });
      }
      if (clearProcRef.current) clearTimeout(clearProcRef.current);
      clearProcRef.current = setTimeout(function() { setExpandedSteps({}); }, 1600);
      setBusy(false);
    }).catch(function(err) {
      if (safetyRef.current) clearTimeout(safetyRef.current);
      patchMsg(conv.id, aiMsg.id, { content: 'Error: ' + ((err && err.message) || 'unknown'), status: 'done',
        processSteps: [{ icon: 'error', label: 'Error', detail: (err && err.message) || 'unknown' }], finishedAt: Date.now() });
      if (clearProcRef.current) clearTimeout(clearProcRef.current);
      clearProcRef.current = setTimeout(function() { setExpandedSteps({}); }, 1600);
      setBusy(false);
    });
  }

  var agent = agentById(activeAgent);
  var msgs = (activeConv && activeConv.messages) || [];

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', fontFamily: F, background: '#f2f1ed' } },

    // Header
    React.createElement('div', { style: { padding: '10px 20px', borderBottom: '1px solid rgba(38,37,30,0.1)', display: 'flex', alignItems: 'center', gap: '8px', background: '#f2f1ed', minHeight: '42px' } },
      React.createElement('div', { style: { flex: 1, fontSize: '14px', fontWeight: '500', color: '#26251e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
        activeConv ? (activeConv.title || 'New conversation') : 'System X1'
      )
    ),

    // Messages
    React.createElement('div', { ref: logRef, style: { flex: 1, overflow: 'auto', padding: '24px 20px' } },
      msgs.length === 0 ?
        React.createElement('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' } },
          React.createElement('div', { style: { width: '48px', height: '48px', borderRadius: '12px', background: '#e6e5e0', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
            React.createElement('img', { src: 'dist/x1-logo.png', alt: 'X1', style: { width: '28px', height: '28px', borderRadius: '8px', objectFit: 'contain' }, onError: function(e) { e.currentTarget.style.display = 'none'; } })
          ),
          React.createElement('div', { style: { fontSize: '16px', fontWeight: '500', color: '#26251e', fontFamily: F } }, 'System X1'),
          React.createElement('div', { style: { fontSize: '14px', color: 'rgba(38,37,30,0.55)', maxWidth: '320px', textAlign: 'center', lineHeight: '1.5', fontFamily: F } },
            'Ask me anything. I have 8 specialized agents. I can search GitHub, npm, Stack Overflow and more.'
          )
        )
      :
        React.createElement('div', { style: { maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' } },
          msgs.map(function(m) {
            var mAgent = agentById(m.agent || 'research');
            var elapsed = m.finishedAt && m.startedAt ? Math.round((m.finishedAt - m.startedAt) / 100) / 10 : null;
            var stepKey = m.id;
            var isExpanded = !!expandedSteps[stepKey];

            return React.createElement('div', { key: m.id, style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              m.role === 'user' ?
                React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
                  React.createElement('div', {
                    style: {
                      maxWidth: '75%', padding: '10px 14px', borderRadius: '8px',
                      background: '#e6e5e0', fontSize: '14px', lineHeight: '1.5', color: '#26251e',
                      fontFamily: F, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      border: '1px solid rgba(38,37,30,0.1)',
                    }
                  }, m.content)
                )
              :
                React.createElement('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-start' } },
                  React.createElement(AgentAvatar, { agent: mAgent, size: 24 }),
                  React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } },
                      React.createElement('span', { style: { fontSize: '13px', fontWeight: '500', color: '#26251e', fontFamily: F } }, mAgent.name),
                      elapsed != null && React.createElement('span', { style: { fontSize: '11px', color: 'rgba(38,37,30,0.4)' } }, elapsed + 's')
                    ),
                    m.status === 'thinking' ?
                      React.createElement(ThinkingDots, null)
                    :
                    m.status === 'done' && m.content ?
                      React.createElement('div', null,
                        m.judgeReason && React.createElement('div', { style: { fontSize: '12px', color: 'rgba(38,37,30,0.55)', lineHeight: '1.5', fontFamily: F, marginBottom: '6px', fontStyle: 'italic' } },
                          (m.sector ? m.sector + ' — ' : '') + m.judgeReason.replace(/\*\*/g, '').replace(/\n/g, ' ').slice(0, 120)
                        ),
                        React.createElement('div', { style: { padding: '2px 0' } },
                          React.createElement(Markdown, { text: m.content })
                        ),
                        m.processSteps ? React.createElement(ProcessSteps, {
                          steps: m.processSteps,
                          expanded: isExpanded,
                          onToggle: function() { setExpandedSteps(function(prev) { var next = Object.assign({}, prev); if (next[stepKey]) delete next[stepKey]; else next[stepKey] = true; return next; }); }
                        }) : null
                      )
                    : null
                  )
              )
            );
          })
        )
    ),

    // Input
    React.createElement('div', { style: { padding: '0 20px 24px' } },
      React.createElement('div', {
        style: {
          background: '#f7f7f4', borderRadius: '10px',
          padding: '10px 10px 8px 10px',
          border: '1px solid rgba(38,37,30,0.1)',
          transition: 'border-color 150ms, box-shadow 150ms',
        },
        onFocus: function(e) { e.currentTarget.style.borderColor = 'rgba(38,37,30,0.2)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; },
        onBlur: function(e) { e.currentTarget.style.borderColor = 'rgba(38,37,30,0.1)'; e.currentTarget.style.boxShadow = 'none'; },
      },
        React.createElement('textarea', {
          ref: taRef,
          value: text,
          onChange: function(e) { setText(e.target.value); textRef.current = e.target.value; },
          placeholder: 'Plan, search, build anything...',
          rows: 1,
          style: {
            width: '100%', border: 'none', outline: 'none', resize: 'none',
            fontSize: '14px', fontFamily: F, lineHeight: '1.5',
            background: 'transparent', minHeight: '22px', maxHeight: '120px', color: '#26251e',
            overflow: 'auto', padding: '0', display: 'block', boxSizing: 'border-box',
          },
          onKeyDown: function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }
        }),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' } },
          // Agent picker
          React.createElement('div', {
            onClick: function() { setAgentMenu(function(v) { return !v; }); },
            style: {
              display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px',
              borderRadius: '9999px', background: '#e6e5e0', fontSize: '12px', color: 'rgba(38,37,30,0.6)',
              cursor: 'pointer', fontFamily: F, position: 'relative',
              transition: 'background 150ms',
            },
            onMouseEnter: function(e) { e.currentTarget.style.background = '#ebeae5'; },
            onMouseLeave: function(e) { e.currentTarget.style.background = '#e6e5e0'; },
          },
            agent.name,
            React.createElement('svg', { viewBox: '0 0 16 16', width: '8', height: '8', fill: 'rgba(38,37,30,0.55)' }, React.createElement('path', { d: 'M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z' })),
            agentMenu && React.createElement('div', {
              style: {
                position: 'absolute', bottom: '100%', left: 0, zIndex: 30, marginBottom: '6px',
                minWidth: '200px', background: '#f7f7f4', border: '1px solid rgba(38,37,30,0.1)',
                borderRadius: '8px', boxShadow: '0 28px 70px rgba(0,0,0,0.14), 0 14px 32px rgba(0,0,0,0.1), 0 0 0 1px rgba(38,37,30,0.1)', padding: '4px',
              }
            },
              AGENTS.map(function(a) {
                var isActive = activeAgent === a.id;
                return React.createElement('div', {
                  key: a.id,
                  onClick: function(e) { e.stopPropagation(); setActiveAgent(a.id); setAgentMenu(false); },
                  style: {
                    padding: '6px 8px', borderRadius: '8px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: isActive ? '#e6e5e0' : 'transparent',
                    transition: 'background 150ms',
                  },
                  onMouseEnter: function(e) { if (!isActive) e.currentTarget.style.background = '#f2f1ed'; },
                  onMouseLeave: function(e) { if (!isActive) e.currentTarget.style.background = 'transparent'; },
                },
                  React.createElement(AgentAvatar, { agent: a, size: 20 }),
                  React.createElement('div', { style: { flex: 1 } },
                    React.createElement('div', { style: { fontSize: '13px', fontWeight: '500', color: '#26251e' } }, a.name),
                    React.createElement('div', { style: { fontSize: '11px', color: 'rgba(38,37,30,0.55)' } }, a.ai)
                  ),
                  isActive && React.createElement('svg', { viewBox: '0 0 16 16', width: '12', height: '12', fill: '#26251e' },
                    React.createElement('path', { d: 'M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z' })
                  )
                );
              })
            )
          ),
          // Model badge
          React.createElement('div', {
            style: {
              display: 'inline-flex', alignItems: 'center', padding: '3px 8px',
              borderRadius: '9999px', background: '#e6e5e0', fontSize: '12px', color: 'rgba(38,37,30,0.6)', fontFamily: F,
            },
          }, agent.ai),
          React.createElement('div', { style: { flex: 1 } }),
          // Send
          React.createElement('button', {
            onClick: function() { send(); },
            disabled: !text.trim() || busy,
            style: {
              width: '32px', height: '32px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: text.trim() && !busy ? 'pointer' : 'default',
              background: text.trim() && !busy ? '#f54e00' : '#e6e5e0',
              color: text.trim() && !busy ? '#ffffff' : 'rgba(38,37,30,0.4)',
              flexShrink: 0, transition: 'background 150ms, color 150ms',
            }
          },
            React.createElement('svg', { viewBox: '0 0 16 16', width: '16', height: '16', fill: 'currentColor' },
              React.createElement('path', { d: 'M8 1.75a.75.75 0 01.75.75v8.69l2.72-2.72a.75.75 0 111.06 1.06l-4 4a.75.75 0 01-1.06 0l-4-4a.75.75 0 111.06-1.06l2.72 2.72V2.5A.75.75 0 018 1.75z', transform: 'rotate(180 8 8)' })
            )
          )
        )
      )
    )
  );
}
