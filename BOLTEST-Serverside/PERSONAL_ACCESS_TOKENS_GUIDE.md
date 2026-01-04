# Personal Access Tokens (PATs) - Azure DevOps Integration

## Overview
Complete support for Azure DevOps Personal Access Tokens (PATs) management via REST API. Enables programmatic creation, retrieval, listing, updating, and revocation of PATs for authentication and authorization in Azure DevOps.

**Two API Services Available**:
1. **Tokens Service** (API 7.1-preview.1) - Self-service PAT management (user's own tokens)
2. **Token Admin Service** (API 7.1) - Administrator PAT management (for other users)

---

## Service Details

### Tokens Service (Self-Service)
- **Service**: Tokens
- **API Version**: `7.1-preview.1`
- **Base URL**: `https://vssps.dev.azure.com/{organization}/_apis/tokens/pats`
- **Authentication**: Personal Access Token (Basic Auth)
- **Scope**: Manage own tokens

### Token Admin Service (Administrator)
- **Service**: Token Admin
- **API Version**: `7.1`
- **Base URL**: `https://vssps.dev.azure.com/{organization}/_apis/tokenadmin/personalaccesstokens`
- **Authentication**: OAuth2 (vso.tokenadministration scope)
- **Scope**: Manage tokens for specific users (requires admin permissions)

---

## API Endpoints

### TOKENS SERVICE (7.1-preview.1)

### 1. Get PAT - Retrieve Single Token
**Reference**: [Microsoft Docs - PATs Get](https://learn.microsoft.com/en-us/rest/api/azure/devops/tokens/pats/get?view=azure-devops-rest-7.1-preview.1)

#### HTTP Request
```http
GET https://vssps.dev.azure.com/{organization}/_apis/tokens/pats?authorizationId={authorizationId}&api-version=7.1-preview.1
```

#### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `api-version` | query | Yes | string | Version of the API (`7.1-preview.1`) |
| `authorizationId` | query | Yes | string (uuid) | The authorizationId identifying the specific PAT |

#### Response
- **Status Code**: `200 OK`
- **Content Type**: `application/json`
- **Body**: `PatTokenResult`

#### Example Request
```http
GET https://vssps.dev.azure.com/myorg/_apis/tokens/pats?authorizationId=cf42cc9f-f170-4375-92ba-c13d58a6545f&api-version=7.1-preview.1
Authorization: Basic {base64(":PAT")}
```

#### Example Response
```json
{
  "patToken": {
    "displayName": "analytics_token",
    "validTo": "2020-12-01T23:46:23.32Z",
    "scope": "vso.analytics",
    "targetAccounts": [
      "38aaa865-2c70-4bf7-a308-0c6539c38c1a"
    ],
    "validFrom": "2020-10-29T17:26:46.72Z",
    "authorizationId": "3d3aca0c-9ad3-4b07-8334-08ec8b1ddc32",
    "token": null
  },
  "patTokenError": "none"
}
```

---

### 2. List PATs - Get All Tokens
**Reference**: [Microsoft Docs - PATs List](https://learn.microsoft.com/en-us/rest/api/azure/devops/tokens/pats/list?view=azure-devops-rest-7.1-preview.1)

#### HTTP Request
```http
GET https://vssps.dev.azure.com/{organization}/_apis/tokens/pats?api-version=7.1-preview.1
```

#### With Optional Filters
```http
GET https://vssps.dev.azure.com/{organization}/_apis/tokens/pats?displayFilterOption={displayFilterOption}&sortByOption={sortByOption}&isSortAscending={isSortAscending}&continuationToken={continuationToken}&$top={$top}&api-version=7.1-preview.1
```

#### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `api-version` | query | Yes | string | Version of the API (`7.1-preview.1`) |
| `$top` | query | No | integer (int32) | How many tokens to return (limit: 100) |
| `continuationToken` | query | No | string | Where to start returning tokens from (for pagination) |
| `displayFilterOption` | query | No | DisplayFilterOptions | Filter by status (active, revoked, expired, all) |
| `sortByOption` | query | No | SortByOptions | Sort field (displayName, displayDate, status) |
| `isSortAscending` | query | No | boolean | Ascending (true) or descending (false) sort |

#### DisplayFilterOptions Enum
| Value | Description |
|-------|-------------|
| `active` | Token is active (not revoked or expired) |
| `revoked` | Token has been revoked and is no longer usable |
| `expired` | Token has expired and is no longer usable |
| `all` | Includes all tokens |

#### SortByOptions Enum
| Value | Description |
|-------|-------------|
| `displayName` | Sort by display name |
| `displayDate` | Sort by creation date |
| `status` | Sort by status (active/revoked/expired) |

#### Response
- **Status Code**: `200 OK`
- **Content Type**: `application/json`
- **Body**: `PagedPatTokens`

#### Example Request
```http
GET https://vssps.dev.azure.com/myorg/_apis/tokens/pats?displayFilterOption=active&sortByOption=displayName&isSortAscending=true&$top=50&api-version=7.1-preview.1
Authorization: Basic {base64(":PAT")}
```

#### Example Response
```json
{
  "continuationToken": "",
  "patTokens": [
    {
      "displayName": "all_access_token",
      "validTo": "2020-11-23T04:04:38.5233333Z",
      "scope": "app_token",
      "targetAccounts": null,
      "validFrom": "2020-10-24T03:04:57.52Z",
      "authorizationId": "4c60c9ed-a378-4883-af16-d655ca025b11",
      "token": null
    },
    {
      "displayName": "work_token",
      "validTo": "2020-11-23T04:03:55.8033333Z",
      "scope": "vso.work_full",
      "targetAccounts": [
        "38aaa865-2c70-4bf7-a308-0c6539c38c1a"
      ],
      "validFrom": "2020-10-24T03:04:19.1466667Z",
      "authorizationId": "eabb38b2-48ef-440b-959b-b9e6cb37a64e",
      "token": null
    }
  ]
}
```

---

### 3. Update PAT - Modify Existing Token
**Reference**: [Microsoft Docs - PATs Update](https://learn.microsoft.com/en-us/rest/api/azure/devops/tokens/pats/update?view=azure-devops-rest-7.1-preview.1)

#### HTTP Request
```http
PUT https://vssps.dev.azure.com/{organization}/_apis/tokens/pats?api-version=7.1-preview.1
```

#### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `api-version` | query | Yes | string | Version of the API (`7.1-preview.1`) |

#### Request Body (PatTokenUpdateRequest)
```json
{
  "authorizationId": "3d3aca0c-9ad3-4b07-8334-08ec8b1ddc32",
  "displayName": "updated_token_name",
  "scope": "vso.analytics",
  "validTo": "2020-12-25T23:46:23.319Z",
  "allOrgs": true
}
```

#### Request Body Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `authorizationId` | string (uuid) | Yes | The authorizationId identifying the PAT to update |
| `displayName` | string | No | New token name/display name |
| `scope` | string | No | Token scopes (e.g., `vso.analytics`, `app_token`, `vso.work_full`) |
| `validTo` | string (date-time) | No | New token expiration date (ISO 8601 format) |
| `allOrgs` | boolean | No | True for all accessible organizations; false for specific organization |

#### Response
- **Status Code**: `200 OK`
- **Content Type**: `application/json`
- **Body**: `PatTokenResult`

#### Example Request
```http
PUT https://vssps.dev.azure.com/myorg/_apis/tokens/pats?api-version=7.1-preview.1
Authorization: Basic {base64(":PAT")}
Content-Type: application/json

{
  "authorizationId": "3d3aca0c-9ad3-4b07-8334-08ec8b1ddc32",
  "displayName": "updated_analytics_token",
  "scope": "vso.analytics",
  "validTo": "2020-12-25T23:46:23.319Z",
  "allOrgs": true
}
```

#### Example Response
```json
{
  "patToken": {
    "displayName": "updated_analytics_token",
    "validTo": "2020-12-25T23:46:23.32Z",
    "scope": "vso.analytics",
    "targetAccounts": null,
    "validFrom": "2020-10-29T17:26:46.72Z",
    "authorizationId": "3d3aca0c-9ad3-4b07-8334-08ec8b1ddc32",
    "token": null
  },
  "patTokenError": "none"
}
```

#### Notes
- Token must be valid (not revoked) to be updated
- To update a token, use `authorizationId` parameter
- Only non-null fields in the request body will be updated

---

### 4. Revoke PAT - Delete/Revoke Token
**Reference**: [Microsoft Docs - PATs Revoke](https://learn.microsoft.com/en-us/rest/api/azure/devops/tokens/pats/revoke?view=azure-devops-rest-7.1-preview.1)

#### HTTP Request
```http
DELETE https://vssps.dev.azure.com/{organization}/_apis/tokens/pats?authorizationId={authorizationId}&api-version=7.1-preview.1
```

#### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `api-version` | query | Yes | string | Version of the API (`7.1-preview.1`) |
| `authorizationId` | query | Yes | string (uuid) | The authorizationId identifying the PAT to revoke |

#### Response
- **Status Code**: `200 OK` or `204 No Content`
- **Body**: Empty JSON object `{}`

#### Example Request
```http
DELETE https://vssps.dev.azure.com/myorg/_apis/tokens/pats?authorizationId=cf42cc9f-f170-4375-92ba-c13d58a6545f&api-version=7.1-preview.1
Authorization: Basic {base64(":PAT")}
```

#### Example Response
```
Status Code: 204
Body: {}
```

#### Notes
- Once revoked, the PAT cannot be recovered
- Revoked PATs cannot be updated or used for authentication
- Operation is immediate and permanent

---

## Common Error Codes

### SessionTokenError Enum
| Value | Description |
|-------|-------------|
| `none` | No error |
| `displayNameRequired` | Display name is required |
| `invalidDisplayName` | Display name format is invalid |
| `invalidValidTo` | Expiration date is invalid |
| `invalidScope` | Token scope is invalid |
| `accessDenied` | User does not have permission to perform this operation |
| `failedToIssueAccessToken` | Server failed to issue the token |
| `tokenNotFound` | Token with specified authorizationId not found |
| `invalidAuthorizationId` | Authorization ID format is invalid |
| `patLifespanPolicyViolation` | Token lifespan violates organization policy |
| `globalPatPolicyViolation` | Token violates global PAT policy |
| `fullScopePatPolicyViolation` | Full scope PAT violates organization policy |

---

## Authentication
All PAT endpoints require Basic Authentication with a valid Personal Access Token:

```
Authorization: Basic {base64Encode(":" + patToken)}
```

Example in JavaScript:
```javascript
const pat = "your-personal-access-token";
const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
```

---

## Object Schemas

### PatToken
Represents a personal access token used to access Azure DevOps resources.

```json
{
  "authorizationId": "string (uuid)",
  "displayName": "string",
  "scope": "string",
  "targetAccounts": ["string (uuid)"],
  "token": "string",
  "validFrom": "string (date-time)",
  "validTo": "string (date-time)"
}
```

### PatTokenResult
Contains the resulting PAT and any error that occurred.

```json
{
  "patToken": {
    "authorizationId": "string (uuid)",
    "displayName": "string",
    "scope": "string",
    "targetAccounts": ["string (uuid)"],
    "token": "string",
    "validFrom": "string (date-time)",
    "validTo": "string (date-time)"
  },
  "patTokenError": "string (SessionTokenError enum)"
}
```

### PagedPatTokens
Returned by List method; contains list of PATs and continuation token.

```json
{
  "continuationToken": "string",
  "patTokens": [
    {
      "authorizationId": "string (uuid)",
      "displayName": "string",
      "scope": "string",
      "targetAccounts": ["string (uuid)"],
      "token": "string",
      "validFrom": "string (date-time)",
      "validTo": "string (date-time)"
    }
  ]
}
```

---

## Common Patterns

### List All Active Tokens
```http
GET https://vssps.dev.azure.com/myorg/_apis/tokens/pats?displayFilterOption=active&api-version=7.1-preview.1
Authorization: Basic {base64(":PAT")}
```

### Get Token Expiring Soon
```http
GET https://vssps.dev.azure.com/myorg/_apis/tokens/pats?displayFilterOption=active&sortByOption=displayDate&isSortAscending=true&api-version=7.1-preview.1
Authorization: Basic {base64(":PAT")}
```

### Extend Token Expiration
```http
PUT https://vssps.dev.azure.com/myorg/_apis/tokens/pats?api-version=7.1-preview.1
Authorization: Basic {base64(":PAT")}
Content-Type: application/json

{
  "authorizationId": "existing-token-id",
  "validTo": "2025-12-31T23:59:59Z"
}
```

### Revoke Expired Token
```http
DELETE https://vssps.dev.azure.com/myorg/_apis/tokens/pats?authorizationId=expired-token-id&api-version=7.1-preview.1
Authorization: Basic {base64(":PAT")}
```

---

## TOKEN ADMIN SERVICE (7.1)

### 5. List User PATs - Get All Tokens for User (Admin)
**Reference**: [Microsoft Docs - Token Admin List](https://learn.microsoft.com/en-us/rest/api/azure/devops/tokenadmin/personalaccesstokens/list?view=azure-devops-rest-7.1)

#### HTTP Request
```http
GET https://vssps.dev.azure.com/{organization}/_apis/tokenadmin/personalaccesstokens/{subjectDescriptor}?api-version=7.1
```

#### With Optional Parameters
```http
GET https://vssps.dev.azure.com/{organization}/_apis/tokenadmin/personalaccesstokens/{subjectDescriptor}?pageSize={pageSize}&continuationToken={continuationToken}&isPublic={isPublic}&api-version=7.1
```

#### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `subjectDescriptor` | path | Yes | string | The descriptor of the target user |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |
| `pageSize` | query | No | integer (int32) | The maximum number of results per page |
| `continuationToken` | query | No | string | Opaque blob for pagination; resumption point for next page |
| `isPublic` | query | No | boolean | Set to false for PAT tokens (default), true for SSH tokens |

#### Response
- **Status Code**: `200 OK`
- **Content Type**: `application/json`
- **Body**: `TokenAdminPagedSessionTokens`

#### Example Request
```http
GET https://vssps.dev.azure.com/fabrikam/_apis/tokenadmin/personalaccesstokens/vssgp.Uy0xLTktMTU1MTM3NDI0NS0xMjE3MzI2Nzc1LTY2MDkxNzE3MTAtNTAyODY0Mzk2Ni03NTcwODY5NzgtNTA3ODEzMDAyNy1heUpraWZH?pageSize=20&isPublic=false&api-version=7.1
Authorization: Bearer {oauth2_token}
```

#### Example Response
```json
{
  "value": [
    {
      "clientId": "00000000-0000-0000-0000-000000000000",
      "accessId": "00000000-0000-0000-0000-000000000000",
      "authorizationId": "952858d3-7084-4635-964e-3c2a57645185",
      "hostAuthorizationId": "00000000-0000-0000-0000-000000000000",
      "userId": "bb5bb6c8-ef0a-400f-8987-92b3674d2043",
      "validFrom": "2018-07-19T00:00:00Z",
      "validTo": "2018-07-19T00:00:00Z",
      "displayName": "analytics_token",
      "scope": "app_token",
      "targetAccounts": null,
      "token": null,
      "alternateToken": null,
      "isValid": true,
      "isPublic": false,
      "publicData": null,
      "source": null
    },
    {
      "clientId": "00000000-0000-0000-0000-000000000000",
      "accessId": "00000000-0000-0000-0000-000000000000",
      "authorizationId": "c2e0abd5-85a8-40b0-a179-88e98538ec7c",
      "hostAuthorizationId": "00000000-0000-0000-0000-000000000000",
      "userId": "bb5bb6c8-ef0a-400f-8987-92b3674d2043",
      "validFrom": "2018-07-19T00:00:00Z",
      "validTo": "2018-07-19T00:00:00Z",
      "displayName": "dashboards_token",
      "scope": "vso.dashboards vso.taskgroups_manage",
      "targetAccounts": null,
      "token": null,
      "alternateToken": null,
      "isValid": true,
      "isPublic": false,
      "publicData": null,
      "source": null
    }
  ],
  "continuationToken": null
}
```

#### Notes
- **Service**: Token Admin (administrator service)
- **API Version**: 7.1
- **Authentication**: OAuth2 with vso.tokenadministration scope
- **Permissions**: Requires organization administrator or token administrator role
- **Scope**: Managing tokens for any user in the organization

---

## Object Schemas

### SessionToken (Token Admin)
Represents a session token used to access Azure DevOps resources (Token Admin service).

```json
{
  "clientId": "string (uuid)",
  "accessId": "string (uuid)",
  "authorizationId": "string (uuid)",
  "hostAuthorizationId": "string (uuid)",
  "userId": "string (uuid)",
  "validFrom": "string (date-time)",
  "validTo": "string (date-time)",
  "displayName": "string",
  "scope": "string",
  "targetAccounts": ["string (uuid)"],
  "token": "string",
  "alternateToken": "string",
  "isValid": "boolean",
  "isPublic": "boolean",
  "publicData": "string",
  "source": "string",
  "claims": {}
}
```

### TokenAdminPagedSessionTokens
A paginated list of session tokens from Token Admin service.

```json
{
  "value": [
    {
      "clientId": "string (uuid)",
      "accessId": "string (uuid)",
      "authorizationId": "string (uuid)",
      "hostAuthorizationId": "string (uuid)",
      "userId": "string (uuid)",
      "validFrom": "string (date-time)",
      "validTo": "string (date-time)",
      "displayName": "string",
      "scope": "string",
      "targetAccounts": ["string (uuid)"],
      "token": null,
      "alternateToken": null,
      "isValid": "boolean",
      "isPublic": "boolean",
      "publicData": null,
      "source": null
    }
  ],
  "continuationToken": "string (uuid)"
}
```

---

## Comparison: Tokens Service vs Token Admin Service

| Feature | Tokens (7.1-preview.1) | Token Admin (7.1) |
|---------|------------------------|------------------|
| **Base URL** | `/tokens/pats` | `/tokenadmin/personalaccesstokens` |
| **Use Case** | Manage own tokens | Admin: manage others' tokens |
| **Authentication** | Basic Auth (PAT) | OAuth2 (vso.tokenadministration) |
| **Endpoints** | Get, List, Create, Update, Revoke | List (by user) |
| **Permissions** | User's own tokens | Admin/token admin role required |
| **Scoping** | By authorizationId | By subjectDescriptor (user) |
| **Pagination** | $top, continuationToken | pageSize, continuationToken |
| **Filtering** | displayFilterOption, sortByOption | isPublic (PAT vs SSH) |

---

## References
- [Microsoft Azure DevOps REST API - Personal Access Tokens (Tokens Service)](https://learn.microsoft.com/en-us/rest/api/azure/devops/tokens/pats)
- [Microsoft Azure DevOps REST API - Token Admin Service](https://learn.microsoft.com/en-us/rest/api/azure/devops/tokenadmin)
- [Azure DevOps API Version 7.1-preview.1](https://learn.microsoft.com/en-us/rest/api/azure/devops)
- [Azure DevOps API Version 7.1](https://learn.microsoft.com/en-us/rest/api/azure/devops)
- [Personal Access Token Documentation](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate)
- [Token Administration Documentation](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/manage-personal-access-tokens-via-api)
