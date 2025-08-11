/**
 * Stream Controller Unit Tests
 */

'use strict';

const { mockLogger, assert } = require('../../helpers/testUtils');
const StreamController = require('../../../src/controllers/streamController');

// Mock the logger
jest.mock('../../../src/utils/logger', () => mockLogger);

describe('StreamController', () => {
  let streamController;
  let mockFifoService;
  let mockZmqService;
  let mockFFmpegService;
  let mockHlsService;
  let mockReq;
  let mockRes;
  
  beforeEach(() => {
    // Setup mock services
    mockFifoService = {
      writeContent: jest.fn(),
      writeLayer: jest.fn()
    };
    
    mockZmqService = {
      sendInstruction: jest.fn(),
      isConnected: jest.fn()
    };
    
    mockFFmpegService = {
      isRunning: jest.fn()
    };
    
    mockHlsService = {
      isGeneratingSegments: jest.fn(),
      getCurrentSegmentCount: jest.fn(),
      getStreamUrl: jest.fn()
    };
    
    streamController = new StreamController(
      mockFifoService,
      mockZmqService,
      mockFFmpegService,
      mockHlsService
    );
    
    // Setup mock request/response
    mockReq = {
      body: {},
      protocol: 'http',
      get: jest.fn(() => 'localhost:3000')
    };
    
    mockRes = {
      json: jest.fn(),
      status: jest.fn(() => mockRes)
    };
    
    mockLogger.capture();
  });
  
  afterEach(() => {
    mockLogger.restore();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with all services', () => {
      assert.equal(streamController.fifoService, mockFifoService, 'Should store fifoService');
      assert.equal(streamController.zmqService, mockZmqService, 'Should store zmqService');
      assert.equal(streamController.ffmpegService, mockFFmpegService, 'Should store ffmpegService');
      assert.equal(streamController.hlsService, mockHlsService, 'Should store hlsService');
    });
  });

  describe('updateStream', () => {
    describe('Content Updates', () => {
      test('should handle successful content update', async () => {
        mockReq.body = {
          type: 'content',
          data: '/path/to/video.mp4'
        };
        
        mockFifoService.writeContent.mockResolvedValue(true);
        
        await streamController.updateStream(mockReq, mockRes);
        
        assert.isTrue(mockFifoService.writeContent.mock.calls.length === 1, 'Should call writeContent');
        assert.equal(mockFifoService.writeContent.mock.calls[0][0], '/path/to/video.mp4', 'Should pass correct path');
        
        assert.isTrue(mockRes.json.mock.calls.length === 1, 'Should call res.json');
        const response = mockRes.json.mock.calls[0][0];
        assert.isTrue(response.success, 'Should indicate success');
        assert.isTrue(response.message.includes('Content updated'), 'Should include success message');
      });

      test('should handle failed content update', async () => {
        mockReq.body = {
          type: 'content',
          data: '/path/to/invalid.mp4'
        };
        
        mockFifoService.writeContent.mockResolvedValue(false);
        
        await streamController.updateStream(mockReq, mockRes);
        
        const response = mockRes.json.mock.calls[0][0];
        assert.isFalse(response.success, 'Should indicate failure');
        assert.isTrue(response.message.includes('Failed to update content'), 'Should include failure message');
      });
    });

    describe('Layer Updates', () => {
      test('should handle successful layer update', async () => {
        mockReq.body = {
          type: 'layer',
          data: {
            index: 0,
            path: '/path/to/overlay.png'
          }
        };
        
        mockFifoService.writeLayer.mockResolvedValue(true);
        
        await streamController.updateStream(mockReq, mockRes);
        
        assert.isTrue(mockFifoService.writeLayer.mock.calls.length === 1, 'Should call writeLayer');
        assert.equal(mockFifoService.writeLayer.mock.calls[0][0], 0, 'Should pass correct index');
        assert.equal(mockFifoService.writeLayer.mock.calls[0][1], '/path/to/overlay.png', 'Should pass correct path');
        
        const response = mockRes.json.mock.calls[0][0];
        assert.isTrue(response.success, 'Should indicate success');
        assert.isTrue(response.message.includes('Layer 0 updated'), 'Should include success message');
      });

      test('should handle failed layer update', async () => {
        mockReq.body = {
          type: 'layer',
          data: {
            index: 1,
            path: '/path/to/invalid.png'
          }
        };
        
        mockFifoService.writeLayer.mockResolvedValue(false);
        
        await streamController.updateStream(mockReq, mockRes);
        
        const response = mockRes.json.mock.calls[0][0];
        assert.isFalse(response.success, 'Should indicate failure');
        assert.isTrue(response.message.includes('Failed to update layer 1'), 'Should include failure message');
      });
    });

    describe('Filter Updates', () => {
      test('should handle successful filter command', async () => {
        mockReq.body = {
          type: 'filter',
          data: {
            command: 'Parsed_overlay_1 x=100:y=200'
          }
        };
        
        mockZmqService.sendInstruction.mockResolvedValue(true);
        
        await streamController.updateStream(mockReq, mockRes);
        
        assert.isTrue(mockZmqService.sendInstruction.mock.calls.length === 1, 'Should call sendInstruction');
        assert.equal(mockZmqService.sendInstruction.mock.calls[0][0], 'Parsed_overlay_1 x=100:y=200', 'Should pass correct command');
        
        const response = mockRes.json.mock.calls[0][0];
        assert.isTrue(response.success, 'Should indicate success');
        assert.isTrue(response.message.includes('Filter command sent'), 'Should include success message');
      });

      test('should handle failed filter command', async () => {
        mockReq.body = {
          type: 'filter',
          data: {
            command: 'invalid command'
          }
        };
        
        mockZmqService.sendInstruction.mockResolvedValue(false);
        
        await streamController.updateStream(mockReq, mockRes);
        
        const response = mockRes.json.mock.calls[0][0];
        assert.isFalse(response.success, 'Should indicate failure');
        assert.isTrue(response.message.includes('Failed to send filter command'), 'Should include failure message');
      });
    });

    describe('Invalid Updates', () => {
      test('should handle invalid update type', async () => {
        mockReq.body = {
          type: 'invalid_type',
          data: 'some data'
        };
        
        await streamController.updateStream(mockReq, mockRes);
        
        assert.isTrue(mockRes.status.mock.calls.length === 1, 'Should call res.status');
        assert.equal(mockRes.status.mock.calls[0][0], 400, 'Should return 400 status');
        
        const response = mockRes.json.mock.calls[0][0];
        assert.isFalse(response.success, 'Should indicate failure');
        assert.isTrue(response.message.includes('Invalid update type'), 'Should include error message');
        assert.isTrue(response.validTypes.includes('content'), 'Should include valid types');
      });

      test('should handle errors gracefully', async () => {
        mockReq.body = {
          type: 'content',
          data: '/path/to/video.mp4'
        };
        
        const error = new Error('Service error');
        mockFifoService.writeContent.mockRejectedValue(error);
        
        await streamController.updateStream(mockReq, mockRes);
        
        assert.isTrue(mockRes.status.mock.calls.length === 1, 'Should call res.status');
        assert.equal(mockRes.status.mock.calls[0][0], 500, 'Should return 500 status');
        
        const response = mockRes.json.mock.calls[0][0];
        assert.isFalse(response.success, 'Should indicate failure');
        assert.isTrue(response.message.includes('Internal server error'), 'Should include error message');
        
        const logs = mockLogger.getLogs();
        const errorLogs = logs.filter(log => log.level === 'error');
        assert.isTrue(errorLogs.some(log => log.msg.includes('Stream update error')), 'Should log error');
      });
    });
  });

  describe('getStatus', () => {
    test('should return complete status information', () => {
      mockFFmpegService.isRunning.mockReturnValue(true);
      mockZmqService.isConnected.mockReturnValue(true);
      mockHlsService.isGeneratingSegments.mockReturnValue(true);
      mockHlsService.getCurrentSegmentCount.mockReturnValue(3);
      
      streamController.getStatus(mockReq, mockRes);
      
      assert.isTrue(mockRes.json.mock.calls.length === 1, 'Should call res.json');
      const response = mockRes.json.mock.calls[0][0];
      
      assert.equal(response.ffmpeg, 'running', 'Should include FFmpeg status');
      assert.equal(response.zmq, 'connected', 'Should include ZMQ status');
      assert.isTrue(response.hls.generating, 'Should include HLS generating status');
      assert.equal(response.hls.segmentCount, 3, 'Should include segment count');
      assert.isTrue(typeof response.uptime === 'number', 'Should include uptime');
      assert.isTrue(response.hasOwnProperty('memory'), 'Should include memory info');
      assert.isTrue(response.hasOwnProperty('timestamp'), 'Should include timestamp');
    });

    test('should handle status errors', () => {
      mockFFmpegService.isRunning.mockImplementation(() => {
        throw new Error('Status error');
      });
      
      streamController.getStatus(mockReq, mockRes);
      
      assert.isTrue(mockRes.status.mock.calls.length === 1, 'Should call res.status');
      assert.equal(mockRes.status.mock.calls[0][0], 500, 'Should return 500 status');
      
      const logs = mockLogger.getLogs();
      const errorLogs = logs.filter(log => log.level === 'error');
      assert.isTrue(errorLogs.some(log => log.msg.includes('Status error')), 'Should log error');
    });
  });

  describe('getStreamInfo', () => {
    test('should return stream information with URLs', () => {
      mockHlsService.getStreamUrl.mockReturnValue('http://localhost:3000/hls/stream.m3u8');
      
      streamController.getStreamInfo(mockReq, mockRes);
      
      assert.isTrue(mockRes.json.mock.calls.length === 1, 'Should call res.json');
      const response = mockRes.json.mock.calls[0][0];
      
      assert.equal(response.streamUrl, 'http://localhost:3000/hls/stream.m3u8', 'Should include stream URL');
      assert.isTrue(response.dashboardUrl.includes('localhost:3000'), 'Should include dashboard URL');
      assert.isTrue(response.hasOwnProperty('apiEndpoints'), 'Should include API endpoints');
      assert.isTrue(response.hasOwnProperty('usage'), 'Should include usage examples');
      assert.isTrue(response.hasOwnProperty('timestamp'), 'Should include timestamp');
    });
  });

  describe('healthCheck', () => {
    test('should return healthy status when services are running', () => {
      mockFFmpegService.isRunning.mockReturnValue(true);
      mockZmqService.isConnected.mockReturnValue(true);
      mockHlsService.isGeneratingSegments.mockReturnValue(true);
      
      streamController.healthCheck(mockReq, mockRes);
      
      assert.isTrue(mockRes.status.mock.calls.length === 1, 'Should call res.status');
      assert.equal(mockRes.status.mock.calls[0][0], 200, 'Should return 200 status');
      
      const response = mockRes.json.mock.calls[0][0];
      assert.isTrue(response.healthy, 'Should indicate healthy');
      assert.isTrue(response.services.ffmpeg, 'Should show FFmpeg as running');
      assert.isTrue(response.services.zmq, 'Should show ZMQ as connected');
    });

    test('should return unhealthy status when services are down', () => {
      mockFFmpegService.isRunning.mockReturnValue(false);
      mockZmqService.isConnected.mockReturnValue(false);
      mockHlsService.isGeneratingSegments.mockReturnValue(false);
      
      streamController.healthCheck(mockReq, mockRes);
      
      assert.isTrue(mockRes.status.mock.calls.length === 1, 'Should call res.status');
      assert.equal(mockRes.status.mock.calls[0][0], 503, 'Should return 503 status');
      
      const response = mockRes.json.mock.calls[0][0];
      assert.isFalse(response.healthy, 'Should indicate unhealthy');
      assert.isFalse(response.services.ffmpeg, 'Should show FFmpeg as stopped');
      assert.isFalse(response.services.zmq, 'Should show ZMQ as disconnected');
    });
  });
});