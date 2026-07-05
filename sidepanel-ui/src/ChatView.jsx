import React, { useState, useEffect, useRef } from 'react';
import * as B from './backend.js';
import * as T from './tools.js';

const AGENTS = B.AGENTS;

const THINKING_MESSAGES = [
  'Conectando con el motor...',
  'Procesando tu consulta...',
  'Analizando la informacion...',
  'Construyendo la respuesta...',
];

const S = {
  container: { flex:1, display:'flex', flexDirection:'column', position:'relative', minWidth:0 },
  messages: { flex:1, overflow:'auto', padding:'16px 0' },
  empty: { textAlign:'center', padding:'60px 40px', color:'#484F58' },
  emptyIcon: { fontSize:48, marginBottom:16, opacity:0.5 },
  emptyTitle: { fontSize:20, fontWeight:600, color:'#E6EDF3', marginBottom:8, letterSpacing:'-0.02em' },
  emptyDesc: { fontSize:14, marginBottom:24, maxWidth:400, margin:'0 auto 24px auto', lineHeight:1.6, color:'#8B949E' },
  agentPills: { display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap', marginBottom:16 },
  agentPill: { padding:'6px 12px', borderRadius:20, background:'#161B22', border:'1px solid #21262D', fontSize:12, color:'#B6BFB8', display:'flex', alignItems:'center', gap:6, transition:'all 0.15s' },
  agentPillDot: (color) => ({ width:8, height:8, borderRadius:4, background:color }),
  emptyHint: { fontSize:12, color:'#484F58' },
  msgRow: (isUser) => ({ display:'flex', gap:8, padding:'4px 16px', animation:'fadeIn 0.2s ease', justifyContent:isUser?'flex-end':'flex-start' }),
  agentAvatar: (color) => ({ width:28, height:28, borderRadius:6, background:color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:700, flexShrink:0, marginTop:2 }),
  bubble: (isUser) => ({ padding:'10px 14px', borderRadius:12, background:isUser?'#0FBF3E':'#161B22', border:isUser?'1px solid rgba(15,191,62,0.3)':'1px solid #21262D', color:isUser?'#101411':'#B6BFB8', fontSize:14, lineHeight:1.6, wordBreak:'break-word', maxWidth:isUser?'75%':'85%' }),
  systemBubble: { textAlign:'center', padding:'8px 0' },
  systemPill: { display:'inline-block', padding:'6px 14px', borderRadius:20, background:'#21262D', border:'1px solid #30363D', fontSize:12, color:'#8B949E' },
  toolBadges: { display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 },
  toolBadge: (color) => ({ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:12, background:'#21262D', border:'1px solid #30363D', fontSize:11, color }),
  processCard: { margin:'12px 0', padding:12, background:'#0D1117', borderRadius:12, border:'1px solid #21262D' },
  processTitle: { fontSize:11, color:'#8B949E', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 },
  processSteps: { display:'flex', gap:8, flexWrap:'wrap' },
  processStep: { display:'flex', alignItems:'center', gap:6, padding:'8px 10px', background:'#161B22', borderRadius:8, border:'1px solid #21262D', animation:'slideIn 0.2s ease', flex:'1 1 auto', minWidth:120 },
  processIcon: { fontSize:16, lineHeight:1 },
  processDesc: { fontSize:11, color:'#B6BFB8', lineHeight:1.3 },
  processStatus: { fontSize:10, color:'#8B949E' },
  reasoningCard: { margin:'12px 0', padding:12, background:'#161B22', borderRadius:12, border:'1px solid #21262D', display:'flex', alignItems:'flex-start', gap:10 },
  reasoningAvatar: (color) => ({ width:28, height:28, borderRadius:6, background:color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:700, flexShrink:0 }),
  reasoningTitle: { fontSize:12, fontWeight:600, color:'#E6EDF3', marginBottom:2 },
  reasoningText: { fontSize:12, color:'#8B949E', lineHeight:1.5 },
  agentFooter: { marginTop:8, paddingTop:8, borderTop:'1px solid #21262D', display:'flex', alignItems:'center', gap:8 },
  agentLabel: { fontSize:11, color:'#8B949E' },
  agentLink: { fontSize:11, color:'#0FBF3E', cursor:'pointer', textDecoration:'none' },
  thinking: { display:'flex', gap:8, padding:'4px 16px' },
  thinkingBubble: { padding:'10px 14px', borderRadius:12, background:'#161B22', border:'1px solid #21262D', display:'flex', alignItems:'center', gap:8 },
  thinkingDots: { display:'flex', gap:4 },
  thinkingDot: (i) => ({ width:6, height:6, borderRadius:3, background:'#0FBF3E', animation:'pulse 1s infinite', animationDelay:i*0.15+'s' }),
  thinkingText: { fontSize:13, color:'#8B949E' },
  inputArea: { padding:'12px 16px', borderTop:'1px solid #21262D', background:'#101411' },
  inputRow: { display:'flex', gap:8, alignItems:'flex-end' },
  agentBtn: (color) => ({ width:36, height:36, borderRadius:'var(--radius)', background:color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', flexShrink:0, border:'2px solid rgba(255,255,255,0.1)', transition:'all 0.15s' }),
  textarea: { flex:1, position:'relative' },
  textareaInput: { width:'100%', minHeight:40, maxHeight:120, padding:'10px 12px', borderRadius:10, border:'1px solid #30363D', background:'#0D1117', color:'#E6EDF3', fontSize:14, fontFamily:'inherit', resize:'none', outline:'none', lineHeight:1.4, transition:'border-color 0.15s' },
  sendBtn: (active) => ({ width:36, height:36, borderRadius:'var(--radius)', background:active?'#0FBF3E':'#21262D', border:active?'1px solid rgba(15,191,62,0.3)':'1px solid #30363D', display:'flex', alignItems:'center', justifyContent:'center', cursor:active?'pointer':'not-allowed', color:active?'#101411':'#484F58', fontSize:16, flexShrink:0, transition:'all 0.15s' }),
  agentPicker: { position:'absolute', bottom:60, left:16, background:'#161B22', border:'1px solid #30363D', borderRadius:12, padding:12, width:280, boxShadow:'0 8px 24px rgba(0,0,0,0.44)', zIndex:9999 },
  agentPickerTitle: { fontSize:11, fontWeight:600, color:'#8B949E', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8, paddingBottom:6, borderBottom:'1px solid #21262D' },
  agentOption: (selected) => ({ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:'var(--radius)', cursor:'pointer', background:selected?'#21262D':'transparent', transition:'background 0.15s', marginBottom:2 }),
  agentOptionAvatar: (color) => ({ width:28, height:28, borderRadius:6, background:color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:700, flexShrink:0 }),
  agentOptionName: { fontSize:13, color:'#E6EDF3', fontWeight:500 },
  agentOptionDesc: { fontSize:11, color:'#8B949E' },
  agentCheck: { fontSize:12, color:'#0FBF3E' },
};

function ProcessTimeline({ steps }) {
  if (!steps || steps.length === 0) return null;
  return (
    <div style={S.processCard}>
      <div style={S.processTitle}>Proceso</div>
      <div style={S.processSteps}>
        {steps.map((step, i) => {
          const icons = { github:'&#128187;', npm:'&#128230;', stackoverflow:'&#128221;', web:'&#127760;', gmail:'&#128231;', calendar:'&#128197;' };
          return (
            <div key={i} style={S.processStep}>
              <div style={S.processIcon} dangerouslySetInnerHTML={{ __html: icons[step.app]||'&#128196;' }} />
              <div>
                <div style={S.processDesc}>{step.description}</div>
                <div style={S.processStatus}>{step.status==='done'?'&#10003; Listo':'&#9679; Activo'}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReasoningPanel({ reasoning }) {
  if (!reasoning) return null;
  const agent = AGENTS.find(a => a.id === reasoning.agent);
  return (
    <div style={S.reasoningCard}>
      <div style={S.reasoningAvatar(agent?.color||'#656d76')}>{agent?.letter||'?'}</div>
      <div>
        <div style={S.reasoningTitle}>AUTO selecciono: {agent?.name||reasoning.agent}</div>
        <div style={S.reasoningText}>{reasoning.reason}</div>
      </div>
    </div>
  );
}

function ToolBadges({ tools }) {
  if (!tools || tools.length === 0) return null;
  return (
    <div style={S.toolBadges}>
      {tools.map(tool => {
        const icons = { github:'&#128187;', npm:'&#128230;', stackoverflow:'&#128221;', web:'&#127760;', gmail:'&#128231;', calendar:'&#128197;' };
        return <div key={tool} style={S.toolBadge('#B6BFB8')}><span dangerouslySetInnerHTML={{ __html: icons[tool]||'&#128196;' }} /><span>{tool}</span></div>;
      })}
    </div>
  );
}

function AgentPicker({ selected, onSelect, onClose }) {
  return (
    <div style={S.agentPicker}>
      <div style={S.agentPickerTitle}>Seleccionar agente</div>
      {AGENTS.map(agent => (
        <div key={agent.id} onClick={()=>{onSelect(agent.id);onClose();}} style={S.agentOption(selected===agent.id)}>
          <div style={S.agentOptionAvatar(agent.color)}>{agent.letter}</div>
          <div style={{flex:1}}>
            <div style={S.agentOptionName}>{agent.name}</div>
            <div style={S.agentOptionDesc}>{agent.ai} &middot; {agent.desc}</div>
          </div>
          {selected===agent.id && <div style={S.agentCheck}>&#10003;</div>}
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ msg, onOpenRepo }) {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';
  if (isSystem) return <div style={S.systemBubble}><div style={S.systemPill}>{msg.content}</div></div>;
  return (
    <div style={S.msgRow(isUser)}>
      {!isUser && <div style={S.agentAvatar(msg.agentColor||'#656d76')}>{msg.agentLetter||'X'}</div>}
      <div style={S.bubble(isUser)}>
        {msg.content}
        {!isUser && msg.tools?.length>0 && <ToolBadges tools={msg.tools} />}
        {!isUser && msg.process?.length>0 && <ProcessTimeline steps={msg.process} />}
        {!isUser && msg.reasoning && <ReasoningPanel reasoning={msg.reasoning} />}
        {!isUser && msg.agent && (
          <div style={S.agentFooter}>
            <div style={S.agentLabel}>Agente: {msg.agent}</div>
            <div onClick={()=>onOpenRepo(msg.agentId)} style={S.agentLink}>Ver repositorio</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatView({ user, conversations, setConversations, activeConv, setActiveConv, onOpenRepo, selectedAgent, setSelectedAgent }) {
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [thinkingMsg, setThinkingMsg] = useState('');
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const activeConvData = conversations.find(c => c.id === activeConv);
  const messages = activeConvData?.messages || [];

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior:'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [activeConv]);

  function patchMsg(id, updater) {
    setConversations(prev => prev.map(c => {
      if (c.id !== id) return c;
      return { ...c, messages: (c.messages||[]).map(m => m.id===id ? { ...m, ...updater(m) } : m) };
    }));
  }

  async function handleSend() {
    const q = input.trim();
    if (!q || thinking) return;
    setInput('');

    let convId = activeConv;
    let conv = conversations.find(c => c.id === convId);

    if (!conv) {
      const newId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      conv = { id: newId, title: q.substring(0, 40), messages: [], created: Date.now(), updated: Date.now() };
      setConversations(prev => [conv, ...prev]);
      convId = newId;
      setActiveConv(newId);
    }

    const userMsg = { id: Date.now().toString(36)+Math.random().toString(36).slice(2,6), role:'user', content:q, ts:Date.now() };
    setConversations(prev => prev.map(c => c.id===convId ? { ...c, messages:[...(c.messages||[]), userMsg], title:c.messages?.length===0?q.substring(0,40):c.title, updated:Date.now() } : c));

    setThinking(true);
    setThinkingMsg(THINKING_MESSAGES[0]);
    const thinkTimer = setInterval(() => {
      setThinkingMsg(prev => { const idx = THINKING_MESSAGES.indexOf(prev); return THINKING_MESSAGES[(idx+1)%THINKING_MESSAGES.length]; });
    }, 2000);

    try {
      const result = await B.smartQuery(q, selectedAgent);
      const msgId = Date.now().toString(36)+Math.random().toString(36).slice(2,6);
      const agent = AGENTS.find(a => a.id === (result.agent||selectedAgent));
      const assistantMsg = {
        id:msgId, role:'assistant', content:result.response||result.text||result, ts:Date.now(),
        tools:result.tools||[], process:result.process||[], reasoning:result.reasoning||null,
        agent:agent?.name||selectedAgent, agentId:agent?.id||selectedAgent,
        agentLetter:agent?.letter||'?', agentColor:agent?.color||'#656d76',
      };
      setConversations(prev => prev.map(c => c.id===convId ? { ...c, messages:[...(c.messages||[]), assistantMsg], updated:Date.now() } : c));
    } catch (e) {
      const errMsg = { id:Date.now().toString(36)+Math.random().toString(36).slice(2,6), role:'assistant', content:'Error: '+(e.message||'No se pudo procesar'), ts:Date.now(), tools:[], process:[], reasoning:null };
      setConversations(prev => prev.map(c => c.id===convId ? { ...c, messages:[...(c.messages||[]), errMsg], updated:Date.now() } : c));
    } finally {
      clearInterval(thinkTimer);
      setThinking(false);
      setThinkingMsg('');
    }
  }

  function handleKeyDown(e) { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }

  const currentAgent = AGENTS.find(a => a.id === selectedAgent);

  return (
    <div style={S.container}>
      <div style={S.messages}>
        {messages.length===0 && (
          <div style={S.empty}>
            <div style={S.emptyIcon}>&#128172;</div>
            <div style={S.emptyTitle}>System X1</div>
            <div style={S.emptyDesc}>Multiples agentes, cada uno con su propio repositorio y motor de IA especializado.</div>
            <div style={S.agentPills}>
              {AGENTS.filter(a=>a.id!=='auto').slice(0,4).map(a=>(
                <div key={a.id} style={S.agentPill}><div style={S.agentPillDot(a.color)} />{a.name}</div>
              ))}
            </div>
            <div style={S.emptyHint}>Escribe un mensaje para comenzar</div>
          </div>
        )}
        {messages.map(msg=><MessageBubble key={msg.id} msg={msg} onOpenRepo={onOpenRepo} />)}
        {thinking && (
          <div style={S.thinking}>
            <div style={S.agentAvatar(currentAgent?.color||'#656d76')}>{currentAgent?.letter||'?'}</div>
            <div style={S.thinkingBubble}>
              <div style={S.thinkingDots}>
                {[0,1,2].map(i=><div key={i} style={S.thinkingDot(i)} />)}
              </div>
              <div style={S.thinkingText}>{thinkingMsg}</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showAgentPicker && <AgentPicker selected={selectedAgent} onSelect={setSelectedAgent} onClose={()=>setShowAgentPicker(false)} />}

      <div style={S.inputArea}>
        <div style={S.inputRow}>
          <div onClick={()=>setShowAgentPicker(!showAgentPicker)} style={S.agentBtn(currentAgent?.color||'#656d76')} title="Cambiar agente">
            {currentAgent?.letter||'?'}
          </div>
          <div style={S.textarea}>
            <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Escribe tu mensaje..." style={S.textareaInput} rows={1} />
          </div>
          <div onClick={handleSend} style={S.sendBtn(input.trim()&&!thinking)} title="Enviar">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M.989 8 .064 2.68a1.342 1.342 0 011.85-1.462l13.402 5.744a1.13 1.13 0 010 2.076L1.913 14.782a1.343 1.343 0 01-1.85-1.463L.99 8zm5.784-6.04l6.956 3.294-6.956 3.295-5.768-3.295 5.768-3.294z"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}
