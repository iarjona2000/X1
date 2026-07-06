import * as React from 'react';
import * as B from './backend.js';
import {
  fetchOpenPRs, fetchPRDiff, reviewPRDiff, publishPRComment,
  loadRepoAnalysis, runAutoBuild, publishAutoBuild,
} from './github-agent.js';
import { ProcessLog } from './ProcessTimeline.jsx';

const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";
const MONO = "'SF Mono', 'Cascadia Code', Consolas, monospace";

// ── Tokens de color de Primer (github.com), replicados a mano sin el runtime
// de @primer/react para no duplicar ~230KB de Emotion/styled-system en un
// sidepanel de extension. Ver ProcessTimeline.jsx para los mismos tokens
// aplicados al Timeline. ──
const C = {
  border: '#d0d7de', canvasSubtle: '#f6f8fa', fg: '#1f2328', fgMuted: '#59636e', fgSubtle: '#818b98',
  accent: '#0969da', accentSubtle: '#ddf4ff',
  success: '#1a7f37', successEmphasis: '#1f883d', successSubtle: '#dafbe1', successBorder: '#4ac26b',
  danger: '#d1242f', dangerEmphasis: '#cf222e', dangerSubtle: '#ffebe9', dangerBorder: '#ff8182',
  attention: '#9a6700', attentionSubtle: '#fff8c5', attentionBorder: '#d4a72c',
  neutralSubtle: '#eaeef2',
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

// ── Componentes Primer a medida ──

var FLASH_PALETTE = {
  default: { bg: C.canvasSubtle, border: C.border, fg: C.fg },
  success: { bg: C.successSubtle, border: C.successBorder, fg: '#116329' },
  danger: { bg: C.dangerSubtle, border: C.dangerBorder, fg: '#82071e' },
  attention: { bg: C.attentionSubtle, border: C.attentionBorder, fg: '#4d3800' },
};

function Flash({ variant = 'default', children, action }) {
  var p = FLASH_PALETTE[variant] || FLASH_PALETTE.default;
  return React.createElement('div', {
    style: {
      display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px',
      borderRadius: '6px', border: '1px solid ' + p.border, background: p.bg, color: p.fg,
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
      padding: '2px 8px', borderRadius: '6px', background: C.neutralSubtle, color: C.fg,
    },
  },
    React.createElement('svg', { viewBox: '0 0 16 16', width: '12', height: '12', fill: C.fgMuted },
      React.createElement('path', { d: 'M9.5 3.25a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zm-6 0a.75.75 0 101.5 0 .75.75 0 00-1.5 0zm8.25-.75a.75.75 0 100 1.5.75.75 0 000-1.5zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5z' })
    ),
    children
  );
}

function CodeBlock({ children, maxHeight }) {
  return React.createElement('pre', {
    style: {
      margin: 0, padding: '12px 14px', background: C.canvasSubtle, border: '1px solid ' + C.border,
      borderRadius: '6px', fontFamily: MONO, fontSize: '12px', lineHeight: '1.6', color: C.fg,
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

export function PRAgent({ githubUser, onGoToRepo }) {
  var isGh = githubUser && githubUser.login && githubUser.login !== 'invitado';
  var s = useAutomationStore();
  var [repoCtx, setRepoCtx] = React.useState(null);
  var [expandedFile, setExpandedFile] = React.useState(null);

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

    // ── Input de objetivo ──
    React.createElement('div', { style: { marginTop: '14px', marginBottom: '14px' } },
      React.createElement('textarea', {
        value: s.goal, onChange: function (e) { setGoal(e.target.value); }, disabled: s.building,
        placeholder: 'Que quieres que X1 construya o investigue? Ej: "anade tests unitarios a github-agent.js", "investiga como integrar Stripe", "arregla el bug de login"…',
        rows: 3,
        style: {
          width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '6px', border: '1px solid ' + C.border,
          fontSize: '13px', fontFamily: F, resize: 'vertical', outline: 'none', color: C.fg, lineHeight: '1.5',
        },
      }),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' } },
        React.createElement('button', {
          onClick: function () { build(repoCtx); }, disabled: s.building || !s.goal.trim(),
          style: {
            padding: '6px 16px', borderRadius: '6px', border: '1px solid rgba(27,31,36,0.15)',
            background: s.building || !s.goal.trim() ? C.canvasSubtle : C.successEmphasis,
            color: s.building || !s.goal.trim() ? C.fgSubtle : '#ffffff',
            fontSize: '13px', fontWeight: '600', cursor: s.building || !s.goal.trim() ? 'default' : 'pointer', fontFamily: F,
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
            proposal.error ? 'El panel de IA no devolvio una propuesta valida para ninguna tarea. Reintenta describiendo el objetivo con mas detalle, o analiza primero el repositorio para que X1 tenga mas contexto.' : (proposal.resumen || 'Investigacion completada — revisa los resultados en el proceso de arriba.')
          )
        : React.createElement(React.Fragment, null,
            React.createElement('h3', { style: H3 }, 'Propuesta de X1'),
            React.createElement('div', { style: { fontSize: '14px', fontWeight: '600', color: C.fg, marginBottom: '4px' } }, proposal.titulo_pr),
            React.createElement('div', { style: { fontSize: '12px', color: C.fgMuted, marginBottom: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap' } }, proposal.descripcion_pr),

            proposalFiles.map(function (f) {
              var open = expandedFile === f.path;
              return React.createElement('div', { key: f.path, style: { border: '1px solid ' + C.border, borderRadius: '6px', marginBottom: '8px', overflow: 'hidden' } },
                React.createElement('div', {
                  onClick: function () { setExpandedFile(open ? null : f.path); },
                  style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: C.canvasSubtle, cursor: 'pointer' },
                },
                  React.createElement('span', { style: { fontFamily: MONO, fontSize: '12px', color: C.fg, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, f.path),
                  React.createElement(Label, { variant: f.exists ? 'attention' : 'success' }, f.exists ? 'modifica' : 'nuevo'),
                  React.createElement('span', { style: { fontSize: '11px', color: C.fgSubtle } }, open ? '▲' : '▼')
                ),
                open && React.createElement('div', { style: { padding: '10px 12px' } },
                  f.motivo && React.createElement('div', { style: { fontSize: '12px', color: C.fgMuted, marginBottom: '8px', fontStyle: 'italic' } }, f.motivo),
                  React.createElement(CodeBlock, null, f.contenido)
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
                style: { marginTop: '8px', padding: '5px 14px', borderRadius: '6px', border: '1px solid ' + C.border, background: C.canvasSubtle, color: C.fg, fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: F },
              }, 'Reintentar publicacion')
            ),

            s.published && React.createElement(Flash, { variant: 'success' },
              'Pull Request creado y publicado automaticamente, sin confirmacion.',
              React.createElement('a', { href: s.published.url, target: '_blank', rel: 'noopener', style: { marginLeft: '8px', color: C.success, fontWeight: '600' } }, 'Ver en GitHub →')
            )
          )
    ),

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
                    style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: '1px solid ' + (isSel ? C.accent : C.border), borderRadius: '6px', background: '#ffffff', marginBottom: '8px' },
                  },
                    React.createElement('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: C.success, flexShrink: 0 } }),
                    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                      React.createElement('a', { href: pr.url, target: '_blank', rel: 'noopener', style: { fontSize: '13px', fontWeight: '600', color: C.accent, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, pr.title),
                      React.createElement('div', { style: { fontSize: '11px', color: C.fgMuted, marginTop: '2px' } }, pr.owner + '/' + pr.repo + ' #' + pr.number + ' · ' + timeAgo(pr.updated))
                    ),
                    React.createElement('button', {
                      onClick: function () { runReview(pr); }, disabled: reviewingPr,
                      style: { flexShrink: 0, padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(27,31,36,0.15)', background: reviewingPr ? C.canvasSubtle : C.successEmphasis, color: reviewingPr ? C.fgSubtle : '#ffffff', fontSize: '11px', fontWeight: '600', cursor: reviewingPr ? 'default' : 'pointer', fontFamily: F },
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
                        style: { padding: '5px 14px', borderRadius: '6px', border: '1px solid rgba(27,31,36,0.15)', background: commentPublished ? C.canvasSubtle : C.successEmphasis, color: commentPublished ? C.success : '#ffffff', fontSize: '12px', fontWeight: '600', cursor: commentPublished ? 'default' : 'pointer', fontFamily: F },
                      }, commentPublished ? 'Publicado en el PR' : publishingComment ? 'Publicando…' : 'Publicar comentario'),
                      React.createElement('button', {
                        onClick: function () { runReview(selectedPr); }, disabled: reviewingPr,
                        style: { padding: '5px 14px', borderRadius: '6px', border: '1px solid ' + C.border, background: C.canvasSubtle, color: C.fg, fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: F },
                      }, 'Rehacer')
                    )
                  )
                : null
            )
          )
    )
  );
}
