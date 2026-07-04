import * as React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { StepIcon, metaFor } from './icons.jsx';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: '4px',
    paddingBottom: '8px'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '28px 1fr',
    columnGap: '14px',
    position: 'relative',
    minHeight: '48px'
  },
  railWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  connector: {
    width: '2px',
    flexGrow: 1,
    minHeight: '20px',
    backgroundColor: '#e8e8e8',
    borderRadius: '1px',
    transition: 'background-color 0.4s ease'
  },
  connectorActive: {
    background: 'linear-gradient(180deg, #7c6ae0 0%, #c4b5fd 100%)'
  },
  body: {
    paddingBottom: '20px',
    transform: 'translateY(2px)'
  },
  title: {
    display: 'block',
    fontSize: '15px',
    fontWeight: 600,
    color: '#1a1a1a',
    lineHeight: '22px'
  },
  sub: {
    display: 'block',
    fontSize: '13px',
    color: '#999',
    lineHeight: '18px',
    marginTop: '2px'
  },
  hidden: { opacity: 0, transform: 'translateY(12px)' },
  shown: {
    opacity: 1, transform: 'none',
    transition: 'opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1), transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)'
  },
  pulse: {
    animationName: {
      '0%, 100%': { opacity: 1, transform: 'scale(1)' },
      '50%': { opacity: 0.5, transform: 'scale(1.1)' }
    },
    animationDuration: '1.2s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out'
  }
});

export function ProcessTimeline({ steps, onComplete }) {
  const styles = useStyles();
  const [revealed, setRevealed] = React.useState(0);
  const list = steps && steps.length ? steps : [];

  React.useEffect(() => {
    setRevealed(0);
    if (!list.length) { onComplete && onComplete(); return; }
    let i = 0;
    let timer;
    const tick = () => {
      i += 1;
      setRevealed(i);
      if (i < list.length) {
        timer = setTimeout(tick, 500);
      } else {
        timer = setTimeout(() => onComplete && onComplete(), 400);
      }
    };
    timer = setTimeout(tick, 300);
    return () => clearTimeout(timer);
  }, [list.length, onComplete]);

  if (!list.length) return null;
  const running = revealed < list.length;

  return (
    <div className={styles.root}>
      {list.map((step, i) => {
        const meta = metaFor(step.app);
        const isShown = i < revealed;
        const isActive = i === revealed - 1 && running;
        const isLast = i === list.length - 1;
        return (
          <div key={i}
            className={`${styles.row} ${isShown ? styles.shown : styles.hidden}`}
            style={{ transitionDelay: isShown ? '0ms' : `${i * 60}ms` }}>
            <div className={styles.railWrap}>
              <div className={isActive ? styles.pulse : undefined}>
                <StepIcon app={step.app} size={24} />
              </div>
              {!isLast && (
                <div className={`${styles.connector} ${isActive ? styles.connectorActive : ''}`} />
              )}
            </div>
            <div className={styles.body}>
              <span className={styles.title}>{meta.title || step.app}</span>
              <span className={styles.sub}>{step.label || meta.title}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
