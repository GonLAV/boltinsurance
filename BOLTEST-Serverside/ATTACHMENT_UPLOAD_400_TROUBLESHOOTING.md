# Attachment Upload 400 Error - Troubleshooting Guide

## Problem Summary

When uploading attachments to Azure DevOps/TFS via the REST API, the backend returns **HTTP 400 Bad Request**, while other API calls (like `/api/attachments/diagnose`) succeed.

---

## Root Cause Analysis

The **HTTP 400 error on attachment uploads** is almost always caused by one of these issues:

### 1. **Wrong Content-Type (Most Common)**
The TFS attachment upload endpoint **requires raw binary content**, not multipart form data.

- ❌ **WRONG**: `Content-Type: multipart/form-data` (FormData sent from browser)
- ✅ **CORRECT**: `Content-Type: application/octet-stream` (raw file bytes)

**Why it matters**: The `/_apis/wit/attachments` endpoint is **not** a generic file upload handler. It expects the request body to be the **exact file bytes** with an `application/octet-stream` header. Sending a multipart envelope (which is what FormData becomes) doesn't match this format, so the server rejects it with 400.

### 2. **Wrong API Version**
Your TFS Server may not support API version `7.1`. Newer API versions sometimes return 400 on older servers.

- **TFS Server 2019**: Use `api-version=5.0` or `5.1`
- **TFS Server 2022+**: Can use `6.0`, `6.1`, or higher
- **Azure DevOps Services (cloud)**: `7.0`, `7.1` or newer

### 3. **Wrong URL Shape**
For **TFS Server (on-premises)**, the URL format matters:

- ✅ **CORRECT** for Server: `https://server/tfs/Collection/Project/_apis/wit/attachments?...`
- ❌ **WRONG** for Server: `https://server/tfs/Collection/_apis/wit/attachments?...` (missing project)

The **project segment is required** on Server versions.

### 4. **Missing or Malformed Headers**
Even if binary is sent correctly, missing authentication headers or wrong encoding will fail.

- ✅ **CORRECT**: `Authorization: Basic base64(":PAT")`
- ❌ **WRONG**: `Authorization: Basic base64("user:PAT")` (user prefix not needed for PAT)

---

## Quick Diagnostic: Test with curl

Before debugging the frontend/backend integration, verify the endpoint works with a direct curl command:

### Step 1: Prepare Variables

```bash
# Your server details
ORG_URL="https://azure.devops.boltx.us/tfs/BoltCollection"
PROJECT="Epos"
PAT="<REDACTED_PAT>"
FILE_PATH="error_log.txt"  # a small test file
API_VERSION="5.1"

# Create Basic auth header (note: empty username before the colon)
BASIC=$(printf ":%s" "$PAT" | base64)
```

### Step 2: Upload Binary File

```bash
curl -X POST \
  -H "Authorization: Basic $BASIC" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@$FILE_PATH" \
  "$ORG_URL/$PROJECT/_apis/wit/attachments?fileName=$(basename $FILE_PATH)&api-version=$API_VERSION"
```

**Expected response (200 or 201)**:
```json
{
  "id": "12345678-abcd-ef01-2345-6789abcdef01",
  "url": "https://azure.devops.boltx.us/tfs/BoltCollection/Epos/_apis/wit/attachments/12345678-abcd-ef01-2345-6789abcdef01?fileName=error_log.txt"
}
```

**If you get 400**: The curl command itself fails, so it's **server-side config or URL format**, not the client.

**If curl succeeds but your app fails**: It's a **client-side issue** (FormData vs binary).

---

## Backend Implementation

### Correct Node.js/Express Approach

**Your current backend** (in `src/routes/attachments-sync.js`) already does this correctly:

```javascript
router.post('/', upload.single('file'), async (req, res) => {
  // ... header validation ...
  
  const service = getAttachmentSyncService(req);
  const fileBuffer = fs.readFileSync(req.file.path);  // ✅ Read as binary

  // uploadAttachmentToTFS sends this as raw bytes
  const result = await service.uploadAndLinkAttachment(fileBuffer, workItemId, opts);
  // ...
});
```

**Key points**:
1. ✅ Multer receives the file from `FormData` (on the backend)
2. ✅ Backend reads file as `Buffer` using `fs.readFileSync()`
3. ✅ Backend sends this **Buffer** (not the file object or FormData) to TFS
4. ✅ Header is set to `Content-Type: application/octet-stream`
5. ✅ Two-step flow: upload (Step 1) → link (Step 2)

---

## Frontend Implementation

### React/TypeScript Upload Handler

The **frontend** should send `FormData` **to your backend** (not directly to TFS):

```typescript
// src/features/testCases/services/attachmentApi.ts
export async function uploadAttachment(
  file: File,
  workItemId?: number,
  orgUrl?: string,
  pat?: string,
  project?: string
): Promise<UploadAttachmentResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);  // ✅ Browser FormData (sent to backend)
    if (workItemId) formData.append('workItemId', workItemId.toString());

    const response = await axios.post<UploadAttachmentResponse>(
      '/api/attachments',
      formData,  // ✅ Backend expects FormData
      {
        headers: {
          'Content-Type': 'multipart/form-data',  // ✅ Frontend → Backend
          ...(orgUrl && { 'x-orgurl': orgUrl }),
          ...(pat && { 'x-pat': pat }),
          ...(project && { 'x-project': project })
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('[ATTACH-API] Upload failed:', error);
    throw error;
  }
}
```

**Key differences**:
- **Frontend sends FormData to backend**: `Content-Type: multipart/form-data`
- **Backend extracts file and sends bytes to TFS**: `Content-Type: application/octet-stream`

---

## Configuration Checklist

### 1. Verify API Version

Check your **dotenv** file:

```plaintext
# For TFS Server 2019
AZDO_API_VERSION=5.1

# OR for TFS Server 2022+
AZDO_API_VERSION=6.0

# OR for Azure DevOps Services (cloud)
AZDO_API_VERSION=7.1
```

### 2. Verify URL Structure

In your logs, check the upload URL. It should match this pattern:

```text
https://azure.devops.boltx.us/tfs/BoltCollection/Epos/_apis/wit/attachments?fileName=...&api-version=5.1
                                  ^^^^^^^^^^^^^^  ^^^^  
                                  Collection      Project (both required for Server)
```

### 3. Verify Binary Upload

In **services/attachmentSyncService.js**, confirm:

```javascript
// Step 1: Upload binary
const response = await axios.post(url, fileBuffer, {  // ✅ fileBuffer, not FormData
  headers: {
    Authorization: this.authHeader,
    'Content-Type': 'application/octet-stream'  // ✅ Binary, not multipart
  },
  // ...
});
```

### 4. Verify Two-Step Flow

The complete flow should be:

```text
Browser FormData
     ↓
POST /api/attachments (backend)
     ↓
Multer saves file → fs.readFileSync() → Buffer
     ↓
POST /_apis/wit/attachments (TFS) with raw bytes
     ↓
TFS returns: { id, url }
     ↓
PATCH /workitems/{id} (TFS) with AttachedFile relation
     ↓
Success response to frontend
```

---

## Error Messages and Fixes

### `HTTP 400: Bad Request`

**Possible causes in order of likelihood**:

1. **Content-Type mismatch** (you're sending multipart instead of binary)
   - Fix: Ensure backend sends `application/octet-stream`, not `multipart/form-data` to TFS

2. **API version not supported**
   - Fix: Try `api-version=5.0` or `5.1` for older TFS servers

3. **URL missing project segment**
   - Fix: Ensure URL is `orgUrl/project/_apis/wit/attachments`, not `orgUrl/_apis/wit/attachments`

4. **Filename encoding issue**
   - Fix: Ensure `fileName` parameter is URL-encoded: `fileName=My%20File.txt`

### `HTTP 401: Unauthorized`

**Check**:
- PAT token is valid and not expired
- PAT is Base64-encoded correctly: `base64(":PAT")` (note the colon)
- Headers use exact format: `Authorization: Basic <base64>`

### `HTTP 403: Forbidden`

**Check**:
- PAT has **Work Items: Read & Write** scope (not just Read)
- User account has at least **Basic** access level in TFS

---

## Testing Sequence

### 1. Test Connectivity (No Upload)
```bash
curl -H "Authorization: Basic $BASIC" \
  "https://azure.devops.boltx.us/tfs/BoltCollection/_apis/projects?api-version=5.0"
# Should return 200 with projects list
```

### 2. Test Binary Upload via curl
```bash
curl -X POST \
  -H "Authorization: Basic $BASIC" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@test.txt" \
  "https://azure.devops.boltx.us/tfs/BoltCollection/Epos/_apis/wit/attachments?fileName=test.txt&api-version=5.1"
# Should return 200/201 with { id, url }
```

### 3. Test Backend Endpoint (with FormData)
```bash
curl -X POST \
  -F "file=@test.txt" \
  -F "workItemId=12345" \
  -H "x-orgurl: https://azure.devops.boltx.us/tfs/BoltCollection" \
  -H "x-pat: <REDACTED_PAT>" \
  -H "x-project: Epos" \
  "http://localhost:5000/api/attachments"
# Should return 200 with upload success
```

### 4. Test Frontend (via React)
After above tests pass, try uploading from the BOLTEST frontend UI.

---

## Environment Variables Quick Reference

### Backend (.env / dotenv)

```plaintext
# Attachment API Version (critical for 400 error fix)
AZDO_API_VERSION=5.1
```

### Frontend (.env.local or hardcoded)

```typescript
// No environment variable needed if using headers in request
// Backend handles AZDO_API_VERSION
```

---

## Key Takeaway

**The 400 error on TFS attachment uploads is almost always solved by**:

1. ✅ **Ensuring your backend sends raw bytes** (not FormData) to TFS
2. ✅ **Using `Content-Type: application/octet-stream`** (not multipart)
3. ✅ **Using correct API version** (5.1 for TFS Server 2019)
4. ✅ **Using correct URL format** (include project segment)

Your **current code already does #1 and #2 correctly**. Update **#3 and #4** via the configuration above, and the 400 should resolve.

---

## Next Steps

1. Add `AZDO_API_VERSION=5.1` to your **dotenv** file (done ✅)
2. Restart backend: `npm run dev`
3. Run curl test above (Step 2)
4. If curl succeeds: upload from frontend
5. If curl still fails: check URL and auth, post error output in debug mode

For questions or remaining errors, share the curl output and backend logs from `/uploads` or console.
