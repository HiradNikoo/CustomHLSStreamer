# Custom HLS Streamer

A production-ready Node.js application for creating highly customizable live HLS streams with real-time content updates using FFmpeg, named pipes (FIFOs), and ZeroMQ.

**🎉 NEW: Now with professional modular structure, comprehensive testing, and enhanced features!**

## Features

🎥 **Dynamic Content Switching** - Update video content without interrupting the stream  
🔄 **Real-time Filter Adjustments** - Modify overlays, text, and effects via ZeroMQ  
📺 **Layered Overlays** - Support for multiple overlay layers (extensible)  
🚀 **HLS Live Streaming** - Automatic segment generation and cleanup  
🌐 **HTTP API** - RESTful API for real-time stream control  
⚡ **Zero Downtime** - Seamless content transitions using FFmpeg concat demuxer  
🛡️ **Production Ready** - Comprehensive error handling and logging

### 🆕 New in Modular Version

🧪 **Comprehensive Testing** - Full test suite with Jest (unit + integration tests)  
🎛️ **Enhanced Dashboard** - Beautiful, responsive web interface with live monitoring  
🔒 **Security Improvements** - Input validation, rate limiting, and security hardening  
📊 **Better Monitoring** - Health checks, metrics, and structured logging  
🏗️ **Modular Architecture** - Clean separation of concerns, better maintainability  
🌍 **Environment Config** - Support for environment variables and .env files  
📱 **Mobile Responsive** - Dashboard works perfectly on mobile devices  
🔧 **Developer Experience** - Better error messages, debugging, and development tools

### 🌐 React.js Web Dashboard

🎥 **Professional Video Player** - Video.js with native HLS support and dark theme  
⚡ **Real-time Controls** - Interactive stream management with instant feedback  
📚 **API Documentation** - Complete API reference with live testing and examples  
📊 **Live Monitoring** - Real-time status updates and system metrics  
📝 **Activity Logging** - Filtered, searchable logs with export functionality  
🎨 **Modern Design** - Ant Design components with custom dark theme  
📱 **Fully Responsive** - Optimized for desktop, tablet, and mobile devices  

## Requirements

- **Node.js** 14.0.0 or higher
- **FFmpeg** with libzmq support (`ffmpeg -filters | grep zmq` should show zmq filter)
- **Linux/macOS** (for named pipes support)

### Installing FFmpeg with ZeroMQ support

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg libzmq3-dev
```

**macOS:**
```bash
brew install ffmpeg zeromq
```

**Verify ZeroMQ support:**
```bash
ffmpeg -filters | grep zmq
```

## Installation

1. **Clone or download the files:**
```bash
# Copy custom-hls-streamer.js and package-hls.json to your project directory
```

2. **Install dependencies:**
```bash
npm install --save express zeromq
# OR if you have package-hls.json
npm install
```

3. **Create assets directory (optional):**
```bash
mkdir -p assets
# Add your default.mp4 file to assets/ directory
```

## Quick Start

### New Modular Version (Recommended)

```bash
# Install dependencies
npm install

# Start the streamer backend
npm start

# Or for development with auto-restart
npm run dev
```

#### With React.js Web Dashboard

```bash
# Setup and start the web dashboard
node setup-web.js
npm run web:start

# Or manually:
# cd web && npm install && npm start
```

### Legacy Version (Single File)

```bash
# Start the original monolithic version
npm run legacy:start
# or
node custom-hls-streamer.js
```

The application will:
- Create necessary directories (`./fifos/`, `./hls/`)
- Generate named pipes for dynamic input
- Start FFmpeg with HLS output
- Launch HTTP server on `http://localhost:3000`

**Stream URL:** `http://localhost:3000/hls/stream.m3u8`  
**Backend Dashboard:** `http://localhost:3000/` (basic HTML version)  
**React Dashboard:** `http://localhost:3001/` (full-featured React.js version)

## Configuration

### New Modular Version

Configuration is managed through environment variables and `src/config/index.js`:

```bash
# Create .env file for custom configuration
PORT=3000
HOST=0.0.0.0
ZMQ_PORT=5555
HLS_SEGMENT_TIME=2
HLS_PLAYLIST_SIZE=5
HLS_OUTPUT_DIR=./hls
FIFO_BASE_DIR=./fifos
FIFO_LAYERS=overlay1.fifo,overlay2.fifo
INITIAL_CONTENT=./assets/default.mp4
LOG_LEVEL=info
FFMPEG_BINARY=ffmpeg
FFMPEG_PRESET=ultrafast
```

### Legacy Version

Edit the `CONFIG` object in `custom-hls-streamer.js`:

```javascript
const CONFIG = {
  http: {
    port: 3000,              // HTTP server port
    host: '0.0.0.0'         // HTTP server host
  },
  hls: {
    segmentTime: 2,         // Segment duration (seconds)
    playlistSize: 5,        // Number of segments in playlist
    outputDir: './hls'      // HLS output directory
  },
  fifos: {
    layers: ['overlay1.fifo', 'overlay2.fifo'] // Add more for additional layers
  },
  initialContent: './assets/default.mp4' // Default video file
};
```

## API Usage

### Update Main Content

Add new video to the stream:

```bash
curl -X POST http://localhost:3000/update \
  -H "Content-Type: application/json" \
  -d '{"type":"content","data":"/path/to/new-video.mp4"}'
```

**JavaScript Example:**
```javascript
const response = await fetch('http://localhost:3000/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'content',
    data: '/path/to/video.mp4'
  })
});
```

### Update Overlay Layer

Add/change overlay on a specific layer:

```bash
curl -X POST http://localhost:3000/update \
  -H "Content-Type: application/json" \
  -d '{"type":"layer","data":{"index":0,"path":"/path/to/overlay.png"}}'
```

### Send Real-time Filter Commands

Modify filters without restarting FFmpeg:

```bash
# Move overlay to new position
curl -X POST http://localhost:3000/update \
  -H "Content-Type: application/json" \
  -d '{"type":"filter","data":{"command":"Parsed_overlay_1 x=200:y=300"}}'

# Change text overlay
curl -X POST http://localhost:3000/update \
  -H "Content-Type: application/json" \
  -d '{"type":"filter","data":{"command":"Parsed_drawtext_0 text=\"New Live Text\""}}'
```

### Check Status

```bash
curl http://localhost:3000/status
```

Response:
```json
{
  "ffmpeg": "running",
  "zmq": "connected",
  "uptime": 123.45,
  "config": {
    "layers": 2,
    "hlsSegmentTime": 2,
    "hlsPlaylistSize": 5
  }
}
```

## 🏗️ New Modular Architecture

The application has been restructured into a professional, modular architecture:

```
src/
├── app.js                    # Main application entry point
├── config/
│   └── index.js             # Configuration management with env vars
├── controllers/
│   └── streamController.js  # API endpoint handlers
├── services/
│   ├── ffmpegService.js     # FFmpeg process management
│   ├── fifoService.js       # FIFO/named pipe operations
│   ├── hlsService.js        # HLS output management
│   └── zmqService.js        # ZeroMQ communication
├── middleware/
│   └── validation.js        # Request validation & security
├── routes/
│   └── api.js              # API route definitions
└── utils/
    ├── logger.js           # Structured logging
    └── shutdown.js         # Graceful shutdown handling

tests/
├── unit/                   # Unit tests for all modules
├── integration/            # API integration tests
└── helpers/                # Test utilities

public/
└── dashboard.html          # Enhanced web dashboard
```

## 🧪 Testing & Development

### Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch
```

### Development Commands

```bash
# Start in development mode (auto-restart)
npm run dev

# Validate configuration
npm run validate

# Check application health
npm run health

# Clean up generated files
npm run clean

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Migration from Legacy Version

If you're upgrading from the single-file version:

```bash
# Run the migration assistant
node migrate.js

# Or with automatic dependency installation
node migrate.js --install
```

## Advanced Usage

### Adding More Overlay Layers

1. **Update configuration:**
```javascript
const CONFIG = {
  fifos: {
    layers: [
      'overlay1.fifo',
      'overlay2.fifo',
      'overlay3.fifo',  // Add more layers
      'overlay4.fifo'
    ]
  }
};
```

2. **The `buildFilterComplex()` function automatically handles additional layers**

### Custom Filter Commands

Common ZeroMQ filter commands:

```javascript
// Move overlay
'Parsed_overlay_1 x=100:y=200'

// Change overlay opacity
'Parsed_overlay_1 alpha=0.5'

// Update text
'Parsed_drawtext_0 text="Live: Breaking News"'

// Change text color
'Parsed_drawtext_0 fontcolor=red'

// Scale overlay
'Parsed_scale_1 w=320:h=240'
```

### ABR (Adaptive Bitrate) Extension

To add multiple bitrate variants, modify `buildFFmpegArgs()`:

```javascript
// Add multiple video outputs
args.push(
  // High quality
  '-map', '[vout]', '-c:v:0', 'libx264', '-b:v:0', '2M', '-s:0', '1920x1080',
  // Medium quality  
  '-map', '[vout]', '-c:v:1', 'libx264', '-b:v:1', '1M', '-s:1', '1280x720',
  // Low quality
  '-map', '[vout]', '-c:v:2', 'libx264', '-b:v:2', '500k', '-s:2', '854x480',
  
  // HLS with variant streams
  '-f', 'hls',
  '-var_stream_map', 'v:0,a:0 v:1,a:0 v:2,a:0',
  '-master_pl_name', 'master.m3u8',
  '-hls_segment_filename', 'stream_%v_%03d.ts',
  'stream_%v.m3u8'
);
```

## Production Deployment

### Using PM2

```bash
npm install -g pm2

# Start with PM2
pm2 start custom-hls-streamer.js --name "hls-streamer"

# Monitor
pm2 logs hls-streamer
pm2 monit

# Auto-restart on system reboot
pm2 startup
pm2 save
```

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:18-slim

# Install FFmpeg with ZeroMQ
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libzmq3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY custom-hls-streamer.js .
COPY assets/ ./assets/

EXPOSE 3000

CMD ["node", "custom-hls-streamer.js"]
```

```bash
docker build -t custom-hls-streamer .
docker run -p 3000:3000 -v $(pwd)/media:/app/media custom-hls-streamer
```

### Nginx Proxy Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /hls/ {
        proxy_pass http://localhost:3000/hls/;
        
        # CORS headers for HLS
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control no-cache;
        
        # Optimize for streaming
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    location /update {
        proxy_pass http://localhost:3000/update;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring and Logging

### Custom Logging

The application includes comprehensive logging. Logs are written to console with timestamps:

```
[INFO] 2024-01-15T10:30:00.000Z - Starting Custom HLS Streamer...
[DEBUG] 2024-01-15T10:30:01.000Z - Created FIFO: ./fifos/content.fifo
[INFO] 2024-01-15T10:30:02.000Z - FFmpeg process started successfully
```

### Health Monitoring

Create a health check script:

```javascript
// health-check.js
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/status',
  timeout: 5000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Health check passed');
    process.exit(0);
  } else {
    console.log('❌ Health check failed');
    process.exit(1);
  }
});

req.on('error', () => {
  console.log('❌ Health check failed');
  process.exit(1);
});

req.end();
```

## Client-Side Integration

### HTML5 Video Player

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://vjs.zencdn.net/7.18.1/video.min.js"></script>
    <link href="https://vjs.zencdn.net/7.18.1/video-js.css" rel="stylesheet">
</head>
<body>
    <video-js
        id="live-stream"
        class="video-js"
        controls
        preload="auto"
        width="800"
        height="450"
        data-setup='{}'>
        <source src="http://localhost:3000/hls/stream.m3u8" type="application/x-mpegURL">
    </video-js>
    
    <script>
        const player = videojs('live-stream');
        
        // Auto-reload on errors (for live streams)
        player.on('error', () => {
            setTimeout(() => {
                player.src('http://localhost:3000/hls/stream.m3u8');
                player.load();
            }, 5000);
        });
    </script>
</body>
</html>
```

### React Integration

```jsx
import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';

const LiveStream = () => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!playerRef.current) {
      const videoElement = videoRef.current;
      
      if (!videoElement) return;

      playerRef.current = videojs(videoElement, {
        controls: true,
        responsive: true,
        fluid: true,
        liveui: true,
        sources: [{
          src: 'http://localhost:3000/hls/stream.m3u8',
          type: 'application/x-mpegURL'
        }]
      });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  const updateContent = async (videoPath) => {
    try {
      const response = await fetch('http://localhost:3000/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'content',
          data: videoPath
        })
      });
      
      const result = await response.json();
      console.log('Content updated:', result);
    } catch (error) {
      console.error('Failed to update content:', error);
    }
  };

  return (
    <div>
      <div data-vjs-player>
        <video ref={videoRef} className="video-js vjs-default-skin" />
      </div>
      
      <button onClick={() => updateContent('/path/to/new-video.mp4')}>
        Switch Content
      </button>
    </div>
  );
};
```

## Troubleshooting

### Common Issues

**1. FFmpeg not found:**
```bash
# Install FFmpeg
sudo apt install ffmpeg  # Ubuntu/Debian
brew install ffmpeg       # macOS
```

**2. ZeroMQ filter not available:**
```bash
# Check if ZeroMQ filter is available
ffmpeg -filters | grep zmq

# If not available, compile FFmpeg with --enable-libzmq
```

**3. FIFO permission errors:**
```bash
# Make sure the application has write permissions
chmod 755 ./fifos/
```

**4. Stream not playing:**
- Check if HLS files are being generated: `ls -la ./hls/`
- Verify FFmpeg is running: Check logs for errors
- Test with VLC: `vlc http://localhost:3000/hls/stream.m3u8`

**5. Content not updating:**
- Verify file paths are absolute
- Check FIFO write permissions
- Monitor FFmpeg logs for concat errors

### Debug Mode

Enable detailed logging:

```javascript
// Add to CONFIG
const CONFIG = {
  debug: true,  // Add this for verbose logging
  // ... rest of config
};
```

## Performance Optimization

### System Tuning

**1. Increase file descriptor limits:**
```bash
# Temporary
ulimit -n 4096

# Permanent (add to /etc/security/limits.conf)
* soft nofile 4096
* hard nofile 4096
```

**2. Optimize FFmpeg settings:**
```javascript
// In buildFFmpegArgs()
args.push(
  '-preset', 'ultrafast',    // Fastest encoding
  '-tune', 'zerolatency',    // Minimize delay
  '-threads', '0',           // Use all CPU cores
  '-thread_queue_size', '512' // Larger buffer
);
```

**3. Memory management:**
```bash
# Monitor memory usage
ps aux | grep ffmpeg
htop
```

## Security Considerations

### Production Security

**1. Add authentication:**
```javascript
// Add API key middleware
app.use('/update', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

**2. Input validation:**
```javascript
const path = require('path');

function validateFilePath(filePath) {
  // Prevent directory traversal
  const resolved = path.resolve(filePath);
  const allowed = path.resolve('./media');
  return resolved.startsWith(allowed);
}
```

**3. Rate limiting:**
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/update', limiter);
```

## License

MIT License - feel free to use in commercial and personal projects.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review FFmpeg logs for detailed error information  
3. Verify all dependencies are properly installed
4. Test with simple video files first

## Contributing

Contributions welcome! Areas for improvement:
- Additional filter presets
- WebRTC integration
- Database persistence for stream state
- Kubernetes deployment examples
- Advanced monitoring dashboard
