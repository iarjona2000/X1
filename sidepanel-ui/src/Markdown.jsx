import * as React from 'react';

const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";

function renderInline(text, keyPrefix) {
  if (!text) return text;
  var parts = [];
  var i = 0;
  var key = 0;
  var regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  var match;
  var last = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(React.createElement('span', { key: keyPrefix + '_' + (key++), style: { fontSize: '14px', color: '#1f2328' } }, text.slice(last, match.index)));
    }
    if (match[2]) {
      parts.push(React.createElement('strong', { key: keyPrefix + '_' + (key++), style: { fontSize: '14px', fontWeight: '700', color: '#1f2328' } }, match[2]));
    } else if (match[3]) {
      parts.push(React.createElement('em', { key: keyPrefix + '_' + (key++), style: { fontSize: '14px', color: '#1f2328' } }, match[3]));
    } else if (match[4]) {
      parts.push(React.createElement('code', {
        key: keyPrefix + '_' + (key++),
        style: {
          fontSize: '12px', fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          background: '#eff1f3', padding: '2px 6px', borderRadius: '6px',
          color: '#24292f', border: '0.5px solid #d0d7de',
        }
      }, match[4]));
    } else if (match[5] && match[6]) {
      parts.push(React.createElement('a', {
        key: keyPrefix + '_' + (key++),
        href: match[6], target: '_blank', rel: 'noopener noreferrer',
        style: { fontSize: '14px', color: '#0969da', textDecoration: 'none' }
      }, match[5]));
    }
    last = regex.lastIndex;
  }
  if (last < text.length) {
    parts.push(React.createElement('span', { key: keyPrefix + '_' + (key++), style: { fontSize: '14px', color: '#1f2328' } }, text.slice(last)));
  }
  return parts.length === 0 ? text : parts;
}

function renderBlock(line, keyPrefix) {
  if (/^- /.test(line)) {
    return React.createElement('div', {
      key: keyPrefix,
      style: { display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px', fontSize: '14px', color: '#1f2328', lineHeight: '1.6' }
    },
      React.createElement('span', { style: { color: '#59636e', flexShrink: 0, marginTop: '2px', fontSize: '13px' } }, '•'),
      React.createElement('span', { style: { flex: 1 } }, renderInline(line.replace(/^- /, ''), keyPrefix + '_item'))
    );
  }
  if (/^\d+\. /.test(line)) {
    var num = line.match(/^(\d+)\. /)[1];
    var rest = line.replace(/^\d+\. /, '');
    return React.createElement('div', {
      key: keyPrefix,
      style: { display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px', fontSize: '14px', color: '#1f2328', lineHeight: '1.6' }
    },
      React.createElement('span', { style: { color: '#59636e', flexShrink: 0, marginTop: '2px', fontSize: '13px', fontWeight: '600' } }, num + '.'),
      React.createElement('span', { style: { flex: 1 } }, renderInline(rest, keyPrefix + '_item'))
    );
  }
  if (/^---+$/.test(line)) {
    return React.createElement('hr', {
      key: keyPrefix,
      style: { border: 'none', borderTop: '1px solid #d0d7de', margin: '12px 0' }
    });
  }
  var isHeader = /^#{1,4}\s/.test(line);
  if (isHeader) {
    var level = line.match(/^(#{1,4})\s/)[1].length;
    var text = line.replace(/^#{1,4}\s/, '');
    var fontSize = level === 1 ? 18 : level === 2 ? 16 : 14;
    return React.createElement('div', {
      key: keyPrefix,
      style: { fontSize: fontSize + 'px', fontWeight: '600', color: '#1f2328', margin: '12px 0 6px' }
    }, renderInline(text, keyPrefix + '_h'));
  }
  return React.createElement('div', {
    key: keyPrefix,
    style: { fontSize: '14px', color: '#1f2328', lineHeight: '1.7', marginBottom: '4px' }
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
        style: {
          background: '#f6f8fa', border: '1px solid #d0d7de', borderRadius: '6px',
          padding: '12px', margin: '8px 0', overflow: 'auto',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '12px', color: '#1f2328',
        }
      },
        React.createElement('code', null, codeLines.join('\n'))
      ));
      continue;
    }
    if (line.trim() === '') {
      elements.push(React.createElement('div', { key: 'br_' + key++, style: { height: '6px' } }));
      i++;
      continue;
    }
    elements.push(renderBlock(line, 'b_' + key++));
    i++;
  }
  return React.createElement('div', { style: { fontFamily: F } }, elements);
}
