const fs = require('fs');
const path = 'C:\\Users\\tomas\\Desktop\\cbos-ext\\sidepanel';

// Enhanced terminal-app.js with service-worker bridge
const terminalJS = `// ═══════════════════════════════════════════════════════════════
// X1 TERMINAL APPLICATION — Monochrome Elegance
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  var state = {
    currentTab: 'terminal',
    terminalHistory: [],
    historyIndex: -1,
    tasks: [],
    events: [],
    emails: [],
    isProcessing: false,
    commandHistory: [],
    bootSequence: true
  };

  var elements = {};
  var bootLines = [
    '[BOOT] Initializing X1 Terminal v2.0...',
    '[BOOT] Loading modules: core, ai, voice, vision, calendar, email',
    '[BOOT] Establishing secure connection...',
    '[BOOT] Memory heap: ' + (performance.memory ? Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB' : 'N/A'),
    '[BOOT] Platform: ' + navigator.platform,
    '[SYS] System ready',
    '[SYS] Type "help" for available commands',
    '[SYS] Welcome, guest@x1'
  ];

  function init() {
    cacheElements();
    bindEvents();
    loadState();
    startClock();
    runBootSequence();
  }

  function cacheElements() {
    elements.loadingScreen = document.getElementById('loadingScreen');
    elements.appContainer = document.getElementById('appContainer');
    elements.terminalInput = document.getElementById('terminalInput');
    elements.terminalOutput = document.getElementById('terminalOutput');
    elements.terminalContainer = document.getElementById('terminalContainer');
    elements.tasksList = document.getElementById('tasksList');
    elements.taskInput = document.getElementById('taskInput');
    elements.taskInputContainer = document.getElementById('taskInputContainer');
    elements.calendarList = document.getElementById('calendarList');
    elements.emailList = document.getElementById('emailList');
    elements.emailCount = document.getElementById('emailCount');
    elements.systemGrid = document.getElementById('systemGrid');
    elements.clockDisplay = document.getElementById('clockDisplay');
    elements.memoryDisplay = document.getElementById('memoryDisplay');
    elements.statusDot = document.getElementById('statusDot');
    elements.tabBtns = document.querySelectorAll('.tab-btn');
    elements.tabContents = document.querySelectorAll('.tab-content');
  }

  function bindEvents() {
    elements.tabBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        switchTab(this.dataset.tab);
      });
    });

    elements.terminalInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var cmd = this.value.trim();
        if (cmd) {
          executeCommand(cmd);
          state.terminalHistory.push(cmd);
          state.historyIndex = state.terminalHistory.length;
          this.value = '';
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (state.historyIndex > 0) {
          state.historyIndex--;
          this.value = state.terminalHistory[state.historyIndex] || '';
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (state.historyIndex < state.terminalHistory.length - 1) {
          state.historyIndex++;
          this.value = state.terminalHistory[state.historyIndex] || '';
        } else {
          state.historyIndex = state.terminalHistory.length;
          this.value = '';
        }
      }
    });

    document.getElementById('submitTaskBtn').addEventListener('click', function() {
      var text = elements.taskInput.value.trim();
      if (text) {
        addTask(text);
        elements.taskInput.value = '';
      }
    });

    elements.taskInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        document.getElementById('submitTaskBtn').click();
      }
    });

    document.getElementById('addTaskBtn').addEventListener('click', function() {
      var container = elements.taskInputContainer;
      container.style.display = container.style.display === 'none' ? 'flex' : 'none';
      if (container.style.display === 'flex') {
        elements.taskInput.focus();
      }
    });

    document.getElementById('clearBtn').addEventListener('click', function() {
      elements.terminalOutput.innerHTML = '';
      addTerminalLine('SYS', 'Terminal cleared', 'info');
    });

    document.getElementById('helpBtn').addEventListener('click', function() {
      showHelp();
    });

    elements.terminalContainer.addEventListener('click', function() {
      elements.terminalInput.focus();
    });
  }

  function runBootSequence() {
    var i = 0;
    function next() {
      if (i >= bootLines.length) {
        state.bootSequence = false;
        setTimeout(function() {
          elements.loadingScreen.classList.add('hidden');
          elements.appContainer.classList.remove('hidden');
          elements.terminalInput.focus();
        }, 300);
        return;
      }
      var parts = bootLines[i].match(/^\\[([A-Z]+)\\]\\s*(.*)$/);
      if (parts) {
        addTerminalLine(parts[1], parts[2], parts[1].toLowerCase() === 'boot' ? 'info' : 'success');
      }
      i++;
      setTimeout(next, 80 + Math.random() * 120);
    }
    next();
  }

  function switchTab(tabId) {
    state.currentTab = tabId;
    elements.tabBtns.forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    elements.tabContents.forEach(function(content) {
      content.classList.toggle('active', content.id === tabId + 'Tab');
    });
    if (tabId === 'terminal') {
      setTimeout(function() { elements.terminalInput.focus(); }, 100);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TERMINAL COMMANDS
  // ═══════════════════════════════════════════════════════════════

  var commands = {
    help: function() {
      return [
        { type: 'info', text: 'Available commands:' },
        { type: 'output', text: '  help        - Show this help' },
        { type: 'output', text: '  clear       - Clear terminal' },
        { type: 'output', text: '  date        - Show current date/time' },
        { type: 'output', text: '  status      - System status' },
        { type: 'output', text: '  tasks       - List all tasks' },
        { type: 'output', text: '  add <task>  - Add new task' },
        { type: 'output', text: '  done <id>   - Complete task' },
        { type: 'output', text: '  del <id>    - Delete task' },
        { type: 'output', text: '  calendar    - Show calendar events' },
        { type: 'output', text: '  email       - Show recent emails' },
        { type: 'output', text: '  ls          - List commands' },
        { type: 'output', text: '  whoami      - Current user' },
        { type: 'output', text: '  echo <text> - Print text' },
        { type: 'output', text: '  calc <expr> - Simple calculator' },
        { type: 'output', text: '  time        - Show uptime' },
        { type: 'output', text: '  neofetch    - System info' }
      ];
    },

    clear: function() {
      elements.terminalOutput.innerHTML = '';
      return [{ type: 'info', text: 'Terminal cleared' }];
    },

    date: function() {
      return [{ type: 'output', text: new Date().toString() }];
    },

    status: function() {
      return [
        { type: 'success', text: 'System Status: ONLINE' },
        { type: 'output', text: 'Extension: Active' },
        { type: 'output', text: 'AI Engine: Ready (Groq)' },
        { type: 'output', text: 'Voice: Standby' },
        { type: 'output', text: 'Vision: Ready' },
        { type: 'output', text: 'Tasks: ' + state.tasks.length + ' active' }
      ];
    },

    tasks: function() {
      if (state.tasks.length === 0) {
        return [{ type: 'info', text: 'No tasks. Use "add <task>" to create one.' }];
      }
      var output = state.tasks.map(function(t, i) {
        var status = t.completed ? '[x]' : '[ ]';
        var priority = t.priority ? ' [' + t.priority.toUpperCase() + ']' : '';
        return status + ' ' + (i + 1) + '. ' + t.text + priority;
      });
      return [{ type: 'output', text: output.join('\\n') }];
    },

    calendar: function() {
      if (state.events.length === 0) {
        return [{ type: 'info', text: 'No upcoming events.' }];
      }
      return state.events.slice(0, 5).map(function(e) {
        return { type: 'output', text: e.time + ' - ' + e.title };
      });
    },

    email: function() {
      if (state.emails.length === 0) {
        return [{ type: 'info', text: 'Inbox empty.' }];
      }
      return state.emails.slice(0, 5).map(function(e) {
        return { type: 'output', text: '[' + e.time + '] ' + e.from + ': ' + e.subject };
      });
    },

    ls: function() {
      return [{ type: 'output', text: Object.keys(commands).join('  ') }];
    },

    whoami: function() {
      return [{ type: 'output', text: 'guest@x1' }];
    },

    echo: function(args) {
      return [{ type: 'output', text: args || '' }];
    },

    calc: function(args) {
      try {
        var result = Function('"use strict";return (' + args + ')')();
        return [{ type: 'success', text: '= ' + result }];
      } catch(e) {
        return [{ type: 'error', text: 'Error: ' + e.message }];
      }
    },

    time: function() {
      var uptime = Math.floor((Date.now() - startTime) / 1000);
      var h = Math.floor(uptime / 3600);
      var m = Math.floor((uptime % 3600) / 60);
      var s = uptime % 60;
      return [{ type: 'output', text: 'Uptime: ' + h + 'h ' + m + 'm ' + s + 's' }];
    },

    neofetch: function() {
      return [
        { type: 'info', text: '       .-/+oossssoo+/-.       ' },
        { type: 'info', text: '    \`:+ssssssssssssssssss+:\`    ' },
        { type: 'output', text: '  -+ssssssssssssssssssyyssss+-  ' },
        { type: 'output', text: ' .ossssssssssssssssssdMMMNysssso. ' },
        { type: 'output', text: ' /ssssssssssshdmmNNmmyNMMMMhssssss/ ' },
        { type: 'success', text: ' +sssshhsssddmhyNMMMMMNMMMMdyysssss+ ' },
        { type: 'success', text: ' ossyNhyNdyhdMMMMMMMNMMMMMNhssssssso ' },
        { type: 'output', text: ' ossyNhyNdyhdMMMMMMMNMMMMMNhssssssso ' },
        { type: 'output', text: ' +sssshhsssddmhyNMMMMMNMMMMdyysssss+ ' },
        { type: 'output', text: ' /ssssssssssshdmmNNmmyNMMMMhssssss/ ' },
        { type: 'output', text: ' .ossssssssssssssssssdMMMNysssso. ' },
        { type: 'info', text: '  -+ssssssssssssssssssyyssss+-  ' },
        { type: 'info', text: '    \`:+ssssssssssssssssss+:\`    ' },
        { type: 'info', text: '       .-/+oossssoo+/-.       ' },
        { type: 'output', text: '' },
        { type: 'success', text: '  X1 TERMINAL v2.0' },
        { type: 'output', text: '  OS: Chrome Extension MV3' },
        { type: 'output', text: '  Host: Browser Service Worker' },
        { type: 'output', text: '  AI: Groq (llama-3.3-70b)' },
        { type: 'output', text: '  Memory: ' + (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024) + ' KB' : 'N/A') },
        { type: 'output', text: '  Tasks: ' + state.tasks.length },
        { type: 'output', text: '  Theme: Monochrome' }
      ];
    }
  };

  function executeCommand(input) {
    addTerminalLine('guest@x1', '$ ' + input, 'prompt');

    var parts = input.split(' ');
    var cmd = parts[0].toLowerCase();
    var args = parts.slice(1).join(' ');

    if (commands[cmd]) {
      var result = commands[cmd](args);
      if (Array.isArray(result)) {
        result.forEach(function(line) {
          addTerminalLine('', line.text, line.type);
        });
      }
    } else {
      addTerminalLine('ERROR', 'Command not found: ' + cmd + '. Type "help" for available commands.', 'error');
    }

    addTerminalLine('', '', 'spacer');
    scrollToBottom();
    saveState();
  }

  function addTerminalLine(prefix, text, type) {
    var line = document.createElement('div');
    line.className = 'terminal-line';

    if (type === 'prompt') {
      line.innerHTML = '<span class="terminal-prefix">' + escapeHtml(prefix) + ' $</span><span class="terminal-cmd"> ' + escapeHtml(text) + '</span>';
    } else if (type === 'error') {
      line.innerHTML = '<span class="terminal-prefix error">[ERR]</span><span class="terminal-text error">' + escapeHtml(text) + '</span>';
    } else if (type === 'success') {
      line.innerHTML = '<span class="terminal-prefix success">[OK]</span><span class="terminal-text success">' + escapeHtml(text) + '</span>';
    } else if (type === 'info') {
      line.innerHTML = '<span class="terminal-prefix info">[*]</span><span class="terminal-text info">' + escapeHtml(text) + '</span>';
    } else if (type === 'spacer') {
      line.innerHTML = '&nbsp;';
    } else {
      if (prefix) {
        line.innerHTML = '<span class="terminal-prefix">[' + escapeHtml(prefix) + ']</span><span class="terminal-text">' + escapeHtml(text) + '</span>';
      } else {
        line.innerHTML = '<span class="terminal-text">' + escapeHtml(text) + '</span>';
      }
    }

    elements.terminalOutput.appendChild(line);
    scrollToBottom();
  }

  function scrollToBottom() {
    elements.terminalContainer.scrollTop = elements.terminalContainer.scrollHeight;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ═══════════════════════════════════════════════════════════════
  // TASKS
  // ═══════════════════════════════════════════════════════════════

  function addTask(text) {
    var task = {
      id: Date.now(),
      text: text,
      completed: false,
      priority: 'medium',
      createdAt: new Date().toISOString()
    };
    state.tasks.unshift(task);
    renderTasks();
    saveState();
    addTerminalLine('TASK', 'Added: ' + text, 'success');
    
    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'X1_ADD_TASK', text: text });
    }
  }

  function toggleTask(id) {
    var task = state.tasks.find(function(t) { return t.id === id; });
    if (task) {
      task.completed = !task.completed;
      renderTasks();
      saveState();
    }
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter(function(t) { return t.id !== id; });
    renderTasks();
    saveState();
  }

  function renderTasks() {
    if (state.tasks.length === 0) {
      elements.tasksList.innerHTML = '<div class="terminal-line"><span class="terminal-text info">No tasks. Use "add <task>" in terminal or click + NEW</span></div>';
      return;
    }
    elements.tasksList.innerHTML = state.tasks.map(function(task, index) {
      return '<div class="task-item">' +
        '<div class="task-checkbox ' + (task.completed ? 'checked' : '') + '" data-id="' + task.id + '"></div>' +
        '<div class="task-content">' +
          '<div class="task-title ' + (task.completed ? 'completed' : '') + '">' + escapeHtml(task.text) + '</div>' +
          '<div class="task-meta">#' + (index + 1) + ' · ' + task.priority + '</div>' +
        '</div>' +
        '<button class="delete-btn" data-id="' + task.id + '">×</button>' +
      '</div>';
    }).join('');

    elements.tasksList.querySelectorAll('.task-checkbox').forEach(function(cb) {
      cb.addEventListener('click', function() {
        toggleTask(parseInt(this.dataset.id));
      });
    });

    elements.tasksList.querySelectorAll('.delete-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        deleteTask(parseInt(this.dataset.id));
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CALENDAR
  // ═══════════════════════════════════════════════════════════════

  function renderCalendar() {
    if (state.events.length === 0) {
      elements.calendarList.innerHTML = '<div class="terminal-line"><span class="terminal-text info">No upcoming events</span></div>';
      return;
    }
    elements.calendarList.innerHTML = state.events.map(function(e) {
      return '<div class="calendar-event">' +
        '<div class="event-time">' + escapeHtml(e.time) + '</div>' +
        '<div class="event-title">' + escapeHtml(e.title) + '</div>' +
        (e.description ? '<div class="event-meta">' + escapeHtml(e.description) + '</div>' : '') +
      '</div>';
    }).join('');
  }

  // ═══════════════════════════════════════════════════════════════
  // EMAIL
  // ═══════════════════════════════════════════════════════════════

  function renderEmails() {
    elements.emailCount.textContent = state.emails.length + ' messages';
    if (state.emails.length === 0) {
      elements.emailList.innerHTML = '<div class="terminal-line"><span class="terminal-text info">Inbox empty</span></div>';
      return;
    }
    elements.emailList.innerHTML = state.emails.map(function(e) {
      return '<div class="email-item ' + (e.unread ? 'unread' : '') + '">' +
        '<div class="email-header">' +
          '<span class="email-from">' + escapeHtml(e.from) + '</span>' +
          '<span class="email-time">' + escapeHtml(e.time) + '</span>' +
        '</div>' +
        '<div class="email-subject">' + escapeHtml(e.subject) + '</div>' +
        '<div class="email-preview">' + escapeHtml(e.preview) + '</div>' +
      '</div>';
    }).join('');
  }

  // ═══════════════════════════════════════════════════════════════
  // SYSTEM INFO
  // ═══════════════════════════════════════════════════════════════

  function renderSystem() {
    var mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024) : 0;
    var memTotal = performance.memory ? Math.round(performance.memory.jsHeapSizeLimit / 1024) : 0;

    elements.systemGrid.innerHTML = [
      { label: 'STATUS', value: 'ONLINE' },
      { label: 'VERSION', value: '2.0.0' },
      { label: 'TASKS', value: state.tasks.length },
      { label: 'MEMORY', value: mem + ' / ' + memTotal + ' KB' },
      { label: 'UPTIME', value: formatUptime() },
      { label: 'PLATFORM', value: navigator.platform || 'Unknown' }
    ].map(function(item) {
      return '<div class="system-item">' +
        '<span class="system-label">' + item.label + '</span>' +
        '<span class="system-value">' + item.value + '</span>' +
      '</div>';
    }).join('');
  }

  function formatUptime() {
    var uptime = Math.floor((Date.now() - startTime) / 1000);
    var h = Math.floor(uptime / 3600);
    var m = Math.floor((uptime % 3600) / 60);
    var s = uptime % 60;
    return h + 'h ' + m + 'm ' + s + 's';
  }

  function renderAll() {
    renderTasks();
    renderCalendar();
    renderEmails();
    renderSystem();
  }

  // ═══════════════════════════════════════════════════════════════
  // CLOCK
  // ═══════════════════════════════════════════════════════════════

  function startClock() {
    setInterval(function() {
      var now = new Date();
      elements.clockDisplay.textContent = now.toLocaleTimeString('en-US', { hour12: false });
      var mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024) : 0;
      elements.memoryDisplay.textContent = mem + ' KB';
    }, 1000);
  }

  // ═══════════════════════════════════════════════════════════════
  // STATE PERSISTENCE
  // ═══════════════════════════════════════════════════════════════

  function saveState() {
    try {
      localStorage.setItem('x1_terminal_state', JSON.stringify({
        tasks: state.tasks,
        events: state.events,
        emails: state.emails,
        history: state.terminalHistory.slice(-100)
      }));
    } catch(e) {}
  }

  function loadState() {
    try {
      var saved = localStorage.getItem('x1_terminal_state');
      if (saved) {
        var data = JSON.parse(saved);
        state.tasks = data.tasks || [];
        state.events = data.events || [];
        state.emails = data.emails || [];
        state.terminalHistory = data.history || [];
        state.historyIndex = state.terminalHistory.length;
      }
    } catch(e) {}
  }

  function showHelp() {
    switchTab('terminal');
    var helpLines = commands.help();
    helpLines.forEach(function(line) {
      addTerminalLine('', line.text, line.type);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  var startTime = Date.now();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.X1Terminal = {
    execute: executeCommand,
    addTask: addTask,
    getState: function() { return state; },
    refresh: renderAll
  };

})();
`;

fs.writeFileSync(path + '\\terminal-app.js', terminalJS);
console.log('Updated terminal-app.js (' + terminalJS.split('\n').length + ' lines)');
