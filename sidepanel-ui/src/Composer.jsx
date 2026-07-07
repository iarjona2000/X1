import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { AGENTS } from './backend.js';

var COMPOSER_BG = '#f7f7f4';
var COMPOSER_BORDER = 'rgba(220,218,209,0.6)';
var COMPOSER_SHADOW = '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)';
var COMPOSER_FOCUS_SHADOW = '0 1px 6px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)';
var BADGE_COLORS = {
  'Cronos': '#f54e00', 'Ares': '#cf2d56', 'Hephaestus': '#1f8a65',
  'Athena': '#6c44fc', 'Hermes': '#0070f3', 'Morpheus': '#e8590c', 'Default': '#2c2a27'
};

export function Composer({ onSend, agents, activeAgent, disabled }) {
  var ref = useRef(null);
  var [text, setText] = useState('');
  var [sending, setSending] = useState(false);
  var [showAgents, setShowAgents] = useState(false);

  useEffect(function() { if (ref.current) ref.current.focus(); }, []);

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
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  var agentList = agents || AGENTS;

  return React.createElement('div', { style: { position: 'relative' } },
    React.createElement('div', {
      style: {
        borderRadius: '10px', border: '1px solid ' + COMPOSER_BORDER,
        background: COMPOSER_BG, padding: '10px', boxShadow: COMPOSER_SHADOW,
        transition: 'box-shadow 150ms', overflow: 'hidden',
      },
      onFocus: function(e) { e.currentTarget.style.boxShadow = COMPOSER_FOCUS_SHADOW; },
      onBlur: function(e) { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.style.boxShadow = COMPOSER_SHADOW; },
    },
      React.createElement('textarea', {
        ref: ref, value: text,
        onChange: function(e) { setText(e.target.value); },
        onKeyDown: handleKeyDown,
        placeholder: 'Add follow-up...',
        rows: 2,
        style: {
          width: '100%', minHeight: '44px', maxHeight: '200px',
          padding: '6px 6px', border: 'none', background: 'transparent',
          fontSize: '13px', fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
          color: '#2c2a27', resize: 'none', outline: 'none',
          lineHeight: '1.6', boxSizing: 'border-box',
        }
      }),
      React.createElement('div', {
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }
      },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
          React.createElement('button', {
            onClick: function() { setShowAgents(!showAgents); },
            title: 'Select Agent',
            style: {
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 8px', border: '1px solid ' + COMPOSER_BORDER,
              background: 'rgba(228,226,218,0.6)', borderRadius: '6px',
              fontSize: '12px', fontFamily: "'Inter', ui-sans-serif, sans-serif",
              color: activeAgent ? (BADGE_COLORS[activeAgent] || '#2c2a27') : 'rgba(44,42,39,0.55)',
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
            width: '28px', height: '28px', border: 'none',
            background: text.trim() ? '#2c2a27' : 'rgba(44,42,39,0.15)',
            borderRadius: '9999px', cursor: text.trim() ? 'pointer' : 'default',
            transition: 'opacity 150ms',
          }
        },
          sending
            ? React.createElement('span', { className: 'animate-spin', style: { display: 'inline-flex' } },
                React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none' },
                  Array.from({ length: 8 }).map(function(_, i) {
                    return React.createElement('rect', {
                      key: i, x: '11', y: '2', width: '2', height: '6', rx: '1',
                      fill: 'currentColor', opacity: 0.15 + (i / 8) * 0.85,
                      transform: 'rotate(' + (i * 45) + ' 12 12)',
                    });
                  })
                )
              )
            : React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: text.trim() ? '#fbfaf6' : '#999', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
                React.createElement('line', { x1: 12, y1: 19, x2: 12, y2: 5 }),
                React.createElement('polyline', { points: '5 12 12 5 19 12' })
              )
        )
      )
    ),
    showAgents && React.createElement('div', {
      style: {
        position: 'absolute', bottom: '100%', left: 0, right: 0,
        marginBottom: '6px', background: COMPOSER_BG,
        border: '1px solid ' + COMPOSER_BORDER, borderRadius: '10px',
        boxShadow: COMPOSER_SHADOW, padding: '6px', zIndex: 100,
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
            background: isActive ? 'rgba(222,220,211,1)' : 'transparent',
            borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
            fontFamily: "'Inter', ui-sans-serif, sans-serif", fontSize: '13px',
          }
        },
          React.createElement('span', {
            style: {
              width: '24px', height: '24px', borderRadius: '6px',
              background: BADGE_COLORS[a.id] || '#2c2a27', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 600, flexShrink: 0,
            }
          }, (a.id || 'X')[0]),
          React.createElement('div', { style: { minWidth: 0 } },
            React.createElement('div', { style: { fontWeight: 500, color: '#2c2a27' } }, a.id),
            React.createElement('div', { style: { fontSize: '11px', color: 'rgba(44,42,39,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, a.description || a.focus || '')
          )
        );
      })
    )
  );
}
