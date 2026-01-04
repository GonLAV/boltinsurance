/**
 * Shared Parameters Routes
 */

const express = require('express');
const router = express.Router();
const sharedParametersController = require('../controllers/sharedParametersController');

/**
 * GET /api/shared-parameters
 * List all shared parameter sets
 */
router.get('/', sharedParametersController.listParameters);

/**
 * POST /api/shared-parameters/create
 * Create a new shared parameter set
 */
router.post('/create', sharedParametersController.createParameter);

/**
 * POST /api/shared-parameters/add-data
 * Add data rows to existing parameter set
 */
router.post('/add-data', sharedParametersController.addParameterData);

/**
 * POST /api/shared-parameters/link-to-testcase
 * Link parameter set to test case
 */
router.post('/link-to-testcase', sharedParametersController.linkParameterToTestCase);

/**
 * POST /api/shared-parameters/convert-to-steps
 * Convert test steps to parameter format
 */
router.post('/convert-to-steps', sharedParametersController.convertToParameterSteps);

/**
 * GET /api/shared-parameters/export
 * Export parameter set as CSV
 */
router.get('/export', sharedParametersController.exportParameter);

/**
 * DELETE /api/shared-parameters/:parameterName
 * Delete a parameter set
 */
router.delete('/:parameterName', sharedParametersController.deleteParameter);

module.exports = router;
