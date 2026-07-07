import * as React from 'react';

const MONO = "'SF Mono', 'Cascadia Code', Consolas, monospace";
const MAX_DIFF_LINES = 2000; // por encima de esto el diff O(n*m) no compensa

// Diff de lineas clasico (LCS via programacion dinamica) — suficiente para
// ficheros de tamano normal en el contexto de la automatizacion (no es un
// motor de diff de proposito general, solo para mostrar el cambio al
// usuario de forma legible).
// Conteo rapido de lineas +/- (no el diff completo) — para el "+N -N" que
// se ve en la fila colapsada de cada fichero, al estilo de las pildoras de
// fichero de Cursor (ver capturas: "summary.py +150 -0").
export function diffCounts(oldText, newText) {
  var a = String(oldText || '').split('\n');
  var b = String(newText || '').split('\n');
  var seen = {};
  a.forEach(function (l) { seen[l] = (seen[l] || 0) + 1; });
  var added = 0, removed = 0;
  b.forEach(function (l) { if (seen[l] > 0) seen[l]--; else added++; });
  Object.keys(seen).forEach(function (l) { removed += seen[l]; });
  return { added: added, removed: removed };
}

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
  add: { bg: '#E1F2EA', fg: '#0F5C3E', prefix: '+' },
  del: { bg: '#FBEAEA', fg: '#7A2323', prefix: '-' },
  ctx: { bg: 'transparent', fg: '#9E94D5', prefix: ' ' },
};

export function DiffView({ oldText, newText, maxHeight }) {
  var lines = React.useMemo(function () { return diffLines(oldText, newText); }, [oldText, newText]);

  if (!lines) {
    // Fichero demasiado grande para diffear con sentido: mostrar el
    // contenido completo, compacto, sin pretender ser un diff.
    return React.createElement('pre', {
      style: {
        margin: 0, padding: '8px 10px', background: '#FFFFFF', borderRadius: '4px',
        fontFamily: MONO, fontSize: '12px', lineHeight: '1.5', color: '#26251E',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'auto', maxHeight: maxHeight || '280px',
      },
    }, newText);
  }

  var hunks = toHunks(lines, 2);
  var added = lines.filter(function (l) { return l.type === 'add'; }).length;
  var removed = lines.filter(function (l) { return l.type === 'del'; }).length;

  return React.createElement('div', { style: { fontFamily: MONO, fontSize: '12px', lineHeight: '1.6' } },
    React.createElement('div', { style: { color: '#9E94D5', marginBottom: '4px', fontSize: '12px' } },
      React.createElement('span', { style: { color: '#1A7F5A' } }, '+' + added),
      ' ',
      React.createElement('span', { style: { color: '#C4383A' } }, '-' + removed)
    ),
    React.createElement('div', { style: { border: '1px solid #F2F1ED', borderRadius: '4px', overflow: 'auto', maxHeight: maxHeight || '280px' } },
      hunks.map(function (hunk, hi) {
        return React.createElement('div', { key: hi },
          hi > 0 && React.createElement('div', { style: { padding: '2px 10px', background: '#FFFFFF', color: '#9E94D5', borderTop: '1px solid #F2F1ED', borderBottom: '1px solid #F2F1ED', fontSize: '12px' } }, '…'),
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
