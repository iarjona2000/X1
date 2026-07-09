import * as React from 'react';
import { useState } from 'react';
import { MCPAgentCard } from './MCPAgentCard.jsx';

const F = "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export function MCPAgentList(props) {
  var agents = props.agents || [];
  var categories = props.categories || [];
  var selectedAgent = props.selectedAgent;
  var onSelect = props.onSelect;
  var statusMap = props.statusMap || {};

  var [filter, setFilter] = useState('all');

  var filtered = filter === 'all' ? agents : agents.filter(function(a) { return a.category === filter; });

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '0 2px' } },
      React.createElement('button', {
        onClick: function() { setFilter('all'); },
        style: {
          fontSize: '11px', padding: '3px 10px', borderRadius: '999px', border: '1px solid', cursor: 'pointer',
          borderColor: filter === 'all' ? '#000000' : '#e8e8e8',
          background: filter === 'all' ? '#eeeeee' : '#ffffff',
          color: filter === 'all' ? '#000000' : '#707070',
          fontWeight: filter === 'all' ? '600' : '400', fontFamily: F, transition: 'all 80ms',
        }
      }, 'All (' + agents.length + ')'),
      categories.map(function(cat) {
        var active = filter === cat.id;
        return React.createElement('button', {
          key: cat.id,
          onClick: function() { setFilter(cat.id); },
          style: {
            fontSize: '11px', padding: '3px 10px', borderRadius: '999px', border: '1px solid', cursor: 'pointer',
            borderColor: active ? cat.color : '#e8e8e8',
            background: active ? (cat.color + '1a') : '#ffffff',
            color: active ? cat.color : '#707070',
            fontWeight: active ? '600' : '400', fontFamily: F, transition: 'all 80ms',
          }
        }, cat.label + ' (' + cat.count + ')');
      })
    ),
    React.createElement('div', {
      style: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '8px', padding: '0 2px',
      }
    },
      filtered.map(function(agent) {
        return React.createElement(MCPAgentCard, {
          key: agent.id,
          agent: agent,
          selected: selectedAgent === agent.id,
          status: statusMap[agent.id] || 'idle',
          onClick: function() { onSelect(agent.id); },
        });
      })
    ),
    filtered.length === 0 ? React.createElement('div', {
      style: { textAlign: 'center', padding: '24px', color: '#a3a3a3', fontSize: '13px', fontFamily: F }
    }, 'No agents in this category.') : null
  );
}
