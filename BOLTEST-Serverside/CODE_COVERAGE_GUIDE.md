# Code Coverage - Azure DevOps Integration

## Overview

Comprehensive support for Azure DevOps Code Coverage REST APIs. Enables programmatic retrieval and analysis of code coverage data from builds and test runs.

### Code Coverage Concepts

**Code Coverage**: Metrics that measure how much of the source code is executed during testing, including line coverage, block coverage, and function coverage.

**Module**: A compiled unit (DLL, assembly) containing code to be tested.

**Function Coverage**: Percentage of functions in a module that were executed during tests.

**Block Coverage**: Percentage of code blocks (statements) that were executed during tests.

**Coverage Statistics**: Detailed metrics including covered/uncovered lines, blocks, and partially covered lines.

---

## Service Details

- **Service**: Test
- **API Version**: `7.1`
- **Base URL**: `https://dev.azure.com/{organization}/{project}/_apis/test`
- **Authentication**: OAuth2 with appropriate scopes
- **Licensing**: Test Manager Extension with specific access levels required

---

## API Endpoints

### Code Coverage Operations

Code coverage endpoints provide detailed metrics about how thoroughly your code is tested, including statistics at the module, function, and block levels.

---

## 1. Get Build Code Coverage

Retrieve code coverage data for a specific build.

### HTTP Request
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/codecoverage?buildId={buildId}&flags={flags}&api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `buildId` | query | Yes | integer (int32) | ID of the build for which code coverage data is needed |
| `flags` | query | Yes | integer (int32) | Level of coverage details (see Flags section below) |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |

### Flags Parameter
The `flags` parameter is additive and controls the level of detail returned:

| Value | Description | Details Included |
|-------|-------------|------------------|
| `1` | Modules | Module names and statistics |
| `2` | Functions | Function-level coverage within modules |
| `4` | BlockData | Raw block coverage data (base64 encoded) |

**Common flag combinations**:
- `flags=1`: Module coverage only
- `flags=3`: Modules + Functions (`1 + 2`)
- `flags=5`: Modules + BlockData (`1 + 4`)
- `flags=7`: Modules + Functions + BlockData (`1 + 2 + 4`) - Full detail

### Response
- **Status Code**: `200 OK`
- **Body**: `BuildCoverage[]`

```json
{
  "value": [
    {
      "configuration": {
        "id": 51,
        "flavor": "Debug",
        "platform": "Any CPU",
        "uri": "vstfs:///Build/Build/363",
        "project": {
          "id": "project-id",
          "name": "Fabrikam-Fiber-TFVC"
        }
      },
      "state": "0",
      "lastError": "",
      "modules": [
        {
          "blockCount": 2,
          "blockData": "Aw==",
          "name": "fabrikamunittests.dll",
          "signature": "c27c5315-b4ec-3748-9751-2a20280c37d5",
          "signatureAge": 1,
          "statistics": {
            "blocksCovered": 2,
            "blocksNotCovered": 0,
            "linesCovered": 4,
            "linesNotCovered": 1,
            "linesPartiallyCovered": 0
          },
          "functions": []
        }
      ],
      "codeCoverageFileUrl": "https://dev.azure.com/fabrikam/Fabrikam-Fiber-TFVC/_api/_build/ItemContent?buildUri=vstfs%3A%2F%2F%2FBuild%2FBuild%2F363&path=%2FBuildCoverage%2FFabrikamUnitTests_20150609.2.Debug.Any%20CPU.51.coverage"
    }
  ],
  "count": 1
}
```

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test`

---

## 2. Get Test Run Code Coverage

Retrieve code coverage data for a specific test run.

### HTTP Request
```http
GET https://dev.azure.com/{organization}/{project}/_apis/test/Runs/{runId}/codecoverage?flags={flags}&api-version=7.1
```

### URI Parameters
| Name | In | Required | Type | Description |
|------|-------|----------|------|-------------|
| `organization` | path | Yes | string | The name of the Azure DevOps organization |
| `project` | path | Yes | string | Project ID or project name |
| `runId` | path | Yes | integer (int32) | ID of the test run for which code coverage data is needed |
| `flags` | query | Yes | integer (int32) | Level of coverage details (see Flags section below) |
| `api-version` | query | Yes | string | Version of the API (`7.1`) |

### Flags Parameter
Same as Build Code Coverage endpoint (see section 1 for details).

### Response
- **Status Code**: `200 OK`
- **Body**: `TestRunCoverage[]`

```json
{
  "value": [
    {
      "testRun": {
        "id": "51",
        "name": "buildguest@BUILD-0002 2015-06-09 10:32:28_Any CPU_Debug",
        "url": "https://dev.azure.com/fabrikam/Fabrikam-Fiber-TFVC/_apis/test/Runs/51"
      },
      "state": "0",
      "lastError": "",
      "modules": [
        {
          "blockCount": 2,
          "blockData": "Aw==",
          "name": "fabrikamunittests.dll",
          "signature": "c27c5315-b4ec-3748-9751-2a20280c37d5",
          "signatureAge": 1,
          "statistics": {
            "blocksCovered": 2,
            "blocksNotCovered": 0,
            "linesCovered": 4,
            "linesNotCovered": 1,
            "linesPartiallyCovered": 0
          },
          "functions": [
            {
              "class": "TestClass",
              "name": "TestMethod",
              "namespace": "FabrikamTests.UnitTests",
              "sourceFile": "TestClass.cs",
              "statistics": {
                "blocksCovered": 2,
                "blocksNotCovered": 0,
                "linesCovered": 4,
                "linesNotCovered": 0,
                "linesPartiallyCovered": 0
              }
            }
          ]
        }
      ]
    }
  ],
  "count": 1
}
```

### Authentication
- **Type**: OAuth2
- **Required Scope**: `vso.test`

---

## Object Schemas

### BuildConfiguration

Represents the configuration details of a build.

```json
{
  "id": 51,
  "buildDefinitionId": 10,
  "buildSystem": "TFSBuild",
  "creationDate": "2015-06-09T10:32:28Z",
  "flavor": "Debug",
  "number": "20150609.2",
  "platform": "Any CPU",
  "project": {
    "id": "project-id",
    "name": "Fabrikam-Fiber-TFVC",
    "url": "https://dev.azure.com/fabrikam/Fabrikam-Fiber-TFVC"
  },
  "repositoryGuid": "repo-guid",
  "repositoryType": "TFSGit",
  "sourceVersion": "commit-sha",
  "targetBranchName": "main",
  "uri": "vstfs:///Build/Build/363",
  "branchName": "main"
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `id` | integer (int32) | Unique configuration ID |
| `buildDefinitionId` | integer (int32) | ID of the build definition |
| `buildSystem` | string | Build system (TFSBuild, etc.) |
| `creationDate` | string (date-time) | When the build was created (ISO 8601) |
| `flavor` | string | Build flavor/configuration (Debug, Release) |
| `number` | string | Build number/identifier |
| `platform` | string | Build platform (Any CPU, x64, etc.) |
| `project` | ShallowReference | Associated project |
| `repositoryGuid` | string | Repository GUID |
| `repositoryType` | string | Repository type (TFSGit, GitHub, etc.) |
| `sourceVersion` | string | Source version (commit SHA) |
| `targetBranchName` | string | Target branch name |
| `uri` | string | Build URI |
| `branchName` | string | Source branch name |

---

### BuildCoverage

Complete code coverage details for a build.

```json
{
  "configuration": { /* BuildConfiguration */ },
  "state": "0",
  "lastError": "",
  "modules": [ /* ModuleCoverage[] */ ],
  "codeCoverageFileUrl": "https://dev.azure.com/..."
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `configuration` | BuildConfiguration | Build configuration details |
| `state` | string | Coverage state (0 = Success) |
| `lastError` | string | Error message if coverage failed |
| `modules` | ModuleCoverage[] | Array of module coverage data |
| `codeCoverageFileUrl` | string | URL to download coverage file |

---

### TestRunCoverage

Code coverage details for a test run.

```json
{
  "testRun": {
    "id": "51",
    "name": "Test Run Name",
    "url": "https://dev.azure.com/..."
  },
  "state": "0",
  "lastError": "",
  "modules": [ /* ModuleCoverage[] */ ]
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `testRun` | ShallowReference | Reference to the test run |
| `state` | string | Coverage state |
| `lastError` | string | Error message if coverage failed |
| `modules` | ModuleCoverage[] | Array of module coverage data |

---

### ModuleCoverage

Code coverage statistics for a compiled module (DLL, assembly).

```json
{
  "blockCount": 2,
  "blockData": "Aw==",
  "fileUrl": "https://dev.azure.com/...",
  "name": "fabrikamunittests.dll",
  "signature": "c27c5315-b4ec-3748-9751-2a20280c37d5",
  "signatureAge": 1,
  "statistics": {
    "blocksCovered": 2,
    "blocksNotCovered": 0,
    "linesCovered": 4,
    "linesNotCovered": 1,
    "linesPartiallyCovered": 0
  },
  "functions": [ /* FunctionCoverage[] */ ]
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `blockCount` | integer (int32) | Total number of code blocks |
| `blockData` | string[] (byte) | Base64 encoded block coverage data |
| `fileUrl` | string | URL to coverage file for this module |
| `name` | string | Module name (DLL/assembly filename) |
| `signature` | string (uuid) | Module signature/GUID |
| `signatureAge` | integer (int32) | Signature age/version |
| `statistics` | CoverageStatistics | Coverage metrics |
| `functions` | FunctionCoverage[] | Per-function coverage details |

---

### FunctionCoverage

Code coverage statistics for a specific function.

```json
{
  "class": "TestClass",
  "name": "TestMethod",
  "namespace": "FabrikamTests.UnitTests",
  "sourceFile": "TestClass.cs",
  "statistics": {
    "blocksCovered": 2,
    "blocksNotCovered": 0,
    "linesCovered": 4,
    "linesNotCovered": 0,
    "linesPartiallyCovered": 0
  }
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `class` | string | Class name containing the function |
| `name` | string | Function/method name |
| `namespace` | string | Namespace of the function |
| `sourceFile` | string | Source file containing the function |
| `statistics` | CoverageStatistics | Coverage metrics for the function |

---

### CoverageStatistics

Detailed coverage metrics.

```json
{
  "blocksCovered": 2,
  "blocksNotCovered": 0,
  "linesCovered": 4,
  "linesNotCovered": 1,
  "linesPartiallyCovered": 0
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `blocksCovered` | integer (int32) | Number of code blocks executed |
| `blocksNotCovered` | integer (int32) | Number of code blocks NOT executed |
| `linesCovered` | integer (int32) | Number of lines executed |
| `linesNotCovered` | integer (int32) | Number of lines NOT executed |
| `linesPartiallyCovered` | integer (int32) | Number of partially executed lines |

**Coverage Percentage Calculation**:
```
Line Coverage % = linesCovered / (linesCovered + linesNotCovered) * 100
Block Coverage % = blocksCovered / (blocksCovered + blocksNotCovered) * 100
```

---

### ShallowReference

An abstracted reference to another Azure DevOps resource.

```json
{
  "id": "51",
  "name": "Test Run Name",
  "url": "https://dev.azure.com/..."
}
```

**Properties**:
| Name | Type | Description |
|------|------|-------------|
| `id` | string | Resource ID |
| `name` | string | Resource name |
| `url` | string | Full URL to the resource |

---

## Common Workflows

### Workflow 1: Get Build Code Coverage (Module Level)

Retrieve coverage metrics at the module level for a build.

```bash
organization="fabrikam"
project="Fabrikam-Fiber-TFVC"
buildId=363
flags=1  # 1 = Modules only

curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/codecoverage?buildId=$buildId&flags=$flags&api-version=7.1" \
  -H "Authorization: Bearer $TOKEN"

# Response includes module-level statistics without function details
```

### Workflow 2: Get Complete Build Coverage (Module + Function + Block)

Retrieve the most detailed coverage information for a build.

```bash
organization="fabrikam"
project="Fabrikam-Fiber-TFVC"
buildId=363
flags=7  # 7 = Modules (1) + Functions (2) + BlockData (4)

curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/codecoverage?buildId=$buildId&flags=$flags&api-version=7.1" \
  -H "Authorization: Bearer $TOKEN"

# Response includes complete coverage details:
# - Module statistics
# - Per-function coverage
# - Raw block data (base64 encoded)
```

### Workflow 3: Get Test Run Coverage with Function Details

Retrieve coverage information from a test run including function-level details.

```bash
organization="fabrikam"
project="Fabrikam-Fiber-TFVC"
runId=51
flags=3  # 3 = Modules (1) + Functions (2)

curl -X GET "https://dev.azure.com/$organization/$project/_apis/test/Runs/$runId/codecoverage?flags=$flags&api-version=7.1" \
  -H "Authorization: Bearer $TOKEN"

# Response includes:
# - Module names and statistics
# - Functions within each module
# - Individual function coverage statistics
```

### Workflow 4: Calculate Coverage Percentages

Parse response and calculate coverage percentages.

```javascript
// Assuming response data in 'coverageData'
const buildCoverage = coverageData.value[0];

buildCoverage.modules.forEach(module => {
  const stats = module.statistics;
  
  const lineCoveragePercent = 
    (stats.linesCovered / (stats.linesCovered + stats.linesNotCovered)) * 100;
  
  const blockCoveragePercent = 
    (stats.blocksCovered / (stats.blocksCovered + stats.blocksNotCovered)) * 100;
  
  console.log(`Module: ${module.name}`);
  console.log(`Line Coverage: ${lineCoveragePercent.toFixed(2)}%`);
  console.log(`Block Coverage: ${blockCoveragePercent.toFixed(2)}%`);
});
```

### Workflow 5: Compare Build vs Test Run Coverage

Compare coverage metrics between a build and its test run.

```bash
# Get build coverage
buildCoverage=$(curl -s -X GET "https://dev.azure.com/fabrikam/Fabrikam/_apis/test/codecoverage?buildId=363&flags=1&api-version=7.1" \
  -H "Authorization: Bearer $TOKEN")

# Get test run coverage from build
testRunId=51
testRunCoverage=$(curl -s -X GET "https://dev.azure.com/fabrikam/Fabrikam/_apis/test/Runs/$testRunId/codecoverage?flags=1&api-version=7.1" \
  -H "Authorization: Bearer $TOKEN")

# Compare statistics from both responses
echo "Build Coverage: $(echo $buildCoverage | jq '.value[0].modules[0].statistics')"
echo "Test Run Coverage: $(echo $testRunCoverage | jq '.value[0].modules[0].statistics')"
```

---

## Flags Usage Guide

### Minimal Coverage (flags=1)
Use for quick overview of module-level metrics:
- Module names
- Module-level statistics (lines/blocks covered)
- Best for: High-level reports, trending analysis

```bash
flags=1
# Response size: Small
# Use case: Dashboard, quick status checks
```

### Detailed Coverage (flags=3)
Use for understanding function coverage:
- All module-level data
- Per-function coverage metrics
- Source file and namespace information
- Best for: Identifying uncovered functions, code review

```bash
flags=3
# Response size: Medium
# Use case: Detailed reports, code coverage analysis
```

### Maximum Detail (flags=7)
Use for comprehensive analysis or CI/CD integration:
- All module and function data
- Raw block-level coverage data (base64)
- Best for: Advanced analysis, coverage tools integration

```bash
flags=7
# Response size: Larger
# Use case: Integration with coverage tools, deep analysis
```

---

## State Values

The `state` field in coverage responses indicates the status:

| State | Meaning |
|-------|---------|
| `0` | Success - Coverage data is valid |
| `1` | Error - Check `lastError` field |
| Other | Processing/Unknown state |

---

## Authentication & Scopes

### OAuth2 Scopes

| Scope | Description | Operations |
|-------|-------------|------------|
| `vso.test` | Read test plans, cases, results and coverage data | All GET operations |

### Basic Authentication (Alternative)

For personal access tokens, use Basic authentication:

```bash
Authorization: Basic $(echo -n ":$PAT" | base64)
```

---

## Error Handling

### Common Status Codes

| Code | Description | Resolution |
|------|-------------|-----------|
| `200 OK` | Successful operation | Coverage data available |
| `400 Bad Request` | Invalid buildId, runId, or flags | Verify parameters are correct |
| `401 Unauthorized` | Authentication failed | Check token/credentials |
| `403 Forbidden` | Insufficient permissions | User needs vso.test scope |
| `404 Not Found` | Build/run not found | Verify buildId or runId exists |

### Error Response Example

```json
{
  "error": {
    "code": "ResourceNotFoundException",
    "message": "Build with id 999 not found"
  }
}
```

---

## Coverage Interpretation

### Line Coverage
Measures the percentage of source code lines executed during tests.
- **100% coverage**: All source lines executed
- **High coverage**: > 80%
- **Acceptable coverage**: 60-80%
- **Low coverage**: < 60%

### Block Coverage
Measures the percentage of code blocks (statements/instructions) executed.
- Generally higher than line coverage
- More granular than line coverage
- Useful for complex expressions

### Function Coverage
Measures the percentage of functions called during testing.
- Important for identifying untested functionality
- Can reveal dead code
- Helps prioritize testing efforts

---

## Licensing Requirements

- **Test Manager Extension**: Required for code coverage features
- **Build Pipeline**: Code coverage must be collected during build
- **Permissions**: User must have Read permission on the project

---

## Best Practices

1. **Collect Coverage Consistently**: Enable code coverage in all builds for trending
2. **Use Appropriate Flags**: Start with `flags=1`, upgrade to `flags=3` only when needed
3. **Monitor Trends**: Track coverage over time rather than absolute numbers
4. **Set Thresholds**: Define minimum acceptable coverage levels
5. **Function Analysis**: Use `flags=3` to identify untested functions
6. **Combine Metrics**: Use line, block, and function coverage together

---

## References

- [Microsoft Azure DevOps REST API - Code Coverage](https://learn.microsoft.com/en-us/rest/api/azure/devops/test/code-coverage)
- [Code Coverage Documentation](https://learn.microsoft.com/en-us/azure/devops/pipelines/test/codecoverage)
- [Build Code Coverage Best Practices](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/test/publish-code-coverage-results)
- [Azure DevOps REST API Version 7.1](https://learn.microsoft.com/en-us/rest/api/azure/devops)
- [Analyze Code Coverage](https://learn.microsoft.com/en-us/azure/devops/test/manual-test-tutorials)
