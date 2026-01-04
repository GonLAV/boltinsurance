# TEST CASE TEMPLATES - Commercial Auto Policies
## Template: CL_APPLICATION_AUTO - Create Commercial Auto Policy Application

### Test Case ID: CL_AUTO_001
**Title**: Create Commercial Auto Policy Application

**Preconditions**:
- User is logged into BOLTEST
- Commercial Auto module is accessible
- Commercial applicant record exists (parent)

**Test Steps**:

| # | Action | Test Data | Expected Result |
|---|--------|-----------|-----------------|
| 1 | Navigate to Commercial Auto application form | Module: /app/policies/auto | Form loads successfully |
| 2 | Select Commercial Applicant | @BusinessName | Applicant dropdown populated |
| 3 | Enter Policy Details | N/A | Form displays for auto policy |
| 4 | Configure coverage options | Standard coverage | Coverage options available |
| 5 | Enter vehicle information | Test vehicle data | Vehicle details captured |
| 6 | Set effective date | Current date | Date picker functions |
| 7 | Calculate premium | N/A | Premium calculation succeeds |
| 8 | Review application | N/A | Summary page displays correctly |
| 9 | Submit application | N/A | Application saved successfully |
| 10 | Verify policy number generated | @PolicyNumber | Unique policy ID assigned |

**Expected Result**: Commercial auto policy application created with all details stored

**Postconditions**:
- Policy record exists in system
- Premium calculated and stored
- Policy number generated

---

## Parameter Mapping

**Commercial Auto Policy Parameters**:
```json
{
  "BusinessName": "string (from applicant)",
  "PolicyNumber": "auto-generated",
  "CoverageType": "Comprehensive, Liability, Collision",
  "EffectiveDate": "date format",
  "Premium": "currency",
  "VehicleInfo": "year, make, model, VIN"
}
```

## Related Shared Parameters Files
- `CL_APPLICATION_AUTO_SharedParameters.csv` - Policy test data
- Related Module: Commercial Auto Policies
- Data-Driven: Yes
- Parent Record: CL_APPLICANT

---

**Created**: December 25, 2025
**Version**: 1.0
**Status**: Active
**Test Type**: Functional, Integration
