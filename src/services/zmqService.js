/**
 * ZeroMQ Service
 * Handles ZeroMQ communication for real-time filter commands
 */

'use strict';

const zmq = require('zeromq');
const { CONFIG } = require('../config');
const logger = require('../utils/logger');

class ZmqService {
  constructor() {
    this.socket = null;
    this.logBuffer = [];
    this.maxLogBuffer = 1000;
    this.logListeners = new Set();
  }

  /**
   * Initialize ZeroMQ socket
   */
  async initialize() {
    try {
      this.socket = new zmq.Push();
      const zmqAddress = `${CONFIG.zmq.protocol}://localhost:${CONFIG.zmq.port}`;

      await this.socket.bind(zmqAddress);
      logger.info(`ZeroMQ socket bound to ${zmqAddress}`);
      this.addToLogBuffer('system', `Socket bound to ${zmqAddress}`);

      return this.socket;
    } catch (error) {
      logger.error('Failed to initialize ZeroMQ:', error.message);
      this.addToLogBuffer('error', `Initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send instruction to FFmpeg via ZeroMQ
   */
  async sendInstruction(command) {
    if (!this.socket) {
      logger.error('ZeroMQ socket not initialized');
       this.addToLogBuffer('error', 'Socket not initialized');
      return false;
    }

    try {
      await this.socket.send(command);
      logger.debug(`Sent ZMQ instruction: ${command}`);
      this.addToLogBuffer('sent', command);
      return true;
    } catch (error) {
      logger.error('Failed to send ZMQ instruction:', error.message);
      this.addToLogBuffer('error', `Send failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if ZeroMQ is connected
   */
  isConnected() {
    return this.socket !== null;
  }

  /**
   * Close ZeroMQ socket
   */
  async close() {
    if (this.socket) {
      try {
        await this.socket.close();
        this.socket = null;
        logger.info('ZeroMQ socket closed');
        this.addToLogBuffer('system', 'Socket closed');
      } catch (error) {
        logger.warn('Error closing ZeroMQ socket:', error.message);
        this.addToLogBuffer('error', `Close failed: ${error.message}`);
      }
    }
  }

  /**
   * Add log entry to buffer and notify listeners
   */
  addToLogBuffer(type, message) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      message
    };

    this.logBuffer.push(logEntry);

    if (this.logBuffer.length > this.maxLogBuffer) {
      this.logBuffer = this.logBuffer.slice(-this.maxLogBuffer);
    }

    for (const listener of this.logListeners) {
      try {
        listener(logEntry);
      } catch (error) {
        logger.warn('Error notifying ZMQ log listener:', error.message);
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

module.exports = ZmqService;