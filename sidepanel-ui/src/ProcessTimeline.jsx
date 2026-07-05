import * as React from 'react';

const S = {
  border: '#d0d7de', bgSubtle: '#f6f8fa', bgDefault: '#ffffff',
  fgDefault: '#1f2328', fgMuted: '#59636e', fgSubtle: '#818b98', fgAccent: '#0969da',
  fgSuccess: '#1a7f37', fgDanger: '#d1242f',
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
};

const APP_ICONS = {
  github: { letter: 'G', bg: '#1f2328', fg: '#fff' },
  npm: { letter: 'N', bg: '#cb3837', fg: '#fff' },
  stackoverflow: { letter: 'S', bg: '#f48024', fg: '#fff' },
  web: { letter: 'W', bg: '#de5833', fg: '#fff' },
  google: { letter: 'G', bg: '#4285f4', fg: '#fff' },
  gmail: { letter: 'M', bg: '#ea4335', fg: '#fff' },
  calendar: { letter: 'C', bg: '#4285f4', fg: '#fff' },
  sheets: { letter: 'S', bg: '#34a853', fg: '#fff' },
  drive: { letter: 'D', bg: '#fbbc05', fg: '#fff' },
  docs: { letter: 'D', bg: '#4285f4', fg: '#fff' },
  default: { letter: 'X', bg: '#656d76', fg: '#fff' },
};

function getIcon(tool) {
  return APP_ICONS[tool] || APP_ICONS.default;
}

function StepCard({ step, index, total }) {
  const icon = getIcon(step.app || 'default');
  const isActive = step.status === 'active';
  const isDone = step.status === 'done';
  const isError = step.status === 'error';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '4px 10px', borderRadius: '6px',
      background: isActive ? '#ddf4ff' : S.bgDefault,
      border: '1px solid ' + (isActive ? 'rgba(9,105,218,0.3)' : S.border),
      fontSize: '11px', whiteSpace: 'nowrap',
      animation: 'slideIn 0.2s ease',
      minWidth: '60px',
    }}>
      {/* App icon */}
      <div style={{
        width: '16px', height: '16px', borderRadius: '4px',
        background: icon.bg, color: icon.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '8px', fontWeight: '700', flexShrink: 0,
      }}>{icon.letter}</div>

      {/* Status dot */}
      {isActive && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: S.fgAccent, animation: 'pulse 1s infinite', flexShrink: 0 }} />}
      {isDone && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: S.fgSuccess, flexShrink: 0 }} />}
      {isError && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: S.fgDanger, flexShrink: 0 }} />}

      {/* Description */}
      <span style={{ color: S.fgMuted, overflow: 'hidden', textOverflow: 'ellipsis' }}>{step.description || step.app || 'Procesando...'}</span>
    </div>
  );
}

export function ProcessTimeline({ steps = [] }) {
  if (!steps.length) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '8px 16px', borderBottom: '1px solid ' + S.border,
      background: S.bgSubtle, overflowX: 'auto',
      scrollbarWidth: 'thin',
    }}>
      {steps.map((step, i) => (
        <React.Fragment key={step.id || i}>
          <StepCard step={step} index={i} total={steps.length} />
          {i < steps.length - 1 && (
            <svg viewBox="0 0 16 16" width="8" height="8" fill={S.fgSubtle} style={{ flexShrink: 0 }}>
              <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
            </svg>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
