const axios = require('axios');
const Logger = require('../utils/logger');

/**
 * Comprehensive Attachment Sync Service
 * Handles bidirectional sync between Custom Tool ↔ Azure DevOps (TFS)
 * 
 * Features:
 * - Upload attachments to TFS
 * - Link attachments to Work Items
 * - Download attachments from TFS
 * - List attachments from Work Items
 * - Retry logic with exponential backoff
 * - Comprehensive error handling
 */
class AttachmentSyncService {
  constructor(orgUrl, project, pat, httpsAgent, apiVersion = null) {
    this.orgUrl = orgUrl;
    this.project = project;
    this.pat = pat;
    this.httpsAgent = httpsAgent;
    // Use environment-configured API version or default to 5.1 for TFS Server compatibility
    this.apiVersion = apiVersion || process.env.AZDO_API_VERSION || '5.1';
    this.authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
    this.maxRetries = 3;
    this.retryDelay = 1000; // ms
    
    Logger.info('[ATTACH-SYNC] Service initialized', {
      orgUrl: orgUrl.substring(0, 50),
      project,
      apiVersion: this.apiVersion,
      maxRetries: this.maxRetries
    });
  }

  /**
   * STEP 1: Upload file to Azure DevOps (returns attachment reference)
   * @param {Buffer} fileBuffer - File content
   * @param {Object} opts - { fileName, mimeType }
   * @returns {Promise<Object>} { id, url }
   */
  async uploadAttachmentToTFS(fileBuffer, opts = {}) {
    const { fileName = 'attachment' } = opts;

    // TFS/Azure DevOps attachment uploads expect RAW BYTES.
    // Using application/octet-stream is the most compatible option across on-prem versions.
    const contentType = 'application/octet-stream';

    const buildUploadUrl = ({ includeProject, apiVersion }) => {
      const base = includeProject
        ? `${this.orgUrl}/${this.project}/_apis/wit/attachments`
        : `${this.orgUrl}/_apis/wit/attachments`;
      return `${base}?fileName=${encodeURIComponent(fileName)}&api-version=${encodeURIComponent(apiVersion)}`;
    };

    const primaryUrl = buildUploadUrl({ includeProject: true, apiVersion: this.apiVersion });
    
    Logger.info('[ATTACH-SYNC] Step 1: Uploading attachment to TFS', {
      fileName,
      fileSize: fileBuffer.length,
      url: primaryUrl.substring(0, 100) + '...',
      contentType,
      apiVersion: this.apiVersion
    });

    try {
      const doPost = (uploadUrl) => this._retryRequest(() =>
        axios.post(uploadUrl, fileBuffer, {
          headers: {
            Authorization: this.authHeader,
            'Content-Type': contentType
          },
          httpsAgent: this.httpsAgent,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 30000
        })
      );

      let response;
      try {
        // Most common (and preferred) form: {collection}/{project}/_apis/...
        response = await doPost(primaryUrl);
      } catch (firstErr) {
        const status = firstErr?.response?.status;

        // Some on-prem instances are picky; try without project, and/or older api-version.
        const candidates = [];
        candidates.push(buildUploadUrl({ includeProject: false, apiVersion: this.apiVersion }));
        if (String(this.apiVersion) !== '5.0') {
          candidates.push(buildUploadUrl({ includeProject: true, apiVersion: '5.0' }));
          candidates.push(buildUploadUrl({ includeProject: false, apiVersion: '5.0' }));
        }

        if (status === 400 || status === 404) {
          let lastErr = firstErr;
          for (const candidateUrl of candidates) {
            try {
              response = await doPost(candidateUrl);
              break;
            } catch (candidateErr) {
              lastErr = candidateErr;
            }
          }

          if (!response) {
            throw lastErr;
          }
        } else {
          throw firstErr;
        }
      }

      const { id, url: attachmentUrl } = response.data;
      Logger.info('[ATTACH-SYNC] ✅ Step 1 SUCCESS: Attachment uploaded to TFS', {
        attachmentId: id,
        attachmentUrl,
        apiVersion: this.apiVersion
      });

      return { id, url: attachmentUrl };
    } catch (error) {
      const status = error.response?.status;
      const details = error.response?.data;
      
      // Provide specific guidance for common errors
      let guidance = '';
      if (status === 400) {
        guidance = 'HTTP 400: Verify (1) API version compatibility with your TFS (try 5.0 or 5.1), (2) Correct URL format: orgUrl/project/_apis/wit/attachments, (3) File sent as raw binary with Content-Type: application/octet-stream';
      } else if (status === 401) {
        guidance = 'HTTP 401: Check PAT token validity and Base64 encoding';
      } else if (status === 403) {
        guidance = 'HTTP 403: Verify PAT has Work Items Read & Write scope';
      }
      
      Logger.error('[ATTACH-SYNC] ❌ Step 1 FAILED: Upload to TFS', {
        error: error.message,
        status,
        fileName,
        apiVersion: this.apiVersion,
        responseData: details,
        guidance
      });
      throw error;
    }
  }

  /**
   * STEP 2: Link attachment to a Work Item
   * @param {number} workItemId - Work Item ID
   * @param {string} attachmentUrl - URL from Step 1
   * @param {Object} opts - { comment }
   * @returns {Promise<Object>} Work Item patch response
   */
  async linkAttachmentToWorkItem(workItemId, attachmentUrl, opts = {}) {
    const { comment = 'Uploaded from BOLTEST' } = opts;

    const url = `${this.orgUrl}/${this.project}/_apis/wit/workitems/${workItemId}?api-version=${this.apiVersion}`;

    const patchBody = [
      {
        op: 'add',
        path: '/relations/-',
        value: {
          rel: 'AttachedFile',
          url: attachmentUrl,
          attributes: { comment }
        }
      }
    ];

    Logger.info('[ATTACH-SYNC] Step 2: Linking attachment to Work Item', {
      workItemId,
      attachmentUrl: attachmentUrl.substring(0, 80) + '...',
      comment
    });

    try {
      const response = await this._retryRequest(() =>
        axios.patch(url, patchBody, {
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/json-patch+json'
          },
          httpsAgent: this.httpsAgent,
          timeout: 15000
        })
      );

      Logger.info('[ATTACH-SYNC] ✅ Step 2 SUCCESS: Attachment linked to Work Item', {
        workItemId,
        relations: response.data?.relations ? response.data.relations.length : 0
      });

      return response.data;
    } catch (error) {
      Logger.error('[ATTACH-SYNC] ❌ Step 2 FAILED: Link to Work Item', {
        error: error.message,
        status: error.response?.status,
        workItemId,
        responseData: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Complete upload + link flow (2 steps combined)
   * @param {Buffer} fileBuffer - File content
   * @param {number} workItemId - Work Item to attach to
   * @param {Object} opts - { fileName, comment }
   * @returns {Promise<Object>} { attachmentId, attachmentUrl, workItemId }
   */
  async uploadAndLinkAttachment(fileBuffer, workItemId, opts = {}) {
    const { fileName = 'attachment', comment } = opts;

    Logger.info('[ATTACH-SYNC] Starting complete upload + link flow', {
      workItemId,
      fileName,
      fileSize: fileBuffer.length
    });

    try {
      // Step 1: Upload
      const { id: attachmentId, url: attachmentUrl } = await this.uploadAttachmentToTFS(fileBuffer, {
        fileName,
        mimeType: this._getMimeType(fileName)
      });

      // Step 2: Link
      await this.linkAttachmentToWorkItem(workItemId, attachmentUrl, { comment });

      Logger.info('[ATTACH-SYNC] ✅ COMPLETE FLOW SUCCESS', {
        attachmentId,
        workItemId
      });

      return {
        success: true,
        attachmentId,
        attachmentUrl,
        workItemId,
        linkedAt: new Date().toISOString()
      };
    } catch (error) {
      Logger.error('[ATTACH-SYNC] ❌ COMPLETE FLOW FAILED', {
        error: error.message,
        workItemId,
        fileName
      });
      throw error;
    }
  }

  /**
   * STEP 3: Download/Retrieve attachment from TFS
   * @param {string} attachmentId - Attachment GUID
   * @returns {Promise<Object>} { data: Buffer, contentType, fileName }
   */
  async downloadAttachmentFromTFS(attachmentId) {
    const url = `${this.orgUrl}/${this.project}/_apis/wit/attachments/${attachmentId}?api-version=${this.apiVersion}`;

    Logger.info('[ATTACH-SYNC] Step 3: Downloading attachment from TFS', {
      attachmentId
    });

    try {
      const response = await this._retryRequest(() =>
        axios.get(url, {
          headers: { Authorization: this.authHeader },
          httpsAgent: this.httpsAgent,
          responseType: 'arraybuffer',
          timeout: 30000
        })
      );

      Logger.info('[ATTACH-SYNC] ✅ Step 3 SUCCESS: Attachment downloaded', {
        attachmentId,
        size: response.data.length,
        contentType: response.headers['content-type']
      });

      const contentDisposition = response.headers['content-disposition'];
      const fileNameFromHeader = this._extractFileNameFromContentDisposition(contentDisposition);

      return {
        data: Buffer.from(response.data),
        contentType: response.headers['content-type'],
        fileName: fileNameFromHeader || attachmentId
      };
    } catch (error) {
      Logger.error('[ATTACH-SYNC] ❌ Step 3 FAILED: Download from TFS', {
        error: error.message,
        status: error.response?.status,
        attachmentId
      });
      throw error;
    }
  }

  /**
   * STEP 4: Get Work Item with relations (fetch all attachments from a work item)
   * @param {number} workItemId - Work Item ID
   * @returns {Promise<Object>} Work Item with relations array
   */
  async getWorkItemWithAttachments(workItemId) {
    const url = `${this.orgUrl}/${this.project}/_apis/wit/workitems/${workItemId}?$expand=relations&api-version=${this.apiVersion}`;

    Logger.info('[ATTACH-SYNC] Step 4: Fetching Work Item with attachments', {
      workItemId
    });

    try {
      const response = await this._retryRequest(() =>
        axios.get(url, {
          headers: { Authorization: this.authHeader },
          httpsAgent: this.httpsAgent,
          timeout: 15000
        })
      );

      const workItem = response.data;
      const attachmentRelations = (workItem.relations || []).filter(r => r.rel === 'AttachedFile');

      Logger.info('[ATTACH-SYNC] ✅ Step 4 SUCCESS: Work Item fetched', {
        workItemId,
        totalRelations: workItem.relations ? workItem.relations.length : 0,
        attachmentCount: attachmentRelations.length
      });

      return {
        workItem,
        attachments: attachmentRelations.map(rel => ({
          url: rel.url,
          comment: rel.attributes?.comment || 'No comment',
          id: this._extractAttachmentIdFromUrl(rel.url),
          fileName: this._extractFileNameFromAttachmentUrl(rel.url)
        }))
      };
    } catch (error) {
      Logger.error('[ATTACH-SYNC] ❌ Step 4 FAILED: Fetch Work Item', {
        error: error.message,
        status: error.response?.status,
        workItemId
      });
      throw error;
    }
  }

  /**
   * Full sync flow: Download all attachments from a Work Item back to the tool
   * @param {number} workItemId - Work Item ID
   * @returns {Promise<Array>} Array of { id, url, data, contentType, fileName }
   */
  async syncAttachmentsFromTFS(workItemId) {
    Logger.info('[ATTACH-SYNC] Starting sync FROM TFS', { workItemId });

    try {
      // Fetch work item with attachment relations
      const { attachments } = await this.getWorkItemWithAttachments(workItemId);

      if (attachments.length === 0) {
        Logger.info('[ATTACH-SYNC] No attachments found on Work Item', { workItemId });
        return [];
      }

      Logger.info('[ATTACH-SYNC] Found attachments on TFS', {
        workItemId,
        count: attachments.length
      });

      // Download each attachment
      const downloadedAttachments = await Promise.all(
        attachments.map(async (attachment) => {
          try {
            const downloaded = await this.downloadAttachmentFromTFS(attachment.id);
            return {
              id: attachment.id,
              url: attachment.url,
              comment: attachment.comment,
              fileName: attachment.fileName || downloaded.fileName || attachment.id,
              ...downloaded
            };
          } catch (error) {
            Logger.error('[ATTACH-SYNC] Failed to download individual attachment', {
              attachmentId: attachment.id,
              error: error.message
            });
            return null;
          }
        })
      );

      const successful = downloadedAttachments.filter(a => a !== null);

      Logger.info('[ATTACH-SYNC] ✅ SYNC FROM TFS COMPLETE', {
        workItemId,
        requested: attachments.length,
        downloaded: successful.length
      });

      return successful;
    } catch (error) {
      Logger.error('[ATTACH-SYNC] ❌ SYNC FROM TFS FAILED', {
        error: error.message,
        workItemId
      });
      throw error;
    }
  }

  /**
   * Retry a request with exponential backoff
   * @private
   */
  async _retryRequest(requestFn, attempt = 0) {
    try {
      return await requestFn();
    } catch (error) {
      if (attempt < this.maxRetries && this._isRetryableError(error)) {
        const delay = this.retryDelay * Math.pow(2, attempt);
        Logger.warn(`[ATTACH-SYNC] Retrying request (attempt ${attempt + 1}/${this.maxRetries})`, {
          delay,
          error: error.message
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        return this._retryRequest(requestFn, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Determine if error is retryable
   * @private
   */
  _isRetryableError(error) {
    const status = error.response?.status;
    // Retry on 408 (timeout), 429 (rate limit), 500, 502, 503, 504
    return status === 408 || status === 429 || (status >= 500 && status < 600);
  }

  /**
   * Get MIME type from file extension
   * @private
   */
  _getMimeType(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeMap = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'zip': 'application/zip',
      'txt': 'text/plain',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'json': 'application/json'
    };
    return mimeMap[ext] || 'application/octet-stream';
  }

  /**
   * Extract attachment ID from TFS URL
   * @private
   */
  _extractAttachmentIdFromUrl(url) {
    const match = url.match(/attachments\/([^?]+)/);
    return match ? match[1] : url;
  }

  _extractFileNameFromAttachmentUrl(url) {
    try {
      const parsed = new URL(url);
      const fileName = parsed.searchParams.get('fileName');
      return fileName || null;
    } catch {
      return null;
    }
  }

  _extractFileNameFromContentDisposition(contentDisposition) {
    if (!contentDisposition) return null;
    // Typical: attachment; filename="foo.txt" OR attachment; filename*=UTF-8''foo.txt
    const matchStar = contentDisposition.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
    if (matchStar && matchStar[1]) return decodeURIComponent(matchStar[1].trim().replace(/^"|"$/g, ''));
    const match = contentDisposition.match(/filename=([^;]+)/i);
    if (match && match[1]) return match[1].trim().replace(/^"|"$/g, '');
    return null;
  }
}

module.exports = AttachmentSyncService;
