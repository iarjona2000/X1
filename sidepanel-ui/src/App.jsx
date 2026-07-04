/*
 * X1 — app del side panel (Fluent 2 / React v9). Solo UI: toda la lógica de red
 * y memoria vive en backend.js (contrato intacto).
 */

import * as React from 'react';
import {
  makeStyles, tokens, shorthands,
  Text, Caption1, Subtitle2, Body1,
  Button, Textarea, Spinner, Avatar, Badge,
  Menu, MenuTrigger, MenuPopover, MenuList, MenuItem,
  Tooltip
} from '@fluentui/react-components';
import {
  Send24Filled, Mic24Regular, Mic24Filled,
  WeatherSunny24Regular, WeatherMoon24Regular,
  ChevronDown16Regular, Sparkle24Regular, Add20Regular
} from '@fluentui/react-icons';
import { ProcessTimeline } from './ProcessTimeline.jsx';
import * as B from './backend.js';

const useStyles = makeStyles({
  app: {
    display: 'flex', flexDirection: 'column', height: '100vh',
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalL),
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    position: 'sticky', top: 0, zIndex: 10
  },
  brand: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS },
  brandMark: { width: '22px', height: '22px', borderRadius: '6px' },
  brandName: { fontWeight: tokens.fontWeightBold, letterSpacing: '0.5px' },
  headerEnd: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS },
  picker: {
    minWidth: 'auto', ...shorthands.padding('0', tokens.spacingHorizontalS),
    fontWeight: tokens.fontWeightSemibold
  },
  status: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    color: tokens.colorNeutralForeground3, marginRight: tokens.spacingHorizontalXS
  },
  dot: {
    width: '7px', height: '7px', borderRadius: '50%',
    backgroundColor: tokens.colorPaletteGreenBackground3
  },
  log: {
    flexGrow: 1, overflowY: 'auto',
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL),
    display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL
  },
  empty: {
    margin: 'auto', textAlign: 'center', maxWidth: '300px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: tokens.spacingVerticalS,
    color: tokens.colorNeutralForeground3
  },
  emptyIcon: {
    width: '46px', height: '46px', borderRadius: '12px',
    display: 'grid', placeItems: 'center',
    backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2,
    marginBottom: tokens.spacingVerticalS
  },
  userRow: { display: 'flex', justifyContent: 'flex-end' },
  userBubble: {
    maxWidth: '82%', ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand,
    borderRadius: '14px', borderBottomRightRadius: '4px',
    fontSize: tokens.fontSizeBase300, whiteSpace: 'pre-wrap', wordBreak: 'break-word'
  },
  card: {
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground1,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2
  },
  cardHead: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, marginBottom: tokens.spacingVerticalS },
  answer: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.5' },
  thinking: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, color: tokens.colorNeutralForeground3 },
  composer: {
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    backgroundColor: tokens.colorNeutralBackground1,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`
  },
  inputWrap: {
    display: 'flex', alignItems: 'flex-end', gap: tokens.spacingHorizontalXS,
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalXS, tokens.spacingVerticalXS, tokens.spacingHorizontalS),
    borderRadius: tokens.borderRadiusXLarge,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`
  },
  textarea: { flexGrow: 1, backgroundColor: 'transparent' },
  hint: { display: 'block', textAlign: 'center', marginTop: tokens.spacingVerticalXS, color: tokens.colorNeutralForeground4 }
});

let MID = 0;
const nid = () => 'm' + (++MID);

export default function App({ mode, onToggleMode }) {
  const styles = useStyles();
  const [active, setActive] = React.useState('research');
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const logRef = React.useRef(null);

  // Restaurar memoria + warm-up (contrato backend intacto)
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
          steps: [], response: m.content, phase: 'done'
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

  function run(text) {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    setInput('');
    const userMsg = { id: nid(), role: 'user', text: q };
    const agentMsg = { id: nid(), role: 'agent', agent: active, phase: 'planning', steps: [], response: '' };
    setMessages((prev) => [...prev, userMsg, agentMsg]);

    if (B.isSimple(q)) {
      const fallback = B.quickReply(q) || '¿En qué puedo ayudarte?';
      B.simpleAnswer(q, active).then((txt) => {
        update(agentMsg.id, { phase: 'done', response: txt || fallback });
        setBusy(false);
        setMessages((prev) => { persist(prev, active); return prev; });
      });
      return;
    }

    const fallback = B.FALLBACK_ANSWERS[active] || B.FALLBACK_ANSWERS.research;
    B.planSteps(q, active).then((plan) => {
      const steps = (plan && plan.steps) ? plan.steps : [{ app: 'Done', label: 'Result' }];
      const response = (plan && plan.response) ? plan.response : fallback;
      update(agentMsg.id, { phase: 'running', steps, response });
    }).catch(() => {
      update(agentMsg.id, { phase: 'done', steps: [], response: fallback });
      setBusy(false);
    });
  }

  const onTimelineDone = (id) => {
    update(id, { phase: 'done' });
    setBusy(false);
    setMessages((prev) => { persist(prev, active); return prev; });
  };

  function toggleMic() {
    if (listening) { setListening(false); return; }
    setListening(true);
    setTimeout(() => { setListening(false); run('Create a document about Sam Altman'); }, 1500);
  }

  const activeAgent = B.agentById(active);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <img className={styles.brandMark} src="../assets/x1-logo-square.png" alt=""
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <Text size={400} className={styles.brandName}>X1</Text>
          <Menu positioning="below-start">
            <MenuTrigger disableButtonEnhancement>
              <Button appearance="subtle" size="small" className={styles.picker}
                iconPosition="after" icon={<ChevronDown16Regular />}>
                {activeAgent.name}
              </Button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {B.AGENTS.map((a) => (
                  <MenuItem key={a.id} onClick={() => { setActive(a.id); B.saveMem({ messages: [], active: a.id, mid: MID }); }}>
                    {a.name}
                  </MenuItem>
                ))}
              </MenuList>
            </MenuPopover>
          </Menu>
        </div>
        <div className={styles.headerEnd}>
          <span className={styles.status}><span className={styles.dot} /><Caption1>Online</Caption1></span>
          <Tooltip content={mode === 'light' ? 'Tema oscuro' : 'Tema claro'} relationship="label">
            <Button appearance="subtle" icon={mode === 'light' ? <WeatherMoon24Regular /> : <WeatherSunny24Regular />}
              onClick={onToggleMode} aria-label="Cambiar tema" />
          </Tooltip>
        </div>
      </header>

      <div className={styles.log} ref={logRef}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><Sparkle24Regular /></div>
            <Subtitle2>¿En qué puedo ayudarte?</Subtitle2>
            <Caption1>Busco en la web, leo páginas, creo documentos, escribo código y actúo en tus herramientas.</Caption1>
          </div>
        )}

        {messages.map((m) => m.role === 'user' ? (
          <div key={m.id} className={styles.userRow}>
            <div className={styles.userBubble}>{m.text}</div>
          </div>
        ) : (
          <div key={m.id} className={styles.card}>
            <div className={styles.cardHead}>
              <Avatar size={24} color="brand" name={B.agentById(m.agent).name} />
              <Caption1><b>{B.agentById(m.agent).name}</b></Caption1>
            </div>

            {m.phase === 'planning' && (
              <div className={styles.thinking}><Spinner size="tiny" /><Caption1>Razonando el proceso…</Caption1></div>
            )}

            {(m.phase === 'running' || m.phase === 'done') && m.steps && m.steps.length > 0 && (
              <ProcessTimeline steps={m.steps}
                onComplete={m.phase === 'running' ? () => onTimelineDone(m.id) : undefined} />
            )}

            {m.phase === 'done' && m.response && (
              <Body1 className={styles.answer}>{m.response}</Body1>
            )}
          </div>
        ))}
      </div>

      <div className={styles.composer}>
        <div className={styles.inputWrap}>
          <Textarea className={styles.textarea} appearance="filled-lighter" resize="none"
            value={input} placeholder="Pregúntame lo que quieras…"
            onChange={(_, d) => setInput(d.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(input); } }} />
          <Tooltip content="Voz" relationship="label">
            <Button appearance="subtle" shape="circular"
              icon={listening ? <Mic24Filled /> : <Mic24Regular />}
              onClick={toggleMic} aria-label="Voz" />
          </Tooltip>
          <Button appearance="primary" shape="circular" icon={<Send24Filled />}
            disabled={!input.trim() || busy} onClick={() => run(input)} aria-label="Enviar" />
        </div>
        <Caption1 className={styles.hint}>X1 puede cometer errores. Verifica la información importante.</Caption1>
      </div>
    </div>
  );
}
