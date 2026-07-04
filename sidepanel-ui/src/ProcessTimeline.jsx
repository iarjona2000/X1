/*
 * Timeline de proceso vertical — se "razona" en el momento en que el usuario
 * pregunta y revela cada paso con el icono original de la app (estilo de la
 * imagen de referencia). Cada paso: icono + título + subtítulo, unidos por una
 * línea vertical que se ilumina en el paso activo.
 */

import * as React from 'react';
import { makeStyles, tokens, Caption1, Text } from '@fluentui/react-components';
import { StepIcon, metaFor } from './icons.jsx';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: tokens.spacingVerticalXS
  },
  head: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
    marginBottom: tokens.spacingVerticalS,
    paddingLeft: '2px'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '30px 1fr',
    columnGap: tokens.spacingHorizontalM,
    position: 'relative'
  },
  railWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  connector: {
    width: '2px',
    flexGrow: 1,
    minHeight: '14px',
    background: tokens.colorNeutralStroke2,
    borderRadius: '1px',
    transition: 'background 0.4s ease'
  },
  connectorActive: {
    background: `linear-gradient(${tokens.colorBrandStroke1}, ${tokens.colorNeutralStroke2})`
  },
  body: {
    paddingBottom: tokens.spacingVerticalL,
    minWidth: 0,
    transform: 'translateY(2px)'
  },
  title: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: '20px'
  },
  sub: {
    color: tokens.colorNeutralForeground3,
    display: 'block'
  },
  hidden: { opacity: 0, transform: 'translateY(6px)' },
  shown: {
    opacity: 1,
    transform: 'none',
    transition: 'opacity 0.35s ease, transform 0.35s ease'
  },
  pulse: {
    animationName: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.45 }
    },
    animationDuration: '1.1s',
    animationIterationCount: 'infinite'
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
        timer = setTimeout(tick, 520);
      } else {
        timer = setTimeout(() => onComplete && onComplete(), 480);
      }
    };
    timer = setTimeout(tick, 260);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);

  if (!list.length) return null;
  const running = revealed < list.length;

  return (
    <div className={styles.root}>
      {running && <Caption1 className={styles.head}>Ejecutando…</Caption1>}
      {list.map((step, i) => {
        const meta = metaFor(step.app);
        const isShown = i < revealed;
        const isActive = i === revealed - 1 && running;
        const isLast = i === list.length - 1;
        return (
          <div key={i} className={`${styles.row} ${isShown ? styles.shown : styles.hidden}`}>
            <div className={styles.railWrap}>
              <div className={isActive ? styles.pulse : undefined}>
                <StepIcon app={step.app} />
              </div>
              {!isLast && (
                <div className={`${styles.connector} ${isActive ? styles.connectorActive : ''}`} />
              )}
            </div>
            <div className={styles.body}>
              <Text className={styles.title}>{meta.title || step.app}</Text>
              <Caption1 className={styles.sub}>{step.label || meta.title}</Caption1>
            </div>
          </div>
        );
      })}
    </div>
  );
}
