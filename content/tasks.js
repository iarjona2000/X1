(function() {
  'use strict';
  console.log('[X1] Tasks content script loaded');

  var style = document.createElement('style');
  style.textContent = '.x1-tasks-panel{position:fixed;bottom:140px;right:20px;z-index:9999;background:#fff;border:1px solid #e5e3df;border-radius:14px;box-shadow:0 4px 24px rgba(0,0,0,.08);width:320px;max-height:400px;font-family:Inter,sans-serif;font-size:12px;color:#1a1a1a;overflow:hidden;display:none;flex-direction:column}.x1-tasks-panel.visible{display:flex}.x1-tasks-header{padding:12px 16px;border-bottom:1px solid #e5e3df;font-weight:600;font-size:13px;display:flex;justify-content:space-between;align-items:center}.x1-tasks-list{padding:8px;overflow-y:auto;flex:1}.x1-tasks-item{padding:8px 10px;border-radius:8px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:background .15s ease}.x1-tasks-item:hover{background:#f5f4f2}.x1-tasks-item.done{opacity:.5;text-decoration:line-through}.x1-tasks-check{width:16px;height:16px;border-radius:50%;border:2px solid #d4d0ca;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s ease;font-size:9px;color:transparent}.x1-tasks-check.done{border-color:#22c55e;background:#22c55e;color:#fff}.x1-tasks-text{flex:1}.x1-tasks-add{padding:10px 16px;border-top:1px solid #e5e3df;display:flex;gap:8px}.x1-tasks-add input{flex:1;border:1px solid #e5e3df;border-radius:8px;padding:6px 10px;font-size:11px;outline:0}.x1-tasks-add button{background:#1a1a1a;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;cursor:pointer}';
  document.head.appendChild(style);

  var panel = document.createElement('div');
  panel.className = 'x1-tasks-panel';
  panel.innerHTML =
    '<div class="x1-tasks-header"><span>Tasks</span><button id="x1-tasks-close" style="background:none;border:none;font-size:16px;cursor:pointer;color:#8a8a8a">&times;</button></div>' +
    '<div class="x1-tasks-list" id="x1-tasks-list"><div style="padding:16px;text-align:center;color:#8a8a8a">Cargando...</div></div>' +
    '<div class="x1-tasks-add">' +
    '<input id="x1-tasks-input" placeholder="Nueva tarea..." />' +
    '<button id="x1-tasks-add-btn">Add</button></div>';
  document.body.appendChild(panel);

  function loadTasks() {
    chrome.storage.local.get(['cbos_tasks', 'x1_tasks'], function(r) {
      var tasks = (r && r.x1_tasks) || (r && r.cbos_tasks) || [];
      var list = document.getElementById('x1-tasks-list');
      if (!list) return;
      if (!tasks.length) { list.innerHTML = '<div style="padding:16px;text-align:center;color:#8a8a8a">No tasks</div>'; return; }
      list.innerHTML = '';
      tasks.forEach(function(task, i) {
        var item = document.createElement('div');
        item.className = 'x1-tasks-item' + (task.done ? ' done' : '');
        item.innerHTML =
          '<div class="x1-tasks-check' + (task.done ? ' done' : '') + '" data-i="' + i + '">' + (task.done ? '✓' : '') + '</div>' +
          '<span class="x1-tasks-text">' + (task.text || '') + '</span>';
        item.querySelector('.x1-tasks-check').addEventListener('click', function(e) {
          e.stopPropagation();
          var idx = parseInt(this.getAttribute('data-i'));
          tasks[idx].done = !tasks[idx].done;
          chrome.storage.local.set({ x1_tasks: tasks });
          loadTasks();
        });
        list.appendChild(item);
      });
    });
  }

  document.getElementById('x1-tasks-close').addEventListener('click', function() { panel.classList.remove('visible'); });
  document.getElementById('x1-tasks-add-btn').addEventListener('click', function() {
    var input = document.getElementById('x1-tasks-input');
    var text = input.value.trim();
    if (!text) return;
    chrome.storage.local.get(['x1_tasks'], function(r) {
      var tasks = (r && r.x1_tasks) || [];
      tasks.push({ text: text, done: false, date: new Date().toISOString() });
      chrome.storage.local.set({ x1_tasks: tasks });
      input.value = '';
      loadTasks();
    });
  });
  document.getElementById('x1-tasks-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('x1-tasks-add-btn').click();
  });

  chrome.storage.onChanged.addListener(function(changes) {
    if (changes.x1_tasks || changes.cbos_tasks) loadTasks();
  });

  window.addEventListener('message', function(e) {
    if (e.data && e.data.source === 'x1-tasks-toggle') {
      panel.classList.toggle('visible');
      if (panel.classList.contains('visible')) loadTasks();
    }
  });
})();
