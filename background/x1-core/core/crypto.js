/**
 * Módulo de cifrado para proteger API keys
 * Usa Web Crypto API (nativo del navegador, sin dependencias)
 */

export class CryptoManager {
  /**
   * Generar una clave de cifrado basada en contraseña del usuario
   * @param {string} password - Contraseña del usuario
   * @returns {Promise<CryptoKey>}
   */
  static async generateKeyFromPassword(password) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Derivar clave usando PBKDF2
    const importedKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('x1-salt-2026'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      importedKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Cifrar un texto
   * @param {string} text - Texto a cifrar
   * @param {CryptoKey} key - Clave de cifrado
   * @returns {Promise<string>} - Texto cifrado en base64
   */
  static async encrypt(text, key) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    // Generar IV aleatorio
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Cifrar
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Combinar IV + datos cifrados
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convertir a base64
    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Descifrar un texto
   * @param {string} encryptedText - Texto cifrado en base64
   * @param {CryptoKey} key - Clave de cifrado
   * @returns {Promise<string>} - Texto descifrado
   */
  static async decrypt(encryptedText, key) {
    // Convertir de base64
    const combined = new Uint8Array(
      atob(encryptedText).split('').map(c => c.charCodeAt(0))
    );

    // Separar IV y datos
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // Descifrar
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    // Convertir a texto
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  }

  /**
   * Hash SHA-256 para verificación
   * @param {string} text - Texto a hashear
   * @returns {Promise<string>} - Hash en hex
   */
  static async hash(text) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(text)
    );
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

export default CryptoManager;
