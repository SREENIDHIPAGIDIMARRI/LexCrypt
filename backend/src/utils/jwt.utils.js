const jwt = require('jsonwebtoken');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id:        user._id,
      username:  user.username,
      firstName: user.firstName,
      lastName:  user.lastName,
      email:     user.email,
      publicKey: user.publicKey,
      vaultName: user.vaultName,
    },
  });
};

module.exports = { signToken, sendTokenResponse };
