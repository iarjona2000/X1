import * as React from 'react';
import * as B from './backend.js';
import {
  fetchOpenPRs, fetchPRDiff, reviewPRDiff, publishPRComment,
  loadRepoAnalysis, runAutoBuild, publishAutoBuild,
  getBackgroundQueue, cancelBackgroundQueue, runAutopilot, resumeBackgroundQueue, redirectAutopilot,
} from './github-agent.js';
import { ProcessTask, ThinkingStep, FileChange } from './components/ui/task';
import { DiffView } from './DiffView.jsx';
import {
  Bot, GitBranch, FolderCode, Compass, Brain, BookOpen, Globe, Cloud, Navigation, History, Square, Code2, Wrench, Search, ChevronRight, Zap, Play
} from 'lucide-react';

const ALL_MCPS = [
  { id: 'serena', name: 'Serena', icon: Code2, color: '#3b82f6', desc: 'Search & edit code', tools: ['search_code', 'edit_code', 'find_references'] },
  { id: 'filesystem', name: 'Filesystem', icon: FolderCode, color: '#8b5cf6', desc: 'Read/write files & directories', tools: ['read_file', 'write_file', 'list_dir', 'search'] },
  { id: 'git', name: 'Git', icon: History, color: '#f97316', desc: 'Commits, diffs, branches, blame', tools: ['log', 'diff', 'blame', 'status', 'branch'] },
  { id: 'github', name: 'GitHub', icon: GitBranch, color: '#24292e', desc: 'Repos, issues, PRs, branches', tools: ['repos', 'issues', 'PRs', 'branches', 'search'] },
  { id: 'firecrawl', name: 'Firecrawl', icon: Globe, color: '#14b8a6', desc: 'Scrape, search & crawl web', tools: ['scrape', 'search', 'crawl', 'extract'] },
  { id: 'seqthink', name: 'Seq. Think', icon: Navigation, color: '#a855f7', desc: 'Step-by-step planning', tools: ['sequential_thinking'] },
  { id: 'fetch', name: 'Fetch', icon: Globe, color: '#06b6d4', desc: 'Read web pages & APIs', tools: ['fetch_url'] },
  { id: 'context7', name: 'Context7', icon: BookOpen, color: '#6366f1', desc: 'Library docs & API reference', tools: ['resolve_library', 'query_docs'] },
  { id: 'memory', name: 'Memory', icon: Brain, color: '#06b6d4', desc: 'Entity memory & relationships', tools: ['entities', 'relations', 'observations', 'search'] },
  { id: 'cognee', name: 'Cognee', icon: Brain, color: '#ec4899', desc: 'Long-term semantic memory', tools: ['remember', 'recall', 'forget'] },
  { id: 'vercel', name: 'Vercel', icon: Cloud, color: '#000000', desc: 'Deploy projects, manage deployments', tools: ['list_projects', 'deploy', 'get_deployment'] },
  { id: 'cf', name: 'Cloudflare', icon: Cloud, color: '#f38020', desc: 'Docs, builds, bindings, logs', tools: ['search_docs', 'list_builds', 'list_bindings'] },
];

const SECTORS = [
  { name: 'Estrategia', model: 'Kimi K2', icon: Brain },
  { name: 'Desarrollo', model: 'Qwen3 Coder', icon: Code2 },
  { name: 'Auditoria', model: 'Nemotron', icon: Search },
  { name: 'Refinamiento', model: 'Qwen3 Coder', icon: Wrench },
  { name: 'Direccion', model: 'Kimi K2', icon: Navigation },
];

const F = "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'Geist Mono', 'SF Mono', 'Cascadia Code', Consolas, monospace";

const C = {
  border: '#e8e8e8', canvas: '#f7f7f7', fg: '#171717', fgMuted: '#707070', fgSubtle: '#a3a3a3',
  accent: '#171717', success: '#16a34a', danger: '#dc2626',
};

const H3 = { fontSize: '14px', fontWeight: '600', color: C.fg, margin: '0 0 8px', padding: '0 0 8px', borderBottom: '1px solid ' + C.border };

var STORE_KEY = 'x1_automation_state';
var store = { goal: '', steps: [], proposal: null, building: false, publishSteps: [], published: null, publishing: false, publishError: null };
var listeners = [];

function sanitizeProposal(p) {
  if (!p || typeof p !== 'object') return null;
  return Object.assign({}, p, { archivos: Array.isArray(p.archivos) ? p.archivos : [] });
}

(function hydrate() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      var saved = JSON.parse(raw);
      store = Object.assign({}, store, saved, { building: false, publishing: false, proposal: sanitizeProposal(saved.proposal), steps: Array.isArray(saved.steps) ? saved.steps : [], publishSteps: Array.isArray(saved.publishSteps) ? saved.publishSteps : [] });
    }
  } catch (e) {}
})();

function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {} }
function setStore(patch) { store = Object.assign({}, store, patch); persist(); listeners.forEach(function (l) { l(store); }); }

function useAutomationStore() {
  var [, forceRender] = React.useState(0);
  React.useEffect(function () {
    function onChange() { forceRender(function (n) { return n + 1; }); }
    listeners.push(onChange);
    return function () { listeners = listeners.filter(function (l) { return l !== onChange; }); };
  }, []);
  return store;
}

function upsertStep(list, step) {
  var i = list.findIndex(function (s) { return s.id === step.id; });
  if (i === -1) return list.concat([step]);
  var copy = list.slice();
  copy[i] = Object.assign({}, copy[i], step);
  return copy;
}

function setGoal(goal) { setStore({ goal: goal }); }

function build(repoCtx) {
  var goal = store.goal;
  if (!goal.trim() || store.building) return;
  setStore({ building: true, steps: [], proposal: null, published: null, publishError: null });
  B.getGithubToken().then(function (token) {
    var ctx = repoCtx ? Object.assign({}, repoCtx, { token: token }) : null;
    return runAutoBuild(goal.trim(), ctx, function (s) { setStore({ steps: upsertStep(store.steps, s) }); });
  }).then(function (p) {
    setStore({ proposal: sanitizeProposal(p), building: false });
    if (p && p.archivos && p.archivos.length && repoCtx) publish(repoCtx);
  }).catch(function (e) { setStore({ building: false, steps: upsertStep(store.steps, { id: 'fatal', title: 'Error: ' + (e && e.message), status: 'error' }) }); });
}

function publish(repoCtx) {
  var proposal = store.proposal;
  if (!proposal || !proposal.archivos.length || !repoCtx) return;
  setStore({ publishing: true, publishSteps: [], publishError: null });
  B.getGithubToken().then(function (token) {
    var branch = (repoCtx.meta && repoCtx.meta.default_branch) || 'main';
    return publishAutoBuild(token, repoCtx.owner, repoCtx.name, branch, proposal, function (s) { setStore({ publishSteps: upsertStep(store.publishSteps, s) }); });
  }).then(function (r) { setStore({ published: r, publishing: false }); }).catch(function (e) { setStore({ publishError: e.message || 'Error', publishing: false }); });
}

function startAutopilot(repoCtx) {
  if (store.building || !repoCtx) return;
  setStore({ building: true, goal: '', steps: [], proposal: null, published: null, publishError: null });
  B.getGithubToken().then(function (token) {
    return runAutopilot(Object.assign({}, repoCtx, { token: token }), function (s) { setStore({ steps: upsertStep(store.steps, s) }); });
  }).then(function () { setStore({ building: false }); }).catch(function (e) { setStore({ building: false, steps: upsertStep(store.steps, { id: 'fatal', title: 'Error: ' + (e && e.message), status: 'error' }) }); });
}

function BranchTag({ children }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: MONO, fontSize: '12px', padding: '2px 8px', borderRadius: '6px', background: C.canvas, color: C.fg }}><GitBranch size={12} />{children}</span>;
}

function Flash({ variant = 'default', children, action }) {
  var colors = { default: { bg: C.canvas, border: C.border, fg: C.fg }, success: { bg: '#f0fdf4', border: '#bbf7d0', fg: '#166534' }, danger: { bg: '#fef2f2', border: '#fecaca', fg: '#991b1b' }, attention: { bg: '#fffbeb', border: '#fde68a', fg: '#92400e' } };
  var p = colors[variant] || colors.default;
  return <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', borderRadius: '12px', border: '1px solid ' + p.border, background: p.bg, color: p.fg, fontSize: '13px', lineHeight: '1.6', fontFamily: F }}><div style={{ flex: 1 }}>{children}</div>{action || null}</div>;
}

function MCPGrid({ mcps, activeMCP }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px' }}>
      {mcps.map(function (m) {
        var isActive = activeMCP === m.id;
        var Icon = m.icon;
        return (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '6px', border: '1px solid ' + (isActive ? m.color : C.border), background: isActive ? m.color + '0d' : '#fff', fontSize: '12px', fontFamily: F }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: m.color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={13} color={m.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: '500', color: C.fg, fontSize: '12px' }}>{m.name}</div>
              <div style={{ color: C.fgSubtle, fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.tools.slice(0, 3).join(', ')}</div>
            </div>
            {isActive && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: m.color, marginLeft: 'auto', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />}
          </div>
        );
      })}
    </div>
  );
}

function SectorsBar({ sectors }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
      {sectors.map(function (s, i) {
        var Icon = s.icon;
        return (
          <div key={s.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '999px', background: C.canvas, border: '1px solid ' + C.border, fontSize: '11px', color: C.fg, fontFamily: MONO }}>
            <Icon size={11} />
            <span>{s.name}</span>
            <span style={{ color: C.fgSubtle }}>{s.model}</span>
            {i < sectors.length - 1 && <ChevronRight size={11} style={{ color: C.fgSubtle }} />}
          </div>
        );
      })}
    </div>
  );
}

function timeAgo(ts) {
  var d = Date.now() - new Date(ts).getTime();
  if (d < 3600000) return Math.floor(d / 60000) + 'm';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h';
  return Math.floor(d / 86400000) + 'd';
}

function timeUntil(ts) {
  if (!ts) return null;
  var d = new Date(ts).getTime() - Date.now();
  if (d <= 0) return 'soon';
  if (d < 60000) return 'in ' + Math.ceil(d / 1000) + 's';
  if (d < 3600000) return 'in ' + Math.ceil(d / 60000) + 'm';
  return 'in ' + Math.floor(d / 3600000) + 'h';
}

function BackgroundQueueView({ queue, onCancel, onResume, cancelling }) {
  var isAutopilot = queue.mode === 'autopilot';
  var list = isAutopilot ? (queue.history || []) : (queue.tareas || []);
  var done = list.filter(function (t) { return t.status === 'done'; }).length;
  var errored = list.filter(function (t) { return t.status === 'error'; }).length;
  var active = list.filter(function (t) { return t.status === 'active'; }).length;
  var finished = !isAutopilot && list.every(function (t) { return t.status === 'done' || t.status === 'error'; });
  var isPaused = queue.status === 'paused';
  var displayList = isAutopilot ? list.slice().reverse() : list;

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <h3 style={{ ...H3, flex: 1, border: 'none', margin: 0, padding: 0 }}>{isAutopilot ? 'Autopilot cycle history' : 'Background automation queue'}</h3>
        {isPaused && <button onClick={onResume} style={{ fontSize: '11px', color: C.fg, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: F, fontWeight: '600' }}>Reactivate</button>}
        {(!finished || isAutopilot) && <button onClick={onCancel} disabled={cancelling} style={{ fontSize: '11px', color: C.fgMuted, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: F }}>{cancelling ? 'Stopping…' : (isAutopilot ? 'Disable autopilot' : 'Cancel queue')}</button>}
      </div>
      {isPaused && <Flash variant="attention">Autopilot paused: {queue.consecutiveFailures || 0} consecutive failures. {queue.lastError ? 'Last error: ' + queue.lastError + '. ' : ''}Click "Reactivate" when resolved.</Flash>}
      <div style={{ fontSize: '11px', color: C.fgMuted, marginBottom: '10px', lineHeight: '1.6' }}>
        {isAutopilot
          ? (done + ' cycle(s) completed' + (errored ? ', ' + errored + ' with errors' : '') + ' · no end — Vektor decides next goal autonomously' + (!isPaused && queue.nextTickAt ? ' — next cycle ' + timeUntil(queue.nextTickAt) : ' — last activity ' + timeAgo(queue.updatedAt)) + '.')
          : finished ? ('Queue complete: ' + done + ' PR(s) created' + (errored ? ', ' + errored + ' errors' : '') + '.')
          : (done + ' done · ' + list.filter(function(t){return t.status==='pending'}).length + ' pending · one task per 15-25 min' + (queue.nextTickAt ? ' — next ' + timeUntil(queue.nextTickAt) : '') + '.')}
      </div>
      {displayList.length > 0 && (
        <div style={{ border: '1px solid ' + C.border, borderRadius: '12px', overflow: 'hidden' }}>
          {displayList.map(function (t, i) {
            var color = t.status === 'done' || t.status === 'active' ? C.fg : C.fgSubtle;
            var statusLabel = t.status === 'done' ? 'done' : t.status === 'error' ? 'error' : t.status === 'active' ? 'running' : 'queued';
            var idx = isAutopilot ? (displayList.length - 1 - i) : i;
            return (
              <div key={i} style={{ padding: '10px 12px', borderBottom: i === displayList.length - 1 ? 'none' : '1px solid ' + C.border }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.status === 'active' ? C.accent : t.status === 'error' ? C.danger : C.fgSubtle }} />
                  <span style={{ fontSize: '12px', fontFamily: MONO, color: C.fg, flex: 1 }}>{(idx + 1) + '. ' + t.titulo}</span>
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: C.canvas, border: '1px solid ' + C.border, color: C.fgMuted }}>{statusLabel}</span>
                </div>
                {t.motivo && <div style={{ fontSize: '11px', color: C.fgMuted, marginTop: '2px', marginLeft: '18px', fontStyle: 'italic' }}>{t.motivo}</div>}
                {t.sectors && t.sectors.length > 0 && (
                  <div style={{ marginTop: '4px', marginLeft: '18px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {t.sectors.map(function (s, j) {
                      return <span key={j} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: C.canvas, color: C.fgMuted }}>{s.fase + ': ' + (s.model || 'AI')}</span>;
                    })}
                  </div>
                )}
                {t.status === 'done' && t.result && (
                  <div style={{ marginTop: '4px', marginLeft: '18px', fontSize: '11px', color: C.fgMuted, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ color: C.success, fontFamily: MONO }}>+{t.result.linesAdded || 0}</span>
                    <span style={{ color: C.danger, fontFamily: MONO }}>-{t.result.linesRemoved || 0}</span>
                    <span>{(t.result.files || []).join(', ')}</span>
                    {t.result.prUrl && <a href={t.result.prUrl} target="_blank" rel="noopener" style={{ color: C.fg, fontWeight: '600', textDecoration: 'underline' }}>View PR →</a>}
                    <span>{timeAgo(t.result.completedAt)}</span>
                  </div>
                )}
                {t.status === 'error' && t.result && <div style={{ marginTop: '4px', marginLeft: '18px', fontSize: '11px', color: C.danger }}>{t.result.error}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PRAgent({ githubUser, onGoToRepo }) {
  var isGh = githubUser && githubUser.login && githubUser.login !== 'invitado';
  var s = useAutomationStore();
  var [repoCtx, setRepoCtx] = React.useState(null);
  var [expandedFile, setExpandedFile] = React.useState(null);
  var [queue, setQueue] = React.useState(null);
  var [cancelling, setCancelling] = React.useState(false);
  var [redirectText, setRedirectText] = React.useState('');
  var [sendingRedirect, setSendingRedirect] = React.useState(false);
  var [redirectSent, setRedirectSent] = React.useState(false);
  var [activeMCP, setActiveMCP] = React.useState(null);

  var [prs, setPrs] = React.useState([]);
  var [loadingPrs, setLoadingPrs] = React.useState(false);
  var [selectedPr, setSelectedPr] = React.useState(null);
  var [reviewingPr, setReviewingPr] = React.useState(false);
  var [review, setReview] = React.useState('');
  var [publishingComment, setPublishingComment] = React.useState(false);
  var [commentPublished, setCommentPublished] = React.useState(false);

  React.useEffect(function () { setRepoCtx(loadRepoAnalysis()); }, []);

  React.useEffect(function () {
    getBackgroundQueue().then(setQueue);
    function onStorageChange(changes, area) {
      if (area === 'local' && changes.x1_automation_queue) {
        try { setQueue(changes.x1_automation_queue.newValue ? JSON.parse(changes.x1_automation_queue.newValue) : null); } catch (e) {}
      }
    }
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(onStorageChange);
      return function () { chrome.storage.onChanged.removeListener(onStorageChange); };
    }
  }, []);

  React.useEffect(function () {
    if (queue && queue.userDirective && !redirectText) setRedirectText(queue.userDirective);
  }, [queue && queue.userDirective]);

  React.useEffect(function () {
    if (!isGh) return;
    setLoadingPrs(true);
    B.getGithubToken().then(function (token) {
      if (!token) { setLoadingPrs(false); return; }
      fetchOpenPRs(token).then(function (list) { setPrs(list || []); setLoadingPrs(false); });
    });
  }, [githubUser]);

  function handleCancelQueue() { setCancelling(true); cancelBackgroundQueue().then(function () { setQueue(null); setCancelling(false); }); }
  function handleResumeQueue() { resumeBackgroundQueue().then(function () { getBackgroundQueue().then(setQueue); }); }

  function handleSendRedirect() {
    setSendingRedirect(true);
    redirectAutopilot(redirectText.trim()).then(function () {
      setSendingRedirect(false); setRedirectSent(true);
      setTimeout(function () { setRedirectSent(false); }, 2500);
    });
  }

  function handleStopAutopilot() {
    setCancelling(true); setStore({ building: false });
    cancelBackgroundQueue().then(function () { setQueue(null); setCancelling(false); });
  }

  function runReview(pr) {
    setSelectedPr(pr); setReview(''); setCommentPublished(false); setReviewingPr(true);
    B.getGithubToken().then(function (token) {
      return fetchPRDiff(token, pr.owner, pr.repo, pr.number);
    }).then(function (diff) {
      if (!diff) { setReview('No diff available.'); setReviewingPr(false); return; }
      return reviewPRDiff(pr.title, diff).then(function (text) {
        setReview(text || 'AI did not return a review.'); setReviewingPr(false);
      });
    }).catch(function () { setReview('Error reviewing PR.'); setReviewingPr(false); });
  }

  function publishComment() {
    if (!selectedPr || !review) return;
    setPublishingComment(true);
    B.getGithubToken().then(function (token) {
      return publishPRComment(token, selectedPr.owner, selectedPr.repo, selectedPr.number, 'Vektor Review\n\n' + review);
    }).then(function (ok) { setCommentPublished(ok); setPublishingComment(false); });
  }

  if (!isGh) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: C.fgMuted, fontSize: '14px', lineHeight: '1.6', fontFamily: F }}>
        Connect your GitHub account so Vektor can investigate, propose changes, and publish them autonomously.
      </div>
    );
  }

  var proposal = s.proposal;
  var proposalFiles = (proposal && proposal.archivos) || [];
  var autopilotActive = s.building || (queue && queue.mode === 'autopilot');

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px', fontFamily: F }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* ═══ HEADER ═══ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: C.fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={16} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: C.fg, margin: 0 }}>Vektor Autonomous Agent</h2>
            <p style={{ fontSize: '12px', color: C.fgMuted, margin: 0 }}>Powered by MCP — works while you work</p>
          </div>
        </div>

        {/* ═══ REPO CONTEXT ═══ */}
        {repoCtx ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '10px 14px', border: '1px solid ' + C.border, borderRadius: '12px', background: C.canvas }}>
            <GitBranch size={14} color={C.fgMuted} />
            <BranchTag>{repoCtx.repo}</BranchTag>
            <span style={{ fontSize: '11px', color: C.fgMuted }}>analyzed {timeAgo(repoCtx.at)} ago</span>
            {onGoToRepo && <button onClick={onGoToRepo} style={{ marginLeft: 'auto', fontSize: '11px', color: C.fg, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: F }}>Change</button>}
          </div>
        ) : (
          <Flash variant="attention">
            No repository analyzed. Vektor can still investigate but won't publish until you{' '}
            {onGoToRepo ? <a href="#" onClick={function (e) { e.preventDefault(); onGoToRepo(); }} style={{ color: C.fg, fontWeight: '600' }}>analyze a repo</a> : 'analyze a repo'}
            .
          </Flash>
        )}

        {/* ═══ AUTOPILOT CARD ═══ */}
        <div style={{ marginBottom: '16px', padding: '16px 18px', border: '1px solid ' + C.border, borderRadius: '12px', background: C.canvas }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Zap size={16} color={C.fg} />
            <div style={{ fontSize: '14px', fontWeight: '600', color: C.fg, flex: 1 }}>Autopilot Mode</div>
            {autopilotActive && (
              <button onClick={handleStopAutopilot} disabled={cancelling} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 12px', borderRadius: '6px', border: '1px solid ' + C.border, background: '#fff', color: C.fg, fontSize: '12px', fontWeight: '500', cursor: cancelling ? 'default' : 'pointer', fontFamily: F, opacity: cancelling ? 0.6 : 1 }}>
                <Square size={11} />{cancelling ? 'Stopping…' : 'Stop'}
              </button>
            )}
          </div>

          <p style={{ fontSize: '12px', color: C.fgMuted, marginBottom: '8px', lineHeight: '1.6' }}>
            Vektor runs autonomously — strategy → development → audit → refinement → direction — publishing PRs, deciding what to build next. Runs in background via service worker, survives tab switches.
          </p>

          {/* Sectors flow */}
          <SectorsBar sectors={SECTORS} />

          {/* Active MCPs */}
          <div style={{ marginTop: '10px' }}>
            <p style={{ fontSize: '11px', fontWeight: '600', color: C.fgMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active MCP Agents</p>
            <MCPGrid mcps={ALL_MCPS} activeMCP={activeMCP} />
          </div>

          {!autopilotActive && (
            <div style={{ marginTop: '12px' }}>
              <button onClick={function () { startAutopilot(repoCtx); }} disabled={!repoCtx} style={{ height: '40px', padding: '0 16px', borderRadius: '6px', border: 'none', background: !repoCtx ? '#eee' : C.fg, color: !repoCtx ? C.fgSubtle : '#fff', fontSize: '14px', fontWeight: '500', cursor: !repoCtx ? 'default' : 'pointer', fontFamily: F }}>
                <Play size={14} style={{ marginRight: '6px', display: 'inline' }} />
                Activate Autopilot
              </button>
              {!repoCtx && <p style={{ fontSize: '11px', color: C.fgSubtle, marginTop: '6px' }}>Analyze a repository first.</p>}
            </div>
          )}

          {autopilotActive && (
            <div style={{ marginTop: '12px' }}>
              <Flash variant={s.building && !queue ? 'default' : 'default'}>
                {s.building && !queue ? 'Activating…' : 'Autopilot running for ' + timeAgo(queue.createdAt) + ' — Vektor keeps building indefinitely.'}
              </Flash>
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Navigation size={13} color={C.fgMuted} />
                  <span style={{ fontSize: '12px', fontWeight: '600', color: C.fg }}>Steer the direction</span>
                  <span style={{ fontSize: '11px', color: C.fgSubtle }}>— applies next cycle without stopping</span>
                </div>
                <textarea value={redirectText} onChange={function (e) { setRedirectText(e.target.value); }} placeholder='E.g.: "focus only on tests", "prioritize auth module", "stop touching the service worker"… Empty = Vektor decides.' rows={2} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '6px', border: '1px solid ' + C.border, fontSize: '12px', fontFamily: F, resize: 'vertical', outline: 'none', color: C.fg, lineHeight: '1.5' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <button onClick={handleSendRedirect} disabled={sendingRedirect} style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', background: C.fg, color: '#fff', fontSize: '12px', fontWeight: '500', cursor: sendingRedirect ? 'default' : 'pointer', fontFamily: F, opacity: sendingRedirect ? 0.6 : 1 }}>{sendingRedirect ? 'Sending…' : 'Send direction'}</button>
                  {redirectSent && <span style={{ fontSize: '11px', color: C.success }}>Direction updated ✓</span>}
                  {queue && queue.userDirective && !redirectSent && <span style={{ fontSize: '11px', color: C.fgSubtle }}>Current: "{queue.userDirective}"</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ GOAL INPUT ═══ */}
        <div style={{ marginBottom: '16px', padding: '16px', border: '1px solid ' + C.border, borderRadius: '12px', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Code2 size={14} color={C.fg} />
            <span style={{ fontSize: '14px', fontWeight: '600', color: C.fg }}>Give Vektor a specific goal</span>
          </div>
          <textarea value={s.goal} onChange={function (e) { setGoal(e.target.value); }} disabled={s.building} placeholder="What should Vektor build or investigate? E.g.: 'Add unit tests to github-agent.js', 'Fix the login bug', 'Implement dark mode'…" rows={3} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '6px', border: '1px solid ' + C.border, fontSize: '13px', fontFamily: F, resize: 'vertical', outline: 'none', color: C.fg, lineHeight: '1.5' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
            <button onClick={function () { build(repoCtx); }} disabled={s.building || !s.goal.trim()} style={{ height: '40px', padding: '0 16px', borderRadius: '6px', border: 'none', background: s.building || !s.goal.trim() ? '#eee' : C.fg, color: s.building || !s.goal.trim() ? C.fgSubtle : '#fff', fontSize: '14px', fontWeight: '500', cursor: s.building || !s.goal.trim() ? 'default' : 'pointer', fontFamily: F }}>
              {s.building ? 'Building…' : 'Build & publish autonomously'}
            </button>
            <span style={{ fontSize: '11px', color: C.fgSubtle }}>GitHub · Filesystem · Git · Serena · Seq. Think · Firecrawl</span>
            {s.building && <span style={{ fontSize: '11px', color: C.fgMuted, marginLeft: 'auto', fontStyle: 'italic' }}>Runs in background</span>}
          </div>
        </div>

        {/* ═══ LIVE PROCESS STEPS ═══ */}
        {s.steps.length > 0 && (
          <div style={{ marginBottom: '16px', padding: '14px 16px', border: '1px solid ' + C.border, borderRadius: '12px', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Brain size={14} color={C.fg} />
              <span style={{ fontSize: '13px', fontWeight: '600', color: C.fg }}>{s.building ? 'Vektor is thinking and building…' : 'Process complete'}</span>
            </div>
            <ProcessTask steps={s.steps.map(function (st) { return { id: st.id, status: st.status, description: st.title || st.description, sub: st.why || st.sub, details: st.detail || st.details, files: st.files, code: st.code, startedAt: st.startedAt, finishedAt: st.finishedAt }; })} isRunning={s.building} />
          </div>
        )}

        {/* ═══ PROPOSAL ═══ */}
        {proposal && (
          <div style={{ marginBottom: '16px' }}>
            {proposalFiles.length === 0 ? (
              <Flash variant={proposal.error ? 'danger' : 'default'}>
                {proposal.error ? 'AI did not return a valid proposal. Try describing the goal in more detail, or analyze the repo first.' : (proposal.resumen || 'Investigation complete — see results above.')}
              </Flash>
            ) : (
              <div>
                <h3 style={H3}>Vektor's Proposal</h3>
                <div style={{ fontSize: '15px', fontWeight: '600', color: C.fg, marginBottom: '4px' }}>{proposal.titulo_pr}</div>
                <div style={{ fontSize: '12px', color: C.fgMuted, marginBottom: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{proposal.descripcion_pr}</div>

                {proposalFiles.map(function (f) {
                  var open = expandedFile === f.path;
                  return (
                    <div key={f.path} style={{ border: '1px solid ' + C.border, borderRadius: '12px', marginBottom: '8px', overflow: 'hidden' }}>
                      <div onClick={function () { setExpandedFile(open ? null : f.path); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 12px', background: C.canvas, cursor: 'pointer' }}
                        onMouseEnter={function (e) { e.currentTarget.style.background = '#eee'; }} onMouseLeave={function (e) { e.currentTarget.style.background = C.canvas; }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: f.exists ? C.fgMuted : C.success }} />
                        <span style={{ fontFamily: MONO, fontSize: '12px', color: C.fg, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path}</span>
                        {f.linesAdded > 0 && <span style={{ fontSize: '11px', fontFamily: MONO, color: C.success }}>+{f.linesAdded}</span>}
                        {f.linesRemoved > 0 && <span style={{ fontSize: '11px', fontFamily: MONO, color: C.danger }}>-{f.linesRemoved}</span>}
                        <svg viewBox="0 0 16 16" width="12" height="12" fill={C.fgSubtle} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}><path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z" /></svg>
                      </div>
                      {open && (
                        <div style={{ padding: '10px 12px' }}>
                          {f.motivo && <div style={{ fontSize: '11px', color: C.fgMuted, marginBottom: '6px', fontStyle: 'italic' }}>{f.motivo}</div>}
                          <DiffView oldText={f.current} newText={f.contenido} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {!repoCtx && <Flash variant="attention">No repo context — Vektor can't publish. Analyze a repo in "Your Repository" to enable automatic PR creation.</Flash>}
                {repoCtx && !s.publishing && !s.published && !s.publishError && s.publishSteps.length === 0 && <p style={{ fontSize: '11px', color: C.fgSubtle, fontStyle: 'italic', marginTop: '6px' }}>Publishing automatically…</p>}
                {s.publishSteps.length > 0 && <div style={{ margin: '12px 0' }}><ProcessTask steps={s.publishSteps.map(function (ps) { return { id: ps.id, status: ps.status, description: ps.title || ps.description, details: ps.detail || ps.details, startedAt: ps.startedAt, finishedAt: ps.finishedAt }; })} isRunning={s.publishing} title="Publishing" /></div>}
                {s.publishError && <div><Flash variant="danger">{s.publishError}</Flash><button onClick={function () { publish(repoCtx); }} style={{ marginTop: '8px', padding: '5px 14px', borderRadius: '6px', border: '1px solid ' + C.border, background: C.canvas, color: C.fg, fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: F }}>Retry publish</button></div>}
                {s.published && <Flash variant="success">PR created automatically. <a href={s.published.url} target="_blank" rel="noopener" style={{ marginLeft: '8px', color: C.fg, fontWeight: '600' }}>View on GitHub →</a></Flash>}
              </div>
            )}
          </div>
        )}

        {/* ═══ QUEUE ═══ */}
        {queue && (queue.mode === 'autopilot' || (queue.tareas && queue.tareas.length > 0)) && (
          <BackgroundQueueView queue={queue} onCancel={handleCancelQueue} onResume={handleResumeQueue} cancelling={cancelling} />
        )}

        {/* ═══ PR REVIEWS ═══ */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid ' + C.border }}>
          <h3 style={H3}>Review Open Pull Requests</h3>
          {loadingPrs ? (
            <div style={{ padding: '16px 0', textAlign: 'center', color: C.fgMuted, fontSize: '13px' }}>Loading PRs…</div>
          ) : prs.length === 0 ? (
            <div style={{ padding: '16px 0', textAlign: 'center', color: C.fgSubtle, fontSize: '13px' }}>No open PRs.</div>
          ) : (
            prs.map(function (pr) {
              var isSel = selectedPr && selectedPr.number === pr.number && selectedPr.repo === pr.repo;
              return (
                <div key={pr.repo + '#' + pr.number} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', border: '1px solid ' + (isSel ? C.fg : C.border), borderRadius: '12px', background: '#fff', marginBottom: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.fg, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a href={pr.url} target="_blank" rel="noopener" style={{ fontSize: '13px', fontWeight: '600', color: C.fg, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pr.title}</a>
                    <div style={{ fontSize: '11px', color: C.fgMuted, marginTop: '2px' }}>{pr.owner}/{pr.repo} #{pr.number} · {timeAgo(pr.updated)}</div>
                  </div>
                  <button onClick={function () { runReview(pr); }} disabled={reviewingPr} style={{ flexShrink: 0, padding: '4px 10px', borderRadius: '6px', border: '1px solid ' + C.border, background: C.fg, color: '#fff', fontSize: '11px', fontWeight: '600', cursor: reviewingPr ? 'default' : 'pointer', fontFamily: F }}>{reviewingPr ? 'Reviewing…' : 'Review'}</button>
                </div>
              );
            })
          )}

          {selectedPr && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: C.fg, marginBottom: '8px' }}>Review of {selectedPr.repo} #{selectedPr.number}</div>
              {reviewingPr ? (
                <ProcessTask steps={[{ id: 1, status: 'done', description: 'Reading diff' }, { id: 2, status: 'active', description: 'AI analysis', startedAt: Date.now() }]} isRunning={true} title="Reviewing PR" />
              ) : review ? (
                <div>
                  <pre style={{ margin: 0, padding: '12px 14px', background: C.canvas, border: '1px solid ' + C.border, borderRadius: '12px', fontFamily: MONO, fontSize: '12px', lineHeight: '1.6', color: C.fg, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'auto', maxHeight: '320px' }}>{review}</pre>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button onClick={publishComment} disabled={publishingComment || commentPublished} style={{ padding: '5px 14px', borderRadius: '6px', border: '1px solid ' + C.border, background: commentPublished ? C.canvas : C.fg, color: commentPublished ? C.success : '#fff', fontSize: '12px', fontWeight: '600', cursor: commentPublished ? 'default' : 'pointer', fontFamily: F }}>{commentPublished ? 'Published ✓' : publishingComment ? 'Publishing…' : 'Publish comment'}</button>
                    <button onClick={function () { runReview(selectedPr); }} disabled={reviewingPr} style={{ padding: '5px 14px', borderRadius: '6px', border: '1px solid ' + C.border, background: C.canvas, color: C.fg, fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: F }}>Redo</button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
