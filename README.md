# 🚀 BOLTESTTOOLPROD

BOLT Test Automation & Management Platform - Complete Production Suite

## 📦 Repository Structure

### BOLTEST-Serverside/
Backend Node.js/Express server for Azure DevOps test integration
- **Purpose**: Azure DevOps REST API integration, test case management, shared parameters
- **Tech**: Node.js, Express, Azure DevOps REST API
- **Features**:
  - Auto-assign test cases to creators
  - WIQL pagination with cursor-based queries
  - Shared parameter management
  - Test plan and suite operations
  - Attachment upload and sync

### Boltest-Frontside/
React/TypeScript frontend with test case creation and management UI
- **Purpose**: User interface for test case creation, execution, and management
- **Tech**: React, TypeScript, TailwindCSS
- **Features**:
  - Test case creation with parameterized steps
  - Shared parameter integration
  - Settings modal for credential storage
  - Lazy-loading with Intersection Observer
  - Data-driven test execution

## 🎯 Key Features

### Backend
✅ Auto-assign test cases to creator based on PAT  
✅ Pagination for large test case datasets  
✅ Filtered test case retrieval (My Test Cases Only)  
✅ Caching with 5-minute TTL  
✅ Azure DevOps REST API integration  

### Frontend
✅ Create test cases with parameterized steps  
✅ Settings modal for org/project/PAT configuration  
✅ Filter by "My Test Cases Only"  
✅ Lazy-load additional test cases (200 per page)  
✅ Intersection Observer for automatic loading  

### Data-Driven Testing
✅ Shared Parameters support  
✅ Parameterized test steps (@Username, @Password, etc.)  
✅ 10 comprehensive test scenarios  
✅ Multi-environment support (Staging, QA)  

## 🛠️ Getting Started

### Backend Setup
\\\ash
cd BOLTEST-Serverside
npm install
npm run dev
\\\
Server runs on http://localhost:5000

### Frontend Setup
\\\ash
cd Boltest-Frontside
npm install
npm start
\\\
Frontend runs on http://localhost:3000

## 📖 Documentation

### Data-Driven Testing
See: \BOLTEST-Serverside/INDEX.md\ for complete data-driven test setup guide

Key files:
- \SHARED_PARAMETERS_LINKING_GUIDE.md\ - Detailed UI setup
- \EXECUTION_CHECKLIST.md\ - Pre/during/post-run validation
- \QUICK_REF_CARD.md\ - One-page quick reference

### Auto-Assignment Feature
See: \BOLTEST-Serverside/AUTO_ASSIGN_TESTCASE_IMPLEMENTATION.md\

## 🔐 Configuration

### Environment Variables (Backend)
Create \.env\ in BOLTEST-Serverside:
\\\
AZDO_ORG_URL=https://your-org-url
AZDO_PROJECT=YourProject
AZDO_PAT=your-personal-access-token
AUTH_MODE=PAT
\\\

### Credentials (Frontend)
Use Settings Modal in the UI to store:
- Organization URL
- Project Name
- Personal Access Token (PAT)

Stored in localStorage as:
- \oltest:orgUrl\
- \oltest:project\
- \oltest:pat\

## 🧪 Testing

### Run Backend Tests
\\\ash
cd BOLTEST-Serverside
npm test
\\\

### Run Frontend Tests
\\\ash
cd Boltest-Frontside
npm test
\\\

## 📊 Test Case Artifacts

Generated templates in BOLTEST-Serverside/:
- \SP_LoginData_Bolt.csv\ - 10 test data rows
- \TC_Login_DataDriven_Bolt_Steps.md\ - Test case template
- \SharedParameterSchema.json\ - Shared parameter schema
- \Create-SharedParametersAndTestCase.ps1\ - PowerShell automation

## 🚀 Deployment

### Azure Functions (Optional)
Azure Functions infrastructure included for serverless deployment

Run: \.\Deploy-AzureFunctions.ps1\

### Docker (Optional)
Build Docker images for both backend and frontend

## 📝 Git Workflow

### Initial Commit
\\\ash
git add .
git commit -m "Initial commit: BOLT test automation platform"
\\\

### Push to Remote
\\\ash
git remote add origin <your-repo-url>
git push -u origin main
\\\

## 📞 Support

### Common Issues

**Backend won't start on port 5000**
- Check if port is in use: \
etstat -ano | findstr :5000\
- Kill process: \	askkill /PID <PID> /F\

**Frontend can't connect to backend**
- Verify backend is running on http://localhost:5000
- Check CORS settings in backend

**PAT not recognized**
- Verify PAT in settings modal
- Check PAT has necessary permissions in Azure DevOps

## 🔄 Recent Updates

### Auto-Assign Feature (Jan 4, 2026)
- Modified \createOrFindTestCase\ to auto-assign to creator
- Updated service layer to pass PAT and assignedTo fields
- Test cases now automatically assigned to user from PAT token

### Data-Driven Testing (Jan 4, 2026)
- Complete setup package with 11 documentation files
- 10 comprehensive test scenarios
- Shared Parameters integration
- Execution checklist and troubleshooting guides

### Pagination & Filtering (Previous)
- Implemented cursor-based WIQL pagination
- Added "My Test Cases Only" filter toggle
- Lazy-loading with Intersection Observer
- 5-minute TTL caching

## 📄 License

Internal BOLT Solutions Project

## 👥 Contributors

BOLT QA & Development Team

---

**Repository**: BOLTESTTOOLPROD  
**Created**: January 4, 2026  
**Status**: Production Ready ✅
