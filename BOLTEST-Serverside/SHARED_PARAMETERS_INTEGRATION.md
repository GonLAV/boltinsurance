# BOLTEST Shared Parameters Manager - Integration Guide

## ✅ What's Been Created

### Backend
- **Controller**: `sharedParametersController.js` - Handles all parameter CRUD operations
- **Routes**: `routes/sharedParameters.js` - API endpoints for the UI

### Frontend
- **Component**: `SharedParametersView.tsx` - Easy-to-use UI with 3 tabs
- **Styles**: `sharedParameters.css` - Professional UI styling

## 🚀 How to Integrate (Quick Setup)

### Step 1: Add Routes to Server
Add this to your `server.js` or main Express file:

```javascript
// In server.js, around where other routes are defined:
const sharedParametersRoutes = require('./routes/sharedParameters');
app.use('/api/shared-parameters', sharedParametersRoutes);
```

### Step 2: Add Component to Frontend
Import in your routes/navigation:

```typescript
// In your routing file (e.g., routes.tsx):
import { SharedParametersView } from './features/sharedParameters/SharedParametersView';

export const routes = [
  // ... other routes
  {
    path: '/shared-parameters',
    name: 'Shared Parameters',
    component: SharedParametersView,
    icon: '📊'
  }
];
```

### Step 3: Add Navigation Menu Item
Add to your main navigation:

```tsx
<NavItem icon="📊" label="Shared Parameters" href="/shared-parameters" />
```

## 📊 Feature Overview

### Tab 1: Create Parameters
**Easy mode version of Azure DevOps parameter creation**

1. Enter parameter set name (e.g., `CL_APPLICANT`)
2. Select project/tenant
3. Define columns (become `@ParameterName` in steps)
4. Add test data rows (test runs once per row)
5. Click "Create Parameter Set"

**Output**: Creates CSV file in `test-templates/` + syncs to Azure DevOps

### Tab 2: Manage Data
**Add more rows to existing parameter sets**

1. Select existing parameter set
2. Add new data rows
3. Click "Import to Azure DevOps"

**Use Case**: Expand test data coverage without recreating entire set

### Tab 3: Link to Test Cases
**Create parameterized test steps**

1. Enter parameter set name
2. Write test steps using `@ParameterName` syntax
3. Add expected results
4. Click "Create Test Case with Parameters"

**Example**:
```
Step: "Enter @FirstName in [First Name] field"
Step: "Enter @Email in [Email] field"
Step: "Click [Save]"
Expected: "Applicant created successfully"
```

**Result**: Test runs once for each data row in parameter set

## 🔄 How It Works

```
┌─────────────────────────────────────┐
│   BOLTEST Shared Parameters UI      │
│   (Easy-to-use 3 tabs)              │
└────────────┬────────────────────────┘
             │
             ↓
    ┌─────────────────────┐
    │  Backend API         │
    │  /api/shared-params  │
    └────────┬─────────────┘
             │
             ├──→ 💾 Local CSV Files
             │    (test-templates/)
             │
             └──→ 🌐 Azure DevOps
                  (REST API)
                  - Create parameters
                  - Link to test cases
                  - Manage data rows
```

## 📋 API Endpoints

### Create Parameter Set
```
POST /api/shared-parameters/create
Body: {
  name: "CL_APPLICANT",
  project: "Progressive PL",
  columns: ["FirstName", "LastName", "Email"],
  data: [
    ["John", "Smith", "john@test.com"],
    ["Jane", "Doe", "jane@test.com"]
  ]
}
```

### Add Data to Existing Set
```
POST /api/shared-parameters/add-data
Body: {
  parameterName: "CL_APPLICANT",
  rows: [
    ["Bob", "Jones", "bob@test.com"]
  ]
}
```

### Link to Test Case
```
POST /api/shared-parameters/link-to-testcase
Body: {
  testCaseId: "12345",
  parameterName: "CL_APPLICANT",
  project: "Bolt Portal"
}
```

### Convert Steps to Parameters
```
POST /api/shared-parameters/convert-to-steps
Body: {
  parameterName: "CL_APPLICANT",
  testSteps: [
    "Enter @FirstName in name field",
    "Enter @Email in email field",
    "Click Save"
  ],
  expectedResults: [
    "Field accepts input",
    "Field accepts input",
    "Applicant created"
  ]
}
```

### Export as CSV
```
GET /api/shared-parameters/export?parameterName=CL_APPLICANT
```

## 🎯 Usage Examples

### Example 1: Create CL Applicant Parameters
1. **Tab**: Create Parameters
2. **Name**: `CL_APPLICANT`
3. **Project**: `Progressive PL`
4. **Columns**: FirstName, LastName, Email, BusinessName, WebsiteAddress
5. **Data**:
   - Row 1: hhhhhhh | sdsdy | ghghgdsd@sdsd.com | test | www.sdsdo.com
   - Row 2: John | Doe | john@test.com | MyBiz | www.mybiz.com
6. **Click**: Create Parameter Set

**Result**: `CL_APPLICANT_SharedParameters.csv` created

### Example 2: Create Parameterized Test Case
1. **Tab**: Link to Test Cases
2. **Parameter Set**: `CL_APPLICANT`
3. **Test Steps**:
   - "Navigate to Create Applicant form"
   - "Enter @FirstName in [First Name] field"
   - "Enter @LastName in [Last Name] field"
   - "Enter @Email in [Email] field"
   - "Enter @BusinessName in [Business Name] field"
   - "Enter @WebsiteAddress in [Website] field"
   - "Click [Save]"
4. **Expected Results**:
   - "Form loads"
   - "Field accepts input"
   - "Field accepts input"
   - "Field accepts input"
   - "Field accepts input"
   - "Field accepts input"
   - "Applicant created successfully"
5. **Click**: Create Test Case

**Result**: Test case in Azure DevOps with parameters linked, executes once per CSV row

## 🔗 Integration with Azure DevOps

The tool automatically:
1. ✅ Creates CSV files locally
2. ✅ Registers parameter sets in Azure DevOps
3. ✅ Links to test cases
4. ✅ Enables data-driven test execution

No manual Azure DevOps UI work needed!

## 🎨 UI Features

**Easy Mode Design**:
- ✅ 3-tab interface (Create | Manage | Link)
- ✅ Step-by-step guidance
- ✅ Inline data entry (no Excel)
- ✅ Real-time preview
- ✅ Success/error messages
- ✅ Export to CSV
- ✅ Delete parameter sets

**Professional Styling**:
- ✅ Responsive design (desktop/tablet/mobile)
- ✅ Accessibility (keyboard navigation, contrast)
- ✅ Color-coded sections
- ✅ Loading states
- ✅ Form validation

## 📝 Next Steps

1. Add route to `server.js`
2. Import component in routing
3. Add navigation menu item
4. Restart BOLTEST application
5. Navigate to `/shared-parameters`
6. Start creating parameter sets!

## 🆘 Troubleshooting

| Issue | Solution |
|---|---|
| Component not loading | Check import path and routing setup |
| API 404 errors | Verify route added to server.js |
| CSV not created | Check `test-templates/` folder exists |
| Azure DevOps sync fails | Verify PAT token in environment vars |
| Parameters not showing in test case | Check parameter name matches exactly |

## 💡 Tips

- **Column Names**: Use descriptive names like `FirstName`, `Email`, not `Col1`, `Col2`
- **Test Data**: Add at least 2-3 rows per set for good coverage
- **Parameter Naming**: Match Azure DevOps conventions (CamelCase, descriptive)
- **Step Format**: Clear action descriptions make automation easier
- **Expected Results**: Specific expectations catch more bugs

---

**Ready to use!** Add the route and start creating parameterized tests with a few clicks instead of manual Azure DevOps UI navigation.
