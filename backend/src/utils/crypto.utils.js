const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH  = 16; // 128 bits
const PBKDF2_ITERATIONS = 100000;
const SALT = 'lexcrypt-salt-2026';

/**
 * Derive a 256-bit AES key from a secret string using PBKDF2-SHA256.
 */
function deriveKey(secret) {
  return crypto.pbkdf2Sync(secret, SALT, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * AES-256-CBC encrypt.
 * @param {string} plaintext
 * @param {string} secret   — the AES password (e.g. SHA-256 of public key)
 * @returns {{ cipherText: string, iv: string }}  both base64
 */
function aesEncrypt(plaintext, secret) {
  const key = deriveKey(secret);
  const iv  = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    cipherText: encrypted.toString('base64'),
    iv: iv.toString('hex'),
  };
}

/**
 * AES-256-CBC decrypt.
 * @param {string} cipherText  base64
 * @param {string} iv          hex
 * @param {string} secret
 * @returns {string} plaintext
 */
function aesDecrypt(cipherText, iv, secret) {
  const key = deriveKey(secret);
  const ivBuf = Buffer.from(iv, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuf);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherText, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

/**
 * SHA-256 hash of any string.
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Derive the AES secret from a public key string (same logic as frontend).
 */
function pubKeyToSecret(publicKey) {
  return sha256(publicKey.replace(/\s+/g, ''));
}

/**
 * Generate a digital signature: SHA-256(hash:userId:fileId)
 */
function generateSignature(hash, userId, fileId) {
  return sha256(`${hash}:${userId}:${fileId}`);
}

/**
 * Verify a digital signature.
 */
function verifySignature(hash, userId, fileId, signature) {
  const expected = generateSignature(hash, userId, fileId);
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

module.exports = { aesEncrypt, aesDecrypt, sha256, pubKeyToSecret, generateSignature, verifySignature };
