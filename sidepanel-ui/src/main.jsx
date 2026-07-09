import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './backend.js';

var page = {
  height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--color-v0-background-200)',
  fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
};
var card = {
  width: 360, padding: '36px',
  background: 'var(--color-v0-background-100)',
  borderRadius: 12,
  border: '1px solid var(--color-v0-gray-200)',
  boxShadow: '0 4px 8px -2px rgba(0,0,0,.06), 0 2px 4px -2px rgba(0,0,0,.04), 0 0 0 1px rgba(0,0,0,.04)',
  textAlign: 'center',
};
var title = { fontSize: 20, fontWeight: 600, margin: '0 0 8px 0', color: 'var(--color-v0-gray-1000)', lineHeight: 1.4, letterSpacing: '-0.021em' };
var subtitle = { fontSize: 14, color: 'var(--color-v0-gray-500)', margin: '0 0 24px 0', lineHeight: 1.5 };
var label = { display: 'block', fontSize: 14, fontWeight: 500, margin: '14px 0 6px 0', color: 'var(--color-v0-gray-1000)', textAlign: 'left' };
var input = {
  width: '100%', padding: '6px 12px',
  border: '1px solid var(--color-v0-gray-200)',
  borderRadius: 6, fontSize: 14, color: 'var(--color-v0-gray-1000)', background: 'var(--color-v0-background-100)',
  outline: 'none', boxSizing: 'border-box',
};
var btnPrimary = {
  width: '100%', padding: '8px 16px', borderRadius: 6, border: 'none',
  background: 'var(--color-v0-gray-1000)', color: 'var(--color-v0-primary-foreground)', fontSize: 14, fontWeight: 500,
  cursor: 'pointer', marginTop: 16, transition: 'background 120ms',
  fontFamily: 'inherit', letterSpacing: '-0.011em',
};
var btnGH = {
  width: '100%', padding: '8px 16px', borderRadius: 6, border: 'none',
  background: 'var(--color-v0-gray-1000)', color: 'var(--color-v0-primary-foreground)', fontSize: 14, fontWeight: 500,
  cursor: 'pointer', marginTop: 8, display: 'flex', alignItems: 'center',
  justifyContent: 'center', gap: 8, transition: 'background 120ms',
  fontFamily: 'inherit', letterSpacing: '-0.011em',
};
var btnSecondary = {
  width: '100%', padding: '8px 16px', borderRadius: 6,
  border: '1px solid var(--color-v0-gray-200)',
  background: 'transparent', color: 'var(--color-v0-gray-1000)', fontSize: 14, fontWeight: 500,
  cursor: 'pointer', marginTop: 8, transition: 'background 120ms',
  fontFamily: 'inherit', letterSpacing: '-0.011em',
};
var error = {
  background: 'var(--color-v0-gray-100)', border: '1px solid var(--color-v0-gray-200)',
  color: 'var(--color-destructive)', padding: 12, borderRadius: 6,
  fontSize: 13, marginBottom: 16, textAlign: 'left', lineHeight: 1.5,
};
var divider = { display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0', color: 'var(--color-v0-gray-400)', fontSize: 12 };
var dividerLine = { flex: 1, height: 1, background: 'var(--color-v0-gray-200)' };
var loading = { color: 'var(--color-v0-gray-500)', fontSize: 13 };
var footnote = { fontSize: 12, color: 'var(--color-v0-gray-400)', marginTop: 24, lineHeight: 1.5 };

function OctocatIcon({ size = 48 }) {
  return React.createElement('svg', { viewBox:'0 0 98 96', width: size, height: size, fill: '#171717' },
    React.createElement('path', { d: 'M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z' })
  );
}

function GithubMark({ size = 16 }) {
  return React.createElement('svg', { viewBox:'0 0 16 16', width: size, height: size, fill: '#ffffff' },
    React.createElement('path', { d: 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z' })
  );
}

function GithubLogin({ onUser, onGuest }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPat, setShowPat] = useState(false);
  const [pat, setPat] = useState('');

  async function handleOAuth() {
    setError(''); setLoading(true);
    try {
      const { loginGithubOAuth } = await import('./backend.js');
      const user = await loginGithubOAuth();
      onUser(user);
    } catch (e) {
      setError((e && e.message) || 'No se pudo conectar con GitHub.');
      setLoading(false);
    }
  }

  async function handlePat() {
    if (!pat.trim()) { setError('Pega un token personal primero.'); return; }
    setError(''); setLoading(true);
    try {
      const { fetchGithubUser } = await import('./backend.js');
      const user = await fetchGithubUser(pat.trim());
      onUser(user);
    } catch (e) {
      setError('Token invalido o sin permisos. Genera uno nuevo en github.com/settings/tokens');
      setLoading(false);
    }
  }

  return (
    React.createElement('div', { style: page },
      React.createElement('div', { style: card },
        React.createElement('div', { style: { marginBottom: 24, display: 'flex', justifyContent: 'center' } },
          React.createElement(OctocatIcon, { size: 48 })
        ),
        React.createElement('div', { style: title }, 'Sign in to Vektor'),
        React.createElement('div', { style: subtitle }, 'Accede para conectar tus repositorios.'),
        error && React.createElement('div', { style: error }, error),

        React.createElement('button', { onClick: handleOAuth, disabled: loading, style: { ...btnGH, opacity: loading ? 0.6 : 1 } },
          React.createElement(GithubMark, { size: 16 }), loading ? 'Conectando...' : 'Continuar con GitHub'
        ),

        React.createElement('div', { style: divider }, React.createElement('div', { style: dividerLine }), React.createElement('span', null, 'o'), React.createElement('div', { style: dividerLine })),

        !showPat
          ? React.createElement('button', { onClick: function () { setShowPat(true); }, style: btnSecondary }, 'Usar un token personal')
          : React.createElement('div', null,
              React.createElement('div', { style: label }, 'Personal Access Token'),
              React.createElement('input', { type: 'password', value: pat, onChange: function(e) { setPat(e.target.value); }, placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx', style: input }),
              React.createElement('button', { onClick: handlePat, disabled: loading || !pat.trim(), style: { ...btnPrimary, opacity: !pat.trim() ? 0.5 : 1 } }, 'Entrar con token'),
              React.createElement('div', { style: { fontSize: 11, color: 'var(--color-v0-gray-400)', marginTop: 6 } }, 'Crea uno en github.com/settings/tokens (scope read:user user:email)')
            ),

        React.createElement('button', { onClick: onGuest, style: { ...btnSecondary, marginTop: 8 } }, 'Continuar sin GitHub'),
        React.createElement('div', { style: footnote },
          'Vektor accede en modo lectura (read:user, user:email) cuando es posible.'
        )
      )
    )
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error: error };
  }
  componentDidCatch(error, info) {
    console.error('[X1] Render error atrapado por ErrorBoundary:', error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return React.createElement('div', { style: page },
      React.createElement('div', { style: { ...card, textAlign: 'center' } },
        React.createElement('div', { style: { fontSize: 15, fontWeight: 600, color: 'var(--color-v0-gray-1000)', marginBottom: 8 } }, 'Algo se rompio en Vektor'),
        React.createElement('div', { style: { fontSize: 12, color: 'var(--color-v0-gray-500)', marginBottom: 16, lineHeight: 1.5 } },
          String((this.state.error && this.state.error.message) || this.state.error)),
        React.createElement('button', {
          onClick: function () {
            try {
              Object.keys(localStorage).forEach(function (k) {
                if (k.indexOf('x1_') === 0) localStorage.removeItem(k);
              });
            } catch (e) {}
            window.location.reload();
          },
          style: btnPrimary,
        }, 'Limpiar estado de Vektor y reintentar')
      )
    );
  }
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
    React.createElement('div', { style: page },
      React.createElement('div', { style: { textAlign: 'center' } },
        React.createElement('div', { style: { fontSize: 32, marginBottom: 16, animation: 'breathe 2s infinite', color: 'var(--color-v0-gray-400)' } }, 'Cargando...'),
        React.createElement('div', { style: loading }, 'Iniciando Vektor')
      )
    )
  );

  if (!user) return React.createElement(GithubLogin, { onUser: setUser, onGuest: function() { setUser({ login: 'invitado', name: 'Invitado' }); } });

  return React.createElement(App, { githubUser: user });
}

const root = createRoot(document.getElementById('root'));
root.render(React.createElement(ErrorBoundary, null, React.createElement(Root)));
