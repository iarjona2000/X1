import * as React from 'react';
import * as B from './backend.js';
import { fetchRepoMeta, fetchRepoTree, analyzeRepo, languageStats, loadRepoAnalysis } from './github-agent.js';

const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";
const H3 = { fontSize: '14px', fontWeight: '600', color: '#1f2328', margin: '0 0 8px', padding: '0 0 8px', borderBottom: '1px solid #d0d7de' };

function fmtBytes(n) {
  if (!n) return '0 B';
  if (n > 1048576) return (n / 1048576).toFixed(1) + ' MB';
  if (n > 1024) return (n / 1024).toFixed(1) + ' KB';
  return n + ' B';
}

export function RepoAnalysis({ githubUser }) {
  const [repos, setRepos] = React.useState([]);
  const [loadingRepos, setLoadingRepos] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [selected, setSelected] = React.useState(null);
  const [meta, setMeta] = React.useState(null);
  const [files, setFiles] = React.useState([]);
  const [loadingRepo, setLoadingRepo] = React.useState(false);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [step, setStep] = React.useState('');
  const [analysis, setAnalysis] = React.useState(loadRepoAnalysis());
  const [filter, setFilter] = React.useState('');
  const [connectError, setConnectError] = React.useState(null);
  const [showManualToken, setShowManualToken] = React.useState(false);
  const [manualToken, setManualToken] = React.useState('');
  const [verifying, setVerifying] = React.useState(false);

  const isGh = githubUser && githubUser.login && githubUser.login !== 'invitado';

  React.useEffect(function () {
    if (!isGh) return;
    setLoadingRepos(true);
    B.getGithubToken().then(function (token) {
      if (!token) { setLoadingRepos(false); return; }
      B.fetchGithubRepos(token).then(function (list) { setRepos(list || []); setLoadingRepos(false); });
    });
  }, [githubUser]);

  function connectGithub() {
    setConnecting(true);
    B.startGithubDeviceFlow().then(function (flow) {
      window.open(flow.verification_uri, 'github-device');
      return B.pollGithubToken(flow.device_code);
    }).then(function (token) {
      return B.fetchGithubUser(token);
    }).then(function (user) {
      setConnecting(false);
      if (user && user.login) {
        B.saveUser({ login: user.login, name: user.name, avatar_url: user.avatar_url, email: user.email });
        try { window.postMessage({ type: 'GITHUB_USER_SAVED' }, '*'); } catch (e) {}
      }
    }).catch(function (err) {
      setConnectError('Device Flow no disponible (' + (err?.message || 'error') + '). Usa token personal.');
      setShowManualToken(true);
      setConnecting(false);
    });
  }

  function handleTokenSubmit() {
    if (!manualToken.trim()) return;
    setVerifying(true);
    B.validateGithubToken(manualToken.trim()).then(function (user) {
      setVerifying(false);
      if (user && user.login) {
        B.saveUser({ login: user.login, name: user.name, avatar_url: user.avatar_url, email: user.email });
        setShowManualToken(false);
        setManualToken('');
        setConnectError(null);
        try { window.postMessage({ type: 'GITHUB_USER_SAVED' }, '*'); } catch (e) {}
      }
    }).catch(function () {
      setConnectError('Token inválido. Revisa en github.com/settings/tokens');
      setVerifying(false);
    });
  }

  function pick(repo) {
    var parts = (repo.name || '').split('/');
    var owner = parts[0], name = parts[1];
    setSelected({ owner: owner, name: name, url: repo.url });
    setMeta(null); setFiles([]); setLoadingRepo(true);
    B.getGithubToken().then(function (token) {
      return fetchRepoMeta(token, owner, name).then(function (m) {
        setMeta(m);
        var branch = (m && m.default_branch) || 'main';
        return fetchRepoTree(token, owner, name, branch).then(function (tree) {
          setFiles(tree); setLoadingRepo(false);
        });
      });
    }).catch(function () { setLoadingRepo(false); });
  }

  function runAnalysis() {
    if (!selected) return;
    setAnalyzing(true); setStep('Preparando');
    B.getGithubToken().then(function (token) {
      return analyzeRepo(token, selected.owner, selected.name, meta, files, function (s) { setStep(s); });
    }).then(function (a) {
      setAnalysis(a); setAnalyzing(false); setStep('');
    }).catch(function () { setAnalyzing(false); setStep(''); });
  }

  var langs = files.length ? languageStats(files) : {};
  var langList = Object.keys(langs).sort(function (a, b) { return langs[b] - langs[a]; }).slice(0, 6);
  var visibleRepos = filter
    ? repos.filter(function (r) { return (r.name || '').toLowerCase().indexOf(filter.toLowerCase()) !== -1; })
    : repos;

  // ── Sin conexion ──
  if (!isGh) {
    if (showManualToken) {
      return React.createElement('div', { style: { padding: '32px 16px', textAlign: 'center', fontFamily: F } },
        React.createElement('div', { style: { fontSize: '15px', fontWeight: '600', color: '#1f2328', marginBottom: '12px' } }, 'Conectar con token personal'),
        connectError && React.createElement('div', { style: { padding: '12px', background: '#ffebe6', border: '1px solid #ff7f50', borderRadius: '6px', color: '#e85c47', fontSize: '12px', marginBottom: '12px', lineHeight: '1.6' } }, connectError),
        React.createElement('input', {
          type: 'password', placeholder: 'github_pat_xxxxx',
          value: manualToken, onChange: function (e) { setManualToken(e.target.value); }, disabled: verifying,
          style: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d0d7de', background: '#f6f8fa', fontSize: '13px', fontFamily: F, marginBottom: '12px', boxSizing: 'border-box' },
        }),
        React.createElement('div', { style: { fontSize: '11px', color: '#59636e', marginBottom: '12px', lineHeight: '1.5' } }, 'Genera en github.com/settings/tokens con permisos: read:user, user:email'),
        React.createElement('button', {
          onClick: handleTokenSubmit, disabled: verifying || !manualToken.trim(),
          style: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '6px', border: '1px solid rgba(27,31,36,0.15)', background: '#24292f', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: verifying || !manualToken.trim() ? 'default' : 'pointer', fontFamily: F, opacity: verifying || !manualToken.trim() ? 0.6 : 1 },
        }, verifying ? 'Validando…' : 'Conectar')
      );
    }
    return React.createElement('div', { style: { padding: '32px 16px', textAlign: 'center', fontFamily: F } },
      React.createElement('div', { style: { fontSize: '15px', fontWeight: '600', color: '#1f2328', marginBottom: '6px' } }, 'Analiza el estado de tus repositorios'),
      React.createElement('div', { style: { fontSize: '13px', color: '#59636e', marginBottom: '20px', lineHeight: '1.6' } }, 'Conecta tu cuenta de GitHub para elegir un repositorio y obtener un analisis exhaustivo.'),
      React.createElement('button', {
        onClick: connectGithub, disabled: connecting,
        style: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '6px', border: '1px solid rgba(27,31,36,0.15)', background: '#24292f', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: connecting ? 'default' : 'pointer', fontFamily: F },
      }, connecting ? 'Conectando…' : 'Conectar GitHub')
    );
  }

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto', fontFamily: F, padding: '16px' } },

    // Selector de repositorio
    React.createElement('h3', { style: H3 }, selected ? 'Repositorio seleccionado' : 'Elige un repositorio'),

    selected
      ? React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' } },
          React.createElement('div', { style: { flex: 1 } },
            React.createElement('div', { style: { fontSize: '15px', fontWeight: '600', color: '#0969da' } }, selected.owner + '/' + selected.name),
            meta && React.createElement('div', { style: { fontSize: '12px', color: '#59636e', marginTop: '2px' } }, meta.description || 'Sin descripcion')
          ),
          React.createElement('button', {
            onClick: function () { setSelected(null); setMeta(null); setFiles([]); },
            style: { padding: '5px 12px', borderRadius: '6px', border: '1px solid #d0d7de', background: '#f6f8fa', fontSize: '12px', fontWeight: '500', cursor: 'pointer', color: '#24292f', fontFamily: F },
          }, 'Cambiar')
        )
      : React.createElement('div', null,
          React.createElement('input', {
            value: filter, onChange: function (e) { setFilter(e.target.value); },
            placeholder: 'Filtrar repositorios…',
            style: { width: '100%', boxSizing: 'border-box', padding: '6px 12px', borderRadius: '6px', border: '1px solid #d0d7de', fontSize: '13px', marginBottom: '12px', fontFamily: F, outline: 'none', color: '#1f2328' },
          }),
          loadingRepos
            ? React.createElement('div', { style: { padding: '24px 0', textAlign: 'center', color: '#59636e', fontSize: '13px' } }, 'Cargando repositorios…')
            : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                visibleRepos.map(function (r) {
                  return React.createElement('div', {
                    key: r.name,
                    onClick: function () { pick(r); },
                    style: { padding: '12px 14px', border: '1px solid #d0d7de', borderRadius: '6px', background: '#fff', cursor: 'pointer', transition: 'border-color 80ms' },
                    onMouseEnter: function (e) { e.currentTarget.style.borderColor = '#0969da'; },
                    onMouseLeave: function (e) { e.currentTarget.style.borderColor = '#d0d7de'; },
                  },
                    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                      React.createElement('span', { style: { fontSize: '14px', fontWeight: '600', color: '#0969da', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.name),
                      r.private && React.createElement('span', { style: { fontSize: '10px', padding: '1px 8px', borderRadius: '999px', border: '1px solid #d0d7de', color: '#59636e' } }, 'Privado'),
                      r.language && React.createElement('span', { style: { fontSize: '12px', color: '#59636e' } }, r.language)
                    ),
                    r.description && React.createElement('div', { style: { fontSize: '12px', color: '#59636e', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '1.5' } }, r.description)
                  );
                }),
                visibleRepos.length === 0 && React.createElement('div', { style: { padding: '24px 0', textAlign: 'center', color: '#818b98', fontSize: '13px' } }, 'No se encontraron repositorios.')
              )
        ),

    // Estado del repositorio + analisis
    selected && React.createElement('div', null,

      loadingRepo
        ? React.createElement('div', { style: { padding: '24px 0', textAlign: 'center', color: '#59636e', fontSize: '13px' } }, 'Leyendo el repositorio…')
        : React.createElement(React.Fragment, null,

            // Estadisticas
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' } },
              [['Ficheros', String(files.length)], ['Tamano', fmtBytes(files.reduce(function (a, f) { return a + (f.size || 0); }, 0))], ['Estrellas', String((meta && meta.stargazers_count) || 0)]].map(function (s) {
                return React.createElement('div', { key: s[0], style: { padding: '10px 12px', border: '1px solid #d0d7de', borderRadius: '6px', background: '#f6f8fa', textAlign: 'center' } },
                  React.createElement('div', { style: { fontSize: '16px', fontWeight: '700', color: '#1f2328' } }, s[1]),
                  React.createElement('div', { style: { fontSize: '11px', color: '#59636e', marginTop: '2px' } }, s[0])
                );
              })
            ),

            // Lenguajes
            langList.length > 0 && React.createElement('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' } },
              langList.map(function (l) {
                return React.createElement('span', { key: l, style: { fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: '#ddf4ff', color: '#0969da', fontWeight: '500' } }, l + ' · ' + langs[l]);
              })
            ),

            // Boton de analisis
            React.createElement('button', {
              onClick: runAnalysis, disabled: analyzing,
              style: { width: '100%', padding: '8px 16px', borderRadius: '6px', border: '1px solid rgba(27,31,36,0.15)', background: analyzing ? '#f6f8fa' : '#1f883d', color: analyzing ? '#818b98' : '#fff', fontSize: '14px', fontWeight: '600', cursor: analyzing ? 'default' : 'pointer', marginBottom: '16px', fontFamily: F },
            }, analyzing ? ('Analizando… ' + step) : 'Analizar a fondo'),

            // Arbol de ficheros
            React.createElement('h3', { style: H3 }, 'Ficheros (' + files.length + ')'),
            React.createElement('div', { style: { maxHeight: '180px', overflow: 'auto', border: '1px solid #d0d7de', borderRadius: '6px', background: '#fff', marginBottom: '16px' } },
              files.slice(0, 300).map(function (f, i) {
                return React.createElement('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', padding: '5px 12px', borderBottom: i < files.length - 1 ? '1px solid #f0f2f4' : 'none', fontSize: '12px', fontFamily: "'SF Mono', Consolas, monospace" } },
                  React.createElement('span', { style: { color: '#1f2328', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, f.path),
                  React.createElement('span', { style: { color: '#818b98', flexShrink: 0, marginLeft: '8px' } }, fmtBytes(f.size))
                );
              })
            ),

            // Informe
            analysis && analysis.repo === (selected.owner + '/' + selected.name) && React.createElement('div', null,
              React.createElement('h3', { style: H3 }, 'Analisis a fondo'),
              React.createElement('div', { style: { fontSize: '13px', color: '#1f2328', lineHeight: '1.7', whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '14px 16px', border: '1px solid #d0d7de', borderRadius: '6px', background: '#f6f8fa' } }, analysis.report),
              React.createElement('div', { style: { fontSize: '11px', color: '#818b98', marginTop: '8px' } }, 'Este analisis queda disponible para la seccion de Automatizacion.')
            )
          )
    )
  );
}
