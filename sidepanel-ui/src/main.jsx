import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './backend.js';
import './panel.css';

const S = {
  page: { height:'100vh', width:'100vw', display:'flex', alignItems:'center', justifyContent:'center', background:'#ffffff', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif' },
  card: { width:340, padding:'32px', background:'#ffffff', borderRadius:'6px', border:'1px solid #d0d7de', textAlign:'center' },
  title: { fontSize:'24px', fontWeight:400, margin:'0 0 8px 0', color:'#1f2328', lineHeight:1.25 },
  subtitle: { fontSize:'14px', color:'#59636e', margin:'0 0 24px 0', lineHeight:1.5 },
  label: { display:'block', fontSize:'14px', fontWeight:400, margin:'14px 0 6px 0', color:'#1f2328', textAlign:'left' },
  input: { width:'100%', padding:'5px 12px', border:'1px solid #d0d7de', borderRadius:'6px', fontSize:'14px', color:'#1f2328', background:'#ffffff', outline:'none', boxSizing:'border-box' },
  btnPrimary: { width:'100%', padding:'9px 16px', borderRadius:'6px', border:'1px solid rgba(27,31,36,0.3)', background:'#1f883d', color:'#ffffff', fontSize:'14px', fontWeight:500, cursor:'pointer', marginTop:'16px', transition:'background 80ms', fontFamily:'inherit' },
  btnGH: { width:'100%', padding:'9px 16px', borderRadius:'6px', border:'1px solid rgba(27,31,36,0.15)', background:'#24292f', color:'#ffffff', fontSize:'14px', fontWeight:500, cursor:'pointer', marginTop:'8px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', transition:'background 80ms', fontFamily:'inherit' },
  btnSecondary: { width:'100%', padding:'9px 16px', borderRadius:'6px', border:'1px solid #d0d7de', background:'#f6f8fa', color:'#24292f', fontSize:'14px', fontWeight:500, cursor:'pointer', marginTop:'8px', transition:'background 80ms', fontFamily:'inherit' },
  error: { background:'#ffebe9', border:'1px solid rgba(255,129,130,0.4)', color:'#82071e', padding:'12px', borderRadius:'6px', fontSize:'13px', marginBottom:'16px', textAlign:'left', lineHeight:1.5 },
  info: { background:'#ddf4ff', border:'1px solid rgba(9,105,218,0.3)', color:'#0550ae', padding:'12px', borderRadius:'6px', fontSize:'13px', marginBottom:'16px', textAlign:'left', lineHeight:1.5 },
  deviceBox: { background:'#f6f8fa', border:'1px solid #d0d7de', borderRadius:'6px', padding:'16px', marginBottom:'16px', textAlign:'left' },
  deviceCode: { fontSize:'24px', fontWeight:600, color:'#1f2328', textAlign:'center', letterSpacing:'2px', margin:'12px 0', padding:'12px', background:'#ffffff', border:'1px solid #d0d7de', borderRadius:'6px' },
  divider: { display:'flex', alignItems:'center', gap:12, margin:'16px 0', color:'#59636e', fontSize:'12px' },
  dividerLine: { flex:1, height:1, background:'#d0d7de' },
  loading: { color:'#59636e', fontSize:'13px' },
  footnote: { fontSize:'12px', color:'#59636e', marginTop:'24px', lineHeight:1.5 },
};

function OctocatIcon({ size = 56, fill = '#1f2328' }) {
  return React.createElement('svg', { viewBox:'0 0 98 96', width: size, height: size, fill: fill },
    React.createElement('path', { d: 'M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z' })
  );
}

function GithubMark({ size = 16, fill = '#ffffff' }) {
  return React.createElement('svg', { viewBox:'0 0 16 16', width: size, height: size, fill: fill },
    React.createElement('path', { d: 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z' })
  );
}

function GithubLogin({ onUser, onGuest }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('none');
  const [deviceCode, setDeviceCode] = useState(null);
  const [userCode, setUserCode] = useState('');
  const [verifyUrl, setVerifyUrl] = useState('https://github.com/login/device');
  const [pat, setPat] = useState('');

  async function handleDeviceFlow() {
    setError(''); setLoading(true);
    try {
      const {
        startGithubDeviceFlow,
        pollGithubToken,
        fetchGithubUser,
        saveGithubUser
      } = await import('./backend.js');
      const flow = await startGithubDeviceFlow();
      if (flow.error) {
        throw new Error(flow.error_description || flow.error || 'Error en Device Flow');
      }
      setDeviceCode(flow.device_code);
      setUserCode(flow.user_code);
      setVerifyUrl(flow.verification_uri || 'https://github.com/login/device');
      setMode('device');
      try { chrome.tabs.create({ url: flow.verification_uri || 'https://github.com/login/device' }); } catch (e) {}
      const token = await pollGithubToken(flow.device_code);
      const user = await fetchGithubUser(token);
      try { saveGithubUser(user, token); } catch (e) {}
      onUser(user);
    } catch (e) {
      setError((e && e.message) || 'Device Flow no disponible. Usa el token personal abajo (crea uno en github.com/settings/tokens).');
      setMode('none');
      setLoading(false);
    }
  }

  async function handlePat() {
    if (!pat.trim()) { setError('Pega un token personal primero.'); return; }
    setError(''); setLoading(true);
    try {
      const { fetchGithubUser, saveGithubUser } = await import('./backend.js');
      const user = await fetchGithubUser(pat.trim());
      try { saveGithubUser(user, pat.trim()); } catch (e) {}
      onUser(user);
    } catch (e) {
      setError('Token invalido o sin permisos. Genera uno nuevo en github.com/settings/tokens');
      setLoading(false);
    }
  }

  return (
    React.createElement('div', { style: S.page },
      React.createElement('div', { style: S.card },
        React.createElement('div', { style: { marginBottom: '20px', display: 'flex', justifyContent: 'center' } },
          React.createElement(OctocatIcon, { size: 56 })
        ),
        React.createElement('div', { style: S.title }, 'Sign in to System X1'),
        React.createElement('div', { style: S.subtitle }, 'Accede para conectar tus repositorios.'),
        error && React.createElement('div', { style: S.error }, error),

        mode === 'device' && userCode && React.createElement('div', { style: S.deviceBox },
          React.createElement('div', { style: { fontSize: '13px', fontWeight: 600, color: '#1f2328', marginBottom: '6px' } }, '1. Abre esta URL en tu navegador'),
          React.createElement('div', { style: { fontSize: '14px', color: '#0969da', wordBreak: 'break-all', marginBottom: '12px' } }, verifyUrl),
          React.createElement('div', { style: { fontSize: '13px', fontWeight: 600, color: '#1f2328', marginBottom: '6px' } }, '2. Ingresa este codigo'),
          React.createElement('div', { style: S.deviceCode }, userCode),
          React.createElement('div', { style: { fontSize: '12px', color: '#59636e', textAlign: 'center' } }, 'Esperando autorizacion...'),
        ),

        mode === 'none' && React.createElement('div', null,
          React.createElement('div', { style: S.label }, 'Personal Access Token (recomendado)'),
          React.createElement('input', { type: 'password', value: pat, onChange: function(e) { setPat(e.target.value); }, placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx', style: S.input }),
          React.createElement('button', { onClick: handlePat, disabled: loading || !pat.trim(), style: { ...S.btnPrimary, opacity: !pat.trim() ? 0.5 : 1 } }, 'Entrar con token'),
          React.createElement('div', { style: { fontSize: '11px', color: '#818b98', marginTop: '6px' } }, 'Crea uno en github.com/settings/tokens (scope read:user user:email)'),
          React.createElement('div', { style: S.divider }, React.createElement('div', { style: S.dividerLine }), React.createElement('span', null, 'o'), React.createElement('div', { style: S.dividerLine })),
          React.createElement('button', { onClick: handleDeviceFlow, disabled: loading, style: S.btnGH }, React.createElement(GithubMark, { size: 16 }), loading ? 'Conectando...' : 'Sign in con Device Flow'),
          React.createElement('div', { style: { fontSize: '11px', color: '#818b98', marginTop: '6px' } }, 'Requiere OAuth App con Device Flow habilitado'),
          React.createElement('button', { onClick: onGuest, style: S.btnSecondary },
            'Continuar sin GitHub'
          ),
          React.createElement('div', { style: S.footnote },
            'System X1 accede en modo lectura (read:user, user:email) cuando es posible. El token personal lo generas en github.com/settings/tokens.'
          )
        )
      )
    )
  );
}

function Root() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(function() {
    async function check() {
      try {
        const B = await import('./backend.js');
        const ghUser = await B.getGithubUser();
        if (ghUser) { setUser(ghUser); }
      } catch (e) { console.error('[X1] getGithubUser:', e); }
      setReady(true);
    }
    check();
  }, []);

  if (!ready) return (
    React.createElement('div', { style: S.page },
      React.createElement('div', { style: { textAlign: 'center' } },
        React.createElement('div', { style: { fontSize: 32, marginBottom: 16, animation: 'breathe 2s infinite', color: '#59636e' } }, 'Cargando...'),
        React.createElement('div', { style: S.loading }, 'Iniciando System X1')
      )
    )
  );

  if (!user) return React.createElement(GithubLogin, { onUser: setUser, onGuest: function() { setUser({ login: 'invitado', name: 'Invitado' }); } });

  return React.createElement(App, { user: user });
}

const root = createRoot(document.getElementById('root'));
root.render(React.createElement(Root));
