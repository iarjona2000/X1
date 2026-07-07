var X1GoogleAuth = (function() {

  var currentToken = null;
  var tokenExpiry = 0;
  var loggedIn = false;

  function getAuthToken(interactive) {
    return new Promise(function(resolve, reject) {
      if (currentToken && Date.now() < tokenExpiry - 60000) { resolve(currentToken); return; }
      chrome.identity.getAuthToken({ interactive: interactive !== false }, function(token) {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        if (!token) { reject(new Error('No token returned')); return; }
        currentToken = token;
        tokenExpiry = Date.now() + 3600000;
        loggedIn = true;
        resolve(token);
      });
    });
  }

  function login() {
    return getAuthToken(true).then(function(token) {
      var userInfo = fetchUserInfo(token);
      return userInfo;
    });
  }

  function logout() {
    return new Promise(function(resolve, reject) {
      if (!currentToken) { loggedIn = false; resolve(true); return; }
      var token = currentToken;
      currentToken = null;
      tokenExpiry = 0;
      loggedIn = false;
      chrome.identity.removeCachedAuthToken({ token: token }, function() {
        chrome.identity.clearAllCachedAuthTokens(function() {
          fetch('https://accounts.google.com/o/oauth2/revoke?token=' + token).catch(function() {}).finally(function() { resolve(true); });
        });
      });
    });
  }

  function fetchUserInfo(token) {
    return fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + token }
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.error) throw new Error(data.error.message || 'USER_INFO_FAILED');
      return { email: data.email, name: data.name, picture: data.picture };
    });
  }

  function isLoggedIn() {
    if (!loggedIn && currentToken) return Promise.resolve(true);
    if (!currentToken) return Promise.resolve(false);
    return getAuthToken(false).then(function() { return true; }).catch(function() { return false; });
  }

  function getToken() {
    return getAuthToken(false)
      .catch(function() {
        return new Promise(function(resolve, reject) {
          chrome.storage.local.get('google_token', function(d) {
            if (d && d.google_token) { currentToken = d.google_token; tokenExpiry = Date.now() + 3600000; loggedIn = true; resolve(d.google_token); }
            else { getAuthToken(true).then(resolve).catch(reject); }
          });
        });
      });
  }

  function clearCache() {
    currentToken = null;
    tokenExpiry = 0;
    loggedIn = false;
  }

  return { login: login, logout: logout, isLoggedIn: isLoggedIn, getToken: getToken, getAuthToken: getAuthToken, clearCache: clearCache };
})();
