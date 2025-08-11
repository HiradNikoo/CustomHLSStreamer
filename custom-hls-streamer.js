#!/usr/bin/env node

/**
 * Custom HLS Streamer - Production-ready Node.js application
 * 
 * Creates a highly customizable live HLS stream where content can be updated in real-time
 * without disrupting the continuous stream using FFmpeg, named pipes (FIFOs), and ZeroMQ.
 * 
 * Features:
 * - Dynamic content switching via named pipes
 * - Real-time filter adjustments via ZeroMQ
 * - Layered overlays (extensible)
 * - HLS output with automatic segment cleanup
 * - Express.js HTTP server for serving streams
 * - Production-ready error handling and logging
 * 
 * Author: AI Assistant
 * License: MIT
 */

'use strict';

// Core Node.js modules
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

// External dependencies (install via: npm install express zeromq)
const express = require('express');
const zmq = require('zeromq');

// Promisify exec for async/await usage
const execAsync = util.promisify(exec);

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Server configuration
  http: {
    port: 3000,
    host: '0.0.0.0'
  },
  
  // ZeroMQ configuration
  zmq: {
    port: 5555,
    protocol: 'tcp'
  },
  
  // FFmpeg configuration
  ffmpeg: {
    binary: 'ffmpeg',
    preset: 'ultrafast',
    crf: 23,
    gop: 48,
    audioBitrate: '128k'
  },
  
  // HLS configuration
  hls: {
    segmentTime: 2,
    playlistSize: 5,
    outputDir: './hls',
    segmentPattern: 'stream_%03d.ts',
    playlistName: 'stream.m3u8'
  },
  
  // FIFO configuration
  fifos: {
    baseDir: './fifos',
    content: 'content.fifo',
    layers: ['overlay1.fifo', 'overlay2.fifo'], // Extensible - add more as needed
  },
  
  // Initial content
  initialContent: './assets/default.mp4' // Change this to your default video
};

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

let ffmpegProcess = null;
let zmqSocket = null;
let httpServer = null;
let isShuttingDown = false;

// Track active FIFOs and their file descriptors
const activeFifos = new Map();

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

const logger = {
  info: (msg, ...args) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, ...args),
  debug: (msg, ...args) => console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`, ...args)
};

// ============================================================================
// FIFO MANAGEMENT
// ============================================================================

/**
 * Create all required named pipes (FIFOs) for streaming
 */
async function createFifos() {
  logger.info('Creating named pipes (FIFOs)...');
  
  // Ensure FIFO directory exists
  if (!fs.existsSync(CONFIG.fifos.baseDir)) {
    fs.mkdirSync(CONFIG.fifos.baseDir, { recursive: true });
  }
  
  // Create content FIFO
  const contentFifoPath = path.join(CONFIG.fifos.baseDir, CONFIG.fifos.content);
  await createSingleFifo(contentFifoPath);
  
  // Create layer FIFOs
  for (const layerFifo of CONFIG.fifos.layers) {
    const layerFifoPath = path.join(CONFIG.fifos.baseDir, layerFifo);
    await createSingleFifo(layerFifoPath);
  }
  
  logger.info(`Created ${1 + CONFIG.fifos.layers.length} FIFOs successfully`);
}

/**
 * Create a single named pipe
 */
async function createSingleFifo(fifoPath) {
  try {
    // Check if FIFO already exists
    if (fs.existsSync(fifoPath)) {
      const stats = fs.statSync(fifoPath);
      if (stats.isFIFO()) {
        logger.debug(`FIFO already exists: ${fifoPath}`);
        return;
      } else {
        // Remove if it's not a FIFO
        fs.unlinkSync(fifoPath);
      }
    }
    
    // Create the named pipe
    await execAsync(`mkfifo "${fifoPath}"`);
    logger.debug(`Created FIFO: ${fifoPath}`);
  } catch (error) {
    logger.error(`Failed to create FIFO ${fifoPath}:`, error.message);
    throw error;
  }
}

/**
 * Clean up all FIFOs
 */
function cleanupFifos() {
  logger.info('Cleaning up FIFOs...');
  
  // Close active FIFO file descriptors
  for (const [fifoPath, fd] of activeFifos) {
    try {
      if (fd && typeof fd.end === 'function') {
        fd.end();
      }
      logger.debug(`Closed FIFO: ${fifoPath}`);
    } catch (error) {
      logger.warn(`Error closing FIFO ${fifoPath}:`, error.message);
    }
  }
  activeFifos.clear();
  
  // Remove FIFO files
  try {
    const contentFifoPath = path.join(CONFIG.fifos.baseDir, CONFIG.fifos.content);
    if (fs.existsSync(contentFifoPath)) {
      fs.unlinkSync(contentFifoPath);
    }
    
    for (const layerFifo of CONFIG.fifos.layers) {
      const layerFifoPath = path.join(CONFIG.fifos.baseDir, layerFifo);
      if (fs.existsSync(layerFifoPath)) {
        fs.unlinkSync(layerFifoPath);
      }
    }
  } catch (error) {
    logger.warn('Error cleaning up FIFO files:', error.message);
  }
}

// ============================================================================
// HLS OUTPUT MANAGEMENT
// ============================================================================

/**
 * Setup HLS output directory
 */
function setupHlsDirectory() {
  if (!fs.existsSync(CONFIG.hls.outputDir)) {
    fs.mkdirSync(CONFIG.hls.outputDir, { recursive: true });
    logger.info(`Created HLS output directory: ${CONFIG.hls.outputDir}`);
  }
}

/**
 * Clean up old HLS segments (called periodically)
 */
function cleanupOldSegments() {
  try {
    const files = fs.readdirSync(CONFIG.hls.outputDir);
    const segments = files.filter(f => f.endsWith('.ts') && f.startsWith('stream_'));
    
    // Keep only recent segments (more than playlist size for safety)
    const keepCount = CONFIG.hls.playlistSize + 2;
    
    if (segments.length > keepCount) {
      // Sort by modification time (oldest first)
      const segmentsWithStats = segments.map(filename => ({
        filename,
        path: path.join(CONFIG.hls.outputDir, filename),
        mtime: fs.statSync(path.join(CONFIG.hls.outputDir, filename)).mtime
      })).sort((a, b) => a.mtime - b.mtime);
      
      // Delete oldest segments
      const toDelete = segmentsWithStats.slice(0, segments.length - keepCount);
      let deletedCount = 0;
      
      toDelete.forEach(({ path: segmentPath, filename }) => {
        try {
          fs.unlinkSync(segmentPath);
          deletedCount++;
        } catch (err) {
          logger.warn(`Failed to delete segment ${filename}:`, err.message);
        }
      });
      
      if (deletedCount > 0) {
        logger.debug(`Cleaned up ${deletedCount} old HLS segments`);
      }
    }
  } catch (error) {
    logger.warn('Failed to cleanup old segments:', error.message);
  }
}

// ============================================================================
// ZEROMQ SETUP
// ============================================================================

/**
 * Initialize ZeroMQ socket for sending commands to FFmpeg
 */
async function initializeZmq() {
  try {
    zmqSocket = new zmq.Push();
    const zmqAddress = `${CONFIG.zmq.protocol}://localhost:${CONFIG.zmq.port}`;
    
    await zmqSocket.bind(zmqAddress);
    logger.info(`ZeroMQ socket bound to ${zmqAddress}`);
    
    return zmqSocket;
  } catch (error) {
    logger.error('Failed to initialize ZeroMQ:', error.message);
    throw error;
  }
}

/**
 * Send instruction to FFmpeg via ZeroMQ
 */
async function sendInstruction(command) {
  if (!zmqSocket) {
    logger.error('ZeroMQ socket not initialized');
    return false;
  }
  
  try {
    await zmqSocket.send(command);
    logger.debug(`Sent ZMQ instruction: ${command}`);
    return true;
  } catch (error) {
    logger.error('Failed to send ZMQ instruction:', error.message);
    return false;
  }
}

// ============================================================================
// FFMPEG PROCESS MANAGEMENT
// ============================================================================

/**
 * Build FFmpeg command arguments for HLS streaming with dynamic inputs
 */
function buildFFmpegArgs() {
  const args = [];
  
  // Input arguments
  // Main content FIFO (using concat demuxer for seamless appending)
  args.push(
    '-f', 'concat',
    '-safe', '0',
    '-i', path.join(CONFIG.fifos.baseDir, CONFIG.fifos.content)
  );
  
  // Layer input FIFOs
  CONFIG.fifos.layers.forEach(layerFifo => {
    args.push('-i', path.join(CONFIG.fifos.baseDir, layerFifo));
  });
  
  // Build filter_complex for overlays and ZMQ
  const filterComplex = buildFilterComplex();
  args.push('-filter_complex', filterComplex);
  
  // Video encoding
  args.push(
    '-map', '[vout]',
    '-c:v', 'libx264',
    '-preset', CONFIG.ffmpeg.preset,
    '-crf', String(CONFIG.ffmpeg.crf),
    '-g', String(CONFIG.ffmpeg.gop),
    '-keyint_min', String(CONFIG.ffmpeg.gop),
    '-sc_threshold', '0',
    '-force_key_frames', `expr:gte(t,n_forced*${CONFIG.hls.segmentTime})`
  );
  
  // Audio encoding
  args.push(
    '-map', '[aout]',
    '-c:a', 'aac',
    '-b:a', CONFIG.ffmpeg.audioBitrate,
    '-ar', '48000'
  );
  
  // HLS output options
  args.push(
    '-f', 'hls',
    '-hls_time', String(CONFIG.hls.segmentTime),
    '-hls_list_size', String(CONFIG.hls.playlistSize),
    '-hls_flags', 'delete_segments+independent_segments',
    '-hls_segment_filename', path.join(CONFIG.hls.outputDir, CONFIG.hls.segmentPattern),
    path.join(CONFIG.hls.outputDir, CONFIG.hls.playlistName)
  );
  
  return args;
}

/**
 * Build filter_complex string for overlays and ZMQ integration
 * This is extensible - modify this function to add more complex filtering
 */
function buildFilterComplex() {
  const numLayers = CONFIG.fifos.layers.length;
  let filter = '';
  
  if (numLayers === 0) {
    // No overlays, just pass through with ZMQ
    filter = `[0:v]zmq=bind_address=tcp\\://\\*\\:${CONFIG.zmq.port}[vout];[0:a]anull[aout]`;
  } else if (numLayers === 1) {
    // Single overlay
    filter = `[0:v][1:v]overlay=0:0,zmq=bind_address=tcp\\://\\*\\:${CONFIG.zmq.port}[vout];[0:a][1:a]amix=inputs=2[aout]`;
  } else if (numLayers === 2) {
    // Two overlays (as per default config)
    filter = `[0:v][1:v]overlay=0:0[tmp];[tmp][2:v]overlay=100:100,zmq=bind_address=tcp\\://\\*\\:${CONFIG.zmq.port}[vout];[0:a][1:a][2:a]amix=inputs=3[aout]`;
  } else {
    // Extensible for more overlays - chain them
    filter = '[0:v]';
    for (let i = 1; i <= numLayers; i++) {
      const isLast = i === numLayers;
      const inputLabel = i === 1 ? '[0:v]' : '[tmp' + (i - 2) + ']';
      const outputLabel = isLast ? '' : '[tmp' + (i - 1) + ']';
      
      if (i === 1) {
        filter += `[${i}:v]overlay=0:0${outputLabel}`;
      } else {
        filter += `;${inputLabel}[${i}:v]overlay=${i * 50}:${i * 50}${outputLabel}`;
      }
    }
    
    // Add ZMQ filter to the last overlay
    filter += `,zmq=bind_address=tcp\\://\\*\\:${CONFIG.zmq.port}[vout]`;
    
    // Audio mixing
    const audioInputs = Array.from({length: numLayers + 1}, (_, i) => `[${i}:a]`).join('');
    filter += `;${audioInputs}amix=inputs=${numLayers + 1}[aout]`;
  }
  
  return filter;
}

/**
 * Start FFmpeg process for HLS streaming
 */
async function startFFmpeg() {
  if (ffmpegProcess) {
    logger.warn('FFmpeg process already running');
    return;
  }
  
  const args = buildFFmpegArgs();
  
  logger.info('Starting FFmpeg process...');
  logger.debug('FFmpeg command:', CONFIG.ffmpeg.binary, args.join(' '));
  
  ffmpegProcess = spawn(CONFIG.ffmpeg.binary, args, {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  // Handle FFmpeg stdout
  ffmpegProcess.stdout.on('data', (data) => {
    logger.debug('FFmpeg stdout:', data.toString().trim());
  });
  
  // Handle FFmpeg stderr (most FFmpeg output goes to stderr)
  ffmpegProcess.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output.includes('frame=')) {
      // Filter out verbose frame information - only log occasionally
      if (Math.random() < 0.01) { // Log ~1% of frame messages
        logger.debug('FFmpeg progress:', output);
      }
    } else {
      logger.debug('FFmpeg:', output);
    }
  });
  
  // Handle FFmpeg process exit
  ffmpegProcess.on('close', (code, signal) => {
    logger.warn(`FFmpeg process closed with code ${code}, signal ${signal}`);
    ffmpegProcess = null;
    
    if (!isShuttingDown) {
      logger.warn('FFmpeg exited unexpectedly, restarting in 5 seconds...');
      setTimeout(() => {
        if (!isShuttingDown) {
          startFFmpeg();
        }
      }, 5000);
    }
  });
  
  ffmpegProcess.on('error', (error) => {
    logger.error('FFmpeg process error:', error.message);
    ffmpegProcess = null;
  });
  
  logger.info('FFmpeg process started successfully');
}

/**
 * Stop FFmpeg process
 */
function stopFFmpeg() {
  if (ffmpegProcess) {
    logger.info('Stopping FFmpeg process...');
    ffmpegProcess.kill('SIGTERM');
    
    // Force kill after 10 seconds if it doesn't stop gracefully
    setTimeout(() => {
      if (ffmpegProcess) {
        logger.warn('Force killing FFmpeg process...');
        ffmpegProcess.kill('SIGKILL');
      }
    }, 10000);
  }
}

// ============================================================================
// CONTENT MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Update main content by appending to the content FIFO
 * @param {string} filePath - Path to the new video file
 */
async function updateContent(filePath) {
  const contentFifoPath = path.join(CONFIG.fifos.baseDir, CONFIG.fifos.content);
  
  // Validate file exists
  if (!fs.existsSync(filePath)) {
    logger.error(`Content file does not exist: ${filePath}`);
    return false;
  }
  
  try {
    // Prepare concat entry
    const concatEntry = `file '${path.resolve(filePath)}'\n`;
    
    // Open FIFO for writing (non-blocking if possible)
    const fd = fs.createWriteStream(contentFifoPath, { flags: 'a' });
    
    // Write the concat entry
    fd.write(concatEntry);
    fd.end();
    
    logger.info(`Updated main content: ${filePath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to update content with ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Update a specific layer by writing to its FIFO
 * @param {number} index - Layer index (0-based)
 * @param {string} filePath - Path to the overlay file
 */
async function updateLayer(index, filePath) {
  if (index < 0 || index >= CONFIG.fifos.layers.length) {
    logger.error(`Invalid layer index: ${index}. Available layers: 0-${CONFIG.fifos.layers.length - 1}`);
    return false;
  }
  
  // Validate file exists
  if (!fs.existsSync(filePath)) {
    logger.error(`Layer file does not exist: ${filePath}`);
    return false;
  }
  
  try {
    const layerFifoPath = path.join(CONFIG.fifos.baseDir, CONFIG.fifos.layers[index]);
    
    // For overlays, we might need to use a different approach depending on file type
    // For now, we'll use a simple approach - copy the file to the FIFO
    const sourceStream = fs.createReadStream(filePath);
    const targetStream = fs.createWriteStream(layerFifoPath);
    
    sourceStream.pipe(targetStream);
    
    logger.info(`Updated layer ${index}: ${filePath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to update layer ${index} with ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Initialize content with a default file
 */
async function initializeContent() {
  if (fs.existsSync(CONFIG.initialContent)) {
    logger.info(`Initializing with default content: ${CONFIG.initialContent}`);
    await updateContent(CONFIG.initialContent);
  } else {
    logger.warn(`Initial content file not found: ${CONFIG.initialContent}`);
    logger.info('Creating a basic test pattern as initial content...');
    
    // Create a test pattern using FFmpeg (fallback)
    try {
      const testPatternPath = path.join(CONFIG.hls.outputDir, 'test_pattern.mp4');
      await execAsync(`${CONFIG.ffmpeg.binary} -f lavfi -i testsrc=duration=60:size=1280x720:rate=30 -f lavfi -i sine=frequency=1000:duration=60 -c:v libx264 -c:a aac -t 60 ${testPatternPath} -y`);
      await updateContent(testPatternPath);
      logger.info('Created and initialized with test pattern');
    } catch (error) {
      logger.error('Failed to create test pattern:', error.message);
    }
  }
}

// ============================================================================
// HTTP SERVER SETUP
// ============================================================================

/**
 * Setup Express.js HTTP server for serving HLS content and API
 */
function setupHttpServer() {
  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use(express.static('public')); // Serve static files from public directory
  
  // CORS headers for HLS streaming
  app.use('/hls', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    next();
  });
  
  // Serve HLS files
  app.use('/hls', express.static(CONFIG.hls.outputDir));
  
  // API endpoint for real-time updates
  app.post('/update', async (req, res) => {
    const { type, data } = req.body;
    
    try {
      switch (type) {
        case 'content':
          const contentResult = await updateContent(data);
          res.json({ success: contentResult, message: contentResult ? 'Content updated' : 'Failed to update content' });
          break;
          
        case 'layer':
          const { index, path: layerPath } = data;
          const layerResult = await updateLayer(index, layerPath);
          res.json({ success: layerResult, message: layerResult ? `Layer ${index} updated` : `Failed to update layer ${index}` });
          break;
          
        case 'filter':
          const { command } = data;
          const filterResult = await sendInstruction(command);
          res.json({ success: filterResult, message: filterResult ? 'Filter command sent' : 'Failed to send filter command' });
          break;
          
        default:
          res.status(400).json({ success: false, message: 'Invalid update type. Use: content, layer, or filter' });
      }
    } catch (error) {
      logger.error('API error:', error.message);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
  
  // Status endpoint
  app.get('/status', (req, res) => {
    res.json({
      ffmpeg: ffmpegProcess ? 'running' : 'stopped',
      zmq: zmqSocket ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      config: {
        layers: CONFIG.fifos.layers.length,
        hlsSegmentTime: CONFIG.hls.segmentTime,
        hlsPlaylistSize: CONFIG.hls.playlistSize
      }
    });
  });
  
  // Basic dashboard (optional - for testing)
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Custom HLS Streamer</title>
        <script src="https://vjs.zencdn.net/7.18.1/video.min.js"></script>
        <link href="https://vjs.zencdn.net/7.18.1/video-js.css" rel="stylesheet">
      </head>
      <body>
        <h1>Custom HLS Streamer Dashboard</h1>
        <video-js id="my-video" class="video-js" controls preload="auto" width="800" height="450" data-setup="{}">
          <source src="/hls/stream.m3u8" type="application/x-mpegURL">
        </video-js>
        <div>
          <h2>API Examples:</h2>
          <p>Update content: POST /update {"type":"content","data":"/path/to/video.mp4"}</p>
          <p>Update layer: POST /update {"type":"layer","data":{"index":0,"path":"/path/to/overlay.png"}}</p>
          <p>Send filter: POST /update {"type":"filter","data":{"command":"Parsed_overlay_1 x=200:y=300"}}</p>
        </div>
      </body>
      </html>
    `);
  });
  
  return app;
}

/**
 * Start HTTP server
 */
function startHttpServer() {
  const app = setupHttpServer();
  
  httpServer = app.listen(CONFIG.http.port, CONFIG.http.host, () => {
    logger.info(`HTTP server listening on http://${CONFIG.http.host}:${CONFIG.http.port}`);
    logger.info(`HLS stream available at: http://${CONFIG.http.host}:${CONFIG.http.port}/hls/stream.m3u8`);
  });
  
  httpServer.on('error', (error) => {
    logger.error('HTTP server error:', error.message);
  });
}

/**
 * Stop HTTP server
 */
function stopHttpServer() {
  if (httpServer) {
    logger.info('Stopping HTTP server...');
    httpServer.close();
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

/**
 * Handle graceful shutdown
 */
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}, initiating graceful shutdown...`);
  isShuttingDown = true;
  
  // Stop HTTP server
  stopHttpServer();
  
  // Stop FFmpeg
  stopFFmpeg();
  
  // Close ZeroMQ socket
  if (zmqSocket) {
    try {
      await zmqSocket.close();
      logger.info('ZeroMQ socket closed');
    } catch (error) {
      logger.warn('Error closing ZeroMQ socket:', error.message);
    }
  }
  
  // Clean up FIFOs
  cleanupFifos();
  
  // Clean up HLS files (optional - comment out if you want to keep them)
  try {
    const files = fs.readdirSync(CONFIG.hls.outputDir);
    files.forEach(file => {
      if (file.endsWith('.ts') || file.endsWith('.m3u8')) {
        fs.unlinkSync(path.join(CONFIG.hls.outputDir, file));
      }
    });
    logger.info('Cleaned up HLS files');
  } catch (error) {
    logger.warn('Error cleaning up HLS files:', error.message);
  }
  
  logger.info('Graceful shutdown completed');
  process.exit(0);
}

// ============================================================================
// MAIN APPLICATION
// ============================================================================

/**
 * Main application startup
 */
async function main() {
  try {
    logger.info('Starting Custom HLS Streamer...');
    
    // Setup directories
    setupHlsDirectory();
    
    // Create FIFOs
    await createFifos();
    
    // Initialize ZeroMQ
    await initializeZmq();
    
    // Start HTTP server
    startHttpServer();
    
    // Initialize content
    await initializeContent();
    
    // Start FFmpeg (with a small delay to ensure FIFOs are ready)
    setTimeout(async () => {
      await startFFmpeg();
    }, 2000);
    
    // Setup periodic segment cleanup
    setInterval(cleanupOldSegments, 30000); // Clean up every 30 seconds
    
    logger.info('Custom HLS Streamer started successfully!');
    logger.info(`Stream URL: http://${CONFIG.http.host}:${CONFIG.http.port}/hls/stream.m3u8`);
    
    // Keep the process running
    process.stdin.resume();
    
  } catch (error) {
    logger.error('Failed to start application:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// SIGNAL HANDLERS
// ============================================================================

// Handle graceful shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error.message);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// ============================================================================
// EXPORT FUNCTIONS FOR EXTERNAL USE
// ============================================================================

// Export main functions for potential external use or testing
module.exports = {
  updateContent,
  updateLayer,
  sendInstruction,
  startFFmpeg,
  stopFFmpeg,
  CONFIG
};

// ============================================================================
// STARTUP
// ============================================================================

// Start the application if this file is run directly
if (require.main === module) {
  main();
}

/*
 * ============================================================================
 * EXTENSION NOTES
 * ============================================================================
 * 
 * To add more overlay layers:
 * 1. Add more FIFO names to CONFIG.fifos.layers array
 * 2. Modify buildFilterComplex() function to handle additional overlays
 * 3. The current implementation already supports extensible overlays
 * 
 * To add ABR (Adaptive Bitrate) support:
 * 1. Modify buildFFmpegArgs() to output multiple bitrate variants
 * 2. Use FFmpeg's -f hls with -var_stream_map for ABR
 * 3. Example: -var_stream_map "v:0,a:0 v:1,a:0" for 2 video variants
 * 4. Update HLS output to generate master playlist
 * 
 * To add more complex filters:
 * 1. Modify buildFilterComplex() to include additional filters
 * 2. Use ZeroMQ commands to control filter parameters in real-time
 * 3. Example filters: drawtext, colorkey, scale, crop, etc.
 * 
 * Production considerations:
 * 1. Add authentication to /update endpoint
 * 2. Implement rate limiting for API calls
 * 3. Add monitoring and metrics collection
 * 4. Use a process manager like PM2 for deployment
 * 5. Consider using Redis for state management in multi-instance setup
 * 6. Add comprehensive logging with log rotation
 * 7. Implement health checks and auto-recovery mechanisms
 */