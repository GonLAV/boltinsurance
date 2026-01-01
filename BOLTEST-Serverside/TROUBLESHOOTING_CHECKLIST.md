# 🎯 Data Sync Troubleshooting Checklist

**Problem**: Login works but data doesn't sync from Azure DevOps/TFS  
**Goal**: Get data syncing in < 30 minutes  
**Start Time**: _______________

---

## Phase 1: Backend Startup (5 min)

- [ ] Navigate to backend directory:
  ```powershell
  cd "c:\Users\gons\OneDrive - BOLT Solutions\Desktop\New folder\Firstthebest\BOLTEST-Serverside"
  ```

- [ ] Verify Node.js is installed:
  ```powershell
  node --version
  ```

- [ ] Verify npm dependencies:
  ```powershell
  npm ls axios express
  # Should show both packages installed
  ```

- [ ] Start backend:
  ```powershell
  npm run dev
  ```

- [ ] Watch for successful startup message:
  ```
  [dev] Backend will listen on port 5000
  ```

**Status**: ✅ Pass / ❌ Fail  
**Error (if any)**: _________________________________

---

## Phase 2: Prepare Credentials (2 min)

Before running diagnostics, gather your credentials:

- [ ] Organization/Collection URL:
  ```
  https://azure.devops.boltx.us/tfs/BoltCollection
  (NOT including /Epos or /project)
  ```

- [ ] Project name:
  ```
  Epos
  ```

- [ ] Personal Access Token (PAT):
  ```
  abc123...xyz789
  ```

- [ ] PAT is still valid (check expiration in Azure DevOps settings)

**Status**: ✅ Have all three / ❌ Missing something

---

## Phase 3: Run Diagnostic (5 min)

Option A: **Diagnostic Script** (recommended)
```powershell
cd BOLTEST-Serverside
node scripts/diagnose-ado-sync.js `
  --orgUrl https://azure.devops.boltx.us/tfs/BoltCollection `
  --project Epos `
  --pat your_pat_here
```

Option B: **Health Check Endpoint**
```powershell
curl -i -H "x-orgurl: https://azure.devops.boltx.us/tfs/BoltCollection" `
  -H "x-project: Epos" `
  -H "x-pat: your_pat_here" `
  http://localhost:5000/api/ado/health
```

**Diagnostic Output**:
- [ ] ✅ URL format valid
- [ ] ✅ Connectivity to TFS/Azure DevOps
- [ ] ✅ Project exists
- [ ] ✅ Work Item API
- [ ] ✅ Work Item Details with Relations
- [ ] ✅ Test Plan API (may be WARN)

**Overall Status**: ✅ HEALTHY / ⚠️ DEGRADED / ❌ FAILED

---

## Phase 4: Fix Issues (Varies)

**If ALL checks passed** → Go to Phase 5

**If any check FAILED**, use this table:

| Check Failed | Error Code | Fix |
|--------------|-----------|-----|
| **URL format** | - | Ensure org URL is collection-level, not project-level.<br>Example: `https://server/tfs/Collection` NOT `https://server/tfs/Collection/Project` |
| **Connectivity** | ENOTFOUND | Check hostname spelling. Verify network connectivity. |
| **Connectivity** | ECONNREFUSED | Is the TFS server running? Is it reachable from this location? |
| **Connectivity** | 401 Unauthorized | PAT is invalid or expired. Regenerate it in Azure DevOps settings. |
| **Connectivity** | 403 Forbidden | PAT lacks permissions. Ensure it has "Whole organization (Read)" scope. |
| **Project** | 404 | Check project name spelling. Verify project exists. |
| **Work Item API** | 403 | PAT needs "Work Items: Read & Execute" scope. |
| **Work Item API** | 404 | Try API version 5.0 (TFS 2019) or 7.0 (Cloud). Check `config/constants.js` or `azureDevOpsService.js` for apiVersion. |
| **Relations** | Any error | Verify `&$expand=Relations` parameter is in URL. Check service layer code. |

**After applying fix**:
- [ ] Re-run diagnostic script
- [ ] Verify that fix resolved the issue

**Time spent fixing**: _______________  
**Remaining issues**: _________________________________

---

## Phase 5: Verify Data Sync (5 min)

Once health check passes:

```powershell
# Test fetching user stories
curl -i -H "x-orgurl: https://azure.devops.boltx.us/tfs/BoltCollection" `
  -H "x-project: Epos" `
  -H "x-pat: your_pat_here" `
  http://localhost:5000/api/ado/userstories?top=3
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "userStories": [
      {
        "id": 123,
        "title": "User Story Title",
        "state": "Active",
        "testCaseIds": [456, 789]
      }
    ]
  }
}
```

- [ ] Response status: **200** (not 404, 401, 403)
- [ ] `success`: **true** (not false)
- [ ] `userStories` array: **has items** (not empty [])
- [ ] Each item has `testCaseIds` array: **populated** (not empty)

**Result**: ✅ Data syncing / ❌ Still empty / ⚠️ Partial data

---

## Phase 6: Frontend Test (5 min)

Go to frontend and manually test:

```powershell
# In Boltest-Frontside
npm start
# Visit http://localhost:3000
```

- [ ] Login with your credentials
- [ ] Navigate to Dashboard or User Stories section
- [ ] Verify data appears (not empty list)
- [ ] Verify Test Cases are linked to User Stories

**Result**: ✅ Working / ⚠️ Partial / ❌ Still broken

---

## Phase 7: Documentation Check (2 min)

- [ ] Read `AZURE_DEVOPS_SYNC_TROUBLESHOOTING.md` (detailed guide)
- [ ] Read `DATA_SYNC_IMPLEMENTATION.md` (what was implemented)
- [ ] Read `SYNC_QUICK_REFERENCE.md` (quick lookup)
- [ ] Understand the root cause of your specific issue

---

## Summary

**Start Time**: _______________  
**End Time**: _______________  
**Total Time**: _______________ minutes  

**Final Status**:
- [ ] ✅ Backend running on port 5000
- [ ] ✅ Health check all PASS
- [ ] ✅ Data syncing from TFS
- [ ] ✅ Frontend displays User Stories with Test Cases

**Issues Encountered**:
1. ________________________________
2. ________________________________
3. ________________________________

**Root Cause**: ________________________________

**How Fixed**: ________________________________

---

## Common Mistakes (Double-Check!)

- [ ] **Org URL includes project name**  
  ❌ `https://azure.devops.boltx.us/tfs/BoltCollection/Epos`  
  ✅ `https://azure.devops.boltx.us/tfs/BoltCollection`

- [ ] **PAT is expired or not regenerated after permissions change**  
  → Go to Azure DevOps settings and create a new PAT

- [ ] **API version mismatch**  
  → Check TFS version and use correct apiVersion (5.0 for TFS 2019, 7.0 for Cloud)

- [ ] **PAT has wrong scopes**  
  → Ensure "Work Items: Read & Execute" is selected

- [ ] **Backend not running**  
  → `npm run dev` must be running; check for exit code 1 errors

- [ ] **Port 5000 in use**  
  → Kill process on port 5000 or use different port

- [ ] **Network/firewall blocking TFS**  
  → Check if TFS is reachable from backend server

---

## When to Escalate

If after completing all phases you still can't sync:

1. **Collect information**:
   - [ ] Full diagnostic script output (save to file)
   - [ ] Health check response (save JSON)
   - [ ] Backend startup logs (npm run dev output)
   - [ ] Error response from `/api/ado/userstories` endpoint

2. **Check logs**:
   - [ ] Azure DevOps activity log (verify no auth denials)
   - [ ] TFS on-prem logs (if applicable)
   - [ ] Backend logs (check for stack traces)

3. **Create issue** with:
   - [ ] Diagnostic output
   - [ ] Your TFS version (cloud or on-prem version number)
   - [ ] Org URL format
   - [ ] Project name
   - [ ] Error messages (status codes, text)

---

## Success Criteria (Final Check)

✅ **ALL of these must be true**:
1. Backend `/api/ado/health` returns status="HEALTHY"
2. Backend `/api/ado/userstories` returns non-empty array
3. Each user story has `testCaseIds` array with IDs
4. Frontend displays data without errors
5. No 401/403/404 errors in any API response

If all 5 are true → **✅ Data sync is working!**

---

# Good luck! You've got this. 💪
