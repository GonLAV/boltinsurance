/**
 * Attachment Sync Schema & Models
 * 
 * Stores mapping between:
 * - Custom Tool Attachments ↔ Azure DevOps TFS Attachments
 * 
 * This allows bidirectional sync and tracking of attachment lifecycle
 */

const schema = {
  /**
   * Attachments Collection
   * Maps between tool attachments and TFS attachments
   */
  attachments: {
    _id: 'ObjectId',
    // TFS Info
    tfsAttachmentId: 'String (GUID from TFS)',
    tfsAttachmentUrl: 'String (Full URL from TFS)',
    tfsWorkItemId: 'Number (Work Item ID)',
    tfsProject: 'String (Project name)',
    tfsOrganization: 'String (Org URL)',
    
    // Local Info
    localFileName: 'String',
    localFilePath: 'String (path in uploads/)',
    localFileSize: 'Number (bytes)',
    localMimeType: 'String',
    
    // Metadata
    uploadedAt: 'Date',
    uploadedBy: 'String (user)',
    linkedToWorkItemAt: 'Date',
    lastSyncedAt: 'Date',
    syncStatus: 'String (pending, synced, failed)',
    comment: 'String (optional attachment comment)',
    
    // Tracking
    isDeleted: 'Boolean (soft delete)',
    deletedAt: 'Date'
  },

  /**
   * Work Item Attachments Mapping
   * Tracks all attachments linked to a specific work item
   */
  workItemAttachmentMappings: {
    _id: 'ObjectId',
    workItemId: 'Number (Work Item ID)',
    project: 'String',
    organization: 'String',
    attachmentIds: 'Array<String> (references to attachments._id)',
    lastFetched: 'Date',
    lastModified: 'Date',
    totalAttachments: 'Number'
  },

  /**
   * Sync History
   * Audit trail of all sync operations
   */
  attachmentSyncHistory: {
    _id: 'ObjectId',
    attachmentId: 'ObjectId (ref to attachments._id)',
    workItemId: 'Number',
    operation: 'String (upload, link, download, sync)',
    direction: 'String (to-tfs, from-tfs)',
    status: 'String (success, failed)',
    errorMessage: 'String (if failed)',
    timestamp: 'Date',
    duration: 'Number (ms)',
    userId: 'String'
  }
};

/**
 * MongoDB Collections (if using MongoDB)
 */
const mongooseSchemas = {
  Attachment: `
    {
      tfsAttachmentId: { type: String, unique: true, sparse: true },
      tfsAttachmentUrl: String,
      tfsWorkItemId: Number,
      tfsProject: String,
      tfsOrganization: String,
      
      localFileName: String,
      localFilePath: String,
      localFileSize: Number,
      localMimeType: String,
      
      uploadedAt: { type: Date, default: Date.now },
      uploadedBy: String,
      linkedToWorkItemAt: Date,
      lastSyncedAt: Date,
      syncStatus: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' },
      comment: String,
      
      isDeleted: { type: Boolean, default: false },
      deletedAt: Date,
      
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }
  `,

  WorkItemAttachmentMapping: `
    {
      workItemId: { type: Number, required: true },
      project: String,
      organization: String,
      attachmentIds: [{ type: Schema.Types.ObjectId, ref: 'Attachment' }],
      lastFetched: Date,
      lastModified: Date,
      totalAttachments: Number,
      
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }
  `,

  AttachmentSyncHistory: `
    {
      attachmentId: { type: Schema.Types.ObjectId, ref: 'Attachment' },
      workItemId: Number,
      operation: { type: String, enum: ['upload', 'link', 'download', 'sync'], required: true },
      direction: { type: String, enum: ['to-tfs', 'from-tfs'], required: true },
      status: { type: String, enum: ['success', 'failed'], required: true },
      errorMessage: String,
      timestamp: { type: Date, default: Date.now },
      duration: Number,
      userId: String,
      
      createdAt: { type: Date, default: Date.now }
    }
  `
};

/**
 * SQLite Schema (if using SQLite)
 */
const sqliteSchemas = {
  attachments: `
    CREATE TABLE attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tfs_attachment_id TEXT UNIQUE,
      tfs_attachment_url TEXT,
      tfs_work_item_id INTEGER,
      tfs_project TEXT,
      tfs_organization TEXT,
      
      local_file_name TEXT,
      local_file_path TEXT,
      local_file_size INTEGER,
      local_mime_type TEXT,
      
      uploaded_at DATETIME,
      uploaded_by TEXT,
      linked_to_work_item_at DATETIME,
      last_synced_at DATETIME,
      sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'failed')),
      comment TEXT,
      
      is_deleted BOOLEAN DEFAULT 0,
      deleted_at DATETIME,
      
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_tfs_attachment_id ON attachments(tfs_attachment_id);
    CREATE INDEX idx_tfs_work_item_id ON attachments(tfs_work_item_id);
    CREATE INDEX idx_sync_status ON attachments(sync_status);
  `,

  work_item_attachment_mappings: `
    CREATE TABLE work_item_attachment_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_item_id INTEGER,
      project TEXT,
      organization TEXT,
      attachment_ids TEXT,  -- JSON array of attachment IDs
      last_fetched DATETIME,
      last_modified DATETIME,
      total_attachments INTEGER,
      
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_work_item_id ON work_item_attachment_mappings(work_item_id);
  `,

  attachment_sync_history: `
    CREATE TABLE attachment_sync_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attachment_id INTEGER,
      work_item_id INTEGER,
      operation TEXT CHECK(operation IN ('upload', 'link', 'download', 'sync')),
      direction TEXT CHECK(direction IN ('to-tfs', 'from-tfs')),
      status TEXT CHECK(status IN ('success', 'failed')),
      error_message TEXT,
      timestamp DATETIME,
      duration INTEGER,  -- milliseconds
      user_id TEXT,
      
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (attachment_id) REFERENCES attachments(id)
    );

    CREATE INDEX idx_attachment_id ON attachment_sync_history(attachment_id);
    CREATE INDEX idx_timestamp ON attachment_sync_history(timestamp);
  `
};

/**
 * Sample Implementation: File-based tracking (no database needed yet)
 * 
 * Store attachment metadata in JSON file: data/attachments.json
 */
const fileBasedSchema = {
  storageFile: 'data/attachments.json',
  structure: {
    attachments: [
      {
        id: 'uuid',
        tfsAttachmentId: 'guid-from-tfs',
        tfsWorkItemId: 12345,
        localFileName: 'my-file.pdf',
        tfsAttachmentUrl: 'https://tfs.com/...',
        uploadedAt: 'ISO8601 datetime',
        syncStatus: 'synced'
      }
    ],
    syncHistory: [
      {
        attachmentId: 'uuid',
        operation: 'upload',
        status: 'success',
        timestamp: 'ISO8601 datetime'
      }
    ]
  }
};

module.exports = {
  schema,
  mongooseSchemas,
  sqliteSchemas,
  fileBasedSchema,
  
  // Helper to create JSON-based storage
  createFileBasedStorage() {
    const fs = require('fs');
    const path = require('path');
    
    const dataDir = path.join(__dirname, '..', 'data');
    const storageFile = path.join(dataDir, 'attachments.json');
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!fs.existsSync(storageFile)) {
      fs.writeFileSync(storageFile, JSON.stringify({
        attachments: [],
        syncHistory: [],
        workItemMappings: []
      }, null, 2));
    }
    
    return {
      read() {
        const data = fs.readFileSync(storageFile, 'utf8');
        return JSON.parse(data);
      },
      
      write(data) {
        fs.writeFileSync(storageFile, JSON.stringify(data, null, 2));
      },
      
      addAttachment(attachment) {
        const data = this.read();
        attachment.id = require('crypto').randomUUID();
        attachment.uploadedAt = new Date().toISOString();
        data.attachments.push(attachment);
        this.write(data);
        return attachment;
      },
      
      logSync(syncRecord) {
        const data = this.read();
        syncRecord.timestamp = new Date().toISOString();
        data.syncHistory.push(syncRecord);
        this.write(data);
      }
    };
  }
};
