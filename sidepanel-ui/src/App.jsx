import * as React from 'react';
import { makeStyles, shorthands, Body1, Textarea, Caption1 } from '@fluentui/react-components';
import { Sparkle28Filled, Send24Filled, ArrowRight16Regular, ChevronDown12Regular, CheckmarkCircle24Filled, Delete24Regular, Circle24Filled } from '@fluentui/react-icons';
import { ProcessTimeline } from './ProcessTimeline.jsx';
import * as B from './backend.js';

const useStyles = makeStyles({
  bg: {
    position: 'fixed', inset: 0, zIndex: 0,
    background: 'linear-gradient(160deg, #f8f6ff 0%, #ede8fe 30%, #e0d8f5 60%, #f5eefb 100%)',
    overflow: 'hidden'
  },
  orb1: {
    position: 'absolute', top: '-80px', right: '-60px',
    width: '280px', height: '280px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0) 70%)',
    filter: 'blur(40px)'
  },
  orb2: {
    position: 'absolute', bottom: '20%', left: '-40px',
    width: '200px', height: '200px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0) 70%)',
    filter: 'blur(50px)'
  },
  orb3: {
    position: 'absolute', top: '40%', right: '-20px',
    width: '180px', height: '180px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(192,132,252,0.1) 0%, rgba(192,132,252,0) 70%)',
    filter: 'blur(60px)'
  },
  orb4: {
    position: 'absolute', bottom: '-40px', right: '20%',
    width: '240px', height: '240px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, rgba(167,139,250,0) 70%)',
    filter: 'blur(50px)'
  },
  app: {
    position: 'relative', zIndex: 1,
    display: 'flex', flexDirection: 'column', height: '100vh',
    color: '#1c1c1e',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Segoe UI', sans-serif"
  },
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    margin: '10px 10px 0 10px', padding: '10px 14px',
    backgroundColor: 'rgba(255,255,255,0.35)',
    backdropFilter: 'blur(40px) saturate(200%)',
    WebkitBackdropFilter: 'blur(40px) saturate(200%)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.6)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 8px 32px rgba(75,58,201,0.05), inset 0 1px 0 rgba(255,255,255,0.7)',
    position: 'sticky', top: '10px', zIndex: 10,
    userSelect: 'none'
  },
  navLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  logo: {
    width: '26px', height: '26px', borderRadius: '8px',
    display: 'block', flexShrink: 0,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
  },
  pickerWrap: { position: 'relative' },
  picker: {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '4px 8px 4px 4px', borderRadius: '8px',
    cursor: 'pointer', border: 'none', outline: 'none',
    fontFamily: 'inherit', fontSize: '14px', fontWeight: 600, color: '#1c1c1e',
    backgroundColor: 'rgba(255,255,255,0.2)',
    transition: 'all 0.15s ease',
    ':hover': { backgroundColor: 'rgba(255,255,255,0.35)' }
  },
  pickerIcon: { width: '18px', height: '18px', borderRadius: '5px', display: 'block', flexShrink: 0 },
  pickerArrow: { fontSize: '10px', color: '#8e8e93', transition: 'transform 0.25s ease' },
  pickerArrowOpen: { transform: 'rotate(180deg)' },
  navPill: {
    fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: '4px 10px', borderRadius: '20px',
    letterSpacing: '0.5px', textTransform: 'uppercase',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  menu: {
    position: 'absolute', top: 'calc(100% + 8px)', left: '0', zIndex: 100,
    backgroundColor: 'rgba(255,255,255,0.5)',
    backdropFilter: 'blur(50px) saturate(200%)',
    WebkitBackdropFilter: 'blur(50px) saturate(200%)',
    border: '1px solid rgba(255,255,255,0.7)',
    borderRadius: '18px',
    boxShadow: '0 8px 48px rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.6)',
    minWidth: '224px', overflow: 'hidden',
    opacity: 0, transform: 'scale(0.9) translateY(-8px)',
    transformOrigin: 'top left',
    transition: 'opacity 0.2s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
    pointerEvents: 'none'
  },
  menuOpen: { opacity: 1, transform: 'scale(1) translateY(0)', pointerEvents: 'auto' },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
    padding: '10px 14px', border: 'none', background: 'transparent',
    fontFamily: 'inherit', fontSize: '14px', color: '#1c1c1e',
    cursor: 'pointer', textAlign: 'left',
    transition: 'background 0.08s ease',
    ':hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
  },
  menuDivider: { height: '1px', backgroundColor: 'rgba(0,0,0,0.04)', margin: '4px 12px' },
  menuCheck: { marginLeft: 'auto', color: '#4b3ac9', fontSize: '16px' },
  content: {
    flexGrow: 1, overflowY: 'auto',
    padding: '16px 12px 8px',
    display: 'flex', flexDirection: 'column', gap: '16px',
    '::-webkit-scrollbar': { width: '4px' },
    '::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '3px' }
  },
  empty: {
    margin: 'auto', textAlign: 'center', maxWidth: '280px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
    paddingTop: '80px'
  },
  emptyIconWrap: {
    width: '84px', height: '84px', borderRadius: '26px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.5)',
    boxShadow: '0 4px 24px rgba(75,58,201,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',
    marginBottom: '2px'
  },
  emptyTitle: { fontSize: '20px', fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.3px' },
  emptyDesc: { fontSize: '14px', color: '#8e8e93', lineHeight: '1.5', marginTop: '-2px' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '8px' },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '8px 14px', borderRadius: '14px',
    fontSize: '13px', fontWeight: 500, color: '#555',
    backgroundColor: 'rgba(255,255,255,0.3)',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.5)',
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.15s ease',
    ':hover': {
      backgroundColor: 'rgba(255,255,255,0.5)',
      borderColor: 'rgba(255,255,255,0.7)',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 16px rgba(75,58,201,0.05)'
    }
  },
  userRow: { display: 'flex', justifyContent: 'flex-end', paddingRight: '2px' },
  bubble: {
    maxWidth: '78%', padding: '11px 17px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    color: '#1c1c1e',
    borderRadius: '22px', borderBottomRightRadius: '6px',
    fontSize: '15px', lineHeight: '1.55',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    border: '1px solid rgba(255,255,255,0.4)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.02)'
  },
  glass: {
    padding: '18px',
    backgroundColor: 'rgba(255,255,255,0.25)',
    backdropFilter: 'blur(30px) saturate(200%)',
    WebkitBackdropFilter: 'blur(30px) saturate(200%)',
    borderRadius: '22px',
    border: '1px solid rgba(255,255,255,0.45)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.01), 0 8px 32px rgba(75,58,201,0.03), inset 0 1px 0 rgba(255,255,255,0.5)',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: 'rgba(255,255,255,0.3)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.01), 0 12px 40px rgba(75,58,201,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',
      transform: 'translateY(-1px)'
    }
  },
  cardHead: {
    display: 'flex', alignItems: 'center', gap: '10px',
    marginBottom: '12px', paddingBottom: '10px',
    borderBottom: '1px solid rgba(255,255,255,0.25)'
  },
  cardAgentIcon: { width: '22px', height: '22px', borderRadius: '6px', display: 'block', flexShrink: 0 },
  cardAgentName: { fontSize: '14px', fontWeight: 600, color: '#1c1c1e', lineHeight: '1.3' },
  cardTime: { fontSize: '12px', color: 'rgba(0,0,0,0.25)', lineHeight: '1.2', marginTop: '1px' },
  response: {
    fontSize: '15px', lineHeight: '1.7', color: '#333',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word'
  },
  thinking: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '12px 16px',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#666', fontSize: '14px'
  },
  dot: {
    width: '6px', height: '6px', borderRadius: '50%',
    backgroundColor: '#4b3ac9',
    animationName: {
      '0%, 80%, 100%': { transform: 'translateY(0)', opacity: 0.25 },
      '40%': { transform: 'translateY(-5px)', opacity: 0.7 }
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
    borderRadius: '28px',
    backgroundColor: 'rgba(255,255,255,0.25)',
    backdropFilter: 'blur(30px) saturate(200%)',
    WebkitBackdropFilter: 'blur(30px) saturate(200%)',
    border: '1px solid rgba(255,255,255,0.45)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.01), 0 4px 24px rgba(75,58,201,0.03), inset 0 1px 0 rgba(255,255,255,0.5)',
    transition: 'all 0.2s ease',
    ':focus-within': {
      backgroundColor: 'rgba(255,255,255,0.35)',
      borderColor: 'rgba(255,255,255,0.6)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.01), 0 8px 32px rgba(75,58,201,0.04), inset 0 1px 0 rgba(255,255,255,0.6)'
    }
  },
  input: {
    flexGrow: 1, backgroundColor: 'transparent',
    fontSize: '16px', lineHeight: '1.5',
    '> textarea': {
      '::placeholder': { color: 'rgba(0,0,0,0.2)' },
      background: 'transparent',
      '::-webkit-scrollbar': { width: '0' }
    }
  },
  sendBtn: {
    width: '36px', height: '36px', minWidth: '36px',
    borderRadius: '18px', outline: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', border: '1px solid rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(75,58,201,0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    transition: 'all 0.15s ease',
    ':hover': { transform: 'scale(1.06)', backgroundColor: 'rgba(75,58,201,0.85)', boxShadow: '0 4px 20px rgba(75,58,201,0.15)' },
    ':active': { transform: 'scale(0.9)' },
    ':disabled': { opacity: 0.2, cursor: 'default', transform: 'none', boxShadow: 'none' }
  },
  hint: {
    display: 'block', textAlign: 'center', marginTop: '10px',
    fontSize: '11px', color: 'rgba(0,0,0,0.15)'
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

  React.useEffect(() => { B.warm(); const d = B.loadMem(); if (d) { if (d.active) setActive(d.active); if (d.mid) seq = d.mid; if (d.messages?.length) setMsgs(d.messages.map(m => ({ id: uid(), role: m.role, text: m.content, agent: d.active, steps: [], response: m.content, phase: 'done', time: Date.now() }))); } }, []);
  React.useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [msgs]);

  const persist = (list) => { const mem = list.filter(m => m.role === 'user' || m.phase === 'done').map(m => ({ role: m.role, content: m.role === 'user' ? m.text : m.response })); B.saveMem({ messages: mem, active, mid: seq }); };
  const patch = (id, p) => setMsgs(prev => prev.map(m => m.id === id ? { ...m, ...p } : m));

  function pickAgent(id) { setActive(id); setMenu(false); B.saveMem({ messages: [], active: id, mid: 0 }); setMsgs([]); setText(''); }

  function send(input) {
    const q = input.trim();
    if (!q || busy) return;
    setBusy(true); setText('');
    const now = Date.now();
    const user = { id: uid(), role: 'user', text: q, time: now };
    const agent = { id: uid(), role: 'agent', agent: active, phase: 'planning', steps: [], response: '', time: now };
    setMsgs(prev => [...prev, user, agent]);
    B.planSteps(q, active).then(plan => { if (!plan) { patch(agent.id, { phase: 'done', response: 'No he podido procesar eso ahora mismo.' }); setBusy(false); return; } patch(agent.id, { phase: 'running', steps: plan.steps || [], response: plan.response || '' }); }).catch(() => { patch(agent.id, { phase: 'done', steps: [], response: 'Ha ocurrido un error.' }); setBusy(false); });
  }

  function onStepsDone(id) { patch(id, { phase: 'done' }); setBusy(false); setMsgs(prev => { persist(prev); return prev; }); }

  React.useEffect(() => { if (!menu) return; const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); }; document.addEventListener('mousedown', handler); return () => document.removeEventListener('mousedown', handler); }, [menu]);

  const agent = B.agentById(active);

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      <div className={s.bg}>
        <div className={s.orb1} />
        <div className={s.orb2} />
        <div className={s.orb3} />
        <div className={s.orb4} />
      </div>
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
                    {t} <ArrowRight16Regular style={{ fontSize: '12px', color: '#aaa' }} />
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
    </div>
  );
}
