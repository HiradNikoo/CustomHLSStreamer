/**
 * Graceful Shutdown Handler
 * Manages application shutdown and cleanup
 */

'use strict';

const logger = require('./logger');

class ShutdownHandler {
  constructor() {
    this.isShuttingDown = false;
    this.services = [];
    this.httpServer = null;
  }

  /**
   * Register a service for cleanup during shutdown
   */
  registerService(service) {
    this.services.push(service);
  }

  /**
   * Register HTTP server for cleanup
   */
  registerHttpServer(server) {
    this.httpServer = server;
  }

  /**
   * Handle graceful shutdown
   */
  async gracefulShutdown(signal) {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress, forcing exit');
      process.exit(1);
    }

    logger.info(`Received ${signal}, initiating graceful shutdown...`);
    this.isShuttingDown = true;

    try {
      // Stop HTTP server first
      if (this.httpServer) {
        await this.stopHttpServer();
      }

      // Shutdown all registered services
      await this.shutdownServices();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error.message);
      process.exit(1);
    }
  }

  /**
   * Stop HTTP server
   */
  async stopHttpServer() {
    if (!this.httpServer) return;

    return new Promise((resolve) => {
      logger.info('Stopping HTTP server...');
      this.httpServer.close((error) => {
        if (error) {
          logger.warn('Error stopping HTTP server:', error.message);
        } else {
          logger.info('HTTP server stopped');
        }
        resolve();
      });

      // Force close after 5 seconds
      setTimeout(() => {
        logger.warn('Force closing HTTP server');
        resolve();
      }, 5000);
    });
  }

  /**
   * Shutdown all registered services
   */
  async shutdownServices() {
    const shutdownPromises = [];

    for (const service of this.services) {
      if (service.ffmpegService) {
        // FFmpeg service
        service.ffmpegService.setShuttingDown(true);
        service.ffmpegService.stop();
      }

      if (service.zmqService && typeof service.zmqService.close === 'function') {
        // ZMQ service
        shutdownPromises.push(service.zmqService.close());
      }

      if (service.fifoService && typeof service.fifoService.cleanup === 'function') {
        // FIFO service
        service.fifoService.cleanup();
      }

      if (service.hlsService) {
        // HLS service
        service.hlsService.stopCleanupScheduler();
        
        // Optionally clean up HLS files (comment out if you want to keep them)
        service.hlsService.cleanupAll();
      }

      // Custom cleanup method
      if (typeof service.cleanup === 'function') {
        try {
          await service.cleanup();
        } catch (error) {
          logger.warn('Service cleanup error:', error.message);
        }
      }
    }

    // Wait for all async shutdowns to complete
    if (shutdownPromises.length > 0) {
      try {
        await Promise.all(shutdownPromises);
      } catch (error) {
        logger.warn('Error during service shutdown:', error.message);
      }
    }
  }

  /**
   * Setup signal handlers
   */
  setupSignalHandlers() {
    // Handle graceful shutdown signals
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error.message);
      this.gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      // Don't exit on unhandled rejection, just log it
    });

    logger.info('Signal handlers setup complete');
  }

  /**
   * Check if shutdown is in progress
   */
  isShutdownInProgress() {
    return this.isShuttingDown;
  }
}

module.exports = ShutdownHandler;