/**
 * Logging Utilities
 * Centralized logging functionality with different levels
 */

'use strict';

const { CONFIG } = require('../config');

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLogLevel = LOG_LEVELS[CONFIG.logging.level] || LOG_LEVELS.info;

/**
 * Create formatted timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Log message with specific level
 */
function log(level, msg, ...args) {
  if (LOG_LEVELS[level] <= currentLogLevel) {
    const timestamp = getTimestamp();
    const levelUpper = level.toUpperCase();
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
      `[${levelUpper}] ${timestamp} - ${msg}`, ...args
    );
  }
}

const logger = {
  /**
   * Log info message
   */
  info: (msg, ...args) => log('info', msg, ...args),
  
  /**
   * Log warning message
   */
  warn: (msg, ...args) => log('warn', msg, ...args),
  
  /**
   * Log error message
   */
  error: (msg, ...args) => log('error', msg, ...args),
  
  /**
   * Log debug message
   */
  debug: (msg, ...args) => log('debug', msg, ...args),
  
  /**
   * Set log level
   */
  setLevel: (level) => {
    if (LOG_LEVELS.hasOwnProperty(level)) {
      CONFIG.logging.level = level;
    }
  },
  
  /**
   * Get current log level
   */
  getLevel: () => CONFIG.logging.level
};

module.exports = logger;