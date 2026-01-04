# TEST CASE TEMPLATES - Condominium Coverage
## Template: CONDOMINIUM - Create Condominium Insurance Policy

### Test Case ID: CONDO_001
**Title**: Create Condominium Insurance Policy

**Preconditions**:
- User is logged into BOLTEST
- Personal Line module is accessible
- Personal applicant record exists
- Condominium property information available

**Test Steps**:

| # | Action | Test Data | Expected Result |
|---|--------|-----------|-----------------|
| 1 | Navigate to Condominium policy form | Module: /app/policies/condominium | Form loads successfully |
| 2 | Select Personal Applicant | @FirstName, @LastName | Applicant dropdown populated |
| 3 | Verify condo address | @AddressLine1, @City, @State, @ZipCode | Address auto-populated |
| 4 | Enter unit information | Unit number, building | Unit details captured |
| 5 | Enter condo association info | Association name, contact | Association information captured |
| 6 | Enter personal property value | Contents value | Currency amount captured |
| 7 | Review association coverage | Master policy details | Association coverage displayed |
| 8 | Select additional coverage | Improvements, personal property | Coverage options available |
| 9 | Set deductible | $250, $500, $1000 | Deductible options presented |
| 10 | Enter effective date | Current date | Date picker functions |
| 11 | Calculate premium | N/A | Premium calculation succeeds |
| 12 | Review policy | N/A | Policy summary displays |
| 13 | Submit and activate policy | N/A | Policy created successfully |
| 14 | Verify condo coverage | @PolicyNumber | Condo unit identified in policy |
| 15 | Confirm association coordination | Master policy reference | Association coordination noted |

**Expected Result**: Condominium insurance policy created with appropriate unit and association coverage

**Postconditions**:
- Policy record exists in system
- Unit information documented
- Association coordination confirmed

---

## Parameter Mapping

**Condominium Parameters**:
```json
{
  "FirstName": "string (from applicant)",
  "LastName": "string (from applicant)",
  "AddressLine1": "string (from applicant)",
  "City": "string (from applicant)",
  "State": "2-letter code (from applicant)",
  "ZipCode": "5-digit (from applicant)",
  "UnitNumber": "string/numeric",
  "BuildingNumber": "numeric",
  "PersonalPropertyValue": "currency",
  "ImprovementsValue": "currency",
  "AssociationName": "string",
  "AssociationContact": "phone/email",
  "MasterPolicyCoverage": "currency",
  "DeductibleAmount": "$250, $500, $1000",
  "PolicyNumber": "auto-generated"
}
```

## Related Shared Parameters Files
- `CONDOMINIUM_SharedParameters.csv` - Condominium policy test data
- Related Module: Condominium Insurance
- Data-Driven: Yes
- Parent Record: PL_APPLICANT

---

**Created**: December 25, 2025
**Version**: 1.0
**Status**: Active
**Test Type**: Functional, Data-Driven
