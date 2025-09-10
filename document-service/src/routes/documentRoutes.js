const express = require('express');
const { 
  uploadFile, 
  getDownloadUrl, 
  getDocumentMetadata, 
  updateDocumentMetadata, 
  deleteDocument, 
  getUserDocuments 
} = require('../controllers/documentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { upload, handleUploadError } = require('../middleware/uploadMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.post('/upload', upload.single('file'), handleUploadError, uploadFile);
router.get('/user', getUserDocuments);
router.get('/:docId', getDocumentMetadata);
router.get('/:docId/download', getDownloadUrl);
router.put('/:docId', updateDocumentMetadata);
router.delete('/:docId', deleteDocument);

module.exports = router;