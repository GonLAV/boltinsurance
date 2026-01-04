const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const workItemController = require('../../controllers/workItemController');

// Create any work item (Bug, Task, User Story, Test Case)
router.post('/create', authenticateToken, workItemController.create);

module.exports = router;
