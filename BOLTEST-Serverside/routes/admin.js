const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');

// All admin endpoints require authentication
router.post('/find-or-create', authenticateToken, adminController.findOrCreate);

module.exports = router;
