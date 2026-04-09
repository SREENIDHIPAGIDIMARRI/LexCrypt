const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName:  { type: String, required: true, trim: true, maxlength: 50 },
  lastName:   { type: String, required: true, trim: true, maxlength: 50 },
  username:   { type: String, required: true, unique: true, trim: true, lowercase: true, minlength: 3, maxlength: 30 },
  email:      { type: String, required: true, unique: true, trim: true, lowercase: true },
  password:   { type: String, required: true, minlength: 8 },
  // RSA key pair — stored per user (public key in DB; private key returned once, never stored)
  publicKey:  { type: String, default: null },
  vaultName:  { type: String, default: 'My Secure Vault' },
  vaultDesc:  { type: String, default: '' },
  // AES secret fingerprint (SHA-256 of public key) for vault operations
  keySecret:  { type: String, default: null },
  createdAt:  { type: Date, default: Date.now },
  lastLogin:  { type: Date, default: null },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Never send password in JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
