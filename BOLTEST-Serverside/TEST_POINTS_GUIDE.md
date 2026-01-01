# Test Points - Azure DevOps Integration

## Overview

Comprehensive support for Azure DevOps Test Points REST APIs. Enables programmatic management of test points, which are pairings of test cases with test configurations within test suites.

### Test Points Concepts

**Test Point**: A pairing of a test case with a test configuration. Test points are the actual items that get executed in a test run.

**Test Configuration**: A specific environment/configuration combination (e.g., Windows 10, Chrome browser) that a test case needs to run against.

**Test Suite**: A logical grouping of test cases within a test plan.

**Test Plan**: A collection of test suites organized for a specific iteration or release.

**Point State**: Indicates if a test point is ready, in progress, completed, or blocked.

**Point Outcome**: The result of executing a test point (Passed, Failed, Blocked, NotApplicable, Unspecified).

---

## Service Details

- **Service**: Test
- **API Version**: `7.1`
- **Base URL**: `https://dev.azure.com/{organization}/{project}/_apis/test`
- **Authentication**: OAuth2 with appropriate scopes
- **Licensing**: Test Manager Extension with specific access levels required

---

## API Endpoints

### Test Point Operations

Test point endpoints enable retrieval, querying, and updating of test execution points within test plans.

---

## 1. Get Test Point

Retrieve a specific test point by ID.

### HTTP Request
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Plans/{planId}/Suites/{suiteId}/points/{pointIds}?api-version=7.1
```

### With Optional Parameters
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Plans/{planId}/Suites/{suiteId}/points/{pointIds}?witFields={witFields}&api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `planId` | path | Yes | integer (int32) | ID of the test plan |
| `suiteId` | path | Yes | integer (int32) | ID of the suite containing the point |
| `pointIds` | path | Yes | integer (int32) | ID of the test point to retrieve |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |
| `witFields` | query | No | string | Comma-separated list of work item field names to include |

### Query Parameter Details

**witFields** (optional):
- **Type**: string (comma-separated)
- **Purpose**: Include specific work item fields in the response
- **Examples**: `System.Title,System.Reason,System.State`
- **Common Fields**:
  - `System.Title` - Test case title
  - `System.Reason` - Work item reason
  - `System.State` - Current state
  - `System.AssignedTo` - Assigned user
  - `Microsoft.VSTS.TCM.AutomationStatus` - Automation status

### Response
- **Status Code**: `200 OK`
- **Body**: `TestPoint`

```json
{
  "id": 1,
  "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Plans/1/Suites/1/Points/1",
  "assignedTo": {
    "id": "d291b0c4-a05c-4ea6-8df1-4b41d5f39eff",
    "displayName": "Jamal Hartnett",
    "uniqueName": "fabrikamfiber4@hotmail.com",
    "url": "https://vssps.dev.azure.com/fabrikam/_apis/Identities/d291b0c4-a05c-4ea6-8df1-4b41d5f39eff",
    "imageUrl": "https://dev.azure.com/fabrikam/_api/_common/identityImage?id=d291b0c4-a05c-4ea6-8df1-4b41d5f39eff"
  },
  "configuration": {
    "id": "2",
    "name": "Windows 8"
  },
  "failureType": "None",
  "lastTestRun": {
    "id": "28",
    "name": "sprint1 (Manual)",
    "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Runs/28"
  },
  "lastResult": {
    "id": "100000",
    "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Runs/28/Results/100000"
  },
  "lastUpdatedDate": "2014-05-28T16:14:41.393Z",
  "lastUpdatedBy": {
    "id": "d291b0c4-a05c-4ea6-8df1-4b41d5f39eff",
    "displayName": "Jamal Hartnett"
  },
  "outcome": "Passed",
  "revision": 22,
  "state": "Completed",
  "suite": {
    "id": "1",
    "name": "sprint1",
    "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Plans/1/Suites/1"
  },
  "testCase": {
    "id": "39",
    "url": "https://dev.azure.com/fabrikam/_apis/wit/workItems/39"
  },
  "testPlan": {
    "id": "1",
    "name": "sprint1",
    "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Plans/1"
  },
  "workItemProperties": [
    {
      "workItem": {
        "key": "Microsoft.VSTS.TCM.AutomationStatus",
        "value": "Not Automated"
      }
    }
  ]
}
```

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test`

---

## 2. Get Points By Query

Query test points with advanced filtering options (test case IDs, configurations, testers).

### HTTP Request
```http
POST https://dev.azure.com/{organization}/{project}/_apis/test/points?api-version=7.1
```

### With Optional Pagination
```http
POST https://dev.azure.com/{organization}/{project}/_apis/test/points?$skip={$skip}&$top={$top}&api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |
| `$skip` | query | No | integer (int32) | Number of points to skip for pagination |
| `$top` | query | No | integer (int32) | Number of points to return (max typically 200) |

### Request Body
```json
{
  "pointsFilter": {
    "testcaseIds": [7, 8, 9],
    "configurationNames": ["Windows 10"],
    "testers": [
      {
        "displayName": "Fabrikam Fiber"
      }
    ]
  },
  "orderBy": "id",
  "witFields": ["System.Title", "System.State"]
}
```

**Body Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `pointsFilter` | PointsFilter | Filter criteria for querying points |
| `orderBy` | string | Field to order results by |
| `witFields` | string[] | Work item fields to include |

### PointsFilter Details

```json
{
  "testcaseIds": [7, 8, 9],
  "configurationNames": ["Windows 10", "Windows 11"],
  "testers": [
    {
      "displayName": "Fabrikam Fiber"
    }
  ]
}
```

**Filter Properties**:
| Name | Type | Description |
|------|------|-------------|
| `testcaseIds` | integer[] | Filter by test case IDs |
| `configurationNames` | string[] | Filter by configuration names |
| `testers` | IdentityRef[] | Filter by assigned testers |

### Response
- **Status Code**: `200 OK`
- **Body**: `TestPointsQuery`

```json
{
  "points": [
    {
      "id": 1,
      "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Plans/5/Suites/6/Points/1",
      "assignedTo": {
        "id": "7d7832db-0b41-4abc-8243-2eeca1d71861",
        "displayName": "Fabrikam Fiber"
      },
      "configuration": {
        "id": "2",
        "name": "Windows 10"
      },
      "outcome": "Passed",
      "state": "Completed",
      "testCase": {
        "id": "7"
      }
    }
  ],
  "pointsFilter": {
    "testcaseIds": [7, 8, 9],
    "configurationNames": ["Windows 10"]
  }
}
```

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test_write`

---

## 3. List Test Points

Get a list of test points for a specific suite with flexible filtering options.

### HTTP Request
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Plans/{planId}/Suites/{suiteId}/points?api-version=7.1
```

### With Optional Parameters
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Plans/{planId}/Suites/{suiteId}/points?witFields={witFields}&configurationId={configurationId}&testCaseId={testCaseId}&testPointIds={testPointIds}&includePointDetails={includePointDetails}&$skip={$skip}&$top={$top}&api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `planId` | path | Yes | integer (int32) | ID of the test plan |
| `suiteId` | path | Yes | integer (int32) | ID of the suite |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |
| `configurationId` | query | No | string | Filter by specific configuration ID |
| `testCaseId` | query | No | string | Filter by specific test case ID |
| `testPointIds` | query | No | string | Comma-separated list of point IDs |
| `witFields` | query | No | string | Comma-separated list of work item fields |
| `includePointDetails` | query | No | boolean | Include all point details (fuller responses) |
| `$skip` | query | No | integer (int32) | Number of points to skip |
| `$top` | query | No | integer (int32) | Number of points to return |

### Query Parameter Details

**includePointDetails** (optional):
- **Type**: boolean
- **Default**: false
- **Purpose**: When `true`, includes all detailed properties like failure types, last run details, etc.
- **Use**: Set to `true` when you need comprehensive information; `false` for lightweight responses

**Filtering Priority**:
1. `testPointIds` - Specific point IDs (most restrictive)
2. `testCaseId` - Test case filter
3. `configurationId` - Configuration filter
4. Default - All points in suite

### Response
- **Status Code**: `200 OK`
- **Body**: `TestPoint[]`

```json
{
  "value": [
    {
      "id": 1,
      "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Plans/1/Suites/1/Points/1",
      "assignedTo": {
        "id": "d291b0c4-a05c-4ea6-8df1-4b41d5f39eff",
        "displayName": "Jamal Hartnett"
      },
      "configuration": {
        "id": "2",
        "name": "Windows 8"
      },
      "outcome": "Passed",
      "state": "Completed",
      "testCase": {
        "id": "39"
      }
    }
  ],
  "count": 1
}
```

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test`

---

## 4. Update Test Points

Update one or more test points (outcome, tester assignment, reset to active).

### HTTP Request
```http
PATCH https://dev.azure.com/{organization}/{project}/_apis/test/Plans/{planId}/Suites/{suiteId}/points/{pointIds}?api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `planId` | path | Yes | integer (int32) | ID of the test plan |
| `suiteId` | path | Yes | integer (int32) | ID of the suite |
| `pointIds` | path | Yes | string | Comma-separated list of point IDs to update |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |

### Request Body
```json
{
  "outcome": "Passed",
  "tester": {
    "displayName": "Jamal Hartnett"
  },
  "resetToActive": false
}
```

**Body Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `outcome` | string | New outcome (Passed, Failed, Blocked, etc.) |
| `tester` | IdentityRef | New assigned tester |
| `resetToActive` | boolean | Reset point to Active state and clear outcomes |

### Outcome Values

| Outcome | Description |
|---------|-------------|
| `Passed` | Test passed |
| `Failed` | Test failed |
| `Blocked` | Test blocked by external issues |
| `NotApplicable` | Test not applicable for configuration |
| `Unspecified` | No outcome specified (default) |

### Response
- **Status Code**: `200 OK`
- **Body**: `TestPoint[]` (updated points)

```json
{
  "count": 1,
  "value": [
    {
      "id": 1,
      "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Plans/1/Suites/1/Points/1",
      "assignedTo": {
        "id": "d291b0c4-a05c-4ea6-8df1-4b41d5f39eff",
        "displayName": "Jamal Hartnett"
      },
      "outcome": "Passed",
      "state": "Completed",
      "revision": 24
    }
  ]
}
```

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test_write`

---

## Object Schemas

### TestPoint

Represents a test point (pairing of test case with configuration).

```json
{
  "id": 1,
  "automated": false,
  "assignedTo": { /* IdentityRef */ },
  "comment": "Test point comment",
  "configuration": { /* ShallowReference */ },
  "failureType": "None",
  "lastResetToActive": "2014-05-28T16:14:41.393Z",
  "lastResolutionStateId": 0,
  "lastResult": { /* ShallowReference */ },
  "lastResultDetails": { /* LastResultDetails */ },
  "lastResultState": "Completed",
  "lastRunBuildNumber": "1.0.0.0",
  "lastTestRun": { /* ShallowReference */ },
  "lastUpdatedBy": { /* IdentityRef */ },
  "lastUpdatedDate": "2014-05-28T16:14:41.393Z",
  "outcome": "Passed",
  "revision": 22,
  "state": "Completed",
  "suite": { /* ShallowReference */ },
  "testCase": { /* WorkItemReference */ },
  "testPlan": { /* ShallowReference */ },
  "url": "https://dev.azure.com/...",
  "workItemProperties": []
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `id` | integer (int32) | Test point ID |
| `automated` | boolean | Whether test is automated |
| `assignedTo` | IdentityRef | Currently assigned tester |
| `comment` | string | Comment on test point |
| `configuration` | ShallowReference | Configuration (Windows 10, etc.) |
| `failureType` | string | Type of failure (None, KnownIssue, NewIssue, Regression) |
| `lastResetToActive` | string (date-time) | When point was last reset to Active |
| `lastResult` | ShallowReference | Last test result reference |
| `lastResultDetails` | LastResultDetails | Detailed last result information |
| `lastTestRun` | ShallowReference | Last test run reference |
| `outcome` | string | Current outcome (Passed, Failed, etc.) |
| `state` | string | Current state (Ready, Completed, NotReady, InProgress) |
| `revision` | integer (int32) | Revision number |
| `testCase` | WorkItemReference | Associated test case workitem |
| `testPlan` | ShallowReference | Parent test plan |
| `url` | string | URL to this point |

---

### LastResultDetails

Details about the most recent test result.

```json
{
  "dateCompleted": "2014-05-04T13:00:44.567Z",
  "duration": 5871,
  "runBy": {
    "id": "d291b0c4-a05c-4ea6-8df1-4b41d5f39eff",
    "displayName": "Jamal Hartnett"
  }
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `dateCompleted` | string (date-time) | When last result completed (UTC) |
| `duration` | integer (int64) | Execution duration in milliseconds |
| `runBy` | IdentityRef | User who executed the test |

---

### PointsFilter

Filter criteria for querying test points.

```json
{
  "testcaseIds": [7, 8, 9],
  "configurationNames": ["Windows 10"],
  "testers": [
    {
      "displayName": "Fabrikam Fiber"
    }
  ]
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `testcaseIds` | integer[] | Filter by test case IDs |
| `configurationNames` | string[] | Filter by configuration names |
| `testers` | IdentityRef[] | Filter by assigned testers (by displayName) |

---

### PointUpdateModel

Model for updating test point properties.

```json
{
  "outcome": "Passed",
  "tester": {
    "displayName": "Jamal Hartnett"
  },
  "resetToActive": false
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `outcome` | string | New test outcome |
| `tester` | IdentityRef | New assigned tester |
| `resetToActive` | boolean | Reset point to Active (clears outcome) |

---

### IdentityRef

Reference to an Azure DevOps identity (user/group).

```json
{
  "id": "d291b0c4-a05c-4ea6-8df1-4b41d5f39eff",
  "displayName": "Jamal Hartnett",
  "uniqueName": "fabrikamfiber4@hotmail.com",
  "url": "https://vssps.dev.azure.com/fabrikam/_apis/Identities/...",
  "imageUrl": "https://dev.azure.com/fabrikam/_api/_common/identityImage?id=..."
}
```

---

### ShallowReference

Abstracted reference to another resource.

```json
{
  "id": "1",
  "name": "sprint1",
  "url": "https://dev.azure.com/fabrikam/..."
}
```

---

## Point States

| State | Description |
|-------|-------------|
| `Ready` | Point ready for testing |
| `Completed` | Point test execution completed |
| `InProgress` | Point is being tested |
| `NotReady` | Point not ready (may have issues) |
| `Blocked` | Point blocked (cannot proceed) |

---

## Common Workflows

### Workflow 1: Get Single Test Point

Retrieve basic information about a specific test point.

```bash
organization="fabrikam"
project="fabrikam-fiber-tfvc"
planId=1
suiteId=1
pointId=1

curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/Plans/$planId/Suites/$suiteId/points/$pointId?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN"

# Response includes point assignment, configuration, outcome, state
```

### Workflow 2: Query Points by Test Case

Find all test points for specific test cases across all configurations.

```bash
organization="fabrikam"
project="fabrikam-fiber-tfvc"

curl -X POST "https://dev.azure.com/$organization/$project/_apis/test/points?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pointsFilter": {
      "testcaseIds": [7, 8, 9]
    }
  }'

# Response lists all points for test cases 7, 8, 9
```

### Workflow 3: Filter Points by Configuration and Tester

Query points matching specific environment and tester criteria.

```bash
organization="fabrikam"
project="fabrikam-fiber-tfvc"

curl -X POST "https://dev.azure.com/$organization/$project/_apis/test/points?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pointsFilter": {
      "testcaseIds": [7, 8, 9],
      "configurationNames": ["Windows 10"],
      "testers": [
        {
          "displayName": "Fabrikam Fiber"
        }
      ]
    }
  }'

# Response lists only points for test cases 7-9, Windows 10 config, assigned to Fabrikam Fiber
```

### Workflow 4: List Points with Pagination

Retrieve test points page-by-page.

```bash
organization="fabrikam"
project="fabrikam-fiber-tfvc"
planId=1
suiteId=1
pageSize=10
skipCount=0

curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/Plans/$planId/Suites/$suiteId/points?\$skip=$skipCount&\$top=$pageSize&api-version=7.1" \
  -H "Authorization: Bearer $TOKEN"

# Returns page of 10 points
# Next page: $skip=10&$top=10, etc.
```

### Workflow 5: Update Point Outcome

Mark a test point as passed.

```bash
organization="fabrikam"
project="fabrikam-fiber-tfvc"
planId=1
suiteId=1
pointIds="1,2,3"

curl -X PATCH "https://dev.azure.com/$organization/$project/_apis/test/Plans/$planId/Suites/$suiteId/points/$pointIds?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "outcome": "Passed"
  }'

# Updates points 1, 2, 3 to Passed status
```

### Workflow 6: Reassign Tester

Change the assigned tester for test points.

```bash
organization="fabrikam"
project="fabrikam-fiber-tfvc"
planId=1
suiteId=1
pointId=1

curl -X PATCH "https://dev.azure.com/$organization/$project/_apis/test/Plans/$planId/Suites/$suiteId/points/$pointId?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tester": {
      "displayName": "New Tester Name"
    }
  }'

# Assigns test point to new tester
```

### Workflow 7: Reset Point to Active

Clear outcomes and reset test point to ready state.

```bash
organization="fabrikam"
project="fabrikam-fiber-tfvc"
planId=1
suiteId=1
pointIds="1,2"

curl -X PATCH "https://dev.azure.com/$organization/$project/_apis/test/Plans/$planId/Suites/$suiteId/points/$pointIds?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resetToActive": true
  }'

# Resets points 1, 2 to Ready state and clears outcomes
```

### Workflow 8: Get Points with Enhanced Details

Retrieve test points with full details (tester info, URLs, etc.).

```bash
organization="fabrikam"
project="fabrikam-fiber-tfvc"
planId=1
suiteId=1

curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/Plans/$planId/Suites/$suiteId/points?includePointDetails=true&api-version=7.1" \
  -H "Authorization: Bearer $TOKEN"

# Response includes all properties and nested references
```

### Workflow 9: Extract Points with Specific Fields

Get points and include custom work item fields.

```bash
organization="fabrikam"
project="fabrikam-fiber-tfvc"
planId=1
suiteId=1

curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/Plans/$planId/Suites/$suiteId/points?witFields=System.Title,System.Priority,Microsoft.VSTS.TCM.AutomationStatus&api-version=7.1" \
  -H "Authorization: Bearer $TOKEN"

# Response includes requested work item fields
```

---

## Performance Optimization

### Minimize Response Size
```bash
# Without details - lighter response
GET /Plans/{planId}/Suites/{suiteId}/points?api-version=7.1

# With details - heavier response
GET /Plans/{planId}/Suites/{suiteId}/points?includePointDetails=true&api-version=7.1
```

### Selective Field Loading
```bash
# Request only needed fields
witFields=System.Title,System.State
```

### Pagination for Large Suites
```bash
# Don't retrieve all at once - paginate
$skip=0&$top=100
$skip=100&$top=100
$skip=200&$top=100
```

---

## Filtering Best Practices

1. **Use testPointIds for Specific Points**: Most restrictive, fastest
2. **Use testCaseId for Case-Level Queries**: Filter by test case
3. **Use configurationId for Configuration-Specific**: Single configuration points
4. **Use POST for Complex Queries**: PointsFilter supports multiple criteria

---

## State Transitions

| From State | Possible To | Action Required |
|-----------|------------|-----------------|
| Ready | InProgress | Execute test |
| InProgress | Completed | Complete execution |
| Completed | Ready | Reset to Active |
| Blocked | Ready | Resolve blocker |
| NotReady | Ready | Reset to Active |

---

## Authentication & Scopes

### OAuth2 Scopes

| Scope | Description | Operations |
|-------|-------------|------------|
| `vso.test` | Read test points | GET operations |
| `vso.test_write` | Read/write test points | POST, PATCH operations |

### Basic Authentication (Alternative)

```bash
Authorization: Basic $(echo -n ":$PAT" | base64)
```

---

## Error Handling

### Common Status Codes

| Code | Description | Resolution |
|------|-------------|-----------|
| `200 OK` | Successful operation | Point data available |
| `400 Bad Request` | Invalid parameters | Verify IDs and filters |
| `401 Unauthorized` | Authentication failed | Check token/credentials |
| `403 Forbidden` | Insufficient permissions | User needs test scope |
| `404 Not Found` | Point not found | Verify point exists |

### Error Response Example

```json
{
  "error": {
    "code": "ResourceNotFoundException",
    "message": "Test point 999 not found in suite 1"
  }
}
```

---

## Licensing Requirements

- **Test Manager Extension**: Required for test point features
- **Plan Management**: User must have access to test plans
- **Permissions**: Read access for GET, Write access for PATCH

---

## Best Practices

1. **Use Lightweight Queries First**: Start without `includePointDetails`, add only if needed
2. **Batch Updates**: Update multiple points in single request with comma-separated IDs
3. **Implement Pagination**: Use `$skip` and `$top` for large result sets
4. **Cache Configuration Data**: Configuration references don't change frequently
5. **Filter Server-Side**: Use query filters rather than client-side filtering
6. **Handle Concurrency**: Note revision numbers for concurrent updates
7. **Monitor Rate Limits**: Respect Azure DevOps API throttling

---

## References

- [Microsoft Azure DevOps REST API - Test Points](https://learn.microsoft.com/en-us/rest/api/azure/devops/test/points)
- [Test Planning Documentation](https://learn.microsoft.com/en-us/azure/devops/test/create-test-cases)
- [Test Configurations](https://learn.microsoft.com/en-us/azure/devops/test/test-different-configurations)
- [Azure DevOps REST API Version 7.1](https://learn.microsoft.com/en-us/rest/api/azure/devops)
- [Test Suite Management](https://learn.microsoft.com/en-us/azure/devops/test/create-test-suites)
