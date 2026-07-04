import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { FluentProvider, createLightTheme } from '@fluentui/react-components';
import App from './App.jsx';

const brand = {
  10: '#1a0a3e', 20: '#2d1b69', 30: '#3f2a8a',
  40: '#4b3ac9', 50: '#5b4ad6', 60: '#6c5ce0',
  70: '#7e70e8', 80: '#9184ef', 90: '#a599f4',
  100: '#bbb0f8', 110: '#d1c9fb', 120: '#e8e3fd'
};

const theme = createLightTheme(brand);

const style = document.createElement('style');
style.textContent = `
  @font-face {
    font-family: 'SF Pro Display';
    src: local('SF Pro Display'), local('SF Pro Text'),
         local('Helvetica Neue'), local('Segoe UI');
    font-weight: normal;
    font-style: normal;
  }
  @font-face {
    font-family: 'SF Pro Display';
    src: local('SF Pro Display Medium'), local('SF Pro Text Medium'),
         local('Helvetica Neue Medium'), local('Segoe UI Semibold');
    font-weight: 600;
  }
  @font-face {
    font-family: 'SF Pro Display';
    src: local('SF Pro Display Bold'), local('SF Pro Text Bold'),
         local('Helvetica Neue Bold'), local('Segoe UI Bold');
    font-weight: 700;
  }
  * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
`;
document.head.appendChild(style);

const container = document.getElementById('root');
createRoot(container).render(
  <FluentProvider theme={theme} style={{ height: '100vh', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', 'Segoe UI', sans-serif" }}>
    <App />
  </FluentProvider>
);
