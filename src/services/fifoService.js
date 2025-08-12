/**
 * FIFO Service
 * Manages named pipes (FIFOs) for dynamic input
 */

'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const { CONFIG } = require('../config');
const logger = require('../utils/logger');

const execAsync = util.promisify(require('child_process').exec);

class FifoService {
  constructor() {
    this.activeFifos = new Map();
  }

  /**
   * Create all required named pipes (FIFOs) for streaming
   */
  async createAll() {
    logger.info('Creating named pipes (FIFOs)...');
    
    // Ensure FIFO directory exists
    if (!fs.existsSync(CONFIG.fifos.baseDir)) {
      fs.mkdirSync(CONFIG.fifos.baseDir, { recursive: true });
    }
    
    // Create content FIFO
    const contentFifoPath = path.join(CONFIG.fifos.baseDir, CONFIG.fifos.content);
    await this.createSingle(contentFifoPath);
    
    // Create layer FIFOs
    for (const layerFifo of CONFIG.fifos.layers) {
      const layerFifoPath = path.join(CONFIG.fifos.baseDir, layerFifo);
      await this.createSingle(layerFifoPath);
    }
    
    logger.info(`Created ${1 + CONFIG.fifos.layers.length} FIFOs successfully`);
  }

  /**
   * Detect if we can use real FIFOs
   */
  canUseFifos() {
    // Check if we're in WSL or MSYS2 environment where mkfifo works
    if (process.platform === 'win32') {
      // Check for WSL environment
      if (process.env.WSL_DISTRO_NAME || process.env.WSLENV) {
        return true; // WSL supports FIFOs
      }
      // Check for MSYS2/Git Bash environment
      if (process.env.MSYSTEM || process.env.MINGW_PREFIX) {
        return true; // MSYS2 supports FIFOs
      }
      return false; // Pure Windows
    }
    return true; // Unix-like systems
  }

  /**
   * Create a single named pipe
   */
  async createSingle(fifoPath) {
    try {
      // Check if FIFO already exists
      if (fs.existsSync(fifoPath)) {
        const stats = fs.statSync(fifoPath);
        if (!this.canUseFifos() || stats.isFIFO()) {
          logger.debug(`FIFO already exists: ${fifoPath}`);
          return;
        } else {
          // Remove if it's not a FIFO
          fs.unlinkSync(fifoPath);
        }
      }
      
      // Create the named pipe based on capabilities
      if (!this.canUseFifos()) {
        // On pure Windows, use regular files as fallback
        fs.writeFileSync(fifoPath, '');
        logger.debug(`Created placeholder file for Windows: ${fifoPath}`);
        logger.warn('Pure Windows detected: Using regular files instead of FIFOs. Some advanced features may be limited.');
      } else {
        // Create actual FIFO (Unix-like systems, WSL, MSYS2)
        await execAsync(`mkfifo "${fifoPath}"`);
        logger.debug(`Created FIFO: ${fifoPath}`);
        logger.info('FIFO support available - using real named pipes for optimal performance');
      }
    } catch (error) {
      logger.error(`Failed to create FIFO ${fifoPath}:`, error.message);
      // Fallback to regular files if FIFO creation fails
      if (this.canUseFifos()) {
        logger.warn('FIFO creation failed, falling back to regular files');
        fs.writeFileSync(fifoPath, '');
      } else {
        throw error;
      }
    }
  }

  /**
   * Write content to content FIFO
   */
  async writeContent(filePath) {
    const contentFifoPath = path.join(CONFIG.fifos.baseDir, CONFIG.fifos.content);
    
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      logger.error(`Content file does not exist: ${filePath}`);
      return false;
    }
    
    try {
      // Prepare concat entry
      const concatEntry = `file '${path.resolve(filePath)}'\n`;
      
      // Open FIFO for writing
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
   * Write to a specific layer FIFO
   */
  async writeLayer(index, filePath) {
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
      
      // For overlays, copy the file to the FIFO
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
   * Get content FIFO path
   */
  getContentFifoPath() {
    return path.join(CONFIG.fifos.baseDir, CONFIG.fifos.content);
  }

  /**
   * Get layer FIFO path
   */
  getLayerFifoPath(index) {
    if (index < 0 || index >= CONFIG.fifos.layers.length) {
      throw new Error(`Invalid layer index: ${index}`);
    }
    return path.join(CONFIG.fifos.baseDir, CONFIG.fifos.layers[index]);
  }

  /**
   * Clean up all FIFOs
   */
  cleanup() {
    logger.info('Cleaning up FIFOs...');
    
    // Close active FIFO file descriptors
    for (const [fifoPath, fd] of this.activeFifos) {
      try {
        if (fd && typeof fd.end === 'function') {
          fd.end();
        }
        logger.debug(`Closed FIFO: ${fifoPath}`);
      } catch (error) {
        logger.warn(`Error closing FIFO ${fifoPath}:`, error.message);
      }
    }
    this.activeFifos.clear();
    
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
}

module.exports = FifoService;