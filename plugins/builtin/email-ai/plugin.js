(function() {
  const plugin = {
    id: 'email-ai',
    name: 'Email AI',
    version: '1.0.0',

    async beforeCommand(cmd, context) {
      const l = cmd.toLowerCase();
      
      if (/email|correo|gmail/i.test(l) && context.domain && context.domain.includes('mail.google')) {
        if (/prioriza|urgente|importante/i.test(l)) {
          return { action: 'triageMode', priority: 'high', originalCmd: cmd };
        }
      }
      
      if (/responder|contestar.*email/i.test(l)) {
        const toneMatch = cmd.match(/(formal|corto|y claro|r[aá]pido)/i);
        if (toneMatch) {
          return { action: 'smartReply', tone: toneMatch[1], originalCmd: cmd };
        }
      }
      
      return cmd;
    },

    async onResponse(text, context) {
      const l = text.toLowerCase();
      
      if (context.intent === 'social' || /email|correo|mensaje/i.test(context.prompt || '')) {
        const suggestions = [];
        suggestions.push('📧 Email AI: Usa "email ai triage" para priorizar tu bandeja');
        suggestions.push('⏰ Email AI: Programa respuestas con "responder mañana"');
        
        return text + '\n\n' + suggestions.join('\n');
      }
      
      return text;
    },

    async onPageLoad(url, content) {
      if (url && url.includes('mail.google.com')) {
        const emailMatches = content.body.match(/(\d+)\s*emails?\s*sin leer/gi);
        if (emailMatches) {
          const count = parseInt(emailMatches[0]) || 0;
          if (count > 10) {
            chrome.storage.local.set({
              x1_email_triage_needed: {
                count,
                timestamp: Date.now(),
                url
              }
            });
          }
        }
      }
    },

    async cleanup() {
      console.log('[Email AI] Cleanup completed');
    }
  };

  if (window.X1PluginRegistry && window.X1PluginRegistry.registerPlugin) {
    window.X1PluginRegistry.registerPlugin(plugin.id, plugin, {
      beforeCommand: plugin.beforeCommand,
      onResponse: plugin.onResponse,
      onPageLoad: plugin.onPageLoad
    });
  }
})();