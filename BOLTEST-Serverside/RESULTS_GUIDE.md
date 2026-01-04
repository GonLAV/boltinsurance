# Test Results - Azure DevOps Integration

## Overview

Comprehensive support for Azure DevOps Test Results REST APIs. Enables programmatic management of test execution results including creation, retrieval, listing, and updates for both automated and manual test runs.

### Test Result Concepts

**Test Result**: The outcome of executing a single test case within a test run (passed, failed, etc).

**Test Run**: A collection of test results from a specific test execution session (automated or manual).

**Test Outcome**: The result state of a test (Passed, Failed, Blocked, etc).

**Test Iteration**: A single execution instance for manual test cases (one test can have multiple iterations).

**Sub-Result**: Nested results from data-driven tests or ordered tests with multiple variations.

**Result Hierarchy**: Tests can have parent-child relationships through sub-results (data-driven, ordered, or generic groups).

---

## Service Details

- **Service**: Test
- **API Version**: `7.1`
- **Base URL**: `https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/results`
- **Authentication**: OAuth2 with appropriate scopes
- **Licensing**: Test Manager Extension with specific access levels required

---

## API Endpoints

### Test Result Operations

Results endpoints enable full CRUD operations on test execution results with support for detailed metadata, iterations, and hierarchical sub-results.

---

## 1. Add Test Results

Add one or more test results to an existing test run.

### HTTP Request
```http
POST https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/results?api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `runId` | path | Yes | integer (int32) | Test run ID into which to add results |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |

### Request Body
Array of `TestCaseResult` objects to add to the run.

```json
[
  {
    "testCaseTitle": "VerifyWebsiteTheme",
    "automatedTestName": "FabrikamFiber.WebSite.TestClass.VerifyWebsiteTheme",
    "priority": 1,
    "outcome": "Passed"
  },
  {
    "testCaseTitle": "VerifyWebsiteLinks",
    "automatedTestName": "FabrikamFiber.WebSite.TestClass.VerifyWebsiteLinks",
    "priority": 2,
    "outcome": "Failed",
    "associatedBugs": [
      {
        "id": 30
      }
    ]
  }
]
```

### Request Properties

**Core Properties**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `testCaseTitle` | string | No | Name of the test case |
| `automatedTestName` | string | Yes | Fully qualified test name |
| `outcome` | string | Yes | Test outcome (Passed, Failed, etc) |
| `priority` | integer | No | Priority (0-4) |
| `state` | string | No | Result state (Completed, InProgress) |
| `startedDate` | string (date-time) | No | When test started (UTC) |
| `completedDate` | string (date-time) | No | When test completed (UTC) |
| `durationInMs` | number | No | Duration in milliseconds |

**Additional Properties**:
| Name | Type | Description |
|------|------|-------------|
| `comment` | string | Comment up to 1000 characters |
| `errorMessage` | string | Error/failure message |
| `stackTrace` | string | Stack trace up to 1000 characters |
| `automatedTestStorage` | string | Test container (DLL name) |
| `automatedTestType` | string | Type of test (UnitTest, WebTest, etc) |
| `associatedBugs` | ShallowReference[] | Linked bug work items |
| `failureType` | string | Failure type (Known Issue, New Issue, Regression, Unknown, None) |
| `computerName` | string | Machine where test executed |
| `configuration` | ShallowReference | Test configuration reference |
| `customFields` | CustomTestField[] | Custom field values |
| `resolutionState` | string | Resolution state (Active, Resolved) |

### Response
- **Status Code**: `200 OK`
- **Body**: Array of created `TestCaseResult` objects with assigned IDs

```json
{
  "count": 2,
  "value": [
    {
      "id": 100000,
      "project": {},
      "testRun": {},
      "lastUpdatedBy": {
        "id": null
      },
      "url": ""
    },
    {
      "id": 100001,
      "project": {},
      "testRun": {},
      "lastUpdatedBy": {
        "id": null
      },
      "url": ""
    }
  ]
}
```

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test_write`

---

## 2. Get Test Result

Retrieve a specific test result from a test run.

### HTTP Request
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/results/{testCaseResultId}?api-version=7.1
```

### HTTP Request with Details
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/results/{testCaseResultId}?detailsToInclude={detailsToInclude}&api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `runId` | path | Yes | integer (int32) | Test run ID |
| `testCaseResultId` | path | Yes | integer (int32) | Test result ID to retrieve |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |
| `detailsToInclude` | query | No | ResultDetails | Details to include (none, iterations, workItems, subResults, point) |

### Response
- **Status Code**: `200 OK`
- **Body**: Single `TestCaseResult` object

```json
{
  "id": 100000,
  "project": {
    "id": "5c3d39df-a0cb-49da-be01-42e53792c0e1",
    "name": "Fabrikam-Fiber-TFVC",
    "url": "https://dev.azure.com/fabrikam/_apis/projects/Fabrikam-Fiber-TFVC"
  },
  "startedDate": "2016-07-13T11:12:48.487Z",
  "completedDate": "2016-07-13T11:12:48.493Z",
  "durationInMs": 4,
  "outcome": "Passed",
  "state": "Completed",
  "testCaseTitle": "Pass1",
  "automatedTestName": "UnitTestProject1.UnitTest1.Pass1"
}
```

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test`

---

## 3. List Test Results

Retrieve all test results for a test run with optional filtering and pagination.

### HTTP Request
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/results?api-version=7.1
```

### HTTP Request with Parameters
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/results?detailsToInclude={detailsToInclude}&$skip={$skip}&$top={$top}&outcomes={outcomes}&api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `runId` | path | Yes | integer (int32) | Test run ID |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |
| `detailsToInclude` | query | No | ResultDetails | Details level (none, iterations, workItems, subResults, point) |
| `$skip` | query | No | integer | Number of results to skip (for pagination) |
| `$top` | query | No | integer | Number of results to return (max 1000 default, 200 with details) |
| `outcomes` | query | No | string | Comma-separated outcome filter (Passed, Failed, etc) |

### Response
- **Status Code**: `200 OK`
- **Body**: Array of `TestCaseResult` objects

```json
{
  "count": 3,
  "value": [
    {
      "id": 100000,
      "outcome": "Passed",
      "state": "Completed",
      "testCaseTitle": "Pass1"
    },
    {
      "id": 100001,
      "outcome": "Failed",
      "state": "Completed",
      "testCaseTitle": "Fail1"
    },
    {
      "id": 100002,
      "outcome": "NotExecuted",
      "state": "Completed",
      "testCaseTitle": "Ignore1"
    }
  ]
}
```

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test`

---

## 4. Update Test Results

Update one or more test results in a test run.

### HTTP Request
```http
PATCH https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/results?api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `runId` | path | Yes | integer (int32) | Test run ID |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |

### Request Body
Array of `TestCaseResult` objects to update (include `id` field).

```json
[
  {
    "id": 100000,
    "state": "Completed",
    "comment": "Website theme is looking good",
    "associatedBugs": [
      {
        "id": 30
      }
    ]
  },
  {
    "id": 100001,
    "state": "Completed",
    "comment": "Website links are failing because of incorrect container id",
    "failureType": "Known Issue"
  }
]
```

### Updatable Properties
| Name | Type | Description |
|------|------|-------------|
| `id` | integer | Result ID (required for update) |
| `outcome` | string | New outcome |
| `state` | string | Result state (Completed, InProgress) |
| `comment` | string | Comment up to 1000 chars |
| `errorMessage` | string | Error message |
| `stackTrace` | string | Stack trace |
| `failureType` | string | Failure type classification |
| `resolutionState` | string | Resolution state |
| `associatedBugs` | ShallowReference[] | Linked bugs |
| `customFields` | CustomTestField[] | Custom fields |

### Response
- **Status Code**: `200 OK`
- **Body**: Array of updated `TestCaseResult` objects

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test_write`

---

## Object Schemas

### TestCaseResult

Represents a complete test execution result.

```json
{
  "id": 100000,
  "project": {
    "id": "5c3d39df-a0cb-49da-be01-42e53792c0e1",
    "name": "Fabrikam-Fiber-TFVC",
    "url": "https://dev.azure.com/fabrikam/_apis/projects/Fabrikam-Fiber-TFVC"
  },
  "testRun": {
    "id": "16",
    "name": "VSTest Test Run release any cpu",
    "url": "https://dev.azure.com/fabrikam/Fabrikam-Fiber-TFVC/_apis/test/Runs/16"
  },
  "testCase": {
    "id": "33",
    "name": "TestCase1"
  },
  "configuration": {
    "id": "4",
    "name": "Windows 8"
  },
  "startedDate": "2016-07-13T11:12:48.487Z",
  "completedDate": "2016-07-13T11:12:48.493Z",
  "durationInMs": 4,
  "outcome": "Passed",
  "state": "Completed",
  "testCaseTitle": "Pass1",
  "automatedTestName": "UnitTestProject1.UnitTest1.Pass1",
  "automatedTestStorage": "unittestproject1.dll",
  "automatedTestType": "UnitTest",
  "priority": 0,
  "comment": "Test execution completed successfully",
  "errorMessage": null,
  "stackTrace": null,
  "failureType": "None",
  "computerName": "TASKAGENT5-0055",
  "build": {
    "id": "5",
    "name": "20160713.2"
  },
  "buildReference": {
    "id": 5,
    "number": "20160713.2",
    "buildSystem": "Azure DevOps Services"
  },
  "release": {
    "id": "3",
    "name": "Release-1"
  },
  "releaseReference": {
    "id": 3,
    "name": "Release-1",
    "environmentId": 1,
    "environmentName": "Production"
  },
  "runBy": {
    "id": "a5cbf24d-799f-452e-82be-f049a85b5895",
    "displayName": "Fabrikam",
    "uniqueName": "fabrikamfiber.vsin@hotmail.com"
  },
  "owner": {
    "id": "a5cbf24d-799f-452e-82be-f049a85b5895",
    "displayName": "Fabrikam",
    "uniqueName": "fabrikamfiber.vsin@hotmail.com"
  },
  "lastUpdatedBy": {
    "id": "375baa5b-5148-4e89-a549-ec202b722d89",
    "displayName": "Project Collection Build Service"
  },
  "lastUpdatedDate": "2016-07-13T11:12:49.123Z",
  "createdDate": "2016-07-13T11:12:49.123Z",
  "revision": 1,
  "resetCount": 0,
  "area": {
    "id": "37528",
    "name": "Fabrikam-Fiber-TFVC"
  },
  "associatedBugs": [
    {
      "id": "30",
      "name": "Bug for test VerifyWebsiteLinks"
    }
  ],
  "resultGroupType": "none",
  "subResults": [],
  "iterationDetails": []
}
```

**Core Properties**:
| Name | Type | Description |
|------|------|-------------|
| `id` | integer | Unique test result ID |
| `testCaseTitle` | string | Test case name |
| `automatedTestName` | string | Fully qualified test name |
| `outcome` | string | Result outcome (Passed, Failed, etc) |
| `state` | string | Result state (Completed, InProgress) |
| `priority` | integer | Test priority (0-4) |

**Execution Properties**:
| Name | Type | Description |
|------|------|-------------|
| `startedDate` | string (date-time) | When test started (UTC) |
| `completedDate` | string (date-time) | When test completed (UTC) |
| `durationInMs` | number | Execution duration in milliseconds |
| `computerName` | string | Machine where test ran |

**Content Properties**:
| Name | Type | Description |
|------|------|-------------|
| `comment` | string | Result comment (max 1000 chars) |
| `errorMessage` | string | Error/failure message |
| `stackTrace` | string | Stack trace (max 1000 chars) |
| `failureType` | string | Known Issue, New Issue, Regression, Unknown, None |

**Hierarchy Properties**:
| Name | Type | Description |
|------|------|-------------|
| `resultGroupType` | ResultGroupType | none, rerun, dataDriven, orderedTest, generic |
| `subResults` | TestSubResult[] | Child results (data-driven variations) |
| `iterationDetails` | TestIterationDetailsModel[] | Manual test iterations |

**Reference Properties**:
| Name | Type | Description |
|------|------|-------------|
| `testRun` | ShallowReference | Parent test run |
| `testCase` | ShallowReference | Referenced test case |
| `testPlan` | ShallowReference | Parent test plan |
| `testSuite` | ShallowReference | Parent test suite |
| `testPoint` | ShallowReference | Test point executed |
| `configuration` | ShallowReference | Test configuration |
| `build` | ShallowReference | Associated build |
| `buildReference` | BuildReference | Detailed build reference |
| `release` | ShallowReference | Associated release |
| `releaseReference` | ReleaseReference | Detailed release reference |

**Identity Properties**:
| Name | Type | Description |
|------|------|-------------|
| `runBy` | IdentityRef | User who ran test |
| `owner` | IdentityRef | Test owner |
| `lastUpdatedBy` | IdentityRef | User who last updated |
| `lastUpdatedDate` | string (date-time) | Last update time |

---

### TestIterationDetailsModel

Represents a single execution iteration for manual tests.

```json
{
  "id": 1,
  "outcome": "Failed",
  "errorMessage": "Assertion failed",
  "comment": "Step 1 failed",
  "startedDate": "2016-07-26T04:22:54.517Z",
  "completedDate": "2016-07-26T04:22:56.953Z",
  "durationInMs": 2439,
  "actionResults": [
    {
      "actionPath": "00000002",
      "iterationId": 1,
      "outcome": "Failed",
      "startedDate": "2016-07-26T04:22:54Z",
      "completedDate": "2016-07-26T04:22:54Z",
      "comment": "Step failed"
    }
  ],
  "parameters": [
    {
      "parameterName": "Username",
      "value": "admin",
      "actionPath": "00000002"
    }
  ],
  "attachments": []
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `id` | integer | Iteration ID |
| `outcome` | string | Iteration outcome (Passed, Failed, Blocked, etc) |
| `startedDate` | string (date-time) | When iteration started (UTC) |
| `completedDate` | string (date-time) | When iteration completed (UTC) |
| `durationInMs` | number | Duration in milliseconds |
| `comment` | string | Iteration comment |
| `errorMessage` | string | Error/failure message |
| `actionResults` | TestActionResultModel[] | Results for each step |
| `parameters` | TestResultParameterModel[] | Parameter values used |
| `attachments` | TestCaseResultAttachmentModel[] | Attached files |

---

### TestSubResult

Represents hierarchical sub-results (data-driven variations, ordered tests).

```json
{
  "id": 1,
  "parentId": 100000,
  "displayName": "Iteration 1 (Chrome)",
  "outcome": "Passed",
  "sequenceId": 1,
  "resultGroupType": "dataDriven",
  "startedDate": "2016-07-13T11:12:48.487Z",
  "completedDate": "2016-07-13T11:12:48.493Z",
  "durationInMs": 4,
  "comment": "Browser test passed on Chrome",
  "errorMessage": null,
  "stackTrace": null,
  "configuration": {
    "id": "4",
    "name": "Chrome"
  },
  "computerName": "MACHINE1"
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `id` | integer | Sub-result ID |
| `parentId` | integer | Parent result ID |
| `displayName` | string | Sub-result name |
| `outcome` | string | Result outcome |
| `sequenceId` | integer | Order in parent's sub-results |
| `resultGroupType` | ResultGroupType | Hierarchy type |
| `durationInMs` | integer | Execution duration |
| `configuration` | ShallowReference | Configuration (for data-driven) |
| `subResults` | TestSubResult[] | Nested sub-results |

---

### BuildReference

Reference to an associated build.

```json
{
  "id": 5,
  "number": "20160713.2",
  "buildSystem": "Azure DevOps Services",
  "branchName": "refs/heads/main",
  "repositoryId": "repo123",
  "definitionId": 2,
  "uri": "vstfs:///Build/Build/5"
}
```

---

### ReleaseReference

Reference to an associated release.

```json
{
  "id": 3,
  "name": "Release-1",
  "attempt": 1,
  "environmentId": 1,
  "environmentName": "Production",
  "environmentDefinitionId": 5,
  "environmentDefinitionName": "Prod",
  "definitionId": 2,
  "creationDate": "2016-07-13T11:00:00Z",
  "environmentCreationDate": "2016-07-13T11:05:00Z"
}
```

---

### TestActionResultModel

Result of executing a single test step.

```json
{
  "actionPath": "00000002",
  "iterationId": 1,
  "outcome": "Failed",
  "errorMessage": "Assertion failed at line 5",
  "comment": "Expected value did not match",
  "startedDate": "2016-07-26T04:22:54Z",
  "completedDate": "2016-07-26T04:22:54Z",
  "durationInMs": 234,
  "stepIdentifier": "1"
}
```

**actionPath Format**:
- Hexadecimal string with 8 digits per step level
- First step = `00000002` (ID=2), not `00000001`
- Step 9 = `0000000a` (ID=10), step 15 = `00000010` (ID=16)
- Shared step path concatenates: `0000000300000001` = step 3 with shared step 1

---

### ResultDetails Enumeration

Controls what details to include when retrieving results.

| Value | Description |
|-------|-------------|
| `none` | Core fields only (State, Outcome, Priority, etc) |
| `iterations` | Include TestIterationDetailsModel array |
| `workItems` | Include associated work items |
| `subResults` | Include TestSubResult hierarchy |
| `point` | Include test point and plan details |

---

## Test Outcomes

Valid test outcome values:

| Outcome | Description | Usage |
|---------|-------------|-------|
| `Passed` | Test passed successfully | Successful execution |
| `Failed` | Test failed | Execution completed with failure |
| `Blocked` | Test execution blocked | Cannot proceed |
| `Inconclusive` | Result inconclusive | Cannot determine outcome |
| `Timeout` | Test timed out | Execution exceeded time limit |
| `Aborted` | Test aborted | Execution was stopped |
| `NotExecuted` | Test not executed | Skipped or ignored |
| `Warning` | Test completed with warning | Non-fatal issues |
| `Error` | Test execution error | System/environment error |
| `NotApplicable` | Test not applicable | Not relevant for configuration |
| `Paused` | Test execution paused | Waiting for input/action |
| `InProgress` | Test still executing | Execution in progress |
| `NotImpacted` | Test not impacted | By changes (code impact analysis) |

---

## Failure Type Classifications

| Type | Description | When to Use |
|------|-------------|------------|
| `None` | No failure classification | For passed tests |
| `Known Issue` | Previously identified problem | Recurring failures with known cause |
| `New Issue` | First occurrence failure | New bugs discovered |
| `Regression` | Previously working test | Reintroduced bugs |
| `Unknown` | Unclassified failure | When cause unknown |

---

## Common Workflows

### Workflow 1: Add Single Test Result

Add result from automated test execution.

```bash
organization="fabrikam"
project="Fabrikam-Fiber-TFVC"
runId="24"

curl -X POST "https://dev.azure.com/$organization/$project/_apis/test/Runs/$runId/results?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "testCaseTitle": "VerifyWebsiteTheme",
      "automatedTestName": "FabrikamFiber.WebSite.TestClass.VerifyWebsiteTheme",
      "priority": 1,
      "outcome": "Passed",
      "startedDate": "2016-07-13T11:12:48.487Z",
      "completedDate": "2016-07-13T11:12:48.493Z",
      "durationInMs": 5
    }
  ]'
```

### Workflow 2: Add Multiple Results in Batch

Submit multiple test results from test run.

```bash
organization="fabrikam"
project="Fabrikam-Fiber-TFVC"
runId="24"

curl -X POST "https://dev.azure.com/$organization/$project/_apis/test/Runs/$runId/results?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "testCaseTitle": "Test1",
      "automatedTestName": "MyTests.Test1",
      "outcome": "Passed",
      "durationInMs": 100
    },
    {
      "testCaseTitle": "Test2",
      "automatedTestName": "MyTests.Test2",
      "outcome": "Failed",
      "errorMessage": "Assert.AreEqual failed",
      "durationInMs": 150
    },
    {
      "testCaseTitle": "Test3",
      "automatedTestName": "MyTests.Test3",
      "outcome": "Blocked",
      "durationInMs": 50
    }
  ]'
```

### Workflow 3: Get Test Result with Details

Retrieve complete test result including iterations.

```bash
organization="fabrikam"
project="Fabrikam-Fiber-TFVC"
runId="31"
resultId="100000"

curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/Runs/$runId/results/$resultId?detailsToInclude=Iterations,WorkItems&api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Response includes:
# - Core result fields
# - iterationDetails array
# - associatedBugs array
```

### Workflow 4: List Results with Filtering

Get all failed tests from run with pagination.

```bash
organization="fabrikam"
project="Fabrikam-Fiber-TFVC"
runId="16"

curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/Runs/$runId/results?outcomes=Failed&\$top=50&\$skip=0&api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" | jq '.value[] | {id, outcome, testCaseTitle, failureType}'

# Returns only failed results, 50 at a time
```

### Workflow 5: List Multiple Outcome Types

Filter for both failed and blocked results.

```bash
organization="fabrikam"
project="Fabrikam-Fiber-TFVC"
runId="26"

curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/Runs/$runId/results?outcomes=Failed,Blocked&\$top=100&api-version=7.1" \
  -H "Authorization: Bearer $TOKEN"

# Returns all Failed OR Blocked results
```

### Workflow 6: Update Result with Comment

Add comment and link bug to test result.

```bash
organization="fabrikam"
project="Fabrikam-Fiber-TFVC"
runId="26"

curl -X PATCH "https://dev.azure.com/$organization/$project/_apis/test/Runs/$runId/results?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "id": 100001,
      "comment": "Website links are failing because of incorrect container id",
      "failureType": "Known Issue",
      "associatedBugs": [
        {
          "id": 30
        }
      ]
    }
  ]'
```

### Workflow 7: Bulk Update Results

Update multiple results with outcomes.

```bash
organization="fabrikam"
project="Fabrikam-Fiber-TFVC"
runId="26"

curl -X PATCH "https://dev.azure.com/$organization/$project/_apis/test/Runs/$runId/results?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "id": 100000,
      "state": "Completed",
      "outcome": "Passed"
    },
    {
      "id": 100001,
      "state": "Completed",
      "outcome": "Failed",
      "failureType": "Known Issue"
    },
    {
      "id": 100002,
      "state": "Completed",
      "outcome": "Blocked"
    }
  ]'
```

### Workflow 8: Query Results with Multiple Filters

Get paginated results with full details.

```bash
organization="fabrikam"
project="Fabrikam-Fiber-TFVC"
runId="31"

# Request with iterations and work items, first 100
curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/Runs/$runId/results?detailsToInclude=Iterations,WorkItems&\$top=100&\$skip=0&api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" | jq '{count: .count, results: .value[] | {id, outcome, iterationCount: (.iterationDetails | length)}}'
```

### Workflow 9: Export Results to CSV

List all results and convert to CSV.

```bash
organization="fabrikam"
project="Fabrikam-Fiber-TFVC"
runId="16"

curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/Runs/$runId/results?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.value[] | [.id, .testCaseTitle, .outcome, .durationInMs] | @csv' > results.csv

# CSV format: ID,TestCaseTitle,Outcome,Duration
```

---

## Pagination Strategy

### Large Result Sets

For test runs with many results (1000+), use pagination:

```bash
# Get first 200 results
curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/Runs/$runId/results?&\$top=200&\$skip=0&api-version=7.1"

# Get next 200 (skip=200)
curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/Runs/$runId/results?&\$top=200&\$skip=200&api-version=7.1"
```

### Performance Considerations

| Detail Level | Max Results | Use Case |
|--------------|-------------|----------|
| `none` | 1000 | Quick summary |
| `iterations` | 200 | Manual test analysis |
| `workItems` | 200 | Bug/issue tracking |
| `subResults` | 200 | Data-driven tests |

**Tip**: Minimize details when not needed to improve performance and reduce response size.

---

## Result Status Flow

### Automated Test Results

```
Not Started → In Progress → Completed
                                ↓
                    (Passed/Failed/etc)
```

### Manual Test Results

```
Not Started → In Progress → Completed
                ↓               ↓
            Multiple       (Final outcome
           Iterations       of all iterations)
```

---

## Filtering Best Practices

1. **By Outcome**: Use `outcomes=Failed,Blocked` for problem investigation
2. **By Priority**: Retrieve higher priority results first
3. **By Configuration**: Filter for specific environments (Windows, Chrome, etc)
4. **By Date Range**: Use external filtering with startedDate/completedDate
5. **Progressive Loading**: Use $skip/$top for large result sets

---

## Best Practices

1. **Batch Operations**: Add/update multiple results together
2. **Set Duration**: Always include durationInMs for performance metrics
3. **Detailed Outcomes**: Classify failures (Known Issue, New Issue, Regression)
4. **Link Bugs**: Associate failed tests with bug work items
5. **Add Comments**: Document important findings in test comments
6. **Use Proper Dates**: Ensure completedDate > startedDate
7. **Fail Fast**: Update with failures immediately, not after completion
8. **Archive Results**: Use retention settings before results auto-delete
9. **Performance**: Request only details you need
10. **State Management**: Keep state and outcome in sync

---

## Error Handling

### Common Status Codes

| Code | Description | Resolution |
|------|-------------|-----------|
| `200 OK` | Successful operation | Results retrieved/updated |
| `400 Bad Request` | Invalid request data | Validate outcome, dates, IDs |
| `401 Unauthorized` | Authentication failed | Check token validity |
| `403 Forbidden` | Insufficient permissions | User needs test_write scope |
| `404 Not Found` | Run or result not found | Verify runId and resultId |
| `409 Conflict` | Result already exists | Use PATCH for updates |

### Error Response Example

```json
{
  "error": {
    "code": "InvalidTestOutcome",
    "message": "Invalid outcome value. Must be Passed, Failed, Blocked, etc."
  }
}
```

---

## Validation Rules

### Test Result Creation

- `automatedTestName` is required
- `outcome` must be valid enum value
- `completedDate` must be >= `startedDate`
- `comment` max 1000 characters
- `stackTrace` max 1000 characters
- `durationInMs` must be non-negative

### Test Result Update

- `id` is required to identify result
- Can only update certain fields (comment, outcome, bugs, etc)
- Cannot modify core execution data (dates, duration)

---

## Authentication & Scopes

### OAuth2 Scopes

| Scope | Operations | Description |
|-------|-----------|-------------|
| `vso.test` | GET | Read results |
| `vso.test_write` | POST, PATCH | Create/update results |

### Using Personal Access Token

```bash
Authorization: Basic $(echo -n ":$PAT" | base64)
```

---

## Licensing Requirements

- **Test Manager Extension**: Required for all operations
- **Access Level**: Any level with test management access
- **Permissions**: Project-level at minimum

---

## References

- [Microsoft Azure DevOps REST API - Test Results](https://learn.microsoft.com/en-us/rest/api/azure/devops/test/results)
- [Test Result Management](https://learn.microsoft.com/en-us/azure/devops/test/overview)
- [Data-driven Tests](https://learn.microsoft.com/en-us/azure/devops/test/run-tests)
- [Azure DevOps REST API v7.1](https://learn.microsoft.com/en-us/rest/api/azure/devops)
- [Test Failure Workflow](https://learn.microsoft.com/en-us/azure/devops/test/test-failure-workflow)
