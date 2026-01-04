# 📦 BOLT Data-Driven Test Setup — Complete Package

**All artifacts generated and ready to use!**

Generated: January 4, 2026  
Project: Epos  
Environment: Azure DevOps Server (On-Prem TFS)  

---

## 📂 Package Contents

### 🎯 **START HERE** → `README_DATA_DRIVEN_TEST_SETUP.md`
Complete overview, workflow, success metrics, and next steps.  
**Read this first** to understand what you're doing.

---

### 📋 **Phase 1: Setup**

#### 1️⃣ `SHARED_PARAMETERS_LINKING_GUIDE.md` ⭐ **MAIN GUIDE**
**Complete step-by-step UI setup instructions**
- Phase 1: Create Shared Parameter Set (SP_LoginData_Bolt)
- Phase 2: Create Test Case (TC_Login_DataDriven_Bolt)
- Phase 3: Attach Shared Parameters to Test Case
- Phase 4: Verify & Run
- Troubleshooting section

**Time**: 30–40 minutes for complete setup  
**Format**: Markdown with detailed screenshots descriptions and UI paths

---

#### 2️⃣ `SP_LoginData_Bolt.csv`
**Test data reference — 10 rows × 5 columns**
- Headers: Username, Password, ExpectedResult, Role, Environment
- 10 synthetic test cases covering: success, error, locked, unauthorized scenarios
- Use as reference for manual data entry OR import via CSV if your AzDO supports it

**Format**: CSV (Excel-compatible)  
**Action**: Copy-paste into Shared Parameter Set grid, one row at a time

---

#### 3️⃣ `TC_Login_DataDriven_Bolt_Steps.md`
**Test Case template — 10 parameterized steps**
- Metadata: Title, area path, iteration, tags, priority
- 10 steps with @Username, @Password, @ExpectedResult, @Role, @Environment placeholders
- Acceptance criteria and notes

**Format**: Markdown  
**Action**: Copy each step into Test Case editor; verify parameter names are exact

---

#### 4️⃣ `QUICK_REF_CARD.md`
**Single-page quick reference (print or bookmark!)**
- 3 critical reminders
- Setup checklist
- Test execution quick steps
- Common troubleshooting fixes

**Format**: Markdown  
**Action**: Print or keep open during setup

---

### 🧪 **Phase 2: Execution**

#### 5️⃣ `EXECUTION_CHECKLIST.md` ⭐ **USE DURING RUN**
**Pre-run, during-run, and post-run validation**
- Pre-Run Validation: Configuration, Shared Parameters, Test Case, Parameters attachment checks
- During Test Execution: Iteration-by-iteration steps for all 10 test scenarios
- Post-Run Validation: Results review, artifact verification
- Troubleshooting flowchart

**Format**: Markdown checklist  
**Action**: Check items as you proceed; reference during test execution  
**Time**: Use during actual test run (30–60 min)

---

### 🔧 **Phase 3: Automation (Optional)**

#### 6️⃣ `Create-SharedParametersAndTestCase.ps1`
**PowerShell automation script for Azure DevOps Server (on-prem)**
- Creates Shared Parameter Set via REST API (if supported by your TFS version)
- Creates Test Case with 10 parameterized steps via REST API
- Adds test steps and links parameters
- Exports artifact information to JSON

**Format**: PowerShell 5.1+  
**Prerequisites**: Personal Access Token (PAT), connectivity to Azure DevOps Server  
**Usage**:
```powershell
.\Create-SharedParametersAndTestCase.ps1 `
    -OrgUrl "https://tfs.bolt.local/tfs/BoltCollection" `
    -Project "Epos" `
    -Pat "your_pat_token"
```

**Note**: Shared Parameters creation via REST may require manual UI completion. See guide for details.

---

### 📚 **Reference**

#### 7️⃣ `SharedParameterSchema.json`
**JSON schema for Shared Parameter Set validation**
- Defines structure of SP_LoginData_Bolt
- 5 columns: Username, Password, ExpectedResult, Role, Environment
- 10 example rows with all test scenarios
- Useful for API-based creation or validation

**Format**: JSON Schema (draft-07)  
**Action**: Reference for validation or API integration

---

## 🚀 Quick Start Paths

### **Path A: Manual UI Setup (Recommended First Time)**
1. Read: `README_DATA_DRIVEN_TEST_SETUP.md` (5 min overview)
2. Follow: `SHARED_PARAMETERS_LINKING_GUIDE.md` (Phase 1–4, 30–40 min)
3. Validate: `EXECUTION_CHECKLIST.md` pre-run section (5 min)
4. Execute: Run test from Test Plans, following `EXECUTION_CHECKLIST.md` (30–60 min)
5. Review: `EXECUTION_CHECKLIST.md` post-run section (10 min)

**Total Time**: 2–3 hours (first time)  
**Advantages**: Learn the UI, understand the process, easier to troubleshoot

---

### **Path B: Automation (Advanced)**
1. Review: `README_DATA_DRIVEN_TEST_SETUP.md` (5 min)
2. Run: `Create-SharedParametersAndTestCase.ps1` (5 min, if API supported)
3. Complete: Manual Phase 1 if REST creation of Shared Parameters fails (10 min)
4. Execute: Test via `EXECUTION_CHECKLIST.md` (30–60 min)

**Total Time**: 1–2 hours  
**Advantages**: Faster setup, reusable for future tests

---

### **Path C: Quick Reference Only (Already Familiar)**
1. Keep open: `QUICK_REF_CARD.md`
2. Reference: `SP_LoginData_Bolt.csv` for test data
3. Execute: Run test with `EXECUTION_CHECKLIST.md`

**Total Time**: 30 min  
**Advantages**: Fast for experienced QA engineers

---

## 📊 What You'll Set Up

| Artifact | Name | Rows/Steps | Contains | Status |
|----------|------|-----------|----------|--------|
| Shared Parameter Set | SP_LoginData_Bolt | 10 rows | Username, Password, ExpectedResult, Role, Environment | ✅ Template provided |
| Test Case | TC_Login_DataDriven_Bolt | 10 steps | Parameterized login test (success, error, locked, unauthorized) | ✅ Template provided |
| Data-Driven Runs | Login Test Iterations | 10 | Covers 3 success, 3 error, 1 locked, 1 unauthorized, 2 environments | ✅ Defined |

---

## ✅ Success Criteria

After completion, you should have:

- ✓ **Shared Parameter Set** created with 10 rows
- ✓ **Test Case** created with 10 parameterized steps
- ✓ **Parameters attached** to Test Case (all columns mapped)
- ✓ **Test run** shows **"1 of 10"** iterations (not "1 of 1")
- ✓ **10 test results** recorded (one per iteration)
- ✓ **100% pass rate** (all results match @ExpectedResult expectations)
- ✓ **Screenshots** attached to each iteration
- ✓ **Documentation** complete for future runs

---

## 📞 Troubleshooting Index

| Problem | Solution | File |
|---------|----------|------|
| Run shows "1 of 1" instead of "1 of 10" | Reattach Shared Parameters | `SHARED_PARAMETERS_LINKING_GUIDE.md` → Troubleshooting |
| Steps show "@Username" literally | Fix column name spelling | `SHARED_PARAMETERS_LINKING_GUIDE.md` → Troubleshooting |
| Shared Parameters has 0 rows | Add 10 rows to SP_LoginData_Bolt | `SHARED_PARAMETERS_LINKING_GUIDE.md` Phase 1 |
| Parameter "not mapped" (❌ symbol) | Step text uses wrong @ParameterName | `QUICK_REF_CARD.md` → Troubleshooting |
| Test results don't match @ExpectedResult | Review step execution vs. expected | `EXECUTION_CHECKLIST.md` → Expected Results table |

---

## 🎯 Recommended Reading Order

1. **First-time setup**: 
   - `README_DATA_DRIVEN_TEST_SETUP.md` (overview)
   - `SHARED_PARAMETERS_LINKING_GUIDE.md` (detailed steps)
   - `EXECUTION_CHECKLIST.md` (during run)

2. **Automation**: 
   - `README_DATA_DRIVEN_TEST_SETUP.md` (overview)
   - `Create-SharedParametersAndTestCase.ps1` (PowerShell script)
   - `EXECUTION_CHECKLIST.md` (during run)

3. **Quick reference**: 
   - `QUICK_REF_CARD.md` (print this!)
   - `EXECUTION_CHECKLIST.md` (during run)

---

## 📋 File Sizes & Formats

| File | Size | Format | Location |
|------|------|--------|----------|
| `README_DATA_DRIVEN_TEST_SETUP.md` | 8 KB | Markdown | Main guide |
| `SHARED_PARAMETERS_LINKING_GUIDE.md` | 18 KB | Markdown | Setup instructions |
| `EXECUTION_CHECKLIST.md` | 16 KB | Markdown | Validation checklist |
| `QUICK_REF_CARD.md` | 3 KB | Markdown | Quick reference |
| `TC_Login_DataDriven_Bolt_Steps.md` | 6 KB | Markdown | Test steps template |
| `SP_LoginData_Bolt.csv` | 1 KB | CSV | Data reference |
| `Create-SharedParametersAndTestCase.ps1` | 12 KB | PowerShell | Automation script |
| `SharedParameterSchema.json` | 4 KB | JSON | Schema reference |
| `INDEX.md` | 5 KB | Markdown | This file |

**Total**: ~73 KB of documentation and templates

---

## 🔑 Key Takeaways

1. **Parameter names are critical** — exact spelling required: @Username, @Password, @ExpectedResult, @Role, @Environment
2. **10 rows = 10 iterations** — Shared Parameter Set with 10 rows generates 10 test run iterations
3. **Reattach after edits** — if you change column names, remove and re-add Shared Parameters to Test Case
4. **Verify "1 of 10"** — when you run the test, confirm iteration counter shows "1 of 10" (not "1 of 1")
5. **Match expected results** — test passes if actual outcome matches @ExpectedResult value for each row

---

## 🎬 Ready to Go?

### **Next Step**: Open `README_DATA_DRIVEN_TEST_SETUP.md` and follow the "Quick Start" section!

---

## 📞 Need Help?

- **Setup questions**: See `SHARED_PARAMETERS_LINKING_GUIDE.md`
- **During test run**: See `EXECUTION_CHECKLIST.md`
- **Quick lookup**: See `QUICK_REF_CARD.md`
- **Full overview**: See `README_DATA_DRIVEN_TEST_SETUP.md`
- **Data reference**: See `SP_LoginData_Bolt.csv`
- **Automation**: See `Create-SharedParametersAndTestCase.ps1`

---

**✅ Everything you need is here. Good luck! 🚀**

