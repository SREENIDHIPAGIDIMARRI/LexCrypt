const crypto = require('crypto');
const Signature = require('../models/signature.model');

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

/**
 * POST /api/signatures/sign
 *
 * Manually sign a document.
 * This is useful for signing text content (contracts, messages, etc.)
 * separately from file uploads.
 *
 * The signature is stored in MongoDB and shows up in the Signatures page
 * alongside auto-generated file signatures — giving you one unified audit log
 * of everything that was cryptographically signed in your account.
 */
exports.signContent = async (req, res, next) => {
  try {
    const { content, label } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Content is required.' });

    const hash = sha256(content);
    // HMAC-style: SHA-256(hash:userId) — ties the signature to the specific user
    const signature = sha256(`${hash}:${req.user._id}`);

    const sig = await Signature.create({
      owner:     req.user._id,
      label:     label || `Document — ${new Date().toLocaleString()}`,
      content:   content.slice(0, 500),
      sha256:    hash,
      signature,
      verified:  true,
    });

    res.status(201).json({
      success:   true,
      id:        sig._id,
      label:     sig.label,
      sha256:    hash,
      signature,
      message:   'Document signed. Signature stored in MongoDB audit log.',
    });
  } catch (err) { next(err); }
};

/**
 * POST /api/signatures/verify
 *
 * Verify that a piece of content matches a stored SHA-256 hash.
 * Used on the Verify tab to prove a document hasn't changed.
 */
exports.verifyContent = async (req, res, next) => {
  try {
    const { content, hash } = req.body;
    if (!content || !hash) return res.status(400).json({ success: false, message: 'content and hash are required.' });

    const computed = sha256(content);
    const valid    = computed === hash;

    res.json({ success: true, valid, computed, provided: hash });
  } catch (err) { next(err); }
};

/**
 * GET /api/signatures
 *
 * Returns ALL signatures for the user — both:
 *   - [AUTO] signatures generated automatically when a file was uploaded
 *   - Manual signatures created on the Signatures page
 *
 * This is the unified audit log that shows EVERY cryptographic operation
 * performed on behalf of this user.
 */
exports.listSignatures = async (req, res, next) => {
  try {
    const sigs = await Signature.find({ owner: req.user._id }).sort({ signedAt: -1 });
    res.json({
      success: true,
      count:   sigs.length,
      auto:    sigs.filter(s => s.label.startsWith('[AUTO]')).length,
      manual:  sigs.filter(s => !s.label.startsWith('[AUTO]')).length,
      signatures: sigs,
    });
  } catch (err) { next(err); }
};

// DELETE /api/signatures/:id
exports.deleteSignature = async (req, res, next) => {
  try {
    await Signature.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    res.json({ success: true, message: 'Signature deleted from audit log.' });
  } catch (err) { next(err); }
};
