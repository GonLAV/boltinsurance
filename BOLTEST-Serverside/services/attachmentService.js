const axios = require('axios');
const Logger = require('../utils/logger');

/**
 * Handles attachment uploads to Azure DevOps work items.
 * Supports simple upload; for large files, call with uploadType='chunked' to initiate chunked upload.
 */
class AttachmentService {
  constructor(orgUrl, project, authHeader, httpsAgent, apiVersion = '7.1') {
    this.orgUrl = orgUrl;
    this.project = project;
    this.authHeader = authHeader;
    this.httpsAgent = httpsAgent;
    this.apiVersion = apiVersion;
  }

  /**
   * Upload an attachment (simple or chunked start).
   * @param {Buffer|Uint8Array|string} content Binary/text content to upload.
   * @param {Object} opts Optional params: { fileName, uploadType, areaPath }
   * @returns {Promise<Object>} AttachmentReference { id, url }
   */
  async uploadAttachment(content, opts = {}) {
    const { fileName, uploadType, areaPath } = opts;
    const query = new URLSearchParams({ 'api-version': this.apiVersion });
    if (fileName) query.set('fileName', fileName);
    if (uploadType) query.set('uploadType', uploadType); // 'Simple' or 'Chunked'
    if (areaPath) query.set('areaPath', areaPath);

    // orgUrl already includes /tfs/Collection, so just append /project/_apis/wit/attachments
    const base = `${this.orgUrl}/${this.project}/_apis/wit/attachments`;
    const url = `${base}?${query.toString()}`;

    try {
      Logger.info('Uploading attachment to TFS', { 
        url, 
        fileName, 
        uploadType,
        apiVersion: this.apiVersion,
        authHeaderPrefix: this.authHeader.substring(0, 20) + '...',
        contentLength: content ? content.length : 0
      });
      
      const response = await axios.post(url, content, {
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/octet-stream',
        },
        httpsAgent: this.httpsAgent,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      
      Logger.info('✅ Attachment upload SUCCESS', { 
        statusCode: response.status,
        statusText: response.statusText,
        responseId: response.data?.id,
        responseUrl: response.data?.url
      });
      
      return response.data;
    } catch (error) {
      const errorDetails = {
        message: error.message,
        fileName,
        uploadType,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        responseHeaders: error.response?.headers ? Object.keys(error.response.headers) : [],
        url: url,
        authHeaderFormat: `Basic base64(:PAT)`,
        authHeaderLength: this.authHeader.length
      };
      
      Logger.error('❌ Failed to upload attachment to TFS', errorDetails);
      throw error;
    }
  }

  /**
   * Download an attachment by id.
   * @param {string} id Attachment ID (GUID)
   * @param {Object} opts Optional params: { fileName, download }
   * @returns {Promise<{ data: Buffer, contentType: string | undefined }>}
   */
  async getAttachment(id, opts = {}) {
    const { fileName, download } = opts;
    const query = new URLSearchParams({ 'api-version': this.apiVersion });
    if (fileName) query.set('fileName', fileName);
    if (typeof download === 'boolean') query.set('download', String(download));

    const base = `${this.orgUrl}/${this.project}/_apis/wit/attachments/${id}`;
    const url = `${base}?${query.toString()}`;

    try {
      Logger.info('Downloading attachment', { id, url });
      const response = await axios.get(url, {
        headers: { Authorization: this.authHeader },
        httpsAgent: this.httpsAgent,
        responseType: 'arraybuffer', // ensure binary preserved
      });

      return {
        data: Buffer.from(response.data),
        contentType: response.headers['content-type'],
      };
    } catch (error) {
      Logger.error('Failed to download attachment', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Upload a chunk to an existing attachment upload session.
   * @param {string} id Attachment ID returned from chunked start
   * @param {Buffer|Uint8Array|string} chunk Chunk content
   * @param {Object} opts Optional params: { fileName, contentRange }
   *        contentRange: string ("bytes 0-39999/50000") or { start, end, total }
   * @returns {Promise<Object>} AttachmentReference { id, url }
   */
  async uploadAttachmentChunk(id, chunk, opts = {}) {
    const { fileName, contentRange } = opts;
    if (!id) throw new Error('Attachment id is required for chunk upload');

    const rangeHeader = (() => {
      if (typeof contentRange === 'string') return contentRange.trim();
      if (contentRange && typeof contentRange === 'object') {
        const { start, end, total } = contentRange;
        const nums = [start, end, total];
        if (nums.every(v => Number.isFinite(v))) return `bytes ${start}-${end}/${total}`;
      }
      return null;
    })();

    if (!rangeHeader) {
      throw new Error('contentRange is required (e.g., "bytes 0-39999/50000" or { start, end, total })');
    }

    const query = new URLSearchParams({ 'api-version': this.apiVersion });
    if (fileName) query.set('fileName', fileName);

    const base = `${this.orgUrl}/${this.project}/_apis/wit/attachments/${id}`;
    const url = `${base}?${query.toString()}`;

    try {
      Logger.info('Uploading attachment chunk', { id, url, range: rangeHeader });
      const response = await axios.put(url, chunk, {
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/octet-stream',
          'Content-Range': rangeHeader,
        },
        httpsAgent: this.httpsAgent,
      });

      return response.data;
    } catch (error) {
      Logger.error('Failed to upload attachment chunk', { id, error: error.message });
      throw error;
    }
  }
}

module.exports = AttachmentService;
