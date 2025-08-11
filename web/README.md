# Custom HLS Streamer - Web Dashboard

A modern React.js web application for controlling and monitoring the Custom HLS Streamer backend. Built with Ant Design, Video.js, and a beautiful dark theme.

## Features

🎥 **Professional Video Player** - Video.js with native HLS support  
🎨 **Modern UI** - Ant Design components with custom dark theme  
📊 **Real-time Monitoring** - Live status updates and system metrics  
🔧 **Stream Controls** - Interactive content and overlay management  
📚 **API Documentation** - Complete API reference with live testing  
📝 **Activity Logging** - Filtered, searchable activity logs  
📱 **Responsive Design** - Works perfectly on desktop and mobile  
⚡ **Real-time Updates** - WebSocket-like status polling  

## Quick Start

### 1. Install Dependencies

```bash
cd web
npm install
```

Or from the main directory:
```bash
npm run web:install
```

### 2. Start Development Server

```bash
npm start
```

Or from the main directory:
```bash
npm run web:start
```

### 3. Build for Production

```bash
npm run build
```

Or from the main directory:
```bash
npm run web:build
```

## Development

### Project Structure

```
web/
├── public/
│   └── index.html           # Main HTML template
├── src/
│   ├── components/          # React components
│   │   ├── VideoPlayer.js   # HLS video player
│   │   ├── StreamControls.js # Stream control forms
│   │   ├── StatusPanel.js   # System status display
│   │   ├── APIDocumentation.js # API docs & testing
│   │   └── ActivityLog.js   # Activity logging
│   ├── services/
│   │   └── StreamService.js # API communication
│   ├── App.js              # Main application
│   ├── index.js            # Application entry point
│   └── index.css           # Global styles
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

### Key Components

#### VideoPlayer
- Video.js integration with HLS support
- Real-time playback statistics
- Error handling and recovery
- Fullscreen and playback controls

#### StreamControls
- Content update forms
- Layer management
- Filter command interface
- Quick action buttons

#### StatusPanel
- System health monitoring
- Service status indicators
- Memory usage tracking
- Configuration display

#### APIDocumentation
- Interactive API explorer
- Live endpoint testing
- Code examples (JavaScript, cURL)
- Response format documentation

#### ActivityLog
- Real-time activity logging
- Filtering by log level
- Search functionality
- Export capabilities

### API Integration

The dashboard communicates with the backend via REST API:

```javascript
import { StreamService } from './services/StreamService';

// Get status
const status = await StreamService.getStatus();

// Update content
await StreamService.updateContent('/path/to/video.mp4');

// Send filter command
await StreamService.sendFilterCommand('Parsed_overlay_1 x=100:y=200');
```

### Styling

- **Theme**: Custom Ant Design dark theme
- **Colors**: Professional blue/gray palette
- **Typography**: System fonts with monospace code blocks
- **Layout**: CSS Grid and Flexbox for responsive design

### Configuration

#### Environment Variables

```bash
# API backend URL (development)
REACT_APP_API_URL=http://localhost:3000

# Enable debug logging
REACT_APP_DEBUG=true
```

#### Ant Design Theme

```javascript
// Custom theme configuration in index.js
{
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#1890ff',
    colorBgBase: '#141414',
    colorTextBase: '#ffffff',
  }
}
```

## Available Scripts

### `npm start`
Runs the app in development mode on http://localhost:3001

### `npm run build`
Builds the app for production to the `build` folder

### `npm run serve`
Serves the production build locally

### `npm test`
Launches the test runner

## Browser Support

- **Chrome** 60+
- **Firefox** 55+
- **Safari** 12+
- **Edge** 79+

HLS support depends on browser capabilities. The Video.js player will automatically fall back to appropriate playback methods.

## Features Guide

### Video Player
- **Playback Controls**: Play, pause, seek, fullscreen
- **Quality Selection**: Automatic bitrate adaptation
- **Statistics**: Real-time bandwidth and buffer monitoring
- **Error Recovery**: Automatic retry on stream failures

### Stream Controls

#### Content Updates
Update the main video content without stopping the stream:
```javascript
// Example: Update to news video
{
  "type": "content",
  "data": "/media/breaking-news.mp4"
}
```

#### Layer Management
Add or update overlay layers:
```javascript
// Example: Add logo overlay
{
  "type": "layer", 
  "data": {
    "index": 0,
    "path": "/media/logo.png"
  }
}
```

#### Filter Commands
Real-time filter adjustments via ZeroMQ:
```javascript
// Example: Move overlay
{
  "type": "filter",
  "data": {
    "command": "Parsed_overlay_1 x=200:y=100"
  }
}
```

### Quick Actions
Pre-defined filter commands for common operations:
- Move overlay to corners/center
- Adjust opacity levels
- Show/hide overlays

### Status Monitoring
Real-time monitoring of:
- FFmpeg process status
- ZeroMQ connection
- HLS segment generation
- System memory usage
- Service uptime

### API Documentation
Interactive documentation with:
- Live endpoint testing
- Copy-paste code examples
- Request/response formats
- Error handling examples

### Activity Logging
Comprehensive logging with:
- Log level filtering (info, warn, error, debug)
- Search functionality
- Export to text files
- Auto-scroll options

## Customization

### Adding New Components

1. Create component file in `src/components/`
2. Import and use in `App.js`
3. Add any new API calls to `StreamService.js`

### Modifying the Theme

Edit the theme configuration in `src/index.js`:

```javascript
<ConfigProvider
  theme={{
    algorithm: theme.darkAlgorithm,
    token: {
      colorPrimary: '#your-color',
      // ... other customizations
    },
  }}
>
```

### Adding API Endpoints

Add new methods to `StreamService.js`:

```javascript
static async newEndpoint(data) {
  const response = await api.post('/api/new-endpoint', data);
  return response.data;
}
```

## Troubleshooting

### Common Issues

**CORS Errors**: Make sure the backend server includes proper CORS headers

**Connection Refused**: Verify the backend is running on port 3000

**Video Not Playing**: Check that FFmpeg is generating HLS segments

**API Timeouts**: Increase timeout in `StreamService.js`

### Debug Mode

Set `REACT_APP_DEBUG=true` to enable detailed console logging.

## Production Deployment

### Build Optimization

```bash
npm run build
```

This creates an optimized production build with:
- Minified JavaScript/CSS
- Optimized bundle splitting
- Progressive Web App features

### Serving the Build

#### Static File Server
```bash
npm install -g serve
serve -s build -l 3001
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    root /path/to/build;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - same as the main HLS Streamer project.