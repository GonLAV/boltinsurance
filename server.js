// Simple Express proxy + static server to bypass CORS for Azure DevOps/TFS
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');
// (rollback) remove passthrough URL import
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.text({ type: ['application/json-patch+json'], limit: '2mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Proxy endpoint
// Body: { url: string, method?: string, headers?: object, body?: any }
app.post('/proxy', async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, body } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: 'Missing url' });
    }

    // Allow self-signed certs for on-prem TFS
    const agent = new https.Agent({ rejectUnauthorized: false });

    const opts = { method, headers, agent };
    if (body !== undefined && method !== 'GET') {
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, opts);
    const contentType = response.headers.get('content-type') || '';
    const status = response.status;

    // Pass through headers and body
    res.status(status);
    // Copy selected headers
    res.set('x-proxy-target', url);
    res.set('content-type', contentType);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');

    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.send(data);
    } else {
      const text = await response.text();
      res.send(text);
    }
  } catch (err) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.status(500).json({ error: err.message || 'Proxy error' });
  }
});

// Passthrough to dedicated TFS proxy on localhost:3001 for convenience
// Forward any /api/* calls to http://localhost:3001 preserving method, headers, and body
// (rollback) removed /api passthrough; frontend should call proxy directly when needed

// API: Validate PAT connection (v5.0)
app.post('/api/auth/connect', async (req, res) => {
  try {
    const { pat: patFromBody, orgUrl: orgUrlFromBody } = req.body || {};
    const pat = process.env.AZURE_DEVOPS_PAT || patFromBody;
    const orgEnv = process.env.AZURE_DEVOPS_ORG;
    const projEnv = process.env.AZURE_DEVOPS_PROJECT;
    const baseFromEnv = (orgEnv && projEnv) ? `https://dev.azure.com/${orgEnv}/${projEnv}` : null;
    const orgUrl = (orgUrlFromBody || baseFromEnv);
    if (!pat || !orgUrl) {
      return res.status(400).json({ error: 'Missing pat or orgUrl' });
    }

    const agent = new https.Agent({ rejectUnauthorized: false });
    const authString = `:${pat}`;
    const encodedAuth = Buffer.from(authString).toString('base64');
    const headers = {
      Authorization: `Basic ${encodedAuth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    const base = orgUrl.replace(/\/$/, '');
    const url = `${base}/_apis/projects?api-version=5.0`;
    console.log('[AUTH] orgUrl:', base, '| PAT from', process.env.AZURE_DEVOPS_PAT ? 'env' : 'body');
    const response = await fetch(url, { method: 'GET', headers, agent });
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
    const data = await response.json();
    return res.json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Auth connect error' });
  }
});

// API: Create Test Case work item (v5.0)
app.post('/api/testcase/create', async (req, res) => {
  try {
    const { pat: patFromBody, orgUrl: orgUrlFromBody, projectName: projectNameFromBody, patch } = req.body || {};
    const pat = process.env.AZURE_DEVOPS_PAT || patFromBody;
    const orgEnv = process.env.AZURE_DEVOPS_ORG;
    const projEnv = process.env.AZURE_DEVOPS_PROJECT;
    const baseFromEnv = (orgEnv && projEnv) ? `https://dev.azure.com/${orgEnv}/${projEnv}` : null;
    const orgUrl = (orgUrlFromBody || baseFromEnv);
    const projectName = (projectNameFromBody || projEnv);
    console.log('[CREATE] orgUrl:', orgUrl, '| project:', projectName, '| patch ops:', Array.isArray(patch) ? patch.length : 'invalid', '| PAT from', process.env.AZURE_DEVOPS_PAT ? 'env' : 'body');
    if (!pat || !orgUrl || !projectName || !Array.isArray(patch)) {
      return res.status(400).json({ error: 'Missing pat, orgUrl, projectName or patch' });
    }

    const agent = new https.Agent({ rejectUnauthorized: false });
    const authString = `:${pat}`;
    const encodedAuth = Buffer.from(authString).toString('base64');
    const headers = {
      Authorization: `Basic ${encodedAuth}`,
      'Content-Type': 'application/json-patch+json',
      Accept: 'application/json'
    };

    const url = `${orgUrl.replace(/\/$/, '')}/_apis/wit/workitems/$Test%20Case?api-version=5.0`;
    const response = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(patch), agent });
    let rawText = await response.text();
    // Remove BOM if present
    rawText = rawText.replace(/^\uFEFF/, '');
    // Log the raw TFS response for debugging
    console.error('[TFS RAW RESPONSE]', rawText);
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Create test case error' });
  }
});

// API: List Test Cases via WIQL and details (v5.0)
app.post('/api/testcase/list', async (req, res) => {
  try {
    const { pat: patFromBody, orgUrl: orgUrlFromBody, projectName: projectNameFromBody } = req.body || {};
    const pat = process.env.AZURE_DEVOPS_PAT || patFromBody;
    const orgEnv = process.env.AZURE_DEVOPS_ORG;
    const projEnv = process.env.AZURE_DEVOPS_PROJECT;
    const baseFromEnv = (orgEnv && projEnv) ? `https://dev.azure.com/${orgEnv}/${projEnv}` : null;
    const orgUrl = (orgUrlFromBody || baseFromEnv);
    const projectName = (projectNameFromBody || projEnv);
    console.log('[LIST] orgUrl:', orgUrl, '| project:', projectName, '| PAT from', process.env.AZURE_DEVOPS_PAT ? 'env' : 'body');
    if (!pat || !orgUrl || !projectName) {
      return res.status(400).json({ error: 'Missing pat, orgUrl or projectName' });
    }

    const agent = new https.Agent({ rejectUnauthorized: false });
    const authString = `:${pat}`;
    const encodedAuth = Buffer.from(authString).toString('base64');
    const headers = {
      Authorization: `Basic ${encodedAuth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    const base = orgUrl.replace(/\/$/, '');
    const wiqlUrl = `${base}/${encodeURIComponent(projectName)}/_apis/wit/wiql?api-version=5.0`;
    const wiqlBody = {
      query: `SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.TeamProject] = '${projectName.replace(/'/g, "''")}' AND [System.WorkItemType] = 'Test Case' ORDER BY [System.ChangedDate] DESC`
    };
    const wiqlResp = await fetch(wiqlUrl, { method: 'POST', headers, body: JSON.stringify(wiqlBody), agent });
    if (!wiqlResp.ok) {
      const text = await wiqlResp.text();
      return res.status(wiqlResp.status).send(text);
    }
    const wiqlData = await wiqlResp.json();
    const ids = (wiqlData.workItems || []).map(w => w.id);
    if (!ids.length) return res.json({ value: [] });

    const detailsUrl = `${base}/_apis/wit/workitems?ids=${ids.join(',')}&$expand=Relations&api-version=5.0`;
    const detailsResp = await fetch(detailsUrl, { method: 'GET', headers, agent });
    const contentType = detailsResp.headers.get('content-type') || '';
    if (!detailsResp.ok) {
      const errBody = contentType.includes('application/json') ? await detailsResp.json() : await detailsResp.text();
      return res.status(detailsResp.status).send(errBody);
    }
    const details = await detailsResp.json();
    return res.json(details);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'List test cases error' });
  }
});

app.listen(PORT, () => {
  console.log(`BOLTEST server running at http://127.0.0.1:${PORT}`);
});
