const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const AttachmentService = require('../../services/attachmentService');
const Logger = require('../../utils/logger');

const router = express.Router();

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // sanitize and append timestamp
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}_${safeName}`;
    cb(null, filename);
  }
});

const upload = multer({ storage });

/**
 * Helper to get or create AttachmentService instance for Azure DevOps
 */
function getAttachmentService(req) {
  const orgUrl = req.headers['x-orgurl'] || process.env.AZDO_ORG_URL;
  const pat = req.headers['x-pat'] || process.env.AZDO_PAT;
  const project = req.headers['x-project'] || process.env.AZDO_PROJECT;

  if (!orgUrl || !pat || !project) {
    const missing = [];
    if (!orgUrl) missing.push('x-orgurl');
    if (!pat) missing.push('x-pat');
    if (!project) missing.push('x-project');
    throw new Error(`Missing required headers/env: ${missing.join(', ')}`);
  }

  const https = require('https');
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });
  const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

  return new AttachmentService(orgUrl, project, authHeader, httpsAgent, '7.1');
}

// GET /api/attachments/diagnose - Check TFS connectivity + auth
// Usage: curl -H "x-orgurl: ..." -H "x-pat: ..." -H "x-project: ..." http://localhost:5000/api/attachments/diagnose
router.get('/diagnose', async (req, res) => {
  try {
    let orgUrl = req.headers['x-orgurl'];
    const pat = req.headers['x-pat'];
    let project = req.headers['x-project'];

    if (!orgUrl || !pat || !project) {
      return res.status(400).json({
        success: false,
        message: 'Missing required headers: x-orgurl, x-pat, x-project'
      });
    }

    // Normalize orgUrl
    if (orgUrl && project && orgUrl.endsWith(`/${project}`)) {
      orgUrl = orgUrl.substring(0, orgUrl.length - project.length - 1);
    }

    const axios = require('axios');
    const https = require('https');
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

    // Test 1: Simple ping to get projects
    const testUrl = `${orgUrl}/_apis/projects?api-version=5.0`;
    Logger.info('🔍 Diagnostic: Testing TFS connectivity', { testUrl });

    try {
      const response = await axios.get(testUrl, {
        headers: { Authorization: authHeader },
        httpsAgent,
        timeout: 10000
      });

      return res.json({
        success: true,
        diagnostic: {
          tfs_url: orgUrl,
          project: project,
          api_version_tested: '5.0',
          http_status: response.status,
          response_keys: response.data ? Object.keys(response.data) : [],
          message: '✅ TFS connection successful - auth works!',
          next_step: 'Try uploading an attachment'
        }
      });
    } catch (testError) {
      return res.json({
        success: false,
        diagnostic: {
          tfs_url: orgUrl,
          project: project,
          http_status: testError.response?.status,
          error_message: testError.message,
          response_data: testError.response?.data,
          auth_header_format: 'Basic base64(:PAT)',
          auth_header_length: authHeader.length,
          message: '❌ TFS connection failed',
          possible_causes: [
            'Invalid org URL (check cloud vs server format)',
            'Invalid or expired PAT',
            'PAT lacks Work Items scope',
            'User account lacks Basic access level',
            'TFS server connectivity issue'
          ]
        }
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/attachments - upload a single file to Azure DevOps
// Requires x-orgurl, x-pat, x-project headers (automatically added by frontend)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    let orgUrl = req.headers['x-orgurl'];
    const pat = req.headers['x-pat'];
    let project = req.headers['x-project'];

    // Normalize orgUrl: if it ends with /ProjectName, strip it
    // Correct format: https://dev.azure.com/org or https://tfs/Collection
    // NOT: https://dev.azure.com/org/ProjectName
    if (orgUrl && project && orgUrl.endsWith(`/${project}`)) {
      orgUrl = orgUrl.substring(0, orgUrl.length - project.length - 1);
      Logger.info('Normalized orgUrl by removing duplicate project name', { 
        original: req.headers['x-orgurl'], 
        normalized: orgUrl 
      });
    }

    // Require Azure DevOps headers for attachment upload
    if (!orgUrl || !pat || !project) {
      // Clean up temp file
      require('fs').unlinkSync(req.file.path);
      
      const missing = [];
      if (!orgUrl) missing.push('x-orgurl');
      if (!pat) missing.push('x-pat');
      if (!project) missing.push('x-project');
      
      Logger.error('Attachment upload missing required headers', { missing });
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required TFS headers: ' + missing.join(', '),
        missingHeaders: missing
      });
    }

    // Log the credentials being used for debugging
    Logger.info('Attachment upload request received', {
      orgUrl: orgUrl.substring(0, 50) + (orgUrl.length > 50 ? '...' : ''),
      patLength: pat ? pat.length : 0,
      patPrefix: pat ? pat.substring(0, 10) : 'none',
      project: project
    });

    // Upload to Azure DevOps
    try {
      const attachmentService = getAttachmentService(req);
      const fileBuffer = require('fs').readFileSync(req.file.path);
      const result = await attachmentService.uploadAttachment(fileBuffer, {
        fileName: req.file.originalname
      });
      
      // Delete local temp file after successful TFS upload
      require('fs').unlinkSync(req.file.path);
      
      Logger.info('File uploaded to Azure DevOps successfully', { 
        name: req.file.originalname, 
        id: result.id, 
        url: result.url 
      });
      
      // Return the full TFS attachment URL for linking to work items
      return res.status(201).json({ 
        success: true, 
        file: { 
          id: result.id,        // GUID from TFS
          name: req.file.originalname, 
          mime: req.file.mimetype, 
          size: req.file.size, 
          url: result.url,      // Full TFS URL from response
          adoUrl: result.url    // Use this for linking to work items
        } 
      });
    } catch (adoError) {
      // Delete temp file on error
      try {
        require('fs').unlinkSync(req.file.path);
      } catch (e) { /* ignore */ }
      
      const status = adoError.response?.status;
      let userMessage = `Failed to upload attachment to TFS: ${adoError.message}`;
      
      // Provide better error messages for common issues
      if (status === 401) {
        userMessage = 'Authentication failed: Your PAT token may be invalid, expired, or your organization URL is incorrect. Please re-login with valid credentials.';
      } else if (status === 403) {
        userMessage = 'Access denied: Your PAT token may not have permission to upload attachments. Check your token scopes.';
      } else if (status === 404) {
        userMessage = 'Project not found: Check that your organization URL and project name are correct.';
      }
      
      // Log full error details for debugging
      Logger.error('Azure DevOps attachment upload failed', { 
        error: adoError.message,
        status: status,
        statusText: adoError.response?.statusText,
        userMessage: userMessage,
        responseData: JSON.stringify(adoError.response?.data),
        uploadUrl: `${orgUrl}/${project}/_apis/wit/attachments`,
        fileName: req.file?.originalname
      });
      
      return res.status(status || 500).json({ 
        success: false, 
        message: userMessage,
        error: adoError.response?.data || adoError.message,
        status: status
      });
    }
  } catch (error) {
    Logger.error('Attachment upload error', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Upload failed' });
  }
});

/**
 * POST /api/attachments/chunked/start - Initiate a chunked upload to Azure DevOps
 * Body: { fileSize, fileName (optional) }
 * Returns: { id, url } - attachment reference for subsequent chunk uploads
 */
router.post('/chunked/start', async (req, res) => {
  try {
    const { fileSize, fileName } = req.body || {};
    if (!fileSize || !Number.isFinite(fileSize) || fileSize <= 0) {
      return res.status(400).json({ success: false, message: 'fileSize is required and must be > 0' });
    }

    const attachmentService = getAttachmentService(req);
    // Start chunked upload by POSTing with uploadType='Chunked'
    const result = await attachmentService.uploadAttachment(
      Buffer.alloc(0), // empty buffer to initiate
      { fileName, uploadType: 'Chunked' }
    );

    Logger.info('Chunked upload initiated', { id: result.id, fileName });
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    Logger.error('Chunked upload start failed', error.message || error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to start chunked upload' });
  }
});

/**
 * PUT /api/attachments/chunked/:id - Upload a chunk to existing attachment session
 * Headers: Content-Range (required, e.g., "bytes 0-39999/50000")
 * Body: binary chunk data
 * Returns: { id, url } - attachment reference
 */
router.put('/chunked/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const contentRange = req.headers['content-range'];

    if (!id) {
      return res.status(400).json({ success: false, message: 'Attachment id is required (in URL path)' });
    }

    if (!contentRange) {
      return res.status(400).json({ 
        success: false, 
        message: 'Content-Range header is required (e.g., "bytes 0-39999/50000")' 
      });
    }

    // Collect raw body as Buffer
    let body = Buffer.alloc(0);
    req.on('data', chunk => {
      body = Buffer.concat([body, chunk]);
    });

    req.on('end', async () => {
      try {
        const attachmentService = getAttachmentService(req);
        const result = await attachmentService.uploadAttachmentChunk(id, body, {
          contentRange,
          fileName: req.query.fileName
        });

        Logger.info('Chunk uploaded', { id, range: contentRange });
        return res.status(200).json({ success: true, ...result });
      } catch (error) {
        Logger.error('Chunk upload failed', error.message || error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to upload chunk' });
      }
    });

    req.on('error', error => {
      Logger.error('Request error during chunk upload', error.message || error);
      return res.status(400).json({ success: false, message: 'Request error' });
    });
  } catch (error) {
    Logger.error('Chunk upload handler error', error.message || error);
    return res.status(500).json({ success: false, message: error.message || 'Internal error' });
  }
});

module.exports = router;
