# BOLT Data-Driven Test: Quick Reference Card

**Print this page or keep it open while setting up!**

---

## 🎯 Three Critical Things to Remember

### 1. **Column Names Must Be Exact**
```
In Shared Parameters:        In Test Steps:
Username                     @Username          (capital U)
Password                     @Password          (capital P)
ExpectedResult               @ExpectedResult    (capital E)
Role                         @Role              (capital R)
Environment                  @Environment       (capital E)
```
❌ **WRONG**: @username, @Password, @expected_result, @role_name, @env  
✓ **CORRECT**: @Username, @Password, @ExpectedResult, @Role, @Environment

### 2. **Reattach After Edit**
If you change column names → **Remove and re-add** Shared Parameters in Test Case:
1. Test Case → Parameters tab
2. Click **Remove**
3. Click **Save**
4. Click **+ Add Shared Parameter Set**
5. Select **SP_LoginData_Bolt**
6. Click **Save**

### 3. **Verify Iteration Count**
When you click Run:
- ✓ GOOD: "Iteration 1 of **10**"
- ❌ BAD: "Iteration 1 of **1**"

If you see "1 of 1" → fix via section 2 above

---

## 📋 Setup Checklist (30 min)

- [ ] **Phase 1 (10 min)**: Create Shared Parameter Set
  - [ ] Name: `SP_LoginData_Bolt`
  - [ ] 5 columns: Username, Password, ExpectedResult, Role, Environment
  - [ ] 10 data rows
  - [ ] Save

- [ ] **Phase 2 (10 min)**: Create Test Case
  - [ ] Title: `TC_Login_DataDriven_Bolt`
  - [ ] 10 steps with @ParameterName (exact spelling!)
  - [ ] Area: Epos\QA
  - [ ] Save

- [ ] **Phase 3 (5 min)**: Attach Shared Parameters
  - [ ] Test Case → Parameters tab
  - [ ] "+ Add Shared Parameter Set" → SP_LoginData_Bolt
  - [ ] All 5 columns mapped ✓
  - [ ] Save

- [ ] **Phase 4 (5 min)**: Pre-run Validation
  - [ ] Verify iteration count = 10
  - [ ] Verify all steps use correct @ParameterName
  - [ ] All test accounts active
  - [ ] Ready to run!

---

## 🧪 Test Execution Quick Steps

| Iteration | Username | Password | Expected | Notes |
|-----------|----------|----------|----------|-------|
| 1 | admin@bolt.test | Admin#123 | **success** | Admin login → Pass if dashboard loads |
| 2 | agent@bolt.test | Agent#123 | **success** | Agent login → Pass if dashboard loads |
| 3 | customer@bolt.test | Cust#123 | **success** | Customer login → Pass if dashboard loads |
| 4 | locked@bolt.test | Lock#123 | **locked** | Locked → Pass if "Account locked" shown |
| 5 | wrongpass@bolt.test | Wrong#123 | **error** | Wrong password → Pass if error message |
| 6 | noauth@bolt.test | NoAuth#123 | **unauthorized** | No permission → Pass if "Insufficient permissions" |
| 7 | nulluser@bolt.test | (empty) | **error** | No password → Pass if "Password required" |
| 8 | admin@bolt.test | InvalidFormat | **error** | Bad format → Pass if error message |
| 9 | customer@bolt.test | Cust#123 | **success** | QA env → Pass if dashboard loads |
| 10 | admin@bolt.test | Admin#123 | **success** | QA env → Pass if dashboard loads |

---

## 🚨 Troubleshooting Quick Fixes

### Problem: "1 of 1" instead of "1 of 10"
**Fix**: Test Case → Parameters → Remove → Add → Save (see section 2 above)

### Problem: "@Username" shows literally in test
**Fix**: Step text has wrong spelling. Fix to: `@Username` (capital U, exact match column name)

### Problem: Shared Parameters has 0 rows
**Fix**: Go to Shared Parameters → SP_LoginData_Bolt → Add 10 rows → Save

### Problem: "Parameters not mapped" (❌ symbol)
**Fix**: Step text uses @ParameterName that doesn't exist. Check spelling in Shared Parameters.

---

## 📞 Need Help?

| Issue | File to Read |
|-------|--------------|
| Detailed setup steps | `SHARED_PARAMETERS_LINKING_GUIDE.md` |
| During-run validation | `EXECUTION_CHECKLIST.md` |
| Full overview | `README_DATA_DRIVEN_TEST_SETUP.md` |
| Automation | `Create-SharedParametersAndTestCase.ps1` |
| Data reference | `SP_LoginData_Bolt.csv` |

---

## ✅ Success = All 10 PASS Results

**Expected final status**:
```
Test Results Summary
═══════════════════════════════════════
Total:     10
Passed:    10 ✓
Failed:    0
Blocked:   0
═══════════════════════════════════════
Status:    ALL PASS ✓
```

---

## 🎯 Key Reminders

1. **Exact spelling** of @ParameterName (capital letters matter!)
2. **10 rows** in Shared Parameter Set = **10 iterations** in test run
3. **Reattach** after any column name change
4. **Iteration "1 of 10"** confirms setup is correct
5. **Expected result** must match actual result for PASS

---

**Ready?** Start with `SHARED_PARAMETERS_LINKING_GUIDE.md` Phase 1 → Follow steps → Use `EXECUTION_CHECKLIST.md` during run → Done! 🚀

