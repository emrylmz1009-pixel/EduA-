export const cryptoService = {
  encrypt(text, pin) {
    if (!text || !pin) return '';
    try {
      const pinStr = String(pin);
      let result = '';
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const pinCode = pinStr.charCodeAt(i % pinStr.length);
        const encryptedChar = String.fromCharCode(charCode ^ pinCode);
        result += encryptedChar;
      }
      return btoa(unescape(encodeURIComponent(result)));
    } catch (e) {
      console.error("Encryption error", e);
      return '';
    }
  },

  decrypt(ciphertext, pin) {
    if (!ciphertext || !pin) return '';
    try {
      const pinStr = String(pin);
      const decoded = decodeURIComponent(escape(atob(ciphertext)));
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i);
        const pinCode = pinStr.charCodeAt(i % pinStr.length);
        const decryptedChar = String.fromCharCode(charCode ^ pinCode);
        result += decryptedChar;
      }
      return result;
    } catch (e) {
      console.error("Decryption error (invalid PIN or corrupt data)", e);
      return '';
    }
  }
};
