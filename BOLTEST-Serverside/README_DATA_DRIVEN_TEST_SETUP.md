# BOLT Data-Driven Test Case: Complete Setup Guide

**Project**: Epos (Azure DevOps Server / TFS On-Prem)  
**Test Scenario**: Login with Shared Parameters  
**Artifacts**: SP_LoginData_Bolt + TC_Login_DataDriven_Bolt  
**Date Created**: January 4, 2026  

---

## 📦 Artifacts Generated (5 Files)

This complete package includes everything needed to set up and run a data-driven login test:

| File | Purpose | Format |
|------|---------|--------|
| `SP_LoginData_Bolt.csv` | 10 test data rows (ready to import or use as reference) | CSV |
| `TC_Login_DataDriven_Bolt_Steps.md` | 10 parameterized test steps with acceptance criteria | Markdown |
| `SHARED_PARAMETERS_LINKING_GUIDE.md` | Complete step-by-step UI setup instructions | Markdown |
| `EXECUTION_CHECKLIST.md` | Pre-run, during-run, post-run validation checklist | Markdown |
| `Create-SharedParametersAndTestCase.ps1` | PowerShell automation for on-prem Azure DevOps | PowerShell |
| `SharedParameterSchema.json` | JSON schema for reference/validation | JSON |

---

## 🚀 Quick Start (5 Minutes)

### Option A: Manual UI Setup (Recommended First Time)

1. **Read**: `SHARED_PARAMETERS_LINKING_GUIDE.md` (10 min read)
2. **Follow**: Step-by-step UI instructions in the same guide
3. **Verify**: Use `EXECUTION_CHECKLIST.md` pre-run section
4. **Execute**: Run from Test Plans, following checklist
5. **Review**: Post-run results validation

### Option B: PowerShell Automation (Advanced)

```powershell
# On-prem Azure DevOps
.\Create-SharedParametersAndTestCase.ps1 `
    -OrgUrl "https://tfs.bolt.local/tfs/BoltCollection" `
    -Project "Epos" `
    -Pat "your_pat_token" `
    -TestPlanId 1 `
    -TestSuiteId 2
```

**Note**: Shared Parameters creation via REST may require manual completion. See guide for details.

---

## 📋 Setup Workflow

### Phase 1: Create Shared Parameter Set (10 min)
**File**: `SHARED_PARAMETERS_LINKING_GUIDE.md` → Phase 1

1. Navigate to Test Plans → Shared Parameters
2. Create new: `SP_LoginData_Bolt`
3. Add 5 columns: Username, Password, ExpectedResult, Role, Environment
4. Add 10 test data rows (use `SP_LoginData_Bolt.csv` as reference)
5. Save

**✓ Success Indicator**: Shared Parameters page shows SP_LoginData_Bolt with 10 rows

---

### Phase 2: Create Test Case (10 min)
**File**: `SHARED_PARAMETERS_LINKING_GUIDE.md` → Phase 2

1. Create new Test Case: `TC_Login_DataDriven_Bolt`
2. Set metadata: Area Path, Iteration, Tags, Priority
3. Add 10 steps (copy from `TC_Login_DataDriven_Bolt_Steps.md`)
4. **CRITICAL**: Use exact parameter names:
   - @Username (not @user, @User, etc.)
   - @Password
   - @ExpectedResult
   - @Role
   - @Environment
5. Save

**✓ Success Indicator**: Test Case shows all 10 steps with @ParameterName placeholders

---

### Phase 3: Attach Shared Parameters (5 min)
**File**: `SHARED_PARAMETERS_LINKING_GUIDE.md` → Phase 3

1. Open Test Case → Parameters tab
2. Click "+ Add Shared Parameter Set"
3. Select: `SP_LoginData_Bolt`
4. **VERIFY**: All 5 columns mapped (no ❌ symbols)
5. Save

**✓ Success Indicator**: Parameters tab shows SP_LoginData_Bolt attached with 5 mapped columns

---

### Phase 4: Pre-Run Validation (5 min)
**File**: `EXECUTION_CHECKLIST.md` → Pre-Run Validation

Check all items in pre-run validation section. **STOP if any items fail** — see troubleshooting.

**✓ Success Indicator**: All pre-run checklist items marked ✓

---

### Phase 5: Execute Test (30–60 min)
**File**: `EXECUTION_CHECKLIST.md` → During Test Execution

1. Open Test Plans → Find TC_Login_DataDriven_Bolt
2. Click Run
3. **VERIFY**: Iteration counter shows "1 of 10" (not "1 of 1")
4. Execute each iteration per the checklist
5. Record Pass/Fail per @ExpectedResult for each row
6. Attach screenshots to iterations
7. Save and close

**✓ Success Indicator**: 10 test results recorded, all Pass

---

### Phase 6: Post-Run Review (10 min)
**File**: `EXECUTION_CHECKLIST.md` → Post-Run Validation

1. Results Summary: 10 total, 10 passed, 0 failed
2. Each iteration shows correct @ExpectedResult outcome
3. All iterations have screenshots
4. Sign off with date and notes

**✓ Success Indicator**: Test Results page shows all 10 iterations with Pass status

---

## 🔍 Data Breakdown: 10 Test Scenarios

| Iteration | Username | Password | Role | Environment | Expected | Purpose |
|-----------|----------|----------|------|-------------|----------|---------|
| 1 | admin@bolt.test | Admin#123 | Admin | Staging | success | Admin login success |
| 2 | agent@bolt.test | Agent#123 | Agent | Staging | success | Agent login success |
| 3 | customer@bolt.test | Cust#123 | Customer | Staging | success | Customer login success |
| 4 | locked@bolt.test | Lock#123 | Customer | Staging | locked | Locked account handling |
| 5 | wrongpass@bolt.test | Wrong#123 | Customer | Staging | error | Wrong password error |
| 6 | noauth@bolt.test | NoAuth#123 | Guest | Staging | unauthorized | Permission denial |
| 7 | nulluser@bolt.test | (empty) | Customer | Staging | error | Missing password error |
| 8 | admin@bolt.test | InvalidFormat | Admin | Staging | error | Invalid format error |
| 9 | customer@bolt.test | Cust#123 | Customer | QA | success | Customer success (QA env) |
| 10 | admin@bolt.test | Admin#123 | Admin | QA | success | Admin success (QA env) |

**Coverage**:
- ✓ 3 success scenarios (Admin, Agent, Customer; Staging and QA)
- ✓ 2 error scenarios (wrong password, invalid format, missing password)
- ✓ 1 locked account scenario
- ✓ 1 unauthorized/permission scenario
- ✓ Multiple environments (Staging, QA)
- ✓ Multiple roles (Admin, Agent, Customer, Guest)

---

## ⚠️ Common Issues & Quick Fixes

### Issue 1: Run shows "1 of 1" instead of "1 of 10"

**Cause**: Shared Parameter Set not attached OR 0 rows in SP_LoginData_Bolt

**Fix**:
1. Go to Test Case → Parameters
2. Remove SP_LoginData_Bolt (click Remove → Save)
3. Check Shared Parameters: verify SP_LoginData_Bolt has 10 rows
4. Re-attach SP_LoginData_Bolt (click Add → Save)
5. Close and re-open Test Case
6. Run again

See: `SHARED_PARAMETERS_LINKING_GUIDE.md` → Troubleshooting → Iteration Count Mismatch

---

### Issue 2: Steps show "@Username" (literal text) instead of "admin@bolt.test"

**Cause**: Column name spelling mismatch (e.g., @username, @User, @user_name)

**Fix**:
1. Go to Test Case → Steps
2. Find step with literal @ParameterName
3. Verify spelling is **exact**:
   - ✓ `@Username` (capital U)
   - ✗ `@username`, `@user`, `@User` (wrong)
4. Fix step text
5. Save
6. Re-run test

See: `SHARED_PARAMETERS_LINKING_GUIDE.md` → Troubleshooting → Parameter Not Substituting

---

### Issue 3: Shared Parameter Set creation failed via PowerShell

**Cause**: REST API Shared Parameters endpoint varies by TFS/AzDO version

**Fix**:
1. Create SP_LoginData_Bolt manually via UI (Phase 1 of setup)
2. Then run PowerShell to create Test Case only
3. Or, customize PowerShell script for your API version

See: PowerShell script comments

---

## 📚 File Reference

### `SP_LoginData_Bolt.csv`
- **Use**: Reference for manual row entry OR import directly if your AzDO supports CSV import
- **Contains**: 10 rows × 5 columns (Username, Password, ExpectedResult, Role, Environment)
- **Action**: Copy-paste rows into Shared Parameter Set grid, one by one, OR use "Import from CSV" if available

---

### `TC_Login_DataDriven_Bolt_Steps.md`
- **Use**: Template for creating test steps in the UI
- **Contains**: 10 parameterized steps with @Username, @Password, @ExpectedResult, @Role, @Environment
- **Action**: Read through, then manually enter each step in Test Case editor (or copy-paste if UI allows bulk import)
- **Key**: Every parameter reference must match column name **exactly**

---

### `SHARED_PARAMETERS_LINKING_GUIDE.md`
- **Use**: Complete UI setup guide (most detailed)
- **Contains**: Phase 1–4 setup instructions, troubleshooting, quick reference
- **Action**: Follow step-by-step for first-time setup
- **Time**: 30–40 minutes for complete setup

---

### `EXECUTION_CHECKLIST.md`
- **Use**: Pre-run, during-run, post-run validation
- **Contains**: Pre-flight checks, iteration-by-iteration execution steps, post-run review
- **Action**: Check items as you proceed; reference during test execution
- **Time**: Use during actual test run (30–60 min)

---

### `Create-SharedParametersAndTestCase.ps1`
- **Use**: PowerShell automation (optional, advanced)
- **Contains**: Script to create Test Case and add steps via Azure DevOps REST API
- **Prerequisites**: PowerShell 5.1+, PAT token, API access to Azure DevOps Server
- **Note**: Shared Parameters creation may still require manual UI completion
- **Usage**: `.\Create-SharedParametersAndTestCase.ps1 -OrgUrl <url> -Project Epos -Pat <pat>`

---

### `SharedParameterSchema.json`
- **Use**: Reference/validation schema for Shared Parameter Set structure
- **Contains**: JSON Schema definition for SP_LoginData_Bolt
- **Action**: Use to validate data structure if automating via API or importing from other systems

---

## ✅ Success Metrics

After completing setup and execution, verify:

| Metric | Target | Status |
|--------|--------|--------|
| Shared Parameter Set created | 1 (SP_LoginData_Bolt) | ✓ |
| Test data rows | 10 | ✓ |
| Test Case created | 1 (TC_Login_DataDriven_Bolt) | ✓ |
| Test steps | 10 | ✓ |
| Parameters attached | Yes (all 5 columns) | ✓ |
| Test runs executed | 10 iterations | ✓ |
| Pass rate | 100% (all scenarios match @ExpectedResult) | ✓ |
| Scenarios covered | 3 success + 3 error + 1 locked + 1 unauthorized + 2 env | ✓ |

---

## 🎯 Next Steps (After First Successful Run)

### 1. **Automation** (Optional)
- Integrate with CI/CD pipeline to run data-driven test automatically
- Use Azure DevOps REST API to trigger test runs
- Parse results for pass/fail reporting

### 2. **Scale** (Optional)
- Create additional Shared Parameter Sets for other scenarios:
  - API authentication (Bearer tokens)
  - Multi-factor authentication (MFA)
  - Session management
  - Permission edge cases
- Reuse this template for other data-driven tests

### 3. **Maintenance**
- Update test data rows when accounts change
- Add more rows as new scenarios are discovered
- Keep @ParameterName spelling synchronized across Shared Parameters and Test Steps

### 4. **Integration**
- Link test results to Azure Boards (user stories, bugs)
- Create dashboards for test execution metrics
- Establish baseline for performance/stability

---

## 🆘 Support & Troubleshooting

### Common Questions

**Q: Why does my test show "1 of 1" iterations?**  
A: Shared Parameters not attached or empty. See troubleshooting in `SHARED_PARAMETERS_LINKING_GUIDE.md`.

**Q: Can I modify the test data rows after linking?**  
A: Yes, edit SP_LoginData_Bolt directly. Changes apply to next test run automatically.

**Q: What if a test step doesn't have a parameter?**  
A: That's fine. Only steps with @ParameterName will be substituted. Others run as-is.

**Q: Can I run just one iteration instead of all 10?**  
A: In Test Plans, you can select specific iterations manually. Or run all 10 — should take 30–60 minutes.

**Q: What if the login page URL is different for each environment?**  
A: Use the @Environment parameter in Step 1. Update login page URL construction logic accordingly.

---

## 📝 Documentation Summary

```
BOLT Data-Driven Login Test Setup
├── SP_LoginData_Bolt.csv                          [Test data reference]
├── TC_Login_DataDriven_Bolt_Steps.md             [Test steps template]
├── SHARED_PARAMETERS_LINKING_GUIDE.md            [UI setup guide - START HERE]
├── EXECUTION_CHECKLIST.md                        [During-run validation]
├── Create-SharedParametersAndTestCase.ps1        [Automation script]
├── SharedParameterSchema.json                    [Data schema reference]
└── README.md                                      [This file]
```

---

## 🎬 Ready to Start?

### First Time?
1. Read: **`SHARED_PARAMETERS_LINKING_GUIDE.md`** (Phase 1–4)
2. Execute: **`EXECUTION_CHECKLIST.md`** (during test run)
3. Troubleshoot: Use quick-fix sections if needed

### Automation-Ready?
1. Run: **`Create-SharedParametersAndTestCase.ps1`**
2. Complete: Manual Phase 1 (Shared Parameters) if REST creation fails
3. Execute: Test via `EXECUTION_CHECKLIST.md`

### Need Help?
- **Parameter spelling issues**: See `SHARED_PARAMETERS_LINKING_GUIDE.md` → Quick Reference
- **Iteration count problems**: See `SHARED_PARAMETERS_LINKING_GUIDE.md` → Troubleshooting
- **Execution guidance**: See `EXECUTION_CHECKLIST.md` → Troubleshooting Flowchart

---

**✅ Setup Complete — You're Ready to Run!**

Good luck with your data-driven login test! 🚀

