# TEST CASE TEMPLATE LIBRARY - BOLTEST

## Overview
Complete library of 11 test case templates organized by insurance product line. Each template uses action-based test steps with parameterized data sourced from shared parameters CSV files.

---

## Template Directory

### 1. **Commercial Applicant Creation**
- **File**: `TEST_CASE_TEMPLATE_CL_APPLICANT.md`
- **Product Line**: Commercial Line
- **Action Focus**: Create → Verify → Submit → Confirm
- **Test Cases**: 2
- **Parameters**: FirstName, LastName, Email, BusinessName, WebsiteAddress, Address, City, State, ZipCode, PhoneNumber, ConsumerLine
- **Shared Parameters File**: `CL_APPLICANT_SharedParameters.csv`
- **Parent Record**: None (Top-level applicant)
- **Test Types**: Functional, Data-Driven

**Key Test Cases**:
- CL_APPLICANT_001: Create Commercial Applicant with Valid Business Information
- CL_APPLICANT_002: Create Commercial Applicant and Validate Business Details

---

### 2. **Personal Line Applicant Creation**
- **File**: `TEST_CASE_TEMPLATE_PL_APPLICANT.md`
- **Product Line**: Personal Line
- **Action Focus**: Create → Verify → Submit → Confirm
- **Test Cases**: 2
- **Parameters**: FirstName, LastName, Email, AddressLine1, City, State, ZipCode, PhoneNumber
- **Shared Parameters File**: `PL_APPLICANT_SharedParameters.csv`
- **Parent Record**: None (Top-level applicant)
- **Test Types**: Functional, Data-Driven

**Key Test Cases**:
- PL_APPLICANT_001: Create Personal Line Applicant with Valid Information
- PL_APPLICANT_002: Create Personal Applicant and Validate Address Information

---

### 3. **Commercial Auto Policies**
- **File**: `TEST_CASE_TEMPLATE_CL_AUTO.md`
- **Product Line**: Commercial Auto
- **Action Focus**: Configure → Verify → Quote → Submit
- **Test Cases**: 1
- **Parameters**: BusinessName, PolicyNumber, CoverageType, EffectiveDate, Premium, VehicleInfo
- **Shared Parameters File**: `CL_APPLICATION_AUTO_SharedParameters.csv`
- **Parent Record**: CL_APPLICANT (Commercial applicant required)
- **Test Types**: Functional, Integration

**Key Test Cases**:
- CL_AUTO_001: Create Commercial Auto Policy Application

---

### 4. **Personal Homeowner Coverage**
- **File**: `TEST_CASE_TEMPLATE_PL_HOMEOWNER.md`
- **Product Line**: Personal Home
- **Action Focus**: Create → Assess → Configure → Bind
- **Test Cases**: 1
- **Parameters**: FirstName, LastName, AddressLine1, City, State, ZipCode, DwellingValue, DeductibleAmount, CoverageType, PolicyNumber
- **Shared Parameters File**: `PL_PERSONALHOMEOWNER_SharedParameters.csv`
- **Parent Record**: PL_APPLICANT (Personal applicant required)
- **Test Types**: Functional, Integration

**Key Test Cases**:
- PL_HOME_001: Create Personal Homeowner Insurance Policy

---

### 5. **Renters Insurance Policies**
- **File**: `TEST_CASE_TEMPLATE_RENTERS.md`
- **Product Line**: Renters
- **Action Focus**: Create → Validate → Quote → Bind
- **Test Cases**: 1
- **Parameters**: FirstName, LastName, AddressLine1, City, State, ZipCode, PersonalPropertyValue, LiabilityLimit, PolicyNumber
- **Shared Parameters File**: `RENTERS_SharedParameters.csv`
- **Parent Record**: PL_APPLICANT (Personal applicant required)
- **Test Types**: Functional, Data-Driven

**Key Test Cases**:
- RENTERS_001: Create Renters Insurance Policy

---

### 6. **Motorcycle Coverage**
- **File**: `TEST_CASE_TEMPLATE_MOTORCYCLE.md`
- **Product Line**: Personal Auto/Motorcycle
- **Action Focus**: Create → Assess → Quote → Bind
- **Test Cases**: 1
- **Parameters**: FirstName, LastName, MotorcycleYear, MotorcycleMake, MotorcycleModel, VIN, AnnualMileage, DeductibleAmount, CoverageTypes, PolicyNumber
- **Shared Parameters File**: `MOTORCYCLE_SharedParameters.csv`
- **Parent Record**: PL_APPLICANT (Personal applicant required)
- **Test Types**: Functional, Data-Driven

**Key Test Cases**:
- MOTO_001: Create Motorcycle Insurance Policy

---

### 7. **Watercraft Coverage**
- **File**: `TEST_CASE_TEMPLATE_WATERCRAFT.md`
- **Product Line**: Personal Lines/Specialty
- **Action Focus**: Create → Assess → Quote → Bind
- **Test Cases**: 1
- **Parameters**: FirstName, LastName, WatercraftType, WatercraftYear, WatercraftMake, WatercraftModel, HullID, EstimatedValue, AnnualUsageHours, WatersUsed, DeductibleAmount, PolicyNumber
- **Shared Parameters File**: `WATERCRAFT_SharedParameters.csv`
- **Parent Record**: PL_APPLICANT (Personal applicant required)
- **Test Types**: Functional, Data-Driven

**Key Test Cases**:
- BOAT_001: Create Watercraft Insurance Policy

---

### 8. **Pet Insurance**
- **File**: `TEST_CASE_TEMPLATE_PETS.md`
- **Product Line**: Personal Lines/Specialty
- **Action Focus**: Create → Verify → Quote → Bind
- **Test Cases**: 1
- **Parameters**: FirstName, LastName, PetType, PetName, PetBreed, PetAge, PetWeight, PetMicrochip, ExistingConditions, CoverageType, AnnualDeductible, ReimbursementPercentage, PolicyNumber
- **Shared Parameters File**: `PETS_SharedParameters.csv`
- **Parent Record**: PL_APPLICANT (Personal applicant required)
- **Test Types**: Functional, Data-Driven

**Key Test Cases**:
- PETS_001: Create Pet Insurance Policy

---

### 9. **Personal Umbrella Coverage**
- **File**: `TEST_CASE_TEMPLATE_UMBRELLA.md`
- **Product Line**: Personal Umbrella
- **Action Focus**: Create → Verify → Link → Bind
- **Test Cases**: 1
- **Parameters**: FirstName, LastName, UmbrellaLimit, UnderlyingPolicies, UnderlyingLimits, PersonalAssets, ClaimsHistory, DeductibleAmount, PolicyNumber
- **Shared Parameters File**: `PERSONALUMBRELLA_SharedParameters.csv`
- **Parent Record**: PL_APPLICANT (Personal applicant required)
- **Dependencies**: Homeowner or Auto policies must exist
- **Test Types**: Functional, Integration

**Key Test Cases**:
- UMBRELLA_001: Create Personal Umbrella Insurance Policy

---

### 10. **Dwelling Fire Coverage**
- **File**: `TEST_CASE_TEMPLATE_DWELLINGFIRE.md`
- **Product Line**: Personal Fire/Property
- **Action Focus**: Create → Assess → Quote → Bind
- **Test Cases**: 1
- **Parameters**: FirstName, LastName, AddressLine1, City, State, ZipCode, PropertyConstruction, YearBuilt, DwellingValue, DetachedStructuresValue, CoverageType, DeductibleAmount, AdditionalInsured, PolicyNumber
- **Shared Parameters File**: `DWELLINGFIRE_SharedParameters.csv`
- **Parent Record**: PL_APPLICANT (Personal applicant required)
- **Test Types**: Functional, Data-Driven

**Key Test Cases**:
- FIRE_001: Create Dwelling Fire Insurance Policy

---

### 11. **Condominium Coverage**
- **File**: `TEST_CASE_TEMPLATE_CONDOMINIUM.md`
- **Product Line**: Personal Condo
- **Action Focus**: Create → Assess → Quote → Bind
- **Test Cases**: 1
- **Parameters**: FirstName, LastName, AddressLine1, City, State, ZipCode, UnitNumber, BuildingNumber, PersonalPropertyValue, ImprovementsValue, AssociationName, AssociationContact, MasterPolicyCoverage, DeductibleAmount, PolicyNumber
- **Shared Parameters File**: `CONDOMINIUM_SharedParameters.csv`
- **Parent Record**: PL_APPLICANT (Personal applicant required)
- **Test Types**: Functional, Data-Driven

**Key Test Cases**:
- CONDO_001: Create Condominium Insurance Policy

---

## Dependency Hierarchy

```
├── Commercial Line
│   ├── CL_APPLICANT (Applicant Creation)
│   │   └── CL_AUTO (Commercial Auto Policies) → Requires CL_APPLICANT
│
└── Personal Line
    ├── PL_APPLICANT (Applicant Creation)
    │   ├── PL_HOMEOWNER (Homeowner Coverage)
    │   ├── RENTERS (Renters Policies)
    │   ├── MOTORCYCLE (Motorcycle Coverage)
    │   ├── WATERCRAFT (Watercraft Coverage)
    │   ├── PETS (Pet Insurance)
    │   ├── DWELLINGFIRE (Dwelling Fire)
    │   ├── CONDOMINIUM (Condo Coverage)
    │   └── PERSONALUMBRELLA (Umbrella) → Requires PL_HOMEOWNER or CL_AUTO
```

---

## Action Workflow Mapping

### Commercial Line Actions
```
Commercial Applicant: Create → Verify → Submit → Confirm
  └─ Auto Policy: Configure → Verify → Quote → Submit
```

### Personal Line Actions
```
Personal Applicant: Create → Verify → Submit → Confirm
  ├─ Homeowner: Create → Assess → Configure → Bind
  ├─ Renters: Create → Validate → Quote → Bind
  ├─ Motorcycle: Create → Assess → Quote → Bind
  ├─ Watercraft: Create → Assess → Quote → Bind
  ├─ Pet: Create → Verify → Quote → Bind
  ├─ Fire: Create → Assess → Quote → Bind
  ├─ Condo: Create → Assess → Quote → Bind
  └─ Umbrella: Create → Verify → Link → Bind (depends on Home/Auto)
```

---

## Using Test Case Templates

### 1. **Select Template**
Choose the appropriate template for your test scenario based on product line.

### 2. **Load Shared Parameters**
Reference the corresponding CSV file in the Shared Parameters Manager:
- Navigate to `/app/shared-parameters`
- Upload or import the CSV file
- Parameters become available for test execution

### 3. **Map Parameters**
Each test step uses `@ParameterName` syntax:
```
Example: Enter First Name = @FirstName
Actual Value: Enter First Name = John (from CSV)
```

### 4. **Execute Test Cases**
Follow the action-based test steps in sequence.

### 5. **Validate Results**
Confirm expected results after each action.

---

## Shared Parameters Files Reference

All templates link to corresponding CSV files:

| Template | CSV File | Product Line |
|----------|----------|--------------|
| CL_APPLICANT | CL_APPLICANT_SharedParameters.csv | Commercial |
| PL_APPLICANT | PL_APPLICANT_SharedParameters.csv | Personal |
| CL_AUTO | CL_APPLICATION_AUTO_SharedParameters.csv | Commercial Auto |
| PL_HOMEOWNER | PL_PERSONALHOMEOWNER_SharedParameters.csv | Home |
| RENTERS | RENTERS_SharedParameters.csv | Renters |
| MOTORCYCLE | MOTORCYCLE_SharedParameters.csv | Motorcycle |
| WATERCRAFT | WATERCRAFT_SharedParameters.csv | Watercraft |
| PETS | PETS_SharedParameters.csv | Pet Insurance |
| UMBRELLA | PERSONALUMBRELLA_SharedParameters.csv | Umbrella |
| DWELLINGFIRE | DWELLINGFIRE_SharedParameters.csv | Fire |
| CONDOMINIUM | CONDOMINIUM_SharedParameters.csv | Condo |

---

## Test Execution Integration

### Step 1: Prepare Test Environment
- Ensure BOLTEST application is running
- Navigate to Shared Parameters Manager
- Verify all CSV files are loaded

### Step 2: Select Test Template
- Choose product line
- Review test cases and steps
- Note parameter names and values

### Step 3: Execute in UI
- Follow action-based steps
- Enter @ParameterName values from CSV
- Validate results after each step

### Step 4: Log Results
- Document pass/fail status
- Note any deviations
- Capture screenshots for issues

---

## Template Version Information

| Template | Version | Created | Status |
|----------|---------|---------|--------|
| CL_APPLICANT | 1.0 | 2025-12-25 | Active |
| PL_APPLICANT | 1.0 | 2025-12-25 | Active |
| CL_AUTO | 1.0 | 2025-12-25 | Active |
| PL_HOMEOWNER | 1.0 | 2025-12-25 | Active |
| RENTERS | 1.0 | 2025-12-25 | Active |
| MOTORCYCLE | 1.0 | 2025-12-25 | Active |
| WATERCRAFT | 1.0 | 2025-12-25 | Active |
| PETS | 1.0 | 2025-12-25 | Active |
| UMBRELLA | 1.0 | 2025-12-25 | Active |
| DWELLINGFIRE | 1.0 | 2025-12-25 | Active |
| CONDOMINIUM | 1.0 | 2025-12-25 | Active |

---

## Notes

- All templates follow action-driven test design
- First word of each test step represents the action (Create, Verify, Submit, etc.)
- Parameters are sourced from shared CSV files for data-driven testing
- Templates support integration testing (parent-child relationships)
- All test data is real and mapped to actual insurance product workflows

**Status**: ✅ All 11 templates created and ready for use
**Last Updated**: December 25, 2025
