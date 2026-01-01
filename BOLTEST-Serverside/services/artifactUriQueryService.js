const axios = require('axios');
const Logger = require('../utils/Logger');

/**
 * Queries work items linked to a list of artifact URIs.
 */
class ArtifactUriQueryService {
  constructor(orgUrl, project, authHeader, httpsAgent, apiVersion = '7.1') {
    this.orgUrl = orgUrl;
    this.project = project;
    this.authHeader = authHeader;
    this.httpsAgent = httpsAgent;
    this.apiVersion = apiVersion;
  }

  /**
   * Query work items by artifact URIs.
   * @param {string[]} artifactUris List of artifact URIs
   * @returns {Promise<Object>} ArtifactUriQueryResult { artifactUrisQueryResult: { [uri]: [{id,url}, ...] } }
   */
  async queryByArtifactUris(artifactUris) {
    try {
      const url = `${this.orgUrl}/${this.project}/_apis/wit/artifacturiquery?api-version=${this.apiVersion}`;
      Logger.info('Querying work items by artifact URIs', { url, count: artifactUris?.length || 0 });

      const payload = { artifactUris };

      const response = await axios.post(url, payload, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent,
      });

      return response.data;
    } catch (error) {
      Logger.error('Failed to query work items by artifact URIs', { error: error.message });
      throw error;
    }
  }
}

module.exports = ArtifactUriQueryService;
