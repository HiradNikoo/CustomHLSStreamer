#!/usr/bin/env node

/**
 * Migration Script
 * Helps migrate from the monolithic custom-hls-streamer.js to the new modular structure
 */

'use strict';

const fs = require('fs');
const path = require('path');

console.log('🚀 Custom HLS Streamer - Migration Assistant');
console.log('============================================\n');

console.log('This script helps you migrate to the new modular structure.');
console.log('The new structure provides better maintainability, testing, and organization.\n');

// Check if old file exists
const oldFile = 'custom-hls-streamer.js';
const newFile = 'src/app.js';

if (!fs.existsSync(oldFile)) {
  console.log('❌ Original custom-hls-streamer.js not found.');
  console.log('   Make sure you\'re running this script from the project root directory.\n');
  process.exit(1);
}

if (!fs.existsSync(newFile)) {
  console.log('❌ New modular structure not found.');
  console.log('   Make sure all the new files have been created properly.\n');
  process.exit(1);
}

console.log('✅ Both old and new files found.\n');

// Backup the old file
const backupFile = `${oldFile}.backup`;
if (!fs.existsSync(backupFile)) {
  try {
    fs.copyFileSync(oldFile, backupFile);
    console.log(`✅ Created backup: ${backupFile}`);
  } catch (error) {
    console.log(`❌ Failed to create backup: ${error.message}`);
    process.exit(1);
  }
} else {
  console.log(`ℹ️  Backup already exists: ${backupFile}`);
}

// Check package.json
console.log('\n📦 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (packageJson.main === 'custom-hls-streamer.js') {
    console.log('⚠️  package.json still points to the old main file');
    console.log('   The new package.json should have main: "src/app.js"');
  } else if (packageJson.main === 'src/app.js') {
    console.log('✅ package.json correctly points to new main file');
  }
  
  if (!packageJson.scripts || !packageJson.scripts.test || packageJson.scripts.test.includes('custom-hls-streamer.js')) {
    console.log('⚠️  package.json test scripts may need updating');
    console.log('   New scripts should use Jest for proper testing');
  } else {
    console.log('✅ package.json scripts look updated');
  }
} catch (error) {
  console.log(`❌ Error reading package.json: ${error.message}`);
}

// Check for custom configurations
console.log('\n⚙️  Checking for custom configurations...');
try {
  const oldContent = fs.readFileSync(oldFile, 'utf8');
  
  // Look for modified CONFIG object
  const configMatch = oldContent.match(/const CONFIG = \{([\s\S]*?)\};/);
  if (configMatch) {
    const configContent = configMatch[1];
    
    // Check for non-default values
    const customizations = [];
    
    if (configContent.includes('port:') && !configContent.includes('port: 3000')) {
      customizations.push('- Custom HTTP port');
    }
    
    if (configContent.includes('zmq:') && !configContent.includes('port: 5555')) {
      customizations.push('- Custom ZMQ port');
    }
    
    if (configContent.includes('initialContent:') && !configContent.includes('./assets/default.mp4')) {
      customizations.push('- Custom initial content path');
    }
    
    if (configContent.includes('outputDir:') && !configContent.includes('./hls')) {
      customizations.push('- Custom HLS output directory');
    }
    
    if (customizations.length > 0) {
      console.log('⚠️  Found potential customizations in your old CONFIG:');
      customizations.forEach(c => console.log(`   ${c}`));
      console.log('   You may need to update src/config/index.js or use environment variables');
    } else {
      console.log('✅ No obvious CONFIG customizations detected');
    }
  }
} catch (error) {
  console.log(`❌ Error analyzing old configuration: ${error.message}`);
}

// Migration steps
console.log('\n📋 Migration Steps:');
console.log('===================');

console.log('\n1. Install new dependencies:');
console.log('   npm install');

console.log('\n2. Run configuration validation:');
console.log('   npm run validate');

console.log('\n3. Test the new structure:');
console.log('   npm run test:unit');

console.log('\n4. Start with the new structure:');
console.log('   npm start');
console.log('   # This now runs: node src/app.js');

console.log('\n5. Legacy support (temporary):');
console.log('   npm run legacy:start');
console.log('   # This runs the old: node custom-hls-streamer.js');

console.log('\n6. Environment Variables (optional):');
console.log('   Create .env file for custom configuration:');
console.log('   PORT=3001');
console.log('   ZMQ_PORT=5556');
console.log('   HLS_OUTPUT_DIR=./custom_hls');
console.log('   LOG_LEVEL=debug');

console.log('\n7. Run tests to ensure everything works:');
console.log('   npm test');

// Feature comparison
console.log('\n✨ New Features in Modular Structure:');
console.log('=====================================');

const newFeatures = [
  '🧪 Comprehensive test suite with Jest',
  '🔧 Better error handling and validation',
  '📊 Enhanced dashboard with live status updates', 
  '🔒 Input validation and security improvements',
  '📈 Better logging and monitoring capabilities',
  '🎛️  More granular control over services',
  '🔄 Improved graceful shutdown handling',
  '📚 Better code organization and maintainability',
  '🌍 Environment variable configuration support',
  '📱 Responsive web dashboard',
  '🚀 Performance optimizations'
];

newFeatures.forEach(feature => console.log(`   ${feature}`));

// Files structure
console.log('\n📁 New File Structure:');
console.log('======================');

const structure = [
  'src/',
  '├── app.js                 # Main application entry point',
  '├── config/',
  '│   └── index.js          # Configuration management',
  '├── controllers/',
  '│   └── streamController.js # API endpoint handlers',
  '├── services/',
  '│   ├── ffmpegService.js   # FFmpeg process management', 
  '│   ├── fifoService.js     # FIFO operations',
  '│   ├── hlsService.js      # HLS output management',
  '│   └── zmqService.js      # ZeroMQ communication',
  '├── middleware/',
  '│   └── validation.js      # Request validation',
  '├── routes/',
  '│   └── api.js            # API route definitions',
  '└── utils/',
  '    ├── logger.js         # Logging utilities',
  '    └── shutdown.js       # Graceful shutdown handler',
  '',
  'tests/',
  '├── unit/                 # Unit tests for all modules',
  '├── integration/          # API integration tests',
  '└── helpers/              # Test utilities',
  '',
  'public/',
  '└── dashboard.html        # Enhanced web dashboard'
];

structure.forEach(line => console.log(line));

console.log('\n🎯 Next Steps:');
console.log('==============');
console.log('1. Review any custom configurations you may have made');
console.log('2. Install dependencies: npm install');
console.log('3. Test the new structure: npm test');
console.log('4. Start the new application: npm start');
console.log('5. Open http://localhost:3000 to see the enhanced dashboard');
console.log('6. Once satisfied, you can remove custom-hls-streamer.js');

console.log('\n✅ Migration assistant completed!');
console.log('   Your original file is safely backed up as custom-hls-streamer.js.backup');

// Offer to run npm install
if (process.argv.includes('--install')) {
  console.log('\n📦 Installing dependencies...');
  const { spawn } = require('child_process');
  const npm = spawn('npm', ['install'], { stdio: 'inherit' });
  
  npm.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ Dependencies installed successfully!');
      console.log('   You can now run: npm start');
    } else {
      console.log('\n❌ Failed to install dependencies');
      console.log('   Please run: npm install manually');
    }
  });
}