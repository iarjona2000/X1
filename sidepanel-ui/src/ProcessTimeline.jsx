import * as React from 'react';
import {
  XIcon, SyncIcon, DotFillIcon, FileIcon, SearchIcon,
  GitBranchIcon, GitPullRequestIcon, LinkIcon, CommentDiscussionIcon,
  PencilIcon, AlertIcon,
} from '@primer/octicons-react';

const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";
const MONO = "'SF Mono', 'Cascadia Code', Consolas, monospace";

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

// ── ProcessLog: registro compacto del proceso (analisis de repo,
// automatizacion), inspirado en como Claude Code muestra sus llamadas a
// herramientas — una linea por paso, icono pequeno (Octicons), sin circulos
// grandes ni ticks que ocupen espacio. Cada paso: [icono] titulo · detalle. ──

// Icono por tipo de accion, deducido del id del paso (ver github-agent.js:
// 'read:*'/'tree' = fichero, 'ai'/'plan'/'generate' = consulta a IA,
// 'search:*' = busqueda, 'url' = lectura de pagina, 'branch' = git,
// 'commit:*' = escritura, 'pr' = pull request).
function actionIcon(id) {
  var s = String(id || '');
  if (/^(t\d+:)?search:/.test(s)) return SearchIcon;
  if (/^(t\d+:)?url$/.test(s)) return LinkIcon;
  if (/^(t\d+:)?(read|tree|nokeys|read-existing)/.test(s)) return FileIcon;
  if (/^(t\d+:)?(ai|plan|generate)$/.test(s)) return CommentDiscussionIcon;
  if (s === 'branch') return GitBranchIcon;
  if (/^commit:/.test(s)) return PencilIcon;
  if (s === 'pr') return GitPullRequestIcon;
  if (s === 'fatal') return AlertIcon;
  return DotFillIcon;
}

// Contador de tiempo en vivo mientras un paso esta 'active' — asi nunca
// "parece colgado": aunque una consulta a la IA tarde 30-60s, el usuario ve
// los segundos correr y sabe que sigue trabajando.
function LiveElapsed({ startedAt }) {
  var [now, setNow] = React.useState(Date.now());
  React.useEffect(function () {
    if (!startedAt) return;
    var id = setInterval(function () { setNow(Date.now()); }, 1000);
    return function () { clearInterval(id); };
  }, [startedAt]);
  if (!startedAt) return null;
  var secs = Math.max(0, Math.round((now - startedAt) / 1000));
  return React.createElement('span', { style: { color: '#0969da' } }, ' (' + secs + 's)');
}

// Un solo icono por linea (no dos): en pending/done es el icono de la
// accion (fichero, busqueda, IA...); en active se sustituye por un SyncIcon
// girando; en error, por una XIcon. Done no lleva ningun check — solo se
// atenua el icono de accion, para no repetir el mismo "tick verde" en cada
// linea.
function StepIcon({ step }) {
  var status = step.status;
  if (status === 'active') return React.createElement(SyncIcon, { size: 12, fill: '#0969da', style: { animation: 'spin 1s linear infinite' } });
  if (status === 'error') return React.createElement(XIcon, { size: 12, fill: '#d1242f' });
  var Icon = actionIcon(step.id);
  return React.createElement(Icon, { size: 12, fill: status === 'done' ? '#1a7f37' : '#818b98' });
}

function LogStep({ step }) {
  var isActive = step.status === 'active';
  var isError = step.status === 'error';
  var isDone = step.status === 'done';
  var titleColor = isError ? '#d1242f' : isActive ? '#0969da' : isDone ? '#1f2328' : '#59636e';

  return React.createElement('div', { style: { padding: '2px 0' } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '6px' } },
      React.createElement('span', { style: { flexShrink: 0, marginTop: '2px' } }, React.createElement(StepIcon, { step: step })),
      React.createElement('div', { style: { minWidth: 0, flex: 1 } },
        React.createElement('span', { style: { fontSize: '12px', fontFamily: MONO, color: titleColor, lineHeight: '1.5' } },
          step.title,
          step.detail ? React.createElement('span', { style: { color: '#818b98', fontFamily: F } }, ' — ' + step.detail) : null,
          isActive ? React.createElement(LiveElapsed, { startedAt: step.startedAt }) : null
        ),
        step.why ? React.createElement('div', {
          style: { fontSize: '11px', color: '#818b98', lineHeight: '1.4', marginTop: '1px', marginLeft: '2px' }
        }, step.why) : null
      )
    )
  );
}

export function ProcessLog({ steps = [], title }) {
  if (!steps.length) return null;
  return React.createElement('div', {
    style: {
      padding: '10px 12px', border: '1px solid #d0d7de', borderRadius: '6px',
      background: '#f6f8fa', fontFamily: F,
    }
  },
    title ? React.createElement('div', {
      style: { fontSize: '10px', fontWeight: '600', color: '#818b98', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }
    }, title) : null,
    steps.map(function(step, i) {
      return React.createElement(LogStep, { key: step.id || i, step: step });
    })
  );
}
