import * as React from 'react';
import {
  makeTokens, makeStyles, shorthands,
  Caption1, Body1, Button, Textarea
} from '@fluentui/react-components';
import {
  Send24Filled, Sparkle28Filled, ArrowRight16Regular,
  ChevronDown12Regular, CheckmarkCircle24Filled
} from '@fluentui/react-icons';
import { ProcessTimeline } from './ProcessTimeline.jsx';
import * as B from './backend.js';

const iOS = {
  bg: '#ffffff', surface: '#ffffff', secondaryBg: '#f5f5f5',
  separator: '#f0f0f0', secondaryLabel: '#8e8e93', tertiaryLabel: '#c6c6c8',
  quaternaryLabel: '#d1d1d6', brand: '#4b3ac9',
  systemBlue: '#007aff', systemGreen: '#34c759',
  cornerSm: '10px', cornerMd: '14px', cornerLg: '18px',
  font: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Segoe UI', sans-serif"
};

const useStyles = makeStyles({
  app: {
    display: 'flex', flexDirection: 'column', height: '100vh',
    backgroundColor: iOS.bg, color: '#1c1c1e', fontFamily: iOS.font
  },
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 18px 10px', backgroundColor: iOS.surface,
    borderBottom: '1px solid ' + iOS.separator, position: 'sticky', top: 0, zIndex: 10
  },
  navLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  logo: {
    width: '28px', height: '28px', borderRadius: '8px', display: 'block', flexShrink: 0
  },
  picker: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    backgroundColor: iOS.secondaryBg, padding: '6px 12px 6px 8px',
    borderRadius: '8px', cursor: 'pointer', border: 'none',
    fontFamily: iOS.font, fontSize: '14px', fontWeight: 600, color: '#1c1c1e',
    transition: 'background 0.12s',
    ':hover': { backgroundColor: '#eee' }
  },
  pickerIcon: { width: '16px', height: '16px', borderRadius: '4px', display: 'block', flexShrink: 0 },
  pickerArrow: { fontSize: '10px', color: iOS.secondaryLabel },
  navRight: { display: 'flex', alignItems: 'center', gap: '6px' },
  menu: {
    position: 'absolute', top: '56px', right: '0', zIndex: 100,
    backgroundColor: iOS.surface, border: '1px solid ' + iOS.separator,
    borderRadius: iOS.cornerMd, boxShadow: '0 8px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
    minWidth: '200px', overflow: 'hidden', display: 'none'
  },
  menuOpen: { display: 'block' },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '11px 14px', cursor: 'pointer', border: 'none',
    fontFamily: iOS.font, fontSize: '14px', color: '#1c1c1e',
    backgroundColor: 'transparent', width: '100%', textAlign: 'left',
    transition: 'background 0.08s',
    ':hover': { backgroundColor: iOS.secondaryBg }
  },
  menuDivider: { height: '1px', backgroundColor: iOS.separator, margin: '4px 0' },
  menuCheck: { color: iOS.brand, fontSize: '14px', marginLeft: 'auto' },
  content: {
    flexGrow: 1, overflowY: 'auto', padding: '24px 18px 8px',
    display: 'flex', flexDirection: 'column', gap: '20px',
    '::-webkit-scrollbar': { width: '4px' },
    '::-webkit-scrollbar-thumb': { backgroundColor: '#e0e0e0', borderRadius: '3px' }
  },
  empty: {
    margin: 'auto', textAlign: 'center', maxWidth: '300px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '60px'
  },
  emptyIcon: {
    width: '72px', height: '72px', borderRadius: '22px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #f0eefe 0%, #e8e3fd 100%)',
    boxShadow: '0 4px 20px rgba(75,58,201,0.08)'
  },
  emptyTitle: { fontSize: '20px', fontWeight: 700, color: '#1c1c1e', marginTop: '4px' },
  emptyDesc: { fontSize: '14px', color: iOS.secondaryLabel, lineHeight: '1.5', marginTop: '-4px' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '8px' },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    backgroundColor: iOS.secondaryBg, padding: '10px 18px',
    borderRadius: '12px', fontSize: '14px', color: '#555',
    cursor: 'pointer', border: 'none', fontFamily: iOS.font,
    transition: 'all 0.12s',
    ':hover': { backgroundColor: '#eee' }
  },
  userRow: { display: 'flex', justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '80%', padding: '12px 18px',
    backgroundColor: iOS.brand, color: '#ffffff',
    borderRadius: '20px', borderBottomRightRadius: '6px',
    fontSize: '15px', lineHeight: '1.5',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word'
  },
  card: {
    padding: '18px', backgroundColor: iOS.surface,
    border: '1px solid ' + iOS.separator, borderRadius: iOS.cornerLg,
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    transition: 'box-shadow 0.2s',
    ':hover': { boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }
  },
  cardHead: {
    display: 'flex', alignItems: 'center', gap: '10px',
    marginBottom: '14px', paddingBottom: '12px',
    borderBottom: '1px solid ' + iOS.separator
  },
  cardAgent: { fontSize: '14px', fontWeight: 600, color: '#1c1c1e' },
  cardTime: { fontSize: '12px', color: iOS.tertiaryLabel },
  response: {
    fontSize: '15px', lineHeight: '1.7', color: '#333',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word'
  },
  thinking: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '14px 18px', backgroundColor: iOS.secondaryBg,
    borderRadius: iOS.cornerMd, color: iOS.secondaryLabel, fontSize: '14px'
  },
  dot: {
    width: '8px', height: '8px', borderRadius: '50%',
    backgroundColor: '#bbb',
    animationName: {
      '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.3 },
      '40%': { transform: 'scale(1)', opacity: 1 }
    },
    animationDuration: '1.2s', animationIterationCount: 'infinite'
  },
  compareBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    marginTop: '10px', padding: '6px 14px', borderRadius: '8px',
    fontSize: '12px', fontWeight: 500, color: iOS.secondaryLabel,
    backgroundColor: 'transparent', border: '1px solid ' + iOS.separator,
    cursor: 'pointer', fontFamily: iOS.font,
    transition: 'all 0.12s',
    ':hover': { backgroundColor: iOS.secondaryBg }
  },
  compareSection: { marginTop: '14px' },
  compareLabel: {
    display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px',
    fontSize: '12px', fontWeight: 600, color: iOS.secondaryLabel,
    '::before, ::after': { content: '""', flexGrow: 1, height: '1px', backgroundColor: iOS.separator }
  },
  compareGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  compareCard: {
    padding: '14px', borderRadius: iOS.cornerSm,
    backgroundColor: iOS.secondaryBg, border: '1px solid ' + iOS.separator
  },
  compareCardTitle: { fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '8px' },
  compareCardText: { fontSize: '13px', lineHeight: '1.55', color: '#555', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  voteRow: {
    display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', justifyContent: 'center'
  },
  voteBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '6px 14px', borderRadius: '8px', fontSize: '12px',
    border: '1px solid ' + iOS.separator, backgroundColor: iOS.surface,
    color: iOS.secondaryLabel, cursor: 'pointer', fontFamily: iOS.font,
    transition: 'all 0.12s',
    ':hover': { backgroundColor: iOS.secondaryBg }
  },
  voteDone: { color: iOS.systemGreen, fontSize: '12px' },
  inputBar: {
    padding: '8px 16px 14px', backgroundColor: iOS.surface,
    borderTop: '1px solid ' + iOS.separator
  },
  inputRow: {
    display: 'flex', alignItems: 'flex-end', gap: '8px',
    backgroundColor: iOS.secondaryBg, padding: '8px 8px 8px ' + iOS.cornerMd,
    borderRadius: '24px', border: '1px solid ' + iOS.separator,
    transition: 'border-color 0.15s, background 0.15s',
    ':focus-within': { borderColor: iOS.brand, backgroundColor: iOS.surface }
  },
  input: {
    flexGrow: 1, backgroundColor: 'transparent',
    fontSize: '16px', lineHeight: '1.45',
    '> textarea': { '::placeholder': { color: iOS.quaternaryLabel } }
  },
  sendBtn: {
    minWidth: '38px', height: '38px', width: '38px', padding: '0',
    borderRadius: '19px', backgroundColor: iOS.brand, border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'opacity 0.12s',
    ':hover': { opacity: 0.9 }, ':active': { opacity: 0.8 }
  },
  hint: {
    display: 'block', textAlign: 'center', marginTop: '8px',
    fontSize: '11px', color: iOS.quaternaryLabel
  }
});

let seq = 0;
const uid = () => ++seq;

const SUGGESTIONS = [
  'Investiga las ultimas tendencias en IA',
  'Crea un documento sobre...',
  'Revisa mis emails importantes',
  'Escribe un componente React'
];

export default function App() {
  const s = useStyles();
  const [active, setActive] = React.useState('research');
  const [msgs, setMsgs] = React.useState([]);
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const log = React.useRef(null);

  React.useEffect(() => {
    B.warm();
    const d = B.loadMem();
    if (d) {
      if (d.active) setActive(d.active);
      if (d.mid) seq = d.mid;
      if (d.messages?.length) {
        setMsgs(d.messages.map(m => ({
          id: uid(), role: m.role, text: m.content,
          agent: d.active, steps: [], response: m.content,
          phase: 'done', time: Date.now()
        })));
      }
    }
  }, []);

  React.useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [msgs]);

  const persist = (list) => {
    const mem = list.filter(m => m.role === 'user' || m.phase === 'done')
      .map(m => ({ role: m.role, content: m.role === 'user' ? m.text : m.response }));
    B.saveMem({ messages: mem, active, mid: seq });
  };

  const patch = (id, p) => setMsgs(prev => prev.map(m => m.id === id ? { ...m, ...p } : m));

  function pickAgent(id) {
    setActive(id); setMenu(false);
    B.saveMem({ messages: [], active: id, mid: 0 });
    setMsgs([]); setText('');
  }

  function send(input) {
    const q = input.trim();
    if (!q || busy) return;
    setBusy(true); setText('');
    const user = { id: uid(), role: 'user', text: q, time: Date.now() };
    const agent = { id: uid(), role: 'agent', agent: active, phase: 'planning', steps: [], response: '', time: Date.now() };
    setMsgs(prev => [...prev, user, agent]);

    B.planSteps(q, active).then(plan => {
      if (!plan) {
        patch(agent.id, { phase: 'done', response: 'No he podido procesar eso ahora mismo.' });
        setBusy(false); return;
      }
      patch(agent.id, { phase: 'running', steps: plan.steps || [], response: plan.response || '' });
    }).catch(() => {
      patch(agent.id, { phase: 'done', steps: [], response: 'Ha ocurrido un error.' });
      setBusy(false);
    });
  }

  function onStepsDone(id, response) {
    patch(id, { phase: 'done' });
    setBusy(false);
    setMsgs(prev => { persist(prev); return prev; });
  }

  const agent = B.agentById(active);

  /* ── Menu ── */
  React.useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menu]);

  return (
    <div className={s.app}>
      <div className={s.nav}>
        <div className={s.navLeft}>
          <img className={s.logo} src="../assets/x1-logo-square.png" alt=""
            onError={e => e.currentTarget.style.display = 'none'} />
          <div style={{ position: 'relative' }}>
            <button className={s.picker}
              onClick={e => { e.stopPropagation(); setMenu(!menu); }}
              aria-haspopup="true" aria-expanded={menu}>
              <img className={s.pickerIcon} src={agent.aiIcon} alt=""
                onError={e => e.currentTarget.style.display = 'none'} />
              {agent.name}
              <ChevronDown12Regular className={s.pickerArrow} />
            </button>
            <div className={`${s.menu} ${menu ? s.menuOpen : ''}`}
              onClick={e => e.stopPropagation()}>
              {B.AGENTS.map(a => (
                <button key={a.id} className={s.menuItem}
                  onClick={() => pickAgent(a.id)}>
                  <img src={a.aiIcon} alt="" style={{ width: '16px', height: '16px', borderRadius: '4px' }}
                    onError={e => e.currentTarget.style.display = 'none'} />
                  {a.name}
                  {a.id === active && <CheckmarkCircle24Filled className={s.menuCheck} />}
                </button>
              ))}
              <div className={s.menuDivider} />
              <button className={s.menuItem} onClick={() => { B.clearMem(); setMsgs([]); setMenu(false); }}>
                Limpiar historial
              </button>
            </div>
          </div>
        </div>
        <Caption1 className={s.navRight} style={{ color: '#c6c6c8' }}>{agent.ai}</Caption1>
      </div>

      <div className={s.content} ref={log}>
        {msgs.length === 0 ? (
          <div className={s.empty}>
            <div className={s.emptyIcon}><Sparkle28Filled style={{ color: '#4b3ac9', fontSize: '32px' }} /></div>
            <div className={s.emptyTitle}>En que puedo ayudarte?</div>
            <div className={s.emptyDesc}>
              Agente: <strong>{agent.name}</strong> &middot; {agent.ai}
            </div>
            <div className={s.chips}>
              {SUGGESTIONS.map((t, i) => (
                <button key={i} className={s.chip} onClick={() => send(t)}>
                  {t} <ArrowRight16Regular style={{ fontSize: '12px', color: '#bbb' }} />
                </button>
              ))}
            </div>
          </div>
        ) : msgs.map(m => m.role === 'user' ? (
          <div key={m.id} className={s.userRow}>
            <div className={s.bubble}>{m.text}</div>
          </div>
        ) : (
          <div key={m.id} className={s.card}>
            <div className={s.cardHead}>
              <img src={B.agentById(m.agent).aiIcon} alt=""
                style={{ width: '20px', height: '20px', borderRadius: '5px' }}
                onError={e => e.currentTarget.style.display = 'none'} />
              <div>
                <div className={s.cardAgent}>{B.agentById(m.agent).name}</div>
                <div className={s.cardTime}>
                  {m.time ? new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            </div>
            {m.phase === 'planning' && (
              <div className={s.thinking}>
                <span className={s.dot} style={{ animationDelay: '0s' }} />
                <span className={s.dot} style={{ animationDelay: '0.2s' }} />
                <span className={s.dot} style={{ animationDelay: '0.4s' }} />
                <span style={{ marginLeft: '4px' }}>Pensando...</span>
              </div>
            )}
            {(m.phase === 'running' || m.phase === 'done') && m.steps?.length > 0 && (
              <ProcessTimeline steps={m.steps}
                onComplete={m.phase === 'running' ? () => onStepsDone(m.id) : undefined} />
            )}
            {m.phase === 'done' && m.response && (
              <Body1 className={s.response}>{m.response}</Body1>
            )}
          </div>
        ))}
      </div>

      <div className={s.inputBar}>
        <div className={s.inputRow}>
          <Textarea className={s.input} appearance="filled-lighter" resize="none"
            value={text} placeholder="Preguntame lo que quieras..."
            onChange={(_, d) => setText(d.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }} />
          <button className={s.sendBtn} disabled={!text.trim() || busy}
            onClick={() => send(text)} aria-label="Enviar">
            <Send24Filled style={{ color: 'white', fontSize: '18px' }} />
          </button>
        </div>
        <Caption1 className={s.hint}>X1 puede cometer errores. Verifica la informacion importante.</Caption1>
      </div>
    </div>
  );
}
