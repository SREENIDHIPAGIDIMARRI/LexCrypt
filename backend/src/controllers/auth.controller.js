const { validationResult } = require('express-validator');
const User = require('../models/user.model');
const { sendTokenResponse } = require('../utils/jwt.utils');

// POST /api/auth/signup
exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { firstName, lastName, username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return res.status(409).json({ success: false, message: `This ${field} is already registered.` });
    }

    const user = await User.create({ firstName, lastName, username, email, password });
    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Username/email and password are required.' });
    }

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
    }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// PUT /api/auth/keys  — save vault public key + secret after key generation
exports.saveKeys = async (req, res, next) => {
  try {
    const { publicKey, keySecret, vaultName, vaultDesc } = req.body;
    if (!publicKey || !keySecret) {
      return res.status(400).json({ success: false, message: 'publicKey and keySecret are required.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { publicKey, keySecret, vaultName: vaultName || 'My Secure Vault', vaultDesc: vaultDesc || '' },
      { new: true }
    );

    res.json({ success: true, message: 'Keys saved successfully.', user });
  } catch (err) {
    next(err);
  }
};
