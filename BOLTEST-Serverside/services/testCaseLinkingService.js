const axios = require('axios');
const Logger = require('../utils/Logger');

/**
 * Service to handle Test Case linking and parent story retrieval
 * Focuses on direct API calls rather than complex WIQL queries
 */
class TestCaseLinkingService {
  constructor(orgUrl, project, authHeader, httpsAgent, apiVersion = '5.0') {
    this.orgUrl = orgUrl;
    this.project = project;
    this.authHeader = authHeader;
    this.httpsAgent = httpsAgent;
    this.apiVersion = apiVersion;
  }

  /**
   * Get a test case with all its relations expanded
   * @param {number} testCaseId - The test case ID
   * @returns {Promise<Object>} Test case with relations
   */
  async getTestCaseWithRelations(testCaseId) {
    try {
      Logger.info('Fetching test case with relations', { testCaseId, project: this.project });
      
      const url = `${this.orgUrl}/${this.project}/_apis/wit/workitems/${testCaseId}?$expand=Relations&api-version=${this.apiVersion}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      return response.data;
    } catch (error) {
      Logger.error('Failed to fetch test case with relations', { testCaseId, error: error.message });
      throw error;
    }
  }

  /**
   * Extract parent user story from test case relations
   * Test cases link to parent stories with 'System.LinkTypes.Hierarchy-Reverse'
   * @param {Object} testCase - Test case work item with relations
   * @returns {Object|null} Parent story ID and URL or null if not found
   */
  extractParentStory(testCase) {
    if (!testCase.relations || testCase.relations.length === 0) {
      Logger.warn('Test case has no relations', { testCaseId: testCase.id });
      return null;
    }

    // Find Hierarchy-Reverse relation (parent link)
    const parentLink = testCase.relations.find(rel => 
      rel.rel === 'System.LinkTypes.Hierarchy-Reverse'
    );

    if (!parentLink) {
      Logger.warn('Test case has no parent story link', { testCaseId: testCase.id });
      return null;
    }

    // Extract story ID from URL like: https://dev.azure.com/.../workItems/227190
    const storyId = parseInt(parentLink.url.split('/').pop(), 10);
    
    Logger.info('Found parent story link', { testCaseId: testCase.id, storyId });

    return {
      id: storyId,
      url: parentLink.url,
      linkType: parentLink.rel
    };
  }

  /**
   * Get parent user story details
   * @param {number} storyId - The user story ID
   * @returns {Promise<Object>} User story work item
   */
  async getUserStoryDetails(storyId) {
    try {
      Logger.info('Fetching user story details', { storyId, project: this.project });
      
      const url = `${this.orgUrl}/${this.project}/_apis/wit/workitems/${storyId}?api-version=${this.apiVersion}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      return response.data;
    } catch (error) {
      Logger.error('Failed to fetch user story details', { storyId, error: error.message });
      throw error;
    }
  }

  /**
   * Complete flow: Get test case and its parent user story
   * @param {number} testCaseId - The test case ID
   * @returns {Promise<Object>} Test case with parent story details
   */
  async getTestCaseWithParentStory(testCaseId) {
    try {
      Logger.info('Starting getTestCaseWithParentStory flow', { testCaseId });

      // Step 1: Fetch test case with relations
      const testCase = await this.getTestCaseWithRelations(testCaseId);
      
      // Step 2: Extract parent story link
      const parentLink = this.extractParentStory(testCase);
      
      if (!parentLink) {
        Logger.warn('Test case has no parent story', { testCaseId });
        return {
          testCase,
          parentStory: null,
          parentStoryId: null
        };
      }

      // Step 3: Fetch parent story details
      const parentStory = await this.getUserStoryDetails(parentLink.id);

      Logger.success('Successfully linked test case to parent story', { 
        testCaseId, 
        storyId: parentLink.id 
      });

      return {
        testCase,
        parentStory,
        parentStoryId: parentLink.id,
        parentStoryTitle: parentStory.fields?.['System.Title']
      };
    } catch (error) {
      Logger.error('Failed in getTestCaseWithParentStory flow', error);
      throw error;
    }
  }

  /**
   * Get all test cases for a given user story (reverse lookup)
   * @param {number} userStoryId - The user story ID
   * @returns {Promise<Array>} Array of linked test cases
   */
  async getTestCasesForStory(userStoryId) {
    try {
      Logger.info('Fetching test cases for story', { userStoryId, project: this.project });

      // Query: Find all test cases that link to this story with Hierarchy-Reverse
      const wiql = {
        query: `SELECT [System.Id]
                 FROM WorkItemLinks
                 WHERE [Source].[System.TeamProject] = '${this.project}'
                 AND [Source].[System.WorkItemType] = 'Test Case'
                 AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Reverse'
                 AND [Target].[System.Id] = ${userStoryId}
                 MODE (MustContain)`
      };

      const searchUrl = `${this.orgUrl}/${this.project}/_apis/wit/wiql?api-version=${this.apiVersion}`;
      const response = await axios.post(searchUrl, wiql, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      const testCaseIds = (response.data.workItems || []).map(w => w.id);
      Logger.info('Found test cases for story', { userStoryId, count: testCaseIds.length, testCaseIds });

      // Fetch details for each test case
      if (testCaseIds.length === 0) {
        return [];
      }

      const detailsUrl = `${this.orgUrl}/${this.project}/_apis/wit/workitems?ids=${testCaseIds.join(',')}&api-version=${this.apiVersion}`;
      const detailsResp = await axios.get(detailsUrl, {
        headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
        httpsAgent: this.httpsAgent
      });

      const testCases = (detailsResp.data.value || []).map(item => ({
        id: item.id,
        title: item.fields?.['System.Title'] || '',
        state: item.fields?.['System.State'] || '',
        priority: item.fields?.['Microsoft.VSTS.Common.Priority'] || '',
        assignedTo: item.fields?.['System.AssignedTo']?.displayName || 'Unassigned',
        url: item._links?.html?.href || ''
      }));

      Logger.success('Fetched test case details for story', { userStoryId, count: testCases.length });
      return testCases;
    } catch (error) {
      Logger.error('Failed to fetch test cases for story', { userStoryId, error: error.message });
      throw error;
    }
  }
}

module.exports = TestCaseLinkingService;
