import { useState, useRef, useEffect, useCallback } from 'react';
import { AGENTS, agentById, getBestAgent, smartQuery, hasEngine, detectSector, getJudgeReason, loadConversations, saveConversations } from './backend.js';
import { getMemoryStore, formatToolResults, buildResponse, toolsUsedList } from './tools.js';
import { Composer } from './Composer.jsx';
import { TaskList } from './TaskList.jsx';
import { AgentFlow } from './AgentFlow.jsx';
import { PlanPane } from './PlanPane.jsx';
import { Spinner } from './Spinner.jsx';

var THINKING_STEPS = [
  { type: 'researching', detail: 'Analyzing request...' },
  { type: 'writing', detail: 'Generating response...' },
];

export function ChatView({ activeConv, onSelectConv, onEnsureConv }) {
  var [messages, setMessages] = useState([]);
  var [processing, setProcessing] = useState(false);
  var [activeAgent, setActiveAgent] = useState(null);
  var [flowStep, setFlowStep] = useState(-1);
  var [tasks, setTasks] = useState([]);
  var [planCollapsed, setPlanCollapsed] = useState(true);
  var messagesEndRef = useRef(null);
  var convIdRef = useRef(null);

  useEffect(function() {
    if (activeConv && activeConv.id !== convIdRef.current) {
      convIdRef.current = activeConv.id;
      setMessages(activeConv.messages || []);
      setTasks(activeConv.tasks || []);
    }
  }, [activeConv]);

  useEffect(function() {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, processing]);

  var addMessage = useCallback(function(role, content, extra) {
    var msg = Object.assign({ role: role, content: content, id: Date.now() + '-' + Math.random().toString(36).slice(2, 8) }, extra || {});
    setMessages(function(prev) { return prev.concat([msg]); });
    return msg;
  }, []);

  var handleSend = useCallback(function(text) {
    if (!text) return Promise.resolve();

    if (text.startsWith('__select_agent:')) {
      var agentId = text.replace('__select_agent:', '');
      setActiveAgent(agentId);
      return Promise.resolve();
    }

    addMessage('user', text);

    var agentId = activeAgent || getBestAgent(text);
    var agent = agentById(agentId);
    setActiveAgent(agentId);

    setProcessing(true);
    setFlowStep(0);

    var convId = convIdRef.current;
    if (!convId) {
      convId = onEnsureConv ? onEnsureConv(text) : 'conv-' + Date.now();
      convIdRef.current = convId;
    }

    var store = getMemoryStore();
    var context = store ? store.context : '';
    var sector = detectSector(text);
    var judgeReason = getJudgeReason(text, agentId);

    return smartQuery(text, agentId, {
      context: context,
      sector: sector,
      judgeReason: judgeReason,
    }).then(function(result) {
      setFlowStep(1);

      var content = '';
      var tools = [];

      if (result && typeof result === 'object') {
        content = result.text || result.answer || result.content || '';
        if (result.toolResults) {
          tools = toolsUsedList(result.toolResults);
        }
      } else if (typeof result === 'string') {
        content = result;
      }

      if (!content) {
        content = 'I received your message but could not generate a response. Try again or check the backend connection.';
      }

      addMessage('assistant', content, { agent: agentId, tools: tools, sector: sector });

      setTasks(function(prev) {
        return prev.concat([{
          id: 't' + Date.now(),
          text: text.slice(0, 80) + (text.length > 80 ? '...' : ''),
          status: 'done',
        }]);
      });

      setProcessing(false);
      setFlowStep(-1);

      if (activeConv) {
        activeConv.messages = (activeConv.messages || []).concat([
          { role: 'user', content: text },
          { role: 'assistant', content: content, agent: agentId, tools: tools },
        ]);
      }
    }).catch(function(err) {
      addMessage('assistant', 'Error: ' + (err.message || 'Unknown error'), { agent: agentId });
      setProcessing(false);
      setFlowStep(-1);
    });
  }, [activeAgent, activeConv, addMessage, onEnsureConv]);

  return React.createElement('div', {
    style: {
      display: 'flex', flexDirection: 'column',
      height: '100%', position: 'relative',
    }
  },
    React.createElement('div', {
      style: {
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: '16px 0',
      }
    },
      messages.length === 0 && !processing && React.createElement('div', {
        style: {
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          height: '100%', gap: '16px',
          padding: '40px',
        }
      },
        React.createElement('div', {
          style: {
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #f54e00, #cf2d56)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(245,78,0,0.2)',
          }
        },
          React.createElement('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
            React.createElement('path', { d: 'M12 2L2 7l10 5 10-5-10-5z' }),
            React.createElement('path', { d: 'M2 17l10 5 10-5' }),
            React.createElement('path', { d: 'M2 12l10 5 10-5' })
          )
        ),
        React.createElement('div', {
          style: { fontSize: '16px', fontWeight: 500, color: '#26251e' }
        }, 'What can I help you with?'),
        React.createElement('div', {
          style: {
            fontSize: '13px', color: 'rgba(38,37,30,0.40)',
            textAlign: 'center', maxWidth: '300px', lineHeight: '1.5',
          }
        }, 'Ask about email, calendar, code, research, or anything else.')
      ),
      React.createElement(TaskList, { messages: messages }),
      processing && React.createElement('div', {
        style: { padding: '8px 16px' }
      },
        React.createElement(AgentFlow, { steps: THINKING_STEPS, activeStep: flowStep }),
        React.createElement('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 0',
          }
        },
          React.createElement(Spinner, {}),
          React.createElement('span', {
            style: { fontSize: '13px', color: 'rgba(38,37,30,0.55)' }
          }, activeAgent ? (activeAgent + ' is thinking...') : 'Thinking...')
        )
      ),
      React.createElement('div', { ref: messagesEndRef })
    ),
    tasks.length > 0 && React.createElement('div', {
      style: { padding: '0 16px 8px' }
    },
      React.createElement(PlanPane, {
        tasks: tasks,
        title: 'Tasks',
        collapsed: planCollapsed,
        onToggleCollapse: function() { setPlanCollapsed(!planCollapsed); },
        onToggleTask: function(id) {
          setTasks(function(prev) {
            return prev.map(function(t) {
              if (t.id === id) return Object.assign({}, t, { status: t.status === 'done' ? 'pending' : 'done' });
              return t;
            });
          });
        },
      })
    ),
    React.createElement('div', {
      style: { padding: '0 16px 16px' }
    },
      React.createElement(Composer, {
        onSend: handleSend,
        activeAgent: activeAgent,
        agents: AGENTS,
        disabled: processing,
      })
    )
  );
}
