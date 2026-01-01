# Test Management - Azure DevOps Integration

## Overview

Comprehensive support for Azure DevOps Test Management REST APIs. Enables programmatic management of test plans, test suites, test cases, test runs, and test attachments.

### Test Management Concepts

**Test Case**: Describes the steps to take when running a test.

**Test Suite**: A group of test cases organized together for logical testing activities.

**Test Plan**: A collection of test suites that need to be run for a particular iteration or release.

**Test Point**: A pairing of a test case with a test configuration that needs to be run for the test plan.

**Test Run**: A set of test points that are executed together. Contains the execution results of those test points.

**Test Result**: The outcome of running a test in a test run, including pass/fail status and any attachments.

---

## Service Details

- **Service**: Test
- **API Version**: `7.1`
- **Base URL**: `https://dev.azure.com/{organization}/{project}/_apis/test`
- **Authentication**: OAuth2 with appropriate scopes
- **Licensing**: Test Manager Extension with specific access levels required

---

## API Endpoints

### Test Attachments

Test attachments enable you to attach files to test results, test runs, and test sub-results for documentation, evidence, and debugging purposes.

---

## 1. Create Test Result Attachment

Attach a file to a test result.

### HTTP Request
```http
POST https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/Results/{testCaseResultId}/attachments?api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `runId` | path | Yes | integer (int32) | ID of the test run that contains the result |
| `testCaseResultId` | path | Yes | integer (int32) | ID of the test result to attach file to |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |

### Request Body
```json
{
  "stream": "VXNlciB0ZXh0IGNvbnRlbnQgdG8gdXBsb2FkLg==",
  "fileName": "textAsFileAttachment.txt",
  "comment": "Test attachment upload",
  "attachmentType": "GeneralAttachment"
}
```

**Body Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `stream` | string | Base64 encoded file content |
| `fileName` | string | Name of the attachment file |
| `comment` | string | Comment associated with the attachment |
| `attachmentType` | string | Type of attachment (see AttachmentType enum) |

### Response
- **Status Code**: `200 OK`
- **Body**: `TestAttachmentReference`

```json
{
  "id": 4,
  "url": "https://dev.azure.com/fabrikam/Fabrikam/_apis/test/Runs/49/Results/100000/Attachments/4"
}
```

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test_write`

---

## 2. Create Test Run Attachment

Attach a file to a test run.

### HTTP Request
```http
POST https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/attachments?api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `runId` | path | Yes | integer (int32) | ID of the test run to attach file to |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |

### Request Body
```json
{
  "stream": "iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABlSURBVDhP7cxBCsAgDERR739pG/CnGJI0FopQ8O2cjNP6R85QbeNQU7wT1dkijaQ3vkZoWElaoTeJojW01cYh0jwfgiFBV/lEjOZtacijN/nLkOBHhIaVDgn+Wdycp6FXzlCl9wt0Y0cAzHo/zgAAAABJRU5ErkJggg==",
  "fileName": "imageAsFileAttachment.png",
  "comment": "Test attachment upload",
  "attachmentType": "GeneralAttachment"
}
```

### Response
- **Status Code**: `200 OK`
- **Body**: `TestAttachmentReference`

```json
{
  "id": 3,
  "url": "https://dev.azure.com/fabrikam/Fabrikam/_apis/test/Runs/49/Attachments/3"
}
```

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test_write`

---

## 3. Create Test Sub Result Attachment

Attach a file to a test sub-result.

### HTTP Request
```http
POST https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/Results/{testCaseResultId}/attachments?testSubResultId={testSubResultId}&api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `runId` | path | Yes | integer (int32) | ID of the test run that contains the result |
| `testCaseResultId` | path | Yes | integer (int32) | ID of the test result that contains the sub-result |
| `testSubResultId` | query | Yes | integer (int32) | ID of the test sub-result to attach file to |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |

### Request Body
Same as test result attachment (see section 1).

### Response
- **Status Code**: `200 OK`
- **Body**: `TestAttachmentReference`

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test_write`

---

## 4. Get Test Result Attachments

Get list of test result attachments.

### HTTP Request
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/Results/{testCaseResultId}/attachments?api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `runId` | path | Yes | integer (int32) | ID of the test run that contains the result |
| `testCaseResultId` | path | Yes | integer (int32) | ID of the test result |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |

### Response
- **Status Code**: `200 OK`
- **Body**: `TestAttachment[]`

```json
{
  "count": 1,
  "value": [
    {
      "createdDate": "2016-07-13T13:09:45.427Z",
      "url": "https://dev.azure.com/fabrikam/Fabrikam-Fiber-TFVC/_apis/test/Runs/23/Results/100000/Attachments/19",
      "id": 19,
      "fileName": "textAsFileAttachment.txt",
      "comment": "Test attachment upload",
      "attachmentType": "generalAttachment",
      "size": 25
    }
  ]
}
```

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test` (read access)

---

## 5. Get Test Result Attachment (Download)

Download a test result attachment by its ID.

### HTTP Request
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/Results/{testCaseResultId}/attachments/{attachmentId}?api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `runId` | path | Yes | integer (int32) | ID of the test run |
| `testCaseResultId` | path | Yes | integer (int32) | ID of the test result |
| `attachmentId` | path | Yes | integer (int32) | ID of the attachment to download |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |

### Response
- **Status Code**: `200 OK`
- **Content Type**: `application/octet-stream` or `application/zip`
- **Body**: Binary file data

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test` (read access)

---

## 6. Get Test Run Attachments

Get list of test run attachments.

### HTTP Request
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/attachments?api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `runId` | path | Yes | integer (int32) | ID of the test run |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |

### Response
- **Status Code**: `200 OK`
- **Body**: `TestAttachment[]`

```json
{
  "count": 1,
  "value": [
    {
      "createdDate": "2016-07-13T13:09:44.89Z",
      "url": "https://dev.azure.com/fabrikam/Fabrikam-Fiber-TFVC/_apis/test/Runs/23/Attachments/18",
      "id": 18,
      "fileName": "imageAsFileAttachment.png",
      "comment": "Test attachment upload",
      "attachmentType": "generalAttachment",
      "size": 1024
    }
  ]
}
```

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test` (read access)

---

## 7. Get Test Run Attachment (Download)

Download a test run attachment by its ID.

### HTTP Request
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/attachments/{attachmentId}?api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `runId` | path | Yes | integer (int32) | ID of the test run |
| `attachmentId` | path | Yes | integer (int32) | ID of the attachment to download |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |

### Response
- **Status Code**: `200 OK`
- **Content Type**: `application/octet-stream` or `application/zip`
- **Body**: Binary file data

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test` (read access)

---

## 8. Get Test Sub Result Attachments

Get list of test sub-result attachments.

### HTTP Request
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/Results/{testCaseResultId}/attachments?testSubResultId={testSubResultId}&api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `runId` | path | Yes | integer (int32) | ID of the test run that contains the result |
| `testCaseResultId` | path | Yes | integer (int32) | ID of the test result that contains the sub-result |
| `testSubResultId` | query | Yes | integer (int32) | ID of the test sub-result |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |

### Response
- **Status Code**: `200 OK`
- **Body**: `TestAttachment[]`

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test` (read access)

---

## 9. Get Test Sub Result Attachment (Download)

Download a test sub-result attachment by its ID.

### HTTP Request
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/Results/{testCaseResultId}/attachments/{attachmentId}?testSubResultId={testSubResultId}&api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `runId` | path | Yes | integer (int32) | ID of the test run |
| `testCaseResultId` | path | Yes | integer (int32) | ID of the test result |
| `attachmentId` | path | Yes | integer (int32) | ID of the attachment to download |
| `testSubResultId` | query | Yes | integer (int32) | ID of the test sub-result |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |

### Response
- **Status Code**: `200 OK`
- **Content Type**: `application/octet-stream` or `application/zip`
- **Body**: Binary file data

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test` (read access)

---

## Object Schemas

### TestAttachmentReference

Reference to a test attachment returned after creation.

```json
{
  "id": 4,
  "url": "https://dev.azure.com/fabrikam/Fabrikam/_apis/test/Runs/49/Results/100000/Attachments/4"
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `id` | integer (int32) | ID of the attachment |
| `url` | string | URL to download the attachment |

---

### TestAttachment

Full test attachment object returned when listing attachments.

```json
{
  "attachmentType": "generalAttachment",
  "comment": "Test attachment upload",
  "createdDate": "2016-07-13T13:09:45.427Z",
  "fileName": "textAsFileAttachment.txt",
  "id": 19,
  "size": 25,
  "url": "https://dev.azure.com/fabrikam/Fabrikam-Fiber-TFVC/_apis/test/Runs/23/Results/100000/Attachments/19"
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `attachmentType` | AttachmentType | Type of the attachment (see enum below) |
| `comment` | string | Comment associated with the attachment |
| `createdDate` | string (date-time) | Attachment creation date (ISO 8601) |
| `fileName` | string | Name of the attachment file |
| `id` | integer (int32) | ID of the attachment |
| `size` | integer (int64) | File size in bytes |
| `url` | string | URL to download the attachment |

---

### TestAttachmentRequestModel

Request model for creating test attachments.

```json
{
  "attachmentType": "GeneralAttachment",
  "comment": "Test attachment upload",
  "fileName": "textAsFileAttachment.txt",
  "stream": "VXNlciB0ZXh0IGNvbnRlbnQgdG8gdXBsb2FkLg=="
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `attachmentType` | string | Type of attachment (see enum below) |
| `comment` | string | Comment associated with the attachment |
| `fileName` | string | Name of the attachment file |
| `stream` | string | Base64 encoded file content |

---

### AttachmentType

Enumeration of valid attachment types.

| Value | Description |
|-------|-------------|
| `GeneralAttachment` | General attachment (default) |
| `AfnStrip` | AFN strip attachment |
| `BugFilingData` | Bug filing data attachment |
| `CodeCoverage` | Code coverage data |
| `IntermediateCollectorData` | Intermediate collector data |
| `RunConfig` | Run configuration |
| `TestImpactDetails` | Test impact details |
| `TmiTestRunDeploymentFiles` | TMI test run deployment files |
| `TmiTestRunReverseDeploymentFiles` | TMI test run reverse deployment files |
| `TmiTestResultDetail` | TMI test result detail |
| `TmiTestRunSummary` | TMI test run summary |

---

## Common Workflows

### Workflow 1: Upload Test Result Attachment

```bash
# 1. Get test run and result IDs
runId=49
testCaseResultId=100000

# 2. Base64 encode file content
file_content="User text content to upload."
stream=$(echo -n "$file_content" | base64)

# 3. Create attachment
curl -X POST "https://dev.azure.com/fabrikam/Fabrikam/_apis/test/Runs/$runId/Results/$testCaseResultId/attachments?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"stream\": \"$stream\",
    \"fileName\": \"test-results.txt\",
    \"comment\": \"Test execution results\",
    \"attachmentType\": \"GeneralAttachment\"
  }"

# Response:
# {
#   "id": 4,
#   "url": "https://dev.azure.com/fabrikam/Fabrikam/_apis/test/Runs/49/Results/100000/Attachments/4"
# }
```

### Workflow 2: List Test Result Attachments

```bash
runId=49
testCaseResultId=100000

curl -X GET "https://dev.azure.com/fabrikam/Fabrikam/_apis/test/Runs/$runId/Results/$testCaseResultId/attachments?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN"

# Response contains array of TestAttachment objects
```

### Workflow 3: Download Test Result Attachment

```bash
runId=49
testCaseResultId=100000
attachmentId=4

curl -X GET "https://dev.azure.com/fabrikam/Fabrikam/_apis/test/Runs/$runId/Results/$testCaseResultId/attachments/$attachmentId?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" \
  -o downloaded-attachment.txt
```

### Workflow 4: Upload Test Run Attachment

```bash
runId=49

# Base64 encode image file
stream=$(base64 < screenshot.png)

curl -X POST "https://dev.azure.com/fabrikam/Fabrikam/_apis/test/Runs/$runId/attachments?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"stream\": \"$stream\",
    \"fileName\": \"screenshot.png\",
    \"comment\": \"Test execution screenshot\",
    \"attachmentType\": \"GeneralAttachment\"
  }"
```

---

## Authentication & Scopes

### OAuth2 Scopes

| Scope | Description | Operations |
|-------|-------------|------------|
| `vso.test_write` | Create/upload attachments | POST operations |
| `vso.test` | Read attachments | GET operations |

### Basic Authentication (Alternative)

For personal access tokens, use Basic authentication with empty username:

```bash
Authorization: Basic $(echo -n ":$PAT" | base64)
```

---

## Error Handling

### Common Status Codes

| Code | Description |
|------|-------------|
| `200 OK` | Successful operation |
| `400 Bad Request` | Invalid request parameters |
| `401 Unauthorized` | Authentication failed or missing scope |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Test run, result, or attachment not found |
| `413 Payload Too Large` | File exceeds size limit |

---

## Licensing Requirements

- **Test Manager Extension**: Required for test management features
- **Access Level**: Specific access levels required for different operations
- **Permissions**: User must have appropriate project permissions

---

## References

- [Microsoft Azure DevOps REST API - Test](https://learn.microsoft.com/en-us/rest/api/azure/devops/test)
- [Test Manager Documentation](https://learn.microsoft.com/en-us/azure/devops/test/overview)
- [Test Management Best Practices](https://learn.microsoft.com/en-us/azure/devops/test/manual-test-tutorials)
- [Azure DevOps REST API Version 7.1](https://learn.microsoft.com/en-us/rest/api/azure/devops)
