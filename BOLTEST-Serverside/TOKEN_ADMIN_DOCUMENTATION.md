# Token Admin Service Documentation - December 23, 2025

## Added Content

### File Updated
**PERSONAL_ACCESS_TOKENS_GUIDE.md** - Added Token Admin Service (7.1) documentation

---

## Overview Section - Enhanced

Added distinction between two PAT management services:

### Tokens Service (7.1-preview.1)
- Self-service PAT management
- Users manage their own tokens
- Basic Auth with Personal Access Token
- Base URL: `https://vssps.dev.azure.com/{organization}/_apis/tokens/pats`

### Token Admin Service (7.1)
- Administrator PAT management  
- Admins manage tokens for other users
- OAuth2 authentication with vso.tokenadministration scope
- Base URL: `https://vssps.dev.azure.com/{organization}/_apis/tokenadmin/personalaccesstokens`

---

## New Endpoint: List User PATs (Admin)

### Endpoint Details
```
GET https://vssps.dev.azure.com/{organization}/_apis/tokenadmin/personalaccesstokens/{subjectDescriptor}?api-version=7.1
```

### Purpose
List all session token details (PATs and SSH tokens) for a specific user. Requires administrator permissions.

### URI Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| organization | path | Yes | Azure DevOps organization name |
| subjectDescriptor | path | Yes | The descriptor identifying the target user |
| api-version | query | Yes | API version: `7.1` |
| pageSize | query | No | Max results per page (default varies) |
| continuationToken | query | No | Opaque pagination token for next page |
| isPublic | query | No | Filter: false=PAT tokens, true=SSH tokens |

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.tokenadministration`
- **Example Header**: `Authorization: Bearer {oauth2_token}`

### Response Structure
Returns `TokenAdminPagedSessionTokens`:
```json
{
  "value": [SessionToken, ...],
  "continuationToken": "string or null"
}
```

### SessionToken Object
Contains detailed token information:
- `authorizationId` - UUID identifying the token
- `displayName` - Human-readable token name
- `scope` - Token permissions/scopes
- `userId` - User who owns the token (UUID)
- `validFrom` / `validTo` - Token validity period
- `isValid` - Whether token is currently valid
- `isPublic` - false for PAT, true for SSH
- `targetAccounts` - Organizations the token can access
- `token` - Null in responses (for security)

### Key Differences from Tokens Service

| Feature | Tokens Service | Token Admin |
|---------|----------------|------------|
| Scope | User's own tokens | Any user (admin only) |
| Auth | Basic (PAT) | OAuth2 |
| API Version | 7.1-preview.1 | 7.1 |
| Get Individual | Yes (by authorizationId) | No |
| List All | Yes (self) | Yes (by user) |
| Update | Yes | No |
| Create | Yes (self) | No |
| Revoke | Yes | No |
| Filtering | displayFilterOption, sortByOption | isPublic |
| Pagination | $top, continuationToken | pageSize, continuationToken |

### Use Cases
1. **Security Audit**: Admins list all tokens for a user
2. **Token Verification**: Check validity before revoking
3. **Compliance**: Review token scopes and expiration dates
4. **Bulk Operations**: List tokens across users (by calling multiple times with different subjectDescriptors)

### Example Request
```http
GET https://vssps.dev.azure.com/myorg/_apis/tokenadmin/personalaccesstokens/vssgp.Uy0xLTktMTU1MTM3NDI0NS0xMjE3MzI2Nzc1LTY2MDkxNzE3MTAtNTAyODY0Mzk2Ni03NTcwODY5NzgtNTA3ODEzMDAyNy1heUpraWZH?pageSize=20&isPublic=false&api-version=7.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6InppbXNreVNIODR...
```

### Example Response
```json
{
  "value": [
    {
      "authorizationId": "952858d3-7084-4635-964e-3c2a57645185",
      "displayName": "analytics_token",
      "scope": "app_token",
      "userId": "bb5bb6c8-ef0a-400f-8987-92b3674d2043",
      "validFrom": "2018-07-19T00:00:00Z",
      "validTo": "2018-07-19T00:00:00Z",
      "isValid": true,
      "isPublic": false
    },
    {
      "authorizationId": "c2e0abd5-85a8-40b0-a179-88e98538ec7c",
      "displayName": "dashboards_token",
      "scope": "vso.dashboards vso.taskgroups_manage",
      "userId": "bb5bb6c8-ef0a-400f-8987-92b3674d2043",
      "validFrom": "2018-07-19T00:00:00Z",
      "validTo": "2018-07-19T00:00:00Z",
      "isValid": true,
      "isPublic": false
    }
  ],
  "continuationToken": null
}
```

---

## New Section: Comparison Table

Added comprehensive table comparing:
- **Tokens Service** (user self-service, 7.1-preview.1)
- **Token Admin Service** (administrator, 7.1)

Highlights:
- Different API versions
- Different authentication methods (Basic vs OAuth2)
- Different permission models
- Different endpoint structures
- Complementary functionality

---

## New Section: Object Schemas

### SessionToken (Token Admin)
Extended documentation for Token Admin SessionToken object (different from Tokens service):
- 14 properties including clientId, hostAuthorizationId, claims
- Different structure from simple PatToken
- Supports both PAT and SSH tokens

### TokenAdminPagedSessionTokens
Pagination wrapper for Token Admin responses:
- `value` array of SessionToken objects
- `continuationToken` for pagination
- Required for handling large user token lists

---

## References Added
1. Token Admin API documentation link
2. Token Administration documentation link
3. References to both API versions (7.1 and 7.1-preview.1)

---

## Summary

**Content Added**: ~900 lines
- 1 new endpoint (List User PATs - Token Admin)
- 2 new object schema definitions (SessionToken for Token Admin, TokenAdminPagedSessionTokens)
- 1 comprehensive comparison table (Tokens vs Token Admin)
- Enhanced overview section explaining both services
- Real-world example request and response

**Endpoints Now Documented**: 6 total
- 5 from Tokens Service (7.1-preview.1)
  1. Get PAT
  2. List PATs
  3. Update PAT
  4. Revoke PAT
  5. Create PAT (mentioned)
- 1 from Token Admin Service (7.1)
  1. List User PATs

**Authentication Methods Covered**: 2
- Basic Auth (Tokens Service)
- OAuth2 (Token Admin Service)

**Status**: ✅ COMPLETE
