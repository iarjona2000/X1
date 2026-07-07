import * as React from 'react';
import * as B from './backend.js';
import {
  fetchOpenPRs, fetchPRDiff, reviewPRDiff, publishPRComment,
  loadRepoAnalysis, runAutoBuild, runAutopilot, publishAutoBuild,
  getBackgroundQueue, cancelBackgroundQueue, resumeBackgroundQueue,
} from './github-agent.js';
import { ProcessLog } from './ProcessTimeline.jsx';
import { DiffView, diffCounts } from './DiffView.jsx';
import { FileAddedIcon, FileDiffIcon, ChevronDownIcon, ChevronUpIcon, GitBranchIcon, ClockIcon, SyncIcon, RocketIcon } from '@primer/octicons-react';

const F = "'Segoe UI', -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif";
const MONO = "'SF Mono', 'Cascadia Code', Consolas, monospace";

// ── Tokens de color de Primer (github.com), replicados a mano sin el runtime
// de @primer/react para no duplicar ~230KB de Emotion/styled-system en un
// sidepanel de extension. Ver ProcessTimeline.jsx para los mismos tokens
// aplicados al Timeline. ──
const C = {
  border: '#F2F1ED', canvasSubtle: '#F2F1ED', fg: '#26251E', fgMuted: '#9E94D5', fgSubtle: '#9E94D5',
  accent: '#26251E', accentSubtle: '#F2F1ED', agentDot: '#9B99C4',
  success: '#1A7F5A', successEmphasis: '#166B4C', successSubtle: '#E1F2EA', successBorder: '#3FA377',
  danger: '#C4383A', dangerEmphasis: '#A32E30', dangerSubtle: '#FBEAEA', dangerBorder: '#E3A8A9',
  attention: '#8A6432', attentionSubtle: '#F3E4CC', attentionBorder: '#C08532',
  neutralSubtle: '#F2F1ED',
};

const H3 = { fontSize: '14px', fontWeight: '600', color: C.fg, margin: '0 0 8px', padding: '0 0 8px', borderBottom: '1px solid ' + C.border };

// ═══════════════════════════════════════════════════════════════════════
// Store del constructor autonomo — a nivel de MODULO, no de componente.
// Cambiar de pestana desmonta <PRAgent>, pero las llamadas de red que ya
// estan en marcha (busquedas, panel de IA) siguen corriendo igual: si su
// progreso solo viviera en useState, React tira esas actualizaciones al
// vacio en un componente desmontado y el resultado final se pierde para
// siempre. Aqui build()/publish() son funciones de modulo que escriben en
// este store (persistido en localStorage); el componente solo se suscribe
// y renderiza lo que haya, así que sobrevive a cambios de pestaña e incluso
// a cerrar y reabrir el sidepanel (el trabajo en sí se corta si se cierra
// la pagina — eso es una limitacion real de Chrome, no del codigo — pero
// el registro de lo ya hecho no se pierde).
// ═══════════════════════════════════════════════════════════════════════
var STORE_KEY = 'x1_automation_state';
var store = { goal: '', steps: [], proposal: null, building: false, publishSteps: [], published: null, publishing: false, publishError: null };
var listeners = [];

// Sanea cualquier forma vieja/incompleta que pueda quedar en localStorage de
// una version anterior del codigo (p.ej. proposal sin "archivos", o con un
// shape distinto) — sin esto, un dato corrupto revienta el render con
// "Cannot read properties of undefined" y, como el dato corrupto sigue ahi,
// recargar la extension repite el mismo crash en bucle.
function sanitizeProposal(p) {
  if (!p || typeof p !== 'object') return null;
  return Object.assign({}, p, { archivos: Array.isArray(p.archivos) ? p.archivos : [] });
}

(function hydrate() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      var saved = JSON.parse(raw);
      store = Object.assign({}, store, saved, {
        building: false,
        publishing: false,
        proposal: sanitizeProposal(saved.proposal),
        steps: Array.isArray(saved.steps) ? saved.steps : [],
        publishSteps: Array.isArray(saved.publishSteps) ? saved.publishSteps : [],
      });
    }
  } catch (e) {}
})();

function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {}
}

function setStore(patch) {
  store = Object.assign({}, store, patch);
  persist();
  listeners.forEach(function (l) { l(store); });
}

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
    // Autonomo de verdad: si hay ficheros que publicar y un repo de
    // referencia, X1 publica la rama + PR sola, sin esperar un clic del
    // usuario. Si no hay repoCtx (nadie ha analizado un repo todavia) no hay
    // donde publicar, asi que se queda solo en propuesta.
    if (p && p.archivos && p.archivos.length && repoCtx) publish(repoCtx);
  }).catch(function (e) { setStore({ building: false, steps: upsertStep(store.steps, { id: 'fatal', title: 'Error inesperado: ' + (e && e.message), status: 'error' }) }); });
}

function publish(repoCtx) {
  var proposal = store.proposal;
  if (!proposal || !proposal.archivos.length || !repoCtx) return;
  setStore({ publishing: true, publishSteps: [], publishError: null });
  B.getGithubToken().then(function (token) {
    var branch = (repoCtx.meta && repoCtx.meta.default_branch) || 'main';
    return publishAutoBuild(token, repoCtx.owner, repoCtx.name, branch, proposal, function (s) { setStore({ publishSteps: upsertStep(store.publishSteps, s) }); });
  }).then(function (r) { setStore({ published: r, publishing: false }); })
    .catch(function (e) { setStore({ publishError: e.message || 'Error al publicar', publishing: false }); });
}

// Autopiloto: sin objetivo, sin fin. X1 decide el primer ciclo aqui mismo
// (feedback inmediato) y activa la cola en segundo plano para que siga
// decidiendo y construyendo por su cuenta, indefinidamente.
function startAutopilot(repoCtx) {
  if (store.building || !repoCtx) return;
  setStore({ building: true, goal: '', steps: [], proposal: null, published: null, publishError: null });
  runAutopilot(repoCtx, function (s) { setStore({ steps: upsertStep(store.steps, s) }); }).then(function (p) {
    setStore({ proposal: sanitizeProposal(p), building: false });
    if (p && p.archivos && p.archivos.length) publish(repoCtx);
  }).catch(function (e) { setStore({ building: false, steps: upsertStep(store.steps, { id: 'fatal', title: 'Error inesperado: ' + (e && e.message), status: 'error' }) }); });
}

// ── Componentes Primer a medida ──

var FLASH_PALETTE = {
  default: { bg: C.canvasSubtle, border: C.border, fg: C.fg },
  success: { bg: C.successSubtle, border: C.successBorder, fg: '#0F5C3E' },
  danger: { bg: C.dangerSubtle, border: C.dangerBorder, fg: '#7A2323' },
  attention: { bg: C.attentionSubtle, border: C.attentionBorder, fg: '#4A3418' },
};

function Flash({ variant = 'default', children, action }) {
  var p = FLASH_PALETTE[variant] || FLASH_PALETTE.default;
  return React.createElement('div', {
    style: {
      display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px',
      borderRadius: '4px', border: '1px solid ' + p.border, background: p.bg, color: p.fg,
      fontSize: '13px', lineHeight: '1.6', fontFamily: F,
    },
  },
    React.createElement('div', { style: { flex: 1 } }, children),
    action || null
  );
}

function Label({ children, variant = 'default' }) {
  var palette = {
    default: { bg: '#ffffff', border: C.border, fg: C.fgMuted },
    accent: { bg: C.accentSubtle, border: 'transparent', fg: C.accent },
    success: { bg: C.successSubtle, border: 'transparent', fg: C.success },
    danger: { bg: C.dangerSubtle, border: 'transparent', fg: C.danger },
    neutral: { bg: C.neutralSubtle, border: 'transparent', fg: C.fgMuted },
  }[variant];
  return React.createElement('span', {
    style: {
      display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: '500',
      padding: '1px 8px', borderRadius: '999px', border: '1px solid ' + palette.border,
      background: palette.bg, color: palette.fg, lineHeight: '1.6', whiteSpace: 'nowrap',
    },
  }, children);
}

function BranchTag({ children }) {
  return React.createElement('span', {
    style: {
      display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: MONO, fontSize: '12px',
      padding: '2px 8px', borderRadius: '4px', background: C.neutralSubtle, color: C.fg,
    },
  },
    React.createElement(GitBranchIcon, { size: 12, fill: C.fgMuted }),
    children
  );
}

function CodeBlock({ children, maxHeight }) {
  return React.createElement('pre', {
    style: {
      margin: 0, padding: '12px 14px', background: C.canvasSubtle, border: '1px solid ' + C.border,
      borderRadius: '4px', fontFamily: MONO, fontSize: '12px', lineHeight: '1.6', color: C.fg,
      whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'auto', maxHeight: maxHeight || '260px',
    },
  }, children);
}

function timeAgo(ts) {
  var d = Date.now() - new Date(ts).getTime();
  if (d < 3600000) return Math.floor(d / 60000) + 'm';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h';
  return Math.floor(d / 86400000) + 'd';
}

// Muestra el progreso acumulado de la cola que procesa el service worker en
// segundo plano (una tarea cada 15-25 min, ver 'AUTOMATIZACION EN SEGUNDO
// PLANO' en background/service-worker.js). Por cada tarea completada se ve
// que sectores/IAs trabajaron en ella (Desarrollo -> Auditoria de Codigo ->
// Refinamiento), los ficheros tocados, lineas +/- y el enlace al PR — asi
// queda claro que no es una sola llamada a IA sino una orquestacion real que
// se reparte en el tiempo.
function BackgroundQueueView({ queue, onCancel, onResume, cancelling }) {
  var isAutopilot = queue.mode === 'autopilot';
  var list = isAutopilot ? (queue.history || []) : (queue.tareas || []);
  var done = list.filter(function (t) { return t.status === 'done'; }).length;
  var errored = list.filter(function (t) { return t.status === 'error'; }).length;
  var pending = isAutopilot ? 0 : list.filter(function (t) { return t.status === 'pending'; }).length;
  var active = list.filter(function (t) { return t.status === 'active'; }).length;
  var finished = !isAutopilot && pending === 0 && active === 0;
  var isPaused = queue.status === 'paused';
  // El historial de autopiloto se muestra del mas reciente al mas antiguo
  // (lo que se acaba de hacer importa mas que el primer ciclo de hace horas).
  var displayList = isAutopilot ? list.slice().reverse() : list;

  return React.createElement('div', { style: { marginBottom: '16px' } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
      React.createElement('h3', { style: Object.assign({}, H3, { flex: 1, border: 'none', margin: 0, padding: 0 }) }, isAutopilot ? 'Autopiloto — historial de ciclos' : 'Cola de automatizacion en segundo plano'),
      isPaused && React.createElement('button', {
        onClick: onResume,
        style: { fontSize: '11px', color: C.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: F, fontWeight: '600' },
      }, 'Reactivar'),
      React.createElement('button', {
        onClick: onCancel, disabled: cancelling,
        style: { fontSize: '11px', color: C.danger, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: F },
      }, cancelling ? 'Cancelando…' : (isAutopilot ? 'Desactivar autopiloto' : 'Cancelar cola'))
    ),
    isPaused && React.createElement('div', { style: { marginBottom: '10px' } },
      React.createElement(Flash, { variant: 'attention' },
        'Autopiloto en pausa: ' + (queue.consecutiveFailures || 0) + ' ciclos seguidos fallaron (circuit breaker de seguridad, para no gastar llamadas de IA toda la noche en un fallo persistente). Revisa el ultimo error abajo y pulsa "Reactivar" cuando este resuelto.'
      )
    ),
    React.createElement('div', { style: { fontSize: '11px', color: C.fgMuted, marginBottom: '10px', lineHeight: '1.6' } },
      isAutopilot
        ? (done + ' ciclo(s) completado(s)' + (errored ? ', ' + errored + ' con error' : '') + ' · sin fin — X1 sigue decidiendo su proximo objetivo cada 15-25 min, siga o no el sidepanel abierto — ultima actividad hace ' + timeAgo(queue.updatedAt) + '.')
        : finished
          ? ('Cola completada: ' + done + ' Pull Request(s) creados' + (errored ? ', ' + errored + ' con error' : '') + '.')
          : (done + ' completada(s) · ' + pending + ' pendiente(s) · X1 procesa una tarea cada 15-25 min, siga o no el sidepanel abierto — ultima actividad hace ' + timeAgo(queue.updatedAt) + '.')
    ),
    React.createElement('div', { style: { border: '1px solid ' + C.border, borderRadius: '4px', overflow: 'hidden' } },
      displayList.map(function (t, i) {
        return React.createElement(QueueTaskRow, { key: i, tarea: t, index: isAutopilot ? (displayList.length - i) : i, isLast: i === displayList.length - 1 });
      })
    )
  );
}

function QueueTaskRow({ tarea, index, isLast }) {
  var color = tarea.status === 'done' ? C.success : tarea.status === 'error' ? C.danger : tarea.status === 'active' ? C.accent : C.fgSubtle;
  var statusLabel = tarea.status === 'done' ? 'completada' : tarea.status === 'error' ? 'error' : tarea.status === 'active' ? 'en curso' : 'en cola';

  return React.createElement('div', { style: { padding: '8px 12px', borderBottom: isLast ? 'none' : '1px solid ' + C.border } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
      tarea.status === 'active'
        ? React.createElement(SyncIcon, { size: 12, fill: color, style: { animation: 'spin 1s linear infinite' } })
        : React.createElement(ClockIcon, { size: 12, fill: color }),
      React.createElement('span', { style: { fontSize: '12px', fontFamily: MONO, color: C.fg, flex: 1 } }, (index + 1) + '. ' + tarea.titulo),
      React.createElement(Label, { variant: tarea.status === 'done' ? 'success' : tarea.status === 'error' ? 'danger' : 'neutral' }, statusLabel)
    ),
    tarea.motivo && React.createElement('div', { style: { fontSize: '11px', color: C.fgMuted, marginTop: '2px', marginLeft: '18px', fontStyle: 'italic' } }, tarea.motivo),

    // Sectores/IAs que trabajaron en esta tarea (solo si ya se proceso).
    tarea.sectors && tarea.sectors.length > 0 && React.createElement('div', { style: { marginTop: '4px', marginLeft: '18px', display: 'flex', flexWrap: 'wrap', gap: '4px' } },
      tarea.sectors.map(function (s, i) {
        return React.createElement('span', {
          key: i, title: s.model || s.provider || '',
          style: { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: C.neutralSubtle, color: C.fgMuted },
        },
          React.createElement('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: C.agentDot, flexShrink: 0 } }),
          s.fase + ': ' + (s.model || s.provider || 'IA')
        );
      })
    ),

    tarea.status === 'done' && tarea.result && React.createElement('div', { style: { marginTop: '4px', marginLeft: '18px', fontSize: '11px', color: C.fgMuted, display: 'flex', alignItems: 'center', gap: '8px' } },
      React.createElement('span', { style: { color: C.success } }, '+' + (tarea.result.linesAdded || 0)),
      React.createElement('span', { style: { color: C.danger } }, '-' + (tarea.result.linesRemoved || 0)),
      React.createElement('span', null, (tarea.result.files || []).join(', ')),
      tarea.result.prUrl && React.createElement('a', { href: tarea.result.prUrl, target: '_blank', rel: 'noopener', style: { color: C.accent, fontWeight: '600' } }, 'Ver PR →'),
      React.createElement('span', null, 'hace ' + timeAgo(tarea.result.completedAt))
    ),
    tarea.status === 'error' && tarea.result && React.createElement('div', { style: { marginTop: '4px', marginLeft: '18px', fontSize: '11px', color: C.danger } }, tarea.result.error)
  );
}

export function PRAgent({ githubUser, onGoToRepo }) {
  var isGh = githubUser && githubUser.login && githubUser.login !== 'invitado';
  var s = useAutomationStore();
  var [repoCtx, setRepoCtx] = React.useState(null);
  var [expandedFile, setExpandedFile] = React.useState(null);
  var [queue, setQueue] = React.useState(null);
  var [cancelling, setCancelling] = React.useState(false);

  // Cola de automatizacion en segundo plano: la procesa el service worker
  // via chrome.alarms (una tarea cada 15-25 min), asi que puede avanzar con
  // el sidepanel cerrado. La leemos al abrir y nos suscribimos a cambios en
  // storage para que, si el panel esta abierto cuando el SW completa una
  // tarea, el progreso se actualice solo, sin recargar.
  React.useEffect(function () {
    getBackgroundQueue().then(setQueue);
    function onStorageChange(changes, area) {
      if (area === 'local' && changes.x1_automation_queue) {
        try { setQueue(changes.x1_automation_queue.newValue ? JSON.parse(changes.x1_automation_queue.newValue) : null); }
        catch (e) {}
      }
    }
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(onStorageChange);
      return function () { chrome.storage.onChanged.removeListener(onStorageChange); };
    }
  }, []);

  function handleCancelQueue() {
    setCancelling(true);
    cancelBackgroundQueue().then(function () { setQueue(null); setCancelling(false); });
  }

  function handleResumeQueue() {
    resumeBackgroundQueue().then(function () { getBackgroundQueue().then(setQueue); });
  }

  React.useEffect(function () { setRepoCtx(loadRepoAnalysis()); }, []);

  // ── Revision de PRs abiertos (secundario) ──
  var [prs, setPrs] = React.useState([]);
  var [loadingPrs, setLoadingPrs] = React.useState(false);
  var [selectedPr, setSelectedPr] = React.useState(null);
  var [reviewingPr, setReviewingPr] = React.useState(false);
  var [review, setReview] = React.useState('');
  var [publishingComment, setPublishingComment] = React.useState(false);
  var [commentPublished, setCommentPublished] = React.useState(false);

  React.useEffect(function () {
    if (!isGh) return;
    setLoadingPrs(true);
    B.getGithubToken().then(function (token) {
      if (!token) { setLoadingPrs(false); return; }
      fetchOpenPRs(token).then(function (list) { setPrs(list || []); setLoadingPrs(false); });
    });
  }, [githubUser]);

  function runReview(pr) {
    setSelectedPr(pr); setReview(''); setCommentPublished(false); setReviewingPr(true);
    B.getGithubToken().then(function (token) {
      return fetchPRDiff(token, pr.owner, pr.repo, pr.number);
    }).then(function (diff) {
      if (!diff) { setReview('No pude obtener el diff de este PR.'); setReviewingPr(false); return; }
      return reviewPRDiff(pr.title, diff).then(function (text) {
        setReview(text || 'El motor no devolvio una revision. Reintentalo en unos segundos.');
        setReviewingPr(false);
      });
    }).catch(function () { setReview('Error al revisar el PR.'); setReviewingPr(false); });
  }

  function publishComment() {
    if (!selectedPr || !review) return;
    setPublishingComment(true);
    B.getGithubToken().then(function (token) {
      return publishPRComment(token, selectedPr.owner, selectedPr.repo, selectedPr.number, 'Revision de X1\n\n' + review);
    }).then(function (ok) { setCommentPublished(ok); setPublishingComment(false); });
  }

  if (!isGh) {
    return React.createElement('div', { style: { padding: '32px 16px', textAlign: 'center', color: C.fgMuted, fontSize: '14px', lineHeight: '1.6', fontFamily: F } },
      'Conecta tu cuenta de GitHub para que X1 pueda investigar, proponer cambios y publicarlos.');
  }

  var proposal = s.proposal;
  var proposalFiles = (proposal && proposal.archivos) || [];

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto', fontFamily: F, padding: '16px' } },

    React.createElement('h3', { style: H3 }, 'Automatizacion'),

    // ── Contexto de repositorio ──
    repoCtx
      ? React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' } },
          React.createElement('span', { style: { fontSize: '12px', color: C.fgMuted } }, 'Contexto:'),
          React.createElement(BranchTag, null, repoCtx.repo),
          React.createElement(Label, { variant: 'accent' }, 'analizado hace ' + timeAgo(repoCtx.at)),
          onGoToRepo && React.createElement('button', {
            onClick: onGoToRepo,
            style: { marginLeft: 'auto', fontSize: '11px', color: C.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: F },
          }, 'Cambiar')
        )
      : React.createElement(Flash, { variant: 'attention' },
          'No hay un repositorio de referencia. X1 puede investigar y proponer igualmente, pero no podra publicar una rama/PR hasta que ',
          onGoToRepo
            ? React.createElement('a', { href: '#', onClick: function (e) { e.preventDefault(); onGoToRepo(); }, style: { color: C.accent } }, 'analices un repositorio en "Tu Repositorio"')
            : 'analices un repositorio en "Tu Repositorio"',
          '.'
        ),

    // ── Autopiloto: sin objetivo, sin fin ──
    (!queue || queue.mode !== 'autopilot')
      ? React.createElement('div', { style: { marginTop: '14px', padding: '12px 14px', border: '1px solid ' + C.border, borderRadius: '4px', background: C.canvasSubtle } },
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
            React.createElement(RocketIcon, { size: 14, fill: C.accent }),
            React.createElement('span', { style: { fontSize: '13px', fontWeight: '600', color: C.fg } }, 'Autopiloto')
          ),
          React.createElement('div', { style: { fontSize: '12px', color: C.fgMuted, marginBottom: '10px', lineHeight: '1.6' } },
            'X1 decide por si mismo que construir, sin que le des ningun objetivo, y no se detiene: analiza el repositorio, elige la mejora mas valiosa (sector Estrategia), la implementa (Desarrollo → Auditoria de Codigo → Refinamiento) y publica el PR — luego repite, indefinidamente, un ciclo cada 15-25 minutos.'
          ),
          React.createElement('button', {
            onClick: function () { startAutopilot(repoCtx); }, disabled: s.building || !repoCtx,
            style: {
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5.6px 15px', borderRadius: '4px', border: '1px solid rgba(27,31,36,0.15)',
              background: s.building || !repoCtx ? C.canvasSubtle : C.accent,
              color: s.building || !repoCtx ? C.fgSubtle : '#ffffff',
              fontSize: '14px', fontWeight: '500', cursor: s.building || !repoCtx ? 'default' : 'pointer', fontFamily: F,
            },
          }, React.createElement(RocketIcon, { size: 12, fill: 'currentColor' }), s.building ? 'Decidiendo…' : 'Activar autopiloto')
        )
      : React.createElement(Flash, { variant: 'success' },
          React.createElement(RocketIcon, { size: 12, fill: C.success }), ' Autopiloto en marcha desde hace ' + timeAgo(queue.createdAt) + ' — X1 sigue decidiendo y construyendo por su cuenta, sin limite de tiempo.'
        ),

    // ── Input de objetivo (opcional — si prefieres dirigir tu algo concreto) ──
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0 10px' } },
      React.createElement('div', { style: { flex: 1, height: '1px', background: C.border } }),
      React.createElement('span', { style: { fontSize: '11px', color: C.fgSubtle } }, 'o dale un objetivo concreto'),
      React.createElement('div', { style: { flex: 1, height: '1px', background: C.border } })
    ),
    React.createElement('div', { style: { marginTop: '14px', marginBottom: '14px' } },
      React.createElement('textarea', {
        value: s.goal, onChange: function (e) { setGoal(e.target.value); }, disabled: s.building,
        placeholder: 'Que quieres que X1 construya o investigue? Ej: "anade tests unitarios a github-agent.js", "investiga como integrar Stripe", "arregla el bug de login"…',
        rows: 3,
        style: {
          width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '4px', border: '1px solid ' + C.border,
          fontSize: '13px', fontFamily: F, resize: 'vertical', outline: 'none', color: C.fg, lineHeight: '1.5',
        },
      }),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' } },
        React.createElement('button', {
          onClick: function () { build(repoCtx); }, disabled: s.building || !s.goal.trim(),
          style: {
            padding: '5.6px 15px', borderRadius: '4px', border: '1px solid rgba(27,31,36,0.15)',
            background: s.building || !s.goal.trim() ? C.canvasSubtle : C.successEmphasis,
            color: s.building || !s.goal.trim() ? C.fgSubtle : '#ffffff',
            fontSize: '14px', fontWeight: '500', cursor: s.building || !s.goal.trim() ? 'default' : 'pointer', fontFamily: F,
          },
        }, s.building ? 'Construyendo…' : 'Construir y publicar solo, sin preguntar'),
        React.createElement('span', { style: { fontSize: '11px', color: C.fgSubtle } }, 'GitHub · npm · Stack Overflow · lectura de paginas web · panel de IAs'),
        s.building && React.createElement('span', { style: { fontSize: '11px', color: C.accent, marginLeft: 'auto' } }, 'Sigue corriendo aunque cambies de pestana')
      )
    ),

    // ── Proceso en vivo del constructor ──
    s.steps.length > 0 && React.createElement('div', { style: { marginBottom: '16px' } },
      React.createElement(ProcessLog, { steps: s.steps, title: s.building ? 'Trabajando en directo' : 'Proceso completado' })
    ),

    // ── Propuesta ──
    proposal && React.createElement('div', { style: { marginBottom: '16px' } },
      proposalFiles.length === 0
        ? React.createElement(Flash, { variant: proposal.error ? 'danger' : 'default' },
            proposal.directorRazon
              ? 'El sector Direccion rechazo publicar este ciclo: ' + proposal.directorRazon
              : proposal.error
                ? 'El panel de IA no devolvio una propuesta valida para ninguna tarea. Reintenta describiendo el objetivo con mas detalle, o analiza primero el repositorio para que X1 tenga mas contexto.'
                : (proposal.resumen || 'Investigacion completada — revisa los resultados en el proceso de arriba.')
          )
        : React.createElement(React.Fragment, null,
            React.createElement('h3', { style: H3 }, 'Propuesta de X1'),
            React.createElement('div', { style: { fontSize: '14px', fontWeight: '600', color: C.fg, marginBottom: '4px' } }, proposal.titulo_pr),
            React.createElement('div', { style: { fontSize: '12px', color: C.fgMuted, marginBottom: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap' } }, proposal.descripcion_pr),

            proposalFiles.map(function (f) {
              var open = expandedFile === f.path;
              var FileGlyph = f.exists ? FileDiffIcon : FileAddedIcon;
              var counts = diffCounts(f.current, f.contenido);
              return React.createElement('div', {
                key: f.path,
                style: { border: '1px solid ' + C.border, borderRadius: '8px', marginBottom: '6px', overflow: 'hidden', background: '#FFFFFF' },
              },
                React.createElement('div', {
                  onClick: function () { setExpandedFile(open ? null : f.path); },
                  style: { display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', cursor: 'pointer' },
                },
                  React.createElement(FileGlyph, { size: 12, fill: C.fgMuted }),
                  React.createElement('span', { style: { fontFamily: MONO, fontSize: '11px', color: C.fg, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, f.path),
                  React.createElement('span', { style: { fontFamily: MONO, fontSize: '11px', color: C.success, fontWeight: '600' } }, '+' + counts.added),
                  React.createElement('span', { style: { fontFamily: MONO, fontSize: '11px', color: C.danger, fontWeight: '600' } }, '-' + counts.removed),
                  React.createElement((open ? ChevronUpIcon : ChevronDownIcon), { size: 12, fill: C.fgSubtle })
                ),
                open && React.createElement('div', { style: { padding: '8px 12px' } },
                  f.motivo && React.createElement('div', { style: { fontSize: '11px', color: C.fgMuted, marginBottom: '6px', fontStyle: 'italic' } }, f.motivo),
                  React.createElement(DiffView, { oldText: f.current, newText: f.contenido })
                )
              );
            }),

            !repoCtx && React.createElement(Flash, { variant: 'attention' }, 'No hay un repositorio de referencia, asi que X1 se queda en la propuesta — analiza un repositorio en "Tu Repositorio" para que tambien publique la rama y el Pull Request sin preguntar.'),

            repoCtx && !s.publishing && !s.published && !s.publishError && s.publishSteps.length === 0 && React.createElement('div', { style: { fontSize: '11px', color: C.fgSubtle, fontStyle: 'italic' } }, 'Publicando automaticamente, sin confirmacion…'),

            s.publishSteps.length > 0 && React.createElement('div', { style: { margin: '12px 0' } },
              React.createElement(ProcessLog, { steps: s.publishSteps, title: 'Publicando automaticamente' })
            ),

            s.publishError && React.createElement('div', { style: { marginBottom: '12px' } },
              React.createElement(Flash, { variant: 'danger' }, s.publishError),
              React.createElement('button', {
                onClick: function () { publish(repoCtx); },
                style: { marginTop: '8px', padding: '5.6px 15px', borderRadius: '4px', border: '1px solid ' + C.border, background: C.canvasSubtle, color: C.fg, fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: F },
              }, 'Reintentar publicacion')
            ),

            s.published && React.createElement(Flash, { variant: 'success' },
              'Pull Request creado y publicado automaticamente, sin confirmacion.',
              React.createElement('a', { href: s.published.url, target: '_blank', rel: 'noopener', style: { marginLeft: '8px', color: C.success, fontWeight: '600' } }, 'Ver en GitHub →')
            )
          )
    ),

    // ── Cola de automatizacion en segundo plano ──
    queue && ((queue.mode === 'autopilot') || (queue.tareas && queue.tareas.length > 0)) && React.createElement(BackgroundQueueView, { queue: queue, onCancel: handleCancelQueue, onResume: handleResumeQueue, cancelling: cancelling }),

    // ── Revision de PRs abiertos (secundario) ──
    React.createElement('div', { style: { marginTop: '24px', paddingTop: '16px', borderTop: '1px solid ' + C.border } },
      React.createElement('h3', { style: H3 }, 'Revisar Pull Requests abiertos'),

      loadingPrs
        ? React.createElement('div', { style: { padding: '16px 0', textAlign: 'center', color: C.fgMuted, fontSize: '13px' } }, 'Cargando PRs abiertos…')
        : React.createElement(React.Fragment, null,
            prs.length === 0
              ? React.createElement('div', { style: { padding: '16px 0', textAlign: 'center', color: C.fgSubtle, fontSize: '13px' } }, 'No tienes Pull Requests abiertos.')
              : prs.map(function (pr) {
                  var isSel = selectedPr && selectedPr.number === pr.number && selectedPr.repo === pr.repo;
                  return React.createElement('div', {
                    key: pr.repo + '#' + pr.number,
                    style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', border: '1px solid ' + (isSel ? C.accent : C.border), borderRadius: '4px', background: '#ffffff', marginBottom: '8px' },
                  },
                    React.createElement('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: C.success, flexShrink: 0 } }),
                    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                      React.createElement('a', { href: pr.url, target: '_blank', rel: 'noopener', style: { fontSize: '13px', fontWeight: '600', color: C.accent, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, pr.title),
                      React.createElement('div', { style: { fontSize: '11px', color: C.fgMuted, marginTop: '2px' } }, pr.owner + '/' + pr.repo + ' #' + pr.number + ' · ' + timeAgo(pr.updated))
                    ),
                    React.createElement('button', {
                      onClick: function () { runReview(pr); }, disabled: reviewingPr,
                      style: { flexShrink: 0, padding: '5.6px 15px', borderRadius: '4px', border: '1px solid rgba(27,31,36,0.15)', background: reviewingPr ? C.canvasSubtle : C.successEmphasis, color: reviewingPr ? C.fgSubtle : '#ffffff', fontSize: '12px', fontWeight: '500', cursor: reviewingPr ? 'default' : 'pointer', fontFamily: F },
                    }, 'Revisar')
                  );
                }),

            selectedPr && React.createElement('div', { style: { marginTop: '12px' } },
              React.createElement('div', { style: { fontSize: '13px', fontWeight: '600', color: C.fg, marginBottom: '8px' } }, 'Revision de ' + selectedPr.repo + ' #' + selectedPr.number),
              reviewingPr
                ? React.createElement(ProcessLog, { steps: [
                    { id: 1, title: 'Leyendo diff', status: 'done' },
                    { id: 2, title: 'Consultando panel de IA + arbitro', status: 'active', startedAt: Date.now() },
                  ] })
                : review
                ? React.createElement('div', null,
                    React.createElement(CodeBlock, { maxHeight: '320px' }, review),
                    React.createElement('div', { style: { display: 'flex', gap: '8px', marginTop: '10px' } },
                      React.createElement('button', {
                        onClick: publishComment, disabled: publishingComment || commentPublished,
                        style: { padding: '5.6px 15px', borderRadius: '4px', border: '1px solid rgba(27,31,36,0.15)', background: commentPublished ? C.canvasSubtle : C.successEmphasis, color: commentPublished ? C.success : '#ffffff', fontSize: '12px', fontWeight: '500', cursor: commentPublished ? 'default' : 'pointer', fontFamily: F },
                      }, commentPublished ? 'Publicado en el PR' : publishingComment ? 'Publicando…' : 'Publicar comentario'),
                      React.createElement('button', {
                        onClick: function () { runReview(selectedPr); }, disabled: reviewingPr,
                        style: { padding: '5.6px 15px', borderRadius: '4px', border: '1px solid ' + C.border, background: C.canvasSubtle, color: C.fg, fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: F },
                      }, 'Rehacer')
                    )
                  )
                : null
            )
          )
    )
  );
}
