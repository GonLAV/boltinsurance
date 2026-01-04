const path = require('path');
const AttachmentSyncDatabaseManager = require('../data/attachmentSyncDb.manager');
const TwoWayAttachmentSyncService = require('./twoWayAttachmentSyncService');
const attachmentSyncRoutes = require('../routes/attachmentSync.routes');

/**
 * initializeAttachmentSync
 * 
 * Complete initialization of the two-way attachment sync system.
 * Call this once during app startup.
 * 
 * @param {Express} app - Express application instance
 * @param {Object} options - Configuration options
 * @returns {Promise<{db, syncService, router}>}
 */
async function initializeAttachmentSync(app, options = {}) {
  const logger = options.logger || console;

  try {
    logger.info('[AttachmentSync] Initializing two-way sync system...');

    // 1. Initialize database
    const dbPath = options.dbPath || process.env.ATTACHMENT_SYNC_DB_PATH || './data/attachment-sync.db';
    const dbManager = new AttachmentSyncDatabaseManager(dbPath, logger);
    const db = await dbManager.initialize();

    logger.info('[AttachmentSync] Database initialized');

    // 2. Create sync service
    const syncConfig = {
      apiVersion: options.apiVersion || process.env.ATTACHMENT_SYNC_API_VERSION || process.env.AZURE_API_VERSION || '5.1',
      chunkSize: parseInt(process.env.ATTACHMENT_CHUNK_SIZE || 5242880),
      maxRetries: parseInt(process.env.ATTACHMENT_UPLOAD_MAX_RETRIES || 3),
      retryBackoffMs: parseInt(process.env.ATTACHMENT_UPLOAD_RETRY_BACKOFF_MS || 1000),
      storageBasePath: options.storagePath || process.env.ATTACHMENT_STORAGE_PATH || './attachments',
      maxFileSize: parseInt(process.env.ATTACHMENT_MAX_FILE_SIZE || 524288000),
      requestTimeout: parseInt(process.env.ATTACHMENT_SYNC_REQUEST_TIMEOUT || 60000),
      webhookSecret: process.env.ATTACHMENT_WEBHOOK_SECRET || 'your-webhook-secret',
      logger
    };

    const syncService = new TwoWayAttachmentSyncService(
      options.orgUrl || process.env.AZDO_ORG_URL,
      options.project || process.env.AZDO_PROJECT,
      options.pat || process.env.AZDO_PAT,
      db,
      syncConfig
    );

    logger.info('[AttachmentSync] Sync service created');

    // 3. Store in app.locals for route access
    app.locals.syncService = syncService;
    app.locals.attachmentSyncDb = db;
    app.locals.webhookSecret = syncConfig.webhookSecret;

    // 4. Register routes
    app.use('/api/sync', attachmentSyncRoutes);
    logger.info('[AttachmentSync] Routes registered: /api/sync/*');

    // 5. Set up periodic cleanup
    const cleanupInterval = setInterval(async () => {
      try {
        await dbManager.cleanupExpiredSessions();
      } catch (err) {
        logger.error('[AttachmentSync] Cleanup error:', err.message);
      }
    }, 60 * 60 * 1000); // Every hour

    // 6. Log startup stats
    const stats = await dbManager.getSyncStats();
    logger.info('[AttachmentSync] Startup stats:', {
      totalAttachments: stats?.total_attachments || 0,
      syncedCount: stats?.synced || 0,
      pendingCount: stats?.pending || 0,
      workItemsCount: stats?.work_items_with_attachments || 0
    });

    // 7. Set up event listeners
    syncService.on('upload-error', ({ fileName, error }) => {
      logger.error(`[AttachmentSync] Upload failed: ${fileName} - ${error}`);
    });

    syncService.on('webhook-processed', ({ event, workItemId }) => {
      logger.info(`[AttachmentSync] Webhook processed: ${event} for work item ${workItemId}`);
    });

    // Return for testing/management
    return {
      db,
      dbManager,
      syncService,
      router: attachmentSyncRoutes,
      cleanup: () => {
        clearInterval(cleanupInterval);
        return dbManager.close();
      }
    };
  } catch (err) {
    logger.error('[AttachmentSync] Initialization failed:', err.message);
    throw err;
  }
}

/**
 * Decorator: Add sync capabilities to existing upload endpoint
 * 
 * Usage:
 *   const uploadWithSync = decorateUploadWithSync(originalUploadFn, syncService);
 */
function decorateUploadWithSync(originalUploadFn, syncService) {
  return async (fileContent, fileName, workItemId) => {
    // 1. Upload normally
    const result = await originalUploadFn(fileContent, fileName, workItemId);

    // 2. Also sync to tracking
    try {
      await syncService.uploadAttachment(fileContent, fileName, workItemId);
    } catch (err) {
      console.warn('[Sync] Secondary sync registration failed:', err.message);
      // Don't fail the original upload, just warn
    }

    return result;
  };
}

module.exports = {
  initializeAttachmentSync,
  decorateUploadWithSync,
  TwoWayAttachmentSyncService,
  AttachmentSyncDatabaseManager
};
