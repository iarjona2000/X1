(function() {
  const plugin = {
    id: 'focus-mode',
    name: 'Focus Mode',
    version: '1.0.0',

    async beforeCommand(cmd, context) {
      const focusTime = await this.getFocusTime();
      if (!focusTime.active) return cmd;
      
      const l = cmd.toLowerCase();
      const blockedDomains = ['youtube.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'netflix.com'];
      const domain = context.domain || '';
      
      for (const blocked of blockedDomains) {
        if (domain.includes(blocked) && !/focus|modo\s+concentración/i.test(l)) {
          return { action: 'blockDistraction', domain: blocked, originalCmd: cmd };
        }
      }
      
      return cmd;
    },

    async onPageLoad(url, content) {
      const focusTime = await this.getFocusTime();
      if (!focusTime.active) return;
      
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      const noiseIndicators = ['video', 'stream', 'youtube', 'twitter', 'tiktok'];
      for (const indicator of noiseIndicators) {
        if (content.body.toLowerCase().includes(indicator) && content.body.length > 5000) {
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'focus-mode-blur',
                intensity: focusTime.intensity || 'medium'
              });
            }
          });
          break;
        }
      }
    },

    async onTimer(minute) {
      const focusTime = await this.getFocusTime();
      if (focusTime.active && minute % 5 === 0) {
        const stats = await this.getFocusStats();
        if (stats.focusMinutes > focusTime.goalMinutes) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'assets/icon-48.png',
            title: 'Focus Mode',
            message: '¡Objetivo de enfoque alcanzado! ' + stats.focusMinutes + ' minutos de concentración.'
          });
        }
      }
    },

    async getFocusTime() {
      const result = await chrome.storage.local.get('x1_focus_mode');
      return result.x1_focus_mode || { active: false, goalMinutes: 25, intensity: 'medium' };
    },

    async getFocusStats() {
      const result = await chrome.storage.local.get('x1_focus_stats');
      return result.x1_focus_stats || { focusMinutes: 0, distractionsBlocked: 0 };
    },

    async cleanup() {
      console.log('[Focus Mode] Cleanup completed');
    }
  };

  if (window.X1PluginRegistry && window.X1PluginRegistry.registerPlugin) {
    window.X1PluginRegistry.registerPlugin(plugin.id, plugin, {
      beforeCommand: plugin.beforeCommand,
      onPageLoad: plugin.onPageLoad,
      onTimer: plugin.onTimer
    });
  }
})();