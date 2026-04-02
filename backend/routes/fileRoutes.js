const express = require('express');
const router = express.Router();
const { uploadFile, getFile, serveFile, downloadFileHandler } = require('../controllers/fileController');

router.post('/upload', uploadFile);
router.get('/info/:fileId', getFile);
router.post('/download/:fileId', downloadFileHandler);
router.get('/view/:fileId', serveFile); // Securely serve the raw file

module.exports = router;
