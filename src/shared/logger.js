/**
 * Centralized logging system for Octopi WeTTY System
 * Provides structured logging with different transports and audit trails
 */

import winston from 'winston';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure logs directory exists
const logsDir = resolve(__dirname, '../../logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom log format with colors and timestamps
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, service, agentId, ...meta }) => {
    let log = `${timestamp} [${level}]`;
    if (service) log += ` [${service}]`;
    if (agentId) log += ` [Agent:${agentId}]`;
    log += `: ${message}`;
    
    // Add metadata if present
    const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return log + metaString;
  })
);

/**
 * Create logger instance with configuration
 * @param {object} config - Logger configuration
 * @returns {winston.Logger} Configured logger instance
 */
function createLogger(config = {}) {
  const {
    level = 'info',
    file = 'logs/octopi.log',
    maxSize = '50MB',
    maxFiles = 10,
    auditTrail = true
  } = config;

  const transports = [
    // Console transport
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'development' ? 'debug' : level,
      format: consoleFormat
    }),
    
    // File transport for general logs
    new winston.transports.File({
      filename: resolve(__dirname, '../../', file),
      level,
      format: logFormat,
      maxsize: parseSize(maxSize),
      maxFiles,
      tailable: true
    })
  ];

  // Add audit trail transport if enabled
  if (auditTrail) {
    transports.push(
      new winston.transports.File({
        filename: resolve(__dirname, '../../logs/audit.log'),
        level: 'info',
        format: logFormat,
        maxsize: parseSize(maxSize),
        maxFiles,
        tailable: true
      })
    );
  }

  return winston.createLogger({
    level,
    format: logFormat,
    defaultMeta: { service: 'octopi-system' },
    transports,
    exitOnError: false
  });
}

/**
 * Parse size string to bytes
 * @param {string} size - Size string (e.g., '50MB')
 * @returns {number} Size in bytes
 */
function parseSize(size) {
  const units = { KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
  const match = size.match(/^(\d+)(KB|MB|GB)$/i);
  if (match) {
    return parseInt(match[1]) * units[match[2].toUpperCase()];
  }
  return parseInt(size) || 50 * 1024 * 1024; // Default 50MB
}

// Create default logger instance
let logger;

/**
 * Initialize logger with configuration
 * @param {object} config - Logger configuration
 */
export function initLogger(config) {
  logger = createLogger(config);
}

/**
 * Get logger instance
 * @returns {winston.Logger} Logger instance
 */
export function getLogger() {
  if (!logger) {
    logger = createLogger(); // Create with defaults
  }
  return logger;
}

/**
 * Create child logger with additional context
 * @param {object} context - Additional context (service, agentId, etc.)
 * @returns {winston.Logger} Child logger with context
 */
export function createChildLogger(context) {
  const parentLogger = getLogger();
  return parentLogger.child(context);
}

/**
 * Log agent activity for audit trail
 * @param {string} agentId - Agent identifier
 * @param {string} action - Action performed
 * @param {object} details - Action details
 */
export function logAgentActivity(agentId, action, details = {}) {
  const auditLogger = getLogger();
  auditLogger.info('Agent activity', {
    type: 'audit',
    agentId,
    action,
    timestamp: new Date().toISOString(),
    ...details
  });
}

/**
 * Log system event
 * @param {string} event - Event type
 * @param {object} data - Event data
 */
export function logSystemEvent(event, data = {}) {
  const systemLogger = getLogger();
  systemLogger.info(`System event: ${event}`, {
    type: 'system',
    event,
    timestamp: new Date().toISOString(),
    ...data
  });
}

/**
 * Log agent handoff
 * @param {string} fromAgent - Source agent ID
 * @param {string} toAgent - Target agent ID
 * @param {string} taskId - Task identifier
 * @param {object} context - Handoff context
 */
export function logAgentHandoff(fromAgent, toAgent, taskId, context = {}) {
  const handoffLogger = getLogger();
  handoffLogger.info('Agent handoff', {
    type: 'handoff',
    fromAgent,
    toAgent,
    taskId,
    timestamp: new Date().toISOString(),
    ...context
  });
}

/**
 * Log performance metrics
 * @param {string} metric - Metric name
 * @param {number} value - Metric value
 * @param {object} labels - Metric labels
 */
export function logMetric(metric, value, labels = {}) {
  const metricsLogger = getLogger();
  metricsLogger.debug('Performance metric', {
    type: 'metric',
    metric,
    value,
    labels,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log error with context
 * @param {Error} error - Error object
 * @param {object} context - Error context
 */
export function logError(error, context = {}) {
  const errorLogger = getLogger();
  errorLogger.error('System error', {
    type: 'error',
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  });
}

// Export logger instance directly for convenience
export { logger };