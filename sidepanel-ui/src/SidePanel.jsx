import * as React from 'react';
import { useState, useCallback } from 'react';
import { loadConversations, saveConversations, AGENTS } from './backend.js';
import { ChatView } from './ChatView.jsx';
import { RepoView } from './RepoView.jsx';
import { PRAgent } from './PRAgent.jsx';
import { RepoAnalysis } from './RepoAnalysis.jsx';

var SIDEBAR_WIDTH = '260px';
var TAB_ICONS = {
  chat: React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('path', { d: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' })
  ),
  repo: React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('polyline', { points: '16 18 22 12 16 6' }),
    React.createElement('polyline', { points: '8 6 2 12 8 18' })
  ),
  pr: React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('circle', { cx: 18, cy: 18, r: 3 }),
    React.createElement('circle', { cx: 6, cy: 6, r: 3 }),
    React.createElement('path', { d: 'M13 6h3a2 2 0 012 2v7' }),
    React.createElement('line', { x1: 6, y1: 9, x2: 6, y2: 21 })
  ),
  analysis: React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('line', { x1: 18, y1: 20, x2: 18, y2: 10 }),
    React.createElement('line', { x1: 12, y1: 20, x2: 12, y2: 4 }),
    React.createElement('line', { x1: 6, y1: 20, x2: 6, y2: 14 })
  ),
};

function SidePanel({ githubUser, onGoToRepo, onLogout }) {
  var [activeTab, setActiveTab] = useState('chat');
  var [conversations, setConversations] = useState(function() { return loadConversations(); });
  var [activeConv, setActiveConv] = useState(null);

  var createConv = useCallback(function(title) {
    var conv = {
      id: 'c' + Date.now(),
      title: title || 'New chat',
      messages: [],
      tasks: [],
      created: Date.now(),
    };
    var list = [conv].concat(conversations);
    setConversations(list);
    saveConversations(list);
    setActiveConv(conv);
    return conv.id;
  }, [conversations]);

  var selectConv = useCallback(function(conv) {
    setActiveConv(conv);
    setActiveTab('chat');
  }, []);

  var deleteConv = useCallback(function(id) {
    var list = conversations.filter(function(c) { return c.id !== id; });
    setConversations(list);
    saveConversations(list);
    if (activeConv && activeConv.id === id) setActiveConv(null);
  }, [conversations, activeConv]);

  var tabs = [
    { id: 'chat', label: 'Chat' },
    { id: 'repo', label: 'Code' },
    { id: 'pr', label: 'PR' },
    { id: 'analysis', label: 'Analysis' },
  ];

  return React.createElement('div', {
    style: {
      display: 'flex', height: '100vh',
      background: '#f2f1ed',
      fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    }
  },
    React.createElement('div', {
      style: {
        width: SIDEBAR_WIDTH, flexShrink: 0,
        background: '#f2f1ed',
        borderRight: '1px solid rgba(38,37,30,0.10)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }
    },
      React.createElement('div', {
        style: {
          padding: '12px 12px 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }
      },
        React.createElement('div', {
          style: { display: 'flex', alignItems: 'center', gap: '8px' }
        },
          React.createElement('div', {
            style: {
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #f54e00, #cf2d56)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }
          },
            React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: '#fff', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
              React.createElement('path', { d: 'M12 2L2 7l10 5 10-5-10-5z' }),
              React.createElement('path', { d: 'M2 17l10 5 10-5' }),
              React.createElement('path', { d: 'M2 12l10 5 10-5' })
            )
          ),
          React.createElement('span', {
            style: { fontSize: '13px', fontWeight: 600, color: '#26251e' }
          }, 'X1')
        ),
        React.createElement('button', {
          onClick: function() { createConv(); },
          style: {
            width: '28px', height: '28px', border: 'none',
            background: 'rgba(38,37,30,0.06)',
            borderRadius: '6px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 150ms',
          }
        },
          React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: '#26251e', strokeWidth: 2 },
            React.createElement('line', { x1: 12, y1: 5, x2: 12, y2: 19 }),
            React.createElement('line', { x1: 5, y1: 12, x2: 19, y2: 12 })
          )
        )
      ),
      React.createElement('div', {
        style: {
          display: 'flex', gap: '2px', padding: '0 12px 8px',
        }
      },
        tabs.map(function(tab) {
          var isActive = activeTab === tab.id;
          return React.createElement('button', {
            key: tab.id,
            onClick: function() { setActiveTab(tab.id); },
            style: {
              flex: 1, padding: '6px 4px', border: 'none',
              background: isActive ? 'rgba(38,37,30,0.08)' : 'transparent',
              borderRadius: '6px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              transition: 'background 150ms',
            }
          },
            React.createElement('span', {
              style: {
                color: isActive ? '#26251e' : 'rgba(38,37,30,0.40)',
              }
            }, TAB_ICONS[tab.id]),
            React.createElement('span', {
              style: {
                fontSize: '10px', fontWeight: isActive ? 500 : 400,
                color: isActive ? '#26251e' : 'rgba(38,37,30,0.40)',
              }
            }, tab.label)
          );
        })
      ),
      React.createElement('div', {
        style: {
          flex: 1, overflowY: 'auto',
          padding: '0 8px',
        }
      },
        activeTab === 'chat' && conversations.map(function(conv) {
          var isActive = activeConv && activeConv.id === conv.id;
          return React.createElement('div', {
            key: conv.id,
            onClick: function() { selectConv(conv); },
            style: {
              padding: '8px 10px', borderRadius: '8px',
              cursor: 'pointer', marginBottom: '2px',
              background: isActive ? 'rgba(38,37,30,0.06)' : 'transparent',
              transition: 'background 100ms',
            },
            onMouseEnter: function(e) { if (!isActive) e.currentTarget.style.background = 'rgba(38,37,30,0.03)'; },
            onMouseLeave: function(e) { if (!isActive) e.currentTarget.style.background = 'transparent'; },
          },
            React.createElement('div', {
              style: {
                fontSize: '13px', fontWeight: isActive ? 500 : 400,
                color: '#26251e', whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }
            }, conv.title || 'New chat'),
            React.createElement('div', {
              style: {
                fontSize: '11px', color: 'rgba(38,37,30,0.35)',
                marginTop: '2px',
              }
            }, new Date(conv.created).toLocaleDateString())
          );
        })
      ),
      githubUser && React.createElement('div', {
        style: {
          padding: '10px 12px',
          borderTop: '1px solid rgba(38,37,30,0.10)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }
      },
        React.createElement('img', {
          src: githubUser.avatar_url,
          style: { width: '24px', height: '24px', borderRadius: '6px' },
        }),
        React.createElement('span', {
          style: { fontSize: '12px', color: '#26251e', flex: 1 }
        }, githubUser.login),
        React.createElement('button', {
          onClick: onLogout,
          style: {
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '11px', color: 'rgba(38,37,30,0.40)',
          }
        }, 'Sign out')
      )
    ),
    React.createElement('div', {
      style: {
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }
    },
      activeTab === 'chat' && React.createElement(ChatView, {
        activeConv: activeConv,
        onSelectConv: selectConv,
        onEnsureConv: createConv,
      }),
      activeTab === 'repo' && React.createElement(RepoView, {
        conversations: conversations,
        githubUser: githubUser,
      }),
      activeTab === 'pr' && React.createElement(PRAgent, {
        githubUser: githubUser,
        onGoToRepo: onGoToRepo,
      }),
      activeTab === 'analysis' && React.createElement(RepoAnalysis, {
        githubUser: githubUser,
      })
    )
  );
}

export { SidePanel };
