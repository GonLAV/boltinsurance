/**
 * Service Client Manager
 * Maintains singleton instances of service clients (Azure DevOps, etc.)
 * Following Azure Functions best practice: create single static clients
 * 
 * This prevents connection leaks and improves performance in serverless environments
 */

const azdev = require('azure-devops-node-api');
const config = require('./environment');
const { globalLogger } = require('../utils/azureLogger');

class ServiceClientManager {
    constructor() {
        this.clients = new Map();
        this.initialized = false;
    }

    /**
     * Initialize all service clients
     * Called once at application startup
     */
    async initialize() {
        if (this.initialized) {
            globalLogger.debug('Service clients already initialized');
            return;
        }

        try {
            globalLogger.info('Initializing service clients...');

            // Initialize Azure DevOps client
            this._initializeAzureDevOpsClient();

            this.initialized = true;
            globalLogger.info('Service clients initialized successfully');
        } catch (error) {
            globalLogger.error('Failed to initialize service clients', error);
            throw error;
        }
    }

    /**
     * Initialize Azure DevOps API client (singleton)
     * @private
     */
    _initializeAzureDevOpsClient() {
        try {
            // Use PAT authentication
            const authHandler = azdev.getPersonalAccessTokenHandler(
                config.ado.pat || 'dummy-token'
            );
            
            const connection = new azdev.WebApi(
                config.ado.orgUrl,
                authHandler
            );

            this.clients.set('ado', connection);
            globalLogger.debug('Azure DevOps client initialized', {
                orgUrl: config.ado.orgUrl,
                project: config.ado.project
            });
        } catch (error) {
            globalLogger.error('Failed to initialize Azure DevOps client', error);
            throw error;
        }
    }

    /**
     * Get Azure DevOps client (singleton)
     */
    getAzureDevOpsClient() {
        if (!this.clients.has('ado')) {
            throw new Error('Azure DevOps client not initialized. Call initialize() first.');
        }
        return this.clients.get('ado');
    }

    /**
     * Get any registered client by name
     */
    getClient(name) {
        return this.clients.get(name);
    }

    /**
     * Register a custom client
     */
    registerClient(name, client) {
        this.clients.set(name, client);
        globalLogger.debug(`Client registered: ${name}`);
    }

    /**
     * Cleanup/disconnect all clients
     * Called during application shutdown
     */
    async cleanup() {
        try {
            globalLogger.info('Cleaning up service clients...');
            
            // Add cleanup logic for each client type as needed
            // For now, just clear the map
            this.clients.clear();
            this.initialized = false;

            globalLogger.info('Service clients cleaned up');
        } catch (error) {
            globalLogger.error('Error during service client cleanup', error);
        }
    }

    /**
     * Check if clients are initialized
     */
    isInitialized() {
        return this.initialized;
    }
}

// Export singleton instance
const clientManager = new ServiceClientManager();

module.exports = clientManager;
