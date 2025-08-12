import React, { useState, useEffect } from 'react';
import { Layout, Typography, Row, Col } from 'antd';
import {
  PlayCircleOutlined,
  ApiOutlined,
  MonitorOutlined,
  SettingOutlined
} from '@ant-design/icons';

import VideoPlayer from './components/VideoPlayer';
import StreamControls from './components/StreamControls';
import StatusPanel from './components/StatusPanel';
import APIDocumentation from './components/APIDocumentation';
import ActivityLog from './components/ActivityLog';
import FFmpegLogs from './components/FFmpegLogs';
import { StreamService } from './services/StreamService';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

function App() {
  const [streamStatus, setStreamStatus] = useState({
    ffmpeg: 'stopped',
    zmq: 'disconnected',
    hls: { generating: false, segmentCount: 0 },
    uptime: 0,
    healthy: false
  });
  
  const [logs, setLogs] = useState([
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: 'Dashboard initialized'
    }
  ]);

  const [loading, setLoading] = useState(true);

  const addLog = (level, message) => {
    const newLog = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message
    };
    
    setLogs(prevLogs => {
      const updatedLogs = [...prevLogs, newLog];
      return updatedLogs.slice(-100); // Keep only last 100 logs
    });
  };

  const updateStatus = async () => {
    try {
      const status = await StreamService.getStatus();
      setStreamStatus(status);
      
      if (loading && (status.ffmpeg === 'running' || status.zmq === 'connected')) {
        setLoading(false);
        addLog('info', 'Connected to HLS streamer backend');
      }
    } catch (error) {
      addLog('error', `Failed to fetch status: ${error.message}`);
      if (loading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Initial status check
    updateStatus();
    
    // Set up periodic status updates
    const statusInterval = setInterval(updateStatus, 5000);
    
    // Cleanup
    return () => clearInterval(statusInterval);
  }, []);

  const handleStreamAction = async (action, data) => {
    try {
      const result = await StreamService.updateStream(action, data);
      
      if (result.success) {
        addLog('info', result.message);
      } else {
        addLog('error', result.message || 'Action failed');
      }
      
      // Refresh status after action
      setTimeout(updateStatus, 1000);
      
      return result;
    } catch (error) {
      addLog('error', `Action failed: ${error.message}`);
      throw error;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#141414' }}>
      <Header style={{ 
        background: '#1f1f1f', 
        borderBottom: '1px solid #303030',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <PlayCircleOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
          <div>
            <Title level={3} style={{ margin: 0, color: '#ffffff' }}>
              Custom HLS Streamer
            </Title>
            <Text type="secondary">Professional Live Streaming Dashboard</Text>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div className={`status-indicator ${streamStatus.healthy ? 'status-online' : 'status-offline'}`}>
            <span className="status-dot"></span>
            <Text style={{ color: '#ffffff' }}>
              {streamStatus.healthy ? 'Online' : 'Offline'}
            </Text>
          </div>
        </div>
      </Header>

      <Content style={{ padding: '24px', background: '#141414' }}>
        <Row gutter={[24, 24]}>
          {/* Video Player Section */}
          <Col xs={24} lg={16}>
            <VideoPlayer 
              streamUrl="/hls/stream.m3u8"
              loading={loading}
              onLog={addLog}
            />
          </Col>
          
          {/* Stream Controls */}
          <Col xs={24} lg={8}>
            <StreamControls
              onAction={handleStreamAction}
              status={streamStatus}
              onLog={addLog}
            />
          </Col>
          
          {/* Status Panel */}
          <Col xs={24}>
            <StatusPanel 
              status={streamStatus}
              onRefresh={updateStatus}
            />
          </Col>
          
          {/* FFmpeg Logs - Full Width for Better Visibility */}
          <Col xs={24}>
            <FFmpegLogs />
          </Col>
          
          {/* Activity Log */}
          <Col xs={24} xl={12}>
            <ActivityLog 
              logs={logs}
              onClear={() => setLogs([])}
            />
          </Col>
          
          {/* API Documentation */}
          <Col xs={24} xl={12}>
            <APIDocumentation onLog={addLog} />
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}

export default App;