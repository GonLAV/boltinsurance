/**
 * Azure Cosmos DB Trigger Function
 * Implements Scenario 4: Respond to Database Changes
 * 
 * This function automatically processes database change events
 * It maintains audit logs and triggers downstream workflows
 */

const AzureLogger = require('../../utils/azureLogger');

// Initialize logger
const logger = new AzureLogger();

/**
 * Cosmos DB Trigger Handler
 * Processes change feed events from Cosmos DB
 * 
 * @param {Object} documents - Array of changed documents from the change feed
 * @param {Object} context - Azure Functions context
 */
module.exports = async function (documents, context) {
    const childLogger = logger.createChild({
        invocationId: context.invocationId,
        trigger: 'cosmosDb',
        documentCount: documents.length
    });

    try {
        if (!documents || documents.length === 0) {
            childLogger.debug('No documents to process');
            return;
        }

        childLogger.info(`Processing ${documents.length} database changes`, {
            count: documents.length
        });

        // Process each changed document
        const auditEntries = [];
        const notificationQueue = [];

        for (const doc of documents) {
            try {
                // Create audit log entry
                const auditEntry = createAuditEntry(doc, childLogger);
                auditEntries.push(auditEntry);

                // Determine if downstream notification is needed
                const notification = createNotification(doc, childLogger);
                if (notification) {
                    notificationQueue.push(notification);
                }

                childLogger.debug(`Processed document: ${doc.id}`, {
                    type: doc.documentType,
                    operation: doc._ts ? 'update' : 'create'
                });

            } catch (error) {
                childLogger.error(`Error processing document: ${doc.id}`, error);
            }
        }

        // Bind outputs for audit storage and service bus queue
        context.bindings.auditLog = auditEntries;
        if (notificationQueue.length > 0) {
            context.bindings.testNotificationQueue = notificationQueue;
        }

        childLogger.info('Change feed processing completed', {
            auditEntriesCreated: auditEntries.length,
            notificationsQueued: notificationQueue.length
        });

    } catch (error) {
        childLogger.error('Cosmos DB Trigger Error', error);
        throw error;
    }
};

/**
 * Creates an audit log entry for database changes
 * @param {Object} document - The changed document
 * @param {Object} logger - Logger instance
 * @returns {Object} Audit entry
 */
function createAuditEntry(document, logger) {
    const timestamp = new Date().toISOString();
    const operation = determineOperation(document);

    const auditEntry = {
        id: `audit_${document.id}_${Date.now()}`,
        documentId: document.id,
        documentType: document.documentType || 'unknown',
        operation: operation,
        changedAt: timestamp,
        previousState: document._previous || null,
        currentState: {
            ...document,
            _previous: undefined // Remove circular reference
        },
        changeDetails: extractChanges(document),
        userId: document.modifiedBy || 'system',
        source: 'cosmos-change-feed'
    };

    logger.debug(`Audit entry created`, {
        id: auditEntry.id,
        operation: operation,
        documentType: auditEntry.documentType
    });

    return auditEntry;
}

/**
 * Determines the operation type based on document state
 * @param {Object} document - The document
 * @returns {string} Operation type (create, update, delete)
 */
function determineOperation(document) {
    // In Cosmos DB change feed:
    // - New documents have no _prev
    // - Updates have changes from previous state
    // - Deletes are marked with TTL expiration
    
    if (document._ts === undefined) {
        return 'create';
    }
    
    if (document._ttl === undefined && document._deleted === true) {
        return 'delete';
    }

    // Check if significant fields changed
    if (document.status && document.previousStatus && document.status !== document.previousStatus) {
        return 'statusChange';
    }

    return 'update';
}

/**
 * Extracts specific field changes from a document
 * @param {Object} document - The document
 * @returns {Object} Changed fields
 */
function extractChanges(document) {
    const changes = {};

    // Track changed fields
    const monitoredFields = [
        'status', 'title', 'description', 'priority',
        'assignee', 'testCaseCount', 'executionStatus',
        'lastRunDate', 'createdBy', 'modifiedBy'
    ];

    for (const field of monitoredFields) {
        if (field in document) {
            changes[field] = document[field];
        }
    }

    return changes;
}

/**
 * Creates a notification for downstream processing
 * @param {Object} document - The changed document
 * @param {Object} logger - Logger instance
 * @returns {Object|null} Notification object or null if not applicable
 */
function createNotification(document, logger) {
    // Only notify on significant changes
    const documentType = document.documentType || 'unknown';
    const operation = determineOperation(document);

    // Skip notifications for certain operations
    if (operation === 'create' && documentType === 'audit') {
        return null;
    }

    // Create notification based on document type
    let notification = null;

    switch (documentType) {
        case 'testPlan':
            if (operation === 'statusChange' && document.status === 'ready') {
                notification = createTestPlanNotification(document);
            }
            break;

        case 'testSuite':
            if (operation === 'statusChange' && document.status === 'completed') {
                notification = createTestSuiteNotification(document);
            }
            break;

        case 'testCase':
            if (operation === 'update') {
                notification = createTestCaseNotification(document);
            }
            break;

        case 'workItem':
            if (operation === 'statusChange') {
                notification = createWorkItemNotification(document);
            }
            break;
    }

    if (notification) {
        logger.debug(`Notification created for ${documentType}`, {
            notificationType: notification.type,
            documentId: document.id
        });
    }

    return notification;
}

/**
 * Creates test plan ready notification
 */
function createTestPlanNotification(document) {
    return {
        id: `notif_${document.id}_${Date.now()}`,
        type: 'testPlanReady',
        documentId: document.id,
        title: document.title,
        message: `Test Plan "${document.title}" is ready for execution`,
        priority: 'high',
        targetAudience: ['testers', 'leads'],
        timestamp: new Date().toISOString(),
        metadata: {
            projectId: document.projectId,
            testCaseCount: document.testCaseCount
        }
    };
}

/**
 * Creates test suite completion notification
 */
function createTestSuiteNotification(document) {
    return {
        id: `notif_${document.id}_${Date.now()}`,
        type: 'testSuiteCompleted',
        documentId: document.id,
        title: document.title,
        message: `Test Suite "${document.title}" execution completed`,
        priority: 'medium',
        targetAudience: ['leads', 'analytics'],
        timestamp: new Date().toISOString(),
        metadata: {
            projectId: document.projectId,
            executionTime: document.executionTime,
            resultSummary: document.resultSummary
        }
    };
}

/**
 * Creates test case update notification
 */
function createTestCaseNotification(document) {
    return {
        id: `notif_${document.id}_${Date.now()}`,
        type: 'testCaseUpdated',
        documentId: document.id,
        title: document.title,
        message: `Test Case "${document.title}" has been updated`,
        priority: 'low',
        targetAudience: ['testers'],
        timestamp: new Date().toISOString(),
        metadata: {
            projectId: document.projectId,
            modifiedBy: document.modifiedBy
        }
    };
}

/**
 * Creates work item status change notification
 */
function createWorkItemNotification(document) {
    return {
        id: `notif_${document.id}_${Date.now()}`,
        type: 'workItemStatusChanged',
        documentId: document.id,
        title: document.title,
        message: `Work Item status changed to: ${document.status}`,
        priority: 'medium',
        targetAudience: ['assigned', 'watchers'],
        timestamp: new Date().toISOString(),
        metadata: {
            projectId: document.projectId,
            previousStatus: document.previousStatus,
            newStatus: document.status,
            assignee: document.assignee
        }
    };
}
