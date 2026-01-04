const express = require('express');
const router = express.Router();
const crypto = require('crypto');

/**
 * Two-Way Attachment Sync Routes
 * 
 * Endpoints:
 * POST   /api/sync/upload              - Upload attachment (single or chunked)
 * POST   /api/sync/link-attachment     - Link uploaded attachment to work item
 * GET    /api/sync/attachments/:id     - List attachments for work item
 * POST   /api/sync/force-sync/:id      - Trigger full sync for work item
 * POST   /api/sync/download/:guid      - Download attachment from ADO
 * GET    /api/sync/status/:id          - Check sync status
 * DELETE /api/sync/attachments/:guid   - Remove/delete attachment
 * POST   /api/webhooks/workitem        - Webhook receiver from ADO
 */

/**
 * Helper: Extract sync service and credentials from request
 */
async function getSyncService(req) {
  const { syncService, db, azureService } = req.app.locals;
  if (!syncService || !db) {
    throw new Error('Sync service not configured');
  }
  return syncService;
}

/**
 * Middleware: Authenticate webhook
 */
function authenticateWebhook(req, res, next) {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;

  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  const { webhookSecret = 'your-webhook-secret' } = req.app.locals;
  const hash = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(payload))
    .digest('hex');

  if (hash !== signature) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  next();
}

/**
 * POST /api/sync/upload
 * Upload a new attachment (supports single or chunked)
 */
router.post('/upload', async (req, res) => {
  try {
    const { fileName, workItemId, sessionUuid } = req.body;
    const fileBuffer = req.files?.file?.data || Buffer.from(req.body.file || '', 'base64');

    if (!fileName || !workItemId || !fileBuffer) {
      return res.status(400).json({ 
        error: 'Missing fileName, workItemId, or file data' 
      });
    }

    const syncService = await getSyncService(req);

    // Determine chunk info
    const isChunkedRequest = !!sessionUuid;
    const contentRange = req.headers['content-range'];
    const totalSize = parseInt(req.headers['x-total-size'], 10) || fileBuffer.length;

    if (isChunkedRequest && contentRange) {
      // Chunked upload - accumulate chunks
      const result = await syncService.uploadAttachment(fileBuffer, fileName, workItemId);
      return res.json({
        success: true,
        message: 'Chunk received',
        attachment: result,
        chunkProgress: req.body.chunkIndex || 'unknown'
      });
    } else {
      // Single upload
      const result = await syncService.uploadAttachment(fileBuffer, fileName, workItemId);
      return res.json({
        success: true,
        message: 'Attachment uploaded',
        attachment: result
      });
    }
  } catch (err) {
    console.error('[Upload] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sync/link-attachment
 * Link an uploaded attachment to a work item
 */
router.post('/link-attachment', async (req, res) => {
  try {
    const { workItemId, attachmentUrl, fileName, comment } = req.body;

    if (!workItemId || !attachmentUrl || !fileName) {
      return res.status(400).json({
        error: 'Missing workItemId, attachmentUrl, or fileName'
      });
    }

    const syncService = await getSyncService(req);
    await syncService.linkAttachmentToWorkItem(workItemId, attachmentUrl, fileName, comment);

    return res.json({
      success: true,
      message: `Attachment "${fileName}" linked to work item ${workItemId}`
    });
  } catch (err) {
    console.error('[Link] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sync/attachments/:workItemId
 * List all attachments for a work item (local + ADO)
 */
router.get('/attachments/:workItemId', async (req, res) => {
  try {
    const { workItemId } = req.params;

    if (!workItemId || isNaN(workItemId)) {
      return res.status(400).json({ error: 'Invalid workItemId' });
    }

    const syncService = await getSyncService(req);
    const { db } = req.app.locals;

    // Query local metadata
    const localAttachments = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, attachment_guid, file_name, file_size, sha256_hash, source, 
                sync_status, created_at, updated_at
         FROM attachment_sync_metadata 
         WHERE work_item_id = ? AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [workItemId],
        (err, rows) => err ? reject(err) : resolve(rows || [])
      );
    });

    // Fetch current from ADO
    let adoAttachments = [];
    try {
      adoAttachments = await syncService.fetchWorkItemAttachments(workItemId);
    } catch (adoErr) {
      console.warn('[ADO Fetch] Warning:', adoErr.message);
    }

    return res.json({
      workItemId,
      localAttachments,
      adoAttachments,
      syncSummary: {
        localCount: localAttachments.length,
        adoCount: adoAttachments.length,
        syncedCount: localAttachments.filter(a => a.sync_status === 'SYNCED').length,
        pendingCount: localAttachments.filter(a => a.sync_status === 'PENDING').length
      }
    });
  } catch (err) {
    console.error('[List] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sync/force-sync/:workItemId
 * Trigger full 2-way sync for a work item
 */
router.post('/force-sync/:workItemId', async (req, res) => {
  try {
    const { workItemId } = req.params;

    if (!workItemId || isNaN(workItemId)) {
      return res.status(400).json({ error: 'Invalid workItemId' });
    }

    const syncService = await getSyncService(req);

    // Start async sync (don't wait for completion)
    syncService.syncWorkItemAttachments(workItemId)
      .catch(err => console.error('[Force Sync] Error:', err.message));

    return res.json({
      success: true,
      message: `Sync started for work item ${workItemId}`,
      status: 'SYNCING'
    });
  } catch (err) {
    console.error('[Force Sync] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sync/download/:attachmentGuid
 * Download attachment from ADO
 */
router.post('/download/:attachmentGuid', async (req, res) => {
  try {
    const { attachmentGuid } = req.params;
    const { fileName = 'attachment', workItemId } = req.body;

    if (!attachmentGuid) {
      return res.status(400).json({ error: 'Missing attachmentGuid' });
    }

    const syncService = await getSyncService(req);
    const result = await syncService.downloadAttachment(attachmentGuid, fileName);

    return res.json({
      success: true,
      message: 'Attachment downloaded',
      file: result
    });
  } catch (err) {
    console.error('[Download] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sync/status/:workItemId
 * Get sync status and statistics
 */
router.get('/status/:workItemId', async (req, res) => {
  try {
    const { workItemId } = req.params;

    if (!workItemId || isNaN(workItemId)) {
      return res.status(400).json({ error: 'Invalid workItemId' });
    }

    const { db } = req.app.locals;

    // Get summary from view
    const summary = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM v_attachment_sync_summary WHERE work_item_id = ?`,
        [workItemId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    // Get recent sync jobs
    const jobs = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, job_type, status, created_at, completed_at, error_message
         FROM sync_job_queue
         WHERE work_item_id = ?
         ORDER BY created_at DESC
         LIMIT 20`,
        [workItemId],
        (err, rows) => err ? reject(err) : resolve(rows || [])
      );
    });

    // Get recent events
    const events = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, event_type, message, severity, created_at
         FROM sync_event_log
         WHERE work_item_id = ?
         ORDER BY created_at DESC
         LIMIT 20`,
        [workItemId],
        (err, rows) => err ? reject(err) : resolve(rows || [])
      );
    });

    return res.json({
      workItemId,
      summary: summary || {
        total_attachments: 0,
        synced_count: 0,
        pending_count: 0,
        failed_count: 0
      },
      recentJobs: jobs,
      recentEvents: events
    });
  } catch (err) {
    console.error('[Status] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/sync/attachments/:attachmentGuid
 * Soft-delete an attachment
 */
router.delete('/attachments/:attachmentGuid', async (req, res) => {
  try {
    const { attachmentGuid } = req.params;

    if (!attachmentGuid) {
      return res.status(400).json({ error: 'Missing attachmentGuid' });
    }

    const { db } = req.app.locals;

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE attachment_sync_metadata SET deleted_at = CURRENT_TIMESTAMP WHERE attachment_guid = ?`,
        [attachmentGuid],
        (err) => err ? reject(err) : resolve()
      );
    });

    return res.json({
      success: true,
      message: `Attachment ${attachmentGuid} deleted`
    });
  } catch (err) {
    console.error('[Delete] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/webhooks/workitem
 * Receive webhook from Azure DevOps Service Hooks
 * 
 * Expected header: x-webhook-signature (HMAC-SHA256)
 * Payload: ADO service hook event body
 */
router.post('/webhooks/workitem', authenticateWebhook, async (req, res) => {
  try {
    const payload = req.body;
    const syncService = await getSyncService(req);

    // Validate event structure
    if (!payload.eventType || !payload.resource?.id) {
      return res.status(400).json({
        error: 'Invalid webhook payload: missing eventType or resource.id'
      });
    }

    // Process webhook
    await syncService.handleWebhook(payload);

    return res.json({
      success: true,
      message: `Webhook processed: ${payload.eventType} for work item ${payload.resource.id}`
    });
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sync/deduplication/:sha256
 * Check if attachment with given hash already exists
 */
router.get('/deduplication/:sha256', async (req, res) => {
  try {
    const { sha256 } = req.params;
    const { db } = req.app.locals;

    const existing = await new Promise((resolve, reject) => {
      db.get(
        `SELECT work_item_id, attachment_guid, file_name 
         FROM attachment_sync_metadata 
         WHERE sha256_hash = ? AND deleted_at IS NULL 
         LIMIT 1`,
        [sha256],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    return res.json({
      isDuplicate: !!existing,
      attachment: existing || null
    });
  } catch (err) {
    console.error('[Dedup] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sync/upload-session/:sessionUuid
 * Check status of a chunked upload session
 */
router.get('/upload-session/:sessionUuid', async (req, res) => {
  try {
    const { sessionUuid } = req.params;
    const { db } = req.app.locals;

    const session = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM chunked_upload_sessions WHERE session_uuid = ?`,
        [sessionUuid],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    return res.json({
      sessionUuid,
      fileName: session.file_name,
      totalSize: session.total_size,
      totalChunks: session.total_chunks,
      chunksReceived: session.chunks_received,
      progress: `${session.chunks_received}/${session.total_chunks}`,
      percentComplete: Math.round((session.chunks_received / session.total_chunks) * 100)
    });
  } catch (err) {
    console.error('[Upload Session] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
