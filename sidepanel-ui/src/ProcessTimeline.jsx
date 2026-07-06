import * as React from 'react';

const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";

// Iconos originales de las apps por las que pasa el proceso.
const APP_ICON_SRC = {
  github: '../assets/github_48dp.svg',
  gmail: '../assets/gmail_48dp.png',
  calendar: '../assets/calendar_48dp.png',
  docs: '../assets/docs_48dp.png',
  drive: '../assets/drive_48dp.png',
  sheets: '../assets/sheets_48dp.png',
  slides: '../assets/slides_48dp.png',
  meet: '../assets/meet_48dp.png',
  contacts: '../assets/contacts_48dp.png',
  tasks: '../assets/tasks_48dp.png',
};

// Cuerpo del tick (check) blanco que se muestra al completar.
function Tick() {
  return React.createElement('svg', { viewBox: '0 0 16 16', width: '14', height: '14', fill: '#ffffff' },
    React.createElement('path', { d: 'M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z' })
  );
}

function Spinner() {
  return React.createElement('svg', { viewBox: '0 0 16 16', width: '14', height: '14', style: { animation: 'spin 0.8s linear infinite' } },
    React.createElement('circle', { cx: '8', cy: '8', r: '6', fill: 'none', stroke: 'rgba(255,255,255,0.3)', strokeWidth: '2' }),
    React.createElement('path', { d: 'M8 2a6 6 0 016 6', fill: 'none', stroke: '#ffffff', strokeWidth: '2', strokeLinecap: 'round' })
  );
}

function ErrorCross() {
  return React.createElement('svg', { viewBox: '0 0 16 16', width: '14', height: '14', fill: '#ffffff' },
    React.createElement('path', { d: 'M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z' })
  );
}

function StepCircle({ step, index, total }) {
  var isActive = step.status === 'active';
  var isDone = step.status === 'done';
  var isError = step.status === 'error';
  var isPending = !isActive && !isDone && !isError;

  var src = step.iconSrc || APP_ICON_SRC[step.app];

  // Color del circulo segun estado.
  var bg = '#ffffff';
  var border = '#d0d7de';
  if (isPending) { bg = '#f6f8fa'; border = '#d0d7de'; }
  if (isActive) { bg = '#0969da'; border = '#0969da'; }
  if (isDone)   { bg = '#1a7f37'; border = '#1a7f37'; }
  if (isError)  { bg = '#d1242f'; border = '#d1242f'; }

  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
    // Circulo rellenable (28px) con icono de la app o tick
    React.createElement('div', {
      style: {
        width: '28px', height: '28px', borderRadius: '50%',
        background: bg, border: '2px solid ' + border,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all 200ms ease',
        boxShadow: isActive ? '0 0 0 3px rgba(9,105,218,0.2)' : 'none',
        animation: isActive ? 'breathe 1.2s ease-in-out infinite' : 'none',
      }
    },
      // Si done -> tick blanco sobre verde
      isDone ? React.createElement(Tick, null)
      // Si error -> X blanco sobre rojo
      : isError ? React.createElement(ErrorCross, null)
      // Si active -> spinner blanco sobre azul
      : isActive ? React.createElement(Spinner, null)
      // Si pending -> icono de la app original o placeholder
      : src ? React.createElement('img', {
            src: src, alt: '',
            style: { width: '16px', height: '16px', borderRadius: '4px', objectFit: 'contain' },
            onError: function(e) { e.currentTarget.style.display = 'none'; }
          })
        : React.createElement('div', {
            style: { width: '8px', height: '8px', borderRadius: '50%', background: '#818b98' }
          })
    ),
    // Label del paso
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '1px' } },
      React.createElement('span', {
        style: {
          fontSize: '12px', fontWeight: isDone || isActive ? '600' : '500',
          color: isError ? '#d1242f' : isDone ? '#1a7f37' : isActive ? '#0969da' : '#59636e',
          whiteSpace: 'nowrap', lineHeight: '1.2', transition: 'color 200ms',
        }
      }, step.description || step.app || 'Procesando...'),
      // Sub-label opcional (p.ej. nombre IA)
      step.sub ? React.createElement('span', { style: { fontSize: '10px', color: '#818b98', whiteSpace: 'nowrap' } }, step.sub) : null
    ),
    // Linea conectora entre circulos (excepto el ultimo)
    index < total - 1 ? React.createElement('div', {
      style: {
        width: '20px', height: '2px',
        background: isDone ? '#1a7f37' : '#d0d7de',
        margin: '0 4px', flexShrink: 0, transition: 'background 200ms',
      }
    }) : null
  );
}

export function ProcessTimeline({ steps = [] }) {
  if (!steps.length) return null;

  return React.createElement('div', {
    style: {
      display: 'flex', alignItems: 'center', gap: '0',
      padding: '12px 16px', borderBottom: '1px solid #d0d7de',
      background: '#f6f8fa', overflowX: 'auto',
      scrollbarWidth: 'thin', fontFamily: F,
    }
  },
    steps.map(function(step, i) {
      return React.createElement(StepCircle, { key: step.id || i, step: step, index: i, total: steps.length });
    })
  );
}

// ── ProcessLog: registro vertical y detallado del proceso (analisis de repo,
// automatizacion). A diferencia de ProcessTimeline (fila horizontal compacta
// para el chat), aqui cada paso lleva titulo + detalle/razon + linea vertical
// conectora, al estilo del log de un GitHub Actions run. ──
function LogDot({ status }) {
  var isActive = status === 'active';
  var isDone = status === 'done';
  var isError = status === 'error';

  var bg = '#f6f8fa', border = '#d0d7de';
  if (isActive) { bg = '#0969da'; border = '#0969da'; }
  if (isDone)   { bg = '#1a7f37'; border = '#1a7f37'; }
  if (isError)  { bg = '#d1242f'; border = '#d1242f'; }

  return React.createElement('div', {
    style: {
      width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
      background: bg, border: '2px solid ' + border,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: isActive ? '0 0 0 3px rgba(9,105,218,0.15)' : 'none',
      animation: isActive ? 'breathe 1.2s ease-in-out infinite' : 'none',
      transition: 'all 200ms ease',
    }
  },
    isDone ? React.createElement(Tick, null)
    : isError ? React.createElement(ErrorCross, null)
    : isActive ? React.createElement(Spinner, null)
    : React.createElement('div', { style: { width: '6px', height: '6px', borderRadius: '50%', background: '#818b98' } })
  );
}

// Contador de tiempo en vivo mientras un paso esta 'active' — asi nunca
// "parece colgado": aunque una consulta a la IA tarde 60s, el usuario ve los
// segundos correr y sabe que sigue trabajando.
function LiveElapsed({ startedAt }) {
  var [now, setNow] = React.useState(Date.now());
  React.useEffect(function () {
    if (!startedAt) return;
    var id = setInterval(function () { setNow(Date.now()); }, 1000);
    return function () { clearInterval(id); };
  }, [startedAt]);
  if (!startedAt) return null;
  var secs = Math.max(0, Math.round((now - startedAt) / 1000));
  return React.createElement('span', { style: { color: '#0969da', fontWeight: '600' } }, ' · ' + secs + 's');
}

function LogStep({ step, index, total }) {
  var isActive = step.status === 'active';
  var isDone = step.status === 'done';
  var isError = step.status === 'error';
  var titleColor = isError ? '#d1242f' : isActive ? '#0969da' : '#1f2328';

  return React.createElement('div', { style: { display: 'flex', gap: '10px' } },
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 } },
      React.createElement(LogDot, { status: step.status }),
      index < total - 1 ? React.createElement('div', {
        style: { width: '2px', flex: 1, minHeight: '14px', background: isDone ? '#1a7f37' : '#d0d7de', margin: '2px 0', transition: 'background 200ms' }
      }) : null
    ),
    React.createElement('div', { style: { paddingBottom: index < total - 1 ? '14px' : '2px', minWidth: 0, flex: 1 } },
      React.createElement('div', { style: { fontSize: '13px', fontWeight: isActive || isDone ? '600' : '500', color: titleColor, lineHeight: '1.4' } },
        step.title,
        isActive ? React.createElement(LiveElapsed, { startedAt: step.startedAt }) : null
      ),
      step.detail ? React.createElement('div', {
        style: { fontSize: '12px', color: '#59636e', lineHeight: '1.5', marginTop: '2px', wordBreak: 'break-word' }
      }, step.detail) : null,
      step.why ? React.createElement('div', {
        style: { fontSize: '11px', color: '#818b98', lineHeight: '1.5', marginTop: '3px', fontStyle: 'italic' }
      }, step.why) : null
    )
  );
}

export function ProcessLog({ steps = [], title }) {
  if (!steps.length) return null;
  return React.createElement('div', {
    style: {
      padding: '14px 16px', border: '1px solid #d0d7de', borderRadius: '6px',
      background: '#ffffff', fontFamily: F,
    }
  },
    title ? React.createElement('div', {
      style: { fontSize: '12px', fontWeight: '600', color: '#59636e', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '12px' }
    }, title) : null,
    steps.map(function(step, i) {
      return React.createElement(LogStep, { key: step.id || i, step: step, index: i, total: steps.length });
    })
  );
}
