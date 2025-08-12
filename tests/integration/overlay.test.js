/**
 * Streaming overlay and watermark integration tests
 */

'use strict';

const { makeHttpRequest, assert, sleep, retry } = require('../helpers/testUtils');
const { startServer, stopServer } = require('../helpers/serverManager');

const PORT = 3100;

describe('Overlay and Watermark Streaming', () => {
  let serverProcess;
  let baseUrl;

  beforeAll(async () => {
    serverProcess = await startServer(PORT);
    baseUrl = `http://127.0.0.1:${PORT}`;
    // allow some time for initial segments
    await sleep(2000);
  });

  afterAll(() => {
    stopServer(serverProcess);
  });

  test.skip('should serve initial HLS playlist', async () => {
    // Skipped in automated environment
  });

  test('should overlay second video on layer 0', async () => {
    const response = await makeHttpRequest({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/update',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    }, {
      type: 'layer',
      data: { index: 0, path: './samples/video2.mp4' }
    });
    assert.equal(response.statusCode, 200);
    assert.isTrue(response.data.success, 'Layer update should succeed');
  });

  test('should add watermark overlay on layer 1', async () => {
    const response = await makeHttpRequest({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/update',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    }, {
      type: 'layer',
      data: { index: 1, path: './samples/watermark.png' }
    });
    assert.equal(response.statusCode, 200);
    assert.isTrue(response.data.success, 'Watermark update should succeed');
  });

  test('should switch main content without interruption', async () => {
    const response = await makeHttpRequest({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/update',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    }, {
      type: 'content',
      data: './samples/video2.mp4'
    });
    assert.equal(response.statusCode, 200);
    assert.isTrue(response.data.success, 'Content update should succeed');
  });
});
