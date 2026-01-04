# Quick Reference - Classification Nodes

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `services/classificationNodeService.js` | 182 | Core service for areas/iterations |
| `src/routes/classificationNodes.js` | 227 | API endpoints |
| `tests/classificationNodes.integration.test.js` | 489 | Integration tests |
| `CLASSIFICATION_NODES_GUIDE.md` | 500+ | Full documentation |
| `IMPLEMENTATION_SUMMARY.md` | 350+ | Overview & examples |

---

## Core API Endpoints

### Create Area
```bash
POST /api/classificationnodes/areas
{ "name": "Engineering", "path": "" }
# 201 Created
```

### Create Iteration
```bash
POST /api/classificationnodes/iterations
{
  "name": "Sprint 1",
  "attributes": {
    "startDate": "2024-01-01T00:00:00Z",
    "finishDate": "2024-01-14T00:00:00Z"
  }
}
# 201 Created
```

### Move Area
```bash
POST /api/classificationnodes/areas/move
{ "id": 100, "newParentPath": "Parent/Child" }
# 200 OK
```

### Move Iteration
```bash
POST /api/classificationnodes/iterations/move
{ "id": 200, "newParentPath": "Parent" }
# 200 OK
```

### Update Iteration Dates
```bash
PUT /api/classificationnodes/iterations/200/attributes
{
  "attributes": {
    "startDate": "2024-02-01T00:00:00Z",
    "finishDate": "2024-02-14T00:00:00Z"
  }
}
# 200 OK
```

### Get Area
```bash
GET /api/classificationnodes/areas?path=Engineering&$depth=2
# 200 OK
# Returns: { id, name, structureType, hasChildren, path, children, ... }
```

### Get Iteration
```bash
GET /api/classificationnodes/iterations?path=Release-2024/Q1/Sprint-1
# 200 OK
# Returns: { id, name, structureType, hasChildren, path, attributes: { startDate, finishDate }, ... }
```

### Get Custom Node
```bash
GET /api/classificationnodes/custom/areas/Department/TeamA?$depth=3
# 200 OK
# Returns complete node structure with specified depth
```

### Delete Area
```bash
DELETE /api/classificationnodes/areas?path=Engineering&reclassifyId=50
# 204 No Content
```

### Delete Iteration
```bash
DELETE /api/classificationnodes/iterations?path=Sprint%201&reclassifyId=200
# 204 No Content
```

### Delete Custom Node
```bash
DELETE /api/classificationnodes/custom/areas/Parent/Child?$reclassifyId=100
# 204 No Content
```

---

## Service Methods

```javascript
// Create area
await service.createArea('Engineering', 'Department')

// Create iteration with dates
await service.createIteration('Sprint 1', {
  startDate: '2024-01-01T00:00:00Z',
  finishDate: '2024-01-14T00:00:00Z'
}, 'Release 1')

// Move node
await service.moveClassificationNode('areas', 100, 'NewParent')

// Update iteration dates
await service.updateIterationAttributes(200, {
  startDate: '2024-02-01T00:00:00Z',
  finishDate: '2024-02-14T00:00:00Z'
})

// Get area (with optional depth for children)
await service.getArea('Engineering', 2)

// Get iteration
await service.getIteration('Release-2024/Q1/Sprint-1')

// Get node with depth parameter
await service.getClassificationNode('areas', 'Department/Team', { depth: 3 })

// Delete area (leaf node)
await service.deleteArea('Archived')

// Delete area with children (requires reclassification)
await service.deleteArea('OldTeam', 50)

// Delete iteration
await service.deleteIteration('Sprint 1', 200)

// Delete generic node
await service.deleteClassificationNode('areas', 'Parent/Child', { reclassifyId: 100 })
```

---

## Required Headers

```
x-orgurl: https://dev.azure.com/myorg
x-project: MyProject
x-pat: <personal-access-token>
```

Or use environment variables:
```env
AZDO_ORG_URL=https://dev.azure.com/myorg
AZDO_PROJECT=MyProject
AZDO_PAT=<token>
```

---

## Response Structure

```json
{
  "success": true,
  "id": 100,
  "identifier": "uuid-string",
  "name": "Engineering",
  "structureType": "area",
  "hasChildren": false,
  "path": "\\org\\project\\Engineering",
  "url": "https://dev.azure.com/...",
  "_links": {
    "self": { "href": "..." },
    "parent": { "href": "..." }
  }
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 201 | Created |
| 200 | Updated/Moved |
| 204 | Deleted (No Content) |
| 400 | Invalid input |
| 401 | Auth failure |
| 403 | Permission denied |
| 404 | Not found |
| 409 | Conflict (node has children, missing reclassifyId) |
| 500 | Server error |

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "structureGroup must be..." | Invalid group | Use `areas` or `iterations` |
| "Area name is required" | Missing name | Provide `name` field |
| "Valid node id required" | Bad nodeId | Use positive integer |
| "newParentPath is required" | Missing path | Provide parent path |
| "Invalid startDate format" | Bad date | Use ISO 8601: `YYYY-MM-DDTHH:mm:ssZ` |
| "path is required" | Missing path (delete) | Provide node path |
| "Cannot delete node with children" (409) | No reclassifyId | Provide valid reclassifyId or delete leaf node |
| "Node not found" (404) | Path doesn't exist | Verify path and structureGroup |
| 403 Forbidden | Missing scope | PAT needs `vso.work_write` |

---

## Date Format

All dates use ISO 8601:
- `2024-01-01T00:00:00Z`
- `2024-12-31T23:59:59Z`
- Always include timezone `Z`

---

## Path Rules

- Root: empty string or omit
- Nested: `"Parent/Child"`
- Special chars: auto-encoded
- Max depth: unlimited
- Must be unique

---

## Data Types

```typescript
type TreeStructureGroup = "areas" | "iterations";
type TreeNodeStructureType = "area" | "iteration";

interface WorkItemClassificationNode {
  id: number;
  identifier: string;  // UUID
  name: string;
  structureType: TreeNodeStructureType;
  hasChildren: boolean;
  path: string;
  url: string;
  attributes?: {
    startDate?: string;   // ISO 8601
    finishDate?: string;  // ISO 8601
  };
  _links: { self: {href}; parent?: {href} };
}
```

---

## Testing

```bash
npm test -- tests/classificationNodes.integration.test.js
```

Covers 50+ test cases:
- ✅ Input validation
- ✅ Area/iteration CRUD
- ✅ Move operations
- ✅ Date updates
- ✅ Edge cases

---

## Integration Checklist

- [ ] Add to `src/server.js`: `app.use('/api/classificationnodes', require('./routes/classificationNodes'))`
- [ ] Set environment variables (AZDO_ORG_URL, AZDO_PROJECT, AZDO_PAT)
- [ ] Ensure PAT has `vso.work_write` scope
- [ ] Run tests: `npm test`
- [ ] Add frontend calls to new endpoints
- [ ] Integrate with test case workflow

---

## Examples

### Create Hierarchy
```javascript
const eng = await service.createArea('Engineering');
const web = await service.createArea('Web', 'Engineering');
const api = await service.createArea('API', 'Engineering/Web');
```

### Create Sprints
```javascript
const rel = await service.createIteration('Release 2024');
const s1 = await service.createIteration(
  'Sprint 1',
  {
    startDate: '2024-01-01T00:00:00Z',
    finishDate: '2024-01-14T00:00:00Z'
  },
  'Release 2024'
);
```

### Reorganize
```javascript
const moved = await service.moveClassificationNode('areas', 2, 'Engineering/Mobile');
```

### Update Dates
```javascript
const updated = await service.updateIterationAttributes(
  1,
  {
    startDate: '2024-02-01T00:00:00Z',
    finishDate: '2024-02-14T00:00:00Z'
  }
);
```

---

## Documentation Files

1. **Full Guide**: `CLASSIFICATION_NODES_GUIDE.md` - Complete API reference, workflows, error handling
2. **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md` - Overview, file structure, examples
3. **This File**: `QUICK_REFERENCE.md` - API endpoints, methods, common tasks

---

## Related Services

- `artifactLinkTypesService` - Link to work items
- `artifactUriQueryService` - Query by URI
- `attachmentService` - Manage files
- `recentActivityService` - Track changes
- `testCaseService` - Create test cases

---

## Azure DevOps API Info

- **Service**: Work Item Tracking
- **Operation**: Classification Nodes - Create Or Update
- **API Version**: 7.1
- **Endpoint**: `POST https://dev.azure.com/{org}/{project}/_apis/wit/classificationnodes/{structureGroup}/{path}`
- **Scope**: `vso.work_write`

---

## Support

For issues:
1. Check `CLASSIFICATION_NODES_GUIDE.md` troubleshooting section
2. Verify PAT token and scope
3. Confirm Azure DevOps access
4. Check date formats (ISO 8601)
5. Run tests to validate service
