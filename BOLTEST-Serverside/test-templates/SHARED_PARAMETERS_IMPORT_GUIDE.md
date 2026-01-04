# Azure DevOps Test Plans - Shared Parameter Sets Import Guide

## Overview
12 shared parameter sets have been created for all BOLTEST tenant/product types. These can be imported directly into Azure DevOps Test Plans.

## Files Created

| Product Type | File Name | Tenant | Parameters |
|---|---|---|---|
| CL APPLICANT | CL_APPLICANT_SharedParameters.csv | Commercial Line | FirstName, LastName, Email, BusinessName, WebsiteAddress, Address, PhoneNumber, ConsumerLine |
| PL APPLICANT | PL_APPLICANT_SharedParameters.csv | Personal Line | FirstName, LastName, Email, Address, PhoneNumber |
| CL APPLICATION AUTO | CL_APPLICATION_AUTO_SharedParameters.csv | Commercial Auto | FirstName, LastName, Email, DOB, Phone, Addresses, EffectiveDate, Business Details |
| PL PERSONAL HOMEOWNER | PL_PERSONALHOMEOWNER_SharedParameters.csv | Personal Home | FirstName, LastName, Email, DOB, Phone, Property Address, Dwelling Details |
| RENTERS | RENTERS_SharedParameters.csv | Renters | FirstName, LastName, Email, DOB, Phone, Property Details, Occupancy |
| MOTORCYCLE | MOTORCYCLE_SharedParameters.csv | Motorcycle | FirstName, LastName, Email, DOB, VIN, Purchase Date, Value |
| WATERCRAFT | WATERCRAFT_SharedParameters.csv | Watercraft | FirstName, LastName, Email, DOB, Make, Model, Year |
| PETS | PETS_SharedParameters.csv | Pet Insurance | FirstName, LastName, Email, Pet Details |
| PERSONAL UMBRELLA | PERSONALUMBRELLA_SharedParameters.csv | Umbrella | FirstName, LastName, Email, Coverage Details |
| DWELLING FIRE | DWELLINGFIRE_SharedParameters.csv | Dwelling Fire | FirstName, LastName, Email, Property Details |
| CONDOMINIUM | CONDOMINIUM_SharedParameters.csv | Condo | FirstName, LastName, Email, Property Details, Building Details |

## How to Import into Azure DevOps Test Plans

### Step 1: Navigate to Test Plans
1. Open Azure DevOps Project
2. Go to **Test Plans** → **Shared Parameters**

### Step 2: Import CSV Files
1. Click **Import** or **+ New**
2. Select CSV file from `test-templates/` folder
3. Set Name: `[ProductType]_Parameters`
4. Choose your Project and Area Path (e.g., `/Bolt-X/Progressive PL`)
5. Click **Import**

### Step 3: Link to Test Cases
Once imported, you can use shared parameters in test cases:
1. Open test case
2. Click **Add shared parameter**
3. Select the imported parameter set
4. Columns will auto-populate based on CSV headers
5. Add rows for different test scenarios

## Test Case Template Usage

### Example: Testing CL APPLICANT Creation
**Test Case:** Verify CL Applicant creation with valid data

| Step | Action | Expected Result |
|---|---|---|
| 1 | Navigate to Create Applicant form | Form loads |
| 2 | Enter @FirstName in First Name field | Field accepts input |
| 3 | Enter @LastName in Last Name field | Field accepts input |
| 4 | Enter @Email in Email field | Field accepts input |
| 5 | Enter @BusinessName in Business Name field | Field accepts input |
| 6 | Enter @WebsiteAddress in Website URL field | Field accepts input |
| 7 | Click Save | Applicant created successfully |

### Multi-Row Testing
If CSV has multiple data rows, test case will execute once per row:
- Row 1: Test with first data set
- Row 2: Test with second data set (if added)
- Row N: Test with Nth data set

## Key Features

✅ **Reusable Parameters** - Use same data across multiple test cases
✅ **Data-Driven Testing** - Add rows to CSV to expand test coverage
✅ **Tenant/Product Specific** - Organized by product type
✅ **CSV Format** - Easy to edit in Excel or any text editor
✅ **Dynamic Values** - Supports placeholders like `{{currentdate}}`
✅ **Team Filtering** - Can be tagged by team via Area Paths

## Advanced: Adding More Test Data

### To Add More Rows to Existing Parameter Set:
1. Download the CSV file
2. Add new row with test data
3. Save and re-import (or use REST API for bulk updates)

### Example: Adding Another CL APPLICANT
```csv
FirstName	LastName	Email	BusinessName	WebsiteAddress	AddressLine1	City	State	ZipCode	PhoneNumber	ConsumerLine
hhhhhhh	sdsdy	ghghgdsd@sdsd.com	test	www.sdsdo.com	1750 W Townsend St	Rialto	CA	92377	555-945-1144	Commercial
NewFirstName	NewLastName	newemail@test.com	newbiz	www.newbiz.com	100 New Street	Los Angeles	CA	90001	555-123-4567	Commercial
```

## Using REST API for Bulk Import

PowerShell example:
```powershell
$pat = "[Your PAT Token]"
$headers = @{Authorization = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$pat")))" }
$csvPath = ".\CL_APPLICANT_SharedParameters.csv"

$csv = Import-Csv $csvPath -Delimiter "`t"
$body = @{
    parameterName = "CL_APPLICANT_Parameters"
    parameterSet = $csv
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://dev.azure.com/[org]/[project]/_apis/testplan/parameters?api-version=7.1-preview.1" `
    -Headers $headers -Method POST -Body $body -ContentType "application/json"
```

## Tenant/Area Path Mapping

Map parameter sets to tenants via Area Paths:
- `Bolt-X/Progressive PL` → PL_PERSONALHOMEOWNER, PL_APPLICANT
- `Bolt-X/USAA` → All applicable product types
- `Bolt-X/National General` → Product-specific parameters
- `Bolt-X/Test Tenant` → All parameter sets (for testing)

## Support for Dynamic Values

Parameters support placeholders:
- `{{currentdate}}` - Today's date in yyyy-MM-dd format
- `{{guid}}` - Random GUID
- `{{random_number}}` - Random integer
- Custom values - Any static text

## Next Steps

1. ✅ Create/import shared parameter sets
2. Create test cases with shared parameters
3. Link test cases to test suite
4. Configure query-based suite for automatic test case collection
5. Execute test plan with parameterized data
6. Track results by parameter set combination

## Troubleshooting

| Issue | Solution |
|---|---|
| CSV won't import | Ensure tab-delimited format, not comma |
| Parameters not visible | Check Area Path permissions |
| Data not populating in test case | Verify parameter names in test case steps match CSV headers exactly |
| Shared parameter link is broken | Re-link parameter set to test case |

## Best Practices

1. **Naming**: Use consistent naming: `[PRODUCTTYPE]_SharedParameters.csv`
2. **Data Updates**: Keep test data fresh; update CSVs quarterly
3. **Version Control**: Store CSVs in repo under `/test-templates/`
4. **Documentation**: Comment in test case steps which parameters are used
5. **Grouping**: Organize by product/tenant in separate parameter sets
6. **Validation**: Always test shared parameter import on dev project first

---
**Created:** December 25, 2025
**Format:** Azure DevOps Test Plans Compatible (CSV, tab-delimited)
**Total Parameter Sets:** 12
