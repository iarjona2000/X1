(function() {
  const plugin = {
    id: 'calendar-enhancer',
    name: 'Calendar Enhancer',
    version: '1.0.0',

    async beforeCommand(cmd, context) {
      const l = cmd.toLowerCase();
      
      if (/calendario|agenda|reunión|meeting/i.test(l) && !/^abre|ve\s+a|ll[eé]vame/i.test(l)) {
        const timeMatch = cmd.match(/(mañana|hoy|pasado\s+mañana|este\s+fin|la\s+semana|pr[oó]xima\s+semana)/i);
        if (timeMatch) {
          return cmd + ' (smart-schedule: ' + timeMatch[1] + ')';
        }
      }
      
      if (/anula|cancela|elimina.*evento/i.test(l)) {
        return { action: 'smartCancel', originalCmd: cmd };
      }
      
      return cmd;
    },

    async onResponse(text, context) {
      const l = text.toLowerCase();
      
      if (/evento|reunión|agenda/i.test(context.prompt || '')) {
        const conflictPatterns = ['conflict', 'conflicto', 'solapado', 'coincide'];
        for (const pattern of conflictPatterns) {
          if (l.includes(pattern)) {
            return text + '\n\n[Calendar Enhancer] Sugiero revisar horarios alternativos: 15:00, 16:30, mañana a primera hora.';
          }
        }
      }
      
      if (/crea.*evento|agenda|programa/i.test(context.prompt || '')) {
        return text + '\n\n[Tip: Usa "calendar conflict check" para detectar solapamientos]';
      }
      
      return text;
    },

    async onTimer(minute) {
      const now = new Date();
      const hour = now.getHours();
      
      if (hour === 9 && now.getMinutes() === 0) {
        const result = await chrome.storage.local.get('x1_daily_events');
        const events = result.x1_daily_events || [];
        if (events.length > 3) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'assets/icon-48.png',
            title: 'X1 Calendar Enhancer',
            message: 'Día denso con ' + events.length + ' eventos. ¿Activar modo preparación?'
          });
        }
      }
    },

    async cleanup() {
      console.log('[Calendar Enhancer] Cleanup completed');
    }
  };

  if (window.X1PluginRegistry && window.X1PluginRegistry.registerPlugin) {
    window.X1PluginRegistry.registerPlugin(plugin.id, plugin, {
      beforeCommand: plugin.beforeCommand,
      onResponse: plugin.onResponse,
      onTimer: plugin.onTimer
    });
  }
})();