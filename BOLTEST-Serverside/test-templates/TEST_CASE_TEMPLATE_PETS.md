# TEST CASE TEMPLATES - Pet Insurance
## Template: PETS - Create Pet Insurance Policy

### Test Case ID: PETS_001
**Title**: Create Pet Insurance Policy

**Preconditions**:
- User is logged into BOLTEST
- Personal Line module is accessible
- Personal applicant record exists

**Test Steps**:

| # | Action | Test Data | Expected Result |
|---|--------|-----------|-----------------|
| 1 | Navigate to Pet insurance form | Module: /app/policies/pet | Form loads successfully |
| 2 | Select Personal Applicant | @FirstName, @LastName | Applicant dropdown populated |
| 3 | Select pet type | Dog, Cat, Other | Pet type dropdown available |
| 4 | Enter pet information | Name, Breed, Age, Weight | Pet details captured |
| 5 | Enter pet health history | Existing conditions | Health history field available |
| 6 | Select coverage options | Accident & Illness, Wellness | Coverage selection available |
| 7 | Set annual deductible | $250, $500, $1000 | Deductible options presented |
| 8 | Set reimbursement percentage | 70%, 80%, 90% | Reimbursement level selection |
| 9 | Enter effective date | Current date | Date picker functions |
| 10 | Calculate premium | N/A | Premium calculation succeeds |
| 11 | Review policy | N/A | Policy summary displays |
| 12 | Submit policy | N/A | Policy created successfully |
| 13 | Verify pet covered | @PolicyNumber | Pet identified in policy |

**Expected Result**: Pet insurance policy created with appropriate coverage and pet information

**Postconditions**:
- Policy record exists in system
- Pet information stored
- Coverage limits configured

---

## Parameter Mapping

**Pet Insurance Parameters**:
```json
{
  "FirstName": "string (from applicant)",
  "LastName": "string (from applicant)",
  "PetType": "Dog, Cat, Other",
  "PetName": "string",
  "PetBreed": "string",
  "PetAge": "numeric",
  "PetWeight": "numeric (lbs)",
  "PetMicrochip": "identifier",
  "ExistingConditions": "text",
  "CoverageType": "Accident & Illness, Wellness",
  "AnnualDeductible": "$250, $500, $1000",
  "ReimbursementPercentage": "70, 80, 90",
  "PolicyNumber": "auto-generated"
}
```

## Related Shared Parameters Files
- `PETS_SharedParameters.csv` - Pet insurance test data
- Related Module: Pet Insurance
- Data-Driven: Yes
- Parent Record: PL_APPLICANT

---

**Created**: December 25, 2025
**Version**: 1.0
**Status**: Active
**Test Type**: Functional, Data-Driven
