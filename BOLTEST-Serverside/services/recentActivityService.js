const axios = require('axios');
const Logger = require('../utils/Logger');

/**
 * Lightweight helper to fetch recent work item activity for the signed-in user.
 * Uses PAT-based basic auth (same authHeader style as other services).
 */
class RecentActivityService {
  constructor(orgUrl, authHeader, httpsAgent, apiVersion = '7.1') {
    this.orgUrl = orgUrl;
    this.authHeader = authHeader;
    this.httpsAgent = httpsAgent;
    this.apiVersion = apiVersion;
  }

  /**
   * Get recent work item activities (Account My Work Recent Activity – List).
   * @returns {Promise<Array>} Array of recent activity items (AccountRecentActivityWorkItemModel2[])
   */
  async getRecentActivity() {
    try {
      const url = `${this.orgUrl}/_apis/work/accountmyworkrecentactivity?api-version=${this.apiVersion}`;
      Logger.info('Fetching recent work item activity', { url });

      const response = await axios.get(url, {
        headers: { Authorization: this.authHeader },
        httpsAgent: this.httpsAgent,
      });

      return response.data; // array of recent activity models
    } catch (error) {
      Logger.error('Failed to fetch recent work item activity', { error: error.message });
      throw error;
    }
  }
}

module.exports = RecentActivityService;
