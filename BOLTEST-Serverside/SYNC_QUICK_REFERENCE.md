# Azure DevOps / TFS Sync Quick Reference Card

## Problem Diagnosis in 5 Minutes

### Step 1: Is the Backend Running?
```powershell
# From BOLTEST-Serverside directory
npm run dev
# Should show: [dev] Backend will listen on port 5000
```

### Step 2: Run Health Check
```bash
node scripts/diagnose-ado-sync.js \
  --orgUrl https://azure.devops.boltx.us/tfs/BoltCollection \
  --project Epos \
  --pat YOUR_PAT_HERE
```

### Step 3: Check Status
| Status | Meaning | Fix |
|--------|---------|-----|
| ✅ All PASS | Everything works | Data should sync now |
| ❌ URL format FAIL | Malformed org URL | Use collection-level URL: `https://.../.../tfs/Collection` |
| ❌ Connectivity FAIL | Can't reach server | Check network/firewall, verify org URL |
| ❌ Unauthorized 401 | PAT invalid | Regenerate PAT in Azure DevOps settings |
| ❌ Forbidden 403 | Missing permissions | Add scopes: Work Items, Test Plan to PAT |
| ❌ Project 404 | Project not found | Check project name spelling |
| ❌ Work Item FAIL | API unreachable | Try API version 5.0 (TFS 2019) or 7.0 (Cloud) |

---

## Common Org URL Formats

### Azure DevOps Cloud
```
✅ https://dev.azure.com/myorg
❌ https://dev.azure.com/myorg/myproject
❌ https://dev.azure.com
```

### TFS On-Prem (Collection URL)
```
✅ https://azure.devops.boltx.us/tfs/BoltCollection
❌ https://azure.devops.boltx.us/tfs/BoltCollection/Epos
❌ https://azure.devops.boltx.us/tfs
```

---

## API Versions by TFS/DevOps Version

| Product | Recommended Version | Work Item API | Test Plan API |
|---------|---------------------|----------------|---------------|
| Azure DevOps Cloud | `7.0` or `7.1` | ✅ v7.0 | ✅ v7.1 |
| TFS 2019 (on-prem) | `5.0` or `5.1` | ✅ v5.0 | ❌ Not available |
| TFS 2018 | `4.1` | ✅ v4.1 | ❌ Not available |

---

## PAT Scopes Required

**Minimum for read access**:
- ✅ `Code` scope (any)
- ✅ `Work Items` → Read & Execute
- ✅ `Test Plan` → Read & Execute (optional, for test plans)
- ✅ `Project & Team` → Read

**How to create PAT**:
1. Go to Azure DevOps web UI
2. Click user avatar → Personal access tokens
3. New Token → Select scopes above → Generate
4. Copy immediately (only shown once!)

---

## Key REST API Endpoints

### Get Projects
```
GET {orgUrl}/_apis/projects?api-version=7.0
```

### Get Work Items (WIQL)
```
POST {orgUrl}/{project}/_apis/wit/wiql?api-version=7.0
Body: { "query": "SELECT [System.Id] FROM WorkItems WHERE ..." }
```

### Get Work Item Details with Relations
```
GET {orgUrl}/{project}/_apis/wit/workitems?ids=1,2,3&$expand=Relations&api-version=7.0
```

### Get Test Plans
```
GET {orgUrl}/{project}/_apis/testplan/plans?api-version=7.1
```

### Get Test Cases in Suite
```
GET {orgUrl}/{project}/_apis/testplan/Plans/{planId}/suites/{suiteId}/testcases?api-version=7.1
```

---

## Authorization Header Format

### Correct (Base64 Encoding)
```
Authorization: Basic OmFiYzEyM3h5eno3ODk=
                      ↑ Always has colon prefix
```

### How to Generate (JavaScript)
```javascript
const pat = "abc123xyz789";
const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
```

### How to Generate (PowerShell)
```powershell
$pat = "abc123xyz789"
$base64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(":$pat"))
Write-Host "Authorization: Basic $base64"
```

---

## Work Item Relations (Test Case Links)

### Relation Types
```javascript
relations[0].rel  // Examples:
// "Microsoft.VSTS.Common.TestedBy-Reverse"  ← User Story tested by Test Case
// "Microsoft.VSTS.Common.Tests-Forward"     ← Test Case tests User Story
// "System.LinkTypes.Hierarchy-Reverse"      ← Parent/child link
```

### Extract Test Case ID from Relation URL
```javascript
const url = "https://dev.azure.com/.../wit/workItems/456";
const match = url.match(/\/(\d+)$/);
const testCaseId = parseInt(match[1]);  // 456
```

---

## Error Status Codes & Fixes

| Code | Meaning | Fix |
|------|---------|-----|
| 200 | ✅ Success | Data is returned |
| 401 | ❌ Unauthorized | PAT is invalid, expired, or not Base64 encoded correctly |
| 403 | ❌ Forbidden | PAT lacks required scopes (Work Items, etc.) |
| 404 | ❌ Not Found | Org URL, project name, or API version is wrong |
| 414 | ❌ URI Too Long | Batch size too large (max 200 IDs per request) |
| 500 | ❌ Server Error | TFS server issue; check backend logs |

---

## Batch Operations (Important!)

### ❌ DON'T
```
GET /{org}/{proj}/_apis/wit/workitems?ids=1,2,3,...500&api-version=7.0
                                       ↑ URL too long → 414 error
```

### ✅ DO
```javascript
const batchSize = 200;
for (let i = 0; i < ids.length; i += batchSize) {
  const batch = ids.slice(i, i + batchSize);
  const url = `/{org}/{proj}/_apis/wit/workitems?ids=${batch.join(',')}&api-version=7.0`;
  // Fetch batch...
}
```

---

## Quick Test Command (PowerShell)

```powershell
# Set your values
$orgUrl = "https://azure.devops.boltx.us/tfs/BoltCollection"
$project = "Epos"
$pat = "your_pat_here"
$authHeader = "Basic $(
  [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(":$pat"))
)"

# Test WIQL
$wiql = @{ query = "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '$project'" }
$resp = Invoke-RestMethod -Method POST `
  -Uri "$orgUrl/$project/_apis/wit/wiql?api-version=7.0" `
  -Headers @{ Authorization = $authHeader; 'Content-Type' = 'application/json' } `
  -Body ($wiql | ConvertTo-Json)

Write-Host "Found $($resp.workItems.Count) work items"
```

---

## Files Reference

| File | What to Do |
|------|-----------|
| `AZURE_DEVOPS_SYNC_TROUBLESHOOTING.md` | Read this first for detailed guide |
| `DATA_SYNC_IMPLEMENTATION.md` | Implementation overview and next steps |
| `controllers/adoHealth.js` | Health check endpoint (auto-added to `/api/ado/health`) |
| `scripts/diagnose-ado-sync.js` | Run this to diagnose issues (fastest) |

---

## One-Command Diagnosis

```bash
# If you just need to know what's wrong:
curl -v -H "x-orgurl: https://azure.devops.boltx.us/tfs/BoltCollection" \
       -H "x-project: Epos" \
       -H "x-pat: your_pat" \
       http://localhost:5000/api/ado/health 2>&1 | grep -E "status|error|checklist" -A 2
```

---

## Success Indicators

After fixing issues, you should see:

```json
{
  "success": true,
  "status": "HEALTHY",
  "summary": { "pass": 6, "fail": 0, "warn": 0 },
  "checklist": [
    { "name": "URL format valid", "status": "PASS" },
    { "name": "Connectivity to TFS/Azure DevOps", "status": "PASS" },
    { "name": "Project exists", "status": "PASS" },
    { "name": "Work Item API", "status": "PASS" },
    { "name": "Work Item Details with Relations", "status": "PASS" },
    { "name": "Test Plan API", "status": "PASS" }
  ]
}
```

Then test data sync:
```bash
curl -H "x-orgurl: ..." -H "x-project: ..." -H "x-pat: ..." \
  http://localhost:5000/api/ado/userstories?top=5
# Should return actual user stories, not []
```

---

**💡 Tip**: If you get stuck, run the diagnostic script. It tells you EXACTLY what's wrong and how to fix it.
