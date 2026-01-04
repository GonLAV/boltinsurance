const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

/**
 * AttachmentSyncDatabaseManager
 * 
 * Initializes and manages the SQLite database for two-way attachment sync.
 * Handles migrations, schema creation, and connection pooling.
 */
class AttachmentSyncDatabaseManager {
  constructor(dbPath = './data/attachment-sync.db', logger = console) {
    this.dbPath = dbPath;
    this.logger = logger;
    this.db = null;
  }

  /**
   * initialize - Create/open database and run migrations
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, async (err) => {
        if (err) {
          this.logger.error('[DB] Connection failed:', err.message);
          return reject(err);
        }

        this.logger.info(`[DB] Connected to ${this.dbPath}`);

        try {
          // Enable foreign keys
          await this.run('PRAGMA foreign_keys = ON');

          // Run schema
          await this.createTables();

          this.logger.info('[DB] Schema initialized successfully');
          resolve(this.db);
        } catch (err) {
          this.logger.error('[DB] Schema creation failed:', err.message);
          reject(err);
        }
      });
    });
  }

  /**
   * createTables - Read and execute schema SQL
   */
  async createTables() {
    const schemaPath = path.join(__dirname, '../data/schemas/attachmentSync.schema.sql');

    try {
      const schema = await fs.promises.readFile(schemaPath, 'utf8');
      const statements = schema.split(';').filter(s => s.trim());

      for (const statement of statements) {
        if (statement.trim()) {
          await this.run(statement);
        }
      }

      this.logger.info('[DB] All tables created/verified');
    } catch (err) {
      if (err.code === 'ENOENT') {
        this.logger.warn('[DB] Schema file not found, using inline schema');
        await this.createTablesInline();
      } else {
        throw err;
      }
    }
  }

  /**
   * createTablesInline - Create tables using inline SQL (fallback)
   */
  async createTablesInline() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS attachment_sync_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_item_id INTEGER NOT NULL,
        attachment_guid TEXT UNIQUE NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER,
        sha256_hash TEXT,
        mime_type TEXT,
        source TEXT CHECK(source IN ('TOOL', 'ADO')) NOT NULL DEFAULT 'TOOL',
        ado_attachment_url TEXT,
        ado_work_item_revision INTEGER,
        ado_created_by TEXT,
        ado_created_date TEXT,
        local_file_path TEXT,
        local_storage_type TEXT DEFAULT 'FILESYSTEM',
        sync_status TEXT CHECK(sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'DELETED')) NOT NULL DEFAULT 'PENDING',
        last_sync_attempt TEXT,
        last_sync_error TEXT,
        sync_retry_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS chunked_upload_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_uuid TEXT UNIQUE NOT NULL,
        work_item_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        total_size INTEGER NOT NULL,
        chunk_size INTEGER NOT NULL DEFAULT 5242880,
        sha256_hash TEXT,
        chunks_received INTEGER DEFAULT 0,
        total_chunks INTEGER NOT NULL,
        last_chunk_index INTEGER DEFAULT -1,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS sync_job_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_item_id INTEGER NOT NULL,
        attachment_guid TEXT,
        job_type TEXT CHECK(job_type IN ('UPLOAD', 'DOWNLOAD', 'LINK', 'UNLINK', 'DELETE')) NOT NULL,
        status TEXT CHECK(status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')) NOT NULL DEFAULT 'QUEUED',
        priority INTEGER DEFAULT 5,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        payload TEXT,
        error_message TEXT,
        error_details TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        started_at TEXT,
        completed_at TEXT,
        next_retry_at TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS sync_event_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        work_item_id INTEGER,
        attachment_guid TEXT,
        event_data TEXT,
        message TEXT,
        severity TEXT CHECK(severity IN ('INFO', 'WARN', 'ERROR')) DEFAULT 'INFO',
        source TEXT,
        user_id TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS webhook_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subscription_id TEXT UNIQUE,
        org_url TEXT NOT NULL,
        project TEXT NOT NULL,
        event_type TEXT NOT NULL,
        work_item_types TEXT,
        callback_url TEXT NOT NULL,
        secret_token TEXT,
        is_active BOOLEAN DEFAULT 1,
        last_verified_at TEXT,
        verification_error TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS deduplication_index (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sha256_hash TEXT UNIQUE NOT NULL,
        attachment_guid TEXT NOT NULL,
        work_item_id INTEGER NOT NULL,
        duplicate_count INTEGER DEFAULT 1,
        last_duplicate_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_attachments_work_item_sync ON attachment_sync_metadata(work_item_id, sync_status)`,
      `CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_job_queue(priority, status, next_retry_at)`,
      `CREATE INDEX IF NOT EXISTS idx_attachment_guid ON attachment_sync_metadata(attachment_guid)`,
      `CREATE INDEX IF NOT EXISTS idx_sha256_hash ON deduplication_index(sha256_hash)`,
      `CREATE INDEX IF NOT EXISTS idx_sync_event_type ON sync_event_log(event_type, created_at)`,

      // Create views
      `CREATE VIEW IF NOT EXISTS v_attachment_sync_summary AS
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
       GROUP BY work_item_id`
    ];

    for (const statement of tables) {
      await this.run(statement);
    }

    this.logger.info('[DB] Tables created (inline)');
  }

  /**
   * run - Execute SQL statement
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  /**
   * get - Fetch single row
   */
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * all - Fetch multiple rows
   */
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * close - Close database connection
   */
  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else {
            this.logger.info('[DB] Connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * cleanup - Remove old chunked upload sessions (24+ hours)
   */
  async cleanupExpiredSessions() {
    try {
      const result = await this.run(
        `DELETE FROM chunked_upload_sessions WHERE expires_at < CURRENT_TIMESTAMP`
      );
      if (result.changes > 0) {
        this.logger.info(`[DB] Cleaned up ${result.changes} expired upload sessions`);
      }
    } catch (err) {
      this.logger.error('[DB] Cleanup error:', err.message);
    }
  }

  /**
   * getSyncStats - Get overall sync statistics
   */
  async getSyncStats() {
    try {
      const stats = await this.get(`
        SELECT 
          COUNT(*) as total_attachments,
          SUM(CASE WHEN sync_status = 'SYNCED' THEN 1 ELSE 0 END) as synced,
          SUM(CASE WHEN sync_status = 'PENDING' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN sync_status = 'FAILED' THEN 1 ELSE 0 END) as failed,
          COUNT(DISTINCT work_item_id) as work_items_with_attachments,
          SUM(file_size) as total_size_bytes
        FROM attachment_sync_metadata
        WHERE deleted_at IS NULL
      `);
      return stats;
    } catch (err) {
      this.logger.error('[DB] Stats query error:', err.message);
      return null;
    }
  }
}

module.exports = AttachmentSyncDatabaseManager;
