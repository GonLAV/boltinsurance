
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const http = require('http');
const AzureLogger = require('../utils/azureLogger');
const config = require('../config/environment');
const clientManager = require('../config/clientManager');

// Create logger instance
const logger = new AzureLogger();

// ===== Routes
const authRoutes = require('./routes/auth');
const testCaseRoutes = require('./routes/testCases');
const contextToolsRoutes = require('./routes/contextTools');
const mirrorRoutes = require('./routes/mirror');
const adoRoutes = require('./routes/ado');
const projectsRoutes = require('./routes/projects');
const classificationNodesRoutes = require('./routes/classificationNodes');
const workItemsRoutes = require('./routes/workItems');
const testSuitesRoutes = require('./routes/testSuites');
const wikiAttachmentsRoutes = require('./routes/wikiAttachments');
const testPlansRoutes = require('./routes/testPlans');
const sharedParametersRoutes = require('../routes/sharedParameters');
const sprintAnalyticsRoutes = require('./routes/sprintAnalytics');

// ===== Express App
const app = express();

// ===== PORT
const PORT = config.port;

// ===== Application Startup Hook (Azure Functions pattern)
let appStartupComplete = false;
async function startupHook() {
    try {
        logger.info('Running application startup hook...');
        // Initialize singleton clients
        await clientManager.initialize();
        appStartupComplete = true;
        logger.info('Startup hook completed successfully');
    } catch (error) {
        logger.error('Startup hook failed', error);
        process.exit(1);
    }
}

// =====================
// Middleware
// =====================

// Helper: check if origin is a Codespaces preview domain
function isCodespacesOrigin(origin) {
    return /^https:\/\/[-\w]+-\d+\.app\.github\.dev$/.test(origin);
}

// CORS Configuration (Azure-compatible)
const corsOptions = config.cors.skipCors
    ? {
          origin: true,
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
          allowedHeaders: [
              'Content-Type',
              'Authorization',
              'x-orgurl',
              'x-pat',
              'x-project',
              'x-backend-key'
          ],
          preflightContinue: false,
          optionsSuccessStatus: 200
      }
    : {
          origin: function(origin, callback) {
              if (!origin) return callback(null, true);
              if (
                  origin === 'http://localhost:3000' ||
                  origin === 'http://localhost:3002' ||
                  origin === 'http://localhost:3008' ||
                  isCodespacesOrigin(origin) ||
                  config.cors.allowedOrigins.includes(origin)
              ) {
                  return callback(null, true);
              }
              return callback(new Error('CORS not allowed'));
          },
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
          allowedHeaders: [
              'Content-Type',
              'Authorization',
              'x-orgurl',
              'x-pat',
              'x-project',
              'x-backend-key'
          ],
          preflightContinue: false,
          optionsSuccessStatus: 200
      };

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ⚡ PERFORMANCE: Enable gzip compression for all responses
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    },
    level: 6 // balance between speed and compression ratio
}));

app.use((req, res, next) => {
    res.header('Vary', 'Origin');
    next();
});

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging Middleware (Azure-compatible structured logging)
app.use((req, res, next) => {
    const requestId = req.get('x-request-id') || `req-${Date.now()}`;
    res.setHeader('X-Request-ID', requestId);
    
    // ⚡ PERFORMANCE: Add caching headers for API responses
    // Cache GET requests for 60 seconds by default
    if (req.method === 'GET') {
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
        res.setHeader('Vary', 'Accept-Encoding');
    } else {
        // Don't cache mutations
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    
    const childLogger = logger.createChild({ invocationId: requestId });
    childLogger.info(`${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// =====================
// Routes
// =====================

// Health Check
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'BOLTEST Backend API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: config.env,
        endpoints: {
            auth: '/api/auth',
            testCases: '/api/testcases'
        }
    });
});

// API Health Check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        clientsInitialized: clientManager.isInitialized()
    });
});

// Auth Routes
app.use('/api/auth', authRoutes);

// Test Cases Routes
app.use('/api/testcases', testCaseRoutes);

// Projects (ADO)
app.use('/api/projects', projectsRoutes);

// General Work Items
app.use('/api/workitems', workItemsRoutes);

// ADO routes
app.use('/api/ado', adoRoutes);

// Context tools
app.use('/api', contextToolsRoutes);

// Mirror/search endpoints
app.use('/api/mirror', mirrorRoutes);

// Admin routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Attachments
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
const attachmentsRoutes = require('./routes/attachments');
const attachmentsSyncRoutes = require('./routes/attachments-sync');
app.use('/api/attachments', attachmentsSyncRoutes);  // Use new sync routes

// Wiki Attachments
app.use('/api/wiki-attachments', wikiAttachmentsRoutes);

// Classification Nodes
app.use('/api/classificationnodes', classificationNodesRoutes);

// Test Suites
app.use('/api/test-suites', testSuitesRoutes);

// Test Plans
app.use('/api/test-plans', testPlansRoutes);

// Shared Parameters
app.use('/api/shared-parameters', sharedParametersRoutes);

// Sprint Analytics (sample/stubbed payloads)
app.use('/api/SprintAnalytics', sprintAnalyticsRoutes);

// =====================
// Error Handling
// =====================

// 404 Handler
app.use((req, res) => {
    logger.warn(`Route not found: ${req.method} ${req.path}`);
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', err);
    
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal server error';
    
    res.status(statusCode).json({
        success: false,
        message: message,
        error: config.isDevelopment ? err.message : undefined,
        timestamp: new Date().toISOString()
    });
});

// =====================
// Start Server
// =====================

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function listenOnce(port) {
    return new Promise((resolve, reject) => {
        const server = http.createServer(app);
        server.once('error', (err) => reject(err));
        server.listen(port, () => resolve(server));
    });
}

async function listenWithRetry(port) {
    const isDev = config.isDevelopment || process.env.NODE_ENV !== 'production';
    const maxRetries = Number(process.env.PORT_BIND_RETRIES || (isDev ? 12 : 0));
    const delayMs = Number(process.env.PORT_BIND_RETRY_DELAY_MS || 600);

    let lastErr;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                logger.warn(`Retrying port bind on ${port} (attempt ${attempt}/${maxRetries})`);
            }
            return await listenOnce(port);
        } catch (err) {
            lastErr = err;
            if (err && err.code === 'EADDRINUSE' && attempt < maxRetries) {
                await sleep(delayMs);
                continue;
            }
            throw err;
        }
    }
    throw lastErr;
}

async function startServer() {
    try {
        // Run startup hook first
        await startupHook();

        const server = await listenWithRetry(PORT);
        logger.info('='.repeat(70));
        logger.info('BOLTEST Backend Server Started!');
        logger.info('='.repeat(70));
        logger.info(`Server running on: http://localhost:${PORT}`, { 
            port: PORT,
            environment: config.env
        });
        logger.info(`Azure DevOps Project: ${config.ado.project}`);
        logger.info(`Clients initialized: ${clientManager.isInitialized()}`);
        logger.info('='.repeat(70));

        // Safety net: handle unexpected server errors
        server.on('error', async (err) => {
            if (err && err.code === 'EADDRINUSE') {
                logger.error(`Port ${PORT} is already in use.`, {
                    code: err.code,
                    port: PORT,
                    hint: 'Stop the other backend instance or change PORT in .env'
                });
                try {
                    await clientManager.cleanup();
                } catch {
                    // best-effort
                }
                process.exit(1);
            }
            throw err;
        });

        // Graceful Shutdown Hook (Azure Functions pattern)
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received: graceful shutdown');
            server.close(async () => {
                await clientManager.cleanup();
                logger.info('Server shut down gracefully');
                process.exit(0);
            });
        });

        process.on('SIGINT', async () => {
            logger.info('SIGINT received: graceful shutdown');
            server.close(async () => {
                await clientManager.cleanup();
                logger.info('Server shut down gracefully');
                process.exit(0);
            });
        });

        // Unhandled error handler
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', { promise, reason });
        });

        process.on('uncaughtException', (err) => {
            logger.error('Uncaught Exception:', err);
            process.exit(1);
        });

        return;

        // NOTE: legacy listen block removed
        /*
        const server = app.listen(PORT, () => {
            logger.info('='.repeat(70));
            logger.info('BOLTEST Backend Server Started!');
            logger.info('='.repeat(70));
            logger.info(`Server running on: http://localhost:${PORT}`, { 
                port: PORT,
                environment: config.env
            });
            logger.info(`Azure DevOps Project: ${config.ado.project}`);
            logger.info(`Clients initialized: ${clientManager.isInitialized()}`);
            logger.info('='.repeat(70));

        */
    } catch (error) {
        logger.error('Failed to start server', error);
        process.exit(1);
    }
}

startServer();