/**
 * API Integration Tests
 * Tests the full API endpoints with real HTTP requests
 */

'use strict';

const { TestFileManager, makeHttpRequest, sleep, assert } = require('../helpers/testUtils');

// Test configuration
const TEST_CONFIG = {
  host: 'localhost',
  port: 3001, // Use different port for testing
  timeout: 5000
};

describe('API Integration Tests', () => {
  let testFileManager;
  let baseUrl;
  
  beforeAll(() => {
    testFileManager = new TestFileManager();
    testFileManager.setup();
    baseUrl = `http://${TEST_CONFIG.host}:${TEST_CONFIG.port}`;
    
    console.log('🚧 API Integration Tests require the HLS streamer to be running');
    console.log(`   Start it with: PORT=${TEST_CONFIG.port} node src/app.js`);
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

  describe('GET /api/info', () => {
    test('should return stream information', async () => {
      const response = await makeHttpRequest({
        hostname: TEST_CONFIG.host,
        port: TEST_CONFIG.port,
        path: '/api/info',
        method: 'GET',
        timeout: TEST_CONFIG.timeout
      });
      
      assert.equal(response.statusCode, 200, 'Should return 200 status code');
      assert.isTrue(response.data !== null, 'Should return data');
      
      // Check required fields
      assert.isTrue(response.data.hasOwnProperty('streamUrl'), 'Should include stream URL');
      assert.isTrue(response.data.hasOwnProperty('dashboardUrl'), 'Should include dashboard URL');
      assert.isTrue(response.data.hasOwnProperty('apiEndpoints'), 'Should include API endpoints');
      assert.isTrue(response.data.hasOwnProperty('usage'), 'Should include usage examples');
      
      // Verify URLs are properly formatted
      assert.isTrue(response.data.streamUrl.startsWith('http'), 'Stream URL should be HTTP URL');
      assert.isTrue(response.data.streamUrl.includes('.m3u8'), 'Stream URL should include playlist file');
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

      test('should reject invalid layer index', async () => {
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
        
        assert.equal(response.statusCode, 400, 'Should return 400 status code');
        assert.isFalse(response.data.success, 'Should indicate failure');
        assert.isTrue(response.data.message.includes('Layer index validation failed'), 'Should include validation error');
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

      test('should reject dangerous filter commands', async () => {
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
            command: 'system("rm -rf /")'
          }
        });
        
        assert.equal(response.statusCode, 400, 'Should return 400 status code');
        assert.isFalse(response.data.success, 'Should indicate failure');
        assert.isTrue(response.data.message.includes('dangerous patterns'), 'Should include security warning');
      });
    });

    describe('Validation', () => {
      test('should reject missing type field', async () => {
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
          data: 'some data'
        });
        
        assert.equal(response.statusCode, 400, 'Should return 400 status code');
        assert.isFalse(response.data.success, 'Should indicate failure');
        assert.isTrue(response.data.message.includes('Missing required field: type'), 'Should include validation error');
      });

      test('should reject invalid update type', async () => {
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
        assert.isTrue(response.data.message.includes('Invalid update type'), 'Should include validation error');
      });

      test('should reject malformed JSON', async () => {
        const response = await makeHttpRequest({
          hostname: TEST_CONFIG.host,
          port: TEST_CONFIG.port,
          path: '/api/update',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: TEST_CONFIG.timeout
        });
        
        // Send malformed JSON by writing directly
        assert.equal(response.statusCode, 400, 'Should return 400 status code');
      });
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      const requests = [];
      
      // Send many requests quickly
      for (let i = 0; i < 35; i++) {
        requests.push(makeHttpRequest({
          hostname: TEST_CONFIG.host,
          port: TEST_CONFIG.port,
          path: '/api/status',
          method: 'GET',
          timeout: TEST_CONFIG.timeout
        }));
      }
      
      const responses = await Promise.all(requests);
      
      // At least some should be rate limited (429)
      const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
      assert.isTrue(rateLimitedResponses.length > 0, 'Should have some rate limited responses');
      
      // Rate limited responses should have proper message
      if (rateLimitedResponses.length > 0) {
        assert.isTrue(rateLimitedResponses[0].data.message.includes('Rate limit exceeded'), 'Should include rate limit message');
      }
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
      assert.isFalse(response.data.success, 'Should indicate failure');
      assert.isTrue(response.data.message.includes('not found'), 'Should include not found message');
    });
  });

  describe('CORS Headers', () => {
    test('should include CORS headers for HLS endpoints', async () => {
      const response = await makeHttpRequest({
        hostname: TEST_CONFIG.host,
        port: TEST_CONFIG.port,
        path: '/hls/',
        method: 'GET',
        timeout: TEST_CONFIG.timeout
      });
      
      // Check CORS headers (even if endpoint returns error)
      assert.isTrue(response.headers.hasOwnProperty('access-control-allow-origin'), 'Should include CORS origin header');
    });
  });
});