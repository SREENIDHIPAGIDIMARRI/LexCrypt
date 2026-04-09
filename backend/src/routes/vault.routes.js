const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { uploadFile, listFiles, decryptFile, deleteFile } = require('../controllers/vault.controller');

router.use(protect);

router.post('/upload', uploadFile);
router.get('/files', listFiles);
router.post('/decrypt/:id', decryptFile);
router.delete('/files/:id', deleteFile);

module.exports = router;
