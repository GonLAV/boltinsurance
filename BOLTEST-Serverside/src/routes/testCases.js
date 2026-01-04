
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const testCaseController = require('../../controllers/testCaseController');
const { authenticateToken } = require('../../middleware/auth');

// Setup multer for file uploads
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}_${safeName}`;
    cb(null, filename);
  }
});

const upload = multer({ storage });

// Dev-only create endpoint (no auth) - useful for local testing
router.post('/create-dev', testCaseController.createTestCaseDev);

// כל ה-routes צריכים אימות
router.use(authenticateToken);

/**
 * @route   POST /api/testcases/create-with-files
 * @desc    Create Test Case with file attachments (FormData)
 * @access  Private
 */
router.post('/create-with-files', upload.array('attachments', 10), testCaseController.createTestCaseWithFiles);

/**
 * @route   POST /api/testcases/create
 * @desc    יצירת Test Case חדש
 * @access  Private
 */
router.post('/create', testCaseController.createTestCase);

/**
 * @route   GET /api/testcases
 * @desc    קבלת כל ה-Test Cases
 * @access  Private
 */
router.get('/', testCaseController.getTestCases);

/**
 * @route   GET /api/testcases/:id
 * @desc    קבלת Test Case בודד לפי ID
 * @access  Private
 */
router.get('/:id', testCaseController.getTestCaseById);

/**
 * @route   POST /api/testcases/:id/clone
 * @desc    Clone a Test Case 1:1 including steps and attachments
 * @access  Private
 */
router.post('/:id/clone', testCaseController.cloneTestCase);

/**
 * @route   PATCH /api/testcases/:id
 * @desc    עדכון Test Case
 * @access  Private
 */
router.patch('/:id', testCaseController.updateTestCase);

/**
 * @route   DELETE /api/testcases/:id
 * @desc    מחיקת Test Case
 * @access  Private
 */
router.delete('/:id', testCaseController.deleteTestCase);

module.exports = router;