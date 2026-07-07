import * as React from 'react';
import { useState, useCallback } from 'react';
import { loadConversations, saveConversations, AGENTS } from './backend.js';
import { ChatView } from './ChatView.jsx';
import { RepoView } from './RepoView.jsx';
import { PRAgent } from './PRAgent.jsx';
import { RepoAnalysis } from './RepoAnalysis.jsx';

var TAB_ICONS = {
  chat: React.createElement('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('path', { d: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' })
  ),
  repo: React.createElement('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('polyline', { points: '16 18 22 12 16 6' }),
    React.createElement('polyline', { points: '8 6 2 12 8 18' })
  ),
  pr: React.createElement('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('circle', { cx: 18, cy: 18, r: 3 }),
    React.createElement('circle', { cx: 6, cy: 6, r: 3 }),
    React.createElement('path', { d: 'M13 6h3a2 2 0 012 2v7' }),
    React.createElement('line', { x1: 6, y1: 9, x2: 6, y2: 21 })
  ),
  analysis: React.createElement('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('line', { x1: 18, y1: 20, x2: 18, y2: 10 }),
    React.createElement('line', { x1: 12, y1: 20, x2: 12, y2: 4 }),
    React.createElement('line', { x1: 6, y1: 20, x2: 6, y2: 14 })
  ),
};

var TABS = [
  { id: 'chat', label: 'Chat' },
  { id: 'repo', label: 'Code' },
  { id: 'pr', label: 'PR' },
  { id: 'analysis', label: 'Analysis' },
];

function TitleBar() {
  return React.createElement('header', {
    style: {
      display: 'flex', alignItems: 'center', gap: '8px',
      borderBottom: '1px solid rgba(220,218,209,0.6)',
      padding: '10px 12px',
    }
  },
    React.createElement('div', {
      style: {
        width: '20px', height: '20px', borderRadius: '6px',
        background: 'linear-gradient(135deg, #f54e00, #cf2d56)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }
    },
      React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: '#fff', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('path', { d: 'M12 2L2 7l10 5 10-5-10-5z' }),
        React.createElement('path', { d: 'M2 17l10 5 10-5' }),
        React.createElement('path', { d: 'M2 12l10 5 10-5' })
      )
    ),
    React.createElement('span', {
      style: { flex: 1, fontSize: '13px', fontWeight: 500, color: '#2c2a27' }
    }, 'X1'),
    React.createElement('button', {
      title: 'New chat',
      onClick: function() {},
      style: {
        border: 'none', background: 'transparent', padding: '4px',
        borderRadius: '6px', color: 'rgba(44,42,39,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 150ms',
      }
    },
      React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('line', { x1: 12, y1: 5, x2: 12, y2: 19 }),
        React.createElement('line', { x1: 5, y1: 12, x2: 19, y2: 12 })
      )
    )
  );
}

function TabBar({ activeTab, onTab }) {
  return React.createElement('nav', {
    style: {
      display: 'flex', alignItems: 'center', gap: '4px',
      borderBottom: '1px solid rgba(220,218,209,0.6)',
      padding: '0 8px',
    }
  },
    TABS.map(function(t) {
      var isActive = activeTab === t.id;
      return React.createElement('button', {
        key: t.id,
        onClick: function() { onTab(t.id); },
        style: {
          position: 'relative',
          padding: '8px 10px',
          fontSize: '13px',
          border: 'none',
          background: 'transparent',
          color: isActive ? '#2c2a27' : 'rgba(44,42,39,0.55)',
          fontWeight: isActive ? 500 : 400,
          transition: 'color 150ms',
          display: 'flex', alignItems: 'center', gap: '5px',
        },
        onMouseEnter: function(e) { if (!isActive) e.currentTarget.style.color = '#2c2a27'; },
        onMouseLeave: function(e) { if (!isActive) e.currentTarget.style.color = 'rgba(44,42,39,0.55)'; },
      },
        TAB_ICONS[t.id],
        t.label,
        isActive && React.createElement('span', {
          style: {
            position: 'absolute', left: '10px', right: '10px', bottom: '-1px',
            height: '2px', borderRadius: '9999px', background: '#f54e00',
          }
        })
      );
    })
  );
}

export function SidePanel({ githubUser, onLogout }) {
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

  var selectConv = useCallback(function(conv) { setActiveConv(conv); setActiveTab('chat'); }, []);

  return React.createElement('div', {
    style: {
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100%',
      background: '#ecebe4',
      fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
    }
  },
    React.createElement(TitleBar),
    React.createElement(TabBar, { activeTab: activeTab, onTab: setActiveTab }),
    React.createElement('div', {
      style: {
        flex: 1, minHeight: 0, overflowY: 'auto',
        background: '#ecebe4',
      }
    },
      activeTab === 'chat' && React.createElement(ChatView, {
        activeConv: activeConv,
        onSelectConv: selectConv,
        onEnsureConv: createConv,
        conversations: conversations,
        setConversations: setConversations,
      }),
      activeTab === 'repo' && React.createElement(RepoView, {
        conversations: conversations, githubUser: githubUser,
      }),
      activeTab === 'pr' && React.createElement(PRAgent, {
        githubUser: githubUser, onGoToRepo: function() { setActiveTab('repo'); },
      }),
      activeTab === 'analysis' && React.createElement(RepoAnalysis, { githubUser: githubUser })
    )
  );
}
