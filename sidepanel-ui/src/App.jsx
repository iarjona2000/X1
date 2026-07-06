import * as React from 'react';
import * as B from './backend.js';
import { ChatView } from './ChatView.jsx';
import { RepoView } from './RepoView.jsx';
import { PRAgent } from './PRAgent.jsx';

const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";

const OctocatSvg = ({ w = 16, h = 16, fill = '#656d76' }) => (
  <svg viewBox="0 0 98 96" width={w} height={h} fill={fill}>
    <path d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"/>
  </svg>
);

const GoogleSvg = ({ w = 16, h = 16 }) => (
  <svg viewBox="0 0 24 24" width={w} height={h}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const ChatIcon = ({ active }) => <svg viewBox="0 0 16 16" width="16" height="16" fill={active ? '#ffffff' : '#9198a0'}><path d="M1.5 2.75a.25.25 0 01.25-.25h8.5a.25.25 0 01.25.25v5.5a.25.25 0 01-.25.25h-3.5a.75.75 0 00-.53.22L3.5 11.44V9.25a.75.75 0 00-.75-.75h-1a.25.25 0 01-.25-.25v-5.5zM1.75 1A1.75 1.75 0 000 2.75v5.5C0 9.216.784 10 1.75 10H2v1.543a1.457 1.457 0 002.487 1.03L7.061 10h3.189A1.75 1.75 0 0012 8.25v-5.5A1.75 1.75 0 0010.25 1h-8.5z"/></svg>;

const RepoIcon = ({ active }) => <svg viewBox="0 0 16 16" width="16" height="16" fill={active ? '#ffffff' : '#9198a0'}><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1h-8a1 1 0 00-1 1v6.708A2.486 2.486 0 014.5 9h8V1.5z"/></svg>;

const PRIcon = ({ active }) => <svg viewBox="0 0 16 16" width="16" height="16" fill={active ? '#ffffff' : '#9198a0'}><path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"/></svg>;

let convSeq = 0;
const convUid = () => ++convSeq;

export default function App({ githubUser }) {
  const [tab, setTab] = React.useState('chat');
  const [conversations, setConversations] = React.useState([]);
  const [activeConvId, setActiveConvId] = React.useState(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [googleStatus, setGoogleStatus] = React.useState(null);
  const [googleUser, setGoogleUser] = React.useState(null);
  const [githubStatus, setGithubStatus] = React.useState(null);
  const settingsRef = React.useRef(null);

  React.useEffect(() => {
    const saved = B.loadConversations();
    if (saved?.length) { setConversations(saved); setActiveConvId(saved[0].id); }
    if (B.hasEngine()) { B.checkGoogleAuth().then(function(r) { setGoogleStatus(r && r.logged); if (r && r.user) setGoogleUser(r.user); }); B.checkGithubAuth().then(setGithubStatus); }
  }, []);

  React.useEffect(() => {
    if (!settingsOpen) return;
    const h = e => { if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [settingsOpen]);

  const saveConvs = list => { setConversations(list); B.saveConversations(list); };
  const createConversation = () => {
    const c = { id: convUid(), title: 'Nueva conversacion', messages: [], tags: [], createdAt: Date.now(), updatedAt: Date.now(), agent: 'research' };
    saveConvs([c, ...conversations]); setActiveConvId(c.id); setTab('chat');
    return c;
  };
  const ensureConversation = () => {
    const current = conversations.find(c => c.id === activeConvId);
    if (current) return current;
    return createConversation();
  };
  const updateConversation = (id, patch) => {
    setConversations(prev => { const list = prev.map(c => { if (c.id !== id) return c; var newMsgs = typeof patch.messages === 'function' ? patch.messages(c.messages || []) : patch.messages; return { ...c, ...patch, messages: newMsgs, updatedAt: Date.now() }; }); B.saveConversations(list); return list; });
  };
  const deleteConversation = id => {
    const list = conversations.filter(c => c.id !== id); saveConvs(list);
    if (activeConvId === id) setActiveConvId(list[0]?.id || null);
  };

  const activeConv = conversations.find(c => c.id === activeConvId);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', minWidth: '420px', fontFamily: F, overflow: 'hidden', background: '#ffffff' }}>
      {/* Sidebar */}
      <div style={{
        width: '48px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '8px 0', gap: '2px', borderRight: '1px solid #d0d7de', background: '#f6f8fa',
      }}>
        <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
          <img src="../dist/x1-logo.png" alt="X1" style={{ height: '24px', width: 'auto', objectFit: 'contain' }} onError={e => e.currentTarget.style.display='none'} />
        </div>
        <button onClick={() => setTab('chat')} title="Chat" style={{
          width: '32px', height: '32px', borderRadius: '6px', border: 'none',
          background: tab === 'chat' ? '#0969da' : 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 80ms',
        }}><ChatIcon active={tab === 'chat'} /></button>
        <button onClick={() => setTab('repo')} title="Repositorio" style={{
          width: '32px', height: '32px', borderRadius: '6px', border: 'none',
          background: tab === 'repo' ? '#0969da' : 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 80ms',
        }}><RepoIcon active={tab === 'repo'} /></button>
        <button onClick={() => setTab('agent')} title="Automatizacion" style={{
          width: '32px', height: '32px', borderRadius: '6px', border: 'none',
          background: tab === 'agent' ? '#0969da' : 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 80ms',
        }}><PRIcon active={tab === 'agent'} /></button>
        <div style={{ marginTop: 'auto' }} />
        {githubUser?.avatar_url ? (
          <img src={githubUser.avatar_url} alt={githubUser.login}
            style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #d0d7de', cursor: 'pointer', marginBottom: '4px', transition: 'border-color 80ms' }}
            onClick={() => setSettingsOpen(v => !v)} title={githubUser.login}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#0969da'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#d0d7de'} />
        ) : (
          <button onClick={() => setSettingsOpen(v => !v)} title="Cuenta" style={{
            width: '32px', height: '32px', borderRadius: '6px', border: 'none', marginBottom: '4px',
            background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 16 16" width="16" height="16" fill="#9198a0"><path d="M10.561 8.073a6.005 6.005 0 013.432 5.142.75.75 0 11-1.498.07 4.5 4.5 0 00-8.99 0 .75.75 0 11-1.498-.07 6.004 6.004 0 013.431-5.142 3.999 3.999 0 115.123 0zM10.5 5a2.5 2.5 0 10-5 0 2.5 2.5 0 005 0z"/></svg>
          </button>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {tab === 'chat' ? (
          <ChatView conversations={conversations} activeConv={activeConv} onSelectConv={setActiveConvId} onCreateConv={createConversation} onEnsureConv={ensureConversation} onUpdateConv={updateConversation} onDeleteConv={deleteConversation} />
        ) : tab === 'agent' ? (
          <PRAgent githubUser={githubUser} onGoToRepo={() => setTab('repo')} />
        ) : (
          <RepoView conversations={conversations} githubUser={githubUser} />
        )}
      </div>

      {/* Settings */}
      {settingsOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setSettingsOpen(false)} />
          <div ref={settingsRef} style={{
            position: 'fixed', bottom: '48px', right: '12px', zIndex: 100,
            width: '300px', background: '#ffffff', border: '1px solid #d0d7de', borderRadius: '6px',
            boxShadow: '0 8px 24px rgba(140,149,159,0.2)', overflow: 'hidden',
          }}>
            {githubUser && (
              <div style={{ padding: '16px', borderBottom: '1px solid #d0d7de', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {githubUser.avatar_url ? (
                  <img src={githubUser.avatar_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #d0d7de' }} />
                ) : (
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f6f8fa', border: '1px solid #d0d7de', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 16 16" width="16" height="16" fill="#9198a0"><path d="M10.561 8.073a6.005 6.005 0 013.432 5.142.75.75 0 11-1.498.07 4.5 4.5 0 00-8.99 0 .75.75 0 11-1.498-.07 6.004 6.004 0 013.431-5.142 3.999 3.999 0 115.123 0zM10.5 5a2.5 2.5 0 10-5 0 2.5 2.5 0 005 0z"/></svg>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2328' }}>{githubUser.name || githubUser.login}</div>
                  <div style={{ fontSize: '12px', color: '#59636e' }}>@{githubUser.login}</div>
                </div>
              </div>
            )}
            <div style={{ padding: '8px' }}>
              <div style={{ padding: '8px 12px', borderRadius: '6px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <GoogleSvg /> <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: '#1f2328' }}>Google</span>
                  <span style={{ fontSize: '12px', color: googleStatus ? '#1a7f37' : '#59636e', fontWeight: '500' }}>{googleStatus ? 'Conectado' : 'Desconectado'}</span>
                </div>
                {googleUser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '6px 8px', background: '#f6f8fa', borderRadius: '6px' }}>
                    {googleUser.picture ? (
                      <img src={googleUser.picture} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%' }} onError={e => e.currentTarget.style.display='none'} />
                    ) : (
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#eaeef2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#59636e', fontWeight: '600' }}>{googleUser.email?.charAt(0).toUpperCase()}</div>
                    )}
                    <div style={{ flex: 1, fontSize: '12px', color: '#1f2328', overflow: 'hidden', textOverflow: 'ellipsis' }}>{googleUser.name || googleUser.email}</div>
                  </div>
                )}
                <button onClick={googleStatus ? async () => { await B.logoutGoogle(); setGoogleStatus(false); setGoogleUser(null); } : async () => { const r = await B.loginGoogle(); if (r) { setGoogleStatus(true); setGoogleUser({email:r.email, name:r.name, picture:r.picture}); } }} style={{ width: '100%', padding: '5px 12px', borderRadius: '6px', border: '1px solid #d0d7de', background: '#f6f8fa', fontSize: '12px', fontWeight: '500', cursor: 'pointer', color: '#24292f' }}>
                  {googleStatus ? 'Desconectar' : 'Conectar'}
                </button>
              </div>
              <div style={{ padding: '8px 12px', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <OctocatSvg /> <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: '#1f2328' }}>GitHub</span>
                  <span style={{ fontSize: '12px', color: githubStatus ? '#1a7f37' : '#59636e', fontWeight: '500' }}>{githubStatus ? 'Conectado' : 'Desconectado'}</span>
                </div>
                <button onClick={githubStatus ? async () => { await B.logoutGithub(); setGithubStatus(false); } : function() {
                  B.startGithubDeviceFlow().then(function(flow) {
                    window.open(flow.verification_uri, 'github-device');
                    return B.pollGithubToken(flow.device_code);
                  }).then(function(token) {
                    return B.fetchGithubUser(token);
                  }).then(function(user) {
                    if (user && user.login) setGithubStatus(true);
                  }).catch(function(e) {
                    console.error('[X1] GitHub connect error:', e);
                  });
                }}
                  style={{ width: '100%', padding: '5px 12px', borderRadius: '6px', border: '1px solid #d0d7de', background: '#f6f8fa', fontSize: '12px', fontWeight: '500', cursor: 'pointer', color: '#24292f' }}>
                  {githubStatus ? 'Desconectar' : 'Conectar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
