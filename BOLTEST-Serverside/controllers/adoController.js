const AzureDevOpsService = require('../services/azureDevOpsService');
const { findOrCreateTestCase } = require('../src/services/azureDevOpsIntegration');
const Logger = require('../utils/logger');
const cache = require('../services/simpleCache');
const DiskCache = require('../services/diskCache');
const config = require('../config/environment');

// Persistent cache instance
const diskCache = new DiskCache(config.cache.dir);

// ⚡ PERFORMANCE: Enhanced caching with TTL and size limits
class PerformanceCache {
  constructor(ttlMs = 300000) { // 5 minutes default
    this.data = new Map();
    this.ttl = ttlMs;
    this.maxSize = 500; // max 500 entries
  }

  get(key) {
    const entry = this.data.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.data.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value) {
    // Evict oldest entry if cache is full
    if (this.data.size >= this.maxSize) {
      const oldest = this.data.keys().next().value;
      this.data.delete(oldest);
    }
    this.data.set(key, { value, timestamp: Date.now() });
  }

  clear() {
    this.data.clear();
  }
}

const perfCache = new PerformanceCache(300000); // 5-minute cache

function normalizeOrgUrl(value) {
  const raw = (value || '').toString().trim();
  if (!raw) return '';
  return raw;
}

function normalizeOrgUrlForProject(orgUrl, project) {
  const raw = normalizeOrgUrl(orgUrl).replace(/\/+$/, '');
  const projectName = (project || '').toString().trim();
  if (!raw || !projectName) return raw;

  // If orgUrl already includes the project segment, strip it.
  // Example: https://server/tfs/Collection/Project  => https://server/tfs/Collection
  const suffix = `/${projectName}`.toLowerCase();
  if (raw.toLowerCase().endsWith(suffix)) {
    return raw.slice(0, raw.length - suffix.length);
  }
  return raw;
}

function tryGetAuthContext(req) {
  try {
    const authHeader = (req.headers['authorization'] || '').toString();
    if (!authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) return null;

    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload || typeof payload !== 'object') return null;

    let pat;
    try {
      if (payload.enc) {
        const { decrypt } = require('../utils/crypto');
        pat = decrypt(payload.enc);
      }
    } catch {
      // best-effort; ignore
    }

    return {
      orgUrl: payload.orgUrl,
      project: payload.project,
      pat: (pat || '').toString().trim(),
      apiVersion: payload.apiVersion
    };
  } catch {
    return null;
  }
}

function getPat() {
  const pat = process.env.AZDO_PAT;
  if (!pat) {
    throw new Error('AZDO_PAT is not configured on the backend');
  }
  return pat;
}

function ensureOrgProject(body) {
  if (!body.org || !body.project) {
    return 'Missing org or project';
  }
  return null;
}

exports.validate = async (req, res) => {
  const missing = ensureOrgProject(req.body || {});
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }

  try {
    const pat = getPat();
    const svc = new AzureDevOpsService(req.body.org, req.body.project, pat);
    const result = await svc.testConnection();
    const status = result.success ? 200 : result.statusCode || 500;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO validate failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Validation failed' });
  }
};

exports.createOrFindTestCase = async (req, res) => {
  const { org, project, testCase = {}, planId, suiteId } = req.body || {};
  const authCtx = tryGetAuthContext(req);
  const effectiveProject = (project || authCtx?.project || process.env.AZDO_PROJECT || '').toString();
  const authMode = (process.env.AUTH_MODE || 'PAT').toUpperCase();
  const envPatRaw = (process.env.AZDO_PAT || '').toString();
  const envPat = envPatRaw === 'your_actual_pat_token_here' ? '' : envPatRaw;
  const headerPat = (req.headers['x-pat'] || '').toString();
  const pat = authMode === 'NTLM' ? null : (headerPat || authCtx?.pat || envPat || '').toString().trim();
  const orgUrl = normalizeOrgUrlForProject(
    req.headers['x-orgurl'] || process.env.AZDO_ORG_URL || authCtx?.orgUrl || '',
    effectiveProject
  );

  const missing = ensureOrgProject({ org: orgUrl || org, project: effectiveProject });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }
  if (!testCase.title) {
    return res.status(400).json({ success: false, message: 'testCase.title is required' });
  }

  try {
    const result = await findOrCreateTestCase({
      orgUrl: orgUrl || org,
      project: effectiveProject,
      title: testCase.title,
      description: testCase.description,
      steps: testCase.testSteps || testCase.steps || [],
      planId,
      suiteId,
      assignedTo: testCase.assignedTo || '@me', // Auto-assign to current user
      pat // Pass PAT so service can resolve @me
    });

    const status = result.success ? (result.created === false ? 200 : 201) : result.status || result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO create/testcase failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to create test case' });
  }
};

exports.updateTestCase = async (req, res) => {
  const { org, project, testCase = {} } = req.body || {};
  const { id } = req.params;
  const missing = ensureOrgProject({ org, project });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }
  if (!id) {
    return res.status(400).json({ success: false, message: 'Test Case id is required' });
  }

  try {
    const pat = getPat();
    const svc = new AzureDevOpsService(org, project, pat);
    const updates = {
      title: testCase.title,
      description: testCase.description,
      steps: testCase.testSteps || testCase.steps,
      priority: testCase.priority,
      assignedTo: testCase.assignedTo,
      tags: testCase.tags
    };
    const result = await svc.updateTestCase(id, updates);
    const status = result.success ? 200 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO update/testcase failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update test case' });
  }
};

exports.getTestPlans = async (req, res) => {
  const { org, project } = req.query;
  const missing = ensureOrgProject({ org, project });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }

  try {
    const pat = getPat();
    const svc = new AzureDevOpsService(org, project, pat);
    const result = await svc.getTestPlans();
    const status = result.success ? 200 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO getTestPlans failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch test plans' });
  }
};

exports.getTestSuites = async (req, res) => {
  const { org, project, planId, asTreeView, expand, continuationToken } = req.query;
  const missing = ensureOrgProject({ org, project });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }
  if (!planId) {
    return res.status(400).json({ success: false, message: 'planId is required' });
  }

  try {
    const pat = getPat();
    const svc = new AzureDevOpsService(org, project, pat);
    const result = await svc.getTestSuitesForPlan(planId, {
      asTreeView,
      expand,
      continuationToken
    });
    const status = result.success ? 200 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO getTestSuites failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch test suites' });
  }
};

exports.getSuiteEntries = async (req, res) => {
  const { org, project, suiteId, suiteEntryType } = req.query;
  const missing = ensureOrgProject({ org, project });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }
  if (!suiteId) {
    return res.status(400).json({ success: false, message: 'suiteId is required' });
  }

  try {
    const svc = new AzureDevOpsService(org, project, getPat());
    const result = await svc.getSuiteEntries(suiteId, { suiteEntryType });
    const status = result.success ? 200 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO getSuiteEntries failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch suite entries' });
  }
};

exports.reorderSuiteEntries = async (req, res) => {
  const { org, project, entries } = req.body || {};
  const { suiteId } = req.params;
  const missing = ensureOrgProject({ org, project });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }
  if (!suiteId) {
    return res.status(400).json({ success: false, message: 'suiteId is required' });
  }

  try {
    const svc = new AzureDevOpsService(org, project, getPat());
    const result = await svc.reorderSuiteEntries(suiteId, entries);
    const status = result.success ? 200 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO reorderSuiteEntries failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to reorder suite entries' });
  }
};

exports.getTestSuiteById = async (req, res) => {
  const { org, project, planId, expand } = req.query;
  const { suiteId } = req.params;
  const missing = ensureOrgProject({ org, project });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }
  if (!planId || !suiteId) {
    return res.status(400).json({ success: false, message: 'planId and suiteId are required' });
  }

  try {
    const svc = new AzureDevOpsService(org, project, getPat());
    const result = await svc.getTestSuite(planId, suiteId, { expand });
    const status = result.success ? 200 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO getTestSuiteById failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch test suite' });
  }
};

exports.createTestSuite = async (req, res) => {
  const { org, project, planId, suite } = req.body || {};
  const missing = ensureOrgProject({ org, project });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }
  if (!planId) {
    return res.status(400).json({ success: false, message: 'planId is required' });
  }

  const { org: _o, project: _p, planId: _pid, ...flatSuite } = req.body || {};
  const payload = suite || flatSuite;

  try {
    const svc = new AzureDevOpsService(org, project, getPat());
    const result = await svc.createTestSuite(planId, payload);
    const status = result.success ? 201 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO createTestSuite failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to create test suite' });
  }
};

exports.updateTestSuite = async (req, res) => {
  const { org, project, planId, suite } = req.body || {};
  const { suiteId } = req.params;
  const missing = ensureOrgProject({ org, project });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }
  if (!planId || !suiteId) {
    return res.status(400).json({ success: false, message: 'planId and suiteId are required' });
  }

  const { org: _o, project: _p, planId: _pid, ...flatSuite } = req.body || {};
  const payload = suite || flatSuite;

  try {
    const svc = new AzureDevOpsService(org, project, getPat());
    const result = await svc.updateTestSuite(planId, suiteId, payload);
    const status = result.success ? 200 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO updateTestSuite failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update test suite' });
  }
};

exports.deleteTestSuite = async (req, res) => {
  const { org, project, planId } = req.query;
  const { suiteId } = req.params;
  const missing = ensureOrgProject({ org, project });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }
  if (!planId || !suiteId) {
    return res.status(400).json({ success: false, message: 'planId and suiteId are required' });
  }

  try {
    const svc = new AzureDevOpsService(org, project, getPat());
    const result = await svc.deleteTestSuite(planId, suiteId);
    const status = result.success ? 204 : result.statusCode || 400;
    return res.status(status).json(result.success ? { success: true } : result);
  } catch (err) {
    Logger.error('ADO deleteTestSuite failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to delete test suite' });
  }
};

exports.getTestPoints = async (req, res) => {
  const { org, project, planId, suiteId, includePointDetails, testCaseId } = req.query;
  const missing = ensureOrgProject({ org, project });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }
  if (!planId || !suiteId) {
    return res.status(400).json({ success: false, message: 'planId and suiteId are required' });
  }

  try {
    const svc = new AzureDevOpsService(org, project, getPat());
    const result = await svc.getTestPoints(planId, suiteId, { includePointDetails, testCaseId });
    const status = result.success ? 200 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO getTestPoints failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch test points' });
  }
};

exports.getSuitesByTestCase = async (req, res) => {
  const { org, project, testCaseId } = req.query;
  const missing = ensureOrgProject({ org, project });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }
  if (!testCaseId) {
    return res.status(400).json({ success: false, message: 'testCaseId is required' });
  }

  try {
    const svc = new AzureDevOpsService(org, project, getPat());
    const result = await svc.getSuitesByTestCaseId(testCaseId);
    const status = result.success ? 200 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO getSuitesByTestCase failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch suites for test case' });
  }
};

exports.getTestCaseDetailsBatch = async (req, res) => {
  const { org, project, ids, fields } = req.query;
  const missing = (function ensureOrgProject(obj) { if (!obj.org || !obj.project) return 'Missing org or project'; return null; })({ org, project });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }
  if (!ids) {
    return res.status(400).json({ success: false, message: 'ids (comma-separated) is required' });
  }

  try {
    const svc = new AzureDevOpsService(org, project, getPat());
    const idList = String(ids)
      .split(/[\s,]+/)
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n));
    const fieldList = String(fields || '')
      .split(/[\s,]+/)
      .filter(Boolean);
    const defaultFields = [
      'System.Id',
      'System.WorkItemType',
      'System.Title',
      'System.State',
      'Microsoft.VSTS.Common.Priority',
      'System.Tags',
      'System.AssignedTo'
    ];
    const result = await svc.getWorkItemsBatch(idList, fieldList.length ? fieldList : defaultFields);
    if (!result?.success) {
      const status = result?.statusCode || 400;
      return res.status(status).json(result);
    }

    const items = (result.data?.value || []).filter((it) => {
      const type = it?.fields?.['System.WorkItemType'];
      return type && type.toLowerCase().includes('test') && type.toLowerCase().includes('case');
    }).map((it) => {
      const tagsRaw = it?.fields?.['System.Tags'] || '';
      const tagsArr = String(tagsRaw)
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        id: it.id,
        title: it?.fields?.['System.Title'] || '',
        state: it?.fields?.['System.State'] || '',
        priority: it?.fields?.['Microsoft.VSTS.Common.Priority'] || '',
        assignedTo: it?.fields?.['System.AssignedTo']?.displayName || it?.fields?.['System.AssignedTo'] || '',
        tags: tagsArr
      };
    });

    return res.status(200).json({ success: true, data: { items } });
  } catch (err) {
    Logger.error('ADO getTestCaseDetailsBatch failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch test case details' });
  }
};

exports.getTestPlanById = async (req, res) => {
  const { org, project } = req.query;
  const { id: planId } = req.params;
  const missing = ensureOrgProject({ org, project });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }
  if (!planId) {
    return res.status(400).json({ success: false, message: 'planId is required' });
  }

  try {
    const svc = new AzureDevOpsService(org, project, getPat());
    const result = await svc.getTestPlan(planId);
    const status = result.success ? 200 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO getTestPlanById failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch test plan' });
  }
};

exports.createTestPlan = async (req, res) => {
  const { org, project, plan } = req.body || {};
  const missing = ensureOrgProject({ org, project });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }

  // Support both {plan:{...}} and flat payload
  const { org: _o, project: _p, ...flatPlan } = req.body || {};
  const payload = plan || flatPlan;

  try {
    const svc = new AzureDevOpsService(org, project, getPat());
    const result = await svc.createTestPlan(payload);
    const status = result.success ? 201 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO createTestPlan failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to create test plan' });
  }
};

exports.updateTestPlan = async (req, res) => {
  const { org, project, plan } = req.body || {};
  const { id: planId } = req.params;
  const missing = ensureOrgProject({ org, project });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }
  if (!planId) {
    return res.status(400).json({ success: false, message: 'planId is required' });
  }

  const { org: _o, project: _p, ...flatPlan } = req.body || {};
  const payload = plan || flatPlan;

  try {
    const svc = new AzureDevOpsService(org, project, getPat());
    const result = await svc.updateTestPlan(planId, payload);
    const status = result.success ? 200 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO updateTestPlan failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update test plan' });
  }
};

exports.deleteTestPlan = async (req, res) => {
  const { org, project } = req.query;
  const { id: planId } = req.params;
  const missing = ensureOrgProject({ org, project });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }
  if (!planId) {
    return res.status(400).json({ success: false, message: 'planId is required' });
  }

  try {
    const svc = new AzureDevOpsService(org, project, getPat());
    const result = await svc.deleteTestPlan(planId);
    const status = result.success ? 204 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO deleteTestPlan failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to delete test plan' });
  }
};

exports.createTestRun = async (req, res) => {
  const { org, project, name, planId, comment } = req.body || {};
  const missing = ensureOrgProject({ org, project });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }

  try {
    const pat = getPat();
    const svc = new AzureDevOpsService(org, project, pat);
    const result = await svc.createTestRun({ name, planId, comment });
    const status = result.success ? 201 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO createTestRun failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to create test run' });
  }
};

exports.addTestResult = async (req, res) => {
  const { org, project, result = {} } = req.body || {};
  const { id: runId } = req.params;
  const missing = ensureOrgProject({ org, project });
  if (missing) {
    return res.status(400).json({ success: false, message: missing });
  }
  if (!runId) {
    return res.status(400).json({ success: false, message: 'runId is required' });
  }

  try {
    const pat = getPat();
    const svc = new AzureDevOpsService(org, project, pat);
    const payload = {
      outcome: result.outcome || 'Inconclusive',
      state: result.state || 'Completed',
      comment: result.comment,
      testCase: result.testCaseId ? { id: result.testCaseId } : undefined,
      testPoint: result.testPointId ? { id: result.testPointId } : undefined
    };

    const apiResult = await svc.addTestResult(runId, payload);
    const status = apiResult.success ? 201 : apiResult.statusCode || 400;
    return res.status(status).json(apiResult);
  } catch (err) {
    Logger.error('ADO addTestResult failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to add test result' });
  }
};

exports.getUserStories = async (req, res) => {
  const { project, areaPath, iterationPath, top } = req.query;
  const authCtx = tryGetAuthContext(req);
  const effectiveProject = (project || authCtx?.project || process.env.AZDO_PROJECT || '').toString();
  const authMode = (process.env.AUTH_MODE || 'PAT').toUpperCase();
  const envPatRaw = (process.env.AZDO_PAT || '').toString();
  const envPat = envPatRaw === 'your_actual_pat_token_here' ? '' : envPatRaw;
  const pat = authMode === 'NTLM' ? null : (authCtx?.pat || envPat || '').toString().trim();
  const orgUrl = normalizeOrgUrlForProject(
    req.headers['x-orgurl'] || process.env.AZDO_ORG_URL || authCtx?.orgUrl || '',
    effectiveProject
  );
  
  if (!effectiveProject) {
    return res.status(400).json({ success: false, message: 'project query param is required' });
  }
  if (authMode !== 'NTLM' && !pat) {
    return res.status(401).json({ success: false, message: 'PAT token is required (set AZDO_PAT env var on server)' });
  }
  if (!orgUrl) {
    return res.status(400).json({
      success: false,
      message: 'Org URL is required (x-orgurl header or AZDO_ORG_URL env).',
      hint: 'Use https://dev.azure.com/<org> or https://<server>/tfs/<collection>'
    });
  }
  try {
    // Basic validation to prevent accidental bad values
    // (must be an absolute http/https URL)
    // eslint-disable-next-line no-new
    new URL(orgUrl);
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid org URL (x-orgurl header)' });
  }

  try {
    const crypto = require('crypto');
    const patHash = pat ? crypto.createHash('sha256').update(pat).digest('hex').slice(0, 16) : 'ntlm';
    const limitRaw = Number(top);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 500; // default higher limit
    const cacheKey = `userStories:${orgUrl}:${effectiveProject}:${areaPath || ''}:${iterationPath || ''}:${String(limit)}:${patHash}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }
    const disk = diskCache.get(cacheKey, config.cache.ttlSeconds);
    if (disk.exists && disk.valid) {
      return res.status(200).json(disk.value);
    }

    const svc = new AzureDevOpsService(orgUrl, effectiveProject, pat);
    const result = await svc.getAllUserStories(limit, areaPath, iterationPath);
    if (result && result.success) {
      cache.set(cacheKey, result, 60); // cache for 60s
      diskCache.set(cacheKey, result);
    }
    const status = result.success ? 200 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO getUserStories failed', err.message || err);
    const crypto = require('crypto');
    const envPatRaw = (process.env.AZDO_PAT || '').toString();
    const envPat = envPatRaw === 'your_actual_pat_token_here' ? '' : envPatRaw;
    const patHash = envPat ? crypto.createHash('sha256').update(envPat).digest('hex').slice(0, 16) : 'ntlm';
    const { project, areaPath, iterationPath, top } = req.query;
    const orgUrl = normalizeOrgUrlForProject(
      req.headers['x-orgurl'] || process.env.AZDO_ORG_URL || '',
      (project || process.env.AZDO_PROJECT || '').toString()
    );
    const limitRaw = Number(top);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 500;
    const cacheKey = `userStories:${orgUrl}:${project || ''}:${areaPath || ''}:${iterationPath || ''}:${String(limit)}:${patHash}`;
    const disk = diskCache.get(cacheKey);
    if (disk.exists) {
      return res.status(200).json({ success: true, degraded: true, ...disk.value });
    }
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch user stories' });
  }
};

exports.getStoriesWithoutTests = async (req, res) => {
  const { project, areaPath, top } = req.query;
  const authCtx = tryGetAuthContext(req);
  const effectiveProject = (project || authCtx?.project || process.env.AZDO_PROJECT || '').toString();
  const authMode = (process.env.AUTH_MODE || 'PAT').toUpperCase();
  const envPatRaw = (process.env.AZDO_PAT || '').toString();
  const envPat = envPatRaw === 'your_actual_pat_token_here' ? '' : envPatRaw;
  const pat = authMode === 'NTLM' ? null : (authCtx?.pat || envPat || '').toString().trim();
  const orgUrl = normalizeOrgUrlForProject(
    req.headers['x-orgurl'] || process.env.AZDO_ORG_URL || authCtx?.orgUrl || '',
    effectiveProject
  );
  
  if (!effectiveProject) {
    return res.status(400).json({ success: false, message: 'project query param is required' });
  }
  if (authMode !== 'NTLM' && !pat) {
    return res.status(401).json({ success: false, message: 'PAT token is required (set AZDO_PAT env var on server)' });
  }
  if (!orgUrl) {
    return res.status(400).json({
      success: false,
      message: 'Org URL is required (x-orgurl header or AZDO_ORG_URL env).',
      hint: 'Use https://dev.azure.com/<org> or https://<server>/tfs/<collection>'
    });
  }
  try {
    // eslint-disable-next-line no-new
    new URL(orgUrl);
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid org URL (x-orgurl header)' });
  }

  try {
    const crypto = require('crypto');
    const patHash = pat ? crypto.createHash('sha256').update(pat).digest('hex').slice(0, 16) : 'ntlm';
    const limitRaw = Number(top);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 500; // default higher limit
    const cacheKey = `userStories:notests:${orgUrl}:${effectiveProject}:${areaPath || ''}:${String(limit)}:${patHash}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.status(200).json(cached);
    const disk = diskCache.get(cacheKey, config.cache.ttlSeconds);
    if (disk.exists && disk.valid) return res.status(200).json(disk.value);

    const svc = new AzureDevOpsService(orgUrl, effectiveProject, pat);
    const result = await svc.getStoriesWithoutTests(limit, areaPath);
    if (result && result.success) {
      cache.set(cacheKey, result, 60);
      diskCache.set(cacheKey, result);
    }
    const status = result.success ? 200 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO getStoriesWithoutTests failed', err.message || err);
    const crypto = require('crypto');
    const envPatRaw = (process.env.AZDO_PAT || '').toString();
    const envPat = envPatRaw === 'your_actual_pat_token_here' ? '' : envPatRaw;
    const patHash = envPat ? crypto.createHash('sha256').update(envPat).digest('hex').slice(0, 16) : 'ntlm';
    const { project, areaPath, top } = req.query;
    const effectiveProject = (project || process.env.AZDO_PROJECT || '').toString();
    const orgUrl = normalizeOrgUrlForProject(
      req.headers['x-orgurl'] || process.env.AZDO_ORG_URL || '',
      effectiveProject
    );
    const limitRaw = Number(top);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 500;
    const cacheKey = `userStories:notests:${orgUrl}:${effectiveProject}:${areaPath || ''}:${String(limit)}:${patHash}`;
    const disk = diskCache.get(cacheKey);
    if (disk.exists) {
      return res.status(200).json({ success: true, degraded: true, ...disk.value });
    }
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch stories without tests' });
  }
};

exports.getStoriesWithTests = async (req, res) => {
  const { project, areaPath, top } = req.query;
  const authCtx = tryGetAuthContext(req);
  const effectiveProject = (project || authCtx?.project || process.env.AZDO_PROJECT || '').toString();
  const authMode = (process.env.AUTH_MODE || 'PAT').toUpperCase();
  const envPatRaw = (process.env.AZDO_PAT || '').toString();
  const envPat = envPatRaw === 'your_actual_pat_token_here' ? '' : envPatRaw;
  const pat = authMode === 'NTLM' ? null : (authCtx?.pat || envPat || '').toString().trim();
  const orgUrl = normalizeOrgUrlForProject(
    req.headers['x-orgurl'] || process.env.AZDO_ORG_URL || authCtx?.orgUrl || '',
    effectiveProject
  );
  
  if (!effectiveProject) {
    return res.status(400).json({ success: false, message: 'project query param is required' });
  }
  if (authMode !== 'NTLM' && !pat) {
    return res.status(401).json({ success: false, message: 'PAT token is required (set AZDO_PAT env var on server)' });
  }
  if (!orgUrl) {
    return res.status(400).json({
      success: false,
      message: 'Org URL is required (x-orgurl header or AZDO_ORG_URL env).',
      hint: 'Use https://dev.azure.com/<org> or https://<server>/tfs/<collection>'
    });
  }
  try {
    // eslint-disable-next-line no-new
    new URL(orgUrl);
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid org URL (x-orgurl header)' });
  }

  try {
    const crypto = require('crypto');
    const patHash = pat ? crypto.createHash('sha256').update(pat).digest('hex').slice(0, 16) : 'ntlm';
    const limitRaw = Number(top);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 500; // default higher limit
    const cacheKey = `userStories:hastests:${orgUrl}:${effectiveProject}:${areaPath || ''}:${String(limit)}:${patHash}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.status(200).json(cached);
    const disk = diskCache.get(cacheKey, config.cache.ttlSeconds);
    if (disk.exists && disk.valid) return res.status(200).json(disk.value);

    const svc = new AzureDevOpsService(orgUrl, effectiveProject, pat);
    const result = await svc.getStoriesWithTests(limit, areaPath);
    if (result && result.success) {
      cache.set(cacheKey, result, 60);
      diskCache.set(cacheKey, result);
    }
    const status = result.success ? 200 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO getStoriesWithTests failed', err.message || err);
    const crypto = require('crypto');
    const envPatRaw = (process.env.AZDO_PAT || '').toString();
    const envPat = envPatRaw === 'your_actual_pat_token_here' ? '' : envPatRaw;
    const patHash = envPat ? crypto.createHash('sha256').update(envPat).digest('hex').slice(0, 16) : 'ntlm';
    const { project, areaPath, top } = req.query;
    const effectiveProject = (project || process.env.AZDO_PROJECT || '').toString();
    const orgUrl = normalizeOrgUrlForProject(
      req.headers['x-orgurl'] || process.env.AZDO_ORG_URL || '',
      effectiveProject
    );
    const limitRaw = Number(top);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 500;
    const cacheKey = `userStories:hastests:${orgUrl}:${effectiveProject}:${areaPath || ''}:${String(limit)}:${patHash}`;
    const disk = diskCache.get(cacheKey);
    if (disk.exists) {
      return res.status(200).json({ success: true, degraded: true, ...disk.value });
    }
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch stories with tests' });
  }
};

exports.getMyTasksWithChildBugs = async (req, res) => {
  const { project, areaPath, iterationPath } = req.query;
  const authCtx = tryGetAuthContext(req);
  const effectiveProject = (project || authCtx?.project || process.env.AZDO_PROJECT || '').toString();
  const authMode = (process.env.AUTH_MODE || 'PAT').toUpperCase();
  const envPatRaw = (process.env.AZDO_PAT || '').toString();
  const envPat = envPatRaw === 'your_actual_pat_token_here' ? '' : envPatRaw;
  const pat = authMode === 'NTLM' ? null : (authCtx?.pat || envPat || '').toString().trim();
  const orgUrl = normalizeOrgUrlForProject(
    req.headers['x-orgurl'] || process.env.AZDO_ORG_URL || authCtx?.orgUrl || '',
    effectiveProject
  );

  if (!effectiveProject) {
    return res.status(400).json({ success: false, message: 'project query param is required' });
  }
  if (authMode !== 'NTLM' && !pat) {
    return res.status(401).json({ success: false, message: 'PAT token is required (set AZDO_PAT env var on server)' });
  }
  if (!orgUrl) {
    return res.status(400).json({
      success: false,
      message: 'Org URL is required (x-orgurl header or AZDO_ORG_URL env).',
      hint: 'Use https://dev.azure.com/<org> or https://<server>/tfs/<collection>'
    });
  }
  try {
    // eslint-disable-next-line no-new
    new URL(orgUrl);
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid org URL (x-orgurl header)' });
  }

  try {
    const crypto = require('crypto');
    const patHash = pat ? crypto.createHash('sha256').update(pat).digest('hex').slice(0, 16) : 'ntlm';
    const cacheKey = `myTasksWithBugs:${orgUrl}:${effectiveProject}:${areaPath || ''}:${iterationPath || ''}:${patHash}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.status(200).json(cached);
    const disk = diskCache.get(cacheKey, config.cache.ttlSeconds);
    if (disk.exists && disk.valid) return res.status(200).json(disk.value);

    const svc = new AzureDevOpsService(orgUrl, effectiveProject, pat);
    const result = await svc.getMyTasksWithChildBugs(areaPath, iterationPath);

    // Demo-stability: if TFS/AZDO is unreachable (DNS/connection), return empty results instead of 500.
    const transientNetErrors = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET']);
    const resultErrorString = typeof result?.error === 'string' ? result.error : '';
    const codeFromMessage = typeof result?.message === 'string'
      ? (result.message.match(/\b(ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|ECONNRESET)\b/) || [])[1]
      : null;
    const transientCode = result?.error && transientNetErrors.has(result.error)
      ? result.error
      : (resultErrorString.match(/\b(ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|ECONNRESET)\b/) || [])[1] || codeFromMessage;

    if (result && !result.success && transientCode) {
      Logger.warn('ADO mytasks degraded mode: TFS unreachable', { code: transientCode });
      const diskStale = diskCache.get(cacheKey);
      if (diskStale.exists) {
        return res.status(200).json({ success: true, degraded: true, ...diskStale.value });
      }
      return res.status(200).json({ success: true, message: 'TFS/Azure DevOps is temporarily unreachable. Returning empty tasks for demo stability.', data: { tasks: [] }, degraded: true });
    }

    if (result && result.success) {
      cache.set(cacheKey, result, 60);
      diskCache.set(cacheKey, result);
    }
    const status = result.success ? 200 : result.statusCode || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO getMyTasksWithChildBugs failed', err.message || err);
    const crypto = require('crypto');
    const envPatRaw = (process.env.AZDO_PAT || '').toString();
    const envPat = envPatRaw === 'your_actual_pat_token_here' ? '' : envPatRaw;
    const patHash = envPat ? crypto.createHash('sha256').update(envPat).digest('hex').slice(0, 16) : 'ntlm';
    const { project, areaPath, iterationPath } = req.query;
    const effectiveProject = (project || process.env.AZDO_PROJECT || '').toString();
    const orgUrl = normalizeOrgUrlForProject(
      req.headers['x-orgurl'] || process.env.AZDO_ORG_URL || '',
      effectiveProject
    );
    const cacheKey = `myTasksWithBugs:${orgUrl}:${effectiveProject}:${areaPath || ''}:${iterationPath || ''}:${patHash}`;
    const disk = diskCache.get(cacheKey);
    if (disk.exists) {
      return res.status(200).json({ success: true, degraded: true, ...disk.value });
    }
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch my tasks with bugs' });
  }
};

exports.getDashboardSnapshot = async (req, res) => {
  const { project, areaPath, iterationPath } = req.query;
  const authCtx = tryGetAuthContext(req);
  const effectiveProject = (project || authCtx?.project || process.env.AZDO_PROJECT || '').toString();
  const authMode = (process.env.AUTH_MODE || 'PAT').toUpperCase();
  const envPatRaw = (process.env.AZDO_PAT || '').toString();
  const envPat = envPatRaw === 'your_actual_pat_token_here' ? '' : envPatRaw;
  const pat = authMode === 'NTLM' ? null : (authCtx?.pat || envPat || '').toString();
  const orgUrl = normalizeOrgUrlForProject(
    req.headers['x-orgurl'] || process.env.AZDO_ORG_URL || authCtx?.orgUrl || '',
    effectiveProject
  );

  if (!effectiveProject) {
    return res.status(400).json({ success: false, message: 'project query param is required' });
  }
  if (authMode !== 'NTLM' && !pat) {
    return res.status(401).json({ success: false, message: 'PAT token is required (set AZDO_PAT env var on server)' });
  }
  if (!orgUrl) {
    return res.status(400).json({
      success: false,
      message: 'Org URL is required (x-orgurl header or AZDO_ORG_URL env).',
      hint: 'Use https://dev.azure.com/<org> or https://<server>/tfs/<collection>'
    });
  }

  try {
    // eslint-disable-next-line no-new
    new URL(orgUrl);
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid org URL (x-orgurl header)' });
  }

  try {
    const crypto = require('crypto');
    const patHash = pat ? crypto.createHash('sha256').update(pat).digest('hex').slice(0, 16) : 'ntlm';
    const cacheKey = `dashboardSnapshot:${orgUrl}:${effectiveProject}:${areaPath || ''}:${iterationPath || ''}:${patHash}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.status(200).json(cached);
    const disk = diskCache.get(cacheKey, config.cache.ttlSeconds);
    if (disk.exists && disk.valid) return res.status(200).json(disk.value);

    const svc = new AzureDevOpsService(orgUrl, effectiveProject, pat);

    const [withoutTests, withTests, myTasksWithBugs, myTasksAll] = await Promise.all([
      svc.getStoriesWithoutTests(undefined, areaPath),
      svc.getStoriesWithTests(undefined, areaPath),
      svc.getMyTasksWithChildBugs(areaPath, iterationPath),
      svc.getMyTasksAll(areaPath, iterationPath)
    ]);

    const errors = [];

    const storiesWithoutTests = withoutTests?.success
      ? (withoutTests.data?.userStories || []).map((s) => ({
          ID: s.id,
          Title: s.title,
          State: s.state,
          AssignedTo: s.assignedTo,
          AreaPath: s.areaPath,
          IterationPath: s.iterationPath || '',
          LinkedItems: []
        }))
      : [];
    if (!withoutTests?.success) errors.push({ section: 'StoriesWithoutTests', message: withoutTests?.message || 'Failed' });

    const storiesWithTests = withTests?.success
      ? (withTests.data?.userStories || []).map((s) => ({
          ID: s.id,
          Title: s.title,
          State: s.state,
          AssignedTo: s.assignedTo,
          AreaPath: s.areaPath,
          IterationPath: s.iterationPath || '',
          LinkedItems: (s.relatedTestCases || []).map((tc) => ({
            ID: tc.id,
            Title: tc.title,
            State: tc.state,
            AssignedTo: tc.assignedTo || '',
            AreaPath: tc.areaPath || '',
            IterationPath: tc.iterationPath || ''
          }))
        }))
      : [];
    if (!withTests?.success) errors.push({ section: 'StoriesWithTests', message: withTests?.message || 'Failed' });

    const myTasksWithBugsSection = myTasksWithBugs?.success
      ? (myTasksWithBugs.data?.tasks || []).map((t) => ({
          ID: t.id,
          Title: t.title,
          State: t.state,
          AssignedTo: t.assignedTo,
          AreaPath: t.areaPath || '',
          IterationPath: t.iterationPath || '',
          LinkedItems: (t.bugs || []).map((b) => ({
            ID: b.id,
            Title: b.title,
            State: b.state,
            AssignedTo: b.assignedTo || '',
            AreaPath: b.areaPath || '',
            IterationPath: b.iterationPath || ''
          }))
        }))
      : [];
    if (!myTasksWithBugs?.success) errors.push({ section: 'MyTasksWithBugs', message: myTasksWithBugs?.message || 'Failed' });

    const myTasksAllSection = myTasksAll?.success
      ? (myTasksAll.data?.tasks || []).map((t) => ({
          ID: t.id,
          Title: t.title,
          State: t.state,
          AssignedTo: t.assignedTo,
          AreaPath: t.areaPath || '',
          IterationPath: t.iterationPath || '',
          LinkedItems: []
        }))
      : [];
    if (!myTasksAll?.success) errors.push({ section: 'MyTasksAll', message: myTasksAll?.message || 'Failed' });

    const payload = {
      success: errors.length === 0,
      generatedAt: new Date().toISOString(),
      data: {
        StoriesWithoutTests: storiesWithoutTests,
        StoriesWithTests: storiesWithTests,
        MyTasksWithBugs: myTasksWithBugsSection,
        MyTasksAll: myTasksAllSection
      },
      errors: errors.length ? errors : undefined
    };

    cache.set(cacheKey, payload, 60);
    diskCache.set(cacheKey, payload);
    return res.status(200).json(payload);
  } catch (err) {
    Logger.error('ADO getDashboardSnapshot failed', err.message || err);
    const crypto = require('crypto');
    const envPatRaw = (process.env.AZDO_PAT || '').toString();
    const envPat = envPatRaw === 'your_actual_pat_token_here' ? '' : envPatRaw;
    const patHash = envPat ? crypto.createHash('sha256').update(envPat).digest('hex').slice(0, 16) : 'ntlm';
    const { project, areaPath, iterationPath } = req.query;
    const effectiveProject = (project || process.env.AZDO_PROJECT || '').toString();
    const orgUrl = normalizeOrgUrlForProject(
      req.headers['x-orgurl'] || process.env.AZDO_ORG_URL || '',
      effectiveProject
    );
    const cacheKey = `dashboardSnapshot:${orgUrl}:${effectiveProject}:${areaPath || ''}:${iterationPath || ''}:${patHash}`;
    const disk = diskCache.get(cacheKey);
    if (disk.exists) {
      return res.status(200).json({ success: true, degraded: true, ...disk.value });
    }
    return res.status(500).json({ success: false, message: err.message || 'Failed to build dashboard snapshot' });
  }
};

exports.runWiql = async (req, res) => {
  const { project } = req.query;
  const authMode = (process.env.AUTH_MODE || 'PAT').toUpperCase();
  const envPatRaw = (process.env.AZDO_PAT || '').toString();
  const envPat = envPatRaw === 'your_actual_pat_token_here' ? '' : envPatRaw;
  const pat = authMode === 'NTLM' ? null : envPat;
  const orgUrl = (req.headers['x-orgurl'] || process.env.AZDO_ORG_URL || '').toString().trim();
  const { query, top, timePrecision } = req.body || {};

  if (!project) {
    return res.status(400).json({ success: false, message: 'project query param is required' });
  }
  if (authMode !== 'NTLM' && !pat) {
    return res.status(401).json({ success: false, message: 'PAT token is required (set AZDO_PAT env var on server)' });
  }
  if (!orgUrl) {
    return res.status(500).json({ success: false, message: 'AZDO_ORG_URL environment variable is not set' });
  }
  try {
    // eslint-disable-next-line no-new
    new URL(orgUrl);
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid org URL (x-orgurl header)' });
  }
  if (!query) {
    return res.status(400).json({ success: false, message: 'query (WIQL text) is required in body' });
  }

  try {
    const crypto = require('crypto');
    const patHash = pat ? crypto.createHash('sha256').update(pat).digest('hex').slice(0, 16) : 'ntlm';
    const queryHash = crypto.createHash('sha256').update(String(query)).digest('hex').slice(0, 16);
    const cacheKey = `wiql:${orgUrl}:${project}:${queryHash}:${String(top || '')}:${String(timePrecision || '')}:${patHash}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const svc = new AzureDevOpsService(orgUrl, project, pat);
    const result = await svc.runWiql(query, { top, timePrecision });
    if (result && result.success) {
      cache.set(cacheKey, result, 15);
    }
    const status = result.success ? 200 : result.statusCode || result.status || 400;
    return res.status(status).json(result);
  } catch (err) {
    Logger.error('ADO runWiql failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to run WIQL' });
  }
};

// Aggregate tag suggestions from recent Test Case items
exports.getTagSuggestions = async (req, res) => {
  const { project, areaPath, iterationPath, top, workItemType, search } = req.query;
  const authCtx = tryGetAuthContext(req);
  const effectiveProject = (project || authCtx?.project || process.env.AZDO_PROJECT || '').toString();
  const authMode = (process.env.AUTH_MODE || 'PAT').toUpperCase();
  const envPatRaw = (process.env.AZDO_PAT || '').toString();
  const envPat = envPatRaw === 'your_actual_pat_token_here' ? '' : envPatRaw;
  const headerPat = (req.headers['x-pat'] || '').toString();
  const pat = authMode === 'NTLM' ? null : (headerPat || authCtx?.pat || envPat || '').toString().trim();
  const orgUrl = normalizeOrgUrlForProject(
    req.headers['x-orgurl'] || process.env.AZDO_ORG_URL || authCtx?.orgUrl || '',
    effectiveProject
  );

  if (!effectiveProject) {
    return res.status(400).json({ success: false, message: 'project query param is required' });
  }
  if (authMode !== 'NTLM' && !pat) {
    return res.status(401).json({ success: false, message: 'PAT token is required (set AZDO_PAT env var on server)' });
  }
  if (!orgUrl) {
    return res.status(400).json({ success: false, message: 'Org URL is required (x-orgurl header or AZDO_ORG_URL env).' });
  }
  try {
    // eslint-disable-next-line no-new
    new URL(orgUrl);
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid org URL (x-orgurl header)' });
  }

  try {
    const crypto = require('crypto');
    const patHash = pat ? crypto.createHash('sha256').update(pat).digest('hex').slice(0, 16) : 'ntlm';
    const limitRaw = Number(top);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 500;
    const type = (workItemType || 'Test Case').toString();
    const cacheKey = `tags:suggestions:${orgUrl}:${effectiveProject}:${areaPath || ''}:${iterationPath || ''}:${type}:${limit}:${patHash}`;

    const cached = perfCache.get(cacheKey);
    if (cached) {
      const result = { success: true, data: cached };
      const filtered = applyTagSearchFilter(result, search);
      return res.status(200).json(filtered);
    }

    const svc = new AzureDevOpsService(orgUrl, effectiveProject, pat);

    const areaClause = areaPath
      ? `AND [System.AreaPath] UNDER '${String(areaPath).replace(/'/g, "''")}'`
      : '';
    const iterClause = iterationPath && String(iterationPath).trim()
      ? (String(iterationPath).includes('@')
          ? `AND [System.IterationPath] = ${iterationPath}`
          : `AND [System.IterationPath] UNDER '${String(iterationPath).replace(/'/g, "''")}'`)
      : '';

    const wiql = `
      SELECT [System.Id], [System.ChangedDate]
      FROM WorkItems
      WHERE [System.TeamProject] = '${effectiveProject}'
        ${areaClause}
        ${iterClause}
        AND [System.WorkItemType] = '${type.replace(/'/g, "''")}'
      ORDER BY [System.ChangedDate] DESC
    `;

    const wiqlRes = await svc.runWiql(wiql, { top: limit });
    if (!wiqlRes?.success) {
      const status = wiqlRes?.statusCode || 400;
      return res.status(status).json(wiqlRes);
    }

    const ids = (wiqlRes.data?.workItems || []).map((w) => w.id).filter(Boolean);
    if (ids.length === 0) {
      const payload = { tags: [], counts: {} };
      perfCache.set(cacheKey, payload);
      const result = { success: true, data: payload };
      const filtered = applyTagSearchFilter(result, search);
      return res.status(200).json(filtered);
    }

    // Fetch tags in batches
    const batchSize = 200;
    const tagCounts = new Map();
    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize);
      const batch = await svc.getWorkItemsBatch(batchIds, ['System.Id', 'System.Tags']);
      if (batch?.success) {
        (batch.data?.value || []).forEach((it) => {
          const tagsRaw = it?.fields?.['System.Tags'] || '';
          const tagsArr = String(tagsRaw)
            .split(';')
            .map((s) => s.trim())
            .filter(Boolean);
        
          tagsArr.forEach((t) => {
            const key = t;
            const prev = tagCounts.get(key) || 0;
            tagCounts.set(key, prev + 1);
          });
        });
      }
    }

    const tags = Array.from(tagCounts.keys()).sort((a, b) => {
      const ca = tagCounts.get(a) || 0;
      const cb = tagCounts.get(b) || 0;
      if (cb !== ca) return cb - ca; // sort by frequency desc
      return a.localeCompare(b);
    });
    const countsObj = Object.fromEntries(Array.from(tagCounts.entries()));
    const payload = { tags, counts: countsObj };

    perfCache.set(cacheKey, payload);
    const result = { success: true, data: payload };
    const filtered = applyTagSearchFilter(result, search);
    return res.status(200).json(filtered);
  } catch (err) {
    Logger.error('ADO getTagSuggestions failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch tag suggestions' });
  }
};

function applyTagSearchFilter(result, search) {
  try {
    const s = (search || '').toString().trim().toLowerCase();
    if (!s) return result;
    const all = Array.isArray(result?.data?.tags) ? result.data.tags : [];
    const filtered = all.filter((t) => t.toLowerCase().includes(s));
    return { success: true, data: { tags: filtered, counts: result?.data?.counts || {} } };
  } catch {
    return result;
  }
}

// Basic list of Test Cases with tags
exports.getTestCasesBasic = async (req, res) => {
  const { project, areaPath, top, assignedToMe } = req.query;
  const authCtx = tryGetAuthContext(req);
  const effectiveProject = (project || authCtx?.project || process.env.AZDO_PROJECT || '').toString();
  const authMode = (process.env.AUTH_MODE || 'PAT').toUpperCase();
  const envPatRaw = (process.env.AZDO_PAT || '').toString();
  const envPat = envPatRaw === 'your_actual_pat_token_here' ? '' : envPatRaw;
  const headerPat = (req.headers['x-pat'] || '').toString();
  const pat = authMode === 'NTLM' ? null : (headerPat || authCtx?.pat || envPat || '').toString().trim();
  const orgUrl = normalizeOrgUrlForProject(
    req.headers['x-orgurl'] || process.env.AZDO_ORG_URL || authCtx?.orgUrl || '',
    effectiveProject
  );

  if (!effectiveProject) {
    return res.status(400).json({ success: false, message: 'project query param is required' });
  }
  if (authMode !== 'NTLM' && !pat) {
    Logger.warn('ADO getTestCasesBasic blocked: missing PAT', { project: effectiveProject });
    return res.status(401).json({ success: false, message: 'PAT token is required (set AZDO_PAT env var on server)' });
  }
  if (!orgUrl) {
    return res.status(400).json({ success: false, message: 'Org URL is required (x-orgurl header or AZDO_ORG_URL env).' });
  }
  try { new URL(orgUrl); } catch { return res.status(400).json({ success: false, message: 'Invalid org URL (x-orgurl header)' }); }

  try {
    // Azure DevOps WIQL supports $top, but it does NOT return field values and many servers
    // effectively cap results per call. To avoid "missing" items, page deterministically by ID.
    const parsedTop = Number(top);
    const requestedTotalLimit = Number.isFinite(parsedTop) && parsedTop > 0 ? parsedTop : 0;
    const hardMax = Number(process.env.AZDO_TESTCASES_MAX || 10000);
    const totalLimit = requestedTotalLimit > 0 ? Math.min(requestedTotalLimit, hardMax) : hardMax;
    const pageSize = 200;
    const filterToMe = String(assignedToMe || '').toLowerCase() === 'true';

    Logger.info('ADO getTestCasesBasic start', {
      orgUrl,
      project: effectiveProject,
      areaPath: areaPath || '',
      totalLimit,
      pageSize,
      assignedToMe: filterToMe
    });

    const svc = new AzureDevOpsService(orgUrl, effectiveProject, pat);

    const projEsc = effectiveProject.replace(/'/g, "''");
    const areaClause = areaPath
      ? `AND [System.AreaPath] UNDER '${String(areaPath).replace(/'/g, "''")}'`
      : '';
    const assignedClause = filterToMe
      ? `AND [System.AssignedTo] = @me`
      : '';

    let cursorId = Number.MAX_SAFE_INTEGER;
    const ids = [];
    let truncated = false;
    let safety = 0;

    while (ids.length < totalLimit) {
      safety += 1;
      if (safety > 1000) {
        truncated = true;
        break;
      }

      const remaining = totalLimit - ids.length;
      const pageTop = Math.min(pageSize, remaining);

      const cursorClause = Number.isFinite(cursorId) && cursorId !== Number.MAX_SAFE_INTEGER
        ? `AND [System.Id] < ${cursorId}`
        : '';

      const wiql = `
        SELECT [System.Id]
        FROM WorkItems
        WHERE [System.TeamProject] = '${projEsc}'
          ${areaClause}
          AND [System.WorkItemType] = 'Test Case'
          ${assignedClause}
          ${cursorClause}
        ORDER BY [System.Id] DESC
      `;

      const wiqlRes = await svc.runWiql(wiql, { top: pageTop });
      if (!wiqlRes?.success) {
        const status = wiqlRes?.statusCode || 400;
        Logger.warn('ADO getTestCasesBasic wiql failed', { status, message: wiqlRes?.message || 'unknown' });
        return res.status(status).json(wiqlRes);
      }

      const pageIds = (wiqlRes.data?.workItems || []).map((w) => w.id).filter(Boolean);
      if (pageIds.length === 0) break;

      ids.push(...pageIds);
      cursorId = Math.min(...pageIds);

      if (pageIds.length < pageTop) break;
    }

    Logger.info('ADO getTestCasesBasic ids', { count: ids.length, truncated });
    if (ids.length === 0) {
      Logger.info('ADO getTestCasesBasic result: no items');
      return res.status(200).json({ success: true, data: { testCases: [], meta: { total: 0, truncated: false } } });
    }

    // Hydrate fields via workitemsbatch in safe chunks.
    const fields = [
      'System.Id',
      'System.WorkItemType',
      'System.Title',
      'System.State',
      'System.CreatedDate',
      'System.AssignedTo',
      'System.Tags'
    ];

    const testCases = [];
    const batchSize = 200;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize);
      const batch = await svc.getWorkItemsBatch(batchIds, fields);
      if (!batch?.success) {
        const status = batch?.statusCode || 400;
        Logger.warn('ADO getTestCasesBasic batch failed', { status, message: batch?.message || 'unknown' });
        return res.status(status).json(batch);
      }

      (batch.data?.value || [])
        .filter((it) => (it?.fields?.['System.WorkItemType'] || '').toLowerCase() === 'test case')
        .forEach((it) => {
          const tagsRaw = it?.fields?.['System.Tags'] || '';
          const tagsArr = String(tagsRaw).split(';').map((s) => s.trim()).filter(Boolean);
          testCases.push({
            id: it.id,
            title: it?.fields?.['System.Title'] || '',
            state: it?.fields?.['System.State'] || '',
            assignedTo: it?.fields?.['System.AssignedTo']?.displayName || it?.fields?.['System.AssignedTo'] || '',
            createdDate: it?.fields?.['System.CreatedDate'] || '',
            tags: tagsArr
          });
        });
    }

    Logger.info('ADO getTestCasesBasic result', { count: testCases.length, truncated });
    return res.status(200).json({ success: true, data: { testCases, meta: { total: testCases.length, truncated } } });
  } catch (err) {
    Logger.error('ADO getTestCasesBasic failed', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch test cases' });
  }
};
