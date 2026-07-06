import * as React from 'react';

const MONO = "'SF Mono', 'Cascadia Code', Consolas, monospace";
const MAX_DIFF_LINES = 2000; // por encima de esto el diff O(n*m) no compensa

// Diff de lineas clasico (LCS via programacion dinamica) — suficiente para
// ficheros de tamano normal en el contexto de la automatizacion (no es un
// motor de diff de proposito general, solo para mostrar el cambio al
// usuario de forma legible).
function diffLines(oldText, newText) {
  var a = String(oldText || '').split('\n');
  var b = String(newText || '').split('\n');
  if (a.length > MAX_DIFF_LINES || b.length > MAX_DIFF_LINES) return null;

  var n = a.length, m = b.length;
  var dp = new Array(n + 1);
  for (var i = 0; i <= n; i++) dp[i] = new Array(m + 1).fill(0);
  for (i = n - 1; i >= 0; i--) {
    for (var j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  var out = [];
  i = 0; var jj = 0;
  while (i < n && jj < m) {
    if (a[i] === b[jj]) { out.push({ type: 'ctx', text: a[i] }); i++; jj++; }
    else if (dp[i + 1][jj] >= dp[i][jj + 1]) { out.push({ type: 'del', text: a[i] }); i++; }
    else { out.push({ type: 'add', text: b[jj] }); jj++; }
  }
  while (i < n) { out.push({ type: 'del', text: a[i] }); i++; }
  while (jj < m) { out.push({ type: 'add', text: b[jj] }); jj++; }
  return out;
}

// Colapsa tramos largos de contexto sin cambios a solo unas pocas lineas
// alrededor de cada cambio — igual que un diff de verdad, no el fichero
// entero repetido.
function toHunks(lines, contextSize) {
  var changedIdx = [];
  lines.forEach(function (l, i) { if (l.type !== 'ctx') changedIdx.push(i); });
  if (!changedIdx.length) return [];

  var ranges = [];
  var start = Math.max(0, changedIdx[0] - contextSize);
  var end = Math.min(lines.length - 1, changedIdx[0] + contextSize);
  for (var k = 1; k < changedIdx.length; k++) {
    var idx = changedIdx[k];
    var s = Math.max(0, idx - contextSize);
    if (s <= end + 1) { end = Math.min(lines.length - 1, idx + contextSize); }
    else { ranges.push([start, end]); start = s; end = Math.min(lines.length - 1, idx + contextSize); }
  }
  ranges.push([start, end]);
  return ranges.map(function (r) { return lines.slice(r[0], r[1] + 1); });
}

var LINE_STYLE = {
  add: { bg: '#dafbe1', fg: '#116329', prefix: '+' },
  del: { bg: '#ffebe9', fg: '#82071e', prefix: '-' },
  ctx: { bg: 'transparent', fg: '#59636e', prefix: ' ' },
};

export function DiffView({ oldText, newText, maxHeight }) {
  var lines = React.useMemo(function () { return diffLines(oldText, newText); }, [oldText, newText]);

  if (!lines) {
    // Fichero demasiado grande para diffear con sentido: mostrar el
    // contenido completo, compacto, sin pretender ser un diff.
    return React.createElement('pre', {
      style: {
        margin: 0, padding: '8px 10px', background: '#f6f8fa', borderRadius: '6px',
        fontFamily: MONO, fontSize: '11px', lineHeight: '1.5', color: '#1f2328',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'auto', maxHeight: maxHeight || '280px',
      },
    }, newText);
  }

  var hunks = toHunks(lines, 2);
  var added = lines.filter(function (l) { return l.type === 'add'; }).length;
  var removed = lines.filter(function (l) { return l.type === 'del'; }).length;

  return React.createElement('div', { style: { fontFamily: MONO, fontSize: '11px', lineHeight: '1.6' } },
    React.createElement('div', { style: { color: '#818b98', marginBottom: '4px', fontSize: '11px' } },
      React.createElement('span', { style: { color: '#1a7f37' } }, '+' + added),
      ' ',
      React.createElement('span', { style: { color: '#d1242f' } }, '-' + removed)
    ),
    React.createElement('div', { style: { border: '1px solid #d0d7de', borderRadius: '6px', overflow: 'auto', maxHeight: maxHeight || '280px' } },
      hunks.map(function (hunk, hi) {
        return React.createElement('div', { key: hi },
          hi > 0 && React.createElement('div', { style: { padding: '2px 10px', background: '#f6f8fa', color: '#818b98', borderTop: '1px solid #d0d7de', borderBottom: '1px solid #d0d7de' } }, '…'),
          hunk.map(function (l, li) {
            var st = LINE_STYLE[l.type];
            return React.createElement('div', {
              key: li,
              style: { display: 'flex', background: st.bg, padding: '0 10px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
            },
              React.createElement('span', { style: { color: st.fg, opacity: 0.6, width: '12px', flexShrink: 0, userSelect: 'none' } }, st.prefix),
              React.createElement('span', { style: { color: st.fg } }, l.text || ' ')
            );
          })
        );
      })
    )
  );
}
