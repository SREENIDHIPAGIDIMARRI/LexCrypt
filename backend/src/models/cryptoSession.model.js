const mongoose = require('mongoose');

/**
 * CryptoSession — persists every text encrypt/decrypt operation.
 *
 * Why this exists:
 *  - The Crypto page is not just a calculator — every operation is auditable.
 *  - The SHA-256 hash of the plain text is stored at encrypt time.
 *  - At decrypt time the server re-hashes the result and compares → proves
 *    the cipher text was not tampered with between sessions.
 *  - Users can revisit past cipher texts without re-encrypting.
 */
const cryptoSessionSchema = new mongoose.Schema({
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // The AES-256-CBC encrypted text (base64)
  cipherText:  { type: String, required: true },

  // Initialisation vector used for this encryption (hex) — needed for decryption
  iv:          { type: String, required: true },

  // SHA-256 of the ORIGINAL plain text — stored at encrypt time
  // Used at decrypt time to verify the result hasn't been tampered with
  plainHash:   { type: String, required: true },

  // Human-readable label so the user can identify the session later
  label:       { type: String, default: 'Untitled message' },

  // Algorithm metadata — for audit/display
  algorithm:   { type: String, default: 'AES-256-CBC' },
  keyDerivation: { type: String, default: 'PBKDF2-SHA256' },

  encryptedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('CryptoSession', cryptoSessionSchema);
