const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '..', 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

/**
 * Execution logger for tracking workflow execution logs
 */
class ExecutionLogger {
    constructor(executionId) {
        this.executionId = executionId;
        this.logFile = path.join(LOGS_DIR, `${executionId}.log`);
        this.logs = [];
    }

    log(level, message, metadata = {}) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...metadata
        };

        this.logs.push(entry);

        // Write to file
        const logLine = `[${entry.timestamp}] [${level.toUpperCase()}] ${message}\n`;
        fs.appendFileSync(this.logFile, logLine);

        return entry;
    }

    info(message, metadata) {
        return this.log('info', message, metadata);
    }

    error(message, metadata) {
        return this.log('error', message, metadata);
    }

    warn(message, metadata) {
        return this.log('warn', message, metadata);
    }

    debug(message, metadata) {
        return this.log('debug', message, metadata);
    }

    getLogs() {
        return this.logs;
    }

    getLogsFromFile() {
        if (!fs.existsSync(this.logFile)) {
            return [];
        }

        const content = fs.readFileSync(this.logFile, 'utf8');
        return content.split('\n').filter(line => line.trim());
    }
}

/**
 * Get logs for an execution
 */
function getExecutionLogs(executionId) {
    const logFile = path.join(LOGS_DIR, `${executionId}.log`);

    if (!fs.existsSync(logFile)) {
        return [];
    }

    const content = fs.readFileSync(logFile, 'utf8');
    return content.split('\n').filter(line => line.trim());
}

module.exports = {
    ExecutionLogger,
    getExecutionLogs
};
