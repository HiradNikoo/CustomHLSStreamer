/**
 * FFmpeg Service Unit Tests
 */

'use strict';

const { spawn } = require('child_process');
const { mockLogger, testConfig, assert } = require('../../helpers/testUtils');
const FFmpegService = require('../../../src/services/ffmpegService');

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn()
}));

// Mock the config
jest.mock('../../../src/config', () => ({
  CONFIG: testConfig
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
      
      // Check input arguments
      assert.isTrue(args.includes('-f'), 'Should include format flag');
      assert.isTrue(args.includes('concat'), 'Should use concat format');
      assert.isTrue(args.includes('-i'), 'Should include input flag');
      assert.isTrue(args.includes('./test_fifos/content.fifo'), 'Should include content FIFO');
      
      // Check filter complex
      assert.isTrue(args.includes('-filter_complex'), 'Should include filter_complex');
      
      // Check encoding options
      assert.isTrue(args.includes('-c:v'), 'Should include video codec');
      assert.isTrue(args.includes('libx264'), 'Should use libx264');
      assert.isTrue(args.includes('-preset'), 'Should include preset');
      
      // Check HLS options
      assert.isTrue(args.includes('-f'), 'Should include HLS format');
      assert.isTrue(args.includes('hls'), 'Should output HLS');
    });

    test('should include all layer inputs', () => {
      const args = ffmpegService.buildArgs();
      
      // Should have 3 inputs total (1 content + 2 layers)
      const inputCount = args.filter(arg => arg === '-i').length;
      assert.equal(inputCount, 3, 'Should have 3 inputs (1 content + 2 layers)');
      
      // Should include both layer FIFOs
      assert.isTrue(args.includes('./test_fifos/overlay1.fifo'), 'Should include first layer FIFO');
      assert.isTrue(args.includes('./test_fifos/overlay2.fifo'), 'Should include second layer FIFO');
    });
  });

  describe('buildFilterComplex', () => {
    test('should build correct filter for 2 layers', () => {
      const filter = ffmpegService.buildFilterComplex();
      
      assert.isTrue(filter.includes('overlay'), 'Should include overlay filter');
      assert.isTrue(filter.includes('zmq'), 'Should include ZMQ filter');
      assert.isTrue(filter.includes('amix'), 'Should include audio mixing');
      assert.isTrue(filter.includes('inputs=3'), 'Should mix 3 audio inputs');
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
      assert.isTrue(options.stdio, 'Should set stdio options');
      
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
    test('should use initial content if file exists', async () => {
      // Mock fs.existsSync to return true
      const fs = require('fs');
      const originalExistsSync = fs.existsSync;
      fs.existsSync = jest.fn(() => true);
      
      mockFifoService.writeContent.mockResolvedValue(true);
      
      await ffmpegService.initializeContent();
      
      assert.isTrue(mockFifoService.writeContent.mock.calls.length === 1, 'Should call writeContent');
      assert.equal(mockFifoService.writeContent.mock.calls[0][0], testConfig.initialContent, 'Should use initial content path');
      
      const logs = mockLogger.getLogs();
      const infoLogs = logs.filter(log => log.level === 'info');
      assert.isTrue(infoLogs.some(log => log.msg.includes('Initializing with default content')), 'Should log initialization');
      
      // Restore
      fs.existsSync = originalExistsSync;
    });

    test('should create test pattern if initial content does not exist', async () => {
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
      assert.isTrue(infoLogs.some(log => log.msg.includes('Creating a basic test pattern')), 'Should log test pattern creation');
      
      // Restore
      fs.existsSync = originalExistsSync;
      util.promisify = originalPromisify;
    });
  });
});