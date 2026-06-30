var X1GmailAPI = (function() {

  var BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

  function getHeaders() {
    return X1GoogleAuth.getToken().then(function(token) {
      return { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
    });
  }

  function apiCall(path, method, body) {
    return getHeaders().then(function(headers) {
      var opts = { method: method || 'GET', headers: headers };
      if (body) opts.body = JSON.stringify(body);
      return fetch(BASE + path, opts).then(function(r) { return r.json(); });
    });
  }

  function listMessages(query, maxResults) {
    var q = query ? '?q=' + encodeURIComponent(query) + '&maxResults=' + (maxResults || 10) : '?maxResults=' + (maxResults || 10);
    return apiCall('/messages' + q).then(function(data) {
      if (data.error) throw new Error(data.error.message || 'GMAIL_LIST_ERROR');
      return data.messages || [];
    });
  }

  function getMessage(messageId, format) {
    return apiCall('/messages/' + messageId + '?format=' + (format || 'full')).then(function(data) {
      if (data.error) throw new Error(data.error.message || 'GMAIL_GET_ERROR');
      return parseMessage(data);
    });
  }

  function parseMessage(data) {
    var headers = data.payload && data.payload.headers || [];
    function getHeader(name) { for (var i = 0; i < headers.length; i++) { if (headers[i].name === name) return headers[i].value; } return ''; }
    var body = '';
    if (data.payload && data.payload.body && data.payload.body.data) {
      body = decodeBase64(data.payload.body.data);
    } else if (data.payload && data.payload.parts) {
      var parts = data.payload.parts;
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].mimeType === 'text/plain' && parts[i].body && parts[i].body.data) {
          body = decodeBase64(parts[i].body.data); break;
        }
      }
    } else if (data.snippet) {
      body = data.snippet;
    }
    return {
      id: data.id, threadId: data.threadId, subject: getHeader('Subject'), from: getHeader('From'),
      to: getHeader('To'), date: getHeader('Date'), snippet: data.snippet || '',
      body: body, labels: data.labelIds || []
    };
  }

  function decodeBase64(data) {
    try { return decodeURIComponent(escape(atob(data.replace(/-/g, '+').replace(/_/g, '/')))); } catch(e) { return atob(data.replace(/-/g, '+').replace(/_/g, '/')); }
  }

  function sendMessage(to, subject, body) {
    var raw = 'To: ' + to + '\r\nSubject: ' + subject + '\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n' + body;
    var encoded = btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return apiCall('/messages/send', 'POST', { raw: encoded });
  }

  function createDraft(to, subject, body) {
    var raw = 'To: ' + to + '\r\nSubject: ' + subject + '\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n' + body;
    var encoded = btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return apiCall('/drafts', 'POST', { message: { raw: encoded } });
  }

  function modifyLabels(messageId, addLabels, removeLabels) {
    return apiCall('/messages/' + messageId + '/modify', 'POST', { addLabelIds: addLabels || [], removeLabelIds: removeLabels || [] });
  }

  function getUnreadCount() {
    return apiCall('/messages?q=is:unread&maxResults=0').then(function(data) {
      return data.resultSizeEstimate || 0;
    });
  }

  function listLabels() {
    return apiCall('/labels').then(function(data) {
      return data.labels || [];
    });
  }

  function searchEmails(searchQuery) {
    return listMessages(searchQuery, 20).then(function(messages) {
      if (!messages || messages.length === 0) return [];
      return Promise.all(messages.map(function(m) { return getMessage(m.id, 'metadata'); }));
    });
  }

  function getThreadMessages(threadId) {
    return apiCall('/threads/' + threadId + '?format=full').then(function(data) {
      if (data.error) throw new Error(data.error.message || 'THREAD_ERROR');
      return (data.messages || []).map(function(m) { return parseMessage(m); });
    });
  }

  function summarizeEmails(messages) {
    if (!messages || messages.length === 0) return 'No hay correos.';
    var summary = messages.map(function(m, i) {
      return (i + 1) + '. De: ' + m.from + '\n   Asunto: ' + m.subject + '\n   ' + (m.snippet || m.body || '').substring(0, 100);
    }).join('\n');
    return summary;
  }

  return { listMessages: listMessages, getMessage: getMessage, sendMessage: sendMessage, createDraft: createDraft, modifyLabels: modifyLabels, getUnreadCount: getUnreadCount, listLabels: listLabels, searchEmails: searchEmails, getThreadMessages: getThreadMessages, summarizeEmails: summarizeEmails };
})();
