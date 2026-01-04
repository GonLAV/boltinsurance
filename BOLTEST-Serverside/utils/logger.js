const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

class Logger {
    static info(message, data = null) {
        console.log(
            `${colors.cyan}[INFO]${colors.reset} ${new Date().toISOString()} - ${message}`,
            data ? data : ''
        );
    }

    static success(message, data = null) {
        console.log(
            `${colors.green}[SUCCESS]${colors.reset} ${new Date().toISOString()} - ${message}`,
            data ? data : ''
        );
    }

    static error(message, error = null) {
        console.error(
            `${colors.red}[ERROR]${colors.reset} ${new Date().toISOString()} - ${message}`,
            error ? error : ''
        );
    }

    static warn(message, data = null) {
        console.warn(
            `${colors.yellow}[WARN]${colors.reset} ${new Date().toISOString()} - ${message}`,
            data ? data : ''
        );
    }

    static debug(message, data = null) {
        if (process.env.NODE_ENV === 'development') {
            console.log(
                `${colors.magenta}[DEBUG]${colors.reset} ${new Date().toISOString()} - ${message}`,
                data ? data : ''
            );
        }
    }
}

module.exports = Logger;