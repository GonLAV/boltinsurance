# Tenant/Product Parameter Mapping - Multi-Tenant Architecture

## Tenant Structure (Area Paths in Azure DevOps)

```
Bolt Portal (Root Project)
├── Bolt-X (Tenant Container)
│   ├── Progressive PL (Personal Line Products)
│   ├── USAA (Multi-Line Products)
│   ├── National General (Multi-Line Products)
│   ├── Employers (Specialty Products)
│   ├── CNA (Commercial Products)
│   ├── AmTrust (Commercial Products)
│   ├── Homesite (Multi-Line Products)
│   ├── LibertyMutual (Multi-Line Products)
│   ├── Markel (Commercial Products)
│   ├── Travelers (Multi-Line Products)
│   ├── Comparion (Niche Products)
│   ├── Kraftlake X (Specialty Products)
│   ├── Unify (Unified Products)
│   ├── BoltAG (Agricultural Products)
│   ├── Bolt Access (Access Products)
│   ├── LibertyX (Liberty Specialized)
│   ├── Partner Portal (Channel Products)
│   └── Test Tenant (Dev/QA)
```

## Parameter Set to Tenant Mapping

### Personal Lines Tenants
**Progressive PL, USAA (PL), Homesite, LibertyMutual (PL)**

| Parameter Set | Used For | Test Steps |
|---|---|---|
| PL_APPLICANT_SharedParameters | Applicant profile creation | First Name, Last Name, Email, Address, Phone |
| PL_PERSONALHOMEOWNER_SharedParameters | Homeowner quote/application | All dwelling properties, coverage options |
| RENTERS_SharedParameters | Renters coverage application | Renter-specific details, occupancy |
| PETS_SharedParameters | Pet insurance coverage | Pet details for underwriting |
| MOTORCYCLE_SharedParameters | Motorcycle coverage | Vehicle details, rider info |
| WATERCRAFT_SharedParameters | Boat/watercraft coverage | Vessel details, usage patterns |
| PERSONALUMBRELLA_SharedParameters | Umbrella/excess liability | Coverage limits, underlying policies |
| DWELLINGFIRE_SharedParameters | Basic fire/dwelling coverage | Property details |
| CONDOMINIUM_SharedParameters | Condo-specific coverage | Unit details, building info |

### Commercial Lines Tenants
**CNA, AmTrust, Employers, Markel, Travelers (CL), National General (CL)**

| Parameter Set | Used For | Test Steps |
|---|---|---|
| CL_APPLICANT_SharedParameters | Business applicant profile | Business name, website, industry |
| CL_APPLICATION_AUTO_SharedParameters | Commercial auto application | Vehicles, drivers, coverage selections |

### Multi-Tenant Usage

**USAA, National General, Homesite, LibertyMutual, Travelers**

Can use both PL and CL parameter sets:
```
USAA (Tenant)
├── PL Line (Area Path)
│   ├── PL_PERSONALHOMEOWNER_SharedParameters
│   ├── RENTERS_SharedParameters
│   ├── PETS_SharedParameters
│   └── PERSONALUMBRELLA_SharedParameters
└── CL Line (Area Path)
    ├── CL_APPLICANT_SharedParameters
    └── CL_APPLICATION_AUTO_SharedParameters
```

## Team Filtering (Tags)

Add to test cases/suites for team scoping:

**Tags by Team:**
- `Team:Core` - Core platform team
- `Team:AG` - Agriculture specialist team
- `Team:PL` - Personal lines team
- `Team:CL` - Commercial lines team
- `Team:QA` - QA team
- `Team:DEV` - Development team
- `Team:AutomationReady` - Automated test eligible

**Example Tag Query in WIQL:**
```wiql
SELECT * FROM workitems
WHERE [System.WorkItemType] = 'Test Case'
AND [System.Tags] CONTAINS 'Team:CL'
AND [System.Tags] CONTAINS 'Team:AutomationReady'
```

## WIQL Queries for Auto-Collection (Query-Based Suites)

### All CL Tests for USAA
```wiql
SELECT * FROM workitems
WHERE [System.WorkItemType] = 'Test Case'
AND [System.AreaPath] UNDER 'Bolt Portal\Bolt-X\USAA\CL'
AND [System.State] = 'Active'
```

### All PL Tests Using Shared Parameters
```wiql
SELECT * FROM workitems
WHERE [System.WorkItemType] = 'Test Case'
AND [System.AreaPath] UNDER 'Bolt Portal\Bolt-X\Progressive PL'
AND [System.Description] CONTAINS 'SharedParameter'
```

### All Tests by Team and Tenant
```wiql
SELECT * FROM workitems
WHERE [System.WorkItemType] = 'Test Case'
AND [System.AreaPath] UNDER 'Bolt Portal\Bolt-X\National General'
AND [System.Tags] CONTAINS 'Team:PL'
AND [System.Tags] CONTAINS 'AutomationReady'
```

## Parameter Lifecycle by Tenant

### Onboarding New Tenant (e.g., New Insurer)

1. **Create Tenant Area Path**
   ```
   Bolt Portal/Bolt-X/[NEW_TENANT_NAME]
   ```

2. **Import Relevant Parameter Sets**
   - Review which products tenant supports
   - Import matching CSV files
   - Adjust parameter values for tenant-specific requirements

3. **Link Parameter Sets to Area Path**
   - Tag parameter sets with tenant name
   - Create cross-reference document

4. **Create Baseline Test Cases**
   - Link test cases to imported parameters
   - Create test suite with query-based selection

### Updating Parameters for Tenant

**If applicant form changes:**
1. Download existing `PL_APPLICANT_SharedParameters.csv`
2. Add/remove columns as needed
3. Re-import (Azure DevOps will update existing parameter set)
4. Notify teams using this parameter set

**If new coverage option added:**
1. Update `PL_PERSONALHOMEOWNER_SharedParameters.csv` 
2. Add new column for coverage selection
3. Populate test data rows with coverage combinations
4. Update test cases to use new parameter

## Parameter Set Versioning

Store multiple versions in source control:

```
/test-templates/
├── v1.0/
│   ├── CL_APPLICANT_SharedParameters.csv (Initial)
│   └── ...
├── v2.0/
│   ├── CL_APPLICANT_SharedParameters.csv (Updated with new fields)
│   └── ...
└── current/ → v2.0 (symlink or copy)
```

## Shared Parameter Dependencies

```
Test Execution Flow:
├── Select Test Plan (by Tenant Area Path)
├── Select Test Suite (by WIQL query)
├── Select Test Case (linked to Shared Parameter Set)
└── Execute with Parameter Values
    ├── Read CSV values
    ├── Map to test steps (@ParameterName)
    └── Run test case N times (once per CSV row)
```

## Sample Test Case with Shared Parameters

**Test Case: TC-001 Verify CL Applicant Creation**
```
Linked Shared Parameter: CL_APPLICANT_SharedParameters

Test Steps:
1. Navigate to Create Applicant
2. Enter @FirstName in [First Name] field
3. Enter @LastName in [Last Name] field
4. Enter @Email in [Email] field
5. Enter @BusinessName in [Business Name] field
6. Enter @WebsiteAddress in [Website] field
7. Enter @AddressLine1 in [Address Line 1] field
8. Enter @City in [City] field
9. Enter @State in [State] field
10. Enter @ZipCode in [ZIP] field
11. Enter @PhoneNumber in [Phone] field
12. Select @ConsumerLine from [Line of Business] dropdown
13. Click [Save]
14. Verify applicant created with correct details

Expected Result:
✓ Applicant record created in system
✓ All fields populated correctly from shared parameters
✓ Confirmation message displayed
✓ Applicant ID assigned
```

**Execution Results:**
- Parameter Set: CL_APPLICANT_SharedParameters
- Rows: 1 (single test data row)
- Executions: 1 (test case runs once per row)
- Status: Pass/Fail per row

## Adding New Tenants - Checklist

- [ ] Create Area Path in Azure DevOps
- [ ] Define product mix (PL/CL/Specialty)
- [ ] Identify required parameter sets
- [ ] Adjust parameter values for tenant specs
- [ ] Create/import parameter sets
- [ ] Create baseline test cases
- [ ] Link test cases to parameters
- [ ] Create query-based suites for auto-selection
- [ ] Tag test cases with team/product
- [ ] Document in wiki
- [ ] Train team on parameter usage
- [ ] Validate first test execution

---
**Updated:** December 25, 2025
**Tenant Count:** 18 (see Area Path structure above)
**Total Parameter Sets:** 12
**Supported Multi-Line Tenants:** 5 (USAA, National General, Homesite, LibertyMutual, Travelers)
