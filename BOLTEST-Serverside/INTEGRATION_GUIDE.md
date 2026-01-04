# TypeScript Test Client - Full Stack Integration Guide

## Quick Start

This guide shows how to integrate the Azure DevOps Test API TypeScript client with your BOLTEST Frontside application.

## Files Overview

| File | Lines | Purpose |
|------|-------|---------|
| `src/adoTestClient.ts` | 814 | Main client class with all API methods |
| `src/types.ts` | 1036 | Complete TypeScript type definitions |
| `examples/demo.ts` | 497 | End-to-end usage examples |
| `CLIENT_README.md` | ~ | Comprehensive integration guide |

## Complete API Implementation

### Test Runs (5 methods)
```typescript
// Create → List → Get → Update → Query
createRun(project, body)
listRuns(project, options?)
getRun(project, runId)
updateRun(project, runId, body)
queryRuns(project, filters)
```

### Test Results (4 methods)
```typescript
// Add → Update → List → Get
addResults(project, runId, results)
updateResults(project, runId, results)  // Supports iterationDetails for step outcomes
listResults(project, runId, options?)
getResult(project, runId, resultId, options?)
```

### Test Plans & Suites (7 methods)
```typescript
// Create plan → List suites → Add cases (2 variants) → Update → Remove → Delete
createTestPlan(project, body)
listSuites(project, planId, options?)
addTestCasesToSuite(project, planId, suiteId, testCaseIds)
addCasesWithConfigurations(project, planId, suiteId, params)  // TestPlan API with configs
updateSuiteTestCases(project, planId, suiteId, testCaseIds, body)  // NEW: PATCH with configurations
removeSuiteTestCases(project, planId, suiteId, testCaseIds)
deleteTestCase(project, testCaseId, permanent?)  // NEW: Delete test case work item
```

### Test Points (3 methods)
```typescript
// List → Get → Update
listPoints(project, planId, suiteId, options?)
getPoint(project, planId, suiteId, pointId)  // Individual point not directly exposed, use listPoints
updatePoints(project, planId, suiteId, pointIds, updates)
```

### WIQL Queries (2 methods)
```typescript
// Query → Find stories with tests
queryByWiql(project, wiql, options?)
findStoriesWithTests(project, options?)
```

## Step-by-Step Integration

### Header-based Organization + PAT (Recommended)

This server supports per-request targeting of your Azure DevOps Server/TFS collection via headers:

- `x-orgurl`: Organization/collection URL (e.g. `https://your-tfs-server/tfs/YourCollection`)
- `x-pat`: Personal Access Token (PAT)

For the public endpoints under `GET /api/ado/userstories*` and `POST /api/ado/wiql`, the server will use these headers when provided, and falls back to `AZDO_ORG_URL` / `AZDO_PAT` environment variables.

Note: user-story endpoints are cached briefly (60s) to reduce repeated TFS calls.

### 1. Backend Setup (Node.js/Express)

**Create API route handler:**

```typescript
// routes/testResults.ts
import express from 'express';
import { AdoTestClient } from '../src/adoTestClient';

const router = express.Router();
const client = new AdoTestClient({
  organizationUrl: process.env.AZURE_DEVOPS_ORG!,
  project: process.env.AZURE_DEVOPS_PROJECT!,
  pat: process.env.AZURE_DEVOPS_PAT!,
});

// POST /api/test-results - Submit test results
router.post('/test-results', async (req, res) => {
  try {
    const { buildId, testResults } = req.body;
    
    // Create run
    const run = await client.createRun(process.env.AZURE_DEVOPS_PROJECT!, {
      name: `Test Results - Build ${buildId}`,
      buildId: buildId,
      description: 'Results submitted from BOLTEST frontend'
    });
    
    // Add results with step-level outcomes if present
    const results = await client.addResults(
      process.env.AZURE_DEVOPS_PROJECT!,
      run.id,
      testResults.map((tr: any) => ({
        testCaseTitle: tr.title,
        automatedTestName: tr.automatedName,
        outcome: tr.outcome,
        durationInMs: tr.duration,
        comment: tr.comment,
        iterationDetails: tr.steps ? [{
          id: 1,
          outcome: tr.outcome,
          actionResults: tr.steps.map((step: any, idx: number) => ({
            actionPath: String(idx + 1).padStart(8, '0'),
            outcome: step.outcome,
            comment: step.comment,
            errorMessage: step.error
          }))
        }] : undefined
      }))
    );
    
    res.json({ runId: run.id, resultCount: results.length });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// GET /api/test-runs/:runId - Get test run status
router.get('/test-runs/:runId', async (req, res) => {
  try {
    const run = await client.getRun(
      process.env.AZURE_DEVOPS_PROJECT!,
      parseInt(req.params.runId)
    );
    res.json(run);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// PATCH /api/test-results/:runId - Update test result outcomes
router.patch('/test-results/:runId', async (req, res) => {
  try {
    const { results } = req.body;
    
    const updated = await client.updateResults(
      process.env.AZURE_DEVOPS_PROJECT!,
      parseInt(req.params.runId),
      results
    );
    
    res.json(updated);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

export default router;
```

### 2. Frontend Integration (React)

**Create test submission service:**

```typescript
// src/services/testApiService.ts
import axios from 'axios';

interface TestResult {
  title: string;
  automatedName: string;
  outcome: 'Passed' | 'Failed' | 'Inconclusive' | 'Blocked';
  duration: number;
  comment?: string;
  steps?: Array<{
    outcome: string;
    comment?: string;
    error?: string;
  }>;
}

class TestApiService {
  private apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
  
  async submitTestResults(buildId: number, results: TestResult[]) {
    const response = await axios.post(`${this.apiBaseUrl}/test-results`, {
      buildId,
      testResults: results
    });
    return response.data;
  }
  
  async getRunStatus(runId: number) {
    const response = await axios.get(`${this.apiBaseUrl}/test-runs/${runId}`);
    return response.data;
  }
  
  async updateResults(runId: number, updates: any[]) {
    const response = await axios.patch(`${this.apiBaseUrl}/test-results/${runId}`, {
      results: updates
    });
    return response.data;
  }
}

export default new TestApiService();
```

**Create React component:**

```typescript
// src/components/TestResultsSubmission.tsx
import React, { useState } from 'react';
import testApiService from '../services/testApiService';

interface StepResult {
  name: string;
  outcome: 'Passed' | 'Failed';
  error?: string;
}

interface TestCaseEntry {
  id: string;
  title: string;
  automatedName: string;
  outcome: 'Passed' | 'Failed';
  duration: number;
  steps: StepResult[];
  comment?: string;
}

const TestResultsSubmission: React.FC = () => {
  const [testCases, setTestCases] = useState<TestCaseEntry[]>([]);
  const [buildId, setBuildId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  
  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    
    try {
      const response = await testApiService.submitTestResults(
        parseInt(buildId),
        testCases.map(tc => ({
          title: tc.title,
          automatedName: tc.automatedName,
          outcome: tc.outcome,
          duration: tc.duration,
          comment: tc.comment,
          steps: tc.steps.length > 0 ? tc.steps : undefined
        }))
      );
      
      setResult(response);
      setTestCases([]); // Clear form
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="test-results-form">
      <h2>Submit Test Results</h2>
      
      <div className="form-group">
        <label>Build ID:</label>
        <input
          type="number"
          value={buildId}
          onChange={(e) => setBuildId(e.target.value)}
          disabled={submitting}
        />
      </div>
      
      <div className="test-cases-list">
        <h3>Test Cases ({testCases.length})</h3>
        {testCases.map((tc, idx) => (
          <div key={tc.id} className="test-case">
            <h4>{tc.title}</h4>
            <div className="outcome-badge" data-outcome={tc.outcome}>
              {tc.outcome}
            </div>
            <p>Duration: {tc.duration}ms</p>
            
            {tc.steps.length > 0 && (
              <div className="steps">
                <h5>Steps:</h5>
                {tc.steps.map((step, sidx) => (
                  <div key={sidx} className="step">
                    <span className={`outcome ${step.outcome.toLowerCase()}`}>
                      {step.outcome}
                    </span>
                    <span>{step.name}</span>
                    {step.error && <p className="error">{step.error}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <button
        onClick={handleSubmit}
        disabled={submitting || !buildId || testCases.length === 0}
      >
        {submitting ? 'Submitting...' : 'Submit Results'}
      </button>
      
      {result && (
        <div className="success">
          ✓ Submitted {result.resultCount} results to run {result.runId}
        </div>
      )}
      
      {error && <div className="error">✗ {error}</div>}
    </div>
  );
};

export default TestResultsSubmission;
```

### 3. Database Mapping (Optional)

If storing test results locally before submission:

```typescript
// Database schema for test results
interface StoredTestResult {
  id: string;
  testCaseTitle: string;
  automatedTestName: string;
  outcome: 'Passed' | 'Failed' | 'Inconclusive' | 'Blocked';
  durationInMs: number;
  comment?: string;
  startedDate: Date;
  completedDate: Date;
  createdAt: Date;
  // Iteration details for step tracking
  iterationDetails?: {
    id: number;
    outcome: string;
    actionResults: Array<{
      actionPath: string;  // '00000001', '00000002', etc.
      outcome: string;
      errorMessage?: string;
    }>;
  }[];
  // Foreign keys
  testRunId?: number;        // After submission to Azure DevOps
  testResultId?: number;     // After submission to Azure DevOps
}
```

## Common Workflows

### Workflow 1: Create Run & Submit Results

```typescript
async function submitTestRun(buildId: number, testResults: any[]) {
  // 1. Create test run
  const run = await client.createRun(projectId, {
    name: `Build ${buildId} - ${new Date().toISOString()}`,
    buildId,
    description: 'Automated test results'
  });
  
  // 2. Add results in batches (API limit ~200 per request)
  const batchSize = 100;
  for (let i = 0; i < testResults.length; i += batchSize) {
    const batch = testResults.slice(i, i + batchSize);
    await client.addResults(projectId, run.id, batch);
  }
  
  // 3. Return run ID for tracking
  return run.id;
}
```

### Workflow 2: Update Step Outcomes for Manual Tests

```typescript
async function updateManualTestResult(runId: number, resultId: number, stepOutcomes: any[]) {
  await client.updateResults(projectId, runId, [{
    id: resultId,
    outcome: stepOutcomes.every(s => s.outcome === 'Passed') ? 'Passed' : 'Failed',
    iterationDetails: [{
      id: 1,
      outcome: stepOutcomes.every(s => s.outcome === 'Passed') ? 'Passed' : 'Failed',
      actionResults: stepOutcomes.map((step, idx) => ({
        actionPath: String(idx + 1).padStart(8, '0'),
        outcome: step.outcome,
        errorMessage: step.error,
        comment: step.comment
      }))
    }]
  }]);
}
```

### Workflow 3: Manage Test Suite & Points

```typescript
async function setupTestSuite(planId: number) {
  // 1. List existing suites
  const suites = await client.listSuites(projectId, planId);
  
  // 2. Add test cases to suite
  const testCaseIds = [33, 34, 35];
  await client.addTestCasesToSuite(projectId, planId, suites[0].id, testCaseIds);
  
  // 3. Update with configurations
  await client.updateSuiteTestCases(projectId, planId, suites[0].id, '33,34,35', {
    configurations: [
      { id: 1, name: 'Chrome', url: '...' },
      { id: 2, name: 'Firefox', url: '...' }
    ]
  });
  
  // 4. Update test point outcomes
  const points = await client.listPoints(projectId, planId, suites[0].id);
  await client.updatePoints(projectId, planId, suites[0].id, 
    points.map(p => p.id),
    { outcome: 'Passed' }
  );
}
```

## Testing the Integration

### Unit Test

```bash
npm test -- adoTestClient.test.ts
```

### Integration Test

```bash
# Create .env with real credentials
AZURE_DEVOPS_ORG=https://dev.azure.com/yourorg
AZURE_DEVOPS_PROJECT=YourProject  
AZURE_DEVOPS_PAT=your-pat

# Run validation
npx ts-node scripts/validate-client.ts
```

### Manual Testing

```typescript
// scripts/test-client.ts
import { AdoTestClient } from '../src/adoTestClient';

async function test() {
  const client = new AdoTestClient({
    organizationUrl: process.env.AZURE_DEVOPS_ORG!,
    project: process.env.AZURE_DEVOPS_PROJECT!,
    pat: process.env.AZURE_DEVOPS_PAT!,
  });
  
  // Test create run
  console.log('Testing createRun...');
  const run = await client.createRun(process.env.AZURE_DEVOPS_PROJECT!, {
    name: `Test Run - ${Date.now()}`
  });
  console.log('✓ Created run:', run.id);
  
  // Test add results
  console.log('Testing addResults...');
  const results = await client.addResults(process.env.AZURE_DEVOPS_PROJECT!, run.id, [{
    testCaseTitle: 'Integration Test',
    automatedTestName: 'integration.test',
    outcome: 'Passed',
    durationInMs: 100
  }]);
  console.log('✓ Added results:', results.length);
}

test().catch(console.error);
```

## Deployment Checklist

- [ ] Azure DevOps PAT configured in production `.env`
- [ ] PAT has `vso.test_write` scope
- [ ] Error handling implemented with retry logic
- [ ] Rate limiting considered for high-volume scenarios
- [ ] Test data cleanup strategy defined
- [ ] Database schema prepared for storing test results
- [ ] Frontend form validation implemented
- [ ] API endpoint secured with authentication
- [ ] Logging/monitoring configured
- [ ] Documentation updated for team

## Summary

The complete TypeScript client provides:
- ✅ 20+ API methods for all test operations
- ✅ Full type safety with 1000+ lines of interfaces
- ✅ Step-level outcome tracking via `iterationDetails`
- ✅ Batch operations and pagination support
- ✅ Comprehensive error handling
- ✅ Production-ready authentication (PAT and Bearer)
- ✅ Ready for frontend integration

**Next Steps:**
1. Review [CLIENT_README.md](./CLIENT_README.md) for detailed API reference
2. Check [examples/demo.ts](./examples/demo.ts) for complete workflows
3. Integrate with your BOLTEST Frontside application
4. Test with Azure DevOps environment
