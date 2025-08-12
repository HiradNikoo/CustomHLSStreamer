/**
 * Stream Controller
 * Handles API endpoints for stream management
 */

'use strict';

const logger = require('../utils/logger');

class StreamController {
  constructor(fifoService, zmqService, ffmpegService, hlsService) {
    this.fifoService = fifoService;
    this.zmqService = zmqService;
    this.ffmpegService = ffmpegService;
    this.hlsService = hlsService;
  }

  /**
   * Handle stream updates (content, layer, filter)
   */
  async updateStream(req, res) {
    const { type, data } = req.body;
    
    try {
      let result;
      let message;

      switch (type) {
        case 'content':
          result = await this.fifoService.writeContent(data);
          message = result ? 'Content updated successfully' : 'Failed to update content';
          break;
          
        case 'layer':
          const { index, path: layerPath } = data;
          result = await this.fifoService.writeLayer(index, layerPath);
          message = result ? `Layer ${index} updated successfully` : `Failed to update layer ${index}`;
          break;
          
        case 'filter':
          const { command } = data;
          result = await this.zmqService.sendInstruction(command);
          message = result ? 'Filter command sent successfully' : 'Failed to send filter command';
          break;
          
        default:
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid update type. Use: content, layer, or filter',
            validTypes: ['content', 'layer', 'filter']
          });
      }

      res.json({ 
        success: result, 
        message,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Stream update error:', error.message);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get stream status
   */
  getStatus(req, res) {
    try {
      const ffmpegRunning = this.ffmpegService.isRunning();
      const zmqConnected = this.zmqService.isConnected();
      const hlsGenerating = this.hlsService.isGeneratingSegments();
      
      // Calculate overall health based on service status
      const healthy = ffmpegRunning && zmqConnected && hlsGenerating;
      
      const status = {
        ffmpeg: ffmpegRunning ? 'running' : 'stopped',
        zmq: zmqConnected ? 'connected' : 'disconnected',
        hls: {
          generating: hlsGenerating,
          segmentCount: this.hlsService.getCurrentSegmentCount()
        },
        healthy: healthy,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        config: {
          layers: 2, // CONFIG.fifos.layers.length 
          hlsSegmentTime: 2, // CONFIG.hls.segmentTime
          hlsPlaylistSize: 5, // CONFIG.hls.playlistSize
          platform: process.platform
        },
        timestamp: new Date().toISOString()
      };

      res.json(status);
    } catch (error) {
      logger.error('Status error:', error.message);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get status',
        error: error.message
      });
    }
  }

  /**
   * Get stream information
   */
  getStreamInfo(req, res) {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const streamUrl = this.hlsService.getStreamUrl(baseUrl);

      res.json({
        streamUrl,
        dashboardUrl: `${baseUrl}/`,
        apiEndpoints: {
          update: `${baseUrl}/api/update`,
          status: `${baseUrl}/api/status`,
          info: `${baseUrl}/api/info`
        },
        usage: {
          updateContent: {
            method: 'POST',
            url: `${baseUrl}/api/update`,
            body: {
              type: 'content',
              data: '/path/to/video.mp4'
            }
          },
          updateLayer: {
            method: 'POST',
            url: `${baseUrl}/api/update`,
            body: {
              type: 'layer',
              data: {
                index: 0,
                path: '/path/to/overlay.png'
              }
            }
          },
          sendFilter: {
            method: 'POST',
            url: `${baseUrl}/api/update`,
            body: {
              type: 'filter',
              data: {
                command: 'Parsed_overlay_1 x=200:y=300'
              }
            }
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Stream info error:', error.message);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get stream info',
        error: error.message
      });
    }
  }

  /**
   * Health check endpoint
   */
  healthCheck(req, res) {
    const isHealthy = this.ffmpegService.isRunning() && this.zmqService.isConnected();
    
    res.status(isHealthy ? 200 : 503).json({
      healthy: isHealthy,
      services: {
        ffmpeg: this.ffmpegService.isRunning(),
        zmq: this.zmqService.isConnected(),
        hls: this.hlsService.isGeneratingSegments()
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get FFmpeg logs
   */
  getLogs(req, res) {
    try {
      const logs = this.ffmpegService.getLogs();
      res.json({
        success: true,
        logs: logs,
        totalLogs: logs.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Get logs error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get logs',
        error: error.message
      });
    }
  }

  /**
   * Clear FFmpeg logs
   */
  clearLogs(req, res) {
    try {
      this.ffmpegService.clearLogs();
      res.json({
        success: true,
        message: 'Logs cleared successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Clear logs error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to clear logs',
        error: error.message
      });
    }
  }

  /**
   * Stream FFmpeg logs via Server-Sent Events (SSE)
   */
  streamLogs(req, res) {
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    // Send existing logs
    const existingLogs = this.ffmpegService.getLogs();
    for (const log of existingLogs) {
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    }

    // Subscribe to new logs
    const unsubscribe = this.ffmpegService.onLog((logEntry) => {
      res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
    });

    // Handle client disconnect
    req.on('close', () => {
      unsubscribe();
    });

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
    });
  }
}

module.exports = StreamController;