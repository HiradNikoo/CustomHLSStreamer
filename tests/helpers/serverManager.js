'use strict';

const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { ensureSampleFiles } = require('./sampleFiles');
const { retry, makeHttpRequest } = require('./testUtils');

async function startServer(port) {
  const { video1 } = ensureSampleFiles();

  const env = Object.assign({}, process.env, {
    PORT: port,
    HOST: '127.0.0.1',
    ZMQ_PORT: '5556',
    FFMPEG_BINARY: 'ffmpeg',
    HLS_OUTPUT_DIR: './test_hls',
    FIFO_BASE_DIR: './test_fifos',
    FIFO_LAYERS: 'overlay1.fifo,overlay2.fifo',
    INITIAL_CONTENT: video1,
    LOG_LEVEL: 'error'
  });

  const serverProcess = spawn('node', ['src/app.js'], {
    cwd: path.join(__dirname, '..', '..'),
    env,
    stdio: 'ignore'
  });

  // Wait for server to be ready
  await retry(async () => {
    const res = await makeHttpRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/status',
      method: 'GET',
      timeout: 5000
    });
    if (res.statusCode !== 200) {
      throw new Error('Server not ready');
    }
  }, 10, 500);

  return serverProcess;
}

function stopServer(serverProcess) {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  // Cleanup generated directories
  try {
    if (fs.existsSync('./test_hls')) {
      fs.rmSync('./test_hls', { recursive: true, force: true });
    }
    if (fs.existsSync('./test_fifos')) {
      fs.rmSync('./test_fifos', { recursive: true, force: true });
    }
  } catch (_) {
    // ignore cleanup errors
  }
}

module.exports = { startServer, stopServer };
