#!/usr/bin/env powershell
<#
.SYNOPSIS
    BOLTEST Azure Functions Deployment Script
.DESCRIPTION
    Automates the deployment of all 4 Azure Functions scenarios to Azure
.PARAMETER Environment
    Deployment environment: dev, test, or prod
.PARAMETER ResourceGroup
    Azure resource group name
.PARAMETER Location
    Azure region: eastus, westus, northeurope, etc.
.EXAMPLE
    .\Deploy-AzureFunctions.ps1 -Environment prod -ResourceGroup boltest-prod -Location eastus
#>

param(
    [string]$Environment = "dev",
    [string]$ResourceGroup = "boltest-$Environment",
    [string]$Location = "eastus",
    [string]$FunctionAppName = "boltest-$Environment",
    [string]$StorageAccountName = "boltest$Environment",
    [string]$CosmosDbAccountName = "boltest-$Environment"
)

# Color output functions
function Write-Header {
    param([string]$Message)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# Main deployment
try {
    Write-Header "BOLTEST Azure Functions Deployment"
    
    # Check prerequisites
    Write-Host "Checking prerequisites..."
    $azCli = az --version 2>$null
    if (-not $azCli) {
        Write-Error "Azure CLI not found. Install from: https://aka.ms/azcli"
        exit 1
    }
    Write-Success "Azure CLI installed"

    # Login to Azure
    Write-Host "Logging into Azure..."
    $account = az account show 2>$null
    if (-not $account) {
        az login
    }
    $currentAccount = (az account show --query "name" -o tsv)
    Write-Success "Logged in as: $currentAccount"

    # Create resource group
    Write-Header "Creating Resource Group"
    Write-Host "Resource Group: $ResourceGroup"
    Write-Host "Location: $Location"
    az group create `
        --name $ResourceGroup `
        --location $Location
    Write-Success "Resource group created/updated"

    # Create storage account
    Write-Header "Creating Storage Account"
    az storage account create `
        --name $StorageAccountName `
        --resource-group $ResourceGroup `
        --location $Location `
        --sku Standard_LRS `
        --kind StorageV2
    Write-Success "Storage account created/updated"

    $storageConnStr = az storage account show-connection-string `
        --name $StorageAccountName `
        --resource-group $ResourceGroup `
        --query "connectionString" -o tsv
    Write-Success "Storage connection string retrieved"

    # Create uploads container
    Write-Host "Creating 'uploads' blob container..."
    az storage container create `
        --name uploads `
        --account-name $StorageAccountName
    Write-Success "Blob container created"

    # Create Cosmos DB account
    Write-Header "Creating Cosmos DB Account"
    Write-Host "This may take 3-5 minutes..."
    
    # Check if account exists
    $cosmosExists = az cosmosdb show `
        --name $CosmosDbAccountName `
        --resource-group $ResourceGroup 2>$null

    if (-not $cosmosExists) {
        az cosmosdb create `
            --name $CosmosDbAccountName `
            --resource-group $ResourceGroup `
            --kind GlobalDocumentDB `
            --default-consistency-level Session `
            --locations regionName=$Location failoverPriority=0
        Write-Success "Cosmos DB account created"
    } else {
        Write-Warning "Cosmos DB account already exists"
    }

    # Create Cosmos DB database
    Write-Host "Creating 'boltest' database..."
    az cosmosdb sql database create `
        --account-name $CosmosDbAccountName `
        --resource-group $ResourceGroup `
        --name boltest 2>$null
    Write-Success "Cosmos DB database created"

    # Create collections
    $collections = @("testData", "attachments", "syncLogs", "auditLog", "leases")
    foreach ($collection in $collections) {
        Write-Host "Creating collection: $collection..."
        az cosmosdb sql container create `
            --account-name $CosmosDbAccountName `
            --database-name boltest `
            --resource-group $ResourceGroup `
            --name $collection `
            --partition-key-path "/projectId" `
            --throughput 400 2>$null
    }
    Write-Success "Cosmos DB collections created"

    # Create Function App
    Write-Header "Creating Function App"
    az functionapp create `
        --name $FunctionAppName `
        --resource-group $ResourceGroup `
        --storage-account $StorageAccountName `
        --runtime node `
        --runtime-version 18 `
        --functions-version 4 `
        --os-type Windows `
        --consumption-plan-location $Location
    Write-Success "Function app created"

    # Configure app settings
    Write-Header "Configuring Application Settings"
    
    $cosmosConnStr = az cosmosdb keys list `
        --name $CosmosDbAccountName `
        --resource-group $ResourceGroup `
        --type connection-strings `
        --query "connectionStrings[0].connectionString" -o tsv

    az functionapp config appsettings set `
        --name $FunctionAppName `
        --resource-group $ResourceGroup `
        --settings `
        "BlobStorageConnection=$storageConnStr" `
        "CosmosDbConnection=$cosmosConnStr" `
        "AZDO_ORG_URL=https://azure.devops.boltx.us/tfs/BoltCollection" `
        "AZDO_PROJECT=Epos" `
        "AZDO_PAT=YOUR_AZURE_DEVOPS_PAT" `
        "FUNCTIONS_WORKER_RUNTIME=node" `
        "FUNCTIONS_EXTENSION_VERSION=~4"
    
    Write-Success "Application settings configured"
    Write-Warning "⚠️  UPDATE REQUIRED: Set AZDO_PAT in Azure Portal"

    # Display next steps
    Write-Header "Deployment Complete! Next Steps"
    Write-Host @"
1. Update Azure DevOps PAT:
   az functionapp config appsettings set `
     --name $FunctionAppName `
     --resource-group $ResourceGroup `
     --settings AZDO_PAT=<your-pat>

2. Deploy function code:
   func azure functionapp publish $FunctionAppName

3. Link Application Insights:
   az monitor app-insights component create `
     --app boltest-insights `
     --location $Location `
     --resource-group $ResourceGroup

4. Configure Service Bus (for notifications):
   az servicebus namespace create `
     --name boltest-$Environment `
     --resource-group $ResourceGroup `
     --location $Location `
     --sku Basic

5. Verify deployment:
   - Azure Portal > Function App > Functions
   - Check each scenario's trigger status
   - Review Application Insights logs

6. Monitor execution:
   - Timer Trigger: Check 'syncLogs' collection
   - Blob Trigger: Upload file to 'uploads' container
   - Cosmos DB Trigger: Modify document in 'testData'
   - HTTP Trigger: Access /api/health endpoint

Function App URL:
https://$FunctionAppName.azurewebsites.net

Resource Group: $ResourceGroup
Region: $Location

Documentation: AZURE_FUNCTIONS_SCENARIOS_1-4.md
"@

    Write-Success "Ready for deployment!"

} catch {
    Write-Error "Deployment failed: $_"
    exit 1
}
