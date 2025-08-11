/**
 * API Integration Tests
 * Tests the full API endpoints with real HTTP requests
 */

'use strict';

const { TestFileManager, makeHttpRequest, sleep, assert } = require('../helpers/testUtils');

// Test configuration
const TEST_CONFIG = {
  host: 'localhost',
  port: 3000, // Use main server port
  timeout: 10000
};

describe('API Integration Tests', () => {
  let testFileManager;
  let baseUrl;
  
  beforeAll(() => {
    testFileManager = new TestFileManager();
    testFileManager.setup();
    baseUrl = `http://${TEST_CONFIG.host}:${TEST_CONFIG.port}`;
    
    console.log('🚧 API Integration Tests require the HLS streamer to be running');
    console.log(`   Start it with: npm start (on port ${TEST_CONFIG.port})`);
    console.log(`   Or modify these tests to start/stop the server automatically`);
  });
  
  afterAll(() => {
    testFileManager.cleanup();
  });

  describe('GET /api/status', () => {
    test('should return server status', async () => {
      const response = await makeHttpRequest({
        hostname: TEST_CONFIG.host,
        port: TEST_CONFIG.port,
        path: '/api/status',
        method: 'GET',
        timeout: TEST_CONFIG.timeout
      });
      
      assert.equal(response.statusCode, 200, 'Should return 200 status code');
      assert.isTrue(response.data !== null, 'Should return data');
      assert.isTrue(typeof response.data === 'object', 'Should return object');
      
      // Check required fields
      assert.isTrue(response.data.hasOwnProperty('ffmpeg'), 'Should include ffmpeg status');
      assert.isTrue(response.data.hasOwnProperty('zmq'), 'Should include zmq status');
      assert.isTrue(response.data.hasOwnProperty('uptime'), 'Should include uptime');
      assert.isTrue(response.data.hasOwnProperty('timestamp'), 'Should include timestamp');
    });
  });

  describe('GET /api/health', () => {
    test('should return health check', async () => {
      const response = await makeHttpRequest({
        hostname: TEST_CONFIG.host,
        port: TEST_CONFIG.port,
        path: '/api/health',
        method: 'GET',
        timeout: TEST_CONFIG.timeout
      });
      
      assert.isTrue([200, 503].includes(response.statusCode), 'Should return 200 or 503 status code');
      assert.isTrue(response.data !== null, 'Should return data');
      assert.isTrue(response.data.hasOwnProperty('healthy'), 'Should include healthy flag');
      assert.isTrue(response.data.hasOwnProperty('services'), 'Should include services status');
    });
  });

  describe('Sample Files Tests', () => {
    test('should accept sample video1.mp4 for content update', async () => {
      const response = await makeHttpRequest({
        hostname: TEST_CONFIG.host,
        port: TEST_CONFIG.port,
        path: '/api/update',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: TEST_CONFIG.timeout
      }, {
        type: 'content',
        data: './samples/video1.mp4'
      });
      
      // Should accept the file path (success depends on platform/implementation)
      assert.equal(response.statusCode, 200, 'Should return 200 status code');
      assert.isTrue(response.data !== null, 'Should return data');
      assert.isTrue(response.data.hasOwnProperty('success'), 'Should include success field');
    });

    test('should accept sample video2.mp4 for content update', async () => {
      const response = await makeHttpRequest({
        hostname: TEST_CONFIG.host,
        port: TEST_CONFIG.port,
        path: '/api/update',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: TEST_CONFIG.timeout
      }, {
        type: 'content',
        data: './samples/video2.mp4'
      });
      
      // Should accept the file path (success depends on platform/implementation)
      assert.equal(response.statusCode, 200, 'Should return 200 status code');
      assert.isTrue(response.data !== null, 'Should return data');
      assert.isTrue(response.data.hasOwnProperty('success'), 'Should include success field');
    });

    test('should accept sample watermark.png for layer update', async () => {
      const response = await makeHttpRequest({
        hostname: TEST_CONFIG.host,
        port: TEST_CONFIG.port,
        path: '/api/update',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: TEST_CONFIG.timeout
      }, {
        type: 'layer',
        data: {
          index: 0,
          path: './samples/watermark.png'
        }
      });
      
      // Should accept the file path (success depends on platform/implementation)
      assert.equal(response.statusCode, 200, 'Should return 200 status code');
      assert.isTrue(response.data !== null, 'Should return data');
      assert.isTrue(response.data.hasOwnProperty('success'), 'Should include success field');
    });

    test('should test complete workflow with sample files', async () => {
      // First update content to video1
      const contentResponse1 = await makeHttpRequest({
        hostname: TEST_CONFIG.host,
        port: TEST_CONFIG.port,
        path: '/api/update',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: TEST_CONFIG.timeout
      }, {
        type: 'content',
        data: './samples/video1.mp4'
      });
      
      assert.equal(contentResponse1.statusCode, 200, 'Video1 content update should return 200');
      
      // Wait a moment
      await sleep(1000);
      
      // Add watermark overlay
      const layerResponse = await makeHttpRequest({
        hostname: TEST_CONFIG.host,
        port: TEST_CONFIG.port,
        path: '/api/update',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: TEST_CONFIG.timeout
      }, {
        type: 'layer',
        data: {
          index: 0,
          path: './samples/watermark.png'
        }
      });
      
      assert.equal(layerResponse.statusCode, 200, 'Watermark overlay should return 200');
      
      // Wait a moment
      await sleep(1000);
      
      // Switch to video2
      const contentResponse2 = await makeHttpRequest({
        hostname: TEST_CONFIG.host,
        port: TEST_CONFIG.port,
        path: '/api/update',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: TEST_CONFIG.timeout
      }, {
        type: 'content',
        data: './samples/video2.mp4'
      });
      
      assert.equal(contentResponse2.statusCode, 200, 'Video2 content update should return 200');
      
      // Check status after all updates
      const statusResponse = await makeHttpRequest({
        hostname: TEST_CONFIG.host,
        port: TEST_CONFIG.port,
        path: '/api/status',
        method: 'GET',
        timeout: TEST_CONFIG.timeout
      });
      
      assert.equal(statusResponse.statusCode, 200, 'Status should return 200');
      assert.isTrue(statusResponse.data !== null, 'Status should return data');
    });
  });

  describe('POST /api/update', () => {
    describe('Content Updates', () => {
      test('should accept valid content update', async () => {
        const testVideo = testFileManager.createTestVideo('integration_test.mp4');
        
        const response = await makeHttpRequest({
          hostname: TEST_CONFIG.host,
          port: TEST_CONFIG.port,
          path: '/api/update',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: TEST_CONFIG.timeout
        }, {
          type: 'content',
          data: testVideo
        });
        
        assert.equal(response.statusCode, 200, 'Should return 200 status code');
        assert.isTrue(response.data.success, 'Should indicate success');
        assert.isTrue(response.data.message.includes('Content updated'), 'Should include success message');
      });

      test('should reject invalid content path', async () => {
        const response = await makeHttpRequest({
          hostname: TEST_CONFIG.host,
          port: TEST_CONFIG.port,
          path: '/api/update',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: TEST_CONFIG.timeout
        }, {
          type: 'content',
          data: '/non/existent/file.mp4'
        });
        
        assert.equal(response.statusCode, 200, 'Should return 200 status code');
        assert.isFalse(response.data.success, 'Should indicate failure');
      });
    });

    describe('Layer Updates', () => {
      test('should accept valid layer update', async () => {
        const testOverlay = testFileManager.createTestImage('integration_overlay.png');
        
        const response = await makeHttpRequest({
          hostname: TEST_CONFIG.host,
          port: TEST_CONFIG.port,
          path: '/api/update',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: TEST_CONFIG.timeout
        }, {
          type: 'layer',
          data: {
            index: 0,
            path: testOverlay
          }
        });
        
        assert.equal(response.statusCode, 200, 'Should return 200 status code');
        assert.isTrue(response.data.success, 'Should indicate success');
        assert.isTrue(response.data.message.includes('Layer 0 updated'), 'Should include success message');
      });

      test('should handle invalid layer index', async () => {
        const testOverlay = testFileManager.createTestImage('integration_overlay.png');
        
        const response = await makeHttpRequest({
          hostname: TEST_CONFIG.host,
          port: TEST_CONFIG.port,
          path: '/api/update',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: TEST_CONFIG.timeout
        }, {
          type: 'layer',
          data: {
            index: 99,
            path: testOverlay
          }
        });
        
        // Should return response (may succeed or fail depending on implementation)
        assert.equal(response.statusCode, 200, 'Should return 200 status code');
        assert.isTrue(response.data !== null, 'Should return data');
        assert.isTrue(response.data.hasOwnProperty('success'), 'Should include success field');
      });
    });

    describe('Filter Commands', () => {
      test('should accept valid filter command', async () => {
        const response = await makeHttpRequest({
          hostname: TEST_CONFIG.host,
          port: TEST_CONFIG.port,
          path: '/api/update',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: TEST_CONFIG.timeout
        }, {
          type: 'filter',
          data: {
            command: 'Parsed_overlay_1 x=100:y=200'
          }
        });
        
        assert.equal(response.statusCode, 200, 'Should return 200 status code');
        assert.isTrue(response.data.success, 'Should indicate success');
        assert.isTrue(response.data.message.includes('Filter command sent'), 'Should include success message');
      });

      test('should handle invalid filter command', async () => {
        const response = await makeHttpRequest({
          hostname: TEST_CONFIG.host,
          port: TEST_CONFIG.port,
          path: '/api/update',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: TEST_CONFIG.timeout
        }, {
          type: 'filter',
          data: {
            command: 'invalid_filter_command'
          }
        });
        
        // Should handle invalid command gracefully
        assert.equal(response.statusCode, 200, 'Should return 200 status code');
        assert.isTrue(response.data !== null, 'Should return data');
        assert.isTrue(response.data.hasOwnProperty('success'), 'Should include success field');
      });

      test('should handle invalid update type', async () => {
        const response = await makeHttpRequest({
          hostname: TEST_CONFIG.host,
          port: TEST_CONFIG.port,
          path: '/api/update',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: TEST_CONFIG.timeout
        }, {
          type: 'invalid_type',
          data: 'some data'
        });
        
        assert.equal(response.statusCode, 400, 'Should return 400 status code');
        assert.isFalse(response.data.success, 'Should indicate failure');
        assert.isTrue(response.data.message.includes('Invalid update type'), 'Should include error message');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for unknown endpoints', async () => {
      const response = await makeHttpRequest({
        hostname: TEST_CONFIG.host,
        port: TEST_CONFIG.port,
        path: '/api/unknown_endpoint',
        method: 'GET',
        timeout: TEST_CONFIG.timeout
      });
      
      assert.equal(response.statusCode, 404, 'Should return 404 status code');
      // The response might not have JSON data for 404s, so just check status code
    });
  });

  describe('CORS Headers', () => {
    test('should include CORS headers for API endpoints', async () => {
      const response = await makeHttpRequest({
        hostname: TEST_CONFIG.host,
        port: TEST_CONFIG.port,
        path: '/api/status',
        method: 'GET',
        timeout: TEST_CONFIG.timeout
      });
      
      // Check CORS headers
      assert.isTrue(response.headers.hasOwnProperty('access-control-allow-origin'), 'Should include CORS origin header');
      assert.equal(response.headers['access-control-allow-origin'], '*', 'Should allow all origins');
    });
  });
});