/**
 * HLS Service
 * Manages HLS output directory and segment cleanup
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { CONFIG } = require('../config');
const logger = require('../utils/logger');

class HlsService {
  constructor() {
    this.cleanupInterval = null;
  }

  /**
   * Setup HLS output directory
   */
  setupDirectory() {
    if (!fs.existsSync(CONFIG.hls.outputDir)) {
      fs.mkdirSync(CONFIG.hls.outputDir, { recursive: true });
      logger.info(`Created HLS output directory: ${CONFIG.hls.outputDir}`);
    }
  }

  /**
   * Start automatic segment cleanup
   */
  startCleanupScheduler() {
    // Clean up every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldSegments();
    }, 30000);
    
    logger.info('Started HLS segment cleanup scheduler');
  }

  /**
   * Stop automatic segment cleanup
   */
  stopCleanupScheduler() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Stopped HLS segment cleanup scheduler');
    }
  }

  /**
   * Clean up old HLS segments
   */
  cleanupOldSegments() {
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

  /**
   * Get HLS stream URL
   */
  getStreamUrl(baseUrl) {
    return `${baseUrl}/hls/${CONFIG.hls.playlistName}`;
  }

  /**
   * Get HLS output path
   */
  getOutputPath() {
    return path.join(CONFIG.hls.outputDir, CONFIG.hls.playlistName);
  }

  /**
   * Get segment pattern path
   */
  getSegmentPatternPath() {
    return path.join(CONFIG.hls.outputDir, CONFIG.hls.segmentPattern);
  }

  /**
   * Check if HLS files are being generated
   */
  isGeneratingSegments() {
    try {
      const playlistPath = this.getOutputPath();
      return fs.existsSync(playlistPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current segment count
   */
  getCurrentSegmentCount() {
    try {
      const files = fs.readdirSync(CONFIG.hls.outputDir);
      return files.filter(f => f.endsWith('.ts') && f.startsWith('stream_')).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Clean up all HLS files (for shutdown)
   */
  cleanupAll() {
    try {
      const files = fs.readdirSync(CONFIG.hls.outputDir);
      files.forEach(file => {
        if (file.endsWith('.ts') || file.endsWith('.m3u8')) {
          const filePath = path.join(CONFIG.hls.outputDir, file);
          fs.unlinkSync(filePath);
        }
      });
      logger.info('Cleaned up all HLS files');
    } catch (error) {
      logger.warn('Error cleaning up HLS files:', error.message);
    }
  }
}

module.exports = HlsService;