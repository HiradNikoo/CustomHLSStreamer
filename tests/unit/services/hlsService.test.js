/**
 * HLS Service Unit Tests
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { TestFileManager, mockLogger, assert } = require('../../helpers/testUtils');
const HlsService = require('../../../src/services/hlsService');

// Mock the config
jest.mock('../../../src/config', () => ({
  CONFIG: {
    hls: {
      segmentTime: 2,
      playlistSize: 5,
      outputDir: './test_hls',
      segmentPattern: 'stream_%03d.ts',
      playlistName: 'stream.m3u8'
    }
  }
}));

// Mock the logger
jest.mock('../../../src/utils/logger', () => mockLogger);

describe('HlsService', () => {
  let hlsService;
  let testFileManager;
  
  beforeEach(() => {
    hlsService = new HlsService();
    testFileManager = new TestFileManager();
    testFileManager.setup();
    mockLogger.capture();
    
    // Clear any existing intervals
    if (hlsService.cleanupInterval) {
      clearInterval(hlsService.cleanupInterval);
      hlsService.cleanupInterval = null;
    }
  });
  
  afterEach(() => {
    mockLogger.restore();
    testFileManager.cleanup();
    
    // Stop any running intervals
    hlsService.stopCleanupScheduler();
    
    // Cleanup test HLS directory
    const testHlsDir = './test_hls';
    if (fs.existsSync(testHlsDir)) {
      try {
        const files = fs.readdirSync(testHlsDir);
        for (const file of files) {
          fs.unlinkSync(path.join(testHlsDir, file));
        }
        fs.rmdirSync(testHlsDir);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('constructor', () => {
    test('should initialize with null cleanupInterval', () => {
      assert.equal(hlsService.cleanupInterval, null, 'cleanupInterval should be null initially');
    });
  });

  describe('setupDirectory', () => {
    test('should create HLS output directory if it does not exist', () => {
      hlsService.setupDirectory();
      
      assert.isTrue(fs.existsSync('./test_hls'), 'HLS output directory should be created');
      
      const logs = mockLogger.getLogs();
      const infoLogs = logs.filter(log => log.level === 'info');
      assert.isTrue(infoLogs.some(log => log.msg.includes('Created HLS output directory')), 'Should log directory creation');
    });

    test('should not create directory if it already exists', () => {
      // Create directory first
      if (!fs.existsSync('./test_hls')) {
        fs.mkdirSync('./test_hls', { recursive: true });
      }
      
      hlsService.setupDirectory();
      
      // Should still exist
      assert.isTrue(fs.existsSync('./test_hls'), 'HLS output directory should still exist');
    });
  });

  describe('startCleanupScheduler', () => {
    test('should start cleanup interval', () => {
      hlsService.startCleanupScheduler();
      
      assert.isTrue(hlsService.cleanupInterval !== null, 'Cleanup interval should be set');
      
      const logs = mockLogger.getLogs();
      const infoLogs = logs.filter(log => log.level === 'info');
      assert.isTrue(infoLogs.some(log => log.msg.includes('Started HLS segment cleanup scheduler')), 'Should log scheduler start');
    });
  });

  describe('stopCleanupScheduler', () => {
    test('should stop cleanup interval', () => {
      hlsService.startCleanupScheduler();
      assert.isTrue(hlsService.cleanupInterval !== null, 'Cleanup interval should be set');
      
      hlsService.stopCleanupScheduler();
      assert.equal(hlsService.cleanupInterval, null, 'Cleanup interval should be cleared');
      
      const logs = mockLogger.getLogs();
      const infoLogs = logs.filter(log => log.level === 'info');
      assert.isTrue(infoLogs.some(log => log.msg.includes('Stopped HLS segment cleanup scheduler')), 'Should log scheduler stop');
    });

    test('should handle stopping when not running', () => {
      hlsService.stopCleanupScheduler();
      
      // Should not throw
      assert.equal(hlsService.cleanupInterval, null, 'Cleanup interval should remain null');
    });
  });

  describe('cleanupOldSegments', () => {
    test('should not clean up when directory does not exist', () => {
      hlsService.cleanupOldSegments();
      
      // Should not throw
      const logs = mockLogger.getLogs();
      const warnLogs = logs.filter(log => log.level === 'warn');
      assert.isTrue(warnLogs.some(log => log.msg.includes('Failed to cleanup old segments')), 'Should log warning');
    });

    test('should not clean up when segments are within limit', () => {
      // Setup test directory with few segments
      hlsService.setupDirectory();
      
      const segmentPath1 = path.join('./test_hls', 'stream_001.ts');
      const segmentPath2 = path.join('./test_hls', 'stream_002.ts');
      
      fs.writeFileSync(segmentPath1, 'test content');
      fs.writeFileSync(segmentPath2, 'test content');
      
      hlsService.cleanupOldSegments();
      
      // Both segments should still exist (under limit of 7 = 5 + 2)
      assert.isTrue(fs.existsSync(segmentPath1), 'First segment should still exist');
      assert.isTrue(fs.existsSync(segmentPath2), 'Second segment should still exist');
    });

    test('should clean up old segments when over limit', () => {
      // Setup test directory with many segments
      hlsService.setupDirectory();
      
      const segmentPaths = [];
      for (let i = 1; i <= 10; i++) {
        const segmentPath = path.join('./test_hls', `stream_${i.toString().padStart(3, '0')}.ts`);
        fs.writeFileSync(segmentPath, 'test content');
        segmentPaths.push(segmentPath);
        
        // Add small delay to ensure different modification times
        const stats = fs.statSync(segmentPath);
        const newTime = new Date(stats.mtime.getTime() + i * 1000);
        fs.utimesSync(segmentPath, newTime, newTime);
      }
      
      hlsService.cleanupOldSegments();
      
      // Should keep only 7 segments (5 + 2 for safety)
      const remainingFiles = fs.readdirSync('./test_hls').filter(f => f.endsWith('.ts'));
      assert.isTrue(remainingFiles.length <= 7, `Should keep max 7 segments, but found ${remainingFiles.length}`);
    });
  });

  describe('getStreamUrl', () => {
    test('should return correct stream URL', () => {
      const baseUrl = 'http://localhost:3000';
      const expected = 'http://localhost:3000/hls/stream.m3u8';
      const actual = hlsService.getStreamUrl(baseUrl);
      
      assert.equal(actual, expected, 'Should return correct stream URL');
    });
  });

  describe('getOutputPath', () => {
    test('should return correct output path', () => {
      const expected = path.join('./test_hls', 'stream.m3u8');
      const actual = hlsService.getOutputPath();
      
      assert.equal(actual, expected, 'Should return correct output path');
    });
  });

  describe('getSegmentPatternPath', () => {
    test('should return correct segment pattern path', () => {
      const expected = path.join('./test_hls', 'stream_%03d.ts');
      const actual = hlsService.getSegmentPatternPath();
      
      assert.equal(actual, expected, 'Should return correct segment pattern path');
    });
  });

  describe('isGeneratingSegments', () => {
    test('should return false when playlist does not exist', () => {
      const result = hlsService.isGeneratingSegments();
      assert.isFalse(result, 'Should return false when playlist does not exist');
    });

    test('should return true when playlist exists', () => {
      hlsService.setupDirectory();
      const playlistPath = hlsService.getOutputPath();
      fs.writeFileSync(playlistPath, '#EXTM3U\n');
      
      const result = hlsService.isGeneratingSegments();
      assert.isTrue(result, 'Should return true when playlist exists');
    });
  });

  describe('getCurrentSegmentCount', () => {
    test('should return 0 when directory does not exist', () => {
      const count = hlsService.getCurrentSegmentCount();
      assert.equal(count, 0, 'Should return 0 when directory does not exist');
    });

    test('should return correct segment count', () => {
      hlsService.setupDirectory();
      
      // Create some segments
      fs.writeFileSync(path.join('./test_hls', 'stream_001.ts'), 'content');
      fs.writeFileSync(path.join('./test_hls', 'stream_002.ts'), 'content');
      fs.writeFileSync(path.join('./test_hls', 'other_file.txt'), 'content'); // Should not be counted
      
      const count = hlsService.getCurrentSegmentCount();
      assert.equal(count, 2, 'Should return correct segment count');
    });
  });

  describe('cleanupAll', () => {
    test('should remove all HLS files', () => {
      hlsService.setupDirectory();
      
      // Create test files
      const playlistPath = path.join('./test_hls', 'stream.m3u8');
      const segmentPath = path.join('./test_hls', 'stream_001.ts');
      const otherPath = path.join('./test_hls', 'other.txt');
      
      fs.writeFileSync(playlistPath, '#EXTM3U\n');
      fs.writeFileSync(segmentPath, 'segment content');
      fs.writeFileSync(otherPath, 'other content');
      
      hlsService.cleanupAll();
      
      // HLS files should be removed, other files should remain
      assert.isFalse(fs.existsSync(playlistPath), 'Playlist should be removed');
      assert.isFalse(fs.existsSync(segmentPath), 'Segment should be removed');
      assert.isTrue(fs.existsSync(otherPath), 'Other files should remain');
      
      const logs = mockLogger.getLogs();
      const infoLogs = logs.filter(log => log.level === 'info');
      assert.isTrue(infoLogs.some(log => log.msg.includes('Cleaned up all HLS files')), 'Should log cleanup');
    });

    test('should handle cleanup errors gracefully', () => {
      // Try to cleanup non-existent directory
      hlsService.cleanupAll();
      
      const logs = mockLogger.getLogs();
      const warnLogs = logs.filter(log => log.level === 'warn');
      assert.isTrue(warnLogs.some(log => log.msg.includes('Error cleaning up HLS files')), 'Should log warning for errors');
    });
  });
});