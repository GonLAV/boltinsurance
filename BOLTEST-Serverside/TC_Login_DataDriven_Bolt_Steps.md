# Test Case: TC_Login_DataDriven_Bolt

## Metadata
- **Title**: TC_Login_DataDriven_Bolt
- **Type**: Test Case (data-driven)
- **Area Path**: Epos\QA
- **Iteration Path**: Epos\Current Sprint
- **Priority**: 2
- **Tags**: Login, DataDriven, Authentication, Bolt, SharedParameters
- **Description**: Data-driven login test using Shared Parameters (SP_LoginData_Bolt). Tests authentication flow for multiple user roles and scenarios including success, error, locked, and unauthorized cases.

## Linked Shared Parameter Set
- **Name**: SP_LoginData_Bolt
- **Columns**: Username, Password, ExpectedResult, Role, Environment
- **Row Count**: 10 synthetic test cases

---

## Test Steps

### Step 1: Navigate to Login Page
**Action**: Navigate to the login page of @Environment
**Expected Result**: Login page loads successfully with username and password input fields visible

### Step 2: Enter Username
**Action**: Enter the username: @Username
**Expected Result**: Username field populated with @Username value; no error messages appear

### Step 3: Enter Password
**Action**: Enter the password: @Password
**Expected Result**: Password field populated (masked); no error messages appear

### Step 4: Submit Login Form
**Action**: Click "Login" button
**Expected Result**: Page processes the login request; response received

### Step 5: Validate Success Scenario
**Action**: If @ExpectedResult == "success", verify:
1. Dashboard or home page loads successfully
2. Session/Authentication token is created (verify in browser storage or network logs)
3. User profile shows correct Role: @Role
4. Navigation menu is accessible
5. Capture screenshot of successful login
**Expected Result**: User is authenticated; all success indicators present

### Step 6: Validate Error Scenario
**Action**: If @ExpectedResult == "error", verify:
1. Login form remains displayed (not redirected)
2. Error message appears: "Invalid username or password" or "Authentication failed"
3. No session token is created
4. Capture screenshot of error message
**Expected Result**: User is NOT authenticated; clear error feedback given

### Step 7: Validate Locked Account Scenario
**Action**: If @ExpectedResult == "locked", verify:
1. Login form remains displayed
2. Account-specific error message appears: "Account locked" or "Too many login attempts"
3. No session token is created
4. Lock duration or unlock instructions displayed (if applicable)
5. Capture screenshot of locked message
**Expected Result**: User is NOT authenticated; locked account clearly indicated

### Step 8: Validate Unauthorized Scenario
**Action**: If @ExpectedResult == "unauthorized", verify:
1. Login form remains displayed
2. Permission/authorization error appears: "Insufficient permissions" or "Access denied"
3. No session token is created
4. Role @Role does not have access to this environment
5. Capture screenshot of unauthorized message
**Expected Result**: User is NOT authenticated; permission denial clearly indicated

### Step 9: Verify Browser Logs and Cookies
**Action**: Inspect browser developer tools:
- Check cookies for session/auth tokens
- Check localStorage/sessionStorage for tokens
- Check network logs for authentication API calls
**Expected Result**: Logs match expected behavior for @ExpectedResult scenario

### Step 10: Clean Up
**Action**: Clear browser cache, cookies, and logout if logged in
**Expected Result**: System ready for next iteration; no session persists

---

## Acceptance Criteria

✅ Each row in SP_LoginData_Bolt generates a separate test run iteration
✅ Parameter values (@Username, @Password, etc.) correctly substituted in all steps
✅ Success scenarios result in authenticated session with correct role
✅ Error scenarios display appropriate error messages without session creation
✅ Locked scenarios trigger account lock message with no authentication
✅ Unauthorized scenarios reject access with permission error
✅ Screenshots captured for all scenarios
✅ Test results align with @ExpectedResult values for each row

---

## Notes for Test Execution

- **Manual Execution**: Execute from Azure DevOps Test Plans UI; runner will iterate per row automatically
- **Automated Execution**: Can be adapted for Web Test (Visual Studio) or API test automation
- **Test Data**: All credentials are synthetic (staging test accounts only)
- **Reporting**: Results will show one outcome per row; use @ExpectedResult to validate pass/fail logic
- **Troubleshooting**: If iteration count ≠ row count, reattach Shared Parameter Set (remove → add → save)

---

## Related Work Items

- Shared Parameter Set: SP_LoginData_Bolt
- Epic/Feature: BOLT Authentication System
- Related User Stories: Authentication Module, User Management

