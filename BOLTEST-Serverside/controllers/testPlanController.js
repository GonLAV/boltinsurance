const axios = require('axios');
const https = require('https');
const Logger = require('../utils/logger');

const DEFAULT_API_VERSION = '7.1';

function getConfig() {
  const orgUrl = process.env.AZDO_ORG_URL;
  const project = process.env.AZDO_PROJECT;
  const pat = process.env.AZDO_PAT;

  if (!orgUrl || !project || !pat) {
    throw new Error('Azure DevOps org/project/PAT must be configured in environment');
  }

  return {
    orgUrl: orgUrl.replace(/\/$/, ''),
    project,
    pat,
  };
}

function buildUrl(basePath, query = {}, apiVersion = DEFAULT_API_VERSION) {
  const { orgUrl, project } = getConfig();
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });

  params.append('api-version', apiVersion);
  return `${orgUrl}/${project}/_apis${basePath}?${params.toString()}`;
}

function authHeader(pat) {
  return `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
}

function handleError(res, err, fallbackMessage) {
  Logger.error(fallbackMessage, err?.message || err);
  const status = err?.response?.status || 500;
  const message = err?.response?.data?.message || err?.message || fallbackMessage;
  return res.status(status).json({ success: false, message, details: err?.response?.data });
}

exports.listPlans = async (req, res) => {
  try {
    const { pat } = getConfig();
    const {
      owner,
      filterActivePlans,
      includePlanDetails,
      continuationToken,
      apiVersion,
    } = req.query;

    const query = {};
    if (owner) query.owner = owner;
    if (filterActivePlans !== undefined) query.filterActivePlans = filterActivePlans;
    if (includePlanDetails !== undefined) query.includePlanDetails = includePlanDetails;
    if (continuationToken) query.continuationToken = continuationToken;

    const url = buildUrl('/testplan/plans', query, apiVersion || DEFAULT_API_VERSION);

    const response = await axios.get(url, {
      headers: {
        Authorization: authHeader(pat),
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    return res.json({ success: true, data: response.data });
  } catch (err) {
    return handleError(res, err, 'Failed to list test plans');
  }
};

exports.getPlan = async (req, res) => {
  const { planId } = req.params;
  if (!planId) {
    return res.status(400).json({ success: false, message: 'planId is required' });
  }

  try {
    const { pat } = getConfig();
    const { apiVersion } = req.query;
    const url = buildUrl(`/testplan/plans/${planId}`, {}, apiVersion || DEFAULT_API_VERSION);

    const response = await axios.get(url, {
      headers: {
        Authorization: authHeader(pat),
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    return res.json({ success: true, data: response.data });
  } catch (err) {
    return handleError(res, err, 'Failed to fetch test plan');
  }
};

exports.createPlan = async (req, res) => {
  const body = req.body || {};
  if (!body.name) {
    return res.status(400).json({ success: false, message: 'name is required' });
  }

  try {
    const { pat } = getConfig();
    const { apiVersion } = req.query;
    const url = buildUrl('/testplan/plans', {}, apiVersion || DEFAULT_API_VERSION);

    Logger.info('Creating test plan', { name: body.name });

    const response = await axios.post(url, body, {
      headers: {
        Authorization: authHeader(pat),
        'Content-Type': 'application/json',
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    return res.status(201).json({ success: true, data: response.data });
  } catch (err) {
    return handleError(res, err, 'Failed to create test plan');
  }
};

exports.updatePlan = async (req, res) => {
  const { planId } = req.params;
  const body = req.body || {};

  if (!planId) {
    return res.status(400).json({ success: false, message: 'planId is required' });
  }

  if (body.revision === undefined) {
    return res.status(400).json({ success: false, message: 'revision is required for update' });
  }

  try {
    const { pat } = getConfig();
    const { apiVersion } = req.query;
    const url = buildUrl(`/testplan/plans/${planId}`, {}, apiVersion || DEFAULT_API_VERSION);

    Logger.info('Updating test plan', { planId, revision: body.revision });

    const response = await axios.patch(url, body, {
      headers: {
        Authorization: authHeader(pat),
        'Content-Type': 'application/json',
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    return res.json({ success: true, data: response.data });
  } catch (err) {
    return handleError(res, err, 'Failed to update test plan');
  }
};

exports.deletePlan = async (req, res) => {
  const { planId } = req.params;
  if (!planId) {
    return res.status(400).json({ success: false, message: 'planId is required' });
  }

  try {
    const { pat } = getConfig();
    const { apiVersion } = req.query;
    const url = buildUrl(`/testplan/plans/${planId}`, {}, apiVersion || DEFAULT_API_VERSION);

    Logger.info('Deleting test plan', { planId });

    await axios.delete(url, {
      headers: {
        Authorization: authHeader(pat),
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    return res.status(204).json({ success: true });
  } catch (err) {
    return handleError(res, err, 'Failed to delete test plan');
  }
};
