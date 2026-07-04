import * as React from 'react';
import { makeStyles, tokens, shorthands, Caption1, Body1, Textarea } from '@fluentui/react-components';
import { Sparkle28Filled, Send24Filled, ArrowRight16Regular, ChevronDown12Regular, CheckmarkCircle24Filled, Delete24Regular } from '@fluentui/react-icons';
import { ProcessTimeline } from './ProcessTimeline.jsx';
import * as B from './backend.js';

const useStyles = makeStyles({
  app: {
    display: 'flex', flexDirection: 'column', height: '100vh',
    background: 'linear-gradient(175deg, #faf9ff 0%, #f5f0ff 40%, #f0ecfe 100%)',
    color: '#1c1c1e',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Segoe UI', sans-serif"
  },
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    margin: '12px 12px 0 12px', padding: '10px 16px',
    backgroundColor: 'rgba(255,255,255,0.55)',
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    borderRadius: '18px',
    border: '1px solid rgba(255,255,255,0.7)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 8px 32px rgba(75,58,201,0.06), inset 0 0 0 1px rgba(255,255,255,0.5)',
    position: 'sticky', top: '12px', zIndex: 10,
    userSelect: 'none'
  },
  navLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  logo: {
    width: '26px', height: '26px', borderRadius: '7px',
    display: 'block', flexShrink: 0,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
  },
  pickerWrap: { position: 'relative' },
  picker: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '4px 10px 4px 4px',
    borderRadius: '8px', cursor: 'pointer',
    border: 'none', outline: 'none',
    fontFamily: 'inherit', fontSize: '15px', fontWeight: 600, color: '#1c1c1e',
    backgroundColor: 'transparent',
    transition: 'all 0.15s ease',
    ':hover': { backgroundColor: 'rgba(0,0,0,0.03)' }
  },
  pickerIcon: { width: '18px', height: '18px', borderRadius: '5px', display: 'block', flexShrink: 0 },
  pickerArrow: { fontSize: '10px', color: '#8e8e93', transition: 'transform 0.25s ease' },
  pickerArrowOpen: { transform: 'rotate(180deg)' },
  navRight: { display: 'flex', alignItems: 'center', gap: '6px' },
  navPill: {
    fontSize: '11px', fontWeight: 600, color: '#8e8e93',
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: '4px 10px', borderRadius: '20px',
    letterSpacing: '0.3px', textTransform: 'uppercase'
  },
  menu: {
    position: 'absolute', top: 'calc(100% + 6px)', left: '0', zIndex: 100,
    backgroundColor: 'rgba(255,255,255,0.75)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.8)',
    borderRadius: '16px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 2px 10px rgba(0,0,0,0.04), inset 0 0 0 1px rgba(255,255,255,0.6)',
    minWidth: '220px', overflow: 'hidden',
    opacity: 0, transform: 'scale(0.92) translateY(-6px)',
    transformOrigin: 'top left',
    transition: 'opacity 0.18s ease, transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
    pointerEvents: 'none'
  },
  menuOpen: { opacity: 1, transform: 'scale(1) translateY(0)', pointerEvents: 'auto' },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    width: '100%', padding: '10px 14px',
    border: 'none', background: 'transparent',
    fontFamily: 'inherit', fontSize: '14px', color: '#1c1c1e',
    cursor: 'pointer', textAlign: 'left',
    transition: 'background 0.08s ease',
    ':hover': { backgroundColor: 'rgba(75,58,201,0.04)' }
  },
  menuDivider: { height: '1px', backgroundColor: 'rgba(0,0,0,0.04)', margin: '4px 12px' },
  menuCheck: { marginLeft: 'auto', color: '#4b3ac9', fontSize: '16px' },
  content: {
    flexGrow: 1, overflowY: 'auto',
    padding: '20px 14px 8px',
    display: 'flex', flexDirection: 'column', gap: '18px',
    '::-webkit-scrollbar': { width: '4px' },
    '::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: '3px' }
  },
  empty: {
    margin: 'auto', textAlign: 'center', maxWidth: '300px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
    paddingTop: '80px'
  },
  emptyIconWrap: {
    width: '80px', height: '80px', borderRadius: '24px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(245,240,255,0.95) 100%)',
    border: '1px solid rgba(255,255,255,0.8)',
    boxShadow: '0 4px 24px rgba(75,58,201,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
    marginBottom: '4px'
  },
  emptyTitle: { fontSize: '20px', fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.3px' },
  emptyDesc: { fontSize: '14px', color: '#8e8e93', lineHeight: '1.5', marginTop: '-2px' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '10px' },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '9px 16px', borderRadius: '14px',
    fontSize: '13px', fontWeight: 500, color: '#555',
    backgroundColor: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(255,255,255,0.7)',
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
    transition: 'all 0.15s ease',
    ':hover': { backgroundColor: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.9)', transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(75,58,201,0.06)' }
  },
  userRow: { display: 'flex', justifyContent: 'flex-end', paddingRight: '2px' },
  bubble: {
    maxWidth: '78%', padding: '12px 18px',
    background: 'linear-gradient(135deg, #4b3ac9 0%, #5b4ad6 100%)',
    color: '#ffffff',
    borderRadius: '22px', borderBottomRightRadius: '6px',
    fontSize: '15px', lineHeight: '1.55',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    boxShadow: '0 2px 16px rgba(75,58,201,0.12), 0 1px 4px rgba(75,58,201,0.08)'
  },
  glass: {
    padding: '18px',
    backgroundColor: 'rgba(255,255,255,0.55)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.7)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 8px 32px rgba(75,58,201,0.04), inset 0 0 0 1px rgba(255,255,255,0.4)',
    transition: 'box-shadow 0.25s ease, transform 0.2s ease',
    ':hover': {
      boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 12px 40px rgba(75,58,201,0.06), inset 0 0 0 1px rgba(255,255,255,0.5)',
      transform: 'translateY(-1px)'
    }
  },
  cardHead: {
    display: 'flex', alignItems: 'center', gap: '10px',
    marginBottom: '12px', paddingBottom: '10px',
    borderBottom: '1px solid rgba(0,0,0,0.04)'
  },
  cardAgentIcon: { width: '22px', height: '22px', borderRadius: '6px', display: 'block', flexShrink: 0 },
  cardAgentName: { fontSize: '14px', fontWeight: 600, color: '#1c1c1e', lineHeight: '1.3' },
  cardTime: { fontSize: '12px', color: '#b0b0b0', lineHeight: '1.2', marginTop: '1px' },
  response: {
    fontSize: '15px', lineHeight: '1.7', color: '#333',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word'
  },
  thinking: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '14px 18px',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: '14px',
    color: '#8e8e93', fontSize: '14px',
    border: '1px solid rgba(255,255,255,0.4)'
  },
  dot: {
    width: '6px', height: '6px', borderRadius: '50%',
    backgroundColor: '#4b3ac9',
    animationName: {
      '0%, 80%, 100%': { transform: 'translateY(0)', opacity: 0.3 },
      '40%': { transform: 'translateY(-4px)', opacity: 0.8 }
    },
    animationDuration: '1.2s', animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out'
  },
  inputBar: {
    padding: '8px 12px 16px',
    background: 'transparent'
  },
  inputRow: {
    display: 'flex', alignItems: 'flex-end', gap: '8px',
    padding: '6px 6px 6px 18px',
    borderRadius: '26px',
    backgroundColor: 'rgba(255,255,255,0.5)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.7)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 4px 20px rgba(75,58,201,0.04), inset 0 0 0 1px rgba(255,255,255,0.4)',
    transition: 'all 0.2s ease',
    ':focus-within': {
      backgroundColor: 'rgba(255,255,255,0.7)',
      borderColor: 'rgba(255,255,255,0.9)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 8px 32px rgba(75,58,201,0.06), inset 0 0 0 1px rgba(255,255,255,0.6)'
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
    width: '36px', height: '36px', minWidth: '36px',
    borderRadius: '18px', border: 'none', outline: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #4b3ac9 0%, #6c5ce0 100%)',
    boxShadow: '0 2px 8px rgba(75,58,201,0.15)',
    transition: 'all 0.15s ease',
    ':hover': { transform: 'scale(1.05)', boxShadow: '0 4px 16px rgba(75,58,201,0.2)' },
    ':active': { transform: 'scale(0.92)' },
    ':disabled': { opacity: 0.25, cursor: 'default', transform: 'none', boxShadow: 'none' }
  },
  hint: {
    display: 'block', textAlign: 'center', marginTop: '10px',
    fontSize: '11px', color: '#c6c6c8'
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
    const now = Date.now();
    const user = { id: uid(), role: 'user', text: q, time: now };
    const agent = { id: uid(), role: 'agent', agent: active, phase: 'planning', steps: [], response: '', time: now };
    setMsgs(prev => [...prev, user, agent]);

    B.planSteps(q, active).then(plan => {
      if (!plan) { patch(agent.id, { phase: 'done', response: 'No he podido procesar eso ahora mismo.' }); setBusy(false); return; }
      patch(agent.id, { phase: 'running', steps: plan.steps || [], response: plan.response || '' });
    }).catch(() => { patch(agent.id, { phase: 'done', steps: [], response: 'Ha ocurrido un error.' }); setBusy(false); });
  }

  function onStepsDone(id) {
    patch(id, { phase: 'done' }); setBusy(false);
    setMsgs(prev => { persist(prev); return prev; });
  }

  React.useEffect(() => {
    if (!menu) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menu]);

  const agent = B.agentById(active);

  return (
    <div className={s.app}>
      <div className={s.nav}>
        <div className={s.navLeft}>
          <img className={s.logo} src="../assets/x1-logo-square.png" alt="" onError={e => e.currentTarget.style.display = 'none'} />
          <div className={s.pickerWrap} ref={menuRef}>
            <button className={s.picker} onClick={e => { e.stopPropagation(); setMenu(v => !v); }} aria-haspopup="true" aria-expanded={menu}>
              <img className={s.pickerIcon} src={agent.aiIcon} alt="" onError={e => e.currentTarget.style.display = 'none'} />
              {agent.name}
              <ChevronDown12Regular className={`${s.pickerArrow} ${menu ? s.pickerArrowOpen : ''}`} />
            </button>
            <div className={`${s.menu} ${menu ? s.menuOpen : ''}`} onClick={e => e.stopPropagation()}>
              {B.AGENTS.map(a => (
                <button key={a.id} className={s.menuItem} onClick={() => pickAgent(a.id)}>
                  <img src={a.aiIcon} alt="" style={{ width: '18px', height: '18px', borderRadius: '5px' }} onError={e => e.currentTarget.style.display = 'none'} />
                  <span style={{ flexGrow: 1 }}>{a.name}</span>
                  <span style={{ fontSize: '12px', color: '#8e8e93' }}>{a.ai}</span>
                  {a.id === active && <CheckmarkCircle24Filled className={s.menuCheck} />}
                </button>
              ))}
              <div className={s.menuDivider} />
              <button className={s.menuItem} onClick={() => { B.clearMem(); setMsgs([]); setMenu(false); }}>
                <Delete24Regular style={{ fontSize: '18px', color: '#8e8e93' }} /> Limpiar historial
              </button>
            </div>
          </div>
        </div>
        <span className={s.navPill}>{agent.ai}</span>
      </div>

      <div className={s.content} ref={log}>
        {msgs.length === 0 ? (
          <div className={s.empty}>
            <div className={s.emptyIconWrap}><Sparkle28Filled style={{ color: '#4b3ac9', fontSize: '34px' }} /></div>
            <div className={s.emptyTitle}>En que puedo ayudarte?</div>
            <div className={s.emptyDesc}><strong>{agent.name}</strong> &middot; {agent.ai}</div>
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
          <div key={m.id} className={s.glass}>
            <div className={s.cardHead}>
              <img className={s.cardAgentIcon} src={B.agentById(m.agent).aiIcon} alt="" onError={e => e.currentTarget.style.display = 'none'} />
              <div>
                <div className={s.cardAgentName}>{B.agentById(m.agent).name} &middot; {B.agentById(m.agent).ai}</div>
                <div className={s.cardTime}>{m.time ? new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
              </div>
            </div>
            {m.phase === 'planning' && (
              <div className={s.thinking}>
                <span className={s.dot} style={{ animationDelay: '0s' }} />
                <span className={s.dot} style={{ animationDelay: '0.2s' }} />
                <span className={s.dot} style={{ animationDelay: '0.4s' }} />
                <span style={{ marginLeft: '6px', fontWeight: 500, color: '#4b3ac9' }}>Pensando...</span>
              </div>
            )}
            {(m.phase === 'running' || m.phase === 'done') && m.steps?.length > 0 && (
              <ProcessTimeline steps={m.steps} onComplete={m.phase === 'running' ? () => onStepsDone(m.id) : undefined} />
            )}
            {m.phase === 'done' && m.response && <Body1 className={s.response}>{m.response}</Body1>}
          </div>
        ))}
      </div>

      <div className={s.inputBar}>
        <div className={s.inputRow}>
          <Textarea className={s.input} appearance="filled-lighter" resize="none"
            value={text} placeholder="Preguntame lo que quieras..."
            onChange={(_, d) => setText(d.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }} />
          <button className={s.sendBtn} disabled={!text.trim() || busy} onClick={() => send(text)} aria-label="Enviar">
            <Send24Filled style={{ color: 'white', fontSize: '16px' }} />
          </button>
        </div>
        <Caption1 className={s.hint}>X1 puede cometer errores. Verifica la informacion importante.</Caption1>
      </div>
    </div>
  );
}
