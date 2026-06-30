(function() {
  const plugin = {
    id: 'meeting-assistant',
    name: 'Meeting Assistant',
    version: '1.0.0',

    async beforeCommand(cmd, context) {
      const l = cmd.toLowerCase();
      
      if (/prepara.*reunión|prep[aá]rame|meeting/i.test(l)) {
        const nextMeeting = await this.getNextMeeting();
        if (nextMeeting) {
          return { action: 'meetingPrep', meeting: nextMeeting, originalCmd: cmd };
        }
      }
      
      if (/post-reunión|desp[uú]es.*reunión|follow.?up/i.test(l)) {
        return { action: 'meetingFollowup', originalCmd: cmd };
      }
      
      if (/toma.*nota|anota.*reunión|note.?taking/i.test(l)) {
        return { action: 'startNoteTaking', originalCmd: cmd };
      }
      
      return cmd;
    },

    async onResponse(text, context) {
      const l = text.toLowerCase();
      
      if (context.intent === 'planning' || /reunión|meeting|agenda/i.test(context.prompt || '')) {
        const nextMeeting = await this.getNextMeeting();
        if (nextMeeting) {
          const meetingInfo = `
[Meeting Assistant] Próxima reunión: ${nextMeeting.title}
Fecha: ${nextMeeting.date}
Asistentes: ${nextMeeting.attendees || 'No disponible'}
`;
          return text + '\n\n' + meetingInfo;
        }
      }
      
      return text;
    },

    async onTimer(minute) {
      const now = new Date();
      const meetings = await this.getUpcomingMeetings();
      
      for (const meeting of meetings) {
        const meetingTime = new Date(meeting.start).getTime();
        const diff = meetingTime - now.getTime();
        
        if (diff > 0 && diff < 900000 && !meeting.reminded) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'assets/icon-48.png',
            title: 'Meeting Assistant',
            message: `Reunión en 15 min: ${meeting.title}`
          });
          meeting.reminded = true;
        }
      }
      
      if (meetings.length > 0) {
        await chrome.storage.local.set({ x1_meetings_cache: meetings });
      }
    },

    async getNextMeeting() {
      const result = await chrome.storage.local.get('x1_meetings_cache');
      const meetings = result.x1_meetings_cache || [];
      const now = new Date();
      
      return meetings.find(m => new Date(m.start) > now) || null;
    },

    async getUpcomingMeetings() {
      const result = await chrome.storage.local.get('x1_meetings_cache');
      return result.x1_meetings_cache || [];
    },

    async cleanup() {
      console.log('[Meeting Assistant] Cleanup completed');
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