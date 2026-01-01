/**
 * Azure HTTP Trigger Function
 * Implements Scenario 1: Build Scalable Web API
 * 
 * This function handles all HTTP requests to the BOLTEST API
 * and routes them to the appropriate handlers
 */

const AzureLogger = require('../../utils/azureLogger');
const config = require('../../config/environment');
const clientManager = require('../../config/clientManager');

// Initialize logger
const logger = new AzureLogger();

// Import route handlers
const authRoutes = require('../routes/auth');
const testCaseRoutes = require('../routes/testCases');
const adoRoutes = require('../routes/ado');
const projectsRoutes = require('../routes/projects');
const workItemsRoutes = require('../routes/workItems');
const testSuitesRoutes = require('../routes/testSuites');
const testPlansRoutes = require('../routes/testPlans');

/**
 * Main HTTP Trigger Handler
 * Routes requests based on path and method
 * 
 * @param {Object} context - Azure Functions context
 * @param {Object} req - HTTP request object
 */
module.exports = async function (context, req) {
    const requestId = context.invocationId;
    const childLogger = logger.createChild({ requestId });

    try {
        // Log incoming request
        childLogger.info(`${req.method} ${req.url}`, {
            method: req.method,
            path: req.url,
            headers: req.headers
        });

        // Initialize clients on first invocation
        if (!clientManager.isInitialized()) {
            childLogger.info('Initializing service clients...');
            await clientManager.initialize();
            childLogger.info('Service clients initialized');
        }

        // Parse request body if present
        let body = req.body;
        if (req.method !== 'GET' && req.method !== 'DELETE') {
            try {
                body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            } catch (e) {
                childLogger.warn('Failed to parse request body', { error: e.message });
            }
        }

        // Route handling
        const path = req.url.split('?')[0]; // Remove query string
        const method = req.method;

        // Health check endpoint
        if (path === '/api/health' && method === 'GET') {
            context.res = {
                status: 200,
                body: {
                    success: true,
                    message: 'BOLTEST API is healthy',
                    clientsInitialized: clientManager.isInitialized(),
                    timestamp: new Date().toISOString()
                }
            };
            return;
        }

        // Auth routes
        if (path.startsWith('/api/auth')) {
            if (path === '/api/auth/login' && method === 'POST') {
                // Call login handler
                const result = await authRoutes.login(body, childLogger);
                context.res = { status: result.status || 200, body: result };
                return;
            }
            if (path === '/api/auth/logout' && method === 'POST') {
                context.res = { status: 200, body: { success: true, message: 'Logged out' } };
                return;
            }
        }

        // ADO routes
        if (path.startsWith('/api/ado')) {
            const pat = req.headers['x-pat'] || config.ado.pat;
            if (path === '/api/ado/userstories' && method === 'GET') {
                const project = req.query?.project || 'Epos';
                const result = await adoRoutes.getUserStories(project, pat, childLogger);
                context.res = { status: result.status || 200, body: result };
                return;
            }
            if (path === '/api/ado/projects' && method === 'GET') {
                const result = await adoRoutes.getProjects(pat, childLogger);
                context.res = { status: result.status || 200, body: result };
                return;
            }
        }

        // Test Case routes
        if (path.startsWith('/api/testcases')) {
            if (path === '/api/testcases' && method === 'GET') {
                const result = await testCaseRoutes.getTestCases(childLogger);
                context.res = { status: result.status || 200, body: result };
                return;
            }
            if (path === '/api/testcases' && method === 'POST') {
                const result = await testCaseRoutes.createTestCase(body, childLogger);
                context.res = { status: result.status || 201, body: result };
                return;
            }
        }

        // Projects routes
        if (path.startsWith('/api/projects')) {
            if (path === '/api/projects' && method === 'GET') {
                const result = await projectsRoutes.getProjects(childLogger);
                context.res = { status: result.status || 200, body: result };
                return;
            }
        }

        // Work Items routes
        if (path.startsWith('/api/workitems')) {
            if (path === '/api/workitems' && method === 'GET') {
                const result = await workItemsRoutes.getWorkItems(childLogger);
                context.res = { status: result.status || 200, body: result };
                return;
            }
        }

        // Test Suites routes
        if (path.startsWith('/api/testsuites')) {
            if (path === '/api/testsuites' && method === 'GET') {
                const result = await testSuitesRoutes.getTestSuites(childLogger);
                context.res = { status: result.status || 200, body: result };
                return;
            }
        }

        // Test Plans routes
        if (path.startsWith('/api/testplans')) {
            if (path === '/api/testplans' && method === 'GET') {
                const result = await testPlansRoutes.getTestPlans(childLogger);
                context.res = { status: result.status || 200, body: result };
                return;
            }
        }

        // 404 - Route not found
        childLogger.warn(`Route not found: ${method} ${path}`);
        context.res = {
            status: 404,
            body: {
                error: 'Not Found',
                message: `Route ${method} ${path} not found`,
                timestamp: new Date().toISOString()
            }
        };

    } catch (error) {
        childLogger.error('HTTP Trigger Error', error);
        context.res = {
            status: 500,
            body: {
                error: 'Internal Server Error',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };
    }
};
