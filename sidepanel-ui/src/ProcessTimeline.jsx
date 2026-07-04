import * as React from 'react';
import { StepIcon, metaFor } from './icons.jsx';

const style = {
  root: {
    display: 'flex', flexDirection: 'column',
    paddingTop: '6px', paddingBottom: '4px'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '22px 1fr',
    gap: '12px',
    minHeight: '42px',
    transition: 'opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1), transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
  },
  rail: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    transform: 'translateY(1px)'
  },
  line: {
    width: '2px', flexGrow: 1, minHeight: '16px',
    backgroundColor: '#e8e8e8', borderRadius: '1px',
    transition: 'background 0.4s ease'
  },
  lineActive: {
    background: 'linear-gradient(180deg, #4b3ac9 0%, #c4b5fd 100%)'
  },
  title: {
    fontSize: '14px', fontWeight: 590, color: '#1c1c1e',
    lineHeight: '22px', letterSpacing: '-0.1px'
  },
  sub: {
    fontSize: '13px', color: '#8e8e93',
    lineHeight: '18px', marginTop: '1px'
  },
  hidden: { opacity: 0, transform: 'translateY(8px)' },
  shown: { opacity: 1, transform: 'none' },
  pulse: {
    animationName: {
      '0%, 100%': { opacity: 1, transform: 'scale(1)' },
      '50%': { opacity: 0.4, transform: 'scale(1.12)' }
    },
    animationDuration: '1.4s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out'
  }
};

export function ProcessTimeline({ steps, onComplete }) {
  const [revealed, setRevealed] = React.useState(0);
  const list = steps?.length ? steps : [];

  React.useEffect(() => {
    setRevealed(0);
    if (!list.length) { onComplete?.(); return; }
    let i = 0;
    const t = setTimeout(() => {
      const tick = () => {
        i += 1;
        setRevealed(i);
        if (i < list.length) {
          setTimeout(tick, 420);
        } else {
          setTimeout(() => onComplete?.(), 350);
        }
      };
      tick();
    }, 250);
    return () => clearTimeout(t);
  }, [list.length, onComplete]);

  if (!list.length) return null;

  const running = revealed < list.length;

  return (
    <div style={style.root}>
      {list.map((step, i) => {
        const meta = metaFor(step.app);
        const isShown = i < revealed;
        const isActive = i === revealed - 1 && running;
        const isLast = i === list.length - 1;
        return (
          <div key={i}
            style={{
              ...style.row,
              ...style.hidden,
              ...(isShown ? style.shown : {}),
              transitionDelay: isShown ? '0ms' : `${i * 40}ms`
            }}>
            <div style={style.rail}>
              <div style={isActive ? style.pulse : { display: 'flex', alignItems: 'center' }}>
                <StepIcon app={step.app} size={22} />
              </div>
              {!isLast && (
                <div style={{ ...style.line, ...(isActive ? style.lineActive : {}) }} />
              )}
            </div>
            <div style={{ paddingBottom: '16px', transform: 'translateY(0)' }}>
              <div style={style.title}>{meta.title || step.app}</div>
              <div style={style.sub}>{step.label || meta.title}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
