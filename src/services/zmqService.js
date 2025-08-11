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
      
      return this.socket;
    } catch (error) {
      logger.error('Failed to initialize ZeroMQ:', error.message);
      throw error;
    }
  }

  /**
   * Send instruction to FFmpeg via ZeroMQ
   */
  async sendInstruction(command) {
    if (!this.socket) {
      logger.error('ZeroMQ socket not initialized');
      return false;
    }
    
    try {
      await this.socket.send(command);
      logger.debug(`Sent ZMQ instruction: ${command}`);
      return true;
    } catch (error) {
      logger.error('Failed to send ZMQ instruction:', error.message);
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
      } catch (error) {
        logger.warn('Error closing ZeroMQ socket:', error.message);
      }
    }
  }
}

module.exports = ZmqService;