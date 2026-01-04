/**
 * Azure Blob Trigger Function
 * Implements Scenario 2: Process File Uploads
 * 
 * This function automatically processes files uploaded to Azure Blob Storage
 * It validates, transforms, and catalogs test attachments
 */

const AzureLogger = require('../../utils/azureLogger');
const clientManager = require('../../config/clientManager');

// Initialize logger
const logger = new AzureLogger();

/**
 * Blob Trigger Handler
 * Processes uploaded test files
 * 
 * @param {Object} context - Azure Functions context
 * @param {Buffer} myBlob - The blob content
 */
module.exports = async function (context, myBlob) {
    const blobName = context.bindingData.name;
    const blobPath = context.bindingData.uri;
    const childLogger = logger.createChild({ 
        invocationId: context.invocationId,
        blobName: blobName
    });

    try {
        childLogger.info(`Processing blob upload: ${blobName}`, {
            size: myBlob.length,
            uri: blobPath
        });

        // Initialize clients if needed
        if (!clientManager.isInitialized()) {
            await clientManager.initialize();
        }

        // Parse blob metadata from path
        // Expected format: /uploads/testPlans/{projectId}/{testPlanId}/{fileName}
        const pathParts = blobName.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const testPlanId = pathParts[pathParts.length - 2];
        const projectId = pathParts[pathParts.length - 3];

        // Validate file
        const fileMetadata = validateUploadedFile(fileName, myBlob, childLogger);
        if (!fileMetadata.valid) {
            childLogger.warn(`Validation failed for ${fileName}`, fileMetadata);
            context.done(null, {
                status: 'rejected',
                reason: fileMetadata.reason,
                fileName: fileName
            });
            return;
        }

        // Process file based on type
        const processingResult = await processFileByType(
            fileMetadata,
            myBlob,
            projectId,
            testPlanId,
            childLogger
        );

        // Log processing result
        childLogger.info(`File processed: ${fileName}`, {
            status: processingResult.status,
            itemsProcessed: processingResult.itemsProcessed
        });

        // Set output binding for database trigger
        context.bindings.testAttachmentDocument = {
            id: `${testPlanId}_${Date.now()}`,
            fileName: fileName,
            testPlanId: testPlanId,
            projectId: projectId,
            fileType: fileMetadata.type,
            fileSize: myBlob.length,
            uploadedAt: new Date().toISOString(),
            status: processingResult.status,
            metadata: processingResult.metadata
        };

        childLogger.info(`Blob processing completed successfully`);

    } catch (error) {
        childLogger.error('Blob Trigger Error', error);
        context.done(error);
    }
};

/**
 * Validates uploaded file
 * @param {string} fileName - Name of the file
 * @param {Buffer} fileContent - File content buffer
 * @param {Object} logger - Logger instance
 * @returns {Object} Validation result
 */
function validateUploadedFile(fileName, fileContent, logger) {
    const validExtensions = ['.xlsx', '.xls', '.csv', '.json', '.xml', '.pdf', '.docx', '.txt'];
    const maxFileSize = 50 * 1024 * 1024; // 50MB

    // Check file size
    if (fileContent.length > maxFileSize) {
        return {
            valid: false,
            reason: `File exceeds maximum size of ${maxFileSize / 1024 / 1024}MB`
        };
    }

    // Check file extension
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
        return {
            valid: false,
            reason: `File type ${ext} not supported`
        };
    }

    return {
        valid: true,
        type: ext.replace('.', ''),
        fileName: fileName,
        size: fileContent.length
    };
}

/**
 * Processes file based on its type
 * @param {Object} metadata - File metadata
 * @param {Buffer} content - File content
 * @param {string} projectId - Project ID
 * @param {string} testPlanId - Test Plan ID
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Processing result
 */
async function processFileByType(metadata, content, projectId, testPlanId, logger) {
    const fileType = metadata.type;

    switch (fileType) {
        case 'json':
            return processJsonFile(content, projectId, testPlanId, logger);
        case 'csv':
            return processCsvFile(content, projectId, testPlanId, logger);
        case 'xlsx':
        case 'xls':
            return processExcelFile(content, projectId, testPlanId, logger);
        case 'xml':
            return processXmlFile(content, projectId, testPlanId, logger);
        default:
            logger.info(`Cataloging ${fileType} file`, { 
                projectId, 
                testPlanId 
            });
            return {
                status: 'cataloged',
                itemsProcessed: 1,
                metadata: {
                    documentType: fileType,
                    processingDate: new Date().toISOString()
                }
            };
    }
}

/**
 * Processes JSON test case file
 */
function processJsonFile(content, projectId, testPlanId, logger) {
    try {
        const data = JSON.parse(content.toString('utf8'));
        const testCases = Array.isArray(data) ? data : [data];
        
        logger.info(`Extracted ${testCases.length} test cases from JSON`, {
            projectId,
            testPlanId
        });

        return {
            status: 'processed',
            itemsProcessed: testCases.length,
            metadata: {
                documentType: 'test-cases',
                format: 'json',
                processingDate: new Date().toISOString(),
                testCaseCount: testCases.length
            }
        };
    } catch (error) {
        logger.error('Failed to process JSON file', error);
        return {
            status: 'error',
            itemsProcessed: 0,
            metadata: { error: error.message }
        };
    }
}

/**
 * Processes CSV test case file
 */
function processCsvFile(content, projectId, testPlanId, logger) {
    try {
        const lines = content.toString('utf8').split('\n').filter(line => line.trim());
        const rows = lines.slice(1); // Skip header
        
        logger.info(`Extracted ${rows.length} test cases from CSV`, {
            projectId,
            testPlanId
        });

        return {
            status: 'processed',
            itemsProcessed: rows.length,
            metadata: {
                documentType: 'test-cases',
                format: 'csv',
                processingDate: new Date().toISOString(),
                testCaseCount: rows.length
            }
        };
    } catch (error) {
        logger.error('Failed to process CSV file', error);
        return {
            status: 'error',
            itemsProcessed: 0,
            metadata: { error: error.message }
        };
    }
}

/**
 * Processes Excel test case file
 */
function processExcelFile(content, projectId, testPlanId, logger) {
    // Note: In production, use 'xlsx' package
    logger.info('Excel file received - would process with xlsx library', {
        projectId,
        testPlanId,
        size: content.length
    });

    return {
        status: 'queued',
        itemsProcessed: 0,
        metadata: {
            documentType: 'test-cases',
            format: 'excel',
            processingDate: new Date().toISOString(),
            note: 'Processing queued for Excel handler'
        }
    };
}

/**
 * Processes XML test case file
 */
function processXmlFile(content, projectId, testPlanId, logger) {
    try {
        const xml = content.toString('utf8');
        // Count test case nodes
        const testCaseCount = (xml.match(/<testcase/gi) || []).length;
        
        logger.info(`Extracted ${testCaseCount} test cases from XML`, {
            projectId,
            testPlanId
        });

        return {
            status: 'processed',
            itemsProcessed: testCaseCount,
            metadata: {
                documentType: 'test-cases',
                format: 'xml',
                processingDate: new Date().toISOString(),
                testCaseCount: testCaseCount
            }
        };
    } catch (error) {
        logger.error('Failed to process XML file', error);
        return {
            status: 'error',
            itemsProcessed: 0,
            metadata: { error: error.message }
        };
    }
}
