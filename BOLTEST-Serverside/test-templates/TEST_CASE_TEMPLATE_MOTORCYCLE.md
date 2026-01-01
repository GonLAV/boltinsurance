# TEST CASE TEMPLATES - Motorcycle Coverage
## Template: MOTORCYCLE - Create Motorcycle Insurance Policy

### Test Case ID: MOTO_001
**Title**: Create Motorcycle Insurance Policy

**Preconditions**:
- User is logged into BOLTEST
- Personal Line module is accessible
- Personal applicant record exists

**Test Steps**:

| # | Action | Test Data | Expected Result |
|---|--------|-----------|-----------------|
| 1 | Navigate to Motorcycle policy form | Module: /app/policies/motorcycle | Form loads successfully |
| 2 | Select Personal Applicant | @FirstName, @LastName | Applicant dropdown populated |
| 3 | Enter motorcycle details | Year, Make, Model, VIN | Motorcycle information captured |
| 4 | Enter annual mileage | Numeric value | Mileage field accepts input |
| 5 | Select coverage types | Liability, Collision, Comprehensive | Coverage options available |
| 6 | Set deductibles | $250, $500, $1000 | Deductible options presented |
| 7 | Enter coverage limits | Per occurrence limits | Limit configuration available |
| 8 | Set effective date | Current date | Date picker functions |
| 9 | Calculate premium | N/A | Premium calculation succeeds |
| 10 | Review policy | N/A | Policy summary displays |
| 11 | Submit and activate policy | N/A | Policy created and activated |
| 12 | Verify motorcycle coverage | @PolicyNumber | Policy assigned to motorcycle |

**Expected Result**: Motorcycle insurance policy created with appropriate coverage

**Postconditions**:
- Policy record exists in system
- Motorcycle identified in policy
- All coverage types configured

---

## Parameter Mapping

**Motorcycle Parameters**:
```json
{
  "FirstName": "string (from applicant)",
  "LastName": "string (from applicant)",
  "MotorcycleYear": "numeric, 4-digit",
  "MotorcycleMake": "string",
  "MotorcycleModel": "string",
  "VIN": "17-character VIN",
  "AnnualMileage": "numeric",
  "DeductibleAmount": "$250, $500, $1000",
  "CoverageTypes": "Liability, Collision, Comprehensive",
  "PolicyNumber": "auto-generated"
}
```

## Related Shared Parameters Files
- `MOTORCYCLE_SharedParameters.csv` - Motorcycle policy test data
- Related Module: Motorcycle Insurance
- Data-Driven: Yes
- Parent Record: PL_APPLICANT

---

**Created**: December 25, 2025
**Version**: 1.0
**Status**: Active
**Test Type**: Functional, Data-Driven
