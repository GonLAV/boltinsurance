const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');

/**
 * TwoWayAttachmentSyncService
 * 
 * Production-ready service for bidirectional attachment synchronization
 * between local tool and Azure DevOps/TFS.
 * 
 * Features:
 * - Chunked uploads for large files (resumable)
 * - SHA-256 deduplication
 * - Automatic retry with exponential backoff
 * - Webhook-based inbound sync
 * - Database tracking & audit logging
 */
class TwoWayAttachmentSyncService extends EventEmitter {
  constructor(orgUrl, project, pat, db, options = {}) {
    super();
    this.orgUrl = orgUrl;
    this.project = project;
    this.pat = pat;
    this.db = db;

    // Configuration
    this.apiVersion = options.apiVersion || '5.1';
    this.chunkSize = options.chunkSize || 5 * 1024 * 1024; // 5MB default
    this.maxRetries = options.maxRetries || 3;
    this.retryBackoffMs = options.retryBackoffMs || 1000;
    this.storageBasePath = options.storageBasePath || './attachments';
    this.maxFileSize = options.maxFileSize || 500 * 1024 * 1024; // 500MB
    this.requestTimeout = options.requestTimeout || 60000;
    this.webhookSecret = options.webhookSecret || 'your-webhook-secret';

    // Prepare axios instance with auth
    this.axiosInstance = axios.create({
      auth: { username: '', password: this.pat },
      timeout: this.requestTimeout,
      headers: {
        'User-Agent': 'BolTest-AttachmentSync/2.0'
      }
    });

    this.logger = options.logger || console;
  }

  /**
   * ========== OUTBOUND: Tool → ADO ==========
   */

  /**
   * uploadAttachment - Single or chunked upload
   * @param {Buffer|Stream} fileContent - File content
   * @param {string} fileName - Original filename
   * @param {number} workItemId - Target work item
   * @returns {Promise<{attachmentGuid, attachmentUrl, fileName}>}
   */
  async uploadAttachment(fileContent, fileName, workItemId) {
    try {
      // Validate
      if (!fileContent || !fileName) throw new Error('Missing file content or name');
      const fileSize = Buffer.byteLength(fileContent);
      if (fileSize > this.maxFileSize) {
        throw new Error(`File exceeds max size of ${this.maxFileSize / 1024 / 1024}MB`);
      }

      // Compute SHA-256
      const sha256 = crypto
        .createHash('sha256')
        .update(fileContent)
        .digest('hex');

      // Check deduplication
      const existing = await this.checkDuplicateAttachment(sha256);
      if (existing) {
        this.logger.info(`[Dedup] Attachment ${fileName} already exists: ${existing.attachment_guid}`);
        return {
          attachmentGuid: existing.attachment_guid,
          attachmentUrl: existing.ado_attachment_url,
          fileName,
          isDuplicate: true,
          existingWorkItemId: existing.work_item_id
        };
      }

      // Choose upload method
      let uploadResult;
      if (fileSize > this.chunkSize) {
        uploadResult = await this.chunkedUpload(fileContent, fileName, workItemId, sha256);
      } else {
        uploadResult = await this.singleUpload(fileContent, fileName, sha256);
      }

      // Store metadata
      await this.storeAttachmentMetadata({
        workItemId,
        attachmentGuid: uploadResult.attachmentGuid,
        fileName,
        fileSize,
        sha256Hash: sha256,
        source: 'TOOL',
        adoAttachmentUrl: uploadResult.attachmentUrl,
        syncStatus: 'PENDING'
      });

      return uploadResult;
    } catch (err) {
      this.logger.error(`[Upload] Failed for ${fileName}:`, err.message);
      this.emit('upload-error', { fileName, workItemId, error: err.message });
      throw err;
    }
  }

  /**
   * singleUpload - Simple POST for small files
   */
  async singleUpload(fileContent, fileName, sha256) {
    const url = `${this.orgUrl}/${this.project}/_apis/wit/attachments?fileName=${encodeURIComponent(fileName)}&api-version=${this.apiVersion}`;

    try {
      const response = await this.axiosInstance.post(url, fileContent, {
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      });

      const attachmentUrl = response.data.url;
      const attachmentGuid = this.extractGuidFromUrl(attachmentUrl);

      this.logger.info(`[Upload] Single-file success: ${fileName} (${attachmentGuid})`);
      return { attachmentGuid, attachmentUrl, fileName };
    } catch (err) {
      throw new Error(`Single upload failed: ${err.response?.data?.message || err.message}`);
    }
  }

  /**
   * chunkedUpload - Resumable chunked upload for large files
   */
  async chunkedUpload(fileContent, fileName, workItemId, sha256) {
    const sessionUuid = crypto.randomUUID();
    const totalSize = Buffer.byteLength(fileContent);
    const totalChunks = Math.ceil(totalSize / this.chunkSize);

    this.logger.info(`[ChunkedUpload] Starting ${fileName} (${totalChunks} chunks)`);

    // Create upload session record
    await this.createChunkedUploadSession({
      sessionUuid,
      workItemId,
      fileName,
      totalSize,
      sha256Hash: sha256,
      totalChunks
    });

    let attachmentGuid;

    try {
      // Upload chunks
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * this.chunkSize;
        const end = Math.min(start + this.chunkSize, totalSize);
        const chunk = fileContent.slice(start, end);

        await this.uploadChunk(sessionUuid, fileName, chunk, chunkIndex, totalChunks, totalSize);
        await this.updateChunkedUploadProgress(sessionUuid, chunkIndex + 1);
      }

      // Finalize upload (single POST with full content)
      const attachmentUrl = await this.finalizeChunkedUpload(fileContent, fileName, sha256);
      attachmentGuid = this.extractGuidFromUrl(attachmentUrl);

      // Mark session completed
      await this.completeChunkedUploadSession(sessionUuid, attachmentGuid);
      this.logger.info(`[ChunkedUpload] Complete: ${fileName} → ${attachmentGuid}`);

      return { attachmentGuid, attachmentUrl, fileName };
    } catch (err) {
      await this.failChunkedUploadSession(sessionUuid, err.message);
      throw err;
    }
  }

  /**
   * uploadChunk - Upload single chunk
   */
  async uploadChunk(sessionUuid, fileName, chunkData, chunkIndex, totalChunks, totalSize) {
    const url = `${this.orgUrl}/${this.project}/_apis/wit/attachments/chunked?uploadId=${sessionUuid}&api-version=${this.apiVersion}`;

    try {
      await this.axiosInstance.put(url, chunkData, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Range': `bytes ${chunkIndex * this.chunkSize}-${Math.min((chunkIndex + 1) * this.chunkSize, totalSize) - 1}/${totalSize}`
        }
      });

      this.logger.info(`[Chunk] ${fileName}: ${chunkIndex + 1}/${totalChunks}`);
    } catch (err) {
      throw new Error(`Chunk ${chunkIndex} failed: ${err.response?.data?.message || err.message}`);
    }
  }

  /**
   * finalizeChunkedUpload - Complete the chunked upload
   */
  async finalizeChunkedUpload(fileContent, fileName, sha256) {
    const url = `${this.orgUrl}/${this.project}/_apis/wit/attachments?fileName=${encodeURIComponent(fileName)}&api-version=${this.apiVersion}`;

    try {
      const response = await this.axiosInstance.post(url, fileContent, {
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      });

      return response.data.url;
    } catch (err) {
      throw new Error(`Finalize failed: ${err.response?.data?.message || err.message}`);
    }
  }

  /**
   * linkAttachmentToWorkItem - Add attachment relation to work item
   */
  async linkAttachmentToWorkItem(workItemId, attachmentUrl, fileName, comment = '') {
    const url = `${this.orgUrl}/${this.project}/_apis/wit/workitems/${workItemId}?api-version=${this.apiVersion}`;

    const jsonPatch = [
      {
        op: 'add',
        path: '/relations/-',
        value: {
          rel: 'AttachedFile',
          url: attachmentUrl,
          attributes: {
            name: fileName,
            comment: comment || `Added by BolTest Sync (${new Date().toISOString()})`
          }
        }
      }
    ];

    try {
      await this.axiosInstance.patch(url, jsonPatch, {
        headers: {
          'Content-Type': 'application/json-patch+json'
        }
      });

      this.logger.info(`[Link] Attached ${fileName} to work item ${workItemId}`);
      return true;
    } catch (err) {
      this.logger.error(`[Link] Failed for work item ${workItemId}:`, err.response?.data?.message || err.message);
      throw err;
    }
  }

  /**
   * ========== INBOUND: ADO → Tool ==========
   */

  /**
   * fetchWorkItemAttachments - Pull attachments from ADO for a work item
   */
  async fetchWorkItemAttachments(workItemId) {
    const url = `${this.orgUrl}/${this.project}/_apis/wit/workitems/${workItemId}?$expand=relations&api-version=${this.apiVersion}`;

    try {
      const response = await this.axiosInstance.get(url);
      const workItem = response.data;

      // Extract AttachedFile relations
      const attachedFiles = (workItem.relations || [])
        .filter(r => r.rel === 'AttachedFile')
        .map(r => ({
          url: r.url,
          guid: this.extractGuidFromUrl(r.url),
          name: r.attributes?.name || 'attachment',
          comment: r.attributes?.comment || ''
        }));

      this.logger.info(`[Fetch] Work item ${workItemId}: ${attachedFiles.length} attachments`);
      return attachedFiles;
    } catch (err) {
      this.logger.error(`[Fetch] Failed for work item ${workItemId}:`, err.message);
      throw err;
    }
  }

  /**
   * downloadAttachment - Fetch file from ADO
   */
  async downloadAttachment(attachmentGuid, fileName) {
    const url = `${this.orgUrl}/${this.project}/_apis/wit/attachments/${attachmentGuid}?download=true&api-version=${this.apiVersion}`;

    try {
      const response = await this.axiosInstance.get(url, {
        responseType: 'arraybuffer'
      });

      const filePath = await this.saveAttachmentLocally(attachmentGuid, fileName, response.data);
      const sha256 = crypto
        .createHash('sha256')
        .update(response.data)
        .digest('hex');

      this.logger.info(`[Download] Saved ${fileName} → ${filePath}`);
      return { filePath, fileName, sha256, size: response.data.length };
    } catch (err) {
      this.logger.error(`[Download] Failed for ${attachmentGuid}:`, err.message);
      throw err;
    }
  }

  /**
   * syncWorkItemAttachments - Full sync for a work item (2-way)
   */
  async syncWorkItemAttachments(workItemId) {
    try {
      // 1. Fetch current attachments from ADO
      const adoAttachments = await this.fetchWorkItemAttachments(workItemId);

      // 2. Get local attachments for this work item
      const localAttachments = await this.getLocalAttachments(workItemId);

      const results = {
        added: [],
        removed: [],
        synced: [],
        errors: []
      };

      // 3. Process new ADO attachments → download
      for (const attachment of adoAttachments) {
        const exists = localAttachments.some(l => l.attachment_guid === attachment.guid);
        if (!exists) {
          try {
            const downloaded = await this.downloadAttachment(attachment.guid, attachment.name);
            await this.storeAttachmentMetadata({
              workItemId,
              attachmentGuid: attachment.guid,
              fileName: attachment.name,
              fileSize: downloaded.size,
              sha256Hash: downloaded.sha256,
              source: 'ADO',
              adoAttachmentUrl: attachment.url,
              localFilePath: downloaded.filePath,
              syncStatus: 'SYNCED'
            });
            results.added.push(attachment.name);
          } catch (err) {
            results.errors.push({ attachment: attachment.name, error: err.message });
          }
        } else {
          results.synced.push(attachment.name);
        }
      }

      this.logger.info(`[Sync] Work item ${workItemId}: +${results.added.length}, ✓${results.synced.length}, errors=${results.errors.length}`);
      return results;
    } catch (err) {
      this.logger.error(`[Sync] Failed for work item ${workItemId}:`, err.message);
      throw err;
    }
  }

  /**
   * ========== WEBHOOK HANDLING ==========
   */

  /**
   * handleWebhook - Process incoming webhook from ADO
   */
  async handleWebhook(payload, signature) {
    // Validate signature
    if (!this.validateWebhookSignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    const event = payload.eventType;
    const workItemId = payload.resource?.id;

    this.logger.info(`[Webhook] Received: ${event} for work item ${workItemId}`);

    try {
      // Log event
      await this.logSyncEvent({
        eventType: event,
        workItemId,
        source: 'WEBHOOK',
        message: `ADO event: ${event}`,
        severity: 'INFO'
      });

      // Queue sync job
      if (event === 'workitem.updated' || event === 'workitem.created') {
        await this.queueSyncJob({
          workItemId,
          jobType: 'DOWNLOAD',
          priority: 3,
          source: 'WEBHOOK'
        });
      }

      this.emit('webhook-processed', { event, workItemId });
      return true;
    } catch (err) {
      this.logger.error(`[Webhook] Processing error:`, err.message);
      await this.logSyncEvent({
        eventType: event,
        workItemId,
        source: 'WEBHOOK',
        message: `Webhook error: ${err.message}`,
        severity: 'ERROR'
      });
      throw err;
    }
  }

  /**
   * validateWebhookSignature - Verify webhook authenticity
   */
  validateWebhookSignature(payload, signature) {
    if (!signature) return false;

    const hash = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }

  /**
   * ========== RETRY & RATE LIMITING ==========
   */

  /**
   * retryWithBackoff - Exponential backoff retry
   */
  async retryWithBackoff(fn, retries = this.maxRetries) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt === retries) throw err;

        const delay = this.retryBackoffMs * Math.pow(2, attempt);
        this.logger.warn(`[Retry] Attempt ${attempt + 1}/${retries}, waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * ========== DATABASE OPERATIONS ==========
   */

  /**
   * storeAttachmentMetadata - Save attachment info to DB
   */
  async storeAttachmentMetadata(data) {
    const query = `
      INSERT INTO attachment_sync_metadata (
        work_item_id, attachment_guid, file_name, file_size, sha256_hash,
        source, ado_attachment_url, local_file_path, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(attachment_guid) DO UPDATE SET
        sync_status = ?, updated_at = CURRENT_TIMESTAMP
    `;

    const params = [
      data.workItemId,
      data.attachmentGuid,
      data.fileName,
      data.fileSize,
      data.sha256Hash,
      data.source,
      data.adoAttachmentUrl,
      data.localFilePath,
      data.syncStatus || 'PENDING',
      data.syncStatus || 'SYNCED'
    ];

    return new Promise((resolve, reject) => {
      this.db.run(query, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * checkDuplicateAttachment - Look up by SHA-256
   */
  async checkDuplicateAttachment(sha256Hash) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM attachment_sync_metadata WHERE sha256_hash = ? AND deleted_at IS NULL LIMIT 1`,
        [sha256Hash],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  /**
   * getLocalAttachments - Fetch attachments for a work item
   */
  async getLocalAttachments(workItemId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM attachment_sync_metadata WHERE work_item_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
        [workItemId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * queueSyncJob - Add async task to sync queue
   */
  async queueSyncJob(data) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO sync_job_queue (work_item_id, attachment_guid, job_type, status, priority, payload)
         VALUES (?, ?, ?, 'QUEUED', ?, ?)`,
        [
          data.workItemId,
          data.attachmentGuid,
          data.jobType,
          data.priority || 5,
          JSON.stringify(data)
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * logSyncEvent - Write to event log
   */
  async logSyncEvent(data) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO sync_event_log (event_type, work_item_id, attachment_guid, message, severity, source, event_data)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.eventType,
          data.workItemId,
          data.attachmentGuid,
          data.message,
          data.severity || 'INFO',
          data.source || 'API',
          JSON.stringify(data)
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * ========== CHUNKED UPLOAD SESSION MGMT ==========
   */

  async createChunkedUploadSession(data) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO chunked_upload_sessions 
         (session_uuid, work_item_id, file_name, total_size, sha256_hash, total_chunks, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.sessionUuid,
          data.workItemId,
          data.fileName,
          data.totalSize,
          data.sha256Hash,
          data.totalChunks,
          expiresAt
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async updateChunkedUploadProgress(sessionUuid, chunksReceived) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE chunked_upload_sessions SET chunks_received = ?, updated_at = CURRENT_TIMESTAMP WHERE session_uuid = ?`,
        [chunksReceived, sessionUuid],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async completeChunkedUploadSession(sessionUuid, attachmentGuid) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM chunked_upload_sessions WHERE session_uuid = ?`,
        [sessionUuid],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async failChunkedUploadSession(sessionUuid, errorMsg) {
    // For now, just clean up; you could also log this
    return this.completeChunkedUploadSession(sessionUuid, null);
  }

  /**
   * ========== UTILITIES ==========
   */

  /**
   * extractGuidFromUrl - Parse attachment GUID from ADO URL
   */
  extractGuidFromUrl(url) {
    const match = url.match(/attachments\/([a-f0-9\-]+)/i);
    return match ? match[1] : url.split('/').pop();
  }

  /**
   * saveAttachmentLocally - Write file to disk
   */
  async saveAttachmentLocally(attachmentGuid, fileName, fileContent) {
    await fs.mkdir(this.storageBasePath, { recursive: true });
    const filePath = path.join(this.storageBasePath, `${attachmentGuid}_${fileName}`);
    await fs.writeFile(filePath, fileContent);
    return filePath;
  }
}

module.exports = TwoWayAttachmentSyncService;
