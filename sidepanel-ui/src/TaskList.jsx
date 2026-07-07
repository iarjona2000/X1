import * as React from 'react';
import { Markdown } from './Markdown.jsx';

var USER_BG = 'rgba(38,37,30,0.04)';
var USER_BORDER = 'rgba(38,37,30,0.08)';
var ASSISTANT_BG = 'transparent';
var BADGE_COLORS = {
  'Cronos': '#f54e00',
  'Ares': '#cf2d56',
  'Hephaestus': '#1f8a65',
  'Athena': '#6c44fc',
  'Hermes': '#0070f3',
  'Morpheus': '#e8590c',
  'Default': '#26251e'
};

function UserMessage({ message }) {
  return React.createElement('div', {
    style: {
      display: 'flex', justifyContent: 'flex-end',
      padding: '8px 0',
    }
  },
    React.createElement('div', {
      style: {
        maxWidth: '75%', padding: '10px 14px',
        background: USER_BG,
        border: '1px solid ' + USER_BORDER,
        borderRadius: '12px 12px 4px 12px',
        fontSize: '14px', fontFamily: "'Inter', system-ui, sans-serif",
        color: '#26251e', lineHeight: '1.6',
      }
    }, message.content)
  );
}

function AssistantMessage({ message }) {
  var agent = message.agent || 'X1';
  var badgeColor = BADGE_COLORS[agent] || '#26251e';

  return React.createElement('div', {
    style: {
      display: 'flex', gap: '10px', padding: '8px 0',
      alignItems: 'flex-start',
    }
  },
    React.createElement('div', {
      style: {
        width: '28px', height: '28px', borderRadius: '8px',
        background: badgeColor, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 600, flexShrink: 0,
        fontFamily: "'Inter', system-ui, sans-serif",
      }
    }, agent[0]),
    React.createElement('div', {
      style: {
        background: ASSISTANT_BG,
        borderRadius: '4px 12px 12px 12px',
        fontSize: '14px', fontFamily: "'Inter', system-ui, sans-serif",
        color: '#26251e', lineHeight: '1.6',
        minWidth: 0, flex: 1, maxWidth: 'calc(100% - 40px)',
      }
    },
      message.tools && message.tools.length > 0 && React.createElement('div', {
        style: {
          display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px',
        }
      },
        message.tools.map(function(tool, i) {
          return React.createElement('span', {
            key: i,
            style: {
              padding: '2px 8px', borderRadius: '6px',
              background: 'rgba(38,37,30,0.06)',
              fontSize: '11px', fontFamily: "'SF Mono', 'Fira Code', monospace",
              color: 'rgba(38,37,30,0.55)',
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
        color: 'rgba(38,37,30,0.35)',
        fontFamily: "'Inter', system-ui, sans-serif", fontSize: '13px',
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
