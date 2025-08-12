/**
 * FFmpeg Service
 * Manages FFmpeg process for HLS streaming
 */

'use strict';

const { spawn } = require('child_process');
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const { CONFIG } = require('../config');
const logger = require('../utils/logger');

const execAsync = util.promisify(exec);

class FFmpegService {
  constructor(fifoService, hlsService) {
    this.process = null;
    this.isShuttingDown = false;
    this.fifoService = fifoService;
    this.hlsService = hlsService;
    this.logBuffer = [];
    this.maxLogBuffer = 1000;
    this.logListeners = new Set();
  }

  /**
   * Detect if we can use real FIFOs (same logic as FifoService)
   */
  canUseFifos() {
    if (process.platform === 'win32') {
      // Check for WSL environment
      if (process.env.WSL_DISTRO_NAME || process.env.WSLENV) {
        return true;
      }
      // Check for MSYS2/Git Bash environment - DISABLED for now due to FIFO issues
      if (process.env.MSYSTEM || process.env.MINGW_PREFIX) {
        // MSYS2 mkfifo creates regular files, not real FIFOs, causing FFmpeg input errors
        return false; 
      }
      return false;
    }
    return true;
  }

  /**
   * Build FFmpeg command arguments for HLS streaming
   */
  buildArgs() {
    const args = [];
    
    if (!this.canUseFifos()) {
      // Simplified Windows approach - use test pattern for now
      args.push(
        '-f', 'lavfi',
        '-i', 'testsrc=duration=3600:size=1280x720:rate=30',
        '-f', 'lavfi', 
        '-i', 'sine=frequency=1000:duration=3600'
      );
      
      // Simple video encoding for Windows
      args.push(
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
        '-c:a', 'aac',
        '-b:a', CONFIG.ffmpeg.audioBitrate,
        '-ar', '48000'
      );
    } else {
      // Systems with FIFO support - use FIFO approach
      // Input arguments - Main content FIFO
      args.push(
        '-f', 'concat',
        '-safe', '0',
        '-i', this.fifoService.getContentFifoPath()
      );
      
      // Layer input FIFOs
      CONFIG.fifos.layers.forEach((_, index) => {
        args.push('-i', this.fifoService.getLayerFifoPath(index));
      });
      
      // Build filter_complex
      const filterComplex = this.buildFilterComplex();
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
    }
    
    // HLS output options (same for all platforms)
    args.push(
      '-f', 'hls',
      '-hls_time', String(CONFIG.hls.segmentTime),
      '-hls_list_size', String(CONFIG.hls.playlistSize),
      '-hls_flags', 'delete_segments+independent_segments',
      '-hls_segment_filename', this.hlsService.getSegmentPatternPath(),
      this.hlsService.getOutputPath()
    );
    
    return args;
  }

  /**
   * Build filter_complex string for overlays and ZMQ integration
   */
  buildFilterComplex() {
    if (!this.canUseFifos()) {
      // Simplified filter for Windows - just add text overlay without font file
      return `[0:v]drawtext=text='HLS Stream - Windows Mode':fontsize=24:fontcolor=white:x=10:y=10[vout];[1:a]anull[aout]`;
    }
    
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
   * Start FFmpeg process
   */
  async start() {
    if (this.process) {
      logger.warn('FFmpeg process already running');
      return;
    }
    
    const args = this.buildArgs();
    
    const startMessage = 'Starting FFmpeg process...';
    const commandMessage = `FFmpeg command: ${CONFIG.ffmpeg.binary} ${args.join(' ')}`;
    
    this.addToLogBuffer('system', startMessage);
    this.addToLogBuffer('system', commandMessage);
    
    logger.info(startMessage);
    logger.debug(commandMessage);
    
    this.process = spawn(CONFIG.ffmpeg.binary, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Handle FFmpeg stdout
    this.process.stdout.on('data', (data) => {
      const output = data.toString().trim();
      this.addToLogBuffer('stdout', output);
      logger.debug('FFmpeg stdout:', output);
    });
    
    // Handle FFmpeg stderr (most FFmpeg output goes to stderr)
    this.process.stderr.on('data', (data) => {
      const output = data.toString().trim();
      this.addToLogBuffer('stderr', output);
      
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
    this.process.on('close', (code, signal) => {
      const exitMessage = `FFmpeg process closed with code ${code}, signal ${signal}`;
      this.addToLogBuffer('system', exitMessage);
      logger.warn(exitMessage);
      this.process = null;
      
      if (!this.isShuttingDown) {
        const restartMessage = 'FFmpeg exited unexpectedly, restarting in 5 seconds...';
        this.addToLogBuffer('system', restartMessage);
        logger.warn(restartMessage);
        setTimeout(() => {
          if (!this.isShuttingDown) {
            this.start();
          }
        }, 5000);
      }
    });
    
    this.process.on('error', (error) => {
      const errorMessage = `FFmpeg process error: ${error.message}`;
      this.addToLogBuffer('error', errorMessage);
      logger.error(errorMessage);
      this.process = null;
    });
    
    logger.info('FFmpeg process started successfully');
  }

  /**
   * Stop FFmpeg process
   */
  stop() {
    if (this.process) {
      logger.info('Stopping FFmpeg process...');
      this.process.kill('SIGTERM');
      
      // Force kill after 10 seconds if it doesn't stop gracefully
      setTimeout(() => {
        if (this.process) {
          logger.warn('Force killing FFmpeg process...');
          this.process.kill('SIGKILL');
          this.process = null;
        }
      }, 10000);
    }
  }

  /**
   * Check if FFmpeg process is running
   */
  isRunning() {
    return this.process !== null;
  }

  /**
   * Initialize content with default file
   */
  async initializeContent() {
    if (!this.canUseFifos()) {
      logger.info('Windows mode: Using built-in test pattern, no content initialization needed');
      return;
    }
    
    if (fs.existsSync(CONFIG.initialContent)) {
      logger.info(`Initializing with default content: ${CONFIG.initialContent}`);
      await this.fifoService.writeContent(CONFIG.initialContent);
    } else {
      logger.warn(`Initial content file not found: ${CONFIG.initialContent}`);
      logger.info('Creating a basic test pattern as initial content...');
      
      try {
        const testPatternPath = path.join(CONFIG.hls.outputDir, 'test_pattern.mp4');
        await execAsync(`${CONFIG.ffmpeg.binary} -f lavfi -i testsrc=duration=60:size=1280x720:rate=30 -f lavfi -i sine=frequency=1000:duration=60 -c:v libx264 -c:a aac -t 60 "${testPatternPath}" -y`);
        await this.fifoService.writeContent(testPatternPath);
        logger.info('Created and initialized with test pattern');
      } catch (error) {
        logger.error('Failed to create test pattern:', error.message);
      }
    }
  }

  /**
   * Set shutdown flag
   */
  setShuttingDown(isShuttingDown) {
    this.isShuttingDown = isShuttingDown;
  }

  /**
   * Add log entry to buffer and notify listeners
   */
  addToLogBuffer(type, message) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: type,
      message: message
    };

    this.logBuffer.push(logEntry);
    
    // Keep buffer size manageable
    if (this.logBuffer.length > this.maxLogBuffer) {
      this.logBuffer = this.logBuffer.slice(-this.maxLogBuffer);
    }

    // Notify all listeners
    for (const listener of this.logListeners) {
      try {
        listener(logEntry);
      } catch (error) {
        logger.warn('Error notifying log listener:', error.message);
      }
    }
  }

  /**
   * Get current log buffer
   */
  getLogs() {
    return [...this.logBuffer];
  }

  /**
   * Subscribe to real-time log updates
   */
  onLog(callback) {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }

  /**
   * Clear log buffer
   */
  clearLogs() {
    this.logBuffer = [];
  }
}

module.exports = FFmpegService;