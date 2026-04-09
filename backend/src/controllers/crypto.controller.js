const { aesEncrypt, aesDecrypt, sha256 } = require('../utils/crypto.utils');
const CryptoSession = require('../models/cryptoSession.model');
const User = require('../models/user.model');

/**
 * POST /api/crypto/encrypt
 * Encrypts plain text, stores SHA-256 hash silently in MongoDB.
 * User never has to manually enter the hash — it's auto-verified at decrypt.
 */
exports.encryptText = async (req, res, next) => {
  try {
    const { plainText, label } = req.body;
    if (!plainText) return res.status(400).json({ success: false, message: 'plainText is required.' });

    const user = await User.findById(req.user._id);
    if (!user.publicKey || !user.keySecret) {
      return res.status(400).json({ success: false, message: 'Vault keys not configured. Go to Vault and generate your key pair first.' });
    }

    const { cipherText, iv } = aesEncrypt(plainText, user.keySecret);
    const plainHash = sha256(plainText); // stored silently — user never sees or enters this

    const session = await CryptoSession.create({
      owner: req.user._id,
      cipherText,
      iv,
      plainHash,
      label: label || `Message — ${new Date().toLocaleString()}`,
    });

    res.status(201).json({
      success: true,
      sessionId: session._id,
      cipherText,
      iv,
      label: session.label,
      algorithm: 'AES-256-CBC',
      message: 'Encrypted and saved to MongoDB. Session ID needed for decryption.',
    });
  } catch (err) { next(err); }
};

/**
 * POST /api/crypto/decrypt
 * Decrypts using the stored session. Auto-verifies SHA-256 hash.
 * User NEVER manually enters a hash.
 */
exports.decryptText = async (req, res, next) => {
  try {
    const { sessionId, privateKey } = req.body;
    if (!sessionId)  return res.status(400).json({ success: false, message: 'sessionId is required.' });
    if (!privateKey) return res.status(400).json({ success: false, message: 'Private key is required to authenticate.' });

    const session = await CryptoSession.findOne({ _id: sessionId, owner: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found or does not belong to you.' });

    const user = await User.findById(req.user._id);
    if (!user.keySecret) return res.status(400).json({ success: false, message: 'Vault keys not configured.' });

    let plainText;
    try {
      plainText = aesDecrypt(session.cipherText, session.iv, user.keySecret);
    } catch {
      return res.status(400).json({ success: false, message: 'Decryption failed — cipher text or key corrupted.' });
    }

    // Auto integrity check — no user input needed
    const decryptedHash = sha256(plainText);
    const integrityOk   = decryptedHash === session.plainHash;

    if (!integrityOk) {
      return res.status(400).json({
        success: false, integrityOk: false,
        message: '⚠️ Integrity FAILED — cipher text was tampered with.',
        storedHash: session.plainHash, computedHash: decryptedHash,
      });
    }

    res.json({
      success: true, plainText, integrityOk: true,
      algorithm: session.algorithm, label: session.label,
      encryptedAt: session.encryptedAt,
      message: '✅ SHA-256 verified automatically — content is authentic.',
    });
  } catch (err) { next(err); }
};

// GET /api/crypto/sessions
exports.listSessions = async (req, res, next) => {
  try {
    const sessions = await CryptoSession.find({ owner: req.user._id })
      .select('-cipherText -iv -plainHash')
      .sort({ encryptedAt: -1 });
    res.json({ success: true, count: sessions.length, sessions });
  } catch (err) { next(err); }
};

// GET /api/crypto/sessions/:id — returns cipherText+iv for decryption, never plainHash
exports.getSession = async (req, res, next) => {
  try {
    const session = await CryptoSession.findOne({ _id: req.params.id, owner: req.user._id }).select('-plainHash');
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    res.json({ success: true, session });
  } catch (err) { next(err); }
};

// DELETE /api/crypto/sessions/:id
exports.deleteSession = async (req, res, next) => {
  try {
    await CryptoSession.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    res.json({ success: true, message: 'Session deleted.' });
  } catch (err) { next(err); }
};
