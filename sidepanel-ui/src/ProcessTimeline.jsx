import * as React from 'react';
import { makeTokens } from '@fluentui/react-components';
import { StepIcon, metaFor } from './icons.jsx';

const iOS = {
  separator: '#f0f0f0', connector: '#e0e0e0', connectorActive: '#4b3ac9',
  title: '#1c1c1e', subtitle: '#8e8e93'
};

const styles = {
  root: {
    display: 'flex', flexDirection: 'column',
    paddingTop: '4px', paddingBottom: '8px'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '24px 1fr',
    gap: '12px',
    minHeight: '44px',
    transition: 'opacity 0.45s ease, transform 0.45s ease'
  },
  rail: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    transform: 'translateY(2px)'
  },
  line: {
    width: '2px', flexGrow: 1, minHeight: '18px',
    backgroundColor: iOS.connector, borderRadius: '1px',
    transition: 'background 0.3s'
  },
  lineActive: {
    background: 'linear-gradient(180deg, #4b3ac9 0%, #c4b5fd 100%)'
  },
  title: {
    fontSize: '14px', fontWeight: 600, color: iOS.title, lineHeight: '22px'
  },
  sub: {
    fontSize: '13px', color: iOS.subtitle, lineHeight: '18px', marginTop: '1px'
  },
  hidden: { opacity: 0, transform: 'translateY(10px)' },
  shown: { opacity: 1, transform: 'none' },
  pulse: {
    animationName: {
      '0%, 100%': { opacity: 1, transform: 'scale(1)' },
      '50%': { opacity: 0.5, transform: 'scale(1.15)' }
    },
    animationDuration: '1.2s',
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
    const tick = () => {
      i += 1;
      setRevealed(i);
      if (i < list.length) {
        setTimeout(tick, 480);
      } else {
        setTimeout(() => onComplete?.(), 400);
      }
    };
    const t = setTimeout(tick, 280);
    return () => clearTimeout(t);
  }, [list.length, onComplete]);

  if (!list.length) return null;

  const running = revealed < list.length;

  return React.createElement('div', { style: styles.root },
    list.map((step, i) => {
      const meta = metaFor(step.app);
      const isShown = i < revealed;
      const isActive = i === revealed - 1 && running;
      const isLast = i === list.length - 1;
      return React.createElement('div', {
        key: i,
        style: {
          ...styles.row,
          ...styles.hidden,
          ...(isShown ? styles.shown : {}),
          transitionDelay: isShown ? '0ms' : `${i * 50}ms`
        }
      },
        React.createElement('div', { style: styles.rail },
          React.createElement('div', {
            style: isActive ? { ...styles.pulse, display: 'flex' } : { display: 'flex' }
          },
            React.createElement(StepIcon, { app: step.app, size: 22 })
          ),
          !isLast && React.createElement('div', {
            style: { ...styles.line, ...(isActive ? styles.lineActive : {}) }
          })
        ),
        React.createElement('div', { style: { paddingBottom: '18px', transform: 'translateY(1px)' } },
          React.createElement('div', { style: styles.title }, meta.title || step.app),
          React.createElement('div', { style: styles.sub }, step.label || meta.title)
        )
      );
    })
  );
}
