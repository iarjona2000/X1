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
      console.warn(`[X1 Plugins] Unknown hook: ${hookName}`);
      return false;
    }
    this.hooks[hookName].push({ pluginId, callback });
    console.log(`[X1 Plugins] Hook ${hookName} registered for plugin ${pluginId}`);
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
        console.error(`[X1 Plugins] Hook ${hookName} error in ${pluginId}:`, error);
        await this.execute('onError', { pluginId, error, hook: hookName });
      }
    }
    return result;
  }

  getHooks(hookName) {
    return [...(this.hooks[hookName] || [])];
  }
}