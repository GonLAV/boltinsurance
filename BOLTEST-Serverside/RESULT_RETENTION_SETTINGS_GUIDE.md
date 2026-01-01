# Result Retention Settings - Azure DevOps Integration

## Overview

Comprehensive support for Azure DevOps Result Retention Settings REST APIs. Enables programmatic management of test result retention policies for automated and manual test execution results.

### Result Retention Concepts

**Retention Duration**: The number of days test results are retained before automatic deletion from the system.

**Automated Test Results**: Results from automated test runs (CI/CD pipelines, scheduled tests).

**Manual Test Results**: Results from manual test execution (human testers running test cases).

**Retention Policy**: Project-level settings that control when test results are automatically cleaned up.

**Data Lifecycle**: Automatic deletion of test results based on retention duration to manage storage and maintain data compliance.

---

## Service Details

- **Service**: Test
- **API Version**: `7.1`
- **Base URL**: `https://dev.azure.com/{organization}/{project}/_apis/test`
- **Authentication**: OAuth2 with appropriate scopes
- **Licensing**: Test Manager Extension with specific access levels required

---

## API Endpoints

### Result Retention Setting Operations

Retention settings endpoints enable configuration of how long test results are retained before automatic deletion, with separate policies for automated and manual test results.

---

## 1. Get Result Retention Settings

Retrieve the current test result retention settings for a project.

### HTTP Request
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/resultretentionsettings?api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |

### Response
- **Status Code**: `200 OK`
- **Body**: `ResultRetentionSettings`

```json
{
  "lastUpdatedBy": {
    "id": "33d33df3-88ea-4704-a787-91092e0aa295",
    "displayName": "Fabrikam",
    "uniqueName": "fabrikamfiber.vsin@hotmail.com",
    "url": "https://dev.azure.com/fabrikam/_apis/Identities/33d33df3-88ea-4704-a787-91092e0aa295",
    "imageUrl": "https://dev.azure.com/fabrikam/_api/_common/identityImage?id=33d33df3-88ea-4704-a787-91092e0aa295"
  },
  "automatedResultsRetentionDuration": 30,
  "manualResultsRetentionDuration": 365,
  "lastUpdatedDate": "2015-10-15T04:23:12.203Z"
}
```

**Response Properties**:
| Name | Type | Description |
|------|------|-------------|
| `automatedResultsRetentionDuration` | integer (int32) | Retention duration for automated test results in days |
| `manualResultsRetentionDuration` | integer (int32) | Retention duration for manual test results in days |
| `lastUpdatedBy` | IdentityRef | User who last updated the settings |
| `lastUpdatedDate` | string (date-time) | When settings were last updated (ISO 8601, UTC) |

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test`

---

## 2. Update Result Retention Settings

Update the test result retention settings for a project.

### HTTP Request
```http
PATCH https://dev.azure.com/{organization}/{project}/_apis/test/resultretentionsettings?api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |

### Request Body
```json
{
  "automatedResultsRetentionDuration": 30,
  "manualResultsRetentionDuration": 100
}
```

**Body Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `automatedResultsRetentionDuration` | integer (int32) | No | Automated test results retention days (1-400) |
| `manualResultsRetentionDuration` | integer (int32) | No | Manual test results retention days (1-400) |

### Parameter Guidelines

**automatedResultsRetentionDuration**:
- **Range**: 1-400 days
- **Common Values**: 7, 14, 30, 60, 90
- **Default**: 30 days
- **Use Case**: CI/CD pipeline results, scheduled automated tests
- **Recommendation**: Keep shorter for frequently-run automated tests

**manualResultsRetentionDuration**:
- **Range**: 1-400 days
- **Common Values**: 90, 180, 365
- **Default**: 365 days
- **Use Case**: Manual test execution by QA teams
- **Recommendation**: Keep longer for compliance/audit requirements

### Response
- **Status Code**: `200 OK`
- **Body**: `ResultRetentionSettings`

```json
{
  "lastUpdatedBy": {
    "id": "a5cbf24d-799f-452e-82be-f049a85b5895",
    "displayName": "Fabrikam",
    "uniqueName": "fabrikamfiber.vsin@hotmail.com",
    "url": "https://dev.azure.com/fabrikam/_apis/Identities/a5cbf24d-799f-452e-82be-f049a85b5895",
    "imageUrl": "https://dev.azure.com/fabrikam/_api/_common/identityImage?id=a5cbf24d-799f-452e-82be-f049a85b5895"
  },
  "automatedResultsRetentionDuration": 30,
  "manualResultsRetentionDuration": 100,
  "lastUpdatedDate": "2016-07-13T10:15:13.367Z"
}
```

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test_write`

---

## Object Schemas

### ResultRetentionSettings

Represents test result retention policy configuration for a project.

```json
{
  "automatedResultsRetentionDuration": 30,
  "manualResultsRetentionDuration": 365,
  "lastUpdatedBy": {
    "id": "33d33df3-88ea-4704-a787-91092e0aa295",
    "displayName": "Fabrikam",
    "uniqueName": "fabrikamfiber.vsin@hotmail.com",
    "url": "https://dev.azure.com/fabrikam/_apis/Identities/33d33df3-88ea-4704-a787-91092e0aa295"
  },
  "lastUpdatedDate": "2015-10-15T04:23:12.203Z"
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `automatedResultsRetentionDuration` | integer (int32) | Automated test results retention in days (1-400) |
| `manualResultsRetentionDuration` | integer (int32) | Manual test results retention in days (1-400) |
| `lastUpdatedBy` | IdentityRef | User who last modified these settings |
| `lastUpdatedDate` | string (date-time) | When settings were last updated (UTC) |

---

### IdentityRef

Reference to an Azure DevOps identity (user or group).

```json
{
  "id": "33d33df3-88ea-4704-a787-91092e0aa295",
  "displayName": "Fabrikam",
  "uniqueName": "fabrikamfiber.vsin@hotmail.com",
  "url": "https://dev.azure.com/fabrikam/_apis/Identities/33d33df3-88ea-4704-a787-91092e0aa295",
  "imageUrl": "https://dev.azure.com/fabrikam/_api/_common/identityImage?id=33d33df3-88ea-4704-a787-91092e0aa295"
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `id` | string | Unique identity ID |
| `displayName` | string | Display name of user/group |
| `uniqueName` | string | Unique name (email/principal name) |
| `url` | string | URL to identity details |
| `imageUrl` | string | URL to user avatar image |

---

## Retention Duration Guidelines

### Automated Test Results (CI/CD Runs)

| Duration | Use Case | Pros | Cons |
|----------|----------|------|------|
| **7 days** | High-frequency runs | Minimal storage | Limited history |
| **14 days** | Daily builds | Good balance | Short history |
| **30 days** | Standard practice | Reasonable history | Medium storage |
| **60 days** | Extended tracking | Detailed trends | Higher storage |
| **90 days** | Compliance required | Audit trail | Significant storage |

**Recommendation**: 30 days for most projects

### Manual Test Results (QA Execution)

| Duration | Use Case | Pros | Cons |
|----------|----------|------|------|
| **30 days** | Immediate cleanup | Minimal storage | No history |
| **90 days** | Standard testing | Good balance | Low storage |
| **180 days** | Quarterly releases | Better tracking | Medium storage |
| **365 days** | Annual compliance | Full year history | Higher storage |
| **400 days** | Long-term audits | Maximum history | Maximum storage |

**Recommendation**: 365 days for compliance, 90 days for routine projects

---

## Common Workflows

### Workflow 1: Get Current Retention Settings

Retrieve current retention configuration for a project.

```bash
organization="fabrikam"
project="Fabrikam-Fiber-TFVC"

curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/resultretentionsettings?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN"

# Response shows:
# - Automated result retention: 30 days
# - Manual result retention: 365 days
# - Last updated by user and date
```

### Workflow 2: Reduce Automated Test Result Retention

Lower retention for frequent CI/CD results to save storage.

```bash
organization="fabrikam"
project="Fabrikam-Fiber-TFVC"

curl -X PATCH "https://dev.azure.com/$organization/$project/_apis/test/resultretentionsettings?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "automatedResultsRetentionDuration": 14
  }'

# Reduces automated results from 30 to 14 days
# Manual results unchanged at current setting
```

### Workflow 3: Increase Manual Result Retention for Compliance

Extend manual test result retention for regulatory compliance.

```bash
organization="fabrikam"
project="Fabrikam-Fiber-TFVC"

curl -X PATCH "https://dev.azure.com/$organization/$project/_apis/test/resultretentionsettings?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "manualResultsRetentionDuration": 400
  }'

# Extends manual results to maximum 400 days
# Automated results unchanged
```

### Workflow 4: Update Both Retention Durations

Set different retention periods for both automated and manual results.

```bash
organization="fabrikam"
project="Fabrikam-Fiber-TFVC"

curl -X PATCH "https://dev.azure.com/$organization/$project/_apis/test/resultretentionsettings?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "automatedResultsRetentionDuration": 30,
    "manualResultsRetentionDuration": 180
  }'

# Sets:
# - Automated: 30 days
# - Manual: 180 days
```

### Workflow 5: Sync Retention Settings Across Projects

Check and update retention settings for multiple projects.

```bash
organization="fabrikam"

for project in "Project-A" "Project-B" "Project-C"; do
  echo "Checking $project retention settings..."
  
  curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/resultretentionsettings?api-version=7.1" \
    -H "Authorization: Bearer $TOKEN" | jq '.'
  
  # Update to standard settings
  curl -X PATCH "https://dev.azure.com/$organization/$project/_apis/test/resultretentionsettings?api-version=7.1" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "automatedResultsRetentionDuration": 30,
      "manualResultsRetentionDuration": 90
    }'
done
```

### Workflow 6: Monitor Retention Settings Changes

Track when and by whom retention settings were modified.

```bash
organization="fabrikam"
project="Fabrikam-Fiber-TFVC"

curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/resultretentionsettings?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" | jq '{
    automatedDays: .automatedResultsRetentionDuration,
    manualDays: .manualResultsRetentionDuration,
    lastUpdated: .lastUpdatedDate,
    updatedBy: .lastUpdatedBy.displayName
  }'

# Output shows who made last change and when
```

---

## Storage Impact Calculator

### Estimate Storage Reduction

**Formula**: `Results per Day × Retention Days = Total Stored Results`

**Example Calculation**:
```
Automated:  100 results/day × 30 days = 3,000 results
Manual:      20 results/day × 365 days = 7,300 results
Total: 10,300 results
```

**Reducing from 30 to 14 days** (automated):
```
Before: 100 × 30 = 3,000
After:  100 × 14 = 1,400
Savings: 1,600 results (53% reduction)
```

---

## Retention Policies by Industry

### Technology/SaaS
- **Automated**: 7-14 days (frequent releases)
- **Manual**: 90 days (active development)
- **Rationale**: Fast iteration, minimal audit requirements

### Enterprise Software
- **Automated**: 30 days (stable releases)
- **Manual**: 180 days (periodic testing)
- **Rationale**: Balance between history and storage

### Regulated Industries (Finance, Healthcare)
- **Automated**: 60-90 days (compliance tracking)
- **Manual**: 365-400 days (full audit trail)
- **Rationale**: Regulatory compliance and audits

### Cloud Services
- **Automated**: 14-30 days (continuous deployment)
- **Manual**: 180 days (monitoring window)
- **Rationale**: Rapid updates with moderate history

---

## Best Practices

1. **Establish Clear Policy**: Define retention based on business needs, not storage
2. **Consider Compliance**: Check regulatory requirements for your industry
3. **Differentiate Test Types**: Use different durations for automated vs manual
4. **Regular Review**: Audit retention settings quarterly
5. **Document Changes**: Log who modified settings and why
6. **Monitor Storage**: Track how retention settings impact storage usage
7. **Gradual Adjustment**: Test retention changes on non-critical projects first
8. **Backup Critical Results**: Archive important results before deletion
9. **Communicate Changes**: Notify team of retention policy changes
10. **Version Control**: Track retention policy changes in documentation

---

## Data Lifecycle

### Automated Test Results Timeline

```
Day 1    - Test runs and results created
Day 15   - Results available for analysis
Day 30   - Automated cleanup triggered
Day 31   - Results deleted from system
```

### Manual Test Results Timeline

```
Day 1    - Test execution and results recorded
Week 12  - Results still available for review
Day 365  - Cleanup threshold approaching
Day 366  - Results deleted from system
```

---

## Common Retention Configurations

### Configuration A: Aggressive Cleanup (Storage Optimization)
```json
{
  "automatedResultsRetentionDuration": 7,
  "manualResultsRetentionDuration": 30
}
```
**Use**: Projects with heavy testing load, non-critical systems

### Configuration B: Balanced (Standard)
```json
{
  "automatedResultsRetentionDuration": 30,
  "manualResultsRetentionDuration": 90
}
```
**Use**: Most production projects with standard requirements

### Configuration C: Conservative (Compliance)
```json
{
  "automatedResultsRetentionDuration": 90,
  "manualResultsRetentionDuration": 365
}
```
**Use**: Regulated industries, compliance-heavy projects

### Configuration D: Maximum Retention (Audit Trail)
```json
{
  "automatedResultsRetentionDuration": 400,
  "manualResultsRetentionDuration": 400
}
```
**Use**: Maximum history required, unlimited storage budget

---

## Audit and Compliance

### Who Changed Retention Settings?
```bash
curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/resultretentionsettings?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" | jq '.lastUpdatedBy'
```

### When Were Settings Last Modified?
```bash
curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/resultretentionsettings?api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" | jq '.lastUpdatedDate'
```

### Track Changes Over Time
Maintain external log of retention setting changes for audit purposes:
```
Project: Fabrikam
Date: 2024-01-15
Changed By: John Smith
Automated: 30 → 14 days
Manual: 365 → 180 days
Reason: Storage optimization initiative
```

---

## Troubleshooting

### Results Disappearing Unexpectedly
**Cause**: Retention duration setting is lower than expected
**Solution**: Verify current retention settings, increase if necessary

### Storage Not Decreasing After Reduction
**Cause**: Existing results not yet deleted, cleanup happens nightly
**Solution**: Wait for automated cleanup cycle (typically runs nightly)

### Cannot Update Settings
**Cause**: Missing `vso.test_write` scope
**Solution**: Ensure authentication token has write permission

### Settings Reverting to Previous Values
**Cause**: Concurrent updates or API caching
**Solution**: Verify update completed, check response status

---

## Authentication & Scopes

### OAuth2 Scopes

| Scope | Description | Operations |
|-------|-------------|------------|
| `vso.test` | Read test results and settings | GET operations |
| `vso.test_write` | Read/write test results and settings | PATCH operations |

### Basic Authentication (Alternative)

```bash
Authorization: Basic $(echo -n ":$PAT" | base64)
```

---

## Error Handling

### Common Status Codes

| Code | Description | Resolution |
|------|-------------|-----------|
| `200 OK` | Successful operation | Settings retrieved or updated |
| `400 Bad Request` | Invalid duration value | Duration must be 1-400 days |
| `401 Unauthorized` | Authentication failed | Check token validity |
| `403 Forbidden` | Insufficient permissions | User needs test_write scope |
| `404 Not Found` | Project not found | Verify project ID/name |

### Error Response Example

```json
{
  "error": {
    "code": "InvalidRetentionDuration",
    "message": "Retention duration must be between 1 and 400 days. Received: 500"
  }
}
```

---

## Limitations

- **Maximum Duration**: 400 days (13+ months)
- **Minimum Duration**: 1 day
- **Scope**: Project-level setting (organization-wide not supported)
- **Retroactive**: Changes apply to future results, not existing ones
- **Frequency**: No limit on update frequency

---

## Licensing Requirements

- **Test Manager Extension**: Required for retention settings
- **Permissions**: Project collection administrator or project admin
- **Access Level**: Any level with test management access

---

## References

- [Microsoft Azure DevOps REST API - Result Retention Settings](https://learn.microsoft.com/en-us/rest/api/azure/devops/test/result-retention-settings)
- [Test Result Management](https://learn.microsoft.com/en-us/azure/devops/test/overview)
- [Data Retention Policies](https://learn.microsoft.com/en-us/azure/devops/organizations/security/data-retention)
- [Azure DevOps REST API Version 7.1](https://learn.microsoft.com/en-us/rest/api/azure/devops)
- [Storage Management in Azure DevOps](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/manage-storage)
