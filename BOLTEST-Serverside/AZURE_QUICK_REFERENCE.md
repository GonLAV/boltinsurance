# BOLTEST Azure Functions - Quick Reference Card

## 📍 File Locations

```
Scenario 1 - HTTP Trigger (REST API)
  Implementation: src/functions/httpTrigger.js
  Config: src/functions/httpTrigger/function.json
  Routes: 7 existing route modules (no changes needed)

Scenario 2 - Blob Trigger (File Upload)
  Implementation: src/functions/blobTrigger.js
  Config: src/functions/blobTrigger/function.json
  Input: uploads/ blob container
  Output: testAttachmentDocument (Cosmos DB)

Scenario 3 - Timer Trigger (Scheduled Tasks)
  Implementation: src/functions/timerTrigger.js
  Config: src/functions/timerTrigger/function.json
  Schedule: 0 */6 * * * * (every 6 hours)
  Output: syncLog (Cosmos DB)

Scenario 4 - Cosmos DB Trigger (Change Feed)
  Implementation: src/functions/cosmosDbTrigger.js
  Config: src/functions/cosmosDbTrigger/function.json
  Input: testData collection changes
  Outputs: auditLog (Cosmos DB), testNotificationQueue (Service Bus)
```

---

## 🚀 Quick Start (60 Seconds)

### Development (Local)
```powershell
# Install tools
choco install azure-functions-core-tools-4

# Start functions
func start

# Test HTTP
curl http://localhost:7071/api/health
```

### Production (Azure)
```powershell
# Deploy script
.\Deploy-AzureFunctions.ps1 -Environment prod

# Deploy code
func azure functionapp publish boltest-prod
```

---

## 📊 Trigger Comparison

| Feature | HTTP | Blob | Timer | Cosmos DB |
|---------|------|------|-------|-----------|
| **Trigger Type** | REST API | File Upload | Schedule | DB Change |
| **Input** | HTTP Request | File | Clock | Document |
| **Output** | HTTP Response | Cosmos DB | Cosmos DB | Service Bus |
| **Use Case** | API calls | File processing | Data sync | Audit trail |
| **Frequency** | On demand | Per upload | Every 6h | Per change |
| **Execution Time** | 50-100ms | 1-5 min | 3-5 min | <100ms |

---

## 🔐 Configuration Checklist

**Local Development (local.settings.json):**
```json
✓ AzureWebJobsStorage
✓ FUNCTIONS_WORKER_RUNTIME: node
✓ BlobStorageConnection
✓ CosmosDbConnection
✓ ServiceBusConnection
✓ AZDO_ORG_URL
✓ AZDO_PROJECT
✓ AZDO_PAT
```

**Azure Portal (App Settings):**
```
✓ All connection strings from above
✓ APPINSIGHTS_INSTRUMENTATION_KEY
✓ FUNCTIONS_EXTENSION_VERSION: ~4
```

---

## 📈 Performance Expectations

```
HTTP Trigger:          50-100ms per request
Blob Trigger:          1-5 min per file
Timer Trigger:         3-5 min for all tasks
Cosmos DB Trigger:     <100ms per change
Auto-scale:            0-1000 concurrent
Cost:                  ~$0.20 per million
```

---

## 🎯 Testing Each Scenario

### Scenario 1 - HTTP Trigger
```powershell
# Health check
curl http://localhost:7071/api/health

# Login
Invoke-WebRequest -Uri "http://localhost:7071/api/auth/login" `
  -Method POST `
  -Body '{"username":"test","password":"test"}' `
  -ContentType "application/json"

# Get projects
curl http://localhost:7071/api/ado/projects
```

### Scenario 2 - Blob Trigger
```powershell
# Upload test file to Azure Storage
az storage blob upload `
  --account-name yourstorageaccount `
  --container-name uploads `
  --name test-cases.json `
  --file test-cases.json

# Check attachment metadata
# → Verify in Cosmos DB: testAttachmentDocument
```

### Scenario 3 - Timer Trigger
```powershell
# Monitor execution
# → Azure Portal > Function App > Monitor

# Check sync results
# → Cosmos DB: syncLogs collection
```

### Scenario 4 - Cosmos DB Trigger
```powershell
# Insert test document
# → Auto-creates audit entry

# Monitor change
# → Check auditLog collection
# → Check test-notifications queue
```

---

## 🔧 Common Configurations

### Change Timer Schedule
**File:** `src/functions/timerTrigger/function.json`
```javascript
schedule: "0 */6 * * * *"  // Current: every 6 hours

// Change to:
"0 */1 * * * *"     // Every minute
"0 0 * * * *"       // Every hour
"0 0 0 * * *"       // Daily at midnight
"0 0 9 * * 1-5"     // Weekdays at 9 AM
```

### Change Blob Processing
**File:** `src/functions/blobTrigger.js`
```javascript
const maxFileSize = 50 * 1024 * 1024;  // Change 50MB limit
const validExtensions = ['.xlsx', ...];  // Add/remove types
```

### Add More Azure DevOps Syncs
**File:** `src/functions/timerTrigger.js`
```javascript
// Add to runSynchronizationTasks()
const customFieldsResult = await syncCustomFields(logger);
results.push(customFieldsResult);
```

---

## 💡 Troubleshooting Quick Fixes

| Issue | Check | Solution |
|-------|-------|----------|
| Connection failed | Connection string | Update in local.settings.json |
| Blob not triggering | Container name | Must be "uploads" |
| Timer not running | Schedule format | Verify CRON syntax |
| Change feed missing | Lease collection | Create 'leases' collection |
| Function disabled | Portal status | Check Azure Portal |
| Slow response | Client init | Warm up with /health call |

---

## 📚 Key Files to Know

| File | Purpose | Lines |
|------|---------|-------|
| httpTrigger.js | REST API gateway | 410 |
| blobTrigger.js | File processing | 360 |
| timerTrigger.js | Scheduled tasks | 330 |
| cosmosDbTrigger.js | Change tracking | 340 |
| AZURE_FUNCTIONS_SCENARIOS_1-4.md | Full guide | 500+ |
| Deploy-AzureFunctions.ps1 | Auto-deploy | 200+ |
| local.settings.json | Dev config | 20 |
| host.json | Azure config | 15 |

---

## 🎓 Learning Path

1. **Understand the Architecture** (15 min)
   - Read: `IMPLEMENTATION_COMPLETE_SCENARIOS_1-4.md`
   - Overview of each scenario

2. **Review Implementation** (30 min)
   - Read function code comments
   - Understand binding configurations
   - Study error handling

3. **Local Testing** (20 min)
   - Follow "Quick Start" above
   - Test each scenario
   - Check Application Insights

4. **Deploy to Azure** (15 min)
   - Run Deploy script or manual steps
   - Configure connection strings
   - Verify all functions

5. **Monitor & Optimize** (ongoing)
   - Check Application Insights
   - Adjust schedules/thresholds
   - Monitor costs

---

## 🔗 Azure CLI Quick Commands

```powershell
# Create Function App
az functionapp create --name boltest-prod --resource-group boltest-prod `
  --storage-account boltest --runtime node --functions-version 4

# Deploy code
func azure functionapp publish boltest-prod

# View logs
az functionapp logs tail --name boltest-prod --resource-group boltest-prod

# Configure setting
az functionapp config appsettings set --name boltest-prod `
  --resource-group boltest-prod --settings KEY=VALUE

# Check function status
az function show --function-name httpTrigger --name boltest-prod `
  --resource-group boltest-prod
```

---

## 📞 Deployment Checklist

Before going live:

- [ ] All connection strings configured
- [ ] Azure DevOps PAT set
- [ ] Cosmos DB collections created
- [ ] Blob container "uploads" created
- [ ] Service Bus queue "test-notifications" created
- [ ] Application Insights linked
- [ ] Functions tested locally
- [ ] Functions deployed to Azure
- [ ] All functions "Enabled" in Portal
- [ ] Monitor tab showing invocations
- [ ] Load tested with expected traffic
- [ ] Alerts configured
- [ ] Documentation shared with team

---

## 📊 Cost Estimation

```
Monthly Cost Estimate (Production):

Storage Account:        $0.50
Cosmos DB (autopilot):  $25-50
Service Bus:            $10
Function App Premium:   $60
Application Insights:   $5
─────────────────────────────
TOTAL:                  ~$100-125/month

Per 1M Requests:
- Blob storage:         $0.004
- Function calls:       $0.20
- Cosmos DB (variable): ~$0.01-0.05
```

---

## 🎯 Success Indicators

✅ All scenarios are working when:
- HTTP Trigger: <100ms response times
- Blob Trigger: Metadata in Cosmos DB within 5 min
- Timer Trigger: Sync logs created on schedule
- Cosmos DB: Audit entries for every change
- No errors in Application Insights
- Auto-scaling activates during load
- All functions showing healthy status

---

## 📢 Team Communication

**Share with your team:**
1. `AZURE_FUNCTIONS_SCENARIOS_1-4.md` - Full documentation
2. `IMPLEMENTATION_COMPLETE_SCENARIOS_1-4.md` - Executive summary
3. This file - Quick reference
4. `Deploy-AzureFunctions.ps1` - Deployment script

**Training points:**
- Each scenario solves specific problem
- All scenarios work together seamlessly
- Backward compatible with Express.js
- Auto-scales based on load
- Cost-effective and secure

---

## 🚀 Next Action

**Choose your deployment method:**

**Option A: One-Command Deployment (Recommended)**
```powershell
.\Deploy-AzureFunctions.ps1 -Environment prod -Location eastus
```

**Option B: Step-by-Step Manual**
- Follow instructions in `AZURE_FUNCTIONS_SCENARIOS_1-4.md`
- Create resources manually
- Deploy code via `func deploy`

**Option C: Azure Portal**
- Create resources via Portal UI
- Deploy code via ZIP
- Configure settings in Portal

---

**Version:** 1.0  
**Last Updated:** December 25, 2025  
**Status:** 🟢 Production Ready
