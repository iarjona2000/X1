import * as React from 'react';

var STATUS_ICONS = {
  pending: React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'rgba(44,42,39,0.25)', strokeWidth: 2 },
    React.createElement('circle', { cx: 12, cy: 12, r: 10 })
  ),
  in_progress: React.createElement('span', { className: 'animate-spin', style: { display: 'inline-flex' } },
    React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none' },
      Array.from({ length: 8 }).map(function(_, i) {
        return React.createElement('rect', {
          key: i, x: '11', y: '2', width: '2', height: '6', rx: '1', fill: '#a8823b',
          opacity: 0.15 + (i / 8) * 0.85, transform: 'rotate(' + (i * 45) + ' 12 12)',
        });
      })
    )
  ),
  done: React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: '#1f8a65', strokeWidth: 2 },
    React.createElement('polyline', { points: '20 6 9 17 4 12' })
  ),
};

function TaskItem({ task, onToggle }) {
  var icon = STATUS_ICONS[task.status] || STATUS_ICONS.pending;
  return React.createElement('div', {
    onClick: function() { if (onToggle) onToggle(task.id); },
    style: {
      display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '6px 12px',
      cursor: onToggle ? 'pointer' : 'default', borderRadius: '6px', transition: 'background 100ms',
    },
    onMouseEnter: function(e) { e.currentTarget.style.background = 'rgba(231,229,221,0.6)'; },
    onMouseLeave: function(e) { e.currentTarget.style.background = 'transparent'; },
  },
    React.createElement('span', { style: { marginTop: '2px', flexShrink: 0 } }, icon),
    React.createElement('span', {
      style: {
        fontSize: '13px', color: '#2c2a27',
        textDecoration: task.status === 'done' ? 'line-through' : 'none',
        opacity: task.status === 'done' ? 0.5 : 1, lineHeight: '1.4',
      }
    }, task.text)
  );
}

export function PlanPane({ tasks, title, collapsed, onToggleCollapse, onToggleTask }) {
  var doneCount = (tasks || []).filter(function(t) { return t.status === 'done'; }).length;
  var total = (tasks || []).length;
  return React.createElement('div', {
    style: {
      background: 'rgba(231,229,221,0.4)', borderRadius: '10px',
      border: '1px solid rgba(220,218,209,0.6)', overflow: 'hidden',
    }
  },
    React.createElement('div', {
      onClick: onToggleCollapse,
      style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', cursor: 'pointer' }
    },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        React.createElement('svg', {
          width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: '#2c2a27', strokeWidth: 2,
          style: { transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 150ms' }
        }, React.createElement('polyline', { points: '6 9 12 15 18 9' })),
        React.createElement('span', {
          style: { fontSize: '12px', fontWeight: 600, color: '#2c2a27', fontFamily: "'Inter', ui-sans-serif, sans-serif" }
        }, title || 'Tasks')
      ),
      total > 0 && React.createElement('span', {
        style: { fontSize: '11px', color: 'rgba(44,42,39,0.4)', fontFamily: "'Inter', ui-sans-serif, sans-serif" }
      }, doneCount + '/' + total)
    ),
    !collapsed && tasks && tasks.map(function(task) {
      return React.createElement(TaskItem, { key: task.id, task: task, onToggle: onToggleTask });
    })
  );
}
