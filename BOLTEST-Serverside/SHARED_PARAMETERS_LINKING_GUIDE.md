# Azure DevOps: Shared Parameters Linking Instructions

## Complete Guide to Attach SP_LoginData_Bolt to TC_Login_DataDriven_Bolt

---

## Phase 1: Create the Shared Parameter Set (SP_LoginData_Bolt)

### Step 1.1: Navigate to Test Plans
1. Open your **Azure DevOps project** (Epos)
2. Click **Test Plans** in the left sidebar
3. You should see your Test Plan listed (e.g., "Login Test Plan" or similar)

### Step 1.2: Access Shared Parameters
1. In the **Test Plans** section, click the **three-dot menu (⋯)** or look for **Shared Parameters** option
2. Click **Shared Parameters**
3. You will see an existing list (or empty if first time)

### Step 1.3: Create New Shared Parameter Set
1. Click **+ New** or **Create Shared Parameter Set** button
2. **Name**: `SP_LoginData_Bolt`
3. **Description** (optional): `Data-driven login test parameters for BOLT authentication`
4. Click **Create**

### Step 1.4: Add Columns
The system will prompt you to define columns. Add these columns **in order**:

| Column Name | Type | Required |
|-------------|------|----------|
| Username | String | Yes |
| Password | String | Yes |
| ExpectedResult | String | Yes |
| Role | String | Yes |
| Environment | String | Yes |

**To add each column:**
1. Click **+ Add Column**
2. Enter **Column Name** (e.g., `Username`)
3. Select **Type**: String
4. Leave **Default value** empty
5. Click **Create**
6. Repeat for all 5 columns

### Step 1.5: Add Test Data Rows
Once columns are created, the system shows an empty grid. Add rows by pasting the CSV data or manually entering:

| Username | Password | ExpectedResult | Role | Environment |
|----------|----------|-----------------|------|-------------|
| admin@bolt.test | Admin#123 | success | Admin | Staging |
| agent@bolt.test | Agent#123 | success | Agent | Staging |
| customer@bolt.test | Cust#123 | success | Customer | Staging |
| locked@bolt.test | Lock#123 | locked | Customer | Staging |
| wrongpass@bolt.test | Wrong#123 | error | Customer | Staging |
| noauth@bolt.test | NoAuth#123 | unauthorized | Guest | Staging |
| nulluser@bolt.test | (leave empty) | error | Customer | Staging |
| admin@bolt.test | InvalidFormat | error | Admin | Staging |
| customer@bolt.test | Cust#123 | success | Customer | QA |
| admin@bolt.test | Admin#123 | success | Admin | QA |

**To add rows:**
- Click **+ Add Row** for each entry
- Fill in all 5 columns
- Click **Save Row**

Alternatively, if your Azure DevOps version supports CSV import:
1. Click **Import from CSV** (if available)
2. Paste the contents of `SP_LoginData_Bolt.csv`
3. Click **Import**

### Step 1.6: Save the Shared Parameter Set
1. Click **Save** button (top right)
2. Verify all 10 rows are visible
3. The system will show: **✓ SP_LoginData_Bolt saved successfully**

---

## Phase 2: Create the Test Case (TC_Login_DataDriven_Bolt)

### Step 2.1: Create New Test Case in the Suite
1. In **Test Plans**, find your test suite (e.g., "Authentication Tests")
2. Click **+ New Test Case**
3. Fill in:
   - **Title**: `TC_Login_DataDriven_Bolt`
   - **Description**: `Data-driven login test using Shared Parameters (SP_LoginData_Bolt)`
   - **Priority**: 2
   - **Area Path**: `Epos\QA` (adjust if different)
   - **Iteration Path**: `Epos\Current Sprint` (adjust to current sprint)
   - **Tags**: `Login;DataDriven;Authentication;Bolt` (semicolon-separated)

4. Click **Create**

### Step 2.2: Add Test Steps
The Test Case editor opens. In the **Steps** section:

1. Click **+ Add Step** for each step below
2. For each step, enter:
   - **Action**: Step action text (using @ParameterName for placeholders)
   - **Expected Result**: What should happen

**Copy-paste these 10 steps** (use exact text including @ParameterName):

#### Step 1
- **Action**: Navigate to the login page of @Environment
- **Expected Result**: Login page loads successfully with username and password input fields visible

#### Step 2
- **Action**: Enter the username: @Username
- **Expected Result**: Username field populated with @Username value; no error messages appear

#### Step 3
- **Action**: Enter the password: @Password
- **Expected Result**: Password field populated (masked); no error messages appear

#### Step 4
- **Action**: Click "Login" button
- **Expected Result**: Page processes the login request; response received

#### Step 5
- **Action**: If @ExpectedResult == "success", verify: (1) Dashboard or home page loads; (2) Session/token created; (3) User profile shows Role: @Role; (4) Navigation menu accessible; (5) Capture screenshot
- **Expected Result**: User authenticated; all success indicators present

#### Step 6
- **Action**: If @ExpectedResult == "error", verify: (1) Login form remains; (2) "Invalid username or password" error shown; (3) No session token created; (4) Capture screenshot
- **Expected Result**: User NOT authenticated; clear error feedback given

#### Step 7
- **Action**: If @ExpectedResult == "locked", verify: (1) Login form remains; (2) "Account locked" message shown; (3) No session token created; (4) Capture screenshot
- **Expected Result**: User NOT authenticated; locked account indicated

#### Step 8
- **Action**: If @ExpectedResult == "unauthorized", verify: (1) Login form remains; (2) "Insufficient permissions" error shown; (3) No session token created; (4) Role @Role cannot access environment
- **Expected Result**: User NOT authenticated; permission denial indicated

#### Step 9
- **Action**: Inspect browser developer tools: Check cookies/localStorage for auth tokens; Check network logs for authentication API calls
- **Expected Result**: Logs match expected behavior for @ExpectedResult scenario

#### Step 10
- **Action**: Clear browser cache, cookies, and logout if logged in
- **Expected Result**: System ready for next iteration; no session persists

3. Click **Save** after adding all steps

---

## Phase 3: Attach Shared Parameters to Test Case

### ⚠️ CRITICAL STEP — This is where the data-driven magic happens

### Step 3.1: Open Test Case Parameters Tab
1. In the Test Case editor, locate the **Parameters** tab (should be near top)
2. Click **Parameters**
3. You should see an option: **+ Add Shared Parameter Set** or **No shared parameters attached**

### Step 3.2: Link Shared Parameter Set
1. Click **+ Add Shared Parameter Set**
2. A dropdown appears with available Shared Parameter Sets
3. **Select**: `SP_LoginData_Bolt`
4. Click **Select** or **Add**

### Step 3.3: Verify Column Mapping
The system will display a mapping table:

| Shared Parameter Column | Test Case Step Reference |
|------------------------|--------------------------|
| Username | @Username (verify used in steps) |
| Password | @Password (verify used in steps) |
| ExpectedResult | @ExpectedResult (verify used in steps) |
| Role | @Role (verify used in steps) |
| Environment | @Environment (verify used in steps) |

✅ **VERIFY ALL COLUMNS ARE MAPPED** — if a column shows ❌, the step text doesn't use that @ParameterName correctly.

4. Click **Save**

### Step 3.4: Confirm Attachment
- The **Parameters** tab should now show:
  - ✓ SP_LoginData_Bolt (attached)
  - Column count: 5
  - Row count: 10

---

## Phase 4: Verify & Run

### Step 4.1: Pre-Run Validation Checklist
Before running, verify:

✅ **Shared Parameter Set exists**: SP_LoginData_Bolt with 10 rows  
✅ **All columns present**: Username, Password, ExpectedResult, Role, Environment  
✅ **Test Case created**: TC_Login_DataDriven_Bolt  
✅ **Test Case steps use exact parameter names**:
   - @Username (not @user, @User, etc.)
   - @Password (not @Pass, @Pwd, etc.)
   - @ExpectedResult (not @Result, @Expected, etc.)
   - @Role (not @UserRole, etc.)
   - @Environment (not @Env, etc.)  
✅ **Parameters attached**: Test Case Parameters tab shows SP_LoginData_Bolt linked  
✅ **All 5 columns mapped**: No ❌ symbols in mapping table  

### Step 4.2: Run the Test Case
1. In **Test Plans**, locate the suite containing TC_Login_DataDriven_Bolt
2. Click the test case
3. Click **Run** or **Run for Web Application**
4. The Test Runner will open

### Step 4.3: Expected Behavior
- **Run Dashboard** will show **10 iterations** (one per row in SP_LoginData_Bolt)
- Runner displays current iteration number: "Iteration 1 of 10"
- Parameter values (@Username, @Password, etc.) are **automatically substituted** in step text
- After completing iteration 1, click **Next** to move to iteration 2, etc.

Example of substituted step in runner:
```
Original Step:    "Enter the username: @Username"
Iteration 1:      "Enter the username: admin@bolt.test"
Iteration 2:      "Enter the username: agent@bolt.test"
(etc. for all 10 rows)
```

### Step 4.4: Record Results
- For each iteration, record Pass/Fail/Block based on @ExpectedResult
  - If @ExpectedResult == "success" and login succeeds → **Pass**
  - If @ExpectedResult == "error" and error message appears → **Pass**
  - If @ExpectedResult == "locked" and lock message appears → **Pass**
  - Otherwise → **Fail** or **Block**
- Attach screenshots to each iteration
- Add comments as needed

### Step 4.5: Complete Run
- After iteration 10, click **Save and Close**
- Test Results page shows summary: "10 test results recorded"

---

## 🔧 Troubleshooting

### Issue: "Run shows 1 iteration instead of 10"

**Cause**: Shared Parameter Set not properly attached OR column name mismatch

**Fix**:
1. Go to Test Case → **Parameters** tab
2. Click **Remove** (remove the attached SP_LoginData_Bolt)
3. Click **Save**
4. Click **+ Add Shared Parameter Set**
5. Re-select `SP_LoginData_Bolt`
6. Verify all 5 columns are mapped (no ❌)
7. Click **Save**
8. Close and re-open Test Case
9. Run again — should show 10 iterations

### Issue: "Parameter values not substituted in steps (shows @Username literal text)"

**Cause**: Column name in step doesn't match exactly

**Fix**:
1. Go to Test Case → **Steps** tab
2. Find steps with @ParameterName
3. Verify spelling is **exact**:
   - Must be: `@Username` (capital U)
   - NOT: `@username`, `@user`, `@User`, etc.
4. Same for all other parameters: `@Password`, `@ExpectedResult`, `@Role`, `@Environment`
5. Save and re-run

### Issue: "Shared Parameter Set shows 0 rows"

**Cause**: Data not saved properly

**Fix**:
1. Go to **Shared Parameters** section
2. Click `SP_LoginData_Bolt`
3. Verify all 10 rows are visible
4. If not, re-add rows manually or re-import CSV
5. Click **Save**
6. Close and re-open

### Issue: "Column name rejected when creating Shared Parameter Set"

**Cause**: Special characters or spaces not allowed

**Fix**:
- Use only: letters, numbers, underscore
- Valid: `Username`, `Password`, `ExpectedResult`, `Role`, `Environment`
- Invalid: `User Name`, `Expected-Result`, etc.

### Issue: "Can't find Shared Parameters option in Test Plans"

**Cause**: May be in different location for your TFS/AzDO version

**Alternative paths**:
- **Test Plans** → Right-click test suite → **Shared Parameters**
- **Test Plans** → **More options** (⋯) → **Manage Shared Parameters**
- **Project Settings** → **Test Management** → **Shared Parameters**

---

## ✅ Success Criteria

After completing all steps, verify:

| Criterion | Status |
|-----------|--------|
| SP_LoginData_Bolt created with 5 columns | ✓ |
| 10 rows of synthetic test data added | ✓ |
| TC_Login_DataDriven_Bolt created with 10 steps | ✓ |
| All steps use @ParameterName (Username, Password, ExpectedResult, Role, Environment) | ✓ |
| SP_LoginData_Bolt attached to TC_Login_DataDriven_Bolt | ✓ |
| All 5 columns mapped (no ❌ symbols) | ✓ |
| Test run shows 10 iterations (1 per row) | ✓ |
| Parameter values substituted correctly in runner | ✓ |
| Each iteration records Pass/Fail based on ExpectedResult | ✓ |

---

## 📝 Quick Reference: Column Names Must Match Exactly

| Shared Parameter Column | Test Step Placeholder | Spelling |
|-------------------------|----------------------|----------|
| Username | @Username | Capital U, lowercase sername |
| Password | @Password | Capital P, lowercase assword |
| ExpectedResult | @ExpectedResult | Capital E, xpectedResult |
| Role | @Role | Capital R, lowercase ole |
| Environment | @Environment | Capital E, nvironment |

Copy-paste to avoid typos:
```
@Username
@Password
@ExpectedResult
@Role
@Environment
```

