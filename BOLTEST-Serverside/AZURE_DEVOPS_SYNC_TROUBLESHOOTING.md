# Azure DevOps / TFS Data Sync Troubleshooting Guide

**Problem**: Login succeeds, but User Stories, Test Cases, and relations return empty or do not load.

---

## 1. Root Causes for Silent Empty Results (Most Common)

### 1.1 Incorrect Organization URL Format
**Problem**: The URL is malformed or includes extra path segments.

**Bad Examples**:
- ❌ `https://dev.azure.com/` (missing org name)
- ❌ `https://azure.devops.boltx.us/tfs/BoltCollection/Epos` (includes project name)
- ❌ `https://dev.azure.com/myorg/project` (includes project)

**Good Examples**:
- ✅ `https://dev.azure.com/myorg` (cloud Azure DevOps)
- ✅ `https://azure.devops.boltx.us/tfs/BoltCollection` (on-prem TFS, collection level)

**Detection**:
```powershell
# Test basic connectivity
curl -i -H "Authorization: Basic <BASE64_PAT>" `
  "https://dev.azure.com/myorg/_apis/projects?api-version=7.0"
# Should return 200, not 404
```

### 1.2 Missing or Incorrect API Version
**Problem**: The API version doesn't match the TFS/Azure DevOps version.

**Versions by Product**:
- **Azure DevOps Cloud**: `7.0`, `7.1`, `7.2`
- **TFS 2019 / on-prem**: `5.0`, `5.1`
- **TFS 2018**: `4.1`

**Common Mistake**: Using `7.0` against TFS 2019 (on-prem) → 404 or empty results

**Detection**:
```javascript
// Check what version actually works
const versions = ['5.0', '5.1', '7.0', '7.1'];
for (const v of versions) {
  try {
    const url = `${orgUrl}/${project}/_apis/wit/workitems?api-version=${v}`;
    const resp = await axios.get(url, { headers });
    console.log(`Version ${v} works: ${resp.status}`);
  } catch (err) {
    console.log(`Version ${v} failed: ${err.response?.status}`);
  }
}
```

### 1.3 Wrong PAT Permissions
**Problem**: PAT is created but doesn't have required scopes.

**Required Scopes for Full Read Access**:
```
✅ Work Items: Read & Execute
✅ Test Plan & Results: Read & Execute  
✅ Project & Team: Read
✅ Packaging: Read (for attachment storage)
```

**Bad Scopes**:
- ❌ Code scope only (no work item access)
- ❌ Build scope only

**Detection**:
```javascript
// Try to fetch a work item; if 403, check scopes
// 401 = PAT invalid
// 403 = PAT valid but insufficient permissions
```

### 1.4 Missing `$expand=Relations` in Query
**Problem**: User Stories fetched but test case links are not expanded.

**Bad**: 
```
GET /{org}/{project}/_apis/wit/workitems?ids=1,2,3&api-version=7.0
```
Returns relations as array of `{rel, url}` only; you must **follow the URL** to get actual work item data.

**Good**:
```
GET /{org}/{project}/_apis/wit/workitems?ids=1,2,3&$expand=Relations&api-version=7.0
```
Returns `relations[].target` with full work item ID so you can batch-fetch them.

### 1.5 Incorrect WIQL Query (Empty Result Set)
**Problem**: The WIQL is syntactically valid but matches zero items.

**Common Mistakes**:
```javascript
// ❌ Wrong: 'User Story' is not a valid category in all processes
WHERE [System.WorkItemType] = 'User Story'

// ✅ Better: Use category (includes PBI, User Story, etc.)
WHERE [System.WorkItemType] IN GROUP 'Microsoft.RequirementCategory'
```

**How to Test**:
```powershell
$wiql = @{
  query = "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = 'Epos'"
}

$resp = Invoke-RestMethod -Method POST `
  -Uri "https://azure.devops.boltx.us/tfs/BoltCollection/Epos/_apis/wit/wiql?api-version=5.0" `
  -Headers @{ Authorization = $authHeader } `
  -Body ($wiql | ConvertTo-Json) `
  -ContentType "application/json"

Write-Host "Found $($resp.workItems.Count) items"
```

### 1.6 Batch Request URL Too Long
**Problem**: Fetching 500+ work items in a single request causes 414 URI Too Long.

**Limit**: URLs in TFS/Azure DevOps typically max out at ~2000 chars.
- Rule of thumb: **batch size = 200 work item IDs max per request**

**Example**:
```javascript
// ❌ DON'T DO THIS
const allIds = [1, 2, 3, ..., 500]; // 500 items
const url = `.../_apis/wit/workitems?ids=${allIds.join(',')}&api-version=5.0`;
// URL is too long → 414 error, silently returns nothing to frontend

// ✅ DO THIS
const batchSize = 200;
for (let i = 0; i < allIds.length; i += batchSize) {
  const batch = allIds.slice(i, i + batchSize);
  const url = `.../_apis/wit/workitems?ids=${batch.join(',')}&api-version=5.0`;
  const resp = await fetch(url);
}
```

### 1.7 No Error Handling / Silent Failures
**Problem**: Backend catches errors but returns 200 with empty data.

**Example**:
```javascript
// ❌ BAD: Hides the real error
try {
  const resp = await axios.get(url);
  return { success: true, data: resp.data.value || [] };
} catch (err) {
  // Oops, returns empty array instead of error
  return { success: true, data: [] };
}

// ✅ GOOD: Exposes the error
try {
  const resp = await axios.get(url);
  return { success: true, data: resp.data.value || [] };
} catch (err) {
  return {
    success: false,
    statusCode: err.response?.status || 500,
    message: err.response?.data?.message || err.message,
    error: err.code || 'UNKNOWN'
  };
}
```

---

## 2. PAT Authorization Header Format

### 2.1 Correct Format: Base64 Encoding
```javascript
const pat = "abc123xyz789";
// Format: Basic <base64(":PAT")>
const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
// Result: "Basic OmFiYzEyM3h5ejc4OQ=="

// ✅ Correct
Authorization: Basic OmFiYzEyM3h5ejc4OQ==

// ❌ Wrong
Authorization: Bearer abc123xyz789  // (this is for JWT, not PAT)
Authorization: Pat abc123xyz789     // (wrong encoding)
```

### 2.2 Test PAT Format (PowerShell)
```powershell
$pat = "abc123xyz789"
$base64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(":$pat"))
Write-Host "Authorization: Basic $base64"
# Output: Authorization: Basic OmFiYzEyM3h5ejc4OQ==
```

---

## 3. Azure DevOps REST API Endpoints

### 3.1 Get All Projects
```
GET /{orgUrl}/_apis/projects?api-version=7.0

Example (cloud):
GET https://dev.azure.com/myorg/_apis/projects?api-version=7.0

Example (on-prem TFS):
GET https://azure.devops.boltx.us/tfs/BoltCollection/_apis/projects?api-version=5.0
```

**Response**:
```json
{
  "value": [
    {
      "id": "project-uuid",
      "name": "Epos",
      "url": "https://dev.azure.com/myorg/_apis/projects/Epos"
    }
  ]
}
```

### 3.2 Get All User Stories (with Relations Expanded)
```
POST /{orgUrl}/{project}/_apis/wit/wiql?api-version=7.0

Body:
{
  "query": "SELECT [System.Id], [System.Title], [System.State], [System.AreaPath] FROM WorkItems WHERE [System.TeamProject] = 'Epos' AND [System.WorkItemType] IN GROUP 'Microsoft.RequirementCategory'"
}
```

**Step 1: WIQL returns IDs**
```json
{
  "workItems": [
    { "id": 123, "url": "..." },
    { "id": 124, "url": "..." }
  ]
}
```

**Step 2: Fetch details WITH $expand=Relations**
```
GET /{orgUrl}/{project}/_apis/wit/workitems?ids=123,124&$expand=Relations&api-version=7.0
```

**Response with relations**:
```json
{
  "value": [
    {
      "id": 123,
      "fields": {
        "System.Title": "User Story Title",
        "System.State": "Active"
      },
      "relations": [
        {
          "rel": "Microsoft.VSTS.Common.TestedBy-Reverse",
          "url": "https://dev.azure.com/.../wit/workItems/456"
        }
      ]
    }
  ]
}
```

### 3.3 Get Single User Story with All Relations
```
GET /{orgUrl}/{project}/_apis/wit/workitems/123?$expand=All&api-version=7.0
```

### 3.4 Get All Test Cases Linked to a User Story
```javascript
// Step 1: Get the User Story with relations expanded
// Step 2: Extract relation links
const testCaseLinks = workItem.relations
  .filter(r => r.rel.includes('TestedBy')) // or 'Tests'
  .map(r => {
    const match = r.url.match(/\/(\d+)$/);
    return parseInt(match[1]);
  });

// Step 3: Fetch test case details
GET /{orgUrl}/{project}/_apis/wit/workitems?ids=${testCaseIds.join(',')}&$expand=All&api-version=7.0
```

### 3.5 Get Test Plans
```
GET /{orgUrl}/{project}/_apis/testplan/plans?api-version=7.1
```

### 3.6 Get Test Cases in a Suite
```
GET /{orgUrl}/{project}/_apis/testplan/Plans/{planId}/suites/{suiteId}/testcases?api-version=7.1
```

---

## 4. Working Node.js Example: Full Data Flow

### 4.1 Complete Example with Error Handling
```javascript
const axios = require('axios');

class TfsDataSyncService {
  constructor(orgUrl, project, pat, apiVersion = '7.0') {
    this.orgUrl = orgUrl.replace(/\/$/, '');
    this.project = project;
    this.pat = pat;
    this.apiVersion = apiVersion;
    
    // Correct Authorization header
    this.authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
    
    this.client = axios.create({
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * STEP 1: Fetch all User Stories using WIQL
   */
  async fetchAllUserStories(top = 100) {
    try {
      console.log(`Fetching User Stories from ${this.project}...`);
      
      const wiql = {
        query: `SELECT [System.Id], [System.Title], [System.State], [System.AreaPath], [System.ChangedDate]
                 FROM WorkItems
                 WHERE [System.TeamProject] = '${this.project}'
                 AND [System.WorkItemType] IN GROUP 'Microsoft.RequirementCategory'
                 ORDER BY [System.ChangedDate] DESC`
      };

      const wiqlUrl = `${this.orgUrl}/${this.project}/_apis/wit/wiql?api-version=${this.apiVersion}`;
      const wiqlResp = await this.client.post(wiqlUrl, wiql);
      
      const allIds = (wiqlResp.data.workItems || []).map(w => w.id);
      const ids = allIds.slice(0, top);
      
      console.log(`Found ${allIds.length} total items, fetching top ${ids.length}...`);
      
      if (ids.length === 0) {
        console.warn('⚠️  No User Stories found. Check:');
        console.warn('  1. Project name is correct');
        console.warn('  2. WIQL includes the right work item types');
        console.warn('  3. Items exist in the project');
        return [];
      }

      // STEP 2: Fetch details with relations expanded
      return await this.fetchWorkItemDetailsWithRelations(ids);
    } catch (error) {
      console.error('❌ Failed to fetch User Stories:', error.message);
      this.logDetailedError(error);
      throw error;
    }
  }

  /**
   * STEP 2: Fetch full details of work items with relations
   */
  async fetchWorkItemDetailsWithRelations(ids) {
    try {
      const userStories = [];
      const batchSize = 200;

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const url = `${this.orgUrl}/${this.project}/_apis/wit/workitems?ids=${batch.join(',')}&$expand=Relations&api-version=${this.apiVersion}`;
        
        console.log(`Fetching batch ${Math.floor(i / batchSize) + 1} (IDs: ${batch[0]}-${batch[batch.length - 1]})...`);
        
        const resp = await this.client.get(url);
        const items = resp.data.value || [];
        
        for (const item of items) {
          const story = {
            id: item.id,
            title: item.fields?.['System.Title'] || 'N/A',
            state: item.fields?.['System.State'] || 'Unknown',
            areaPath: item.fields?.['System.AreaPath'] || '',
            changedDate: item.fields?.['System.ChangedDate'] || '',
            url: item._links?.html?.href || '',
            testCaseIds: this.extractTestCaseIdsFromRelations(item.relations || [])
          };
          userStories.push(story);
        }
      }

      return userStories;
    } catch (error) {
      console.error('❌ Failed to fetch work item details:', error.message);
      this.logDetailedError(error);
      throw error;
    }
  }

  /**
   * STEP 3: Extract Test Case IDs from relations
   */
  extractTestCaseIdsFromRelations(relations) {
    const testCaseIds = [];
    
    for (const rel of relations) {
      // Look for relations that point to Test Cases
      // Common relation types:
      // - "Microsoft.VSTS.Common.TestedBy-Reverse"
      // - "Microsoft.VSTS.Common.Tests-Forward"
      
      if (rel.rel.includes('Test') || rel.rel.includes('TestedBy')) {
        try {
          // Extract ID from URL like: "/.../wit/workItems/456"
          const match = rel.url.match(/\/(\d+)$/);
          if (match) {
            testCaseIds.push(parseInt(match[1]));
          }
        } catch (err) {
          console.warn(`Could not parse relation URL: ${rel.url}`);
        }
      }
    }
    
    return testCaseIds;
  }

  /**
   * STEP 4: Fetch full Test Case data
   */
  async fetchTestCaseDetails(testCaseIds) {
    if (testCaseIds.length === 0) {
      return [];
    }

    try {
      console.log(`Fetching ${testCaseIds.length} Test Cases...`);
      
      const testCases = [];
      const batchSize = 200;

      for (let i = 0; i < testCaseIds.length; i += batchSize) {
        const batch = testCaseIds.slice(i, i + batchSize);
        const url = `${this.orgUrl}/${this.project}/_apis/wit/workitems?ids=${batch.join(',')}&$expand=All&api-version=${this.apiVersion}`;
        
        const resp = await this.client.get(url);
        const items = resp.data.value || [];
        
        for (const item of items) {
          testCases.push({
            id: item.id,
            title: item.fields?.['System.Title'] || 'N/A',
            state: item.fields?.['System.State'] || 'Unknown',
            steps: this.parseTestSteps(item.fields?.['Microsoft.VSTS.TCM.Steps'] || ''),
            url: item._links?.html?.href || ''
          });
        }
      }

      return testCases;
    } catch (error) {
      console.error('❌ Failed to fetch Test Case details:', error.message);
      this.logDetailedError(error);
      throw error;
    }
  }

  /**
   * Parse test steps from XML format
   */
  parseTestSteps(stepsXml) {
    if (!stepsXml) return [];
    
    try {
      // Steps are stored as XML; basic parsing
      const steps = [];
      const stepMatches = stepsXml.match(/<Step[^>]*>.*?<\/Step>/gs) || [];
      
      for (const stepXml of stepMatches) {
        const actionMatch = stepXml.match(/<Action[^>]*>(.*?)<\/Action>/s);
        const expectedMatch = stepXml.match(/<ExpectedResult[^>]*>(.*?)<\/ExpectedResult>/s);
        
        steps.push({
          action: actionMatch ? actionMatch[1].replace(/<[^>]+>/g, '') : '',
          expected: expectedMatch ? expectedMatch[1].replace(/<[^>]+>/g, '') : ''
        });
      }
      
      return steps;
    } catch (err) {
      console.warn('Could not parse test steps:', err.message);
      return [];
    }
  }

  /**
   * Detailed error logging for debugging
   */
  logDetailedError(error) {
    if (error.response) {
      console.error('HTTP Status:', error.response.status);
      console.error('Response Body:', JSON.stringify(error.response.data, null, 2));
      
      const status = error.response.status;
      if (status === 401) {
        console.error('💡 Tip: PAT is invalid or expired. Check scopes.');
      } else if (status === 403) {
        console.error('💡 Tip: PAT lacks required permissions. Ensure "Work Items: Read & Execute" scope.');
      } else if (status === 404) {
        console.error('💡 Tip: Organization, collection, or project URL is incorrect.');
      }
    } else if (error.code) {
      console.error('Network Error:', error.code);
      console.error('💡 Tip: Cannot reach the server. Check org URL and network connectivity.');
    } else {
      console.error('Error:', error.message);
    }
  }

  /**
   * COMPLETE SYNC: User Stories → Test Cases
   */
  async syncUserStoriesToTestCases(top = 50) {
    try {
      console.log('🔄 Starting sync...\n');
      
      // Fetch all user stories
      const stories = await this.fetchAllUserStories(top);
      console.log(`\n✅ Fetched ${stories.length} User Stories\n`);

      // For each story, fetch its test cases
      for (const story of stories) {
        if (story.testCaseIds.length > 0) {
          console.log(`\n📖 ${story.title} (ID: ${story.id})`);
          console.log(`   Linked Test Cases: ${story.testCaseIds.join(', ')}`);
          
          const testCases = await this.fetchTestCaseDetails(story.testCaseIds);
          console.log(`   Details:`);
          for (const tc of testCases) {
            console.log(`     - ${tc.title} (${tc.state})`);
          }
          
          story.testCases = testCases;
        }
      }

      return stories;
    } catch (error) {
      console.error('❌ Sync failed:', error.message);
      throw error;
    }
  }
}

// USAGE EXAMPLE
(async () => {
  const service = new TfsDataSyncService(
    'https://azure.devops.boltx.us/tfs/BoltCollection',
    'Epos',
    'your_actual_pat_token_here',
    '5.0' // Use 5.0 for on-prem TFS 2019
  );

  try {
    const result = await service.syncUserStoriesToTestCases(10);
    console.log('\n\n=== FINAL RESULT ===');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    process.exit(1);
  }
})();
```

---

## 5. Add TFS Health Check Endpoint

### 5.1 Create `adoHealth.js` Controller
```javascript
// controllers/adoHealth.js
const AzureDevOpsService = require('../services/azureDevOpsService');
const Logger = require('../utils/logger');

/**
 * Complete health check of TFS/Azure DevOps connectivity
 * - Validates PAT format
 * - Tests connectivity to org
 * - Verifies PAT permissions
 * - Checks API version compatibility
 */
exports.healthCheck = async (req, res) => {
  const orgUrl = (req.headers['x-orgurl'] || req.query.orgUrl || process.env.AZDO_ORG_URL || '').toString().trim();
  const pat = (req.headers['x-pat'] || req.query.pat || process.env.AZDO_PAT || '').toString().trim();
  const project = (req.headers['x-project'] || req.query.project || process.env.AZDO_PROJECT || '').toString().trim();

  // Validation
  if (!orgUrl) {
    return res.status(400).json({
      success: false,
      status: 'INVALID_INPUT',
      error: 'Missing orgUrl (header: x-orgurl, query: orgUrl, env: AZDO_ORG_URL)',
      checklist: []
    });
  }

  if (!pat) {
    return res.status(400).json({
      success: false,
      status: 'INVALID_INPUT',
      error: 'Missing PAT (header: x-pat, query: pat, env: AZDO_PAT)',
      checklist: []
    });
  }

  if (!project) {
    return res.status(400).json({
      success: false,
      status: 'INVALID_INPUT',
      error: 'Missing project (header: x-project, query: project, env: AZDO_PROJECT)',
      checklist: []
    });
  }

  const checklist = [];

  try {
    // Check 1: Validate URL format
    try {
      new URL(orgUrl);
      checklist.push({ name: 'URL format valid', status: 'PASS' });
    } catch (err) {
      checklist.push({ name: 'URL format valid', status: 'FAIL', error: err.message });
      return res.status(400).json({
        success: false,
        status: 'INVALID_ORG_URL',
        error: 'Organization URL is malformed',
        checklist
      });
    }

    // Check 2: Test connectivity (without project-specific auth)
    try {
      const testUrl = `${orgUrl}/_apis/projects?api-version=7.0`;
      const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
      
      const testResp = await axios.get(testUrl, {
        headers: { Authorization: authHeader },
        timeout: 5000
      });
      
      if (testResp.status === 200) {
        checklist.push({ name: 'Connectivity to TFS/Azure DevOps', status: 'PASS', url: testUrl });
      }
    } catch (err) {
      if (err.response?.status === 401) {
        checklist.push({ name: 'Connectivity to TFS/Azure DevOps', status: 'FAIL', error: 'Unauthorized (401) - PAT may be invalid' });
      } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        checklist.push({ name: 'Connectivity to TFS/Azure DevOps', status: 'FAIL', error: `Network unreachable: ${err.code}` });
      } else {
        checklist.push({ name: 'Connectivity to TFS/Azure DevOps', status: 'FAIL', error: err.message });
      }
      return res.status(err.response?.status || 503).json({
        success: false,
        status: 'CONNECTIVITY_FAILED',
        error: 'Cannot reach TFS/Azure DevOps server',
        checklist
      });
    }

    // Check 3: Verify project exists
    try {
      const svc = new AzureDevOpsService(orgUrl, project, pat);
      const projectUrl = `${orgUrl}/_apis/projects/${encodeURIComponent(project)}?api-version=7.0`;
      const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
      
      const projResp = await axios.get(projectUrl, {
        headers: { Authorization: authHeader },
        timeout: 5000
      });
      
      if (projResp.status === 200) {
        checklist.push({ 
          name: `Project exists: "${project}"`, 
          status: 'PASS',
          projectId: projResp.data.id
        });
      }
    } catch (err) {
      if (err.response?.status === 404) {
        checklist.push({ 
          name: `Project exists: "${project}"`, 
          status: 'FAIL', 
          error: 'Project not found (404) - Check project name' 
        });
      } else {
        checklist.push({ 
          name: `Project exists: "${project}"`, 
          status: 'FAIL', 
          error: err.message 
        });
      }
      return res.status(err.response?.status || 500).json({
        success: false,
        status: 'PROJECT_NOT_FOUND',
        error: `Project "${project}" not found or inaccessible`,
        checklist
      });
    }

    // Check 4: Test work item API access
    try {
      const svc = new AzureDevOpsService(orgUrl, project, pat);
      const wiqlUrl = `${orgUrl}/${project}/_apis/wit/wiql?api-version=7.0`;
      const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
      
      const wiqlResp = await axios.post(wiqlUrl, {
        query: `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${project}' ORDER BY [System.Id] DESC`
      }, {
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        timeout: 5000
      });
      
      const count = wiqlResp.data.workItems?.length || 0;
      checklist.push({ 
        name: 'Work Item API access', 
        status: 'PASS',
        found: count
      });
    } catch (err) {
      if (err.response?.status === 403) {
        checklist.push({ 
          name: 'Work Item API access', 
          status: 'FAIL', 
          error: 'Forbidden (403) - PAT lacks "Work Items: Read & Execute" permission' 
        });
      } else {
        checklist.push({ 
          name: 'Work Item API access', 
          status: 'FAIL', 
          error: err.message 
        });
      }
    }

    // Check 5: Test Test Plan API (optional)
    try {
      const testPlanUrl = `${orgUrl}/${project}/_apis/testplan/plans?api-version=7.1`;
      const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
      
      const tpResp = await axios.get(testPlanUrl, {
        headers: { Authorization: authHeader },
        timeout: 5000
      });
      
      const count = tpResp.data.value?.length || 0;
      checklist.push({ 
        name: 'Test Plan API access', 
        status: 'PASS',
        found: count
      });
    } catch (err) {
      if (err.response?.status === 404) {
        checklist.push({ 
          name: 'Test Plan API access', 
          status: 'WARN', 
          error: 'Not available in this TFS version (expected for TFS 2019 on-prem)' 
        });
      } else if (err.response?.status === 403) {
        checklist.push({ 
          name: 'Test Plan API access', 
          status: 'FAIL', 
          error: 'Forbidden - PAT lacks "Test Plan & Results: Read & Execute" permission' 
        });
      } else {
        checklist.push({ 
          name: 'Test Plan API access', 
          status: 'WARN', 
          error: err.message 
        });
      }
    }

    // Overall status
    const allPassed = checklist.every(c => c.status === 'PASS' || c.status === 'WARN');
    
    return res.status(allPassed ? 200 : 500).json({
      success: allPassed,
      status: allPassed ? 'HEALTHY' : 'DEGRADED',
      orgUrl: orgUrl,
      project: project,
      checklist: checklist
    });

  } catch (error) {
    Logger.error('Health check failed', error.message);
    checklist.push({ name: 'Unexpected error', status: 'FAIL', error: error.message });
    
    return res.status(500).json({
      success: false,
      status: 'ERROR',
      error: error.message,
      checklist
    });
  }
};
```

### 5.2 Add Route in `routes/ado.js`
```javascript
// Add to src/routes/ado.js
const adoHealthController = require('../../controllers/adoHealth');

// Public health check (no authentication required)
router.get('/health', adoHealthController.healthCheck);
```

### 5.3 Usage: Test Health Endpoint
```powershell
# PowerShell
$headers = @{
  'x-orgurl' = 'https://azure.devops.boltx.us/tfs/BoltCollection'
  'x-project' = 'Epos'
  'x-pat' = 'your_actual_pat_here'
}

Invoke-RestMethod -Method GET `
  -Uri 'http://localhost:5000/api/ado/health' `
  -Headers $headers | ConvertTo-Json -Depth 10
```

**Output Example**:
```json
{
  "success": true,
  "status": "HEALTHY",
  "orgUrl": "https://azure.devops.boltx.us/tfs/BoltCollection",
  "project": "Epos",
  "checklist": [
    { "name": "URL format valid", "status": "PASS" },
    { "name": "Connectivity to TFS/Azure DevOps", "status": "PASS", "url": "..." },
    { "name": "Project exists: \"Epos\"", "status": "PASS", "projectId": "..." },
    { "name": "Work Item API access", "status": "PASS", "found": 245 },
    { "name": "Test Plan API access", "status": "WARN", "error": "Not available in this TFS version" }
  ]
}
```

---

## 6. Summary: What to Check When No Data Syncs

| Issue | Symptom | Fix |
|-------|---------|-----|
| **Wrong Org URL** | 404 on project fetch | Use collection-level URL, not project-level |
| **Bad PAT** | 401 Unauthorized | Regenerate PAT, ensure not expired |
| **Missing Permissions** | 403 Forbidden | Grant "Work Items: Read" + "Test Plan: Read" scopes |
| **Wrong API Version** | Empty results or 404 | Use 5.0 for TFS 2019, 7.0 for Azure DevOps Cloud |
| **Missing $expand=Relations** | Test case IDs not linked | Add `&$expand=Relations` to work item fetch URL |
| **Batch Size Too Large** | 414 URI Too Long | Limit to 200 work item IDs per request |
| **WIQL Error** | No items returned | Test WIQL in Azure DevOps web UI first |
| **Network/Firewall** | ECONNREFUSED / ENOTFOUND | Check org URL reachable from backend server |

---

## 7. Quick Debug Checklist

```javascript
// Run this in Node.js to test everything:
const axios = require('axios');

const orgUrl = 'https://azure.devops.boltx.us/tfs/BoltCollection';
const project = 'Epos';
const pat = 'your_pat_here';
const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

(async () => {
  console.log('🔍 Running diagnostics...\n');

  // 1. Test URL format
  try {
    new URL(orgUrl);
    console.log('✅ 1. URL format is valid');
  } catch {
    console.log('❌ 1. URL format is INVALID');
    return;
  }

  // 2. Test connectivity
  try {
    const resp = await axios.get(`${orgUrl}/_apis/projects?api-version=7.0`, {
      headers: { Authorization: authHeader },
      timeout: 5000
    });
    console.log('✅ 2. Can connect to TFS/Azure DevOps');
  } catch (err) {
    console.log(`❌ 2. Cannot connect: ${err.code || err.response?.status}`);
    return;
  }

  // 3. Test project exists
  try {
    const resp = await axios.get(`${orgUrl}/_apis/projects/${project}?api-version=7.0`, {
      headers: { Authorization: authHeader },
      timeout: 5000
    });
    console.log(`✅ 3. Project "${project}" exists`);
  } catch (err) {
    console.log(`❌ 3. Project not found: ${err.response?.status}`);
    return;
  }

  // 4. Test work item access
  try {
    const resp = await axios.post(`${orgUrl}/${project}/_apis/wit/wiql?api-version=7.0`, {
      query: `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${project}'`
    }, {
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      timeout: 5000
    });
    const count = resp.data.workItems?.length || 0;
    console.log(`✅ 4. Can query work items (found ${count} items)`);
  } catch (err) {
    console.log(`❌ 4. Cannot query work items: ${err.response?.status}`);
    console.log(`   Error: ${err.response?.data?.message}`);
    return;
  }

  console.log('\n✅ All checks passed! The backend should be able to sync data.');
})();
```

---

**Next Step**: Run the health check endpoint on your backend, check the diagnostic output, and fix any failing checks one by one.
