const crypto = require('crypto');

const KEY_BASE64 = process.env.ENCRYPTION_KEY || '';
const KEY = KEY_BASE64 ? Buffer.from(KEY_BASE64, 'base64') : null;

function ensureKey() {
  if (!KEY || KEY.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be set and be 32 bytes (base64)');
  }
}

function encrypt(text) {
  ensureKey();
  const iv = crypto.randomBytes(12); // recommended 12 bytes for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    data: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64')
  };
}

function decrypt({ data, iv, tag }) {
  ensureKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = {
  encrypt,
  decrypt
};
