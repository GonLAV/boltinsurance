# Azure DevOps Test Client v7.1

Production-ready TypeScript client library for Azure DevOps Test Management REST APIs (v7.1).

## Overview

Complete, type-safe TypeScript client providing first-class functions for:
- **Test Runs**: Create, list, get, update, and query test runs
- **Test Results**: Add, update, and list test results with support for step-level outcomes
- **Test Plans & Suites**: Create plans, manage suites, and add test cases
- **Test Points**: List and update test point outcomes and testers
- **WIQL Queries**: Execute work item queries with TestedBy link support

## Features

✅ **Strong Typing**: Complete type definitions for all API payloads
✅ **Multiple Auth**: Support for PAT (Basic auth) and OAuth Bearer tokens
✅ **URL Normalization**: Works with both Azure DevOps Services and on-premises Server/TFS
✅ **Iteration Support**: Update per-step outcomes for manual tests
✅ **Error Handling**: Typed error responses with status codes and detailed messages
✅ **JSDoc**: Per-endpoint documentation with Microsoft Docs links
✅ **Production Ready**: Proper retry, timeout, and error handling

## Installation

```bash
npm install @yourorg/ado-test-client
# or
yarn add @yourorg/ado-test-client
```

## Requirements

- Node.js 14+
- TypeScript 4.5+
- axios (included)

## Quick Start

### Basic Setup

```typescript
import { AdoTestClient } from './src/adoTestClient';

const client = new AdoTestClient({
  organizationUrl: 'https://dev.azure.com/myorg',
  pat: process.env.AZURE_DEVOPS_PAT, // or bearerToken
  apiVersion: '7.1', // default
});
```

### Create and Run Test Execution

```typescript
import { RunCreateModel, TestCaseResult } from './src/types';

// Create test run
const run = await client.createRun('MyProject', {
  name: 'Unit Tests - Build 123',
  automated: true,
  buildId: 123,
});

// Add test results
const results = await client.addResults('MyProject', run.id, [
  {
    testCaseTitle: 'LoginTest',
    automatedTestName: 'MyTests.LoginTest',
    outcome: 'Passed',
    durationInMs: 500,
    comment: 'Login successful',
  },
  {
    testCaseTitle: 'CheckoutTest',
    automatedTestName: 'MyTests.CheckoutTest',
    outcome: 'Failed',
    durationInMs: 1500,
    errorMessage: 'Payment gateway timeout',
    failureType: 'New Issue',
  },
]);

console.log(`Run ${run.id}: ${results.length} results added`);
```

## API Reference

### Test Runs

#### `createRun(project, body)`
Creates a new test run.

**Microsoft Docs**: https://learn.microsoft.com/en-us/rest/api/azure/devops/test/runs/create?view=azure-devops-rest-7.1

```typescript
const run = await client.createRun('MyProject', {
  name: 'Integration Tests',
  automated: true,
  buildId: 456,
});
```

#### `getRun(project, runId)`
Get a specific test run by ID.

**Microsoft Docs**: https://learn.microsoft.com/en-us/rest/api/azure/devops/test/runs?view=azure-devops-rest-7.1

```typescript
const run = await client.getRun('MyProject', 123);
```

#### `listRuns(project, options?)`
List test runs in a project with optional filtering.

```typescript
const runs = await client.listRuns('MyProject', {
  buildIds: [123, 124],
  skip: 0,
  top: 50,
});
```

#### `updateRun(project, runId, body)`
Update an existing test run.

```typescript
const updated = await client.updateRun('MyProject', 123, {
  state: 'Completed',
  comment: 'Test run completed successfully',
});
```

#### `queryRuns(project, filters)`
Query test runs by filters (build, release, branch, state).

```typescript
const results = await client.queryRuns('MyProject', {
  buildIds: [123],
  state: 'Completed',
  skip: 0,
  top: 100,
});
```

### Test Results

#### `addResults(project, runId, results[])`
Add test results to a test run. Supports all outcome types and failure classifications.

**Microsoft Docs**: https://learn.microsoft.com/en-us/rest/api/azure/devops/test/results/add?view=azure-devops-rest-7.1

```typescript
const results = await client.addResults('MyProject', 123, [
  {
    testCaseTitle: 'Test1',
    automatedTestName: 'MyTests.Test1',
    outcome: 'Passed',
    priority: 1,
    startedDate: new Date(Date.now() - 5000),
    completedDate: new Date(),
    durationInMs: 5000,
  },
]);
```

#### `updateResults(project, runId, results[])`
Update existing test results. Supports partial updates and iteration details.

**Microsoft Docs**: https://learn.microsoft.com/en-us/rest/api/azure/devops/test/results?view=azure-devops-rest-7.1

**Iteration Details Support** - Update step-by-step outcomes for manual tests:

```typescript
await client.updateResults('MyProject', 123, [
  {
    id: 100000,
    outcome: 'Failed',
    iterationDetails: [
      {
        id: 1,
        outcome: 'Failed',
        comment: 'Step 1 failed',
        actionResults: [
          {
            actionPath: '00000002', // Hex-encoded step 1
            iterationId: 1,
            outcome: 'Failed',
            errorMessage: 'Assertion failed',
            stepIdentifier: '1',
          },
          {
            actionPath: '00000003', // Hex-encoded step 2
            iterationId: 1,
            outcome: 'Blocked', // Couldn't execute due to step 1
            stepIdentifier: '2',
          },
        ],
      },
    ],
  },
]);
```

**Step Identifier Formats**:
- Simple: `"1"` (step 1)
- Nested: `"2;1"` (step 2, first nested step)
- Deep: `"2;3;1"` (step 2, step 3, step 1)

#### `listResults(project, runId, options?)`
List test results from a test run with optional filtering.

**Microsoft Docs**: https://learn.microsoft.com/en-us/rest/api/azure/devops/test/results?view=azure-devops-rest-7.1

```typescript
// Get failed results with full details
const failed = await client.listResults('MyProject', 123, {
  outcomes: ['Failed', 'Blocked'],
  detailsToInclude: 'iterations',
  top: 100,
});
```

**Detail Options**:
- `'none'`: Core fields only
- `'iterations'`: Include manual test iterations
- `'workItems'`: Include associated work items
- `'subResults'`: Include data-driven test variations
- `'point'`: Include test point details

#### `getResult(project, runId, resultId, options?)`
Get a single test result with optional details.

```typescript
const result = await client.getResult('MyProject', 123, 100000, {
  detailsToInclude: 'iterations',
});
```

### Test Plans & Suites

#### `createTestPlan(project, body)`
Create a new test plan.

**Microsoft Docs**: https://learn.microsoft.com/en-us/rest/api/azure/devops/testplan/plans/create?view=azure-devops-rest-7.1

```typescript
const plan = await client.createTestPlan('MyProject', {
  name: 'Website Testing - Release 2024.1',
  description: 'Comprehensive website feature testing',
  areaPath: '\\MyProject\\Product',
  iterationPath: '\\MyProject\\Release 2024.1',
});
```

#### `listSuites(project, planId, options?)`
List test suites in a test plan.

**Microsoft Docs**: https://learn.microsoft.com/en-us/rest/api/azure/devops/test/test-suites?view=azure-devops-rest-7.1

```typescript
const suites = await client.listSuites('MyProject', 1, {
  asTreeView: true,
  includeChildSuites: true,
});
```

#### `addTestCasesToSuite(project, planId, suiteId, testCaseIds[])`
Add test cases to a suite using **Test API**.

**Microsoft Docs**: https://learn.microsoft.com/en-us/rest/api/azure/devops/test/test-suites/add?view=azure-devops-rest-7.1

```typescript
const added = await client.addTestCasesToSuite('MyProject', 1, 10, [33, 34, 35]);
```

#### `addCasesWithConfigurations(project, planId, suiteId, createParams[])`
Add test cases with configurations using **TestPlan API**.

**Microsoft Docs**: https://learn.microsoft.com/en-us/rest/api/azure/devops/testplan/suite-test-case/add?view=azure-devops-rest-7.1

```typescript
const added = await client.addCasesWithConfigurations(
  'MyProject',
  1,
  10,
  [
    { testCaseId: 33, configurationIds: [1, 2] }, // Test on 2 configs
    { testCaseId: 34, configurationIds: [1] },    // Test on 1 config
  ]
);
```

### Test Points

#### `listPoints(project, planId, suiteId, options?)`
List test points for a suite.

**Microsoft Docs**: https://learn.microsoft.com/en-us/rest/api/azure/devops/test/points?view=azure-devops-rest-7.1

```typescript
const points = await client.listPoints('MyProject', 1, 10, {
  includePointDetails: true,
  top: 100,
});
```

#### `updatePoints(project, planId, suiteId, pointIds[], updates)`
Update test point outcomes and testers.

**Microsoft Docs**: https://learn.microsoft.com/en-us/rest/api/azure/devops/test/points/update?view=azure-devops-rest-7.1

```typescript
const updated = await client.updatePoints(
  'MyProject',
  1,
  10,
  [1, 2, 3],
  {
    outcome: 'Passed',
    tester: { id: 'user@company.com' },
    // OR to reset to active:
    // resetToActive: true,
  }
);
```

**Outcomes**: `Passed`, `Failed`, `Blocked`, `NotApplicable`, `Unspecified`
**Point States**: `Ready`, `Completed`, `InProgress`, `NotReady`, `Blocked`

### WIQL Queries

#### `queryByWiql(project, wiql, options?)`
Execute a WIQL query to find work items.

**Microsoft Docs**: https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/wiql?view=azure-devops-rest-7.1

```typescript
const result = await client.queryByWiql('MyProject', `
  SELECT [System.Id], [System.Title], [System.State]
  FROM WorkItems
  WHERE [System.WorkItemType] = 'Test Case'
  AND [System.State] <> 'Removed'
  ORDER BY [System.CreatedDate] DESC
`, {
  top: 100,
  timePrecision: true,
});

console.log(`Found ${result.workItems?.length} test cases`);
```

#### `findStoriesWithTests(project, options?)`
Find user stories with associated test cases using TestedBy link.

```typescript
const result = await client.findStoriesWithTests('MyProject', {
  areaPath: 'MyProject\\Product',
  iterationPath: 'MyProject\\Release 2024.1',
  top: 50,
});

// Returns work item relations with TestedBy link type
for (const relation of result.workItemRelations || []) {
  console.log(`Story ${relation.source?.id} is tested by ${relation.target?.id}`);
}
```

## Authentication

### Personal Access Token (PAT)

```typescript
const client = new AdoTestClient({
  organizationUrl: 'https://dev.azure.com/myorg',
  pat: 'YOUR_PAT_HERE', // From Azure DevOps Settings
});
```

[Create PAT](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops&tabs=Windows)

### OAuth Bearer Token

```typescript
const client = new AdoTestClient({
  organizationUrl: 'https://dev.azure.com/myorg',
  bearerToken: 'oauth_token_here',
});
```

### Environment Variables

```bash
export AZURE_DEVOPS_PAT=your_pat_token
```

## URL Support

### Azure DevOps Services
```typescript
organizationUrl: 'https://dev.azure.com/myorganization'
```

### Azure DevOps Server / TFS
```typescript
organizationUrl: 'http://tfs.company.local/tfs/mycollection'
organizationUrl: 'http://azure-devops-server/DefaultCollection'
```

## Error Handling

```typescript
try {
  const run = await client.createRun('MyProject', {...});
} catch (error: any) {
  console.error(`Error [${error.statusCode}]: ${error.message}`);
  console.error(`Error Code: ${error.errorCode}`);
  
  // Access response details
  if (error.response?.data) {
    console.error('Response:', error.response.data);
  }
}
```

**Error Properties**:
- `statusCode`: HTTP status code
- `errorCode`: Azure DevOps error code
- `message`: Error message
- `response`: Full HTTP response object
- `originalError`: Original axios error

## Type Definitions

All major types are exported:

```typescript
import {
  AdoClientConfig,
  RunCreateModel,
  TestRun,
  TestCaseResult,
  TestIterationDetailsModel,
  TestActionResultModel,
  TestSuite,
  TestPoint,
  TestPointUpdateModel,
  WiqlQueryResult,
  // ... and more
} from './src/types';
```

## Examples

See [examples/demo.ts](examples/demo.ts) for:
1. Create test run and add results
2. Update results with step-level outcomes
3. List and filter results
4. Create plan and manage suites
5. List and update test points
6. WIQL queries
7. Complete end-to-end workflow

Run examples:
```bash
npm run build
npm run examples
```

## Pagination

For large datasets, use `$skip` and `$top`:

```typescript
const allResults = [];
let skip = 0;
const pageSize = 200;

while (true) {
  const page = await client.listResults('MyProject', runId, {
    skip,
    top: pageSize,
  });

  if (page.length === 0) break;

  allResults.push(...page);
  skip += pageSize;
}
```

## Performance Tips

1. **Minimize Details**: Only request details you need
   ```typescript
   // Better: only core fields
   const fast = await client.listResults(project, runId, {
     detailsToInclude: 'none', // max 1000 results
   });
   
   // Slower: full details
   const detailed = await client.listResults(project, runId, {
     detailsToInclude: 'iterations', // max 200 results
   });
   ```

2. **Use Filtering**: Filter server-side when possible
   ```typescript
   // Better: filter by outcome on server
   const failed = await client.listResults(project, runId, {
     outcomes: ['Failed'],
   });
   
   // Slower: get all then filter in code
   const all = await client.listResults(project, runId);
   const failed = all.filter(r => r.outcome === 'Failed');
   ```

3. **Batch Operations**: Add multiple results at once
   ```typescript
   // Better: single request
   await client.addResults(project, runId, [result1, result2, result3]);
   
   // Slower: multiple requests
   await client.addResults(project, runId, [result1]);
   await client.addResults(project, runId, [result2]);
   await client.addResults(project, runId, [result3]);
   ```

## API Version & Preview Features

Default API version is `7.1`. Preview features require specific version:

```typescript
// Uses 7.1-preview.1 for TestPlan API
const added = await client.addCasesWithConfigurations(...);
```

## License

MIT

## Support

For issues, questions, or contributions:
- [GitHub Issues](https://github.com/yourorg/ado-test-client/issues)
- [Microsoft Azure DevOps Docs](https://learn.microsoft.com/en-us/rest/api/azure/devops/test)

## Related Documentation

- [Test Management Overview](https://learn.microsoft.com/en-us/azure/devops/test/overview)
- [Test Results API](https://learn.microsoft.com/en-us/rest/api/azure/devops/test/results)
- [Test Runs API](https://learn.microsoft.com/en-us/rest/api/azure/devops/test/runs)
- [Test Plans API](https://learn.microsoft.com/en-us/rest/api/azure/devops/testplan)
- [WIQL Query Language](https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax)
