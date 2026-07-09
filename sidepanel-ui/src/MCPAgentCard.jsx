import * as React from 'react';

const F = "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export function MCPAgentCard(props) {
  var agent = props.agent;
  var selected = props.selected;
  var onClick = props.onClick;
  var status = props.status || 'idle';

  var statusColor = status === 'active' ? '#000000' : status === 'error' ? '#dc2626' : '#a3a3a3';

  return React.createElement('button', {
    onClick: onClick,
    style: {
      display: 'flex', flexDirection: 'column', gap: '8px',
      borderRadius: '6px', border: '1px solid ' + (selected ? agent.color : '#e8e8e8'),
      background: selected ? (agent.color + '0d') : '#ffffff',
      padding: '12px', cursor: 'pointer', textAlign: 'left',
      transition: 'all 80ms', width: '100%', fontFamily: F,
    },
    onMouseEnter: function(e) { if (!selected) e.currentTarget.style.borderColor = agent.color + '80'; },
    onMouseLeave: function(e) { if (!selected) e.currentTarget.style.borderColor = '#e8e8e8'; },
  },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        React.createElement('div', {
          style: {
            width: '28px', height: '28px', borderRadius: '6px',
            background: agent.color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', fontWeight: 700, color: agent.color, fontFamily: 'ui-monospace, monospace',
          }
        }, agent.letter),
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: '13px', fontWeight: '600', color: '#000000' } }, agent.name),
          React.createElement('div', { style: { fontSize: '11px', color: '#707070', marginTop: '1px' } }, agent.description.substring(0, 50))
        )
      ),
      React.createElement('div', {
        style: {
          width: '8px', height: '8px', borderRadius: '50%', background: statusColor,
        }
      })
    ),
    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
      agent.tools.slice(0, 4).map(function(t) {
        return React.createElement('span', {
          key: t,
          style: {
            fontSize: '10px', padding: '2px 6px', borderRadius: '999px',
            background: '#f7f7f7', border: '1px solid #e8e8e8', color: '#707070',
            fontFamily: 'ui-monospace, monospace',
          }
        }, t);
      }),
      agent.tools.length > 4 ? React.createElement('span', {
        style: { fontSize: '10px', padding: '2px 6px', borderRadius: '999px', background: '#f7f7f7', border: '1px solid #e8e8e8', color: '#a3a3a3' }
      }, '+' + (agent.tools.length - 4)) : null
    )
  );
}
