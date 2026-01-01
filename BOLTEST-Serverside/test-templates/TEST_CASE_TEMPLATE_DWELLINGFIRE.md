# TEST CASE TEMPLATES - Dwelling Fire Coverage
## Template: DWELLINGFIRE - Create Dwelling Fire Insurance Policy

### Test Case ID: FIRE_001
**Title**: Create Dwelling Fire Insurance Policy

**Preconditions**:
- User is logged into BOLTEST
- Personal Line module is accessible
- Personal applicant record exists
- Property address available

**Test Steps**:

| # | Action | Test Data | Expected Result |
|---|--------|-----------|-----------------|
| 1 | Navigate to Dwelling Fire policy form | Module: /app/policies/dwelling-fire | Form loads successfully |
| 2 | Select Personal Applicant | @FirstName, @LastName | Applicant dropdown populated |
| 3 | Verify property address | @AddressLine1, @City, @State, @ZipCode | Address auto-populated |
| 4 | Enter property construction | Wood, Masonry, Metal | Construction type selection |
| 5 | Enter year built | Numeric, 4-digit | Year captured |
| 6 | Enter dwelling value | Estimated rebuild cost | Currency amount captured |
| 7 | Enter detached structures info | Garage, shed value | Detached property values |
| 8 | Select coverage type | Fire, Extended | Coverage type selection |
| 9 | Set deductible | $500, $1000, $2500 | Deductible options presented |
| 10 | Enter additional insured | Names/entities | Additional insured field |
| 11 | Set effective date | Current date | Date picker functions |
| 12 | Calculate premium | N/A | Premium calculation succeeds |
| 13 | Review policy | N/A | Policy summary displays |
| 14 | Submit policy | N/A | Policy created successfully |
| 15 | Verify fire coverage | @PolicyNumber | Fire coverage confirmed active |

**Expected Result**: Dwelling fire insurance policy created with property protection

**Postconditions**:
- Policy record exists in system
- Dwelling value documented
- Fire coverage active and effective

---

## Parameter Mapping

**Dwelling Fire Parameters**:
```json
{
  "FirstName": "string (from applicant)",
  "LastName": "string (from applicant)",
  "AddressLine1": "string (from applicant)",
  "City": "string (from applicant)",
  "State": "2-letter code (from applicant)",
  "ZipCode": "5-digit (from applicant)",
  "PropertyConstruction": "Wood, Masonry, Metal, Concrete",
  "YearBuilt": "numeric, 4-digit",
  "DwellingValue": "currency",
  "DetachedStructuresValue": "currency",
  "CoverageType": "Fire, Extended, Special",
  "DeductibleAmount": "$500, $1000, $2500",
  "AdditionalInsured": "string/array",
  "PolicyNumber": "auto-generated"
}
```

## Related Shared Parameters Files
- `DWELLINGFIRE_SharedParameters.csv` - Dwelling fire policy test data
- Related Module: Dwelling Fire Insurance
- Data-Driven: Yes
- Parent Record: PL_APPLICANT

---

**Created**: December 25, 2025
**Version**: 1.0
**Status**: Active
**Test Type**: Functional, Data-Driven
