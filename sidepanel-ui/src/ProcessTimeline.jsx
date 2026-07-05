import * as React from 'react';

const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";

// Iconos originales de las apps por las que pasa el proceso (relativos a sidepanel/panel.html).
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

function StepCard({ step }) {
  const isActive = step.status === 'active';
  const isDone = step.status === 'done';
  const isError = step.status === 'error';
  const src = step.iconSrc || APP_ICON_SRC[step.app];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '7px',
      padding: '5px 10px', borderRadius: '6px',
      background: isActive ? '#ddf4ff' : '#ffffff',
      border: '1px solid ' + (isActive ? 'rgba(9,105,218,0.4)' : '#d0d7de'),
      fontSize: '11px', whiteSpace: 'nowrap',
      animation: 'slideIn 0.2s ease',
      minWidth: '60px', lineHeight: '1.5',
      transition: 'all 80ms',
    }}>
      {/* App / AI icon (original) */}
      {src ? (
        <img src={src} alt="" style={{ width: '16px', height: '16px', borderRadius: '4px', objectFit: 'contain', flexShrink: 0 }}
          onError={function(e) { e.currentTarget.style.display = 'none'; }} />
      ) : (
        <div style={{
          width: '16px', height: '16px', borderRadius: '4px',
          background: '#656d76', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '8px', fontWeight: '700', flexShrink: 0,
        }}>X</div>
      )}

      {/* Status dot */}
      {isActive && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0969da', animation: 'pulse 1s infinite', flexShrink: 0 }} />}
      {isDone && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1a7f37', flexShrink: 0 }} />}
      {isError && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d1242f', flexShrink: 0 }} />}

      {/* Description */}
      <span style={{ color: '#59636e', overflow: 'hidden', textOverflow: 'ellipsis' }}>{step.description || step.app || 'Procesando...'}</span>
    </div>
  );
}

export function ProcessTimeline({ steps = [] }) {
  if (!steps.length) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '7px',
      padding: '10px 16px', borderBottom: '1px solid #d0d7de',
      background: '#f6f8fa', overflowX: 'auto',
      scrollbarWidth: 'thin', fontFamily: F,
    }}>
      {steps.map((step, i) => (
        <React.Fragment key={step.id || i}>
          <StepCard step={step} />
          {i < steps.length - 1 && (
            <svg viewBox="0 0 16 16" width="8" height="8" fill="#818b98" style={{ flexShrink: 0 }}>
              <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
            </svg>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
