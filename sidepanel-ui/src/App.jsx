import * as React from 'react';
import * as B from './backend.js';
import { SidePanel } from './SidePanel.jsx';

function App({ githubUser, onLogout }) {
  return React.createElement(SidePanel, {
    githubUser: githubUser,
    onLogout: onLogout || function() {},
  });
}

export default App;
