# Test Iterations - Azure DevOps Integration

## Overview

Comprehensive support for Azure DevOps Test Iterations REST APIs. Enables programmatic retrieval of manual test execution iterations, including step-by-step results, parameters, and attachments captured during test runs.

### Test Iteration Concepts

**Test Iteration**: A single execution of a test case within a test run. Manual tests can be executed multiple times, with each execution being a separate iteration.

**Action Result**: The outcome (pass/fail) of an individual test step executed within an iteration.

**Test Parameter**: Variables or data inputs used during test execution within an iteration.

**Shared Step**: Reusable test steps that can be referenced from multiple test cases.

**Step Identifier**: Hierarchical identifier for test steps, supporting nested shared steps.

**Action Path**: Hexadecimal identifier for each test step in a test case.

---

## Service Details

- **Service**: Test
- **API Version**: `7.1`
- **Base URL**: `https://dev.azure.com/{organization}/{project}/_apis/test`
- **Authentication**: OAuth2 with appropriate scopes
- **Licensing**: Test Manager Extension with specific access levels required

---

## API Endpoints

### Test Iteration Operations

Test iteration endpoints provide detailed information about manual test execution, including the outcome of individual test steps and the parameters used during execution.

---

## 1. Get Test Iteration

Retrieve detailed information for a specific test iteration.

### HTTP Request
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/Results/{testCaseResultId}/iterations/{iterationId}?api-version=7.1
```

### With Optional Parameters
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/Results/{testCaseResultId}/iterations/{iterationId}?includeActionResults={includeActionResults}&api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `runId` | path | Yes | integer (int32) | ID of the test run containing the result |
| `testCaseResultId` | path | Yes | integer (int32) | ID of the test result containing the iterations |
| `iterationId` | path | Yes | integer (int32) | ID of the iteration to retrieve |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |
| `includeActionResults` | query | No | boolean | Include step-by-step action results and parameters (default: false) |

### Query Parameter Details

**includeActionResults** (optional):
- **Type**: boolean
- **Default**: false
- **Purpose**: When `true`, includes detailed results for each test step and all test parameters used in the iteration
- **Use Case**: Set to `true` when you need step-level outcomes, parameter values, and timing information
- **Performance**: Larger response payload with `true`; use `false` for lightweight summary

### Response
- **Status Code**: `200 OK`
- **Body**: `TestIterationDetailsModel`

#### Without includeActionResults

```json
{
  "id": 1,
  "outcome": "Passed",
  "errorMessage": "",
  "startedDate": "2014-05-04T13:00:38.697Z",
  "completedDate": "2014-05-04T13:00:44.567Z",
  "durationInMs": 5871,
  "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Runs/4/Results/100000?iterationId=1"
}
```

#### With includeActionResults=true

```json
{
  "id": 1,
  "outcome": "Passed",
  "errorMessage": "",
  "startedDate": "2014-05-04T13:00:38.697Z",
  "completedDate": "2014-05-04T13:00:44.567Z",
  "durationInMs": 5871,
  "actionResults": [
    {
      "actionPath": "00000002",
      "iterationId": 1,
      "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Runs/4/Results/100000/Iterations/1/ActionResults?actionPath=00000002",
      "outcome": "Passed",
      "startedDate": "2014-05-04T13:00:38Z",
      "completedDate": "2014-05-04T13:00:38Z",
      "durationInMs": 0,
      "comment": "Step executed successfully"
    },
    {
      "actionPath": "00000003",
      "iterationId": 1,
      "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Runs/4/Results/100000/Iterations/1/ActionResults?actionPath=00000003",
      "outcome": "Passed",
      "startedDate": "2014-05-04T13:00:38Z",
      "completedDate": "2014-05-04T13:00:38Z",
      "durationInMs": 0
    },
    {
      "actionPath": "00000004",
      "iterationId": 1,
      "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Runs/4/Results/100000/Iterations/1/ActionResults?actionPath=00000004",
      "outcome": "Passed",
      "startedDate": "2014-05-04T13:00:38Z",
      "completedDate": "2014-05-04T13:00:38Z",
      "durationInMs": 0
    }
  ],
  "parameters": [
    {
      "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Runs/4/Results/100000/Iterations/1/ParameterResults?paramName=username",
      "iterationId": 1,
      "actionPath": "00000002",
      "parameterName": "username",
      "stepIdentifier": "1",
      "value": "abc"
    },
    {
      "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Runs/4/Results/100000/Iterations/1/ParameterResults?paramName=password",
      "iterationId": 1,
      "actionPath": "00000003",
      "parameterName": "password",
      "stepIdentifier": "1;2",
      "value": "new"
    }
  ],
  "attachments": [
    {
      "id": 5,
      "iterationId": 1,
      "actionPath": "00000002",
      "name": "screenshot.png",
      "size": 2048,
      "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Runs/4/Results/100000/Iterations/1/Attachments/5"
    }
  ],
  "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Runs/4/Results/100000?iterationId=1"
}
```

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test`

---

## 2. List Test Iterations

Retrieve all iterations for a specific test result.

### HTTP Request
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/Results/{testCaseResultId}/iterations?api-version=7.1
```

### With Optional Parameters
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/Results/{testCaseResultId}/iterations?includeActionResults={includeActionResults}&api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `runId` | path | Yes | integer (int32) | ID of the test run containing the result |
| `testCaseResultId` | path | Yes | integer (int32) | ID of the test result containing the iterations |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |
| `includeActionResults` | query | No | boolean | Include step-by-step action results and parameters (default: false) |

### Response
- **Status Code**: `200 OK`
- **Body**: `TestIterationDetailsModel[]`

```json
{
  "count": 2,
  "value": [
    {
      "id": 1,
      "outcome": "Passed",
      "errorMessage": "",
      "startedDate": "2014-05-04T13:00:38.697Z",
      "completedDate": "2014-05-04T13:00:44.567Z",
      "durationInMs": 5871,
      "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Runs/4/Results/100000?iterationId=1"
    },
    {
      "id": 2,
      "outcome": "Passed",
      "errorMessage": "",
      "startedDate": "2014-05-04T13:00:38.7Z",
      "completedDate": "2014-05-04T13:00:56.637Z",
      "durationInMs": 17938,
      "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Runs/4/Results/100000?iterationId=2"
    }
  ]
}
```

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test`

---

## Object Schemas

### TestIterationDetailsModel

Represents a complete test iteration result with optional detailed step and parameter information.

```json
{
  "id": 1,
  "outcome": "Passed",
  "errorMessage": "",
  "comment": "Iteration completed successfully",
  "startedDate": "2014-05-04T13:00:38.697Z",
  "completedDate": "2014-05-04T13:00:44.567Z",
  "durationInMs": 5871,
  "actionResults": [ /* TestActionResultModel[] */ ],
  "parameters": [ /* TestResultParameterModel[] */ ],
  "attachments": [ /* TestCaseResultAttachmentModel[] */ ],
  "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Runs/4/Results/100000?iterationId=1"
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `id` | integer (int32) | Unique iteration ID |
| `outcome` | string | Test result outcome (Passed, Failed, Blocked, NotApplicable, Paused) |
| `errorMessage` | string | Error message if iteration failed |
| `comment` | string | Comment added by tester |
| `startedDate` | string (date-time) | When iteration started (ISO 8601, UTC) |
| `completedDate` | string (date-time) | When iteration completed (ISO 8601, UTC) |
| `durationInMs` | number (double) | Total execution duration in milliseconds |
| `actionResults` | TestActionResultModel[] | Step results (only if includeActionResults=true) |
| `parameters` | TestResultParameterModel[] | Test parameters used (only if includeActionResults=true) |
| `attachments` | TestCaseResultAttachmentModel[] | Attachments collected during iteration |
| `url` | string | URL to this iteration result |

---

### TestActionResultModel

Represents the result of a single test step execution.

```json
{
  "actionPath": "00000002",
  "iterationId": 1,
  "outcome": "Passed",
  "errorMessage": "",
  "comment": "Step executed as expected",
  "startedDate": "2014-05-04T13:00:38Z",
  "completedDate": "2014-05-04T13:00:38Z",
  "durationInMs": 0,
  "stepIdentifier": "1",
  "sharedStepModel": null,
  "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Runs/4/Results/100000/Iterations/1/ActionResults?actionPath=00000002"
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `actionPath` | string | Hexadecimal path identifier (8 digits per step level) |
| `iterationId` | integer (int32) | Parent iteration ID |
| `outcome` | string | Step result (Passed, Failed, Blocked, NotApplicable, Paused) |
| `errorMessage` | string | Error message if step failed |
| `comment` | string | Comment on step result |
| `startedDate` | string (date-time) | When step execution started (UTC) |
| `completedDate` | string (date-time) | When step execution completed (UTC) |
| `durationInMs` | number (double) | Step execution duration in milliseconds |
| `stepIdentifier` | string | Hierarchical step ID (e.g., "1" for normal step, "2;1" for nested shared step) |
| `sharedStepModel` | SharedStepModel | Reference to shared step workitem (if applicable) |
| `url` | string | URL to detailed step results |

#### actionPath Format
- **Representation**: Hexadecimal with 8 digits per step level
- **Examples**:
  - `00000002` = Step 1 (first step ID starts at 2)
  - `0000000a` = Step 9 (hex a = decimal 10, so step ID 10 = step 9)
  - `00000010` = Step 15 (hex 10 = decimal 16, so step 16 = step 15)
  - `0000000300000001` = Shared step with nested step (03 parent, 01 child)

#### stepIdentifier Format
- **Simple Step**: "1", "2", "3", etc.
- **Nested Shared Step**: "2;1" (step 2 is shared step containing step 1)
- **Deeply Nested**: "2;3;1" (step 2 shared → step 3 → step 1)

---

### TestResultParameterModel

Represents a test parameter value used during iteration execution.

```json
{
  "iterationId": 1,
  "actionPath": "00000002",
  "parameterName": "username",
  "stepIdentifier": "1",
  "value": "abc",
  "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Runs/4/Results/100000/Iterations/1/ParameterResults?paramName=username"
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `iterationId` | integer (int32) | Parent iteration ID |
| `actionPath` | string | Step where parameter is used (hexadecimal format) |
| `parameterName` | string | Name of the parameter |
| `stepIdentifier` | string | Hierarchical step ID where parameter is used |
| `value` | string | Actual value used during test execution |
| `url` | string | URL to parameter details (deprecated in hosted) |

---

### TestCaseResultAttachmentModel

Represents a file attachment collected during test iteration.

```json
{
  "id": 5,
  "iterationId": 1,
  "actionPath": "00000002",
  "name": "screenshot.png",
  "size": 2048,
  "url": "https://dev.azure.com/fabrikam/fabrikam-fiber-tfvc/_apis/test/Runs/4/Results/100000/Iterations/1/Attachments/5"
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `id` | integer (int32) | Attachment ID |
| `iterationId` | integer (int32) | Parent iteration ID |
| `actionPath` | string | Step path where attachment was added |
| `name` | string | Filename of attachment |
| `size` | integer (int64) | File size in bytes |
| `url` | string | URL to download attachment |

---

### SharedStepModel

Reference to a reusable shared step workitem.

```json
{
  "id": 12345,
  "revision": 2
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `id` | integer (int32) | Shared step workitem ID |
| `revision` | integer (int32) | Revision of the shared step workitem |

---

## Test Iteration Outcomes

| Outcome | Description |
|---------|-------------|
| `Passed` | All steps passed successfully |
| `Failed` | One or more steps failed |
| `Blocked` | Test blocked due to environment/infrastructure issues |
| `NotApplicable` | Test not applicable for this configuration |
| `Paused` | Test execution paused by tester |

---

## Common Workflows

### Workflow 1: Get Summary of Test Iteration

Retrieve basic iteration information without step details.

```bash
organization="fabrikam"
project="fabrikam-fiber-tfvc"
runId=4
testCaseResultId=100000
iterationId=1

curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/Runs/$runId/Results/$testCaseResultId/iterations/$iterationId?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN"

# Response includes:
# - Overall outcome (Passed/Failed)
# - Start and end times
# - Total duration
# - URL to detailed information
```

### Workflow 2: Get Complete Iteration Details (With Steps & Parameters)

Retrieve full iteration information including step-by-step results.

```bash
organization="fabrikam"
project="fabrikam-fiber-tfvc"
runId=4
testCaseResultId=100000
iterationId=1

curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/Runs/$runId/Results/$testCaseResultId/iterations/$iterationId?includeActionResults=true&api-version=7.1" \
  -H "Authorization: Bearer $TOKEN"

# Response includes:
# - Overall outcome
# - Individual step results (actionResults)
# - Parameter values used (parameters)
# - Attachments collected
# - Timing for each step
```

### Workflow 3: List All Iterations for a Test Result

Retrieve summary of all iterations for a test case result.

```bash
organization="fabrikam"
project="fabrikam-fiber-tfvc"
runId=4
testCaseResultId=100000

curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/Runs/$runId/Results/$testCaseResultId/iterations?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN"

# Response includes array of all iterations
# Use to understand how many times test was executed
# and outcomes of each execution
```

### Workflow 4: Analyze Iteration Failures

Retrieve detailed failure information and identify failing steps.

```bash
organization="fabrikam"
project="fabrikam-fiber-tfvc"
runId=4
testCaseResultId=100000
iterationId=2

curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/Runs/$runId/Results/$testCaseResultId/iterations/$iterationId?includeActionResults=true&api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" | jq '.actionResults[] | select(.outcome == "Failed")'

# Query returns only failed steps, showing:
# - Which step failed
# - Error message
# - Parameter values at failure point
# - Timing information
```

### Workflow 5: Extract Test Data from Iterations

Parse iterations to capture test parameters and results.

```javascript
// Assuming response data in 'iterations'
iterations.value.forEach(iteration => {
  console.log(`Iteration ${iteration.id}:`);
  console.log(`  Outcome: ${iteration.outcome}`);
  console.log(`  Duration: ${iteration.durationInMs}ms`);
  console.log(`  Time: ${iteration.startedDate} to ${iteration.completedDate}`);
  
  if (iteration.parameters) {
    console.log(`  Parameters:`);
    iteration.parameters.forEach(param => {
      console.log(`    ${param.parameterName} = ${param.value}`);
    });
  }
  
  if (iteration.actionResults) {
    console.log(`  Steps:`);
    iteration.actionResults.forEach(action => {
      console.log(`    Step ${action.stepIdentifier}: ${action.outcome}`);
    });
  }
});
```

### Workflow 6: Track Test Parameter Values Across Iterations

Compare parameter values used in different iterations to identify data variation.

```bash
organization="fabrikam"
project="fabrikam-fiber-tfvc"
runId=4
testCaseResultId=100000

# Get all iterations with parameters
curl -s -X GET "https://dev.azure.com/$organization/$project/_apis/test/Runs/$runId/Results/$testCaseResultId/iterations?includeActionResults=true&api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.value[] | {iterationId: .id, parameters: .parameters}'

# Output shows parameter variations across iterations
```

---

## Performance Considerations

### Choosing includeActionResults Value

**Use includeActionResults=false when**:
- You only need overall iteration outcome
- You want quick response time
- You need to list many iterations
- You're building a summary dashboard

**Use includeActionResults=true when**:
- You need step-level failure analysis
- You need to extract test parameter values
- You're debugging test execution issues
- You need complete audit trail

### Pagination & Optimization

- Results are not paginated; all iterations returned per result
- Consider filtering iterations client-side if you have many iterations
- Cache results if accessed repeatedly

---

## Step Identifier Interpretation

### Examples

| StepIdentifier | Meaning |
|---|---|
| `"1"` | Normal step 1 in test case |
| `"2"` | Normal step 2 in test case |
| `"2;1"` | Step 2 is a shared step, contains normal step 1 |
| `"2;3;1"` | Step 2 shared → Step 3 → normal step 1 |
| `"1;2;3"` | Three levels of nesting |

---

## Authentication & Scopes

### OAuth2 Scopes

| Scope | Description | Operations |
|-------|-------------|------------|
| `vso.test` | Read test plans, cases, results and iterations | All GET operations |

### Basic Authentication (Alternative)

For personal access tokens:

```bash
Authorization: Basic $(echo -n ":$PAT" | base64)
```

---

## Error Handling

### Common Status Codes

| Code | Description | Resolution |
|------|-------------|-----------|
| `200 OK` | Successful operation | Iteration data available |
| `400 Bad Request` | Invalid parameters | Verify runId, testCaseResultId, iterationId |
| `401 Unauthorized` | Authentication failed | Check token/credentials |
| `403 Forbidden` | Insufficient permissions | User needs vso.test scope |
| `404 Not Found` | Iteration not found | Verify iteration exists in result |

### Error Response Example

```json
{
  "error": {
    "code": "ResourceNotFoundException",
    "message": "Iteration 999 not found for result 100000"
  }
}
```

---

## Licensing Requirements

- **Test Manager Extension**: Required for test iteration features
- **Manual Testing**: Iterations only available for manual test results
- **Permissions**: User must have Read permission on the project

---

## Best Practices

1. **Use Summary First**: Start with includeActionResults=false, upgrade only if needed
2. **Identify Failures Early**: Use actionResults filtering to quickly locate failed steps
3. **Extract Parameters Consistently**: Use stepIdentifier to match parameters to steps
4. **Track Duration**: Monitor durationInMs to identify performance regressions
5. **Analyze Trends**: Compare outcomes across iterations to identify patterns
6. **Cache Results**: Avoid repeated requests for the same iteration data

---

## References

- [Microsoft Azure DevOps REST API - Test Iterations](https://learn.microsoft.com/en-us/rest/api/azure/devops/test/iterations)
- [Manual Test Execution Guide](https://learn.microsoft.com/en-us/azure/devops/test/manual-test-tutorials)
- [Test Results Documentation](https://learn.microsoft.com/en-us/azure/devops/test/overview)
- [Azure DevOps REST API Version 7.1](https://learn.microsoft.com/en-us/rest/api/azure/devops)
- [Shared Steps in Test Cases](https://learn.microsoft.com/en-us/azure/devops/test/create-test-cases)
