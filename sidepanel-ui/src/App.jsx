import * as React from 'react';
import {
  makeStyles, tokens, shorthands, Caption1, Body1, Button, Textarea
} from '@fluentui/react-components';
import {
  Send24Filled, Sparkle28Filled, ArrowRight16Regular,
  ChevronDown12Regular, CheckmarkCircle24Filled,
  Delete24Regular
} from '@fluentui/react-icons';
import { ProcessTimeline } from './ProcessTimeline.jsx';
import * as B from './backend.js';

const useStyles = makeStyles({
  app: {
    display: 'flex', flexDirection: 'column', height: '100vh',
    backgroundColor: '#ffffff', color: '#1c1c1e',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Segoe UI', sans-serif"
  },
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px 10px 20px',
    backgroundColor: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    position: 'sticky', top: 0, zIndex: 10,
    userSelect: 'none'
  },
  navLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  logo: {
    width: '28px', height: '28px', borderRadius: '7px',
    display: 'block', flexShrink: 0
  },
  pickerWrap: { position: 'relative' },
  picker: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '6px 12px 6px 6px',
    borderRadius: '8px', cursor: 'pointer',
    border: 'none', outline: 'none',
    fontFamily: 'inherit', fontSize: '15px', fontWeight: 590, color: '#1c1c1e',
    backgroundColor: 'transparent',
    transition: 'background 0.12s ease',
    ':hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
    ':active': { backgroundColor: 'rgba(0,0,0,0.07)' }
  },
  pickerIcon: {
    width: '18px', height: '18px', borderRadius: '5px',
    display: 'block', flexShrink: 0
  },
  pickerArrow: {
    fontSize: '10px', color: '#8e8e93',
    transition: 'transform 0.2s ease'
  },
  pickerArrowOpen: { transform: 'rotate(180deg)' },
  navRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  navProvider: {
    fontSize: '12px', fontWeight: 500, color: '#8e8e93',
    backgroundColor: 'rgba(0,0,0,0.04)',
    padding: '4px 10px', borderRadius: '20px',
    letterSpacing: '0.2px'
  },
  menu: {
    position: 'absolute', top: 'calc(100% + 6px)', left: '0', zIndex: 100,
    backgroundColor: '#ffffff',
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: '14px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 2px 10px rgba(0,0,0,0.04)',
    minWidth: '210px', overflow: 'hidden',
    opacity: 0, transform: 'scale(0.95) translateY(-4px)',
    transformOrigin: 'top left',
    transition: 'opacity 0.15s ease, transform 0.15s ease',
    pointerEvents: 'none'
  },
  menuOpen: {
    opacity: 1, transform: 'scale(1) translateY(0)',
    pointerEvents: 'auto'
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    width: '100%', padding: '11px 14px',
    border: 'none', background: 'transparent',
    fontFamily: 'inherit', fontSize: '14px', color: '#1c1c1e',
    cursor: 'pointer', textAlign: 'left',
    transition: 'background 0.08s ease',
    ':hover': { backgroundColor: 'rgba(0,0,0,0.03)' }
  },
  menuDivider: {
    height: '1px', backgroundColor: 'rgba(0,0,0,0.06)', margin: '4px 0'
  },
  menuCheck: {
    marginLeft: 'auto', color: '#4b3ac9', fontSize: '16px'
  },
  content: {
    flexGrow: 1, overflowY: 'auto',
    padding: '24px 20px 8px',
    display: 'flex', flexDirection: 'column', gap: '20px',
    '::-webkit-scrollbar': { width: '4px' },
    '::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(0,0,0,0.12)',
      borderRadius: '2px'
    }
  },
  empty: {
    margin: 'auto', textAlign: 'center', maxWidth: '300px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
    paddingTop: '72px'
  },
  emptyIconWrap: {
    width: '80px', height: '80px', borderRadius: '24px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #f5f0ff 0%, #ede8fe 100%)',
    boxShadow: '0 4px 24px rgba(75,58,201,0.08)',
    marginBottom: '4px'
  },
  emptyTitle: {
    fontSize: '20px', fontWeight: 700, color: '#1c1c1e',
    letterSpacing: '-0.3px'
  },
  emptyDesc: {
    fontSize: '14px', color: '#8e8e93', lineHeight: '1.5',
    marginTop: '-4px'
  },
  chips: {
    display: 'flex', flexWrap: 'wrap', gap: '8px',
    justifyContent: 'center', marginTop: '8px'
  },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '10px 18px', borderRadius: '12px',
    fontSize: '14px', color: '#555',
    backgroundColor: 'rgba(0,0,0,0.03)',
    border: 'none', cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.12s ease',
    ':hover': { backgroundColor: 'rgba(0,0,0,0.06)' },
    ':active': { backgroundColor: 'rgba(0,0,0,0.09)' }
  },
  userRow: { display: 'flex', justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '78%', padding: '12px 18px',
    backgroundColor: '#4b3ac9', color: '#ffffff',
    borderRadius: '20px', borderBottomRightRadius: '4px',
    fontSize: '15px', lineHeight: '1.55',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    boxShadow: '0 2px 12px rgba(75,58,201,0.1)'
  },
  card: {
    padding: '20px',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(0,0,0,0.05)',
    borderRadius: '20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
    transition: 'box-shadow 0.2s ease, transform 0.15s ease',
    ':hover': {
      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      transform: 'translateY(-1px)'
    }
  },
  cardHead: {
    display: 'flex', alignItems: 'center', gap: '10px',
    marginBottom: '14px', paddingBottom: '12px',
    borderBottom: '1px solid rgba(0,0,0,0.04)'
  },
  cardAgentIcon: {
    width: '22px', height: '22px', borderRadius: '6px',
    display: 'block', flexShrink: 0
  },
  cardAgentName: {
    fontSize: '14px', fontWeight: 600, color: '#1c1c1e',
    lineHeight: '1.3'
  },
  cardTime: {
    fontSize: '12px', color: '#c6c6c8', lineHeight: '1.2',
    marginTop: '1px'
  },
  response: {
    fontSize: '15px', lineHeight: '1.7', color: '#333',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word'
  },
  thinking: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '14px 18px',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: '14px',
    color: '#8e8e93', fontSize: '14px'
  },
  dot: {
    width: '7px', height: '7px', borderRadius: '50%',
    backgroundColor: '#c6c6c8',
    animationName: {
      '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.3 },
      '40%': { transform: 'scale(1)', opacity: 1 }
    },
    animationDuration: '1.4s', animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out'
  },
  inputBar: {
    padding: '8px 20px 16px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid rgba(0,0,0,0.04)'
  },
  inputRow: {
    display: 'flex', alignItems: 'flex-end', gap: '8px',
    padding: '8px 8px 8px 18px',
    borderRadius: '26px',
    backgroundColor: 'rgba(0,0,0,0.03)',
    border: '1.5px solid transparent',
    transition: 'border-color 0.15s ease, background 0.15s ease',
    ':focus-within': {
      borderColor: 'rgba(75,58,201,0.3)',
      backgroundColor: '#ffffff'
    }
  },
  input: {
    flexGrow: 1, backgroundColor: 'transparent',
    fontSize: '16px', lineHeight: '1.5',
    '> textarea': {
      '::placeholder': { color: '#c6c6c8' },
      '::-webkit-scrollbar': { width: '0' }
    }
  },
  sendBtn: {
    width: '38px', height: '38px', minWidth: '38px',
    borderRadius: '19px', border: 'none', outline: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: '#4b3ac9',
    transition: 'all 0.12s ease',
    ':hover': { opacity: 0.9, transform: 'scale(1.03)' },
    ':active': { opacity: 0.8, transform: 'scale(0.95)' },
    ':disabled': { opacity: 0.3, cursor: 'default', transform: 'none' }
  },
  hint: {
    display: 'block', textAlign: 'center', marginTop: '8px',
    fontSize: '11px', color: '#d1d1d6'
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
  const menuRef = React.useRef(null);

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

  React.useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [msgs]);

  const persist = (list) => {
    const mem = list.filter(m => m.role === 'user' || m.phase === 'done')
      .map(m => ({ role: m.role, content: m.role === 'user' ? m.text : m.response }));
    B.saveMem({ messages: mem, active, mid: seq });
  };

  const patch = (id, p) => setMsgs(prev => prev.map(m => m.id === id ? { ...m, ...p } : m));

  function pickAgent(id) {
    setActive(id);
    setMenu(false);
    B.saveMem({ messages: [], active: id, mid: 0 });
    setMsgs([]);
    setText('');
  }

  function send(input) {
    const q = input.trim();
    if (!q || busy) return;
    setBusy(true);
    setText('');
    const now = Date.now();
    const user = { id: uid(), role: 'user', text: q, time: now };
    const agent = { id: uid(), role: 'agent', agent: active, phase: 'planning', steps: [], response: '', time: now };
    setMsgs(prev => [...prev, user, agent]);

    B.planSteps(q, active).then(plan => {
      if (!plan) {
        patch(agent.id, { phase: 'done', response: 'No he podido procesar eso ahora mismo.' });
        setBusy(false);
        return;
      }
      patch(agent.id, { phase: 'running', steps: plan.steps || [], response: plan.response || '' });
    }).catch(() => {
      patch(agent.id, { phase: 'done', steps: [], response: 'Ha ocurrido un error.' });
      setBusy(false);
    });
  }

  function onStepsDone(id) {
    patch(id, { phase: 'done' });
    setBusy(false);
    setMsgs(prev => { persist(prev); return prev; });
  }

  React.useEffect(() => {
    if (!menu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menu]);

  const agent = B.agentById(active);

  return (
    <div className={s.app}>
      <div className={s.nav}>
        <div className={s.navLeft}>
          <img className={s.logo} src="../assets/x1-logo-square.png" alt=""
            onError={e => e.currentTarget.style.display = 'none'} />
          <div className={s.pickerWrap} ref={menuRef}>
            <button className={s.picker}
              onClick={e => { e.stopPropagation(); setMenu(v => !v); }}
              aria-haspopup="true" aria-expanded={menu}>
              <img className={s.pickerIcon} src={agent.aiIcon} alt=""
                onError={e => e.currentTarget.style.display = 'none'} />
              {agent.name}
              <ChevronDown12Regular className={`${s.pickerArrow} ${menu ? s.pickerArrowOpen : ''}`} />
            </button>
            <div className={`${s.menu} ${menu ? s.menuOpen : ''}`}
              onClick={e => e.stopPropagation()}>
              {B.AGENTS.map(a => (
                <button key={a.id} className={s.menuItem}
                  onClick={() => pickAgent(a.id)}>
                  <img src={a.aiIcon} alt=""
                    style={{ width: '18px', height: '18px', borderRadius: '5px' }}
                    onError={e => e.currentTarget.style.display = 'none'} />
                  <span style={{ flexGrow: 1 }}>{a.name}</span>
                  <span style={{ fontSize: '12px', color: '#8e8e93' }}>{a.ai}</span>
                  {a.id === active && <CheckmarkCircle24Filled className={s.menuCheck} />}
                </button>
              ))}
              <div className={s.menuDivider} />
              <button className={s.menuItem} onClick={() => { B.clearMem(); setMsgs([]); setMenu(false); }}>
                <Delete24Regular style={{ fontSize: '18px', color: '#8e8e93' }} />
                Limpiar historial
              </button>
            </div>
          </div>
        </div>
        <span className={s.navProvider}>{agent.ai}</span>
      </div>

      <div className={s.content} ref={log}>
        {msgs.length === 0 ? (
          <div className={s.empty}>
            <div className={s.emptyIconWrap}>
              <Sparkle28Filled style={{ color: '#4b3ac9', fontSize: '34px' }} />
            </div>
            <div className={s.emptyTitle}>En que puedo ayudarte?</div>
            <div className={s.emptyDesc}>
              <strong>{agent.name}</strong> &middot; {agent.ai}
            </div>
            <div className={s.chips}>
              {SUGGESTIONS.map((t, i) => (
                <button key={i} className={s.chip} onClick={() => send(t)}>
                  {t}
                  <ArrowRight16Regular style={{ fontSize: '12px', color: '#bbb' }} />
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
              <img className={s.cardAgentIcon} src={B.agentById(m.agent).aiIcon} alt=""
                onError={e => e.currentTarget.style.display = 'none'} />
              <div>
                <div className={s.cardAgentName}>{B.agentById(m.agent).name} &middot; {B.agentById(m.agent).ai}</div>
                <div className={s.cardTime}>
                  {m.time ? new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            </div>
            {m.phase === 'planning' && (
              <div className={s.thinking}>
                <span className={s.dot} style={{ animationDelay: '0s' }} />
                <span className={s.dot} style={{ animationDelay: '0.25s' }} />
                <span className={s.dot} style={{ animationDelay: '0.5s' }} />
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
            value={text}
            placeholder="Preguntame lo que quieras..."
            onChange={(_, d) => setText(d.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(text);
              }
            }} />
          <button className={s.sendBtn} disabled={!text.trim() || busy}
            onClick={() => send(text)} aria-label="Enviar">
            <Send24Filled style={{ color: 'white', fontSize: '17px' }} />
          </button>
        </div>
        <Caption1 className={s.hint}>X1 puede cometer errores. Verifica la informacion importante.</Caption1>
      </div>
    </div>
  );
}
