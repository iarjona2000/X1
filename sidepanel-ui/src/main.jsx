import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './backend.js';
import './panel.css';

const S = {
  page: { height:'100vh', width:'100vw', display:'flex', alignItems:'center', justifyContent:'center', background:'#101411', fontFamily:'"Mona Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif' },
  card: { width:380, padding:'48px 40px', background:'#161B22', borderRadius:12, border:'1px solid #30363D', textAlign:'center' },
  logo: { fontSize:48, marginBottom:20, lineHeight:1, filter:'drop-shadow(0 0 20px rgba(15,191,62,0.3))' },
  title: { fontSize:28, fontWeight:600, color:'#E6EDF3', marginBottom:8, letterSpacing:'-0.02em' },
  subtitle: { fontSize:14, color:'#8B949E', marginBottom:32, lineHeight:1.5 },
  btnPrimary: { width:'100%', padding:'12px 16px', borderRadius:6, border:'1px solid rgba(15,191,62,0.4)', background:'#0FBF3E', color:'#101411', fontSize:14, fontWeight:600, cursor:'pointer', marginBottom:12, transition:'all 0.15s', fontFamily:'inherit', letterSpacing:'-0.01em' },
  btnSecondary: { width:'100%', padding:'12px 16px', borderRadius:6, border:'1px solid #30363D', background:'transparent', color:'#8B949E', fontSize:14, fontWeight:500, cursor:'pointer', transition:'all 0.15s', fontFamily:'inherit' },
  error: { background:'rgba(248,81,73,0.1)', color:'#F85149', padding:12, borderRadius:6, fontSize:13, marginBottom:16, border:'1px solid rgba(248,81,73,0.2)', lineHeight:1.4 },
  loading: { color:'#8B949E', fontSize:13 },
  divider: { display:'flex', alignItems:'center', gap:12, margin:'16px 0', color:'#484F58', fontSize:12 },
  dividerLine: { flex:1, height:1, background:'#21262D' },
};

function GithubLogin({ onUser, onGuest }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hovered, setHovered] = useState(null);

  async function handleGithub() {
    setLoading(true);
    setError('');
    try {
      const { startGithubDeviceFlow, pollGithubToken, fetchGithubUser } = await import('./backend.js');
      const flow = await startGithubDeviceFlow();
      window.open(flow.verification_uri, '_blank');
      const token = await pollGithubToken(flow.device_code);
      const user = await fetchGithubUser(token);
      onUser(user);
    } catch (e) {
      setError(e.message || 'Error al conectar con GitHub');
      setLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>&#128187;</div>
        <div style={S.title}>System X1</div>
        <div style={S.subtitle}>Multiples agentes. Un solo sistema.</div>
        {error && <div style={S.error}>{error}</div>}
        <button
          onClick={handleGithub}
          disabled={loading}
          onMouseEnter={() => setHovered('gh')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...S.btnPrimary,
            background:hovered === 'gh' ? '#0FBF3E' : loading ? '#08872B' : '#0FBF3E',
            opacity: loading ? 0.8 : 1,
            cursor: loading ? 'wait' : 'pointer',
            boxShadow: hovered === 'gh' ? '0 0 20px rgba(15,191,62,0.3)' : 'none',
          }}
        >
          {loading ? 'Conectando...' : 'Entrar con GitHub'}
        </button>
        <div style={S.divider}>
          <div style={S.dividerLine} />
          <span>o</span>
          <div style={S.dividerLine} />
        </div>
        <button
          onClick={onGuest}
          onMouseEnter={() => setHovered('guest')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...S.btnSecondary,
            borderColor: hovered === 'guest' ? '#484F58' : '#30363D',
            color: hovered === 'guest' ? '#E6EDF3' : '#8B949E',
          }}
        >
          Continuar sin GitHub
        </button>
      </div>
    </div>
  );
}

function Root() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const { getGithubUser } = await import('./backend.js');
        const ghUser = await getGithubUser();
        if (ghUser) { setUser(ghUser); setReady(true); return; }
      } catch (e) {}
      setReady(true);
    }
    check();
  }, []);

  if (!ready) return (
    <div style={S.page}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16, animation:'breathe 2s infinite' }}>&#128187;</div>
        <div style={S.loading}>Cargando...</div>
      </div>
    </div>
  );

  if (!user) return <GithubLogin onUser={setUser} onGuest={() => setUser({ login: 'invitado', name: 'Invitado' })} />;

  return <App user={user} />;
}

const root = createRoot(document.getElementById('root'));
root.render(<Root />);
