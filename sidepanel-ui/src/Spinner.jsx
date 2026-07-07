import * as React from 'react';

export function Spinner({ className }) {
  return React.createElement('span', { className, role: 'status', 'aria-label': 'Working', style: { display: 'inline-flex' } },
    React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', className: 'animate-spin' },
      Array.from({ length: 8 }).map(function(_, i) {
        return React.createElement('rect', {
          key: i, x: '11', y: '2', width: '2', height: '6', rx: '1',
          fill: 'currentColor', opacity: 0.15 + (i / 8) * 0.85,
          transform: 'rotate(' + (i * 45) + ' 12 12)',
        });
      })
    )
  );
}
