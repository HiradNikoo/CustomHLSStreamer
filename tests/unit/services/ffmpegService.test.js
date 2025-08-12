/**
 * FFmpeg Service Unit Tests
 */

'use strict';

const { spawn } = require('child_process');
const { mockLogger, assert } = require('../../helpers/testUtils');
const FFmpegService = require('../../../src/services/ffmpegService');

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn((cmd, callback) => {
    if (typeof callback === 'function') {
      callback(null, { stdout: '', stderr: '' });
    }
  })
}));

// Mock the config
jest.mock('../../../src/config', () => ({
  CONFIG: {
    http: { host: '0.0.0.0', port: 3000 },
    hls: { segmentTime: 2, playlistSize: 5, outputDir: './test_hls', playlistName: 'stream.m3u8' },
    fifos: { baseDir: './test_fifos', layers: ['overlay1.fifo', 'overlay2.fifo'] },
    background: { color: 'black', text: '', size: '1280x720' },
    initialContent: './test_assets/test.mp4',
    zmq: { port: 5555 },
    ffmpeg: { binary: 'echo', preset: 'ultrafast' }
  }
}));

// Mock the logger
jest.mock('../../../src/utils/logger', () => mockLogger);

describe('FFmpegService', () => {
  let ffmpegService;
  let mockFifoService;
  let mockHlsService;
  let mockProcess;
  
  beforeEach(() => {
    // Setup mock services
    mockFifoService = {
      getContentFifoPath: jest.fn(() => './test_fifos/content.fifo'),
      getLayerFifoPath: jest.fn((index) => `./test_fifos/overlay${index + 1}.fifo`),
      writeContent: jest.fn()
    };
    
    mockHlsService = {
      getOutputPath: jest.fn(() => './test_hls/stream.m3u8'),
      getSegmentPatternPath: jest.fn(() => './test_hls/stream_%03d.ts')
    };
    
    // Setup mock process
    mockProcess = {
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn(),
      kill: jest.fn()
    };
    
    spawn.mockReturnValue(mockProcess);
    
    ffmpegService = new FFmpegService(mockFifoService, mockHlsService);
    mockLogger.capture();
  });
  
  afterEach(() => {
    mockLogger.restore();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with correct default values', () => {
      assert.equal(ffmpegService.process, null, 'Process should be null initially');
      assert.isFalse(ffmpegService.isShuttingDown, 'isShuttingDown should be false initially');
      assert.equal(ffmpegService.fifoService, mockFifoService, 'Should store fifoService reference');
      assert.equal(ffmpegService.hlsService, mockHlsService, 'Should store hlsService reference');
    });
  });

  describe('buildArgs', () => {
    test('should build correct FFmpeg arguments', () => {
      const args = ffmpegService.buildArgs();
      
      // Check basic required elements (common to all platforms)
      assert.isTrue(args.includes('-f'), 'Should include format flag');
      assert.isTrue(args.includes('-i'), 'Should include input flag');
      
      // Check encoding options
      assert.isTrue(args.includes('-c:v'), 'Should include video codec');
      assert.isTrue(args.includes('libx264'), 'Should use libx264');
      assert.isTrue(args.includes('-preset'), 'Should include preset');
      
      // Check HLS options
      assert.isTrue(args.includes('hls'), 'Should output HLS');
    });

    test('should include correct number of inputs based on platform', () => {
      const args = ffmpegService.buildArgs();
      const inputCount = args.filter(arg => arg === '-i').length;
      
      if (process.platform === 'win32') {
        // Windows uses 2 inputs (background video + silent audio)
        assert.equal(inputCount, 2, 'Windows should have 2 inputs (background video + silent audio)');
        assert.isTrue(args.includes('color=c=black:size=1280x720:rate=30'), 'Should include background video source');
        assert.isTrue(args.includes('anullsrc=channel_layout=stereo:sample_rate=48000'), 'Should include silent audio source');
      } else {
        // Unix uses 5 inputs (background video/audio + content + 2 layers)
        assert.equal(inputCount, 5, 'Unix should have 5 inputs (background + content + 2 layers)');
        assert.isTrue(args.includes('color=c=black:size=1280x720:rate=30'), 'Should include background video source');
        assert.isTrue(args.includes('anullsrc=channel_layout=stereo:sample_rate=48000'), 'Should include silent audio source');
        assert.isTrue(args.includes('./test_fifos/content.fifo'), 'Should include content FIFO');
        assert.isTrue(args.includes('./test_fifos/overlay1.fifo'), 'Should include first layer FIFO');
        assert.isTrue(args.includes('./test_fifos/overlay2.fifo'), 'Should include second layer FIFO');
      }
    });
  });

  describe('buildFilterComplex', () => {
    test('should build correct filter for 2 layers on Unix', () => {
      if (process.platform === 'win32') {
        // Windows doesn't use buildFilterComplex - skip this test
        return;
      }
      
      const filter = ffmpegService.buildFilterComplex();
      
      assert.isTrue(filter.includes('overlay'), 'Should include overlay filter');
      assert.isTrue(filter.includes('zmq'), 'Should include ZMQ filter');
      assert.isTrue(filter.includes('amix'), 'Should include audio mixing');
      assert.isTrue(filter.includes('inputs=4'), 'Should mix 4 audio inputs');
    });

    test('should return simplified filter on Windows', () => {
      if (process.platform !== 'win32') {
        return; // Skip on non-Windows
      }
      
      const filter = ffmpegService.buildFilterComplex();
      assert.isTrue(filter.includes('zmq'), 'Windows should include ZMQ filter');
      assert.isTrue(filter.includes('aout'), 'Should include aout output');
    });
  });

  describe('start', () => {
    test('should not start if process is already running', async () => {
      ffmpegService.process = mockProcess;
      
      await ffmpegService.start();
      
      assert.isFalse(spawn.mock.calls.length > 0, 'Should not call spawn');
      
      const logs = mockLogger.getLogs();
      const warnLogs = logs.filter(log => log.level === 'warn');
      assert.isTrue(warnLogs.some(log => log.msg.includes('already running')), 'Should log warning');
    });

    test('should start FFmpeg process successfully', async () => {
      await ffmpegService.start();
      
      assert.isTrue(spawn.mock.calls.length === 1, 'Should call spawn once');
      assert.equal(ffmpegService.process, mockProcess, 'Should store process reference');
      
      const [binary, args, options] = spawn.mock.calls[0];
      assert.equal(binary, 'echo', 'Should use correct binary (mocked)');
      assert.isTrue(Array.isArray(args), 'Should pass arguments array');
      assert.isTrue(Array.isArray(options.stdio) || typeof options.stdio === 'string', 'Should set stdio options');
      
      const logs = mockLogger.getLogs();
      const infoLogs = logs.filter(log => log.level === 'info');
      assert.isTrue(infoLogs.some(log => log.msg.includes('Starting FFmpeg process')), 'Should log start');
      assert.isTrue(infoLogs.some(log => log.msg.includes('started successfully')), 'Should log success');
    });

    test('should setup event handlers', async () => {
      await ffmpegService.start();
      
      // Check that event handlers were registered
      assert.isTrue(mockProcess.stdout.on.mock.calls.length > 0, 'Should register stdout handler');
      assert.isTrue(mockProcess.stderr.on.mock.calls.length > 0, 'Should register stderr handler');
      assert.isTrue(mockProcess.on.mock.calls.length >= 2, 'Should register process event handlers');
      
      // Check event types
      const eventTypes = mockProcess.on.mock.calls.map(call => call[0]);
      assert.isTrue(eventTypes.includes('close'), 'Should register close handler');
      assert.isTrue(eventTypes.includes('error'), 'Should register error handler');
    });
  });

  describe('stop', () => {
    test('should do nothing if process is not running', () => {
      ffmpegService.stop();
      
      // Should not throw
      assert.equal(ffmpegService.process, null, 'Process should remain null');
    });

    test('should stop running process', () => {
      ffmpegService.process = mockProcess;
      
      ffmpegService.stop();
      
      assert.isTrue(mockProcess.kill.mock.calls.length === 1, 'Should call kill once');
      assert.equal(mockProcess.kill.mock.calls[0][0], 'SIGTERM', 'Should send SIGTERM');
      
      const logs = mockLogger.getLogs();
      const infoLogs = logs.filter(log => log.level === 'info');
      assert.isTrue(infoLogs.some(log => log.msg.includes('Stopping FFmpeg process')), 'Should log stop');
    });
  });

  describe('isRunning', () => {
    test('should return false when process is null', () => {
      assert.isFalse(ffmpegService.isRunning(), 'Should return false when process is null');
    });

    test('should return true when process is set', () => {
      ffmpegService.process = mockProcess;
      assert.isTrue(ffmpegService.isRunning(), 'Should return true when process is set');
    });
  });

  describe('setShuttingDown', () => {
    test('should set shutdown flag', () => {
      ffmpegService.setShuttingDown(true);
      assert.isTrue(ffmpegService.isShuttingDown, 'Should set isShuttingDown to true');
      
      ffmpegService.setShuttingDown(false);
      assert.isFalse(ffmpegService.isShuttingDown, 'Should set isShuttingDown to false');
    });
  });

  describe('initializeContent', () => {
    test('should use initial content if file exists on Unix', async () => {
      if (process.platform === 'win32') {
        return; // Skip on Windows
      }
      
      // Mock fs.existsSync to return true
      const fs = require('fs');
      const originalExistsSync = fs.existsSync;
      fs.existsSync = jest.fn(() => true);
      
      mockFifoService.writeContent.mockResolvedValue(true);
      
      await ffmpegService.initializeContent();
      
      assert.isTrue(mockFifoService.writeContent.mock.calls.length === 1, 'Should call writeContent');
      assert.equal(mockFifoService.writeContent.mock.calls[0][0], './test_assets/test.mp4', 'Should use initial content path');
      
      const logs = mockLogger.getLogs();
      const infoLogs = logs.filter(log => log.level === 'info');
      assert.isTrue(infoLogs.some(log => log.msg.includes('Initializing with default content')), 'Should log initialization');
      
      // Restore
      fs.existsSync = originalExistsSync;
    });

    test('should create blank placeholder if initial content does not exist on Unix', async () => {
      if (process.platform === 'win32') {
        return; // Skip on Windows
      }
      
      // Mock fs.existsSync to return false
      const fs = require('fs');
      const originalExistsSync = fs.existsSync;
      fs.existsSync = jest.fn(() => false);
      
      // Mock execAsync
      const util = require('util');
      const originalPromisify = util.promisify;
      util.promisify = jest.fn(() => jest.fn().mockResolvedValue());
      
      mockFifoService.writeContent.mockResolvedValue(true);
      
      await ffmpegService.initializeContent();
      
      const logs = mockLogger.getLogs();
      const warnLogs = logs.filter(log => log.level === 'warn');
      const infoLogs = logs.filter(log => log.level === 'info');

      assert.isTrue(warnLogs.some(log => log.msg.includes('Initial content file not found')), 'Should log warning');
      assert.isTrue(infoLogs.some(log => log.msg.includes('Creating a blank placeholder')), 'Should log blank placeholder creation');

      // Restore
      fs.existsSync = originalExistsSync;
      util.promisify = originalPromisify;
    });

    test('should skip initialization on Windows', async () => {
      if (process.platform !== 'win32') {
        return; // Skip on non-Windows
      }
      
      await ffmpegService.initializeContent();
      
      // Should not call writeContent on Windows
      assert.equal(mockFifoService.writeContent.mock.calls.length, 0, 'Should not call writeContent on Windows');
      
      const logs = mockLogger.getLogs();
      const infoLogs = logs.filter(log => log.level === 'info');
      assert.isTrue(infoLogs.some(log => log.msg.includes('Windows mode')), 'Should log Windows mode message');
    });
  });
});