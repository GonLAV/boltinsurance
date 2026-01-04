const axios = require('axios');
const https = require('https');
const Logger = require('../utils/logger');

const DEFAULT_API_VERSION = '7.2-preview.3';

exports.addCases = async (req, res) => {
  try {
    const { planId, suiteId, testCaseIds, apiVersion } = req.body;

    if (!planId || !suiteId || !testCaseIds || !Array.isArray(testCaseIds) || testCaseIds.length === 0) {
      return res.status(400).json({ success: false, message: 'planId, suiteId, and testCaseIds (array) are required' });
    }

    const orgUrl = process.env.AZDO_ORG_URL;
    const project = process.env.AZDO_PROJECT;
    const pat = process.env.AZDO_PAT;

    if (!orgUrl || !project || !pat) {
      return res.status(400).json({ success: false, message: 'Azure DevOps org/project/PAT must be configured in environment' });
    }

    const version = apiVersion || DEFAULT_API_VERSION;
    const org = orgUrl.replace(/\/$/, '');
    const idsCsv = testCaseIds.join(',');

    const url = `${org}/${project}/_apis/test/Plans/${planId}/suites/${suiteId}/testcases/${idsCsv}?api-version=${version}`;
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

    Logger.info('Adding test cases to suite', { planId, suiteId, idsCsv, version });

    const response = await axios.post(url, {}, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    return res.json({ success: true, data: response.data });
  } catch (err) {
    Logger.error('Failed to add cases to suite', err.message || err);
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message || 'Failed to add cases';
    return res.status(status).json({ success: false, message, details: err.response?.data });
  }
};
