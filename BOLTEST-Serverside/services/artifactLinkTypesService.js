const axios = require('axios');
const Logger = require('../utils/Logger');

/**
 * Fetches outbound artifact link types (/_apis/wit/artifactlinktypes).
 */
class ArtifactLinkTypesService {
  constructor(orgUrl, authHeader, httpsAgent, apiVersion = '7.1') {
    this.orgUrl = orgUrl;
    this.authHeader = authHeader;
    this.httpsAgent = httpsAgent;
    this.apiVersion = apiVersion;
  }

  /**
   * Get list of artifact link types.
   * @returns {Promise<Object>} { count, value: WorkArtifactLink[] }
   */
  async listArtifactLinkTypes() {
    try {
      const url = `${this.orgUrl}/_apis/wit/artifactlinktypes?api-version=${this.apiVersion}`;
      Logger.info('Fetching artifact link types', { url });

      const response = await axios.get(url, {
        headers: { Authorization: this.authHeader },
        httpsAgent: this.httpsAgent,
      });

      return response.data;
    } catch (error) {
      Logger.error('Failed to fetch artifact link types', { error: error.message });
      throw error;
    }
  }
}

module.exports = ArtifactLinkTypesService;
