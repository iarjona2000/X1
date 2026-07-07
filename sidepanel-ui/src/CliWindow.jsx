import * as React from 'react';

var CLI_BG = '#1a1a2e';
var CLI_FG = '#e0e0e0';
var CLI_HEADER_BG = '#16162a';

export function CliWindow({ lines, title }) {
  var ref = React.useRef(null);
  React.useEffect(function() {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);
  return React.createElement('div', {
    style: { borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(220,218,209,0.6)', background: CLI_BG }
  },
    React.createElement('div', {
      style: {
        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px',
        background: CLI_HEADER_BG, borderBottom: '1px solid rgba(255,255,255,0.06)',
      }
    },
      React.createElement('div', { style: { width: 10, height: 10, borderRadius: '50%', background: '#e0685a' } }),
      React.createElement('div', { style: { width: 10, height: 10, borderRadius: '50%', background: '#e0b04a' } }),
      React.createElement('div', { style: { width: 10, height: 10, borderRadius: '50%', background: '#7fae5a' } }),
      React.createElement('span', {
        style: { marginLeft: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: "'SF Mono', 'Cascadia Code', monospace" }
      }, title || 'Terminal')
    ),
    React.createElement('pre', {
      ref: ref,
      style: {
        margin: 0, padding: '14px', fontSize: '12px', lineHeight: '1.6',
        fontFamily: "'SF Mono', 'Cascadia Code', monospace", color: CLI_FG,
        maxHeight: '300px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
      }
    },
      (lines || []).map(function(line, i) {
        return React.createElement('div', {
          key: i, style: {
            color: line.startsWith('$') ? '#7fae5a' : line.startsWith('Error') ? '#e0685a' : line.startsWith('[') ? '#e0b04a' : CLI_FG,
          }
        }, line);
      })
    )
  );
}
