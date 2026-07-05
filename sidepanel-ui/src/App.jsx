import React, { useState, useEffect, useRef } from 'react';
import ChatView from './ChatView.jsx';
import RepoView from './RepoView.jsx';
import * as B from './backend.js';

const S = {
  shell: { display:'flex', height:'100vh', background:'#101411', fontFamily:'"Mona Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif', color:'#B6BFB8', overflow:'hidden' },
  sidebar: { width:48, minWidth:48, background:'#010409', borderRight:'1px solid #21262D', display:'flex', flexDirection:'column', alignItems:'center', padding:'12px 0', gap:4, position:'relative' },
  sidebarBtn: (active) => ({ width:32, height:32, borderRadius:'var(--radius)', background:active?'#21262D':'transparent', border:active?'1px solid #30363D':'1px solid transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.15s', color:active?'#E6EDF3':'#484F58', fontSize:14 }),
  sidebarIcon: { width:20, height:20, objectFit:'contain' },
  divider: { width:24, height:1, background:'#21262D', margin:'4px 0' },
  topBar: { height:48, background:'#101411', borderBottom:'1px solid #21262D', display:'flex', alignItems:'center', padding:'0 16px', gap:12, flexShrink:0 },
  topBarTitle: { fontSize:14, fontWeight:600, color:'#E6EDF3', letterSpacing:'-0.01em' },
  topBarSubtitle: { fontSize:12, color:'#8B949E' },
  convPanel: { width:240, borderRight:'1px solid #21262D', display:'flex', flexDirection:'column', background:'#101411' },
  convHeader: { padding:12, borderBottom:'1px solid #21262D', display:'flex', alignItems:'center', justifyContent:'space-between' },
  convLabel: { fontSize:11, fontWeight:600, color:'#8B949E', textTransform:'uppercase', letterSpacing:'0.5px' },
  convNew: { width:24, height:24, borderRadius:'var(--radius)', background:'#0FBF3E', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#101411', fontSize:16, fontWeight:700, lineHeight:1, transition:'opacity 0.15s', padding:0, border:'none' },
  convItem: (active) => ({ padding:'8px 12px', borderRadius:'var(--radius)', background:active?'#21262D':'transparent', border:active?'1px solid #30363D':'1px solid transparent', cursor:'pointer', marginBottom:2, transition:'all 0.15s', position:'relative' }),
  convTitle: (active) => ({ fontSize:13, color:active?'#E6EDF3':'#B6BFB8', fontWeight:active?500:400, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', flex:1 }),
  convActions: { display:'flex', gap:2, marginLeft:8 },
  convAction: (color) => ({ width:20, height:20, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:11, color:color||'#484F58', background:'transparent', border:'none', padding:0, transition:'color 0.15s' }),
  main: { flex:1, display:'flex', flexDirection:'column', minWidth:0 },
  settingsOverlay: { position:'absolute', bottom:52, left:0, background:'#161B22', border:'1px solid #30363D', borderRadius:12, padding:16, width:240, boxShadow:'0 8px 24px rgba(0,0,0,0.44)', zIndex:9999 },
  settingsTitle: { fontSize:11, fontWeight:600, color:'#E6EDF3', marginBottom:12, borderBottom:'1px solid #21262D', paddingBottom:8, textTransform:'uppercase', letterSpacing:'0.5px' },
  settingsUser: { display:'flex', alignItems:'center', gap:8, padding:'8px 0', borderBottom:'1px solid #21262D', marginBottom:8 },
  settingsAvatar: { width:24, height:24, borderRadius:12, border:'1px solid #30363D' },
  settingsName: { fontSize:12, color:'#E6EDF3', fontWeight:500 },
  settingsLabel: { fontSize:11, color:'#8B949E' },
  settingsHint: { fontSize:12, color:'#8B949E', marginBottom:12, lineHeight:1.5 },
  settingsBtn: (color) => ({ padding:'8px 12px', borderRadius:'var(--radius)', border:`1px solid ${color}33`, background:'transparent', color:color, fontSize:12, fontWeight:500, cursor:'pointer', textAlign:'left', transition:'all 0.15s', width:'100%', fontFamily:'inherit' }),
  deleteConfirm: { position:'absolute', top:40, left:12, background:'#161B22', border:'1px solid #30363D', borderRadius:8, padding:12, zIndex:9999, width:180 },
  deleteText: { fontSize:12, color:'#8B949E', marginBottom:8 },
  deleteBtns: { display:'flex', gap:6 },
  deleteBtn: (bg, color, border) => ({ padding:'4px 10px', borderRadius:'var(--radius)', border:`1px solid ${border}`, background:bg, color:color, fontSize:11, cursor:'pointer', flex:1, fontFamily:'inherit', fontWeight:500 }),
  content: { flex:1, display:'flex', overflow:'hidden' },
};

const GITHUB_LOGO = (
  <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
  </svg>
);

export default function App({ user }) {
  const [tab, setTab] = useState('chat');
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('auto');
  const [githubUser, setGithubUser] = useState(user);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showRenameConv, setShowRenameConv] = useState(null);
  const [selectedRepoData, setSelectedRepoData] = useState(null);
  const [showRepoFromChat, setShowRepoFromChat] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('x1_conversations');
      if (raw) { const d = JSON.parse(raw); if (Array.isArray(d) && d.length > 0) { setConversations(d); setActiveConv(d[0].id); } }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('x1_conversations', JSON.stringify(conversations.slice(0, 100))); } catch (e) {}
  }, [conversations]);

  useEffect(() => {
    function handleClick(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
      if (showRenameConv && !e.target.closest('[data-rename]')) setShowRenameConv(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showRenameConv]);

  function handleLogoutGithub() {
    B.logoutGithub().then(() => { setGithubUser(null); localStorage.removeItem('x1_user'); window.location.reload(); });
  }

  function handleNewConversation() {
    const newId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const newConv = { id: newId, title: 'Nueva conversacion', messages: [], created: Date.now(), updated: Date.now() };
    setConversations(prev => [newConv, ...prev]);
    setActiveConv(newId);
  }

  function handleDeleteConversation(id) {
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id);
      if (activeConv === id) setActiveConv(next.length > 0 ? next[0].id : null);
      return next;
    });
    setShowDeleteConfirm(null);
  }

  function handleRenameConversation(id, title) {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
    setShowRenameConv(null);
  }

  function handleLogout() {
    localStorage.removeItem('x1_user');
    localStorage.removeItem('x1_conversations');
    B.logoutGithub().then(() => window.location.reload());
  }

  function handleOpenRepoFromChat(agentId) {
    setSelectedRepoData({ agentId, source:'chat' });
    setTab('repo');
    setShowRepoFromChat(true);
  }

  return (
    <div style={S.shell}>
      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={{ ...S.sidebarBtn(false), marginBottom:8, overflow:'hidden' }} title="System X1">
          <img src={B.hasEngine()?'../assets/x1-logo.png':'assets/x1-logo.png'} style={S.sidebarIcon} alt="X1" onError={e=>{e.target.style.display='none';e.target.parentElement.innerHTML='<span style="font-size:12px;font-weight:700;color:#0FBF3E">X1</span>';}} />
        </div>
        <div style={S.divider} />
        <div style={S.sidebarBtn(tab==='chat')} onClick={()=>{setTab('chat')}} title="Chat">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 2.75a.25.25 0 01.25-.25h8.5a.25.25 0 01.25.25v5.5a.25.25 0 01-.25.25h-3.5a.75.75 0 00-.53.22L3.5 11.44V9.25a.75.75 0 00-.75-.75h-1a.25.25 0 01-.25-.25v-5.5zM1.75 1A1.75 1.75 0 000 2.75v5.5C0 9.216.784 10 1.75 10H2v1.543a1.457 1.457 0 002.487 1.03L7.061 10h3.189A1.75 1.75 0 0012 8.25v-5.5A1.75 1.75 0 0010.25 1h-8.5zM14.5 4.75a.25.25 0 00-.25-.25h-.5a.75.75 0 110-1.5h.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0114.25 12H14v1.543a1.457 1.457 0 01-2.487 1.03L9.22 12.28a.75.75 0 111.06-1.06l2.22 2.22v-2.19a.75.75 0 01.75-.75h1a.25.25 0 00.25-.25v-5.5z"/></svg>
        </div>
        <div style={S.sidebarBtn(tab==='repo')} onClick={()=>{setTab('repo');setShowRepoFromChat(false)}} title="Repositorios">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1h-8a1 1 0 00-1 1v6.708A2.486 2.486 0 014.5 9h8V1.5zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/></svg>
        </div>

        <div style={{ position:'absolute', bottom:12, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
          <div style={{ position:'relative' }} ref={settingsRef}>
            <div style={S.sidebarBtn(false)} onClick={()=>setShowSettings(!showSettings)} title="Configuraciones">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8.2 8.2 0 01.701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c.018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.3.071L12.44 2.4c.766-.207 1.563.14 1.933.867l.59 1.142a1.015 1.015 0 01-.163 1.201l-.893.835c-.004.004-.01.016-.01.031 0 .105.046.21.129.291l.648.648a.25.25 0 010 .354l-.648.648a.482.482 0 00-.129.291c0 .015.006.027.01.031l.893.835a1.015 1.015 0 01.163 1.201l-.59 1.142c-.37.727-1.167 1.074-1.933.867l-1.073-.285a.75.75 0 00-.3-.071c-.214.143-.437.272-.668.386-.133.066-.194.158-.212.224l-.288 1.107c-.17.645-.716 1.195-1.459 1.26a8.006 8.006 0 01-1.402 0c-.743-.065-1.289-.615-1.459-1.26l-.288-1.107a.75.75 0 00-.212-.224c-.231-.114-.454-.243-.668-.386a.75.75 0 00-.3-.071l-1.073.285c-.766.207-1.563-.14-1.933-.867l-.59-1.142a1.015 1.015 0 01.163-1.201l.893-.835c.004-.004.01-.016.01-.031a.482.482 0 00-.129-.291l-.648-.648a.25.25 0 010-.354l.648-.648a.482.482 0 00.129-.291c0-.015-.006-.027-.01-.031l-.893-.835a1.015 1.015 0 01-.163-1.201l.59-1.142c.37-.727 1.167-1.074 1.933-.867l1.073.285a.75.75 0 00.3-.071c.214-.143.437-.272.668-.386.133-.066.194-.158.212-.224L10.16 1.29C10.33.645 10.876.095 11.599.031A8.2 8.2 0 018 0zM5.028 4.076C5.16 4.025 5.4 4 5.75 4h4.5c.35 0 .59.025.722.076.065.024.11.054.142.085a.75.75 0 01.18.253l.35 1.05a2.246 2.246 0 00-.432-.392l-.35-.35a.75.75 0 01-.106-.975c.097-.097.224-.171.359-.232a2 2 0 00-.359-.232.75.75 0 01.106-.975l.35-.35a.75.75 0 01.975-.106c.135.061.262.135.359.232a2 2 0 00.359-.232.75.75 0 01.975.106l.35.35c.117.117.188.257.217.392l.35 1.05a.75.75 0 01-.18.253c-.032.031-.077.061-.142.085C10.25 6.975 10.01 7 9.66 7h-4.5a.75.75 0 01-.722-.565l-.35-1.05a.75.75 0 01.18-.253c.032-.031.077-.061.142-.085z"/></svg>
            </div>
            {showSettings && (
              <div style={S.settingsOverlay}>
                <div style={S.settingsTitle}>Configuraciones</div>
                {githubUser && (
                  <div style={S.settingsUser}>
                    {githubUser.avatar_url && <img src={githubUser.avatar_url} style={S.settingsAvatar} alt="" />}
                    <div>
                      <div style={S.settingsName}>{githubUser.login || githubUser.name || 'GitHub'}</div>
                      <div style={S.settingsLabel}>Conectado</div>
                    </div>
                  </div>
                )}
                <div style={S.settingsHint}>
                  <div style={{marginBottom:4}}><span style={{color:'#0FBF3E'}}>&#9679;</span> Busca repos en la barra de arriba</div>
                  <div style={{marginBottom:4}}><span style={{color:'#0FBF3E'}}>&#9679;</span> Haz clic en repos para ver contenido</div>
                  <div><span style={{color:'#0FBF3E'}}>&#9679;</span> Cada repo tiene su propio README.md</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  <button onClick={handleLogoutGithub} style={S.settingsBtn('#F85149')}>Desconectar GitHub</button>
                  <button onClick={handleLogout} style={S.settingsBtn('#F85149')}>Cerrar sesion</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={S.main}>
        {/* Top Bar */}
        <div style={S.topBar}>
          <div style={{flex:1, display:'flex', alignItems:'center', gap:10}}>
            {tab==='chat' && (
              <>
                <div style={{width:28,height:28,borderRadius:6,background:'#0FBF3E',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <img src={B.hasEngine()?'../assets/x1-logo.png':'assets/x1-logo.png'} style={{width:16,height:16,objectFit:'contain'}} alt="X1" onError={e=>{e.target.style.display='none';}} />
                </div>
                <div>
                  <div style={S.topBarTitle}>System X1</div>
                  <div style={S.topBarSubtitle}>Multiples agentes. Un solo sistema.</div>
                </div>
              </>
            )}
            {tab==='repo' && (
              <>
                <div style={{width:28,height:28,borderRadius:6,background:'#21262D',display:'flex',alignItems:'center',justifyContent:'center',color:'#E6EDF3'}}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1h-8a1 1 0 00-1 1v6.708A2.486 2.486 0 014.5 9h8V1.5zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/></svg>
                </div>
                <div>
                  <div style={S.topBarTitle}>{githubUser ? githubUser.login+'/' : ''}repositorios</div>
                  <div style={S.topBarSubtitle}>Repositorios de agentes y datos locales</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div style={S.content}>
          {/* Conversations List */}
          {tab==='chat' && (
            <div style={S.convPanel}>
              <div style={S.convHeader}>
                <div style={S.convLabel}>Conversaciones</div>
                <div onClick={handleNewConversation} style={S.convNew} title="Nueva conversacion">+</div>
              </div>
              <div style={{flex:1,overflow:'auto',padding:8}}>
                {conversations.map(c => (
                  <div key={c.id} onClick={()=>setActiveConv(c.id)} style={S.convItem(activeConv===c.id)}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <div style={S.convTitle(activeConv===c.id)}>{c.title}</div>
                      <div style={S.convActions}>
                        <div onClick={e=>{e.stopPropagation();setShowRenameConv({id:c.id,title:c.title})}} style={S.convAction()} title="Renombrar">&#9998;</div>
                        <div onClick={e=>{e.stopPropagation();setShowDeleteConfirm(c.id)}} style={S.convAction('#F85149')} title="Eliminar">&#128465;</div>
                      </div>
                    </div>
                    {showDeleteConfirm===c.id && (
                      <div style={S.deleteConfirm}>
                        <div style={S.deleteText}>Eliminar conversacion?</div>
                        <div style={S.deleteBtns}>
                          <button onClick={e=>{e.stopPropagation();handleDeleteConversation(c.id)}} style={S.deleteBtn('#F8514922','#F85149','#F8514966')}>Eliminar</button>
                          <button onClick={e=>{e.stopPropagation();setShowDeleteConfirm(null)}} style={S.deleteBtn('transparent','#8B949E','#30363D')}>Cancelar</button>
                        </div>
                      </div>
                    )}
                    {showRenameConv?.id===c.id && (
                      <div data-rename style={{position:'absolute',top:40,left:12,right:12,background:'#161B22',border:'1px solid #30363D',borderRadius:8,padding:12,zIndex:9999}}>
                        <input defaultValue={showRenameConv.title} onKeyDown={e=>{if(e.key==='Enter')handleRenameConversation(c.id,e.target.value)}} autoFocus style={{width:'100%',padding:'6px 10px',borderRadius:'var(--radius)',border:'1px solid #30363D',background:'#0D1117',color:'#E6EDF3',fontSize:12,fontFamily:'inherit',outline:'none'}} />
                      </div>
                    )}
                  </div>
                ))}
                {conversations.length===0 && <div style={{fontSize:12,color:'#484F58',textAlign:'center',padding:20}}>No hay conversaciones</div>}
              </div>
            </div>
          )}

          {/* Main Panel */}
          <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
            {tab==='chat' && <ChatView user={githubUser} conversations={conversations} setConversations={setConversations} activeConv={activeConv} setActiveConv={setActiveConv} onOpenRepo={handleOpenRepoFromChat} selectedAgent={selectedAgent} setSelectedAgent={setSelectedAgent} />}
            {tab==='repo' && <RepoView user={githubUser} selectedRepoData={selectedRepoData} showRepoFromChat={showRepoFromChat} setShowRepoFromChat={setShowRepoFromChat} />}
          </div>
        </div>
      </div>
    </div>
  );
}
