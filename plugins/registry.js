const BUILTIN_PLUGINS = [
  {
    id: 'calendar-enhancer',
    name: 'Calendar Enhancer',
    description: 'Enhanced calendar features including smart scheduling and event insights',
    version: '1.0.0',
    enabled: true,
    category: 'productivity',
    path: 'plugins/builtin/calendar-enhancer'
  },
  {
    id: 'email-ai',
    name: 'Email AI',
    description: 'AI-powered email triage, prioritization and suggestions',
    version: '1.0.0',
    enabled: true,
    category: 'communication',
    path: 'plugins/builtin/email-ai'
  },
  {
    id: 'focus-mode',
    name: 'Focus Mode',
    description: 'Advanced focus and distraction blocking with ambient awareness',
    version: '1.0.0',
    enabled: false,
    category: 'productivity',
    path: 'plugins/builtin/focus-mode'
  },
  {
    id: 'meeting-assistant',
    name: 'Meeting Assistant',
    description: 'Meeting preparation, real-time notes and follow-up automation',
    version: '1.0.0',
    enabled: true,
    category: 'productivity',
    path: 'plugins/builtin/meeting-assistant'
  },
  {
    id: 'note-taker',
    name: 'Note Taker',
    description: 'Auto-capture notes from any page with smart organization',
    version: '1.0.0',
    enabled: true,
    category: 'productivity',
    path: 'plugins/builtin/note-taker'
  },
  {
    id: 'habit-tracker',
    name: 'Habit Tracker',
    description: 'Track daily habits and routines with streak visualization',
    version: '1.0.0',
    enabled: false,
    category: 'wellness',
    path: 'plugins/builtin/habit-tracker'
  }
];

async function initializeBuiltinPlugins() {
  const result = await chrome.storage.local.get('x1_plugins');
  let pluginList = result.x1_plugins || [];
  
  for (const plugin of BUILTIN_PLUGINS) {
    if (!pluginList.includes(plugin.path)) {
      pluginList.push(plugin.path);
    }
  }
  
  await chrome.storage.local.set({ x1_plugins: pluginList });
  return BUILTIN_PLUGINS;
}

function getBuiltinPlugins() {
  return BUILTIN_PLUGINS;
}

function getPluginCategories() {
  const categories = {};
  BUILTIN_PLUGINS.forEach(p => {
    if (!categories[p.category]) categories[p.category] = [];
    categories[p.category].push(p);
  });
  return categories;
}

async function togglePlugin(pluginId) {
  const plugin = BUILTIN_PLUGINS.find(p => p.id === pluginId);
  if (!plugin) return false;
  
  plugin.enabled = !plugin.enabled;
  await chrome.storage.local.set({ 
    [`x1_plugin_${pluginId}`]: { enabled: plugin.enabled } 
  });
  return plugin.enabled;
}

async function getPluginStatus(pluginId) {
  const result = await chrome.storage.local.get(`x1_plugin_${pluginId}`);
  return result[`x1_plugin_${pluginId}`] || { enabled: true };
}

export { 
  BUILTIN_PLUGINS, 
  initializeBuiltinPlugins, 
  getBuiltinPlugins, 
  getPluginCategories, 
  togglePlugin, 
  getPluginStatus 
};