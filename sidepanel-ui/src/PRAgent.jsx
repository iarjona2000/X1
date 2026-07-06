import * as React from 'react';
import * as B from './backend.js';
import { fetchOpenPRs, fetchPRDiff, reviewPRDiff, publishPRComment } from './github-agent.js';

const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";

const H3 = { fontSize: '14px', fontWeight: '600', color: '#1f2328', margin: '0 0 8px', padding: '0 0 8px', borderBottom: '1px solid #d0d7de' };

function timeAgo(ts) {
  var d = Date.now() - new Date(ts).getTime();
  if (d < 3600000) return Math.floor(d / 60000) + 'm';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h';
  return Math.floor(d / 86400000) + 'd';
}

// Pasos del proceso de revision (3 IAs + arbitro), estilo Primer.
function ReviewProcess() {
  var steps = ['Leyendo diff', 'Consultando 3 IAs', 'Arbitro sintetiza', 'Generando revision'];
  return React.createElement('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '10px 0' } },
    steps.map(function (s, i) {
      return React.createElement('span', {
        key: i,
        style: {
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontSize: '11px', color: '#59636e', padding: '4px 10px',
          border: '1px solid #d0d7de', borderRadius: '999px', background: '#ffffff',
        },
      },
        React.createElement('span', { style: { width: '6px', height: '6px', borderRadius: '50%', background: '#0969da', animation: 'pulse 1s infinite' } }),
        s
      );
    })
  );
}

export function PRAgent({ githubUser }) {
  const [prs, setPrs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState(null);
  const [reviewing, setReviewing] = React.useState(false);
  const [review, setReview] = React.useState('');
  const [publishing, setPublishing] = React.useState(false);
  const [published, setPublished] = React.useState(false);

  const isGh = githubUser && githubUser.login && githubUser.login !== 'invitado';

  React.useEffect(function () {
    if (!isGh) return;
    setLoading(true);
    B.getGithubToken().then(function (token) {
      if (!token) { setLoading(false); return; }
      fetchOpenPRs(token).then(function (list) { setPrs(list); setLoading(false); });
    });
  }, [githubUser]);

  function runReview(pr) {
    setSelected(pr); setReview(''); setPublished(false); setReviewing(true);
    B.getGithubToken().then(function (token) {
      return fetchPRDiff(token, pr.owner, pr.repo, pr.number);
    }).then(function (diff) {
      if (!diff) { setReview('No pude obtener el diff de este PR.'); setReviewing(false); return; }
      return reviewPRDiff(pr.title, diff).then(function (text) {
        setReview(text || 'El motor no devolvio una revision. Reintentalo en unos segundos.');
        setReviewing(false);
      });
    }).catch(function () { setReview('Error al revisar el PR.'); setReviewing(false); });
  }

  function publish() {
    if (!selected || !review) return;
    setPublishing(true);
    B.getGithubToken().then(function (token) {
      return publishPRComment(token, selected.owner, selected.repo, selected.number, 'Revision de X1\n\n' + review);
    }).then(function (ok) { setPublished(ok); setPublishing(false); });
  }

  var rowStyle = {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px',
    border: '1px solid #d0d7de', borderRadius: '6px', background: '#ffffff', marginBottom: '8px',
  };

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto', fontFamily: F, padding: '16px' } },

    React.createElement('h3', { style: H3 }, 'Automatizacion de PRs de GitHub'),

    !isGh
      ? React.createElement('div', { style: { padding: '32px 0', textAlign: 'center', color: '#59636e', fontSize: '14px', lineHeight: '1.6' } },
          'Conecta tu cuenta de GitHub para revisar tus Pull Requests automaticamente.')
      : loading
      ? React.createElement('div', { style: { padding: '32px 0', textAlign: 'center', color: '#59636e', fontSize: '14px' } }, 'Cargando PRs abiertos...')
      : React.createElement(React.Fragment, null,

          // Lista de PRs abiertos
          prs.length === 0
            ? React.createElement('div', { style: { padding: '24px 0', textAlign: 'center', color: '#818b98', fontSize: '13px', lineHeight: '1.6' } }, 'No tienes Pull Requests abiertos.')
            : prs.map(function (pr) {
                var isSel = selected && selected.number === pr.number && selected.repo === pr.repo;
                return React.createElement('div', { key: pr.repo + '#' + pr.number, style: Object.assign({}, rowStyle, isSel ? { borderColor: '#0969da' } : {}) },
                  React.createElement('span', { style: { width: '10px', height: '10px', borderRadius: '50%', background: '#1a7f37', flexShrink: 0 } }),
                  React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                    React.createElement('a', { href: pr.url, target: '_blank', rel: 'noopener', style: { fontSize: '14px', fontWeight: '600', color: '#0969da', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, pr.title),
                    React.createElement('div', { style: { fontSize: '12px', color: '#59636e', marginTop: '4px' } }, pr.owner + '/' + pr.repo + ' #' + pr.number + ' · ' + timeAgo(pr.updated))
                  ),
                  React.createElement('button', {
                    onClick: function () { runReview(pr); },
                    disabled: reviewing,
                    style: {
                      flexShrink: 0, padding: '5px 12px', borderRadius: '6px',
                      border: '1px solid rgba(27,31,36,0.15)', background: reviewing ? '#f6f8fa' : '#1f883d',
                      color: reviewing ? '#818b98' : '#ffffff', fontSize: '12px', fontWeight: '600',
                      cursor: reviewing ? 'default' : 'pointer', fontFamily: F,
                    },
                  }, 'Revisar con X1')
                );
              }),

          // Panel de revision
          selected && React.createElement('div', { style: { marginTop: '16px' } },
            React.createElement('h3', { style: H3 }, 'Revision de ' + selected.repo + ' #' + selected.number),
            reviewing
              ? React.createElement(ReviewProcess, null)
              : review
              ? React.createElement('div', null,
                  React.createElement('div', {
                    style: {
                      fontSize: '13px', color: '#1f2328', lineHeight: '1.7', whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word', padding: '14px 16px', border: '1px solid #d0d7de',
                      borderRadius: '6px', background: '#f6f8fa',
                    },
                  }, review),
                  React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' } },
                    React.createElement('button', {
                      onClick: publish, disabled: publishing || published,
                      style: {
                        padding: '6px 16px', borderRadius: '6px', border: '1px solid rgba(27,31,36,0.15)',
                        background: published ? '#f6f8fa' : '#1f883d', color: published ? '#1a7f37' : '#ffffff',
                        fontSize: '13px', fontWeight: '600', cursor: published ? 'default' : 'pointer', fontFamily: F,
                      },
                    }, published ? 'Publicado en el PR' : publishing ? 'Publicando...' : 'Publicar en el PR'),
                    React.createElement('button', {
                      onClick: function () { runReview(selected); }, disabled: reviewing,
                      style: {
                        padding: '6px 16px', borderRadius: '6px', border: '1px solid #d0d7de',
                        background: '#f6f8fa', color: '#24292f', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: F,
                      },
                    }, 'Rehacer')
                  )
                )
              : null
          )
        )
  );
}
