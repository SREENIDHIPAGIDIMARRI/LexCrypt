const mongoose = require('mongoose');

const vaultFileSchema = new mongoose.Schema({
  owner:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  originalName: { type: String, required: true },
  encName:      { type: String, required: true },
  mimeType:     { type: String, default: 'application/octet-stream' },
  size:         { type: Number, required: true },
  // AES-256-CBC encrypted file content (base64)
  cipherText:   { type: String, required: true },
  // SHA-256 hash of the original file bytes (for integrity verification)
  sha256Hash:   { type: String, required: true },
  // Digital signature: SHA-256(hash:userId:id)
  signature:    { type: String, required: true },
  // IV used in AES encryption (hex string, stored separately for transparency)
  iv:           { type: String, required: true },
  encryptedAt:  { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('VaultFile', vaultFileSchema);
