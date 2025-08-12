/**
 * Request Validation Middleware
 */

'use strict';

const path = require('path');
const logger = require('../utils/logger');

/**
 * Validate file path for security
 */
function validateFilePath(filePath, allowedDir = null) {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: 'File path must be a non-empty string' };
  }

  // Prevent directory traversal attacks
  const normalizedPath = path.normalize(filePath);
  if (normalizedPath.includes('..')) {
    return { valid: false, error: 'Directory traversal is not allowed' };
  }

  // Check against allowed directory if specified
  if (allowedDir) {
    const resolved = path.resolve(normalizedPath);
    const allowedResolved = path.resolve(allowedDir);
    if (!resolved.startsWith(allowedResolved)) {
      return { valid: false, error: 'File path is outside allowed directory' };
    }
  }

  return { valid: true };
}

/**
 * Validate layer index
 */
function validateLayerIndex(index, maxLayers) {
  if (typeof index !== 'number' || !Number.isInteger(index)) {
    return { valid: false, error: 'Layer index must be an integer' };
  }

  if (index < 0 || index >= maxLayers) {
    return { valid: false, error: `Layer index must be between 0 and ${maxLayers - 1}` };
  }

  return { valid: true };
}

/**
 * Validate ZMQ command
 */
function validateZmqCommand(command) {
  if (!command || typeof command !== 'string') {
    return { valid: false, error: 'Command must be a non-empty string' };
  }

  // Basic command format validation
  if (command.length > 1000) {
    return { valid: false, error: 'Command is too long (max 1000 characters)' };
  }

  // Prevent potentially dangerous commands
  const dangerousPatterns = [
    /system\s*\(/,
    /exec\s*\(/,
    /eval\s*\(/,
    /\$\(/,
    /`/,
    /;/,
    /\|\|/,
    /&&/
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      return { valid: false, error: 'Command contains potentially dangerous patterns' };
    }
  }

  return { valid: true };
}

/**
 * Middleware to validate update requests
 */
function validateUpdateRequest(maxLayers = 2) {
  return (req, res, next) => {
    const { type, data } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: type'
      });
    }

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: data'
      });
    }

    let validation;

    switch (type) {
      case 'content':
        validation = validateFilePath(data);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: `Content validation failed: ${validation.error}`
          });
        }
        break;

      case 'layer':
        if (!data.index && data.index !== 0) {
          return res.status(400).json({
            success: false,
            message: 'Layer update requires index field'
          });
        }

        if (!data.path) {
          return res.status(400).json({
            success: false,
            message: 'Layer update requires path field'
          });
        }

        validation = validateLayerIndex(data.index, maxLayers);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: `Layer index validation failed: ${validation.error}`
          });
        }

        validation = validateFilePath(data.path);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: `Layer path validation failed: ${validation.error}`
          });
        }
        break;

      case 'filter':
        if (!data.command) {
          return res.status(400).json({
            success: false,
            message: 'Filter update requires command field'
          });
        }

        validation = validateZmqCommand(data.command);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: `Filter command validation failed: ${validation.error}`
          });
        }
        break;

      case 'background':
        if (data.color && typeof data.color !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'Background update requires color to be a string'
          });
        }

        if (data.text && typeof data.text !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'Background update requires text to be a string'
          });
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          message: `Invalid update type: ${type}. Valid types are: content, layer, filter, background`
        });
    }

    // Log the validated request
    logger.debug(`Validated ${type} update request`, { type, data: typeof data === 'object' ? JSON.stringify(data) : data });

    next();
  };
}

/**
 * Middleware to validate request rate limiting
 */
function validateRateLimit() {
  const requests = new Map();
  const windowMs = 60000; // 1 minute
  const maxRequests = 30; // 30 requests per minute

  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requests.has(clientIp)) {
      requests.set(clientIp, []);
    }

    const clientRequests = requests.get(clientIp);
    
    // Remove old requests outside the window
    const validRequests = clientRequests.filter(timestamp => now - timestamp < windowMs);
    requests.set(clientIp, validRequests);

    if (validRequests.length >= maxRequests) {
      logger.warn(`Rate limit exceeded for IP: ${clientIp}`);
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Add current request
    validRequests.push(now);
    requests.set(clientIp, validRequests);

    next();
  };
}

/**
 * Middleware to validate JSON request body
 */
function validateJSON() {
  return (req, res, next) => {
    if (req.method === 'POST' && req.is('application/json')) {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON payload'
        });
      }
    }
    next();
  };
}

module.exports = {
  validateFilePath,
  validateLayerIndex,
  validateZmqCommand,
  validateUpdateRequest,
  validateRateLimit,
  validateJSON
};