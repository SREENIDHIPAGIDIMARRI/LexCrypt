const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const {
  encryptText, decryptText,
  listSessions, getSession, deleteSession,
} = require('../controllers/crypto.controller');

router.use(protect);

router.post('/encrypt',         encryptText);
router.post('/decrypt',         decryptText);
router.get('/sessions',         listSessions);
router.get('/sessions/:id',     getSession);
router.delete('/sessions/:id',  deleteSession);

module.exports = router;
