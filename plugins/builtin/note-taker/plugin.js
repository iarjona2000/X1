(function() {
  const plugin = {
    id: 'note-taker',
    name: 'Note Taker',
    version: '1.0.0',

    async onPageLoad(url, content) {
      const autoCapture = await this.getAutoCaptureSetting();
      if (!autoCapture) return;
      
      const articleIndicators = ['article', 'articleBody', 'content', 'main-content'];
      const hasArticle = articleIndicators.some(ind => 
        content.body.toLowerCase().includes(ind) || (content.elements || []).some(e => e.class && e.class.includes(ind))
      );
      
      if (hasArticle && content.body.length > 300) {
        const note = await this.extractNote(url, content);
        if (note) {
          await this.saveNote(note);
        }
      }
    },

    async afterCommand(result, context) {
      if (context.command && /guarda.*nota|anota|nota/i.test(context.command) && result && result.text) {
        const note = {
          title: context.title || 'Nota sin título',
          content: result.text,
          url: context.url || '',
          timestamp: Date.now(),
          tags: this.extractTags(result.text)
        };
        await this.saveNote(note);
      }
      return result;
    },

    async extractNote(url, content) {
      const keyPoints = (content.body || '').split('\n')
        .filter(line => line.length > 50 && line.length < 300)
        .slice(0, 5)
        .map(l => '• ' + l.trim());
      
      return {
        title: content.title || 'Page Note',
        url: url,
        content: keyPoints.join('\n'),
        timestamp: Date.now(),
        domain: new URL(url).hostname,
        autoCaptured: true
      };
    },

    async saveNote(note) {
      const result = await chrome.storage.local.get('x1_notes');
      const notes = result.x1_notes || [];
      notes.push(note);
      await chrome.storage.local.set({ x1_notes: notes.slice(-100) });
    },

    async getAutoCaptureSetting() {
      const result = await chrome.storage.local.get('x1_notes_auto_capture');
      return result.x1_notes_auto_capture !== false;
    },

    extractTags(text) {
      const tags = [];
      if (/\b(api|funcion|implement)\b/i.test(text)) tags.push('technical');
      if (/\b(meeting|reuni[oó]n|discuss)\b/i.test(text)) tags.push('meeting');
      if (/\b(idea|propuesta|soluci[oó]n)\b/i.test(text)) tags.push('idea');
      return tags;
    },

    async cleanup() {
      console.log('[Note Taker] Cleanup completed');
    }
  };

  if (window.X1PluginRegistry && window.X1PluginRegistry.registerPlugin) {
    window.X1PluginRegistry.registerPlugin(plugin.id, plugin, {
      onPageLoad: plugin.onPageLoad,
      afterCommand: plugin.afterCommand
    });
  }
})();