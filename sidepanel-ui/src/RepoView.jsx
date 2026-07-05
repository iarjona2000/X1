import React, { useState, useEffect, useRef } from 'react';
import * as B from './backend.js';
import * as T from './tools.js';

const AGENTS = B.AGENTS;

const S = {
  container: { flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#101411' },
  header: { padding:'16px 20px 12px', borderBottom:'1px solid #21262D' },
  tabs: { display:'flex', gap:4, marginBottom:12 },
  tab: (active) => ({ padding:'6px 14px', borderRadius:20, background:active?'#21262D':'transparent', border:active?'1px solid #30363D':'1px solid transparent', cursor:'pointer', fontSize:12, fontWeight:500, color:active?'#E6EDF3':'#8B949E', transition:'all 0.15s', display:'flex', alignItems:'center', gap:6 }),
  searchWrap: { position:'relative' },
  searchInput: { width:'100%', padding:'8px 12px 8px 36px', borderRadius:6, border:'1px solid #30363D', background:'#0D1117', color:'#E6EDF3', fontSize:13, outline:'none', transition:'border-color 0.15s', fontFamily:'inherit' },
  searchIcon: { position:'absolute', left:12, top:9, fontSize:14, color:'#484F58' },
  content: { flex:1, overflow:'auto', padding:'16px 20px' },
  sectionTitle: { fontSize:11, fontWeight:600, color:'#8B949E', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 },
  empty: { padding:32, textAlign:'center', color:'#484F58' },
  emptyIcon: { fontSize:32, marginBottom:8, opacity:0.5 },
  emptyText: { fontSize:13, marginBottom:4, color:'#B6BFB8' },
  emptyHint: { fontSize:12, color:'#484F58' },
  subTabs: { display:'flex', gap:4, marginBottom:16 },
  subTab: (active) => ({ padding:'5px 12px', borderRadius:6, background:active?'#21262D':'transparent', border:active?'1px solid #30363D':'1px solid transparent', cursor:'pointer', fontSize:12, color:active?'#E6EDF3':'#8B949E', transition:'all 0.15s' }),
};

const TOOL_ICONS = { github:'&#128187;', npm:'&#128230;', stackoverflow:'&#128221;', web:'&#127760;', gmail:'&#128231;', calendar:'&#128197;' };

function RepoCard({ repo, onClick }) {
  const langColors = { JavaScript:'#f1e05a', TypeScript:'#3178c6', Python:'#3572A5', Rust:'#dea584', Go:'#00ADD8', Java:'#b07219' };
  const bg = langColors[repo.language] || '#656d76';
  return (
    <div onClick={onClick} style={{ padding:12, borderRadius:12, background:'#161B22', border:'1px solid #21262D', cursor:'pointer', transition:'all 0.15s', marginBottom:8, ':hover':{borderColor:'#30363D'} }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:6, background:bg, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:14, fontWeight:700, flexShrink:0 }}>
          {repo.name?.charAt(0)?.toUpperCase()||'?'}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <div style={{ fontSize:14, fontWeight:600, color:'#E6EDF3', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{repo.name}</div>
            {repo.private && <span style={{ fontSize:10, color:'#8B949E', background:'#21262D', padding:'1px 6px', borderRadius:4, border:'1px solid #30363D' }}>privado</span>}
          </div>
          {repo.description && <div style={{ fontSize:12, color:'#8B949E', lineHeight:1.4, marginBottom:6, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{repo.description}</div>}
          <div style={{ display:'flex', alignItems:'center', gap:12, fontSize:12, color:'#8B949E' }}>
            {repo.language && <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:8, height:8, borderRadius:4, background:bg }} />{repo.language}</div>}
            {repo.stars!==undefined && <div>&#9733; {repo.stars}</div>}
            {repo.url && <div style={{ color:'#0FBF3E' }}>GitHub &#8599;</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function IssueCard({ issue }) {
  return (
    <div style={{ padding:12, borderRadius:12, background:'#161B22', border:'1px solid #21262D', marginBottom:8 }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
        <div style={{ width:20, height:20, borderRadius:10, background:'#0FBF3E', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
          <div style={{ width:8, height:8, borderRadius:4, background:'#101411' }} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:500, color:'#E6EDF3', marginBottom:4 }}>{issue.title}</div>
          <div style={{ fontSize:12, color:'#8B949E', marginBottom:4 }}>{issue.repo}</div>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#8B949E' }}>
            <div style={{ padding:'2px 8px', borderRadius:12, background:'rgba(15,191,62,0.15)', color:'#0FBF3E', fontSize:11, fontWeight:500 }}>abierto</div>
            <div>{new Date(issue.created).toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolCard({ icon, name, version, description, url }) {
  return (
    <div style={{ padding:12, borderRadius:12, background:'#161B22', border:'1px solid #21262D', marginBottom:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <div style={{ width:24, height:24, borderRadius:6, background:'#21262D', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }} dangerouslySetInnerHTML={{ __html:icon }} />
        <div style={{ fontSize:14, fontWeight:500, color:'#E6EDF3' }}>{name}</div>
        <div style={{ fontSize:11, color:'#8B949E', marginLeft:'auto' }}>{version}</div>
      </div>
      <div style={{ fontSize:12, color:'#8B949E', lineHeight:1.4 }}>{description}</div>
      {url && <div style={{ fontSize:11, color:'#0FBF3E', marginTop:6 }}>{url}</div>}
    </div>
  );
}

function EntryCard({ entry, agentId }) {
  const agent = AGENTS.find(a => a.id === agentId);
  return (
    <div style={{ padding:'10px 12px', borderRadius:8, background:'#161B22', border:'1px solid #21262D', marginBottom:6, fontSize:12, color:'#B6BFB8', lineHeight:1.4 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
        {agent && <span style={{ padding:'1px 6px', borderRadius:4, background:agent.color+'22', color:agent.color, fontSize:10, fontWeight:600 }}>{agent.name}</span>}
        <span style={{ color:'#8B949E' }}>{new Date(entry.ts).toLocaleString()}</span>
      </div>
      {entry.query && <div style={{ fontWeight:500, marginBottom:2, color:'#E6EDF3' }}>{entry.query}</div>}
      {entry.response && <div style={{ color:'#8B949E' }}>{entry.response.substring(0, 150)}...</div>}
    </div>
  );
}

export default function RepoView({ user, selectedRepoData, showRepoFromChat, setShowRepoFromChat }) {
  const [activeTab, setActiveTab] = useState('local');
  const [localTab, setLocalTab] = useState('memory');
  const [githubTab, setGithubTab] = useState('repos');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [githubRepos, setGithubRepos] = useState([]);
  const [githubStarred, setGithubStarred] = useState([]);
  const [githubIssues, setGithubIssues] = useState([]);
  const [myRepos, setMyRepos] = useState([]);
  const [localActions, setLocalActions] = useState([]);

  useEffect(() => {
    T.loadMemory();
    T.loadActionLog();
    T.loadRepoData();
    const allActions = Object.entries(T.getAllRepoData()).flatMap(([agentId, entries]) =>
      entries.map(e => ({ ...e, agentId }))
    );
    setLocalActions(allActions);
  }, []);

  useEffect(() => {
    if (showRepoFromChat && selectedRepoData) {
      setActiveTab('repo');
      const agent = AGENTS.find(a => a.id === selectedRepoData.agentId);
      if (agent) {
        setMyRepos([{
          name: (user?.login||'user') + '/' + agent.name.toLowerCase(),
          description: agent.desc,
          language: agent.sector,
          private: true,
          url: 'https://github.com/' + (user?.login||'user') + '/' + agent.name.toLowerCase(),
          entries: T.getRepoData(agent.id),
        }]);
      }
    }
  }, [showRepoFromChat, selectedRepoData, user]);

  useEffect(() => {
    if (activeTab !== 'github') return;
    setLoading(true);
    async function load() {
      try {
        const token = await B.getGithubToken();
        if (!token) { setLoading(false); return; }
        const [repos, starred, issues] = await Promise.allSettled([
          B.fetchGithubRepos(token),
          B.fetchGithubStarred(token),
          B.fetchGithubIssues(token),
        ]);
        if (repos.status==='fulfilled') setGithubRepos(repos.value);
        if (starred.status==='fulfilled') setGithubStarred(starred.value);
        if (issues.status==='fulfilled') setGithubIssues(issues.value);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [activeTab]);

  const filter = (items, getSearchable) => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item => getSearchable(item).toLowerCase().includes(q));
  };

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div style={S.tabs}>
          <div onClick={()=>setActiveTab('local')} style={S.tab(activeTab==='local')}>&#128203; Mi Local</div>
          <div onClick={()=>setActiveTab('repo')} style={S.tab(activeTab==='repo')}>&#128193; Mi Repositorio</div>
          <div onClick={()=>setActiveTab('github')} style={S.tab(activeTab==='github')}>GitHub</div>
          <div onClick={()=>setActiveTab('tools')} style={S.tab(activeTab==='tools')}>&#128295; Herramientas</div>
        </div>
        <div style={S.searchWrap}>
          <div style={S.searchIcon}>&#128269;</div>
          <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Buscar..." style={S.searchInput} />
        </div>
      </div>

      <div style={S.content}>
        {/* Local */}
        {activeTab==='local' && (
          <div>
            <div style={S.subTabs}>
              <div onClick={()=>setLocalTab('memory')} style={S.subTab(localTab==='memory')}>Recuerdos</div>
              <div onClick={()=>setLocalTab('actions')} style={S.subTab(localTab==='actions')}>Acciones</div>
            </div>
            {localTab==='memory' && (
              <div style={S.empty}>
                <div style={S.emptyIcon}>&#128203;</div>
                <div style={S.emptyText}>Recuerdos de conversacion</div>
                <div style={S.emptyHint}>Las conversaciones se guardan automaticamente en memoria local.</div>
              </div>
            )}
            {localTab==='actions' && (
              localActions.length===0 ?
                <div style={S.empty}><div style={S.emptyIcon}>&#128221;</div><div style={S.emptyText}>No hay acciones registradas</div><div style={S.emptyHint}>Cada consulta se registra aqui.</div></div> :
                filter(localActions, e=>(e.query||'')+' '+(e.agentId||'')).slice(0,50).map((entry,i) => <EntryCard key={entry.id||i} entry={entry} agentId={entry.agentId} />)
            )}
          </div>
        )}

        {/* Mi Repositorio */}
        {activeTab==='repo' && (
          <div>
            <div style={S.sectionTitle}>Repositorios de Agentes</div>
            {myRepos.length===0 ? (
              <div style={S.empty}>
                <div style={S.emptyIcon}>&#128193;</div>
                <div style={S.emptyText}>No hay repositorios de agentes</div>
                <div style={S.emptyHint}>Cada agente tiene su propio repositorio privado en GitHub.</div>
              </div>
            ) : (
              filter(myRepos, r=>r.name+' '+(r.description||'')).map((repo,i) => <RepoCard key={repo.name+i} repo={repo} onClick={()=>window.open(repo.url,'_blank')} />)
            )}
            {localActions.length > 0 && (
              <>
                <div style={{...S.sectionTitle, marginTop:16}}>Entradas Guardadas</div>
                {filter(localActions, e=>(e.query||'')+' '+(e.response||'')).slice(0,50).map((entry,i) => <EntryCard key={entry.id||i} entry={entry} agentId={entry.agentId} />)}
              </>
            )}
          </div>
        )}

        {/* GitHub */}
        {activeTab==='github' && (
          <div>
            <div style={S.subTabs}>
              <div onClick={()=>setGithubTab('repos')} style={S.subTab(githubTab==='repos')}>Repos ({githubRepos.length})</div>
              <div onClick={()=>setGithubTab('starred')} style={S.subTab(githubTab==='starred')}>Destacados ({githubStarred.length})</div>
              <div onClick={()=>setGithubTab('issues')} style={S.subTab(githubTab==='issues')}>Issues ({githubIssues.length})</div>
            </div>
            {loading && <div style={{...S.empty, padding:20}}>Cargando...</div>}
            {!loading && githubTab==='repos' && (
              githubRepos.length===0 ? <div style={S.empty}><div style={S.emptyText}>No hay repositorios</div></div> :
              filter(githubRepos, r=>r.name+' '+r.description+' '+(r.language||'')).map((r,i) => <RepoCard key={r.name+i} repo={r} onClick={()=>window.open(r.url,'_blank')} />)
            )}
            {!loading && githubTab==='starred' && (
              githubStarred.length===0 ? <div style={S.empty}><div style={S.emptyText}>No hay destacados</div></div> :
              filter(githubStarred, r=>r.name+' '+r.description).map((r,i) => <RepoCard key={r.name+i} repo={r} onClick={()=>window.open(r.url,'_blank')} />)
            )}
            {!loading && githubTab==='issues' && (
              githubIssues.length===0 ? <div style={S.empty}><div style={S.emptyText}>No hay issues</div></div> :
              filter(githubIssues, i=>i.title+' '+i.repo).map((issue,i) => <IssueCard key={issue.url+i} issue={issue} />)
            )}
          </div>
        )}

        {/* Tools */}
        {activeTab==='tools' && (
          <div>
            <div style={S.sectionTitle}>Herramientas Disponibles</div>
            <ToolCard icon="&#128187;" name="GitHub Search" version="v3" description="Busca repos, codigo y usuarios en GitHub" url="https://docs.github.com/en/rest" />
            <ToolCard icon="&#128230;" name="npm Search" version="v1" description="Busca paquetes de Node.js en el registro de npm" url="https://docs.npmjs.com/cli" />
            <ToolCard icon="&#128221;" name="Stack Overflow" version="v2.3" description="Busca preguntas y respuestas en Stack Overflow" url="https://api.stackexchange.com/" />
            <ToolCard icon="&#128231;" name="Gmail" version="v1" description="Lee y envia correos electronicos a traves de Gmail" />
            <ToolCard icon="&#128197;" name="Calendar" version="v3" description="Gestiona eventos y reuniones del calendario" />
            <ToolCard icon="&#127760;" name="Web Search" version="v1" description="Busca informacion en la web en tiempo real" />
          </div>
        )}
      </div>
    </div>
  );
}
