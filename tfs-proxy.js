// Dedicated TFS/Azure DevOps proxy using Express + Axios
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Config via env with safe defaults
const TFS_URL = process.env.TFS_URL || 'https://tlvtfs03.ciosus.com/tfs/Epos';
let STORED_PAT = process.env.PAT_TOKEN || null; // server-side stored PAT for demo

function getAuthHeader() {
  const pat = STORED_PAT || process.env.PAT_TOKEN || 'YOUR_PAT_TOKEN_HERE';
  return 'Basic ' + Buffer.from(':' + pat).toString('base64');
}

// Validate PAT and store server-side
app.post('/api/auth/connect', async (req, res) => {
  try {
    const { pat, orgUrl } = req.body || {};
    const base = (orgUrl && orgUrl.trim()) || TFS_URL;
    if (!pat) return res.status(400).json({ error: 'PAT required' });
    const AUTH = 'Basic ' + Buffer.from(':' + pat).toString('base64');
    const httpsAgent = new (require('https').Agent)({ rejectUnauthorized: false });
    const resp = await axios.get(`${base}/_apis/projects?api-version=5.0`, {
      headers: { Authorization: AUTH },
      httpsAgent
    });
    if (resp.status >= 200 && resp.status < 300) {
      STORED_PAT = pat;
      return res.json({ ok: true });
    }
    return res.status(resp.status).json({ error: 'Invalid PAT', details: resp.data });
  } catch (error) {
    return res.status(error.response?.status || 401).json({ error: 'Invalid PAT', details: error.response?.data || error.message });
  }
});

// Create Test Case (JSON Patch)
app.post('/api/testcases', async (req, res) => {
  try {
    const resp = await axios.patch(
      `${TFS_URL}/_apis/wit/workitems/$Test%20Case?api-version=5.0`,
      req.body,
      {
        headers: {
          Authorization: getAuthHeader(),
          'Content-Type': 'application/json-patch+json'
        },
        // Allow self-signed certs common in on-prem TFS
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
      }
    );
    res.status(resp.status).json(resp.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({
      error: error.message,
      details: error.response?.data
    });
  }
});

// Query Test Cases via WIQL
app.get('/api/testcases', async (req, res) => {
  try {
    const query = {
      query:
        "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.WorkItemType] = 'Test Case' ORDER BY [System.ChangedDate] DESC"
    };
    const resp = await axios.post(
      `${TFS_URL}/_apis/wit/wiql?api-version=5.0`,
      query,
      {
        headers: {
          Authorization: getAuthHeader(),
          'Content-Type': 'application/json'
        },
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
      }
    );
    res.status(resp.status).json(resp.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ error: error.message, details: error.response?.data });
  }
});

const PORT = process.env.PROXY_PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ TFS Proxy running on http://localhost:${PORT}`);
  console.log(`→ Target: ${TFS_URL}`);
});
