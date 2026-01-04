const axios = require('axios');
const Logger = require('../../utils/logger');
const { AZURE_API_VERSION } = require('../../config/constants');
const AzureDevOpsService = require('../../services/azureDevOpsService');

/**
 * New isolated integration module for read-before-write Test Case creation.
 * - Uses PAT from environment (AZDO_PAT)
 * - Uses WIQL to check existence
 * - If exists -> returns existing ID and does nothing
 * - If multiple matches -> aborts and returns an error
 * - If not found -> creates Test Case using JSON Patch and XML steps
 * - Links to Test Plan & Suite after creation (optional)
 *
 * This module is intentionally isolated and does not modify existing routes/behaviour.
 */

const PAT = process.env.AZDO_PAT;

if (!PAT) {
  Logger.warn('AZDO_PAT is not configured. azureDevOpsIntegration will not be able to create Test Cases.');
}

async function wiqlSearch(orgUrl, project, title) {
  try {
    const url = `${orgUrl.replace(/\/$/, '')}/${project}/_apis/wit/wiql?api-version=${AZURE_API_VERSION}`;
    const query = {
      query: `SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.TeamProject] = '${project}' AND [System.WorkItemType] = 'Test Case' AND [System.Title] = '${title.replace(/'/g, "''")}'`
    };

    const authHeader = `Basic ${Buffer.from(`:${PAT}`).toString('base64')}`;

    const resp = await axios.post(url, query, {
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' }
    });

    const items = resp.data.workItems || [];
    const ids = items.map(i => i.id);
    return { success: true, ids };
  } catch (err) {
    Logger.error('WIQL search failed', err.message || err);
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      return { success: false, status: err.response.status, error: 'AUTH_ERROR' };
    }
    return { success: false, status: 500, error: 'WIQL_FAILED', message: err.message };
  }
}

async function createTestCase(orgUrl, project, title, description, steps, assignedTo, pat) {
  try {
    const effectivePat = pat || PAT;
    // Use AzureDevOpsService to leverage existing formatting logic
    const svc = new AzureDevOpsService(orgUrl, project, effectivePat);
    const formattedSteps = svc.formatTestSteps(steps || []);

    const document = [
      { op: 'add', path: '/fields/System.Title', value: title },
      { op: 'add', path: '/fields/System.Description', value: description || '' },
      { op: 'add', path: '/fields/Microsoft.VSTS.TCM.Steps', value: formattedSteps }
    ];

    // Add assignedTo field if provided
    if (assignedTo) {
      document.push({ op: 'add', path: '/fields/System.AssignedTo', value: assignedTo });
    }

    const url = `${orgUrl.replace(/\/$/, '')}/${project}/_apis/wit/workitems/$Test%20Case?api-version=${AZURE_API_VERSION}`;
    const authHeader = `Basic ${Buffer.from(`:${effectivePat}`).toString('base64')}`;

    const resp = await axios.post(url, document, {
      headers: { Authorization: authHeader, 'Content-Type': 'application/json-patch+json' }
    });

    Logger.success('Created Test Case via isolated integration', { id: resp.data.id, title, assignedTo });

    return { success: true, id: resp.data.id, url: resp.data._links?.html?.href };
  } catch (err) {
    Logger.error('Create Test Case failed', err.message || err);
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      return { success: false, status: err.response.status, error: 'AUTH_ERROR' };
    }
    return { success: false, status: 500, error: 'CREATE_FAILED', message: err.message };
  }
}

async function linkTestCaseToPlanSuite(orgUrl, project, testCaseId, planId, suiteId) {
  try {
    if (!planId || !suiteId) {
      Logger.info('No planId/suiteId provided — skipping linking');
      return { success: true, skipped: true };
    }

    const url = `${orgUrl.replace(/\/$/, '')}/${project}/_apis/test/plans/${planId}/suites/${suiteId}/testcases/${testCaseId}?api-version=${AZURE_API_VERSION}`;
    const authHeader = `Basic ${Buffer.from(`:${PAT}`).toString('base64')}`;

    const resp = await axios.post(url, {}, {
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' }
    });

    Logger.success('Linked Test Case to Plan/Suite', { testCaseId, planId, suiteId });
    return { success: true };
  } catch (err) {
    Logger.error('Linking Test Case to Plan/Suite failed', err.message || err);
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      return { success: false, status: err.response.status, error: 'AUTH_ERROR' };
    }
    return { success: false, status: 500, error: 'LINK_FAILED', message: err.message };
  }
}

/**
 * Main function per rules: check-read-then-create
 * Returns: { success, id, created (bool), message }
 */
async function findOrCreateTestCase({ orgUrl, project, title, description, steps = [], planId, suiteId, assignedTo, pat }) {
  const effectivePat = pat || PAT;
  if (!effectivePat) {
    Logger.error('PAT missing - cannot perform Azure DevOps operations');
    return { success: false, error: 'NO_PAT', message: 'PAT not configured' };
  }

  // 1) WIQL search
  const search = await wiqlSearch(orgUrl, project, title);
  if (!search.success) {
    return { success: false, error: search.error, status: search.status, message: search.message };
  }

  if (search.ids.length > 1) {
    Logger.warn('Multiple Test Cases matched the WIQL criteria - aborting create', { title, ids: search.ids });
    return { success: false, error: 'MULTIPLE_MATCHES', message: 'Multiple work items match the title; aborting per policy', ids: search.ids };
  }

  if (search.ids.length === 1) {
    Logger.info('Test Case already exists — returning existing ID', { title, id: search.ids[0] });
    return { success: true, id: search.ids[0], created: false };
  }

  // Not found -> create
  const created = await createTestCase(orgUrl, project, title, description, steps, assignedTo, effectivePat);
  if (!created.success) {
    return { success: false, error: created.error, status: created.status, message: created.message };
  }

  const id = created.id;

  // Link to plan/suite if provided
  if (planId && suiteId) {
    const linked = await linkTestCaseToPlanSuite(orgUrl, project, id, planId, suiteId);
    if (!linked.success) {
      // Log error but do not delete or modify created work item — fail safely
      Logger.error('Failed to link newly created Test Case to Plan/Suite', { id, planId, suiteId, reason: linked.message || linked.error });
      return { success: true, id, created: true, linked: false, linkError: linked }; 
    }
    return { success: true, id, created: true, linked: true };
  }

  return { success: true, id, created: true };
}

module.exports = {
  findOrCreateTestCase,
  // exported for testing
  wiqlSearch,
  createTestCase,
  linkTestCaseToPlanSuite
};
