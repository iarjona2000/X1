import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { AGENTS, getBestAgent, smartQuery, hasEngine, detectSector, getJudgeReason } from './backend.js';
import { getMemoryStore } from './tools.js';
import { Spinner } from './Spinner.jsx';

var COMPOSER_BG = 'rgba(255,255,255,0.80)';
var COMPOSER_BORDER = 'rgba(38,37,30,0.10)';
var COMPOSER_SHADOW = '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)';
var COMPOSER_FOCUS_SHADOW = '0 1px 6px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)';
var SUGGESTION_BG = '#f5f4ef';
var SUGGESTION_HOVER = '#e6e5e0';
var BADGE_COLORS = {
  'Cronos': '#f54e00',
  'Ares': '#cf2d56',
  'Hephaestus': '#1f8a65',
  'Athena': '#6c44fc',
  'Hermes': '#0070f3',
  'Morpheus': '#e8590c',
  'Default': '#26251e'
};

export function Composer({ onSend, onOpenAgents, agents, activeAgent, disabled }) {
  var ref = useRef(null);
  var [text, setText] = useState('');
  var [sending, setSending] = useState(false);
  var [showAgents, setShowAgents] = useState(false);

  useEffect(function() {
    if (ref.current) ref.current.focus();
  }, []);

  var handleSend = useCallback(function() {
    var q = text.trim();
    if (!q || sending || disabled) return;
    setText('');
    setSending(true);
    if (onSend) {
      Promise.resolve(onSend(q)).then(function() { setSending(false); });
    } else {
      setSending(false);
    }
  }, [text, sending, disabled, onSend]);

  var handleKeyDown = useCallback(function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  var agentList = agents || AGENTS;

  return React.createElement('div', { style: { position: 'relative' } },
    React.createElement('div', {
      style: {
        background: COMPOSER_BG,
        border: '1px solid ' + COMPOSER_BORDER,
        borderRadius: '12px',
        boxShadow: COMPOSER_SHADOW,
        transition: 'box-shadow 150ms',
        overflow: 'hidden',
      },
      onFocus: function(e) { e.currentTarget.style.boxShadow = COMPOSER_FOCUS_SHADOW; },
      onBlur: function(e) { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.style.boxShadow = COMPOSER_SHADOW; },
    },
      React.createElement('textarea', {
        ref: ref,
        value: text,
        onChange: function(e) { setText(e.target.value); },
        onKeyDown: handleKeyDown,
        placeholder: 'Ask X1 anything...',
        rows: 1,
        style: {
          width: '100%',
          minHeight: '44px',
          maxHeight: '200px',
          padding: '10px 14px',
          border: 'none',
          background: 'transparent',
          fontSize: '14px',
          fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
          color: '#26251e',
          resize: 'none',
          outline: 'none',
          lineHeight: '1.5',
          boxSizing: 'border-box',
        }
      }),
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px 8px',
        }
      },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '4px' } },
          React.createElement('button', {
            onClick: function() { setShowAgents(!showAgents); if (onOpenAgents) onOpenAgents(); },
            title: 'Select Agent',
            style: {
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 8px', border: 'none', background: 'transparent',
              borderRadius: '6px', cursor: 'pointer', fontSize: '11px',
              fontFamily: "'Inter', system-ui, sans-serif",
              color: activeAgent ? (BADGE_COLORS[activeAgent] || '#26251e') : '#26251e',
              fontWeight: 500,
            }
          },
            React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
              React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
              React.createElement('path', { d: 'M12 6v6l4 2' })
            ),
            activeAgent ? activeAgent : 'Auto'
          )
        ),
        React.createElement('button', {
          onClick: handleSend,
          disabled: sending || disabled || !text.trim(),
          style: {
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '32px', height: '32px', border: 'none',
            background: text.trim() ? '#26251e' : 'rgba(38,37,30,0.15)',
            borderRadius: '8px', cursor: text.trim() ? 'pointer' : 'default',
            transition: 'background 150ms',
          }
        },
          sending
            ? React.createElement(Spinner, { className: 'text-white' })
            : React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: text.trim() ? '#fff' : '#999', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
                React.createElement('line', { x1: 22, y1: 2, x2: 11, y2: 13 }),
                React.createElement('polygon', { points: '22 2 15 22 11 13 2 9 22 2' })
              )
        )
      )
    ),
    showAgents && React.createElement('div', {
      style: {
        position: 'absolute', bottom: '100%', left: 0, right: 0,
        marginBottom: '6px', background: COMPOSER_BG,
        border: '1px solid ' + COMPOSER_BORDER,
        borderRadius: '10px', boxShadow: COMPOSER_SHADOW,
        padding: '6px', zIndex: 100,
      }
    },
      agentList.map(function(a) {
        var isActive = activeAgent === a.id;
        return React.createElement('button', {
          key: a.id,
          onClick: function() { setShowAgents(false); if (onSend) onSend('__select_agent:' + a.id); },
          style: {
            display: 'flex', alignItems: 'center', gap: '8px',
            width: '100%', padding: '7px 10px', border: 'none',
            background: isActive ? 'rgba(38,37,30,0.06)' : 'transparent',
            borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
            fontFamily: "'Inter', system-ui, sans-serif", fontSize: '13px',
          }
        },
          React.createElement('span', {
            style: {
              width: '24px', height: '24px', borderRadius: '6px',
              background: BADGE_COLORS[a.id] || '#26251e',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 600, flexShrink: 0,
            }
          }, (a.id || 'X')[0]),
          React.createElement('div', { style: { minWidth: 0 } },
            React.createElement('div', { style: { fontWeight: 500, color: '#26251e' } }, a.id),
            React.createElement('div', { style: { fontSize: '11px', color: 'rgba(38,37,30,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, a.description || a.focus || '')
          )
        );
      })
    )
  );
}
