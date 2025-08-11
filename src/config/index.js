/**
 * Configuration Management
 * Centralized configuration for the HLS streaming application
 */

'use strict';

const path = require('path');

const CONFIG = {
  // Server configuration
  http: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0'
  },
  
  // ZeroMQ configuration
  zmq: {
    port: process.env.ZMQ_PORT || 5555,
    protocol: 'tcp'
  },
  
  // FFmpeg configuration
  ffmpeg: {
    binary: process.env.FFMPEG_BINARY || 'ffmpeg',
    preset: process.env.FFMPEG_PRESET || 'ultrafast',
    crf: parseInt(process.env.FFMPEG_CRF) || 23,
    gop: parseInt(process.env.FFMPEG_GOP) || 48,
    audioBitrate: process.env.FFMPEG_AUDIO_BITRATE || '128k'
  },
  
  // HLS configuration
  hls: {
    segmentTime: parseInt(process.env.HLS_SEGMENT_TIME) || 2,
    playlistSize: parseInt(process.env.HLS_PLAYLIST_SIZE) || 5,
    outputDir: process.env.HLS_OUTPUT_DIR || './hls',
    segmentPattern: 'stream_%03d.ts',
    playlistName: 'stream.m3u8'
  },
  
  // FIFO configuration
  fifos: {
    baseDir: process.env.FIFO_BASE_DIR || './fifos',
    content: 'content.fifo',
    layers: process.env.FIFO_LAYERS ? 
      process.env.FIFO_LAYERS.split(',') : 
      ['overlay1.fifo', 'overlay2.fifo']
  },
  
  // Initial content
  initialContent: process.env.INITIAL_CONTENT || './assets/default.mp4',
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

/**
 * Validate configuration
 */
function validateConfig() {
  const errors = [];
  
  if (CONFIG.http.port < 1 || CONFIG.http.port > 65535) {
    errors.push('Invalid HTTP port number');
  }
  
  if (CONFIG.zmq.port < 1 || CONFIG.zmq.port > 65535) {
    errors.push('Invalid ZeroMQ port number');
  }
  
  if (CONFIG.hls.segmentTime < 1) {
    errors.push('HLS segment time must be at least 1 second');
  }
  
  if (CONFIG.hls.playlistSize < 1) {
    errors.push('HLS playlist size must be at least 1');
  }
  
  if (CONFIG.fifos.layers.length === 0) {
    errors.push('At least one FIFO layer must be configured');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

module.exports = {
  CONFIG,
  validateConfig
};