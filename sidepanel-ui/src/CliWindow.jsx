var CLI_BG = '#1a1a2e';
var CLI_FG = '#e0e0e0';
var CLI_HEADER_BG = '#16162a';

export function CliWindow({ lines, title }) {
  var ref = React.useRef(null);

  React.useEffect(function() {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [lines]);

  return React.createElement('div', {
    style: {
      borderRadius: '10px',
      overflow: 'hidden',
      border: '1px solid rgba(38,37,30,0.10)',
      background: CLI_BG,
    }
  },
    React.createElement('div', {
      style: {
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 12px',
        background: CLI_HEADER_BG,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }
    },
      React.createElement('div', { style: { width: 8, height: 8, borderRadius: '50%', background: '#ff5f56' } }),
      React.createElement('div', { style: { width: 8, height: 8, borderRadius: '50%', background: '#ffbd2e' } }),
      React.createElement('div', { style: { width: 8, height: 8, borderRadius: '50%', background: '#27c93f' } }),
      React.createElement('span', {
        style: {
          marginLeft: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.40)',
          fontFamily: "'SF Mono', 'Fira Code', monospace",
        }
      }, title || 'Terminal')
    ),
    React.createElement('pre', {
      ref: ref,
      style: {
        margin: 0, padding: '12px',
        fontSize: '12px', lineHeight: '1.6',
        fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
        color: CLI_FG,
        maxHeight: '300px', overflow: 'auto',
        whiteSpace: 'pre-wrap', wordBreak: 'break-all',
      }
    },
      (lines || []).map(function(line, i) {
        return React.createElement('div', { key: i, style: {
          color: line.startsWith('$') ? '#27c93f' :
                 line.startsWith('Error') ? '#ff5f56' :
                 line.startsWith('[') ? '#ffbd2e' : CLI_FG,
        } }, line);
      })
    )
  );
}
