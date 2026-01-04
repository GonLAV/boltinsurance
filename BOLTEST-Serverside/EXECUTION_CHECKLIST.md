# BOLT Data-Driven Login Test: Execution Checklist

## Pre-Run Validation (Do Before Running Test)

### Configuration Check
- [ ] Project: **Epos** (verify correct project selected)
- [ ] Test Plan: Visible and accessible
- [ ] Test Suite: Contains TC_Login_DataDriven_Bolt
- [ ] Browser: Chrome, Edge, or Firefox (modern version)
- [ ] Network: Connected to staging environment (@Environment values)

### Shared Parameters Check
- [ ] SP_LoginData_Bolt exists in Test Plans → Shared Parameters
- [ ] Row count shows **10 rows** (not 0, not 1)
- [ ] All 5 columns present: Username, Password, ExpectedResult, Role, Environment
- [ ] All 10 rows have data (no empty rows)
- [ ] No typos in column names (exact spelling: Username, Password, ExpectedResult, Role, Environment)

### Test Case Check
- [ ] TC_Login_DataDriven_Bolt exists
- [ ] All 10 steps present and visible
- [ ] Each step contains correct @ParameterName placeholders:
  - [ ] Step 1 contains: @Environment
  - [ ] Step 2 contains: @Username
  - [ ] Step 3 contains: @Password
  - [ ] Step 4 contains: (no parameters, button click)
  - [ ] Step 5 contains: @ExpectedResult, @Role
  - [ ] Step 6 contains: @ExpectedResult
  - [ ] Step 7 contains: @ExpectedResult
  - [ ] Step 8 contains: @ExpectedResult, @Role
  - [ ] Step 9 contains: (no parameters, browser tools)
  - [ ] Step 10 contains: (no parameters, cleanup)

### Parameters Attachment Check
- [ ] Test Case → Parameters tab visible
- [ ] SP_LoginData_Bolt is **attached** (shown in Parameters tab)
- [ ] Mapping table shows:
  - [ ] Username → mapped (✓)
  - [ ] Password → mapped (✓)
  - [ ] ExpectedResult → mapped (✓)
  - [ ] Role → mapped (✓)
  - [ ] Environment → mapped (✓)
- [ ] No ❌ symbols in mapping (would indicate mismatch)

### Test Environment Check
- [ ] Staging environment is accessible
- [ ] Login page URL is valid
- [ ] All test accounts are active (admin@bolt.test, agent@bolt.test, etc.)
- [ ] No maintenance/downtime scheduled during test
- [ ] Screenshots/screen recording capability available (optional but recommended)

### Documentation Check
- [ ] Test steps match expected scenarios (success, error, locked, unauthorized)
- [ ] Acceptance criteria documented
- [ ] Expected results for each @ExpectedResult value understood:
  - [ ] "success" → dashboard loads, session created
  - [ ] "error" → error message shown, no session
  - [ ] "locked" → lock message shown, no session
  - [ ] "unauthorized" → permission error, no session

---

## During Test Execution

### Start Run
- [ ] Open Test Plans
- [ ] Find TC_Login_DataDriven_Bolt in the suite
- [ ] Click **Run** or **Run for Web Application**
- [ ] Test Runner opens with parameter values ready

### Verify Iteration Count
- [ ] Runner displays: **"Iteration 1 of 10"** (NOT "1 of 1")
- [ ] If wrong iteration count:
  - [ ] STOP and go to Troubleshooting below
  - [ ] Do NOT continue with test run

### First Iteration Execution (admin@bolt.test, Admin#123, success)
- [ ] Step 1: Navigate to login page of **Staging** (parameter substituted correctly)
- [ ] Step 2: Enter username **admin@bolt.test** (parameter substituted correctly)
- [ ] Step 3: Enter password **Admin#123** (parameter substituted correctly)
- [ ] Step 4: Click Login button
- [ ] Step 5: Dashboard loads, session created, Role shows "Admin"
  - [ ] Expected outcome: **PASS** (matches @ExpectedResult = "success")
  - [ ] Mark test result: **Pass**
  - [ ] Attach screenshot of dashboard
- [ ] Step 6-8: Skip (N/A for success scenario)
- [ ] Step 9: Verify auth token in browser storage
  - [ ] Confirm token exists in cookies/localStorage
  - [ ] Take screenshot of dev tools
- [ ] Step 10: Logout and clear cache

- [ ] Click **Next** to go to Iteration 2

### Second Iteration Execution (agent@bolt.test, Agent#123, success)
- [ ] Parameters automatically change to: Username=agent@bolt.test, Password=Agent#123, ExpectedResult=success
- [ ] Repeat same validation flow as Iteration 1
- [ ] Expected outcome: **PASS**
- [ ] Mark test result: **Pass**

### Third Iteration Execution (customer@bolt.test, Cust#123, success)
- [ ] Same as above
- [ ] Expected outcome: **PASS**

### Fourth Iteration Execution (locked@bolt.test, Lock#123, locked)
- [ ] Parameters: Username=locked@bolt.test, Password=Lock#123, ExpectedResult=locked
- [ ] Step 5: Dashboard does NOT load
- [ ] Step 6: Skip (not error scenario)
- [ ] Step 7: "Account locked" message displayed
  - [ ] Expected outcome: **PASS** (matches @ExpectedResult = "locked")
  - [ ] Mark test result: **Pass**
  - [ ] Attach screenshot of lock message
- [ ] Step 8: Skip (not unauthorized)
- [ ] Steps 9-10: Verify no session, cleanup

### Fifth Iteration Execution (wrongpass@bolt.test, Wrong#123, error)
- [ ] Parameters: Username=wrongpass@bolt.test, Password=Wrong#123, ExpectedResult=error
- [ ] Step 5: Dashboard does NOT load
- [ ] Step 6: "Invalid username or password" error displayed
  - [ ] Expected outcome: **PASS** (matches @ExpectedResult = "error")
  - [ ] Mark test result: **Pass**
  - [ ] Attach screenshot of error message
- [ ] Step 7-8: Skip (not locked or unauthorized)
- [ ] Steps 9-10: Verify no session, cleanup

### Sixth Iteration Execution (noauth@bolt.test, NoAuth#123, unauthorized)
- [ ] Parameters: Username=noauth@bolt.test, Password=NoAuth#123, ExpectedResult=unauthorized
- [ ] Step 5: Dashboard does NOT load
- [ ] Step 6: Skip (not error scenario)
- [ ] Step 7: Skip (not locked)
- [ ] Step 8: "Insufficient permissions" or similar authorization error shown
  - [ ] Expected outcome: **PASS** (matches @ExpectedResult = "unauthorized")
  - [ ] Mark test result: **Pass**
  - [ ] Attach screenshot of permission error
- [ ] Steps 9-10: Verify no session, cleanup

### Seventh Iteration Execution (nulluser@bolt.test, empty password, error)
- [ ] Parameters: Username=nulluser@bolt.test, Password=(empty), ExpectedResult=error
- [ ] Step 3: Password field left empty
- [ ] Step 4: Click Login with empty password
- [ ] Step 6: Error message should appear (missing password)
  - [ ] Expected outcome: **PASS** (matches @ExpectedResult = "error")
  - [ ] Mark test result: **Pass**

### Eighth Iteration Execution (admin@bolt.test, InvalidFormat, error)
- [ ] Parameters: Username=admin@bolt.test, Password=InvalidFormat, ExpectedResult=error
- [ ] Step 5: Dashboard does NOT load
- [ ] Step 6: Error message for invalid password format (if applicable) or authentication failure
  - [ ] Expected outcome: **PASS** (matches @ExpectedResult = "error")
  - [ ] Mark test result: **Pass**

### Ninth Iteration Execution (customer@bolt.test, Cust#123, success, QA environment)
- [ ] Parameters: Username=customer@bolt.test, Password=Cust#123, ExpectedResult=success, Environment=QA
- [ ] Step 1: Navigate to **QA** login page (parameter changed from Staging)
- [ ] Steps 2-10: Repeat success flow from Iteration 3 but against QA environment
- [ ] Expected outcome: **PASS**
- [ ] Mark test result: **Pass**

### Tenth Iteration Execution (admin@bolt.test, Admin#123, success, QA environment)
- [ ] Parameters: Username=admin@bolt.test, Password=Admin#123, ExpectedResult=success, Environment=QA
- [ ] Step 1: Navigate to **QA** login page
- [ ] Steps 2-10: Repeat success flow but against QA environment
- [ ] Expected outcome: **PASS**
- [ ] Mark test result: **Pass**

### Complete Test Run
- [ ] After Iteration 10, click **Save and Close**
- [ ] Test Results page loads

---

## Post-Run Validation

### Results Summary
- [ ] **Total test results recorded**: 10 (one per iteration)
- [ ] **Passed**: 10
- [ ] **Failed**: 0 (if all scenarios matched @ExpectedResult expectations)
- [ ] **Blocked**: 0 (if no environment issues)

### Results Detail Review
For each iteration, verify:
- [ ] Iteration 1 (admin, success, Staging): **PASS**
- [ ] Iteration 2 (agent, success, Staging): **PASS**
- [ ] Iteration 3 (customer, success, Staging): **PASS**
- [ ] Iteration 4 (locked, locked, Staging): **PASS**
- [ ] Iteration 5 (wrongpass, error, Staging): **PASS**
- [ ] Iteration 6 (noauth, unauthorized, Staging): **PASS**
- [ ] Iteration 7 (nulluser, error, Staging): **PASS**
- [ ] Iteration 8 (admin invalid, error, Staging): **PASS**
- [ ] Iteration 9 (customer, success, QA): **PASS**
- [ ] Iteration 10 (admin, success, QA): **PASS**

### Artifacts Attached
- [ ] Each iteration has at least one screenshot
- [ ] Screenshots show @ExpectedResult outcome:
  - Success scenarios show dashboard or authenticated state
  - Error scenarios show error message
  - Locked scenarios show lock message
  - Unauthorized scenarios show permission error
- [ ] Comments added for any anomalies or delays

### Data Quality Check
- [ ] No parameter values appear as literal "@Username" (would indicate mapping failure)
- [ ] All parameter substitutions were correct across all 10 iterations
- [ ] Iteration sequence was 1→2→3→...→10 (no skipped or repeated iterations)

### Environment Observations
- [ ] Staging environment performance: Acceptable / Slow / Degraded
- [ ] QA environment performance: Acceptable / Slow / Degraded
- [ ] No unexpected errors outside of @ExpectedResult scenarios
- [ ] All test account credentials worked as expected

### Sign-Off
- [ ] Test execution date/time: ___________________
- [ ] Executed by (QA engineer): ___________________
- [ ] Overall result: ✓ PASS / ✗ FAIL
- [ ] Issues/notes: ___________________________________

---

## Troubleshooting: Iteration Count Mismatch

### If runner shows "1 of 1" instead of "1 of 10":

**Step 1**: Stop test run (don't continue)

**Step 2**: Go back to Test Case:
```
Test Plans → Find TC_Login_DataDriven_Bolt → Click to open
```

**Step 3**: Click **Parameters** tab

**Step 4**: If SP_LoginData_Bolt is NOT shown:
- [ ] Click **+ Add Shared Parameter Set**
- [ ] Select `SP_LoginData_Bolt`
- [ ] Verify all 5 columns mapped (no ❌)
- [ ] Click **Save**
- [ ] Close test case and re-open

**Step 5**: If SP_LoginData_Bolt IS shown but row count says "0 rows":
- [ ] Click **Remove** (unattach)
- [ ] Click **Save**
- [ ] Go to **Shared Parameters** section
- [ ] Click `SP_LoginData_Bolt`
- [ ] Verify 10 rows exist (should see grid with 10 entries)
- [ ] If rows missing: re-add them from CSV
- [ ] Click **Save** in Shared Parameters
- [ ] Go back to Test Case
- [ ] Click **+ Add Shared Parameter Set**
- [ ] Select `SP_LoginData_Bolt`
- [ ] Click **Save**

**Step 6**: Close and re-open Test Case

**Step 7**: Re-run test — should show "1 of 10"

---

## Troubleshooting: Parameter Not Substituting

### If steps show "@Username" instead of "admin@bolt.test":

**Cause**: Spelling mismatch in step text or Shared Parameter column name

**Fix**:

1. [ ] Go to Test Case → Steps
2. [ ] Find step with literal "@Username"
3. [ ] Edit step and check spelling:
   - Must be: `@Username` (capital U)
   - NOT: `@username`, `@user`, `@User`, etc.
4. [ ] Same for all parameters:
   - [ ] `@Password` (capital P)
   - [ ] `@ExpectedResult` (capital E)
   - [ ] `@Role` (capital R)
   - [ ] `@Environment` (capital E)
5. [ ] Save step
6. [ ] Go to Parameters tab → check mapping (should show ✓ for all)
7. [ ] Close and re-run test

---

## Quick Failure Resolution Flowchart

```
Test run shows 1 iteration instead of 10?
  ├─ YES → Go to Test Case → Parameters → Remove SP_LoginData_Bolt → Add it back → Save → Re-run
  └─ NO → Continue to next check

Parameter values show as literal "@Username"?
  ├─ YES → Go to Test Case → Steps → Fix spelling (@Username, @Password, @ExpectedResult, etc.) → Save → Re-run
  └─ NO → Continue to next check

Test results don't match @ExpectedResult?
  ├─ YES → Review step logic; verify success/error/locked/unauthorized scenarios are correctly identified
  └─ NO → All good! Test passed successfully.
```

---

## Expected Results by Scenario

| Iteration | Username | Password | Expected | Environment | Success Indicator |
|-----------|----------|----------|----------|-------------|-------------------|
| 1 | admin@bolt.test | Admin#123 | success | Staging | Dashboard loads, Token in storage |
| 2 | agent@bolt.test | Agent#123 | success | Staging | Dashboard loads, Token in storage |
| 3 | customer@bolt.test | Cust#123 | success | Staging | Dashboard loads, Token in storage |
| 4 | locked@bolt.test | Lock#123 | locked | Staging | "Account locked" message |
| 5 | wrongpass@bolt.test | Wrong#123 | error | Staging | "Invalid username or password" |
| 6 | noauth@bolt.test | NoAuth#123 | unauthorized | Staging | "Insufficient permissions" |
| 7 | nulluser@bolt.test | (empty) | error | Staging | "Password required" or similar |
| 8 | admin@bolt.test | InvalidFormat | error | Staging | "Invalid credentials" or similar |
| 9 | customer@bolt.test | Cust#123 | success | QA | Dashboard loads (QA environment), Token |
| 10 | admin@bolt.test | Admin#123 | success | QA | Dashboard loads (QA environment), Token |

