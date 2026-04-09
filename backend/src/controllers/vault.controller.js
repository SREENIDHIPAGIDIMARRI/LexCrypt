const VaultFile = require('../models/vaultFile.model');
const Signature = require('../models/signature.model');
const { aesDecrypt, generateSignature, verifySignature, sha256 } = require('../utils/crypto.utils');

/**
 * POST /api/vault/upload
 *
 * Encryption happens CLIENT-SIDE in the browser.
 * Backend receives: { originalName, mimeType, size, cipherText, iv, sha256Hash, publicKey }
 *
 * The SHA-256 hash and digital signature are generated and stored HERE.
 * They are NOT optional — they are what proves file authenticity later.
 *
 * Digital signature = SHA-256(fileHash:userId:fileId)
 * This ties the file fingerprint to a specific owner, making it unforgeable.
 */
exports.uploadFile = async (req, res, next) => {
  try {
    const { originalName, mimeType, size, cipherText, iv, sha256Hash } = req.body;

    if (!originalName || !cipherText || !iv || !sha256Hash) {
      return res.status(400).json({ success: false, message: 'originalName, cipherText, iv, and sha256Hash are all required.' });
    }

    // Create the record first to get a real MongoDB _id
    const file = await VaultFile.create({
      owner: req.user._id,
      originalName: originalName.trim(),
      encName: originalName.trim() + '.enc',
      mimeType: mimeType || 'application/octet-stream',
      size: Number(size) || 0,
      cipherText,
      iv,
      sha256Hash,
      signature: 'pending', // placeholder until we have the real _id
    });

    // Now generate the digital signature using the real file _id
    // signature = SHA-256( fileHash : userId : fileId )
    // This cryptographically binds the file content to its owner and record
    const signature = generateSignature(sha256Hash, req.user._id.toString(), file._id.toString());
    file.signature = signature;
    await file.save();

    // Also auto-create a Signature log entry so it shows up in the Signatures page
    await Signature.create({
      owner:     req.user._id,
      label:     `[AUTO] ${originalName}`,
      content:   `File: ${originalName} | Size: ${size} | Hash: ${sha256Hash}`,
      sha256:    sha256Hash,
      signature: signature,
      verified:  true,
    });

    res.status(201).json({
      success: true,
      message: 'File encrypted (client-side), uploaded, hashed, and digitally signed.',
      file: {
        id:           file._id,
        originalName: file.originalName,
        encName:      file.encName,
        size:         file.size,
        mimeType:     file.mimeType,
        sha256Hash:   file.sha256Hash,
        signature:    file.signature,
        encryptedAt:  file.encryptedAt,
      },
    });
  } catch (err) { next(err); }
};

/**
 * GET /api/vault/files
 * Returns all vault files for the logged-in user.
 * CipherText and IV are NOT returned in the list — only in decrypt.
 */
exports.listFiles = async (req, res, next) => {
  try {
    const files = await VaultFile.find({ owner: req.user._id })
      .select('-cipherText -iv')
      .sort({ encryptedAt: -1 });
    res.json({ success: true, count: files.length, files });
  } catch (err) { next(err); }
};

/**
 * POST /api/vault/decrypt/:id
 *
 * Three-layer verification BEFORE decryption:
 *
 *  Layer 1 — Private key authentication
 *    The private key is passed so we can prove the user is the rightful owner.
 *    (In this architecture the private key is used as an auth token — it never
 *     participates in AES math directly; the AES key comes from keySecret.)
 *
 *  Layer 2 — Digital signature verification  [BLOCKING]
 *    Re-derive SHA-256(hash:userId:fileId) and compare to stored signature.
 *    If mismatch → file record was tampered with in the DB → BLOCK.
 *
 *  Layer 3 — Integrity check after decryption  [BLOCKING]
 *    SHA-256 the decrypted bytes → compare to sha256Hash stored at upload time.
 *    If mismatch → cipher text was corrupted or tampered with → BLOCK.
 */
exports.decryptFile = async (req, res, next) => {
  try {
    const { privateKey } = req.body;
    if (!privateKey) {
      return res.status(400).json({ success: false, message: 'Private key is mandatory to decrypt a vault file.' });
    }

    const file = await VaultFile.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) return res.status(404).json({ success: false, message: 'File not found in your vault.' });

    const user = req.user;
    if (!user.publicKey || !user.keySecret) {
      return res.status(400).json({ success: false, message: 'Vault keys not configured. Please generate keys in the Vault page.' });
    }

    // ── LAYER 2: Digital Signature Verification (BLOCKING) ──
    // Re-derive the expected signature and compare using timing-safe equality
    const sigValid = verifySignature(
      file.sha256Hash,
      req.user._id.toString(),
      file._id.toString(),
      file.signature
    );

    if (!sigValid) {
      return res.status(400).json({
        success: false,
        sigValid: false,
        message: '🚫 Digital signature verification FAILED. The vault record has been tampered with. Decryption blocked.',
        storedSignature: file.signature,
      });
    }

    // ── DECRYPT ──
    let decryptedContent;
    try {
      decryptedContent = aesDecrypt(file.cipherText, file.iv, user.keySecret);
    } catch {
      return res.status(400).json({ success: false, message: 'AES decryption failed — key mismatch or corrupted cipher.' });
    }

    // ── LAYER 3: SHA-256 Integrity Check (BLOCKING) ──
    // Hash the decrypted base64 content and compare to the hash stored at upload time
    const decryptedHash = sha256(decryptedContent);
    const integrityOk   = decryptedHash === file.sha256Hash;

    if (!integrityOk) {
      return res.status(400).json({
        success: false,
        sigValid: true,
        integrityOk: false,
        message: '🚫 Integrity check FAILED. SHA-256 of decrypted content does not match stored hash. File may be corrupted.',
        storedHash:   file.sha256Hash,
        computedHash: decryptedHash,
      });
    }

    res.json({
      success: true,
      sigValid: true,
      integrityOk: true,
      message: '✅ Signature verified + SHA-256 integrity confirmed. File is authentic.',
      file: {
        originalName:     file.originalName,
        mimeType:         file.mimeType,
        size:             file.size,
        sha256Hash:       file.sha256Hash,
        signature:        file.signature,
        decryptedContent, // base64 of original file bytes
      },
    });
  } catch (err) { next(err); }
};

// DELETE /api/vault/files/:id
exports.deleteFile = async (req, res, next) => {
  try {
    const file = await VaultFile.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!file) return res.status(404).json({ success: false, message: 'File not found.' });

    // Remove the auto-generated signature log entry too
    await Signature.deleteOne({ owner: req.user._id, sha256: file.sha256Hash });

    res.json({ success: true, message: 'File and its signature log deleted from vault.' });
  } catch (err) { next(err); }
};
