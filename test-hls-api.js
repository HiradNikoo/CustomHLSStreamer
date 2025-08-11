#!/usr/bin/env node

/**
 * Test Script for Custom HLS Streamer API
 * 
 * This script demonstrates how to interact with the HLS streamer API
 * for real-time content updates and filter adjustments.
 */

const http = require('http');

// Configuration
const API_BASE = 'http://localhost:3000';

/**
 * Make HTTP request to the API
 */
function makeRequest(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Get status from the API
 */
function getStatus() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/status',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Wait for a specified number of seconds
 */
function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

/**
 * Test the content update functionality
 */
async function testContentUpdate() {
  console.log('\n🎥 Testing Content Update...');
  
  // Example video paths - replace with actual paths on your system
  const videos = [
    '/path/to/video1.mp4',
    '/path/to/video2.mp4',
    '/path/to/video3.mp4'
  ];
  
  for (const video of videos) {
    try {
      const response = await makeRequest('/update', {
        type: 'content',
        data: video
      });
      
      console.log(`📹 Updated content to: ${video}`);
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      
      // Wait 10 seconds before next update
      await sleep(10);
      
    } catch (error) {
      console.error(`❌ Failed to update content: ${error.message}`);
    }
  }
}

/**
 * Test overlay layer updates
 */
async function testLayerUpdate() {
  console.log('\n🖼️ Testing Layer Updates...');
  
  const overlays = [
    { index: 0, path: '/path/to/overlay1.png' },
    { index: 1, path: '/path/to/overlay2.png' },
    { index: 0, path: '/path/to/different-overlay.png' }
  ];
  
  for (const overlay of overlays) {
    try {
      const response = await makeRequest('/update', {
        type: 'layer',
        data: overlay
      });
      
      console.log(`🎨 Updated layer ${overlay.index}: ${overlay.path}`);
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      
      await sleep(5);
      
    } catch (error) {
      console.error(`❌ Failed to update layer: ${error.message}`);
    }
  }
}

/**
 * Test real-time filter adjustments
 */
async function testFilterCommands() {
  console.log('\n⚡ Testing Filter Commands...');
  
  const filterCommands = [
    // Move overlay to different positions
    'Parsed_overlay_1 x=100:y=100',
    'Parsed_overlay_1 x=200:y=150',
    'Parsed_overlay_1 x=0:y=0',
    
    // Adjust overlay opacity
    'Parsed_overlay_1 alpha=0.8',
    'Parsed_overlay_1 alpha=0.5',
    'Parsed_overlay_1 alpha=1.0',
    
    // Example text overlay commands (if you have drawtext filter)
    'Parsed_drawtext_0 text="LIVE STREAM"',
    'Parsed_drawtext_0 text="Breaking News"',
    'Parsed_drawtext_0 fontcolor=red',
    'Parsed_drawtext_0 fontcolor=white'
  ];
  
  for (const command of filterCommands) {
    try {
      const response = await makeRequest('/update', {
        type: 'filter',
        data: { command }
      });
      
      console.log(`🎛️ Sent filter command: ${command}`);
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      
      await sleep(3);
      
    } catch (error) {
      console.error(`❌ Failed to send filter command: ${error.message}`);
    }
  }
}

/**
 * Test status endpoint
 */
async function testStatus() {
  console.log('\n📊 Testing Status Endpoint...');
  
  try {
    const response = await getStatus();
    console.log('Status Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error(`❌ Failed to get status: ${error.message}`);
  }
}

/**
 * Run a comprehensive test of different positioning
 */
async function testOverlayPositioning() {
  console.log('\n🎯 Testing Overlay Positioning...');
  
  const positions = [
    { x: 0, y: 0, name: 'Top-left' },
    { x: 640, y: 0, name: 'Top-right' },
    { x: 320, y: 180, name: 'Center' },
    { x: 0, y: 360, name: 'Bottom-left' },
    { x: 640, y: 360, name: 'Bottom-right' }
  ];
  
  for (const pos of positions) {
    try {
      const command = `Parsed_overlay_1 x=${pos.x}:y=${pos.y}`;
      const response = await makeRequest('/update', {
        type: 'filter',
        data: { command }
      });
      
      console.log(`📍 Moved overlay to ${pos.name} (${pos.x}, ${pos.y})`);
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      
      await sleep(4);
      
    } catch (error) {
      console.error(`❌ Failed to move overlay: ${error.message}`);
    }
  }
}

/**
 * Test rapid updates to stress test the system
 */
async function testRapidUpdates() {
  console.log('\n⚡ Testing Rapid Updates (Stress Test)...');
  
  const updates = Array.from({ length: 20 }, (_, i) => ({
    command: `Parsed_overlay_1 x=${Math.random() * 640}:y=${Math.random() * 360}`,
    iteration: i + 1
  }));
  
  console.log('Sending 20 rapid position updates...');
  
  for (const update of updates) {
    try {
      const response = await makeRequest('/update', {
        type: 'filter',
        data: { command: update.command }
      });
      
      console.log(`🔄 Update ${update.iteration}/20: ${update.command.substring(0, 40)}...`);
      
      // Very short delay for rapid updates
      await sleep(0.5);
      
    } catch (error) {
      console.error(`❌ Rapid update ${update.iteration} failed: ${error.message}`);
    }
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Custom HLS Streamer API Tests\n');
  console.log('Make sure the HLS streamer is running on http://localhost:3000');
  console.log('You can start it with: node custom-hls-streamer.js\n');
  
  // Check if server is running
  try {
    await getStatus();
    console.log('✅ Server is running, starting tests...');
  } catch (error) {
    console.error('❌ Server is not running. Please start it first:');
    console.error('   node custom-hls-streamer.js');
    process.exit(1);
  }
  
  try {
    // Run all tests
    await testStatus();
    await testFilterCommands();
    await testOverlayPositioning();
    await testRapidUpdates();
    
    // Content and layer tests require actual files
    console.log('\n📝 Note: Content and layer tests require actual video/image files.');
    console.log('Update the file paths in this script and uncomment the following lines:');
    console.log('// await testContentUpdate();');
    console.log('// await testLayerUpdate();');
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

/**
 * Interactive mode for manual testing
 */
async function interactiveMode() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n🎮 Interactive Mode - Enter commands:');
  console.log('Commands:');
  console.log('  status                    - Get server status');
  console.log('  content <path>           - Update content');
  console.log('  layer <index> <path>     - Update layer');
  console.log('  filter <command>         - Send filter command');
  console.log('  move <x> <y>            - Move overlay to position');
  console.log('  opacity <value>         - Set overlay opacity (0-1)');
  console.log('  test                    - Run automated tests');
  console.log('  quit                    - Exit');
  console.log('');
  
  const askQuestion = () => {
    rl.question('> ', async (input) => {
      const parts = input.trim().split(' ');
      const command = parts[0].toLowerCase();
      
      try {
        switch (command) {
          case 'status':
            const statusResponse = await getStatus();
            console.log(JSON.stringify(statusResponse.data, null, 2));
            break;
            
          case 'content':
            if (parts.length < 2) {
              console.log('Usage: content <path>');
            } else {
              const response = await makeRequest('/update', {
                type: 'content',
                data: parts.slice(1).join(' ')
              });
              console.log('Response:', JSON.stringify(response.data));
            }
            break;
            
          case 'layer':
            if (parts.length < 3) {
              console.log('Usage: layer <index> <path>');
            } else {
              const response = await makeRequest('/update', {
                type: 'layer',
                data: {
                  index: parseInt(parts[1]),
                  path: parts.slice(2).join(' ')
                }
              });
              console.log('Response:', JSON.stringify(response.data));
            }
            break;
            
          case 'filter':
            if (parts.length < 2) {
              console.log('Usage: filter <command>');
            } else {
              const response = await makeRequest('/update', {
                type: 'filter',
                data: { command: parts.slice(1).join(' ') }
              });
              console.log('Response:', JSON.stringify(response.data));
            }
            break;
            
          case 'move':
            if (parts.length < 3) {
              console.log('Usage: move <x> <y>');
            } else {
              const x = parseInt(parts[1]);
              const y = parseInt(parts[2]);
              const response = await makeRequest('/update', {
                type: 'filter',
                data: { command: `Parsed_overlay_1 x=${x}:y=${y}` }
              });
              console.log(`Moved overlay to (${x}, ${y})`);
              console.log('Response:', JSON.stringify(response.data));
            }
            break;
            
          case 'opacity':
            if (parts.length < 2) {
              console.log('Usage: opacity <value> (0-1)');
            } else {
              const opacity = parseFloat(parts[1]);
              const response = await makeRequest('/update', {
                type: 'filter',
                data: { command: `Parsed_overlay_1 alpha=${opacity}` }
              });
              console.log(`Set overlay opacity to ${opacity}`);
              console.log('Response:', JSON.stringify(response.data));
            }
            break;
            
          case 'test':
            console.log('Running automated tests...');
            await runTests();
            break;
            
          case 'quit':
          case 'exit':
            console.log('Goodbye!');
            rl.close();
            return;
            
          default:
            console.log('Unknown command. Type "quit" to exit.');
        }
      } catch (error) {
        console.error('Error:', error.message);
      }
      
      console.log('');
      askQuestion();
    });
  };
  
  askQuestion();
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--interactive') || args.includes('-i')) {
    interactiveMode();
  } else {
    runTests();
  }
}

module.exports = {
  makeRequest,
  getStatus,
  testContentUpdate,
  testLayerUpdate,
  testFilterCommands,
  testStatus
};