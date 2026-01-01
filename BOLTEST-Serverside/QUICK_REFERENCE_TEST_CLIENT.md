# Azure DevOps Test Client - Quick Reference Card

## Initialization

```typescript
import { AdoTestClient } from './src/adoTestClient';

// With PAT
const client = new AdoTestClient({
  organizationUrl: 'https://dev.azure.com/myorg',
  project: 'MyProject',
  pat: process.env.AZURE_DEVOPS_PAT
});

// With Bearer Token
const client = new AdoTestClient({
  organizationUrl: 'https://dev.azure.com/myorg',
  project: 'MyProject',
  bearerToken: userToken
});
```

## Test Runs

```typescript
// Create
const run = await client.createRun(projectId, { name: 'Run Name', buildId: 123 });

// Get
const run = await client.getRun(projectId, runId);

// List (paginated)
const runs = await client.listRuns(projectId, { skip: 0, top: 50 });

// Update
await client.updateRun(projectId, runId, { name: 'Updated Name' });

// Query
const results = await client.queryRuns(projectId, { 
  state: 'Completed', 
  skip: 0, 
  top: 100 
});
```

## Test Results

```typescript
// Add results
const results = await client.addResults(projectId, runId, [
  {
    testCaseTitle: 'Test Name',
    automatedTestName: 'tests.ClassName.MethodName',
    outcome: 'Passed',  // or 'Failed', 'Inconclusive', 'Blocked'
    durationInMs: 150,
    startedDate: new Date().toISOString(),
    completedDate: new Date().toISOString()
  }
]);

// List results
const results = await client.listResults(projectId, runId, { 
  detailsToInclude: 'iterations',
  top: 200 
});

// Get single result
const result = await client.getResult(projectId, runId, resultId, { 
  detailsToInclude: 'iterations' 
});

// Update results (with step outcomes)
await client.updateResults(projectId, runId, [
  {
    id: resultId,
    outcome: 'Failed',
    iterationDetails: [{
      id: 1,
      outcome: 'Failed',
      actionResults: [
        { actionPath: '00000001', outcome: 'Passed' },
        { actionPath: '00000002', outcome: 'Failed', errorMessage: 'Error text' }
      ]
    }]
  }
]);
```

## Test Plans & Suites

```typescript
// Create plan
const plan = await client.createTestPlan(projectId, { 
  name: 'Plan Name',
  areaPath: '\\Project\\Area',
  iterationPath: '\\Project\\Sprint 1'
});

// List suites
const suites = await client.listSuites(projectId, planId, { 
  includeChildSuites: true 
});

// Add test cases (simple)
await client.addTestCasesToSuite(projectId, planId, suiteId, [33, 34, 35]);

// Add test cases (with configurations)
await client.addCasesWithConfigurations(projectId, planId, suiteId, [
  { testCaseId: 33, configurationIds: [1, 2] },
  { testCaseId: 34, configurationIds: [1] }
]);

// Update suite test cases
await client.updateSuiteTestCases(projectId, planId, suiteId, '33,34,35', {
  configurations: [
    { id: 1, name: 'Chrome', url: '...' },
    { id: 2, name: 'Firefox', url: '...' }
  ]
});

// Remove test cases
await client.removeSuiteTestCases(projectId, planId, suiteId, '35');

// Delete test case
await client.deleteTestCase(projectId, 35, permanent = true);
```

## Test Points

```typescript
// List points
const points = await client.listPoints(projectId, planId, suiteId, { 
  includePointDetails: true 
});

// Update points (outcome)
await client.updatePoints(projectId, planId, suiteId, [1, 2, 3], {
  outcome: 'Passed'  // 'Failed', 'Inconclusive', 'Blocked'
});

// Update points (assign tester)
await client.updatePoints(projectId, planId, suiteId, [1], {
  tester: { 
    id: 'user@company.com',
    displayName: 'John Doe',
    uniqueName: 'user@company.com'
  }
});

// Reset to active
await client.updatePoints(projectId, planId, suiteId, [1], {
  resetToActive: true
});
```

## WIQL Queries

```typescript
// Find stories with tests
const result = await client.findStoriesWithTests(projectId, { top: 100 });

// Custom WIQL
const result = await client.queryByWiql(projectId, `
  SELECT [System.Id], [System.Title]
  FROM WorkItems
  WHERE [System.WorkItemType] = 'User Story'
  MODE (MUST) [System.Links.LinkType] = 'Microsoft.VSTS.Common.TestedBy'
`, { top: 500 });
```

## Error Handling

```typescript
try {
  await client.addResults(projectId, runId, results);
} catch (error: any) {
  console.log(error.statusCode);    // 404, 401, 500, etc.
  console.log(error.errorCode);     // Error ID
  console.log(error.message);       // Error message
  
  if (error.statusCode === 401) {
    // Auth error - check PAT
  } else if (error.statusCode === 404) {
    // Not found - verify IDs
  } else if (error.statusCode === 429) {
    // Rate limited - implement backoff
  }
}
```

## Pagination

```typescript
// Fetch all results
const allResults = [];
let skip = 0;
while (true) {
  const batch = await client.listResults(projectId, runId, { skip, top: 200 });
  if (batch.length === 0) break;
  allResults.push(...batch);
  skip += 200;
}
```

## Batch Operations

```typescript
// Add multiple results
const results = await client.addResults(projectId, runId, [
  { testCaseTitle: 'Test 1', outcome: 'Passed', ... },
  { testCaseTitle: 'Test 2', outcome: 'Failed', ... },
  { testCaseTitle: 'Test 3', outcome: 'Passed', ... }
]);

// Update multiple points
await client.updatePoints(projectId, planId, suiteId, [1, 2, 3, 4, 5], {
  outcome: 'Passed'
});
```

## Step-Level Tracking (Manual Tests)

```typescript
// Track individual test steps
const actionPath = (stepNumber: number) => String(stepNumber).padStart(8, '0');

await client.updateResults(projectId, runId, [{
  id: resultId,
  outcome: 'Failed',
  iterationDetails: [{
    id: 1,
    outcome: 'Failed',
    actionResults: [
      {
        actionPath: actionPath(1),
        outcome: 'Passed',
        comment: 'Step 1 passed'
      },
      {
        actionPath: actionPath(2),
        outcome: 'Failed',
        errorMessage: 'Expected "Login" button, got "Sign In"'
      },
      {
        actionPath: actionPath(3),
        outcome: 'NotExecuted',
        comment: 'Blocked by previous step failure'
      }
    ]
  }]
}]);
```

## Common Workflows

### Create Run with Results
```typescript
const run = await client.createRun(projectId, { name: 'My Run', buildId: 123 });
const results = await client.addResults(projectId, run.id, testData);
return run.id;
```

### Setup Test Suite
```typescript
const suites = await client.listSuites(projectId, planId);
await client.addCasesWithConfigurations(projectId, planId, suites[0].id, caseData);
const points = await client.listPoints(projectId, planId, suites[0].id);
await client.updatePoints(projectId, planId, suites[0].id, points.map(p => p.id), { outcome: 'Passed' });
```

### Update Manual Test
```typescript
await client.updateResults(projectId, runId, [{
  id: resultId,
  iterationDetails: [{ 
    id: 1, 
    actionResults: stepOutcomes.map((s, i) => ({
      actionPath: String(i + 1).padStart(8, '0'),
      outcome: s.outcome,
      errorMessage: s.error
    }))
  }]
}]);
```

## Outcomes

```
Passed
Failed
Inconclusive
Blocked
NotApplicable
NotExecuted
Warning
Error
```

## Configuration Matrix

| Parameter | Required | Values |
|-----------|----------|--------|
| organizationUrl | Yes | https://dev.azure.com/org or http://tfs.local/tfs/col |
| project | Yes | Project name or ID |
| pat | Conditional | Personal Access Token |
| bearerToken | Conditional | OAuth Bearer token |
| apiVersion | No | Default: 7.1 |

## Type Imports

```typescript
import {
  AdoTestClient,
  AdoClientConfig,
  TestRun,
  TestCaseResult,
  TestSuite,
  TestPoint,
  WiqlQueryResult,
  RunCreateModel,
  TestPointUpdateModel
} from './src/adoTestClient';
```

## API Version Notes

- Default: 7.1 (stable)
- TestPlan API: 7.1-preview.1 (for addCasesWithConfigurations)
- Adjust via `config.apiVersion` if needed

## Links

- [Type Definitions](./src/types.ts)
- [Examples](./examples/demo.ts)
- [Full Documentation](./CLIENT_README.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [MS Docs](https://learn.microsoft.com/en-us/rest/api/azure/devops/test/)
