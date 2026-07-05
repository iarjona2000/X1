import * as React from 'react';
import * as B from './backend.js';

const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";

const OctocatSvg = ({ w = 16, h = 16, fill = '#656d76' }) => (
  <svg viewBox="0 0 98 96" width={w} height={h} fill={fill}>
    <path d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"/>
  </svg>
);

const StarIcon = ({ w = 12, h = 12, ...p }) => <svg viewBox="0 0 16 16" width={w} height={h} fill="currentColor" {...p}><path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/></svg>;

const SearchIcon = ({ w = 16, h = 16, ...p }) => <svg viewBox="0 0 16 16" width={w} height={h} fill="currentColor" {...p}><path d="M10.68 11.74a6 6 0 01-7.922-8.982 6 6 0 018.982 7.922l3.04 3.04a.749.749 0 01-.326 1.275.749.749 0 01-.734-.215zM11.5 7a4.499 4.499 0 10-8.997 0A4.499 4.499 0 0011.5 7z"/></svg>;

function formatNum(n) { return n >= 1000 ? (n/1000).toFixed(1)+'k' : n; }

function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return 'ahora';
  if (d < 3600000) return Math.floor(d / 60000) + 'm';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h';
  return new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

const TOOL_ITEMS = [
  { id: 'github', name: 'GitHub', desc: 'Busca repositorios y codigo', letter: 'G', bg: '#1f2328' },
  { id: 'npm', name: 'npm', desc: 'Busca paquetes de Node.js', letter: 'N', bg: '#cb3837' },
  { id: 'stackoverflow', name: 'Stack Overflow', desc: 'Busca soluciones a errores', letter: 'S', bg: '#f48024' },
  { id: 'web', name: 'Web Search', desc: 'Busca en DuckDuckGo', letter: 'W', bg: '#de5833' },
];

const AI_ITEMS = [
  { id: 'gemini', name: 'Gemini', ai: 'Google', src: '../assets/ai/googlegemini.svg' },
  { id: 'claude', name: 'Claude', ai: 'Anthropic', src: '../assets/ai/anthropic.svg' },
  { id: 'gpt4', name: 'GPT-4o', ai: 'OpenAI', src: '../assets/ai/openai.svg' },
  { id: 'mistral', name: 'Mistral', ai: 'Mistral AI', src: '../assets/ai/mistralai.svg' },
  { id: 'llama', name: 'Llama', ai: 'Meta', src: '../assets/ai/meta.svg' },
  { id: 'groq', name: 'Groq', ai: 'Groq', src: '../assets/ai/groq.svg' },
];

export function RepoView({ conversations, githubUser }) {
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('all');
  const [activeTab, setActiveTab] = React.useState('local');
  const [githubRepos, setGithubRepos] = React.useState([]);
  const [githubStarred, setGithubStarred] = React.useState([]);
  const [githubIssues, setGithubIssues] = React.useState([]);
  const [ghLoading, setGhLoading] = React.useState(false);
  const [myRepoData, setMyRepoData] = React.useState(null);
  const [myRepoLoading, setMyRepoLoading] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);

  const isGhConnected = githubUser && githubUser.login && githubUser.login !== 'invitado';

  function connectGithub() {
    setConnecting(true);
    B.startGithubDeviceFlow().then(function(flow) {
      window.open(flow.verification_uri, 'github-device');
      return B.pollGithubToken(flow.device_code);
    }).then(function(token) {
      return B.fetchGithubUser(token);
    }).then(function(user) {
      setConnecting(false);
      if (user && user.login) {
        B.saveUser({ login: user.login, name: user.name, avatar_url: user.avatar_url, email: user.email });
        try { window.postMessage({ type: 'GITHUB_USER_SAVED' }, '*'); } catch (e) {}
      }
    }).catch(function() { setConnecting(false); });
  }

  React.useEffect(() => {
    if (githubUser && activeTab === 'github') {
      setGhLoading(true);
      B.getGithubToken().then(token => {
        if (!token) { setGhLoading(false); return; }
        Promise.all([
          B.fetchGithubRepos(token).catch(() => []),
          B.fetchGithubStarred(token).catch(() => []),
          B.fetchGithubIssues(token).catch(() => []),
        ]).then(([repos, starred, issues]) => {
          setGithubRepos(repos);
          setGithubStarred(starred);
          setGithubIssues(issues);
          setGhLoading(false);
        }).catch(() => setGhLoading(false));
      });
    }
    if (githubUser && activeTab === 'myrepo') {
      setMyRepoLoading(true);
      B.getGithubToken().then(token => {
        if (!token) { setMyRepoLoading(false); return; }
        B.fetchGithubRepos(token).then(repos => {
          var x1Repo = repos.find(function(r) { return r.name && r.name.indexOf('x1') >= 0; });
          if (x1Repo) {
            setMyRepoData(x1Repo);
          } else {
            setMyRepoData({ name: githubUser.login + '/x1-data', description: 'Datos de System X1', private: true, entries: conversations ? conversations.length : 0 });
          }
          setMyRepoLoading(false);
        }).catch(() => setMyRepoLoading(false));
      });
    }
  }, [githubUser, activeTab]);

  let items = (conversations || []).map(c => ({
    id: c.id,
    title: c.title || 'Sin titulo',
    preview: c.messages?.[c.messages.length - 1]?.content?.slice(0, 100) || '',
    tags: c.tags || [],
    count: c.messages?.length || 0,
    updatedAt: c.updatedAt || c.createdAt || Date.now(),
    agent: c.agent,
  }));

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(i => i.title.toLowerCase().includes(q) || i.preview.toLowerCase().includes(q));
  }
  if (category !== 'all') {
    items = items.filter(i => {
      if (category === 'conversation') return i.count > 0;
      if (category === 'code') return i.tags.includes('Codigo');
      if (category === 'data') return i.tags.includes('Datos');
      if (category === 'note') return !i.tags.includes('Codigo') && !i.tags.includes('Datos') && i.count === 0;
      return true;
    });
  }
  items.sort((a, b) => b.updatedAt - a.updatedAt);

  const TAG_COLORS = {
    Codigo: { bg: '#ddf4ff', fg: '#0969da' },
    Diseno: { bg: '#fbefff', fg: '#8250df' },
    Estrategia: { bg: '#dafbe1', fg: '#1a7f37' },
    Email: { bg: '#fff8c5', fg: '#9a6700' },
    Datos: { bg: '#ddf4ff', fg: '#0969da' },
    Nota: { bg: '#f3f4f6', fg: '#656d76' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', fontFamily: F }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #d0d7de', background: '#ffffff', padding: '0 16px' }}>
        {[
          { id: 'local', label: 'Repositorio' },
          { id: 'myrepo', label: 'Mi Repositorio', disabled: !githubUser },
          { id: 'github', label: 'GitHub', disabled: !githubUser },
          { id: 'tools', label: 'Herramientas' },
        ].map(tab => (
          <button key={tab.id} onClick={() => !tab.disabled && setActiveTab(tab.id)} style={{
            padding: '8px 12px', border: 'none', background: 'transparent',
            fontSize: '14px', fontWeight: activeTab === tab.id ? '600' : '400',
            color: activeTab === tab.id ? '#1f2328' : '#59636e',
            borderBottom: activeTab === tab.id ? '2px solid #fd8c73' : '2px solid transparent',
            cursor: tab.disabled ? 'not-allowed' : 'pointer',
            opacity: tab.disabled ? 0.4 : 1,
            marginRight: '4px',
            transition: 'color 80ms',
          }}>{tab.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>

        {/* LOCAL TAB */}
        {activeTab === 'local' && (
          <div style={{ padding: '16px' }}>
            {/* Search + filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px', background: '#f6f8fa', border: '1px solid #d0d7de',
                borderRadius: '6px',
              }}>
                <SearchIcon w={16} h={16} fill="#818b98" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Filtrar repositorio..."
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '14px', flex: 1, fontFamily: F, color: '#1f2328' }}
                />
              </div>
            </div>

            {/* Filter chips */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
              {[
                { id: 'all', label: 'Todo' },
                { id: 'conversation', label: 'Conversaciones' },
                { id: 'code', label: 'Codigo' },
                { id: 'data', label: 'Datos' },
                { id: 'note', label: 'Notas' },
              ].map(cat => (
                <button key={cat.id} onClick={() => setCategory(cat.id)} style={{
                  padding: '3px 12px', borderRadius: '999px',
                  border: '1px solid ' + (category === cat.id ? '#0969da' : '#d0d7de'),
                  background: category === cat.id ? '#ddf4ff' : '#ffffff',
                  color: category === cat.id ? '#0969da' : '#59636e',
                  fontSize: '12px', fontWeight: '500', cursor: 'pointer',
                  transition: 'all 80ms',
                }}>{cat.label}</button>
              ))}
            </div>

            {/* Items list */}
            {items.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: '#59636e', fontSize: '14px' }}>
                <OctocatSvg w={40} h={40} fill="#818b98" />
                <div style={{ marginTop: '12px', fontWeight: '500' }}>Tu repositorio esta vacio</div>
                <div style={{ fontSize: '12px', color: '#818b98', marginTop: '4px' }}>Crea una conversacion para empezar</div>
                {!isGhConnected && (
                  <button onClick={connectGithub} disabled={connecting}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '20px', padding: '6px 16px', borderRadius: '6px', border: '1px solid rgba(27,31,36,0.15)', background: '#24292f', color: '#ffffff', fontSize: '13px', fontWeight: '600', cursor: connecting ? 'not-allowed' : 'pointer', opacity: connecting ? 0.7 : 1, boxShadow: 'inset 0 1px 0 rgba(208,215,222,0.2)', fontFamily: F }}>
                    <OctocatSvg w={16} h={16} fill="#ffffff" />
                    {connecting ? 'Conectando...' : 'Conectar GitHub'}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {items.map(item => {
                  const tc = TAG_COLORS[item.tags[0]] || TAG_COLORS.Nota;
                  return (
                    <div key={item.id} style={{
                      padding: '14px 16px', background: '#ffffff',
                      border: '1px solid #d0d7de', borderRadius: '6px',
                      marginBottom: '-1px', cursor: 'pointer',
                      transition: 'background 80ms',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f6f8fa'}
                      onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', lineHeight: '1.5' }}>
                        <div style={{
                          width: '16px', height: '16px', borderRadius: '3px',
                          background: item.tags[0] ? tc.bg : '#f3f4f6',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: item.tags[0] ? tc.fg : '#818b98' }} />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#0969da', flex: 1 }}>{item.title}</span>
                        <span style={{ fontSize: '12px', color: '#59636e' }}>{item.count} msg{item.count !== 1 ? 's' : ''}</span>
                        <span style={{ fontSize: '12px', color: '#818b98' }}>{timeAgo(item.updatedAt)}</span>
                      </div>
                      {item.preview && (
                        <div style={{ fontSize: '12px', color: '#59636e', marginTop: '8px', marginLeft: '24px',
                          lineHeight: '1.6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.preview}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* GITHUB TAB */}
        {activeTab === 'github' && (
          <div style={{ padding: '16px' }}>
            {!githubUser ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: '#59636e', fontSize: '14px' }}>
                Conecta tu cuenta de GitHub en Configuracion
              </div>
            ) : ghLoading ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: '#59636e', fontSize: '14px' }}>
                Cargando...
              </div>
            ) : (
              <>
                {/* Repos */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2328', marginBottom: '8px', padding: '0 0 8px', borderBottom: '1px solid #d0d7de' }}>
                    Tus repos <span style={{ color: '#818b98', fontWeight: '400' }}>({githubRepos.length})</span>
                  </h3>
                  {githubRepos.map(r => (
                    <a key={r.name} href={r.url} target="_blank" rel="noopener" style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                      border: '1px solid #d0d7de', borderRadius: '6px',
                      background: '#ffffff', textDecoration: 'none', color: '#1f2328',
                      marginBottom: '4px', transition: 'border-color 80ms',
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#0969da'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#d0d7de'}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0969da' }}>{r.name}</div>
                        {r.description && <div style={{ fontSize: '12px', color: '#59636e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center', fontSize: '12px', color: '#59636e' }}>
                        {r.language && <span>{r.language}</span>}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><StarIcon /> {formatNum(r.stars)}</span>
                      </div>
                    </a>
                  ))}
                </div>

                {/* Starred */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2328', marginBottom: '8px', padding: '0 0 8px', borderBottom: '1px solid #d0d7de' }}>
                    Destacados <span style={{ color: '#818b98', fontWeight: '400' }}>({githubStarred.length})</span>
                  </h3>
                  {githubStarred.map(r => (
                    <a key={r.name} href={r.url} target="_blank" rel="noopener" style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                      border: '1px solid #d0d7de', borderRadius: '6px',
                      background: '#ffffff', textDecoration: 'none', color: '#1f2328',
                      marginBottom: '4px', transition: 'border-color 80ms',
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#0969da'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#d0d7de'}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0969da' }}>{r.name}</div>
                        {r.description && <div style={{ fontSize: '12px', color: '#59636e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center', fontSize: '12px', color: '#59636e' }}>
                        {r.language && <span>{r.language}</span>}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><StarIcon /> {formatNum(r.stars)}</span>
                      </div>
                    </a>
                  ))}
                </div>

                {/* Issues */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2328', marginBottom: '8px', padding: '0 0 8px', borderBottom: '1px solid #d0d7de' }}>
                    Issues abiertas <span style={{ color: '#818b98', fontWeight: '400' }}>({githubIssues.length})</span>
                  </h3>
                  {githubIssues.map(i => (
                    <a key={i.url} href={i.url} target="_blank" rel="noopener" style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                      border: '1px solid #d0d7de', borderRadius: '6px',
                      background: '#ffffff', textDecoration: 'none', color: '#1f2328',
                      marginBottom: '4px', transition: 'border-color 80ms',
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#0969da'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#d0d7de'}
                    >
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#1a7f37', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.title}</div>
                        <div style={{ fontSize: '12px', color: '#59636e' }}>{i.repo}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* MYREPO TAB */}
        {activeTab === 'myrepo' && (
          <div style={{ padding: '16px' }}>
            {!githubUser ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: '#59636e', fontSize: '14px' }}>
                Conecta tu cuenta de GitHub en Configuracion para ver tu repositorio
              </div>
            ) : myRepoLoading ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: '#59636e', fontSize: '14px' }}>
                Cargando tu repositorio...
              </div>
            ) : (
              <>
                {/* Repo header */}
                <div style={{ padding: '16px', border: '1px solid #d0d7de', borderRadius: '6px', background: '#ffffff', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f6f8fa', border: '1px solid #d0d7de', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <OctocatSvg w={24} h={24} fill="#24292f" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#0969da' }}>{myRepoData ? myRepoData.name : githubUser.login + '/x1-data'}</div>
                      <div style={{ fontSize: '12px', color: '#59636e' }}>{myRepoData ? myRepoData.description || 'Repositorio de datos de System X1' : 'Repositorio de datos de System X1'}</div>
                    </div>
                    {myRepoData && myRepoData.url && (
                      <a href={myRepoData.url} target="_blank" rel="noopener" style={{ fontSize: '12px', color: '#0969da', textDecoration: 'none', fontWeight: '500' }}>Abrir en GitHub &#8599;</a>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#59636e' }}>
                    <span>{conversations ? conversations.length : 0} conversaciones</span>
                    <span>{conversations ? conversations.reduce(function(acc, c) { return acc + (c.messages ? c.messages.length : 0); }, 0) : 0} mensajes totales</span>
                    {myRepoData && myRepoData.private && <span style={{ color: '#818b98' }}>Privado</span>}
                  </div>
                </div>

                {/* Data flow */}
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2328', marginBottom: '8px', padding: '0 0 8px', borderBottom: '1px solid #d0d7de' }}>
                    Flujo de datos
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { step: '1', title: 'Conversacion', desc: 'Cada mensaje que envias se guarda en memoria local', color: '#0969da' },
                      { step: '2', title: 'Analisis', desc: 'El sistema juez analiza tu consulta y selecciona el mejor agente', color: '#8250df' },
                      { step: '3', title: 'Busqueda', desc: 'Las herramientas buscan informacion relevante cuando hace falta', color: '#1a7f37' },
                      { step: '4', title: 'Respuesta', desc: 'El agente genera una respuesta basada en los resultados', color: '#bf8700' },
                      { step: '5', title: 'Almacenamiento', desc: 'La conversacion se guarda en tu repositorio local y GitHub', color: '#cf222e' },
                    ].map(function(item) {
                      return (
                        <div key={item.step} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', border: '1px solid #d0d7de', borderRadius: '6px', background: '#ffffff' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: item.color + '15', border: '1px solid ' + item.color + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px', fontWeight: '700', color: item.color }}>
                            {item.step}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2328', marginBottom: '2px' }}>{item.title}</div>
                            <div style={{ fontSize: '12px', color: '#59636e', lineHeight: '1.4' }}>{item.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent activity */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2328', marginBottom: '8px', padding: '0 0 8px', borderBottom: '1px solid #d0d7de' }}>
                    Actividad reciente
                  </h3>
                  {conversations && conversations.length > 0 ? (
                    conversations.slice(0, 5).map(function(c) {
                      return (
                        <div key={c.id} style={{ padding: '8px 12px', border: '1px solid #d0d7de', borderRadius: '6px', background: '#ffffff', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '14px', fontWeight: '500', color: '#0969da' }}>{c.title || 'Sin titulo'}</span>
                            <span style={{ fontSize: '12px', color: '#818b98' }}>{timeAgo(c.updatedAt || c.createdAt)}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#59636e', marginTop: '4px' }}>
                            {(c.messages ? c.messages.length : 0) + ' mensajes' + (c.agent ? ' | Agente: ' + c.agent : '')}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: '#818b98', fontSize: '12px' }}>No hay actividad aun</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* TOOLS TAB */}
        {activeTab === 'tools' && (
          <div style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2328', marginBottom: '8px', padding: '0 0 8px', borderBottom: '1px solid #d0d7de' }}>
              Herramientas de busqueda
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px' }}>
              {TOOL_ITEMS.map(tool => (
                <div key={tool.id} style={{ padding: '12px', border: '1px solid #d0d7de', borderRadius: '6px', background: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '6px', background: tool.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: '700', color: '#ffffff',
                    }}>{tool.letter}</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2328' }}>{tool.name}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#59636e' }}>{tool.desc}</div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2328', marginBottom: '8px', padding: '0 0 8px', borderBottom: '1px solid #d0d7de' }}>
              Agentes IA
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {AI_ITEMS.map(a => (
                <div key={a.id} style={{ padding: '12px', border: '1px solid #d0d7de', borderRadius: '6px', background: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={a.src} alt={a.name} style={{ width: '24px', height: '24px', borderRadius: '4px' }} onError={e => e.currentTarget.style.display='none'} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2328' }}>{a.name}</div>
                    <div style={{ fontSize: '12px', color: '#59636e' }}>{a.ai}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
