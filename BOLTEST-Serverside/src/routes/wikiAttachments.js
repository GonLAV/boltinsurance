const express = require('express');
const router = express.Router();
const multer = require('multer');
const wikiAttachmentController = require('../../controllers/wikiAttachmentController');
const { authenticateToken } = require('../../middleware/auth');

// Setup multer for file uploads (store in memory for wiki)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  }
});

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/wiki-attachments/upload
 * @desc    Upload file to wiki
 * @access  Private
 * @body    FormData: { attachment: File, wikiIdentifier?: 'wiki' }
 * @returns { success, data: { name, path, version } }
 */
router.post('/upload', upload.single('attachment'), wikiAttachmentController.uploadWikiAttachment);

/**
 * @route   GET /api/wiki-attachments/:wikiIdentifier/attachments
 * @desc    Get wiki attachment metadata
 * @access  Private
 * @query   path (required) - Attachment path, e.g., '/.attachments/image.png'
 * @returns { success, data: attachment metadata }
 */
router.get('/:wikiIdentifier/attachments', wikiAttachmentController.getWikiAttachment);

/**
 * @route   DELETE /api/wiki-attachments/:wikiIdentifier/attachments
 * @desc    Delete wiki attachment
 * @access  Private
 * @query   path (required) - Attachment path, e.g., '/.attachments/image.png'
 * @returns { success, message }
 */
router.delete('/:wikiIdentifier/attachments', wikiAttachmentController.deleteWikiAttachment);

module.exports = router;
