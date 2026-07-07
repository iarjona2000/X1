import * as React from 'react';

var STEP_ICONS = {
  researching: React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: '#0070f3', strokeWidth: 2 },
    React.createElement('circle', { cx: 11, cy: 11, r: 8 }),
    React.createElement('line', { x1: 21, y1: 21, x2: 16.65, y2: 16.65 })
  ),
  writing: React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: '#1f8a65', strokeWidth: 2 },
    React.createElement('path', { d: 'M12 20h9' }),
    React.createElement('path', { d: 'M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z' })
  ),
  reviewing: React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: '#6c44fc', strokeWidth: 2 },
    React.createElement('path', { d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' }),
    React.createElement('circle', { cx: 12, cy: 12, r: 3 })
  ),
  approving: React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: '#f54e00', strokeWidth: 2 },
    React.createElement('path', { d: 'M22 11.08V12a10 10 0 11-5.93-9.14' }),
    React.createElement('polyline', { points: '22 4 12 14.01 9 11.01' })
  ),
};

var STEP_LABELS = {
  researching: 'Researching',
  writing: 'Writing',
  reviewing: 'Reviewing',
  approving: 'Approving',
};

function FlowStep({ step, index, total }) {
  var isLast = index === total - 1;
  return React.createElement('div', {
    style: { display: 'flex', gap: '10px', alignItems: 'flex-start' }
  },
    React.createElement('div', {
      style: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: '20px', flexShrink: 0,
      }
    },
      React.createElement('div', {
        style: {
          width: '20px', height: '20px', borderRadius: '50%',
          background: step.active ? '#f54e00' : 'rgba(38,37,30,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 150ms',
        }
      }, STEP_ICONS[step.type] || STEP_ICONS.researching),
      !isLast && React.createElement('div', {
        style: {
          width: '1px', height: '24px',
          background: 'rgba(38,37,30,0.10)',
          marginTop: '4px',
        }
      })
    ),
    React.createElement('div', { style: { paddingTop: '1px' } },
      React.createElement('div', {
        style: {
          fontSize: '12px', fontWeight: 500,
          color: step.active ? '#26251e' : 'rgba(38,37,30,0.55)',
        }
      }, STEP_LABELS[step.type] || step.type),
      step.detail && React.createElement('div', {
        style: {
          fontSize: '11px', color: 'rgba(38,37,30,0.40)',
          marginTop: '1px',
        }
      }, step.detail)
    )
  );
}

export function AgentFlow({ steps, activeStep }) {
  if (!steps || steps.length === 0) return null;

  return React.createElement('div', {
    style: {
      padding: '8px 12px',
      background: 'rgba(38,37,30,0.02)',
      borderRadius: '8px',
      border: '1px solid rgba(38,37,30,0.06)',
    }
  },
    React.createElement('div', {
      style: {
        fontSize: '11px', fontWeight: 600,
        color: 'rgba(38,37,30,0.55)',
        fontFamily: "'Inter', system-ui, sans-serif",
        textTransform: 'uppercase', letterSpacing: '0.05em',
        marginBottom: '8px',
      }
    }, 'Agent Flow'),
    steps.map(function(step, i) {
      return React.createElement(FlowStep, {
        key: i,
        step: Object.assign({}, step, { active: i === activeStep }),
        index: i,
        total: steps.length,
      });
    })
  );
}
