(function() {
  const plugin = {
    id: 'data-exporter',
    name: 'Data Exporter',
    version: '1.0.0',

    async beforeCommand(cmd, context) {
      const l = cmd.toLowerCase();
      
      if (/exporta.*conversaci[oó]n|export.*chat|download.*history/i.test(l)) {
        const data = await this.exportConversations();
        return { action: 'download', data, filename: 'conversations-' + this.getDateString() + '.md', originalCmd: cmd };
      }
      
      if (/exporta.*calendario|export.*calendar|download.*calendar/i.test(l)) {
        const data = await this.exportCalendar();
        return { action: 'download', data, filename: 'calendar-' + this.getDateString() + '.csv', originalCmd: cmd };
      }
      
      if (/exporta.*email|export.*email|download.*email/i.test(l)) {
        const data = await this.exportEmails();
        return { action: 'download', data, filename: 'emails-' + this.getDateString() + '.pdf', originalCmd: cmd };
      }
      
      return cmd;
    },

    async afterCommand(result, context) {
      if (context.action === 'download' && context.data) {
        await this.triggerDownload(context.data, context.filename);
        return { action: 'speak', text: `Exportado correctamente a ${context.filename}` };
      }
      return result;
    },

    async exportConversations() {
      const result = await chrome.storage.session.get('x1Memory');
      const memory = result.x1Memory || [];
      
      let markdown = '# X1 Conversation History\n\n';
      markdown += 'Exported: ' + new Date().toISOString() + '\n\n';
      
      memory.forEach((msg, i) => {
        const role = msg.role === 'user' ? '**Tú**' : '**X1**';
        markdown += `## ${role}\n${msg.content}\n\n`;
      });
      
      const notes = await chrome.storage.local.get('x1_notes');
      if (notes.x1_notes) {
        markdown += '\n---\n\n# Notas Guardadas\n\n';
        notes.x1_notes.forEach(note => {
          markdown += `## ${note.title}\n`;
          markdown += `Fuente: ${note.url}\n\n`;
          markdown += `${note.content}\n\n`;
        });
      }
      
      return markdown;
    },

    async exportCalendar() {
      const result = await chrome.storage.local.get('x1_meetings_cache');
      const meetings = result.x1_meetings_cache || [];
      
      let csv = 'Title,Start,End,Attendees,Description\n';
      
      meetings.forEach(meeting => {
        const row = [
          meeting.title || 'Sin título',
          meeting.start || '',
          meeting.end || '',
          meeting.attendees || '',
          (meeting.description || '').replace(/"/g, '""')
        ];
        csv += row.map(v => `"${v}"`).join(',') + '\n';
      });
      
      return csv;
    },

    async exportEmails() {
      const result = await chrome.storage.local.get('x1_emails_cache');
      const emails = result.x1_emails_cache || [];
      
      let content = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
      content += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
      content += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n';
      content += `4 0 obj\n<< /Title (Email Export) /Subject (X1 Exported Emails) >>\nendobj\n`;
      content += `5 0 obj\n<< /Length ${emails.length * 100} >>\nstream\n`;
      
      emails.forEach(email => {
        content += `From: ${email.from || 'Desconocido'}\n`;
        content += `Subject: ${email.subject || 'Sin asunto'}\n`;
        content += `Date: ${email.date || ''}\n`;
        content += `---\n${email.snippet || ''}\n\n`;
      });
      
      content += 'endstream\nendobj\nxref\n0 6\n0000000000 65535 f \n';
      content += 'trailer\n<< /Size 6 /Root 1 0 R >>\n%%EOF';
      
      return content;
    },

    async triggerDownload(data, filename) {
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      await chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      });
      
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    },

    getDateString() {
      const now = new Date();
      return now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0');
    },

    async cleanup() {
      console.log('[Data Exporter] Cleanup completed');
    }
  };

  if (window.X1PluginRegistry && window.X1PluginRegistry.registerPlugin) {
    window.X1PluginRegistry.registerPlugin(plugin.id, plugin, {
      beforeCommand: plugin.beforeCommand,
      afterCommand: plugin.afterCommand
    });
  }
})();