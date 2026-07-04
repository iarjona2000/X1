import * as React from 'react';
import {
  makeStyles, tokens, shorthands,
  Caption1, Body1, Button, Textarea, Avatar, Menu,
  MenuTrigger, MenuPopover, MenuList, MenuItem, MenuDivider
} from '@fluentui/react-components';
import {
  Send24Filled, Sparkle28Filled, ArrowRight16Regular,
  CheckmarkCircle24Filled, ChevronDown16Regular,
  History24Regular, ThumbLike24Regular, ThumbDislike24Regular
} from '@fluentui/react-icons';
import { ProcessTimeline } from './ProcessTimeline.jsx';
import * as B from './backend.js';

const useStyles = makeStyles({
  app: {
    display: 'flex', flexDirection: 'column', height: '100vh',
    backgroundColor: '#ffffff', color: '#1a1a1a',
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif"
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px 10px 18px', backgroundColor: '#ffffff',
    borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 10
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  brandMark: {
    width: '26px', height: '26px', borderRadius: '7px', display: 'block', flexShrink: 0
  },
  agentToggle: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    backgroundColor: '#f5f5f5', padding: '5px 12px 5px 8px',
    borderRadius: '20px', cursor: 'pointer', border: '1px solid transparent',
    transition: 'all 0.15s ease',
    ':hover': { backgroundColor: '#eeeeee' }
  },
  agentAiIcon: { width: '16px', height: '16px', borderRadius: '3px', display: 'block', flexShrink: 0 },
  log: {
    flexGrow: 1, overflowY: 'auto', padding: '20px 16px 8px',
    display: 'flex', flexDirection: 'column', gap: '18px',
    '::-webkit-scrollbar': { width: '4px' },
    '::-webkit-scrollbar-thumb': { backgroundColor: '#e0e0e0', borderRadius: '2px' }
  },
  empty: {
    margin: 'auto', textAlign: 'center', maxWidth: '300px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
    paddingTop: '48px'
  },
  emptyIconWrap: {
    width: '72px', height: '72px', borderRadius: '22px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #f0eefe 0%, #e8e3fd 100%)',
    boxShadow: '0 4px 16px rgba(75,58,201,0.08)'
  },
  emptyIcon: { color: '#4b3ac9', fontSize: '32px' },
  emptyTitle: { fontSize: '18px', fontWeight: 600, color: '#1a1a1a' },
  emptyDesc: { fontSize: '14px', color: '#999', lineHeight: '1.5', marginTop: '-8px' },
  suggestions: { display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '4px' },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    backgroundColor: '#f5f5f5', padding: '9px 16px', borderRadius: '14px',
    fontSize: '13px', color: '#555', cursor: 'pointer', border: '1px solid #eee',
    transition: 'all 0.15s ease', userSelect: 'none',
    ':hover': { backgroundColor: '#f0eefe', borderColor: '#c4b5fd', color: '#4b3ac9' }
  },
  userRow: { display: 'flex', justifyContent: 'flex-end', marginBottom: '2px' },
  userBubble: {
    maxWidth: '82%', padding: '11px 18px',
    backgroundColor: '#4b3ac9', color: '#ffffff',
    borderRadius: '18px', borderBottomRightRadius: '5px',
    fontSize: '15px', lineHeight: '1.5',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    boxShadow: '0 2px 8px rgba(75,58,201,0.12)'
  },
  card: {
    padding: '18px',
    backgroundColor: '#ffffff',
    border: '1px solid #f0f0f0',
    borderRadius: '18px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)',
    transition: 'box-shadow 0.2s ease, transform 0.15s ease',
    ':hover': {
      boxShadow: '0 4px 14px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.03)',
      transform: 'translateY(-1px)'
    }
  },
  cardHead: {
    display: 'flex', alignItems: 'center', gap: '10px',
    marginBottom: '14px', paddingBottom: '14px',
    borderBottom: '1px solid #f5f5f5'
  },
  cardMeta: { display: 'flex', flexDirection: 'column', gap: '1px' },
  cardName: { fontSize: '14px', fontWeight: 600, color: '#1a1a1a', lineHeight: '1.3' },
  cardTime: { fontSize: '12px', color: '#bbb', lineHeight: '1.2' },
  answer: {
    fontSize: '15px', lineHeight: '1.65', color: '#333',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word'
  },
  thinkingCard: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '16px 18px', backgroundColor: '#fafafa',
    border: '1px solid #f0f0f0', borderRadius: '16px',
    color: '#999', fontSize: '14px'
  },
  dots: {
    display: 'inline-flex', gap: '4px',
    '> span': {
      width: '7px', height: '7px', borderRadius: '50%',
      backgroundColor: '#ccc',
      animationName: {
        '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.3 },
        '40%': { transform: 'scale(1)', opacity: 1 }
      },
      animationDuration: '1.2s', animationIterationCount: 'infinite'
    }
  },
  compareDivider: {
    display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0 8px',
    color: '#bbb', fontSize: '12px', fontWeight: 500,
    '::before, ::after': { content: '""', flexGrow: 1, height: '1px', backgroundColor: '#eee' }
  },
  comparePanel: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
    marginTop: '12px'
  },
  compareCol: {
    padding: '14px', borderRadius: '14px', border: '1px solid #f0f0f0',
    backgroundColor: '#fafafa'
  },
  compareColHead: {
    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px',
    paddingBottom: '10px', borderBottom: '1px solid #f0f0f0'
  },
  compareColIcon: { width: '18px', height: '18px', borderRadius: '4px', display: 'block' },
  compareColTitle: { fontSize: '13px', fontWeight: 600, color: '#555' },
  compareColText: { fontSize: '13px', lineHeight: '1.55', color: '#555', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  voteRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '8px', marginTop: '12px', padding: '8px'
  },
  voteBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 500,
    border: '1px solid #eee', backgroundColor: '#fff', color: '#888', cursor: 'pointer',
    transition: 'all 0.12s ease',
    ':hover': { backgroundColor: '#f5f5f5', borderColor: '#ddd' }
  },
  voteBtnActive: {
    backgroundColor: '#f0eefe', borderColor: '#c4b5fd', color: '#4b3ac9'
  },
  statsRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '16px', marginTop: '6px', padding: '6px'
  },
  statBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontSize: '11px', color: '#aaa'
  },
  statIcon: { fontSize: '12px', marginRight: '2px' },
  composer: {
    padding: '8px 16px 14px', backgroundColor: '#ffffff',
    borderTop: '1px solid #f0f0f0'
  },
  inputWrap: {
    display: 'flex', alignItems: 'flex-end', gap: '8px',
    backgroundColor: '#f5f5f5', padding: '7px 8px 7px 16px',
    borderRadius: '22px', border: '1px solid #e8e8e8',
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
    ':focus-within': { borderColor: '#4b3ac9', backgroundColor: '#ffffff' }
  },
  textarea: {
    flexGrow: 1, backgroundColor: 'transparent',
    fontSize: '15px', lineHeight: '1.45',
    '> textarea': { '::placeholder': { color: '#bbb' } }
  },
  hint: {
    display: 'block', textAlign: 'center', marginTop: '7px',
    fontSize: '11px', color: '#d0d0d0'
  }
});

let MID = 0;
const nid = () => 'm' + (++MID);

const SUGGESTIONS = [
  { text: 'Research AI trends 2026' },
  { text: 'Create a Google Doc' },
  { text: 'Check my emails' },
  { text: 'Write a React component' }
];

export default function App() {
  const styles = useStyles();
  const [active, setActive] = React.useState('research');
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const logRef = React.useRef(null);

  React.useEffect(() => {
    B.warm();
    const d = B.loadMem();
    if (d) {
      if (d.active) setActive(d.active);
      if (d.mid) MID = d.mid;
      if (d.messages && d.messages.length) {
        setMessages(d.messages.map((m) => ({
          id: nid(), role: m.role === 'user' ? 'user' : 'agent',
          text: m.content, agent: d.active || 'research',
          steps: [], response: m.content, phase: 'done', time: Date.now()
        })));
      }
    }
  }, []);

  React.useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  const persist = React.useCallback((msgs, act) => {
    const mem = msgs.filter((m) => m.role === 'user' || m.phase === 'done')
      .map((m) => ({ role: m.role, content: m.role === 'user' ? m.text : m.response }));
    B.saveMem({ messages: mem, active: act, mid: MID });
  }, []);

  const update = (id, patch) => setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  function switchAgent(id) {
    setActive(id);
    B.saveMem({ messages: [], active: id, mid: 0 });
    setMessages([]);
    setInput('');
  }

  function run(text) {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    setInput('');
    const now = Date.now();
    const userMsg = { id: nid(), role: 'user', text: q, time: now };
    const agentMsg = {
      id: nid(), role: 'agent', agent: active, phase: 'planning',
      steps: [], response: '', time: now, compare: null, voted: false
    };
    setMessages((prev) => [...prev, userMsg, agentMsg]);

    if (B.isSimple(q)) {
      B.simpleAnswer(q, active).then((txt) => {
        update(agentMsg.id, { phase: 'done', response: txt || B.HONEST_ERROR, time: Date.now() });
        setBusy(false);
        setMessages((prev) => { persist(prev, active); return prev; });
      });
      return;
    }

    B.planSteps(q, active).then((plan) => {
      if (!plan) {
        update(agentMsg.id, { phase: 'done', steps: [], response: B.HONEST_ERROR, time: Date.now() });
        setBusy(false);
        return;
      }
      const steps = plan.steps || [{ app: 'Done', label: 'Result' }];
      const response = plan.response || B.HONEST_ERROR;
      update(agentMsg.id, { phase: 'running', steps, response, time: Date.now() });
    }).catch(() => {
      update(agentMsg.id, { phase: 'done', steps: [], response: B.HONEST_ERROR, time: Date.now() });
      setBusy(false);
    });
  }

  const onTimelineDone = (id, response) => {
    update(id, { phase: 'done' });
    setBusy(false);
    setMessages((prev) => { persist(prev, active); return prev; });
  };

  function runCompare(id) {
    const msg = messages.find((m) => m.id === id);
    if (!msg || msg.compare) return;
    const q = messages.filter((m) => m.id === id)
      .flatMap(() => messages.filter((m) => m.role === 'user' && messages.indexOf(m) < messages.indexOf(messages.find(x => x.id === id))))
    const query = messages.slice(0, messages.indexOf(msg)).filter(m => m.role === 'user').pop();
    if (!query) return;
    update(id, { compare: 'loading' });
    B.compareAnswers(query.text, active).then((result) => {
      update(id, { compare: result, voted: false });
    });
  }

  function vote(msgId, winner) {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg || !msg.compare) return;
    B.recordVote({ winner, query: msg.text, agent: active });
    update(msgId, { voted: winner });
    setMessages((prev) => { persist(prev, active); return prev; });
  }

  function chipClick(text) { run(text); }

  const activeAgent = B.agentById(active);
  const prefs = B.getPreferences();

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <img className={styles.brandMark} src="../assets/x1-logo-square.png" alt="X1"
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <div className={styles.agentToggle} role="button" tabIndex={0}>
                <img className={styles.agentAiIcon} src={activeAgent.aiIcon} alt={activeAgent.ai}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <Caption1 style={{ fontWeight: 500, color: '#555' }}>{activeAgent.name}</Caption1>
                <ChevronDown16Regular style={{ fontSize: '12px', color: '#999' }} />
              </div>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {B.AGENTS.map((a) => (
                  <MenuItem key={a.id}
                    onClick={() => switchAgent(a.id)}
                    icon={<img src={a.aiIcon} alt="" style={{ width: '16px', height: '16px', borderRadius: '3px' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                    secondaryContent={a.ai}>
                    {a.name}
                  </MenuItem>
                ))}
                <MenuDivider />
                <MenuItem icon={<History24Regular />} onClick={() => { B.clearMem(); setMessages([]); }}>
                  Clear history
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </div>
        {Object.keys(prefs).length > 0 && (
          <Caption1 style={{ color: '#ccc', fontSize: '11px' }}>
            {Object.entries(prefs).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${k} ${v}`).join(' | ')}
          </Caption1>
        )}
      </header>

      <div className={styles.log} ref={logRef}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIconWrap}>
              <Sparkle28Filled className={styles.emptyIcon} />
            </div>
            <div>
              <div className={styles.emptyTitle}>En que puedo ayudarte?</div>
              <div className={styles.emptyDesc}>
                Activo: <strong>{activeAgent.name}</strong> ({activeAgent.ai}). Busco, leo, creo documentos, escribo codigo y actuo en tus herramientas.
              </div>
            </div>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s, i) => (
                <div key={i} className={styles.chip} onClick={() => chipClick(s.text)}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && chipClick(s.text)}>
                  <span>{s.text}</span>
                  <ArrowRight16Regular style={{ fontSize: '12px', color: '#bbb' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => m.role === 'user' ? (
          <div key={m.id} className={styles.userRow}>
            <div className={styles.userBubble}>{m.text}</div>
          </div>
        ) : (
          <div key={m.id} className={styles.card}>
            <div className={styles.cardHead}>
              <img className={styles.brandMark}
                style={{ width: '22px', height: '22px', borderRadius: '6px' }}
                src={B.agentById(m.agent).aiIcon} alt={B.agentById(m.agent).ai}
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <div className={styles.cardMeta}>
                <span className={styles.cardName}>{B.agentById(m.agent).name} &middot; {B.agentById(m.agent).ai}</span>
                <span className={styles.cardTime}>
                  {m.time ? new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            </div>

            {m.phase === 'planning' && (
              <div className={styles.thinkingCard}>
                <div className={styles.dots}>
                  <span style={{ animationDelay: '0s' }} />
                  <span style={{ animationDelay: '0.2s' }} />
                  <span style={{ animationDelay: '0.4s' }} />
                </div>
                <span>Razonando el proceso...</span>
              </div>
            )}

            {(m.phase === 'running' || m.phase === 'done') && m.steps && m.steps.length > 0 && (
              <ProcessTimeline steps={m.steps}
                onComplete={m.phase === 'running' ? () => onTimelineDone(m.id) : undefined} />
            )}

            {m.phase === 'done' && m.response && (
              <Body1 className={styles.answer}>{m.response}</Body1>
            )}

            {m.phase === 'done' && !m.compare && m.response && m.response !== B.HONEST_ERROR && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button size="small" appearance="subtle"
                  style={{ fontSize: '12px', color: '#999' }}
                  onClick={() => runCompare(m.id)}>
                  Comparar
                </Button>
              </div>
            )}

            {m.compare === 'loading' && (
              <div className={styles.thinkingCard} style={{ marginTop: '12px' }}>
                <div className={styles.dots}>
                  <span style={{ animationDelay: '0s' }} />
                  <span style={{ animationDelay: '0.2s' }} />
                  <span style={{ animationDelay: '0.4s' }} />
                </div>
                <span>Obteniendo segunda opinion...</span>
              </div>
            )}

            {m.compare && m.compare !== 'loading' && (
              <div>
                <div className={styles.compareDivider}>
                  <span>Analisis comparativo</span>
                </div>
                <div className={styles.comparePanel}>
                  <div className={styles.compareCol}>
                    <div className={styles.compareColHead}>
                      <CheckmarkCircle24Filled style={{ color: '#107c41', fontSize: '16px' }} />
                      <span className={styles.compareColTitle}>Respuesta principal</span>
                    </div>
                    <div className={styles.compareColText}>{m.compare.primary.text}</div>
                  </div>
                  <div className={styles.compareCol}>
                    <div className={styles.compareColHead}>
                      <Sparkle28Filled style={{ color: '#8764b8', fontSize: '16px' }} />
                      <span className={styles.compareColTitle}>Perspectiva critica</span>
                    </div>
                    <div className={styles.compareColText}>{m.compare.critical.text}</div>
                  </div>
                </div>

                {!m.voted && (
                  <div className={styles.voteRow}>
                    <span style={{ fontSize: '12px', color: '#bbb', marginRight: '4px' }}>Cual fue mejor?</span>
                    <div className={`${styles.voteBtn}`}
                      onClick={() => vote(m.id, 'primary')} role="button" tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && vote(m.id, 'primary')}>
                      <ThumbLike24Regular style={{ fontSize: '14px' }} /> Principal
                    </div>
                    <div className={`${styles.voteBtn}`}
                      onClick={() => vote(m.id, 'critical')} role="button" tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && vote(m.id, 'critical')}>
                      <ThumbLike24Regular style={{ fontSize: '14px' }} /> Critica
                    </div>
                  </div>
                )}
                {m.voted && (
                  <div className={styles.statsRow}>
                    <span className={styles.statBadge}>
                      <CheckmarkCircle24Filled style={{ fontSize: '12px', color: '#107c41' }} />
                      Votado: {m.voted === 'primary' ? 'Principal' : 'Critica'}
                    </span>
                    <span className={styles.statBadge}>
                      <History24Regular style={{ fontSize: '12px' }} />
                      {(prefs[m.voted] || 0) + 1} votos totales
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.composer}>
        <div className={styles.inputWrap}>
          <Textarea className={styles.textarea} appearance="filled-lighter" resize="none"
            value={input} placeholder="Preguntame lo que quieras..."
            onChange={(_, d) => setInput(d.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(input); } }} />
          <Button appearance="primary" shape="circular" icon={<Send24Filled />}
            disabled={!input.trim() || busy}
            onClick={() => run(input)}
            aria-label="Enviar"
            style={{
              minWidth: '38px', height: '38px', width: '38px',
              backgroundColor: '#4b3ac9', border: 'none'
            }} />
        </div>
        <Caption1 className={styles.hint}>X1 puede cometer errores. Verifica la informacion importante.</Caption1>
      </div>
    </div>
  );
}
