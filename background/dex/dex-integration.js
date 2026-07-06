// Dex by ThirdLayer — Full Feature Parity for X1
// All functions in ES5 for MV3 SW compatibility

// ============================================================
// 1. HELPERS
// ============================================================
var X1_DEX_KEY = 'x1_dex_data';
var X1_DEX_CONTACTS_KEY = 'x1_dex_contacts';
var X1_DEX_NOTES_KEY = 'x1_dex_notes';
var X1_DEX_BLOCKED_KEY = 'x1_dex_blocked';
var X1_DEX_SETTINGS_KEY = 'x1_dex_settings';

function dexGet(key, cb) { chrome.storage.local.get(key, function(r) { cb(r && r[key]); }); }
function dexSet(key, val, cb) { var o = {}; o[key] = val; chrome.storage.local.set(o, cb || function(){}); }

function dexTimestamp() { return new Date().toISOString(); }
function dexUid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); }

// ============================================================
// 2. CONTACT MANAGEMENT
// ============================================================

function x1ContactAdd(data, cb) {
  dexGet(X1_DEX_CONTACTS_KEY, function(list) {
    list = list || [];
    var existing = null;
    for (var i = 0; i < list.length; i++) {
      if (data.email && list[i].email === data.email) { existing = list[i]; existing.id = list[i].id; break; }
      if (data.linkedin && list[i].linkedin === data.linkedin) { existing = list[i]; existing.id = list[i].id; break; }
    }
    if (existing) {
      for (var k in data) { if (data.hasOwnProperty(k)) existing[k] = data[k]; }
      existing.updated = dexTimestamp();
      dexSet(X1_DEX_CONTACTS_KEY, list, function() { if (cb) cb(null, existing); });
    } else {
      var contact = {
        id: dexUid(), name: data.name || '', email: data.email || '',
        company: data.company || '', title: data.title || '', phone: data.phone || '',
        linkedin: data.linkedin || '', notes: data.notes || '', tags: data.tags || [],
        picture: data.picture || '', source: data.source || 'manual',
        created: dexTimestamp(), updated: dexTimestamp(),
        interactions: [], emailThreads: [], meetingHistory: [],
        lastInteraction: null, interactionCount: 0
      };
      list.push(contact);
      dexSet(X1_DEX_CONTACTS_KEY, list, function() { if (cb) cb(null, contact); });
    }
  });
}

function x1ContactGet(id, cb) {
  dexGet(X1_DEX_CONTACTS_KEY, function(list) {
    list = list || [];
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { if (cb) cb(list[i]); return; } }
    if (cb) cb(null);
  });
}

function x1ContactSearch(query, cb) {
  dexGet(X1_DEX_CONTACTS_KEY, function(list) {
    list = list || [];
    var q = query.toLowerCase();
    var results = [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if ((c.name && c.name.toLowerCase().indexOf(q) >= 0) ||
          (c.email && c.email.toLowerCase().indexOf(q) >= 0) ||
          (c.company && c.company.toLowerCase().indexOf(q) >= 0) ||
          (c.title && c.title.toLowerCase().indexOf(q) >= 0)) {
        results.push(c);
      }
    }
    if (cb) cb(results);
  });
}

function x1ContactList(cb) {
  dexGet(X1_DEX_CONTACTS_KEY, function(list) { if (cb) cb(list || []); });
}

function x1ContactDelete(id, cb) {
  dexGet(X1_DEX_CONTACTS_KEY, function(list) {
    list = list || [];
    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { list.splice(i, 1); found = true; break; }
    }
    if (found) { dexSet(X1_DEX_CONTACTS_KEY, list, function() { if (cb) cb(true); }); }
    else { if (cb) cb(false); }
  });
}

function x1ContactAddInteraction(id, type, summary, cb) {
  x1ContactGet(id, function(c) {
    if (!c) { if (cb) cb(false); return; }
    c.interactions = c.interactions || [];
    c.interactions.push({ date: dexTimestamp(), type: type, summary: summary });
    c.lastInteraction = dexTimestamp();
    c.interactionCount = (c.interactionCount || 0) + 1;
    dexGet(X1_DEX_CONTACTS_KEY, function(list) {
      list = list || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) { list[i] = c; break; }
      }
      dexSet(X1_DEX_CONTACTS_KEY, list, function() { if (cb) cb(true); });
    });
  });
}

function x1ContactGetTimeline(id, cb) {
  x1ContactGet(id, function(c) {
    if (!c) { if (cb) cb([]); return; }
    var timeline = [];
    if (c.interactions) { for (var i = 0; i < c.interactions.length; i++) { timeline.push(c.interactions[i]); } }
    if (c.emailThreads) { for (var j = 0; j < c.emailThreads.length; j++) { timeline.push(c.emailThreads[j]); } }
    if (c.meetingHistory) { for (var k = 0; k < c.meetingHistory.length; k++) { timeline.push(c.meetingHistory[k]); } }
    timeline.sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); });
    if (cb) cb(timeline);
  });
}

function x1ContactAutoAddFromEmail(fromEmail, fromName, subject, snippet, cb) {
  if (!fromEmail) { if (cb) cb(null); return; }
  x1ContactSearch(fromEmail, function(results) {
    if (results && results.length > 0) {
      x1ContactAddInteraction(results[0].id, 'email', subject + ': ' + (snippet || '').substring(0, 200), cb);
    } else {
      x1ContactAdd({ name: fromName || fromEmail, email: fromEmail, source: 'gmail' }, function(err, c) {
        if (c) x1ContactAddInteraction(c.id, 'email', subject + ': ' + (snippet || '').substring(0, 200), cb);
        else if (cb) cb(null);
      });
    }
  });
}

function x1ContactAutoAddFromMeeting(eventTitle, attendees, cb) {
  if (!attendees || !attendees.length) { if (cb) cb([]); return; }
  var added = [];
  function processNext(idx) {
    if (idx >= attendees.length) { if (cb) cb(added); return; }
    var a = attendees[idx];
    if (!a.email || a.email === '') { processNext(idx + 1); return; }
    x1ContactSearch(a.email, function(results) {
      var c = results && results.length > 0 ? results[0] : null;
      if (c) {
        x1ContactAddInteraction(c.id, 'meeting', eventTitle || 'Reunion', function() {
          added.push(c);
          processNext(idx + 1);
        });
      } else {
        x1ContactAdd({ name: a.name || a.email, email: a.email, source: 'calendar' }, function(err, newC) {
          if (newC) {
            x1ContactAddInteraction(newC.id, 'meeting', eventTitle || 'Reunion', function() {
              added.push(newC);
              processNext(idx + 1);
            });
          } else { processNext(idx + 1); }
        });
      }
    });
  }
  processNext(0);
}

function x1ContactExportToSheets(cb) {
  x1ContactList(function(contacts) {
    if (!contacts || contacts.length === 0) { if (cb) cb({ error: 'No hay contactos para exportar' }); return; }
    if (typeof X1DriveAPI === 'undefined' || !X1DriveAPI.createSheet) { if (cb) cb({ error: 'Google no conectado' }); return; }
    X1DriveAPI.createSheet('X1 Contacts - ' + dexTimestamp().substring(0, 10)).then(function(sheet) {
      var headers = [['Name', 'Email', 'Company', 'Title', 'Phone', 'LinkedIn', 'Notes', 'Tags', 'Source', 'Created', 'Last Interaction', 'Interactions']];
      var rows = [];
      for (var i = 0; i < contacts.length; i++) {
        var c = contacts[i];
        rows.push([
          c.name || '', c.email || '', c.company || '', c.title || '', c.phone || '',
          c.linkedin || '', c.notes || '', (c.tags || []).join(', '), c.source || '',
          c.created || '', c.lastInteraction || '', String(c.interactionCount || 0)
        ]);
      }
      X1DriveAPI.writeToSheet(sheet.id, 'A1', headers.concat(rows)).then(function() {
        if (cb) cb({ sheetId: sheet.id, url: sheet.url, count: contacts.length });
      }).catch(function(err) {
        if (cb) cb({ error: err.message || 'Error al escribir en Sheet' });
      });
    }).catch(function(err) {
      if (cb) cb({ error: err.message || 'Error al crear Sheet' });
    });
  });
}

// ============================================================
// 3. LINKEDIN SCRAPER
// ============================================================

function x1LinkedInScrapeCurrentPage(tabId, cb) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: function() {
      // LinkedIn profile page scraper — runs in page context
      var result = { name: '', headline: '', company: '', location: '', about: '', experience: [], education: [], skills: [], url: location.href };
      try {
        // Name
        var nameEl = document.querySelector('h1') || document.querySelector('.top-card__title') || document.querySelector('.profile-card__name');
        if (nameEl) result.name = nameEl.textContent.trim();
        // Headline
        var hlEl = document.querySelector('.top-card__headline') || document.querySelector('.profile-card__headline') || document.querySelector('[data-generated-suggestion-target]');
        if (hlEl) result.headline = hlEl.textContent.trim();
        // Company
        var coEl = document.querySelector('.top-card__company') || document.querySelector('.profile-card__company');
        if (coEl) result.company = coEl.textContent.trim();
        // Location
        var locEl = document.querySelector('.top-card__location') || document.querySelector('.profile-card__location');
        if (locEl) result.location = locEl.textContent.trim();
        // About
        var aboutEl = document.querySelector('.core-section-container__content p') || document.querySelector('.profile-card__about') || document.querySelector('.pv-about__summary-text');
        if (aboutEl) result.about = aboutEl.textContent.trim();
        // Experience
        var expEls = document.querySelectorAll('.experience-item, .pv-entity__summary-info, [data-section="experience"] li');
        for (var i = 0; i < Math.min(expEls.length, 20); i++) {
          var expText = expEls[i].textContent.trim().substring(0, 300);
          if (expText) result.experience.push(expText);
        }
        // Education
        var eduEls = document.querySelectorAll('.education-item, .pv-education-entity, [data-section="education"] li');
        for (var j = 0; j < Math.min(eduEls.length, 10); j++) {
          var eduText = eduEls[j].textContent.trim().substring(0, 200);
          if (eduText) result.education.push(eduText);
        }
      } catch (e) { result.error = e.message; }
      return result;
    }
  }, function(results) {
    if (chrome.runtime.lastError) { if (cb) cb({ error: chrome.runtime.lastError.message }); return; }
    var data = results && results[0] && results[0].result;
    if (!data) { if (cb) cb({ error: 'No se pudo extraer datos' }); return; }
    // Cache the scraped data
    dexGet('x1_dex_linkedin_cache', function(cache) {
      cache = cache || [];
      cache.push({ profileUrl: data.url, data: data, cached: dexTimestamp() });
      if (cache.length > 200) cache = cache.slice(-200);
      dexSet('x1_dex_linkedin_cache', cache);
      if (cb) cb(data);
    });
  });
}

function x1LinkedInSearchQuery(query) {
  return 'https://www.linkedin.com/search/results/people/?keywords=' + encodeURIComponent(query);
}

function x1LinkedInToContact(profileData) {
  return {
    name: profileData.name || '',
    company: profileData.company || '',
    title: profileData.headline || '',
    linkedin: profileData.url || '',
    notes: (profileData.about || '').substring(0, 500),
    tags: ['linkedin'],
    source: 'linkedin'
  };
}

// ============================================================
// 4. NOTES SYSTEM
// ============================================================

function x1NoteCreate(data, cb) {
  dexGet(X1_DEX_NOTES_KEY, function(list) {
    list = list || [];
    var note = {
      id: dexUid(), type: data.type || 'general', refId: data.refId || '',
      title: data.title || '', content: data.content || '', tags: data.tags || [],
      created: dexTimestamp(), updated: dexTimestamp()
    };
    list.push(note);
    dexSet(X1_DEX_NOTES_KEY, list, function() { if (cb) cb(null, note); });
  });
}

function x1NoteGet(id, cb) {
  dexGet(X1_DEX_NOTES_KEY, function(list) {
    list = list || [];
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { if (cb) cb(list[i]); return; } }
    if (cb) cb(null);
  });
}

function x1NoteSearch(query, cb) {
  dexGet(X1_DEX_NOTES_KEY, function(list) {
    list = list || [];
    var q = query.toLowerCase();
    var results = [];
    for (var i = 0; i < list.length; i++) {
      var n = list[i];
      if ((n.title && n.title.toLowerCase().indexOf(q) >= 0) ||
          (n.content && n.content.toLowerCase().indexOf(q) >= 0) ||
          (n.tags && n.tags.join(',').toLowerCase().indexOf(q) >= 0)) {
        results.push(n);
      }
    }
    if (cb) cb(results);
  });
}

function x1NoteListByType(type, cb) {
  dexGet(X1_DEX_NOTES_KEY, function(list) {
    list = list || [];
    if (!type) { if (cb) cb(list); return; }
    var results = [];
    for (var i = 0; i < list.length; i++) { if (list[i].type === type) results.push(list[i]); }
    if (cb) cb(results);
  });
}

function x1NoteDelete(id, cb) {
  dexGet(X1_DEX_NOTES_KEY, function(list) {
    list = list || [];
    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { list.splice(i, 1); found = true; break; }
    }
    if (found) { dexSet(X1_DEX_NOTES_KEY, list, function() { if (cb) cb(true); }); }
    else { if (cb) cb(false); }
  });
}

function x1NoteExportToDoc(noteIds, cb) {
  dexGet(X1_DEX_NOTES_KEY, function(list) {
    list = list || [];
    if (typeof X1DriveAPI === 'undefined' || !X1DriveAPI.createDocument) { if (cb) cb({ error: 'Google no conectado' }); return; }
    X1DriveAPI.createDocument('X1 Notes - ' + dexTimestamp().substring(0, 10)).then(function(doc) {
      var text = '';
      for (var i = 0; i < list.length; i++) {
        if (noteIds && noteIds.indexOf(list[i].id) < 0) continue;
        text += '# ' + (list[i].title || 'Sin titulo') + '\n';
        text += (list[i].content || '') + '\n\n';
      }
      if (text) { X1DriveAPI.insertText(doc.id, text).then(function() { if (cb) cb({ docId: doc.id, url: doc.url, count: list.length }); }); }
      else { if (cb) cb({ docId: doc.id, url: doc.url, count: 0 }); }
    }).catch(function(err) { if (cb) cb({ error: err.message }); });
  });
}

// ============================================================
// 5. MEETING BRIEFS & FOLLOW-UPS
// ============================================================

function x1MeetingBrief(eventId, cb) {
  if (typeof X1CalendarAPI === 'undefined') { if (cb) cb({ error: 'Calendar API no disponible' }); return; }
  X1CalendarAPI.getEvent(eventId).then(function(event) {
    if (!event) { if (cb) cb({ error: 'Evento no encontrado' }); return; }
    var brief = { title: event.summary || 'Sin titulo', date: event.start || '', attendees: [], emailContext: [], linkedinProfiles: [], notes: [], timeline: [] };
    if (event.attendees) {
      var ats = event.attendees;
      function processAttendee(idx) {
        if (idx >= ats.length) {
          // Generate brief text
          var text = '## Resumen de reunion\n\n';
          text += '**Evento:** ' + brief.title + '\n';
          text += '**Fecha:** ' + (brief.date || '') + '\n\n';
          text += '### Asistentes (' + brief.attendees.length + ')\n';
          for (var a = 0; a < brief.attendees.length; a++) {
            var att = brief.attendees[a];
            text += '- **' + (att.name || att.email) + '**';
            if (att.title) text += ' — ' + att.title;
            if (att.company) text += ' (' + att.company + ')';
            text += '\n';
          }
          text += '\n### Contexto de email\n';
          if (brief.emailContext.length > 0) {
            for (var e = 0; e < brief.emailContext.length; e++) {
              text += '- ' + brief.emailContext[e].subject + ' (' + brief.emailContext[e].date + ')\n';
            }
          } else { text += '_No hay correos recientes_\n'; }
          text += '\n### Notas\n';
          text += brief.notes.join('\n') || '_Sin notas_\n';
          brief.text = text;
          if (cb) cb(null, brief);
          return;
        }
        var att = ats[idx];
        var email = att.email || '';
        // Search contacts for this attendee
        x1ContactSearch(email, function(results) {
          if (results && results.length > 0) {
            var contact = results[0];
            brief.attendees.push({ email: email, name: contact.name || att.displayName || email, title: contact.title || '', company: contact.company || '', linkedin: contact.linkedin || '', contactId: contact.id });
            // Get email threads
            if (contact.emailThreads) {
              for (var t = 0; t < Math.min(contact.emailThreads.length, 5); t++) {
                brief.emailContext.push(contact.emailThreads[t]);
              }
            }
          } else {
            brief.attendees.push({ email: email, name: att.displayName || email, title: '', company: '', linkedin: '' });
          }
          // Try to find LinkedIn
          if (typeof X1GoogleAPI !== 'undefined' && X1GoogleAPI.searchLinkedIn) {
            X1GoogleAPI.searchLinkedIn(att.displayName || email).then(function(li) {
              if (li && li.url) { brief.linkedinProfiles.push(li); }
              processAttendee(idx + 1);
            }).catch(function() { processAttendee(idx + 1); });
          } else { processAttendee(idx + 1); }
        });
      }
      processAttendee(0);
    } else {
      brief.text = '## Resumen de reunion\n\n**Evento:** ' + brief.title + '\n**Fecha:** ' + (brief.date || '') + '\n\n_Sin asistentes_\n';
      if (cb) cb(null, brief);
    }
  }).catch(function(err) { if (cb) cb({ error: err.message || 'Error al obtener evento' }); });
}

function x1MeetingFollowUp(eventId, cb) {
  x1MeetingBrief(eventId, function(err, brief) {
    if (err) { if (cb) cb(err); return; }
    if (typeof X1GmailAPI === 'undefined' || !X1GmailAPI.sendEmail) { if (cb) cb({ error: 'Gmail no disponible' }); return; }
    var emailText = 'Hola,\n\nGracias por la reunion. Aqui un resumen de lo hablado:\n\n';
    if (brief.attendees) { emailText += '**Asistentes:** ' + brief.attendees.map(function(a) { return a.name; }).join(', ') + '\n\n'; }
    emailText += 'Quedo atento a cualquier comentario.\n\nSaludos';
    // Send to all attendees
    var sent = [];
    function sendNext(idx) {
      if (!brief.attendees || idx >= brief.attendees.length) { if (cb) cb({ sent: sent.length, total: (brief.attendees || []).length }); return; }
      var att = brief.attendees[idx];
      if (att.email && att.email.indexOf('@') > 0) {
        X1GmailAPI.sendEmail(att.email, 'Gracias por la reunion: ' + brief.title, emailText).then(function() {
          sent.push(att.email);
          sendNext(idx + 1);
        }).catch(function() { sendNext(idx + 1); });
      } else { sendNext(idx + 1); }
    }
    sendNext(0);
  });
}

function x1MeetingAutoBriefs(cb) {
  if (typeof X1CalendarAPI === 'undefined') { if (cb) cb({ error: 'Calendar no disponible' }); return; }
  var today = new Date();
  var startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  var endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
  X1CalendarAPI.listEvents(startOfDay, endOfDay).then(function(events) {
    if (!events || events.length === 0) { if (cb) cb({ events: 0 }); return; }
    var briefs = [];
    function processEvent(idx) {
      if (idx >= events.length) { if (cb) cb({ events: events.length, briefs: briefs }); return; }
      x1MeetingBrief(events[idx].id, function(err, brief) {
        if (!err && brief) { briefs.push({ eventId: events[idx].id, title: events[idx].summary, brief: brief }); }
        processEvent(idx + 1);
      });
    }
    processEvent(0);
  }).catch(function(err) { if (cb) cb({ error: err.message }); });
}

// ============================================================
// 6. EMAIL TRIAGE & AUTO-DRAFTS
// ============================================================

function x1EmailTriage(cb) {
  if (typeof X1GmailAPI === 'undefined') { if (cb) cb({ error: 'Gmail no disponible' }); return; }
  X1GmailAPI.listMessages('inbox', 50).then(function(messages) {
    if (!messages || messages.length === 0) { if (cb) cb({ total: 0 }); return; }
    var triaged = { urgent: [], important: [], read: [], archive: [], spam: [] };
    function processMsg(idx) {
      if (idx >= messages.length) {
        // Auto-add contacts from email
        function addContacts(cb2) {
          var processed = 0;
          for (var c = 0; c < messages.length; c++) {
            if (messages[c].from) {
              x1ContactAutoAddFromEmail(messages[c].from.email || '', messages[c].from.name || '', messages[c].subject || '', messages[c].snippet || '', function() {
                processed++;
                if (processed >= messages.length) { if (cb2) cb2(); }
              });
            }
          }
          if (messages.length === 0) { if (cb2) cb2(); }
        }
        addContacts(function() {
          if (cb) cb({ total: messages.length, urgent: triaged.urgent.length, important: triaged.important.length, read: triaged.read.length, archive: triaged.archive.length });
        });
        return;
      }
      var msg = messages[idx];
      if (!msg) { processMsg(idx + 1); return; }
      // Simple triage rules
      var subject = (msg.subject || '').toLowerCase();
      var from = (msg.from && (msg.from.name || msg.from.email || '')).toLowerCase();
      var snippet = (msg.snippet || '').toLowerCase();
      var isUrgent = subject.indexOf('urgent') >= 0 || subject.indexOf('asap') >= 0 || subject.indexOf('importante') >= 0 || subject.indexOf('urge') >= 0;
      var isImportant = (from.indexOf('@manager') >= 0 || from.indexOf('@ceo') >= 0 || from.indexOf('@founder') >= 0) || subject.indexOf('importante') >= 0;
      if (isUrgent) { triaged.urgent.push(msg); }
      else if (isImportant) { triaged.important.push(msg); }
      else { triaged.read.push(msg); }
      processMsg(idx + 1);
    }
    processMsg(0);
  }).catch(function(err) { if (cb) cb({ error: err.message }); });
}

function x1EmailAutoDrafts(cb) {
  if (typeof X1GmailAPI === 'undefined') { if (cb) cb({ error: 'Gmail no disponible' }); return; }
  X1GmailAPI.listMessages('inbox', 10).then(function(messages) {
    if (!messages || messages.length === 0) { if (cb) cb({ drafts: 0 }); return; }
    var drafts = [];
    function processMsg(idx) {
      if (idx >= messages.length) { if (cb) cb({ drafts: drafts.length }); return; }
      var msg = messages[idx];
      if (!msg || !msg.from || !msg.from.email) { processMsg(idx + 1); return; }
      // Check if this is a thread that needs a reply
      var snippet = (msg.snippet || '').toLowerCase();
      var replyIndicators = ['?', 'please', 'por favor', 'could you', 'puedes', 'necesito', 'help', 'ayuda', 'let me know', 'quedo atento'];
      var needsReply = false;
      for (var i = 0; i < replyIndicators.length; i++) {
        if (snippet.indexOf(replyIndicators[i]) >= 0) { needsReply = true; break; }
      }
      if (needsReply) {
        // Create draft
        if (typeof X1GmailAPI.createDraft === 'function') {
          var draftReply = 'Hola ' + (msg.from.name || '') + ',\n\nGracias por tu mensaje. ' + (msg.snippet || '').substring(0, 100) + '\n\nTe respondo en breve.\n\nSaludos';
          X1GmailAPI.createDraft(msg.from.email, 'Re: ' + (msg.subject || ''), draftReply).then(function() {
            drafts.push({ to: msg.from.email, subject: msg.subject });
            processMsg(idx + 1);
          }).catch(function() { processMsg(idx + 1); });
        } else { processMsg(idx + 1); }
      } else { processMsg(idx + 1); }
    }
    processMsg(0);
  }).catch(function(err) { if (cb) cb({ error: err.message }); });
}

function x1EmailMassSend(sheetId, cb) {
  if (typeof X1DriveAPI === 'undefined' || !X1DriveAPI.readFromSheet) { if (cb) cb({ error: 'Sheets no disponible' }); return; }
  if (typeof X1GmailAPI === 'undefined') { if (cb) cb({ error: 'Gmail no disponible' }); return; }
  X1DriveAPI.readFromSheet(sheetId, 'A:Z').then(function(rows) {
    if (!rows || rows.length < 2) { if (cb) cb({ error: 'Sheet vacio o solo encabezados' }); return; }
    var headers = rows[0];
    var emailCol = -1, nameCol = -1, companyCol = -1;
    for (var i = 0; i < headers.length; i++) {
      var h = (headers[i] || '').toLowerCase();
      if (h.indexOf('email') >= 0 || h === 'e-mail') emailCol = i;
      if (h.indexOf('name') >= 0 || h.indexOf('nombre') >= 0) nameCol = i;
      if (h.indexOf('company') >= 0 || h.indexOf('empresa') >= 0) companyCol = i;
    }
    if (emailCol < 0) { if (cb) cb({ error: 'Columna de email no encontrada' }); return; }
    var sent = 0;
    function sendRow(idx) {
      if (idx >= rows.length) { if (cb) cb({ sent: sent, total: rows.length - 1 }); return; }
      var row = rows[idx];
      if (idx === 0) { sendRow(idx + 1); return; } // Skip header
      var email = row[emailCol] || '';
      if (!email || email.indexOf('@') < 0) { sendRow(idx + 1); return; }
      var name = nameCol >= 0 ? row[nameCol] || '' : '';
      var company = companyCol >= 0 ? row[companyCol] || '' : '';
      var subject = 'Contacto desde X1';
      var body = 'Hola ' + name + ',\n\n';
      if (company) body += 'He visto que trabajas en ' + company + '.\n\n';
      body += 'Queria ponerme en contacto contigo.\n\nSaludos';
      X1GmailAPI.sendEmail(email, subject, body).then(function() {
        sent++;
        sendRow(idx + 1);
      }).catch(function() { sendRow(idx + 1); });
    }
    sendRow(0);
  }).catch(function(err) { if (cb) cb({ error: err.message || 'Error al leer Sheet' }); });
}

// ============================================================
// 7. TAB MANAGEMENT (TAB ZERO)
// ============================================================

function x1TabZero(cb) {
  chrome.tabs.query({ currentWindow: true }, function(tabs) {
    if (!tabs || tabs.length === 0) { if (cb) cb({ grouped: 0 }); return; }
    // Group tabs by domain
    var groups = {};
    for (var i = 0; i < tabs.length; i++) {
      try {
        var domain = new URL(tabs[i].url || '').hostname;
        if (!domain) continue;
        if (!groups[domain]) groups[domain] = [];
        groups[domain].push(tabs[i].id);
      } catch (e) { continue; }
    }
    var domains = Object.keys(groups);
    var grouped = 0;
    function groupNext(idx) {
      if (idx >= domains.length) { if (cb) cb({ grouped: grouped, groups: domains.length }); return; }
      var domain = domains[idx];
      var tabIds = groups[domain];
      if (tabIds.length < 2) { groupNext(idx + 1); return; }
      chrome.tabs.group({ tabIds: tabIds }, function(groupId) {
        if (chrome.runtime.lastError) { groupNext(idx + 1); return; }
        chrome.tabGroups.update(groupId, { title: domain, collapsed: true }, function() {
          grouped++;
          groupNext(idx + 1);
        });
      });
    }
    groupNext(0);
  });
}

function x1TabSaveWorkspace(name, cb) {
  chrome.tabs.query({ currentWindow: true }, function(tabs) {
    var ws = [];
    for (var i = 0; i < tabs.length; i++) {
      ws.push({ url: tabs[i].url || '', title: tabs[i].title || '', pinned: !!tabs[i].pinned });
    }
    dexGet('x1_dex_workspaces', function(list) {
      list = list || [];
      list.push({ id: dexUid(), name: name || 'Workspace ' + (list.length + 1), tabs: ws, created: dexTimestamp() });
      if (list.length > 20) list = list.slice(-20);
      dexSet('x1_dex_workspaces', list, function() { if (cb) cb({ name: name, tabs: ws.length }); });
    });
  });
}

function x1TabRestoreWorkspace(name, cb) {
  dexGet('x1_dex_workspaces', function(list) {
    list = list || [];
    var ws = null;
    if (name) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].name === name || list[i].id === name) { ws = list[i]; break; }
      }
    } else {
      ws = list[list.length - 1] || null;
    }
    if (!ws) { if (cb) cb({ error: 'Workspace no encontrado' }); return; }
    if (!ws.tabs || ws.tabs.length === 0) { if (cb) cb({ restored: 0 }); return; }
    function createTab(idx) {
      if (idx >= ws.tabs.length) { if (cb) cb({ restored: ws.tabs.length, name: ws.name }); return; }
      chrome.tabs.create({ url: ws.tabs[idx].url, pinned: ws.tabs[idx].pinned || false }, function() { createTab(idx + 1); });
    }
    createTab(0);
  });
}

function x1TabListWorkspaces(cb) {
  dexGet('x1_dex_workspaces', function(list) { if (cb) cb(list || []); });
}

// ============================================================
// 8. DATA SCRAPER (ANY PAGE → SHEETS)
// ============================================================

function x1ScrapeToSheet(tabId, schema, cb) {
  if (typeof X1DriveAPI === 'undefined' || !X1DriveAPI.createSheet) { if (cb) cb({ error: 'Google no conectado' }); return; }
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: function(schema) {
      var result = { title: document.title, url: location.href };
      // Generic data extraction
      if (!schema || schema === 'auto') {
        // Try tables
        result.tables = [];
        var tables = document.querySelectorAll('table');
        for (var t = 0; t < Math.min(tables.length, 10); t++) {
          var rows = [];
          var trs = tables[t].querySelectorAll('tr');
          for (var r = 0; r < Math.min(trs.length, 100); r++) {
            var cells = [];
            var tds = trs[r].querySelectorAll('td, th');
            for (var c = 0; c < tds.length; c++) {
              cells.push(tds[c].textContent.trim().substring(0, 500));
            }
            if (cells.length > 0) rows.push(cells);
          }
          if (rows.length > 0) result.tables.push(rows);
        }
        // Try lists
        result.lists = [];
        var lists = document.querySelectorAll('ul, ol');
        for (var l = 0; l < Math.min(lists.length, 5); l++) {
          var items = [];
          var lis = lists[l].querySelectorAll('li');
          for (var i = 0; i < Math.min(lis.length, 50); i++) {
            items.push(lis[i].textContent.trim().substring(0, 300));
          }
          if (items.length > 0) result.lists.push(items);
        }
        // Links
        result.links = [];
        var anchors = document.querySelectorAll('a[href]');
        for (var a = 0; a < Math.min(anchors.length, 100); a++) {
          result.links.push({ text: anchors[a].textContent.trim().substring(0, 100), href: anchors[a].href });
        }
      }
      return result;
    }
  }, function(results) {
    if (chrome.runtime.lastError) { if (cb) cb({ error: chrome.runtime.lastError.message }); return; }
    var data = results && results[0] && results[0].result;
    if (!data) { if (cb) cb({ error: 'No se pudo extraer datos' }); return; }
    X1DriveAPI.createSheet('Scraped - ' + data.title.substring(0, 30)).then(function(sheet) {
      var allRows = [['Field', 'Value']];
      allRows.push(['Page Title', data.title || '']);
      allRows.push(['URL', data.url || '']);
      if (data.tables) {
        for (var ti = 0; ti < data.tables.length; ti++) {
          allRows.push(['--- Table ' + (ti + 1) + ' ---', '']);
          for (var ri = 0; ri < data.tables[ti].length; ri++) {
            for (var ci = 0; ci < data.tables[ti][ri].length; ci++) {
              allRows.push(['[' + ti + ',' + ri + ',' + ci + ']', data.tables[ti][ri][ci]]);
            }
          }
        }
      }
      if (data.lists) {
        for (var li = 0; li < data.lists.length; li++) {
          allRows.push(['--- List ' + (li + 1) + ' ---', '']);
          for (var ii = 0; ii < data.lists[li].length; ii++) {
            allRows.push(['Item ' + (ii + 1), data.lists[li][ii]]);
          }
        }
      }
      if (data.links) {
        allRows.push(['--- Links ---', '']);
        for (var ai = 0; ai < data.links.length; ai++) {
          allRows.push([data.links[ai].text || '', data.links[ai].href || '']);
        }
      }
      X1DriveAPI.writeToSheet(sheet.id, 'A1', allRows).then(function() {
        if (cb) cb({ sheetId: sheet.id, url: sheet.url, rows: allRows.length });
      }).catch(function(err) { if (cb) cb({ error: err.message }); });
    }).catch(function(err) { if (cb) cb({ error: err.message }); });
  });
}

// ============================================================
// 9. IMPORT CONTACTS
// ============================================================

function x1ImportGmailContacts(cb) {
  if (typeof X1GmailAPI === 'undefined') { if (cb) cb({ error: 'Gmail no disponible' }); return; }
  X1GmailAPI.listMessages('inbox', 100).then(function(messages) {
    if (!messages || messages.length === 0) { if (cb) cb({ imported: 0 }); return; }
    var count = 0;
    function processMsg(idx) {
      if (idx >= messages.length) { if (cb) cb({ imported: count }); return; }
      var msg = messages[idx];
      if (msg && msg.from && msg.from.email) {
        x1ContactAutoAddFromEmail(msg.from.email, msg.from.name || '', msg.subject || '', msg.snippet || '', function(c) {
          if (c) count++;
          processMsg(idx + 1);
        });
      } else { processMsg(idx + 1); }
    }
    processMsg(0);
  }).catch(function(err) { if (cb) cb({ error: err.message }); });
}

function x1ImportCalendarContacts(cb) {
  if (typeof X1CalendarAPI === 'undefined') { if (cb) cb({ error: 'Calendar no disponible' }); return; }
  var startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(); // Last 90 days
  var endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  X1CalendarAPI.listEvents(startDate, endDate).then(function(events) {
    if (!events || events.length === 0) { if (cb) cb({ imported: 0 }); return; }
    var count = 0;
    function processEvent(idx) {
      if (idx >= events.length) { if (cb) cb({ imported: count }); return; }
      var ev = events[idx];
      if (ev && ev.attendees) {
        x1ContactAutoAddFromMeeting(ev.summary || '', ev.attendees, function(added) {
          if (added) count += added.length;
          processEvent(idx + 1);
        });
      } else { processEvent(idx + 1); }
    }
    processEvent(0);
  }).catch(function(err) { if (cb) cb({ error: err.message }); });
}

function x1ImportCSV(text, cb) {
  if (!text || text.length === 0) { if (cb) cb({ imported: 0 }); return; }
  var lines = text.split('\n');
  if (lines.length < 2) { if (cb) cb({ imported: 0 }); return; }
  var headers = lines[0].split(',').map(function(h) { return h.trim().toLowerCase(); });
  var nameIdx = -1, emailIdx = -1, companyIdx = -1, titleIdx = -1, phoneIdx = -1;
  for (var i = 0; i < headers.length; i++) {
    if (headers[i].indexOf('name') >= 0 || headers[i].indexOf('nombre') >= 0) nameIdx = i;
    if (headers[i].indexOf('email') >= 0 || headers[i] === 'e-mail') emailIdx = i;
    if (headers[i].indexOf('company') >= 0 || headers[i].indexOf('empresa') >= 0) companyIdx = i;
    if (headers[i].indexOf('title') >= 0 || headers[i].indexOf('puesto') >= 0) titleIdx = i;
    if (headers[i].indexOf('phone') >= 0 || headers[i].indexOf('telefono') >= 0) phoneIdx = i;
  }
  var count = 0;
  function processLine(idx) {
    if (idx >= lines.length) { if (cb) cb({ imported: count }); return; }
    if (idx === 0) { processLine(idx + 1); return; } // Skip header
    var vals = lines[idx].split(',');
    var contact = {};
    if (nameIdx >= 0 && vals[nameIdx]) contact.name = vals[nameIdx].trim();
    if (emailIdx >= 0 && vals[emailIdx]) contact.email = vals[emailIdx].trim();
    if (companyIdx >= 0 && vals[companyIdx]) contact.company = vals[companyIdx].trim();
    if (titleIdx >= 0 && vals[titleIdx]) contact.title = vals[titleIdx].trim();
    if (phoneIdx >= 0 && vals[phoneIdx]) contact.phone = vals[phoneIdx].trim();
    contact.source = 'csv';
    contact.tags = ['imported'];
    if (contact.email || contact.name) {
      x1ContactAdd(contact, function() { count++; processLine(idx + 1); });
    } else { processLine(idx + 1); }
  }
  processLine(0);
}

// ============================================================
// 10. PRIVACY CONTROLS
// ============================================================

function x1BlockSite(url, cb) {
  dexGet(X1_DEX_BLOCKED_KEY, function(list) {
    list = list || [];
    try {
      var domain = new URL(url).hostname;
      if (list.indexOf(domain) >= 0) { if (cb) cb({ blocked: true, domain: domain, already: true }); return; }
      list.push(domain);
      dexSet(X1_DEX_BLOCKED_KEY, list, function() { if (cb) cb({ blocked: true, domain: domain }); });
    } catch (e) { if (cb) cb({ error: 'URL invalida' }); }
  });
}

function x1UnblockSite(url, cb) {
  dexGet(X1_DEX_BLOCKED_KEY, function(list) {
    list = list || [];
    try {
      var domain = new URL(url).hostname;
      for (var i = 0; i < list.length; i++) {
        if (list[i] === domain) { list.splice(i, 1); break; }
      }
      dexSet(X1_DEX_BLOCKED_KEY, list, function() { if (cb) cb({ unblocked: true, domain: domain }); });
    } catch (e) { if (cb) cb({ error: 'URL invalida' }); }
  });
}

function x1GetBlockedSites(cb) {
  dexGet(X1_DEX_BLOCKED_KEY, function(list) { if (cb) cb(list || []); });
}

function x1SetDexSetting(key, val, cb) {
  dexGet(X1_DEX_SETTINGS_KEY, function(settings) {
    settings = settings || {};
    settings[key] = val;
    dexSet(X1_DEX_SETTINGS_KEY, settings, function() { if (cb) cb(true); });
  });
}

function x1GetDexSetting(key, cb) {
  dexGet(X1_DEX_SETTINGS_KEY, function(settings) {
    settings = settings || {};
    if (cb) cb(settings[key]);
  });
}

// ============================================================
// 11. COMMAND EXECUTION INTEGRATION
// ============================================================
// Returns a list of action handlers for the SW execAction switch
// Each handler receives (act, tabId) and returns Promise<{text, ...}>

var X1DexActions = {
  'contactAdd': function(act, tabId) {
    return new Promise(function(resolve) {
      x1ContactAdd({ name: act.name, email: act.email, company: act.company, title: act.title, phone: act.phone, linkedin: act.linkedin, notes: act.notes, source: 'voice' }, function(err, c) {
        resolve({ text: c ? 'Contacto añadido: ' + (c.name || c.email) : 'Error al añadir contacto' });
      });
    });
  },
  'contactSearch': function(act, tabId) {
    return new Promise(function(resolve) {
      x1ContactSearch(act.query || '', function(results) {
        if (!results || results.length === 0) { resolve({ text: 'No encontre contactos para "' + act.query + '"' }); return; }
        var text = 'Encontre ' + results.length + ' contacto(s):\n';
        for (var i = 0; i < Math.min(results.length, 5); i++) {
          text += (i + 1) + '. ' + (results[i].name || 'Sin nombre') + ' — ' + (results[i].email || '') + ' (' + (results[i].company || '') + ')\n';
        }
        resolve({ text: text });
      });
    });
  },
  'contactList': function(act, tabId) {
    return new Promise(function(resolve) {
      x1ContactList(function(list) {
        resolve({ text: 'Tienes ' + (list ? list.length : 0) + ' contactos guardados.' });
      });
    });
  },
  'contactTimeline': function(act, tabId) {
    return new Promise(function(resolve) {
      x1ContactGet(act.id || '', function(c) {
        if (!c) { resolve({ text: 'Contacto no encontrado' }); return; }
        x1ContactGetTimeline(c.id, function(timeline) {
          var text = 'Historial de ' + (c.name || c.email) + ':\n';
          if (timeline && timeline.length > 0) {
            for (var i = 0; i < Math.min(timeline.length, 10); i++) {
              var entry = timeline[i];
              text += '- ' + (entry.date || '').substring(0, 10) + ': ' + (entry.type || '') + ' - ' + (entry.summary || '').substring(0, 100) + '\n';
            }
          } else { text += 'Sin historial\n'; }
          resolve({ text: text });
        });
      });
    });
  },
  'contactExport': function(act, tabId) {
    return new Promise(function(resolve) {
      x1ContactExportToSheets(function(result) {
        if (result.error) { resolve({ text: 'Error: ' + result.error }); return; }
        resolve({ text: 'Exportados ' + result.count + ' contactos a Google Sheets: ' + result.url });
      });
    });
  },
  'noteAdd': function(act, tabId) {
    return new Promise(function(resolve) {
      x1NoteCreate({ title: act.title, content: act.content, type: act.noteType || 'general', refId: act.refId || '', tags: act.tags || [] }, function(err, note) {
        resolve({ text: note ? 'Nota guardada: ' + (note.title || 'Sin titulo') : 'Error al guardar nota' });
      });
    });
  },
  'noteSearch': function(act, tabId) {
    return new Promise(function(resolve) {
      x1NoteSearch(act.query || '', function(results) {
        if (!results || results.length === 0) { resolve({ text: 'No encontre notas para "' + act.query + '"' }); return; }
        var text = 'Notas encontradas (' + results.length + '):\n';
        for (var i = 0; i < Math.min(results.length, 5); i++) {
          text += (i + 1) + '. ' + (results[i].title || 'Sin titulo') + ' (' + (results[i].type || 'general') + ')\n';
        }
        resolve({ text: text });
      });
    });
  },
  'linkedinScrape': function(act, tabId) {
    return new Promise(function(resolve) {
      x1LinkedInScrapeCurrentPage(tabId, function(data) {
        if (data.error) { resolve({ text: 'Error: ' + data.error }); return; }
        // Auto-create contact
        x1ContactAdd(x1LinkedInToContact(data), function(err, c) {
          resolve({ text: 'Perfil extraido: ' + (data.name || '') + ' (' + (data.headline || '') + '). Contacto guardado.' });
        });
      });
    });
  },
  'linkedinSearch': function(act, tabId) {
    var url = x1LinkedInSearchQuery(act.query || '');
    return new Promise(function(resolve) {
      chrome.tabs.update(tabId, { url: url }, function() {
        resolve({ text: 'Buscando en LinkedIn: ' + act.query });
      });
    });
  },
  'meetingBrief': function(act, tabId) {
    return new Promise(function(resolve) {
      x1MeetingBrief(act.eventId || '', function(err, brief) {
        if (err) { resolve({ text: 'Error: ' + (err.error || JSON.stringify(err)) }); return; }
        resolve({ text: brief.text || 'No se pudo generar el briefing', showText: true });
      });
    });
  },
  'meetingFollowUp': function(act, tabId) {
    return new Promise(function(resolve) {
      x1MeetingFollowUp(act.eventId || '', function(result) {
        if (result.error) { resolve({ text: 'Error: ' + result.error }); return; }
        resolve({ text: 'Enviados ' + result.sent + ' follow-ups de ' + result.total + ' asistentes.' });
      });
    });
  },
  'emailTriage': function(act, tabId) {
    return new Promise(function(resolve) {
      x1EmailTriage(function(result) {
        if (result.error) { resolve({ text: 'Error: ' + result.error }); return; }
        resolve({ text: 'Bandeja clasificada: ' + result.total + ' emails. Urgentes: ' + result.urgent + ', Importantes: ' + result.important });
      });
    });
  },
  'emailAutoDrafts': function(act, tabId) {
    return new Promise(function(resolve) {
      x1EmailAutoDrafts(function(result) {
        if (result.error) { resolve({ text: 'Error: ' + result.error }); return; }
        resolve({ text: 'Borradores creados: ' + result.drafts });
      });
    });
  },
  'emailMassSend': function(act, tabId) {
    return new Promise(function(resolve) {
      x1EmailMassSend(act.sheetId || '', function(result) {
        if (result.error) { resolve({ text: 'Error: ' + result.error }); return; }
        resolve({ text: 'Enviados ' + result.sent + ' de ' + result.total + ' emails.' });
      });
    });
  },
  'tabZero': function(act, tabId) {
    return new Promise(function(resolve) {
      x1TabZero(function(result) {
        resolve({ text: 'Pestanas agrupadas: ' + result.grouped + ' grupos en ' + result.groups + ' dominios.' });
      });
    });
  },
  'workspaceSave': function(act, tabId) {
    return new Promise(function(resolve) {
      x1TabSaveWorkspace(act.name || '', function(result) {
        resolve({ text: 'Workspace "' + result.name + '" guardado con ' + result.tabs + ' pestanas.' });
      });
    });
  },
  'workspaceRestore': function(act, tabId) {
    return new Promise(function(resolve) {
      x1TabRestoreWorkspace(act.name || '', function(result) {
        if (result.error) { resolve({ text: 'Error: ' + result.error }); return; }
        resolve({ text: 'Workspace "' + result.name + '" restaurado con ' + result.restored + ' pestanas.' });
      });
    });
  },
  'scrapeToSheet': function(act, tabId) {
    return new Promise(function(resolve) {
      x1ScrapeToSheet(tabId, act.schema || 'auto', function(result) {
        if (result.error) { resolve({ text: 'Error: ' + result.error }); return; }
        resolve({ text: 'Datos extraidos a Google Sheets: ' + result.url + ' (' + result.rows + ' filas)' });
      });
    });
  },
  'importGmail': function(act, tabId) {
    return new Promise(function(resolve) {
      x1ImportGmailContacts(function(result) {
        if (result.error) { resolve({ text: 'Error: ' + result.error }); return; }
        resolve({ text: 'Importados ' + result.imported + ' contactos de Gmail.' });
      });
    });
  },
  'importCalendar': function(act, tabId) {
    return new Promise(function(resolve) {
      x1ImportCalendarContacts(function(result) {
        if (result.error) { resolve({ text: 'Error: ' + result.error }); return; }
        resolve({ text: 'Importados ' + result.imported + ' contactos de Calendar.' });
      });
    });
  },
  'blockSite': function(act, tabId) {
    return new Promise(function(resolve) {
      x1BlockSite(act.url || (tabId ? '' : ''), function(result) {
        if (result.error) { resolve({ text: 'Error: ' + result.error }); return; }
        resolve({ text: result.already ? 'El sitio ya estaba bloqueado' : 'Sitio bloqueado: ' + result.domain });
      });
    });
  },
  'unblockSite': function(act, tabId) {
    return new Promise(function(resolve) {
      x1UnblockSite(act.url || '', function(result) {
        if (result.error) { resolve({ text: 'Error: ' + result.error }); return; }
        resolve({ text: 'Sitio desbloqueado: ' + result.domain });
      });
    });
  }
};
