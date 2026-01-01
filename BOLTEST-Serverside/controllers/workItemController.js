const AzureDevOpsService = require('../services/azureDevOpsService');
const Logger = require('../utils/logger');

exports.create = async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      reproSteps,
      steps,
      stepsText,
      priority,
      state,
      area,
      iteration,
      tags,
      assignedTo,
      parentId
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Missing required field: title' });
    }

    if (!type) {
      return res.status(400).json({ success: false, message: 'Missing required field: type' });
    }

    const orgUrl = (req.headers['x-orgurl'] || process.env.AZDO_ORG_URL || '').toString().trim();
    const project = (req.headers['x-project'] || process.env.AZDO_PROJECT || '').toString().trim();
    const pat = (req.headers['x-pat'] || process.env.AZDO_PAT || '').toString();

    if (!orgUrl || !project || !pat) {
      return res.status(400).json({ success: false, message: 'Azure DevOps org/project/PAT must be provided via headers (x-orgurl/x-project/x-pat) or configured in environment' });
    }

    try {
      // eslint-disable-next-line no-new
      new URL(orgUrl);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid org URL (x-orgurl header)' });
    }

    const svc = new AzureDevOpsService(orgUrl, project, pat);

    let normalizedSteps = steps;
    if (!Array.isArray(normalizedSteps) && typeof stepsText === 'string' && stepsText.trim()) {
      normalizedSteps = stepsText.split('\n').filter(Boolean).map((line) => ({ action: line.trim(), expectedResult: '' }));
    }

    const payload = {
      type,
      title,
      description,
      reproSteps,
      steps: normalizedSteps,
      priority,
      state,
      area,
      iteration,
      tags,
      assignedTo,
      parentId
    };

    Logger.info('Creating work item', { type, title });
    const result = await svc.createWorkItem(payload);

    if (!result?.success) {
      const status = result?.status || 500;
      return res.status(status).json(result || { success: false, message: 'Unknown error' });
    }

    return res.json(result);
  } catch (err) {
    Logger.error('Work item create failed', err.message || err);
    return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};
