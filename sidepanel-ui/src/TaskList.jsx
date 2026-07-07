import * as React from 'react';
import { Markdown } from './Markdown.jsx';

var USER_BG = '#e4e2da';
var USER_FG = '#2c2a27';
var ASSISTANT_BG = 'transparent';
var BADGE_COLORS = {
  'Cronos': '#f54e00', 'Ares': '#cf2d56', 'Hephaestus': '#1f8a65',
  'Athena': '#6c44fc', 'Hermes': '#0070f3', 'Morpheus': '#e8590c', 'Default': '#2c2a27'
};

function UserMessage({ message }) {
  return React.createElement('div', {
    style: { display: 'flex', justifyContent: 'flex-end', padding: '6px 0' }
  },
    React.createElement('div', {
      style: {
        maxWidth: '75%', padding: '10px 14px',
        background: USER_BG, borderRadius: '14px 14px 4px 14px',
        fontSize: '13px', fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        color: USER_FG, lineHeight: '1.6',
      }
    }, message.content)
  );
}

function AssistantMessage({ message }) {
  var agent = message.agent || 'X1';
  var badgeColor = BADGE_COLORS[agent] || '#2c2a27';

  return React.createElement('div', {
    style: { display: 'flex', gap: '10px', padding: '6px 0', alignItems: 'flex-start' }
  },
    React.createElement('div', {
      style: {
        width: '28px', height: '28px', borderRadius: '8px',
        background: badgeColor, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 600, flexShrink: 0,
        fontFamily: "'Inter', ui-sans-serif, sans-serif",
      }
    }, agent[0]),
    React.createElement('div', {
      style: {
        background: ASSISTANT_BG, borderRadius: '4px 14px 14px 14px',
        fontSize: '13px', fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        color: '#2c2a27', lineHeight: '1.6', minWidth: 0, flex: 1,
        maxWidth: 'calc(100% - 40px)',
      }
    },
      message.tools && message.tools.length > 0 && React.createElement('div', {
        style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }
      },
        message.tools.map(function(tool, i) {
          return React.createElement('span', {
            key: i, style: {
              padding: '2px 8px', borderRadius: '6px',
              background: 'rgba(228,226,218,0.6)', fontSize: '11px',
              fontFamily: "'SF Mono', 'Cascadia Code', monospace",
              color: 'rgba(44,42,39,0.55)',
            }
          }, tool);
        })
      ),
      React.createElement(Markdown, { text: message.content })
    )
  );
}

export function TaskList({ messages }) {
  if (!messages || messages.length === 0) {
    return React.createElement('div', {
      style: {
        padding: '60px 20px', textAlign: 'center',
        color: 'rgba(44,42,39,0.35)', fontFamily: "'Inter', ui-sans-serif, sans-serif",
        fontSize: '13px',
      }
    }, 'No messages yet. Start a conversation.');
  }

  return React.createElement('div', { style: { padding: '0 16px' } },
    messages.map(function(msg, i) {
      if (msg.role === 'user') {
        return React.createElement(UserMessage, { key: msg.id || i, message: msg });
      }
      return React.createElement(AssistantMessage, { key: msg.id || i, message: msg });
    })
  );
}
