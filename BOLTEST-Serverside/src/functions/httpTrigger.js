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
const authController = require('../../controllers/authControllers');
const adoController = require('../../controllers/adoController');

// Initialize logger
const logger = new AzureLogger();

function createResponse(context) {
    return {
        statusCode: 200,
        headers: {},
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.setHeader('Content-Type', 'application/json');
            return this.send(payload);
        },
        send(payload) {
            if (context.res) return context.res;
            const responseBody = payload !== undefined ? payload : this.body;
            this.body = responseBody;
            context.res = {
                status: this.statusCode || 200,
                headers: this.headers,
                body: responseBody
            };
            return context.res;
        },
        setHeader(name, value) {
            this.headers[name] = value;
            return this;
        },
        header(name, value) {
            return this.setHeader(name, value);
        }
    };
}

function buildRequest(req, body) {
    const resolvedBody = body !== undefined && body !== null ? body : req.body;
    return {
        ...req,
        body: resolvedBody,
        headers: req.headers || {},
        query: req.query || {}
    };
}

function respondNotImplemented(context, method, path) {
    context.res = {
        status: 501,
        headers: { 'Content-Type': 'application/json' },
        body: {
            error: 'Not Implemented',
            message: `Route ${method} ${path} is not available in the Azure Function handler.`,
            timestamp: new Date().toISOString()
        }
    };
}

function ensureContextResponse(context, resMock) {
    if (context.res) return;
    context.res = {
        status: resMock.statusCode || 200,
        headers: resMock.headers,
        body: resMock.body !== undefined ? resMock.body : { success: true }
    };
}

async function runController(handler, req, res, context, log) {
    try {
        await handler(req, res);
    } catch (err) {
        const loggerToUse = log || logger;
        loggerToUse.error('Controller execution failed', err);
        const message = config.isProduction ? 'Unexpected controller error' : err.message || 'Unexpected controller error';
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: {
                error: 'Internal Server Error',
                message,
                timestamp: new Date().toISOString()
            }
        };
    }
}

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
                const reqMock = buildRequest(req, body);
                const resMock = createResponse(context);
                await runController(authController.login, reqMock, resMock, context, childLogger);
                ensureContextResponse(context, resMock);
                return;
            }
            if (path === '/api/auth/logout' && method === 'POST') {
                context.res = { status: 200, body: { success: true, message: 'Logged out' } };
                return;
            }
            if (path === '/api/auth/test-connection' && method === 'POST') {
                const reqMock = buildRequest(req, body);
                const resMock = createResponse(context);
                await runController(authController.testConnection, reqMock, resMock, context, childLogger);
                ensureContextResponse(context, resMock);
                return;
            }
            respondNotImplemented(context, method, path);
            return;
        }

        // ADO routes
        if (path.startsWith('/api/ado')) {
            if (path === '/api/ado/userstories' && method === 'GET') {
                const reqMock = buildRequest(req, body);
                const resMock = createResponse(context);
                await runController(adoController.getUserStories, reqMock, resMock, context, childLogger);
                ensureContextResponse(context, resMock);
                return;
            }
            respondNotImplemented(context, method, path);
            return;
        }

        // Test Case routes (not implemented in Function handler)
        if (path.startsWith('/api/testcases')) {
            respondNotImplemented(context, method, path);
            return;
        }

        // Projects routes
        if (path.startsWith('/api/projects')) {
            respondNotImplemented(context, method, path);
            return;
        }

        // Work Items routes
        if (path.startsWith('/api/workitems')) {
            respondNotImplemented(context, method, path);
            return;
        }

        // Test Suites routes
        if (path.startsWith('/api/testsuites')) {
            respondNotImplemented(context, method, path);
            return;
        }

        // Test Plans routes
        if (path.startsWith('/api/testplans')) {
            respondNotImplemented(context, method, path);
            return;
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
