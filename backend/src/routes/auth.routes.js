const router = require('express').Router();
const { body } = require('express-validator');
const { signup, login, getMe, saveKeys } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/signup', [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters').matches(/^[a-zA-Z0-9_]+$/).withMessage('Username: letters, numbers and underscores only'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], signup);

router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/keys', protect, saveKeys);

module.exports = router;
