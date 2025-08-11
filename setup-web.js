#!/usr/bin/env node

/**
 * Web Dashboard Setup Script
 * Sets up the React.js web dashboard for the HLS Streamer
 */

'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🌐 Setting up Custom HLS Streamer Web Dashboard');
console.log('=====================================================\n');

// Check if web directory exists
const webDir = path.join(__dirname, 'web');
if (!fs.existsSync(webDir)) {
  console.error('❌ Web directory not found. Make sure you have all the files.');
  process.exit(1);
}

console.log('📁 Web directory found');
console.log('🔧 Installing React.js dependencies...\n');

// Install web dependencies
const installProcess = spawn('npm', ['install'], {
  cwd: webDir,
  stdio: 'inherit',
  shell: true
});

installProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Web dashboard dependencies installed successfully!');
    console.log('\n🚀 Setup Complete! You can now:');
    console.log('\n📋 Available Commands:');
    console.log('   npm run web:start    - Start React dev server (port 3001)');
    console.log('   npm run web:build    - Build production version');
    console.log('   npm run web:serve    - Serve built version');
    console.log('\n🎯 Quick Start:');
    console.log('   1. Start the HLS streamer backend:');
    console.log('      npm start');
    console.log('');
    console.log('   2. In a new terminal, start the web dashboard:');
    console.log('      npm run web:start');
    console.log('');
    console.log('   3. Open your browser to:');
    console.log('      Backend:  http://localhost:3000');
    console.log('      Frontend: http://localhost:3001');
    console.log('\n✨ Features:');
    console.log('   🎥 Professional Video.js HLS player');
    console.log('   🎨 Modern Ant Design dark theme UI');
    console.log('   📊 Real-time status monitoring');
    console.log('   🔧 Interactive stream controls');
    console.log('   📚 Complete API documentation with examples');
    console.log('   📝 Live activity logging');
    console.log('   📱 Mobile-responsive design');
    
  } else {
    console.log('\n❌ Failed to install web dependencies');
    console.log('   You can try manually:');
    console.log('   cd web && npm install');
    process.exit(1);
  }
});