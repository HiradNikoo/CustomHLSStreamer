import axios from 'axios';

// Configure axios for API calls
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    if (error.response) {
      // Server responded with error status
      throw new Error(error.response.data?.message || `HTTP ${error.response.status}`);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Network error - unable to connect to server');
    } else {
      // Something else happened
      throw new Error(error.message || 'Unknown error occurred');
    }
  }
);

export class StreamService {
  /**
   * Get current stream status
   */
  static async getStatus() {
    try {
      const response = await api.get('/api/status');
      return response.data;
    } catch (error) {
      console.error('Failed to get status:', error);
      throw error;
    }
  }

  /**
   * Get health check information
   */
  static async getHealth() {
    try {
      const response = await api.get('/api/health');
      return response.data;
    } catch (error) {
      console.error('Failed to get health:', error);
      throw error;
    }
  }

  /**
   * Get stream information and endpoints
   */
  static async getStreamInfo() {
    try {
      const response = await api.get('/api/info');
      return response.data;
    } catch (error) {
      console.error('Failed to get stream info:', error);
      throw error;
    }
  }

  /**
   * Update stream content
   */
  static async updateContent(filePath) {
    try {
      const response = await api.post('/api/update', {
        type: 'content',
        data: filePath
      });
      return response.data;
    } catch (error) {
      console.error('Failed to update content:', error);
      throw error;
    }
  }

  /**
   * Update stream layer
   */
  static async updateLayer(index, filePath) {
    try {
      const response = await api.post('/api/update', {
        type: 'layer',
        data: {
          index: parseInt(index),
          path: filePath
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to update layer:', error);
      throw error;
    }
  }

  /**
   * Send filter command
   */
  static async sendFilterCommand(command) {
    try {
      const response = await api.post('/api/update', {
        type: 'filter',
        data: {
          command
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send filter command:', error);
      throw error;
    }
  }

  /**
   * Generic update stream method
   */
  static async updateStream(type, data) {
    try {
      let payload;
      
      switch (type) {
        case 'content':
          payload = {
            type: 'content',
            data: data
          };
          break;
          
        case 'layer':
          payload = {
            type: 'layer',
            data: {
              index: data.index,
              path: data.path
            }
          };
          break;
          
        case 'filter':
          payload = {
            type: 'filter',
            data: {
              command: data.command
            }
          };
          break;
          
        default:
          throw new Error(`Unknown update type: ${type}`);
      }
      
      const response = await api.post('/api/update', payload);
      return response.data;
    } catch (error) {
      console.error(`Failed to update stream (${type}):`, error);
      throw error;
    }
  }

  /**
   * Quick filter commands
   */
  static async moveOverlay(x, y, layerIndex = 1) {
    return this.sendFilterCommand(`Parsed_overlay_${layerIndex} x=${x}:y=${y}`);
  }

  static async setOverlayOpacity(alpha, layerIndex = 1) {
    return this.sendFilterCommand(`Parsed_overlay_${layerIndex} alpha=${alpha}`);
  }

  static async updateText(text, filterId = 0) {
    return this.sendFilterCommand(`Parsed_drawtext_${filterId} text="${text}"`);
  }

  static async setTextColor(color, filterId = 0) {
    return this.sendFilterCommand(`Parsed_drawtext_${filterId} fontcolor=${color}`);
  }

  /**
   * Test API connectivity
   */
  static async testConnection() {
    try {
      const response = await api.get('/api/health');
      return {
        success: true,
        healthy: response.data.healthy,
        services: response.data.services
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get example API calls
   */
  static getExampleCalls() {
    const baseUrl = process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3000';
    
    return {
      status: {
        method: 'GET',
        url: `${baseUrl}/api/status`,
        description: 'Get current status of all services',
        example: `fetch('${baseUrl}/api/status')`
      },
      
      health: {
        method: 'GET',
        url: `${baseUrl}/api/health`,
        description: 'Health check endpoint for monitoring',
        example: `fetch('${baseUrl}/api/health')`
      },
      
      updateContent: {
        method: 'POST',
        url: `${baseUrl}/api/update`,
        description: 'Update the main video content',
        body: {
          type: 'content',
          data: '/path/to/video.mp4'
        },
        example: `fetch('${baseUrl}/api/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'content',
    data: '/path/to/video.mp4'
  })
})`
      },
      
      updateLayer: {
        method: 'POST',
        url: `${baseUrl}/api/update`,
        description: 'Update an overlay layer',
        body: {
          type: 'layer',
          data: {
            index: 0,
            path: '/path/to/overlay.png'
          }
        },
        example: `fetch('${baseUrl}/api/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'layer',
    data: {
      index: 0,
      path: '/path/to/overlay.png'
    }
  })
})`
      },
      
      sendFilter: {
        method: 'POST',
        url: `${baseUrl}/api/update`,
        description: 'Send real-time filter commands via ZeroMQ',
        body: {
          type: 'filter',
          data: {
            command: 'Parsed_overlay_1 x=200:y=300'
          }
        },
        example: `fetch('${baseUrl}/api/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'filter',
    data: {
      command: 'Parsed_overlay_1 x=200:y=300'
    }
  })
})`
      }
    };
  }
}