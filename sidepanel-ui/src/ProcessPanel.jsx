import * as React from 'react';

const F = "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'Geist Mono', 'SF Mono', 'Cascadia Code', Consolas, monospace";

function Tick() {
  return React.createElement('svg', { viewBox: '0 0 16 16', width: '16', height: '16', fill: '#000000' },
    React.createElement('path', { d: 'M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z' })
  );
}

function Spinner() {
  return React.createElement('svg', {
    viewBox: '0 0 16 16', width: '16', height: '16',
    style: { animation: 'spin 0.8s linear infinite' }
  },
    React.createElement('circle', { cx: '8', cy: '8', r: '6', fill: 'none', stroke: 'rgba(0,112,243,0.3)', strokeWidth: '2' }),
    React.createElement('path', { d: 'M8 2a6 6 0 016 6', fill: 'none', stroke: '#000000', strokeWidth: '2', strokeLinecap: 'round' })
  );
}

function ErrorCross() {
  return React.createElement('svg', { viewBox: '0 0 16 16', width: '16', height: '16', fill: '#dc2626' },
    React.createElement('path', { d: 'M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z' })
  );
}

function LiveElapsed({ startedAt }) {
  var [now, setNow] = React.useState(Date.now());
  React.useEffect(function () {
    if (!startedAt) return;
    var id = setInterval(function () { setNow(Date.now()); }, 1000);
    return function () { clearInterval(id); };
  }, [startedAt]);
  if (!startedAt) return null;
  var secs = Math.max(0, Math.round((now - startedAt) / 1000));
  return React.createElement('span', { style: { fontSize: '12px', color: '#000000', fontWeight: '600' } }, secs + 's');
}

export function ProcessPanel({ steps = [], isRunning = false, title = 'Procedimiento de ejecución' }) {
  if (!steps.length) return null;

  var hasErrors = steps.some(function(s) { return s.status === 'error'; });
  var doneCount = steps.filter(function(s) { return s.status === 'done'; }).length;

  return React.createElement('div', {
    style: {
      background: '#ffffff', border: '1px solid #e8e8e8', borderRadius: '12px',
      padding: '16px', marginBottom: '16px', fontFamily: F,
      boxShadow: 'var(--x1-shadow-sm)',
    }
  },
    // Header
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #e8e8e8' } },
      React.createElement('div', null,
        React.createElement('h3', { style: { fontSize: '14px', fontWeight: '600', color: '#000000', margin: '0 0 2px 0' } }, title),
        React.createElement('span', { style: { fontSize: '12px', color: '#707070' } },
          doneCount + ' de ' + steps.length + ' completados' + (hasErrors ? ' · Errores detectados' : '')
        )
      ),
      isRunning ? React.createElement(Spinner, null) : null
    ),

    // Progress bar
    React.createElement('div', {
      style: {
        height: '4px', background: '#eeeeee', borderRadius: '2px', marginBottom: '14px', overflow: 'hidden',
      }
    },
      React.createElement('div', {
        style: {
          height: '100%', background: hasErrors ? '#dc2626' : '#000000',
          width: (doneCount / steps.length * 100) + '%',
          transition: 'width 300ms ease',
        }
      })
    ),

    // Steps list (vertical)
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
      steps.map(function(step, i) {
        var isActive = step.status === 'active';
        var isDone = step.status === 'done';
        var isError = step.status === 'error';
        var isPending = !isActive && !isDone && !isError;

        var borderColor = isDone ? '#eeeeee' : isActive ? '#eeeeee' : isError ? '#fbe9e9' : '#f7f7f7';
        var bg = isDone ? '#eeeeee' : isActive ? '#eeeeee' : isError ? '#fbe9e9' : '#f7f7f7';

        return React.createElement('div', {
          key: step.id || i,
          style: {
            display: 'flex', alignItems: 'flex-start', gap: '12px',
            padding: '10px 12px', borderRadius: '8px', background: bg,
            border: '1px solid ' + borderColor, transition: 'all 200ms ease',
          }
        },
          // Icon
          React.createElement('div', { style: { flexShrink: 0, marginTop: '2px' } },
            isDone ? React.createElement(Tick, null)
            : isError ? React.createElement(ErrorCross, null)
            : isActive ? React.createElement(Spinner, null)
            : React.createElement('div', {
                style: { width: '16px', height: '16px', borderRadius: '50%', background: '#e8e8e8' }
              })
          ),

          // Content
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' } },
              React.createElement('span', {
                style: {
                  fontSize: '13px', fontWeight: isDone || isActive ? '600' : '500',
                  color: isError ? '#dc2626' : isDone ? '#000000' : isActive ? '#000000' : '#707070',
                }
              }, (i + 1) + '. ' + (step.description || step.app || 'Procesando')),
              isActive ? React.createElement(LiveElapsed, { startedAt: step.startedAt }) : null,
              isDone && step.finishedAt && step.startedAt ?
                React.createElement('span', { style: { fontSize: '11px', color: '#a3a3a3' } },
                  '(' + Math.round((step.finishedAt - step.startedAt) / 1000) + 's)'
                ) : null
            ),
            step.sub ? React.createElement('div', { style: { fontSize: '12px', color: '#707070', marginBottom: '4px' } }, step.sub) : null,
            step.details ? React.createElement('div', {
              style: { fontSize: '11px', color: '#a3a3a3', fontFamily: MONO, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '80px', overflow: 'auto' }
            }, step.details) : null
          )
        );
      })
    )
  );
}
