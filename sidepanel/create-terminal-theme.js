const fs = require('fs');
const path = 'C:\\Users\\tomas\\Desktop\\cbos-ext\\sidepanel';

// ============================================================
// TERMINAL THEME CSS - Monochrome Elegant Design
// ============================================================
const terminalCSS = `
/* ═══════════════════════════════════════════════════════════════
   X1 TERMINAL INTERFACE — Monochrome Elegance
   ═══════════════════════════════════════════════════════════════ */

@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');

:root {
  --bg-primary: #050505;
  --bg-secondary: #0a0a0a;
  --bg-tertiary: #111111;
  --bg-elevated: #1a1a1a;
  --bg-hover: #222222;
  --bg-active: #2a2a2a;
  
  --text-primary: #fafafa;
  --text-secondary: #b0b0b0;
  --text-tertiary: #707070;
  --text-muted: #505050;
  --text-dim: #3a3a3a;
  
  --border-primary: #2a2a2a;
  --border-secondary: #1f1f1f;
  --border-focus: #404040;
  
  --accent-primary: #ffffff;
  --accent-secondary: #d0d0d0;
  --accent-dim: #808080;
  
  --success: #e0e0e0;
  --warning: #c0c0c0;
  --error: #a0a0a0;
  --info: #d0d0d0;
  
  --glow: 0 0 20px rgba(255,255,255,0.03);
  --glow-strong: 0 0 40px rgba(255,255,255,0.06);
  
  --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  --font-size-xs: 10px;
  --font-size-sm: 11px;
  --font-size-md: 12px;
  --font-size-lg: 13px;
  --font-size-xl: 14px;
  
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 20px;
  --spacing-2xl: 24px;
  
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 6px;
  
  --transition-fast: 120ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
  
  --z-base: 1;
  --z-elevated: 10;
  --z-overlay: 100;
  --z-modal: 1000;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--font-size-md);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border-primary);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--border-focus);
}

/* Selection */
::selection {
  background: var(--text-primary);
  color: var(--bg-primary);
}

/* ═══════════════════════════════════════════════════════════════
   APP CONTAINER
   ═══════════════════════════════════════════════════════════════ */

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
  position: relative;
}

.app-container::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(255,255,255,0.008) 2px,
      rgba(255,255,255,0.008) 4px
    );
  pointer-events: none;
  z-index: 9999;
}

/* ═══════════════════════════════════════════════════════════════
   HEADER
   ═══════════════════════════════════════════════════════════════ */

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-secondary);
  background: var(--bg-secondary);
  min-height: 48px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.logo-wrapper {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.logo-text {
  font-size: var(--font-size-xl);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  opacity: 0.5;
}

.status-indicator.online {
  background: var(--text-primary);
  opacity: 1;
  box-shadow: 0 0 8px rgba(255,255,255,0.3);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.header-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-tertiary);
  padding: var(--spacing-sm);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}

.header-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
  border-color: var(--border-primary);
}

.header-btn:active {
  background: var(--bg-active);
}

/* ═══════════════════════════════════════════════════════════════
   TAB NAVIGATION
   ═══════════════════════════════════════════════════════════════ */

.tab-navigation {
  display: flex;
  gap: 1px;
  background: var(--border-secondary);
  border-bottom: 1px solid var(--border-secondary);
  padding: 0 var(--spacing-sm);
  overflow-x: auto;
}

.tab-btn {
  flex: 1;
  min-width: 60px;
  background: var(--bg-secondary);
  border: none;
  color: var(--text-tertiary);
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  position: relative;
  white-space: nowrap;
}

.tab-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: transparent;
  transition: background var(--transition-fast);
}

.tab-btn:hover {
  color: var(--text-secondary);
  background: var(--bg-tertiary);
}

.tab-btn.active {
  color: var(--text-primary);
  background: var(--bg-primary);
}

.tab-btn.active::after {
  background: var(--text-primary);
}

.tab-btn i {
  font-size: 12px;
  opacity: 0.7;
}

.tab-btn.active i {
  opacity: 1;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN CONTENT
   ═══════════════════════════════════════════════════════════════ */

.main-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.tab-content {
  display: none;
  height: 100%;
  overflow-y: auto;
  padding: var(--spacing-lg);
}

.tab-content.active {
  display: block;
}

/* ═══════════════════════════════════════════════════════════════
   TERMINAL PROMPT STYLE
   ═══════════════════════════════════════════════════════════════ */

.terminal-prompt {
  color: var(--text-primary);
  font-size: var(--font-size-md);
  line-height: 1.6;
}

.terminal-prompt::before {
  content: '>';
  color: var(--text-tertiary);
  margin-right: var(--spacing-sm);
  font-weight: 300;
}

.terminal-output {
  color: var(--text-secondary);
  padding-left: var(--spacing-lg);
  border-left: 1px solid var(--border-secondary);
  margin-left: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.terminal-error {
  color: var(--error);
  padding-left: var(--spacing-lg);
  border-left: 1px solid var(--error);
  margin-left: var(--spacing-xs);
  opacity: 0.8;
}

.terminal-success {
  color: var(--success);
  padding-left: var(--spacing-lg);
  border-left: 1px solid var(--success);
  margin-left: var(--spacing-xs);
}

.terminal-info {
  color: var(--info);
  padding-left: var(--spacing-lg);
  border-left: 1px solid var(--info);
  margin-left: var(--spacing-xs);
  font-style: italic;
}

/* ═══════════════════════════════════════════════════════════════
   CHAT INTERFACE
   ═══════════════════════════════════════════════════════════════ */

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md) 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.message {
  max-width: 90%;
  animation: messageIn 200ms ease;
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  align-self: flex-end;
}

.message.assistant {
  align-self: flex-start;
}

.message.system {
  align-self: center;
  max-width: 100%;
  text-align: center;
}

.message-meta {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.message.user .message-meta {
  text-align: right;
}

.message-content {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  line-height: 1.6;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message.user .message-content {
  background: var(--bg-tertiary);
  border-color: var(--border-primary);
}

.message-content strong {
  color: var(--text-primary);
  font-weight: 600;
}

.message-content code {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  background: var(--bg-primary);
  padding: 1px 4px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-secondary);
}

.message-content pre {
  background: var(--bg-primary);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-sm);
  padding: var(--spacing-md);
  margin: var(--spacing-sm) 0;
  overflow-x: auto;
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

.message-content pre code {
  background: none;
  padding: 0;
  border: none;
}

/* Cursor */
.cursor::after {
  content: '█';
  animation: blink 1s step-end infinite;
  color: var(--text-primary);
  margin-left: 1px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Chat Input */
.chat-input-container {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) 0;
  border-top: 1px solid var(--border-secondary);
  background: var(--bg-secondary);
}

.chat-input {
  flex: 1;
  background: var(--bg-primary);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--font-size-md);
  padding: var(--spacing-sm) var(--spacing-md);
  resize: none;
  outline: none;
  transition: border-color var(--transition-fast);
  min-height: 36px;
  max-height: 120px;
  line-height: 1.5;
}

.chat-input::placeholder {
  color: var(--text-muted);
  font-style: italic;
}

.chat-input:focus {
  border-color: var(--border-focus);
}

.send-button {
  background: var(--text-primary);
  border: 1px solid var(--text-primary);
  color: var(--bg-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  font-weight: 600;
  transition: all var(--transition-fast);
  min-width: 60px;
}

.send-button:hover:not(:disabled) {
  background: var(--text-secondary);
  border-color: var(--text-secondary);
}

.send-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* ═══════════════════════════════════════════════════════════════
   CALENDAR
   ═══════════════════════════════════════════════════════════════ */

.calendar-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.calendar-header {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-secondary);
}

.calendar-event {
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.calendar-event:hover {
  border-color: var(--border-primary);
  background: var(--bg-tertiary);
}

.event-title {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.event-time {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.event-meta {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-top: var(--spacing-xs);
}

/* ═══════════════════════════════════════════════════════════════
   TASKS / TODOS
   ═══════════════════════════════════════════════════════════════ */

.task-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  margin-bottom: var(--spacing-sm);
}

.task-item:hover {
  border-color: var(--border-primary);
  background: var(--bg-tertiary);
}

.task-checkbox {
  width: 14px;
  height: 14px;
  border: 1px solid var(--border-focus);
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  transition: all var(--transition-fast);
}

.task-checkbox:hover {
  border-color: var(--text-primary);
}

.task-checkbox.checked {
  background: var(--text-primary);
  border-color: var(--text-primary);
}

.task-checkbox.checked::after {
  content: '✓';
  color: var(--bg-primary);
  font-size: 10px;
  font-weight: bold;
}

.task-content {
  flex: 1;
}

.task-title {
  font-size: var(--font-size-md);
  color: var(--text-primary);
  margin-bottom: 2px;
}

.task-title.completed {
  text-decoration: line-through;
  color: var(--text-tertiary);
}

.task-meta {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.task-priority {
  font-size: var(--font-size-xs);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.task-priority.high {
  color: var(--error);
  border: 1px solid var(--error);
}

.task-priority.medium {
  color: var(--warning);
  border: 1px solid var(--warning);
}

.task-priority.low {
  color: var(--text-tertiary);
  border: 1px solid var(--text-tertiary);
}

/* ═══════════════════════════════════════════════════════════════
   EMAIL
   ═══════════════════════════════════════════════════════════════ */

.email-item {
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.email-item:hover {
  border-color: var(--border-primary);
  background: var(--bg-tertiary);
}

.email-item.unread {
  border-left: 2px solid var(--text-primary);
}

.email-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-xs);
}

.email-from {
  font-weight: 500;
  color: var(--text-primary);
  font-size: var(--font-size-md);
}

.email-time {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.email-subject {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.email-preview {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ═══════════════════════════════════════════════════════════════
   SETTINGS
   ═══════════════════════════════════════════════════════════════ */

.settings-section {
  margin-bottom: var(--spacing-xl);
}

.settings-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-secondary);
}

.settings-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--border-secondary);
}

.settings-label {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
}

.settings-value {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.toggle {
  width: 32px;
  height: 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  transition: all var(--transition-fast);
}

.toggle.active {
  background: var(--text-primary);
  border-color: var(--text-primary);
}

.toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 10px;
  height: 10px;
  background: var(--text-tertiary);
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.toggle.active::after {
  left: 18px;
  background: var(--bg-primary);
}

/* ═══════════════════════════════════════════════════════════════
   STATUS BAR
   ═══════════════════════════════════════════════════════════════ */

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-secondary);
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-bar-left,
.status-bar-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.status-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text-muted);
}

.status-dot.active {
  background: var(--text-primary);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ═══════════════════════════════════════════════════════════════
   LOADING SCREEN
   ═══════════════════════════════════════════════════════════════ */

.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
}

.loading-content {
  text-align: center;
}

.loading-logo {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xl);
  letter-spacing: -0.02em;
}

.loading-logo::after {
  content: '█';
  animation: blink 1s step-end infinite;
  margin-left: 2px;
}

.loading-progress {
  width: 200px;
  height: 1px;
  background: var(--border-secondary);
  margin-bottom: var(--spacing-lg);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--text-primary);
  animation: loading 1.5s ease-in-out infinite;
}

@keyframes loading {
  0% { width: 0%; margin-left: 0; }
  50% { width: 100%; margin-left: 0; }
  100% { width: 0%; margin-left: 100%; }
}

.loading-text {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.2em;
}

/* ═══════════════════════════════════════════════════════════════
   UTILITY CLASSES
   ═══════════════════════════════════════════════════════════════ */

.hidden { display: none !important; }

.text-muted { color: var(--text-muted); }
.text-secondary { color: var(--text-secondary); }
.text-primary { color: var(--text-primary); }

.border-b { border-bottom: 1px solid var(--border-secondary); }
.border-t { border-top: 1px solid var(--border-secondary); }

.mt-sm { margin-top: var(--spacing-sm); }
.mt-md { margin-top: var(--spacing-md); }
.mt-lg { margin-top: var(--spacing-lg); }
.mb-sm { margin-bottom: var(--spacing-sm); }
.mb-md { margin-bottom: var(--spacing-md); }
.mb-lg { margin-bottom: var(--spacing-lg); }

.flex { display: flex; }
.flex-col { flex-direction: column; }
.gap-sm { gap: var(--spacing-sm); }
.gap-md { gap: var(--spacing-md); }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }

/* ═══════════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════════ */

@media (max-width: 400px) {
  :root {
    --font-size-md: 11px;
    --font-size-lg: 12px;
  }
  
  .tab-btn span {
    display: none;
  }
  
  .tab-btn {
    min-width: 40px;
  }
}
`;

// Write CSS
fs.writeFileSync(path + '\\terminal-theme.css', terminalCSS);
console.log('Created terminal-theme.css (' + terminalCSS.split('\n').length + ' lines)');
