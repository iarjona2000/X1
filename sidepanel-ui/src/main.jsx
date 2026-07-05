import * as React from 'react';
import { createRoot } from 'react-dom/client';
import * as B from './backend.js';
import App from './App.jsx';

const OctocatSvg = ({ w = 16, h = 16, fill = '#fff' }) => (
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

function GithubLogin({ onUser }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [deviceFlow, setDeviceFlow] = React.useState(null);
  const [manualToken, setManualToken] = React.useState('');
  const [showManual, setShowManual] = React.useState(false);
  const cancelRef = React.useRef(false);
  const extId = typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime.id : '';

  const handleGithubLogin = async function() {
    setLoading(true); setError(null); setDeviceFlow(null);
    cancelRef.current = false;
    try {
      var result = await B.loginGithub();
      if (cancelRef.current) return;
      var token = await B.exchangeGithubCode(result.code);
      if (cancelRef.current) return;
      var userData = await B.fetchGithubUser(token);
      if (cancelRef.current) return;
      if (userData && userData.login) {
        onUser({ login: userData.login, name: userData.name, avatar_url: userData.avatar_url, email: userData.email });
      } else {
        setError('No se pudo obtener el perfil de usuario');
        setLoading(false);
      }
    } catch (err) {
      if (!cancelRef.current) {
        setError(err.message || 'Error al iniciar sesion con GitHub');
        setLoading(false);
      }
    }
  };

  const handleDeviceFlow = async function() {
    setLoading(true); setError(null); setDeviceFlow(null);
    cancelRef.current = false;
    try {
      var flow = await B.startGithubDeviceFlow();
      if (cancelRef.current) return;
      setDeviceFlow(flow);
      setLoading(false);
      window.open(flow.verification_uri, 'github-device');
      var token = await B.pollGithubToken(flow.device_code);
      if (cancelRef.current) return;
      var userData = await B.fetchGithubUser(token);
      if (cancelRef.current) return;
      if (userData && userData.login) {
        onUser({ login: userData.login, name: userData.name, avatar_url: userData.avatar_url, email: userData.email });
      } else {
        setError('No se pudo obtener el perfil');
        setDeviceFlow(null);
        setLoading(false);
      }
    } catch (err) {
      if (!cancelRef.current) {
        setError(err.message || 'Error en flujo de dispositivo');
        setDeviceFlow(null);
        setLoading(false);
      }
    }
  };

  const handleManualToken = async function() {
    if (!manualToken.trim()) return;
    setLoading(true); setError(null);
    try {
      var userData = await B.fetchGithubUser(manualToken.trim());
      if (userData && userData.login) {
        onUser({ login: userData.login, name: userData.name, avatar_url: userData.avatar_url, email: userData.email });
      } else {
        setError('Token invalido');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Token invalido');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async function() {
    setLoading(true); setError(null);
    try {
      var ok = await B.loginGoogle();
      if (ok) {
        var user = B.getUser();
        if (user) onUser(user);
        else setError('No se pudo autenticar con Google');
      } else {
        setError('No se pudo autenticar con Google');
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesion con Google');
    } finally { setLoading(false); }
  };

  const handleGuestMode = function() {
    onUser({ login: 'invitado', name: 'Invitado', avatar_url: null, email: null });
  };

  const cancelDeviceFlow = function() {
    cancelRef.current = true;
    setDeviceFlow(null);
    setError('Cancelado');
  };

  const isDeviceActive = deviceFlow && !!deviceFlow.user_code;
  var callbackUrl = extId ? 'https://' + extId + '.chromiumapp.org/' : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f6f8fa' }}>
      <div style={{ width: '360px', padding: '32px', background: '#ffffff', borderRadius: '12px', border: '1px solid #d0d7de', boxShadow: '0 8px 24px rgba(140,149,159,0.2)', textAlign: 'center' }}>
        <img src="dist/x1-logo.png" alt="System X1" style={{ height: '64px', width: 'auto', marginBottom: '20px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} onError={function(e) { e.currentTarget.style.display='none'; }} />

        {isDeviceActive ? (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', color: '#1f2328' }}>Autoriza en GitHub</h2>
            <p style={{ fontSize: '13px', color: '#59636e', margin: '0 0 16px 0' }}>
              Ingresa este codigo en{' '}
              <a href="#" onClick={function(e) { e.preventDefault(); window.open(deviceFlow.verification_uri, 'github-device'); }}
                style={{ color: '#0969da', textDecoration: 'underline' }}>
                github.com/login/device
              </a>
            </p>
            <div style={{
              fontSize: '28px', fontWeight: '700', fontFamily: "'SF Mono', 'Consolas', monospace",
              letterSpacing: '6px', padding: '16px', background: '#f6f8fa',
              border: '1px solid #d0d7de', borderRadius: '8px',
              marginBottom: '16px', color: '#1f2328',
            }}>
              {deviceFlow.user_code}
            </div>
            <button onClick={function() { navigator.clipboard.writeText(deviceFlow.user_code); }}
              style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #d0d7de', background: '#f6f8fa', fontSize: '12px', fontWeight: '500', cursor: 'pointer', marginBottom: '16px' }}>
              Copiar codigo
            </button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0969da', animation: 'pulse 1s infinite' }} />
              <span style={{ fontSize: '13px', color: '#59636e' }}>Esperando autorizacion...</span>
            </div>
            <button onClick={cancelDeviceFlow}
              style={{ padding: '5px 16px', borderRadius: '6px', border: '1px solid #d0d7de', background: '#fff', fontSize: '12px', fontWeight: '500', cursor: 'pointer', color: '#59636e' }}>
              Cancelar
            </button>
          </div>
        ) : showManual ? (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 4px 0', color: '#1f2328' }}>Token personal</h2>
            <p style={{ fontSize: '12px', color: '#59636e', margin: '0 0 16px 0', lineHeight: '1.5' }}>
              Crea un token en{' '}
              <a href="https://github.com/settings/tokens" target="_blank" style={{ color: '#0969da' }}>github.com/settings/tokens</a>
              {' '}con scope <strong>read:user</strong> y <strong>user:email</strong>:
            </p>
            <input value={manualToken} onChange={function(e) { setManualToken(e.target.value); }}
              placeholder="ghp_..."
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d0d7de', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', marginBottom: '12px', boxSizing: 'border-box' }} />
            <button onClick={handleManualToken} disabled={loading || !manualToken.trim()}
              style={{ width: '100%', padding: '8px 16px', borderRadius: '6px', border: '1px solid rgba(27,31,36,0.15)', background: '#24292f', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginBottom: '8px' }}>
              {loading ? 'Verificando...' : 'Verificar token'}
            </button>
            <button onClick={function() { setShowManual(false); setError(null); }}
              style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: 'transparent', fontSize: '12px', cursor: 'pointer', color: '#59636e' }}>
              Volver
            </button>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 4px 0', color: '#1f2328' }}>System X1</h2>
            <p style={{ fontSize: '13px', color: '#59636e', margin: '0 0 24px 0' }}>Tu asistente de IA profesional</p>
            <button onClick={handleGithubLogin} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px 16px', borderRadius: '6px', border: '1px solid rgba(27,31,36,0.15)', background: '#24292f', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginBottom: '8px', boxShadow: 'inset 0 1px 0 rgba(208,215,222,0.2)' }}>
              <OctocatSvg /> {loading ? 'Abriendo ventana de GitHub...' : 'Ingresar con GitHub'}
            </button>
            <button onClick={handleGoogleLogin} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px 16px', borderRadius: '6px', border: '1px solid #d0d7de', background: '#fff', color: '#1f2328', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginBottom: '8px' }}>
              <GoogleSvg /> {loading ? 'Conectando...' : 'Ingresar con Google'}
            </button>
            <button onClick={function() { setShowManual(true); setError(null); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '8px 16px', borderRadius: '6px', border: '1px solid #d0d7de', background: '#fff', color: '#59636e', fontSize: '13px', fontWeight: '500', cursor: 'pointer', marginBottom: '16px' }}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M10.561 8.073a6.005 6.005 0 013.432 5.142.75.75 0 11-1.498.07 4.5 4.5 0 00-8.99 0 .75.75 0 11-1.498-.07 6.004 6.004 0 013.431-5.142 3.999 3.999 0 115.123 0zM10.5 5a2.5 2.5 0 10-5 0 2.5 2.5 0 005 0z"/></svg>
              Usar token manual
            </button>
            {error && (
              <div style={{ marginTop: '0', marginBottom: '12px', padding: '10px', background: '#fff8f8', border: '1px solid #d1242f', borderRadius: '6px', fontSize: '12px', color: '#d1242f', textAlign: 'left' }}>
                <div>{error}</div>
                {error.indexOf('Tiempo de espera') >= 0 && callbackUrl && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#656d76' }}>
                    <p style={{ margin: '0 0 6px 0' }}>Registra esta URL de callback en tu GitHub App:</p>
                    <code style={{ display: 'block', padding: '6px', background: '#f6f8fa', borderRadius: '4px', fontSize: '10px', wordBreak: 'break-all' }}>{callbackUrl}</code>
                    <button onClick={handleDeviceFlow}
                      style={{ marginTop: '8px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #d0d7de', background: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                      O usar codigo de dispositivo
                    </button>
                  </div>
                )}
                {error.indexOf('Device Flow') >= 0 && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#656d76' }}>
                    Habilita "Device Flow" en tu GitHub App (Settings &gt; Developer settings &gt; OAuth Apps)
                  </div>
                )}
              </div>
            )}
            <div style={{ borderTop: '1px solid #d0d7de', paddingTop: '16px' }}>
              <button onClick={handleGuestMode}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '8px 16px', borderRadius: '6px', border: '1px solid #d0d7de', background: '#f6f8fa', color: '#59636e', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675l.66 6.6a.25.25 0 00.249.225h4.19a.25.25 0 00.249-.225l.66-6.6a.75.75 0 011.492.149l-.66 6.6A1.748 1.748 0 019.595 15h-4.19a1.748 1.748 0 01-1.741-1.575l-.66-6.6a.75.75 0 111.492-.15z"/></svg>
                Entrar como invitado
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Root({ onUser, user }) {
  if (user) return <App githubUser={user} />;
  return <GithubLogin onUser={onUser} />;
}

export function mount(el) {
  function Main() {
    const [user, setUser] = React.useState(B.getUser());
    React.useEffect(function() { var saved = B.getUser(); if (saved) setUser(saved); }, []);
    React.useEffect(function() {
      var handler = function(e) { if (e.data && e.data.type === 'GITHUB_USER_SAVED') setUser(B.getUser()); };
      window.addEventListener('message', handler);
      return function() { window.removeEventListener('message', handler); };
    }, []);
    var onUser = React.useCallback(function(u) { B.saveUser(u); setUser(u); }, []);
    return <Root user={user} onUser={onUser} />;
  }
  var root = createRoot(el);
  root.render(<Main />);
}

if (typeof window !== 'undefined') {
  window.__X1_SIDEPANEL = { mount };
  var rootEl = document.getElementById('root');
  if (rootEl && rootEl.children.length === 0) mount(rootEl);
}
