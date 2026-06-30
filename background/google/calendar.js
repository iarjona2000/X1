var X1CalendarAPI = (function() {

  var BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary';

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

  function getDateRange(days) {
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var end = new Date(start);
    end.setDate(end.getDate() + (days || 7));
    return { timeMin: start.toISOString(), timeMax: end.toISOString() };
  }

  function listEvents(days, query) {
    var range = getDateRange(days || 1);
    var q = query ? '&q=' + encodeURIComponent(query) : '';
    return apiCall('/events?singleEvents=true&orderBy=startTime&timeMin=' + range.timeMin + '&timeMax=' + range.timeMax + q).then(function(data) {
      if (data.error) throw new Error(data.error.message || 'CALENDAR_LIST_ERROR');
      return data.items || [];
    });
  }

  function createEvent(summary, startTime, endTime, options) {
    var event = {
      summary: summary,
      start: { dateTime: startTime, timeZone: options && options.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone },
      end: { dateTime: endTime, timeZone: options && options.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone }
    };
    if (options && options.description) event.description = options.description;
    if (options && options.location) event.location = options.location;
    if (options && options.attendees) event.attendees = options.attendees.map(function(e) { return { email: e }; });
    return apiCall('/events', 'POST', event);
  }

  function updateEvent(eventId, updates) {
    return apiCall('/events/' + eventId, 'PATCH', updates);
  }

  function deleteEvent(eventId) {
    return apiCall('/events/' + eventId, 'DELETE');
  }

  function getEvent(eventId) {
    return apiCall('/events/' + eventId);
  }

  function findFreeSlots(days, durationMinutes) {
    var range = getDateRange(days || 1);
    var body = {
      timeMin: range.timeMin, timeMax: range.timeMax,
      items: [{ id: 'primary' }]
    };
    return apiCall('/freeBusy', 'POST', body).then(function(data) {
      var busy = (data.calendars && data.calendars.primary && data.calendars.primary.busy) || [];
      var slots = [];
      var current = new Date(range.timeMin);
      var end = new Date(range.timeMax);
      var duration = (durationMinutes || 60) * 60000;
      while (current.getTime() + duration < end.getTime()) {
        var slotEnd = new Date(current.getTime() + duration);
        var isBusy = busy.some(function(b) {
          var bStart = new Date(b.start);
          var bEnd = new Date(b.end);
          return current < bEnd && slotEnd > bStart;
        });
        if (!isBusy && current.getHours() >= 8 && current.getHours() <= 18) {
          slots.push({ start: current.toISOString(), end: slotEnd.toISOString() });
        }
        current.setMinutes(current.getMinutes() + 30);
      }
      return slots;
    });
  }

  function summarizeEvents(events) {
    if (!events || events.length === 0) return 'No hay eventos.';
    return events.map(function(e, i) {
      var start = e.start && (e.start.dateTime || e.start.date || '');
      var time = start ? new Date(start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
      return (i + 1) + '. ' + time + ' - ' + (e.summary || 'Sin título') + (e.location ? ' (' + e.location + ')' : '');
    }).join('\n');
  }

  return { listEvents: listEvents, createEvent: createEvent, updateEvent: updateEvent, deleteEvent: deleteEvent, getEvent: getEvent, findFreeSlots: findFreeSlots, summarizeEvents: summarizeEvents };
})();
