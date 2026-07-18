const crypto = require('crypto');

// Encrypts secrets (like each restaurant's Cloudinary API secret) before
// they touch the database, so a DB dump/leak doesn't hand over live
// third-party credentials in plaintext. AES-256-GCM: a random IV per
// value plus an auth tag, so tampering is detectable, not just hidden.
const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const keyHex = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'CREDENTIALS_ENCRYPTION_KEY must be set in .env as a 64-character hex string (32 bytes). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(keyHex, 'hex');
}

// Returns a single string safe to store in one VARCHAR column:
// iv.authTag.ciphertext, each part base64url-encoded.
function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64url'), authTag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

function decrypt(payload) {
  const key = getKey();
  const [ivB64, authTagB64, ciphertextB64] = String(payload).split('.');
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error('Malformed encrypted payload.');
  }

  const iv = Buffer.from(ivB64, 'base64url');
  const authTag = Buffer.from(authTagB64, 'base64url');
  const ciphertext = Buffer.from(ciphertextB64, 'base64url');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

module.exports = { encrypt, decrypt };
