var X1DriveAPI = (function() {

  var DRIVE_BASE = 'https://www.googleapis.com/drive/v3';
  var DOCS_BASE = 'https://docs.googleapis.com/v1';
  var SHEETS_BASE = 'https://sheets.googleapis.com/v4';

  function getHeaders() {
    return X1GoogleAuth.getToken().then(function(token) {
      return { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
    });
  }

  function driveApi(path, method, body) {
    return getHeaders().then(function(headers) {
      var opts = { method: method || 'GET', headers: headers };
      if (body) opts.body = JSON.stringify(body);
      return fetch(DRIVE_BASE + path, opts).then(function(r) { return r.json(); });
    });
  }

  function docsApi(path, method, body) {
    return getHeaders().then(function(headers) {
      var opts = { method: method || 'GET', headers: headers };
      if (body) opts.body = JSON.stringify(body);
      return fetch(DOCS_BASE + path, opts).then(function(r) { return r.json(); });
    });
  }

  function sheetsApi(path, method, body) {
    return getHeaders().then(function(headers) {
      var opts = { method: method || 'GET', headers: headers };
      if (body) opts.body = JSON.stringify(body);
      return fetch(SHEETS_BASE + path, opts).then(function(r) { return r.json(); });
    });
  }

  function listFiles(query, pageSize) {
    var q = query ? '&q=' + encodeURIComponent(query) : '';
    return driveApi('/files?pageSize=' + (pageSize || 20) + '&fields=files(id,name,mimeType,size,createdTime,modifiedTime,owners)' + q).then(function(data) {
      if (data.error) throw new Error(data.error.message || 'DRIVE_LIST_ERROR');
      return data.files || [];
    });
  }

  function getFile(fileId) {
    return driveApi('/files/' + fileId + '?fields=id,name,mimeType,size,createdTime,modifiedTime,owners,description,webViewLink').then(function(data) {
      if (data.error) throw new Error(data.error.message || 'DRIVE_GET_ERROR');
      return data;
    });
  }

  function createDocument(title) {
    return docsApi('/documents', 'POST', { title: title || 'Sin título' }).then(function(data) {
      if (data.error) throw new Error(data.error.message || 'DOCS_CREATE_ERROR');
      return { id: data.documentId, url: 'https://docs.google.com/document/d/' + data.documentId + '/edit' };
    });
  }

  function insertText(docId, text) {
    return docsApi('/documents/' + docId + ':batchUpdate', 'POST', {
      requests: [{ insertText: { location: { index: 1 }, text: text } }]
    }).then(function(data) {
      if (data.error) throw new Error(data.error.message || 'DOCS_INSERT_ERROR');
      return data;
    });
  }

  function createSheet(title) {
    return sheetsApi('/spreadsheets', 'POST', {
      properties: { title: title || 'Sin título' }
    }).then(function(data) {
      if (data.error) throw new Error(data.error.message || 'SHEETS_CREATE_ERROR');
      return { id: data.spreadsheetId, url: data.spreadsheetUrl };
    });
  }

  function writeToSheet(sheetId, range, values) {
    return sheetsApi('/spreadsheets/' + sheetId + '/values/' + range, 'PUT', {
      values: values,
      valueInputOption: 'USER_ENTERED'
    }).then(function(data) {
      if (data.error) throw new Error(data.error.message || 'SHEETS_WRITE_ERROR');
      return data;
    });
  }

  function readFromSheet(sheetId, range) {
    return sheetsApi('/spreadsheets/' + sheetId + '/values/' + range).then(function(data) {
      if (data.error) throw new Error(data.error.message || 'SHEETS_READ_ERROR');
      return data.values || [];
    });
  }

  function searchFiles(query) {
    return listFiles('name contains \'' + query.replace(/'/g, "\\'") + '\'', 20);
  }

  return { listFiles: listFiles, getFile: getFile, createDocument: createDocument, insertText: insertText, createSheet: createSheet, writeToSheet: writeToSheet, readFromSheet: readFromSheet, searchFiles: searchFiles };
})();
