import * as React from 'react';

const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";
const MONO = "'SF Mono', 'Cascadia Code', Consolas, monospace";

// Renderiza el markdown-lite que pide X1 en sus prompts (## titulos, - listas,
// **negrita**, `codigo`) con tipografia real de Primer/GitHub — nada de un
// bloque de texto plano con whiteSpace:pre-wrap. Suficiente para los informes
// de analisis y las descripciones de PR, sin traer una libreria de markdown.

function inline(text, keyPrefix) {
  var parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map(function (p, i) {
    if (/^\*\*[^*]+\*\*$/.test(p)) {
      return React.createElement('strong', { key: keyPrefix + i, style: { fontWeight: '600', color: '#1f2328' } }, p.slice(2, -2));
    }
    if (/^`[^`]+`$/.test(p)) {
      return React.createElement('code', {
        key: keyPrefix + i,
        style: { fontFamily: MONO, fontSize: '85%', background: 'rgba(175,184,193,0.2)', padding: '0.2em 0.4em', borderRadius: '6px' },
      }, p.slice(1, -1));
    }
    return p;
  });
}

export function MarkdownReport({ text }) {
  if (!text) return null;
  var lines = String(text).replace(/\r\n/g, '\n').split('\n');
  var blocks = [];
  var listBuf = [];

  function flushList() {
    if (!listBuf.length) return;
    var items = listBuf.slice();
    blocks.push(
      React.createElement('ul', { key: 'ul' + blocks.length, style: { margin: '0 0 12px', paddingLeft: '20px' } },
        items.map(function (it, i) {
          return React.createElement('li', { key: i, style: { fontSize: '13px', color: '#1f2328', lineHeight: '1.7', marginBottom: '2px' } }, inline(it, 'li' + i + '-'));
        })
      )
    );
    listBuf = [];
  }

  lines.forEach(function (raw, idx) {
    var line = raw.trim();
    if (!line) { flushList(); return; }

    var h = line.match(/^(#{1,6})\s+(.*)$/);
    var numbered = line.match(/^\d+\)\s*(.*)$/);
    if (h) {
      flushList();
      var level = h[1].length;
      blocks.push(
        React.createElement('div', {
          key: 'h' + idx,
          style: {
            fontSize: level <= 2 ? '15px' : '13px', fontWeight: '600', color: '#1f2328',
            marginTop: blocks.length ? '18px' : '0', marginBottom: '8px',
            paddingBottom: '6px', borderBottom: '1px solid #d0d7de',
          },
        }, h[2])
      );
      return;
    }
    if (numbered) {
      flushList();
      blocks.push(
        React.createElement('div', {
          key: 'h' + idx,
          style: { fontSize: '15px', fontWeight: '600', color: '#1f2328', marginTop: blocks.length ? '18px' : '0', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #d0d7de' },
        }, numbered[1])
      );
      return;
    }

    var bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) { listBuf.push(bullet[1]); return; }

    flushList();
    blocks.push(
      React.createElement('p', { key: 'p' + idx, style: { fontSize: '13px', color: '#1f2328', lineHeight: '1.7', margin: '0 0 10px' } }, inline(line, 'p' + idx + '-'))
    );
  });
  flushList();

  return React.createElement('div', { style: { fontFamily: F } }, blocks);
}
