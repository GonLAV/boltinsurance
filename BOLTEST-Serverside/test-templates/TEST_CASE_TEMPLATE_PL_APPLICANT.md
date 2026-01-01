# TEST CASE TEMPLATES - Personal Line Applicant Creation
## Template: PL_APPLICANT - Create Personal Line Applicant

### Test Case ID: PL_APPLICANT_001
**Title**: Create Personal Line Applicant with Valid Information

**Preconditions**:
- User is logged into BOLTEST
- Personal Line module is accessible
- Database is in clean state

**Test Steps**:

| # | Action | Test Data | Expected Result |
|---|--------|-----------|-----------------|
| 1 | Navigate to Personal Line Applicant form | URL: /app/create | Form loads successfully |
| 2 | Enter First Name | @FirstName (ATest) | Field accepts alphanumeric input |
| 3 | Enter Last Name | @LastName (BTTest) | Field accepts alphanumeric input |
| 4 | Enter Email Address | @Email (A188@epos.com) | Email validation passes |
| 5 | Enter Address Line 1 | @AddressLine1 (1127 montego) | Address field populated |
| 6 | Enter City | @City (Beverly Hills) | City field populated |
| 7 | Enter State | @State (CA) | State dropdown selected |
| 8 | Enter Zip Code | @ZipCode (90210) | Zip code field populated |
| 9 | Enter Phone Number | @PhoneNumber (555-229-0999) | Phone validation passes |
| 10 | Click Save Applicant button | N/A | Applicant created successfully |
| 11 | Verify applicant record in database | @FirstName, @LastName | Record appears in applicant list |

**Expected Result**: Personal line applicant record is created with all information stored correctly

**Postconditions**:
- Applicant record exists in system
- All field values are persisted correctly
- Confirmation message displayed

---

### Test Case ID: PL_APPLICANT_002
**Title**: Create Personal Applicant and Validate Address Information

**Preconditions**:
- Personal Applicant form is open and ready
- Test data set is prepared

**Test Steps**:

| # | Action | Test Data | Expected Result |
|---|--------|-----------|-----------------|
| 1 | Fill all personal information fields | @FirstName, @LastName, @Email | Fields populate without errors |
| 2 | Validate email format | @Email | Valid email accepted |
| 3 | Enter residential address | @AddressLine1 | Address field accepts residential addresses |
| 4 | Verify address components | @City, @State, @ZipCode | All address parts stored separately |
| 5 | Validate phone number format | @PhoneNumber | 10-digit format accepted |
| 6 | Submit form | N/A | Form submission succeeds |
| 7 | Check applicant dashboard | @FirstName | Applicant appears in dashboard |
| 8 | Verify address in records | @AddressLine1, @City | Complete address stored correctly |

**Expected Result**: Personal applicant details are validated and stored with correct address information

---

## Parameter Mapping

**Personal Line Applicant Parameters**:
```json
{
  "FirstName": "string, 1-50 chars",
  "LastName": "string, 1-50 chars",
  "Email": "valid email format",
  "AddressLine1": "string, 1-100 chars (residential)",
  "City": "string, 1-50 chars",
  "State": "2-letter state code",
  "ZipCode": "5-digit numeric",
  "PhoneNumber": "10-digit format (XXX-XXX-XXXX)"
}
```

## Related Shared Parameters Files
- `PL_APPLICANT_SharedParameters.csv` - Test data values for this template
- Related Module: Personal Line Applicant Creation
- Data-Driven: Yes
- Parameterized: Yes

---

**Created**: December 25, 2025
**Version**: 1.0
**Status**: Active
**Test Type**: Functional, Data-Driven
