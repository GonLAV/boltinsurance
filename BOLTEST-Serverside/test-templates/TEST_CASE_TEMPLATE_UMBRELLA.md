# TEST CASE TEMPLATES - Personal Umbrella Coverage
## Template: PERSONALUMBRELLA - Create Personal Umbrella Insurance Policy

### Test Case ID: UMBRELLA_001
**Title**: Create Personal Umbrella Insurance Policy

**Preconditions**:
- User is logged into BOLTEST
- Personal Line module is accessible
- Personal applicant record exists
- Underlying homeowner or auto policy exists

**Test Steps**:

| # | Action | Test Data | Expected Result |
|---|--------|-----------|-----------------|
| 1 | Navigate to Umbrella policy form | Module: /app/policies/umbrella | Form loads successfully |
| 2 | Select Personal Applicant | @FirstName, @LastName | Applicant dropdown populated |
| 3 | Review underlying policies | Homeowner, Auto policies | Required underlying policies listed |
| 4 | Verify underlying limits | Current coverage amounts | Limits displayed correctly |
| 5 | Select umbrella coverage limit | $1M, $2M, $5M | Coverage limit options presented |
| 6 | Enter personal asset information | Assets to protect | Asset valuation captured |
| 7 | Verify underwriting requirements | Claims history check | Underwriting criteria presented |
| 8 | Set effective date | Current date | Date picker functions |
| 9 | Calculate premium | N/A | Premium calculation succeeds |
| 10 | Review policy | N/A | Policy summary displays |
| 11 | Submit and activate policy | N/A | Policy created successfully |
| 12 | Verify umbrella coverage | @PolicyNumber | Umbrella policy linked to applicant |
| 13 | Confirm coverage excess | Underlying limits | Excess coverage verified |

**Expected Result**: Personal umbrella insurance policy created with excess liability coverage

**Postconditions**:
- Policy record exists in system
- Coverage excess over underlying policies
- Policy is effective

---

## Parameter Mapping

**Personal Umbrella Parameters**:
```json
{
  "FirstName": "string (from applicant)",
  "LastName": "string (from applicant)",
  "UmbrellaLimit": "$1000000, $2000000, $5000000",
  "UnderlyingPolicies": ["Homeowner", "Auto"],
  "UnderlyingLimits": "currency array",
  "PersonalAssets": "currency",
  "ClaimsHistory": "text/array",
  "DeductibleAmount": "currency",
  "PolicyNumber": "auto-generated"
}
```

## Related Shared Parameters Files
- `PERSONALUMBRELLA_SharedParameters.csv` - Umbrella policy test data
- Related Module: Personal Umbrella Insurance
- Data-Driven: Yes
- Parent Record: PL_APPLICANT
- Dependent On: Homeowner or Auto policies

---

**Created**: December 25, 2025
**Version**: 1.0
**Status**: Active
**Test Type**: Functional, Integration
