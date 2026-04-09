const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { signContent, verifyContent, listSignatures, deleteSignature } = require('../controllers/signature.controller');

router.use(protect);
router.post('/sign', signContent);
router.post('/verify', verifyContent);
router.get('/', listSignatures);
router.delete('/:id', deleteSignature);

module.exports = router;
