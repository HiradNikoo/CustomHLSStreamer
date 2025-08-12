/**
 * ZeroMQ Service Unit Tests
 */

'use strict';

const { mockLogger, assert } = require('../../helpers/testUtils');
const ZmqService = require('../../../src/services/zmqService');

// Mock zeromq module
const mockSocket = {
  bind: jest.fn(),
  send: jest.fn(),
  close: jest.fn()
};

jest.mock('zeromq', () => ({
  Push: jest.fn(() => mockSocket)
}));

// Mock the config
jest.mock('../../../src/config', () => ({
  CONFIG: {
    zmq: {
      port: 5555,
      protocol: 'tcp'
    }
  }
}));

// Mock the logger
jest.mock('../../../src/utils/logger', () => mockLogger);

describe('ZmqService', () => {
  let zmqService;
  
  beforeEach(() => {
    zmqService = new ZmqService();
    mockLogger.capture();
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    mockLogger.restore();
  });

  describe('constructor', () => {
    test('should initialize with null socket', () => {
      assert.equal(zmqService.socket, null, 'Socket should be null initially');
    });
  });

  describe('initialize', () => {
    test('should create and bind ZMQ socket successfully', async () => {
      mockSocket.bind.mockResolvedValue();
      
      const result = await zmqService.initialize();
      
      assert.equal(result, mockSocket, 'Should return the socket');
      assert.equal(zmqService.socket, mockSocket, 'Should store socket reference');
      assert.isTrue(mockSocket.bind.mock.calls.length === 1, 'Should call bind once');
      assert.equal(mockSocket.bind.mock.calls[0][0], 'tcp://localhost:5555', 'Should bind to correct address');
      
      const logs = mockLogger.getLogs();
      const infoLogs = logs.filter(log => log.level === 'info');
      assert.isTrue(infoLogs.some(log => log.msg.includes('ZeroMQ socket bound')), 'Should log successful binding');
    });

    test('should handle initialization errors', async () => {
      const error = new Error('Bind failed');
      mockSocket.bind.mockRejectedValue(error);
      
      await assert.throws(async () => {
        await zmqService.initialize();
      }, 'Bind failed', 'Should throw initialization error');
      
      const logs = mockLogger.getLogs();
      const errorLogs = logs.filter(log => log.level === 'error');
      assert.isTrue(errorLogs.some(log => log.msg.includes('Failed to initialize ZeroMQ')), 'Should log error');
    });
  });

  describe('sendInstruction', () => {
    test('should return false if socket is not initialized', async () => {
      const result = await zmqService.sendInstruction('test command');
      
      assert.isFalse(result, 'Should return false when socket is null');
      
      const logs = mockLogger.getLogs();
      const errorLogs = logs.filter(log => log.level === 'error');
      assert.isTrue(errorLogs.some(log => log.msg.includes('not initialized')), 'Should log error');
    });

    test('should send instruction successfully', async () => {
      zmqService.socket = mockSocket;
      mockSocket.send.mockResolvedValue();
      
      const command = 'Parsed_overlay_1 x=100:y=200';
      const result = await zmqService.sendInstruction(command);
      
      assert.isTrue(result, 'Should return true on successful send');
      assert.isTrue(mockSocket.send.mock.calls.length === 1, 'Should call send once');
      assert.equal(mockSocket.send.mock.calls[0][0], command, 'Should send correct command');
      
      const logs = mockLogger.getLogs();
      const debugLogs = logs.filter(log => log.level === 'debug');
      assert.isTrue(debugLogs.some(log => log.msg.includes('Sent ZMQ instruction')), 'Should log sent instruction');

      // Verify log buffer updated
      const zmqLogs = zmqService.getLogs();
      assert.equal(zmqLogs.length, 1, 'Should store log entry');
      assert.equal(zmqLogs[0].type, 'sent', 'Log type should be sent');
      assert.equal(zmqLogs[0].message, command, 'Log message should be command');
    });

    test('should handle send errors', async () => {
      zmqService.socket = mockSocket;
      const error = new Error('Send failed');
      mockSocket.send.mockRejectedValue(error);
      
      const result = await zmqService.sendInstruction('test command');
      
      assert.isFalse(result, 'Should return false on send error');
      
      const logs = mockLogger.getLogs();
      const errorLogs = logs.filter(log => log.level === 'error');
      assert.isTrue(errorLogs.some(log => log.msg.includes('Failed to send ZMQ instruction')), 'Should log error');

      const zmqLogs = zmqService.getLogs();
      assert.equal(zmqLogs.length, 1, 'Should store error log entry');
      assert.equal(zmqLogs[0].type, 'error', 'Log type should be error');
    });
  });

  describe('isConnected', () => {
    test('should return false when socket is null', () => {
      assert.isFalse(zmqService.isConnected(), 'Should return false when socket is null');
    });

    test('should return true when socket is set', () => {
      zmqService.socket = mockSocket;
      assert.isTrue(zmqService.isConnected(), 'Should return true when socket is set');
    });
  });

  describe('close', () => {
    test('should do nothing if socket is null', async () => {
      await zmqService.close();
      
      // Should not throw and socket should remain null
      assert.equal(zmqService.socket, null, 'Socket should remain null');
    });

    test('should close socket successfully', async () => {
      zmqService.socket = mockSocket;
      mockSocket.close.mockResolvedValue();
      
      await zmqService.close();
      
      assert.equal(zmqService.socket, null, 'Socket should be set to null');
      assert.isTrue(mockSocket.close.mock.calls.length === 1, 'Should call close once');
      
      const logs = mockLogger.getLogs();
      const infoLogs = logs.filter(log => log.level === 'info');
      assert.isTrue(infoLogs.some(log => log.msg.includes('ZeroMQ socket closed')), 'Should log successful close');
    });

    test('should handle close errors', async () => {
      zmqService.socket = mockSocket;
      const error = new Error('Close failed');
      mockSocket.close.mockRejectedValue(error);
      
      await zmqService.close();
      
      const logs = mockLogger.getLogs();
      const warnLogs = logs.filter(log => log.level === 'warn');
      assert.isTrue(warnLogs.some(log => log.msg.includes('Error closing ZeroMQ socket')), 'Should log warning');
    });
  });

  describe('log buffer', () => {
    test('should clear logs', () => {
      zmqService.addToLogBuffer('sent', 'test');
      assert.equal(zmqService.getLogs().length, 1, 'Should have one log');
      zmqService.clearLogs();
      assert.equal(zmqService.getLogs().length, 0, 'Should clear logs');
    });

    test('should notify listeners on new log', () => {
      const callback = jest.fn();
      const unsubscribe = zmqService.onLog(callback);
      zmqService.addToLogBuffer('sent', 'hello');
      assert.isTrue(callback.mock.calls.length === 1, 'Listener should be called');
      unsubscribe();
    });
  });
});