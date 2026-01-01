
const axios = require('axios');
const https = require('https');
const Logger = require('../utils/logger');
const { AZURE_API_VERSION, WORK_ITEM_TYPES } = require('../config/constants');
const { buildTestStepsXml, buildSharedParametersXml, escapeXml: xmlEscape } = require('./xmlMapper');

// ⚡ PERFORMANCE: Request deduplication cache - prevents duplicate in-flight requests
class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map(); // url -> Promise
  }

  async execute(url, requestFn) {
    if (this.pendingRequests.has(url)) {
      return this.pendingRequests.get(url);
    }
    
    const promise = requestFn()
      .finally(() => this.pendingRequests.delete(url));
    
    this.pendingRequests.set(url, promise);
    return promise;
  }

  clear() {
    this.pendingRequests.clear();
  }
}

class AzureDevOpsService {
  constructor(orgUrl, project, pat) {
    const trimmedOrg = (orgUrl || '').toString().trim().replace(/\/$/, ''); // הסרת slash אחרון
    const projectName = (project || '').toString().trim();
    // Defensive: users often paste a project URL into orgUrl. If orgUrl ends with
    // '/{project}', strip it so later URLs don't become '/project/project/_apis/...'.
    if (trimmedOrg && projectName) {
      const suffix = `/${projectName}`.toLowerCase();
      this.orgUrl = trimmedOrg.toLowerCase().endsWith(suffix)
        ? trimmedOrg.slice(0, trimmedOrg.length - suffix.length)
        : trimmedOrg;
    } else {
      this.orgUrl = trimmedOrg;
    }
    this.project = project;
    const normalizedPat = (pat || '').toString().trim();
    this.pat = normalizedPat;

    // Auth mode for upstream TFS/Azure DevOps calls.
    // PAT: Basic base64(:PAT)
    // NTLM: Windows credentials (Negotiate/NTLM)
    this.authMode = (process.env.AUTH_MODE || 'PAT').toString().trim().toUpperCase();
    // Prefer runtime configuration (dotenv / env vars) over hard-coded defaults.
    // For on-prem TFS Server 2019, typical versions are 5.0 / 5.1.
    this.apiVersion = (
      process.env.AZURE_API_VERSION ||
      process.env.AZDO_WIT_API_VERSION ||
      process.env.AZDO_API_VERSION ||
      AZURE_API_VERSION ||
      '5.0'
    );

    // TestPlan APIs can differ; default to base apiVersion unless explicitly overridden.
    this.testPlanApiVersion = (
      process.env.AZDO_TESTPLAN_API_VERSION ||
      process.env.AZDO_API_VERSION ||
      this.apiVersion
    );
    
    // Create Base64 encoding for PAT (only for PAT mode)
    this.authHeader = this.authMode === 'NTLM' ? '' : `Basic ${Buffer.from(`:${normalizedPat}`).toString('base64')}`;
    
    // HTTPS Agent for Azure DevOps
    this.httpsAgent = new https.Agent({ rejectUnauthorized: false });

    // Shared axios instance (AUTH_MODE-aware)
    if (this.authMode === 'NTLM') {
      const username = (process.env.NTLM_USERNAME || '').toString().trim();
      const password = (process.env.NTLM_PASSWORD || '').toString();
      const domain = (process.env.NTLM_DOMAIN || '').toString().trim();
      const workstation = (process.env.NTLM_WORKSTATION || '').toString().trim();

      this.ntlmConfigured = Boolean(username && password && domain);
      if (!this.ntlmConfigured) {
        Logger.warn('AUTH_MODE=NTLM but NTLM credentials are not fully configured', {
          hasUsername: Boolean(username),
          hasPassword: Boolean(password),
          hasDomain: Boolean(domain),
          hasWorkstation: Boolean(workstation)
        });
      }

      const { NtlmClient } = require('axios-ntlm');
      this.axiosInstance = NtlmClient(
        { username, password, domain, workstation: workstation || undefined },
        {
          httpsAgent: this.httpsAgent,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      this.ntlmConfigured = false;
      this.axiosInstance = axios.create({
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });
    }

    // ⚡ PERFORMANCE: Request deduplication for concurrent requests
    this.deduplicator = new RequestDeduplicator();
  }

  buildUrl(path, query = {}, apiVersionOverride) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    params.append('api-version', apiVersionOverride || this.apiVersion);
    return `${this.orgUrl}/${this.project}/_apis${path}?${params.toString()}`;
  }

  ensureAuthReady() {
    if (this.authMode === 'NTLM' && !this.ntlmConfigured) {
      const err = new Error('AUTH_MODE=NTLM but NTLM credentials are not configured (set NTLM_USERNAME, NTLM_PASSWORD, NTLM_DOMAIN)');
      err.code = 'NTLM_NOT_CONFIGURED';
      throw err;
    }
  }

  // =====================
  // Test Plans (REST 7.1)
  // =====================

  async getTestPlans(options = {}) {
    try {
      const query = {};
      if (options.owner) query.owner = options.owner;
      if (options.includePlanDetails !== undefined) query.includePlanDetails = options.includePlanDetails;
      if (options.filterActivePlans !== undefined) query.filterActivePlans = options.filterActivePlans;
      if (options.continuationToken) query.continuationToken = options.continuationToken;

      const url = this.buildUrl('/testplan/plans', query, this.testPlanApiVersion);

      const resp = await axios.get(url, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      return { success: true, data: resp.data, statusCode: resp.status };
    } catch (error) {
      Logger.error('Failed to fetch test plans', error.message);
      const handled = this.handleError(error, 'Failed to fetch test plans');
      handled.statusCode = error?.response?.status || handled.statusCode;
      return handled;
    }
  }

  async getTestPlan(planId) {
    try {
      if (!planId) {
        return { success: false, error: 'INVALID_INPUT', message: 'planId is required' };
      }

      const url = this.buildUrl(`/testplan/plans/${planId}`, {}, this.testPlanApiVersion);

      const resp = await axios.get(url, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      return { success: true, data: resp.data, statusCode: resp.status };
    } catch (error) {
      Logger.error(`Failed to fetch test plan ${planId}`, error.message);
      const handled = this.handleError(error, 'Failed to fetch test plan');
      handled.statusCode = error?.response?.status || handled.statusCode;
      return handled;
    }
  }

  async createTestPlan(payload) {
    try {
      if (!payload || !payload.name) {
        return { success: false, error: 'INVALID_INPUT', message: 'name is required' };
      }

      const url = this.buildUrl('/testplan/plans', {}, this.testPlanApiVersion);

      const resp = await axios.post(url, payload, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      return { success: true, data: resp.data, statusCode: resp.status };
    } catch (error) {
      Logger.error('Failed to create test plan', error.message);
      const handled = this.handleError(error, 'Failed to create test plan');
      handled.statusCode = error?.response?.status || handled.statusCode;
      return handled;
    }
  }

  async updateTestPlan(planId, payload) {
    try {
      if (!planId) {
        return { success: false, error: 'INVALID_INPUT', message: 'planId is required' };
      }

      const url = this.buildUrl(`/testplan/plans/${planId}`, {}, this.testPlanApiVersion);

      const resp = await axios.patch(url, payload || {}, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      return { success: true, data: resp.data, statusCode: resp.status };
    } catch (error) {
      Logger.error(`Failed to update test plan ${planId}`, error.message);
      const handled = this.handleError(error, 'Failed to update test plan');
      handled.statusCode = error?.response?.status || handled.statusCode;
      return handled;
    }
  }

  async deleteTestPlan(planId) {
    try {
      if (!planId) {
        return { success: false, error: 'INVALID_INPUT', message: 'planId is required' };
      }

      const url = this.buildUrl(`/testplan/plans/${planId}`, {}, this.testPlanApiVersion);

      const resp = await axios.delete(url, {
        headers: { Authorization: this.authHeader },
        httpsAgent: this.httpsAgent
      });

      return { success: true, data: resp.data, statusCode: resp.status };
    } catch (error) {
      Logger.error(`Failed to delete test plan ${planId}`, error.message);
      const handled = this.handleError(error, 'Failed to delete test plan');
      handled.statusCode = error?.response?.status || handled.statusCode;
      return handled;
    }
  }

  async getTestSuites(planId, options = {}) {
    return this.getTestSuitesForPlan(planId, {
      asTreeView: options.asTreeView ?? options.includeChildSuites,
      expand: options.expand,
      continuationToken: options.continuationToken
    });
  }

  async getTestSuitesForPlan(planId, options = {}) {
    try {
      if (!planId) {
        return { success: false, error: 'INVALID_INPUT', message: 'planId is required' };
      }

      const query = {};
      if (options.asTreeView !== undefined) query.asTreeView = options.asTreeView;
      if (options.expand) query.expand = options.expand;
      if (options.continuationToken) query.continuationToken = options.continuationToken;

      const url = this.buildUrl(`/testplan/Plans/${planId}/suites`, query, this.testPlanApiVersion);

      const resp = await axios.get(url, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      return { success: true, data: resp.data, statusCode: resp.status };
    } catch (error) {
      Logger.error(`Failed to fetch suites for plan ${planId}`, error.message);
      const handled = this.handleError(error, 'Failed to fetch test suites');
      handled.statusCode = error?.response?.status || handled.statusCode;
      return handled;
    }
  }

  async getTestPoints(planId, suiteId, options = {}) {
    try {
      if (!planId || !suiteId) {
        return { success: false, error: 'INVALID_INPUT', message: 'planId and suiteId are required' };
      }

      const query = {};
      if (options.includePointDetails !== undefined) query.includePointDetails = options.includePointDetails;
      if (options.testCaseId) query.testCaseId = options.testCaseId;

      const url = this.buildUrl(`/test/Plans/${planId}/Suites/${suiteId}/points`, query, this.apiVersion);
      const resp = await axios.get(url, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      return { success: true, data: resp.data, statusCode: resp.status };
    } catch (error) {
      Logger.error(`Failed to fetch test points for plan ${planId} suite ${suiteId}`, error.message);
      const handled = this.handleError(error, 'Failed to fetch test points');
      handled.statusCode = error?.response?.status || handled.statusCode;
      return handled;
    }
  }

  async getSuiteEntries(suiteId, options = {}) {
    try {
      if (!suiteId) {
        return { success: false, error: 'INVALID_INPUT', message: 'suiteId is required' };
      }

      const query = {};
      if (options.suiteEntryType) query.suiteEntryType = options.suiteEntryType;

      const url = this.buildUrl(`/testplan/suiteentry/${suiteId}`, query, this.testPlanApiVersion);

      const resp = await axios.get(url, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      return { success: true, data: resp.data, statusCode: resp.status };
    } catch (error) {
      Logger.error(`Failed to fetch suite entries for suite ${suiteId}`, error.message);
      const handled = this.handleError(error, 'Failed to fetch suite entries');
      handled.statusCode = error?.response?.status || handled.statusCode;
      return handled;
    }
  }

  async reorderSuiteEntries(suiteId, entries = []) {
    try {
      if (!suiteId) {
        return { success: false, error: 'INVALID_INPUT', message: 'suiteId is required' };
      }

      if (!Array.isArray(entries) || entries.length === 0) {
        return { success: false, error: 'INVALID_INPUT', message: 'entries array is required' };
      }

      const url = this.buildUrl(`/testplan/suiteentry/${suiteId}`, {}, this.testPlanApiVersion);

      const resp = await axios.patch(url, entries, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      return { success: true, data: resp.data, statusCode: resp.status };
    } catch (error) {
      Logger.error(`Failed to reorder suite entries for suite ${suiteId}`, error.message);
      const handled = this.handleError(error, 'Failed to reorder suite entries');
      handled.statusCode = error?.response?.status || handled.statusCode;
      return handled;
    }
  }

  async getTestSuite(planId, suiteId, options = {}) {
    try {
      if (!planId || !suiteId) {
        return { success: false, error: 'INVALID_INPUT', message: 'planId and suiteId are required' };
      }

      const query = {};
      if (options.expand) query.expand = options.expand;

      const url = this.buildUrl(`/testplan/Plans/${planId}/suites/${suiteId}`, query, this.testPlanApiVersion);

      const resp = await axios.get(url, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      return { success: true, data: resp.data, statusCode: resp.status };
    } catch (error) {
      Logger.error(`Failed to fetch test suite ${suiteId} (plan ${planId})`, error.message);
      const handled = this.handleError(error, 'Failed to fetch test suite');
      handled.statusCode = error?.response?.status || handled.statusCode;
      return handled;
    }
  }

  async createTestSuite(planId, payload = {}) {
    try {
      if (!planId) {
        return { success: false, error: 'INVALID_INPUT', message: 'planId is required' };
      }

      if (!payload.name) {
        return { success: false, error: 'INVALID_INPUT', message: 'name is required' };
      }

      const url = this.buildUrl(`/testplan/Plans/${planId}/suites`, {}, this.testPlanApiVersion);

      const resp = await axios.post(url, payload, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      return { success: true, data: resp.data, statusCode: resp.status };
    } catch (error) {
      Logger.error(`Failed to create test suite in plan ${planId}`, error.message);
      const handled = this.handleError(error, 'Failed to create test suite');
      handled.statusCode = error?.response?.status || handled.statusCode;
      return handled;
    }
  }

  async updateTestSuite(planId, suiteId, payload = {}) {
    try {
      if (!planId || !suiteId) {
        return { success: false, error: 'INVALID_INPUT', message: 'planId and suiteId are required' };
      }

      const url = this.buildUrl(`/testplan/Plans/${planId}/suites/${suiteId}`, {}, this.testPlanApiVersion);

      const resp = await axios.patch(url, payload, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      return { success: true, data: resp.data, statusCode: resp.status };
    } catch (error) {
      Logger.error(`Failed to update test suite ${suiteId} in plan ${planId}`, error.message);
      const handled = this.handleError(error, 'Failed to update test suite');
      handled.statusCode = error?.response?.status || handled.statusCode;
      return handled;
    }
  }

  async deleteTestSuite(planId, suiteId) {
    try {
      if (!planId || !suiteId) {
        return { success: false, error: 'INVALID_INPUT', message: 'planId and suiteId are required' };
      }

      const url = this.buildUrl(`/testplan/Plans/${planId}/suites/${suiteId}`, {}, this.testPlanApiVersion);

      const resp = await axios.delete(url, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      return { success: true, data: resp.data, statusCode: resp.status };
    } catch (error) {
      Logger.error(`Failed to delete test suite ${suiteId} in plan ${planId}`, error.message);
      const handled = this.handleError(error, 'Failed to delete test suite');
      handled.statusCode = error?.response?.status || handled.statusCode;
      return handled;
    }
  }

  async getSuitesByTestCaseId(testCaseId) {
    try {
      if (!testCaseId) {
        return { success: false, error: 'INVALID_INPUT', message: 'testCaseId is required' };
      }

      const query = { testCaseId };
      const url = this.buildUrl('/testplan/suites', query, this.testPlanApiVersion);

      const resp = await axios.get(url, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      return { success: true, data: resp.data, statusCode: resp.status };
    } catch (error) {
      Logger.error(`Failed to fetch suites for test case ${testCaseId}`, error.message);
      const handled = this.handleError(error, 'Failed to fetch suites by test case');
      handled.statusCode = error?.response?.status || handled.statusCode;
      return handled;
    }
  }

  // בדיקת חיבור ל-Azure DevOps
  async testConnection() {
    try {
      Logger.info('Testing connection to Azure DevOps...', {
        orgUrl: this.orgUrl,
        project: this.project
      });

      const url = `${this.orgUrl}/${this.project}/_apis/wit/workitemtypes?api-version=${this.apiVersion}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        }
      });

      Logger.success('Connection to Azure DevOps successful!');
      return {
        success: true,
        message: 'חיבור מוצלח ל-Azure DevOps',
        data: {
          workItemTypes: response.data.value.map(wit => wit.name),
          projectName: this.project
        }
      };
    } catch (error) {
      Logger.error('Connection test failed', error.message);
      return this.handleError(error, 'בדיקת חיבור נכשלה');
    }
  }

  // =====================
  // Test Runs & Results
  // =====================

  async createTestRun({ name, planId, comment } = {}) {
    try {
      const runName = name || `Manual Run - ${new Date().toISOString()}`;
      const body = {
        name: runName,
        isAutomated: false,
        automated: false,
        comment: comment || undefined,
        plan: planId ? { id: Number(planId) } : undefined,
        startedDate: new Date().toISOString()
      };

      const url = this.buildUrl('/test/runs', {}, this.apiVersion);
      const resp = await axios.post(url, body, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      return {
        success: true,
        data: { id: resp.data?.id, name: resp.data?.name, url: resp.data?._links?.web?.href || null },
        statusCode: resp.status
      };
    } catch (error) {
      Logger.error('Failed to create Test Run', error.message);
      const handled = this.handleError(error, 'Failed to create Test Run');
      handled.statusCode = error?.response?.status || handled.statusCode;
      return handled;
    }
  }

  async addTestResult(runId, payload = {}) {
    try {
      if (!runId) {
        return { success: false, error: 'INVALID_INPUT', message: 'runId is required' };
      }

      const result = {
        outcome: payload.outcome || 'Inconclusive',
        state: payload.state || 'Completed',
        comment: payload.comment || undefined,
        testCase: payload.testCase ? { id: Number(payload.testCase.id) } : (payload.testCaseId ? { id: Number(payload.testCaseId) } : undefined),
        testPoint: payload.testPoint ? { id: Number(payload.testPoint.id) } : (payload.testPointId ? { id: Number(payload.testPointId) } : undefined),
        startedDate: new Date().toISOString(),
        completedDate: new Date().toISOString()
      };

      const url = this.buildUrl(`/test/runs/${runId}/results`, {}, this.apiVersion);
      const resp = await axios.post(url, [result], {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      return { success: true, data: resp.data, statusCode: resp.status };
    } catch (error) {
      Logger.error(`Failed to add Test Result to run ${runId}`, error.message);
      const handled = this.handleError(error, 'Failed to add Test Result');
      handled.statusCode = error?.response?.status || handled.statusCode;
      return handled;
    }
  }

  // יצירת Test Case חדש
  async createTestCase(testCaseData) {
    try {
      Logger.info('Creating new Test Case...', { title: testCaseData.title });

      const url = `${this.orgUrl}/${this.project}/_apis/wit/workitems/$${WORK_ITEM_TYPES.TEST_CASE}?api-version=${this.apiVersion}`;

      // בניית המסמך לפי פורמט Azure DevOps API
      const document = [
        {
          op: 'add',
          path: '/fields/System.Title',
          value: testCaseData.title
        },
        {
          op: 'add',
          path: '/fields/System.Description',
          value: testCaseData.description || ''
        },
        {
          op: 'add',
          path: '/fields/Microsoft.VSTS.TCM.Steps',
          value: this.formatTestSteps(testCaseData.steps || [])
        }
      ];

      // Auto-populate Test Case parameters from step tokens like {FirstName}
      // This improves the chance the Parameters grid appears as expected in ADO/TFS.
      const extractedParams = this.extractParameterNamesFromSteps(testCaseData.steps || []);
      if (extractedParams.length > 0) {
        document.push({
          op: 'add',
          path: '/fields/Microsoft.VSTS.TCM.Parameters',
          value: buildSharedParametersXml(extractedParams, [])
        });
      }

      // הוספת שדות נוספים אם קיימים
      if (testCaseData.priority) {
        document.push({
          op: 'add',
          path: '/fields/Microsoft.VSTS.Common.Priority',
          value: testCaseData.priority
        });
      }

      if (testCaseData.state) {
        document.push({
          op: 'add',
          path: '/fields/System.State',
          value: testCaseData.state
        });
      }

      if (testCaseData.area) {
        document.push({
          op: 'add',
          path: '/fields/System.AreaPath',
          value: testCaseData.area
        });
      }

      if (testCaseData.iteration) {
        document.push({
          op: 'add',
          path: '/fields/System.IterationPath',
          value: testCaseData.iteration
        });
      }

      if (testCaseData.tags) {
        document.push({
          op: 'add',
          path: '/fields/System.Tags',
          value: testCaseData.tags
        });
      }

      if (testCaseData.assignedTo) {
        document.push({
          op: 'add',
          path: '/fields/System.AssignedTo',
          value: testCaseData.assignedTo
        });
      }

      // Add link to User Story if userStoryId is provided
      if (testCaseData.userStoryId) {
        document.push({
          op: 'add',
          path: '/relations/-',
          value: {
            rel: 'System.LinkTypes.Hierarchy-Reverse',
            url: `${this.orgUrl}/${this.project}/_apis/wit/workItems/${testCaseData.userStoryId}`
          }
        });
      }

      // Add attachment relations if provided
      const linkedUrls = new Set();
      if (testCaseData.steps && Array.isArray(testCaseData.steps)) {
        testCaseData.steps.forEach((step, index) => {
          if (step.attachment && step.attachment.url) {
            const stepId = index + 2;
            const url = step.attachment.url;
            linkedUrls.add(url);
            document.push({
              op: 'add',
              path: '/relations/-',
              value: {
                rel: 'AttachedFile',
                url: url,
                attributes: { comment: `[TestStep=${stepId}]: Uploaded from BOLTEST` }
              }
            });
          }
        });
      }

      if (testCaseData.attachmentIds && Array.isArray(testCaseData.attachmentIds)) {
        for (const attachmentId of testCaseData.attachmentIds) {
          // If it's already a full URL (from TFS response), use it directly
          // Otherwise construct the URL using the GUID
          const attachmentUrl = String(attachmentId || '').startsWith('http')
            ? attachmentId
            : `${this.orgUrl}/${this.project}/_apis/wit/attachments/${attachmentId}?api-version=${this.apiVersion}`;
          
          if (!linkedUrls.has(attachmentUrl)) {
            document.push({
              op: 'add',
              path: '/relations/-',
              value: {
                rel: 'AttachedFile',
                url: attachmentUrl
              }
            });
          }
        }
      }

      Logger.info('JSON Patch document being sent to TFS', { 
        documentLength: document.length,
        attachmentRelations: document.filter(d => d.value?.rel === 'AttachedFile'),
        fullDocument: JSON.stringify(document, null, 2)
      });

      const response = await axios.post(url, document, {
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json-patch+json'
        }
      });

      Logger.success('Test Case created successfully!', { id: response.data.id });

      return {
        success: true,
        message: 'Test Case נוצר בהצלחה',
        data: {
          id: response.data.id,
          url: response.data._links.html.href,
          title: response.data.fields['System.Title'],
          state: response.data.fields['System.State']
        }
      };
    } catch (error) {
      Logger.error('Failed to create Test Case', error.message);
      return this.handleError(error, 'יצירת Test Case נכשלה');
    }
  }

  /**
   * Create a Shared Parameter work item
   * @param {Object} paramData { title, columns, data, area, iteration }
   */
  async createSharedParameter(paramData) {
    try {
      Logger.info('Creating Shared Parameter set...', { title: paramData.title });

      const url = `${this.orgUrl}/${this.project}/_apis/wit/workitems/$${WORK_ITEM_TYPES.SHARED_PARAMETER}?api-version=${this.apiVersion}`;

      const document = [
        {
          op: 'add',
          path: '/fields/System.Title',
          value: paramData.title
        },
        {
          op: 'add',
          path: '/fields/Microsoft.VSTS.TCM.Parameters',
          value: buildSharedParametersXml(paramData.columns, paramData.data)
        }
      ];

      if (paramData.area) {
        document.push({ op: 'add', path: '/fields/System.AreaPath', value: paramData.area });
      }

      if (paramData.iteration) {
        document.push({ op: 'add', path: '/fields/System.IterationPath', value: paramData.iteration });
      }

      const resp = await axios.post(url, document, {
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json-patch+json'
        },
        httpsAgent: this.httpsAgent
      });

      return { success: true, data: resp.data };
    } catch (error) {
      Logger.error('Failed to create Shared Parameter', error.message);
      return this.handleError(error, 'Failed to create Shared Parameter');
    }
  }

  /**
   * Link a Shared Parameter to a Test Case
   * @param {number|string} testCaseId 
   * @param {number|string} sharedParameterId 
   * @param {string} sharedParameterName 
   */
  async linkSharedParameterToTestCase(testCaseId, sharedParameterId, sharedParameterName) {
    try {
      Logger.info('Linking Shared Parameter to Test Case...', { testCaseId, sharedParameterId });

      const url = `${this.orgUrl}/${this.project}/_apis/wit/workitems/${testCaseId}?api-version=${this.apiVersion}`;

      // To link a shared parameter, we need to:
      // 1. Add a link to the shared parameter work item
      // 2. Update Microsoft.VSTS.TCM.LocalDataSource field
      
      const dataSourceXml = `<LocalDataSource dataSourceName="SharedParameter" sharedParameterDataSetId="${sharedParameterId}" />`;

      const document = [
        {
          op: 'add',
          path: '/fields/Microsoft.VSTS.TCM.LocalDataSource',
          value: dataSourceXml
        },
        {
          op: 'add',
          path: '/relations/-',
          value: {
            rel: 'Microsoft.VSTS.TestCase.SharedParameterReferencedBy-Reverse',
            url: `${this.orgUrl}/_apis/wit/workitems/${sharedParameterId}`,
            attributes: {
              comment: `Linked to Shared Parameter: ${sharedParameterName}`
            }
          }
        }
      ];

      const resp = await axios.patch(url, document, {
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json-patch+json'
        },
        httpsAgent: this.httpsAgent
      });

      return { success: true, data: resp.data };
    } catch (error) {
      Logger.error('Failed to link Shared Parameter to Test Case', error.message);
      return this.handleError(error, 'Failed to link Shared Parameter to Test Case');
    }
  }

  // קבלת כל ה-Test Cases בפרויקט
  async getTestCases(top = 200) {
    try {
      this.ensureAuthReady();
      Logger.info('Fetching Test Cases...', { project: this.project });

      const url = `${this.orgUrl}/${this.project}/_apis/wit/wiql?api-version=${this.apiVersion}`;

      // WIQL Query לשליפת Test Cases
      const wiqlQuery = {
        query: `SELECT [System.Id], [System.Title], [System.State], [System.CreatedDate] 
                FROM WorkItems 
                WHERE [System.TeamProject] = '${this.project}' 
                AND [System.WorkItemType] = 'Test Case' 
                ORDER BY [System.CreatedDate] DESC`
      };

      const response = await this.axiosInstance.post(url, wiqlQuery);

      const workItemIds = response.data.workItems.map(wi => wi.id).slice(0, top);

      if (workItemIds.length === 0) {
        return {
          success: true,
          message: 'לא נמצאו Test Cases',
          data: { testCases: [] }
        };
      }

      // שליפת פרטי ה-Work Items
      const detailsUrl = `${this.orgUrl}/${this.project}/_apis/wit/workitems?ids=${workItemIds.join(',')}&api-version=${this.apiVersion}`;
      
      const detailsResponse = await this.axiosInstance.get(detailsUrl);

      const testCases = detailsResponse.data.value.map(item => ({
        id: item.id,
        title: item.fields?.['System.Title'] || '',
        state: item.fields?.['System.State'] || '',
        createdDate: item.fields?.['System.CreatedDate'] || '',
        url: item._links?.html?.href || ''
      }));

      Logger.success(`Fetched ${testCases.length} Test Cases`);

      return {
        success: true,
        message: `נמצאו ${testCases.length} Test Cases`,
        data: { testCases }
      };
    } catch (error) {
      Logger.error('Failed to fetch Test Cases', error.message);
      return this.handleError(error, 'שליפת Test Cases נכשלה');
    }
  }

  // Get a SINGLE test case with ALL details including test steps
  // THIS FIX: $expand=all + proper XML parsing for test steps
  async getTestCaseById(testCaseId) {
    try {
      this.ensureAuthReady();
      Logger.info('Fetching Test Case details...', { id: testCaseId });

      // CRITICAL: Use $expand=all to get ALL fields including TestSteps
      const url = `${this.orgUrl}/${this.project}/_apis/wit/workitems/${testCaseId}?$expand=all&api-version=${this.apiVersion}`;
      
      const response = await this.axiosInstance.get(url);

      const item = response.data;
      if (!item) {
        return {
          success: false,
          message: 'Test Case not found',
          data: null
        };
      }

      // Parse test steps from XML (use correct field and map to expectedResult)
      const testStepsXml = item.fields?.['Microsoft.VSTS.TCM.Steps']
        || item.fields?.['Microsoft.VSTS.Common.TestSteps']
        || '';
      let steps = [];

      if (testStepsXml && testStepsXml.trim()) {
        try {
          const { XMLParser } = require('fast-xml-parser');
          const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
          const parsed = parser.parse(testStepsXml);

          const stepNodes = parsed?.steps?.step;
          const stepsArray = Array.isArray(stepNodes) ? stepNodes : stepNodes ? [stepNodes] : [];

          const getText = (node) => {
            if (!node) return '';
            if (typeof node === 'string') return node;
            if (Array.isArray(node)) return getText(node[0]);
            return node['#text'] || node.text || '';
          };

          steps = stepsArray.map((step, idx) => {
            const ps = step?.parameterizedString;
            const actionNode = Array.isArray(ps) ? ps[0] : ps;
            const expectedNode = Array.isArray(ps) ? ps[1] : undefined;

            return {
              id: Number(step?.id) || idx + 1,
              action: getText(actionNode),
              expectedResult: getText(expectedNode),
              description: step?.description || ''
            };
          });

          Logger.info(`[TEST_CASE] Parsed ${steps.length} steps from XML`, { id: testCaseId });
        } catch (parseError) {
          Logger.warn(`Failed to parse test steps XML for test ${testCaseId}: ${parseError.message}`);
          steps = [];
        }
      } else {
        Logger.info(`[TEST_CASE] No test steps XML available for test case #${testCaseId} (field may not exist in this system)`);
      }

      const linkedStoryRel = (item.relations || []).find(
        (rel) => rel.rel === 'System.LinkTypes.Hierarchy-Reverse' || rel.rel === 'System.LinkTypes.Hierarchy-Forward'
      );
      const linkedStoryId = linkedStoryRel ? parseInt((linkedStoryRel.url || '').split('/').pop(), 10) : null;

      const extractAttachmentIdFromUrl = (url) => {
        const str = String(url || '');
        const idx = str.toLowerCase().indexOf('/_apis/wit/attachments/');
        if (idx === -1) return '';
        const after = str.substring(idx + '/_apis/wit/attachments/'.length);
        return after.split('?')[0].split('/')[0];
      };

      const extractFileNameFromUrl = (url) => {
        try {
          const u = new URL(String(url));
          const fn = u.searchParams.get('fileName');
          return fn ? decodeURIComponent(fn) : '';
        } catch (e) {
          return '';
        }
      };

      const attachmentRelations = (item.relations || []).filter((rel) => rel.rel === 'AttachedFile');
      const attachments = attachmentRelations
        .map((rel) => {
          const id = extractAttachmentIdFromUrl(rel.url);
          const fileName = rel.attributes?.name || extractFileNameFromUrl(rel.url) || id;
          return {
            id,
            url: rel.url,
            fileName,
            comment: rel.attributes?.comment || '',
            downloadUrl: id ? `/api/attachments/${encodeURIComponent(id)}/download?download=true` : undefined
          };
        })
        .filter((a) => a && a.id);

      // Associate attachments with steps if they have [TestStep=N]: in comment
      attachments.forEach(att => {
        const match = att.comment.match(/\[TestStep=(\d+)\]/);
        if (match) {
          const stepId = parseInt(match[1], 10);
          // Find step with this ID
          const step = steps.find(s => s.id === stepId);
          if (step) {
            const ext = (att.fileName || '').split('.').pop().toLowerCase();
            let mimeType = 'application/octet-stream';
            if (['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(ext)) mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
            else if (ext === 'pdf') mimeType = 'application/pdf';
            else if (ext === 'txt') mimeType = 'text/plain';

            step.attachment = {
              url: att.downloadUrl || att.url,
              name: att.fileName,
              type: mimeType
            };
          }
        }
      });

      const testCase = {
        id: item.id,
        title: item.fields?.['System.Title'] || '',
        state: item.fields?.['System.State'] || 'Design',
        priority: item.fields?.['Microsoft.VSTS.Common.Priority'] || '',
        assignedTo: item.fields?.['System.AssignedTo']?.displayName || 'Unassigned',
        description: item.fields?.['System.Description'] || '',
        area: item.fields?.['System.AreaPath'] || '',
        iteration: item.fields?.['System.IterationPath'] || '',
        tags: item.fields?.['System.Tags'] || '',
        linkedUserStory: linkedStoryId ? { id: linkedStoryId } : null,
        attachments,
        testStepsXml: testStepsXml,
        steps: steps,
        createdDate: item.fields?.['System.CreatedDate'] || '',
        url: item._links?.html?.href || ''
      };

      Logger.success(`Fetched Test Case #${testCaseId} with ${steps.length} steps`);

      return {
        success: true,
        data: testCase
      };
    } catch (error) {
      Logger.error('Failed to fetch Test Case by ID', error.message);
      return this.handleError(error, 'Failed to fetch Test Case');
    }
  }

  // עדכון Test Case
  async updateTestCase(testCaseId, updates = {}) {
    try {
      this.ensureAuthReady();
      Logger.info('Updating Test Case...', { id: testCaseId });

      // Fetch current work item to check existing relations and avoid duplicates
      const getUrl = `${this.orgUrl}/${this.project}/_apis/wit/workitems/${testCaseId}?$expand=relations&api-version=${this.apiVersion}`;
      const currentItem = await this.axiosInstance.get(getUrl);
      const existingRelations = currentItem.data?.relations || [];
      const existingUrls = new Set(existingRelations.map(r => (r.url || '').toLowerCase()));

      const url = `${this.orgUrl}/${this.project}/_apis/wit/workitems/${testCaseId}?api-version=${this.apiVersion}`;

      const document = [];

      if (updates.title) {
        document.push({ op: 'replace', path: '/fields/System.Title', value: updates.title });
      }

      if (updates.description) {
        document.push({ op: 'replace', path: '/fields/System.Description', value: updates.description });
      }

      if (updates.state) {
        document.push({ op: 'replace', path: '/fields/System.State', value: updates.state });
      }

      if (updates.priority !== undefined && updates.priority !== null && updates.priority !== '') {
        document.push({ op: 'replace', path: '/fields/Microsoft.VSTS.Common.Priority', value: updates.priority });
      }

      if (updates.area) {
        document.push({ op: 'replace', path: '/fields/System.AreaPath', value: updates.area });
      }

      if (updates.iteration) {
        document.push({ op: 'replace', path: '/fields/System.IterationPath', value: updates.iteration });
      }

      if (typeof updates.tags === 'string') {
        document.push({ op: 'replace', path: '/fields/System.Tags', value: updates.tags });
      }

      if (updates.steps) {
        document.push({
          op: 'replace',
          path: '/fields/Microsoft.VSTS.TCM.Steps',
          value: this.formatTestSteps(updates.steps)
        });

        const extractedParams = this.extractParameterNamesFromSteps(updates.steps);
        if (extractedParams.length > 0) {
          document.push({
            op: 'replace',
            path: '/fields/Microsoft.VSTS.TCM.Parameters',
            value: buildSharedParametersXml(extractedParams, [])
          });
        }
      }

      // Add attachment relations if provided
      const linkedUrls = new Set();
      if (updates.steps && Array.isArray(updates.steps)) {
        updates.steps.forEach((step, index) => {
          if (step.attachment && step.attachment.url) {
            const stepId = index + 2;
            let url = step.attachment.url;
            
            // If it's a local proxy URL, we need to resolve it to the real ADO URL or skip if we don't have it
            // But wait, if it's an existing attachment, it should already be in existingUrls
            if (url.startsWith('/api/attachments/')) {
              // This is a proxy URL, we should probably skip it as it's already linked
              return;
            }

            if (!existingUrls.has(url.toLowerCase())) {
              linkedUrls.add(url.toLowerCase());
              document.push({
                op: 'add',
                path: '/relations/-',
                value: {
                  rel: 'AttachedFile',
                  url: url,
                  attributes: { comment: `[TestStep=${stepId}]: Uploaded from BOLTEST` }
                }
              });
            }
          }
        });
      }

      if (updates.attachmentIds && Array.isArray(updates.attachmentIds)) {
        for (const attachmentId of updates.attachmentIds) {
          const attachmentUrl = String(attachmentId || '').startsWith('http')
            ? attachmentId
            : `${this.orgUrl}/${this.project}/_apis/wit/attachments/${attachmentId}?api-version=${this.apiVersion}`;

          if (!existingUrls.has(attachmentUrl.toLowerCase()) && !linkedUrls.has(attachmentUrl.toLowerCase())) {
            document.push({
              op: 'add',
              path: '/relations/-',
              value: {
                rel: 'AttachedFile',
                url: attachmentUrl
              }
            });
          }
        }
      }

      const response = await this.axiosInstance.patch(url, document, {
        headers: {
          'Content-Type': 'application/json-patch+json'
        }
      });

      Logger.success('Test Case updated successfully!', { id: testCaseId });

      return {
        success: true,
        message: 'Test Case עודכן בהצלחה',
        data: {
          id: response.data.id,
          title: response.data.fields?.['System.Title'],
          state: response.data.fields?.['System.State']
        }
      };
    } catch (error) {
      Logger.error('Failed to update Test Case', error.message);
      return this.handleError(error, 'עדכון Test Case נכשל');
    }
  }

  // מחיקת Test Case
  async deleteTestCase(testCaseId) {
    try {
      this.ensureAuthReady();
      Logger.info('Deleting Test Case...', { id: testCaseId });

      const url = `${this.orgUrl}/${this.project}/_apis/wit/workitems/${testCaseId}?api-version=${this.apiVersion}`;

      await this.axiosInstance.delete(url);

      Logger.success('Test Case deleted successfully!', { id: testCaseId });

      return {
        success: true,
        message: 'Test Case נמחק בהצלחה'
      };
    } catch (error) {
      Logger.error('Failed to delete Test Case', error.message);
      return this.handleError(error, 'מחיקת Test Case נכשלה');
    }
  }

  // Generic Work Item creation (Bug, Task, User Story, Test Case)
  async createWorkItem(workItem) {
    try {
      const type = workItem.type || WORK_ITEM_TYPES.TASK;

      const url = `${this.orgUrl}/${this.project}/_apis/wit/workitems/$${encodeURIComponent(type)}?api-version=${this.apiVersion}`;

      const document = [
        { op: 'add', path: '/fields/System.Title', value: workItem.title },
      ];

      // Descriptions / Repro
      if (workItem.description) {
        document.push({ op: 'add', path: '/fields/System.Description', value: workItem.description });
      }

      if (workItem.reproSteps) {
        document.push({ op: 'add', path: '/fields/Microsoft.VSTS.TCM.ReproSteps', value: workItem.reproSteps });
      }

      // Test Case steps
      if (type === WORK_ITEM_TYPES.TEST_CASE) {
        const steps = Array.isArray(workItem.steps) ? workItem.steps : [];
        document.push({ op: 'add', path: '/fields/Microsoft.VSTS.TCM.Steps', value: this.formatTestSteps(steps) });

        const extractedParams = this.extractParameterNamesFromSteps(steps);
        if (extractedParams.length > 0) {
          document.push({
            op: 'add',
            path: '/fields/Microsoft.VSTS.TCM.Parameters',
            value: buildSharedParametersXml(extractedParams, [])
          });
        }
      }

      // Common optional fields
      if (workItem.priority) {
        document.push({ op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority', value: workItem.priority });
      }

      if (workItem.state) {
        document.push({ op: 'add', path: '/fields/System.State', value: workItem.state });
      }

      if (workItem.area) {
        document.push({ op: 'add', path: '/fields/System.AreaPath', value: workItem.area });
      }

      if (workItem.iteration) {
        document.push({ op: 'add', path: '/fields/System.IterationPath', value: workItem.iteration });
      }

      if (workItem.tags) {
        document.push({ op: 'add', path: '/fields/System.Tags', value: workItem.tags });
      }

      if (workItem.assignedTo) {
        document.push({ op: 'add', path: '/fields/System.AssignedTo', value: workItem.assignedTo });
      }

      // Link to requirement (User Story / PBI)
      if (workItem.parentId) {
        document.push({
          op: 'add',
          path: '/relations/-',
          value: {
            rel: 'System.LinkTypes.Hierarchy-Reverse',
            url: `${this.orgUrl}/${this.project}/_apis/wit/workItems/${workItem.parentId}`
          }
        });
      }

      const response = await axios.post(url, document, {
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json-patch+json'
        },
        httpsAgent: this.httpsAgent
      });

      Logger.success('Work Item created successfully!', { id: response.data.id, type });

      return {
        success: true,
        message: 'Work Item נוצר בהצלחה',
        data: {
          id: response.data.id,
          url: response.data._links?.html?.href,
          title: response.data.fields?.['System.Title'],
          state: response.data.fields?.['System.State'],
          type
        }
      };
    } catch (error) {
      Logger.error('Failed to create Work Item', error.message);
      return this.handleError(error, 'יצירת Work Item נכשלה');
    }
  }

  // שליפת Work Item בודד
  async getWorkItem(id) {
    this.ensureAuthReady();
    const url = `${this.orgUrl}/_apis/wit/workitems/${id}?api-version=${this.apiVersion}`;
    const response = await this.axiosInstance.get(url);
    return response.data;
  }

  // חיפוש User Stories לפי מילת מפתח (WIQL)
  async findUserStoriesByKeyword(keyword, top = 5) {
    this.ensureAuthReady();
    const clean = (keyword || '').replace(/'/g, "''");
    const wiql = {
      query: `SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.TeamProject] = '${this.project}' AND [System.WorkItemType] = 'User Story' AND [System.Title] CONTAINS '${clean}' ORDER BY [System.ChangedDate] DESC`
    };

    const searchUrl = `${this.orgUrl}/${this.project}/_apis/wit/wiql?api-version=${this.apiVersion}`;
    const idsResp = await this.axiosInstance.post(searchUrl, wiql);

    const ids = (idsResp.data.workItems || []).slice(0, top).map(w => w.id);
    if (!ids.length) return [];

    const detailsUrl = `${this.orgUrl}/${this.project}/_apis/wit/workitems?ids=${ids.join(',')}&api-version=${this.apiVersion}`;
    const detailsResp = await this.axiosInstance.get(detailsUrl);

    return (detailsResp.data.value || []).map(item => ({
      id: item.id,
      title: item.fields?.['System.Title']
    }));
  }

  // Get all User Stories in the project (using category for cross-process compatibility)
  // NOTE: If top is omitted/invalid, fetches ALL results (batched).
  async getAllUserStories(top, areaPathPrefix, iterationPath) {
    try {
      this.ensureAuthReady();
      Logger.info('Fetching all User Stories with Test Cases...', { project: this.project, iterationPath });

      const verbose = process.env.ADO_VERBOSE_LOGS === '1';

      const parsedTop = Number(top);
      const limit = Number.isFinite(parsedTop) && parsedTop > 0 ? parsedTop : null;

      const areaClause = areaPathPrefix
        ? `AND [System.AreaPath] UNDER '${(areaPathPrefix || '').replace(/'/g, "''")}'`
        : '';

      const iterationClause = iterationPath
        ? (iterationPath.includes('@') 
            ? `AND [System.IterationPath] = ${iterationPath}` 
            : `AND [System.IterationPath] UNDER '${(iterationPath || '').replace(/'/g, "''")}'`)
        : '';

      const wiql = {
        query: `SELECT [System.Id], [System.WorkItemType], [System.Title], [System.State], [System.AreaPath], [System.IterationPath], [System.ChangedDate]
                 FROM WorkItems
                 WHERE [System.TeamProject] = '${this.project}'
                 ${areaClause}
                 ${iterationClause}
                 AND [System.WorkItemType] IN GROUP 'Microsoft.RequirementCategory'
                 ORDER BY [System.ChangedDate] DESC`
      };

      const searchUrl = `${this.orgUrl}/${this.project}/_apis/wit/wiql?api-version=${this.apiVersion}`;
      let idsResp;
      try {
        idsResp = await this.axiosInstance.post(searchUrl, wiql);
      } catch (err) {
        const isInvalidIteration = Boolean(
          err?.response?.status === 400 &&
          ((err?.response?.data?.message || err?.message || '').toString().includes('TF51011') ||
           (err?.response?.data?.message || err?.message || '').toString().includes('The specified iteration path does not exist'))
        );
        if (isInvalidIteration && iterationPath) {
          Logger.warn('Iteration path invalid; falling back to no-iteration WIQL and client-side filter', { iterationPath });
          // Re-run WIQL without iteration clause
          const wiqlNoIter = {
            query: `SELECT [System.Id], [System.WorkItemType], [System.Title], [System.State], [System.AreaPath], [System.IterationPath], [System.ChangedDate]
                     FROM WorkItems
                     WHERE [System.TeamProject] = '${this.project}'
                     ${areaClause}
                     AND [System.WorkItemType] IN GROUP 'Microsoft.RequirementCategory'
                     ORDER BY [System.ChangedDate] DESC`
          };
          idsResp = await this.axiosInstance.post(searchUrl, wiqlNoIter);
          // Mark that we should later filter by suffix
          idsResp.__boltestFilterIterationSuffix = String(iterationPath).split('\\').pop();
        } else {
          throw err;
        }
      }

      const allIds = (idsResp.data.workItems || []).map(w => w.id);
      const ids = limit ? allIds.slice(0, limit) : allIds;
      if (!ids.length) {
        return {
          success: true,
          message: 'No User Stories found',
          data: { userStories: [] }
        };
      }

      // CRITICAL: Fetch with $expand=Relations to get relation details
      // Work item APIs have practical limits (e.g., 200 IDs per request, URL length), so batch safely.
      const storyDetails = [];
      const batchSize = 200;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batchIds = ids.slice(i, i + batchSize);
        const detailsUrl = `${this.orgUrl}/${this.project}/_apis/wit/workitems?ids=${batchIds.join(',')}&$expand=Relations&api-version=${this.apiVersion}`;
        const detailsResp = await this.axiosInstance.get(detailsUrl);
        (detailsResp.data.value || []).forEach((wi) => storyDetails.push(wi));
      }

      // Extract relations that link to Test Cases
      const testCaseIdsByStory = new Map();
      const allTestCaseIds = new Set();

      Logger.info('[DEBUG] Total stories fetched:', storyDetails.length);
      
      storyDetails.forEach(story => {
        const relations = story.relations || [];
        
        if (verbose && story.id === 223560 && relations.length > 0) {
          Logger.info('[DEBUG-STORY-223560] Has', relations.length, 'relations');
          relations.slice(0, 5).forEach((rel, idx) => {
            Logger.info(`[DEBUG-REL-${idx}]`, { 
              rel: rel.rel, 
              url: rel.url,
              attributes: rel.attributes 
            });
          });
        }
        
        // Extract ALL related IDs first
        const allRelatedIds = relations.map(rel => {
          const extractedId = parseInt(rel.url.split('/').pop(), 10);
          if (verbose && story.id === 223560 && extractedId) {
            Logger.info(`[DEBUG-223560-EXTRACT] URL: ${rel.url} → ID: ${extractedId}`);
          }
          return extractedId;
        }).filter(id => !isNaN(id));
        
        testCaseIdsByStory.set(story.id, allRelatedIds);
        allRelatedIds.forEach(id => allTestCaseIds.add(id));
        
        if (verbose && story.id === 223560 && allRelatedIds.length > 0) {
          Logger.info('[DEBUG-223560] Related IDs:', allRelatedIds);
        }
      });

      // Fetch all test case details in batches using CORRECT fields
      let testCaseMap = new Map();
      if (allTestCaseIds.size > 0) {
        Logger.info(`[BATCH-PREP] Will fetch ${allTestCaseIds.size} related items from ${Object.keys(testCaseIdsByStory).length} stories`);
        const batch = Array.from(allTestCaseIds);
        const batchSize = 100;
        
        for (let i = 0; i < batch.length; i += batchSize) {
          const batchIds = batch.slice(i, i + batchSize);
          
          try {
            // Use batch endpoint - POST with ids array
            const batchUrl = `${this.orgUrl}/${this.project}/_apis/wit/workitemsbatch?api-version=${this.apiVersion}`;
            const batchResp = await this.axiosInstance.post(batchUrl, {
              ids: batchIds,
              fields: [
                'System.Id',
                'System.WorkItemType',
                'System.Title',
                'System.State',
                'Microsoft.VSTS.Common.Priority'
              ]
            }, {
              validateStatus: () => true
            });
            
            if (batchResp.status === 200 && batchResp.data && batchResp.data.value) {
              Logger.info(`[BATCH] Fetched ${(batchResp.data.value || []).length} items in batch`);
              const uniqueTypes = new Set();
              (batchResp.data.value || []).forEach(tc => {
                const type = tc.fields?.['System.WorkItemType'];
                uniqueTypes.add(type);
                const id = tc.id;
                const title = tc.fields?.['System.Title'] || '';
                const state = tc.fields?.['System.State'] || 'Design';
                const priority = tc.fields?.['Microsoft.VSTS.Common.Priority'] || '';
                
                // ONLY add Test Cases - case-insensitive check
                if (type && type.toLowerCase().includes('test') && type.toLowerCase().includes('case')) {
                  testCaseMap.set(id, {
                    id: id,
                    title: title,
                    state: state,
                    priority: priority
                  });
                  if (verbose) Logger.info(`[TEST_CASE] ✓ #${id}: "${title}" (State: ${state}, Type: ${type})`);
                } else {
                  if (verbose) Logger.info(`[BATCH-ITEM] ID #${id}: "${title}" (Type: "${type}")`);
                }
              });
              if (verbose) Logger.info(`[BATCH-TYPES] Unique types in batch: ${Array.from(uniqueTypes).join(', ')}`);
              Logger.info(`[BATCH-DONE] testCaseMap now has ${testCaseMap.size} Test Cases`);
            } else if (batchResp.status === 400 && batchResp.data?.message?.includes('invalid field')) {
              // Field doesn't exist - try individual fetches instead
              Logger.warn(`Batch request failed due to invalid field, falling back to individual fetches`, {
                ids: batchIds.slice(0, 3),
                error: batchResp.data.message
              });
              
              // Fall back to fetching items individually
              for (const itemId of batchIds) {
                try {
                  const itemUrl = `${this.orgUrl}/${this.project}/_apis/wit/workitems/${itemId}?$expand=Relations&api-version=${this.apiVersion}`;
                  const itemResp = await this.axiosInstance.get(itemUrl);
                  
                  const item = itemResp.data;
                  const type = item.fields?.['System.WorkItemType'];
                  const id = item.id;
                  const title = item.fields?.['System.Title'] || '';
                  const state = item.fields?.['System.State'] || 'Design';
                  const priority = item.fields?.['Microsoft.VSTS.Common.Priority'] || '';
                  
                  if (type && type.toLowerCase().includes('test') && type.toLowerCase().includes('case')) {
                    testCaseMap.set(id, {
                      id: id,
                      title: title,
                      state: state,
                      priority: priority
                    });
                    if (verbose) Logger.info(`[TEST_CASE] ✓ #${id}: "${title}" (State: ${state})`);
                  }
                } catch (itemError) {
                  Logger.warn(`Failed to fetch item ${itemId}:`, itemError.message);
                }
              }
            } else {
              Logger.warn(`Batch fetch failed with status: ${batchResp.status}`, {
                ids: batchIds.slice(0, 5),
                error: batchResp.data?.message || batchResp.data
              });
            }
          } catch (batchError) {
            Logger.warn('Error fetching batch of test cases', batchError.message);
          }
        }
      }

      // Build final response with test case data
      const iterationSuffix = idsResp.__boltestFilterIterationSuffix || null;
      const userStoriesUnfiltered = storyDetails.map(item => {
        const testIds = testCaseIdsByStory.get(item.id) || [];
        
        // Map test IDs to actual test case objects
        const relatedTestCases = testIds
          .map(id => testCaseMap.get(id))
          .filter(Boolean);

        if (verbose) {
          if (item.id === 223560) {
            Logger.info(`[STORY-223560] testIds: ${JSON.stringify(testIds)}, Found in map: ${relatedTestCases.length}`);
          }
          Logger.info(`[STORY] #${item.id}: "${item.fields?.['System.Title']}" → ${relatedTestCases.length} test(s)`);
        }

        return {
          id: item.id,
          title: item.fields?.['System.Title'] || '',
          state: item.fields?.['System.State'] || 'New',
          assignedTo: item.fields?.['System.AssignedTo']?.displayName || 'Unassigned',
          areaPath: item.fields?.['System.AreaPath'] || '',
          iterationPath: item.fields?.['System.IterationPath'] || '',
          url: item._links?.html?.href || '',
          relatedTestCases: relatedTestCases,
          hasTests: relatedTestCases.length > 0
        };
      });

      const userStories = iterationSuffix
        ? userStoriesUnfiltered.filter((s) => String(s.iterationPath || '').toLowerCase().includes(String(iterationSuffix).toLowerCase()))
        : userStoriesUnfiltered;

      Logger.success(`Fetched ${userStories.length} User Stories with ${Array.from(allTestCaseIds).length} linked Test Cases (${testCaseMap.size} are actual Test Case items)`);

      return {
        success: true,
        message: `Found ${userStories.length} User Stories`,
        data: { userStories }
      };
    } catch (error) {
      Logger.error('Failed to fetch User Stories', error.message);
      return this.handleError(error, 'Failed to fetch User Stories');
    }
  }

  // பெறு Test Cases linked to a User Story
  async getTestCasesForUserStory(userStoryId) {
    try {
      Logger.info('Fetching Test Cases for User Story...', { userStoryId });

      const url = `${this.orgUrl}/_apis/wit/workitems/${userStoryId}/relations?api-version=${this.apiVersion}`;
      const response = await axios.get(url, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      const testCaseRelations = (response.data.value || [])
        .filter(rel => rel.rel === 'Microsoft.VSTS.Common.TestedBy')
        .map(rel => parseInt(rel.url.split('/').pop(), 10));

      if (!testCaseRelations.length) {
        return {
          success: true,
          message: 'No Test Cases found for this User Story',
          data: { testCases: [] }
        };
      }

      const detailsUrl = `${this.orgUrl}/${this.project}/_apis/wit/workitems?ids=${testCaseRelations.join(',')}&api-version=${this.apiVersion}`;
      const detailsResp = await axios.get(detailsUrl, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      const testCases = (detailsResp.data.value || []).map(item => ({
        id: item.id,
        title: item.fields?.['System.Title'] || '',
        state: item.fields?.['System.State'] || 'Design',
        url: item._links?.html?.href || ''
      }));

      Logger.success(`Fetched ${testCases.length} Test Cases for User Story ${userStoryId}`);

      return {
        success: true,
        data: { testCases }
      };
    } catch (error) {
      Logger.error('Failed to fetch Test Cases for User Story', error.message);
      return this.handleError(error, 'Failed to fetch Test Cases');
    }
  }

  // בדיקת קיום Test Case בכותרת מדויקת (WIQL)
  async findTestCaseByExactTitle(title) {
    const clean = (title || '').replace(/'/g, "''");
    const wiql = {
      query: `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${this.project}' AND [System.WorkItemType] = 'Test Case' AND [System.Title] = '${clean}'`
    };

    const searchUrl = `${this.orgUrl}/${this.project}/_apis/wit/wiql?api-version=${this.apiVersion}`;
    const idsResp = await axios.post(searchUrl, wiql, {
      headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
      httpsAgent: this.httpsAgent
    });

    const ids = idsResp.data.workItems || [];
    if (!ids.length) return null;
    if (ids.length > 1) {
      Logger.warn('Multiple Test Cases found with exact title', { title, ids: ids.map(i => i.id) });
    }
    return ids[0].id;
  }

  /**
   * Find a work item by title and type
   * @param {string} title 
   * @param {string} type 
   */
  async findWorkItemByTitle(title, type) {
    try {
      const clean = (title || '').replace(/'/g, "''");
      const wiql = {
        query: `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${this.project}' AND [System.WorkItemType] = '${type}' AND [System.Title] = '${clean}'`
      };

      const searchUrl = `${this.orgUrl}/${this.project}/_apis/wit/wiql?api-version=${this.apiVersion}`;
      const idsResp = await axios.post(searchUrl, wiql, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      const ids = idsResp.data.workItems || [];
      if (ids.length > 0) {
        return { id: ids[0].id };
      }
      return null;
    } catch (error) {
      Logger.error(`Failed to find work item by title: ${title}`, error.message);
      return null;
    }
  }

  /**
   * Get all Shared Parameters in the project
   */
  async getSharedParameters() {
    try {
      const url = `${this.orgUrl}/${this.project}/_apis/wit/wiql?api-version=${this.apiVersion}`;
      const query = {
        query: `SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.TeamProject] = '${this.project}' AND [System.WorkItemType] = '${WORK_ITEM_TYPES.SHARED_PARAMETER}'`
      };

      const resp = await axios.post(url, query, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      const workItems = resp.data.workItems || [];
      if (workItems.length === 0) return { success: true, data: [] };

      // Fetch details for each work item
      const ids = workItems.map(wi => wi.id).join(',');
      const detailsUrl = `${this.orgUrl}/_apis/wit/workitems?ids=${ids}&fields=System.Id,System.Title,System.AreaPath&api-version=${this.apiVersion}`;
      
      const detailsResp = await axios.get(detailsUrl, {
        headers: { Authorization: this.authHeader },
        httpsAgent: this.httpsAgent
      });

      const parameters = detailsResp.data.value.map(wi => ({
        id: wi.id,
        name: wi.fields['System.Title'],
        area: wi.fields['System.AreaPath']
      }));

      return { success: true, data: parameters };
    } catch (error) {
      Logger.error('Failed to fetch Shared Parameters', error.message);
      return this.handleError(error, 'Failed to fetch Shared Parameters');
    }
  }

  // פורמט של Test Steps לפי פורמט Azure DevOps
  formatTestSteps(steps) {
    if (!steps || steps.length === 0) {
      return '<steps id="0" last="1"><step id="2" type="ActionStep"><parameterizedString isformatted="true">&lt;DIV&gt;&lt;P&gt;Step 1&lt;/P&gt;&lt;/DIV&gt;</parameterizedString><parameterizedString isformatted="true">&lt;DIV&gt;&lt;P&gt;Expected Result&lt;/P&gt;&lt;/DIV&gt;</parameterizedString><description/></step></steps>';
    }

    // delegate to shared XML builder for consistency across modules
    return buildTestStepsXml(steps);
  }

  /**
   * Extract parameter names from step text.
   * Supports both Azure DevOps syntax {ParamName} and legacy @ParamName.
   * @param {Array} steps
   * @returns {string[]}
   */
  extractParameterNamesFromSteps(steps = []) {
    const names = new Set();

    const scan = (text) => {
      if (!text) return;
      const str = String(text);

      // Azure DevOps test case parameters commonly appear as {Param}
      const braceRe = /\{([A-Za-z0-9_]+)\}/g;
      let m;
      while ((m = braceRe.exec(str)) !== null) {
        if (m[1]) names.add(m[1]);
      }

      // Backwards-compatible: @Param
      const atRe = /@([A-Za-z0-9_]+)/g;
      while ((m = atRe.exec(str)) !== null) {
        if (m[1]) names.add(m[1]);
      }
    };

    (Array.isArray(steps) ? steps : []).forEach((s) => {
      if (typeof s === 'string') {
        scan(s);
        return;
      }
      if (s && typeof s === 'object') {
        scan(s.action);
        scan(s.expectedResult);
        scan(s.testData);
      }
    });

    return Array.from(names);
  }

  // Escape XML characters
  escapeXml(text) {
    return xmlEscape(text);
  }

  // Get User Stories WITHOUT Test Cases - Simple approach
  // NOTE: If top is omitted/invalid, fetches ALL results (batched).
  async getStoriesWithoutTests(top, areaPathPrefix) {
    try {
      Logger.info('Fetching User Stories WITHOUT Test Cases...', { project: this.project });

      const parsedTop = Number(top);
      const limit = Number.isFinite(parsedTop) && parsedTop > 0 ? parsedTop : null;

      const areaClause = areaPathPrefix
        ? `AND [System.AreaPath] UNDER '${(areaPathPrefix || '').replace(/'/g, "''")}'`
        : '';

      // Get all user stories
      const wiql = {
        query: `SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.AreaPath]
                 FROM WorkItems
                 WHERE [System.TeamProject] = '${this.project}'
                 ${areaClause}
                 AND [System.WorkItemType] IN GROUP 'Microsoft.RequirementCategory'
                 ORDER BY [System.ChangedDate] DESC`
      };

      const searchUrl = `${this.orgUrl}/${this.project}/_apis/wit/wiql?api-version=${this.apiVersion}`;
      const storiesResp = await axios.post(searchUrl, wiql, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      const storyIds = (storiesResp.data.workItems || []).map(w => w.id);
      Logger.info('Found stories in project', { count: storyIds.length });

      if (storyIds.length === 0) {
        return {
          success: true,
          message: 'No User Stories found',
          data: { userStories: [] }
        };
      }

      // Fetch story details with relations - process in batches
      const batchSize = 100;
      const userStories = [];

      const effectiveStoryIds = limit ? storyIds.slice(0, limit) : storyIds;

      for (let i = 0; i < effectiveStoryIds.length; i += batchSize) {
        const batch = effectiveStoryIds.slice(i, i + batchSize);
        const detailsUrl = `${this.orgUrl}/${this.project}/_apis/wit/workitems?ids=${batch.join(',')}&$expand=Relations&api-version=${this.apiVersion}`;
        
        try {
          const detailsResp = await axios.get(detailsUrl, {
            headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
            httpsAgent: this.httpsAgent
          });

          (detailsResp.data.value || []).forEach(item => {
            // Check if this story has NO test case links (Hierarchy-Reverse)
            const linkedTestCases = (item.relations || [])
              .filter(rel => rel.rel === 'System.LinkTypes.Hierarchy-Reverse')
              .map(rel => parseInt(rel.url.split('/').pop(), 10));

            if (linkedTestCases.length === 0) {
              userStories.push({
                id: item.id,
                title: item.fields?.['System.Title'] || '',
                state: item.fields?.['System.State'] || 'New',
                assignedTo: item.fields?.['System.AssignedTo']?.displayName || 'Unassigned',
                areaPath: item.fields?.['System.AreaPath'] || '',
                iterationPath: item.fields?.['System.IterationPath'] || '',
                url: item._links?.html?.href || '',
                relatedTestCases: []
              });
            }
          });
        } catch (batchError) {
          Logger.warn('Error processing batch', { batchSize: batch.length, error: batchError.message });
        }
      }

      Logger.success(`Fetched ${userStories.length} User Stories without tests`);
      return {
        success: true,
        message: `Found ${userStories.length} User Stories without tests`,
        data: { userStories }
      };
    } catch (error) {
      Logger.error('Failed to fetch User Stories without tests', error.message);
      return this.handleError(error, 'Failed to fetch User Stories without tests');
    }
  }

  // Get User Stories WITH Test Cases using WIQL link query (reliable for TestedBy + hierarchy links)
  // NOTE: If top is omitted/invalid, fetches ALL results (batched).
  async getStoriesWithTests(top, areaPathPrefix) {
    try {
      Logger.info('Fetching User Stories WITH Test Cases...', { project: this.project });

      const verbose = process.env.ADO_VERBOSE_LOGS === '1';

      const parsedTop = Number(top);
      const limit = Number.isFinite(parsedTop) && parsedTop > 0 ? parsedTop : null;

      const areaClause = areaPathPrefix
        ? `AND [Source].[System.AreaPath] UNDER '${(areaPathPrefix || '').replace(/'/g, "''")}'`
        : '';

      // Link query: only stories that have at least one linked test case
      // CRITICAL: Fetch ALL relationships from User Stories, filter ONLY by type server-side
      // (Link type filtering doesn't reliably capture Test Case relationships in Azure DevOps)
      const wiql = {
        query: `SELECT [System.Id], [System.Title], [System.State]
                FROM WorkItemLinks
                WHERE [Source].[System.TeamProject] = '${this.project}'
                  ${areaClause}
                  AND [Source].[System.WorkItemType] IN GROUP 'Microsoft.RequirementCategory'
                MODE (MustContain)`
      };

      const wiqlUrl = `${this.orgUrl}/${this.project}/_apis/wit/wiql?api-version=${this.apiVersion}`;
      const wiqlResp = await axios.post(wiqlUrl, wiql, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      const relations = wiqlResp.data.workItemRelations || [];
      if (!relations.length) {
        return { success: true, message: 'No User Stories with tests found', data: { userStories: [] } };
      }

      // Map storyId -> Set of testCaseIds
      const storyToTests = new Map();
      for (const rel of relations) {
        if (rel.source && rel.target) {
          const storyId = rel.source.id;
          const testId = rel.target.id;
          if (!storyToTests.has(storyId)) storyToTests.set(storyId, new Set());
          storyToTests.get(storyId).add(testId);
        }
      }
      if (verbose) {
        Logger.info(`[TEST_CASE_FILTER] Story->Link mapping: ${Array.from(storyToTests.entries()).map(([s, ids]) => `Story ${s}: [${Array.from(ids).join(',')}]`).join(' | ')}`);
      }


      const allStoryIds = Array.from(storyToTests.keys());
      const storyIds = limit ? allStoryIds.slice(0, limit) : allStoryIds;
      if (!storyIds.length) {
        return { success: true, message: 'No User Stories with tests found', data: { userStories: [] } };
      }

      // Fetch story details (batch-friendly)
      const storyDetails = [];
      const batchSize = 200;
      for (let i = 0; i < storyIds.length; i += batchSize) {
        const batchIds = storyIds.slice(i, i + batchSize);
        const detailsUrl = `${this.orgUrl}/${this.project}/_apis/wit/workitems?ids=${batchIds.join(',')}&api-version=${this.apiVersion}`;
        const detailsResp = await axios.get(detailsUrl, {
          headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
          httpsAgent: this.httpsAgent
        });
        (detailsResp.data.value || []).forEach((wi) => storyDetails.push(wi));
      }

      // Fetch test case details so the UI can render titles and ensure only Test Case types are returned
      const allTestIds = Array.from(new Set(relations.map((r) => r.target?.id).filter(Boolean)));
      if (verbose) Logger.info(`[TEST_CASE_FILTER] All linked work item IDs from WIQL: ${allTestIds.join(',')}`);
      
      let testCaseMap = new Map();
      if (allTestIds.length) {
        const batchSize = 200;
        for (let i = 0; i < allTestIds.length; i += batchSize) {
          const batch = allTestIds.slice(i, i + batchSize);
          const testsUrl = `${this.orgUrl}/${this.project}/_apis/wit/workitems?ids=${batch.join(',')}&api-version=${this.apiVersion}`;
          const testsResp = await axios.get(testsUrl, {
            headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
            httpsAgent: this.httpsAgent
          });
          (testsResp.data.value || []).forEach(tc => {
            const type = tc.fields?.['System.WorkItemType'];
            const id = tc.id;
            const title = tc.fields?.['System.Title'] || '';
            
            // DEBUG: Log all details for inspection
            if (verbose) {
              Logger.info(`[TEST_CASE_FILTER] Item ID ${id}: type="${type}", title="${title}", allFields=${Object.keys(tc.fields || {}).join(', ')}`);
            }
            
            // ONLY add Test Cases to the map - filter out Features, Tasks, Bugs, etc.
            if (type === 'Test Case') {
              testCaseMap.set(id, {
                id: id,
                title: title,
                state: tc.fields?.['System.State'] || 'Design'
              });
              if (verbose) Logger.info(`[TEST_CASE_FILTER] ✓ INCLUDED: ID ${id} is a Test Case`);
            } else if (type) {
              if (verbose) Logger.info(`[TEST_CASE_FILTER] ✗ EXCLUDED: ID ${id} is a ${type}, NOT a Test Case`);
            } else {
              if (verbose) Logger.info(`[TEST_CASE_FILTER] ✗ EXCLUDED: ID ${id} has NO type field (fields available: ${Object.keys(tc.fields || {}).join(', ')})`);
            }
          });
        }
      }
      Logger.info(`[TEST_CASE_FILTER] Final count - ${testCaseMap.size} Test Cases found (${allTestIds.length} total links)`);


      const userStories = storyDetails.map(item => {
        const testIds = Array.from(storyToTests.get(item.id) || []);
        const relatedTestCases = testIds
          .map((id) => testCaseMap.get(id))
          .filter(Boolean);
        return {
          id: item.id,
          title: item.fields?.['System.Title'] || '',
          state: item.fields?.['System.State'] || 'New',
          assignedTo: item.fields?.['System.AssignedTo']?.displayName || 'Unassigned',
          areaPath: item.fields?.['System.AreaPath'] || '',
          iterationPath: item.fields?.['System.IterationPath'] || '',
          url: item._links?.html?.href || '',
          linkedTestCaseCount: relatedTestCases.length,
          relatedTestCases
        };
      });

      // CRITICAL FIX: Only return stories with verified Test Cases (filter out stories where only Features/other types were linked)
      const storiesWithRealTests = userStories.filter((story) => story.relatedTestCases.length > 0);

      Logger.success(`Fetched ${userStories.length} User Stories; ${storiesWithRealTests.length} have verified Test Cases`);
      return {
        success: true,
        message: `Found ${storiesWithRealTests.length} User Stories with Test Cases`,
        data: { userStories: storiesWithRealTests }
      };
    } catch (error) {
      Logger.error('Failed to fetch User Stories with tests', error.message);
      return this.handleError(error, 'Failed to fetch User Stories with tests');
    }
  }

  // Execute arbitrary WIQL (POST /wiql)
  async runWiql(queryText, options = {}) {
    try {
      if (!queryText) {
        return { success: false, error: 'INVALID_QUERY', message: 'WIQL query text is required' };
      }

      const params = new URLSearchParams();
      if (options.timePrecision !== undefined) params.append('timePrecision', String(!!options.timePrecision));
      if (options.top) params.append('$top', options.top);

      const url = `${this.orgUrl}/${this.project}/_apis/wit/wiql?api-version=${this.apiVersion}${params.toString() ? `&${params.toString()}` : ''}`;

      const resp = await axios.post(
        url,
        { query: queryText },
        {
          headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
          httpsAgent: this.httpsAgent
        }
      );

      return { success: true, data: resp.data };
    } catch (error) {
      Logger.error('Failed to run WIQL', error.message);
      const handled = this.handleError(error, 'Failed to run WIQL');
      handled.statusCode = error?.response?.status || handled.statusCode;
      return handled;
    }
  }

  // טיפול בשגיאות
  handleError(error, defaultMessage) {
    const requestInfo = {
      method: error?.config?.method,
      url: error?.config?.url,
      // Safe diagnostics (no secrets): helps distinguish PAT issues vs NTLM/Negotiate challenge.
      wwwAuthenticate: error?.response?.headers?.['www-authenticate'] || null,
      xVssE2EId: error?.response?.headers?.['x-vss-e2eid'] || null,
      xVssRequestId: error?.response?.headers?.['x-vss-requestid'] || null
    };

    // Network/DNS failures (no HTTP response)
    const transientNetErrors = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET']);
    const code = error?.code || (typeof error?.message === 'string'
      ? (error.message.match(/\b(ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|ECONNRESET)\b/) || [])[1]
      : null);
    if (!error?.response && code && transientNetErrors.has(code)) {
      return {
        success: false,
        statusCode: 503,
        message: 'Cannot reach TFS/Azure DevOps from this environment',
        error: code,
        details: requestInfo
      };
    }

    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;

      switch (status) {
        case 401:
          return {
            success: false,
            statusCode: 401,
            message: this.authMode === 'NTLM'
              ? 'אימות נכשל - פרטי NTLM/Windows אינם תקינים או נדרשת הרשאה נוספת'
              : 'אימות נכשל - PAT לא תקין',
            error: 'UNAUTHORIZED',
            details: requestInfo
          };
        case 403:
          return {
            success: false,
            statusCode: 403,
            message: 'אין הרשאות מספיקות',
            error: 'FORBIDDEN',
            details: requestInfo
          };
        case 404:
          return {
            success: false,
            statusCode: 404,
            message: 'לא נמצא (בדוק orgUrl / collection / project או נתיב API)',
            error: 'NOT_FOUND',
            details: requestInfo
          };
        default:
          return {
            success: false,
            statusCode: status,
            message: message || defaultMessage,
            error: 'API_ERROR',
            details: requestInfo
          };
      }
    }

    return {
      success: false,
      message: defaultMessage,
      error: error.message || 'UNKNOWN_ERROR',
      details: requestInfo
    };
  }

  // Batch fetch work items with selected fields
  async getWorkItemsBatch(ids = [], fields = []) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        return { success: false, error: 'INVALID_INPUT', message: 'ids array is required' };
      }

      const batchUrl = `${this.orgUrl}/${this.project}/_apis/wit/workitemsbatch?api-version=${this.apiVersion}`;
      const body = { ids: ids.map((n) => Number(n)).filter((n) => Number.isFinite(n)) };
      if (Array.isArray(fields) && fields.length > 0) {
        body.fields = fields;
      }

      const resp = await this.axiosInstance.post(batchUrl, body, { validateStatus: () => true });

      if (resp.status !== 200) {
        return this.handleError({ response: resp }, 'Failed to fetch work items batch');
      }

      return { success: true, data: resp.data, statusCode: resp.status };
    } catch (error) {
      Logger.error('Failed to fetch work items batch', error.message);
      const handled = this.handleError(error, 'Failed to fetch work items batch');
      handled.statusCode = error?.response?.status || handled.statusCode;
      return handled;
    }
  }

  async getMyTasksWithChildBugs(areaPathPrefix, iterationPathPrefix) {
    try {
      const apiVersion = this.apiVersion;
      const areaClause = areaPathPrefix
        ? `AND [System.AreaPath] UNDER '${String(areaPathPrefix).replace(/'/g, "''")}'`
        : '';
      const iterClause = iterationPathPrefix && String(iterationPathPrefix).trim()
        ? (iterationPathPrefix.includes('@')
            ? `AND [System.IterationPath] = ${iterationPathPrefix}`
            : `AND [System.IterationPath] UNDER '${String(iterationPathPrefix).replace(/'/g, "''")}'`)
        : '';

      const wiql = {
        query: `
          SELECT [System.Id]
          FROM WorkItems
          WHERE
            [System.TeamProject] = @project
            AND [System.WorkItemType] = 'Task'
            AND [System.State] <> 'Removed'
            AND [System.AssignedTo] = @Me
            ${areaClause}
            ${iterClause}
          ORDER BY [System.ChangedDate] DESC
        `
      };

      const wiqlUrl = `${this.orgUrl}/${this.project}/_apis/wit/wiql?api-version=${apiVersion}`;
      let wiqlResp;
      try {
        wiqlResp = await this.axiosInstance.post(wiqlUrl, wiql);
      } catch (err) {
        const isInvalidIteration = Boolean(
          err?.response?.status === 400 &&
          ((err?.response?.data?.message || err?.message || '').toString().includes('TF51011') ||
           (err?.response?.data?.message || err?.message || '').toString().includes('The specified iteration path does not exist'))
        );
        if (isInvalidIteration && iterationPathPrefix) {
          Logger.warn('Iteration path invalid for tasks; falling back to no-iteration WIQL and client-side filter', { iterationPathPrefix });
          const wiqlNoIter = {
            query: `
              SELECT [System.Id]
              FROM WorkItems
              WHERE
                [System.TeamProject] = @project
                AND [System.WorkItemType] = 'Task'
                AND [System.State] <> 'Removed'
                AND [System.AssignedTo] = @Me
                ${areaClause}
              ORDER BY [System.ChangedDate] DESC
            `
          };
          wiqlResp = await this.axiosInstance.post(wiqlUrl, wiqlNoIter);
          wiqlResp.__boltestFilterIterationSuffix = String(iterationPathPrefix).split('\\').pop();
        } else {
          throw err;
        }
      }
      const taskIds = (wiqlResp.data?.workItems || []).map((w) => w.id).filter(Boolean);

      if (taskIds.length === 0) {
        return { success: true, data: { tasks: [] } };
      }

      const detailsBatchSize = 200;
      const allTaskDetails = [];
      for (let i = 0; i < taskIds.length; i += detailsBatchSize) {
        const batchIds = taskIds.slice(i, i + detailsBatchSize);
        const url = `${this.orgUrl}/${this.project}/_apis/wit/workitems?ids=${batchIds.join(',')}&$expand=Relations&api-version=${apiVersion}`;
        const resp = await this.axiosInstance.get(url);
        allTaskDetails.push(...(resp.data?.value || []));
      }

      const bugIdSet = new Set();
      const iterationSuffix = wiqlResp.__boltestFilterIterationSuffix || null;
      const tasksUnfiltered = allTaskDetails.map((t) => {
        const relations = Array.isArray(t.relations) ? t.relations : [];
        const childIds = relations
          .filter((r) => r && r.rel === 'System.LinkTypes.Hierarchy-Forward' && typeof r.url === 'string')
          .map((r) => {
            const match = r.url.match(/\/(\d+)(?:\?|$)/);
            return match ? Number(match[1]) : null;
          })
          .filter((id) => Number.isFinite(id));
        childIds.forEach((id) => bugIdSet.add(id));

        return {
          id: t.id,
          title: t.fields?.['System.Title'] || '',
          state: t.fields?.['System.State'] || '',
          assignedTo: t.fields?.['System.AssignedTo']?.displayName || t.fields?.['System.AssignedTo']?.uniqueName || t.fields?.['System.AssignedTo'] || '',
          areaPath: t.fields?.['System.AreaPath'] || '',
          iterationPath: t.fields?.['System.IterationPath'] || '',
          url: t._links?.html?.href || null,
          childIds
        };
      });

      const tasks = iterationSuffix
        ? tasksUnfiltered.filter((t) => String(t.iterationPath || '').toLowerCase().includes(String(iterationSuffix).toLowerCase()))
        : tasksUnfiltered;

      const bugIds = Array.from(bugIdSet);
      let bugById = new Map();

      if (bugIds.length > 0) {
        const allChildDetails = [];
        for (let i = 0; i < bugIds.length; i += detailsBatchSize) {
          const batchIds = bugIds.slice(i, i + detailsBatchSize);
          const url = `${this.orgUrl}/${this.project}/_apis/wit/workitems?ids=${batchIds.join(',')}&api-version=${apiVersion}`;
          const resp = await this.axiosInstance.get(url);
          allChildDetails.push(...(resp.data?.value || []));
        }

        const onlyBugs = allChildDetails.filter(
          (w) => (w.fields?.['System.WorkItemType'] || '') === 'Bug'
        );
        bugById = new Map(
          onlyBugs.map((b) => [
            b.id,
            {
              id: b.id,
              title: b.fields?.['System.Title'] || '',
              state: b.fields?.['System.State'] || '',
              assignedTo: b.fields?.['System.AssignedTo']?.displayName || b.fields?.['System.AssignedTo']?.uniqueName || b.fields?.['System.AssignedTo'] || '',
              areaPath: b.fields?.['System.AreaPath'] || '',
              iterationPath: b.fields?.['System.IterationPath'] || '',
              url: b._links?.html?.href || null
            }
          ])
        );
      }

      const tasksWithBugs = tasks.map((t) => ({
        ...t,
        bugs: (t.childIds || []).map((id) => bugById.get(id)).filter(Boolean)
      }));

      return { success: true, data: { tasks: tasksWithBugs } };
    } catch (error) {
      Logger.error('getMyTasksWithChildBugs failed', error?.message || error);
      const handled = this.handleError(error, 'Failed to fetch my tasks with child bugs');
      handled.statusCode = error?.response?.status || handled.statusCode || 500;
      return handled;
    }
  }

  async getMyTasksAll(areaPathPrefix, iterationPathPrefix) {
    try {
      const apiVersion = this.apiVersion;
      const areaClause = areaPathPrefix
        ? `AND [System.AreaPath] UNDER '${String(areaPathPrefix).replace(/'/g, "''")}'`
        : '';
      const iterClause = iterationPathPrefix && String(iterationPathPrefix).trim()
        ? `AND [System.IterationPath] UNDER '${String(iterationPathPrefix).replace(/'/g, "''")}'`
        : '';

      const wiql = {
        query: `
          SELECT [System.Id]
          FROM WorkItems
          WHERE
            [System.TeamProject] = @project
            AND [System.WorkItemType] = 'Task'
            AND [System.State] <> 'Removed'
            AND [System.AssignedTo] = @Me
            ${areaClause}
            ${iterClause}
          ORDER BY [System.ChangedDate] DESC
        `
      };

      const wiqlUrl = `${this.orgUrl}/${this.project}/_apis/wit/wiql?api-version=${apiVersion}`;
      const wiqlResp = await this.axiosInstance.post(wiqlUrl, wiql);
      const taskIds = (wiqlResp.data?.workItems || []).map((w) => w.id).filter(Boolean);

      if (taskIds.length === 0) {
        return { success: true, data: { tasks: [] } };
      }

      const detailsBatchSize = 200;
      const allTaskDetails = [];
      for (let i = 0; i < taskIds.length; i += detailsBatchSize) {
        const batchIds = taskIds.slice(i, i + detailsBatchSize);
        const url = `${this.orgUrl}/${this.project}/_apis/wit/workitems?ids=${batchIds.join(',')}&api-version=${apiVersion}`;
        const resp = await this.axiosInstance.get(url);
        allTaskDetails.push(...(resp.data?.value || []));
      }

      const tasks = allTaskDetails.map((t) => ({
        id: t.id,
        title: t.fields?.['System.Title'] || '',
        state: t.fields?.['System.State'] || '',
        assignedTo: t.fields?.['System.AssignedTo']?.displayName || t.fields?.['System.AssignedTo']?.uniqueName || t.fields?.['System.AssignedTo'] || '',
        areaPath: t.fields?.['System.AreaPath'] || '',
        iterationPath: t.fields?.['System.IterationPath'] || '',
        url: t._links?.html?.href || null
      }));

      return { success: true, data: { tasks } };
    } catch (error) {
      Logger.error('getMyTasksAll failed', error?.message || error);
      const statusCode = error?.response?.status;
      return {
        success: false,
        statusCode: statusCode || 500,
        message: 'Failed to fetch my tasks',
        error: error?.response?.data || error?.message || error
      };
    }
  }
}

module.exports = AzureDevOpsService;