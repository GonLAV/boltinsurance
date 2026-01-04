# Two-Way Attachment Sync System

**Complete guide for bidirectional attachment synchronization between BolTest and Azure DevOps/TFS.**

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation & Setup](#installation--setup)
4. [Configuration](#configuration)
5. [API Reference](#api-reference)
6. [Webhook Setup](#webhook-setup)
7. [Usage Examples](#usage-examples)
8. [Troubleshooting](#troubleshooting)
9. [Performance & Scaling](#performance--scaling)

---

## Overview

The **Two-Way Attachment Sync System** automatically keeps attachments synchronized between:

- **Your Tool** (BolTest) → Upload & manage attachments
- **Azure DevOps / TFS** → Automatically link and track attachments in work items

### Key Features

✅ **Outbound Sync** (Tool → ADO)
- Single-file and chunked uploads
- Automatic attachment linking to work items
- Content deduplication (SHA-256)

✅ **Inbound Sync** (ADO → Tool)
- Webhook-based real-time notifications
- Automatic download of new attachments from ADO
- Metadata tracking and audit logging

✅ **Production-Ready**
- Exponential backoff retry logic
- Rate limiting & throttling
- Comprehensive event logging
- Database-backed state management
- Resumable chunked uploads

✅ **Deduplication**
- SHA-256 content hashing
- Prevent duplicate uploads
- Track attachment versions

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                  Your Tool (Frontend)                        │
│                   - React/TypeScript                         │
│                   - Upload UI                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│              Backend Services (Node.js)                       │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  TwoWayAttachmentSyncService                        │    │
│  │  - Upload (single/chunked)                          │    │
│  │  - Link to work items                               │    │
│  │  - Fetch from ADO                                   │    │
│  │  - Download attachments                             │    │
│  │  - Retry/dedup logic                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                         │                                      │
│  ┌────────────────────┬─┴──────────────────────────────┐    │
│  ▼                    ▼                                 ▼    │
│ Routes            Database               Webhook Receiver    │
│ /api/sync/*    attachment_sync.db    /api/webhooks/workitem │
└──────────────────────────────────────────────────────────────┘
         │                  │                      │
         ▼                  ▼                      ▼
    ┌───────────────────────────────────────────────────┐
    │  Azure DevOps / TFS                               │
    │  - Attachment Storage                             │
    │  - Work Item Relations                            │
    │  - Service Hooks                                  │
    └───────────────────────────────────────────────────┘
```

### Database Schema

**Key Tables:**
- `attachment_sync_metadata` - Core attachment tracking
- `chunked_upload_sessions` - Resumable upload state
- `sync_job_queue` - Async task queue
- `sync_event_log` - Audit trail
- `webhook_subscriptions` - Registered webhooks
- `deduplication_index` - Content hash tracking

**Views:**
- `v_attachment_sync_summary` - Sync status per work item

---

## Installation & Setup

### 1. Install Dependencies

```bash
cd BOLTEST-Serverside
npm install sqlite3 --save
```

### 2. Configure Environment

Copy `.env.attachmentSync` to your `.env` and customize:

```bash
# .env
ATTACHMENT_SYNC_DB_PATH=./data/attachment-sync.db
ATTACHMENT_SYNC_ENABLE=true
ATTACHMENT_STORAGE_PATH=./attachments
ATTACHMENT_WEBHOOK_SECRET=your-strong-random-secret-here
ATTACHMENT_WEBHOOK_URL=https://yourdomain.com/api/webhooks/workitem
ATTACHMENT_AUTO_SYNC_ON_WEBHOOK=true
```

### 3. Initialize in Express App

In your main `app.js` or `server.js`:

```javascript
const { initializeAttachmentSync } = require('./src/config/attachmentSyncInit');

// After Express setup, initialize sync system
async function startServer() {
  // ... other initialization ...

  // Initialize two-way attachment sync
  const syncSystem = await initializeAttachmentSync(app, {
    orgUrl: process.env.AZDO_ORG_URL,
    project: process.env.AZDO_PROJECT,
    pat: process.env.AZDO_PAT,
    logger: console
  });

  // Start server
  app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
}

startServer().catch(err => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
```

### 4. Create Storage Directory

```bash
mkdir -p ./attachments
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ATTACHMENT_SYNC_DB_PATH` | `./data/attachment-sync.db` | SQLite database location |
| `ATTACHMENT_SYNC_ENABLE` | `true` | Enable/disable sync system |
| `ATTACHMENT_STORAGE_PATH` | `./attachments` | Local attachment storage |
| `ATTACHMENT_CHUNK_SIZE` | `5242880` | Chunk size for large uploads (5MB) |
| `ATTACHMENT_MAX_FILE_SIZE` | `524288000` | Max file size (500MB) |
| `ATTACHMENT_UPLOAD_MAX_RETRIES` | `3` | Retry attempts for failed uploads |
| `ATTACHMENT_WEBHOOK_SECRET` | *required* | HMAC secret for webhook validation |
| `ATTACHMENT_WEBHOOK_URL` | *required* | Public URL of webhook endpoint |
| `ATTACHMENT_AUTO_SYNC_ON_WEBHOOK` | `true` | Auto-sync when ADO sends webhook |
| `ATTACHMENT_SYNC_API_VERSION` | (uses `AZDO_API_VERSION`) | ADO API version for sync ops |
| `ATTACHMENT_SYNC_LOG_LEVEL` | `info` | Log verbosity |
| `ATTACHMENT_SYNC_REQUEST_TIMEOUT` | `60000` | HTTP timeout (ms) |

---

## API Reference

### Upload Attachment

**POST** `/api/sync/upload`

Upload a new file and optionally start chunked upload.

```bash
curl -X POST http://localhost:5000/api/sync/upload \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "screenshot.png",
    "workItemId": 12345,
    "file": "base64-encoded-binary-data"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Attachment uploaded",
  "attachment": {
    "attachmentGuid": "550e8400-e29b-41d4-a716-446655440000",
    "attachmentUrl": "https://.../_apis/wit/attachments/550e8400...",
    "fileName": "screenshot.png",
    "isDuplicate": false
  }
}
```

### Link Attachment to Work Item

**POST** `/api/sync/link-attachment`

Create relation between uploaded attachment and work item.

```bash
curl -X POST http://localhost:5000/api/sync/link-attachment \
  -H "Content-Type: application/json" \
  -d '{
    "workItemId": 12345,
    "attachmentUrl": "https://.../_apis/wit/attachments/550e8400...",
    "fileName": "screenshot.png",
    "comment": "Additional info about this attachment"
  }'
```

### List Attachments

**GET** `/api/sync/attachments/:workItemId`

Get all attachments for a work item (local + ADO).

```bash
curl http://localhost:5000/api/sync/attachments/12345
```

**Response:**
```json
{
  "workItemId": 12345,
  "localAttachments": [
    {
      "id": 1,
      "attachment_guid": "550e8400-e29b-41d4-a716-446655440000",
      "file_name": "screenshot.png",
      "file_size": 25600,
      "source": "TOOL",
      "sync_status": "SYNCED",
      "created_at": "2025-12-29T10:30:00Z"
    }
  ],
  "adoAttachments": [
    {
      "guid": "550e8400-e29b-41d4-a716-446655440000",
      "name": "screenshot.png",
      "url": "https://.../_apis/wit/attachments/550e8400...",
      "comment": "Added by BolTest Sync"
    }
  ],
  "syncSummary": {
    "localCount": 1,
    "adoCount": 1,
    "syncedCount": 1,
    "pendingCount": 0
  }
}
```

### Force Sync Work Item

**POST** `/api/sync/force-sync/:workItemId`

Manually trigger full sync for a work item (both directions).

```bash
curl -X POST http://localhost:5000/api/sync/force-sync/12345
```

**Response:**
```json
{
  "success": true,
  "message": "Sync started for work item 12345",
  "status": "SYNCING"
}
```

### Get Sync Status

**GET** `/api/sync/status/:workItemId`

Check detailed sync status and recent activity.

```bash
curl http://localhost:5000/api/sync/status/12345
```

**Response:**
```json
{
  "workItemId": 12345,
  "summary": {
    "total_attachments": 3,
    "synced_count": 3,
    "pending_count": 0,
    "failed_count": 0,
    "total_size_bytes": 51200,
    "last_modified": "2025-12-29T10:30:00Z"
  },
  "recentJobs": [
    {
      "id": 1,
      "job_type": "UPLOAD",
      "status": "COMPLETED",
      "created_at": "2025-12-29T10:30:00Z",
      "completed_at": "2025-12-29T10:30:05Z"
    }
  ],
  "recentEvents": [...]
}
```

### Delete Attachment

**DELETE** `/api/sync/attachments/:attachmentGuid`

Soft-delete an attachment (marks as deleted, doesn't remove from ADO).

```bash
curl -X DELETE http://localhost:5000/api/sync/attachments/550e8400-e29b-41d4-a716-446655440000
```

### Download Attachment

**POST** `/api/sync/download/:attachmentGuid`

Download attachment from ADO and save locally.

```bash
curl -X POST http://localhost:5000/api/sync/download/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "screenshot.png",
    "workItemId": 12345
  }'
```

### Check Deduplication

**GET** `/api/sync/deduplication/:sha256`

Check if attachment with this SHA-256 hash already exists.

```bash
curl http://localhost:5000/api/sync/deduplication/abcd1234abcd1234...
```

**Response:**
```json
{
  "isDuplicate": true,
  "attachment": {
    "work_item_id": 12345,
    "attachment_guid": "550e8400-e29b-41d4-a716-446655440000",
    "file_name": "screenshot.png"
  }
}
```

### Upload Session Status

**GET** `/api/sync/upload-session/:sessionUuid`

Track progress of chunked upload.

```bash
curl http://localhost:5000/api/sync/upload-session/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "sessionUuid": "550e8400-e29b-41d4-a716-446655440000",
  "fileName": "large-video.mp4",
  "totalSize": 104857600,
  "totalChunks": 20,
  "chunksReceived": 15,
  "progress": "15/20",
  "percentComplete": 75
}
```

### Webhook Handler

**POST** `/api/webhooks/workitem`

Receives work item update events from Azure DevOps Service Hooks.

**Headers:**
```
Content-Type: application/json
x-webhook-signature: <HMAC-SHA256 of body>
```

**Payload** (from ADO):
```json
{
  "eventType": "workitem.updated",
  "resource": {
    "id": 12345,
    "rev": 5,
    "fields": { ... }
  },
  "...": "..."
}
```

---

## Webhook Setup

### Register Webhook in Azure DevOps

1. Go to your project settings: `https://dev.azure.com/yourorg/yourproject/_settings/`
2. Navigate to **Service Hooks**
3. Click **+ Create subscription**
4. Select event: **Work item updated** or **Work item created**
5. Configure filters:
   - Work item type: Select ones to monitor (Bug, TestCase, etc.)
6. Action: **Web Hooks**
7. Settings:
   - **URL**: `https://yourdomain.com/api/webhooks/workitem`
   - **Messages to send**: Select "Detailed"
   - **HTTP Headers**: Add custom header:
     ```
     x-webhook-signature: <use your ATTACHMENT_WEBHOOK_SECRET>
     ```

### Programmatic Webhook Creation

```javascript
const axios = require('axios');

async function createWebhook(orgUrl, project, pat) {
  const subscriptionUrl = `${orgUrl}/${project}/_apis/hooks/subscriptions?api-version=7.1`;
  
  const payload = {
    publisherId: 'tfs',
    eventType: 'workitem.updated',
    consumer: {
      consumerId: 'webHooks',
      consumerActionId: 'httpRequest'
    },
    consumerInputs: {
      url: 'https://yourdomain.com/api/webhooks/workitem',
      resourceDetailsToSend: 'all',
      messageFormat: 'json',
      detailedMessagesToSend: 'true'
    },
    scope: 'all',
    filters: [
      {
        type: 'Resource',
        value: 'project',
        excludedDefinitions: null
      }
    ]
  };

  try {
    const response = await axios.post(subscriptionUrl, payload, {
      auth: { username: '', password: pat }
    });
    
    console.log('Webhook created:', response.data.id);
    return response.data.id;
  } catch (err) {
    console.error('Webhook creation failed:', err.response?.data);
    throw err;
  }
}
```

---

## Usage Examples

### Example 1: Complete Upload & Link Flow

```javascript
const axios = require('axios');
const fs = require('fs');

async function uploadAndLinkAttachment(filePath, workItemId, baseUrl) {
  // 1. Read file
  const fileContent = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  // 2. Upload
  const uploadResp = await axios.post(`${baseUrl}/api/sync/upload`, {
    fileName,
    workItemId,
    file: fileContent.toString('base64')
  });

  const { attachmentGuid, attachmentUrl } = uploadResp.data.attachment;

  // 3. Link to work item
  const linkResp = await axios.post(`${baseUrl}/api/sync/link-attachment`, {
    workItemId,
    attachmentUrl,
    fileName,
    comment: 'Uploaded via BolTest sync'
  });

  console.log('✓ Attachment linked successfully');
  return { attachmentGuid, attachmentUrl };
}
```

### Example 2: Check Sync Status

```javascript
async function checkSyncStatus(workItemId, baseUrl) {
  const resp = await axios.get(`${baseUrl}/api/sync/status/${workItemId}`);
  
  const { summary, recentJobs, recentEvents } = resp.data;
  
  console.log('Sync Status for WI', workItemId);
  console.log('─────────────────────');
  console.log(`Total: ${summary.total_attachments}`);
  console.log(`Synced: ${summary.synced_count}`);
  console.log(`Pending: ${summary.pending_count}`);
  console.log(`Failed: ${summary.failed_count}`);
  console.log('');
  console.log('Recent Jobs:');
  recentJobs.forEach(job => {
    console.log(`  ${job.job_type}: ${job.status} (${job.created_at})`);
  });
}
```

### Example 3: Trigger Manual Sync

```javascript
async function forceSyncWorkItem(workItemId, baseUrl) {
  try {
    const resp = await axios.post(`${baseUrl}/api/sync/force-sync/${workItemId}`);
    console.log(resp.data.message);
    
    // Poll status
    let complete = false;
    while (!complete) {
      const statusResp = await axios.get(`${baseUrl}/api/sync/status/${workItemId}`);
      const { syncedCount, pendingCount, failedCount } = statusResp.data.summary;
      
      console.log(`Synced: ${syncedCount}, Pending: ${pendingCount}, Failed: ${failedCount}`);
      
      if (pendingCount === 0) complete = true;
      else await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log('✓ Sync complete');
  } catch (err) {
    console.error('Sync failed:', err.message);
  }
}
```

---

## Troubleshooting

### Issue: "Invalid webhook signature"

**Cause**: Signature validation failed.

**Solution:**
1. Verify `ATTACHMENT_WEBHOOK_SECRET` matches between ADO webhook config and your env
2. Ensure webhook is sending `x-webhook-signature` header
3. Check logs for HMAC mismatch

### Issue: Attachments upload but don't appear in ADO

**Cause**: Linking step failed.

**Troubleshoot:**
```javascript
// Check if attachment exists
const attachResp = await axios.get(`/api/sync/status/12345`);
console.log(attachResp.data.summary);

// Check events log
const events = attachResp.data.recentEvents;
events.forEach(e => {
  if (e.severity === 'ERROR') console.error(e.message);
});
```

### Issue: "Chunk upload session expired"

**Cause**: Upload took > 24 hours or was abandoned.

**Solution**: Restart upload (new session).

### Issue: Database "locked" error

**Cause**: Multiple processes accessing SQLite simultaneously.

**Solution**:
1. Ensure single Node.js process
2. Increase WAL timeout: `PRAGMA busy_timeout = 5000`
3. Consider upgrading to PostgreSQL for production

### Issue: Very large files (1GB+) timing out

**Cause**: Request timeout or network instability.

**Solution**:
1. Increase `ATTACHMENT_SYNC_REQUEST_TIMEOUT`
2. Reduce `ATTACHMENT_CHUNK_SIZE` to smaller chunks
3. Implement client-side retry with exponential backoff

---

## Performance & Scaling

### Database Optimization

For large-scale deployments (1000s of attachments):

1. **Switch to PostgreSQL** (vs SQLite)
   ```sql
   -- Create indexes
   CREATE INDEX idx_work_item_sync ON attachment_sync_metadata(work_item_id, sync_status);
   CREATE INDEX idx_sha256 ON deduplication_index(sha256_hash);
   CREATE INDEX idx_created_date ON sync_event_log(created_at DESC);
   ```

2. **Archive old events**
   ```sql
   DELETE FROM sync_event_log WHERE created_at < NOW() - INTERVAL '90 days';
   ```

### Upload Tuning

- **Small files (< 5MB)**: Use single upload
- **Medium files (5-100MB)**: Use 5-10MB chunks
- **Large files (> 100MB)**: Use 10-20MB chunks, increase `maxRetries`

### Retry Strategy

Customize backoff:
```javascript
const syncService = new TwoWayAttachmentSyncService(
  orgUrl, project, pat, db,
  {
    maxRetries: 5,
    retryBackoffMs: 2000,  // Start at 2s, doubles each retry
    // Will retry at: 2s, 4s, 8s, 16s, 32s
  }
);
```

### Rate Limiting

ADO API limits (typical):
- **500 requests/minute** for Services
- **Adjust** `ATTACHMENT_SYNC_RATE_LIMIT_RPM` accordingly

### Monitoring

Query stats regularly:
```javascript
const stats = await dbManager.getSyncStats();
console.log(`
  Total: ${stats.total_attachments}
  Synced: ${stats.synced}
  Pending: ${stats.pending}
  Failed: ${stats.failed}
  Size: ${(stats.total_size_bytes / 1024 / 1024).toFixed(2)}MB
`);
```

---

## Support & Contributions

For issues or questions:
1. Check troubleshooting section above
2. Review database event logs: `sync_event_log`
3. Check application logs for detailed errors
4. Review ADO API responses in error messages

---

**Version**: 2.0  
**Last Updated**: December 2025  
**Compatibility**: Azure DevOps Server/TFS 2019+, Azure DevOps Services
