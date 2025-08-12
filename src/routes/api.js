/**
 * API Routes
 * Define all API endpoints
 */

'use strict';

const express = require('express');
const { CONFIG } = require('../config');
const { validateUpdateRequest, validateRateLimit, validateJSON } = require('../middleware/validation');

function createApiRoutes(streamController) {
  const router = express.Router();

  // Apply global middleware
  router.use(validateJSON());
  router.use(validateRateLimit());

  // Update stream endpoint (POST /api/update)
  router.post('/update', 
    validateUpdateRequest(CONFIG.fifos.layers.length),
    (req, res) => streamController.updateStream(req, res)
  );

  // Get stream status (GET /api/status)
  router.get('/status', (req, res) => streamController.getStatus(req, res));

  // Get stream information (GET /api/info)
  router.get('/info', (req, res) => streamController.getStreamInfo(req, res));

  // Health check endpoint (GET /api/health)
  router.get('/health', (req, res) => streamController.healthCheck(req, res));

  // FFmpeg logs endpoints
  router.get('/logs', (req, res) => streamController.getLogs(req, res));
  router.delete('/logs', (req, res) => streamController.clearLogs(req, res));
  router.get('/logs/stream', (req, res) => streamController.streamLogs(req, res));

  // ZeroMQ logs endpoints
  router.get('/zmq/logs', (req, res) => streamController.getZmqLogs(req, res));
  router.delete('/zmq/logs', (req, res) => streamController.clearZmqLogs(req, res));
  router.get('/zmq/logs/stream', (req, res) => streamController.streamZmqLogs(req, res));

  return router;
}

module.exports = createApiRoutes;