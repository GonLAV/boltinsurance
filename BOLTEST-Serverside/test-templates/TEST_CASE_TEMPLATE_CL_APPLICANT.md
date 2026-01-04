# TEST CASE TEMPLATES - Commercial Applicant Creation
## Template: CL_APPLICANT - Create Commercial Line Applicant

### Test Case ID: CL_APPLICANT_001
**Title**: Create Commercial Applicant with Valid Business Information

**Preconditions**:
- User is logged into BOLTEST
- Commercial Line module is accessible
- Database is in clean state

**Test Steps**:

| # | Action | Test Data | Expected Result |
|---|--------|-----------|-----------------|
| 1 | Navigate to Commercial Applicant creation form | URL: /app/create | Form loads successfully |
| 2 | Enter First Name | @FirstName (hhhhhhh) | Field accepts alphanumeric input |
| 3 | Enter Last Name | @LastName (sdsdy) | Field accepts alphanumeric input |
| 4 | Enter Business Email | @Email (ghghgdsd@sdsd.com) | Email validation passes |
| 5 | Enter Business Name | @BusinessName (test) | Field accepts alphanumeric input |
| 6 | Enter Website Address | @WebsiteAddress (www.sdsdo.com) | URL validation passes |
| 7 | Enter Address Line 1 | @AddressLine1 (1750 W Townsend St) | Address field populated |
| 8 | Enter City | @City (Rialto) | City field populated |
| 9 | Enter State | @State (CA) | State dropdown selected |
| 10 | Enter Zip Code | @ZipCode (92377) | Zip code field populated |
| 11 | Enter Phone Number | @PhoneNumber (555-945-1144) | Phone validation passes |
| 12 | Select Consumer Line Type | @ConsumerLine (Commercial) | Type selected as Commercial |
| 13 | Click Save Applicant button | N/A | Applicant created successfully |
| 14 | Verify applicant record in database | @BusinessName | Record appears in applicant list |

**Expected Result**: Applicant record is created with all business information stored correctly

**Postconditions**:
- Applicant record exists in system
- All field values are persisted correctly
- Confirmation message displayed

---

### Test Case ID: CL_APPLICANT_002
**Title**: Create Commercial Applicant and Validate Business Details

**Preconditions**:
- Commercial Applicant form is open and ready
- Test data set is prepared

**Test Steps**:

| # | Action | Test Data | Expected Result |
|---|--------|-----------|-----------------|
| 1 | Fill all required fields | @FirstName, @LastName, @Email | Fields populate without errors |
| 2 | Validate email format | @Email | Valid business email accepted |
| 3 | Validate website URL format | @WebsiteAddress | Valid URL accepted |
| 4 | Verify address components | @AddressLine1, @City, @State, @ZipCode | All address parts stored separately |
| 5 | Validate phone number format | @PhoneNumber | 10-digit format accepted |
| 6 | Confirm business type | @ConsumerLine | Commercial designation confirmed |
| 7 | Submit form | N/A | Form submission succeeds |
| 8 | Check confirmation page | N/A | Success message displayed with applicant ID |

**Expected Result**: Applicant details are validated and stored with correct data types

**Notes**: This template uses shared parameters to enable data-driven testing across multiple commercial applicant scenarios.

---

## Parameter Mapping

**Commercial Applicant Parameters**:
```json
{
  "FirstName": "string, 1-50 chars",
  "LastName": "string, 1-50 chars",
  "Email": "valid email format",
  "BusinessName": "string, 1-100 chars",
  "WebsiteAddress": "valid URL",
  "AddressLine1": "string, 1-100 chars",
  "City": "string, 1-50 chars",
  "State": "2-letter state code",
  "ZipCode": "5-digit numeric",
  "PhoneNumber": "10-digit format (XXX-XXX-XXXX)",
  "ConsumerLine": "Commercial, Personal"
}
```

## Related Shared Parameters Files
- `CL_APPLICANT_SharedParameters.csv` - Test data values for this template
- Related Module: Commercial Applicant Creation
- Data-Driven: Yes
- Parameterized: Yes

---

**Created**: December 25, 2025
**Version**: 1.0
**Status**: Active
**Test Type**: Functional, Data-Driven
