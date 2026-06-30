(function() {
  const plugin = {
    id: 'habit-tracker',
    name: 'Habit Tracker',
    version: '1.0.0',

    async onTimer(minute) {
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      
      const habits = await this.getHabits();
      const completed = await this.getCompletedToday();
      
      if (now.getHours() === 20 && now.getMinutes() === 0) {
        const pending = habits.filter(h => !completed.includes(h.id));
        if (pending.length > 0) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'assets/icon-48.png',
            title: 'Habit Tracker',
            message: `${pending.length} hábitos pendientes para hoy. Ejecuta "habit tracker status" para ver tu progreso.`
          });
        }
        
        const streak = await this.calculateStreak();
        if (streak > 0 && completed.length === habits.length) {
          chrome.storage.local.set({
            x1_habit_streak: streak + 1
          });
        }
      }
    },

    async onResponse(text, context) {
      const l = text.toLowerCase();
      
      if (/ejercicio|medita|leer|estudio|trabajo\s+en\s+fuerte/i.test(context.prompt || '')) {
        const habit = await this.detectHabit(context.prompt);
        if (habit) {
          await this.markHabitComplete(habit.id);
          return text + `\n\n[Habit Tracker] ✓ ${habit.name} registrado (+1 streak)`;
        }
      }
      
      return text;
    },

    async getHabits() {
      const result = await chrome.storage.local.get('x1_habits');
      if (result.x1_habits) return result.x1_habits;
      
      const defaultHabits = [
        { id: 'exercise', name: 'Ejercicio', icon: '💪', time: '07:00' },
        { id: 'meditation', name: 'Meditación', icon: '🧘', time: '08:00' },
        { id: 'reading', name: 'Lectura', icon: '📚', time: '21:00' },
        { id: 'deepwork', name: 'Deep Work', icon: '🎯', time: '09:00' }
      ];
      
      await chrome.storage.local.set({ x1_habits: defaultHabits });
      return defaultHabits;
    },

    async getCompletedToday() {
      const result = await chrome.storage.local.get('x1_habit_completed_today');
      const data = result.x1_habit_completed_today || {};
      const today = new Date().toISOString().split('T')[0];
      return data[today] || [];
    },

    async markHabitComplete(habitId) {
      const result = await chrome.storage.local.get('x1_habit_completed_today');
      const data = result.x1_habit_completed_today || {};
      const today = new Date().toISOString().split('T')[0];
      
      if (!data[today]) data[today] = [];
      if (!data[today].includes(habitId)) {
        data[today].push(habitId);
        await chrome.storage.local.set({ x1_habit_completed_today: data });
      }
    },

    async detectHabit(text) {
      text = text.toLowerCase();
      const habits = await this.getHabits();
      
      for (const habit of habits) {
        if (text.includes(habit.id) || text.includes(habit.name.toLowerCase())) {
          return habit;
        }
      }
      return null;
    },

    async calculateStreak() {
      const result = await chrome.storage.local.get('x1_habit_streak');
      return result.x1_habit_streak || 0;
    },

    async cleanup() {
      console.log('[Habit Tracker] Cleanup completed');
    }
  };

  if (window.X1PluginRegistry && window.X1PluginRegistry.registerPlugin) {
    window.X1PluginRegistry.registerPlugin(plugin.id, plugin, {
      onTimer: plugin.onTimer,
      onResponse: plugin.onResponse
    });
  }
})();