const axios = require('axios');

/**
 * Wiki Attachment Service
 * Handles file attachments for Azure DevOps Wiki pages
 * 
 * API: PUT /{organization}/{project}/_apis/wiki/wikis/{wikiIdentifier}/attachments?name={name}&api-version=7.1
 */
class WikiAttachmentService {
  constructor(orgUrl, project, authHeader, httpsAgent, apiVersion = '7.1') {
    this.orgUrl = orgUrl;
    this.project = project;
    this.authHeader = authHeader;
    this.httpsAgent = httpsAgent;
    this.apiVersion = apiVersion;
  }

  /**
   * Upload attachment to wiki
   * @param {Buffer} fileBuffer - File content
   * @param {Object} options - Options: { fileName, wikiIdentifier (default: 'wiki') }
   * @returns {Promise<Object>} - { name, path, version }
   */
  async uploadAttachment(fileBuffer, options = {}) {
    try {
      const { fileName, wikiIdentifier = 'wiki' } = options;

      const url = `${this.orgUrl}/${this.project}/_apis/wiki/wikis/${wikiIdentifier}/attachments?name=${encodeURIComponent(fileName)}&api-version=${this.apiVersion}`;

      const response = await axios.put(url, fileBuffer, {
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/octet-stream',
        },
        httpsAgent: this.httpsAgent,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      if (response.status === 201) {
        return {
          name: response.data.name,
          path: response.data.path,
          version: response.headers.etag, // ETag contains version
        };
      }

      return { success: false, error: `Unexpected status: ${response.status}` };
    } catch (error) {
      console.error('Wiki attachment upload error:', error.message);
      throw error;
    }
  }

  /**
   * Get wiki attachment
   * @param {string} wikiIdentifier - Wiki ID or name
   * @param {string} attachmentPath - Attachment path (e.g., '/.attachments/image.png')
   * @returns {Promise<Object>} - Attachment metadata
   */
  async getAttachment(wikiIdentifier = 'wiki', attachmentPath) {
    try {
      const url = `${this.orgUrl}/${this.project}/_apis/wiki/wikis/${wikiIdentifier}/attachments?path=${encodeURIComponent(attachmentPath)}&api-version=${this.apiVersion}`;

      const response = await axios.get(url, {
        headers: {
          'Authorization': this.authHeader,
        },
        httpsAgent: this.httpsAgent,
      });

      return response.data;
    } catch (error) {
      console.error('Get wiki attachment error:', error.message);
      throw error;
    }
  }

  /**
   * Delete wiki attachment
   * @param {string} wikiIdentifier - Wiki ID or name
   * @param {string} attachmentPath - Attachment path (e.g., '/.attachments/image.png')
   * @returns {Promise<boolean>} - Success
   */
  async deleteAttachment(wikiIdentifier = 'wiki', attachmentPath) {
    try {
      const url = `${this.orgUrl}/${this.project}/_apis/wiki/wikis/${wikiIdentifier}/attachments?path=${encodeURIComponent(attachmentPath)}&api-version=${this.apiVersion}`;

      const response = await axios.delete(url, {
        headers: {
          'Authorization': this.authHeader,
        },
        httpsAgent: this.httpsAgent,
      });

      return response.status === 204;
    } catch (error) {
      console.error('Delete wiki attachment error:', error.message);
      throw error;
    }
  }
}

module.exports = WikiAttachmentService;
