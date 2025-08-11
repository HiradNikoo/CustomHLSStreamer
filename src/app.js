#!/usr/bin/env node

/**
 * Custom HLS Streamer - Main Application
 * 
 * Production-ready Node.js application for creating highly customizable 
 * live HLS streams with real-time content updates using FFmpeg, named 
 * pipes (FIFOs), and ZeroMQ.
 */

'use strict';

const express = require('express');
const path = require('path');
const { CONFIG, validateConfig } = require('./config');
const logger = require('./utils/logger');
const ShutdownHandler = require('./utils/shutdown');

// Services
const FifoService = require('./services/fifoService');
const ZmqService = require('./services/zmqService');
const HlsService = require('./services/hlsService');
const FFmpegService = require('./services/ffmpegService');

// Controllers and Routes
const StreamController = require('./controllers/streamController');
const createApiRoutes = require('./routes/api');

class HLSStreamerApp {
  constructor() {
    this.app = express();
    this.httpServer = null;
    this.shutdownHandler = new ShutdownHandler();
    
    // Initialize services
    this.fifoService = new FifoService();
    this.zmqService = new ZmqService();
    this.hlsService = new HlsService();
    this.ffmpegService = new FFmpegService(this.fifoService, this.hlsService);
    
    // Initialize controller
    this.streamController = new StreamController(
      this.fifoService,
      this.zmqService,
      this.ffmpegService,
      this.hlsService
    );
  }

  /**
   * Setup Express application
   */
  setupExpress() {
    // Trust proxy for proper IP detection
    this.app.set('trust proxy', 1);

    // Basic middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Serve static files from public directory
    const publicDir = path.join(__dirname, '..', 'public');
    this.app.use(express.static(publicDir));

    // CORS headers for HLS streaming
    this.app.use('/hls', (req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.header('Pragma', 'no-cache');
      res.header('Expires', '0');
      next();
    });

    // Serve HLS files
    this.app.use('/hls', express.static(CONFIG.hls.outputDir));

    // API routes
    this.app.use('/api', createApiRoutes(this.streamController));

    // Root endpoint - basic dashboard
    this.app.get('/', (req, res) => {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const streamUrl = `${baseUrl}/hls/${CONFIG.hls.playlistName}`;
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Custom HLS Streamer</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script src="https://vjs.zencdn.net/7.18.1/video.min.js"></script>
          <link href="https://vjs.zencdn.net/7.18.1/video-js.css" rel="stylesheet">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { background: #333; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .player-container { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .api-section { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .endpoint { margin: 15px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #007bff; }
            .method { display: inline-block; background: #007bff; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 10px; }
            .url { font-family: monospace; background: #e9ecef; padding: 2px 6px; border-radius: 3px; }
            pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
            .status { margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎥 Custom HLS Streamer Dashboard</h1>
              <p>Real-time HLS streaming with dynamic content updates</p>
            </div>
            
            <div class="player-container">
              <h2>Live Stream</h2>
              <video-js 
                id="my-video" 
                class="video-js" 
                controls 
                preload="auto" 
                width="800" 
                height="450" 
                data-setup='{}'>
                <source src="${streamUrl}" type="application/x-mpegURL">
                <p>Your browser doesn't support HLS playback.</p>
              </video-js>
              <div class="status">
                <strong>Stream URL:</strong> <span class="url">${streamUrl}</span>
              </div>
            </div>
            
            <div class="api-section">
              <h2>API Endpoints</h2>
              
              <div class="endpoint">
                <span class="method">POST</span>
                <span class="url">${baseUrl}/api/update</span>
                <h4>Update Content</h4>
                <pre>{
  "type": "content",
  "data": "/path/to/new-video.mp4"
}</pre>
              </div>
              
              <div class="endpoint">
                <span class="method">POST</span>
                <span class="url">${baseUrl}/api/update</span>
                <h4>Update Layer</h4>
                <pre>{
  "type": "layer",
  "data": {
    "index": 0,
    "path": "/path/to/overlay.png"
  }
}</pre>
              </div>
              
              <div class="endpoint">
                <span class="method">POST</span>
                <span class="url">${baseUrl}/api/update</span>
                <h4>Send Filter Command</h4>
                <pre>{
  "type": "filter",
  "data": {
    "command": "Parsed_overlay_1 x=200:y=300"
  }
}</pre>
              </div>
              
              <div class="endpoint">
                <span class="method">GET</span>
                <span class="url">${baseUrl}/api/status</span>
                <h4>Get Status</h4>
                <p>Returns current status of all services</p>
              </div>
              
              <div class="endpoint">
                <span class="method">GET</span>
                <span class="url">${baseUrl}/api/health</span>
                <h4>Health Check</h4>
                <p>Returns health status for monitoring</p>
              </div>
            </div>
          </div>
          
          <script>
            // Initialize Video.js player
            const player = videojs('my-video', {
              liveui: true,
              responsive: true,
              fluid: true
            });
            
            // Auto-reload on errors (for live streams)
            player.on('error', () => {
              console.log('Stream error, reloading in 5 seconds...');
              setTimeout(() => {
                player.src('${streamUrl}');
                player.load();
              }, 5000);
            });
            
            // Refresh status every 30 seconds
            setInterval(async () => {
              try {
                const response = await fetch('${baseUrl}/api/status');
                const status = await response.json();
                console.log('Stream Status:', status);
              } catch (error) {
                console.error('Failed to fetch status:', error);
              }
            }, 30000);
          </script>
        </body>
        </html>
      `);
    });

    // Error handling middleware
    this.app.use((error, req, res, next) => {
      logger.error('Express error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found'
      });
    });
  }

  /**
   * Start HTTP server
   */
  startHttpServer() {
    return new Promise((resolve, reject) => {
      this.httpServer = this.app.listen(CONFIG.http.port, CONFIG.http.host, () => {
        logger.info(`HTTP server listening on http://${CONFIG.http.host}:${CONFIG.http.port}`);
        logger.info(`HLS stream available at: http://${CONFIG.http.host}:${CONFIG.http.port}/hls/${CONFIG.hls.playlistName}`);
        resolve();
      });

      this.httpServer.on('error', (error) => {
        logger.error('HTTP server error:', error.message);
        reject(error);
      });

      // Register server with shutdown handler
      this.shutdownHandler.registerHttpServer(this.httpServer);
    });
  }

  /**
   * Initialize all services
   */
  async initializeServices() {
    logger.info('Initializing services...');

    // Setup HLS directory
    this.hlsService.setupDirectory();

    // Create FIFOs
    await this.fifoService.createAll();

    // Initialize ZeroMQ
    await this.zmqService.initialize();

    // Start HLS cleanup scheduler
    this.hlsService.startCleanupScheduler();

    logger.info('Services initialized successfully');
  }

  /**
   * Start the application
   */
  async start() {
    try {
      logger.info('Starting Custom HLS Streamer...');

      // Validate configuration
      validateConfig();
      logger.info('Configuration validated successfully');

      // Setup Express application
      this.setupExpress();

      // Initialize services
      await this.initializeServices();

      // Start HTTP server
      await this.startHttpServer();

      // Initialize content
      await this.ffmpegService.initializeContent();

      // Start FFmpeg (with a small delay to ensure FIFOs are ready)
      setTimeout(async () => {
        await this.ffmpegService.start();
      }, 2000);

      // Register services with shutdown handler
      this.shutdownHandler.registerService({
        ffmpegService: this.ffmpegService,
        zmqService: this.zmqService,
        fifoService: this.fifoService,
        hlsService: this.hlsService
      });

      // Setup signal handlers
      this.shutdownHandler.setupSignalHandlers();

      logger.info('Custom HLS Streamer started successfully!');
      logger.info(`Dashboard: http://${CONFIG.http.host}:${CONFIG.http.port}/`);
      logger.info(`Stream URL: http://${CONFIG.http.host}:${CONFIG.http.port}/hls/${CONFIG.hls.playlistName}`);

    } catch (error) {
      logger.error('Failed to start application:', error.message);
      process.exit(1);
    }
  }
}

// Export main functions for external use or testing
module.exports = {
  HLSStreamerApp,
  updateContent: (fifoService, filePath) => fifoService.writeContent(filePath),
  updateLayer: (fifoService, index, filePath) => fifoService.writeLayer(index, filePath),
  sendInstruction: (zmqService, command) => zmqService.sendInstruction(command),
  CONFIG
};

// Start the application if this file is run directly
if (require.main === module) {
  const app = new HLSStreamerApp();
  app.start();
}