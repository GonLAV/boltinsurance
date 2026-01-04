/**
 * Azure-compatible structured logger
 * Provides context-aware logging suitable for Azure Application Insights
 * Compatible with Azure Functions logging patterns
 */

class AzureLogger {
    constructor(context = null) {
        this.context = context;
        this.invocationId = context?.invocationId || `local-${Date.now()}`;
    }

    /**
     * Log at trace level (most verbose)
     */
    trace(message, data = null) {
        const logEntry = this._formatLog('TRACE', message, data);
        console.log(logEntry);
    }

    /**
     * Log at debug level
     */
    debug(message, data = null) {
        const logEntry = this._formatLog('DEBUG', message, data);
        console.log(logEntry);
    }

    /**
     * Log at info level (default)
     */
    info(message, data = null) {
        const logEntry = this._formatLog('INFO', message, data);
        console.log(logEntry);
    }

    /**
     * Log at warn level
     */
    warn(message, data = null) {
        const logEntry = this._formatLog('WARN', message, data);
        console.warn(logEntry);
    }

    /**
     * Log at error level
     */
    error(message, error = null) {
        const errorData = error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
        } : error;
        const logEntry = this._formatLog('ERROR', message, errorData);
        console.error(logEntry);
    }

    /**
     * Format log entry for structured logging
     * Compatible with Azure Application Insights
     */
    _formatLog(level, message, data) {
        const timestamp = new Date().toISOString();
        const entry = {
            timestamp,
            level,
            message,
            invocationId: this.invocationId
        };

        if (data) {
            entry.data = data;
        }

        return JSON.stringify(entry);
    }

    /**
     * Create a child logger with additional context
     */
    createChild(context) {
        const child = new AzureLogger(this.context);
        child.invocationId = context?.invocationId || this.invocationId;
        return child;
    }
}

// Export singleton instance for module-level logging
const globalLogger = new AzureLogger();

module.exports = AzureLogger;
module.exports.globalLogger = globalLogger;
