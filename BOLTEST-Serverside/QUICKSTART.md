# Two-Way Attachment Sync - Quick Start Checklist

## ✅ Implementation Complete

All files created and ready to use. Follow this checklist to activate the system.

---

## Phase 1: Backend Setup (10 minutes)

- [ ] **1.1 Install dependency**
  ```bash
  npm install sqlite3 --save
  ```

- [ ] **1.2 Create directories**
  ```bash
  mkdir -p ./data
  mkdir -p ./attachments
  ```

- [ ] **1.3 Update `.env` file**
  Add these variables (copy from `.env.attachmentSync`):
  ```
  ATTACHMENT_SYNC_DB_PATH=./data/attachment-sync.db
  ATTACHMENT_STORAGE_PATH=./attachments
  ATTACHMENT_WEBHOOK_SECRET=<generate-strong-secret>
  ATTACHMENT_WEBHOOK_URL=https://yourdomain.com/api/webhooks/workitem
  ATTACHMENT_AUTO_SYNC_ON_WEBHOOK=true
  ```

  Generate webhook secret:
  ```javascript
  require('crypto').randomBytes(32).toString('hex')
  // Copy the output to ATTACHMENT_WEBHOOK_SECRET
  ```

- [ ] **1.4 Update main `app.js` or `server.js`**
  
  Add at the top:
  ```javascript
  const { initializeAttachmentSync } = require('./src/config/attachmentSyncInit');
  ```

  Before `app.listen()`, add:
  ```javascript
  async function startServer() {
    try {
      // ... other app setup ...
      
      // Initialize two-way attachment sync
      const syncSystem = await initializeAttachmentSync(app, {
        orgUrl: process.env.AZDO_ORG_URL,
        project: process.env.AZDO_PROJECT,
        pat: process.env.AZDO_PAT,
        logger: console
      });

      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => {
        console.log(`✓ Server running on port ${PORT}`);
        console.log(`✓ Attachment sync enabled`);
      });
    } catch (err) {
      console.error('Startup failed:', err);
      process.exit(1);
    }
  }

  startServer();
  ```

- [ ] **1.5 Test backend startup**
  ```bash
  npm run dev
  # Look for: "[AttachmentSync] Database initialized"
  # Look for: "[AttachmentSync] Routes registered: /api/sync/*"
  ```

---

## Phase 2: Webhook Configuration (15 minutes)

- [ ] **2.1 Get public URL**
  - For local development: Use tunneling service (ngrok)
    ```bash
    ngrok http 5000
    # Copy forwarding URL: https://abc123.ngrok.io
    ```
  - For production: Use your domain HTTPS endpoint

- [ ] **2.2 Update webhook URL in `.env`**
  ```
  ATTACHMENT_WEBHOOK_URL=https://your-public-url.com/api/webhooks/workitem
  ```

- [ ] **2.3 Register webhook in Azure DevOps**
  1. Go to: `https://dev.azure.com/yourorg/yourproject/_settings/`
  2. Left menu → **Service Hooks**
  3. Click **+ Create subscription**
  4. Event type: Select **"Work item updated"** and **"Work item created"**
  5. Click **Next**
  6. Action: Select **"Web Hooks"**
  7. Settings:
     - **URL**: `https://your-public-url.com/api/webhooks/workitem`
     - **Message format**: JSON
     - **Detailed messages**: Yes
   8. HTTP Headers (Optional but recommended):
      ```
      x-webhook-signature: <your ATTACHMENT_WEBHOOK_SECRET>
      ```
   9. Click **Test** to verify
   10. Click **Finish**

- [ ] **2.4 Verify webhook**
  - Check Azure DevOps Service Hooks page for success indicator
  - Check backend logs for webhook events

---

## Phase 3: Test API Endpoints (10 minutes)

- [ ] **3.1 List attachments for a test work item**
  ```bash
  curl http://localhost:5000/api/sync/attachments/12345
  ```

- [ ] **3.2 Check deduplication**
  ```bash
  curl http://localhost:5000/api/sync/deduplication/abc123...
  ```

- [ ] **3.3 Check sync status**
  ```bash
  curl http://localhost:5000/api/sync/status/12345
  ```

---

## Phase 4: Frontend Integration (Optional)

- [ ] **4.1 Update CreateTestCasePage.tsx**
  Attachments should already work with the fix applied earlier.

- [ ] **4.2 Add attachment viewer (optional)**
  Create component to display synced attachments from TFS.

- [ ] **4.3 Rebuild frontend**
  ```bash
  npm run build
  ```

---

## Phase 5: Production Deployment

- [ ] **5.1 Use strong secrets**
  ```javascript
  // Generate new webhook secret
  require('crypto').randomBytes(32).toString('hex')
  ```

- [ ] **5.2 Use HTTPS**
  - Webhook URL must be HTTPS
  - Use valid SSL certificate

- [ ] **5.3 Database backup strategy**
  ```bash
  # Daily backup (cron job)
  cp ./data/attachment-sync.db ./backups/attachment-sync.db.$(date +%Y%m%d)
  ```

- [ ] **5.4 Monitor sync health**
  Set up alerts for:
  - Failed sync jobs: `SELECT COUNT(*) FROM sync_event_log WHERE severity = 'ERROR' AND created_at > NOW() - INTERVAL 1 HOUR`
  - Queue backlog: `SELECT COUNT(*) FROM sync_job_queue WHERE status = 'QUEUED'`
  - Disk usage: Check `./attachments` directory size

- [ ] **5.5 Cleanup old data (optional)**
  ```bash
  # Monthly cron job
  sqlite3 ./data/attachment-sync.db "DELETE FROM sync_event_log WHERE created_at < DATE('now', '-90 days')"
  ```

---

## Files Created

| File | Purpose |
|------|---------|
| `data/schemas/attachmentSync.schema.sql` | Database schema (6 tables + views) |
| `data/attachmentSyncDb.manager.js` | Database manager & initialization |
| `services/twoWayAttachmentSyncService.js` | Core sync logic (800+ lines) |
| `src/config/attachmentSyncInit.js` | Express app initialization |
| `src/routes/attachmentSync.routes.js` | REST API endpoints (12+) |
| `.env.attachmentSync` | Configuration template |
| `ATTACHMENT_SYNC_GUIDE.md` | Complete documentation |
| `IMPLEMENTATION_SUMMARY.js` | Quick reference |
| `QUICKSTART.md` | This file |

---

## API Endpoints Ready to Use

```
POST   /api/sync/upload                    ← Upload file
POST   /api/sync/link-attachment          ← Link to work item
GET    /api/sync/attachments/:id          ← List attachments
POST   /api/sync/force-sync/:id           ← Manual sync
GET    /api/sync/status/:id               ← Sync status
DELETE /api/sync/attachments/:guid        ← Delete
POST   /api/sync/download/:guid           ← Download from ADO
GET    /api/sync/deduplication/:sha256    ← Check duplicate
GET    /api/sync/upload-session/:uuid     ← Track upload
POST   /api/webhooks/workitem             ← Webhook receiver
```

---

## Common Issues & Solutions

### Issue: "Cannot find module 'sqlite3'"
```bash
npm install sqlite3 --save
```

### Issue: "Database is locked"
- Ensure only one Node.js process is running
- Increase SQLite timeout:
  ```javascript
  db.configure('busyTimeout', 5000);
  ```

### Issue: Webhook not receiving events
1. Verify HTTPS is working: `https://your-domain.com/api/webhooks/workitem`
2. Check Azure DevOps Service Hooks for errors
3. Look for webhook logs in your backend

### Issue: "Invalid webhook signature"
1. Verify `ATTACHMENT_WEBHOOK_SECRET` matches value in ADO webhook config
2. Check that webhook is sending `x-webhook-signature` header

### Issue: Attachments upload but don't link
1. Check API response for errors
2. Verify work item ID is correct
3. Check `sync_event_log` for detailed error

---

## Monitoring Commands

**Check sync stats:**
```sql
SELECT * FROM v_attachment_sync_summary;
```

**View recent errors:**
```sql
SELECT event_type, message, created_at 
FROM sync_event_log 
WHERE severity = 'ERROR' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Check pending jobs:**
```sql
SELECT job_type, COUNT(*) FROM sync_job_queue 
WHERE status = 'QUEUED' 
GROUP BY job_type;
```

**Overall stats:**
```bash
curl http://localhost:5000/api/sync/status/12345
```

---

## Cleanup & Reset (if needed)

**Reset all sync data:**
```bash
rm ./data/attachment-sync.db
rm -rf ./attachments/*
# Restart server to recreate DB
```

**Clear failed jobs:**
```sql
DELETE FROM sync_job_queue WHERE status = 'FAILED';
```

**Delete old events:**
```sql
DELETE FROM sync_event_log WHERE created_at < DATE('now', '-90 days');
```

---

## Next Steps

1. ✅ Complete Phase 1-5 above
2. 📚 Read [ATTACHMENT_SYNC_GUIDE.md](./ATTACHMENT_SYNC_GUIDE.md) for detailed docs
3. 🧪 Test with sample attachments
4. 📊 Monitor sync health with provided SQL queries
5. 🚀 Deploy to production with strong secrets

---

## Support

- **Documentation**: See `ATTACHMENT_SYNC_GUIDE.md`
- **API Reference**: See `src/routes/attachmentSync.routes.js`
- **Code Reference**: See `IMPLEMENTATION_SUMMARY.js`
- **Database Schema**: See `data/schemas/attachmentSync.schema.sql`

**Questions?** Check the troubleshooting section in `ATTACHMENT_SYNC_GUIDE.md`

---

**Status**: ✅ READY TO USE  
**Created**: December 2025  
**Version**: 2.0
