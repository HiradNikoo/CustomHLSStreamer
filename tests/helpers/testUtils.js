/**
 * Test Utilities
 * Helper functions and utilities for testing
 */

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

/**
 * Create temporary test files
 */
class TestFileManager {
  constructor() {
    this.tempDir = path.join(__dirname, '..', '..', 'temp_test_files');
    this.createdFiles = [];
  }

  /**
   * Setup temp directory
   */
  setup() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Create a test video file (placeholder)
   */
  createTestVideo(filename = 'test_video.mp4') {
    // Ensure temp directory exists
    this.setup();
    
    const filePath = path.join(this.tempDir, filename);
    
    // Create a minimal MP4 file placeholder
    const content = Buffer.from('fake_mp4_content_for_testing');
    fs.writeFileSync(filePath, content);
    
    this.createdFiles.push(filePath);
    return filePath;
  }

  /**
   * Create a test image file (placeholder)
   */
  createTestImage(filename = 'test_overlay.png') {
    // Ensure temp directory exists
    this.setup();
    
    const filePath = path.join(this.tempDir, filename);
    
    // Create a minimal PNG file placeholder
    const content = Buffer.from('fake_png_content_for_testing');
    fs.writeFileSync(filePath, content);
    
    this.createdFiles.push(filePath);
    return filePath;
  }

  /**
   * Create a test text file
   */
  createTestFile(filename, content) {
    // Ensure temp directory exists
    this.setup();
    
    const filePath = path.join(this.tempDir, filename);
    fs.writeFileSync(filePath, content);
    this.createdFiles.push(filePath);
    return filePath;
  }

  /**
   * Cleanup all created files
   */
  cleanup() {
    for (const filePath of this.createdFiles) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.warn(`Failed to delete test file: ${filePath}`, error.message);
      }
    }
    
    this.createdFiles = [];
    
    // Remove temp directory if empty
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        if (files.length === 0) {
          fs.rmdirSync(this.tempDir);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * HTTP request helper for API testing
 */
function makeHttpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsed,
            rawData: data
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    
    req.end();
  });
}

/**
 * Wait for a specified amount of time
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an operation with exponential backoff
 */
async function retry(operation, maxAttempts = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
}

/**
 * Mock logger for testing
 */
const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  _logs: [],
  capture: function() {
    this._logs = [];
    this.info = (msg, ...args) => this._logs.push({ level: 'info', msg, args });
    this.warn = (msg, ...args) => this._logs.push({ level: 'warn', msg, args });
    this.error = (msg, ...args) => this._logs.push({ level: 'error', msg, args });
    this.debug = (msg, ...args) => this._logs.push({ level: 'debug', msg, args });
  },
  restore: function() {
    this.info = () => {};
    this.warn = () => {};
    this.error = () => {};
    this.debug = () => {};
  },
  getLogs: function() {
    return this._logs;
  }
};

/**
 * Test configuration for testing
 */
const testConfig = {
  http: {
    port: 3001, // Use different port for testing
    host: 'localhost'
  },
  zmq: {
    port: 5556,
    protocol: 'tcp'
  },
  ffmpeg: {
    binary: 'echo', // Mock FFmpeg for testing
    preset: 'ultrafast',
    crf: 23,
    gop: 48,
    audioBitrate: '128k'
  },
  hls: {
    segmentTime: 2,
    playlistSize: 5,
    outputDir: './test_hls',
    segmentPattern: 'stream_%03d.ts',
    playlistName: 'stream.m3u8'
  },
  fifos: {
    baseDir: './test_fifos',
    content: 'content.fifo',
    layers: ['overlay1.fifo', 'overlay2.fifo']
  },
  initialContent: './test_assets/default.mp4',
  logging: {
    level: 'error' // Reduce logging during tests
  }
};

/**
 * Assert helper functions
 */
const assert = {
  equal: (actual, expected, message = '') => {
    if (actual !== expected) {
      throw new Error(`Assertion failed: ${message}\nExpected: ${expected}\nActual: ${actual}`);
    }
  },
  
  deepEqual: (actual, expected, message = '') => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Assertion failed: ${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
    }
  },
  
  isTrue: (value, message = '') => {
    if (value !== true) {
      throw new Error(`Assertion failed: ${message}\nExpected: true\nActual: ${value}`);
    }
  },
  
  isFalse: (value, message = '') => {
    if (value !== false) {
      throw new Error(`Assertion failed: ${message}\nExpected: false\nActual: ${value}`);
    }
  },
  
  throws: async (fn, expectedError, message = '') => {
    try {
      await fn();
      throw new Error(`Assertion failed: ${message}\nExpected function to throw error`);
    } catch (error) {
      if (expectedError && !error.message.includes(expectedError)) {
        throw new Error(`Assertion failed: ${message}\nExpected error containing: ${expectedError}\nActual error: ${error.message}`);
      }
    }
  }
};

module.exports = {
  TestFileManager,
  makeHttpRequest,
  sleep,
  retry,
  mockLogger,
  testConfig,
  assert
};