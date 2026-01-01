# TEST CASE TEMPLATES - Watercraft Coverage
## Template: WATERCRAFT - Create Watercraft Insurance Policy

### Test Case ID: BOAT_001
**Title**: Create Watercraft Insurance Policy

**Preconditions**:
- User is logged into BOLTEST
- Personal Line module is accessible
- Personal applicant record exists

**Test Steps**:

| # | Action | Test Data | Expected Result |
|---|--------|-----------|-----------------|
| 1 | Navigate to Watercraft policy form | Module: /app/policies/watercraft | Form loads successfully |
| 2 | Select Personal Applicant | @FirstName, @LastName | Applicant dropdown populated |
| 3 | Enter watercraft details | Type, Year, Make, Model, Hull ID | Watercraft information captured |
| 4 | Enter boat value | Estimated value | Currency field accepts amount |
| 5 | Select watercraft type | Boat, Jet Ski, Sailboat | Type selection available |
| 6 | Enter usage information | Waters used, annual hours | Usage data captured |
| 7 | Select coverage options | Liability, Comprehensive, Collision | Coverage checkboxes available |
| 8 | Set deductibles | Appropriate amounts | Deductible options presented |
| 9 | Set effective date | Current date | Date picker functions |
| 10 | Calculate premium | N/A | Premium calculation succeeds |
| 11 | Review policy | N/A | Policy summary displays |
| 12 | Submit policy | N/A | Policy created successfully |
| 13 | Verify watercraft documented | @PolicyNumber | Watercraft linked to policy |

**Expected Result**: Watercraft insurance policy created with correct vessel information

**Postconditions**:
- Policy record exists in system
- Watercraft details stored
- Coverage active

---

## Parameter Mapping

**Watercraft Parameters**:
```json
{
  "FirstName": "string (from applicant)",
  "LastName": "string (from applicant)",
  "WatercraftType": "Boat, Jet Ski, Sailboat, Yacht",
  "WatercraftYear": "numeric, 4-digit",
  "WatercraftMake": "string",
  "WatercraftModel": "string",
  "HullID": "unique identifier",
  "EstimatedValue": "currency",
  "AnnualUsageHours": "numeric",
  "WatersUsed": "string (location)",
  "DeductibleAmount": "currency",
  "PolicyNumber": "auto-generated"
}
```

## Related Shared Parameters Files
- `WATERCRAFT_SharedParameters.csv` - Watercraft policy test data
- Related Module: Watercraft Insurance
- Data-Driven: Yes
- Parent Record: PL_APPLICANT

---

**Created**: December 25, 2025
**Version**: 1.0
**Status**: Active
**Test Type**: Functional, Data-Driven
