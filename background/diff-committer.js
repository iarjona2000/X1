// background/diff-committer.js -- service-worker module that wires the
// sidepanel CodeDiffCard.Accept / Reject buttons to concrete actions.
//
//   DIFF_ACCEPT  ->  commit the diff to the autoresearch/mar5 branch via the
//                    GitHub Contents API (or record a phantom commit if the
//                    user has no github_token configured yet).
//   DIFF_REJECT  ->  record the rejection in chrome.storage.local.x1DiffHistory
//                    so audit/replay survive restarts.
//
// Loaded by background/service-worker.js via importScripts; runs in the SW
// context, so X1Protocol is already on self.
// IIFE / ES5 strict to match the surrounding monolith (see
// background/protocol.js for the style this codebase requires).

(function () {
  'use strict';

  var X1P = (typeof self !== 'undefined' && self.X1Protocol) || null;
  var API = 'https://api.github.com';

  // Accept legacy X1_* aliases in addition to the protocol constants so any
  // caller that already sends the old string still works after a deploy.
  var REQ = {
    ACCEPT: X1P ? X1P.REQ.DIFF_ACCEPT : 'DIFF_ACCEPT',
    REJECT: X1P ? X1P.REQ.DIFF_REJECT : 'DIFF_REJECT',
  };
  var LEGACY_ACCEPT = 'X1_DIFF_ACCEPT_AND_COMMIT';
  var LEGACY_REJECT = 'X1_DIFF_REJECT_AND_RETRY';

  function ghHeaders(token) {
    return {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };
  }

  function ok(data)   { return X1P ? X1P.okResponse(data) : { ok: true, data: data }; }
  function err(message, code, context) {
    return X1P ? X1P.errResponse(message, code, context)
              : { ok: false, error: { message: message, code: code || 'UNKNOWN', context: context || {} } };
  }

  // ─── Storage helpers ───────────────────────────────────────────────────

  function loadTarget() {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get('x1_autoresearch_target', function (r) {
          var stored = r && r.x1_autoresearch_target;
          if (stored && typeof stored === 'object') {
            resolve(stored);
          } else {
            resolve({
              owner: 'calezamindset',
              repo: 'x1-extension',
              branch: 'autoresearch/mar5',
              baseBranch: 'master',
            });
          }
        });
      } catch (e) {
        resolve({ owner: 'calezamindset', repo: 'x1-extension', branch: 'autoresearch/mar5', baseBranch: 'master' });
      }
    });
  }

  function loadToken() {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get('github_token', function (r) {
          resolve((r && r.github_token) || null);
        });
      } catch (e) { resolve(null); }
    });
  }

  function record(entry) {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get('x1DiffHistory', function (r) {
          var arr = Array.isArray(r && r.x1DiffHistory) ? r.x1DiffHistory : [];
          arr.push(entry);
          chrome.storage.local.set({ x1DiffHistory: arr.slice(-200) }, function () { resolve(true); });
        });
      } catch (e) { resolve(false); }
    });
  }

  // ─── GitHub helpers ─────────────────────────────────────────────────────

  function fetchRefSha(token, owner, repo, branch) {
    var url = API + '/repos/' + owner + '/' + repo + '/git/ref/heads/' + encodeURIComponent(branch);
    return fetch(url, { headers: ghHeaders(token) })
      .then(function (r) {
        if (r.status === 404) return null;
        if (!r.ok) return null;
        return r.json().then(function (d) { return (d && d.object && d.object.sha) || null; });
      })
      .catch(function () { return null; });
  }

  function createRef(token, owner, repo, refName, sha) {
    var url = API + '/repos/' + owner + '/' + repo + '/git/refs';
    return fetch(url, {
      method: 'POST',
      headers: ghHeaders(token),
      body: JSON.stringify({ ref: refName, sha: sha }),
    }).then(function (r) { return { ok: r.ok, status: r.status }; })
      .catch(function () { return { ok: false, status: 0 }; });
  }

  function fetchFileSha(token, owner, repo, branch, path) {
    var url = API + '/repos/' + owner + '/' + repo + '/contents/' +
      path.split('/').map(encodeURIComponent).join('/') +
      '?ref=' + encodeURIComponent(branch);
    return fetch(url, { headers: ghHeaders(token) })
      .then(function (r) {
        if (r.status === 404) return { sha: null, exists: false };
        if (!r.ok) return { sha: null, exists: false, error: true, status: r.status };
        return r.json().then(function (d) { return { sha: d.sha, exists: true, raw: d }; });
      })
      .catch(function () { return { sha: null, exists: false, error: true }; });
  }

  function putFile(token, owner, repo, branch, path, content, sha, commitMessage) {
    var url = API + '/repos/' + owner + '/' + repo + '/contents/' +
      path.split('/').map(encodeURIComponent).join('/');
    var body = {
      message: commitMessage || ('Vektor: apply diff to ' + path),
      content: btoa(unescape(encodeURIComponent(content))),
      branch: branch,
    };
    if (sha) body.sha = sha;
    return fetch(url, { method: 'PUT', headers: ghHeaders(token), body: JSON.stringify(body) })
      .then(function (r) {
        if (r.status === 409) return Promise.resolve({ ok: false, status: 409, conflict: true });
        return r.json().then(function (d) {
          if (!r.ok) return { ok: false, status: r.status, body: d };
          return { ok: true, commitSha: d.commit && d.commit.sha, contentSha: d.content && d.content.sha, html: d.content && d.content.html_url };
        });
      })
      .catch(function (e) { return { ok: false, status: 0, body: e && e.message }; });
  }

  // ─── Textual patcher (lossy but predictable enough for a stub) ───────────
  //
  // The Stitch demo diff is delivered as {kind:'+'|'-', text} pairs. We do a
  // best-effort textual splice: drop '-' lines that match existing content
  // exactly, then append '+' lines at the end under a language-aware comment
  // marker. For new files ('-' lines unmatched) the marker block still lands.
  // This is intentionally simple -- GitHub will reject with a 409 if the
  // upstream SHA moves under us, and the caller surfaces that to the user.

  function buildPatchedContent(existingContent, diffLines, fileName) {
    var ext = (fileName || '').split('.').pop().toLowerCase();
    var cStart, cEnd;
    if (ext === 'py' || ext === 'sh' || ext === 'yaml' || ext === 'yml') { cStart = '# '; cEnd = ''; }
    else if (ext === 'js' || ext === 'jsx' || ext === 'ts' || ext === 'tsx') { cStart = '// '; cEnd = ''; }
    else if (ext === 'html' || ext === 'xml') { cStart = '<!-- '; cEnd = ' -->'; }
    else if (ext === 'md') { cStart = '<!-- '; cEnd = ' -->'; }
    else { cStart = '// '; cEnd = ''; }

    var lines = existingContent ? existingContent.split(/\r?\n/) : [];
    if (lines.length && lines[lines.length - 1] !== '') lines.push('');

    diffLines.forEach(function (l) {
      if (l.kind !== '-') return;
      var idx = lines.findIndex(function (row) { return row.trim() === String(l.text).trim(); });
      if (idx !== -1) lines.splice(idx, 1);
    });

    var additions = diffLines.filter(function (l) { return l.kind === '+'; });
    if (!additions.length) return lines.join('\n');

    var block = [];
    block.push(cStart + 'Vektor (autoresearch/mar5 patch)' + cEnd);
    block.push(cStart + 'Applied via sidepanel CodeDiffCard.Accept on ' + new Date().toISOString() + cEnd);
    additions.forEach(function (a) { block.push(a.text); });
    block.push('');
    return lines.concat(block).join('\n');
  }

  // ─── Handlers ───────────────────────────────────────────────────────────

  function handleAccept(msg) {
    return Promise.all([loadTarget(), loadToken()]).then(function (r) {
      var target = r[0];
      var token = r[1];

      if (!msg.diff || typeof msg.diff.fileName !== 'string' || !Array.isArray(msg.diff.lines) || !msg.diff.lines.length) {
        return err('Bad payload: diff{fileName, lines:[...].length>0} required', 'VALIDATION', { got: msg });
      }

      // No token -> phantom commit (record intent; surface a clear next step).
      if (!token) {
        return record({
          kind: 'phantom-accept',
          at: Date.now(),
          target: target,
          diff: { fileName: msg.diff.fileName, lineCount: msg.diff.lines.length },
          commitMessage: msg.commitMessage || ('Vektor: apply diff to ' + msg.diff.fileName),
          reason: 'no_github_token',
          originalPrompt: msg.originalPrompt || null,
        }).then(function () {
          return ok({
            mode: 'phantom',
            target: target,
            message: 'Sin github_token configurado. La intencion quedo registrada en chrome.storage.local.x1DiffHistory. Conecta GitHub (oauth) para que el commit aterrice en ' + target.branch + '.',
          });
        });
      }

      // Token present -> real GitHub flow.
      return fetchRefSha(token, target.owner, target.repo, target.branch).then(function (headSha) {
        if (headSha) return headSha;
        // Branch doesn't exist yet -> create from baseBranch.
        return fetchRefSha(token, target.owner, target.repo, target.baseBranch).then(function (baseSha) {
          if (!baseSha) return null;
          return createRef(token, target.owner, target.repo, 'refs/heads/' + target.branch, baseSha)
            .then(function (r) { return r.ok ? baseSha : null; });
        });
      }).then(function (headSha) {
        if (!headSha) {
          return err('No se pudo resolver la rama ' + target.branch + ' (ni crearla desde ' + target.baseBranch + '). Comprueba que github_token tiene scope "repo".', 'PROVIDER', { target: target });
        }
        var filePath = msg.diff.fileName;
        return fetchFileSha(token, target.owner, target.repo, target.branch, filePath).then(function (fileInfo) {
          // Decode the existing content if the file is on the branch.
          var existingContent = '';
          if (fileInfo.exists && fileInfo.raw && fileInfo.raw.content) {
            try { existingContent = decodeURIComponent(escape(atob(fileInfo.raw.content.replace(/\n/g, '')))); }
            catch (e) { try { existingContent = atob(fileInfo.raw.content.replace(/\n/g, '')); } catch (_) { existingContent = ''; } }
          }
          var patched = buildPatchedContent(existingContent, msg.diff.lines, filePath);
          return putFile(token, target.owner, target.repo, target.branch, filePath, patched, fileInfo.sha, msg.commitMessage || 'Vektor: apply diff to ' + filePath)
            .then(function (put) {
              if (put.conflict) {
                return record({
                  kind: 'phantom-accept', at: Date.now(), target: target, file: filePath,
                  commitMessage: msg.commitMessage, reason: '409_conflict', originalPrompt: msg.originalPrompt || null,
                }).then(function () {
                  return err('Merge conflict upstream (HTTP 409). Alguien commiteo sobre ' + filePath + ' en ' + target.branch + ' despues del ultimo fetch. Recarga la pagina o pide al usuario que resuelva y vuelve a aceptar.', 'PROVIDER', { file: filePath, branch: target.branch });
                });
              }
              if (!put.ok) {
                return err('PUT /contents fallo (HTTP ' + put.status + ')', 'PROVIDER', { body: put.body });
              }
              return record({
                kind: 'real-accept', at: Date.now(), target: target, commitSha: put.commitSha,
                file: filePath, commitMessage: msg.commitMessage,
              }).then(function () {
                return ok({
                  mode: 'committed',
                  target: target,
                  commitSha: put.commitSha,
                  htmlUrl: put.html,
                  file: filePath,
                  message: 'Commit landed on ' + target.branch + ' (' + (put.commitSha || '?').slice(0, 7) + ').',
                });
              });
            });
        });
      });
    });
  }

  function handleReject(msg) {
    if (!msg.diff || typeof msg.diff.fileName !== 'string') {
      return err('Bad payload: diff{fileName} required', 'VALIDATION', { got: msg });
    }
    return record({
      kind: 'rejection',
      at: Date.now(),
      reason: msg.reason || 'user_rejected',
      target: msg.target || null,
      diff: { fileName: msg.diff.fileName, lineCount: (msg.diff.lines || []).length, sample: (msg.diff.lines || []).slice(0, 3) },
      originalPrompt: msg.originalPrompt || null,
    }).then(function () {
      return ok({
        mode: 'rejected',
        message: 'Rechazo registrado. Para pedir una alternativa, el sidepanel llama B.smartQuery con el prompt original + "el usuario rechazo este enfoque; propone uno significativamente distinto".',
      });
    });
  }

  // ─── Install ───────────────────────────────────────────────────────────

  function install() {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) {
      console.warn('[X1-diff-committer] chrome.runtime.onMessage no disponible; modulo no instalado');
      return;
    }
    chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
      if (!msg || typeof msg !== 'object') return false;
      var type = msg.type;
      if (type !== REQ.ACCEPT && type !== REQ.REJECT && type !== LEGACY_ACCEPT && type !== LEGACY_REJECT) {
        return false;
      }
      var handler = (type === REQ.ACCEPT || type === LEGACY_ACCEPT) ? handleAccept : handleReject;
      handler(msg).then(function (resp) {
        try { sendResponse(resp); } catch (_) {}
      }).catch(function (e) {
        try { sendResponse(err(e && e.message || 'unknown', 'INTERNAL', { stack: e && e.stack })); } catch (_) {}
      });
      return true; // keeps the channel open for the async sendResponse above
    });
    console.log('[X1-diff-committer] listening for ' + REQ.ACCEPT + ' / ' + REQ.REJECT + ' (legacy: ' + LEGACY_ACCEPT + ' / ' + LEGACY_REJECT + ')');
  }

  install();
})();
