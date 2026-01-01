const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const testSuiteController = require('../../controllers/testSuiteController');

// Add test cases to a suite
router.post('/add-cases', authenticateToken, testSuiteController.addCases);

module.exports = router;
