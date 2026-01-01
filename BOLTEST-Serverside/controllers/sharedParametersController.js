/**
 * Shared Parameters Controller
 * Manages creation, update, and linking of shared parameters to test cases
 */

const AzureLogger = require('../utils/azureLogger');
const clientManager = require('../config/clientManager');
const AzureDevOpsService = require('../services/azureDevOpsService');
const { getSession } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const logger = new AzureLogger('SharedParametersController');

function sanitizeParameterName(name) {
  return String(name || '').trim().replace(/\s+/g, '_');
}

function normalizeParameterBaseName(name) {
  const sanitized = sanitizeParameterName(name);
  return sanitized.replace(/_?SharedParameters$/i, '').replace(/_+$/g, '');
}

function resolveParameterFile(paramDir, parameterName) {
  const sanitized = sanitizeParameterName(parameterName);
  const base = normalizeParameterBaseName(parameterName);

  const candidates = [
    `${base}_SharedParameters.csv`,
    `${sanitized}_SharedParameters.csv`,
    `${base}.csv`,
    `${sanitized}.csv`,
    // legacy edge-case: some older versions may have double suffix
    `${base}_SharedParameters_SharedParameters.csv`
  ];

  for (const fileName of candidates) {
    const filePath = path.join(paramDir, fileName);
    if (fs.existsSync(filePath)) {
      return { fileName, filePath, base };
    }
  }

  // default (not guaranteed to exist)
  return { fileName: `${base}_SharedParameters.csv`, filePath: path.join(paramDir, `${base}_SharedParameters.csv`), base };
}

/**
 * GET /api/shared-parameters
 * List all shared parameter sets for a project/tenant
 */
exports.listParameters = async (req, res) => {
  try {
    const { project, area } = req.query;
    
    if (!project) {
      return res.status(400).json({ 
        error: 'Project parameter required' 
      });
    }

    logger.info('Listing shared parameters', { project, area });

    // Get session and PAT
    const session = getSession(req.token);
    if (!session) {
      return res.status(401).json({ error: 'Session not found' });
    }

    const { decrypt } = require('../utils/crypto');
    let pat = session.pat;
    if (!pat && session.enc) {
      try { pat = decrypt(session.enc); } catch (e) {}
    }

    if (!pat) {
      return res.status(401).json({ error: 'PAT not found in session' });
    }

    const azureService = new AzureDevOpsService(session.orgUrl, session.project, pat);
    
    // Fetch from Azure DevOps
    const result = await azureService.getSharedParameters(project, area);

    if (!result.success) {
      return res.status(result.statusCode || 500).json(result);
    }

    res.json({
      success: true,
      project,
      area,
      parameters: result.data || [],
      count: result.data ? result.data.length : 0
    });
  } catch (error) {
    logger.error('Error listing parameters', error);
    res.status(500).json({ 
      error: 'Failed to list shared parameters',
      message: error.message 
    });
  }
};

/**
 * POST /api/shared-parameters/create
 * Create a new shared parameter set
 * Body: {
 *   name: string,
 *   project: string,
 *   area: string,
 *   columns: string[],
 *   data: any[][]
 * }
 */
exports.createParameter = async (req, res) => {
  try {
    const { name, project, area, columns, data } = req.body;

    // Validation
    if (!name || !project || !columns || !Array.isArray(columns)) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, project, columns' 
      });
    }

    const baseName = normalizeParameterBaseName(name);
    logger.info('Creating shared parameter set', { name: baseName, project, area, columnCount: columns.length });

    // Create CSV data
    const csvContent = createCSV(columns, data || []);
    
    // Save locally
    const paramDir = path.join(__dirname, '../test-templates');
    if (!fs.existsSync(paramDir)) {
      fs.mkdirSync(paramDir, { recursive: true });
    }

    const fileName = `${baseName}_SharedParameters.csv`;
    const filePath = path.join(paramDir, fileName);
    fs.writeFileSync(filePath, csvContent);

    logger.info('Parameter set saved locally', { filePath });

    // Sync to Azure DevOps
    let azureResult = null;
    const session = getSession(req.token);
    if (session) {
      const { decrypt } = require('../utils/crypto');
      let pat = session.pat;
      if (!pat && session.enc) {
        try { pat = decrypt(session.enc); } catch (e) {}
      }

      if (pat) {
        const azureService = new AzureDevOpsService(session.orgUrl, session.project, pat);
        azureResult = await azureService.createSharedParameter({
          title: baseName,
          columns,
          data: data || [],
          area: area || session.areaPath
        });
        
        if (azureResult.success) {
          logger.info('Shared Parameter created in Azure DevOps', { id: azureResult.data.id });
        }
      }
    }

    res.json({
      success: true,
      message: 'Shared parameter set created',
      name: baseName,
      project,
      area,
      columns,
      rowCount: (data || []).length,
      fileName,
      filePath,
      azureId: azureResult?.data?.id || null
    });
  } catch (error) {
    logger.error('Error creating parameter set', error);
    res.status(500).json({ 
      error: 'Failed to create shared parameter set',
      message: error.message 
    });
  }
};

/**
 * POST /api/shared-parameters/add-data
 * Add rows to existing parameter set
 * Body: {
 *   parameterName: string,
 *   rows: any[][]
 * }
 */
exports.addParameterData = async (req, res) => {
  try {
    const { parameterName, rows } = req.body;

    if (!parameterName || !Array.isArray(rows)) {
      return res.status(400).json({ 
        error: 'Missing required fields: parameterName, rows' 
      });
    }

    logger.info('Adding data to parameter set', { parameterName, rowCount: rows.length });

    const paramDir = path.join(__dirname, '../test-templates');
    const { fileName, filePath } = resolveParameterFile(paramDir, parameterName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: `Parameter set not found: ${parameterName}` 
      });
    }

    // Read existing CSV
    const existingContent = fs.readFileSync(filePath, 'utf-8');
    const normalized = existingContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');
    const headerLine = (lines[0] || '').trimEnd();
    const headerArray = headerLine.split('\t').map(h => h.trim());

    const existingRows = lines
      .slice(1)
      .map(l => l.trimEnd())
      .filter(Boolean);

    const newRows = rows.map((row) => {
      let values;
      if (Array.isArray(row)) {
        values = row.map(v => String(v ?? ''));
      } else if (row && typeof row === 'object') {
        values = headerArray.map(h => String(row[h] ?? ''));
      } else {
        // If a raw string row arrives, keep it as-is
        values = [String(row ?? '')];
      }

      // normalize to header length
      if (values.length < headerArray.length) {
        values = values.concat(Array(headerArray.length - values.length).fill(''));
      }
      if (values.length > headerArray.length) {
        values = values.slice(0, headerArray.length);
      }
      return values.join('\t');
    });

    const combined = [headerLine, ...existingRows, ...newRows].join('\n') + '\n';
    fs.writeFileSync(filePath, combined, 'utf-8');

    logger.info('Data added to parameter set', { parameterName, filePath });

    res.json({
      success: true,
      message: 'Rows added to shared parameter set',
      parameterName,
      rowsAdded: rows.length
    });
  } catch (error) {
    logger.error('Error adding parameter data', error);
    res.status(500).json({ 
      error: 'Failed to add data to parameter set',
      message: error.message 
    });
  }
};

/**
 * POST /api/shared-parameters/link-to-testcase
 * Link a shared parameter set to a test case
 * Body: {
 *   testCaseId: string,
 *   parameterName: string,
 *   project: string
 * }
 */
exports.linkParameterToTestCase = async (req, res) => {
  try {
    const { testCaseId, parameterName, project } = req.body;

    if (!testCaseId || !parameterName || !project) {
      return res.status(400).json({ 
        error: 'Missing required fields: testCaseId, parameterName, project' 
      });
    }

    logger.info('Linking parameter to test case', { testCaseId, parameterName, project });

    // Get session and PAT
    const session = getSession(req.token);
    if (!session) {
      return res.status(401).json({ error: 'Session not found' });
    }

    const { decrypt } = require('../utils/crypto');
    let pat = session.pat;
    if (!pat && session.enc) {
      try { pat = decrypt(session.enc); } catch (e) {}
    }

    if (!pat) {
      return res.status(401).json({ error: 'PAT not found in session' });
    }

    const azureService = new AzureDevOpsService(session.orgUrl, session.project, pat);

    // 1. Find the Shared Parameter work item ID by name
    // For now, we assume the user might pass the ID directly or we need to find it.
    // If parameterName is a number, use it as ID. Otherwise, search for it.
    let sharedParameterId = parameterName;
    if (isNaN(parameterName)) {
      const searchTitle = normalizeParameterBaseName(parameterName);
      const searchResult = await azureService.findWorkItemByTitle(searchTitle, 'Shared Parameter');
      if (searchResult) {
        sharedParameterId = searchResult.id;
      } else {
        return res.status(404).json({ error: `Shared Parameter not found: ${parameterName}` });
      }
    }

    // 2. Link it
    const result = await azureService.linkSharedParameterToTestCase(
      testCaseId,
      sharedParameterId,
      parameterName
    );

    if (!result.success) {
      return res.status(result.statusCode || 500).json(result);
    }

    logger.info('Parameter linked to test case', { testCaseId, parameterName, sharedParameterId });

    res.json({
      success: true,
      message: 'Parameter linked to test case',
      testCaseId,
      parameterName,
      sharedParameterId,
      linkedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error linking parameter to test case', error);
    res.status(500).json({ 
      error: 'Failed to link parameter to test case',
      message: error.message 
    });
  }
};

/**
 * POST /api/shared-parameters/convert-to-steps
 * Convert parameter data into test case steps with @ParamName syntax
 * Body: {
 *   parameterName: string,
 *   testSteps: string[],
 *   expectedResults: string[]
 * }
 * Returns: Test case steps with parameter references
 */
exports.convertToParameterSteps = async (req, res) => {
  try {
    const { parameterName, testSteps, expectedResults } = req.body;

    if (!parameterName || !Array.isArray(testSteps)) {
      return res.status(400).json({ 
        error: 'Missing required fields: parameterName, testSteps' 
      });
    }

    logger.info('Converting steps to parameter format', { parameterName, stepCount: testSteps.length });

    // Find parameter names in steps using regex (supports {Param} and @Param)
    const braceRegex = /\{([A-Za-z0-9_]+)\}/g;
    const atRegex = /@(\w+)/g;
    const usedParams = new Set();
    
    testSteps.forEach(step => {
      let match;
      while ((match = braceRegex.exec(step)) !== null) usedParams.add(match[1]);
      while ((match = atRegex.exec(step)) !== null) usedParams.add(match[1]);
    });

    const steps = testSteps.map((step, idx) => ({
      step: idx + 1,
      action: step,
      testData: `Use values from ${parameterName} (${Array.from(usedParams).join(', ')})`,
      expectedResult: expectedResults && expectedResults[idx] ? expectedResults[idx] : '',
      hasParameters: step.includes('@') || step.includes('{')
    }));

    res.json({
      success: true,
      parameterName,
      steps,
      parametersUsed: Array.from(usedParams),
      dataSetCount: 'Multiple (1 per CSV row)'
    });
  } catch (error) {
    logger.error('Error converting steps', error);
    res.status(500).json({ 
      error: 'Failed to convert steps',
      message: error.message 
    });
  }
};

/**
 * GET /api/shared-parameters/export
 * Export parameter set as CSV
 */
exports.exportParameter = async (req, res) => {
  try {
    const { parameterName } = req.query;

    if (!parameterName) {
      return res.status(400).json({ 
        error: 'parameterName required' 
      });
    }

    logger.info('Exporting parameter set', { parameterName });

    const paramDir = path.join(__dirname, '../test-templates');
    const resolved = resolveParameterFile(paramDir, parameterName);
    const filePath = resolved.filePath;
    const downloadName = `${resolved.base}_SharedParameters.tsv`;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: `Parameter set not found: ${parameterName}` 
      });
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.send(content);

    logger.info('Parameter set exported', { parameterName, downloadName });
  } catch (error) {
    logger.error('Error exporting parameter set', error);
    res.status(500).json({ 
      error: 'Failed to export parameter set',
      message: error.message 
    });
  }
};

/**
 * DELETE /api/shared-parameters/:parameterName
 * Delete a shared parameter set
 */
exports.deleteParameter = async (req, res) => {
  try {
    const { parameterName } = req.params;

    if (!parameterName) {
      return res.status(400).json({ 
        error: 'parameterName required' 
      });
    }

    logger.info('Deleting parameter set', { parameterName });

    const paramDir = path.join(__dirname, '../test-templates');
    const { filePath } = resolveParameterFile(paramDir, parameterName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: `Parameter set not found: ${parameterName}` 
      });
    }

    fs.unlinkSync(filePath);

    logger.info('Parameter set deleted', { parameterName });

    res.json({
      success: true,
      message: 'Shared parameter set deleted',
      parameterName
    });
  } catch (error) {
    logger.error('Error deleting parameter set', error);
    res.status(500).json({ 
      error: 'Failed to delete parameter set',
      message: error.message 
    });
  }
};

// Helper function to create CSV from columns and data
function createCSV(columns, data) {
  const lines = [columns.join('\t')];
  
  data.forEach(row => {
    if (Array.isArray(row)) {
      lines.push(row.join('\t'));
    } else if (typeof row === 'object') {
      const values = columns.map(col => row[col] || '');
      lines.push(values.join('\t'));
    }
  });

  return lines.join('\n');
}
