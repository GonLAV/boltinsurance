/**
 * Environment Configuration
 * Supports local development and Azure deployment
 * 
 * Order of precedence:
 * 1. Environment variables
 * 2. .env file (via dotenv)
 * 3. local.settings.json (for Azure local development)
 * 4. Defaults
 */

require('dotenv').config();

const config = {
    // Server Configuration
    port: parseInt(process.env.PORT || '5000', 10),
    env: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV !== 'production',

    // Azure DevOps Configuration
    ado: {
        orgUrl: process.env.AZDO_ORG_URL || '',
        project: process.env.AZDO_PROJECT || 'Epos',
        apiVersion: process.env.AZDO_API_VERSION || '5.0',
        pat: process.env.AZDO_PAT || '', // Should be set via environment
    },

    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    },

    // CORS Configuration
    cors: {
        skipCors: String(process.env.SKIP_CORS || 'false').toLowerCase() === 'true',
        // Support multiple origins via comma-separated ALLOWED_ORIGINS
        allowedOrigins: (() => {
            const defaults = ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3008'];
            const extraRaw = (process.env.ALLOWED_ORIGINS || '').toString();
            const extras = extraRaw
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            return [...defaults, ...extras];
        })(),
    },

    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'info'),
        format: process.env.LOG_FORMAT || 'json', // 'json' or 'text'
    },

    // File Upload Configuration
    uploads: {
        maxSize: parseInt(process.env.MAX_UPLOAD_SIZE || '52428800', 10), // 50MB default
        uploadDir: process.env.UPLOAD_DIR || './uploads',
    },

    // Database Configuration (if needed)
    database: {
        url: process.env.DATABASE_URL || '',
    },

    // Application Insights (Azure Monitor)
    appInsights: {
        enabled: String(process.env.APPINSIGHTS_ENABLED || 'false').toLowerCase() === 'true',
        instrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATION_KEY || '',
    },

    // Persistent cache settings
    cache: {
        dir: process.env.CACHE_DIR || './data/cache',
        ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '120', 10)
    }
};

/**
 * Validate critical configuration
 */
function validateConfig() {
    if (config.isProduction) {
        if (!config.jwt.secret || config.jwt.secret === 'your-super-secret-key-change-in-production') {
            throw new Error('JWT_SECRET must be set in production');
        }
        if (!config.ado.pat) {
            throw new Error('AZDO_PAT (Azure DevOps PAT) must be set in production');
        }
    }
}

// Validate on load
validateConfig();

module.exports = config;
