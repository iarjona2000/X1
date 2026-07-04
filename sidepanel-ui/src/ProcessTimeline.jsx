/*
 * Timeline de proceso vertical — se "razona" en el momento en que el usuario
 * pregunta y revela cada paso con el icono original de la app, con el estilo
 * de la referencia: logos sueltos, tipografía grande y amable, subtítulo gris
 * claro, conector fino que se ilumina en azul en el paso activo, y espaciado
 * generoso.
 */

import * as React from 'react';
import { makeStyles, tokens, Text } from '@fluentui/react-components';
import { StepIcon, metaFor } from './icons.jsx';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: tokens.spacingVerticalS
  },
  head: {
    color: tokens.colorNeutralForeground4,
    fontSize: tokens.fontSizeBase300,
    marginBottom: tokens.spacingVerticalM,
    paddingLeft: '2px'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '32px 1fr',
    columnGap: tokens.spacingHorizontalL,
    position: 'relative'
  },
  railWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px'
  },
  connector: {
    width: '2px',
    flexGrow: 1,
    minHeight: '18px',
    background: tokens.colorNeutralStroke3,
    borderRadius: '1px',
    transition: 'background 0.5s ease'
  },
  connectorActive: {
    background: 'linear-gradient(#7cb6f8, #cfe4fc)'
  },
  body: {
    paddingBottom: '26px',
    minWidth: 0,
    transform: 'translateY(3px)'
  },
  title: {
    display: 'block',
    fontSize: '16px',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: '22px'
  },
  sub: {
    display: 'block',
    fontSize: '14px',
    color: tokens.colorNeutralForeground3,
    lineHeight: '20px',
    marginTop: '1px'
  },
  hidden: { opacity: 0, transform: 'translateY(8px)' },
  shown: {
    opacity: 1,
    transform: 'none',
    transition: 'opacity 0.4s ease, transform 0.4s ease'
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
        timer = setTimeout(tick, 560);
      } else {
        timer = setTimeout(() => onComplete && onComplete(), 500);
      }
    };
    timer = setTimeout(tick, 280);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);

  if (!list.length) return null;
  const running = revealed < list.length;

  return (
    <div className={styles.root}>
      {running && <Text className={styles.head}>Ejecutando…</Text>}
      {list.map((step, i) => {
        const meta = metaFor(step.app);
        const isShown = i < revealed;
        const isActive = i === revealed - 1 && running;
        const isLast = i === list.length - 1;
        return (
          <div key={i} className={`${styles.row} ${isShown ? styles.shown : styles.hidden}`}>
            <div className={styles.railWrap}>
              <div className={isActive ? styles.pulse : undefined}>
                <StepIcon app={step.app} size={30} />
              </div>
              {!isLast && (
                <div className={`${styles.connector} ${isActive ? styles.connectorActive : ''}`} />
              )}
            </div>
            <div className={styles.body}>
              <Text className={styles.title}>{meta.title || step.app}</Text>
              <Text className={styles.sub}>{step.label || meta.title}</Text>
            </div>
          </div>
        );
      })}
    </div>
  );
}
