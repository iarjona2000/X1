var STATUS_ICONS = {
  pending: React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'rgba(38,37,30,0.25)', strokeWidth: 2 },
    React.createElement('circle', { cx: 12, cy: 12, r: 10 })
  ),
  in_progress: React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: '#f54e00', strokeWidth: 2 },
    React.createElement('path', { d: 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83' })
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
      display: 'flex', alignItems: 'flex-start', gap: '8px',
      padding: '6px 12px', cursor: onToggle ? 'pointer' : 'default',
      borderRadius: '6px',
      transition: 'background 100ms',
    },
    onMouseEnter: function(e) { e.currentTarget.style.background = 'rgba(38,37,30,0.04)'; },
    onMouseLeave: function(e) { e.currentTarget.style.background = 'transparent'; },
  },
    React.createElement('span', { style: { marginTop: '2px', flexShrink: 0 } }, icon),
    React.createElement('span', {
      style: {
        fontSize: '13px', color: '#26251e',
        textDecoration: task.status === 'done' ? 'line-through' : 'none',
        opacity: task.status === 'done' ? 0.5 : 1,
        lineHeight: '1.4',
      }
    }, task.text)
  );
}

export function PlanPane({ tasks, title, collapsed, onToggleCollapse, onToggleTask }) {
  var doneCount = (tasks || []).filter(function(t) { return t.status === 'done'; }).length;
  var total = (tasks || []).length;

  return React.createElement('div', {
    style: {
      background: 'rgba(38,37,30,0.02)',
      borderRadius: '10px',
      border: '1px solid rgba(38,37,30,0.06)',
      overflow: 'hidden',
    }
  },
    React.createElement('div', {
      onClick: onToggleCollapse,
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', cursor: 'pointer',
      }
    },
      React.createElement('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: '8px',
        }
      },
        React.createElement('svg', {
          width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none',
          stroke: '#26251e', strokeWidth: 2,
          style: {
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms',
          }
        },
          React.createElement('polyline', { points: '6 9 12 15 18 9' })
        ),
        React.createElement('span', {
          style: {
            fontSize: '12px', fontWeight: 600, color: '#26251e',
            fontFamily: "'Inter', system-ui, sans-serif",
          }
        }, title || 'Tasks')
      ),
      total > 0 && React.createElement('span', {
        style: {
          fontSize: '11px', color: 'rgba(38,37,30,0.40)',
          fontFamily: "'Inter', system-ui, sans-serif",
        }
      }, doneCount + '/' + total)
    ),
    !collapsed && tasks && tasks.map(function(task) {
      return React.createElement(TaskItem, {
        key: task.id,
        task: task,
        onToggle: onToggleTask,
      });
    })
  );
}
