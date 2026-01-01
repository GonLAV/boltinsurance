/**
 * Azure DevOps REST API v5.0 Integration
 * Supports both Azure DevOps Services (cloud) and TFS On-Premises
 */

class AzureDevOpsAPI {
  constructor() {
    this.baseUrl = null;
    this.project = null;
    this.pat = null;
    this.apiVersion = '5.0'; // Azure DevOps API v5.0
    this.useDedicatedProxy = false; // Option A proxy at localhost:3001
    this.dedicatedProxyBase = 'http://localhost:3001';
  }

  /**
   * Initialize the API with connection details
   */
  init(orgUrl, projectName, patToken, options = {}) {
    this.baseUrl = orgUrl.endsWith('/') ? orgUrl.slice(0, -1) : orgUrl;
    this.project = projectName;
    this.pat = patToken;
    this.useDedicatedProxy = !!options.useDedicatedProxy;
    
    // Store in session for duration of app usage
    sessionStorage.setItem('azureDevOpsConfig', JSON.stringify({
      baseUrl: this.baseUrl,
      project: this.project,
      pat: this.pat,
      useDedicatedProxy: this.useDedicatedProxy
    }));
  }

  /**
   * Load configuration from session storage
   */
  loadFromSession() {
    const config = sessionStorage.getItem('azureDevOpsConfig');
    if (config) {
      const parsed = JSON.parse(config);
      this.baseUrl = parsed.baseUrl;
      this.project = parsed.project;
      this.pat = parsed.pat;
      this.useDedicatedProxy = !!parsed.useDedicatedProxy;
      return true;
    }
    return false;
  }

  /**
   * Get authentication headers
   */
  getHeaders() {
    const authString = `:${this.pat}`;
    const encodedAuth = btoa(authString);
    return {
      Authorization: `Basic ${encodedAuth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
  }

  /**
   * Test connection to Azure DevOps
   */
  async testConnection() {
    try {
      // EPOS on-prem base likely like: https://tlvtfs03.ciosus.com/tfs/Epos
      // Projects list endpoint: _apis/projects?api-version=5.0
      const url = `${this.baseUrl}/_apis/projects?api-version=${this.apiVersion}`;
      const response = await this.proxyFetch(url, 'GET', this.getHeaders());
      if (response.ok) {
        const data = await response.json();
        // Optionally verify project exists by name
        const found = (data.value || []).some(p => (p.name || '').toLowerCase() === (this.project || '').toLowerCase());
        return { success: true, data, projectFound: found };
      } else {
        const text = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${text}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new Test Case work item using API v5.0
   */
  async createTestCase(testCaseData) {
    try {
      const url = `${this.baseUrl}/_apis/wit/workitems/$Test%20Case?api-version=${this.apiVersion}`;
      
      // Build the JSON Patch document for creating work item
      const patchDocument = [
        {
          op: 'add',
          path: '/fields/System.Title',
          value: testCaseData.title
        },
        {
          op: 'add',
          path: '/fields/System.Description',
          value: testCaseData.description
        },
        {
          op: 'add',
          path: '/fields/System.TeamProject',
          value: this.project
        },
        {
          op: 'add',
          path: '/fields/System.State',
          value: testCaseData.state || 'Design'
        },
        {
          op: 'add',
          path: '/fields/Microsoft.VSTS.Common.Priority',
          value: parseInt(testCaseData.priority) || 2
        }
      ];

      // Add optional fields
      if (testCaseData.areaPath) {
        patchDocument.push({
          op: 'add',
          path: '/fields/System.AreaPath',
          value: testCaseData.areaPath
        });
      }

      if (testCaseData.iterationPath) {
        patchDocument.push({
          op: 'add',
          path: '/fields/System.IterationPath',
          value: testCaseData.iterationPath
        });
      }

      if (testCaseData.tags) {
        patchDocument.push({
          op: 'add',
          path: '/fields/System.Tags',
          value: testCaseData.tags
        });
      }

      if (testCaseData.automationStatus) {
        patchDocument.push({
          op: 'add',
          path: '/fields/Microsoft.VSTS.TCM.AutomationStatus',
          value: testCaseData.automationStatus
        });
      }

      // Add test steps in proper format
      if (testCaseData.steps && testCaseData.steps.length > 0) {
        const stepsXml = this.buildStepsXml(testCaseData.steps);
        patchDocument.push({
          op: 'add',
          path: '/fields/Microsoft.VSTS.TCM.Steps',
          value: stepsXml
        });
      }

      // Use the server proxy to make the request
      const response = await fetch('/api/testcase/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pat: this.pat,
          orgUrl: this.baseUrl,
          projectName: this.project,
          patch: patchDocument
        })
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        const errorText = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Build test steps XML format for Azure DevOps
   */
  buildStepsXml(steps) {
    let xml = '<steps id="0" last="' + steps.length + '">';
    
    steps.forEach((step, index) => {
      const stepId = index + 1;
      xml += '<step id="' + stepId + '" type="ActionStep">';
      xml += '<parameterizedString isformatted="true">&lt;DIV&gt;&lt;P&gt;' + this.escapeXml(step.action) + '&lt;/P&gt;&lt;/DIV&gt;</parameterizedString>';
      xml += '<parameterizedString isformatted="true">&lt;DIV&gt;&lt;P&gt;' + this.escapeXml(step.expected) + '&lt;/P&gt;&lt;/DIV&gt;</parameterizedString>';
      xml += '<description/>';
      xml += '</step>';
    });
    
    xml += '</steps>';
    return xml;
  }

  /**
   * Escape XML special characters
   */
  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Get all test cases from the project
   */
  async getTestCases() {
    try {
      // Senior architecture: call Next.js API route to list test cases server-side
      const response = await fetch('/api/testcase/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pat: this.pat,
          orgUrl: this.baseUrl,
          projectName: this.project
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        return { success: true, data: data.value || data.workItems || [] };
      } else {
        const errorText = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an existing test case
   */
  async updateTestCase(workItemId, updates) {
    try {
      const url = `${this.baseUrl}/_apis/wit/workitems/${workItemId}?api-version=${this.apiVersion}`;
      
      const patchDocument = [];
      
      // Build patch document from updates
      for (const [key, value] of Object.entries(updates)) {
        patchDocument.push({
          op: 'replace',
          path: `/fields/${key}`,
          value: value
        });
      }

      const response = await this.proxyFetch(url, 'PATCH', { ...this.getHeaders(), 'Content-Type': 'application/json-patch+json' }, JSON.stringify(patchDocument));

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        const errorText = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a test case
   */
  async deleteTestCase(workItemId) {
    try {
      const url = `${this.baseUrl}/_apis/wit/workitems/${workItemId}?api-version=${this.apiVersion}`;
      
      const response = await this.proxyFetch(url, 'DELETE', this.getHeaders());

      if (response.ok) {
        return { success: true };
      } else {
        const errorText = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get test plans
   */
  async getTestPlans() {
    try {
      const url = `${this.baseUrl}/_apis/test/plans?api-version=${this.apiVersion}`;
      const response = await this.proxyFetch(url, 'GET', this.getHeaders());
      if (response.ok) {
        const data = await response.json();
        return { success: true, data: data.value };
      } else {
        const errorText = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Proxy fetch via local server to avoid CORS
   */
  async proxyFetch(url, method = 'GET', headers = {}, body) {
    const resp = await fetch('/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, method, headers, body })
    });
    return resp;
  }

  /**
   * Clear session storage
   */
  clearSession() {
    sessionStorage.removeItem('azureDevOpsConfig');
    this.baseUrl = null;
    this.project = null;
    this.pat = null;
  }
}

// Make it globally available
window.AzureDevOpsAPI = AzureDevOpsAPI;
window.azureAPI = new AzureDevOpsAPI();
