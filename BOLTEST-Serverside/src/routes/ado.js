const express = require('express');
const router = express.Router();
const adoController = require('../../controllers/adoController');
const adoHealthController = require('../../controllers/adoHealth');
const { requireBackendKey } = require('../../middleware/backendApiKey');
const { optionalAuthenticateToken, authenticateToken } = require('../../middleware/auth');
const { rateLimit } = require('../../middleware/rateLimit');

// Keep ADO/TFS protected from bursty traffic (in-memory, per-process)
router.use(rateLimit({ windowMs: 60_000, max: 120, keyPrefix: 'ado' }));

// If the client is logged in, allow ADO routes to use orgUrl/PAT from JWT.
router.use(optionalAuthenticateToken);

// Public routes (no backend key required)
router.get('/health', adoHealthController.healthCheck);
// Debug route: requires login token. Returns hash-only info about auth inputs.
router.get('/debug-auth', authenticateToken, adoHealthController.debugAuth);
router.get('/userstories', adoController.getUserStories);
router.get('/userstories/notests', adoController.getStoriesWithoutTests);
router.get('/userstories/hastests', adoController.getStoriesWithTests);
router.get('/mytasks', adoController.getMyTasksWithChildBugs);
router.get('/dashboard', adoController.getDashboardSnapshot);
router.post('/wiql', adoController.runWiql);
// Tag suggestions (public; uses optional auth context)
router.get('/tags/suggestions', adoController.getTagSuggestions);

// IMPORTANT: expose test case listing without backend key so the UI can fetch
router.get('/testcases', adoController.getTestCasesBasic);

// Protect all other ADO routes with backend-only key when configured
router.use(requireBackendKey);

router.post('/validate', adoController.validate);
router.post('/testcase', adoController.createOrFindTestCase);
router.put('/testcase/:id', adoController.updateTestCase);
router.get('/testplans', adoController.getTestPlans);
router.get('/testplans/:id', adoController.getTestPlanById);
router.post('/testplans', adoController.createTestPlan);
router.patch('/testplans/:id', adoController.updateTestPlan);
router.delete('/testplans/:id', adoController.deleteTestPlan);
router.get('/testsuites', adoController.getTestSuites);
router.get('/suiteentries', adoController.getSuiteEntries);
router.patch('/suiteentries/:suiteId', adoController.reorderSuiteEntries);
router.get('/testsuites/:suiteId', adoController.getTestSuiteById);
router.post('/testsuites', adoController.createTestSuite);
router.patch('/testsuites/:suiteId', adoController.updateTestSuite);
router.delete('/testsuites/:suiteId', adoController.deleteTestSuite);
router.get('/testsuites-by-testcase', adoController.getSuitesByTestCase);
router.post('/testrun', adoController.createTestRun);
router.post('/testrun/:id/result', adoController.addTestResult);
router.get('/testpoints', adoController.getTestPoints);
router.get('/testcases/details', adoController.getTestCaseDetailsBatch);

module.exports = router;
