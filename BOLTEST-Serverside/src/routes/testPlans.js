const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const testPlanController = require('../../controllers/testPlanController');

router.get('/', authenticateToken, testPlanController.listPlans);
router.get('/:planId', authenticateToken, testPlanController.getPlan);
router.post('/', authenticateToken, testPlanController.createPlan);
router.patch('/:planId', authenticateToken, testPlanController.updatePlan);
router.delete('/:planId', authenticateToken, testPlanController.deletePlan);

module.exports = router;
