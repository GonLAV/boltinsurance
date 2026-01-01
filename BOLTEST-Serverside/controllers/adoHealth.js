/**
 * ADO Health Check Controller
 * 
 * Comprehensive diagnostics for TFS/Azure DevOps connectivity.
 * Validates: URL format, connectivity, PAT validity, permissions, API version compatibility.
 * 
 * Usage:
 *   GET /api/ado/health?orgUrl=...&project=...&pat=...
 *   GET /api/ado/health (uses headers: x-orgurl, x-project, x-pat)
 */

const axios = require('axios');
const Logger = require('../utils/logger');

function buildApiVersionCandidates() {
  const fromEnv = [
    process.env.AZDO_API_VERSION,
    process.env.AZURE_API_VERSION,
    process.env.AZDO_WIT_API_VERSION
  ]
    .filter(Boolean)
    .map(v => String(v).trim())
    .filter(Boolean);

  // TFS Server 2019: usually 5.0 / 5.1. Cloud: 7.0+.
  const defaults = ['5.1', '5.0', '6.0', '7.0'];
  const all = [...fromEnv, ...defaults];
  const uniq = [];
  for (const v of all) {
    if (!uniq.includes(v)) uniq.push(v);
  }
  return uniq;
}

function hashPat(pat) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(String(pat || '')).digest('hex').slice(0, 16);
}

function resolveAuthInputs(req) {
  const headerOrgUrl = (req.headers['x-orgurl'] || '').toString().trim();
  const headerProject = (req.headers['x-project'] || '').toString().trim();
  const headerPat = (req.headers['x-pat'] || '').toString().trim();

  const queryOrgUrl = (req.query.orgUrl || '').toString().trim();
  const queryProject = (req.query.project || '').toString().trim();
  const queryPat = (req.query.pat || '').toString().trim();

  const envOrgUrl = (process.env.AZDO_ORG_URL || '').toString().trim();
  const envProject = (process.env.AZDO_PROJECT || '').toString().trim();
  const envPatRaw = (process.env.AZDO_PAT || '').toString().trim();
  const envPat = envPatRaw === 'your_actual_pat_token_here' ? '' : envPatRaw;

  const orgUrl = headerOrgUrl || queryOrgUrl || envOrgUrl;
  const project = headerProject || queryProject || envProject;
  const pat = headerPat || queryPat || envPat;

  const orgUrlSource = headerOrgUrl ? 'header' : queryOrgUrl ? 'query' : envOrgUrl ? 'env' : 'none';
  const projectSource = headerProject ? 'header' : queryProject ? 'query' : envProject ? 'env' : 'none';
  const patSource = headerPat ? 'header' : queryPat ? 'query' : envPat ? 'env' : 'none';

  return { orgUrl, project, pat, orgUrlSource, projectSource, patSource };
}

async function getWithVersion(urlBase, path, headers, versions, axiosOptions = {}) {
  let lastErr;
  for (const v of versions) {
    const url = `${urlBase}${path}${path.includes('?') ? '&' : '?'}api-version=${encodeURIComponent(v)}`;
    try {
      const http = axiosOptions?.httpClient || axios;
      const { httpClient, ...rest } = axiosOptions || {};
      const resp = await http.get(url, { headers, ...rest });
      return { resp, apiVersion: v, url };
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      if (status === 401 || status === 403) throw err;
      if (status && status !== 404 && status !== 400) throw err;
    }
  }
  throw lastErr;
}

async function postWithVersion(urlBase, path, body, headers, versions, axiosOptions = {}) {
  let lastErr;
  for (const v of versions) {
    const url = `${urlBase}${path}${path.includes('?') ? '&' : '?'}api-version=${encodeURIComponent(v)}`;
    try {
      const http = axiosOptions?.httpClient || axios;
      const { httpClient, ...rest } = axiosOptions || {};
      const resp = await http.post(url, body, { headers, ...rest });
      return { resp, apiVersion: v, url };
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      if (status === 401 || status === 403) throw err;
      if (status && status !== 404 && status !== 400) throw err;
    }
  }
  throw lastErr;
}

/**
 * Debug endpoint (hash-only): reveals which auth inputs the backend will use.
 * Requires login (Bearer token).
 */
exports.debugAuth = async (req, res) => {
  try {
    const authCtx = req.user || null;
    const resolved = resolveAuthInputs(req);

    const jwtOrgUrl = (authCtx?.orgUrl || '').toString().trim();
    const jwtProject = (authCtx?.project || '').toString().trim();
    const jwtPat = (authCtx?.pat || '').toString().trim();

    const effectiveOrgUrl = resolved.orgUrl || jwtOrgUrl;
    const effectiveProject = resolved.project || jwtProject;
    const effectivePat = resolved.pat || jwtPat;

    const effectivePatSource = resolved.pat ? resolved.patSource : jwtPat ? 'jwt' : 'none';
    const effectiveOrgUrlSource = resolved.orgUrl ? resolved.orgUrlSource : jwtOrgUrl ? 'jwt' : 'none';
    const effectiveProjectSource = resolved.project ? resolved.projectSource : jwtProject ? 'jwt' : 'none';

    return res.json({
      success: true,
      effective: {
        orgUrl: effectiveOrgUrl,
        project: effectiveProject,
        patHash: effectivePat ? hashPat(effectivePat) : null,
        orgUrlSource: effectiveOrgUrlSource,
        projectSource: effectiveProjectSource,
        patSource: effectivePatSource
      },
      token: {
        hasToken: Boolean(req.token),
        hasEnc: Boolean(authCtx?.enc)
      },
      config: {
        authMode: (process.env.AUTH_MODE || 'PAT').toString().trim().toUpperCase(),
        ntlmConfigured: Boolean((process.env.NTLM_USERNAME || '').trim() && (process.env.NTLM_PASSWORD || '') && (process.env.NTLM_DOMAIN || '').trim()),
        skipAzureCheck: process.env.SKIP_AZURE_CHECK === 'true',
        nodeEnv: process.env.NODE_ENV || null,
        apiVersionCandidates: buildApiVersionCandidates()
      }
    });
  } catch (err) {
    Logger.error('debugAuth failed', err.message || err);
    return res.status(500).json({ success: false, message: 'debugAuth failed', error: err.message });
  }
};

/**
 * Health check: complete diagnostic of TFS connectivity
 */
exports.healthCheck = async (req, res) => {
  const { orgUrl, pat, project } = resolveAuthInputs(req);
  const versions = buildApiVersionCandidates();
  const authMode = (process.env.AUTH_MODE || 'PAT').toString().trim().toUpperCase();

  // Validation
  if (!orgUrl) {
    return res.status(400).json({
      success: false,
      status: 'INVALID_INPUT',
      error: 'Missing orgUrl',
      hint: 'Provide via: header (x-orgurl), query param (orgUrl), or env (AZDO_ORG_URL)',
      checklist: []
    });
  }

  if (authMode !== 'NTLM' && !pat) {
    return res.status(400).json({
      success: false,
      status: 'INVALID_INPUT',
      error: 'Missing PAT',
      hint: 'Provide via: header (x-pat), query param (pat), or env (AZDO_PAT) (or set AUTH_MODE=NTLM with NTLM_* env vars)',
      checklist: []
    });
  }

  if (!project) {
    return res.status(400).json({
      success: false,
      status: 'INVALID_INPUT',
      error: 'Missing project',
      hint: 'Provide via: header (x-project), query param (project), or env (AZDO_PROJECT)',
      checklist: []
    });
  }

  const checklist = [];

  try {
    // ===== CHECK 1: URL Format Validation =====
    try {
      new URL(orgUrl);
      checklist.push({ name: 'URL format valid', status: 'PASS', url: orgUrl });
    } catch (err) {
      checklist.push({ 
        name: 'URL format valid', 
        status: 'FAIL', 
        error: err.message,
        hint: 'Use https://dev.azure.com/<org> or https://<server>/tfs/<collection>'
      });
      return res.status(400).json({
        success: false,
        status: 'INVALID_ORG_URL',
        error: 'Organization URL is malformed',
        checklist
      });
    }

    const authHeader = pat ? `Basic ${Buffer.from(`:${pat}`).toString('base64')}` : null;
    let httpClient = null;
    if (authMode === 'NTLM') {
      const username = (process.env.NTLM_USERNAME || '').toString().trim();
      const password = (process.env.NTLM_PASSWORD || '').toString();
      const domain = (process.env.NTLM_DOMAIN || '').toString().trim();
      const workstation = (process.env.NTLM_WORKSTATION || '').toString().trim();
      if (!username || !password || !domain) {
        return res.status(400).json({
          success: false,
          status: 'INVALID_INPUT',
          error: 'Missing NTLM credentials',
          hint: 'Set NTLM_USERNAME, NTLM_PASSWORD, NTLM_DOMAIN (optional: NTLM_WORKSTATION)',
          checklist: []
        });
      }
      const { NtlmClient } = require('axios-ntlm');
      httpClient = NtlmClient(
        { username, password, domain, workstation: workstation || undefined },
        { timeout: 8000, httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) }
      );
    }

    // ===== CHECK 2: Connectivity to TFS/Azure DevOps =====
    try {
      const { resp: response, apiVersion } = await getWithVersion(
        orgUrl,
        '/_apis/projects',
        authMode === 'NTLM' ? {} : { 'Authorization': authHeader },
        versions,
        {
          timeout: 8000,
          httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
          httpClient: httpClient || undefined
        }
      );
      
      const projectCount = response.data?.value?.length || 0;
      checklist.push({ 
        name: 'Connectivity to TFS/Azure DevOps', 
        status: 'PASS', 
        projectsFound: projectCount,
        apiVersion
      });
    } catch (err) {
      const status = err.response?.status;
      let errorMsg = err.message;
      let hint = '';

      if (status === 401) {
        errorMsg = 'Unauthorized (401) - PAT is invalid or expired';
        hint = 'Regenerate your PAT in Azure DevOps settings';
      } else if (status === 403) {
        errorMsg = 'Forbidden (403) - PAT lacks permissions';
        hint = 'PAT needs "Whole organization (Read)" or at least "Project & Team (Read)"';
      } else if (err.code === 'ENOTFOUND') {
        errorMsg = 'ENOTFOUND: Cannot resolve hostname';
        hint = 'Check org URL spelling and network connectivity';
      } else if (err.code === 'ECONNREFUSED') {
        errorMsg = 'ECONNREFUSED: Connection refused';
        hint = 'TFS server may be down or unreachable from this environment';
      } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
        errorMsg = `${err.code}: Request timed out`;
        hint = 'Server is slow or not responding; check network/firewall';
      }

      checklist.push({ 
        name: 'Connectivity to TFS/Azure DevOps', 
        status: 'FAIL', 
        error: errorMsg,
        hint: hint
      });

      return res.status(status || 503).json({
        success: false,
        status: 'CONNECTIVITY_FAILED',
        error: 'Cannot reach TFS/Azure DevOps server',
        checklist
      });
    }

    // ===== CHECK 3: Verify Project Exists =====
    try {
      const { resp: projResp, apiVersion } = await getWithVersion(
        orgUrl,
        `/_apis/projects/${encodeURIComponent(project)}`,
        { 'Authorization': authHeader },
        versions,
        { timeout: 8000, httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) }
      );
      
      checklist.push({ 
        name: `Project "${project}" exists`, 
        status: 'PASS',
        projectId: projResp.data?.id,
        url: projResp.data?._links?.web?.href,
        apiVersion
      });
    } catch (err) {
      const status = err.response?.status;
      let errorMsg = err.message;
      let hint = '';

      if (status === 404) {
        errorMsg = 'Project not found (404)';
        hint = `Check project name. Available projects can be found at: ${orgUrl}/_apis/projects?api-version=${encodeURIComponent(versions[0] || '5.1')}`;
      } else if (status === 403) {
        errorMsg = 'Forbidden (403) - No access to this project';
        hint = 'PAT needs "Project & Team (Read)" permission';
      }

      checklist.push({ 
        name: `Project "${project}" exists`, 
        status: 'FAIL', 
        error: errorMsg,
        hint: hint
      });

      return res.status(status || 500).json({
        success: false,
        status: 'PROJECT_NOT_FOUND',
        error: `Project "${project}" not found or inaccessible`,
        checklist
      });
    }

    // ===== CHECK 4: Work Item API Access =====
    try {
      const { resp: wiqlResp, apiVersion } = await postWithVersion(
        `${orgUrl}/${project}`,
        '/_apis/wit/wiql',
        { query: `SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.TeamProject] = '${project}' ORDER BY [System.Id] DESC` },
        { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        versions,
        { timeout: 8000, httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) }
      );
      
      const count = wiqlResp.data?.workItems?.length || 0;
      checklist.push({ 
        name: 'Work Item API (WIQL)', 
        status: 'PASS',
        itemsFound: count,
        apiVersion
      });
    } catch (err) {
      const status = err.response?.status;
      let errorMsg = err.message;
      let hint = '';

      if (status === 403) {
        errorMsg = 'Forbidden (403) - PAT lacks Work Item permissions';
        hint = 'PAT needs "Work Items: Read & Execute" scope';
      } else if (status === 404) {
        errorMsg = 'Not found (404) - API may not exist in this version';
        hint = 'WIQL requires API v5.0+ (or v7.0+ for cloud)';
      } else if (status === 400) {
        errorMsg = 'Bad Request (400) - WIQL syntax error or version mismatch';
        hint = 'Verify WIQL query syntax and API version for your TFS/Azure DevOps version';
      }

      checklist.push({ 
        name: 'Work Item API (WIQL)', 
        status: 'FAIL', 
        error: errorMsg,
        hint: hint
      });
    }

    // ===== CHECK 5: Fetch Work Items with Relations =====
    try {
      // First get some IDs
      const { resp: wiqlResp, apiVersion: wiqlApiVersion } = await postWithVersion(
        `${orgUrl}/${project}`,
        '/_apis/wit/wiql',
        { query: `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${project}' ORDER BY [System.Id] DESC` },
        { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        versions,
        { timeout: 8000, httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) }
      );

      const ids = (wiqlResp.data?.workItems || []).slice(0, 3).map(w => w.id);
      
      if (ids.length > 0) {
        const { resp: detailsResp, apiVersion: detailsApiVersion } = await getWithVersion(
          `${orgUrl}/${project}`,
          `/_apis/wit/workitems?ids=${ids.join(',')}&$expand=Relations`,
          { 'Authorization': authHeader },
          versions,
          { timeout: 8000, httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) }
        );

        const items = detailsResp.data?.value || [];
        const itemsWithRelations = items.filter(i => (i.relations || []).length > 0).length;
        
        checklist.push({ 
          name: 'Work Item Details with Relations', 
          status: 'PASS',
          tested: ids.length,
          itemsWithRelations: itemsWithRelations,
          apiVersion: detailsApiVersion || wiqlApiVersion
        });
      } else {
        checklist.push({ 
          name: 'Work Item Details with Relations', 
          status: 'PASS',
          note: 'No work items to test, but endpoint accessible',
          apiVersion: wiqlApiVersion
        });
      }
    } catch (err) {
      checklist.push({ 
        name: 'Work Item Details with Relations', 
        status: 'FAIL', 
        error: err.response?.data?.message || err.message,
        hint: 'Check PAT permissions and $expand parameter support'
      });
    }

    // ===== CHECK 6: Test Plan API (Optional) =====
    try {
      const testPlanUrl = `${orgUrl}/${project}/_apis/testplan/plans?api-version=7.1`;
      const tpResp = await axios.get(testPlanUrl, {
        headers: { 'Authorization': authHeader },
        timeout: 8000,
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
      });
      
      const count = tpResp.data?.value?.length || 0;
      checklist.push({ 
        name: 'Test Plan API (v7.1)', 
        status: 'PASS',
        plansFound: count
      });
    } catch (err) {
      const status = err.response?.status;
      
      if (status === 404) {
        checklist.push({ 
          name: 'Test Plan API (v7.1)', 
          status: 'WARN', 
          note: 'Not available in this TFS/Azure DevOps version (expected for TFS 2019)',
          hint: 'Test Plans API requires Azure DevOps Services (cloud) or TFS 2019+; on-prem may not support it'
        });
      } else if (status === 403) {
        checklist.push({ 
          name: 'Test Plan API (v7.1)', 
          status: 'FAIL', 
          error: 'Forbidden (403)',
          hint: 'PAT needs "Test Plan & Results: Read" scope'
        });
      } else {
        checklist.push({ 
          name: 'Test Plan API (v7.1)', 
          status: 'WARN', 
          error: err.message,
          note: 'Test Plans may not be available in this version'
        });
      }
    }

    // ===== Overall Status =====
    const passCount = checklist.filter(c => c.status === 'PASS').length;
    const failCount = checklist.filter(c => c.status === 'FAIL').length;
    const warnCount = checklist.filter(c => c.status === 'WARN').length;
    
    const isHealthy = failCount === 0;
    const isDegraded = failCount === 0 && warnCount > 0;
    
    const finalStatus = isHealthy ? 'HEALTHY' : isDegraded ? 'DEGRADED' : 'FAILED';
    
    return res.status(isHealthy || isDegraded ? 200 : 500).json({
      success: isHealthy,
      status: finalStatus,
      summary: {
        pass: passCount,
        fail: failCount,
        warn: warnCount
      },
      orgUrl: orgUrl,
      project: project,
      checklist: checklist,
      recommendation: isHealthy 
        ? 'All checks passed! Backend can sync data from TFS/Azure DevOps.'
        : failCount > 0
        ? `Fix ${failCount} failing checks above, then retry health check.`
        : 'Some features may be unavailable in this TFS version, but core functionality is working.'
    });

  } catch (error) {
    Logger.error('Health check error', error.message);
    checklist.push({ 
      name: 'Unexpected error', 
      status: 'FAIL', 
      error: error.message 
    });
    
    return res.status(500).json({
      success: false,
      status: 'ERROR',
      error: error.message,
      checklist
    });
  }
};
