// X1 Side Panel v2 - Vanilla JavaScript
// No React build step required

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Remove loading screen
  setTimeout(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    const appContainer = document.getElementById('appContainer');
    
    loadingScreen.classList.add('fade-exit');
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
      appContainer.classList.remove('hidden');
    }, 500);
  }, 1500);

  // Initialize tab navigation
  initTabNavigation();
  
  // Initialize chat
  initChat();
  
  // Initialize FAB
  initFAB();
  
  // Initialize settings
  initSettings();
  
  // Initialize quick actions
  initQuickActions();
  
  // Load initial data
  loadConversations();
}

// Tab Navigation
function initTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      
      // Update active states
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`${tab}Tab`).classList.add('active');
    });
  });
}

// Floating Action Button
function initFAB() {
  const fab = document.getElementById('fab');
  const quickActionsPanel = document.getElementById('quickActionsPanel');
  
  fab.addEventListener('click', () => {
    quickActionsPanel.classList.toggle('hidden');
  });
  
  // Close quick actions when clicking outside
  document.addEventListener('click', (e) => {
    if (!fab.contains(e.target) && !quickActionsPanel.contains(e.target)) {
      quickActionsPanel.classList.add('hidden');
    }
  });
}

// Quick Actions
function initQuickActions() {
  const quickActions = document.querySelectorAll('.quick-action');
  
  quickActions.forEach(action => {
    action.addEventListener('click', () => {
      const actionType = action.dataset.action;
      handleQuickAction(actionType);
    });
  });
}

function handleQuickAction(action) {
  switch (action) {
    case 'summarize':
      sendMessage({ type: 'SUMMARIZE_PAGE' });
      break;
    case 'read-aloud':
      sendMessage({ type: 'READ_ALOUD' });
      break;
    case 'screenshot':
      sendMessage({ type: 'SCREENSHOT' });
      break;
    case 'ask-ai':
      // Switch to chat tab
      document.querySelector('[data-tab="chat"]').click();
      break;
  }
}

// Chat Functionality
function initChat() {
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  
  chatInput.addEventListener('input', () => {
    sendBtn.disabled = chatInput.value.trim() === '';
    autoResizeTextarea(chatInput);
  });
  
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) {
        sendMessageToAI();
      }
    }
  });
  
  sendBtn.addEventListener('click', sendMessageToAI);
}

function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

function sendMessageToAI() {
  const chatInput = document.getElementById('chatInput');
  const message = chatInput.value.trim();
  
  if (message) {
    addMessage('user', message);
    chatInput.value = '';
    chatInput.style.height = 'auto';
    document.getElementById('sendBtn').disabled = true;
    
    // Send message to background script
    sendMessage({ type: 'CHAT_MESSAGE', text: message });
  }
}

function addMessage(role, content) {
  const chatMessages = document.getElementById('chatMessages');
  const messageEl = document.createElement('div');
  messageEl.className = `message ${role}`;
  
  messageEl.innerHTML = `
    <div class="message-text">${escapeHtml(content)}</div>
  `;
  
  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Settings
function initSettings() {
  const darkModeToggle = document.getElementById('darkModeToggle');
  const notificationsToggle = document.getElementById('notificationsToggle');
  const autoRefreshToggle = document.getElementById('autoRefreshToggle');
  
  // Load saved settings
  chrome.storage.local.get(['darkMode', 'notifications', 'autoRefresh'], (result) => {
    if (result.darkMode !== undefined) {
      darkModeToggle.checked = result.darkMode;
      document.documentElement.setAttribute('data-theme', result.darkMode ? 'dark' : 'light');
    }
    if (result.notifications !== undefined) {
      notificationsToggle.checked = result.notifications;
    }
    if (result.autoRefresh !== undefined) {
      autoRefreshToggle.checked = result.autoRefresh;
    }
  });
  
  // Dark mode toggle
  darkModeToggle.addEventListener('change', () => {
    const isDark = darkModeToggle.checked;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    chrome.storage.local.set({ darkMode: isDark });
  });
  
  // Notifications toggle
  notificationsToggle.addEventListener('change', () => {
    chrome.storage.local.set({ notifications: notificationsToggle.checked });
    if (notificationsToggle.checked) {
      requestNotificationPermission();
    }
  });
  
  // Auto refresh toggle
  autoRefreshToggle.addEventListener('change', () => {
    chrome.storage.local.set({ autoRefresh: autoRefreshToggle.checked });
  });
}

// Data Loading
function loadConversations() {
  chrome.storage.local.get(['conversations'], (result) => {
    if (result.conversations) {
      renderConversations(result.conversations);
    }
  });
}

function renderConversations(conversations) {
  const chatMessages = document.getElementById('chatMessages');
  conversations.forEach(conv => {
    addMessage(conv.role, conv.content);
  });
}

// Chrome Runtime Messaging
function sendMessage(message) {
  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Extension error:', chrome.runtime.lastError);
      return;
    }
    if (response) {
      handleResponse(response);
    }
  });
}

function handleResponse(response) {
  switch (response.type) {
    case 'CHAT_RESPONSE':
      addMessage('assistant', response.text);
      break;
    case 'CALENDAR_EVENTS':
      renderEvents(response.events);
      break;
    case 'EMAILS':
      renderEmails(response.emails);
      break;
    case 'TASKS':
      renderTasks(response.tasks);
      break;
  }
}

function renderEvents(events) {
  const eventsList = document.getElementById('eventsList');
  if (!events || events.length === 0) return;
  
  eventsList.innerHTML = events.map(event => `
    <div class="event-item glass">
      <div class="event-time">${event.time}</div>
      <div class="event-title">${escapeHtml(event.title)}</div>
      <div class="event-description">${escapeHtml(event.description || '')}</div>
    </div>
  `).join('');
}

function renderEmails(emails) {
  const emailsList = document.getElementById('emailsList');
  if (!emails || emails.length === 0) return;
  
  emailsList.innerHTML = emails.map(email => `
    <div class="email-item glass">
      <div class="email-sender">${escapeHtml(email.sender)}</div>
      <div class="email-subject">${escapeHtml(email.subject)}</div>
      <div class="email-preview">${escapeHtml(email.preview || '')}</div>
    </div>
  `).join('');
}

function renderTasks(tasks) {
  const tasksList = document.getElementById('tasksList');
  if (!tasks || tasks.length === 0) return;
  
  tasksList.innerHTML = tasks.map(task => `
    <div class="task-item glass">
      <input type="checkbox" ${task.completed ? 'checked' : ''}>
      <span class="task-text ${task.completed ? 'completed' : ''}">${escapeHtml(task.text)}</span>
    </div>
  `).join('');
}

// Notifications
function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission();
  }
}

// Utility Functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export for testing
window.x1Sidepanel = {
  initApp,
  initTabNavigation,
  initFAB,
  sendMessage,
  addMessage
};