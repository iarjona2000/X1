import * as React from 'react';

var STATUS_COLORS = {
  idle: 'rgba(44,42,39,0.15)', active: '#f54e00', done: '#1f8a65',
  error: '#cf2d56', thinking: '#6c44fc',
};

var BADGE_COLORS = {
  'Cronos': '#f54e00', 'Ares': '#cf2d56', 'Hephaestus': '#1f8a65',
  'Athena': '#6c44fc', 'Hermes': '#0070f3', 'Morpheus': '#e8590c',
};

function StatusDot({ status }) {
  var color = STATUS_COLORS[status] || STATUS_COLORS.idle;
  return React.createElement('span', {
    style: {
      display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%',
      background: color, boxShadow: status === 'active' ? '0 0 6px ' + color : 'none',
      animation: status === 'active' ? 'pulse-dot 1.5s infinite' : 'none',
    }
  });
}

function ToolBadge({ name }) {
  var colors = {
    gmail: '#cf2d56', calendar: '#0070f3', docs: '#1f8a65',
    sheets: '#1f8a65', drive: '#6c44fc', browser: '#f54e00',
    code: '#2c2a27', search: '#e8590c',
  };
  return React.createElement('span', {
    style: {
      padding: '1px 6px', borderRadius: '4px',
      background: (colors[name] || '#2c2a27') + '12', color: colors[name] || '#2c2a27',
      fontSize: '10px', fontFamily: "'SF Mono', 'Cascadia Code', monospace", fontWeight: 500,
    }
  }, name);
}

function SubagentCard({ agent }) {
  var color = BADGE_COLORS[agent.id] || '#2c2a27';
  return React.createElement('div', {
    style: {
      display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
      borderRadius: '8px', background: 'rgba(247,247,244,0.5)',
      border: '1px solid rgba(220,218,209,0.6)',
    }
  },
    React.createElement('div', {
      style: {
        width: '28px', height: '28px', borderRadius: '7px', background: color, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 600, flexShrink: 0,
      }
    }, agent.id[0]),
    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
        React.createElement('span', { style: { fontWeight: 500, fontSize: '12px', color: '#2c2a27' } }, agent.id),
        React.createElement(StatusDot, { status: agent.status || 'idle' })
      ),
      React.createElement('div', {
        style: { fontSize: '11px', color: 'rgba(44,42,39,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
      }, agent.description || agent.focus || 'Ready')
    ),
    agent.tools && agent.tools.length > 0 && React.createElement('div', { style: { display: 'flex', gap: '3px', flexShrink: 0 } },
      agent.tools.slice(0, 3).map(function(t, i) { return React.createElement(ToolBadge, { key: i, name: t }); })
    )
  );
}

export function Subagents({ agents, activeId }) {
  var list = agents || [];
  if (list.length === 0) return null;
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
    React.createElement('div', {
      style: {
        padding: '0 12px 2px', fontSize: '11px', fontWeight: 600,
        color: 'rgba(44,42,39,0.55)', fontFamily: "'Inter', ui-sans-serif, sans-serif",
        textTransform: 'uppercase', letterSpacing: '0.12em',
      }
    }, 'Agents'),
    list.map(function(a) {
      return React.createElement(SubagentCard, {
        key: a.id, agent: Object.assign({}, a, { status: a.id === activeId ? 'active' : (a.status || 'idle') }),
      });
    })
  );
}
