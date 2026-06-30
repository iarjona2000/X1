(function() {
  const plugin = {
    id: 'custom-greeting',
    name: 'Custom Greeting',
    version: '1.0.0',

    async beforeCommand(cmd, context) {
      const l = cmd.toLowerCase();
      
      if (/buenos\s+(días|tardes|noches)|hola|hello/i.test(l)) {
        const greeting = await this.getPersonalizedGreeting();
        if (greeting && !l.includes('custom-greeting')) {
          return greeting;
        }
      }
      
      if (/rutina\s+matutina|morning\s+routine|morning\s+prep/i.test(l)) {
        return { action: 'morningRoutine', originalCmd: cmd };
      }
      
      return cmd;
    },

    async getPersonalizedGreeting() {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      
      const greetings = {
        morning: ['¡Buenos días! El sol está brillando, ¿listo para conquistar el día?', '¡Arriba! Hoy es un nuevo capítulo por escribir.'],
        afternoon: ['¡Buenas tardes! ¿Cómo va tu jornada?', 'Que la tarde te traiga más logros.'],
        evening: ['¡Buenas noches! Tiempo de desconectar y reflexionar.', 'Que la noche te traiga inspiración.']
      };
      
      const weather = await this.getWeather();
      const weatherNote = weather ? ` ${weather.temp}°C, ${weather.condition}` : '';
      
      const streak = await this.getHabitStreak();
      const streakNote = streak > 0 ? ` +${streak}🔥` : '';
      
      let greetingType = 'morning';
      if (hour >= 12 && hour < 18) greetingType = 'afternoon';
      if (hour >= 18) greetingType = 'evening';
      
      const greetingList = greetings[greetingType];
      const greeting = greetingList[Math.floor(Math.random() * greetingList.length)];
      
      return `${greeting}${weatherNote}${streakNote}\n\n¿Qué foco tienes para hoy?`;
    },

    async getWeather() {
      const result = await chrome.storage.local.get('x1_weather_cache');
      const cache = result.x1_weather_cache || {};
      
      if (cache.timestamp && Date.now() - cache.timestamp < 3600000) {
        return cache.data;
      }
      
      return null;
    },

    async onTimer(minute) {
      const now = new Date();
      if (now.getHours() === 8 && now.getMinutes() === 30) {
        const greeting = await this.getPersonalizedGreeting();
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'assets/icon-48.png',
          title: 'X1 Morning Brief',
          message: greeting
        });
      }
    },

    async getHabitStreak() {
      const result = await chrome.storage.local.get('x1_habit_streak');
      return result.x1_habit_streak || 0;
    },

    async cleanup() {
      console.log('[Custom Greeting] Cleanup completed');
    }
  };

  if (window.X1PluginRegistry && window.X1PluginRegistry.registerPlugin) {
    window.X1PluginRegistry.registerPlugin(plugin.id, plugin, {
      beforeCommand: plugin.beforeCommand,
      onTimer: plugin.onTimer
    });
  }
})();