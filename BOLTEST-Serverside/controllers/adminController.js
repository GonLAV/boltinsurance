const Logger = require('../utils/logger');
const { findOrCreateTestCase } = require('../src/services/azureDevOpsIntegration');

exports.findOrCreate = async (req, res) => {
  try {
    const { title, description, steps, planId, suiteId, orgUrl, project } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Missing required field: title' });
    }

    const _org = orgUrl || process.env.AZDO_ORG_URL;
    const _project = project || process.env.AZDO_PROJECT;

    if (!_org || !_project) {
      return res.status(400).json({ success: false, message: 'Organization URL and Project must be configured or provided' });
    }

    Logger.info('Admin: findOrCreate request received', { title, project: _project });

    const result = await findOrCreateTestCase({ orgUrl: _org, project: _project, title, description, steps, planId, suiteId });

    if (!result.success) {
      // Map auth errors to appropriate status codes
      if (result.error === 'AUTH_ERROR') return res.status(result.status || 401).json(result);
      if (result.error === 'MULTIPLE_MATCHES') return res.status(400).json(result);
      return res.status(result.status || 500).json(result);
    }

    return res.json(result);
  } catch (err) {
    Logger.error('Admin findOrCreate failed', err.message || err);
    return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};
