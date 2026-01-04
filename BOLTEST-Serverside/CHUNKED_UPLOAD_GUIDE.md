# Attachments - Chunked Upload Implementation

## Overview
Added support for Azure DevOps Attachments chunked upload capability. This allows uploading large files in multiple chunks rather than as single requests, improving reliability for large file transfers.

## Components Added

### 1. Service Method: `uploadAttachmentChunk()`
**File**: [services/attachmentService.js](../services/attachmentService.js)

```javascript
async uploadAttachmentChunk(id, chunk, opts = {})
```

**Parameters**:
- `id` (string): Attachment ID from a prior chunked upload start
- `chunk` (Buffer|Uint8Array|string): Binary chunk data
- `opts.contentRange` (string|object): Byte range specification
  - String format: `"bytes 0-39999/50000"`
  - Object format: `{ start: 0, end: 39999, total: 50000 }`
- `opts.fileName` (string, optional): Filename for the attachment

**Returns**: `Promise<{ id, url }>` - AttachmentReference

**HTTP Details**:
- Method: `PUT`
- Endpoint: `/{org}/{project}/_apis/wit/attachments/{id}`
- Required Header: `Content-Range: bytes {start}-{end}/{total}`
- Media Type: `application/octet-stream`
- API Version: `7.1`

**Features**:
- Flexible contentRange input (string or object)
- PAT authentication via Authorization header
- HTTPS agent support
- Comprehensive logging

---

### 2. API Routes
**File**: [src/routes/attachments.js](../src/routes/attachments.js)

#### POST `/api/attachments/chunked/start`
Initiates a chunked upload session.

**Request**:
```bash
POST /api/attachments/chunked/start
Headers:
  x-orgurl: https://dev.azure.com/myorg
  x-project: MyProject
  x-pat: <pat-token>
Body: { fileSize: 50000, fileName: "document.pdf" }
```

**Response**:
```json
{
  "success": true,
  "id": "de471719-27b2-40ab-ac40-4890f3eb1443",
  "url": "https://dev.azure.com/myorg/_apis/wit/attachments/..."
}
```

#### PUT `/api/attachments/chunked/:id`
Uploads a chunk to an active session.

**Request**:
```bash
PUT /api/attachments/chunked/de471719-27b2-40ab-ac40-4890f3eb1443
Headers:
  x-orgurl: https://dev.azure.com/myorg
  x-project: MyProject
  x-pat: <pat-token>
  Content-Range: bytes 0-39999/50000
  Content-Type: application/octet-stream
Body: <40KB binary data>
```

**Response**:
```json
{
  "success": true,
  "id": "de471719-27b2-40ab-ac40-4890f3eb1443",
  "url": "https://dev.azure.com/myorg/_apis/wit/attachments/..."
}
```

---

### 3. Integration Tests
**File**: [tests/attachmentChunk.integration.test.js](../tests/attachmentChunk.integration.test.js)

**Test Coverage**:
- ✅ Input validation (missing id, contentRange)
- ✅ ContentRange format (string vs object)
- ✅ Header construction
- ✅ fileName parameter handling
- ✅ Multi-chunk workflow scenarios
- ✅ Edge cases (large files, single-byte chunks, last byte)

**Run Tests**:
```bash
npm test -- tests/attachmentChunk.integration.test.js
```

---

## Usage Workflow

### Step 1: Start Chunked Upload
```javascript
// POST /api/attachments/chunked/start
const startResponse = await fetch('/api/attachments/chunked/start', {
  method: 'POST',
  headers: {
    'x-orgurl': 'https://dev.azure.com/myorg',
    'x-project': 'MyProject',
    'x-pat': 'your-pat-token'
  },
  body: JSON.stringify({
    fileSize: 50000000, // 50 MB
    fileName: 'large-file.zip'
  })
});
const { id } = await startResponse.json();
```

### Step 2: Upload Chunks
```javascript
const chunkSize = 1024 * 1024; // 1 MB chunks
const file = /* File object or Buffer */;

for (let start = 0; start < file.size; start += chunkSize) {
  const end = Math.min(start + chunkSize - 1, file.size - 1);
  const chunk = file.slice(start, end + 1);
  
  const chunkResponse = await fetch(`/api/attachments/chunked/${id}`, {
    method: 'PUT',
    headers: {
      'x-orgurl': 'https://dev.azure.com/myorg',
      'x-project': 'MyProject',
      'x-pat': 'your-pat-token',
      'Content-Range': `bytes ${start}-${end}/${file.size}`,
      'Content-Type': 'application/octet-stream'
    },
    body: chunk
  });
  
  console.log(`Uploaded chunk ${start}-${end}/${file.size}`);
}
```

---

## Azure DevOps API Documentation
- **Service**: Work Item Tracking
- **Operation**: Upload Attachment Chunk
- **Endpoint**: `PUT https://dev.azure.com/{organization}/{project}/_apis/wit/attachments/{id}?api-version=7.1`
- **Reference**: Azure DevOps REST API v7.1

---

## Error Handling

### Client Errors
| Status | Message | Resolution |
|--------|---------|-----------|
| 400 | Missing id | Include attachment ID in URL path |
| 400 | Missing Content-Range header | Add `Content-Range: bytes X-Y/Z` |
| 400 | Invalid contentRange format | Use `"bytes 0-999/5000"` or `{start,end,total}` |

### Server Errors
| Status | Cause | Action |
|--------|-------|--------|
| 401 | Invalid PAT token | Verify AZDO_PAT environment variable |
| 403 | Insufficient permissions | Ensure PAT has `vso.work_write` scope |
| 404 | Attachment ID not found | Check that chunked upload was started |
| 500 | Azure DevOps API error | Check network/API status |

---

## Configuration

**Environment Variables** (Optional, can be overridden by headers):
```env
AZDO_ORG_URL=https://dev.azure.com/myorg
AZDO_PROJECT=MyProject
AZDO_PAT=<personal-access-token>
```

**Request Headers** (Override environment):
```
x-orgurl: <organization-url>
x-project: <project-name>
x-pat: <pat-token>
```

---

## Notes

1. **Chunked Upload Session**: Each `POST /chunked/start` creates a new session. The returned `id` is unique and must be used for subsequent chunk uploads.

2. **Content-Range Format**: Azure DevOps requires the exact format: `bytes {start}-{end}/{total}` where:
   - `start`: 0-based byte offset of chunk start
   - `end`: 0-based byte offset of chunk end (inclusive)
   - `total`: Total file size in bytes

3. **Chunk Size**: No specific limit enforced by the API, but typical chunk sizes are 1-100 MB for balance between memory and network efficiency.

4. **Resume Support**: Azure DevOps API supports resuming uploads. Query the attachment status if a chunk fails.

5. **Order**: Chunks can typically be uploaded in any order, but sequential upload is more efficient.

---

## Related Services
- `uploadAttachment()` - Simple single-request upload
- `getAttachment()` - Download attachment by ID
- `recentActivityService` - Track attachment activity
- `artifactLinkTypesService` - Link attachments to work items
