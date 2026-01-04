# TEST CASE TEMPLATES - Personal Homeowner Coverage
## Template: PL_PERSONALHOMEOWNER - Create Personal Homeowner Insurance Policy

### Test Case ID: PL_HOME_001
**Title**: Create Personal Homeowner Insurance Policy

**Preconditions**:
- User is logged into BOLTEST
- Personal Line module is accessible
- Personal applicant record exists (parent)

**Test Steps**:

| # | Action | Test Data | Expected Result |
|---|--------|-----------|-----------------|
| 1 | Navigate to Homeowner policy form | Module: /app/policies/homeowner | Form loads successfully |
| 2 | Select Personal Applicant | @FirstName, @LastName | Applicant dropdown populated |
| 3 | Verify property address | @AddressLine1, @City, @State, @ZipCode | Address auto-populated from applicant |
| 4 | Enter property details | Dwelling value, construction type | Property information captured |
| 5 | Select coverage options | Dwelling, Personal Property, Liability | Coverage checkboxes available |
| 6 | Set deductible | $500 or $1000 | Deductible options presented |
| 7 | Enter effective date | Current date | Date picker functions |
| 8 | Calculate premium | N/A | Premium calculation succeeds |
| 9 | Review policy | N/A | Policy summary displays |
| 10 | Submit and bind policy | N/A | Policy created and activated |
| 11 | Verify policy number | @PolicyNumber | Unique policy ID assigned |

**Expected Result**: Homeowner insurance policy created with correct coverage and premium

**Postconditions**:
- Policy record exists in system
- Coverage confirmed in database
- Policy active and effective

---

## Parameter Mapping

**Personal Homeowner Parameters**:
```json
{
  "FirstName": "string (from applicant)",
  "LastName": "string (from applicant)",
  "AddressLine1": "string (from applicant)",
  "City": "string (from applicant)",
  "State": "2-letter code (from applicant)",
  "ZipCode": "5-digit (from applicant)",
  "DwellingValue": "currency",
  "DeductibleAmount": "$500, $1000, $2500",
  "CoverageType": "HO-3, HO-5",
  "PolicyNumber": "auto-generated"
}
```

## Related Shared Parameters Files
- `PL_PERSONALHOMEOWNER_SharedParameters.csv` - Homeowner policy test data
- Related Module: Personal Homeowner Policies
- Data-Driven: Yes
- Parent Record: PL_APPLICANT

---

**Created**: December 25, 2025
**Version**: 1.0
**Status**: Active
**Test Type**: Functional, Integration
