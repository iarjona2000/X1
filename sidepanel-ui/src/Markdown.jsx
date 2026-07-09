import * as React from 'react';

var F = "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
var MF = "'Geist Mono', ui-monospace, SFMono-Regular, monospace";

function renderInline(text, keyPrefix) {
  if (!text) return text;
  var parts = [];
  var i = 0;
  var key = 0;
  var regex = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  var match;
  var last = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(React.createElement('span', { key: keyPrefix + '_' + (key++), className: 'text-copy-md text-gray-1000' }, text.slice(last, match.index)));
    }
    if (match[2]) {
      parts.push(React.createElement('strong', { key: keyPrefix + '_' + (key++), className: 'text-copy-md font-semibold text-gray-1000' }, match[2]));
    } else if (match[3]) {
      parts.push(React.createElement('code', {
        key: keyPrefix + '_' + (key++),
        className: 'font-mono',
        style: {
          fontSize: 12, fontFamily: MF,
          background: 'var(--color-v0-gray-100)', padding: '2px 6px', borderRadius: 6,
          color: '#171717', border: '1px solid var(--color-v0-gray-200)',
        }
      }, match[3]));
    } else if (match[4] && match[5]) {
      parts.push(React.createElement('a', {
        key: keyPrefix + '_' + (key++),
        href: match[5], target: '_blank', rel: 'noopener noreferrer',
        className: 'text-copy-md text-blue-700',
        style: { textDecoration: 'none' }
      }, match[4]));
    }
    last = regex.lastIndex;
  }
  if (last < text.length) {
    parts.push(React.createElement('span', { key: keyPrefix + '_' + (key++), className: 'text-copy-md text-gray-1000' }, text.slice(last)));
  }
  return parts.length === 0 ? text : parts;
}

function renderBlock(line, keyPrefix) {
  if (/^- /.test(line)) {
    return React.createElement('div', {
      key: keyPrefix,
      className: 'flex items-start text-copy-md text-gray-1000',
      style: { gap: 6, marginBottom: 4, lineHeight: '26px' }
    },
      React.createElement('span', { style: { color: 'var(--color-v0-gray-400)', flexShrink: 0, marginTop: 2, fontSize: 13 } }, '\u2022'),
      React.createElement('span', { style: { flex: 1 } }, renderInline(line.replace(/^- /, ''), keyPrefix + '_item'))
    );
  }
  if (/^\d+\. /.test(line)) {
    var num = line.match(/^(\d+)\. /)[1];
    var rest = line.replace(/^\d+\. /, '');
    return React.createElement('div', {
      key: keyPrefix,
      className: 'flex items-start text-copy-md text-gray-1000',
      style: { gap: 6, marginBottom: 4, lineHeight: '26px' }
    },
      React.createElement('span', { className: 'text-label-13 font-semibold', style: { color: 'var(--color-v0-gray-400)', flexShrink: 0, marginTop: 2 } }, num + '.'),
      React.createElement('span', { style: { flex: 1 } }, renderInline(rest, keyPrefix + '_item'))
    );
  }
  if (/^---+$/.test(line)) {
    return React.createElement('hr', {
      key: keyPrefix,
      className: 'geist-divider',
      style: { margin: '12px 0' }
    });
  }
  var isHeader = /^#{1,4}\s/.test(line);
  if (isHeader) {
    var level = line.match(/^(#{1,4})\s/)[1].length;
    var text = line.replace(/^#{1,4}\s/, '');
    var cls = level === 1 ? 'text-heading-lg' : level === 2 ? 'text-heading-md' : level === 3 ? 'text-heading-sm' : 'text-heading-xs';
    return React.createElement('div', {
      key: keyPrefix,
      className: cls + ' text-gray-1000',
      style: { margin: '12px 0 6px' }
    }, renderInline(text, keyPrefix + '_h'));
  }
  return React.createElement('div', {
    key: keyPrefix,
    className: 'text-copy-md text-gray-1000',
    style: { lineHeight: '26px', marginBottom: 4 }
  }, renderInline(line, keyPrefix + '_p') || '\u00a0');
}

export function Markdown({ text }) {
  if (!text) return null;
  var lines = text.split('\n');
  var elements = [];
  var i = 0;
  var key = 0;
  while (i < lines.length) {
    var line = lines[i];
    if (line.trim().startsWith('```')) {
      var lang = line.trim().slice(3);
      var codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(React.createElement('pre', {
        key: 'code_' + key++,
        className: 'font-mono',
        style: {
          background: 'var(--color-v0-gray-100)',
          border: '1px solid var(--color-v0-gray-200)',
          borderRadius: 12, padding: 16, margin: '8px 0',
          overflow: 'auto', fontSize: 13, color: '#171717',
          lineHeight: '20px', letterSpacing: '-0.011em',
        }
      },
        React.createElement('code', null, codeLines.join('\n'))
      ));
      continue;
    }
    if (line.trim() === '') {
      elements.push(React.createElement('div', { key: 'br_' + key++, style: { height: 8 } }));
      i++;
      continue;
    }
    elements.push(renderBlock(line, 'b_' + key++));
    i++;
  }
  return React.createElement('div', { style: { fontFamily: F } }, elements);
}
