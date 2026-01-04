# TEST CASE TEMPLATES - Renters Insurance Policies
## Template: RENTERS - Create Renters Insurance Policy

### Test Case ID: RENTERS_001
**Title**: Create Renters Insurance Policy

**Preconditions**:
- User is logged into BOLTEST
- Personal Line module is accessible
- Personal applicant record exists

**Test Steps**:

| # | Action | Test Data | Expected Result |
|---|--------|-----------|-----------------|
| 1 | Navigate to Renters policy form | Module: /app/policies/renters | Form loads successfully |
| 2 | Select Personal Applicant | @FirstName, @LastName | Applicant dropdown populated |
| 3 | Enter rental property address | @AddressLine1, @City, @State, @ZipCode | Address information captured |
| 4 | Enter personal property value | Amount (e.g., $15,000) | Value field accepts currency |
| 5 | Select coverage options | Personal Property, Liability, Medical | Coverage checkboxes available |
| 6 | Set liability limit | Standard ($100K, $300K) | Liability options presented |
| 7 | Enter effective date | Current date | Date picker functions |
| 8 | Calculate premium | N/A | Premium calculation succeeds |
| 9 | Review policy summary | N/A | Summary page displays correctly |
| 10 | Submit policy | N/A | Policy created successfully |
| 11 | Verify policy activation | @PolicyNumber | Policy is active |

**Expected Result**: Renters insurance policy created with appropriate coverage limits

**Postconditions**:
- Policy record exists in system
- Personal property coverage active
- Liability coverage confirmed

---

## Parameter Mapping

**Renters Insurance Parameters**:
```json
{
  "FirstName": "string (from applicant)",
  "LastName": "string (from applicant)",
  "AddressLine1": "string",
  "City": "string",
  "State": "2-letter code",
  "ZipCode": "5-digit",
  "PersonalPropertyValue": "currency",
  "LiabilityLimit": "$100000, $300000, $500000",
  "PolicyNumber": "auto-generated"
}
```

## Related Shared Parameters Files
- `RENTERS_SharedParameters.csv` - Renters policy test data
- Related Module: Renters Insurance
- Data-Driven: Yes
- Parent Record: PL_APPLICANT

---

**Created**: December 25, 2025
**Version**: 1.0
**Status**: Active
**Test Type**: Functional, Data-Driven
