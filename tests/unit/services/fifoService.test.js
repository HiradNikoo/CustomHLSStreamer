/**
 * FIFO Service Unit Tests
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { TestFileManager, mockLogger, assert } = require('../../helpers/testUtils');
const FifoService = require('../../../src/services/fifoService');

// Mock the config
jest.mock('../../../src/config', () => ({
  CONFIG: {
    fifos: {
      baseDir: './test_fifos',
      content: 'content.fifo',
      layers: ['overlay1.fifo', 'overlay2.fifo']
    }
  }
}));

// Mock the logger
jest.mock('../../../src/utils/logger', () => mockLogger);

describe('FifoService', () => {
  let fifoService;
  let testFileManager;
  
  beforeEach(() => {
    fifoService = new FifoService();
    testFileManager = new TestFileManager();
    testFileManager.setup();
    mockLogger.capture();
  });
  
  afterEach(() => {
    testFileManager.cleanup();
    mockLogger.restore();
    
    // Cleanup test FIFO directory
    const testFifoDir = './test_fifos';
    if (fs.existsSync(testFifoDir)) {
      try {
        const files = fs.readdirSync(testFifoDir);
        for (const file of files) {
          fs.unlinkSync(path.join(testFifoDir, file));
        }
        fs.rmdirSync(testFifoDir);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('constructor', () => {
    test('should initialize with empty activeFifos map', () => {
      assert.isTrue(fifoService.activeFifos instanceof Map, 'activeFifos should be a Map');
      assert.equal(fifoService.activeFifos.size, 0, 'activeFifos should be empty initially');
    });
  });

  describe('createAll', () => {
    test('should create FIFO directory if it does not exist', async () => {
      // Mock mkfifo command to avoid actual FIFO creation
      const originalExecAsync = require('util').promisify(require('child_process').exec);
      require('child_process').exec = jest.fn((cmd, callback) => callback(null, ''));

      await fifoService.createAll();
      
      assert.isTrue(fs.existsSync('./test_fifos'), 'FIFO directory should be created');
      
      // Restore original function
      require('child_process').exec = originalExecAsync;
    });

    test('should log creation of FIFOs', async () => {
      // Mock mkfifo command
      require('child_process').exec = jest.fn((cmd, callback) => callback(null, ''));

      await fifoService.createAll();
      
      const logs = mockLogger.getLogs();
      const infoLogs = logs.filter(log => log.level === 'info');
      assert.isTrue(infoLogs.some(log => log.msg.includes('Creating named pipes')), 'Should log FIFO creation');
      assert.isTrue(infoLogs.some(log => log.msg.includes('Created 3 FIFOs successfully')), 'Should log success message');
    });
  });

  describe('writeContent', () => {
    test('should return false for non-existent file', async () => {
      const result = await fifoService.writeContent('/non/existent/file.mp4');
      assert.isFalse(result, 'Should return false for non-existent file');
    });

    test('should return true for valid file', async () => {
      // Ensure the temp directory exists
      testFileManager.setup();
      const testFile = testFileManager.createTestVideo('test_content.mp4');
      
      // Mock the FIFO write operation
      const originalCreateWriteStream = fs.createWriteStream;
      const mockStream = {
        write: jest.fn(),
        end: jest.fn()
      };
      fs.createWriteStream = jest.fn(() => mockStream);

      const result = await fifoService.writeContent(testFile);
      
      assert.isTrue(result, 'Should return true for valid file');
      assert.isTrue(mockStream.write.mock.calls.length > 0, 'Should write to stream');
      assert.isTrue(mockStream.end.mock.calls.length > 0, 'Should end stream');
      
      // Restore original function
      fs.createWriteStream = originalCreateWriteStream;
    });

    test('should handle write errors gracefully', async () => {
      const testFile = testFileManager.createTestVideo('test_content.mp4');
      
      // Mock stream that throws error
      const mockStream = {
        write: jest.fn(() => { throw new Error('Write error'); }),
        end: jest.fn()
      };
      fs.createWriteStream = jest.fn(() => mockStream);

      const result = await fifoService.writeContent(testFile);
      
      assert.isFalse(result, 'Should return false on write error');
      
      const logs = mockLogger.getLogs();
      const errorLogs = logs.filter(log => log.level === 'error');
      assert.isTrue(errorLogs.length > 0, 'Should log error');
      
      // Restore
      fs.createWriteStream = require('fs').createWriteStream;
    });
  });

  describe('writeLayer', () => {
    test('should return false for invalid layer index', async () => {
      const testFile = testFileManager.createTestImage('test_overlay.png');
      
      const result = await fifoService.writeLayer(-1, testFile);
      assert.isFalse(result, 'Should return false for negative index');
      
      const result2 = await fifoService.writeLayer(10, testFile);
      assert.isFalse(result2, 'Should return false for out-of-range index');
    });

    test('should return false for non-existent file', async () => {
      const result = await fifoService.writeLayer(0, '/non/existent/overlay.png');
      assert.isFalse(result, 'Should return false for non-existent file');
    });

    test('should return true for valid layer update', async () => {
      const testFile = testFileManager.createTestImage('test_overlay.png');
      
      // Mock stream operations
      const mockSourceStream = {
        pipe: jest.fn()
      };
      const mockTargetStream = {};
      
      const originalCreateReadStream = fs.createReadStream;
      const originalCreateWriteStream = fs.createWriteStream;
      
      fs.createReadStream = jest.fn(() => mockSourceStream);
      fs.createWriteStream = jest.fn(() => mockTargetStream);

      const result = await fifoService.writeLayer(0, testFile);
      
      assert.isTrue(result, 'Should return true for valid layer update');
      assert.isTrue(mockSourceStream.pipe.mock.calls.length > 0, 'Should pipe streams');
      
      // Restore
      fs.createReadStream = originalCreateReadStream;
      fs.createWriteStream = originalCreateWriteStream;
    });
  });

  describe('getContentFifoPath', () => {
    test('should return correct content FIFO path', () => {
      const expected = path.join('./test_fifos', 'content.fifo');
      const actual = fifoService.getContentFifoPath();
      assert.equal(actual, expected, 'Should return correct content FIFO path');
    });
  });

  describe('getLayerFifoPath', () => {
    test('should return correct layer FIFO path for valid index', () => {
      const expected = path.join('./test_fifos', 'overlay1.fifo');
      const actual = fifoService.getLayerFifoPath(0);
      assert.equal(actual, expected, 'Should return correct layer FIFO path');
    });

    test('should throw error for invalid index', () => {
      assert.throws(() => {
        fifoService.getLayerFifoPath(-1);
      }, 'Invalid layer index', 'Should throw error for invalid index');
    });
  });

  describe('cleanup', () => {
    test('should clear activeFifos map', () => {
      // Add some mock entries
      fifoService.activeFifos.set('test1', { end: jest.fn() });
      fifoService.activeFifos.set('test2', { end: jest.fn() });
      
      fifoService.cleanup();
      
      assert.equal(fifoService.activeFifos.size, 0, 'activeFifos should be cleared');
    });

    test('should handle cleanup errors gracefully', () => {
      // Add mock entry that throws error
      const mockFd = { 
        end: jest.fn(() => { throw new Error('Cleanup error'); })
      };
      fifoService.activeFifos.set('test', mockFd);
      
      // Should not throw
      assert.doesNotThrow(() => {
        fifoService.cleanup();
      }, 'Cleanup should handle errors gracefully');
      
      const logs = mockLogger.getLogs();
      const warnLogs = logs.filter(log => log.level === 'warn');
      assert.isTrue(warnLogs.length > 0, 'Should log warning for cleanup errors');
    });
  });
});

// Helper function for assert.doesNotThrow
function doesNotThrow(fn, message) {
  try {
    fn();
  } catch (error) {
    throw new Error(`${message}: ${error.message}`);
  }
}

assert.doesNotThrow = doesNotThrow;