
const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authControllers');
const { authenticateToken } = require('../../middleware/auth');

/**
 * @route   POST /api/auth/login
 * @desc    התחברות עם PAT של Azure DevOps
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/test-connection
 * @desc    בדיקת חיבור ל-Azure DevOps בלי התחברות
 * @access  Public
 */
router.post('/test-connection', authController.testConnection);

/**
 * @route   POST /api/auth/logout
 * @desc    התנתקות
 * @access  Public
 */
router.post('/logout', authController.logout);

/**
 * @route   GET /api/auth/status
 * @desc    בדיקת סטטוס התחברות
 * @access  Private
 */
router.get('/status', authenticateToken, authController.checkStatus);

module.exports = router;