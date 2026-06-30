var X1Encryption = (function() {

  var ALGORITHM = 'AES-GCM';
  var KEY_LENGTH = 256;
  var ITERATIONS = 100000;
  var SALT_LENGTH = 16;
  var IV_LENGTH = 12;
  var TAG_LENGTH = 128;

  var cachedKey = null;
  var passphraseHash = '';

  function deriveKey(passphrase, salt) {
    var enc = new TextEncoder();
    var keyMaterial = enc.encode(passphrase);
    return crypto.subtle.importKey('raw', keyMaterial, 'PBKDF2', false, ['deriveKey']).then(function(baseKey) {
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: ITERATIONS, hash: 'SHA-256' },
        baseKey,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
      );
    });
  }

  function generateSalt() {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  }

  function generateIV() {
    return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  }

  function hashPassphrase(passphrase) {
    var enc = new TextEncoder();
    return crypto.subtle.digest('SHA-256', enc.encode(passphrase)).then(function(hash) {
      var hashArray = Array.from(new Uint8Array(hash));
      return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  function init(passphrase) {
    return hashPassphrase(passphrase).then(function(hash) {
      passphraseHash = hash;
      var salt = generateSalt();
      return deriveKey(passphrase, salt).then(function(key) {
        cachedKey = { key: key, salt: salt };
        return true;
      });
    });
  }

  function encrypt(plaintext) {
    if (!cachedKey) return Promise.reject(new Error('Encryption not initialized. Call init(passphrase) first.'));
    var enc = new TextEncoder();
    var data = enc.encode(plaintext);
    var iv = generateIV();
    return crypto.subtle.encrypt(
      { name: ALGORITHM, iv: iv, tagLength: TAG_LENGTH },
      cachedKey.key,
      data
    ).then(function(encrypted) {
      var combined = new Uint8Array(cachedKey.salt.length + iv.length + encrypted.byteLength);
      combined.set(cachedKey.salt, 0);
      combined.set(iv, cachedKey.salt.length);
      combined.set(new Uint8Array(encrypted), cachedKey.salt.length + iv.length);
      var base64 = btoa(String.fromCharCode.apply(null, combined));
      return base64;
    });
  }

  function decrypt(ciphertext) {
    if (!cachedKey) {
      return Promise.reject(new Error('Decryption not initialized. Call init(passphrase) first.'));
    }
    try {
      var combined = Uint8Array.from(atob(ciphertext), function(c) { return c.charCodeAt(0); });
      var salt = combined.slice(0, SALT_LENGTH);
      var iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      var encrypted = combined.slice(SALT_LENGTH + IV_LENGTH);
      return deriveKeyFromSalt(salt).then(function(key) {
        return crypto.subtle.decrypt(
          { name: ALGORITHM, iv: iv, tagLength: TAG_LENGTH },
          key,
          encrypted
        );
      }).then(function(decrypted) {
        var dec = new TextDecoder();
        return dec.decode(decrypted);
      });
    } catch(e) {
      return Promise.reject(new Error('Decryption failed: ' + e.message));
    }
  }

  function deriveKeyFromSalt(salt) {
    if (!cachedKey) return Promise.reject(new Error('Not initialized'));
    return deriveKeyFromHash(passphraseHash, salt);
  }

  function deriveKeyFromHash(hash, salt) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(hash), 'PBKDF2', false, ['deriveKey']).then(function(baseKey) {
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: ITERATIONS, hash: 'SHA-256' },
        baseKey,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
      );
    });
  }

  function isInitialized() { return cachedKey !== null; }

  function lock() {
    cachedKey = null;
    passphraseHash = '';
  }

  function exportEncrypted(data) {
    return encrypt(JSON.stringify(data));
  }

  function importEncrypted(ciphertext) {
    return decrypt(ciphertext).then(function(json) { return JSON.parse(json); });
  }

  return { init: init, encrypt: encrypt, decrypt: decrypt, isInitialized: isInitialized, lock: lock, exportEncrypted: exportEncrypted, importEncrypted: importEncrypted, hashPassphrase: hashPassphrase };
})();
