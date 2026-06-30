class X1PluginHooks {
  constructor() {
    this.hooks = {
      beforeCommand: [],
      afterCommand: [],
      onResponse: [],
      onPageLoad: [],
      onTimer: [],
      onError: []
    };
  }

  register(hookName, pluginId, callback) {
    if (!this.hooks[hookName]) {
      console.warn('[X1 Plugins] Unknown hook: ' + hookName);
      return false;
    }
    this.hooks[hookName].push({ pluginId, callback });
    console.log('[X1 Plugins] Hook ' + hookName + ' registered for plugin ' + pluginId);
    return true;
  }

  unregister(hookName, pluginId) {
    if (!this.hooks[hookName]) return;
    this.hooks[hookName] = this.hooks[hookName].filter(h => h.pluginId !== pluginId);
  }

  unregisterAll(pluginId) {
    for (const hookName in this.hooks) {
      this.hooks[hookName] = this.hooks[hookName].filter(h => h.pluginId !== pluginId);
    }
  }

  async execute(hookName, ...args) {
    const hooks = this.hooks[hookName] || [];
    let result = args[0];
    
    for (const { pluginId, callback } of hooks) {
      try {
        const plugin = X1PluginRegistry.getPlugin(pluginId);
        if (plugin && plugin.enabled) {
          result = await callback.apply(plugin, args);
        }
      } catch (error) {
        console.error('[X1 Plugins] Hook ' + hookName + ' error in ' + pluginId + ':', error);
        await this.execute('onError', { pluginId, error, hook: hookName });
      }
    }
    return result;
  }

  getHooks(hookName) {
    return [...(this.hooks[hookName] || [])];
  }
}

class X1PluginRegistry {
  constructor() {
    this.plugins = new Map();
    this.hooks = new X1PluginHooks();
  }

  async loadPlugin(pluginPath) {
    try {
      const manifest = await this.fetchPluginManifest(pluginPath);
      const pluginCode = await this.fetchPluginCode(pluginPath);
      
      const plugin = {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        enabled: manifest.enabled !== false,
        path: pluginPath,
        manifest: manifest,
        hooks: {}
      };

      this.plugins.set(plugin.id, plugin);
      
      const wrappedCode = '(function() { ' + pluginCode + '; ' +
        'if (window.X1PluginRegistry && window.X1PluginRegistry.registerPlugin) { ' +
        'window.X1PluginRegistry.registerPlugin && ' +
        'window.X1PluginRegistry.registerPlugin.apply(window.X1PluginRegistry, arguments); ' +
        '} })();';
      eval(wrappedCode);
      
      await this.savePluginState(plugin.id, { enabled: plugin.enabled });
      this.emit('onPluginLoaded', { pluginId: plugin.id, plugin });
      console.log('[X1 Plugins] Loaded plugin: ' + plugin.id);
      return plugin;
    } catch (error) {
      console.error('[X1 Plugins] Failed to load plugin ' + pluginPath + ':', error);
      await this.hooks.execute('onError', { error, pluginPath });
      return null;
    }
  }

  async fetchPluginManifest(pluginPath) {
    const url = chrome.runtime.getURL(pluginPath + '/manifest.json');
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch plugin manifest');
    return response.json();
  }

  async fetchPluginCode(pluginPath) {
    const url = chrome.runtime.getURL(pluginPath + '/plugin.js');
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch plugin code');
    return response.text();
  }

  async enablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;
    plugin.enabled = true;
    await this.savePluginState(pluginId, { enabled: true });
    this.emit('onPluginEnabled', { pluginId });
    return true;
  }

  async disablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;
    plugin.enabled = false;
    await this.savePluginState(pluginId, { enabled: false });
    this.emit('onPluginDisabled', { pluginId });
    return true;
  }

  getPlugin(pluginId) {
    return this.plugins.get(pluginId);
  }

  getAllPlugins() {
    return Array.from(this.plugins.values());
  }

  getEnabledPlugins() {
    return Array.from(this.plugins.values()).filter(p => p.enabled);
  }

  async savePluginState(pluginId, state) {
    const key = 'x1_plugin_' + pluginId;
    return chrome.storage.local.set({ [key]: state });
  }

  async loadPluginState(pluginId) {
    const key = 'x1_plugin_' + pluginId;
    const result = await chrome.storage.local.get(key);
    return result[key] || { enabled: true };
  }

  async loadAllPlugins() {
    const result = await chrome.storage.local.get('x1_plugins');
    const pluginList = result.x1_plugins || [];
    for (const path of pluginList) {
      await this.loadPlugin(path);
    }
  }

  async registerPluginPath(path) {
    const result = await chrome.storage.local.get('x1_plugins');
    const pluginList = result.x1_plugins || [];
    if (!pluginList.includes(path)) {
      pluginList.push(path);
      await chrome.storage.local.set({ x1_plugins: pluginList });
    }
    return this.loadPlugin(path);
  }

  async unregisterPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      if (plugin.instance && plugin.instance.cleanup) {
        await plugin.instance.cleanup();
      }
    }
    this.plugins.delete(pluginId);
    this.hooks.unregisterAll(pluginId);
  }

  getHooks() {
    return this.hooks;
  }

  async initialize() {
    await this.loadAllPlugins();
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'x1-plugin-timer') {
        await this.hooks.execute('onTimer', Math.floor(Date.now() / 60000));
      }
    });
    chrome.alarms.create('x1-plugin-timer', { periodInMinutes: 1 });
  }

  emit(event, data) {
    const eventKey = 'x1-plugin-event-' + event;
    chrome.storage.local.set({ [eventKey]: data });
    return this.hooks.execute(event, data);
  }
}

const registry = new X1PluginRegistry();
window.X1PluginRegistry = registry;