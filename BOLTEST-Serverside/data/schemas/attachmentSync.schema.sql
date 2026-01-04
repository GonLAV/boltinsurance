-- Two-Way Attachment Sync Schema
-- For Azure DevOps / TFS attachment synchronization

-- Table 1: Attachment Metadata & Sync Tracking
-- Stores metadata for all attachments (from tool or ADO)
CREATE TABLE IF NOT EXISTS attachment_sync_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_item_id INTEGER NOT NULL,
  attachment_guid TEXT UNIQUE NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  sha256_hash TEXT,
  mime_type TEXT,
  
  -- Source tracking: 'TOOL' (created in our app) or 'ADO' (from Azure DevOps)
  source TEXT CHECK(source IN ('TOOL', 'ADO')) NOT NULL DEFAULT 'TOOL',
  
  -- ADO sync details
  ado_attachment_url TEXT,
  ado_work_item_revision INTEGER,
  ado_created_by TEXT,
  ado_created_date TEXT,
  
  -- Local storage
  local_file_path TEXT,
  local_storage_type TEXT DEFAULT 'FILESYSTEM',  -- FILESYSTEM, BLOB_STORAGE, etc.
  
  -- Sync status tracking
  sync_status TEXT CHECK(sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'DELETED')) NOT NULL DEFAULT 'PENDING',
  last_sync_attempt TEXT,
  last_sync_error TEXT,
  sync_retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,  -- Soft delete
  
  FOREIGN KEY (work_item_id) REFERENCES work_items(id),
  INDEX idx_work_item_id (work_item_id),
  INDEX idx_sync_status (sync_status),
  INDEX idx_ado_guid (attachment_guid)
);

-- Table 2: Chunked Upload Sessions
-- Tracks resumable uploads for large files
CREATE TABLE IF NOT EXISTS chunked_upload_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_uuid TEXT UNIQUE NOT NULL,
  work_item_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  total_size INTEGER NOT NULL,
  chunk_size INTEGER NOT NULL DEFAULT 5242880,  -- 5MB chunks
  sha256_hash TEXT,
  
  -- Upload progress
  chunks_received INTEGER DEFAULT 0,
  total_chunks INTEGER NOT NULL,
  last_chunk_index INTEGER DEFAULT -1,
  
  -- Expiration (auto-clean after 24 hours)
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (work_item_id) REFERENCES work_items(id),
  INDEX idx_session_uuid (session_uuid),
  INDEX idx_expires_at (expires_at)
);

-- Table 3: Sync Job Queue
-- Async queue for uploads, downloads, and link operations
CREATE TABLE IF NOT EXISTS sync_job_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_item_id INTEGER NOT NULL,
  attachment_guid TEXT,
  job_type TEXT CHECK(job_type IN ('UPLOAD', 'DOWNLOAD', 'LINK', 'UNLINK', 'DELETE')) NOT NULL,
  
  -- Job state
  status TEXT CHECK(status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')) NOT NULL DEFAULT 'QUEUED',
  priority INTEGER DEFAULT 5,  -- 1=highest, 10=lowest
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Job metadata
  payload TEXT,  -- JSON with job-specific data
  error_message TEXT,
  error_details TEXT,
  
  -- Timing
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT,
  next_retry_at TEXT,
  
  FOREIGN KEY (work_item_id) REFERENCES work_items(id),
  INDEX idx_status (status),
  INDEX idx_next_retry (next_retry_at)
);

-- Table 4: Sync Event Log
-- Audit trail for all sync operations
CREATE TABLE IF NOT EXISTS sync_event_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,  -- UPLOAD_SUCCESS, DOWNLOAD_SUCCESS, WEBHOOK_RECEIVED, SYNC_ERROR, etc.
  work_item_id INTEGER,
  attachment_guid TEXT,
  
  -- Event details
  event_data TEXT,  -- JSON with full context
  message TEXT,
  severity TEXT CHECK(severity IN ('INFO', 'WARN', 'ERROR')) DEFAULT 'INFO',
  
  -- Source of event
  source TEXT,  -- 'API', 'WEBHOOK', 'SYNC_SERVICE', 'SCHEDULER'
  user_id TEXT,  -- Optional: who triggered it
  
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_event_type (event_type),
  INDEX idx_work_item_id (work_item_id),
  INDEX idx_created_at (created_at)
);

-- Table 5: Webhook Subscriptions
-- Track registered webhooks with ADO/TFS
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id TEXT UNIQUE,  -- ADO subscription ID
  org_url TEXT NOT NULL,
  project TEXT NOT NULL,
  
  -- Event filter
  event_type TEXT NOT NULL,  -- workitem.created, workitem.updated, etc.
  work_item_types TEXT,  -- Comma-separated, e.g., "Bug,Story,TestCase"
  
  -- Endpoint
  callback_url TEXT NOT NULL,
  secret_token TEXT,  -- For HMAC validation
  
  -- Status
  is_active BOOLEAN DEFAULT 1,
  last_verified_at TEXT,
  verification_error TEXT,
  
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_org_project (org_url, project)
);

-- Table 6: Deduplication Index
-- Fast lookup for existing attachments by content hash
CREATE TABLE IF NOT EXISTS deduplication_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sha256_hash TEXT UNIQUE NOT NULL,
  attachment_guid TEXT NOT NULL,  -- First-seen GUID
  work_item_id INTEGER NOT NULL,
  
  duplicate_count INTEGER DEFAULT 1,
  last_duplicate_at TEXT,
  
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (attachment_guid) REFERENCES attachment_sync_metadata(attachment_guid),
  INDEX idx_hash (sha256_hash)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attachments_work_item_sync 
  ON attachment_sync_metadata(work_item_id, sync_status);

CREATE INDEX IF NOT EXISTS idx_sync_queue_priority 
  ON sync_job_queue(priority, status, next_retry_at);

-- Trigger: Auto-update timestamp on attachment_sync_metadata
CREATE TRIGGER IF NOT EXISTS update_attachment_sync_metadata_timestamp 
AFTER UPDATE ON attachment_sync_metadata
BEGIN
  UPDATE attachment_sync_metadata SET updated_at = CURRENT_TIMESTAMP 
  WHERE id = NEW.id;
END;

-- View: Current attachment sync status per work item
CREATE VIEW IF NOT EXISTS v_attachment_sync_summary AS
SELECT 
  work_item_id,
  COUNT(*) as total_attachments,
  SUM(CASE WHEN sync_status = 'SYNCED' THEN 1 ELSE 0 END) as synced_count,
  SUM(CASE WHEN sync_status = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
  SUM(CASE WHEN sync_status = 'FAILED' THEN 1 ELSE 0 END) as failed_count,
  SUM(file_size) as total_size_bytes,
  MAX(updated_at) as last_modified
FROM attachment_sync_metadata
WHERE deleted_at IS NULL
GROUP BY work_item_id;
