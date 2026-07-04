import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { FluentProvider, createLightTheme } from '@fluentui/react-components';
import App from './App.jsx';

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

const theme = createLightTheme(x1Brand);

const container = document.getElementById('root');
createRoot(container).render(
  <FluentProvider theme={theme} style={{ height: '100vh' }}>
    <App />
  </FluentProvider>
);
