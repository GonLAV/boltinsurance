# Classification Nodes - CRUD Operations

## Overview
Complete support for Azure DevOps Classification Nodes (Areas and Iterations) with full CRUD operations: Create, Read (via search), Update, Move, and Delete. Enables programmatic management of project work item classification hierarchy.

## Components Added

### 1. Service: `classificationNodeService.js`
**File**: [services/classificationNodeService.js](../services/classificationNodeService.js)

#### Core Method: `createOrUpdateClassificationNode()`
```javascript
async createOrUpdateClassificationNode(structureGroup, path, payload, opts = {})
```

**Parameters**:
- `structureGroup` (string): `"areas"` or `"iterations"`
- `path` (string): Node path (e.g., `"Parent/Child"` or empty for root)
- `payload` (object):
  - `name` (string): Node name - for creating new nodes
  - `id` (integer): Node ID - for moving existing nodes
  - `attributes` (object, optional): For iterations - `{ startDate, finishDate }`
- `opts` (object, optional):
  - `overridePolicy` (boolean): Override date-related policies

**Returns**: `Promise<WorkItemClassificationNode>`

**HTTP Details**:
- Method: `POST`
- Endpoint: `/{org}/{project}/_apis/wit/classificationnodes/{structureGroup}/{path}`
- Required Header: `Content-Type: application/json`
- API Version: `7.1`
- Status Codes:
  - `201`: Node created
  - `200`: Node updated/moved

---

### 2. Helper Methods

#### `createArea(name, path)`
Create a new area node.

```javascript
const area = await service.createArea('Web', 'ProductTeam');
// Returns: { id, name: "Web", structureType: "area", ... }
```

#### `createIteration(name, attributes, path)`
Create a new iteration with optional date range.

```javascript
const iteration = await service.createIteration(
  'Sprint 1',
  {
    startDate: '2024-10-27T00:00:00Z',
    finishDate: '2024-10-31T00:00:00Z'
  },
  'Release 1'
);
```

#### `moveClassificationNode(structureGroup, nodeId, newParentPath)`
Move a node to a new parent in the hierarchy.

```javascript
const moved = await service.moveClassificationNode('areas', 126391, 'NewParent');
```

#### `updateIterationAttributes(nodeId, attributes, path)`
Update iteration dates.

```javascript
const updated = await service.updateIterationAttributes(
  126392,
  {
    startDate: '2024-01-01T00:00:00Z',
    finishDate: '2024-01-31T00:00:00Z'
  }
);
```

#### `deleteClassificationNode(structureGroup, path, opts)`
Delete a classification node with optional reclassification.

```javascript
// Delete without reclassification (leaf node)
await service.deleteClassificationNode('areas', 'Archived');

// Delete with reclassification (node with children)
await service.deleteClassificationNode('iterations', 'Old Sprint', { reclassifyId: 200 });
```

**Parameters**:
- `structureGroup` (string): `"areas"` or `"iterations"`
- `path` (string): Full path to node (e.g., `"Parent/Child"`)
- `opts` (object, optional):
  - `reclassifyId` (integer): ID of node to reclassify children to (required for non-leaf nodes)

**Returns**: `Promise<void>` (204 No Content response)

**HTTP Details**:
- Method: `DELETE`
- Endpoint: `/{org}/{project}/_apis/wit/classificationnodes/{structureGroup}/{path}?api-version=7.1&$reclassifyId={id}`
- Status Codes:
  - `204`: Node deleted successfully
  - `400`: Invalid path or missing required reclassifyId
  - `404`: Node not found
  - `409`: Conflict - node has children without reclassifyId

#### `deleteArea(path, reclassifyId)`
Delete an area node.

```javascript
const areaPath = 'Department/OldTeam';
await service.deleteArea(areaPath, 100); // Reclassify to area ID 100
```

#### `deleteIteration(path, reclassifyId)`
Delete an iteration node.

```javascript
const sprintPath = 'Release 1/Sprint 5';
await service.deleteIteration(sprintPath, 200); // Reclassify to iteration ID 200
```

#### `getClassificationNode(structureGroup, path, opts)`
Get a classification node with optional depth to fetch children.

```javascript
// Get root areas
const areas = await service.getClassificationNode('areas', '');

// Get specific area with 2 levels of children
const area = await service.getClassificationNode('areas', 'Engineering', { depth: 2 });

// Get iteration
const iteration = await service.getClassificationNode('iterations', 'Sprint 1');
```

**Parameters**:
- `structureGroup` (string): `"areas"` or `"iterations"`
- `path` (string): Node path (e.g., `"Parent/Child"` or empty for root)
- `opts` (object, optional):
  - `depth` (integer): Number of levels of children to fetch

**Returns**: `Promise<WorkItemClassificationNode>` - Node with id, name, path, hasChildren, attributes (for iterations), _links, url

#### `getArea(path, depth)`
Get an area node.

```javascript
const root = await service.getArea('');
const area = await service.getArea('Department/Team', 2);
```

#### `getIteration(path, depth)`
Get an iteration node.

```javascript
const iterations = await service.getIteration('Release 1');
const sprint = await service.getIteration('Release 1/Sprint 1', 1);
```

#### `getClassificationNodes(ids, opts)`
Get classification nodes by IDs or fetch root nodes when ids are not provided.

```javascript
// Get nodes by IDs with depth
const nodes = await service.getClassificationNodes([10, 20, 30], { depth: 2, errorPolicy: 'omit' });

// Get root classification nodes
const rootNodes = await service.getClassificationNodes();

// Get root with specified depth
const allNodes = await service.getClassificationNodes(null, { depth: 3 });
```

**Parameters**:
- `ids` (array|string|null): Node IDs to fetch
  - Array: `[1, 2, 3]`
  - String: `"1,2,3"` (comma-separated)
  - `null` or empty: Fetch root nodes
- `opts` (object, optional):
  - `depth` (integer): Number of levels of children to fetch (1+)
  - `errorPolicy` (string): `"fail"` (default) or `"omit"` - how to handle partial failures

**Returns**: `Promise<Object>` - Azure DevOps WorkItemClassificationNode(s) response

**HTTP Details**:
- Method: `GET`
- Endpoint: `/{org}/{project}/_apis/wit/classificationnodes?ids={ids}&$depth={depth}&errorPolicy={policy}`
- API Version: `7.1`

#### `getRootClassificationNodes(depth)`
Convenience wrapper to get root classification nodes (areas/iterations trees) with optional depth.

```javascript
// Get all root areas and iterations without children
const roots = await service.getRootClassificationNodes();

// Get root with 2 levels of children
const withChildren = await service.getRootClassificationNodes(2);
```

**Parameters**:
- `depth` (integer, optional): Number of levels of children to fetch (1+)

**Returns**: `Promise<Object>` - Root classification nodes response

#### `updateClassificationNode(structureGroup, path, payload)`
Update an existing classification node using PATCH (Azure DevOps Update endpoint).

```javascript
// Update area name
const updated = await service.updateClassificationNode('areas', 'Engineering', {
  name: 'Engineering-Renamed'
});

// Update iteration attributes
const updated = await service.updateClassificationNode('iterations', 'Release 1/Sprint 1', {
  attributes: {
    startDate: '2024-01-01T00:00:00Z',
    finishDate: '2024-01-31T00:00:00Z'
  }
});
```

**Parameters**:
- `structureGroup` (string): `"areas"` or `"iterations"`
- `path` (string): Node path (e.g., `"Parent/Child"` or empty for root)
- `payload` (object): Fields to update
  - `name` (string, optional): New node name
  - `attributes` (object, optional): For iterations - `{ startDate, finishDate }`

**Returns**: `Promise<WorkItemClassificationNode>` - Updated node

**HTTP Details**:
- Method: `PATCH`
- Endpoint: `/{org}/{project}/_apis/wit/classificationnodes/{structureGroup}/{path}`
- Required Header: `Content-Type: application/json`
- API Version: `7.1`
- Status Codes:
  - `200`: Node updated successfully
  - `400`: Invalid request body
  - `404`: Node not found
  - `409`: Conflict (e.g., duplicate name)

---

### 3. API Routes
**File**: [src/routes/classificationNodes.js](../src/routes/classificationNodes.js)

#### POST `/api/classificationnodes/areas`
Create a new area node.

**Request**:
```bash
POST /api/classificationnodes/areas
Headers:
  x-orgurl: https://dev.azure.com/fabrikam
  x-project: Fabrikam-Fiber-Git
  x-pat: <pat-token>
  Content-Type: application/json
Body: {
  "name": "Web",
  "path": "ProductTeam"  // optional, for nested creation
}
```

**Response** (201):
```json
{
  "success": true,
  "id": 126391,
  "identifier": "a5c68379-3258-4d62-971c-71c1c459336e",
  "name": "Web",
  "structureType": "area",
  "hasChildren": false,
  "path": "\\fabrikam\\Fabrikam-Fiber-Git\\ProductTeam\\Web",
  "url": "https://dev.azure.com/fabrikam/.../classificationNodes/Areas/ProductTeam/Web",
  "_links": { "self": {...}, "parent": {...} }
}
```

#### POST `/api/classificationnodes/iterations`
Create a new iteration with optional date range.

**Request**:
```bash
POST /api/classificationnodes/iterations
Headers:
  x-orgurl: https://dev.azure.com/fabrikam
  x-project: Fabrikam-Fiber-Git
  x-pat: <pat-token>
Body: {
  "name": "Final Iteration",
  "attributes": {
    "startDate": "2014-10-27T00:00:00Z",
    "finishDate": "2014-10-31T00:00:00Z"
  },
  "path": ""  // optional parent path
}
```

**Response** (201):
```json
{
  "success": true,
  "id": 126392,
  "identifier": "8dbed14a-c1b6-46e8-8540-8118c4ea29ae",
  "name": "Final Iteration",
  "structureType": "iteration",
  "hasChildren": false,
  "path": "\\fabrikam\\Fabrikam-Fiber-Git\\Final Iteration",
  "attributes": {
    "startDate": "2014-10-27T00:00:00Z",
    "finishDate": "2014-10-31T00:00:00Z"
  },
  "url": "https://dev.azure.com/fabrikam/.../classificationNodes/Iterations/Final%20Iteration"
}
```

#### POST `/api/classificationnodes/areas/move`
Move an area node to a new parent.

**Request**:
```bash
POST /api/classificationnodes/areas/move
Body: {
  "id": 126391,
  "newParentPath": "Parent Area"
}
```

**Response** (200):
```json
{
  "success": true,
  "id": 126391,
  "name": "Web",
  "path": "\\fabrikam\\Fabrikam-Fiber-Git\\Parent Area\\Web",
  ...
}
```

#### POST `/api/classificationnodes/iterations/move`
Move an iteration node to a new parent.

**Request**:
```bash
POST /api/classificationnodes/iterations/move
Body: {
  "id": 126392,
  "newParentPath": "Release 1"
}
```

**Response** (200): Updated iteration node

#### PUT `/api/classificationnodes/iterations/:id/attributes`
Update iteration start/finish dates.

**Request**:
```bash
PUT /api/classificationnodes/iterations/126392/attributes
Body: {
  "attributes": {
    "startDate": "2024-01-01T00:00:00Z",
    "finishDate": "2024-01-31T00:00:00Z"
  },
  "path": ""  // optional current node path
}
```

**Response** (200): Updated iteration with new attributes

#### PATCH `/api/classificationnodes/custom/:structureGroup/:path`
Update an existing classification node using PATCH (Azure DevOps Update endpoint).

**Reference**: [Microsoft Docs - Classification Nodes Update](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/classification-nodes/update?view=azure-devops-rest-7.1)

**Request**:
```bash
PATCH /api/classificationnodes/custom/areas/Engineering
Headers:
  x-orgurl: https://dev.azure.com/fabrikam
  x-project: Fabrikam-Fiber-Git
  x-pat: <pat-token>
  Content-Type: application/json
Body: {
  "name": "Engineering-Updated"
}
```

**Path Parameters**:
- `structureGroup`: `"areas"` or `"iterations"`
- `path`: Full node path (e.g., `"Parent/Child"` or empty for root)

**Request Body** (one or more fields):
- `name` (string, optional): New name for the node
- `attributes` (object, optional): For iterations - `{ startDate, finishDate }`
- `hasChildren` (boolean, optional): Update children visibility

**Response** (200): Updated WorkItemClassificationNode

**Example - Update Area Name**:
```bash
PATCH /api/classificationnodes/custom/areas/OldTeam
Body: { "name": "NewTeamName" }
```

**Example - Update Iteration Attributes**:
```bash
PATCH /api/classificationnodes/custom/iterations/Release%202024/Sprint%201
Body: {
  "attributes": {
    "startDate": "2024-01-01T00:00:00Z",
    "finishDate": "2024-01-31T00:00:00Z"
  }
}
```

**Example Response**:
```json
{
  "success": true,
  "id": 126391,
  "identifier": "a5c68379-3258-4d62-971c-71c1c459336e",
  "name": "Engineering-Updated",
  "structureType": "area",
  "hasChildren": true,
  "path": "\\fabrikam\\MyProject\\Engineering-Updated",
  "url": "https://dev.azure.com/fabrikam/.../classificationNodes/areas/Engineering-Updated"
}
```

**HTTP Details**:
- Method: `PATCH`
- Endpoint: `/{org}/{project}/_apis/wit/classificationnodes/{structureGroup}/{path}`
- Required Header: `Content-Type: application/json`
- API Version: `7.1`
- Status Codes:
  - `200`: Node updated successfully
  - `400`: Invalid request body or parameters
  - `404`: Node not found
  - `409`: Conflict (e.g., name already exists at this level)

#### GET `/api/classificationnodes`
Get classification nodes by IDs or fetch root classification nodes when IDs are not provided.

**Request**:
```bash
# Get root classification nodes
GET /api/classificationnodes
Headers:
  x-orgurl: https://dev.azure.com/fabrikam
  x-project: Fabrikam-Fiber-Git
  x-pat: <pat-token>
```

**Query Parameters**:
- `ids` (string, optional): Comma-separated node IDs (e.g., `"1,2,3"`)
- `$depth` (integer, optional): Number of levels of children to fetch (1+)
- `errorPolicy` (string, optional): `"fail"` (default) or `"omit"` - how to handle partial failures

**Example Requests**:

```bash
# Get root nodes (all areas and iterations)
GET /api/classificationnodes

# Get specific nodes by IDs
GET /api/classificationnodes?ids=126391,126392,126393

# Get nodes with depth
GET /api/classificationnodes?ids=126391&$depth=2

# Get root with error handling
GET /api/classificationnodes?$depth=2&errorPolicy=omit
```

**Response** (200): 

**For root nodes:**
```json
{
  "success": true,
  "data": {
    "id": "root",
    "name": "Classification Nodes",
    "hasChildren": true,
    "children": [
      {
        "id": 126391,
        "identifier": "a5c68379-3258-4d62-971c-71c1c459336e",
        "name": "Web",
        "structureType": "area",
        "hasChildren": false,
        "path": "\\fabrikam\\MyProject\\Web"
      },
      {
        "id": 126392,
        "identifier": "8dbed14a-c1b6-46e8-8540-8118c4ea29ae",
        "name": "Release 2024",
        "structureType": "iteration",
        "hasChildren": true,
        "path": "\\fabrikam\\MyProject\\Release 2024"
      }
    ]
  }
}
```

**For nodes by IDs:**
```json
{
  "success": true,
  "data": {
    "id": 126391,
    "identifier": "a5c68379-3258-4d62-971c-71c1c459336e",
    "name": "Web",
    "structureType": "area",
    "hasChildren": false,
    "path": "\\fabrikam\\MyProject\\Web",
    "url": "https://dev.azure.com/fabrikam/.../classificationNodes/areas/Web"
  }
}
```

**HTTP Details**:
- Method: `GET`
- Endpoint: `/{org}/{project}/_apis/wit/classificationnodes?ids={ids}&$depth={depth}&errorPolicy={policy}`
- API Version: `7.1`
- Status Codes:
  - `200`: Nodes retrieved successfully
  - `400`: Invalid IDs, depth, or errorPolicy
  - `401`: Unauthorized

#### DELETE `/api/classificationnodes/areas`
Delete an area node.

**Request**:
```bash
DELETE /api/classificationnodes/areas?path=Archived&reclassifyId=100
Headers:
  x-orgurl: https://dev.azure.com/fabrikam
  x-project: Fabrikam-Fiber-Git
  x-pat: <pat-token>
```

**Query Parameters**:
- `path` (required): Area path to delete
- `reclassifyId` (optional): Target area ID for work items currently assigned to deleted area

**Response** (204): No Content - deletion successful

#### DELETE `/api/classificationnodes/iterations`
Delete an iteration node.

**Request**:
```bash
DELETE /api/classificationnodes/iterations?path=Sprint%201&reclassifyId=200
Headers: [standard auth headers]
```

**Query Parameters**:
- `path` (required): Iteration path to delete
- `reclassifyId` (optional): Target iteration ID for work items currently in deleted iteration

**Response** (204): No Content - deletion successful

#### DELETE `/api/classificationnodes/custom/:structureGroup/:path`
Generic delete endpoint with full path support.

**Request**:
```bash
DELETE /api/classificationnodes/custom/areas/Parent/Child?$reclassifyId=100
Headers: [standard auth headers]
```

**Path Parameters**:
- `structureGroup`: `"areas"` or `"iterations"`
- `path`: Full node path (can contain slashes for nested paths)

**Query Parameters**:
- `$reclassifyId` (optional): Target node ID for reclassification

**Response** (204): No Content - deletion successful

#### GET `/api/classificationnodes/areas`
Get an area node with optional depth for children.

**Request**:
```bash
GET /api/classificationnodes/areas?path=Engineering&$depth=2
Headers:
  x-orgurl: https://dev.azure.com/fabrikam
  x-project: Fabrikam-Fiber-Git
  x-pat: <pat-token>
```

**Query Parameters**:
- `path` (optional): Area path to retrieve (empty for root)
- `$depth` (optional): Number of levels of children to fetch

**Response** (200): WorkItemClassificationNode with id, name, path, hasChildren, attributes, _links, url

#### GET `/api/classificationnodes/iterations`
Get an iteration node with optional depth for children.

**Request**:
```bash
GET /api/classificationnodes/iterations?path=Release%201/Sprint%201&$depth=1
Headers: [standard auth headers]
```

**Query Parameters**:
- `path` (optional): Iteration path to retrieve (empty for root)
- `$depth` (optional): Number of levels of children to fetch

**Response** (200): WorkItemClassificationNode with id, name, path, hasChildren, attributes (startDate, finishDate), _links, url

#### GET `/api/classificationnodes/custom/:structureGroup/:path`
Generic get endpoint with full path support.

**Request**:
```bash
GET /api/classificationnodes/custom/areas/Parent/Child?$depth=2
Headers: [standard auth headers]
```

**Path Parameters**:
- `structureGroup`: `"areas"` or `"iterations"`
- `path`: Full node path (can contain slashes for nested paths)

**Query Parameters**:
- `$depth` (optional): Number of levels of children to fetch

**Response** (200): WorkItemClassificationNode with complete node information

#### POST `/api/classificationnodes/custom/:structureGroup/:path`
Generic endpoint for complex operations.

**Request**:
```bash
POST /api/classificationnodes/custom/areas/Parent/Child
Headers: [standard auth headers]
Body: {
  "name": "New Area"
}
```

**Query Parameters**:
- `parentPath`: Override body path via query string
- `overridePolicy`: Force operation despite policy constraints

---

### 4. Integration Tests
**File**: [tests/classificationNodes.integration.test.js](../tests/classificationNodes.integration.test.js)

**Test Coverage**:
- ✅ Input validation (missing/invalid structureGroup, nodeId)
- ✅ Area creation at root and nested levels
- ✅ Iteration creation with/without dates
- ✅ Delete operations (areas and iterations)
- ✅ Reclassification handling (with/without)
- ✅ Path encoding and special characters
- ✅ Deep nesting support
- ✅ Date format validation (ISO 8601)
- ✅ Move operations (areas and iterations)
- ✅ Attribute updates for iterations
- ✅ Special characters in names and paths
- ✅ Deep nesting (Level1/Level2/.../LevelN)
- ✅ Response structure validation
- ✅ Edge cases (long names, boundary IDs)
- ✅ GET operations (retrieval by path, with optional depth)
- ✅ Get areas at root and nested levels
- ✅ Get iterations with date attributes
- ✅ Depth parameter support (children fetching)
- ✅ HTTP status codes for get operations (200, 400, 404, 401)
- ✅ Unicode and special characters in get operations
- ✅ Edge cases for get (long paths, deep nesting, unicode)

**Run Tests**:
```bash
npm test -- tests/classificationNodes.integration.test.js
```

---

## Usage Workflows

### Workflow 1: Create Area Hierarchy

```javascript
// Create root area
const productArea = await service.createArea('Products');
// Returns: { id: 1001, name: "Products", ... }

// Create child area under Products
const webArea = await service.createArea('Web', 'Products');
// Returns: { id: 1002, name: "Web", path: "\\...\\Products\\Web", ... }

// Create grandchild area
const backendArea = await service.createArea('Backend', 'Products/Web');
// Returns: { id: 1003, name: "Backend", path: "\\...\\Products\\Web\\Backend", ... }
```

### Workflow 2: Create Iteration with Dates

```javascript
// Create release
const release = await service.createIteration('Release 2024-Q1');
// Returns: { id: 2001, name: "Release 2024-Q1", ... }

// Create sprint under release with dates
const sprint = await service.createIteration(
  'Sprint 1',
  {
    startDate: '2024-01-01T00:00:00Z',
    finishDate: '2024-01-14T00:00:00Z'
  },
  'Release 2024-Q1'
);
```

### Workflow 3: Move Node to New Parent

```javascript
// Move area node
const moved = await service.moveClassificationNode(
  'areas',
  1002,  // node ID
  'Products/Web/New Location'
);

// Move iteration node
const movedIteration = await service.moveClassificationNode(
  'iterations',
  2001,
  'Release 2024-Q2'
);
```

### Workflow 4: Update Iteration Dates

```javascript
// Change sprint dates
const updated = await service.updateIterationAttributes(
  2002,  // node ID
  {
    startDate: '2024-01-15T00:00:00Z',
    finishDate: '2024-01-28T00:00:00Z'
  }
);
```

### Workflow 5: Delete Classification Nodes

```javascript
// Delete leaf area (no children)
await service.deleteArea('Archived-2023');

// Delete area with children - must reclassify
await service.deleteArea('OldTeam', 100); // Reclassify to area ID 100

// Delete iteration with reclassification
await service.deleteIteration('Sprint 1', 200); // Reclassify to iteration ID 200

// Bulk delete with error handling
const areasToDelete = ['Deprecated', 'Inactive', 'Legacy'];
for (const area of areasToDelete) {
  try {
    await service.deleteArea(area);
    console.log(`Deleted area: ${area}`);
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`Area has children: ${area}, provide reclassifyId`);
    }
  }
}
```

### Workflow 6: Get Classification Nodes

```javascript
// Get root areas with all children (depth 2 levels)
const allAreas = await service.getArea('', 2);
console.log(`Total areas: ${allAreas.hasChildren ? 'many' : 'none'}`);

// Get specific area
const engineeringArea = await service.getArea('Engineering');

// Get nested area with 3 levels of children
const teamArea = await service.getArea('Engineering/Backend/Platform', 3);

// Get iteration for sprint
const currentSprint = await service.getIteration('Release-2024/Q1/Sprint-5');
console.log(`Sprint: ${currentSprint.name}`);
if (currentSprint.attributes) {
  console.log(`Start: ${currentSprint.attributes.startDate}`);
  console.log(`End: ${currentSprint.attributes.finishDate}`);
}

// Get iterations with all sprints (depth 2)
const allReleases = await service.getIteration('', 2);

// Using custom method for both areas and iterations
const node = await service.getClassificationNode('areas', 'Department/TeamA', { depth: 1 });
console.log(`Node: ${node.name}, Has Children: ${node.hasChildren}`);

// Verify node exists and get current state
try {
  const team = await service.getArea('Engineering/Team-B');
  console.log('Team exists:', team.id);
} catch (error) {
  if (error.response?.status === 404) {
    console.log('Team does not exist');
  }
}
```

---

## GET Operations

### Service Methods

#### `getClassificationNode(structureGroup, path, opts)`

Retrieves a classification node by path with optional depth parameter.

**Parameters:**
- `structureGroup` (string): `"areas"` or `"iterations"`
- `path` (string): Full path to node, empty string for root (e.g., `"Parent/Child"`)
- `opts` (object, optional):
  - `depth` (number): Recursion depth for children (1-based integer, default none)

**Returns:** `Promise<WorkItemClassificationNode>`

**Example:**
```javascript
const area = await service.getClassificationNode('areas', 'Engineering', { depth: 2 });
```

**Response:**
```json
{
  "id": 123,
  "identifier": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Engineering",
  "structureType": "area",
  "hasChildren": true,
  "path": "\\MyProject\\Engineering",
  "url": "https://dev.azure.com/fabrikam/MyProject/_apis/wit/classificationnodes/areas/Engineering",
  "children": [
    {
      "id": 124,
      "identifier": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Backend",
      "structureType": "area",
      "hasChildren": false,
      "path": "\\MyProject\\Engineering\\Backend"
    }
  ],
  "_links": {
    "self": {
      "href": "https://dev.azure.com/fabrikam/MyProject/_apis/wit/classificationnodes/areas/Engineering"
    }
  }
}
```

#### `getArea(path, depth)`

Helper method to retrieve an area node.

**Parameters:**
- `path` (string): Area path (empty for root)
- `depth` (number, optional): Recursion depth for children

**Returns:** `Promise<WorkItemClassificationNode>`

**Example:**
```javascript
// Get Engineering/Backend area with 2 levels of children
const backend = await service.getArea('Engineering/Backend', 2);
```

#### `getIteration(path, depth)`

Helper method to retrieve an iteration node.

**Parameters:**
- `path` (string): Iteration path (empty for root)
- `depth` (number, optional): Recursion depth for children

**Returns:** `Promise<WorkItemClassificationNode>`

**Example:**
```javascript
// Get sprint details with start/end dates
const sprint = await service.getIteration('Release-2024/Q1/Sprint-1');
console.log('Start:', sprint.attributes?.startDate);
```

---

## GET API Endpoints

### GET /api/classificationnodes/areas

Retrieve area classification nodes.

**Query Parameters:**
- `path` (string, optional): Area path (empty for root)
- `$depth` (number, optional): Recursion depth (1+)

**Example Requests:**

```bash
# Get root areas
curl -H "Authorization: Basic {encoded_pat}" \
  "http://localhost:3000/api/classificationnodes/areas"

# Get specific area
curl -H "Authorization: Basic {encoded_pat}" \
  "http://localhost:3000/api/classificationnodes/areas?path=Engineering"

# Get area with 2 levels of children
curl -H "Authorization: Basic {encoded_pat}" \
  "http://localhost:3000/api/classificationnodes/areas?path=Engineering/Backend&$depth=2"
```

**Success Response (200 OK):**
```json
{
  "id": 123,
  "name": "Engineering",
  "structureType": "area",
  "hasChildren": true,
  "path": "\\MyProject\\Engineering",
  "children": [...]
}
```

**Error Responses:**
- `400 Bad Request`: Invalid path or depth parameter
- `404 Not Found`: Area does not exist
- `401 Unauthorized`: Invalid authentication

---

### GET /api/classificationnodes/iterations

Retrieve iteration classification nodes.

**Query Parameters:**
- `path` (string, optional): Iteration path (empty for root)
- `$depth` (number, optional): Recursion depth (1+)

**Example Requests:**

```bash
# Get all iterations
curl -H "Authorization: Basic {encoded_pat}" \
  "http://localhost:3000/api/classificationnodes/iterations"

# Get specific iteration with dates
curl -H "Authorization: Basic {encoded_pat}" \
  "http://localhost:3000/api/classificationnodes/iterations?path=Release-2024/Q1/Sprint-1"

# Get release with all sprints
curl -H "Authorization: Basic {encoded_pat}" \
  "http://localhost:3000/api/classificationnodes/iterations?path=Release-2024/Q1&$depth=2"
```

**Success Response (200 OK):**
```json
{
  "id": 456,
  "name": "Sprint-1",
  "structureType": "iteration",
  "hasChildren": false,
  "path": "\\MyProject\\Release-2024\\Q1\\Sprint-1",
  "attributes": {
    "startDate": "2024-03-04T00:00:00Z",
    "finishDate": "2024-03-18T00:00:00Z"
  }
}
```

---

### GET /api/classificationnodes/custom/:structureGroup/:path

Generic endpoint to retrieve any classification node.

**URL Parameters:**
- `structureGroup`: `"areas"` or `"iterations"`
- `path`: Full path to node (URL-encoded)

**Query Parameters:**
- `$depth` (number, optional): Recursion depth

**Example Requests:**

```bash
# Get area (structureGroup in URL)
curl -H "Authorization: Basic {encoded_pat}" \
  "http://localhost:3000/api/classificationnodes/custom/areas/Engineering/Backend"

# Get iteration with depth
curl -H "Authorization: Basic {encoded_pat}" \
  "http://localhost:3000/api/classificationnodes/custom/iterations/Release-2024/Q1?$depth=2"

# Get root (empty path)
curl -H "Authorization: Basic {encoded_pat}" \
  "http://localhost:3000/api/classificationnodes/custom/areas"
```

**Success Response (200 OK):**
```json
{
  "id": 789,
  "name": "Backend",
  "structureType": "area",
  "hasChildren": false,
  "path": "\\MyProject\\Engineering\\Backend"
}
```

---

## Configuration

**Environment Variables** (Optional, can be overridden by headers):
```env
AZDO_ORG_URL=https://dev.azure.com/fabrikam
AZDO_PROJECT=MyProject
AZDO_PAT=<personal-access-token>
```

**Request Headers** (Override environment):
```
x-orgurl: <organization-url>
x-project: <project-name>
x-pat: <pat-token>
```

**Required Scopes** (PAT):
- `vso.work_write` - Read/create/update work items and classification nodes

---

## Data Types

### WorkItemClassificationNode
```typescript
{
  id: number;                    // Unique integer ID
  identifier: string;            // UUID identifier
  name: string;                  // Node name
  structureType: 'area' | 'iteration';
  hasChildren: boolean;
  path: string;                  // Full path (e.g., "\\org\\project\\area")
  url: string;                   // Direct REST API URL
  attributes?: {                 // For iterations only
    startDate?: string;          // ISO 8601 format
    finishDate?: string;         // ISO 8601 format
  };
  children?: WorkItemClassificationNode[];
  _links: {
    self: { href: string };
    parent?: { href: string };
  };
}
```

### TreeStructureGroup Enum
```
"areas"      - Area classification nodes
"iterations" - Iteration/sprint classification nodes
```

### TreeNodeStructureType Enum
```
"area"      - Area node type
"iteration" - Iteration node type
```

---

## Error Handling

### Validation Errors (400)

| Condition | Message |
|-----------|---------|
| Invalid structureGroup | `structureGroup must be "areas" or "iterations"` |
| Missing area name | `Area name is required` |
| Missing iteration name | `Iteration name is required` |
| Invalid nodeId | `Valid node id (positive integer) is required` |
| Missing newParentPath | `newParentPath is required for moving nodes` |
| Invalid date format | `Invalid startDate format; use ISO 8601: YYYY-MM-DDTHH:mm:ssZ` |
| Missing attributes | `attributes object is required` |

### Authorization Errors (401/403)

| Status | Cause | Resolution |
|--------|-------|-----------|
| 401 | Invalid PAT | Verify `AZDO_PAT` or `x-pat` header |
| 403 | Insufficient permissions | Ensure PAT has `vso.work_write` scope |

### API Errors (4xx/5xx)

| Status | Cause |
|--------|-------|
| 404 | Parent node not found |
| 409 | Node already exists at target location |
| 500 | Azure DevOps API error |

---

## Examples

### Create Root Area
```javascript
const area = await service.createArea('Engineering');
// id: 100, name: "Engineering", path: "\\org\\proj\\Engineering"
```

### Create Nested Area
```javascript
const subArea = await service.createArea('Backend', 'Engineering');
// path: "\\org\\proj\\Engineering\\Backend"
```

### Create Sprint with Dates
```javascript
const sprint = await service.createIteration(
  'Sprint 42',
  {
    startDate: '2024-03-04T00:00:00Z',
    finishDate: '2024-03-17T00:00:00Z'
  },
  'Release 2024 H1'
);
```

### Move Area Under Different Parent
```javascript
// Move node 100 under "Department/TeamA"
const moved = await service.moveClassificationNode(
  'areas',
  100,
  'Department/TeamA'
);
```

### Update Sprint Dates
```javascript
// Extend sprint dates
const updated = await service.updateIterationAttributes(
  42,
  {
    startDate: '2024-03-04T00:00:00Z',
    finishDate: '2024-03-24T00:00:00Z'  // Extended by 1 week
  }
);
```

---

## Path Encoding Rules

- Paths are forward-slash delimited: `"Parent/Child/Grandchild"`
- Special characters are URL-encoded: `"Area & Ops"` → `"Area%20%26%20Ops"`
- Empty path = root level node
- Max path depth: No specific limit, but deep nesting affects performance

---

## Related Services

- `artifactLinkTypesService` - Link classification nodes to work items
- `artifactUriQueryService` - Query work items by classification
- `recentActivityService` - Track classification node changes
- `attachmentService` - Attach files to work items in areas/iterations

---

## Azure DevOps API Reference

- **Service**: Work Item Tracking
- **Operation**: Classification Nodes - Create Or Update
- **Endpoint**: `POST https://dev.azure.com/{org}/{project}/_apis/wit/classificationnodes/{structureGroup}/{path}?api-version=7.1`
- **API Version**: 7.1
- **Documentation**: [Azure DevOps REST API](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/classification-nodes/)

---

## Notes

1. **Creating vs Moving**: Use `name` field to create new node, use `id` field to move existing node
2. **Date Format**: Must be ISO 8601 format (`YYYY-MM-DDTHH:mm:ssZ`)
3. **Parent Must Exist**: Cannot create child of non-existent parent
4. **Path Uniqueness**: Each path must be unique within the structureGroup
5. **Status Codes**: Creation returns 201, move/update returns 200
6. **Attributes**: Only iterations support date attributes, areas do not

---

## Troubleshooting

**Issue**: "Parent node not found"
- **Cause**: Parent path doesn't exist
- **Solution**: Create parent area/iteration first

**Issue**: "Node with this name already exists"
- **Cause**: Duplicate name at same level
- **Solution**: Use different name or move to different parent

**Issue**: "Invalid iteration dates"
- **Cause**: Dates not in ISO 8601 format
- **Solution**: Use format `2024-12-31T23:59:59Z`

**Issue**: "403 Forbidden"
- **Cause**: PAT lacks `vso.work_write` scope
- **Solution**: Regenerate PAT with appropriate scope

**Issue**: "Cannot delete node with children" (409 Conflict)
- **Cause**: Node has child nodes but no reclassifyId provided
- **Solution**: Provide valid reclassifyId to reclassify children before deletion

**Issue**: "Node not found" (404)
- **Cause**: Path doesn't exist or is incorrect
- **Solution**: Verify path spelling and use correct structureGroup (areas vs iterations)

**Issue**: "Invalid reclassifyId"
- **Cause**: Provided target node ID doesn't exist or is not a valid classification node
- **Solution**: Use valid node ID from same structureGroup
