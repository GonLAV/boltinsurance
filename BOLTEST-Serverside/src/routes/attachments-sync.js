const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const AttachmentSyncService = require('../../services/attachmentSyncService');
const Logger = require('../../utils/logger');
const config = require('../../config/environment');
const { optionalAuthenticateToken } = require('../../middleware/auth');

const router = express.Router();

// Allow using Bearer token-based login (req.user) for creds.
router.use(optionalAuthenticateToken);

// Ensure uploads directory exists
// Use the same uploads folder that the server exposes at /uploads
const UPLOAD_DIR = path.resolve(process.cwd(), config.uploads.uploadDir || './uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}_${safeName}`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

/**
 * Helper: Create AttachmentSyncService instance from request headers
 */
function getAttachmentSyncService(req) {
  // Prefer explicit headers (diagnostics / power users), then Bearer session (req.user), then env.
  let orgUrl = (req.headers['x-orgurl'] || req.user?.orgUrl || process.env.AZDO_ORG_URL || '').toString().trim();
  const pat = (req.headers['x-pat'] || req.user?.pat || process.env.AZDO_PAT || '').toString().trim();
  let project = (req.headers['x-project'] || req.user?.project || process.env.AZDO_PROJECT || '').toString().trim();

  if (!orgUrl || !pat || !project) {
    const missing = [];
    if (!orgUrl) missing.push('orgUrl');
    if (!pat) missing.push('pat');
    if (!project) missing.push('project');
    throw new Error(`Missing Azure DevOps credentials (send Bearer token by logging in, or pass headers x-orgurl/x-pat/x-project). Missing: ${missing.join(', ')}`);
  }

  // Normalize orgUrl: remove trailing slash and strip trailing project name if present
  orgUrl = orgUrl.replace(/\/+$/, '');
  if (orgUrl && project) {
    const suffix = `/${project}`.toLowerCase();
    if (orgUrl.toLowerCase().endsWith(suffix)) {
      orgUrl = orgUrl.slice(0, orgUrl.length - suffix.length);
    }
  }

  const https = require('https');
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });

  // Use API version from environment or let service use its default (5.1 for TFS Server)
  const apiVersion = req.user?.apiVersion || process.env.AZDO_API_VERSION || null;
  return new AttachmentSyncService(orgUrl, project, pat, httpsAgent, apiVersion);
}

/**
 * GET /api/attachments/diagnose
 * Test TFS connectivity and authentication
 */
router.get('/diagnose', async (req, res) => {
  try {
    let orgUrl = req.headers['x-orgurl'] || req.user?.orgUrl;
    const pat = req.headers['x-pat'] || req.user?.pat;
    let project = req.headers['x-project'] || req.user?.project;

    if (!orgUrl || !pat || !project) {
      return res.status(400).json({
        success: false,
        message: 'Missing Azure DevOps credentials. Login first (Bearer token) or provide headers: x-orgurl, x-pat, x-project'
      });
    }

    if (orgUrl && project && orgUrl.endsWith(`/${project}`)) {
      orgUrl = orgUrl.substring(0, orgUrl.length - project.length - 1);
    }

    const axios = require('axios');
    const https = require('https');
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

    const apiVersion = req.user?.apiVersion || process.env.AZDO_API_VERSION || '5.0';
    const testUrl = `${orgUrl}/_apis/projects?api-version=${encodeURIComponent(apiVersion)}`;
    Logger.info('[DIAGNOSE] Testing TFS connectivity', { testUrl });

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
          api_version_tested: apiVersion,
          http_status: response.status,
          response_keys: response.data ? Object.keys(response.data) : [],
          message: '✅ TFS connection successful - auth works!',
          next_step: 'You can now upload attachments'
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
          message: '❌ TFS connection failed',
          possible_causes: [
            'Invalid org URL (check format)',
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

/**
 * POST /api/attachments
 * Upload file + automatically link to Work Item (if workItemId provided)
 * 
 * Multipart FormData:
 *   - file: binary file
 *   - workItemId: (optional) work item to attach to
 * 
 * Headers:
 *   - x-orgurl, x-pat, x-project
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Send file in FormData with key "file"'
      });
    }

    const { workItemId, stepId } = req.body;

    Logger.info('[UPLOAD] Upload request received', {
      fileName: req.file.originalname,
      fileSize: req.file.size,
      workItemId,
      stepId,
      project: req.headers['x-project'] || req.user?.project || process.env.AZDO_PROJECT
    });

    try {
      const service = getAttachmentSyncService(req);
      const fileBuffer = fs.readFileSync(req.file.path);

      if (workItemId) {
        // Full upload + link flow
        let comment = `Uploaded from BOLTEST on ${new Date().toLocaleString()}`;
        if (stepId) {
          comment = `[TestStep=${stepId}]: ${comment}`;
        }

        const result = await service.uploadAndLinkAttachment(fileBuffer, parseInt(workItemId), {
          fileName: req.file.originalname,
          comment
        });

        fs.unlinkSync(req.file.path);

        Logger.info('[UPLOAD] ✅ Upload + Link SUCCESS', {
          attachmentId: result.attachmentId,
          workItemId
        });

        return res.status(201).json({
          success: true,
          message: 'Attachment uploaded and linked to work item',
          data: {
            attachmentId: result.attachmentId,
            attachmentUrl: result.attachmentUrl,
            workItemId: result.workItemId,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            linkedAt: result.linkedAt
          }
        });
      } else {
        // Upload only (no linking)
        const result = await service.uploadAttachmentToTFS(fileBuffer, {
          fileName: req.file.originalname,
          mimeType: req.file.mimetype
        });

        fs.unlinkSync(req.file.path);

        Logger.info('[UPLOAD] ✅ Upload SUCCESS (no linking)', {
          attachmentId: result.id
        });

        return res.status(201).json({
          success: true,
          message: 'Attachment uploaded to TFS (not linked to work item)',
          data: {
            attachmentId: result.id,
            attachmentUrl: result.url,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            next: 'Link this attachment to a work item using POST /api/attachments/:id/link'
          }
        });
      }
    } catch (adoError) {
      try { fs.unlinkSync(req.file.path); } catch (e) { }

      const status = adoError.response?.status;
      let userMessage = `Failed to upload attachment: ${adoError.message}`;

      if (status === 401) {
        userMessage = 'Authentication failed: Invalid/expired PAT or incorrect org URL';
      } else if (status === 403) {
        userMessage = 'Access denied: PAT may not have Work Items scope';
      } else if (status === 404) {
        userMessage = 'Project not found: Check organization URL and project name';
      }

      Logger.error('[UPLOAD] ❌ Upload FAILED', {
        error: adoError.message,
        status,
        fileName: req.file?.originalname
      });

      return res.status(status || 500).json({
        success: false,
        message: userMessage,
        error: adoError.message,
        status
      });
    }
  } catch (error) {
    Logger.error('[UPLOAD] Unexpected error', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Upload failed'
    });
  }
});

/**
 * POST /api/attachments/:attachmentId/link
 * Link an existing attachment to a work item
 * 
 * Body: { workItemId, comment (optional) }
 */
router.post('/:attachmentId/link', async (req, res) => {
  try {
    const { attachmentId } = req.params;
    const { workItemId, comment } = req.body;

    if (!workItemId) {
      return res.status(400).json({
        success: false,
        message: 'workItemId is required in request body'
      });
    }

    Logger.info('[LINK] Link request received', { attachmentId, workItemId });

    const service = getAttachmentSyncService(req);
    
    // Construct attachment URL from ID
    let orgUrl = req.headers['x-orgurl'] || process.env.AZDO_ORG_URL;
    let project = req.headers['x-project'] || process.env.AZDO_PROJECT;

    if (orgUrl && project && orgUrl.endsWith(`/${project}`)) {
      orgUrl = orgUrl.substring(0, orgUrl.length - project.length - 1);
    }

    const attachmentUrl = `${orgUrl}/${project}/_apis/wit/attachments/${attachmentId}`;

    const result = await service.linkAttachmentToWorkItem(workItemId, attachmentUrl, {
      comment: comment || 'Linked from BOLTEST'
    });

    Logger.info('[LINK] ✅ Link SUCCESS', { attachmentId, workItemId });

    return res.json({
      success: true,
      message: 'Attachment linked to work item',
      data: {
        attachmentId,
        workItemId,
        relations: result.relations ? result.relations.length : 0,
        linkedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    Logger.error('[LINK] ❌ Link FAILED', {
      error: error.message,
      attachmentId: req.params.attachmentId
    });

    return res.status(error.response?.status || 500).json({
      success: false,
      message: error.message,
      status: error.response?.status
    });
  }
});

/**
 * GET /api/attachments/workitem/:workItemId
 * Get all attachments from a work item
 * 
 * Returns:
 * {
 *   success: true,
 *   workItemId,
 *   attachments: [
 *     { id, url, comment, fileName }
 *   ]
 * }
 */
router.get('/workitem/:workItemId', async (req, res) => {
  try {
    const { workItemId } = req.params;

    Logger.info('[GET-ATTACHMENTS] Fetching attachments from work item', { workItemId });

    const service = getAttachmentSyncService(req);
    const { workItem, attachments } = await service.getWorkItemWithAttachments(parseInt(workItemId));

    Logger.info('[GET-ATTACHMENTS] ✅ Fetched attachments', {
      workItemId,
      count: attachments.length
    });

    return res.json({
      success: true,
      workItemId: parseInt(workItemId),
      title: workItem.fields ? workItem.fields['System.Title'] : 'N/A',
      attachmentCount: attachments.length,
      attachments: attachments.map(att => ({
        id: att.id,
        url: att.url,
        comment: att.comment,
        fileName: att.id // Can extract real name from URL if needed
      }))
    });
  } catch (error) {
    Logger.error('[GET-ATTACHMENTS] ❌ Fetch FAILED', {
      error: error.message,
      workItemId: req.params.workItemId
    });

    return res.status(error.response?.status || 500).json({
      success: false,
      message: error.message,
      status: error.response?.status
    });
  }
});

/**
 * GET /api/attachments/:attachmentId/download
 * Download attachment content from TFS
 * 
 * Query params:
 *   - download: true/false (set Content-Disposition header)
 */
router.get('/:attachmentId/download', async (req, res) => {
  try {
    const { attachmentId } = req.params;
    const { download = 'true' } = req.query;

    Logger.info('[DOWNLOAD] Download request received', { attachmentId });

    const service = getAttachmentSyncService(req);
    const { data, contentType, fileName } = await service.downloadAttachmentFromTFS(attachmentId);

    if (download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    }

    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    res.setHeader('Content-Length', data.length);

    Logger.info('[DOWNLOAD] ✅ Download SUCCESS', {
      attachmentId,
      size: data.length,
      contentType
    });

    return res.send(data);
  } catch (error) {
    Logger.error('[DOWNLOAD] ❌ Download FAILED', {
      error: error.message,
      attachmentId: req.params.attachmentId
    });

    return res.status(error.response?.status || 500).json({
      success: false,
      message: error.message,
      status: error.response?.status
    });
  }
});

/**
 * POST /api/attachments/sync/from-tfs
 * Sync all attachments FROM TFS back to the tool
 * 
 * Body: { workItemId }
 * 
 * Returns: Array of downloaded attachments
 */
router.post('/sync/from-tfs', async (req, res) => {
  try {
    const { workItemId } = req.body;

    if (!workItemId) {
      return res.status(400).json({
        success: false,
        message: 'workItemId is required in request body'
      });
    }

    Logger.info('[SYNC-FROM-TFS] Starting sync', { workItemId });

    const service = getAttachmentSyncService(req);
    const attachments = await service.syncAttachmentsFromTFS(parseInt(workItemId));

    // Persist synced attachments locally so the app can access them via /uploads
    const safeWorkItemDir = path.join(UPLOAD_DIR, 'synced', `workitem-${workItemId}`);
    if (!fs.existsSync(safeWorkItemDir)) fs.mkdirSync(safeWorkItemDir, { recursive: true });

    const saved = [];
    for (const att of attachments) {
      const safeName = (att.fileName || att.id || 'attachment').toString().replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = path.join(safeWorkItemDir, `${att.id}_${safeName}`);
      try {
        fs.writeFileSync(filePath, att.data);
        saved.push({
          id: att.id,
          fileName: safeName,
          contentType: att.contentType,
          size: att.data.length,
          localUrl: `/uploads/synced/workitem-${workItemId}/${encodeURIComponent(`${att.id}_${safeName}`)}`,
          downloadUrl: `/api/attachments/${encodeURIComponent(att.id)}/download?download=true`
        });
      } catch (e) {
        Logger.error('[SYNC-FROM-TFS] Failed to persist attachment locally', {
          attachmentId: att.id,
          error: e.message
        });
      }
    }

    Logger.info('[SYNC-FROM-TFS] ✅ Sync complete', {
      workItemId,
      count: attachments.length
    });

    return res.json({
      success: true,
      workItemId: parseInt(workItemId),
      message: `Synced ${saved.length} attachment(s) from TFS`,
      attachments: saved
    });
  } catch (error) {
    Logger.error('[SYNC-FROM-TFS] ❌ Sync FAILED', {
      error: error.message,
      workItemId: req.body.workItemId
    });

    return res.status(error.response?.status || 500).json({
      success: false,
      message: error.message,
      status: error.response?.status
    });
  }
});

module.exports = router;
