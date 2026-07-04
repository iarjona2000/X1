/*
 * Punto de entrada del side panel. Monta React con FluentProvider y un tema de
 * marca X1 propio (rampa violeta-índigo) — Fluent 2, pero identidad propia.
 */

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  FluentProvider,
  createLightTheme,
  createDarkTheme
} from '@fluentui/react-components';
import App from './App.jsx';

// Rampa de marca X1 (no es el azul por defecto de Fluent): índigo/violeta.
const x1Brand = {
  10: '#050318',
  20: '#0f0a2e',
  30: '#170f47',
  40: '#1f1560',
  50: '#291c79',
  60: '#332494',
  70: '#3f2fae',
  80: '#4b3ac9',
  90: '#5b4ad6',
  100: '#6c5ce0',
  110: '#7e70e8',
  120: '#9184ef',
  130: '#a599f4',
  140: '#bbb0f8',
  150: '#d1c9fb',
  160: '#e8e3fd'
};

const x1Light = createLightTheme(x1Brand);
const x1Dark = createDarkTheme(x1Brand);

function Root() {
  const initial = (() => {
    try { return localStorage.getItem('x1_theme') || 'light'; } catch (e) { return 'light'; }
  })();
  const [mode, setMode] = React.useState(initial);
  const toggle = () => setMode((m) => {
    const next = m === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('x1_theme', next); } catch (e) {}
    return next;
  });
  return (
    <FluentProvider theme={mode === 'light' ? x1Light : x1Dark} style={{ height: '100vh' }}>
      <App mode={mode} onToggleMode={toggle} />
    </FluentProvider>
  );
}

const container = document.getElementById('root');
createRoot(container).render(<Root />);
